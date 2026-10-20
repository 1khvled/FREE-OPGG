/**
 * Leaderboard — the ranked ladder by region and tier.
 *
 * Reference: `LoLHome.3dc65272.bundle.js` (the LoL landing screen that owns
 * the region / tier selector pair) rendered with the desktop app's table
 * geometry from `docs/rea/desktop-ui.md` §3.
 *
 * Data source: `ctx.api.leaderboard({ region, tier, page })`. The handler
 * lives in the main process; when it cannot resolve a leaderboard path it
 * answers `{ ok: false, error }` and this screen renders the error state with
 * a retry button instead of inventing rows.
 *
 * Store slice: `state.leaderboard`
 *   { rows, loading, error, filters: { region, tier }, page, totalPages, total, sort }
 */

import { h, replace, clear } from '../../core/dom.js';
import { createSelect, createButton } from '../_shared/form-controls.js';
import { createDataTable, sortRows, toggleSort } from '../_shared/data-table.js';
import { createLoadingSkeleton, createErrorState, createEmptyState } from '../_shared/states.js';
import { createSummonerAvatar, createTierBadge } from '../_shared/media.js';
import { formatWinRate, toPercent } from '../_shared/format.js';

export const meta = { id: 'leaderboard', title: 'common.leaderboards', order: 30 };

/* --------------------------------------------------------------------------
 * Option catalogues
 * ----------------------------------------------------------------------- */

/** Region codes the champion API accepts. */
export const REGION_OPTIONS = [
  { value: 'GLOBAL', labelKey: 'common.lol.region.global', fallback: 'All Regions' },
  { value: 'KR', labelKey: 'common.lol.region.kr', fallback: 'Korea' },
  { value: 'NA', labelKey: 'common.lol.region.na', fallback: 'North America' },
  { value: 'EUW', labelKey: 'common.lol.region.euw', fallback: 'Europe West' },
  { value: 'EUNE', labelKey: 'common.lol.region.eune', fallback: 'Europe Nordic & East' },
  { value: 'OCE', labelKey: 'common.lol.region.oce', fallback: 'Oceania' },
  { value: 'BR', labelKey: 'common.lol.region.br', fallback: 'Brazil' },
  { value: 'JP', labelKey: 'common.lol.region.jp', fallback: 'Japan' },
  { value: 'LAN', labelKey: 'common.lol.region.lan', fallback: 'Latin America North' },
  { value: 'LAS', labelKey: 'common.lol.region.las', fallback: 'Latin America South' },
];

/** Ranked tiers the ladder offers, highest first. */
export const TIER_OPTIONS = [
  { value: 'challenger', labelKey: 'common.lol.tier.challenger', fallback: 'Challenger' },
  { value: 'grandmaster', labelKey: 'common.lol.tier.grandmaster', fallback: 'Grandmaster' },
  { value: 'master', labelKey: 'common.lol.tier.master', fallback: 'Master' },
  { value: 'diamond_plus', labelKey: 'common.lol.tier.diamond', fallback: 'Diamond', suffix: ' +' },
  { value: 'emerald_plus', labelKey: 'common.lol.tier.emerald', fallback: 'Emerald', suffix: ' +' },
  { value: 'platinum_plus', labelKey: 'common.lol.tier.platinum', fallback: 'Platinum', suffix: ' +' },
  { value: 'gold_plus', labelKey: 'common.lol.tier.gold', fallback: 'Gold', suffix: ' +' },
  { value: 'silver_plus', labelKey: 'common.lol.tier.silver', fallback: 'Silver', suffix: ' +' },
  { value: 'all', labelKey: 'common.lol.tier.all', fallback: 'All Tiers' },
];

/* --------------------------------------------------------------------------
 * Normalisers
 * ----------------------------------------------------------------------- */

/** First defined, non-empty value out of a list of candidates. */
function pick(source, keys) {
  if (!source || typeof source !== 'object') return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

/** Coerce to a finite number, or null. */
function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Pull the row array out of whatever the main process returned.
 *
 * Accepted shapes: a bare array, `{ data: [...] }`, `{ leaderboard: [...] }`,
 * `{ rows: [...] }`, `{ data: { data: [...] } }` and `{ data: { rows: [...] } }`.
 *
 * @param {any} payload
 * @returns {any[]}
 */
export function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const containers = ['data', 'leaderboard', 'rows', 'list', 'players', 'summoners', 'entries'];
  for (const key of containers) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const inner of containers) {
        if (Array.isArray(value[inner])) return value[inner];
      }
    }
  }
  return [];
}

/**
 * Pull the pagination meta out of the payload.
 *
 * @param {any} payload
 * @returns {{page:number|null,totalPages:number|null,total:number|null}}
 */
export function extractMeta(payload) {
  const meta = payload && typeof payload === 'object'
    ? (payload.meta || payload.pagination || payload.meta_info || null)
    : null;
  if (!meta || typeof meta !== 'object') return { page: null, totalPages: null, total: null };

  const page = toNumber(pick(meta, ['current_page', 'page', 'currentPage']));
  const totalPages = toNumber(pick(meta, ['last_page', 'total_pages', 'totalPages', 'pages']));
  const total = toNumber(pick(meta, ['total', 'total_count', 'count']));
  return { page, totalPages, total };
}

/**
 * Normalise one ladder row.
 *
 * Field aliases:
 *   name      `summoner` (string), `name`, `game_name`, `summoner_name`
 *   tier      `tier`, `rank_tier`, `tier_info.tier`
 *   division  `division`, `tier_info.division`
 *   lp        `lp`, `league_points`, `tier_info.lp`
 *   win rate  `win_rate` (fraction 0..1) or `wins` / `losses`
 *   matches   `matches`, `total_matches`, `games`, or wins + losses
 *
 * @param {any} raw
 * @param {number} index
 * @returns {object}
 */
export function normalizeRow(raw, index = 0) {
  const row = raw && typeof raw === 'object' ? raw : {};
  const nested = row.summoner && typeof row.summoner === 'object' ? row.summoner : {};

  const name = (() => {
    const direct = pick(row, ['name', 'summoner_name', 'game_name', 'nickname', 'display_name']);
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    const inner = pick(nested, ['name', 'game_name', 'summoner_name', 'nickname']);
    if (typeof inner === 'string' && inner.trim()) return inner.trim();
    if (typeof row.summoner === 'string' && row.summoner.trim()) return row.summoner.trim();
    // The Riot ID game name is the fallback when the profile has no display name.
    const gameName = pick(nested, ['gameName', 'game_name']);
    if (typeof gameName === 'string' && gameName.trim()) return gameName.trim();
    return '';
  })();

  const tagline = (() => {
    const direct = pick(row, ['tagline', 'tag_line', 'tagLine']);
    if (typeof direct === 'string') return direct.trim();
    const inner = pick(nested, ['tagline', 'tag_line', 'tagLine']);
    return typeof inner === 'string' ? inner.trim() : '';
  })();

  const tierInfo = row.tier_info && typeof row.tier_info === 'object' ? row.tier_info : {};

  /* The reference keeps the rank inside the summoner's ranked queue entry. */
  const leagueStats = Array.isArray(row.league_stats)
    ? row.league_stats
    : (Array.isArray(nested.league_stats) ? nested.league_stats : []);
  const solo = leagueStats.find((entry) => entry && String(entry.game_type || entry.queue_type || '').toUpperCase() === 'SOLORANKED')
    || leagueStats.find((entry) => entry && String(entry.game_type || entry.queue_type || '').toUpperCase() === 'FLEXRANKED')
    || leagueStats[0]
    || null;
  const soloTier = solo && solo.tier_info && typeof solo.tier_info === 'object' ? solo.tier_info : {};

  const tier = (() => {
    const direct = pick(row, ['tier', 'rank_tier', 'rankTier']);
    if (direct !== undefined) return String(direct);
    if (tierInfo.tier !== undefined) return String(tierInfo.tier);
    if (soloTier.tier !== undefined) return String(soloTier.tier);
    const inner = pick(nested, ['tier', 'rank_tier']);
    return inner !== undefined ? String(inner) : '';
  })();

  const division = (() => {
    const direct = pick(row, ['division', 'tier_division', 'rank_division', 'tierDivision']);
    if (direct !== undefined) return String(direct);
    if (tierInfo.division !== undefined) return String(tierInfo.division);
    if (soloTier.division !== undefined) return String(soloTier.division);
    const inner = pick(nested, ['division', 'tier_division', 'tierDivision']);
    return inner !== undefined ? String(inner) : '';
  })();

  const lp = (() => {
    const direct = toNumber(pick(row, ['lp', 'league_points', 'leaguePoints', 'points']));
    if (direct !== null) return direct;
    const info = toNumber(pick(tierInfo, ['lp', 'league_points']));
    if (info !== null) return info;
    const soloInfo = toNumber(pick(soloTier, ['lp', 'league_points']));
    if (soloInfo !== null) return soloInfo;
    return toNumber(pick(nested, ['lp', 'league_points']));
  })();

  const wins = toNumber(pick(row, ['wins', 'total_wins', 'win_count']))
    ?? toNumber(pick(solo || {}, ['win', 'wins', 'total_wins']))
    ?? toNumber(pick(nested, ['win', 'wins', 'total_wins']));
  const losses = toNumber(pick(row, ['losses', 'total_losses', 'lose_count', 'loss_count']))
    ?? toNumber(pick(solo || {}, ['lose', 'loss', 'losses', 'total_losses']))
    ?? toNumber(pick(nested, ['lose', 'loss', 'losses', 'total_losses']));

  const winRate = (() => {
    const rate = toPercent(pick(row, ['win_rate', 'winRate', 'win_ratio']))
      ?? toPercent(pick(nested, ['win_rate', 'winRate', 'win_ratio']));
    if (rate !== null) return rate;
    if (wins !== null && losses !== null && wins + losses > 0) {
      return (wins / (wins + losses)) * 100;
    }
    return null;
  })();

  const matches = (() => {
    const direct = toNumber(pick(row, ['matches', 'total_matches', 'games', 'game_count', 'played']))
      ?? toNumber(pick(nested, ['matches', 'total_matches', 'games', 'game_count', 'played']));
    if (direct !== null) return direct;
    if (wins !== null || losses !== null) return (wins || 0) + (losses || 0);
    return null;
  })();

  const rank = toNumber(pick(row, ['rank', 'position', 'rank_num', 'ranking'])) ?? (index + 1);

  const iconUrl = (() => {
    const direct = pick(row, ['profile_image_url', 'profileImageUrl', 'icon_url', 'image_url', 'profile_icon']);
    if (typeof direct === 'string') return direct;
    const iconId = toNumber(pick(row, ['profileIconId', 'profile_icon_id', 'icon_id']));
    if (iconId !== null) {
      return `https://opgg-static.akamaized.net/images/profile_icons/profileIcon${iconId}.jpg`;
    }
    const inner = pick(nested, ['profile_image_url', 'profileIconId']);
    if (typeof inner === 'string') return inner;
    return null;
  })();

  const level = toNumber(pick(row, ['level', 'summoner_level', 'summonerLevel']))
    ?? toNumber(pick(nested, ['level', 'summoner_level', 'summonerLevel']));

  const tierImageUrl = (() => {
    const direct = pick(row, ['tier_image_url', 'tierImageUrl']);
    if (typeof direct === 'string') return direct;
    if (tierInfo.tier_image_url) return String(tierInfo.tier_image_url);
    return null;
  })();

  return {
    rank,
    name,
    tagline,
    level,
    iconUrl,
    tier,
    division,
    lp,
    winRate,
    wins,
    losses,
    matches,
    tierImageUrl,
  };
}

/**
 * Normalise a whole leaderboard payload.
 *
 * @param {any} payload
 * @returns {{rows:object[], page:number|null, totalPages:number|null, total:number|null}}
 */
export function normalizeLeaderboard(payload) {
  const meta = extractMeta(payload);
  const rows = extractRows(payload).map((row, index) => normalizeRow(row, index));
  return { rows, ...meta };
}

/* --------------------------------------------------------------------------
 * Page
 * ----------------------------------------------------------------------- */

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 * @returns {() => void} cleanup
 */
export function mount(container, ctx) {
  const { store, api, i18n } = ctx;
  const t = (key, vars, fallback) => (i18n && i18n.t ? i18n.t(key, vars, fallback) : (fallback ?? key));

  /* ---- stylesheet ------------------------------------------------------- */
  const sharedLink = document.createElement('link');
  sharedLink.rel = 'stylesheet';
  sharedLink.href = new URL('../_shared/shared.css', import.meta.url).href;
  document.head.appendChild(sharedLink);

  const pageLink = document.createElement('link');
  pageLink.rel = 'stylesheet';
  pageLink.href = new URL('./leaderboard.css', import.meta.url).href;
  document.head.appendChild(pageLink);

  /* ---- root ------------------------------------------------------------- */
  const root = h('section.page.page--leaderboard');
  const toolbar = h('div.lb-toolbar');
  const body = h('div.lb-body');
  const pagination = h('nav.lb-pagination', { 'aria-label': 'Pagination' });
  root.appendChild(toolbar);
  root.appendChild(body);
  root.appendChild(pagination);
  container.appendChild(root);

  let disposed = false;
  let requestId = 0;

  /* ---- state ------------------------------------------------------------ */
  const slice = store.getState().leaderboard || {};
  const filters = { ...(slice.filters || { region: 'GLOBAL', tier: 'challenger' }) };
  if (!filters.region) filters.region = 'GLOBAL';
  if (!filters.tier) filters.tier = 'challenger';

  let page = Number(slice.page) > 0 ? Number(slice.page) : 1;
  let sort = slice.sort || { column: 'rank', direction: 'asc' };

  /* ---- helpers ---------------------------------------------------------- */
  function commit(patch) {
    const current = store.getState().leaderboard || {};
    store.setState({
      leaderboard: {
        ...current,
        filters: { ...current.filters, ...filters },
        page,
        sort,
        ...patch,
      },
    });
  }

  function regionLabel(value) {
    const option = REGION_OPTIONS.find((entry) => entry.value === value);
    if (!option) return value;
    return `${t(option.labelKey, null, option.fallback)}`;
  }

  function tierLabel(value) {
    const option = TIER_OPTIONS.find((entry) => entry.value === value);
    if (!option) return value;
    const base = t(option.labelKey, null, option.fallback);
    return option.suffix ? `${base}${option.suffix}` : base;
  }

  /* ---- data ------------------------------------------------------------- */
  async function load() {
    const id = ++requestId;
    commit({ loading: true, error: null });

    let payload = null;
    try {
      payload = await api.leaderboard({ region: filters.region, tier: filters.tier, page });
    } catch (err) {
      if (id !== requestId || disposed) return;
      commit({
        loading: false,
        error: (err && err.message) ? err.message : String(err),
        rows: [],
      });
      return;
    }
    if (id !== requestId || disposed) return;

    if (payload && payload.ok === false) {
      commit({
        loading: false,
        error: payload.error ? String(payload.error) : t('common.error.title'),
        rows: [],
      });
      return;
    }

    const { rows, totalPages, total } = normalizeLeaderboard(payload);
    commit({
      loading: false,
      error: null,
      rows,
      totalPages: totalPages && totalPages > 0 ? totalPages : null,
      total: total === null ? null : total,
    });
  }

  /* ---- rendering -------------------------------------------------------- */
  function renderToolbar() {
    clear(toolbar);

    toolbar.appendChild(h('div.lb-toolbar__group', null, [
      h('span.lb-toolbar__label', { text: 'Region' }),
      createSelect({
        id: 'lb-region',
        ariaLabel: 'Region',
        value: filters.region,
        options: REGION_OPTIONS.map((option) => ({
          value: option.value,
          label: regionLabel(option.value),
        })),
        onChange: (value) => {
          filters.region = value;
          page = 1;
          void load();
        },
      }),
    ]));

    toolbar.appendChild(h('div.lb-toolbar__group', null, [
      h('span.lb-toolbar__label', { text: t('common.tier', null, 'Tier') }),
      createSelect({
        id: 'lb-tier',
        ariaLabel: t('common.tier', null, 'Tier'),
        value: filters.tier,
        options: TIER_OPTIONS.map((option) => ({
          value: option.value,
          label: tierLabel(option.value),
        })),
        onChange: (value) => {
          filters.tier = value;
          page = 1;
          void load();
        },
      }),
    ]));

    toolbar.appendChild(h('div.lb-toolbar__actions', null, [
      createButton({
        label: t('common.refresh', null, 'Refresh'),
        onClick: () => void load(),
      }),
    ]));
  }

  function renderBody() {
    const sliceNow = store.getState().leaderboard || {};
    clear(body);

    if (sliceNow.loading) {
      body.appendChild(createLoadingSkeleton({
        rows: 10,
        columns: 6,
        label: t('common.loading-rankings', null, 'Loading rankings...'),
      }));
      return;
    }

    if (sliceNow.error) {
      body.appendChild(createErrorState({
        title: t('common.error.title', null, 'Something went wrong.'),
        detail: sliceNow.error,
        onRetry: () => void load(),
        retryLabel: t('lol.buff-nerf.retry', null, 'Retry'),
      }));
      return;
    }

    const rows = Array.isArray(sliceNow.rows) ? sliceNow.rows : [];
    if (rows.length === 0) {
      body.appendChild(createEmptyState({
        title: t('common.no-records', null, 'No records'),
        description: t('common.search-bar.search-result-empty', null, 'No results found.'),
      }));
      return;
    }

    const columns = [
      {
        key: 'rank',
        label: '#',
        width: 36,
        align: 'center',
        numeric: true,
        sortable: true,
        render: (row) => String(row.rank ?? '—'),
      },
      {
        key: 'name',
        label: t('common.player-name', null, 'Player Name'),
        flex: true,
        sortable: true,
        render: (row) => h('div.lb-summoner', null, [
          createSummonerAvatar({ url: row.iconUrl, size: 28, level: row.level }),
          h('div.lb-summoner__text', null, [
            h('span.lb-summoner__name', { text: row.name || '—' }),
            row.tagline ? h('span.lb-summoner__tag', { text: `#${row.tagline}` }) : null,
          ]),
        ]),
      },
      {
        key: 'tier',
        label: t('common.tier', null, 'Tier'),
        width: 92,
        sortable: true,
        sortValue: (row) => `${row.tier} ${row.division}`,
        render: (row) => createTierBadge({
          tier: row.tier,
          division: row.division,
          imageUrl: row.tierImageUrl,
          size: 24,
          title: `${row.tier} ${row.division}`.trim(),
        }),
      },
      {
        key: 'lp',
        label: 'LP',
        width: 72,
        align: 'center',
        numeric: true,
        sortable: true,
        render: (row) => (row.lp === null ? '—' : String(row.lp)),
      },
      {
        key: 'winRate',
        label: t('common.win-rate', null, 'WR'),
        width: 84,
        align: 'center',
        numeric: true,
        sortable: true,
        render: (row) => (row.winRate === null ? '—' : formatWinRate(row.winRate)),
      },
      {
        key: 'matches',
        label: t('common.matches', null, 'Matches'),
        width: 84,
        align: 'center',
        numeric: true,
        sortable: true,
        render: (row) => (row.matches === null ? '—' : String(row.matches)),
      },
    ];

    const sorted = sortRows(rows, columns, sort);

    body.appendChild(createDataTable({
      columns,
      rows: sorted,
      sort,
      onSort: (key) => {
        sort = toggleSort(sort, key);
        commit({});
      },
      onRowClick: (row) => {
        if (!row.name || typeof ctx.navigate !== 'function') return;
        const riotId = row.tagline ? `${row.name}#${row.tagline}` : row.name;
        ctx.navigate('my-page', { riotId, region: filters.region });
      },
      label: t('common.leaderboards', null, 'Leaderboards'),
    }));
  }

  function renderPagination() {
    const sliceNow = store.getState().leaderboard || {};
    clear(pagination);
    pagination.style.display = sliceNow.loading || sliceNow.error ? 'none' : '';

    const totalPages = sliceNow.totalPages;
    const hasPrev = page > 1;
    const hasNext = totalPages ? page < totalPages : true;

    pagination.appendChild(createButton({
      label: '‹',
      ariaLabel: 'Previous page',
      disabled: !hasPrev,
      onClick: () => {
        if (!hasPrev) return;
        page -= 1;
        void load();
      },
    }));

    const total = sliceNow.total;
    pagination.appendChild(h('span.lb-pagination__label', {
      text: totalPages
        ? `${page} / ${totalPages}`
        : (total !== null && total !== undefined ? `${page} · ${total}` : String(page)),
    }));

    pagination.appendChild(createButton({
      label: '›',
      ariaLabel: 'Next page',
      disabled: !hasNext,
      onClick: () => {
        if (!hasNext) return;
        page += 1;
        void load();
      },
    }));
  }

  function render() {
    if (disposed) return;
    renderToolbar();
    renderBody();
    renderPagination();
  }

  /* ---- wiring ----------------------------------------------------------- */
  const unsubscribe = store.subscribe((state, changed) => {
    if (changed.includes('leaderboard')) render();
  });

  render();
  void load();

  return () => {
    disposed = true;
    requestId += 1;
    unsubscribe();
    sharedLink.remove();
    pageLink.remove();
    clear(root);
  };
}
