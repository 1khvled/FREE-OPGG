/**
 * Game modes screen — the per-champion balance ratios of the mode.
 *
 * The reference's "Game modes" screen (`/lol/modes`) shows, for every
 * champion of the mode, how its numbers compare to the reference champion:
 * attack speed, damage dealt, damage taken, cooldown reduction, healing,
 * tenacity, shield, energy regeneration and area-of-effect damage.
 *
 *   div.modes
 *     header.modes__header        the title, the champion count, the section
 *     div.modes__toolbar           the search box and the lane filter
 *     div.modes__panel             the balance table (or a state)
 *
 * The data comes from `ctx.api.aramBalance()`; the champion names and
 * portraits come from `ctx.api.staticData()`. The rows carry champion ids
 * only, so the two payloads are merged before the table is filled.
 *
 * The values are **already** percentages against the reference champion:
 * `100` is the baseline, `95` is rendered as `95 %` and the bar length is
 * `value / 100`. They are never multiplied by 100 again.
 *
 * The page contract is the one described in `docs/SPEC.md`: `meta` describes
 * the route, `mount(container, ctx)` builds the screen and returns a cleanup
 * function.
 */

import { h, clear, debounce } from '../../core/dom.js';
import {
  DEFAULT_LANE,
  DEFAULT_SORT,
  LANE_FILTERS,
  collectChampions,
  filterRows,
  mergeRows,
  normalizeRows,
  sortRows,
} from './data.js';
import { createHeader } from './parts/header.js';
import { createToolbar } from './parts/toolbar.js';
import { createModesTable } from './parts/table.js';
import { createEmptyPanel, createErrorPanel, createSkeletonTable } from './parts/states.js';

/** Route metadata. */
export const meta = {
  id: 'modes',
  title: 'common.sidebar.gameMode',
  order: 40,
  group: 'champions',
};

/** How long the search term is collected before the table is re-rendered. */
const SEARCH_DEBOUNCE_MS = 120;

/**
 * Keep only the lanes the filter knows about.
 *
 * @param {string|undefined|null} value
 * @returns {string} a lane key.
 */
function normalizeLane(value) {
  const candidate = String(value ?? '').trim().toUpperCase();
  return LANE_FILTERS.some((entry) => entry.value === candidate) ? candidate : DEFAULT_LANE;
}

/**
 * Mount the Game modes screen.
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
  stylesheet.href = new URL('./modes.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  const params = ctx.params || {};

  let rows = [];
  let query = String(params.q || params.query || '');
  let lane = normalizeLane(params.lane);
  let sort = { ...DEFAULT_SORT };
  let status = 'loading';
  let error = null;
  let disposed = false;
  let loadToken = 0;

  /* ------------------------------------------------------------------- DOM */
  const header = createHeader({ t });

  const toolbar = createToolbar({
    t,
    lane,
    onQuery: (value) => {
      query = value;
      scheduleRender();
    },
    onLane: (value) => {
      lane = normalizeLane(value);
      render();
    },
  });

  const table = createModesTable({
    t,
    onSort: (next) => {
      sort = { column: next.column, direction: next.direction };
      render();
    },
    onRowClick: (row) => openChampion(row),
  });

  const slot = h('div.modes__panel');
  const page = h('div.modes', {}, [header.element, toolbar.element, slot]);

  container.appendChild(page);

  /* --------------------------------------------------------------- helpers */

  /** The rows the current search term and lane filter let through. */
  function visibleRows() {
    return filterRows(rows, { query, lane });
  }

  /** Replace the content of the panel. */
  function setSlot(node) {
    clear(slot);
    slot.appendChild(node);
  }

  /** Put the table back into the panel. */
  function showTable() {
    if (slot.firstChild !== table.element) {
      clear(slot);
      slot.appendChild(table.element);
    }
  }

  /** Open the champion detail of a row. */
  function openChampion(row) {
    if (!row || row.championId === null || row.championId === undefined) return;
    if (typeof ctx.navigate !== 'function') return;

    ctx.navigate('champion-detail', {
      championId: row.championId,
      key: row.championKey,
    });
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    if (disposed) return;

    if (status === 'loading') {
      header.setCount(0);
      setSlot(createSkeletonTable(12));
      return;
    }

    if (status === 'error') {
      header.setCount(0);
      setSlot(createErrorPanel({
        message: error && error.message
          ? error.message
          : t('app.error', null, 'Something went wrong.'),
        onRetry: () => { void load(); },
      }));
      return;
    }

    const visible = visibleRows();
    header.setCount(visible.length);

    if (!visible.length) {
      setSlot(createEmptyPanel({
        message: rows.length
          ? t('lol.buff-nerf.no-matching-champions', null, 'No matching champions')
          : t('lol.common.no-data', null, 'No data'),
      }));
      return;
    }

    showTable();
    table.setRows(sortRows(visible, sort), sort);
  }

  const scheduleRender = debounce(() => {
    if (disposed) return;
    render();
  }, SEARCH_DEBOUNCE_MS);

  /* ------------------------------------------------------------------ data */

  /**
   * Load the balance ratios and the champion catalogue.
   *
   * The catalogue is optional: when it cannot be read the rows keep their
   * numeric champion id as the label instead of a name.
   */
  async function load() {
    const token = ++loadToken;

    status = 'loading';
    error = null;
    render();

    try {
      if (typeof ctx.api.aramBalance !== 'function') {
        throw new Error(t('app.error', null, 'Something went wrong.'));
      }

      const [balance, staticData] = await Promise.all([
        ctx.api.aramBalance({}),
        typeof ctx.api.staticData === 'function'
          ? ctx.api.staticData().catch(() => null)
          : Promise.resolve(null),
      ]);

      if (disposed || token !== loadToken) return;

      if (!balance || balance.ok === false) {
        throw new Error((balance && balance.error)
          ? String(balance.error)
          : t('app.error', null, 'Something went wrong.'));
      }

      const index = collectChampions(staticData);
      rows = mergeRows(normalizeRows(balance), index);
      status = 'ready';
    } catch (err) {
      if (disposed || token !== loadToken) return;
      error = err instanceof Error ? err : new Error(String(err));
      status = 'error';
      rows = [];
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
