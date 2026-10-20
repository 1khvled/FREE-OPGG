/**
 * OP.GG public API client.
 *
 * Hosts (see `docs/rea/endpoints.md`):
 *
 *   - `https://lol-api-champion.op.gg`  champion tier lists, builds, runes
 *   - `https://lol-api-summoner.op.gg`   summoner profiles, match history
 *   - `https://desktop-api.op.gg`        desktop-only services
 *   - `https://ddragon.leagueoflegends.com`  Data Dragon metadata
 *
 * Behaviour:
 *   - a short in-memory TTL cache (60 s for tier lists, 6 h for static data)
 *   - a bounded retry with exponential backoff on 429 / 5xx and network errors
 *   - a short request timeout (8 s)
 *
 * The client returns the **raw** upstream payloads. Normalisation into the
 * shapes the renderer expects happens in `main/ipc/opgg.js`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

/** Upstream hosts. */
const HOSTS = {
  champion: 'https://lol-api-champion.op.gg',
  summoner: 'https://lol-api-summoner.op.gg',
  desktop: 'https://desktop-api.op.gg',
  ddragon: 'https://ddragon.leagueoflegends.com',
  communityDragon: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1',
};

/** Cache lifetimes (ms). */
const TTL = {
  tierList: 60 * 1000,
  detail: 60 * 1000,
  summoner: 120 * 1000,
  ladder: 60 * 1000,
  static: 6 * 60 * 60 * 1000,
  patch: 30 * 60 * 1000,
};

/** Request timeout (ms). */
const TIMEOUT = 8000;

/** Retry policy. */
const RETRY = {
  attempts: 3,
  baseDelay: 400,
  maxDelay: 4000,
};

/** Shared headers — the reference identifies itself as the desktop app. */
const DEFAULT_HEADERS = {
  'User-Agent': 'OP.GG Desktop App',
  Accept: 'application/json',
};

/** Absolute path of the bundled static assets (read-only fallback data). */
const ASSETS_DIR = path.join(__dirname, '..', '..', 'src', 'assets');

/**
 * A tiny TTL cache.
 */
class TtlCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * @param {string} key
   * @returns {*} the cached value or `undefined`
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * @param {string} key
   * @param {*} value
   * @param {number} ttl - lifetime in ms
   */
  set(key, value, ttl) {
    this.store.set(key, { value, expires: Date.now() + ttl });
    return value;
  }

  /** Remove every entry. */
  clear() {
    this.store.clear();
  }
}

const cache = new TtlCache();

/** Shared axios instance. */
const http = axios.create({
  timeout: TIMEOUT,
  headers: DEFAULT_HEADERS,
  maxRedirects: 3,
  validateStatus: null,
});

/**
 * Sleep helper.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/**
 * Whether a failed request is worth retrying.
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isRetryable(err) {
  if (!err) return false;
  const status = err.status || (err.response && err.response.status);
  if (!status) return true; // network error / timeout
  return status === 429 || status >= 500;
}

/**
 * Perform a GET with retry + backoff.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {object} [options.params] - query parameters
 * @param {number} [options.ttl] - cache lifetime; 0 disables caching
 * @param {object} [options.headers]
 * @returns {Promise<*>} the parsed JSON body
 */
async function getJson(url, options = {}) {
  const { params, ttl = 0, headers } = options;
  const cacheKey = ttl ? `${url}?${JSON.stringify(params || {})}` : null;

  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;
  }

  let lastError = null;
  for (let attempt = 0; attempt < RETRY.attempts; attempt += 1) {
    try {
      const res = await http.get(url, { params, headers });
      const status = res.status;
      if (status >= 400) {
        const error = new Error(`HTTP ${status} for ${url}`);
        error.status = status;
        error.data = res.data;
        if (status === 429) {
          const retryAfter = Number(res.headers && res.headers['retry-after']);
          error.retryAfterMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 0;
        }
        if (!isRetryable(error) || attempt === RETRY.attempts - 1) throw error;
        lastError = error;
      } else {
        if (cacheKey) cache.set(cacheKey, res.data, ttl);
        return res.data;
      }
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === RETRY.attempts - 1) throw err;
    }

    const backoff = Math.min(
      RETRY.baseDelay * 2 ** attempt + Math.round(Math.random() * 150),
      RETRY.maxDelay,
    );
    const wait = lastError && lastError.retryAfterMs
      ? Math.max(backoff, lastError.retryAfterMs)
      : backoff;
    await delay(wait);
  }

  throw lastError || new Error(`Request failed: ${url}`);
}

/**
 * Read a bundled JSON asset (offline fallback).
 *
 * @param {string} fileName
 * @returns {*|null}
 */
function readLocalAsset(fileName) {
  try {
    const file = path.join(ASSETS_DIR, fileName);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Champion API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `GET /api/meta/champion-names?hl=en_US`
 *
 * @returns {Promise<Array<{id:number,name:string}>>}
 */
async function getChampionNames() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/champion-names`, {
    params: { hl: 'en_US' },
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;

  const fallback = readLocalAsset('champion_names_cache.json');
  return Array.isArray(fallback) ? fallback : [];
}

/**
 * `GET /api/meta/champions?hl=en_US` — full champion metadata.
 *
 * @returns {Promise<Array<object>>}
 */
async function getChampionMeta() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/champions`, {
    params: { hl: 'en_US' },
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;

  const fallback = readLocalAsset('champions_ddragon.json');
  if (fallback && fallback.data && typeof fallback.data === 'object') {
    return Object.values(fallback.data).map((entry) => ({
      id: Number(entry.key) || Number(entry.id),
      key: entry.id,
      name: entry.name,
      title: entry.title,
      image_url: entry.image_url || '',
      blurb: entry.blurb || '',
      tags: entry.tags || [],
    }));
  }
  return [];
}

/**
 * `GET /api/meta/items?hl=en_US`
 *
 * @returns {Promise<Array<object>>}
 */
async function getItemMeta() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/items`, {
    params: { hl: 'en_US' },
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;

  const fallback = readLocalAsset('items.json');
  if (fallback && fallback.data && typeof fallback.data === 'object') {
    return Object.values(fallback.data).map((entry) => ({
      id: Number(entry.id) || Number(entry.key),
      name: entry.name,
      image_url: '',
      plaintext: entry.plaintext || '',
      description: entry.description || '',
      gold: entry.gold || {},
    }));
  }
  return [];
}

/**
 * `GET /api/meta/runes?hl=en_US`
 *
 * @returns {Promise<Array<object>>}
 */
async function getRuneMeta() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/runes`, {
    params: { hl: 'en_US' },
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;

  const fallback = readLocalAsset('runes.json');
  if (Array.isArray(fallback)) {
    const out = [];
    for (const tree of fallback) {
      for (const slot of tree.slots || []) {
        for (const rune of slot.runes || []) {
          out.push({
            id: rune.id,
            page_id: tree.id,
            key: rune.key,
            name: rune.name,
            short_desc: rune.shortDesc || '',
            long_desc: rune.longDesc || '',
            image_url: '',
          });
        }
      }
    }
    return out;
  }
  return [];
}

/**
 * `GET /api/meta/rune-pages?hl=en_US`
 *
 * @returns {Promise<Array<object>>}
 */
async function getRunePageMeta() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/rune-pages`, {
    params: { hl: 'en_US' },
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * `GET /api/meta/spells?hl=en_US` — summoner spells.
 *
 * @returns {Promise<Array<object>>}
 */
async function getSummonerSpellMeta() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/spells`, {
    params: { hl: 'en_US' },
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

/**
 * `GET /api/meta/augments` / `GET /api/meta/aram-augments`
 *
 * @param {'augments'|'aram-augments'} kind
 * @returns {Promise<Array<object>>}
 */
async function getAugments(kind = 'augments') {
  const payload = await getJson(`${HOSTS.champion}/api/meta/${kind}`, {
    ttl: TTL.static,
  });
  if (payload && Array.isArray(payload.data)) return payload.data;

  const fallback = readLocalAsset(kind === 'aram-augments' ? 'meta_augments.json' : 'augments.json');
  if (Array.isArray(fallback)) return fallback;
  return [];
}

/**
 * `GET /api/meta/versions` — the patch list used by OP.GG.
 *
 * @returns {Promise<string[]>}
 */
async function getGameVersions() {
  const payload = await getJson(`${HOSTS.champion}/api/meta/versions`, { ttl: TTL.static });
  if (Array.isArray(payload && payload.data)) return payload.data;
  return [];
}

/**
 * Fetch a champion tier list.
 *
 * @param {object} options
 * @param {'ranked'|'aram'|'arena'} options.mode
 * @param {string} options.region - e.g. `GLOBAL`, `KR`, `NA`
 * @param {string} options.tier - e.g. `emerald_plus`, `all`
 * @returns {Promise<{rows:Array<object>, meta:object}>}
 */
async function getTierList({ mode = 'ranked', region = 'GLOBAL', tier = 'emerald_plus' } = {}) {
  const normalisedMode = String(mode || 'ranked').toLowerCase();
  const regionKey = String(region || 'GLOBAL').toUpperCase();
  const tierKey = String(tier || 'emerald_plus').toLowerCase();

  let url;
  if (normalisedMode === 'aram') {
    url = `${HOSTS.champion}/api/${regionKey}/champions/aram/`;
  } else if (normalisedMode === 'arena' || normalisedMode === 'mayhem') {
    url = `${HOSTS.champion}/api/${regionKey}/champions/arena/`;
  } else {
    url = `${HOSTS.champion}/api/${regionKey}/champions/ranked`;
  }

  const payload = await getJson(url, {
    params: normalisedMode === 'ranked' ? { tier: tierKey } : undefined,
    ttl: TTL.tierList,
  });

  if (payload && Array.isArray(payload.data)) {
    return { rows: payload.data, meta: payload.meta || {}, url };
  }

  // Offline fallback: the bundled snapshot of the same endpoint.
  const fallbackFile = normalisedMode === 'aram'
    ? 'aram_champions_cache.json'
    : (normalisedMode === 'arena' || normalisedMode === 'mayhem')
      ? 'arena_champions_cache.json'
      : 'ranked_champions_cache.json';
  const fallback = readLocalAsset(fallbackFile);
  if (Array.isArray(fallback)) {
    return { rows: fallback, meta: { cached: true, source: 'offline-snapshot' }, url, cached: true };
  }

  return { rows: [], meta: payload && payload.meta ? payload.meta : {}, url };
}

/**
 * Fetch a champion build + rune page recommendation.
 *
 * @param {object} options
 * @param {number} options.champId
 * @param {string} options.mode - `ranked` | `aram` | `arena`
 * @param {string} options.position - lane, `none` for non-ranked modes
 * @param {string} options.tier
 * @returns {Promise<{data:object, meta:object}>}
 */
async function getChampionBuild({ champId, mode = 'ranked', position = 'top', tier = 'all' } = {}) {
  const normalisedMode = String(mode || 'ranked').toLowerCase();
  const lane = ['aram', 'arena', 'mayhem'].includes(normalisedMode)
    ? 'none'
    : String(position || 'top').toLowerCase();
  const tierKey = String(tier || 'all').toLowerCase();

  const url = `${HOSTS.champion}/api/GLOBAL/champions/${normalisedMode}/${champId}/${lane}`;
  const payload = await getJson(url, {
    params: { tier: tierKey, is_more: true },
    ttl: TTL.detail,
  });
  return { data: (payload && payload.data) || {}, meta: (payload && payload.meta) || {}, url };
}

/**
 * Fetch arena-specific champion data (augments, prism items, synergies).
 *
 * @param {number} champId
 * @returns {Promise<{data:object, meta:object}>}
 */
async function getArenaChampion(champId) {
  const url = `${HOSTS.champion}/api/GLOBAL/champions/arena/${champId}`;
  const payload = await getJson(url, { ttl: TTL.detail });
  return { data: (payload && payload.data) || {}, meta: (payload && payload.meta) || {}, url };
}

/* -------------------------------------------------------------------------- */
/* Summoner API                                                                */
/* -------------------------------------------------------------------------- */

/** Uppercase region slugs accepted by `lol-api-summoner.op.gg`. */
const SUMMONER_REGIONS = [
  'KR', 'JP', 'NA', 'EUW', 'EUNE', 'OCE', 'BR', 'LAS', 'LAN', 'RU', 'TR',
  'SG', 'ID', 'PH', 'TW', 'VN', 'TH', 'ME',
];

/**
 * Normalise a region string to the uppercase slug the API expects.
 *
 * @param {string} region
 * @returns {string}
 */
function normaliseRegion(region) {
  const key = String(region || 'kr').trim().toUpperCase();
  return SUMMONER_REGIONS.includes(key) ? key : 'KR';
}

/**
 * `GET /api/{region}/rankings/ladder?page=N` — the ranked ladder.
 *
 * @param {object} options
 * @param {string} options.region
 * @param {number} options.page
 * @returns {Promise<{rows:Array<object>, meta:object}>}
 */
async function getLadder({ region = 'kr', page = 1 } = {}) {
  const regionKey = normaliseRegion(region);
  const pageNumber = Math.max(1, Number(page) || 1);
  const url = `${HOSTS.summoner}/api/${regionKey}/rankings/ladder`;
  const payload = await getJson(url, { params: { page: pageNumber }, ttl: TTL.ladder });
  return {
    rows: (payload && Array.isArray(payload.data)) ? payload.data : [],
    meta: (payload && payload.meta) || {},
    url,
  };
}

/**
 * `GET /api/v3/{region}/summoners/{puuid}/summary` — summoner summary.
 *
 * @param {object} options
 * @param {string} options.puuid
 * @param {string} options.region
 * @returns {Promise<object|null>}
 */
async function getSummonerSummary({ puuid, region = 'kr' } = {}) {
  if (!puuid) return null;
  const regionKey = normaliseRegion(region);
  const url = `${HOSTS.summoner}/api/v3/${regionKey}/summoners/${encodeURIComponent(puuid)}/summary`;
  const payload = await getJson(url, { ttl: TTL.summoner });
  return (payload && payload.data) || null;
}

/**
 * `GET /api/v3/{region}/summoners/{puuid}/games` — match history.
 *
 * @param {object} options
 * @param {string} options.puuid
 * @param {string} options.region
 * @returns {Promise<Array<object>>}
 */
async function getSummonerGames({ puuid, region = 'kr' } = {}) {
  if (!puuid) return [];
  const regionKey = normaliseRegion(region);
  const url = `${HOSTS.summoner}/api/v3/${regionKey}/summoners/${encodeURIComponent(puuid)}/games`;
  const payload = await getJson(url, { ttl: TTL.summoner });
  return (payload && Array.isArray(payload.data)) ? payload.data : [];
}

/**
 * `GET /api/v3/{region}/summoners/{puuid}/most-champions-legacy/rank`
 *
 * @param {object} options
 * @param {string} options.puuid
 * @param {string} options.region
 * @param {number} options.seasonId
 * @returns {Promise<object|null>}
 */
async function getMostChampions({ puuid, region = 'kr', seasonId = 0 } = {}) {
  if (!puuid) return null;
  const regionKey = normaliseRegion(region);
  const url = `${HOSTS.summoner}/api/v3/${regionKey}/summoners/${encodeURIComponent(puuid)}/most-champions-legacy/rank`;
  const payload = await getJson(url, {
    params: { game_type: 'RANKED', season_id: seasonId || 0 },
    ttl: TTL.summoner,
  });
  return (payload && payload.data) || null;
}

/* -------------------------------------------------------------------------- */
/* Data Dragon                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `GET /api/versions.json` — the Data Dragon version list.
 *
 * @returns {Promise<string[]>}
 */
async function getDdragonVersions() {
  const payload = await getJson(`${HOSTS.ddragon}/api/versions.json`, { ttl: TTL.static });
  return Array.isArray(payload) ? payload : [];
}

/**
 * The newest Data Dragon version string.
 *
 * @returns {Promise<string|null>}
 */
async function getLatestDdragonVersion() {
  const versions = await getDdragonVersions();
  return versions.length ? versions[0] : null;
}

/**
 * `GET /cdn/{version}/data/en_US/champion/{key}.json` — one champion's spells.
 *
 * @param {string} version
 * @param {string} championKey
 * @returns {Promise<object|null>}
 */
async function getDdragonChampion(version, championKey) {
  if (!version || !championKey) return null;
  const url = `${HOSTS.ddragon}/cdn/${version}/data/en_US/champion/${championKey}.json`;
  try {
    return await getJson(url, { ttl: TTL.static });
  } catch (err) {
    return null;
  }
}

/**
 * `GET /cdn/{version}/data/en_US/champion.json` — the champion list.
 *
 * @param {string} version
 * @returns {Promise<object|null>}
 */
async function getDdragonChampions(version) {
  if (!version) return null;
  const url = `${HOSTS.ddragon}/cdn/${version}/data/en_US/champion.json`;
  try {
    return await getJson(url, { ttl: TTL.static });
  } catch (err) {
    return null;
  }
}

/**
 * `GET /cdn/{version}/data/en_US/item.json` — item metadata.
 *
 * @param {string} version
 * @returns {Promise<object|null>}
 */
async function getDdragonItems(version) {
  if (!version) return null;
  const url = `${HOSTS.ddragon}/cdn/${version}/data/en_US/item.json`;
  try {
    return await getJson(url, { ttl: TTL.static });
  } catch (err) {
    return null;
  }
}

/**
 * `GET /cdn/{version}/data/en_US/runesReforged.json` — rune trees.
 *
 * @param {string} version
 * @returns {Promise<Array<object>|null>}
 */
async function getDdragonRunes(version) {
  if (!version) return null;
  const url = `${HOSTS.ddragon}/cdn/${version}/data/en_US/runesReforged.json`;
  try {
    return await getJson(url, { ttl: TTL.static });
  } catch (err) {
    return null;
  }
}

/**
 * `GET /perks.json` (Community Dragon) — every perk, including the stat
 * shards that the Data Dragon rune tree no longer carries.
 *
 * @returns {Promise<Array<object>>}
 */
async function getCommunityDragonPerks() {
  const payload = await getJson(`${HOSTS.communityDragon}/perks.json`, { ttl: TTL.static });
  return Array.isArray(payload) ? payload : [];
}

/* -------------------------------------------------------------------------- */
/* Desktop API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Best-effort read of the desktop hardware profile.
 *
 * The endpoint is not part of the critical path; failures are reported to the
 * caller rather than thrown.
 *
 * @returns {Promise<{ok:boolean, data?:*, error?:string}>}
 */
async function getHardwareProfile() {
  try {
    const payload = await getJson(`${HOSTS.desktop}/api/v1/hardware`, { ttl: TTL.patch });
    return { ok: true, data: payload };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Best-effort read of the desktop "game list" service.
 *
 * @returns {Promise<{ok:boolean, data?:*, error?:string}>}
 */
async function getDesktopGameList() {
  try {
    const payload = await getJson(`${HOSTS.desktop}/stat/game/list`, { ttl: TTL.patch });
    return { ok: true, data: payload };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/** Empty the in-memory cache (used by the "clear cache" affordance). */
function clearCache() {
  cache.clear();
}

module.exports = {
  HOSTS,
  TTL,
  TIMEOUT,
  TtlCache,
  cache,
  getJson,
  readLocalAsset,
  normaliseRegion,
  getChampionNames,
  getChampionMeta,
  getItemMeta,
  getRuneMeta,
  getRunePageMeta,
  getSummonerSpellMeta,
  getAugments,
  getGameVersions,
  getTierList,
  getChampionBuild,
  getArenaChampion,
  getLadder,
  getSummonerSummary,
  getSummonerGames,
  getMostChampions,
  getDdragonVersions,
  getLatestDdragonVersion,
  getDdragonChampion,
  getDdragonChampions,
  getDdragonItems,
  getDdragonRunes,
  getCommunityDragonPerks,
  getHardwareProfile,
  getDesktopGameList,
  clearCache,
};
