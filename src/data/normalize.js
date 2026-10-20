/**
 * Normalisers for every payload the main process returns.
 *
 * The OP.GG endpoints are heterogeneous: the same concept (a tier, a win
 * rate, a counter list) arrives under different keys depending on the
 * endpoint and on the patch. Every function in this module is:
 *
 *   - **pure** — no network, no DOM, no clock-dependent output beyond `Date.now()`
 *     inside the cache module,
 *   - **total** — `null` / `undefined` / malformed input never throws,
 *   - **dependency free** — the module only imports the local registries.
 *
 * Conventions
 * -----------
 * * **Rates are ratios in `0..1`** everywhere (`0.5044` means 50.44 %). The
 *   live API already sends ratios; `normalizeRates()` only rescales when a
 *   percentage (or a `%` string) is handed in.
 * * **Tiers are labels** — `'OP'`, `'Tier 1' … 'Tier 5'` — with the numeric
 *   bucket kept alongside in `tierRank` (`0` = OP, `1..5` = Tier 1..5).
 * * **Names are never invented** — when a champion id cannot be resolved the
 *   name is `null` and the id is kept.
 */

import { championById, championByName } from './champions.js';
import { runeById, runePageById } from './runes.js';
import { championSquare, championSquareName, ddragonChampionIcon } from './images.js';

/** Perk icon base. */
const PERK_CDN = 'https://opgg-static.akamaized.net/meta/images/lol/latest/perk';

/** Rune tree icon base. */
const PERK_STYLE_CDN = 'https://opgg-static.akamaized.net/meta/images/lol/latest/perkStyle';

/* -------------------------------------------------------------------------- */
/* Internals                                                                    */
/* -------------------------------------------------------------------------- */

/** `true` for plain objects (not arrays, not `null`). */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** First defined, non-null value of `keys` on `source`. */
function pick(source, keys) {
  if (!isObject(source)) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/** Finite number or `null`. */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** `true` for a non-empty string. */
function isFilledString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Resolve a champion display name.
 *
 * Order: an explicit name map (`options.names`), the champion object itself,
 * then the local Data Dragon registry.
 *
 * @param {number|string|object|null|undefined} champion
 * @param {object} [options]
 * @returns {string|null}
 */
function resolveName(champion, options = {}) {
  if (champion === null || champion === undefined) return null;

  if (typeof champion === 'string') {
    const map = options.names;
    if (isObject(map) && isFilledString(map[champion])) return map[champion];
    if (map instanceof Map && map.has(champion)) return map.get(champion);
    const record = championByName(champion);
    return record ? record.name : champion;
  }

  if (isObject(champion)) {
    if (isFilledString(champion.name)) return champion.name;
    if (isFilledString(champion.game_name)) return champion.game_name;
    if (isFilledString(champion.gameName)) return champion.gameName;
    if (isFilledString(champion.displayName)) return champion.displayName;
  }

  const id = toNumber(isObject(champion) ? champion.id : champion);
  if (id !== null) {
    const map = options.names;
    if (isObject(map) && isFilledString(map[id])) return map[id];
    if (isObject(map) && isFilledString(map[String(id)])) return map[String(id)];
    if (map instanceof Map && map.has(id)) return map.get(id);
    if (map instanceof Map && map.has(String(id))) return map.get(String(id));
    const record = championById(id);
    if (record) return record.name;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Rates                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a rate to a `0..1` ratio.
 *
 * Accepted input: a number (`0.504`, `50.4`), a numeric string (`'0.504'`,
 * `'50.4'`, `'50.4%'`). Values in `0..1` are treated as ratios and returned
 * unchanged; values above `1` are treated as percentages and divided by 100.
 *
 * @param {number|string|null|undefined} raw
 * @returns {number|null} the ratio, or `null` when the input carries no usable
 *          number (so callers can render a dash instead of a fake `0`)
 */
export function normalizeRates(raw) {
  if (raw === null || raw === undefined || raw === '') return null;

  let value;
  if (typeof raw === 'number') {
    value = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const isPercent = trimmed.includes('%');
    const parsed = Number(trimmed.replace(/%/g, '').trim());
    if (!Number.isFinite(parsed)) return null;
    value = isPercent ? parsed / 100 : parsed;
  } else {
    return null;
  }

  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  if (value > 1) return value / 100;
  return value;
}

/* -------------------------------------------------------------------------- */
/* Tiers                                                                         */
/* -------------------------------------------------------------------------- */

/** Numeric tier bucket → label. */
const TIER_BY_NUMBER = {
  0: 'OP',
  1: 'Tier 1',
  2: 'Tier 2',
  3: 'Tier 3',
  4: 'Tier 4',
  5: 'Tier 5',
};

/** Letter tier → { label, bucket }. */
const TIER_BY_LETTER = {
  op: { tier: 'OP', tierRank: 0 },
  's+': { tier: 'OP', tierRank: 0 },
  s: { tier: 'Tier 1', tierRank: 1 },
  a: { tier: 'Tier 2', tierRank: 2 },
  b: { tier: 'Tier 3', tierRank: 3 },
  c: { tier: 'Tier 4', tierRank: 4 },
  d: { tier: 'Tier 5', tierRank: 5 },
};

/**
 * The tier bucket for a ladder rank.
 *
 * The champion API returns both a tier (`tier_data.tier`) and a ladder rank
 * (`tier_data.rank`); when only a rank is available the tier is derived from
 * these bands.
 *
 * @param {number} rank
 * @returns {number} `0` (OP) … `5`
 */
export function tierFromRank(rank) {
  const num = toNumber(rank);
  if (num === null) return 5;
  if (num <= 5) return 0;
  if (num <= 15) return 1;
  if (num <= 30) return 2;
  if (num <= 50) return 3;
  if (num <= 100) return 4;
  return 5;
}

/**
 * Normalise a tier.
 *
 * Accepted input:
 *   - `0` … `5` → `'OP'`, `'Tier 1'` … `'Tier 5'`
 *   - `'0'` … `'5'`, `'op'`, `'OP'`, `'tier_1'`, `'Tier 1'`
 *   - `'S+'` → `'OP'`, `'S'` → `'Tier 1'`, `'A'` → `'Tier 2'`, `'B'` → `'Tier 3'`
 *   - a number greater than `5` → treated as a ladder rank, the tier is
 *     derived with `tierFromRank()`
 *   - an object → `{ tier, rank }` (the API's `tier_data` shape)
 *
 * @param {number|string|object|null|undefined} raw
 * @returns {{tier: string, tierRank: number}} `tierRank` is the numeric bucket
 *          (`0` = OP), never `undefined`
 */
export function normalizeTier(raw) {
  if (raw === null || raw === undefined) {
    return { tier: 'Tier 5', tierRank: 5 };
  }

  if (isObject(raw)) {
    const inner = pick(raw, ['tier', 'tier_data', 'tierData', 'tierRank', 'rank']);
    if (inner === undefined) return { tier: 'Tier 5', tierRank: 5 };
    if (isObject(inner)) return normalizeTier(inner);
    const tier = normalizeTier(inner);
    const explicit = toNumber(pick(raw, ['tier']));
    if (explicit !== null && explicit >= 0 && explicit <= 5) return tier;
    const rank = toNumber(pick(raw, ['rank']));
    if (rank !== null) return { tier: TIER_BY_NUMBER[tierFromRank(rank)], tierRank: tierFromRank(rank) };
    return tier;
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { tier: 'Tier 5', tierRank: 5 };
    if (raw >= 0 && raw <= 5 && Number.isInteger(raw)) {
      return { tier: TIER_BY_NUMBER[raw], tierRank: raw };
    }
    const bucket = tierFromRank(raw);
    return { tier: TIER_BY_NUMBER[bucket], tierRank: bucket };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { tier: 'Tier 5', tierRank: 5 };
    const lower = trimmed.toLowerCase();

    if (Object.prototype.hasOwnProperty.call(TIER_BY_LETTER, lower)) {
      const entry = TIER_BY_LETTER[lower];
      return { tier: entry.tier, tierRank: entry.tierRank };
    }

    const numeric = Number(lower.replace(/^tier[\s_-]*/, ''));
    if (Number.isFinite(numeric) && lower !== '') {
      if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 5) {
        return { tier: TIER_BY_NUMBER[numeric], tierRank: numeric };
      }
      const bucket = tierFromRank(numeric);
      return { tier: TIER_BY_NUMBER[bucket], tierRank: bucket };
    }

    return { tier: 'Tier 5', tierRank: 5 };
  }

  return { tier: 'Tier 5', tierRank: 5 };
}

/* -------------------------------------------------------------------------- */
/* Counters                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a counter / match-up list.
 *
 * Accepted input: an array of entries, or an object holding one of
 * `counters`, `hardest_counters`, `weak_against`, `strong_against`.
 *
 * Accepted entry shapes:
 *   - `{ champion_id, play, win }` → win rate is `win / play`
 *   - `{ championId, play, win }`
 *   - `{ id, name, win_rate | winRate }`
 *   - `{ champion: { id, name }, … }`
 *
 * @param {Array|object|null|undefined} raw
 * @param {object} [options] `{ names }` — champion id → display name map
 * @returns {Array<{id: number|null, name: string|null, winRate: number|null}>}
 */
export function normalizeCounters(raw, options = {}) {
  let list = raw;
  if (isObject(raw)) {
    const inner = pick(raw, ['counters', 'hardest_counters', 'weak_against', 'strong_against']);
    list = inner === undefined ? [] : inner;
  }
  if (!Array.isArray(list)) return [];

  const rows = [];
  for (const entry of list) {
    if (!isObject(entry)) continue;

    const nested = isObject(entry.champion) ? entry.champion : null;
    const id = toNumber(
      pick(entry, ['champion_id', 'championId', 'championID', 'id'])
      ?? (nested ? pick(nested, ['id', 'champion_id', 'championId']) : undefined),
    );

    let name = null;
    if (isFilledString(entry.name)) name = entry.name;
    else if (nested && isFilledString(nested.name)) name = nested.name;
    else if (id !== null) name = resolveName(id, options);

    const direct = normalizeRates(pick(entry, ['win_rate', 'winRate', 'rate']));
    let winRate = direct;
    if (winRate === null) {
      const wins = toNumber(pick(entry, ['win', 'wins']));
      const plays = toNumber(pick(entry, ['play', 'plays', 'games', 'count']));
      if (wins !== null && plays !== null && plays > 0) winRate = wins / plays;
    }

    if (id === null && name === null && winRate === null) continue;
    rows.push({ id, name, winRate });
  }
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Champions                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The position entry of a champion row for a given lane.
 *
 * @param {object} raw
 * @param {string} lane
 * @returns {object|null}
 */
function findPosition(raw, lane) {
  const positions = Array.isArray(raw && raw.positions) ? raw.positions : [];
  if (!positions.length) return null;
  const wanted = String(lane).trim().toUpperCase();
  return positions.find(
    (entry) => isObject(entry) && String(entry.name || '').trim().toUpperCase() === wanted,
  ) || null;
}

/**
 * The position entry with the most games.
 *
 * @param {object} raw
 * @returns {object|null}
 */
function pickPrimaryPosition(raw) {
  const positions = Array.isArray(raw && raw.positions) ? raw.positions : [];
  let best = null;
  let bestPlays = -1;
  for (const entry of positions) {
    if (!isObject(entry)) continue;
    const plays = toNumber(pick(entry.stats || {}, ['play', 'games'])) || 0;
    if (plays > bestPlays) {
      bestPlays = plays;
      best = entry;
    }
  }
  return best;
}

/**
 * Normalise one champion row of the tier list.
 *
 * Accepted input — the live shape of
 * `GET /api/{region}/champions/ranked`:
 *
 * ```json
 * { "id": 86, "is_rotation": false, "is_rip": false,
 *   "average_stats": { "play": 166224, "win_rate": 0.504777,
 *     "pick_rate": 0.0673965, "ban_rate": 0.044555, "kda": 1.819111,
 *     "tier": 3, "rank": 42,
 *     "tier_data": { "tier": 3, "rank": 42, "rank_prev": 41, "rank_prev_patch": 33 } },
 *   "positions": [ { "name": "TOP", "stats": { …, "tier_data": { … } },
 *                    "roles": [ { "name": "MARKSMAN", "stats": { … } } ],
 *                    "counters": [ { "champion_id": 11, "play": 357, "win": 157 } ] } ],
 *   "roles": [] }
 * ```
 *
 * Options:
 *   - `lane` / `position` — the lane filter. When the champion is not played in
 *     that lane the league averages (`average_stats`) are used, exactly like
 *     the reference does.
 *   - `names` — champion id → display name map (`/api/meta/champion-names`).
 *
 * @param {object} raw
 * @param {object} [options]
 * @returns {{
 *   id: number|null, key: string|null, name: string|null, title: string,
 *   tier: string, tierRank: number, winRate: number|null, pickRate: number|null,
 *   banRate: number|null, matches: number, kda: number|null,
 *   roles: string[], position: string|null, rank: number|null,
 *   rankChange: number, counters: Array<{id: number|null, name: string|null, winRate: number|null}>,
 *   imageUrl: string, squareImageUrl: string
 * }}
 */
export function normalizeChampionRow(raw, options = {}) {
  const source = isObject(raw) ? raw : {};
  const id = toNumber(pick(source, ['id', 'championId', 'champion_id']));
  const lane = pick(options, ['lane', 'position']) || null;

  const average = isObject(source.average_stats) ? source.average_stats : {};
  const primary = pickPrimaryPosition(source);

  /*
   * Stats source:
   *   - a lane filter that the champion is played in → that lane's stats,
   *   - a lane filter the champion is *not* played in → the league averages,
   *   - no lane filter → the league averages.
   */
  const matched = lane ? findPosition(source, lane) : null;
  const usePosition = lane ? matched : null;
  const stats = usePosition && isObject(usePosition.stats) ? usePosition.stats : average;

  const tierSource = pick(stats, ['tier_data', 'tierData'])
    || pick(average, ['tier_data', 'tierData'])
    || pick(stats, ['tier'])
    || pick(average, ['tier']);

  const tier = normalizeTier(tierSource);

  const tierData = (isObject(stats.tier_data) && stats.tier_data)
    || (isObject(average.tier_data) && average.tier_data)
    || {};

  const rank = toNumber(pick(tierData, ['rank'])) ?? toNumber(pick(average, ['rank']));
  const rankPrev = toNumber(pick(tierData, ['rank_prev']));
  const rankChange = rank !== null && rankPrev !== null ? rankPrev - rank : 0;

  const record = id !== null ? championById(id) : null;

  const roleSource = usePosition || primary;
  const roleNames = (() => {
    const fromPosition = Array.isArray(roleSource && roleSource.roles) ? roleSource.roles : [];
    const fromChampion = Array.isArray(source.roles) ? source.roles : [];
    const names = (fromPosition.length ? fromPosition : fromChampion)
      .map((role) => (isObject(role) ? role.name : null))
      .filter((name) => isFilledString(name));
    if (names.length) return names;
    if (record && record.tags.length) return record.tags.slice();
    return [];
  })();

  const counterSource = usePosition || primary;
  const counterEntries = counterSource && Array.isArray(counterSource.counters) ? counterSource.counters : [];

  return {
    id,
    key: championSquareName(id !== null ? id : (record ? record.key : null)),
    name: resolveName(id, options) || (record ? record.name : null),
    title: record ? record.title : '',
    tier: tier.tier,
    tierRank: tier.tierRank,
    winRate: normalizeRates(pick(stats, ['win_rate', 'winRate']) ?? pick(average, ['win_rate', 'winRate'])),
    pickRate: normalizeRates(pick(stats, ['pick_rate', 'pickRate']) ?? pick(average, ['pick_rate', 'pickRate'])),
    banRate: normalizeRates(pick(stats, ['ban_rate', 'banRate']) ?? pick(average, ['ban_rate', 'banRate'])),
    matches: toNumber(pick(stats, ['play', 'games', 'match_count'])) ?? toNumber(pick(average, ['play', 'games'])) ?? 0,
    kda: toNumber(pick(stats, ['kda']) ?? pick(average, ['kda'])),
    roles: roleNames,
    position: usePosition
      ? (isFilledString(usePosition.name) ? String(usePosition.name).trim().toUpperCase() : null)
      : (lane ? null : (primary && isFilledString(primary.name) ? String(primary.name).trim().toUpperCase() : null)),
    rank,
    rankChange,
    counters: normalizeCounters(counterEntries, options),
    imageUrl: championSquare(id !== null ? id : null),
    squareImageUrl: ddragonChampionIcon(id !== null ? id : null),
  };
}

/**
 * Normalise a champion list.
 *
 * Accepted input:
 *   - an array of champion rows,
 *   - `{ data: [...] }`,
 *   - `{ champions: [...] }`,
 *   - `{ data: { champions: [...] } }`,
 *   - `{ data: [...], meta: { version, analyzed_at, cached_at } }` — the live
 *     shape of `/api/{region}/champions/ranked`.
 *
 * @param {Array|object|null|undefined} raw
 * @param {object} [options] forwarded to `normalizeChampionRow`
 * @returns {{patch: string, updatedAt: string|null, rows: object[]}}
 */
export function normalizeChampionList(raw, options = {}) {
  let list = raw;
  let meta = null;

  if (isObject(raw)) {
    meta = isObject(raw.meta) ? raw.meta : null;
    const data = raw.data;
    if (Array.isArray(data)) list = data;
    else if (isObject(data)) {
      meta = isObject(data.meta) ? data.meta : meta;
      const inner = pick(data, ['champions', 'data', 'list', 'rows']);
      list = Array.isArray(inner) ? inner : [];
    } else {
      const inner = pick(raw, ['champions', 'list', 'rows']);
      list = Array.isArray(inner) ? inner : [];
    }
  }

  if (!Array.isArray(list)) list = [];

  const patch = (() => {
    const fromMeta = pick(meta || {}, ['version', 'patch', 'patch_version']);
    const fromRoot = pick(isObject(raw) ? raw : {}, ['patch', 'version']);
    const value = fromMeta ?? fromRoot;
    return isFilledString(value) ? String(value) : '';
  })();

  const updatedAt = (() => {
    const fromMeta = pick(meta || {}, ['analyzed_at', 'updated_at', 'cached_at', 'cachedAt']);
    const fromRoot = pick(isObject(raw) ? raw : {}, ['updatedAt', 'updated_at']);
    const value = fromMeta ?? fromRoot;
    return isFilledString(value) ? String(value) : null;
  })();

  return {
    patch,
    updatedAt,
    rows: list.map((entry) => normalizeChampionRow(entry, options)),
  };
}

/* -------------------------------------------------------------------------- */
/* Champion detail                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a build entry (`{ ids: [...] }`, a bare id array or `{ items: [...] }`).
 *
 * @param {Array|object|null|undefined} raw
 * @returns {Array<{ids: number[], play: number, win: number, pickRate: number|null, winRate: number|null}>}
 */
export function normalizeBuildEntry(raw) {
  if (!Array.isArray(raw) && !isObject(raw)) return [];

  /*
   * A bare id array (`[1001, 1055]`) is one build, a list of objects
   * (`[{ ids: [...] }, { ids: [...] }]`) is a list of builds.
   */
  const isIdList = Array.isArray(raw) && raw.length > 0 && raw.every(
    (entry) => typeof entry === 'number' || typeof entry === 'string',
  );

  const entries = Array.isArray(raw) && !isIdList ? raw : [raw];
  const rows = [];

  for (const entry of entries) {
    if (entry === null || entry === undefined) continue;

    let ids = [];
    let meta = null;

    if (Array.isArray(entry)) {
      ids = entry.map((id) => toNumber(id)).filter((id) => id !== null);
    } else if (isObject(entry)) {
      const rawIds = pick(entry, ['ids', 'items', 'item_ids']);
      if (Array.isArray(rawIds)) {
        ids = rawIds.map((id) => toNumber(id)).filter((id) => id !== null);
        meta = entry;
      } else if (typeof rawIds === 'number' || typeof rawIds === 'string') {
        const id = toNumber(rawIds);
        if (id !== null) ids = [id];
        meta = entry;
      } else {
        const single = toNumber(pick(entry, ['id', 'item_id']));
        if (single !== null) ids = [single];
        meta = entry;
      }
    }

    if (!ids.length) continue;

    const plays = toNumber(pick(meta || {}, ['play', 'games', 'count'])) ?? 0;
    const wins = toNumber(pick(meta || {}, ['win', 'wins'])) ?? 0;
    const pickRate = normalizeRates(pick(meta || {}, ['pick_rate', 'pickRate']));

    rows.push({
      ids,
      play: plays,
      win: wins,
      pickRate,
      winRate: plays > 0 ? wins / plays : null,
    });
  }

  return rows;
}

/**
 * Build the rune tree blocks of a champion build.
 *
 * @param {object} build - the raw rune build
 * @returns {{primary: object|null, secondary: object|null, shards: object[]}}
 */
function normalizeRuneTrees(build) {
  const primaryIds = Array.isArray(build.primary_rune_ids) ? build.primary_rune_ids : [];
  const secondaryIds = Array.isArray(build.secondary_rune_ids) ? build.secondary_rune_ids : [];
  const shardIds = Array.isArray(build.stat_mod_ids) ? build.stat_mod_ids : [];

  const perks = (ids) => ids
    .map((id) => toNumber(id))
    .filter((id) => id !== null)
    .map((id) => {
      const rune = runeById(id);
      return {
        id,
        name: rune ? rune.name : null,
        key: rune ? rune.key : null,
        imageUrl: rune ? `${PERK_CDN}/${id}.png` : '',
      };
    });

  const tree = (pageId, ids) => {
    const num = toNumber(pageId);
    if (num === null) return null;
    const page = runePageById(num);
    return {
      id: num,
      name: page ? page.name : null,
      description: page ? page.description : '',
      imageUrl: `${PERK_STYLE_CDN}/${num}.png`,
      perks: perks(ids),
    };
  };

  return {
    primary: tree(build.primary_page_id, primaryIds),
    secondary: tree(build.secondary_page_id, secondaryIds),
    shards: perks(shardIds),
  };
}

/**
 * Normalise a champion detail payload.
 *
 * Accepted input — the live shape of
 * `GET /api/GLOBAL/champions/ranked/{championId}/{position}`:
 *
 * ```json
 * { "summary": { … }, "runes": [ { "primary_page_id": 8000,
 *     "primary_rune_ids": [8010, 9111, 9105, 8299],
 *     "secondary_page_id": 8200, "secondary_rune_ids": [8224, 8234],
 *     "stat_mod_ids": [5008, 5008, 5001], "play": 56219, "win": 28490 } ],
 *   "rune_pages": [ { "builds": [ … ] } ],
 *   "core_items": [ { "ids": [6631, 3046, 3033], "play": 21921, "win": 12051 } ],
 *   "starter_items": [ { "ids": [1054, 2003] } ], "boots": [ { "ids": [3006] } ],
 *   "last_items": [ { "ids": [6631] } ], "mythic_items": [ … ],
 *   "skill_masteries": [ { "ids": ["E", "Q", "W"] } ],
 *   "skills": [ { "order": ["E", "Q", "W", …] } ], "counters": [ { "champion_id": 24 } ] }
 * ```
 *
 * Options:
 *   - `champion` — the champion record from `/api/meta/champions`; supplies the
 *     ability names / descriptions / icons.
 *   - `names` — champion id → display name map.
 *
 * @param {object|Array|null|undefined} raw
 * @param {object} [options]
 * @returns {{
 *   champion: {id: number|null, key: string|null, name: string|null, title: string, imageUrl: string, squareImageUrl: string},
 *   stats: {tier: string, tierRank: number, winRate: number|null, pickRate: number|null, banRate: number|null, matches: number, kda: number|null},
 *   runes: {primary: object|null, secondary: object|null, shards: object[]},
 *   build: {starterItems: object[], coreItems: object[], boots: object[], situationalItems: object[], mythicItems: object[], lastItems: object[]},
 *   skills: Array<{key: string, name: string, description: string, imageUrl: string}>,
 *   counters: {strong: object[], weak: object[]}
 * }}
 */
export function normalizeChampionDetail(raw, options = {}) {
  let source = raw;
  if (isObject(raw) && isObject(raw.data)) source = raw.data;
  if (!isObject(source)) source = {};

  const summary = isObject(source.summary) ? source.summary : {};
  const average = isObject(summary.average_stats) ? summary.average_stats : {};

  /* ---- champion ------------------------------------------------------- */
  const championSource = isObject(options.champion) ? options.champion : null;
  const id = toNumber(
    pick(source, ['champion_id', 'championId', 'id'])
    ?? pick(summary, ['id', 'champion_id'])
    ?? (championSource ? pick(championSource, ['id']) : undefined),
  );
  const record = id !== null ? championById(id) : null;
  const key = championSquareName(id !== null ? id : (championSource || null))
    || (record ? record.key : null);

  /* ---- stats ---------------------------------------------------------- */
  const tierSource = pick(average, ['tier_data', 'tierData']) ?? pick(average, ['tier']);
  const tier = normalizeTier(tierSource);

  /* ---- runes ---------------------------------------------------------- */
  const runeBuild = (() => {
    const runes = Array.isArray(source.runes) ? source.runes : [];
    if (runes.length) {
      const best = runes
        .slice()
        .sort((a, b) => (toNumber(b && b.play) || 0) - (toNumber(a && a.play) || 0))[0];
      if (isObject(best)) return best;
    }
    const pages = Array.isArray(source.rune_pages) ? source.rune_pages : [];
    for (const page of pages) {
      if (!isObject(page)) continue;
      const builds = Array.isArray(page.builds) ? page.builds : [];
      if (builds.length && isObject(builds[0])) return builds[0];
    }
    return {};
  })();

  /* ---- skills --------------------------------------------------------- */
  const skills = (() => {
    const spellList = (() => {
      if (championSource && Array.isArray(championSource.spells)) return championSource.spells;
      if (Array.isArray(source.spells) && source.spells.length && isObject(source.spells[0]) && isFilledString(source.spells[0].key)) {
        return source.spells;
      }
      return null;
    })();

    if (spellList) {
      const rows = spellList
        .filter((spell) => isObject(spell) && isFilledString(spell.key))
        .map((spell) => ({
          key: String(spell.key).trim().toUpperCase(),
          name: isFilledString(spell.name) ? spell.name : String(spell.key).trim().toUpperCase(),
          description: isFilledString(spell.description) ? spell.description : (isFilledString(spell.desc) ? spell.desc : ''),
          imageUrl: isFilledString(spell.image_url) ? spell.image_url : (isFilledString(spell.imageUrl) ? spell.imageUrl : ''),
        }));
      const passive = championSource && isObject(championSource.passive)
        ? {
          key: 'P',
          name: isFilledString(championSource.passive.name) ? championSource.passive.name : 'Passive',
          description: isFilledString(championSource.passive.description) ? championSource.passive.description : '',
          imageUrl: isFilledString(championSource.passive.image_url) ? championSource.passive.image_url : '',
        }
        : null;
      if (passive) rows.unshift(passive);
      if (rows.length) return rows;
    }

    /* Fall back to the recommended skill order. */
    const order = (() => {
      const skillsEntry = Array.isArray(source.skills) ? source.skills[0] : null;
      if (isObject(skillsEntry) && Array.isArray(skillsEntry.order)) return skillsEntry.order;
      const mastery = Array.isArray(source.skill_masteries) ? source.skill_masteries[0] : null;
      if (isObject(mastery) && Array.isArray(mastery.ids)) return mastery.ids;
      if (isObject(mastery) && Array.isArray(mastery.builds) && isObject(mastery.builds[0]) && Array.isArray(mastery.builds[0].order)) {
        return mastery.builds[0].order;
      }
      return [];
    })();

    const seen = new Set();
    const rows = [];
    for (const letter of order) {
      const key2 = String(letter || '').trim().toUpperCase();
      if (!key2 || seen.has(key2)) continue;
      seen.add(key2);
      rows.push({
        key: key2,
        name: key2,
        description: '',
        imageUrl: key ? `https://opgg-static.akamaized.net/meta/images/lol/latest/spell/${key}${key2}.png` : '',
      });
    }
    return rows;
  })();

  /* ---- counters ------------------------------------------------------- */
  const allCounters = normalizeCounters(source.counters, options);
  const counters = {
    strong: allCounters
      .filter((entry) => entry.winRate !== null && entry.winRate >= 0.5)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 8),
    weak: allCounters
      .filter((entry) => entry.winRate !== null && entry.winRate < 0.5)
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 8),
  };

  return {
    champion: {
      id,
      key,
      name: resolveName(championSource || id, options) || (record ? record.name : null),
      title: championSource && isFilledString(championSource.title) ? championSource.title : (record ? record.title : ''),
      imageUrl: championSquare(id !== null ? id : null),
      squareImageUrl: ddragonChampionIcon(id !== null ? id : null),
    },
    stats: {
      tier: tier.tier,
      tierRank: tier.tierRank,
      winRate: normalizeRates(pick(average, ['win_rate', 'winRate'])),
      pickRate: normalizeRates(pick(average, ['pick_rate', 'pickRate'])),
      banRate: normalizeRates(pick(average, ['ban_rate', 'banRate'])),
      matches: toNumber(pick(average, ['play', 'games'])) ?? 0,
      kda: toNumber(pick(average, ['kda'])),
    },
    runes: normalizeRuneTrees(runeBuild),
    build: {
      starterItems: normalizeBuildEntry(source.starter_items),
      coreItems: normalizeBuildEntry(source.core_items),
      boots: normalizeBuildEntry(source.boots),
      lastItems: normalizeBuildEntry(source.last_items),
      mythicItems: normalizeBuildEntry(source.mythic_items),
      situationalItems: [
        ...normalizeBuildEntry(source.mythic_items),
        ...normalizeBuildEntry(source.last_items),
      ],
    },
    skills,
    counters,
  };
}

/* -------------------------------------------------------------------------- */
/* Summoners                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Extract the profile icon id from a profile image URL.
 *
 * @param {string} url
 * @returns {number|null}
 */
function iconIdFromUrl(url) {
  if (!isFilledString(url)) return null;
  const match = /profileIcon(\d+)/i.exec(url);
  return match ? Number(match[1]) : null;
}

/**
 * Normalise a summoner profile.
 *
 * Accepted input:
 *   - `{ id, puuid, game_name, tagline, profile_image_url, level,
 *      solo_tier_info: { tier, division, lp } }` (the v2 search endpoint),
 *   - `{ summoner: { … } }` (a leaderboard row),
 *   - `{ displayName, gameName, tagLine, summonerLevel, profileIconId,
 *      ranked: { queues: [ { queueType, tier, division, wins, losses, leaguePoints } ] } }`
 *     (the League Client profile),
 *   - `{ data: { … } }`.
 *
 * @param {object|null|undefined} raw
 * @param {object} [options]
 * @returns {{
 *   id: number|string|null, name: string|null, gameName: string|null,
 *   tagLine: string|null, iconId: number|null, level: number|null,
 *   tier: string|null, division: number|null, lp: number|null,
 *   winRate: number|null, wins: number, losses: number
 * }}
 */
export function normalizeSummoner(raw, options = {}) {
  let source = raw;
  if (isObject(raw) && isObject(raw.summoner)) source = raw.summoner;
  else if (isObject(raw) && isObject(raw.data)) source = raw.data;
  if (!isObject(source)) source = {};

  const tierInfo = (() => {
    const direct = pick(source, ['solo_tier_info', 'tier_info', 'tierInfo']);
    if (isObject(direct)) return direct;
    const stats = Array.isArray(source.league_stats) ? source.league_stats : [];
    const solo = stats.find((entry) => isObject(entry) && entry.game_type === 'SOLORANKED')
      || stats[0]
      || null;
    if (isObject(solo) && isObject(solo.tier_info)) return solo.tier_info;
    const queues = isObject(source.ranked) && Array.isArray(source.ranked.queues) ? source.ranked.queues : [];
    const queue = queues.find((entry) => isObject(entry) && entry.queueType === 'RANKED_SOLO_5x5')
      || queues[0]
      || null;
    if (isObject(queue)) {
      return {
        tier: queue.tier,
        division: queue.division,
        lp: queue.leaguePoints,
      };
    }
    return {};
  })();

  const record = (() => {
    const stats = Array.isArray(source.league_stats) ? source.league_stats : [];
    const solo = stats.find((entry) => isObject(entry) && entry.game_type === 'SOLORANKED') || stats[0] || null;
    if (isObject(solo)) return solo;
    const queues = isObject(source.ranked) && Array.isArray(source.ranked.queues) ? source.ranked.queues : [];
    const queue = queues.find((entry) => isObject(entry) && entry.queueType === 'RANKED_SOLO_5x5') || queues[0] || null;
    return isObject(queue) ? queue : {};
  })();

  const wins = toNumber(pick(record, ['win', 'wins'])) ?? 0;
  const losses = toNumber(pick(record, ['lose', 'losses', 'lose_count'])) ?? 0;

  const iconId = (() => {
    const direct = toNumber(pick(source, ['profileIconId', 'profile_icon_id']));
    if (direct !== null) return direct;
    return iconIdFromUrl(pick(source, ['profile_image_url', 'profileImageUrl']));
  })();

  const gameName = pick(source, ['game_name', 'gameName', 'displayName', 'name']);
  const tagLine = pick(source, ['tagline', 'tagLine', 'tag']);

  return {
    id: pick(source, ['id', 'summoner_id', 'summonerId', 'puuid']) ?? null,
    name: isFilledString(gameName) ? String(gameName) : null,
    gameName: isFilledString(gameName) ? String(gameName) : null,
    tagLine: isFilledString(tagLine) ? String(tagLine) : null,
    iconId,
    level: toNumber(pick(source, ['level', 'summonerLevel', 'summoner_level'])),
    tier: isFilledString(pick(tierInfo, ['tier'])) ? String(pick(tierInfo, ['tier'])) : null,
    division: toNumber(pick(tierInfo, ['division'])),
    lp: toNumber(pick(tierInfo, ['lp', 'leaguePoints', 'league_points'])),
    winRate: wins + losses > 0 ? wins / (wins + losses) : null,
    wins,
    losses,
  };
}

/* -------------------------------------------------------------------------- */
/* Match history                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a match list.
 *
 * Accepted input:
 *   - an array of games,
 *   - `{ data: [...] }`, `{ games: [...] }`, `{ data: { games: [...] } }`.
 *
 * Accepted game shapes:
 *   - the OP.GG v3 game (`{ id, created_at, game_type, game_length_second,
 *     participants: [ { champion_id, stats: { kill, death, assist, result } } ] }`),
 *   - a League Client match (`{ gameId, championId, kills, deaths, assists,
 *     duration, queueType, win }`).
 *
 * Options:
 *   - `puuid` / `summonerId` / `gameName` — pick the right participant.
 *
 * @param {Array|object|null|undefined} raw
 * @param {object} [options]
 * @returns {Array<{
 *   id: string|number|null, championId: number|null, championName: string|null,
 *   queue: string|null, result: string|null, kda: number|null,
 *   kills: number, deaths: number, assists: number, duration: number,
 *   timeAgo: string|null, win: boolean, score: number|null
 * }>}
 */
export function normalizeMatchList(raw, options = {}) {
  let list = raw;
  if (isObject(raw)) {
    const data = raw.data;
    if (Array.isArray(data)) list = data;
    else if (isObject(data)) {
      const inner = pick(data, ['games', 'data', 'matches', 'list']);
      list = Array.isArray(inner) ? inner : [];
    } else {
      const inner = pick(raw, ['games', 'matches', 'list', 'data']);
      list = Array.isArray(inner) ? inner : [];
    }
  }
  if (!Array.isArray(list)) return [];

  const wantedPuuid = pick(options, ['puuid']);
  const wantedId = pick(options, ['summonerId', 'summoner_id']);
  const wantedName = pick(options, ['gameName', 'game_name']);

  return list
    .filter((game) => isObject(game))
    .map((game) => {
      const participants = Array.isArray(game.participants) ? game.participants : [];
      const participant = participants.find((entry) => {
        if (!isObject(entry)) return false;
        const summoner = isObject(entry.summoner) ? entry.summoner : {};
        if (wantedPuuid && summoner.puuid === wantedPuuid) return true;
        if (wantedId && (summoner.id === wantedId || summoner.summoner_id === wantedId)) return true;
        if (wantedName && summoner.game_name === wantedName) return true;
        return false;
      }) || participants.find((entry) => isObject(entry)) || null;

      const stats = isObject(participant) && isObject(participant.stats) ? participant.stats : {};

      const championId = toNumber(
        (participant ? pick(participant, ['champion_id', 'championId']) : undefined)
        ?? pick(game, ['champion_id', 'championId']),
      );

      const kills = toNumber(pick(stats, ['kill', 'kills'])) ?? toNumber(pick(game, ['kills', 'kill'])) ?? 0;
      const deaths = toNumber(pick(stats, ['death', 'deaths'])) ?? toNumber(pick(game, ['deaths', 'death'])) ?? 0;
      const assists = toNumber(pick(stats, ['assist', 'assists'])) ?? toNumber(pick(game, ['assists', 'assist'])) ?? 0;

      const kda = (() => {
        const explicit = toNumber(pick(stats, ['kda']));
        if (explicit !== null) return explicit;
        if (deaths > 0) return (kills + assists) / deaths;
        return kills + assists > 0 ? kills + assists : null;
      })();

      const resultRaw = pick(stats, ['result']) ?? pick(game, ['result', 'win']);
      const win = (() => {
        if (typeof resultRaw === 'boolean') return resultRaw;
        if (isFilledString(resultRaw)) return resultRaw.toUpperCase() === 'WIN' || resultRaw.toUpperCase() === 'VICTORY';
        return null;
      })();

      return {
        id: pick(game, ['id', 'gameId', 'game_id', 'match_id']) ?? null,
        championId,
        championName: resolveName(championId, options),
        queue: pick(game, ['game_type', 'queueType', 'queue_type', 'queue']) ?? null,
        result: isFilledString(resultRaw) ? String(resultRaw) : (win === null ? null : (win ? 'WIN' : 'LOSE')),
        kda,
        kills,
        deaths,
        assists,
        duration: toNumber(pick(game, ['game_length_second', 'duration', 'gameLength'])) ?? 0,
        timeAgo: pick(game, ['created_at', 'time_ago', 'ended_at']) ?? null,
        win: win === null ? false : win,
        score: toNumber(pick(stats, ['op_score', 'score', 'opScore'])),
      };
    });
}

/* -------------------------------------------------------------------------- */
/* Leaderboard                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a ranked ladder.
 *
 * Accepted input:
 *   - an array of rows,
 *   - `{ data: [...] }`, `{ list: [...] }`.
 *
 * Accepted row shapes:
 *   - `{ rank, summoner: { game_name, tagline, profile_image_url, level,
 *      league_stats: [ { game_type: 'SOLORANKED', tier_info: { tier, division, lp }, win, lose } ] } }`,
 *   - a flat `{ rank, game_name, tier_info, win, lose }`.
 *
 * @param {Array|object|null|undefined} raw
 * @param {object} [options]
 * @returns {Array<{
 *   rank: number, summonerId: number|string|null, name: string|null,
 *   tier: string|null, division: number|null, lp: number|null,
 *   winRate: number|null, wins: number, losses: number, iconId: number|null
 * }>}
 */
export function normalizeLeaderboard(raw, options = {}) {
  let list = raw;
  if (isObject(raw)) {
    const data = raw.data;
    if (Array.isArray(data)) list = data;
    else if (isObject(data)) {
      const inner = pick(data, ['list', 'rankings', 'data', 'summoners']);
      list = Array.isArray(inner) ? inner : [];
    } else {
      const inner = pick(raw, ['list', 'rankings', 'data', 'summoners']);
      list = Array.isArray(inner) ? inner : [];
    }
  }
  if (!Array.isArray(list)) return [];

  return list
    .filter((row) => isObject(row))
    .map((row, index) => {
      const summoner = isObject(row.summoner) ? row.summoner : row;

      const stats = Array.isArray(summoner.league_stats) ? summoner.league_stats : [];
      const solo = stats.find((entry) => isObject(entry) && entry.game_type === 'SOLORANKED') || stats[0] || null;
      const tierInfo = (() => {
        if (isObject(solo) && isObject(solo.tier_info)) return solo.tier_info;
        if (isObject(summoner.tier_info)) return summoner.tier_info;
        if (isObject(summoner.solo_tier_info)) return summoner.solo_tier_info;
        return {};
      })();

      const wins = toNumber(pick(solo || {}, ['win', 'wins'])) ?? 0;
      const losses = toNumber(pick(solo || {}, ['lose', 'losses'])) ?? 0;

      const name = pick(summoner, ['game_name', 'gameName', 'name', 'displayName']);

      return {
        rank: toNumber(pick(row, ['rank'])) ?? index + 1,
        summonerId: pick(summoner, ['id', 'summoner_id', 'summonerId', 'puuid']) ?? null,
        name: isFilledString(name) ? String(name) : null,
        tier: isFilledString(pick(tierInfo, ['tier'])) ? String(pick(tierInfo, ['tier'])) : null,
        division: toNumber(pick(tierInfo, ['division'])),
        lp: toNumber(pick(tierInfo, ['lp', 'leaguePoints'])),
        winRate: wins + losses > 0 ? wins / (wins + losses) : null,
        wins,
        losses,
        iconId: iconIdFromUrl(pick(summoner, ['profile_image_url', 'profileImageUrl']))
          ?? toNumber(pick(summoner, ['profileIconId', 'profile_icon_id'])),
      };
    });
}

/* -------------------------------------------------------------------------- */
/* Augments                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Normalise an Arena / Mayhem augment.
 *
 * Accepted input:
 *   - the live shape `{ id, name, key, largeIcon, smallIcon, rarity: 8, desc, tooltip }`,
 *   - the curated shape `{ id: 'blade-waltz', name, tier: 'S+', rarity: 'Prismatic', icon, description }`.
 *
 * Rarity is normalised to `'prismatic' | 'gold' | 'silver' | 'unknown'`.
 * The live API encodes the rarity numerically — `8` prismatic, `4` gold,
 * `1` silver (verified against the augment catalogue).
 *
 * @param {object|null|undefined} raw
 * @returns {{id: number|string|null, name: string|null, rarity: string, icon: string, description: string}}
 */
export function normalizeAugment(raw) {
  if (!isObject(raw)) {
    return { id: null, name: null, rarity: 'unknown', icon: '', description: '' };
  }

  const rarity = (() => {
    const raw2 = pick(raw, ['rarity', 'rarityName', 'rarity_name', 'tier']);
    if (raw2 === undefined || raw2 === null) return 'unknown';
    if (typeof raw2 === 'number') {
      if (raw2 >= 8) return 'prismatic';
      if (raw2 >= 4) return 'gold';
      if (raw2 >= 2) return 'gold';
      return 'silver';
    }
    const value = String(raw2).trim().toLowerCase();
    if (!value) return 'unknown';
    if (value.includes('prismatic')) return 'prismatic';
    if (value.includes('gold')) return 'gold';
    if (value.includes('silver')) return 'silver';
    if (value === '8' || value === '4' || value === '1') {
      if (value === '8') return 'prismatic';
      if (value === '4') return 'gold';
      return 'silver';
    }
    return 'unknown';
  })();

  return {
    id: pick(raw, ['id', 'augment_id']) ?? null,
    name: isFilledString(pick(raw, ['name', 'title'])) ? String(pick(raw, ['name', 'title'])) : null,
    rarity,
    icon: (() => {
      const icon = pick(raw, ['smallIcon', 'icon', 'largeIcon', 'image_url']);
      return isFilledString(icon) ? String(icon) : '';
    })(),
    description: (() => {
      const description = pick(raw, ['desc', 'description', 'tooltip']);
      return isFilledString(description) ? String(description) : '';
    })(),
  };
}
