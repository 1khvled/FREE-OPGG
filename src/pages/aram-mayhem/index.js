/**
 * ARAM: Mayhem screen — the swarm table of the Mayhem queue.
 *
 * The reference's screen (`/lol/aram-mayhem`, chunk
 * `AramMayhem.03c382ad.bundle.js`) is not a tier table like the ranked one:
 * it is a **swarm table** — six tier rows, each row holding the champions of
 * that tier, each champion showing its portrait and the augments it pairs
 * with.
 *
 *   div.page
 *     h1                        the page title
 *     div.header                the search field and the match counter
 *     div.tier-table            the six tier rows
 *       div.tier-table-row
 *         div.tier-table-row-col1.row-N    the tier badge
 *         div.tier-table-row-col2          the champions of the tier
 *           div.swarm-tier                 one champion
 *             div.pal-image                the 64 × 64 portrait
 *             div                          the champion name
 *             div.works                    the augment icons
 *             div.augment-name             the augment they pair with
 *
 * The data:
 *
 *   - `ctx.api.modeTierList('arena')` — the arena tier list. Its rows carry
 *     the tier in `average_stats.tier` and the global rank in
 *     `average_stats.rank`. A tier without a champion is not rendered.
 *   - `ctx.api.championDetail({ championId, mode: 'arena' })` — the augment
 *     pairing of a champion (`data.augment_group`).
 *   - `ctx.api.staticData()` — the champion registry and the augment
 *     catalogue (the names and the icons of the augments).
 *
 * The augment pairing is filled in while the table is on screen: the
 * champions appear as soon as the tier list arrives and their augments join
 * them one by one. A champion without an `augment_group` keeps its portrait
 * and its name — a pairing is never invented.
 *
 * The page contract is the one described in `docs/SPEC.md`: `meta` describes
 * the route, `mount(container, ctx)` builds the screen and returns a cleanup
 * function.
 */

import { h, replace } from '../../core/dom.js';
import {
  MODE,
  buildAugmentIndex,
  buildChampionIndex,
  decorateRows,
  extractAugmentGroup,
  groupByTier,
  normalizeTierRows,
  pickAugments,
} from './data.js';
import { createHeader } from './parts/header.js';
import { createChampionCell, highlightName } from './parts/champion-cell.js';
import { createTierTable } from './parts/tier-table.js';
import {
  createEmptyState,
  createErrorState,
  createLoadingState,
} from './parts/states.js';

/** Route metadata. */
export const meta = {
  id: 'aram-mayhem',
  title: 'lol.aram-mayhem.aram-mayhem',
  order: 36,
  group: 'champions',
};

/** How many champions are enriched with their augments at the same time. */
const AUGMENT_CONCURRENCY = 5;

/**
 * Mount the ARAM: Mayhem screen.
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
  stylesheet.href = new URL('./aram-mayhem.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  let status = 'loading';
  let error = null;
  let groups = [];
  let augmentIndex = new Map();

  let query = '';
  let matchIndex = 0;

  let disposed = false;
  let loadToken = 0;

  /** The row views of the rendered table. */
  let rowViews = [];
  /** The cell handles of the rendered table, by champion id. */
  const cellHandles = new Map();
  /** The augents a champion pairs with, by champion id. */
  const augmentPairs = new Map();
  /** The champions whose augment pairing has already been requested. */
  const enrichRequested = new Set();
  /** Watches the cells so a champion is enriched when it scrolls into view. */
  let cellObserver = null;
  /** The champions the observer knows about, in render order. */
  let enrichQueue = [];
  /** The cells that match the current search, in display order. */
  let matchHandles = [];

  /* ------------------------------------------------------------------- DOM */
  const header = createHeader({
    t,
    onQuery: (value) => applyQuery(value),
    onClear: () => {
      header.setQuery('');
      applyQuery('');
      header.focus();
    },
    onStep: (delta) => stepMatch(delta),
  });

  const table = createTierTable();

  const page = h('div.page', {}, [header.title, header.element, table.element]);
  container.appendChild(page);

  /* --------------------------------------------------------------- helpers */

  /** The message of the failure state. */
  function failureMessage() {
    if (error && error.message) return String(error.message);
    return t('app.error', null, 'Something went wrong.');
  }

  /**
   * Open a champion.
   *
   * The reference links every champion of the swarm table to the mode screen
   * of the queue (`/lol/modes/aram/{championId}`).
   *
   * @param {object} champion
   */
  function openChampion(champion) {
    if (!champion || typeof ctx.navigate !== 'function') return;
    ctx.navigate('modes', { mode: 'aram', championId: champion.id });
  }

  /**
   * The number of champions the current search lets through.
   *
   * @returns {number}
   */
  function matchCount() {
    return matchHandles.length;
  }

  /**
   * Mark the current match and scroll it into view.
   *
   * Without a search term nothing is marked — the reference drops the
   * highlight as soon as the field is cleared.
   */
  function updateCurrentMatch() {
    const active = query.trim().length > 0;

    matchHandles.forEach((handle, index) => handle.setCurrent(active && index === matchIndex));

    if (!active) return;

    const current = matchHandles[matchIndex];
    if (current) current.scrollIntoView();
  }

  /**
   * Filter the table by the search term and mark the matches.
   *
   * The cells are hidden rather than rebuilt, so the portraits are not
   * fetched again on every keystroke.
   */
  function applyFilter() {
    const needle = query.trim();
    const matches = [];

    for (const view of rowViews) {
      let visible = 0;

      for (const entry of view.cells) {
        const name = String(entry.champion.name || '');
        const hit = !needle || name.toLowerCase().includes(needle.toLowerCase());

        entry.handle.element.hidden = !hit;
        entry.handle.setHighlight(highlightName(name, needle));
        // The current match is marked again below; every other cell loses the
        // mark it may have carried before the search changed.
        entry.handle.setCurrent(false);

        if (hit) {
          visible += 1;
          matches.push(entry.handle);
        }
      }

      view.element.hidden = visible === 0;
    }

    matchHandles = matches;
    matchIndex = Math.min(matchIndex, Math.max(0, matches.length - 1));
    updateCurrentMatch();
  }

  /**
   * Apply a new search term.
   *
   * @param {string} value
   */
  function applyQuery(value) {
    query = String(value ?? '');
    matchIndex = 0;
    applyFilter();
    header.setState({ query, total: matchCount(), index: matchIndex });
  }

  /**
   * Move to the previous / next match.
   *
   * @param {number} delta - `-1` or `1`.
   */
  function stepMatch(delta) {
    const total = matchCount();
    if (!total) return;

    matchIndex = (matchIndex + delta + total) % total;
    updateCurrentMatch();
    header.setState({ query, total, index: matchIndex });
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    if (status === 'loading') {
      replace(table.element, createLoadingState({ t }));
      return;
    }

    if (status === 'error') {
      replace(table.element, createErrorState({
        t,
        message: failureMessage(),
        onRetry: () => { void load(); },
      }));
      return;
    }

    if (!groups.length) {
      replace(table.element, createEmptyState({
        t,
        message: t('app.noChampions', null, 'No champions to show for the current filters.'),
      }));
      return;
    }

    cellHandles.clear();

    rowViews = table.setRows(groups, (champion) => {
      const cell = createChampionCell(champion, {
        query,
        onSelect: openChampion,
      });

      cellHandles.set(champion.id, cell);

      // The augment pairing needs one request per champion, so it is fetched
      // lazily: the cell asks for it when it scrolls into view. Enriching all
      // 170+ champions up front would be 170 requests for data the user may
      // never look at.
      observeCell(cell.element, champion);

      const pair = augmentPairs.get(champion.id);
      if (pair && pair.length) cell.setAugments(pair);

      return cell;
    });

    applyFilter();
    header.setState({ query, total: matchCount(), index: matchIndex });
  }

  /* ------------------------------------------------------------------ data */

  /**
   * Attach the augment pairing of a champion.
   *
   * @param {number} championId
   * @param {Array<object>} augments
   */
  function setAugmentPair(championId, augments) {
    augmentPairs.set(championId, augments);

    const handle = cellHandles.get(championId);
    if (handle) handle.setAugments(augments);
  }

  /**
   * Fetch the augment pairing of one champion.
   *
   * The pairing lives on the per-champion endpoint, so it is fetched lazily:
   * the cell asks for it when it scrolls into view. The requests run a few at
   * a time and every answer updates its own cell.
   *
   * @param {object} champion
   * @param {number} token
   */
  async function enrichChampion(champion, token) {
    if (typeof ctx.api.championDetail !== 'function') return;
    if (!champion || champion.id === null || champion.id === undefined) return;
    if (augmentPairs.has(champion.id) || enrichRequested.has(champion.id)) return;
    enrichRequested.add(champion.id);

    try {
      const payload = await ctx.api.championDetail({
        championId: champion.id,
        mode: MODE,
      });

      if (disposed || token !== loadToken) return;

      const group = extractAugmentGroup(payload);
      const augments = pickAugments(group, augmentIndex);

      if (augments.length) setAugmentPair(champion.id, augments);
    } catch (err) {
      // A failed pairing leaves the cell without augments; it is never faked.
    }
  }

  /**
   * Watch a cell and enrich its champion when it becomes visible.
   *
   * @param {HTMLElement} element
   * @param {object} champion
   */
  function observeCell(element, champion) {
    if (!element) return;
    if (!cellObserver) {
      enrichQueue = [];
      cellObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const championId = Number(entry.target.dataset.championId);
          const queued = enrichQueue.find((item) => item && item.id === championId);
          if (queued) void enrichChampion(queued, loadToken);
        }
      }, { root: null, rootMargin: '200px' });
    }
    element.dataset.championId = String(champion.id);
    enrichQueue.push(champion);
    cellObserver.observe(element);
  }

  /**
   * The arena tier list.
   *
   * The documented contract is `modeTierList('arena')`. The main process
   * reads the mode out of the payload object, so both spellings are tried and
   * the mode of the answer is checked — the screen never shows the ARAM list
   * under the Mayhem title.
   *
   * @returns {Promise<object>}
   */
  async function fetchTierList() {
    const payloads = [{ mode: MODE }, MODE];
    let failure = null;

    for (const payload of payloads) {
      let response = null;

      try {
        response = await ctx.api.modeTierList(payload);
      } catch (err) {
        failure = err;
        continue;
      }

      if (!response || typeof response !== 'object') continue;

      if (response.ok === false) {
        failure = new Error(response.error
          ? String(response.error)
          : 'The ARAM: Mayhem tier list could not be loaded.');
        continue;
      }

      const mode = String(response.mode || '').toLowerCase();
      if (mode && mode !== MODE && mode !== 'mayhem') {
        failure = new Error('The tier list did not answer for the Mayhem queue.');
        continue;
      }

      return response;
    }

    throw failure || new Error('The ARAM: Mayhem tier list is not available.');
  }

  /**
   * Load the tier list, the champion registry and the augment catalogue.
   */
  async function load() {
    const token = ++loadToken;

    status = 'loading';
    error = null;
    render();

    try {
      if (typeof ctx.api.modeTierList !== 'function') {
        throw new Error('The ARAM: Mayhem tier list is not available.');
      }

      const staticRequest = typeof ctx.api.staticData === 'function'
        ? ctx.api.staticData().catch(() => null)
        : Promise.resolve(null);

      const [tierPayload, staticPayload] = await Promise.all([
        fetchTierList(),
        staticRequest,
      ]);

      if (disposed || token !== loadToken) return;

      const rows = normalizeTierRows(tierPayload);
      const champions = buildChampionIndex(staticPayload);

      augmentIndex = buildAugmentIndex(staticPayload);

      const decorated = decorateRows(rows, champions);
      groups = groupByTier(decorated);
      augmentPairs.clear();

      status = 'ready';
      render();

      // The augment pairing is fetched lazily, when a cell scrolls into view.
    } catch (err) {
      if (disposed || token !== loadToken) return;

      error = err;
      status = 'error';
      groups = [];
      render();
    }
  }

  /* ------------------------------------------------------------- shortcuts */

  /**
   * The reference's own keyboard shortcuts: Enter / Shift+Enter step through
   * the matches, Ctrl+F (Cmd+F) focuses the search field.
   *
   * @param {KeyboardEvent} event
   */
  function onKeyDown(event) {
    if (event.key === 'Enter' && event.target === header.input && query.trim()) {
      event.preventDefault();
      stepMatch(event.shiftKey ? -1 : 1);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      header.focus();
    }
  }

  document.addEventListener('keydown', onKeyDown);

  const offLocale = ctx.bus && typeof ctx.bus.on === 'function'
    ? ctx.bus.on('i18n:locale', () => render())
    : null;

  void load();

  /* -------------------------------------------------------------- lifecycle */
  return () => {
    disposed = true;
    loadToken += 1;

    if (cellObserver) {
      cellObserver.disconnect();
      cellObserver = null;
    }
    enrichQueue = [];

    document.removeEventListener('keydown', onKeyDown);
    if (typeof offLocale === 'function') offLocale();

    if (stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    replace(container, null);
  };
}
