/**
 * ARAM: Mayhem screen — page-local data shaping.
 *
 * The screen is a **swarm table**: six tier rows, each row holding the
 * champions of that tier, each champion showing its portrait and the augments
 * it pairs with.
 *
 * Three payloads feed it, and all three are read through `ctx.api`:
 *
 *   1. `ctx.api.modeTierList('arena')` — the arena tier list
 *      (`GET /api/GLOBAL/champions/arena/`). The live rows look like
 *
 *        { "id": 86, "is_rotation": false, "is_rip": false,
 *          "average_stats": { "win": 43583, "play": 83264,
 *                             "total_place": 284326, "first_place": 14385,
 *                             "pick_rate": 0.110745, "ban_rate": 0.0504778,
 *                             "kills": 728711, "assists": 818261,
 *                             "deaths": 601056, "tier": 2, "rank": 49,
 *                             "tier_data": { "tier": 2, "rank": 49,
 *                                            "rank_prev": 49,
 *                                            "rank_prev_patch": 30 } } }
 *
 *      The tier lives in `average_stats.tier` and the global rank in
 *      `average_stats.rank`. The "ultimate form" pseudo champions carry
 *      `is_rip: true` and a `null` `average_stats` — they have no tier and
 *      are dropped.
 *
 *   2. `ctx.api.championDetail({ championId, mode: 'arena' })` — the arena
 *      champion detail. Its `data.augment_group` groups the augments of the
 *      champion by rarity:
 *
 *        "augment_group": [ { "rarity": 1, "augments": [
 *          { "id": 22, "win": 3702, "play": 7166, "total_place": 24594,
 *            "first_place": 1163, "pick_rate": 0.0886,
 *            "win_rate": 0.5166061959252023 } ] } ]
 *
 *   3. `ctx.api.staticData()` — the champion registry and the augment
 *      catalogue. Every augment of the catalogue carries an id, a display name
 *      and the icon the reference shows.
 *
 * Everything in this module is pure: no DOM, no network, no store.
 */

import { championById } from '../../data/champions.js';

/* -------------------------------------------------------------------------
 * Constants
 * ---------------------------------------------------------------------- */

/** The mode the screen reads — the arena queue is the Mayhem queue. */
export const MODE = 'arena';

/** The tier buckets, in display order — 0 (OP) first, 5 last. */
export const TIER_ORDER = [0, 1, 2, 3, 4, 5];

/** The letter every tier badge carries (`optier-0.svg` is the "OP" badge). */
export const TIER_BADGES = { 0: 'OP', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };

/** OP.GG's static CDN. */
export const CDN_BASE = 'https://opgg-static.akamaized.net';

/**
 * The reference's own image transform for a champion portrait.
 *
 * The reference loads the square portrait and asks the image service for a
 * 103px crop of the champion's face, delivered as a 160px webp.
 */
export const PORTRAIT_TRANSFORM =
  'image=c_crop,h_103,w_103,x_9,y_9/q_auto:good,f_webp,w_160,h_160&v=1507';

/**
 * The image-service transform for the 20px augment icons.
 *
 * The raw `…/augment/{key}_small.png` object is not served by the CDN edge
 * any more (it answers 403); the image service still resolves it, so every
 * augment icon is requested through the transform.
 */
export const AUGMENT_TRANSFORM = 'image=c_scale,q_auto,w_40';

/** How many augments are shown for one champion. */
export const AUGMENTS_SHOWN = 3;

/**
 * The number of games an augment needs before it may be shown as a pairing.
 *
 * The arena endpoint lists augments that were picked a handful of times; a
 * 100 % win rate over three games is noise, not a pairing. An augment below
 * the threshold is not shown — a pairing is never invented.
 */
export const MIN_AUGMENT_PLAYS = 50;

/* -------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------- */

/** First value that is neither `null`, `undefined` nor an empty string. */
export function firstDefined(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    return value;
  }
  return undefined;
}

/** Parse a value into a finite number, or `null`. */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(String(value).replace('%', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/** `true` when the value looks like an absolute URL. */
function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

/* -------------------------------------------------------------------------
 * Tier list
 * ---------------------------------------------------------------------- */

/**
 * Extract the row array out of any of the accepted payload shapes.
 *
 * The main process answers with `{ ok, mode, patch, updatedAt, rows }`; the
 * raw upstream document answers with `{ data: [...] }`. Both are accepted.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
export function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of ['rows', 'data', 'champions', 'list', 'items']) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  for (const key of ['rows', 'data', 'result']) {
    const value = payload[key];
    if (value && typeof value === 'object') {
      const nested = extractRows(value);
      if (nested.length) return nested;
    }
  }

  return [];
}

/**
 * Parse the tier of a row.
 *
 * The upstream payload carries a number (`2`), the main process hands the
 * tier on as the reference's own label (`'OP'`, `'Tier 2'`). Both are read.
 *
 * @param {*} value
 * @returns {number|null}
 */
export function tierNumber(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (text === 'op' || text === 'op+' || text === 's+') return 0;

  const parsed = parseFloat(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalise the arena tier list into `{ id, tier, rank }` rows.
 *
 * A row without a numeric id or without a tier cannot be placed in the table
 * and is dropped — the "ultimate form" pseudo champions are the usual case.
 *
 * @param {*} payload - whatever `ctx.api.modeTierList('arena')` resolved with.
 * @returns {Array<{id:number, tier:number, rank:number|null}>}
 */
export function normalizeTierRows(payload) {
  const rows = [];

  for (const raw of extractRows(payload)) {
    if (!raw || typeof raw !== 'object') continue;

    const id = toNumber(firstDefined(raw.id, raw.champion_id, raw.championId));
    if (id === null) continue;

    const stats = raw.average_stats || raw.averageStats || {};
    const tierData = raw.tier_data || raw.tierData || stats.tier_data || stats.tierData || {};

    const tier = tierNumber(firstDefined(
      raw.tier,
      tierData.tier,
      stats.tier,
      raw.tier_rank,
      raw.tierRank,
    ));
    if (tier === null) continue;

    const rank = toNumber(firstDefined(
      raw.rank,
      raw.tierRank,
      tierData.rank,
      stats.rank,
      raw.rank_num,
      raw.rankNum,
    ));

    rows.push({
      id,
      tier: Math.min(5, Math.max(0, Math.round(tier))),
      rank: rank === null ? null : rank,
      name: typeof raw.name === 'string' && raw.name ? raw.name : null,
      key: typeof raw.key === 'string' && raw.key ? raw.key : null,
      imageUrl: isUrl(raw.imageUrl)
        ? raw.imageUrl
        : (isUrl(raw.squareImageUrl) ? raw.squareImageUrl : null),
    });
  }

  return rows;
}

/**
 * Group the rows into the six tier buckets, in display order.
 *
 * A bucket without a champion is **not** rendered: the table only ever shows
 * the rows that carry champions.
 *
 * @param {Array<{id:number, tier:number, rank:number|null}>} rows
 * @returns {Array<{tier:number, champions:Array<object>}>}
 */
export function groupByTier(rows) {
  const buckets = new Map();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const tier = toNumber(row.tier);
    if (tier === null) continue;
    const bucket = Math.min(5, Math.max(0, Math.round(tier)));
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push(row);
  }

  const groups = [];

  for (const tier of TIER_ORDER) {
    const champions = buckets.get(tier);
    if (!champions || !champions.length) continue;

    // The API's rank is the global rank, so sorting by it keeps the tier in
    // the order the reference shows.
    champions.sort((a, b) => {
      const left = a.rank === null || a.rank === undefined ? Number.MAX_SAFE_INTEGER : a.rank;
      const right = b.rank === null || b.rank === undefined ? Number.MAX_SAFE_INTEGER : b.rank;
      if (left !== right) return left - right;
      return a.id - b.id;
    });

    groups.push({ tier, champions });
  }

  return groups;
}

/* -------------------------------------------------------------------------
 * Champion registry
 * ---------------------------------------------------------------------- */

/** The keys a champion list may hide behind. */
const CHAMPION_LIST_KEYS = [
  'champions',
  'metaChampions',
  'championNames',
  'champion_list',
  'championList',
];

/**
 * Collect the champion records out of the static payload.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
function collectChampionRecords(payload) {
  const records = [];

  const push = (record) => {
    if (!record || typeof record !== 'object') return;
    if (typeof record.name !== 'string' || !record.name) return;
    records.push(record);
  };

  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 3) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === 'object' && !Array.isArray(item)) push(item);
      }
      return;
    }

    for (const key of CHAMPION_LIST_KEYS) {
      if (Array.isArray(node[key])) visit(node[key], depth + 1);
    }
    if (Array.isArray(node.data)) visit(node.data, depth + 1);
  };

  visit(payload, 0);
  return records;
}

/**
 * Build the id-keyed champion index out of the static payload.
 *
 * @param {*} payload - whatever `ctx.api.staticData()` resolved with.
 * @returns {Map<number, {id:number, key:string|null, name:string, imageUrl:string|null}>}
 */
export function buildChampionIndex(payload) {
  const index = new Map();

  for (const record of collectChampionRecords(payload)) {
    const id = toNumber(firstDefined(record.id, record.champion_id, record.championId));
    if (id === null) continue;

    const known = index.get(id) || { id, key: null, name: '', imageUrl: null };

    const name = typeof record.name === 'string' ? record.name : '';
    if (!known.name && name) known.name = name;

    const key = typeof record.key === 'string' ? record.key : '';
    if (!known.key && key) known.key = key;

    const image = firstDefined(
      record.squareImageUrl,
      record.square_image_url,
      record.image_url,
      record.imageUrl,
      record.square,
    );
    if (!known.imageUrl && isUrl(image)) known.imageUrl = image;

    index.set(id, known);
  }

  return index;
}

/**
 * Attach the champion identity to the tier rows.
 *
 * The tier list only carries ids. The name comes from the static payload and,
 * when that one is unavailable, from the local champion registry — a name is
 * never invented.
 *
 * @param {Array<object>} rows - the normalised tier rows.
 * @param {Map<number, object>} champions - the champion index.
 * @returns {Array<object>}
 */
export function decorateRows(rows, champions) {
  const index = champions instanceof Map ? champions : new Map();

  return rows.map((row) => {
    const champ = index.get(row.id) || null;
    const local = championById(row.id);

    const name = row.name || (champ && champ.name) || (local && local.name) || `#${row.id}`;
    const key = row.key || (champ && champ.key) || (local && local.key) || null;

    let imageUrl = row.imageUrl || (champ && champ.imageUrl) || null;
    if (!imageUrl && key) {
      imageUrl = `${CDN_BASE}/meta/images/lol/latest/champion/${key}.png`;
    }

    return { ...row, name, key, imageUrl };
  });
}

/**
 * The portrait URL of a champion.
 *
 * @param {{imageUrl?: string|null}} champion
 * @returns {string} the URL, or `''` when the champion has no portrait.
 */
export function portraitUrl(champion) {
  const base = champion && champion.imageUrl ? String(champion.imageUrl).split('?')[0] : '';
  if (!base) return '';
  return `${base}?${PORTRAIT_TRANSFORM}`;
}

/* -------------------------------------------------------------------------
 * Augments
 * ---------------------------------------------------------------------- */

/** The keys an augment list may hide behind. */
const AUGMENT_LIST_KEYS = ['augments', 'augment_list', 'augmentList'];

/**
 * Collect the augment records out of the static payload.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
function collectAugmentRecords(payload) {
  const records = [];

  const push = (record) => {
    if (!record || typeof record !== 'object') return;
    if (record.name === undefined && record.key === undefined) return;
    records.push(record);
  };

  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 3) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        if (item && typeof item === 'object' && !Array.isArray(item)) push(item);
      }
      return;
    }

    for (const key of AUGMENT_LIST_KEYS) {
      if (Array.isArray(node[key])) visit(node[key], depth + 1);
    }
    if (node.data && typeof node.data === 'object' && !Array.isArray(node.data)) {
      visit(node.data, depth + 1);
    }
  };

  visit(payload, 0);
  return records;
}

/**
 * Build the id-keyed augment catalogue out of the static payload.
 *
 * The catalogue is the only source of an augment's **name** and **icon**; the
 * champion detail only carries the numbers.
 *
 * @param {*} payload - whatever `ctx.api.staticData()` resolved with.
 * @returns {Map<number, {id:number, name:string, key:string|null, iconUrl:string|null}>}
 */
export function buildAugmentIndex(payload) {
  const index = new Map();

  for (const record of collectAugmentRecords(payload)) {
    const id = toNumber(firstDefined(record.id, record.augment_id, record.augmentId));
    if (id === null) continue;

    const known = index.get(id) || { id, name: '', key: null, iconUrl: null };

    const name = typeof record.name === 'string' ? record.name : '';
    if (!known.name && name) known.name = name;

    const key = typeof record.key === 'string' ? record.key : '';
    if (!known.key && key) known.key = key;

    const icon = firstDefined(
      record.smallIconUrl,
      record.smallIcon,
      record.small_icon_url,
      record.iconUrl,
      record.icon,
      record.largeIconUrl,
      record.largeIcon,
      record.image_url,
    );
    if (!known.iconUrl && isUrl(icon)) known.iconUrl = icon;

    index.set(id, known);
  }

  return index;
}

/**
 * The icon URL of an augment.
 *
 * The catalogue's own URL is used when there is one; otherwise the icon is
 * addressed by the augment key, the way the reference does.
 *
 * @param {{iconUrl?: string|null, key?: string|null}} augment
 * @returns {string}
 */
export function augmentIconUrl(augment) {
  if (!augment) return '';

  const base = augment.iconUrl ? String(augment.iconUrl).split('?')[0] : '';
  if (!base) {
    if (!augment.key) return '';
    return `${CDN_BASE}/meta/images/lol/latest/augment/${augment.key}_small.png`;
  }

  return `${base}?${AUGMENT_TRANSFORM}`;
}

/**
 * Extract the `augment_group` of a champion detail payload.
 *
 * The main process is expected to hand the arena document on as
 * `data.augment_group`; the flat and the unwrapped spellings are accepted as
 * well, so the page keeps working when the payload is shaped differently.
 *
 * @param {*} payload - whatever `ctx.api.championDetail()` resolved with.
 * @returns {Array<{rarity:number|null, augments:Array<object>}>}
 */
export function extractAugmentGroup(payload) {
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.augment_group,
    payload.augmentGroup,
    payload.data && payload.data.augment_group,
    payload.data && payload.data.augmentGroup,
    payload.data && payload.data.data && payload.data.data.augment_group,
    payload.result && payload.result.augment_group,
    payload.result && payload.result.augmentGroup,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  // A flat list of augments (no rarity groups) is read as a single group.
  const flat = [payload.augments, payload.data && payload.data.augments];
  for (const candidate of flat) {
    if (Array.isArray(candidate) && candidate.length) {
      return [{ rarity: null, augments: candidate }];
    }
  }

  return [];
}

/**
 * Pick the augments a champion pairs with.
 *
 * The arena endpoint groups the augments of a champion by rarity and gives
 * every one of them a win rate. The pairing shown on the page is the handful
 * of augments with the **highest win rate**, and only augments that were
 * actually played often enough to mean something. An augment that the
 * catalogue does not know is not shown — a pairing is never invented.
 *
 * @param {Array<object>} group - the `augment_group` of the champion.
 * @param {Map<number, object>} catalogue - the augment catalogue.
 * @param {object} [options]
 * @param {number} [options.limit=3] - how many augments to show.
 * @param {number} [options.minPlays=50] - the minimum number of games.
 * @returns {Array<{id:number, name:string, key:string|null, iconUrl:string, winRate:number|null, play:number}>}
 */
export function pickAugments(group, catalogue, options = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : AUGMENTS_SHOWN;
  const minPlays = Number.isFinite(options.minPlays) ? options.minPlays : MIN_AUGMENT_PLAYS;
  const index = catalogue instanceof Map ? catalogue : new Map();

  const entries = [];

  for (const rarityGroup of Array.isArray(group) ? group : []) {
    if (!rarityGroup || typeof rarityGroup !== 'object') continue;
    const augments = Array.isArray(rarityGroup.augments) ? rarityGroup.augments : [];

    for (const augment of augments) {
      if (!augment || typeof augment !== 'object') continue;

      const id = toNumber(firstDefined(augment.id, augment.augment_id));
      if (id === null) continue;

      const play = toNumber(firstDefined(augment.play, augment.games)) || 0;
      if (play < minPlays) continue;

      const meta = index.get(id) || null;
      if (!meta || !meta.name) continue;

      entries.push({
        id,
        name: meta.name,
        key: meta.key,
        iconUrl: augmentIconUrl(meta),
        winRate: toNumber(firstDefined(augment.win_rate, augment.winRate)),
        play,
      });
    }
  }

  entries.sort((a, b) => {
    const left = a.winRate === null ? -1 : a.winRate;
    const right = b.winRate === null ? -1 : b.winRate;
    if (left !== right) return right - left;
    return b.play - a.play;
  });

  return entries.slice(0, limit);
}

/* -------------------------------------------------------------------------
 * Tiers & search
 * ---------------------------------------------------------------------- */

/**
 * The label of a tier bucket.
 *
 * @param {number} tier
 * @returns {string}
 */
export function tierLabel(tier) {
  const bucket = Math.min(5, Math.max(0, Number(tier) || 0));
  return bucket === 0 ? 'OP' : `Tier ${bucket}`;
}

/**
 * The local tier badge of a tier bucket.
 *
 * @param {number} tier
 * @returns {string} the file URL.
 */
export function tierBadgeUrl(tier) {
  const bucket = Math.min(5, Math.max(0, Number(tier) || 0));
  return new URL(`../../assets/images/ui/optier-${bucket}.svg`, import.meta.url).href;
}

/**
 * The letter a tier badge carries.
 *
 * @param {number} tier
 * @returns {string}
 */
export function tierBadgeLetter(tier) {
  const bucket = Math.min(5, Math.max(0, Number(tier) || 0));
  return TIER_BADGES[bucket] || String(bucket);
}

/**
 * The champions whose name matches the search term.
 *
 * @param {Array<object>} champions
 * @param {string} query
 * @returns {Array<object>}
 */
export function filterChampions(champions, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return champions.slice();
  return champions.filter((champion) => (
    String(champion.name || '').toLowerCase().includes(needle)
  ));
}
