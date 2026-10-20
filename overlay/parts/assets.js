/**
 * Static asset helpers.
 *
 * Icons come from two places:
 *
 *  1. the reference's own meta dictionaries (`metaChampions`, `metaItems`,
 *     `metaRunes`, `metaRunePages`, `metaSpells`, `metaAugments`), delivered
 *     by the main process through `opgg:static-data` — these carry the
 *     reference's exact `image_url` values;
 *  2. the reference's public asset CDN
 *     (`opgg-static.akamaized.net/meta/images/lol/latest/…`), used as the
 *     fallback when a dictionary entry is missing. Data Dragon is the last
 *     resort for champions, items and spells.
 *
 * No asset URL is ever invented: a missing entry simply renders the
 * placeholder instead of a broken image.
 */

/** The reference's asset CDN — the same host the reference renderer uses. */
const OPGG_CDN = 'https://opgg-static.akamaized.net/meta/images/lol/latest';

/** Data Dragon CDN, used as a secondary fallback. */
const DDRAGON_CDN = 'https://ddragon.leagueoflegends.com/cdn';

/** Data Dragon version used until the main process reports a newer one. */
let ddragonVersion = '16.20.1';

/**
 * Champion names whose Data Dragon / OP.GG file name differs from the
 * display name. The keys are the lower-cased display names; the values are
 * the exact `champion.json` keys published by Data Dragon.
 */
const DDRAGON_SPECIAL_NAMES = {
  'wukong': 'MonkeyKing',
  'nunu & willump': 'Nunu',
  'renata glasc': 'Renata',
  "kai'sa": 'Kaisa',
  "cho'gath": 'Chogath',
  leblanc: 'Leblanc',
  "kha'zix": 'Khazix',
  "vel'koz": 'Velkoz',
  "bel'veth": 'Belveth',
  'mr. fiddlesticks': 'Fiddlesticks',
};

/**
 * Summoner spell id -> the file name the reference CDN uses.
 * The ids are the in-game spell ids the League Client reports.
 */
const SPELL_FILE_BY_ID = {
  3: 'SummonerExhaust',
  4: 'SummonerFlash',
  6: 'SummonerHeal',
  7: 'SummonerBarrier',
  11: 'SummonerSmite',
  12: 'SummonerTeleport',
  13: 'SummonerDot',
  14: 'SummonerDot',
  21: 'SummonerBarrier',
  32: 'SummonerSnowball',
  54: 'SummonerGhost',
  55: 'SummonerSmite',
  59: 'SummonerMark',
  60: 'SummonerDash',
};

/** Spell name fragment -> the file name the reference CDN uses. */
const SPELL_FILE_BY_NAME = {
  flash: 'SummonerFlash',
  dot: 'SummonerDot',
  ignite: 'SummonerDot',
  heal: 'SummonerHeal',
  barrier: 'SummonerBarrier',
  smite: 'SummonerSmite',
  exhaust: 'SummonerExhaust',
  cleanse: 'SummonerCleanse',
  teleport: 'SummonerTeleport',
  snowball: 'SummonerSnowball',
  ghost: 'SummonerGhost',
  mark: 'SummonerMark',
  dash: 'SummonerDash',
};

/** Set the Data Dragon version (e.g. `16.20.1`). */
export function setDdragonVersion(version) {
  if (typeof version === 'string' && /^\d+\.\d+/.test(version)) {
    ddragonVersion = version;
  }
}

/** The Data Dragon version currently in use. */
export function getDdragonVersion() {
  return ddragonVersion;
}

/**
 * Convert a champion display name to its asset file name.
 * `Aatrox` -> `Aatrox`, `Kai'Sa` -> `Kaisa`, `Wukong` -> `MonkeyKing`.
 */
export function ddragonName(name) {
  if (!name) return '';
  const raw = String(name).trim();
  const special = DDRAGON_SPECIAL_NAMES[raw.toLowerCase()];
  if (special) return special;
  return raw.replace(/[\s'’.]/g, '');
}

/** Champion portrait (square). */
export function championImage(name) {
  const file = ddragonName(name);
  if (!file) return '';
  return `${OPGG_CDN}/champion/${file}.png`;
}

/** Item icon. */
export function itemImage(id) {
  if (!Number.isFinite(Number(id))) return '';
  return `${OPGG_CDN}/item/${id}.png`;
}

/** Rune (perk) icon. */
export function perkImage(id) {
  if (!Number.isFinite(Number(id))) return '';
  return `${OPGG_CDN}/perk/${id}.png`;
}

/** Rune tree icon. */
export function perkStyleImage(id) {
  if (!Number.isFinite(Number(id))) return '';
  return `${OPGG_CDN}/perkStyle/${id}.png`;
}

/** Stat shard icon. */
export function shardImage(id) {
  if (!Number.isFinite(Number(id))) return '';
  return `${OPGG_CDN}/perkShard/${id}.png`;
}

/** Summoner spell icon file name for a spell id. */
export function spellFileName(id, name) {
  if (name) {
    const cleaned = String(name).replace(/^Summoner/, '').replace(/[^a-z]/gi, '').toLowerCase();
    if (SPELL_FILE_BY_NAME[cleaned]) return SPELL_FILE_BY_NAME[cleaned];
    if (/^Summoner[A-Z]/.test(String(name))) return String(name);
  }
  if (id !== null && id !== undefined && SPELL_FILE_BY_ID[Number(id)]) {
    return SPELL_FILE_BY_ID[Number(id)];
  }
  return '';
}

/** Summoner spell icon. */
export function spellImage(id, name) {
  const file = spellFileName(id, name);
  if (!file) return '';
  return `${OPGG_CDN}/spell/${file}.png`;
}

/** Data Dragon champion portrait (secondary fallback). */
export function ddragonChampionImage(name) {
  const file = ddragonName(name);
  if (!file) return '';
  return `${DDRAGON_CDN}/${ddragonVersion}/img/champion/${file}.png`;
}

/** Data Dragon item icon (secondary fallback). */
export function ddragonItemImage(id) {
  if (!Number.isFinite(Number(id))) return '';
  return `${DDRAGON_CDN}/${ddragonVersion}/img/item/${id}.png`;
}

/** Data Dragon summoner spell icon (secondary fallback). */
export function ddragonSpellImage(file) {
  if (!file) return '';
  return `${DDRAGON_CDN}/${ddragonVersion}/img/spell/${file}.png`;
}

/* -------------------------------------------------------------------------- */
/* Reference meta dictionaries                                                  */
/* -------------------------------------------------------------------------- */

const registry = {
  champions: new Map(),
  items: new Map(),
  runes: new Map(),
  runePages: new Map(),
  spells: new Map(),
  augments: new Map(),
};

function indexById(list) {
  const map = new Map();
  if (!Array.isArray(list)) return map;
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const id = entry.id ?? entry.championId ?? entry.champion_id ?? entry.itemId ?? entry.item_id;
    if (id === undefined || id === null) continue;
    map.set(Number(id), entry);
  }
  return map;
}

/**
 * Install the reference meta dictionaries.
 * Accepts the `common` store shape (`{ metaChampions: { data: [...] } }`) and
 * plain arrays alike.
 */
export function installStaticData(payload) {
  if (!payload || typeof payload !== 'object') return;
  const source = payload.data && typeof payload.data === 'object' ? payload.data : payload;

  const pick = (...keys) => {
    for (const key of keys) {
      const value = source[key];
      if (value) return Array.isArray(value) ? value : value.data;
    }
    return null;
  };

  const champions = pick('metaChampions', 'champions', 'meta_champions');
  const items = pick('metaItems', 'items', 'meta_items');
  const runes = pick('metaRunes', 'runes', 'meta_runes');
  const runePages = pick('metaRunePages', 'runePages', 'meta_rune_pages');
  const spells = pick('metaSpells', 'spells', 'meta_spells');
  const augments = pick('metaAramAugments', 'metaAugments', 'augments');

  if (Array.isArray(champions)) registry.champions = indexById(champions);
  if (Array.isArray(items)) registry.items = indexById(items);
  if (Array.isArray(runes)) registry.runes = indexById(runes);
  if (Array.isArray(runePages)) registry.runePages = indexById(runePages);
  if (Array.isArray(spells)) registry.spells = indexById(spells);
  if (Array.isArray(augments)) registry.augments = indexById(augments);

  const version = source.ddragonVersion || source.ddragon_version || payload.ddragonVersion;
  if (version) setDdragonVersion(version);
}

/** Look up a champion in the reference dictionary. */
export function championMeta(id) {
  return registry.champions.get(Number(id)) || null;
}

/** Look up an item in the reference dictionary. */
export function itemMeta(id) {
  return registry.items.get(Number(id)) || null;
}

/** Look up a rune in the reference dictionary. */
export function runeMeta(id) {
  return registry.runes.get(Number(id)) || null;
}

/** Look up a rune tree in the reference dictionary. */
export function runePageMeta(id) {
  return registry.runePages.get(Number(id)) || null;
}

/** Look up a summoner spell in the reference dictionary. */
export function spellMeta(id) {
  return registry.spells.get(Number(id)) || null;
}

/** Look up an augment in the reference dictionary. */
export function augmentMeta(id) {
  return registry.augments.get(Number(id)) || null;
}

/**
 * Icon URL for a champion: the reference's `image_url` when known, the
 * reference CDN otherwise, Data Dragon as the last resort.
 */
export function championIcon(id, name) {
  const meta = championMeta(id);
  if (meta && meta.image_url) return meta.image_url;
  const displayName = name || (meta && meta.name) || '';
  return championImage(displayName) || ddragonChampionImage(displayName);
}

/** Icon URL for an item. */
export function itemIcon(id) {
  const meta = itemMeta(id);
  if (meta && meta.image_url) return meta.image_url;
  return itemImage(id) || ddragonItemImage(id);
}

/** Icon URL for a rune. */
export function runeIcon(id) {
  const meta = runeMeta(id);
  if (meta && meta.image_url) return meta.image_url;
  return perkImage(id);
}

/** Icon URL for a rune tree. */
export function runePageIcon(id) {
  const meta = runePageMeta(id);
  if (meta && meta.image_url) return meta.image_url;
  return perkStyleImage(id);
}

/** Icon URL for a stat shard. */
export function shardIcon(id) {
  return shardImage(id);
}

/** Icon URL for a summoner spell. */
export function spellIcon(id, name) {
  const meta = spellMeta(id);
  if (meta && meta.image_url) return meta.image_url;
  const file = spellFileName(id, name || (meta && meta.name) || '');
  return spellImage(id, name || (meta && meta.name) || '') || ddragonSpellImage(file);
}

/** Icon URL for an augment. */
export function augmentIcon(id) {
  const meta = augmentMeta(id);
  if (meta && meta.image_url) return meta.image_url;
  return '';
}
