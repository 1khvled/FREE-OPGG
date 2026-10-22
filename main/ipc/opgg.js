/**
 * OP.GG data IPC handlers.
 *
 * Every handler answers with a plain object — never with an exception — so the
 * renderer never has to guard `ipcRenderer.invoke` with try/catch:
 *
 *   success -> `{ ok: true, ...payload }`
 *   failure -> `{ ok: false, error: '...' }`
 *
 * Upstream shapes are normalised here (see the comment above each handler for
 * the exact contract). Rates are always **0..1 ratios**, never percentages.
 */

'use strict';

const { RENDERER_TO_MAIN_INVOKE } = require('../../shared/channels.js');
const opgg = require('../services/opgg-client.js');

/**
 * OP.GG image CDN.
 *
 * The CDN publishes `/meta/images/lol/{version}/…` per release, but it lags
 * the Data Dragon version by a patch or two: a version-pinned champion path
 * answers 403 until the CDN catches up. The `latest` segment always resolves
 * to what the CDN has published, so every image URL uses it. The reference app
 * does the same for its live assets.
 */
const CDN_ROOT = 'https://opgg-static.akamaized.net/meta/images/lol';

/** Data Dragon CDN (used for the champion portraits). */
const DDRAGON_ROOT = 'https://ddragon.leagueoflegends.com/cdn';

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Coerce a value into a finite number.
 *
 * @param {*} value
 * @returns {number|null}
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Coerce a value into a 0..1 ratio.
 *
 * @param {*} value
 * @param {number} [fallback]
 * @returns {number}
 */
function toRatio(value, fallback = 0) {
  const num = toNumber(value);
  if (num === null) return fallback;
  return num;
}

/**
 * Tier number to label. `0` is the "OP" tier, `1` … `5` are "Tier 1" … "Tier 5".
 *
 * @param {*} tier
 * @returns {string|null}
 */
function tierLabel(tier) {
  const num = toNumber(tier);
  if (num === null) return null;
  if (num <= 0) return 'OP';
  return `Tier ${num}`;
}

/**
 * Rank movement since the previous patch. Positive = the champion moved up.
 *
 * @param {object} tierData
 * @returns {number}
 */
function rankChange(tierData) {
  if (!tierData) return 0;
  const rank = toNumber(tierData.rank);
  const prev = toNumber(tierData.rank_prev);
  if (rank === null || prev === null) return 0;
  return prev - rank;
}

/**
 * `major.minor` patch from a version string.
 *
 * @param {string|null} version
 * @returns {string|null}
 */
function toPatch(version) {
  if (!version) return null;
  const parts = String(version).split('.');
  if (parts.length < 2) return String(version);
  return `${parts[0]}.${parts[1]}`;
}

/**
 * Capitalise the first character (champion titles are lowercase upstream).
 *
 * @param {string} value
 * @returns {string}
 */
function capitalise(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Champion index                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a Data Dragon champion entry.
 *
 * The `id` / `key` fields are swapped between Data Dragon deployments, so the
 * numeric id is detected and the square key is taken from `image.full`.
 *
 * @param {object} entry
 * @returns {{id:number|null, key:string|null, name:string|null, title:string|null}}
 */
function normaliseDdragonChampion(entry) {
  if (!entry || typeof entry !== 'object') return { id: null, key: null, name: null, title: null };

  const imageKey = entry.image && entry.image.full
    ? String(entry.image.full).replace(/\.png$/i, '')
    : null;

  const rawId = toNumber(entry.id);
  const rawKey = toNumber(entry.key);

  let id = null;
  let key = imageKey;

  if (rawId !== null && rawKey === null) {
    id = rawId;
    key = key || String(entry.key);
  } else if (rawKey !== null && rawId === null) {
    id = rawKey;
    key = key || String(entry.id);
  } else if (rawId !== null) {
    id = rawId;
  }

  if (!key) key = String(entry.key || entry.id || '');
  return {
    id,
    key: key || null,
    name: entry.name || null,
    title: entry.title || null,
  };
}

/**
 * Build the champion index: id → { key, name, title, image urls }.
 *
 * @returns {Promise<object>}
 */
async function buildChampionIndex() {
  const ddragonVersion = await awaitSafeVersion();
  const [meta, names, ddragon, gameVersions] = await Promise.all([
    opgg.getChampionMeta().catch(() => []),
    opgg.getChampionNames().catch(() => []),
    opgg.getDdragonChampions(ddragonVersion).catch(() => null),
    opgg.getGameVersions().catch(() => []),
  ]);

  const version = ddragonVersion;
  const byId = new Map();
  const byKey = new Map();
  const nameById = new Map();

  for (const entry of names) {
    const id = toNumber(entry && entry.id);
    if (id !== null && entry.name) nameById.set(id, String(entry.name));
  }

  for (const entry of meta) {
    const id = toNumber(entry && entry.id);
    if (id === null) continue;
    byId.set(id, {
      id,
      key: entry.key ? String(entry.key) : null,
      name: entry.name ? String(entry.name) : (nameById.get(id) || null),
      title: entry.title ? String(entry.title) : null,
      blurb: entry.blurb ? String(entry.blurb) : '',
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
    });
  }

  if (ddragon && ddragon.data && typeof ddragon.data === 'object') {
    for (const raw of Object.values(ddragon.data)) {
      const entry = normaliseDdragonChampion(raw);
      if (entry.id === null) continue;
      const existing = byId.get(entry.id) || { id: entry.id, key: null, name: null, title: null, blurb: '', tags: [] };
      if (entry.key) existing.key = entry.key;
      if (entry.title) existing.title = entry.title;
      if (!existing.name && entry.name) existing.name = entry.name;
      byId.set(entry.id, existing);
    }
  }

  for (const entry of byId.values()) {
    if (!entry.name && nameById.has(entry.id)) entry.name = nameById.get(entry.id);
    if (entry.key) byKey.set(entry.key.toLowerCase(), entry);
  }

  return {
    version,
    patch: toPatch((gameVersions && gameVersions[0]) || version),
    byId,
    byKey,
    nameById,
  };
}

/** Cached Data Dragon version (resolved once). */
let ddragonVersionCache = null;

/**
 * Resolve (and memoise) the current Data Dragon version.
 *
 * @returns {Promise<string|null>}
 */
async function awaitSafeVersion() {
  if (ddragonVersionCache) return ddragonVersionCache;
  try {
    ddragonVersionCache = await opgg.getLatestDdragonVersion();
  } catch (err) {
    ddragonVersionCache = null;
  }
  return ddragonVersionCache;
}

/** Memoised champion index. */
let championIndex = null;
let championIndexPromise = null;
let championIndexStamp = 0;

/** The champion index is refreshed every 30 minutes. */
const CHAMPION_INDEX_TTL = 30 * 60 * 1000;

/**
 * Get the champion index (memoised).
 *
 * @returns {Promise<object>}
 */
async function getChampionIndex() {
  if (championIndex && Date.now() - championIndexStamp < CHAMPION_INDEX_TTL) {
    return championIndex;
  }
  if (!championIndexPromise) {
    championIndexPromise = buildChampionIndex()
      .then((value) => {
        championIndex = value;
        championIndexStamp = Date.now();
        return value;
      })
      .finally(() => {
        championIndexPromise = null;
      });
  }
  return championIndexPromise;
}

/* -------------------------------------------------------------------------- */
/* CDN urls                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Champion square icon.
 *
 * @param {string|null} version
 * @param {string|null} key
 * @returns {string|null}
 */
function championSquareUrl(version, key) {
  if (!version || !key) return null;
  return `${CDN_ROOT}/latest/champion/${key}.png`;
}

/**
 * Champion portrait (Data Dragon square, the only portrait the CDN serves).
 *
 * @param {string|null} version
 * @param {string|null} key
 * @returns {string|null}
 */
function championPortraitUrl(version, key) {
  if (!version || !key) return null;
  // Data Dragon's champion path answers 403 from the desktop shell, so the
  // replica uses OP.GG's own version-pinned mirror, which is what the
  // reference app loads.
  return `${CDN_ROOT}/latest/champion/${key}.png`;
}

/**
 * Perk (rune) icon.
 *
 * @param {string|null} version
 * @param {number|string} id
 * @returns {string|null}
 */
function perkUrl(version, id) {
  if (!version || id === null || id === undefined) return null;
  return `${CDN_ROOT}/latest/perk/${id}.png`;
}

/**
 * Rune tree (perk style) icon.
 *
 * @param {string|null} version
 * @param {number|string} id
 * @returns {string|null}
 */
function perkStyleUrl(version, id) {
  if (!version || id === null || id === undefined) return null;
  return `${CDN_ROOT}/latest/perkStyle/${id}.png`;
}

/**
 * Stat shard icon.
 *
 * @param {string|null} version
 * @param {number|string} id
 * @returns {string|null}
 */
function shardUrl(version, id) {
  if (!version || id === null || id === undefined) return null;
  return `${CDN_ROOT}/latest/perkShard/${id}.png`;
}

/**
 * Item icon.
 *
 * @param {string|null} version
 * @param {number|string} id
 * @returns {string|null}
 */
function itemUrl(version, id) {
  if (!version || id === null || id === undefined) return null;
  return `${CDN_ROOT}/latest/item/${id}.png`;
}

/**
 * Summoner / ability spell icon.
 *
 * @param {string|null} version
 * @param {string|null} file
 * @returns {string|null}
 */
function spellUrl(version, file) {
  if (!version || !file) return null;
  return `${CDN_ROOT}/latest/spell/${file}`;
}

/**
 * Passive ability icon (the CDN keeps passives in their own folder).
 *
 * @param {string|null} version
 * @param {string|null} file
 * @returns {string|null}
 */
function passiveUrl(version, file) {
  if (!version || !file) return null;
  return `${CDN_ROOT}/latest/passive/${file}`;
}

/* -------------------------------------------------------------------------- */
/* Row normalisation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The lane the champion is most played in.
 *
 * @param {Array<object>} positions
 * @returns {object|null}
 */
function pickPrimaryPosition(positions) {
  if (!Array.isArray(positions) || !positions.length) return null;
  let best = null;
  let bestRate = -1;
  for (const position of positions) {
    const rate = toRatio(position && position.stats && position.stats.role_rate, -1);
    if (rate > bestRate) {
      bestRate = rate;
      best = position;
    }
  }
  return best;
}

/**
 * Per-kind URL builders for the Data Dragon rune tree.
 */
let ddragonRuneLookup = null;
let ddragonRuneLookupStamp = 0;

/**
 * Build a rune lookup from the Data Dragon rune tree.
 *
 * The OP.GG rune metadata does not contain the stat shards, so the Data Dragon
 * tree is used to resolve their names.
 *
 * @param {string|null} version
 * @returns {Promise<Map<number, {name:string, key:string, shortDesc:string}>>}
 */
async function getDdragonRuneLookup(version) {
  if (ddragonRuneLookup && Date.now() - ddragonRuneLookupStamp < CHAMPION_INDEX_TTL) {
    return ddragonRuneLookup;
  }
  const lookup = new Map();
  const remember = (id, name, key, shortDesc) => {
    const numeric = toNumber(id);
    if (numeric === null || !name) return;
    if (lookup.has(numeric)) return;
    lookup.set(numeric, { name: String(name), key: key ? String(key) : null, shortDesc: shortDesc ? String(shortDesc) : null });
  };

  try {
    const tree = await opgg.getDdragonRunes(version);
    if (Array.isArray(tree)) {
      for (const style of tree) {
        for (const slot of style.slots || []) {
          for (const rune of slot.runes || []) {
            remember(rune.id, rune.name, rune.key, rune.shortDesc);
          }
        }
      }
    }
  } catch (err) {
    // The Data Dragon tree is optional.
  }

  // The stat shards only live in the Community Dragon perk list.
  try {
    const perks = await opgg.getCommunityDragonPerks();
    for (const perk of perks) {
      remember(perk.id, perk.name, perk.key, perk.shortDesc);
    }
  } catch (err) {
    // The lookup stays partially filled — the shards simply have no name.
  }

  ddragonRuneLookup = lookup;
  ddragonRuneLookupStamp = Date.now();
  return lookup;
}

/**
 * Normalise one counter entry.
 *
 * @param {object} entry
 * @param {object} index
 * @returns {{id:number|null, name:string|null, key:string|null, winRate:number}}
 */
function buildCounter(entry, index) {
  const id = toNumber(entry && (entry.champion_id !== undefined ? entry.champion_id : entry.championId));
  const play = toNumber(entry && entry.play) || 0;
  const win = toNumber(entry && entry.win) || 0;
  const meta = id !== null ? index.byId.get(id) : null;

  return {
    id,
    name: id !== null ? (index.nameById.get(id) || (meta && meta.name) || null) : null,
    key: meta && meta.key ? meta.key : null,
    winRate: play > 0 ? win / play : 0,
  };
}

/**
 * Normalise one champion tier-list row.
 *
 * @param {object} entry - raw upstream entry
 * @param {object} ctx - `{ index, position }`
 * @returns {object}
 */
function buildRow(entry, ctx) {
  const { index } = ctx;
  const positionFilter = ctx.position ? String(ctx.position).toUpperCase() : null;

  const id = toNumber(entry && entry.id);
  const meta = id !== null ? index.byId.get(id) : null;

  const positions = Array.isArray(entry.positions) ? entry.positions : [];
  const selected = positionFilter
    ? positions.find((p) => String(p.name || '').toUpperCase() === positionFilter) || null
    : null;
  const primary = pickPrimaryPosition(positions);

  const stats = (selected && selected.stats) || entry.average_stats || {};
  const tierData = stats.tier_data || (entry.average_stats && entry.average_stats.tier_data) || {};

  const rawTierNumber = toNumber(tierData.tier) !== null
    ? toNumber(tierData.tier)
    : (toNumber(stats.tier) !== null ? toNumber(stats.tier) : toNumber(entry.average_stats && entry.average_stats.tier));

  const rank = toNumber(tierData.rank) !== null
    ? toNumber(tierData.rank)
    : toNumber(entry.average_stats && entry.average_stats.rank);

  // The upstream tier list has no tier 0: the reference promotes the very top
  // of Tier 1 to "OP", which is the tier the "OP champions" screen lists.
  const tierNumber = (rawTierNumber === 1 && rank !== null && rank > 0 && rank <= 3)
    ? 0
    : rawTierNumber;

  const roleSource = selected ? selected.roles : (entry.roles && entry.roles.length ? entry.roles : (primary && primary.roles) || []);
  const roles = (Array.isArray(roleSource) ? roleSource : [])
    .map((role) => (role && role.name ? String(role.name) : null))
    .filter(Boolean);

  const counterSource = selected
    ? (selected.counters || [])
    : ((primary && primary.counters) || (entry.counters || []));

  const counters = (Array.isArray(counterSource) ? counterSource : [])
    .map((counter) => buildCounter(counter, index))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 3);

  const key = meta && meta.key ? meta.key : null;

  return {
    id,
    key,
    name: meta && meta.name ? meta.name : (index.nameById.get(id) || null),
    title: meta && meta.title ? capitalise(meta.title) : null,
    squareImageUrl: championSquareUrl(index.version, key),
    imageUrl: championPortraitUrl(index.version, key),
    tier: tierLabel(tierNumber),
    tierRank: rank,
    winRate: toRatio(stats.win_rate),
    pickRate: toRatio(stats.pick_rate),
    banRate: toRatio(stats.ban_rate),
    matches: toNumber(stats.play) || 0,
    kda: toNumber(stats.kda),
    roles,
    rank,
    rankChange: rankChange(tierData),
    counters,
    // The arena and ARAM modes report counts rather than rates (`win`,
    // `play`, `total_place`, `first_place`). Forward the raw statistics so a
    // page can derive the rates the reference derives.
    averageStats: {
      win: toNumber(average.win),
      play: toNumber(average.play),
      totalPlace: toNumber(average.total_place),
      firstPlace: toNumber(average.first_place),
      winRate: toRatio(average.win_rate),
      pickRate: toRatio(average.pick_rate),
      banRate: toRatio(average.ban_rate),
      kda: toRatio(average.kda),
    },
    /** Retired / "Ultimate Spellbook" variants are flagged by the API. */
    isRip: Boolean(entry.is_rip),
    isRotation: Boolean(entry.is_rotation),
    positions: positions.map((position) => ({
      name: position.name ? String(position.name) : null,
      winRate: toRatio(position.stats && position.stats.win_rate),
      pickRate: toRatio(position.stats && position.stats.pick_rate),
      banRate: toRatio(position.stats && position.stats.ban_rate),
      roleRate: toRatio(position.stats && position.stats.role_rate),
      matches: toNumber(position.stats && position.stats.play) || 0,
      tier: tierLabel(position.stats && position.stats.tier_data && position.stats.tier_data.tier),
      rank: toNumber(position.stats && position.stats.tier_data && position.stats.tier_data.rank),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Summoner normalisation                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a ladder entry's summoner object.
 *
 * @param {object} summoner
 * @param {object} [index]
 * @returns {object}
 */
function buildSummoner(summoner, index) {
  if (!summoner || typeof summoner !== 'object') return null;

  const leagueStats = Array.isArray(summoner.league_stats) ? summoner.league_stats : [];
  const ranked = leagueStats.find((entry) => entry && entry.game_type === 'SOLORANKED')
    || leagueStats.find((entry) => entry && entry.game_type === 'RANKED')
    || leagueStats[0]
    || null;
  const tierInfo = (ranked && ranked.tier_info) || null;

  const id = toNumber(summoner.id);

  return {
    id,
    puuid: summoner.puuid ? String(summoner.puuid) : null,
    gameName: summoner.game_name ? String(summoner.game_name) : null,
    tagline: summoner.tagline ? String(summoner.tagline) : null,
    name: summoner.name ? String(summoner.name) : null,
    level: toNumber(summoner.level),
    profileImageUrl: summoner.profile_image_url ? String(summoner.profile_image_url) : null,
    tier: tierInfo && tierInfo.tier ? String(tierInfo.tier) : null,
    tierDivision: tierInfo ? toNumber(tierInfo.division) : null,
    lp: tierInfo ? toNumber(tierInfo.lp) : null,
    tierImageUrl: tierInfo && tierInfo.tier_image_url ? String(tierInfo.tier_image_url) : null,
    win: ranked ? toNumber(ranked.win) : null,
    lose: ranked ? toNumber(ranked.lose) : null,
    isHotStreak: ranked ? Boolean(ranked.is_hot_streak) : false,
    mostChampions: Array.isArray(summoner.most_champions && summoner.most_champions.champion_stats)
      ? summoner.most_champions.champion_stats.map((entry) => {
        const championId = toNumber(entry.id);
        const meta = index && index.byId.get(championId);
        const kills = toNumber(entry.kill) || 0;
        const deaths = toNumber(entry.death) || 0;
        const assists = toNumber(entry.assist) || 0;
        return {
          championId,
          championName: meta ? meta.name : null,
          championKey: meta ? meta.key : null,
          play: toNumber(entry.play) || 0,
          win: toNumber(entry.win) || 0,
          lose: toNumber(entry.lose) || 0,
          kda: toNumber(entry.kda) !== null
            ? toNumber(entry.kda)
            : (kills + assists) / Math.max(1, deaths),
        };
      })
      : [],
  };
}

/**
 * Normalise one match-history entry.
 *
 * @param {object} game
 * @param {object} index
 * @param {string|null} puuid
 * @returns {object}
 */
function buildMatch(game, index, puuid) {
  const participants = Array.isArray(game.participants) ? game.participants : [];
  const participant = (puuid && participants.find((p) => p && p.summoner && p.summoner.puuid === puuid))
    || participants[0]
    || null;

  const stats = (participant && participant.stats) || {};
  const championId = toNumber(participant && participant.champion_id);
  const championMeta = championId !== null ? index.byId.get(championId) : null;

  const kills = toNumber(stats.kill) || 0;
  const deaths = toNumber(stats.death) || 0;
  const assists = toNumber(stats.assist) || 0;

  return {
    id: game.id ? String(game.id) : null,
    createdAt: game.created_at ? String(game.created_at) : null,
    gameType: game.game_type ? String(game.game_type) : null,
    queueId: toNumber(game.queue_id),
    mapId: game.game_map ? String(game.game_map) : null,
    version: game.meta_version ? String(game.meta_version) : null,
    duration: toNumber(game.game_length_second),
    win: stats.result ? String(stats.result).toUpperCase() === 'WIN' : null,
    championId,
    championName: championMeta ? championMeta.name : null,
    championKey: championMeta ? championMeta.key : null,
    position: participant && participant.position ? String(participant.position) : null,
    role: participant && participant.role ? String(participant.role) : null,
    kills,
    deaths,
    assists,
    kda: (kills + assists) / Math.max(1, deaths),
    score: toRatio(stats.op_score),
    cs: toNumber(stats.minion_kill) || 0,
    goldEarned: toNumber(stats.gold_earned) || 0,
    visionScore: toNumber(stats.vision_score),
    items: Array.isArray(participant && participant.items) ? participant.items.map(Number) : [],
    trinketItem: toNumber(participant && participant.trinket_item),
    spells: Array.isArray(participant && participant.spells) ? participant.spells.map(Number) : [],
    averageTier: game.average_tier_info && game.average_tier_info.tier
      ? String(game.average_tier_info.tier)
      : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Summoner spell catalogue                                                    */
/* -------------------------------------------------------------------------- */

let spellCatalogue = null;
let spellCatalogueStamp = 0;
let spellCataloguePromise = null;
const SPELL_CATALOGUE_TTL = 6 * 60 * 60 * 1000;

/**
 * The summoner spell catalogue, cached for six hours.
 *
 * @returns {Promise<Map<number, {id:number,key:string,name:string,imageUrl:string}>>}
 */
async function getSpellCatalogue() {
  if (spellCatalogue && Date.now() - spellCatalogueStamp < SPELL_CATALOGUE_TTL) {
    return spellCatalogue;
  }
  if (!spellCataloguePromise) {
    spellCataloguePromise = opgg.getSummonerSpellMeta()
      .then((entries) => {
        const byId = new Map();
        const version = championIndex ? championIndex.version : null;
        for (const entry of Array.isArray(entries) ? entries : []) {
          const id = toNumber(entry && entry.id);
          if (id === null) continue;
          byId.set(id, {
            id,
            key: entry.key ? String(entry.key) : null,
            name: entry.name ? String(entry.name) : null,
            imageUrl: entry.image_url ? String(entry.image_url) : spellUrl(version, `${entry.key}.png`),
          });
        }
        spellCatalogue = byId;
        spellCatalogueStamp = Date.now();
        return byId;
      })
      .catch(() => new Map())
      .finally(() => {
        spellCataloguePromise = null;
      });
  }
  return spellCataloguePromise;
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `opgg:champions` — the champion tier list.
 *
 * PAYLOAD
 *   { mode?: 'ranked'|'aram'|'arena', tier?: string, region?: string, position?: string|null }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     patch: '16.20',                    // meta.version of the upstream payload
 *     updatedAt: '2026-10-21T00:42:22+09:00', // meta.analyzed_at
 *     rows: [{
 *       id: 86,                          // numeric champion id
 *       key: 'Ezreal',                   // Data Dragon square name
 *       name: 'Ezreal',
 *       title: 'The Prodigal Explorer',
 *       squareImageUrl: 'https://opgg-static.akamaized.net/meta/images/lol/16.20.1/champion/Ezreal.png',
 *       imageUrl: 'https://opgg-static.akamaized.net/meta/images/lol/16.20.1/champion/Ezreal.png',
 *       tier: 'Tier 1',                  // 'OP' | 'Tier 1' … 'Tier 5'
 *       tierRank: 6,                     // rank of the row in the current view
 *       winRate: 0.506251,               // 0..1
 *       pickRate: 0.0615279,             // 0..1
 *       banRate: 0.0445094,              // 0..1 (0 when the mode has no bans)
 *       matches: 150925,                 // games played
 *       kda: 1.792694,                   // null when the mode has no KDA
 *       roles: ['FIGHTER'],              // sub roles, most played first
 *       rank: 6,                         // same as tierRank
 *       rankChange: -1,                  // positive = the champion moved up
 *       counters: [{ id: 11, name: 'Kalista', key: 'Kalista', winRate: 0.4583 }],
 *       positions: [{ name: 'TOP', winRate, pickRate, banRate, roleRate, matches, tier, rank }]
 *     }]
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleChampions(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const mode = String(args.mode || 'ranked').toLowerCase();
  const tier = String(args.tier || 'emerald_plus').toLowerCase();
  const region = String(args.region || 'GLOBAL').toUpperCase();
  const position = args.position && String(args.position).toUpperCase() !== 'ALL'
    ? String(args.position).toUpperCase()
    : null;

  const index = await getChampionIndex();
  const { rows, meta, cached } = await opgg.getTierList({ mode, tier, region });

  const normalised = (Array.isArray(rows) ? rows : [])
    // The arena list carries 77 retired "Ultimate Spellbook" variants
    // (`is_rip`, id >= 60000) with no games and duplicate names — the
    // reference drops them.
    .filter((entry) => !(entry && entry.is_rip))
    .map((entry) => buildRow(entry, { index, position }));

  return {
    ok: true,
    patch: (meta && meta.version) || index.patch,
    updatedAt: (meta && (meta.analyzed_at || meta.cached_at)) || new Date().toISOString(),
    mode,
    tier,
    region,
    cached: Boolean(cached),
    rows: normalised,
  };
}

/**
 * `opgg:mode-tierlist` — the ARAM / Arena tier list.
 *
 * PAYLOAD
 *   { mode?: 'aram'|'arena' }
 *
 * RESPONSE
 *   { ok: true, mode: 'aram', patch: '16.20', updatedAt: '<iso>', rows: [ <champion row> ] }
 *
 * The row shape is identical to `opgg:champions`.
 */
async function handleModeTierList(payload) {
  // The mode may arrive as a bare string (`'arena'`) or wrapped in an object
  // (`{ mode: 'arena' }`).
  const raw = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload.mode
    : payload;
  const rawMode = String(raw || 'aram').toLowerCase();
  const mode = (rawMode === 'arena' || rawMode === 'mayhem') ? 'arena' : 'aram';

  const index = await getChampionIndex();
  const { rows, meta, cached } = await opgg.getTierList({ mode, tier: 'all', region: 'GLOBAL' });

  return {
    ok: true,
    mode,
    patch: (meta && meta.version) || index.patch,
    updatedAt: (meta && (meta.analyzed_at || meta.cached_at)) || new Date().toISOString(),
    cached: Boolean(cached),
    rows: (Array.isArray(rows) ? rows : [])
      .filter((entry) => !(entry && entry.is_rip))
      .map((entry) => buildRow(entry, { index, position: null })),
  };
}

/**
 * `opgg:champion-detail` — one champion's build, runes, skills and counters.
 *
 * PAYLOAD
 *   { champId: number, position?: 'top'|'jungle'|'mid'|'adc'|'support', tier?: string, mode?: string }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     champion: { id, key, name, title, imageUrl, squareImageUrl },
 *     stats: { tier, tierRank, winRate, pickRate, banRate, matches, kda, rank, rankChange },
 *     runes: {
 *       primary:   { id, styleId, styleName, perks: [{ id, name, imageUrl }] },
 *       secondary: { id, styleId, styleName, perks: [{ id, name, imageUrl }] },
 *       shards:    [{ id, name, imageUrl, value }]
 *     },
 *     build: {
 *       starterItems:    [{ ids: [1054, 2003], items: [{ id, name, imageUrl }], pickRate, play, win }],
 *       coreItems:       [ ... same shape ... ],
 *       boots:           [ ... same shape ... ],
 *       situationalItems:[ ... same shape ... ]
 *     },
 *     skills: [{ key: 'Q', name: 'Mystic Shot', description: '…', imageUrl: '…' }],
 *     skillOrders: [{ order: ['Q','W','E',…], pickRate, play }],
 *     counters: {
 *       strong: [{ id, name, key, winRate }], // opponents we counter the most
 *       weak:   [{ id, name, key, winRate }]  // opponents that counter us
 *     }
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleChampionDetail(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const champId = toNumber(args.champId !== undefined ? args.champId : args.championId);
  if (champId === null) return { ok: false, error: 'champId is required' };

  const position = String(args.position || 'top').toLowerCase();
  const tier = String(args.tier || 'all').toLowerCase();
  const mode = String(args.mode || 'ranked').toLowerCase();

  const index = await getChampionIndex();
  const meta = index.byId.get(champId) || null;

  const buildPayload = await opgg.getChampionBuild({ champId, mode, position, tier });
  let data = buildPayload.data || {};

  // The arena build endpoint (`/champions/arena/{id}/none`) answers 422; the
  // augment pairing lives on the champion endpoint (`/champions/arena/{id}`).
  // Fetch it alongside the build so the ARAM: Mayhem screen has its data.
  let arenaData = null;
  if (mode === 'arena' || mode === 'mayhem') {
    arenaData = await opgg.getArenaChampion(champId).catch(() => null);
    if (arenaData && arenaData.data && Object.keys(arenaData.data).length) {
      data = { ...data, ...arenaData.data };
    }
  }

  const summary = data.summary || {};
  const average = summary.average_stats || {};
  const positions = Array.isArray(summary.positions) ? summary.positions : [];

  const selected = positions.find(
    (entry) => String(entry.name || '').toUpperCase() === position.toUpperCase(),
  ) || null;
  const primary = pickPrimaryPosition(positions);
  const lane = selected || primary;

  const stats = (lane && lane.stats) || average;
  const tierData = stats.tier_data || (average && average.tier_data) || {};
  const tierNumber = toNumber(tierData.tier) !== null
    ? toNumber(tierData.tier)
    : (toNumber(stats.tier) !== null ? toNumber(stats.tier) : toNumber(average.tier));

  /* ---------------------------------------------------------------- runes */
  const runeSet = (Array.isArray(data.runes) && data.runes[0])
    || (Array.isArray(data.rune_pages) && data.rune_pages[0]
      && Array.isArray(data.rune_pages[0].builds) && data.rune_pages[0].builds[0])
    || null;

  const runeMeta = await opgg.getRuneMeta().catch(() => []);
  const runeById = new Map();
  for (const rune of runeMeta) {
    const id = toNumber(rune.id);
    if (id !== null) runeById.set(id, rune);
  }
  const ddragonRunes = await getDdragonRuneLookup(index.version);
  const styleMeta = await opgg.getRunePageMeta().catch(() => []);
  const styleById = new Map();
  for (const style of styleMeta) {
    const id = toNumber(style.id);
    if (id !== null) styleById.set(id, style);
  }

  const perkEntry = (id) => {
    const rune = runeById.get(toNumber(id));
    const ddragon = ddragonRunes.get(toNumber(id));
    return {
      id: toNumber(id),
      name: rune ? String(rune.name) : (ddragon && ddragon.name ? ddragon.name : null),
      imageUrl: rune && rune.image_url
        ? String(rune.image_url)
        : perkUrl(index.version, id),
    };
  };

  const styleEntry = (id) => {
    const style = styleById.get(toNumber(id));
    return {
      id: toNumber(id),
      styleId: toNumber(id),
      styleName: style ? String(style.name) : null,
      imageUrl: style && style.image_url
        ? String(style.image_url)
        : perkStyleUrl(index.version, id),
    };
  };

  const primaryIds = runeSet && Array.isArray(runeSet.primary_rune_ids) ? runeSet.primary_rune_ids : [];
  const secondaryIds = runeSet && Array.isArray(runeSet.secondary_rune_ids) ? runeSet.secondary_rune_ids : [];
  const shardIds = runeSet && Array.isArray(runeSet.stat_mod_ids) ? runeSet.stat_mod_ids : [];

  const shardCounts = new Map();
  for (const id of shardIds) {
    const key = String(id);
    shardCounts.set(key, (shardCounts.get(key) || 0) + 1);
  }

  const runes = {
    primary: runeSet
      ? {
        ...styleEntry(runeSet.primary_page_id),
        perks: primaryIds.map(perkEntry),
      }
      : null,
    secondary: runeSet
      ? {
        ...styleEntry(runeSet.secondary_page_id),
        perks: secondaryIds.map(perkEntry),
      }
      : null,
    shards: Array.from(shardCounts.entries()).map(([id, value]) => ({
      ...perkEntry(id),
      imageUrl: shardUrl(index.version, id) || perkEntry(id).imageUrl,
      value,
    })),
  };

  /* ---------------------------------------------------------------- build */
  const itemMeta = await opgg.getItemMeta().catch(() => []);
  const itemById = new Map();
  for (const item of itemMeta) {
    const id = toNumber(item.id);
    if (id !== null) itemById.set(id, item);
  }

  const buildPaths = (list, limit = 8) => (Array.isArray(list) ? list : []).slice(0, limit).map((entry) => {
    const ids = (Array.isArray(entry.ids) ? entry.ids : []).map((id) => toNumber(id)).filter((id) => id !== null);
    return {
      ids,
      items: ids.map((id) => {
        const item = itemById.get(id);
        return {
          id,
          name: item && item.name ? String(item.name) : null,
          imageUrl: item && item.image_url ? String(item.image_url) : itemUrl(index.version, id),
        };
      }),
      pickRate: toRatio(entry.pick_rate),
      play: toNumber(entry.play) || 0,
      win: toNumber(entry.win) || 0,
    };
  });

  const build = {
    starterItems: buildPaths(data.starter_items, 5),
    coreItems: buildPaths(data.core_items, 8),
    boots: buildPaths(data.boots, 5),
    situationalItems: buildPaths(data.last_items, 8),
  };

  /* --------------------------------------------------------------- skills */
  const ddragonPayload = await opgg.getDdragonChampion(index.version, meta && meta.key).catch(() => null);
  const ddragonChampion = ddragonPayload && ddragonPayload.data && typeof ddragonPayload.data === 'object'
    ? (ddragonPayload.data[(meta && meta.key) || ''] || Object.values(ddragonPayload.data)[0] || null)
    : ddragonPayload;

  const skills = [];
  if (ddragonChampion) {
    const passive = ddragonChampion.passive;
    if (passive) {
      skills.push({
        key: 'P',
        name: passive.name ? String(passive.name) : null,
        description: passive.description ? String(passive.description) : null,
        imageUrl: passive.image && passive.image.full
          ? passiveUrl(index.version, passive.image.full)
          : null,
      });
    }
    const abilityKeys = ['Q', 'W', 'E', 'R'];
    const spells = Array.isArray(ddragonChampion.spells) ? ddragonChampion.spells : [];
    spells.forEach((spell, index2) => {
      skills.push({
        key: abilityKeys[index2] || String(index2 + 1),
        name: spell.name ? String(spell.name) : null,
        description: spell.description ? String(spell.description) : null,
        imageUrl: spell.image && spell.image.full ? spellUrl(index.version, spell.image.full) : null,
      });
    });
  }

  const skillOrders = (Array.isArray(data.skills) ? data.skills : []).slice(0, 5).map((entry) => ({
    order: Array.isArray(entry.order) ? entry.order.map(String) : [],
    pickRate: toRatio(entry.pick_rate),
    play: toNumber(entry.play) || 0,
    win: toNumber(entry.win) || 0,
  }));

  /* ------------------------------------------------------- summoner spells */
  // The endpoint only carries the spell ids; the names and icons come from
  // the summoner spell catalogue.
  const catalogue = await getSpellCatalogue();
  const summonerSpells = (Array.isArray(data.summoner_spells) ? data.summoner_spells : [])
    .slice(0, 5)
    .map((entry) => {
      const ids = Array.isArray(entry.ids) ? entry.ids.map((id) => toNumber(id)).filter((id) => id !== null) : [];
      if (!ids.length) return null;
      return {
        ids,
        spells: ids.map((id) => {
          const spell = catalogue.get(id) || null;
          return {
            id,
            name: spell ? spell.name : null,
            imageUrl: spell ? spell.imageUrl : null,
          };
        }),
        pickRate: toRatio(entry.pick_rate),
        play: toNumber(entry.play) || 0,
        win: toNumber(entry.win) || 0,
      };
    })
    .filter(Boolean);

  /* ------------------------------------------------------------- counters */
  // The lane list holds the opponents that counter the champion hardest
  // (sorted by our win rate); the full list holds every opponent we face.
  const laneCounters = (lane && Array.isArray(lane.counters)) ? lane.counters : [];
  const allCounters = Array.isArray(data.counters) ? data.counters : [];
  const weakSource = laneCounters.length ? laneCounters : allCounters;

  const weak = weakSource.map((entry) => buildCounter(entry, index))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 10);

  const strong = (allCounters.length ? allCounters : laneCounters)
    .map((entry) => buildCounter(entry, index))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 10);

  const counters = { strong, weak };

  const key = meta && meta.key ? meta.key : null;

  return {
    ok: true,
    mode,
    position,
    patch: (buildPayload.meta && buildPayload.meta.version) || index.patch,
    updatedAt: (buildPayload.meta && (buildPayload.meta.analyzed_at || buildPayload.meta.cached_at)) || new Date().toISOString(),
    champion: {
      id: champId,
      key,
      name: meta ? meta.name : null,
      title: meta && meta.title ? capitalise(meta.title) : null,
      imageUrl: championPortraitUrl(index.version, key),
      squareImageUrl: championSquareUrl(index.version, key),
    },
    stats: {
      tier: tierLabel(tierNumber),
      tierRank: toNumber(tierData.rank) !== null ? toNumber(tierData.rank) : toNumber(average.rank),
      winRate: toRatio(stats.win_rate),
      pickRate: toRatio(stats.pick_rate),
      banRate: toRatio(stats.ban_rate),
      matches: toNumber(stats.play) || 0,
      kda: toNumber(stats.kda),
      rank: toNumber(average.rank),
      rankChange: rankChange(tierData),
    },
    runes,
    build,
    skills,
    skillOrders,
    summonerSpells,
    counters,
    // The augment pairing the ARAM: Mayhem screen needs. It only exists on
    // the arena champion endpoint, so it is absent for every other mode.
    augmentGroup: Array.isArray(data.augment_group) ? data.augment_group : [],
    prismItems: Array.isArray(data.prism_items) ? data.prism_items : [],
    synergies: Array.isArray(data.synergies) ? data.synergies : [],
  };
}

/**
 * `opgg:static-data` — the static metadata bundle.
 *
 * PAYLOAD
 *   (none)
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     patch: '16.20',
 *     version: '16.20.1',
 *     updatedAt: '<iso>',
 *     champions: [{ id, key, name, title, squareImageUrl, imageUrl, blurb, tags }],
 *     championNames: [{ id, name }],
 *     items: [{ id, name, imageUrl, gold: { total, sell, base }, plaintext, description }],
 *     runes: [{ id, pageId, key, name, shortDesc, longDesc, imageUrl }],
 *     runePages: [{ id, name, description, slogan, imageUrl }],
 *     summonerSpells: [{ id, key, name, description, imageUrl }],
 *     augments: [{ id, name, key, rarity, description, iconUrl, smallIconUrl }]
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleStaticData() {
  const index = await getChampionIndex();
  const version = index.version || await awaitSafeVersion();

  const [items, runes, runePages, spells, augments, ddragonItems] = await Promise.all([
    opgg.getItemMeta().catch(() => []),
    opgg.getRuneMeta().catch(() => []),
    opgg.getRunePageMeta().catch(() => []),
    opgg.getSummonerSpellMeta().catch(() => []),
    opgg.getAugments('augments').catch(() => []),
    opgg.getDdragonItems(version).catch(() => null),
  ]);

  const ddragonItemById = new Map();
  if (ddragonItems && ddragonItems.data) {
    for (const [id, entry] of Object.entries(ddragonItems.data)) {
      ddragonItemById.set(Number(id), entry);
    }
  }

  const champions = [];
  for (const entry of index.byId.values()) {
    champions.push({
      id: entry.id,
      key: entry.key,
      name: entry.name,
      title: entry.title ? capitalise(entry.title) : null,
      squareImageUrl: championSquareUrl(version, entry.key),
      imageUrl: championPortraitUrl(version, entry.key),
      blurb: entry.blurb || '',
      tags: entry.tags || [],
    });
  }
  champions.sort((a, b) => a.id - b.id);

  const championNames = [];
  for (const entry of index.byId.values()) {
    championNames.push({ id: entry.id, name: entry.name });
  }

  const normalisedItems = items.map((item) => {
    const id = toNumber(item.id);
    const ddragon = ddragonItemById.get(id);
    return {
      id,
      name: item.name ? String(item.name) : (ddragon && ddragon.name ? String(ddragon.name) : null),
      imageUrl: item.image_url
        ? String(item.image_url)
        : (ddragon && ddragon.image && ddragon.image.full
          ? itemUrl(version, id)
          : null),
      gold: item.gold && typeof item.gold === 'object'
        ? {
          total: toNumber(item.gold.total) || 0,
          sell: toNumber(item.gold.sell) || 0,
          base: toNumber(item.gold.base) || 0,
        }
        : null,
      plaintext: item.plaintext ? String(item.plaintext) : null,
      description: item.description ? String(item.description) : null,
      isMythic: Boolean(item.is_mythic),
    };
  });

  const normalisedRunes = runes.map((rune) => ({
    id: toNumber(rune.id),
    pageId: toNumber(rune.page_id),
    key: rune.key ? String(rune.key) : null,
    name: rune.name ? String(rune.name) : null,
    shortDesc: rune.short_desc ? String(rune.short_desc) : null,
    longDesc: rune.long_desc ? String(rune.long_desc) : null,
    imageUrl: rune.image_url ? String(rune.image_url) : perkUrl(version, rune.id),
  }));

  const normalisedPages = runePages.map((page) => ({
    id: toNumber(page.id),
    name: page.name ? String(page.name) : null,
    description: page.description ? String(page.description) : null,
    slogan: page.slogan ? String(page.slogan) : null,
    imageUrl: page.image_url ? String(page.image_url) : perkStyleUrl(version, page.id),
  }));

  const normalisedSpells = spells.map((spell) => ({
    id: toNumber(spell.id),
    key: spell.key ? String(spell.key) : null,
    name: spell.name ? String(spell.name) : null,
    description: spell.description ? String(spell.description) : null,
    imageUrl: spell.image_url ? String(spell.image_url) : spellUrl(version, `${spell.key}.png`),
  }));

  const normalisedAugments = augments.map((augment) => ({
    id: toNumber(augment.id),
    name: augment.name ? String(augment.name) : null,
    key: augment.key ? String(augment.key) : null,
    rarity: toNumber(augment.rarity),
    description: augment.desc ? String(augment.desc) : null,
    tooltip: augment.tooltip ? String(augment.tooltip) : null,
    iconUrl: augment.largeIcon ? String(augment.largeIcon) : null,
    smallIconUrl: augment.smallIcon ? String(augment.smallIcon) : null,
  }));

  return {
    ok: true,
    patch: index.patch,
    version,
    updatedAt: new Date().toISOString(),
    champions,
    championNames,
    items: normalisedItems,
    runes: normalisedRunes,
    runePages: normalisedPages,
    summonerSpells: normalisedSpells,
    augments: normalisedAugments,
  };
}

/**
 * `opgg:multi-search` — look up several summoners at once.
 *
 * PAYLOAD
 *   { query: string, region?: string }
 *
 * The query may contain several names separated by newlines or commas; the
 * "joined the lobby" suffix used by the League client is stripped.
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     query: '…',
 *     region: 'kr',
 *     results: [{
 *       query: 'Hide',
 *       found: true,
 *       summoner: {
 *         id, puuid, gameName, tagline, name, level, profileImageUrl,
 *         tier, tierDivision, lp, tierImageUrl, win, lose, isHotStreak, mostChampions
 *       },
 *       error: null
 *     }]
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleMultiSearch(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const query = typeof args.query === 'string' ? args.query : '';
  const region = opgg.normaliseRegion(args.region || 'kr');

  const names = parseSearchNames(query).slice(0, 5);
  if (!names.length) {
    return { ok: true, query, region, results: [] };
  }

  const index = await getChampionIndex();
  const results = [];

  for (const name of names) {
    const entry = { query: name, found: false, summoner: null, error: null };
    try {
      const resolved = await resolveSummoner(name, region);
      if (!resolved) {
        entry.error = 'Summoner not found';
      } else {
        entry.found = true;
        entry.summoner = buildSummoner(resolved.summoner, index);
      }
    } catch (err) {
      entry.error = err.message;
    }
    results.push(entry);
  }

  return { ok: true, query, region, results };
}

/**
 * `opgg:get-leaderboard` — the ranked ladder.
 *
 * PAYLOAD
 *   { region?: string, page?: number }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     region: 'kr',
 *     page: 1,
 *     total: 3170155,
 *     lastPage: 31702,
 *     perPage: 100,
 *     rows: [{ rank: 1, summoner: { … see opgg:multi-search … } }]
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleLeaderboard(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const region = opgg.normaliseRegion(args.region || 'kr');
  const page = Math.max(1, toNumber(args.page) || 1);

  const index = await getChampionIndex();
  const { rows, meta } = await opgg.getLadder({ region, page });

  return {
    ok: true,
    region,
    page,
    total: toNumber(meta.total) || 0,
    lastPage: toNumber(meta.last_page) || 0,
    perPage: toNumber(meta.per_page) || 0,
    rows: (Array.isArray(rows) ? rows : []).map((entry) => ({
      rank: toNumber(entry.rank),
      summoner: buildSummoner(entry.summoner, index),
    })),
  };
}

/**
 * `opgg:get-summoner-profile` — one summoner.
 *
 * PAYLOAD
 *   { puuid?: string, summonerId?: number, gameName?: string, tagline?: string, region?: string }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     region: 'kr',
 *     summoner: { id, puuid, gameName, tagline, name, level, profileImageUrl,
 *                  tier, tierDivision, lp, tierImageUrl, win, lose, isHotStreak, mostChampions },
 *     recentGames: [ <match> ],
 *     mostChampions: [{ championId, championName, play, win, lose, kda }]
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleSummonerProfile(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const region = opgg.normaliseRegion(args.region || 'kr');

  const index = await getChampionIndex();
  const resolved = await resolveSummoner({
    puuid: args.puuid,
    summonerId: args.summonerId,
    gameName: args.gameName,
    tagline: args.tagline,
  }, region);

  if (!resolved) {
    return { ok: false, error: 'Summoner not found on OP.GG' };
  }

  const puuid = resolved.summoner && resolved.summoner.puuid;
  const [games, most] = await Promise.all([
    puuid ? opgg.getSummonerGames({ puuid, region }).catch(() => []) : Promise.resolve([]),
    puuid ? opgg.getMostChampions({
      puuid,
      region,
      seasonId: (resolved.summoner.most_champions && resolved.summoner.most_champions.season_id) || 0,
    }).catch(() => null) : Promise.resolve(null),
  ]);

  const championStats = most && Array.isArray(most.champion_stats) && most.champion_stats.length
    ? most.champion_stats
    : ((resolved.summoner.most_champions && resolved.summoner.most_champions.champion_stats) || []);

  return {
    ok: true,
    region,
    summoner: buildSummoner(resolved.summoner, index),
    recentGames: (Array.isArray(games) ? games : []).slice(0, 20).map((game) => buildMatch(game, index, puuid)),
    mostChampions: championStats.map((entry) => {
      const championId = toNumber(entry.id);
      const meta = index.byId.get(championId);
      const kills = toNumber(entry.kill) || 0;
      const deaths = toNumber(entry.death) || 0;
      const assists = toNumber(entry.assist) || 0;
      return {
        championId,
        championName: meta ? meta.name : null,
        championKey: meta ? meta.key : null,
        play: toNumber(entry.play) || 0,
        win: toNumber(entry.win) || 0,
        lose: toNumber(entry.lose) || 0,
        kda: toNumber(entry.kda) !== null
          ? toNumber(entry.kda)
          : (kills + assists) / Math.max(1, deaths),
      };
    }),
  };
}

/**
 * `opgg:get-match-history` — a summoner's recent matches.
 *
 * PAYLOAD
 *   { puuid?: string, gameName?: string, tagline?: string, region?: string, limit?: number }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     region: 'kr',
 *     matches: [{
 *       id, createdAt, gameType, queueId, mapId, version, duration, win,
 *       championId, championName, championKey, position, role,
 *       kills, deaths, assists, kda, score, cs, goldEarned, visionScore,
 *       items, trinketItem, spells, averageTier
 *     }]
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleMatchHistory(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const region = opgg.normaliseRegion(args.region || 'kr');
  const limit = Math.min(50, Math.max(1, toNumber(args.limit) || 20));

  const index = await getChampionIndex();
  const resolved = await resolveSummoner({
    puuid: args.puuid,
    summonerId: args.summonerId,
    gameName: args.gameName,
    tagline: args.tagline,
  }, region);

  if (!resolved || !resolved.summoner || !resolved.summoner.puuid) {
    return { ok: false, error: 'Summoner not found on OP.GG' };
  }

  const puuid = resolved.summoner.puuid;
  const games = await opgg.getSummonerGames({ puuid, region });

  return {
    ok: true,
    region,
    puuid,
    matches: (Array.isArray(games) ? games : []).slice(0, limit).map((game) => buildMatch(game, index, puuid)),
  };
}

/**
 * `opgg:check-patch-update` — is a newer patch live?
 *
 * PAYLOAD
 *   (none)
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     current: { version: '16.20.1', patch: '16.20' },
 *     latest:  { version: '16.20.1', patch: '16.20' },
 *     updateAvailable: false,
 *     checkedAt: 1760000000000
 *   }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleCheckPatchUpdate(ctx) {
  const result = await ctx.updater.checkForPatchUpdate({ manual: true });
  if (!result || result.ok === false) {
    return { ok: false, error: (result && result.error) || 'Patch check failed' };
  }
  return {
    ok: true,
    current: result.current,
    latest: result.latest,
    updateAvailable: Boolean(result.updateAvailable),
    checkedAt: result.checkedAt,
    appVersion: result.appVersion || null,
  };
}

/**
 * `opgg:get-current-patch` — the patch the app is running against.
 *
 * PAYLOAD
 *   (none)
 *
 * RESPONSE
 *   { ok: true, version: '16.20.1', patch: '16.20', updatedAt: 1760000000000, appVersion: '2.0.0' }
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
function handleCurrentPatch(ctx) {
  const result = ctx.updater.getCurrentPatch();
  return {
    ok: true,
    version: result.version,
    patch: result.patch,
    updatedAt: result.updatedAt,
    appVersion: result.appVersion || null,
  };
}

/* -------------------------------------------------------------------------- */
/* Summoner lookup helpers                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Split a raw query into individual summoner names.
 *
 * @param {string} query
 * @returns {string[]}
 */
function parseSearchNames(query) {
  const names = [];
  const seen = new Set();

  const push = (value) => {
    const cleaned = String(value || '').trim().replace(/^["']|["']$/g, '');
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    names.push(cleaned);
  };

  for (const rawLine of String(query || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const lobby = /^(.+?)\s+(?:joined the lobby|a rejoint le salon|trat do pokoju|ist der Lobby beigetreten|se ha unido al salon|entrou na sala)/i.exec(line);
    if (lobby) {
      push(lobby[1]);
      continue;
    }

    if (line.includes(',')) {
      for (const part of line.split(',')) push(part);
      continue;
    }

    push(line);
  }

  return names;
}

/**
 * Resolve a summoner (by puuid, id or Riot ID) to a summoner object.
 *
 * @param {object|string} target
 * @param {string} region
 * @returns {Promise<{summoner:object}|null>}
 */
async function resolveSummoner(target, region) {
  const args = typeof target === 'string' ? { gameName: target } : (target || {});

  if (args.puuid) {
    const summary = await opgg.getSummonerSummary({ puuid: String(args.puuid), region }).catch(() => null);
    if (summary && summary.summoner) return { summoner: summary.summoner };
  }

  const gameName = args.gameName ? String(args.gameName) : null;
  const tagline = args.tagline ? String(args.tagline) : null;

  let wantedName = gameName;
  let wantedTag = tagline;

  // "Name#TAG" is the Riot ID notation used by the League client.
  if (wantedName && wantedName.includes('#')) {
    const [namePart, tagPart] = wantedName.split('#');
    wantedName = namePart;
    if (!wantedTag && tagPart) wantedTag = tagPart;
  }
  if (!wantedName) return null;

  // The public API has no unauthenticated name search, so the ranked ladder is
  // scanned for a Riot ID match.
  const wantedNameLower = wantedName.toLowerCase();
  const wantedTagLower = wantedTag ? String(wantedTag).toLowerCase() : null;

  for (let page = 1; page <= 3; page += 1) {
    const { rows } = await opgg.getLadder({ region, page }).catch(() => ({ rows: [] }));
    for (const entry of rows || []) {
      const summoner = entry && entry.summoner;
      if (!summoner) continue;
      const name = String(summoner.game_name || '').toLowerCase();
      const tag = String(summoner.tagline || '').toLowerCase();
      if (name !== wantedNameLower) continue;
      if (wantedTagLower && tag !== wantedTagLower) continue;
      return { summoner };
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Registration                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Register every `opgg:*` handler.
 *
 * @param {object} ctx - `{ ipcMain, privileged, updater }`
 */
function register(ctx) {
  const { ipcMain, privileged, updater } = ctx;

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_STATIC_DATA, privileged(() => handleStaticData()));
  // `privileged` calls the handler with (event, payload). These handlers take
  // the payload as their only argument, so they are adapted explicitly —
  // passing them bare would hand them the Electron event instead.
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_CHAMPIONS, privileged((event, payload) => handleChampions(payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_MODE_TIER_LIST, privileged((event, payload) => handleModeTierList(payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_CHAMPION_DETAIL, privileged((event, payload) => handleChampionDetail(payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_MULTI_SEARCH, privileged((event, payload) => handleMultiSearch(payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_LEADERBOARD, privileged((event, payload) => handleLeaderboard(payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_SUMMONER_PROFILE, privileged((event, payload) => handleSummonerProfile(payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OPGG_MATCH_HISTORY, privileged((event, payload) => handleMatchHistory(payload)));
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.OPGG_CHECK_PATCH_UPDATE,
    privileged(() => handleCheckPatchUpdate({ updater })),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.OPGG_CURRENT_PATCH,
    privileged(() => handleCurrentPatch({ updater })),
  );
}

module.exports = register;
module.exports.handleChampions = handleChampions;
module.exports.handleModeTierList = handleModeTierList;
module.exports.handleChampionDetail = handleChampionDetail;
module.exports.handleStaticData = handleStaticData;
module.exports.handleMultiSearch = handleMultiSearch;
module.exports.handleLeaderboard = handleLeaderboard;
module.exports.handleSummonerProfile = handleSummonerProfile;
module.exports.handleMatchHistory = handleMatchHistory;
module.exports.parseSearchNames = parseSearchNames;
module.exports.tierLabel = tierLabel;
