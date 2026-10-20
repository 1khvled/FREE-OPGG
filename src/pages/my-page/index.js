/**
 * My page — summoner profile, most played champions and match history.
 *
 * Reference: `MyPage.3f0173b5.bundle.js` plus the desktop app's density
 * (12px type, 40px rows, 12px panel radii).
 *
 * The reference resolves a Riot ID through
 *   `GET /api/v2/{region}/summoners?riot_id={gameName#tagline}`
 * and then reads
 *   `GET /api/v3/{region}/summoners/{puuid}`
 *   `GET /api/v3/{region}/summoners/{puuid}/games?game_type=TOTAL&limit=20`
 * The replica keeps that flow in the main process: the renderer calls
 * `ctx.api.summonerProfile(...)` and `ctx.api.matchHistory(...)` and
 * normalises whatever comes back.
 *
 * Store slice: `state.myPage`
 *   { profile, matches, loading, error, summoner: { gameName, tagline, region } }
 */

import { h, clear } from '../../core/dom.js';
import { createSelect, createButton, createSearchInput } from '../_shared/form-controls.js';
import { createLoadingSkeleton, createErrorState, createEmptyState } from '../_shared/states.js';
import { createSummonerAvatar, createTierBadge, loadChampionCatalogue, championImageUrl } from '../_shared/media.js';
import { formatRelativeTime, formatDuration, formatKda, toPercent, splitRiotId } from '../_shared/format.js';

export const meta = { id: 'my-page', title: 'common.sidebar.my-info', order: 50 };

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

/** Queue id / queue type -> display name. */
const QUEUE_LABELS = {
  420: { key: 'lol.mypage.ranked-solo', fallback: 'Ranked Solo' },
  440: { key: 'lol.mypage.ranked-flex', fallback: 'Ranked Flex' },
  400: { key: 'lol.common.gameMode.normal', fallback: 'Normal' },
  450: { key: 'lol.common.gameMode.aram', fallback: 'ARAM' },
  430: { key: null, fallback: 'Blitz' },
  700: { key: null, fallback: 'Clash' },
  490: { key: 'lol.common.gameMode.urf', fallback: 'URF' },
};

const QUEUE_TYPE_LABELS = {
  RANKED_SOLO_5X5: { key: 'lol.mypage.ranked-solo', fallback: 'Ranked Solo' },
  RANKED_FLEX_5X5: { key: 'lol.mypage.ranked-flex', fallback: 'Ranked Flex' },
  SOLORANKED: { key: 'lol.mypage.ranked-solo', fallback: 'Ranked Solo' },
  FLEXRANKED: { key: 'lol.mypage.ranked-flex', fallback: 'Ranked Flex' },
  NORMAL: { key: 'lol.common.gameMode.normal', fallback: 'Normal' },
  ARAM: { key: 'lol.common.gameMode.aram', fallback: 'ARAM' },
  BLITZ: { key: null, fallback: 'Blitz' },
  CLASH: { key: null, fallback: 'Clash' },
  URF: { key: 'lol.common.gameMode.urf', fallback: 'URF' },
  ARENA: { key: 'lol.common.gameMode.arena', fallback: 'Arena' },
  ARAM_MAYHEM: { key: 'lol.common.gameMode.aram-mayhem', fallback: 'ARAM: Mayhem' },
};

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
 * Pull the profile object out of the payload.
 *
 * Accepted shapes: `{ data: {...} }`, `{ data: { data: {...} } }`, a bare
 * profile object, or `{ profile: {...} }`.
 *
 * @param {any} payload
 * @returns {object|null}
 */
export function extractProfile(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const containers = ['data', 'profile', 'summoner', 'result'];
  for (const key of containers) {
    const value = payload[key];
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value)) continue;
    if (value.data && typeof value.data === 'object' && !Array.isArray(value.data)) {
      return value.data;
    }
    return value;
  }
  return payload;
}

/**
 * Normalise a summoner profile.
 *
 * Field aliases:
 *   level     `level`, `summoner_level`
 *   tier      `tier`, `rank_tier`, `tier_info.tier`
 *   division  `division`, `tier_info.division`
 *   lp        `lp`, `league_points`
 *   wins      `wins`, `total_wins`
 *   losses    `losses`, `total_losses`
 *
 * @param {any} payload
 * @returns {object|null}
 */
export function normalizeProfile(payload) {
  const profile = extractProfile(payload);
  if (!profile) return null;

  const tierInfo = profile.tier_info && typeof profile.tier_info === 'object' ? profile.tier_info : {};
  const leagueStats = Array.isArray(profile.league_stats) ? profile.league_stats : [];
  const solo = leagueStats.find((entry) => entry && String(entry.game_type || '').toUpperCase() === 'SOLORANKED')
    || leagueStats.find((entry) => entry && String(entry.game_type || '').toUpperCase() === 'FLEXRANKED')
    || leagueStats[0]
    || null;
  const soloTier = solo && solo.tier_info && typeof solo.tier_info === 'object' ? solo.tier_info : {};

  const tier = String(
    pick(tierInfo, ['tier']) ?? pick(soloTier, ['tier']) ?? pick(profile, ['tier', 'rank_tier']) ?? '',
  );
  const division = String(
    pick(tierInfo, ['division']) ?? pick(soloTier, ['division']) ?? pick(profile, ['division']) ?? '',
  );

  const wins = toNumber(pick(profile, ['wins', 'total_wins', 'win'])) ?? toNumber(pick(solo || {}, ['win', 'wins']));
  const losses = toNumber(pick(profile, ['losses', 'total_losses', 'lose'])) ?? toNumber(pick(solo || {}, ['lose', 'losses']));

  const mostChampions = (() => {
    const source = profile.most_champions
      || profile.ranked_most_champions
      || (profile.season_most_champions);
    if (Array.isArray(source)) return source;
    if (source && typeof source === 'object') {
      if (Array.isArray(source.champion_stats)) return source.champion_stats;
      if (Array.isArray(source.data)) return source.data;
    }
    return [];
  })();

  const iconUrl = (() => {
    const direct = pick(profile, ['profile_image_url', 'profileImageUrl', 'icon_url', 'image_url']);
    if (typeof direct === 'string') return direct;
    const iconId = toNumber(pick(profile, ['profileIconId', 'profile_icon_id', 'icon_id']));
    if (iconId !== null) {
      return `https://opgg-static.akamaized.net/images/profile_icons/profileIcon${iconId}.jpg`;
    }
    return null;
  })();

  return {
    name: String(pick(profile, ['game_name', 'gameName', 'name', 'summoner_name']) ?? ''),
    tagline: String(pick(profile, ['tagline', 'tag_line', 'tagLine']) ?? ''),
    level: toNumber(pick(profile, ['level', 'summoner_level', 'summonerLevel'])),
    puuid: pick(profile, ['puuid', 'summoner_id', 'summonerId']) || null,
    iconUrl,
    tier,
    division,
    lp: toNumber(pick(profile, ['lp', 'league_points', 'leaguePoints']) ?? pick(tierInfo, ['lp', 'league_points']) ?? pick(soloTier, ['lp'])),
    tierImageUrl: pick(tierInfo, ['tier_image_url']) || pick(soloTier, ['tier_image_url']) || null,
    wins,
    losses,
    winRate: (wins !== null && losses !== null && wins + losses > 0)
      ? (wins / (wins + losses)) * 100
      : null,
    champions: mostChampions.map((raw) => {
      const stat = raw && typeof raw === 'object' ? raw : {};
      const win = toNumber(pick(stat, ['win', 'wins'])) ?? 0;
      const play = toNumber(pick(stat, ['play', 'games', 'played']))
        ?? ((toNumber(pick(stat, ['win', 'wins'])) ?? 0) + (toNumber(pick(stat, ['lose', 'losses'])) ?? 0));
      return {
        id: pick(stat, ['id', 'champion_id', 'championId']) ?? null,
        play,
        win,
        winRate: play ? toPercent(win / play) : null,
      };
    }),
  };
}

/**
 * Pull the game array out of a match-history payload.
 *
 * Accepted shapes: `{ data: { games: [...] } }`, `{ data: [...] }`,
 * `{ games: [...] }` and a bare array.
 *
 * @param {any} payload
 * @returns {any[]}
 */
export function extractGames(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const containers = ['data', 'games', 'matches', 'history', 'list', 'items'];
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
 * Normalise one match.
 *
 * Field aliases:
 *   champion  `champion_id`, `championId`
 *   mode      `queue`, `queue_type`, `game_type`
 *   result    `result`, `win`, `is_win`
 *   kda       `kills`/`k`, `deaths`/`d`, `assists`/`a`
 *   duration  `duration`, `game_length`
 *   time      `timestamp`, `created_at`, `start_time`
 *
 * @param {any} raw
 * @returns {object}
 */
export function normalizeMatch(raw) {
  const game = raw && typeof raw === 'object' ? raw : {};

  const championId = pick(game, ['champion_id', 'championId', 'champion']);
  const result = pick(game, ['result', 'win', 'is_win', 'isWin']);
  const isWin = (() => {
    if (typeof result === 'boolean') return result;
    if (typeof result === 'string') {
      const value = result.trim().toLowerCase();
      if (value === 'win' || value === 'victory' || value === 'true' || value === '1') return true;
      if (value === 'lose' || value === 'defeat' || value === 'loss' || value === 'false' || value === '0') return false;
    }
    const numeric = toNumber(result);
    if (numeric !== null) return numeric > 0;
    return null;
  })();

  const queue = pick(game, ['queue', 'queue_type', 'queueType', 'game_type', 'gameType']);

  return {
    id: pick(game, ['id', 'game_id', 'gameId']) ?? null,
    championId: championId === undefined ? null : championId,
    queue: queue === undefined ? '' : String(queue),
    isWin,
    isRemake: Boolean(pick(game, ['is_remake', 'isRemake'])),
    kill: toNumber(pick(game, ['kills', 'kill', 'k'])),
    death: toNumber(pick(game, ['deaths', 'death', 'd'])),
    assist: toNumber(pick(game, ['assists', 'assist', 'a'])),
    duration: toNumber(pick(game, ['duration', 'game_length', 'gameLength', 'time'])),
    createdAt: pick(game, ['timestamp', 'created_at', 'createdAt', 'start_time', 'startTime']) || null,
    position: String(pick(game, ['position', 'lane', 'role']) || '').toUpperCase(),
  };
}

/**
 * Normalise a match-history payload.
 *
 * @param {any} payload
 * @returns {object[]}
 */
export function normalizeMatches(payload) {
  return extractGames(payload).map(normalizeMatch);
}

/**
 * Normalise the League Client's "current summoner" answer so the page can
 * work without an explicitly selected summoner.
 *
 * @param {any} raw
 * @returns {{name:string, tagline:string, puuid:string|null, level:number|null}|null}
 */
export function normalizeLcuProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const nested = raw.summoner && typeof raw.summoner === 'object' ? raw.summoner : null;
  const source = nested ? { ...raw, ...nested } : raw;

  const name = pick(source, ['game_name', 'gameName', 'name', 'displayName', 'summoner_name']);
  if (!name) return null;

  const tagline = pick(source, ['tagline', 'tagLine', 'tag_line', 'tag']);
  return {
    name: String(name),
    tagline: tagline ? String(tagline) : '',
    puuid: pick(source, ['puuid', 'summonerId', 'summoner_id']) || null,
    level: toNumber(pick(source, ['summonerLevel', 'level'])),
  };
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
  pageLink.href = new URL('./my-page.css', import.meta.url).href;
  document.head.appendChild(pageLink);

  /* ---- root ------------------------------------------------------------- */
  const root = h('section.page.page--my-page');
  const toolbar = h('div.mp-toolbar');
  const profileSlot = h('div.mp-profile-slot');
  const championsSlot = h('div.mp-champions-slot');
  const historySlot = h('div.mp-history-slot');
  root.appendChild(toolbar);
  root.appendChild(profileSlot);
  root.appendChild(championsSlot);
  root.appendChild(historySlot);
  container.appendChild(root);

  let disposed = false;
  let requestId = 0;
  let catalogue = new Map();

  /* ---- state ------------------------------------------------------------ */
  const params = (ctx && ctx.params) || {};
  const slice = store.getState().myPage || {};

  const initialRiotId = params.riotId || params.summoner || '';
  const initialRegion = params.region || (slice.summoner && slice.summoner.region) || 'KR';

  let riotId = initialRiotId || (slice.summoner ? slice.summoner.riotId : '') || '';
  let region = initialRegion;

  function commit(patch) {
    const current = store.getState().myPage || {};
    store.setState({
      myPage: {
        ...current,
        summoner: { riotId, region },
        ...patch,
      },
    });
  }

  /* ---- data ------------------------------------------------------------- */
  async function loadProfile() {
    const id = ++requestId;
    const { gameName, tagline } = splitRiotId(riotId);

    if (!gameName) {
      commit({ loading: false, error: null, profile: null, matches: [] });
      return;
    }

    commit({ loading: true, error: null });

    const request = {
      gameName,
      tagline,
      region,
      summonerId: (slice.summoner && slice.summoner.summonerId) || undefined,
    };

    let profilePayload = null;
    let historyPayload = null;
    let failure = null;

    try {
      profilePayload = await api.summonerProfile(request);
    } catch (err) {
      failure = (err && err.message) ? err.message : String(err);
    }

    try {
      historyPayload = await api.matchHistory(request);
    } catch (err) {
      if (!failure) failure = (err && err.message) ? err.message : String(err);
    }

    if (id !== requestId || disposed) return;

    if (profilePayload && profilePayload.ok === false) {
      commit({ loading: false, error: profilePayload.error ? String(profilePayload.error) : t('common.error.title'), profile: null, matches: [] });
      return;
    }

    const profile = normalizeProfile(profilePayload);
    const matches = normalizeMatches(historyPayload);

    if (!profile && !matches.length) {
      commit({
        loading: false,
        error: failure || t('common.search-bar.search-result-empty', null, 'No results found.'),
        profile: null,
        matches: [],
      });
      return;
    }

    commit({ loading: false, error: failure, profile, matches });
  }

  /* ---- rendering -------------------------------------------------------- */
  function renderToolbar() {
    clear(toolbar);

    const input = createSearchInput({
      id: 'mp-riot-id',
      placeholder: t('common.riot-id-game-name-tagline', null, 'Riot ID (Game Name + Tagline)'),
      value: riotId,
      ariaLabel: t('common.riot-id-game-name-tagline', null, 'Riot ID (Game Name + Tagline)'),
      onInput: (value) => {
        riotId = value;
      },
      onSubmit: () => {
        commit({});
        void loadProfile();
      },
    });

    toolbar.appendChild(h('div.mp-toolbar__search', null, [input]));

    toolbar.appendChild(h('div.mp-toolbar__controls', null, [
      h('div.mp-toolbar__group', null, [
        h('span.mp-toolbar__label', { text: 'Region' }),
        createSelect({
          id: 'mp-region',
          ariaLabel: 'Region',
          value: region,
          options: REGION_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.labelKey, null, option.fallback),
          })),
          onChange: (value) => {
            region = value;
            commit({});
          },
        }),
      ]),
      createButton({
        label: t('common.refresh', null, 'Refresh'),
        onClick: () => void loadProfile(),
      }),
    ]));
  }

  function queueLabel(queue) {
    if (!queue) return '—';
    const numeric = Number(queue);
    let descriptor = null;
    if (Number.isFinite(numeric) && QUEUE_LABELS[numeric]) descriptor = QUEUE_LABELS[numeric];
    if (!descriptor) {
      const key = String(queue).toUpperCase();
      if (QUEUE_TYPE_LABELS[key]) descriptor = QUEUE_TYPE_LABELS[key];
    }
    if (!descriptor) return String(queue);
    return descriptor.key ? t(descriptor.key, null, descriptor.fallback) : descriptor.fallback;
  }

  function renderProfile() {
    const sliceNow = store.getState().myPage || {};
    clear(profileSlot);

    if (sliceNow.loading) {
      profileSlot.appendChild(createLoadingSkeleton({
        rows: 1,
        columns: 5,
        label: t('lol.mypage.loading', null, 'Loading...'),
      }));
      return;
    }

    const profile = sliceNow.profile;
    if (!profile) {
      profileSlot.appendChild(createEmptyState({
        title: t('common.my-rank', null, 'My Rank'),
        description: t('common.search-bar.search-result-empty', null, 'No results found.'),
      }));
      return;
    }

    const card = h('div.mp-profile', null, [
      h('div.mp-profile__avatar', null, [
        createSummonerAvatar({ url: profile.iconUrl, size: 68 }),
        profile.level !== null ? h('div.mp-profile__level', { text: String(profile.level) }) : null,
      ]),
      h('div.mp-profile__main', null, [
        h('div.mp-profile__name', null, [
          h('span', { text: profile.name || '—' }),
          profile.tagline ? h('span.mp-profile__tag', { text: `#${profile.tagline}` }) : null,
        ]),
        h('div.mp-profile__rank', null, [
          createTierBadge({
            tier: profile.tier,
            division: profile.division,
            imageUrl: profile.tierImageUrl,
            size: 24,
            title: `${profile.tier} ${profile.division}`.trim(),
          }),
          h('span.mp-profile__rank-text', {
            text: profile.tier
              ? `${profile.tier} ${profile.division} (${profile.lp === null ? 0 : profile.lp} LP)`.trim()
              : t('lol.mypage.unranked', null, 'Unranked'),
          }),
        ]),
      ]),
      h('div.mp-profile__stats', null, [
        h('div.mp-stat', null, [
          h('span.mp-stat__label', { text: t('common.w', null, 'W') }),
          h('span.mp-stat__value', { text: profile.wins === null ? '—' : String(profile.wins) }),
        ]),
        h('div.mp-stat', null, [
          h('span.mp-stat__label', { text: t('common.l', null, 'L') }),
          h('span.mp-stat__value', { text: profile.losses === null ? '—' : String(profile.losses) }),
        ]),
        h('div.mp-stat', null, [
          h('span.mp-stat__label', { text: t('common.win-rate', null, 'WR') }),
          h('span.mp-stat__value', {
            text: profile.winRate === null ? '—' : `${profile.winRate.toFixed(1)}%`,
          }),
        ]),
      ]),
    ]);

    profileSlot.appendChild(card);
  }

  function renderChampions() {
    const sliceNow = store.getState().myPage || {};
    clear(championsSlot);

    const profile = sliceNow.profile;
    const champions = profile && Array.isArray(profile.champions) ? profile.champions : [];
    if (champions.length === 0) return;

    const panel = h('div.mp-panel', null, [
      h('div.mp-panel__title', {
        text: t('lol.mypage.most-champions', null, 'Most Played Champions This Season'),
      }),
    ]);

    const list = h('div.mp-champions');
    for (const stat of champions.slice(0, 10)) {
      const record = stat.id === null || !catalogue || typeof catalogue.get !== 'function'
        ? null
        : catalogue.get(String(stat.id));
      const portrait = stat.id === null ? null : championImageUrl(catalogue, stat.id, 46);
      const width = stat.winRate === null ? 0 : Math.max(0, Math.min(100, stat.winRate));

      list.appendChild(h('div.mp-champion', null, [
        portrait
          ? h('div.mp-champion__portrait', null, [
            h('img', { src: portrait, alt: '', loading: 'lazy', decoding: 'async' }),
          ])
          : h('div.mp-champion__portrait.mp-champion__portrait--empty'),
        h('div.mp-champion__meta', null, [
          h('div.mp-champion__name', { text: record && record.name ? record.name : '' }),
          h('div.mp-champion__bar', null, [
            h('div.mp-champion__bar-fill', { style: { width: `${width.toFixed(0)}%` } }),
          ]),
          h('div.mp-champion__text', null, [
            h('span.mp-champion__games', {
              text: stat.play === null ? '—' : `${stat.play} ${t('lol.mypage.g', null, 'G')}`,
            }),
            h('span.mp-champion__wr', {
              text: stat.winRate === null ? '—' : `${stat.winRate.toFixed(0)}%`,
            }),
          ]),
        ]),
      ]));
    }

    panel.appendChild(list);
    championsSlot.appendChild(panel);
  }

  function renderHistory() {
    const sliceNow = store.getState().myPage || {};
    clear(historySlot);

    const matches = Array.isArray(sliceNow.matches) ? sliceNow.matches : [];
    const profile = sliceNow.profile;

    if (!profile && matches.length === 0) return;

    const panel = h('div.mp-panel', null, [
      h('div.mp-panel__title', { text: t('lol.mypage.recent-games', null, 'Recent games') }),
    ]);

    if (matches.length === 0) {
      panel.appendChild(createEmptyState({
        title: t('lol.mypage.no-recent-games', null, 'No recent games'),
        className: 'st--inline',
      }));
      historySlot.appendChild(panel);
      return;
    }

    const list = h('div.mp-matches');
    for (const match of matches) {
      const portrait = match.championId === null ? null : championImageUrl(catalogue, match.championId, 32);
      const modifier = match.isRemake
        ? 'mp-match--remake'
        : (match.isWin === true ? 'mp-match--win' : 'mp-match--lose');

      list.appendChild(h('div', { class: `mp-match ${modifier}` }, [
        portrait
          ? h('div.mp-match__champion', null, [
            h('img', { src: portrait, alt: '', loading: 'lazy', decoding: 'async' }),
          ])
          : h('div.mp-match__champion.mp-match__champion--empty'),
        h('span.mp-match__mode', { text: queueLabel(match.queue) }),
        h('span.mp-match__result', {
          text: match.isWin === null ? '—' : (match.isWin ? t('common.win', null, 'Win') : 'Lose'),
        }),
        h('span.mp-match__kda', {
          text: `${match.kill ?? 0} / ${match.death ?? 0} / ${match.assist ?? 0}`,
        }),
        h('span.mp-match__kda-ratio', {
          text: `${formatKda(match.kill, match.death, match.assist)} KDA`,
        }),
        h('span.mp-match__duration', { text: formatDuration(match.duration) }),
        h('span.mp-match__time', { text: formatRelativeTime(match.createdAt) }),
      ]));
    }

    panel.appendChild(list);
    historySlot.appendChild(panel);
  }

  function render() {
    if (disposed) return;
    renderToolbar();
    renderProfile();
    renderChampions();
    renderHistory();
  }

  /* ---- wiring ----------------------------------------------------------- */
  const unsubscribe = store.subscribe((state, changed) => {
    if (changed.includes('myPage')) render();
  });

  render();

  void loadChampionCatalogue(api).then((map) => {
    catalogue = map;
    if (!disposed) render();
  });

  /* ---- boot ------------------------------------------------------------- */
  void (async () => {
    if (riotId) {
      await loadProfile();
      return;
    }

    // No summoner selected — fall back to the League Client when it is up.
    try {
      const raw = await api.myProfile();
      const lcu = normalizeLcuProfile(raw);
      if (lcu && lcu.name) {
        riotId = lcu.tagline ? `${lcu.name}#${lcu.tagline}` : lcu.name;
        commit({});
        await loadProfile();
        return;
      }
    } catch {
      // League Client not connected — fall through to the empty state.
    }
    commit({ loading: false, error: null, profile: null, matches: [] });
  })();

  return () => {
    disposed = true;
    requestId += 1;
    unsubscribe();
    sharedLink.remove();
    pageLink.remove();
    clear(root);
  };
}
