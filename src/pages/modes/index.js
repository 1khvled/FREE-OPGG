/**
 * Game modes screen — the per-champion balance ratios of a mode.
 *
 * The reference's "Game modes" screen (`/lol/modes/:mode?/:championId?`) is
 * **mode parameterised**: the mode decides the champion list and the stat
 * set. This page offers the three modes the reference has:
 *
 *   div.modes
 *     header.modes__header        the title, the champion count, the section
 *     div.modes__modes            the mode picker (the reference's pills)
 *     div.modes__toolbar           the search box and the lane filter
 *     div.modes__panel             the balance table (or a state)
 *
 * The mode lives in the URL (`#/modes/aram`, `#/modes/arena`,
 * `#/modes/nexus_blitz`) and arrives as `ctx.params.mode`; picking one calls
 * `ctx.navigate('modes', { mode })` so the URL stays in sync.
 *
 * The data comes from two payloads:
 *
 *   - `ctx.api.modeTierList(mode)` — the mode's champion list and the stats
 *     the reference computes for the mode;
 *   - `ctx.api.aramBalance()` — the nine balance ratios, the same for every
 *     mode: they say how a champion compares to the reference champion.
 *
 * The balance values are **already** percentages against the reference
 * champion: `100` is the baseline, `95` is rendered as `95 %` and the bar
 * length is `value / 100`. They are never multiplied by 100 again.
 *
 * The page contract is the one described in `docs/SPEC.md`: `meta` describes
 * the route, `mount(container, ctx)` builds the screen and returns a cleanup
 * function.
 */

import { h, clear, debounce } from '../../core/dom.js';
import {
  DEFAULT_LANE,
  DEFAULT_MODE,
  DEFAULT_SORT,
  LANE_FILTERS,
  MODES,
  collectChampions,
  extractRows,
  filterRows,
  indexBalanceRows,
  mergeModeRows,
  mergeRawTierList,
  modeByValue,
  normalizeMode,
  normalizeModeRows,
  normalizeRows,
  sortRows,
} from './data.js';
import { createHeader } from './parts/header.js';
import { createModePicker } from './parts/mode-picker.js';
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
 * The raw mode tier list.
 *
 * The reference's own modes screen reads this URL straight from its renderer
 * (the shipped `docs/rea/game-mode-bundle.js` calls
 * `https://lol-api-champion.op.gg/api/GLOBAL/champions/{mode}/`); the arena
 * stats are derived from the raw counts it carries.
 */
const RAW_TIER_LIST = 'https://lol-api-champion.op.gg/api/GLOBAL/champions/{mode}/';

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
 * The mode of the current route.
 *
 * The mode lives in the URL (`#/modes/arena`) and the shell hands the route
 * parameters over in `ctx.params`. When the shell has not parsed the mode
 * out of the hash yet, the hash is read here so the deep link still opens
 * the right mode.
 *
 * @param {object} params - the route parameters.
 * @returns {string} a mode key.
 */
function resolveMode(params) {
  const fromParams = String((params && params.mode) ?? '').trim().toLowerCase();
  if (MODES.some((entry) => entry.value === fromParams)) return fromParams;

  const match = /#\/modes\/([a-z_]+)/i.exec(String(window.location.hash || ''));
  const fromHash = match ? match[1].toLowerCase() : '';
  if (MODES.some((entry) => entry.value === fromHash)) return fromHash;

  return DEFAULT_MODE;
}

/**
 * Keep the address bar in step with the mode.
 *
 * The reference's own URL is `#/modes/{mode}`; the shell's router owns the
 * hash, so the mode is only written when the hash does not carry it yet.
 *
 * @param {string} mode - the mode key.
 */
function syncModeHash(mode) {
  const target = `#/modes/${mode}`;
  if (window.location.hash === target) return;

  try {
    window.location.hash = target;
  } catch {
    /* the shell owns the hash; the mode still travels in the route params */
  }
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
  const mode = resolveMode(params);
  const modeRecord = modeByValue(mode);

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

  const picker = createModePicker({
    t,
    mode,
    onChange: (next) => {
      const target = normalizeMode(next);
      if (target === mode) return;
      if (typeof ctx.navigate !== 'function') return;
      // The mode lives in the URL; the shell rebuilds the page with it.
      ctx.navigate('modes', { mode: target });
      syncModeHash(target);
    },
  });

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
    mode,
    onSort: (next) => {
      sort = { column: next.column, direction: next.direction };
      render();
    },
    onRowClick: (row) => openChampion(row),
  });

  const slot = h('div.modes__panel');
  const page = h('div.modes', {}, [
    header.element,
    picker.element,
    toolbar.element,
    slot,
  ]);

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

  /* ------------------------------------------------------------------- URL */

  /**
   * Follow the mode in the URL.
   *
   * The shell's router only navigates when the *route id* changes, so a deep
   * link to another mode of this screen (`#/modes/arena` while the screen is
   * already open) is picked up here.
   */
  function onHashChange() {
    // The shell may have rebuilt the page for the new hash; the check is
    // deferred so that a rebuild wins.
    setTimeout(() => {
      if (disposed) return;

      const next = resolveMode({});
      if (next === mode) return;
      if (typeof ctx.navigate !== 'function') return;

      ctx.navigate('modes', { mode: next });
      syncModeHash(next);
    }, 0);
  }

  /* ------------------------------------------------------------------ data */

  /**
   * Read the raw mode tier list of the champion API.
   *
   * The reference's modes screen reads this URL from its renderer; the arena
   * stats are derived from the raw counts (`win`, `play`, `total_place`,
   * `first_place`) it carries. It is only used when the main process' tier
   * list does not carry them, and a failure is silent: the affected cells
   * then read "no data" instead of a made-up number.
   *
   * @param {string} tierList - `aram` or `arena`.
   * @returns {Promise<Array<object>|null>}
   */
  async function fetchRawTierList(tierList) {
    try {
      const response = await fetch(RAW_TIER_LIST.replace('{mode}', tierList));
      if (!response || !response.ok) return null;

      const body = await response.json();
      return body && Array.isArray(body.data) ? body.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Load the mode's champion list.
   *
   * `opgg:mode-tierlist`'s documented payload is `{ mode }`, while the
   * renderer's helper forwards its argument unchanged. The helper is called
   * with the plain mode first; when the answer turns out to be for the other
   * mode, the documented payload shape is used instead — the response always
   * names the mode it answered with.
   *
   * @returns {Promise<{rows: Array<object>, patch: string|null}>}
   */
  async function loadModeRows() {
    if (typeof ctx.api.modeTierList !== 'function') {
      throw new Error(t('app.error', null, 'Something went wrong.'));
    }

    let payload = await ctx.api.modeTierList(modeRecord.tierList);

    if (payload && payload.ok !== false && payload.mode && payload.mode !== modeRecord.tierList) {
      payload = await ctx.api.modeTierList({ mode: modeRecord.tierList });
    }

    if (!payload || payload.ok === false) {
      throw new Error((payload && payload.error)
        ? String(payload.error)
        : t('app.error', null, 'Something went wrong.'));
    }

    let list = extractRows(payload);

    // The stats are computed from the raw counts of the tier list, and the
    // raw list also knows which champions are not in the mode; the flattened
    // champion rows carry neither. The raw list is the reference's own
    // source, so it is read for every mode.
    const raw = await fetchRawTierList(modeRecord.tierList);
    if (raw) list = mergeRawTierList(list, raw);

    return {
      rows: normalizeModeRows({ rows: list }, modeRecord),
      patch: payload.patch || null,
    };
  }

  /**
   * Load the balance ratios, the mode's champion list and the champion
   * catalogue.
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
      const [balance, modeRows, staticData] = await Promise.all([
        ctx.api.aramBalance({}),
        loadModeRows(),
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

      const championIndex = collectChampions(staticData);
      const balanceIndex = indexBalanceRows(normalizeRows(balance));

      rows = mergeModeRows(modeRows.rows, balanceIndex, championIndex);
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

  window.addEventListener('hashchange', onHashChange);

  void load();

  return () => {
    disposed = true;
    loadToken += 1;
    window.removeEventListener('hashchange', onHashChange);
    if (stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    clear(container);
  };
}
