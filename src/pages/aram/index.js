/**
 * ARAM screen — the ARAM champion tier list.
 *
 * The ARAM tier list is the ranked tier list filled with the ARAM queue's own
 * data. The layout is the same seven column div grid the Champions screen
 * uses, so the two read as the same product:
 *
 *   div.aram
 *     header.aram__header                    the title + the patch version
 *     div.aram__body
 *       div.champion-statistics-search        the champion portrait grid
 *       div.aram__table.champion-statistics-table-wrapper
 *         div.champion-statistics-table      the seven column tier list
 *
 * Two things make ARAM different from the ranked list:
 *
 *   - **There are no lanes.** The ARAM payload's `positions` is `null`, so the
 *     screen has no lane filter and no lane column; every row falls back to
 *     its `average_stats`.
 *   - **There are no bans.** ARAM has no ban phase, so the seventh column
 *     carries the ARAM balance tag (the buff / nerf badge derived from
 *     `GET /api/contents/aram-balance`) instead of the ban rate.
 *
 * The data comes from `ctx.api.modeTierList('aram')` (the tier list) and
 * `ctx.api.aramBalance({})` (the balance rows). The balance payload is
 * optional: when it cannot be read the list is shown without any tag, which
 * is honest — a tag is never invented.
 *
 * The page contract is the one described in `docs/SPEC.md`: `meta` describes
 * the route, `mount(container, ctx)` builds the screen and returns a cleanup
 * function.
 */

import { h, clear } from '../../core/dom.js';
import { hideTooltip } from '../../components/index.js';
import {
  balanceTag,
  defaultDirection,
  extractMeta,
  filterRows,
  normalizeBalance,
  normalizeRows,
  sortRows,
} from './data.js';
import { createHeader } from './parts/header.js';
import { createPortraitGrid } from './parts/portrait-grid.js';
import { createAramTable } from './parts/table.js';
import { createEmptyPanel, createErrorPanel, createSkeletonTable } from './parts/states.js';

/** Route metadata. */
export const meta = {
  id: 'aram',
  title: 'lol.common.gameMode.aram',
  order: 35,
  group: 'champions',
};

/**
 * Mount the ARAM screen.
 *
 * @param {HTMLElement} container
 * @param {object} ctx - `{ store, api, i18n, bus, navigate, params, helpers }`.
 * @returns {() => void} cleanup.
 */
export function mount(container, ctx) {
  const t = ctx.i18n.t;

  /* ---------------------------------------------------------------- styles */
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./aram.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  let rows = [];
  let balanceIndex = new Map();
  let sort = { column: 'rank', direction: 'asc' };
  let query = '';
  let patch = null;
  let status = 'loading';
  let error = null;
  let disposed = false;
  let loadToken = 0;

  /* ------------------------------------------------------------------- DOM */
  const header = createHeader({ t });

  const grid = createPortraitGrid({
    t,
    onSelect: (champion) => openChampion(champion),
    onQuery: (value) => {
      query = value;
      render();
    },
  });

  const table = createAramTable({
    t,
    onSort: (next) => handleSort(next),
    onRowClick: (row) => openChampion(row),
  });

  const tableSlot = h('div.aram__table.champion-statistics-table-wrapper');
  tableSlot.appendChild(table.element);

  const body = h('div.aram__body', {}, [grid.element, tableSlot]);

  const page = h('div.aram', {}, [header.element, body]);

  container.appendChild(page);

  /* --------------------------------------------------------------- helpers */

  /** Replace the content of the table slot. */
  function setSlot(node) {
    clear(tableSlot);
    tableSlot.appendChild(node);
  }

  /** Put the table back into the slot. */
  function showTable() {
    if (tableSlot.firstChild !== table.element) {
      clear(tableSlot);
      tableSlot.appendChild(table.element);
    }
  }

  /** The `#` column shows the ordinal of the row in the current order. */
  function withOrdinals(list) {
    return list.map((row, index) => ({ ...row, ordinal: index + 1 }));
  }

  function handleSort(next) {
    const direction = next.column === sort.column
      ? next.direction
      : defaultDirection(next.column);
    sort = { column: next.column, direction };
    render();
  }

  /** Open the champion detail of a row. */
  function openChampion(champion) {
    if (!champion) return;
    const id = champion.id;
    if (id === null || id === undefined) return;
    if (typeof ctx.navigate !== 'function') return;

    ctx.navigate('champion-detail', {
      championId: id,
      key: champion.key,
      mode: 'aram',
    });
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    if (disposed) return;

    header.setPatch(patch);

    if (status === 'loading') {
      header.setCount(0);
      grid.setChampions([]);
      setSlot(createSkeletonTable(12));
      return;
    }

    if (status === 'error') {
      header.setCount(0);
      grid.setChampions([]);
      setSlot(createErrorPanel({
        message: error && error.message
          ? error.message
          : t('app.error', null, 'Something went wrong.'),
        onRetry: () => { void load(); },
      }));
      return;
    }

    const visible = filterRows(rows, query);
    header.setCount(visible.length);
    grid.setChampions(visible);

    if (!visible.length) {
      setSlot(createEmptyPanel({
        message: rows.length
          ? t('lol.buff-nerf.no-matching-champions', null, 'No matching champions')
          : t('lol.common.no-data', null, 'No data'),
      }));
      return;
    }

    showTable();
    // A tooltip that is still open would point at a row that no longer
    // exists once the table is repainted.
    hideTooltip();
    table.setRows(withOrdinals(sortRows(visible, sort)), sort);
  }

  /* ------------------------------------------------------------------ data */

  async function load() {
    const token = ++loadToken;

    status = 'loading';
    error = null;
    render();

    try {
      if (typeof ctx.api.modeTierList !== 'function') {
        throw new Error(t('app.error', null, 'Something went wrong.'));
      }

      const payload = await ctx.api.modeTierList('aram');

      if (disposed || token !== loadToken) return;

      if (!payload || payload.ok === false) {
        throw new Error((payload && payload.error)
          ? String(payload.error)
          : t('app.error', null, 'Something went wrong.'));
      }

      const payloadMeta = extractMeta(payload);
      patch = payloadMeta.version;

      const list = normalizeRows(payload);

      // The balance payload is optional: a failure means "no tag", never a
      // made-up one.
      let balance = new Map();
      if (typeof ctx.api.aramBalance === 'function') {
        try {
          const balancePayload = await ctx.api.aramBalance({});
          if (!disposed && token === loadToken) {
            balance = normalizeBalance(balancePayload);
          }
        } catch (err) {
          console.warn('[aram] the ARAM balance ratios could not be read', err);
        }
      }

      if (disposed || token !== loadToken) return;

      balanceIndex = balance;

      rows = list.map((row) => {
        const rowBalance = row.id === null ? null : balanceIndex.get(row.id) || null;
        return { ...row, balance: rowBalance, balanceTag: balanceTag(rowBalance) };
      });

      status = 'ready';
    } catch (err) {
      if (disposed || token !== loadToken) return;
      error = err instanceof Error ? err : new Error(String(err));
      status = 'error';
      rows = [];
      balanceIndex = new Map();
    }

    render();
  }

  /* -------------------------------------------------------------- lifecycle */

  void load();

  return () => {
    disposed = true;
    loadToken += 1;
    if (stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    clear(container);
  };
}
