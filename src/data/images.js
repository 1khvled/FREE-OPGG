/**
 * Central image URL helpers.
 *
 * Every page uses these so no screen has to know a CDN pattern.
 *
 * ## Which CDN?
 *
 * The default helpers build URLs against OP.GG's own static CDN
 * (`opgg-static.akamaized.net`), because that is what the shipped reference
 * uses and because it serves **every** asset class the app needs — champion
 * portraits, loading screens, passives, abilities, items, perks, perk shards
 * and summoner spells. It also accepts the `latest` version segment.
 *
 * Riot's own Data Dragon (`ddragon.leagueoflegends.com`) serves the same
 * assets, but it only resolves with a full semantic version
 * (`16.20.1`). Its `/cdn/latest/` alias and the short patch form
 * (`16.20`) both answer **HTTP 403** — verified against the live CDN — so
 * they cannot be used as a fallback. The ddragon builders are still exported
 * (`ddragonItemIcon`, `ddragonSpellIcon`, `ddragonRuneIcon`,
 * `ddragonChampionIcon`) for callers that already hold a concrete version.
 *
 * All helpers are pure: they never touch the DOM and never perform I/O.
 */

import { CHAMPIONS, championById } from './champions.js';

/* -------------------------------------------------------------------------- */
/* Constants                                                                    */
/* -------------------------------------------------------------------------- */

/** Version segment used when the caller does not know a Data Dragon version. */
export const DD_VERSION_FALLBACK = 'latest';

/** OP.GG static CDN root. */
export const OPGG_STATIC_BASE = 'https://opgg-static.akamaized.net';

/** OP.GG per-version asset root (`<base>/meta/images/lol/<version>`). */
export const OPGG_META_BASE = `${OPGG_STATIC_BASE}/meta/images/lol`;

/** Riot Data Dragon CDN root. */
export const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn';

/** Image proxy transform the reference web app appends to portraits. */
export const IMAGE_PROXY_TRANSFORM = 'image=c_scale,q_auto,w_46';

/* -------------------------------------------------------------------------- */
/* Internals                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Lower-cased square name / display name → square name.
 *
 * Two passes: the base champions first, then the "ultimate form" pseudo
 * champions (ids ≥ 60000). The pseudo champions reuse the display name of
 * their base champion, so the base champion must win the lookup.
 */
const SQUARE_INDEX = (() => {
  const index = new Map();
  const base = [];
  const variants = [];
  for (const [id, champ] of Object.entries(CHAMPIONS)) {
    (Number(id) >= 60000 ? variants : base).push(champ);
  }
  for (const champ of base) {
    index.set(champ.key.toLowerCase(), champ.key);
    index.set(champ.name.toLowerCase(), champ.key);
  }
  for (const champ of variants) {
    if (!index.has(champ.key.toLowerCase())) index.set(champ.key.toLowerCase(), champ.key);
  }
  return index;
})();

/** Normalise a version segment. */
function versionSegment(version) {
  if (version === null || version === undefined) return DD_VERSION_FALLBACK;
  const value = String(version).trim();
  return value || DD_VERSION_FALLBACK;
}

/** `true` when the string looks like a Data Dragon square name. */
function looksLikeSquareName(value) {
  return typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(value.trim());
}

/**
 * Resolve any champion reference into `{ id, key, name, title, tags }`.
 *
 * Accepts:
 *   - a numeric champion id (`86`),
 *   - a square name (`'Aatrox'`) or a display name (`'Twisted Fate'`),
 *   - an object carrying any of `id`, `key`, `name`, `squareName`.
 *
 * @param {number|string|object|null|undefined} champion
 * @returns {{id: number|null, key: string|null, name: string, title: string, tags: string[]}|null}
 */
export function resolveChampion(champion) {
  if (champion === null || champion === undefined) return null;

  if (typeof champion === 'number') {
    const record = championById(champion);
    if (!record) return null;
    return { id: champion, key: record.key, name: record.name, title: record.title, tags: record.tags.slice() };
  }

  if (typeof champion === 'string') {
    const needle = champion.trim().toLowerCase();
    const key = SQUARE_INDEX.get(needle);
    if (key) {
      const record = Object.values(CHAMPIONS).find((entry) => entry.key === key);
      return {
        id: record ? Number(Object.keys(CHAMPIONS).find((id) => CHAMPIONS[id] === record)) : null,
        key,
        name: record ? record.name : champion,
        title: record ? record.title : '',
        tags: record ? record.tags.slice() : [],
      };
    }
    if (looksLikeSquareName(needle)) {
      return { id: null, key: champion.trim(), name: champion.trim(), title: '', tags: [] };
    }
    return null;
  }

  if (typeof champion !== 'object') return null;

  const numericId = (() => {
    for (const candidate of [champion.id, champion.championId, champion.champion_id]) {
      const num = Number(candidate);
      if (candidate !== null && candidate !== undefined && candidate !== '' && Number.isFinite(num)) return num;
    }
    return null;
  })();

  const record = numericId !== null ? championById(numericId) : null;

  const candidates = [
    champion.squareName,
    champion.key,
    champion.id,
    champion.name,
  ].filter((value) => typeof value === 'string' && value.trim());

  for (const candidate of candidates) {
    const key = SQUARE_INDEX.get(candidate.trim().toLowerCase());
    if (key) {
      return {
        id: numericId,
        key,
        name: champion.name || (record ? record.name : ''),
        title: champion.title || (record ? record.title : ''),
        tags: Array.isArray(champion.tags) ? champion.tags.slice() : (record ? record.tags.slice() : []),
      };
    }
  }

  if (record) {
    return {
      id: numericId,
      key: record.key,
      name: champion.name || record.name,
      title: champion.title || record.title,
      tags: Array.isArray(champion.tags) ? champion.tags.slice() : record.tags.slice(),
    };
  }

  const fallback = candidates.find(looksLikeSquareName);
  if (fallback) {
    return {
      id: numericId,
      key: fallback.trim(),
      name: champion.name || fallback.trim(),
      title: champion.title || '',
      tags: Array.isArray(champion.tags) ? champion.tags.slice() : [],
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Champions                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The Data Dragon square name of a champion (`'Aatrox'`, `'TwistedFate'`).
 *
 * @param {number|string|object|null|undefined} champion
 * @returns {string|null} the square name, or `null` when it cannot be resolved
 */
export function championSquareName(champion) {
  const resolved = resolveChampion(champion);
  return resolved ? resolved.key : null;
}

/**
 * Champion portrait (square).
 *
 * @param {number|string|object|null|undefined} champion
 * @param {string} [version] Data Dragon version segment, defaults to `latest`
 * @returns {string} the URL, or `''` when the champion cannot be resolved
 */
export function championSquare(champion, version = DD_VERSION_FALLBACK) {
  const key = championSquareName(champion);
  if (!key) return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/champion/${key}.png`;
}

/**
 * Champion portrait with the reference's image-proxy transform.
 *
 * The reference tier list renders
 * `<img src="{meta image_url}?image=c_scale,q_auto,w_46">`.
 *
 * @param {number|string|object|null|undefined} champion
 * @param {number} [width=46] - target width in pixels
 * @param {string} [version]
 * @returns {string}
 */
export function championPortrait(champion, width = 46, version = DD_VERSION_FALLBACK) {
  const base = championSquare(champion, version);
  if (!base) return '';
  return `${base}?image=c_scale,q_auto,w_${width}`;
}

/**
 * Champion portrait with the reference web app's image-proxy transform.
 *
 * Note: the reference web app serves this path from `opgg.com`, not from the
 * static CDN — the static CDN answers 403 for `/images/champions/*`.
 *
 * @param {number|string|object|null|undefined} champion
 * @returns {string}
 */
export function championSquareReference(champion) {
  const key = championSquareName(champion);
  if (!key) return '';
  return `${OPGG_STATIC_BASE}/images/champions/${key}.png?${IMAGE_PROXY_TRANSFORM}`;
}

/**
 * Champion loading screen.
 *
 * @param {number|string|object|null|undefined} champion
 * @param {string} [version]
 * @returns {string}
 */
export function championLoading(champion, version = DD_VERSION_FALLBACK) {
  const key = championSquareName(champion);
  if (!key) return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/champion/loading/${key}_0.jpg`;
}

/**
 * Champion splash art.
 *
 * @param {number|string|object|null|undefined} champion
 * @param {string} [version]
 * @returns {string}
 */
export function championSplash(champion, version = DD_VERSION_FALLBACK) {
  const key = championSquareName(champion);
  if (!key) return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/champion/splash/${key}_0.jpg`;
}

/**
 * Champion passive ability icon.
 *
 * @param {number|string|object|null|undefined} champion
 * @param {string} [version]
 * @returns {string}
 */
export function championPassive(champion, version = DD_VERSION_FALLBACK) {
  const key = championSquareName(champion);
  if (!key) return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/passive/${key}_Passive.png`;
}

/**
 * Champion ability icon (`Q` / `W` / `E` / `R`).
 *
 * @param {number|string|object|null|undefined} champion
 * @param {string} spellKey - `Q`, `W`, `E` or `R`
 * @param {string} [version]
 * @returns {string}
 */
export function championSpell(champion, spellKey, version = DD_VERSION_FALLBACK) {
  const key = championSquareName(champion);
  if (!key || !spellKey) return '';
  const letter = String(spellKey).trim().toUpperCase().charAt(0);
  if (!'QWERP'.includes(letter)) return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/spell/${key}${letter}.png`;
}

/* -------------------------------------------------------------------------- */
/* Items, runes, spells                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Item icon.
 *
 * @param {number|string} id - Data Dragon item id (`1001`)
 * @param {string} [version]
 * @returns {string}
 */
export function itemIcon(id, version = DD_VERSION_FALLBACK) {
  if (id === null || id === undefined || id === '') return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/item/${id}.png`;
}

/**
 * Perk (rune) icon.
 *
 * @param {number|string} perkId - perk id (`8005`, `9111`, `5008`)
 * @param {string|number} [style] - the rune tree the perk belongs to; only
 *        used by the ddragon variant, the OP.GG CDN addresses perks by id
 * @param {string} [version]
 * @returns {string}
 */
export function runeIcon(perkId, style = null, version = DD_VERSION_FALLBACK) {
  if (perkId === null || perkId === undefined || perkId === '') return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/perk/${perkId}.png`;
}

/**
 * Rune tree (style) icon — Precision, Domination, Sorcery, Inspiration, Resolve.
 *
 * @param {number|string} pageId - rune page id (`8000`)
 * @param {string} [version]
 * @returns {string}
 */
export function runeStyleIcon(pageId, version = DD_VERSION_FALLBACK) {
  if (pageId === null || pageId === undefined || pageId === '') return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/perkStyle/${pageId}.png`;
}

/**
 * Stat shard (offense / flexibility / utility shard) icon.
 *
 * @param {number|string} id - shard id (`5008`, `5001`, `5002`)
 * @param {string} [version]
 * @returns {string}
 */
export function runeShardIcon(id, version = DD_VERSION_FALLBACK) {
  if (id === null || id === undefined || id === '') return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/perkShard/${id}.png`;
}

/**
 * Summoner spell icon.
 *
 * Accepts a summoner spell id (`4` → Flash), a Data Dragon file key
 * (`'SummonerFlash'`) or a champion ability key (`'AnnieQ'`).
 *
 * @param {number|string} id
 * @param {string} [version]
 * @returns {string}
 */
export function spellIcon(id, version = DD_VERSION_FALLBACK) {
  if (id === null || id === undefined || id === '') return '';
  const key = typeof id === 'number' ? (SUMMONER_SPELLS[id] || {}).key : String(id);
  if (!key) return '';
  return `${OPGG_META_BASE}/${versionSegment(version)}/spell/${key}.png`;
}

/**
 * Summoner profile icon.
 *
 * @param {number|string} id - profile icon id (`29`)
 * @returns {string}
 */
export function profileIcon(id) {
  if (id === null || id === undefined || id === '') return '';
  return `${OPGG_STATIC_BASE}/images/profile_icons/profileIcon${id}.jpg`;
}

/* -------------------------------------------------------------------------- */
/* Summoner spells                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Summoner spells: id → `{ id, name, key }`.
 *
 * `key` is the Data Dragon file name (no extension). The ids and the file
 * names come from the shipped reference's own map
 * (`QuickPlay.346077f4.bundle.js`), cross-checked against Riot's
 * `summoner-spells.json`.
 *
 * @type {Record<number, {id: number, name: string, key: string}>}
 */
export const SUMMONER_SPELLS = {
  1: { id: 1, name: 'Cleanse', key: 'SummonerBoost' },
  3: { id: 3, name: 'Exhaust', key: 'SummonerExhaust' },
  4: { id: 4, name: 'Flash', key: 'SummonerFlash' },
  5: { id: 5, name: 'Teleport', key: 'SummonerTeleport' },
  6: { id: 6, name: 'Ghost', key: 'SummonerHaste' },
  7: { id: 7, name: 'Heal', key: 'SummonerHeal' },
  11: { id: 11, name: 'Smite', key: 'SummonerSmite' },
  12: { id: 12, name: 'Teleport', key: 'SummonerTeleport' },
  13: { id: 13, name: 'Clarity', key: 'SummonerMana' },
  14: { id: 14, name: 'Ignite', key: 'SummonerDot' },
  21: { id: 21, name: 'Barrier', key: 'SummonerBarrier' },
  30: { id: 30, name: 'To the King!', key: 'SummonerPoroRecall' },
  31: { id: 31, name: 'Poro Toss', key: 'SummonerPoroThrow' },
  32: { id: 32, name: 'Mark', key: 'SummonerSnowball' },
  39: { id: 39, name: 'Mark', key: 'SummonerSnowURFSnowball_Mark' },
};

/**
 * Summoner spell record for an id.
 *
 * @param {number|string} id
 * @returns {{id: number, name: string, key: string}|null} `null` when unknown
 */
export function summonerSpellById(id) {
  if (id === null || id === undefined || id === '') return null;
  const num = Number(id);
  if (!Number.isFinite(num)) return null;
  const spell = SUMMONER_SPELLS[num];
  return spell ? { ...spell } : null;
}

/**
 * The display name of a summoner spell, or `''` when unknown.
 *
 * @param {number|string} id
 * @returns {string}
 */
export function summonerSpellName(id) {
  const spell = summonerSpellById(id);
  return spell ? spell.name : '';
}

/* -------------------------------------------------------------------------- */
/* Data Dragon variants                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Item icon on Riot's Data Dragon CDN.
 *
 * Requires a **full** Data Dragon version (`16.20.1`); `/cdn/latest/` and the
 * short patch form both answer HTTP 403.
 *
 * @param {number|string} id
 * @param {string} [version]
 * @returns {string}
 */
export function ddragonItemIcon(id, version = DD_VERSION_FALLBACK) {
  if (id === null || id === undefined || id === '') return '';
  return `${DDRAGON_BASE}/${versionSegment(version)}/img/item/${id}.png`;
}

/**
 * Spell icon on Riot's Data Dragon CDN.
 *
 * @param {number|string} id - summoner spell id or Data Dragon file key
 * @param {string} [version]
 * @returns {string}
 */
export function ddragonSpellIcon(id, version = DD_VERSION_FALLBACK) {
  if (id === null || id === undefined || id === '') return '';
  const key = typeof id === 'number' ? (SUMMONER_SPELLS[id] || {}).key : String(id);
  if (!key) return '';
  return `${DDRAGON_BASE}/${versionSegment(version)}/img/spell/${key}.png`;
}

/**
 * Perk icon on Riot's Data Dragon CDN.
 *
 * @param {number|string} perkId
 * @param {string|number} [style] - rune tree id, e.g. `PerkPrecision`
 * @param {string} [version]
 * @returns {string}
 */
export function ddragonRuneIcon(perkId, style = null, version = DD_VERSION_FALLBACK) {
  if (perkId === null || perkId === undefined || perkId === '') return '';
  const tree = style === null || style === undefined ? '' : String(style);
  return `${DDRAGON_BASE}/${versionSegment(version)}/img/perk-styles/${tree}/${perkId}.png`;
}

/**
 * Champion portrait on Riot's Data Dragon CDN.
 *
 * @param {number|string|object|null|undefined} champion
 * @param {string} [version]
 * @returns {string}
 */
export function ddragonChampionIcon(champion, version = DD_VERSION_FALLBACK) {
  const key = championSquareName(champion);
  if (!key) return '';
  return `${DDRAGON_BASE}/${versionSegment(version)}/img/champion/${key}.png`;
}
