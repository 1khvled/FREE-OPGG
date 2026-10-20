/**
 * Multi-search — look up several summoners at once.
 *
 * Reference: `Multisearch.5a65d8b2.bundle.js` plus the desktop app's
 * `.multisearch` / `.ms-*` stylesheet recovered from `app.17903a6b.js`.
 * The reference screen is fed by the League Client during champion select;
 * the replica exposes the same card layout as a standalone search so the
 * information can be fetched for any region.
 *
 * Data source: `ctx.api.multiSearch({ query, region })`.
 * Store slice: `state.multisearch`
 *   { results, loading, error, query, region, recent: [], history: [] }
 */

import { h, clear } from '../../core/dom.js';
import { createSelect, createButton, createSearchInput, splitQuery } from '../_shared/form-controls.js';
import { createLoadingSkeleton, createErrorState, createEmptyState } from '../_shared/states.js';
import { createSummonerAvatar, createTierBadge, loadChampionCatalogue, championImageUrl } from '../_shared/media.js';
import { formatRelativeTime, formatKda, toPercent } from '../_shared/format.js';

export const meta = { id: 'multisearch', title: 'common.live.tab.multisearch', order: 40 };

/** The reference shows at most five recent searches. */
const MAX_RECENT = 5;

/** Region codes the summoner API accepts. */
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

/** Lane icons shipped by the desktop app. */
const LANE_ICONS = {
  TOP: 'icon-position-TOP-wh.svg',
  JUNGLE: 'icon-position-JUNGLE-wh.svg',
  MID: 'icon-position-MID-wh.svg',
  MIDDLE: 'icon-position-MID-wh.svg',
  ADC: 'icon-position-ADC-wh.svg',
  BOTTOM: 'icon-position-ADC-wh.svg',
  SUPPORT: 'icon-position-SUPPORT-wh.svg',
  UTILITY: 'icon-position-SUPPORT-wh.svg',
};

const LANE_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

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
 * Pull the result list out of whatever the main process returned.
 *
 * Accepted shapes: a bare array, `{ data: [...] }`, `{ results: [...] }`,
 * `{ summoners: [...] }` and one nested level of the same.
 *
 * @param {any} payload
 * @returns {any[]}
 */
export function extractResults(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const containers = ['data', 'results', 'summoners', 'list', 'items', 'players'];
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
 * Normalise a single recent game entry.
 *
 * @param {any} raw
 * @returns {object}
 */
export function normalizeGame(raw) {
  const game = raw && typeof raw === 'object' ? raw : {};
  const championId = pick(game, ['champion_id', 'championId', 'champion']);
  const result = pick(game, ['result', 'win', 'is_win', 'isWin']);
  const isWin = (() => {
    if (typeof result === 'boolean') return result;
    if (typeof result === 'string') return /^(win|victory|true|1)$/i.test(result.trim());
    const numeric = toNumber(result);
    if (numeric !== null) return numeric > 0;
    return null;
  })();

  return {
    championId: championId === undefined ? null : championId,
    position: String(pick(game, ['position', 'lane', 'role']) || '').toUpperCase(),
    isWin,
    isRemake: Boolean(pick(game, ['is_remake', 'isRemake'])),
    kill: toNumber(pick(game, ['kill', 'kills', 'k'])),
    death: toNumber(pick(game, ['death', 'deaths', 'd'])),
    assist: toNumber(pick(game, ['assist', 'assists', 'a'])),
    createdAt: pick(game, ['created_at', 'createdAt', 'start_time', 'timestamp', 'ended_at']) || null,
    queue: String(pick(game, ['queue_type', 'queueType', 'game_type', 'queue']) || ''),
  };
}

/**
 * Normalise one "most played champion" entry.
 *
 * @param {any} raw
 * @returns {object}
 */
export function normalizeChampionStat(raw) {
  const stat = raw && typeof raw === 'object' ? raw : {};
  const id = pick(stat, ['id', 'champion_id', 'championId']);
  const win = toNumber(pick(stat, ['win', 'wins', 'win_count']));
  const play = toNumber(pick(stat, ['play', 'games', 'played', 'count']));
  const lose = toNumber(pick(stat, ['lose', 'loss', 'losses']));

  const total = play !== null
    ? play
    : (win !== null || lose !== null ? (win || 0) + (lose || 0) : null);

  return {
    id: id === undefined ? null : id,
    kill: toNumber(pick(stat, ['kill', 'kills', 'k'])) ?? 0,
    death: toNumber(pick(stat, ['death', 'deaths', 'd'])) ?? 0,
    assist: toNumber(pick(stat, ['assist', 'assists', 'a'])) ?? 0,
    win: win ?? 0,
    play: total,
    winRate: (win !== null && total) ? toPercent(win / total) : null,
  };
}

/**
 * Normalise one search result.
 *
 * The reference shape is `{ summoner, recent_game_stats }`; the flat shape
 * (`{ name, level, league_stats, ... }`) is accepted too.
 *
 * @param {any} raw
 * @returns {object}
 */
export function normalizeResult(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const summoner = item.summoner && typeof item.summoner === 'object' ? item.summoner : item;

  const leagueStats = Array.isArray(summoner.league_stats)
    ? summoner.league_stats
    : (Array.isArray(item.league_stats) ? item.league_stats : []);

  const solo = leagueStats.find((entry) => entry && String(entry.game_type || entry.queue_type || '').toUpperCase() === 'SOLORANKED')
    || leagueStats.find((entry) => entry && String(entry.game_type || entry.queue_type || '').toUpperCase() === 'FLEXRANKED')
    || leagueStats[0]
    || null;

  const tierInfo = (solo && solo.tier_info && typeof solo.tier_info === 'object')
    ? solo.tier_info
    : (summoner.tier_info && typeof summoner.tier_info === 'object' ? summoner.tier_info : {});

  const previousSeasons = Array.isArray(summoner.previous_seasons)
    ? summoner.previous_seasons
    : (Array.isArray(item.previous_seasons) ? item.previous_seasons : []);

  const mostChampions = (() => {
    const source = summoner.most_champions || item.most_champions;
    if (Array.isArray(source)) return source;
    if (source && typeof source === 'object' && Array.isArray(source.champion_stats)) {
      return source.champion_stats;
    }
    if (source && typeof source === 'object' && Array.isArray(source.data)) {
      return source.data;
    }
    return [];
  })();

  const recentGames = (() => {
    const source = item.recent_game_stats
      || item.recent_games
      || summoner.recent_game_stats
      || summoner.recent_games;
    return Array.isArray(source) ? source : [];
  })();

  const win = toNumber(pick(solo || {}, ['win', 'wins', 'total_wins']));
  const lose = toNumber(pick(solo || {}, ['lose', 'loss', 'losses', 'total_losses']));

  const name = (() => {
    const direct = pick(summoner, ['game_name', 'name', 'summoner_name', 'nickname']);
    if (typeof direct === 'string') return direct.trim();
    const fallback = pick(item, ['game_name', 'name', 'summoner_name']);
    return typeof fallback === 'string' ? fallback.trim() : '';
  })();

  const tagline = (() => {
    const direct = pick(summoner, ['tagline', 'tag_line', 'tagLine']);
    if (typeof direct === 'string') return direct.trim();
    const fallback = pick(item, ['tagline', 'tag_line', 'tagLine']);
    return typeof fallback === 'string' ? fallback.trim() : '';
  })();

  const iconUrl = (() => {
    const direct = pick(summoner, ['profile_image_url', 'profileImageUrl', 'icon_url', 'image_url']);
    if (typeof direct === 'string') return direct;
    const iconId = toNumber(pick(summoner, ['profileIconId', 'profile_icon_id']));
    if (iconId !== null) {
      return `https://opgg-static.akamaized.net/images/profile_icons/profileIcon${iconId}.jpg`;
    }
    return null;
  })();

  return {
    name,
    tagline,
    level: toNumber(pick(summoner, ['level', 'summoner_level'])),
    iconUrl,
    tier: String(pick(tierInfo, ['tier']) ?? pick(summoner, ['tier', 'rank_tier']) ?? ''),
    division: String(pick(tierInfo, ['division']) ?? pick(summoner, ['division']) ?? ''),
    lp: toNumber(pick(tierInfo, ['lp', 'league_points']) ?? pick(summoner, ['lp', 'league_points'])),
    tierImageUrl: pick(tierInfo, ['tier_image_url']) || null,
    win,
    lose,
    winRate: (win !== null && lose !== null && win + lose > 0)
      ? (win / (win + lose)) * 100
      : null,
    previousSeasons: previousSeasons.map((season) => {
      const info = season && typeof season === 'object' ? (season.tier_info || season) : {};
      return {
        tier: String(pick(info, ['tier']) ?? ''),
        division: String(pick(info, ['division']) ?? ''),
      };
    }),
    champions: mostChampions.map(normalizeChampionStat),
    games: recentGames.map(normalizeGame),
  };
}

/**
 * Group recent games by lane and order the lanes the way the reference does
 * (most played lane first).
 *
 * @param {object[]} games
 * @returns {Array<{position:string,games:object[]}>}
 */
export function groupByLane(games) {
  const groups = new Map();
  for (const game of games) {
    const key = game.position || 'OTHER';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  }
  const entries = [...groups.entries()].map(([position, list]) => ({ position, games: list }));
  entries.sort((a, b) => {
    const ai = LANE_ORDER.indexOf(a.position);
    const bi = LANE_ORDER.indexOf(b.position);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return b.games.length - a.games.length;
  });
  return entries;
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
  pageLink.href = new URL('./multisearch.css', import.meta.url).href;
  document.head.appendChild(pageLink);

  /* ---- root ------------------------------------------------------------- */
  const root = h('section.page.page--multisearch');
  const toolbar = h('div.ms-toolbar');
  const recent = h('div.ms-recent');
  const results = h('div.ms-results');
  root.appendChild(toolbar);
  root.appendChild(recent);
  root.appendChild(results);
  container.appendChild(root);

  let disposed = false;
  let requestId = 0;
  let catalogue = new Map();

  /* ---- state ------------------------------------------------------------ */
  const slice = store.getState().multisearch || {};
  let region = slice.region || 'GLOBAL';
  let query = slice.query || '';

  function commit(patch) {
    const current = store.getState().multisearch || {};
    store.setState({
      multisearch: {
        ...current,
        query,
        region,
        recent: current.recent || [],
        history: current.history || [],
        ...patch,
      },
    });
  }

  function regionLabel(value) {
    const option = REGION_OPTIONS.find((entry) => entry.value === value);
    return option ? t(option.labelKey, null, option.fallback) : value;
  }

  /* ---- data ------------------------------------------------------------- */
  async function runSearch() {
    const parts = splitQuery(query);
    if (parts.length === 0) return;

    const id = ++requestId;
    commit({ loading: true, error: null });

    let payload = null;
    try {
      payload = await api.multiSearch({ query: query.trim(), queries: parts, region });
    } catch (err) {
      if (id !== requestId || disposed) return;
      commit({ loading: false, error: (err && err.message) ? err.message : String(err), results: [] });
      return;
    }
    if (id !== requestId || disposed) return;

    if (payload && payload.ok === false) {
      commit({
        loading: false,
        error: payload.error ? String(payload.error) : t('common.error.title'),
        results: [],
      });
      return;
    }

    const normalised = extractResults(payload).map(normalizeResult);
    const current = store.getState().multisearch || {};
    const recentList = [query, ...(current.recent || []).filter((entry) => entry !== query)]
      .slice(0, MAX_RECENT);

    commit({
      loading: false,
      error: null,
      results: normalised,
      recent: recentList,
      history: [
        { query, region, at: Date.now() },
        ...(current.history || []).filter((entry) => !(entry.query === query && entry.region === region)),
      ].slice(0, 20),
    });
  }

  /* ---- rendering -------------------------------------------------------- */
  function renderToolbar() {
    clear(toolbar);

    const input = createSearchInput({
      id: 'ms-query',
      placeholder: t('common.riot-id-game-name-tagline', null, 'Riot ID (Game Name + Tagline)'),
      value: query,
      multiline: true,
      rows: 3,
      ariaLabel: t('common.search-bar.nickname', null, 'Game name'),
      onInput: (value) => {
        query = value;
      },
      onSubmit: () => void runSearch(),
    });

    toolbar.appendChild(h('div.ms-toolbar__search', null, [input]));

    toolbar.appendChild(h('div.ms-toolbar__controls', null, [
      h('div.ms-toolbar__group', null, [
        h('span.ms-toolbar__label', { text: 'Region' }),
        createSelect({
          id: 'ms-region',
          ariaLabel: 'Region',
          value: region,
          options: REGION_OPTIONS.map((option) => ({
            value: option.value,
            label: regionLabel(option.value),
          })),
          onChange: (value) => {
            region = value;
            const current = store.getState().multisearch || {};
            store.setState({ multisearch: { ...current, region: value } });
          },
        }),
      ]),
      createButton({
        label: t('common.search-bar.search-result', null, 'Search Result'),
        variant: 'primary',
        onClick: () => void runSearch(),
      }),
    ]));
  }

  function renderRecent() {
    const sliceNow = store.getState().multisearch || {};
    const list = Array.isArray(sliceNow.recent) ? sliceNow.recent : [];
    clear(recent);
    recent.style.display = list.length ? '' : 'none';
    if (list.length === 0) return;

    recent.appendChild(h('span.ms-recent__label', {
      text: t('common.search-bar.recent-search', null, 'Recent Search'),
    }));

    for (const entry of list) {
      recent.appendChild(h('button.ms-recent__chip', {
        type: 'button',
        on: {
          click: () => {
            query = entry;
            commit({});
            render();
            void runSearch();
          },
        },
      }, [entry]));
    }
  }

  function renderResultCard(result) {
    const card = h('article.multisearch-main-item');

    /* previous season tier chips */
    const tiers = h('div.ms-tiers');
    if (result.previousSeasons.length === 0) {
      tiers.appendChild(h('span.ms-tiers-tier', { text: 'Unranked' }));
    } else {
      result.previousSeasons.slice(0, 2).forEach((season, index) => {
        tiers.appendChild(h('span', {
          class: `ms-tiers-tier${index === 0 ? ' ms-tiers-cur' : ''}`,
          text: `${season.tier} ${season.division}`.trim(),
        }));
      });
    }
    card.appendChild(tiers);

    const info = h('div.ms-info');

    /* header: tier badge, profile icon, lane badge */
    const lanes = groupByLane(result.games);
    const header = h('div.ms-info-header', null, [
      h('div.ms-circle', null, [
        createTierBadge({
          tier: result.tier,
          division: result.division,
          imageUrl: result.tierImageUrl,
          size: 32,
          title: `${result.tier} ${result.division}`.trim(),
        }),
      ]),
      h('div.ms-profile', null, [
        createSummonerAvatar({ url: result.iconUrl, size: 68 }),
        result.level !== null ? h('div.ms-level', { text: String(result.level) }) : null,
      ]),
      h('div.ms-circle', null, [
        lanes.length > 0
          ? h('img', {
            src: `https://desktop-app-data.op.gg/desktop/app/assets/images/${LANE_ICONS[lanes[0].position] || 'icon-position-ALL.png'}`,
            alt: lanes[0].position,
            loading: 'lazy',
            decoding: 'async',
          })
          : null,
      ]),
    ]);
    info.appendChild(header);

    /* name + rank */
    info.appendChild(h('div.ms-info-profile', null, [
      h('div.ms-summoner-name', null, [
        h('span', { text: result.name || '—' }),
        result.tagline ? h('span.ms-tagline-name', { text: `#${result.tagline}` }) : null,
      ]),
      h('div.ms-tier-detail', {
        text: result.tier
          ? `${result.tier} ${result.division} (${result.lp === null ? 0 : result.lp} LP)`.trim()
          : 'Unranked',
      }),
    ]));

    /* win / loss bar */
    if (result.winRate !== null) {
      const width = `${Math.max(0, Math.min(100, result.winRate)).toFixed(0)}%`;
      info.appendChild(h('div.ms-stats', null, [
        h('div', null, [
          h('div.ms-wl', null, [
            h('div.ms-win', { text: `${result.win ?? 0}W` }),
            h('div.ms-lose', { text: `${result.lose ?? 0}L` }),
          ]),
          h('div.ms-wl-bar', null, [h('div.ms-w-rate', { style: { width } })]),
        ]),
        h('div.ms-wl-ratio', { text: `${result.winRate.toFixed(0)}%` }),
      ]));
    }

    /* lane breakdown */
    if (lanes.length > 0) {
      const laneWrap = h('div.multisearch-lane');
      lanes.slice(0, 2).forEach((lane) => {
        const wins = lane.games.filter((game) => game.isWin === true).length;
        const share = result.games.length ? (lane.games.length / result.games.length) * 100 : 0;
        const winShare = lane.games.length ? (wins / lane.games.length) * 100 : 0;
        laneWrap.appendChild(h('div.ms-lane', null, [
          h('div.ms-lane-img', null, [
            h('img', {
              src: `https://desktop-app-data.op.gg/desktop/app/assets/images/${LANE_ICONS[lane.position] || 'icon-position-ALL.png'}`,
              alt: lane.position,
              loading: 'lazy',
              decoding: 'async',
            }),
          ]),
          h('div.ms-lane-stats', null, [
            h('div.ms-lane-ratio', { text: `${share.toFixed(0)}%` }),
            h('div.ms-lane-wl-ratio', {
              text: `${t('lol.common.win-ratio-short', null, 'WR')} ${winShare.toFixed(0)}%`,
            }),
          ]),
        ]));
      });
      info.appendChild(laneWrap);
    }

    /* recently played */
    info.appendChild(h('div.ms-section-label', {
      text: t('lol.live.multisearch.recent-champion', null, 'Recently Played'),
    }));

    if (result.games.length === 0) {
      info.appendChild(h('div.ms-no-data', {
        text: t('lol.live.multisearch.no-data', null, 'There is no history of Solo Ranked games.'),
      }));
    } else {
      const games = h('div.multisearch-recent-games');
      result.games.forEach((game) => {
        const champion = game.championId === null ? null : championImageUrl(catalogue, game.championId, 20);
        const modifier = game.isRemake ? 'ms-game-remake' : (game.isWin === true ? 'ms-game-win' : 'ms-game-lose');
        games.appendChild(h('div.ms-game', null, [
          champion
            ? h('div.ms-game-img', null, [h('img', { src: champion, alt: '', loading: 'lazy', decoding: 'async' })])
            : h('div.ms-game-img.ms-game-img--empty'),
          h('div', {
            class: `ms-game-stat ${modifier}`,
            text: `${game.kill ?? 0}/${game.death ?? 0}/${game.assist ?? 0}`,
          }),
          h('div.ms-game-hours', { text: formatRelativeTime(game.createdAt) }),
        ]));
      });
      info.appendChild(games);
    }

    info.appendChild(h('div.ms-separator'));

    /* most played champions */
    info.appendChild(h('div.ms-section-label', {
      text: t('lol.live.multisearch.most-champions', null, 'Most Played Champions'),
    }));

    if (result.champions.length === 0) {
      info.appendChild(h('div.ms-no-data', {
        text: t('lol.live.multisearch.no-data', null, 'There is no history of Solo Ranked games.'),
      }));
    } else {
      const champions = h('div.multisearch-most-champions');
      result.champions.slice(0, 10).forEach((stat) => {
        const portrait = stat.id === null ? null : championImageUrl(catalogue, stat.id, 20);
        const kda = formatKda(stat.kill, stat.death, stat.assist);
        champions.appendChild(h('div.ms-champion', null, [
          h('div.ms-champion-header', null, [
            portrait
              ? h('div.ms-game-img.ms-game-img--round', null, [
                h('img', { src: portrait, alt: '', loading: 'lazy', decoding: 'async' }),
              ])
              : h('div.ms-game-img.ms-game-img--round.ms-game-img--empty'),
            h('div.ms-champion-kda', {
              text: stat.death === 0 ? 'Perfect KDA' : `${kda}:1 KDA`,
            }),
          ]),
          h('div.ms-champion-index', null, [
            h('div.ms-champion-win-rate', {
              text: stat.winRate === null ? '—' : `${stat.winRate.toFixed(0)}%`,
            }),
            h('span', { text: '/' }),
            h('div', { text: stat.play === null ? '—' : String(stat.play) }),
          ]),
        ]));
      });
      info.appendChild(champions);
    }

    card.appendChild(info);
    return card;
  }

  function renderResults() {
    const sliceNow = store.getState().multisearch || {};
    clear(results);

    if (sliceNow.loading) {
      results.appendChild(createLoadingSkeleton({
        rows: 4,
        columns: 4,
        label: t('lol.mypage.loading', null, 'Loading...'),
      }));
      return;
    }

    if (sliceNow.error) {
      results.appendChild(createErrorState({
        title: t('common.error.title', null, 'Something went wrong.'),
        detail: sliceNow.error,
        onRetry: () => void runSearch(),
        retryLabel: t('lol.buff-nerf.retry', null, 'Retry'),
      }));
      return;
    }

    const list = Array.isArray(sliceNow.results) ? sliceNow.results : [];
    if (list.length === 0) {
      results.appendChild(createEmptyState({
        title: t('common.search-bar.search-result', null, 'Search Result'),
        description: t('common.search-bar.search-result-empty', null, 'No results found.'),
      }));
      return;
    }

    const listWrap = h('div.multisearch-main');
    for (const result of list) {
      listWrap.appendChild(renderResultCard(result));
    }
    results.appendChild(listWrap);
  }

  function render() {
    if (disposed) return;
    renderToolbar();
    renderRecent();
    renderResults();
  }

  /* ---- wiring ----------------------------------------------------------- */
  const unsubscribe = store.subscribe((state, changed) => {
    if (changed.includes('multisearch')) render();
  });

  render();

  void loadChampionCatalogue(api).then((map) => {
    catalogue = map;
    if (!disposed) render();
  });

  return () => {
    disposed = true;
    requestId += 1;
    unsubscribe();
    sharedLink.remove();
    pageLink.remove();
    clear(root);
  };
}
