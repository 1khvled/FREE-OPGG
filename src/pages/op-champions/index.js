/**
 * OP Champions screen — the champions of the OP tier (tier 0).
 *
 * The reference's "OP champions" screen (`/lol/live-op-champions/v2`) lists the
 * very top of the tier ladder. There is **no dedicated endpoint**: the screen
 * reuses the champion tier list and keeps what the API itself marks as `OP`.
 *
 * The layout mirrors the Champions screen so the two read as the same product:
 *
 *   div.op-champions
 *     header.op-champions__header      the "OP champions" title + the count
 *     div.op-champions__tabs            the lane tabs
 *     div.op-champions__body
 *       div.champion-statistics-search  the champion portrait grid
 *       div.champion-statistics-table-wrapper
 *         div.champion-statistics-table  the seven column tier list
 *
 * The page contract is the one described in `docs/SPEC.md`: `meta` describes
 * the route, `mount(container, ctx)` builds the screen and returns a cleanup
 * function.
 */

import { h, clear } from '../../core/dom.js';
import {
  createEmptyState,
  createErrorState,
  createLoadingSkeleton,
  createTabs,
} from '../../components/index.js';
import {
  DEFAULT_ROLE,
  OP_TIER_BANDS,
  ROLE_TABS,
  collectOpRows,
  defaultDirection,
  firstDefined,
  sortRows,
} from './data.js';
import { createHeader } from './parts/header.js';
import { createPortraitGrid } from './parts/portrait-grid.js';
import { createOpTable } from './parts/table.js';

/** Route metadata. */
export const meta = {
  id: 'op-champions',
  title: 'common.op',
  order: 30,
  group: 'champions',
};

/** Keep only the lanes the desktop app has a tab for. */
function normalizeRole(value) {
  const candidate = String(value ?? '').toUpperCase();
  return ROLE_TABS.some((tab) => tab.value === candidate) ? candidate : DEFAULT_ROLE;
}

/** A query-string flag is only true when it really says so. */
function toBoolean(value) {
  return value === true || value === 'true' || value === '1';
}

/**
 * Mount the OP champions screen.
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
  stylesheet.href = new URL('./op-champions.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  const params = ctx.params || {};
  const stored = (ctx.store.getState() || {}).champions || {};
  const storedFilters = stored.filters || {};

  let role = normalizeRole(firstDefined(params.role, params.position, storedFilters.role));
  let tierFilter = String(firstDefined(params.tier, storedFilters.tier) || 'emerald_plus');
  let region = String(firstDefined(params.region, storedFilters.region) || 'GLOBAL');
  let queue = String(firstDefined(params.queue, storedFilters.queue) || 'ranked');
  let patch = firstDefined(params.patch, storedFilters.patch) || null;
  let showAll = toBoolean(firstDefined(params.showAll, storedFilters.showAll));

  let sort = { column: 'rank', direction: 'asc' };
  let opRows = [];
  let query = '';
  let status = 'loading';
  let error = null;
  let disposed = false;
  let loadToken = 0;

  /* ------------------------------------------------------------------- DOM */
  const header = createHeader({ t });

  const tabs = createTabs({
    variant: 'pill',
    label: t('common.op', null, 'OP champions'),
    value: role,
    tabs: ROLE_TABS.map((entry) => ({
      id: entry.value,
      label: t(entry.labelKey, null, entry.fallback),
    })),
    onChange: (id) => {
      const next = normalizeRole(id);
      if (next === role) return;
      role = next;
      void load();
    },
  });

  const grid = createPortraitGrid({
    t,
    onSelect: (champion) => openChampion(champion),
    onQuery: (value) => {
      query = value;
      render();
    },
  });

  const table = createOpTable({
    t,
    onSort: (next) => handleSort(next),
    onRowClick: (row) => openChampion(row),
  });

  const tableSlot = h('div.op-champions__table.champion-statistics-table-wrapper');
  tableSlot.appendChild(table.element);

  const body = h('div.op-champions__body', {}, [grid.element, tableSlot]);

  const page = h('div.op-champions', {}, [
    header.element,
    h('div.op-champions__tabs', {}, [tabs.element]),
    body,
  ]);

  container.appendChild(page);

  /* --------------------------------------------------------------- helpers */

  /**
   * The rank bands the OP tier is read from.
   *
   * The band the user selected comes first, then the high bands the API
   * marks the lane leaders as `OP` in.
   */
  function bandList() {
    const bands = [];
    const add = (value) => {
      if (!value || bands.includes(value)) return;
      bands.push(value);
    };

    add(tierFilter);
    for (const band of OP_TIER_BANDS) add(band);
    return bands;
  }

  /** The OP entries of the selected lane. */
  function laneRows() {
    return opRows.filter((row) => row.lane === role);
  }

  /** The rows the current search term lets through. */
  function visibleRows() {
    const list = laneRows();
    if (!query) return list;
    return list.filter((row) => String(row.name || '').toLowerCase().includes(query));
  }

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

  function openChampion(champion) {
    if (!champion) return;
    const id = champion.id;
    if (id === null || id === undefined) return;
    if (typeof ctx.navigate !== 'function') return;
    ctx.navigate('champion-detail', {
      championId: id,
      position: champion.lane || role,
      key: champion.key,
    });
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    header.setCount(laneRows().length);

    if (status === 'loading') {
      grid.setChampions([]);
      setSlot(createLoadingSkeleton(6));
      return;
    }

    if (status === 'error') {
      grid.setChampions([]);
      setSlot(createErrorState({
        message: error && error.message
          ? error.message
          : t('common.error.title', null, 'Looks like there’s been an error!'),
        onRetry: () => { void load(); },
      }));
      return;
    }

    const visible = visibleRows();
    grid.setChampions(visible);

    if (!visible.length) {
      setSlot(createEmptyState({
        message: t(
          'lol.champions.change-filter',
          null,
          'There is not enough data to show. Change region, tier, or patch filter above to see more data.',
        ),
      }));
      return;
    }

    showTable();
    table.setRows(withOrdinals(sortRows(visible, sort)), sort);
  }

  /* ------------------------------------------------------------------ data */

  async function load() {
    const token = ++loadToken;

    status = 'loading';
    error = null;
    render();

    const bands = bandList();

    try {
      const requests = bands.map((band) => ctx.api.champions({
        // The tier list is lane scoped — the lane decides which tier a
        // champion is in — so the lane travels with the request.
        role,
        position: role,
        mode: 'ranked',
        tier: band,
        region,
        queue,
        patch,
        showAll,
      }));

      const results = await Promise.allSettled(requests);
      const sources = [];
      let failure = null;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          sources.push({ payload: result.value, band: bands[index] });
        } else if (!failure) {
          failure = result.reason;
        }
      });

      if (!sources.length) {
        throw failure || new Error('The champion list could not be loaded.');
      }

      opRows = collectOpRows(sources, { role });
      status = 'ready';
    } catch (err) {
      error = err;
      status = 'error';
      opRows = [];
    }

    if (disposed || token !== loadToken) return;
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
