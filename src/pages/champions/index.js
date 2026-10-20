/**
 * Champions screen — the desktop app's tier list.
 *
 * The layout follows `docs/rea/desktop-ui.md` (the shipped desktop renderer),
 * not the web app:
 *
 *   div.champion-statistics
 *     div.statistics-tabs          role tabs + region / tier / patch dropdowns
 *     div.champion-statistics-bottom
 *       div.champion-statistics-search          the champion portrait grid
 *       div.champion-statistics-table-wrapper   the seven column tier list
 *
 * The page contract is the one described in `docs/SPEC.md`: `meta` describes
 * the route, `mount(container, ctx)` builds the screen and returns a cleanup
 * function.
 */

import { h, clear, debounce } from '../../core/dom.js';
import {
  COLUMNS,
  DEFAULT_ROLE,
  REGION_OPTIONS,
  ROLE_TABS,
  TIER_OPTIONS,
  buildPatchOptions,
  collectChampionRecords,
  createIndexFromRecords,
  createNameIndex,
  defaultDirection,
  extractMeta,
  normalizeRows,
  sortRows,
} from './data.js';
import { createRoleTabs } from './parts/role-tabs.js';
import { createFilterBar } from './parts/filter-bar.js';
import { createChampionGrid } from './parts/champion-grid.js';
import { createTable } from './parts/table.js';
import { createModalHost } from './parts/modal-host.js';
import {
  createEmptyState,
  createErrorState,
  createSkeletonTable,
  setSlotContent,
} from './parts/states.js';

/** Route metadata. */
export const meta = { id: 'champions', title: 'common.Champions', order: 10 };

/** How long the filter changes are collected before the list is reloaded. */
const FILTER_DEBOUNCE_MS = 250;

/** Keep only the roles the desktop app has a tab for. */
function normalizeRole(value) {
  const candidate = String(value ?? '').toUpperCase();
  return ROLE_TABS.some((tab) => tab.value === candidate) ? candidate : DEFAULT_ROLE;
}

/**
 * Mount the champions screen.
 *
 * @param {HTMLElement} container
 * @param {object} ctx - `{ store, api, i18n, bus, navigate, params, helpers }`.
 * @returns {() => void} cleanup.
 */
export function mount(container, ctx) {
  const t = ctx.i18n.t;

  /** First value that is neither `null`, `undefined` nor an empty string. */
  function firstDefinedParam(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === '') continue;
      return value;
    }
    return undefined;
  }

  /* ---------------------------------------------------------------- styles */
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./champions.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  const stored = ctx.store.getState().champions || {};
  const storedFilters = stored.filters || {};
  const params = ctx.params || {};

  let filters = {
    role: normalizeRole(firstDefinedParam(params.role, storedFilters.role)),
    tier: String(firstDefinedParam(params.tier, storedFilters.tier) || 'emerald_plus'),
    region: String(firstDefinedParam(params.region, storedFilters.region) || 'GLOBAL'),
    queue: String(firstDefinedParam(params.queue, storedFilters.queue) || 'ranked'),
    patch: firstDefinedParam(params.patch, storedFilters.patch) || null,
    showAll: Boolean(storedFilters.showAll),
  };

  let sort = {
    column: (stored.sort && stored.sort.column) || 'rank',
    direction: (stored.sort && stored.sort.direction) === 'desc' ? 'desc' : 'asc',
  };

  let rows = [];
  let lastPayload = null;
  let names = createNameIndex();
  let champions = [];
  let query = '';
  let status = 'loading';
  let error = null;
  let patchVersion = null;

  /* ------------------------------------------------------------------- DOM */
  const page = h('div.champion-statistics');

  const roleTabs = createRoleTabs({
    tabs: ROLE_TABS,
    value: filters.role,
    t,
    onChange: (role) => applyFilters({ role }),
  });

  const filterBar = createFilterBar({
    t,
    filters,
    options: {
      region: REGION_OPTIONS,
      tier: TIER_OPTIONS,
      patch: buildPatchOptions(null),
    },
    onChange: (patch) => applyFilters(patch),
  });

  const tabs = h('div.statistics-tabs', {}, [
    roleTabs.element,
    filterBar.element,
  ]);

  const grid = createChampionGrid({
    t,
    onSelect: (champion) => openChampion(champion),
    onQuery: (value) => {
      query = value;
      render();
    },
  });

  const table = createTable({
    t,
    sort,
    onSort: (column) => toggleSort(column),
    onRowClick: (row) => openChampion(row),
  });
  table.setRole(filters.role);

  const tableSlot = h('div.champion-statistics-table-wrapper');
  tableSlot.appendChild(table.element);

  const bottom = h('div.champion-statistics-bottom', {}, [
    grid.element,
    tableSlot,
  ]);

  page.append(tabs, bottom);
  container.appendChild(page);

  const modal = createModalHost({ ctx, t });

  /* --------------------------------------------------------------- helpers */

  function persistFilters() {
    ctx.store.update('champions.filters', { ...filters });
  }

  function persistSort() {
    ctx.store.update('champions.sort', { ...sort });
  }

  function applyFilters(patch) {
    filters = { ...filters, ...patch };
    if (patch.role !== undefined) filters.role = normalizeRole(patch.role);
    filterBar.setValues(filters);
    roleTabs.setValue(filters.role);
    table.setRole(filters.role);
    persistFilters();
    scheduleLoad();
  }

  function toggleSort(column) {
    const definition = COLUMNS.find((entry) => entry.id === column);
    if (definition && definition.sortable === false) return;

    const direction = sort.column === column
      ? (sort.direction === 'asc' ? 'desc' : 'asc')
      : defaultDirection(column);

    sort = { column, direction };
    persistSort();
    table.setSort(sort);
    render();
  }

  function visibleRows() {
    if (!query) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) => String(row.name || '').toLowerCase().includes(needle));
  }

  function showTable() {
    if (tableSlot.firstChild !== table.element) {
      clear(tableSlot);
      tableSlot.appendChild(table.element);
    }
  }

  function render() {
    if (status === 'loading') {
      setSlotContent(tableSlot, createSkeletonTable());
      return;
    }

    if (status === 'error') {
      setSlotContent(tableSlot, createErrorState({
        message: error && error.message ? error.message : 'Failed to load the champion list.',
        onRetry: () => { void load(); },
        t,
      }));
      return;
    }

    const visible = visibleRows();
    if (!visible.length) {
      setSlotContent(tableSlot, createEmptyState({
        message: t('lol.champions.change-filter', null, 'There is not enough data to show. Change region, tier, or patch filter above to see more data.'),
      }));
      return;
    }

    showTable();
    table.setRows(sortRows(visible, sort));
  }

  function openChampion(champion) {
    const row = champion && champion.id !== undefined && champion.id !== null
      ? (rows.find((entry) => entry.id === champion.id) || champion)
      : (rows.find((entry) => entry.name === champion.name) || champion);
    void modal.show(row);
  }

  /* ------------------------------------------------------------------ data */

  async function loadStatic() {
    if (typeof ctx.api.staticData !== 'function') return;
    try {
      const raw = await ctx.api.staticData();
      const records = collectChampionRecords(raw);
      if (!records.length) return;
      names = createIndexFromRecords(records);
      champions = records;
      // The champion names also resolve the counter champions, so the rows
      // are normalised once more now that the index is known.
      if (lastPayload) {
        rows = normalizeRows(lastPayload, { role: filters.role, names });
        render();
      }
    } catch {
      // The champion metadata is optional; the rows carry their own names.
    }
  }

  function applyPatchVersion(version) {
    if (!version || version === patchVersion) return;
    patchVersion = version;
    filterBar.setPatchOptions(buildPatchOptions(version));
    // The reference's patch toggle shows the current patch ("16.20"), so the
    // live patch is the default selection rather than a separate "Latest".
    if (!filters.patch) {
      filters = { ...filters, patch: version };
      filterBar.setValues({ patch: version });
    }
  }

  async function load() {
    status = 'loading';
    error = null;
    render();

    try {
      const payload = await ctx.api.champions({
        role: filters.role,
        tier: filters.tier,
        region: filters.region,
        queue: filters.queue,
        patch: filters.patch,
        showAll: filters.showAll,
      });

      const metaBlock = extractMeta(payload);
      if (metaBlock.version) applyPatchVersion(metaBlock.version);

      lastPayload = payload;
      rows = normalizeRows(payload, { role: filters.role, names });
      status = 'ready';
    } catch (err) {
      error = err;
      status = 'error';
    }

    render();
    renderGrid();
  }

  function renderGrid() {
    const source = champions.length
      ? champions
      : rows.map((row) => ({
        id: row.id,
        key: row.key,
        name: row.name,
        title: row.title,
        imageUrl: row.imageUrl,
        square: row.square,
      }));

    grid.setChampions(source);
  }

  const scheduleLoad = debounce(() => { void load(); }, FILTER_DEBOUNCE_MS);

  /* -------------------------------------------------------------- lifecycle */

  const unsubscribe = ctx.store.subscribe((state, changed) => {
    if (!changed.includes('champions')) return;

    const stateChampions = state.champions || {};
    const nextFilters = stateChampions.filters || {};
    const nextSort = stateChampions.sort || {};

    const roleChanged = normalizeRole(nextFilters.role) !== filters.role;
    const filterChanged = roleChanged
      || nextFilters.tier !== filters.tier
      || nextFilters.region !== filters.region
      || (nextFilters.patch ?? null) !== (filters.patch ?? null)
      || nextFilters.queue !== filters.queue
      || Boolean(nextFilters.showAll) !== filters.showAll;

    if (filterChanged) {
      filters = {
        ...filters,
        role: normalizeRole(nextFilters.role),
        tier: nextFilters.tier ?? filters.tier,
        region: nextFilters.region ?? filters.region,
        queue: nextFilters.queue ?? filters.queue,
        patch: nextFilters.patch ?? null,
        showAll: Boolean(nextFilters.showAll),
      };
      filterBar.setValues(filters);
      roleTabs.setValue(filters.role);
      table.setRole(filters.role);
      scheduleLoad();
    }

    if (nextSort.column !== sort.column || nextSort.direction !== sort.direction) {
      sort = { column: nextSort.column, direction: nextSort.direction };
      table.setSort(sort);
      render();
    }
  });

  // The list is loaded immediately; the static champion metadata (which
  // resolves the champion names and the counter champions) is merged in as
  // soon as it arrives.
  void load();
  void loadStatic().then(() => renderGrid());

  // Make the store reflect the normalised filters (the shared default role is
  // "ALL", which the desktop app does not have a tab for).
  persistFilters();
  persistSort();

  return () => {
    unsubscribe();
    modal.destroy();
    if (stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    clear(container);
  };
}
