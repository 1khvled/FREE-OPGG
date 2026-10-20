/**
 * Champion detail — data layer.
 *
 * The reference feeds this screen from
 *   `https://lol-api-champion.op.gg/api/{region}/champions/{mode}/{championId}/{position}`
 * whose document has changed shape several times between reference releases
 * (the shipped desktop app reads `rune_pages[].builds[]`, an older build reads
 * `runes[]`, the live-companion build reads `startItems` / `suggestionBoots` /
 * `coreItems`). Everything below is therefore written to be *tolerant*:
 *
 *   - every field is looked up through a list of plausible spellings;
 *   - a missing sub-object yields an empty collection, never a throw;
 *   - no number is ever invented — if the payload has no win rate, the
 *     normalised model carries `null` and the UI prints a dash.
 *
 * Static game metadata (champion names, item names, rune names) is read from
 * the repository's Data Dragon snapshots in `src/assets/`; those files are
 * reference data, not live numbers.
 */

import championsDdragon from '../../assets/champions_ddragon.json' with { type: 'json' };
import itemsDdragon from '../../assets/items.json' with { type: 'json' };
import runesDdragon from '../../assets/runes.json' with { type: 'json' };

/* -------------------------------------------------------------------------- */
/* Primitive helpers                                                          */
/* -------------------------------------------------------------------------- */

/** @param {unknown} value */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** First finite number of the arguments, or `null`. */
export function firstNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '' || value === false) continue;
    const n = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** First non-empty string of the arguments, or `null`. */
export function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** First array of the arguments, or `null`. */
export function firstArray(...values) {
  for (const value of values) if (Array.isArray(value)) return value;
  return null;
}

/** Coerce to a finite integer, or `null`. */
export function toInt(value) {
  const n = firstNumber(value);
  if (n === null) return null;
  return Math.trunc(n);
}

/** Remove markup from a description coming from the API. */
export function stripHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** `PressTheAttack` → `press-the-attack` (used for the rune-advice i18n keys). */
export function camelToKebab(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/** Format a 0..1 ratio as a percentage string; `null` becomes a dash. */
export function formatRate(value, digits = 2) {
  const n = firstNumber(value);
  if (n === null) return '-';
  return `${(n * 100).toFixed(digits)}%`;
}

/** Format an integer with thousands separators; `null` becomes a dash. */
export function formatCount(value) {
  const n = firstNumber(value);
  if (n === null) return '-';
  return Math.round(n).toLocaleString('en-US');
}

/* -------------------------------------------------------------------------- */
/* Positions                                                                  */
/* -------------------------------------------------------------------------- */

export const POSITIONS = ['top', 'jungle', 'mid', 'adc', 'support'];

const POSITION_ALIASES = new Map([
  ['top', 'top'], ['toplane', 'top'], ['solo', 'top'],
  ['jungle', 'jungle'], ['jng', 'jungle'], ['jungler', 'jungle'],
  ['mid', 'mid'], ['middle', 'mid'], ['midlane', 'mid'], ['middlelane', 'mid'],
  ['adc', 'adc'], ['bottom', 'adc'], ['carry', 'adc'], ['bot', 'adc'],
  ['support', 'support'], ['sup', 'support'],
]);

/**
 * Normalise a lane/position value.
 * Accepts `top`, `TOP`, `Top`, `jungle`, `JUNGLE`, `mid`, `adc`, `support`, …
 * @param {unknown} value
 * @returns {string|null} one of {@link POSITIONS}, or `null`.
 */
export function normalizePosition(value) {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!key) return null;
  return POSITION_ALIASES.get(key) || (POSITIONS.includes(key) ? key : null);
}

/* -------------------------------------------------------------------------- */
/* Static catalogues (Data Dragon snapshots shipped in src/assets)            */
/* -------------------------------------------------------------------------- */

const CHAMPIONS_BY_ID = new Map();
const CHAMPIONS_BY_KEY = new Map();

for (const champion of Object.values(championsDdragon?.data || {})) {
  const entry = {
    id: toInt(champion.key),
    key: champion.id || null,
    name: champion.name || null,
    title: champion.title || null,
    blurb: champion.blurb || null,
    tags: Array.isArray(champion.tags) ? champion.tags : [],
    imageUrl: null,
  };
  if (entry.id !== null) CHAMPIONS_BY_ID.set(entry.id, entry);
  if (entry.key) CHAMPIONS_BY_KEY.set(String(entry.key).toLowerCase(), entry);
}

const ITEMS_BY_ID = new Map();

for (const [rawId, item] of Object.entries(itemsDdragon?.data || {})) {
  const id = toInt(rawId);
  if (id === null) continue;
  ITEMS_BY_ID.set(id, {
    id,
    name: item.name || null,
    description: item.description || null,
    plaintext: item.plaintext || null,
    image: item.image || null,
  });
}

const RUNES_BY_ID = new Map();
const RUNE_STYLES = new Map();

for (const tree of Array.isArray(runesDdragon) ? runesDdragon : []) {
  const styleId = toInt(tree.id);
  if (styleId !== null) {
    RUNE_STYLES.set(styleId, { id: styleId, name: tree.name || null, key: tree.key || null });
  }
  for (const slot of tree.slots || []) {
    for (const rune of slot.runes || []) {
      const id = toInt(rune.id);
      if (id === null) continue;
      RUNES_BY_ID.set(id, {
        id,
        name: rune.name || null,
        key: rune.key || null,
        shortDesc: rune.shortDesc || rune.short_desc || '',
        longDesc: rune.longDesc || rune.long_desc || '',
        icon: rune.icon || null,
        styleId,
        styleName: tree.name || null,
      });
    }
  }
}

/** Stat shards are not part of `runes.json`; the reference hard-codes them too. */
const SHARDS_BY_ID = new Map([
  [5001, { id: 5001, name: 'Health Scaling' }],
  [5002, { id: 5002, name: 'Armor' }],
  [5003, { id: 5003, name: 'Magic Resist' }],
  [5005, { id: 5005, name: 'Attack Speed' }],
  [5007, { id: 5007, name: 'Ability Haste' }],
  [5008, { id: 5008, name: 'Adaptive Force' }],
  [5011, { id: 5011, name: 'Health Scaling' }],
]);

/* -------------------------------------------------------------------------- */
/* Catalogue lookups                                                          */
/* -------------------------------------------------------------------------- */

/** Champion metadata by numeric Data Dragon id. */
export function championById(championId) {
  const id = toInt(championId);
  if (id === null) return null;
  return CHAMPIONS_BY_ID.get(id) || null;
}

/** Champion metadata by Data Dragon key (`aatrox`). */
export function championByKey(key) {
  if (!key) return null;
  return CHAMPIONS_BY_KEY.get(String(key).toLowerCase()) || null;
}

/** Item metadata by Data Dragon id. */
export function itemById(itemId) {
  const id = toInt(itemId);
  if (id === null) return null;
  return ITEMS_BY_ID.get(id) || null;
}

/** Rune metadata by perk id (keystones and rows). */
export function runeById(runeId) {
  const id = toInt(runeId);
  if (id === null) return null;
  return RUNES_BY_ID.get(id) || null;
}

/** Stat-shard metadata by id. */
export function shardById(shardId) {
  const id = toInt(shardId);
  if (id === null) return null;
  return SHARDS_BY_ID.get(id) || null;
}

/** Rune-tree metadata by style id (8000 Precision … 8400 Inspiration). */
export function runeStyleById(styleId) {
  const id = toInt(styleId);
  if (id === null) return null;
  return RUNE_STYLES.get(id) || null;
}

/* -------------------------------------------------------------------------- */
/* Static data merging                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Classify a list of records coming from the `opgg:static-data` payload.
 * @returns {'champion'|'item'|'rune'|null}
 */
function classifyRecords(records) {
  const sample = records.find((entry) => isObject(entry));
  if (!sample) return null;
  const id = firstNumber(sample.id, sample.champion_id, sample.item_id, sample.perk_id, sample.rune_id);
  if (id === null) return null;
  if (!firstString(sample.name, sample.title)) return null;

  const image = firstString(sample.image_url, sample.imageUrl, sample.icon, sample.image);
  const imagePath = image || '';

  if (sample.plaintext !== undefined || sample.description !== undefined
    || sample.gold !== undefined || sample.into_items !== undefined
    || imagePath.includes('/item/')) {
    return 'item';
  }
  if (sample.short_desc !== undefined || sample.shortDesc !== undefined
    || sample.long_desc !== undefined || sample.longDesc !== undefined
    || sample.rune_sequence !== undefined || sample.page_id !== undefined
    || sample.slot_sequence !== undefined || imagePath.includes('/perk/')) {
    return 'rune';
  }
  if (sample.title !== undefined || sample.blurb !== undefined || sample.tags !== undefined
    || sample.skins !== undefined || imagePath.includes('/champion/')) {
    return 'champion';
  }
  return null;
}

/**
 * Merge the `opgg:static-data` payload into the local Data Dragon snapshots.
 *
 * The live payload only carries ids; the names, titles and icons come from the
 * static metadata. The repository ships a snapshot of that metadata in
 * `src/assets/`, which is used as the base, and the live static-data payload
 * (when the main process exposes it) refines it.
 *
 * @param {unknown} payload
 * @returns {{ champions: number, items: number, runes: number }}
 */
export function applyStaticData(payload) {
  const counts = { champions: 0, items: 0, runes: 0 };
  if (!payload) return counts;

  const pools = [];
  const visit = (node, depth) => {
    if (depth > 4 || node === null || node === undefined) return;
    if (Array.isArray(node)) {
      if (node.length) pools.push(node);
      return;
    }
    if (isObject(node)) {
      for (const value of Object.values(node)) visit(value, depth + 1);
    }
  };
  visit(payload, 0);

  for (const pool of pools) {
    const kind = classifyRecords(pool);
    if (!kind) continue;

    for (const record of pool) {
      if (!isObject(record)) continue;
      const id = toInt(firstNumber(record.id, record.champion_id, record.item_id, record.perk_id, record.rune_id));
      if (id === null) continue;

      if (kind === 'champion') {
        const existing = CHAMPIONS_BY_ID.get(id) || { id, key: null, name: null, title: null, blurb: null, tags: [], imageUrl: null };
        const merged = {
          ...existing,
          id,
          key: firstString(record.key, record.champion_key, existing.key),
          name: firstString(record.name, existing.name),
          title: firstString(record.title, existing.title),
          blurb: firstString(record.blurb, existing.blurb),
          tags: Array.isArray(record.tags) ? record.tags : existing.tags,
          imageUrl: firstString(record.image_url, record.imageUrl, record.square, existing.imageUrl),
        };
        CHAMPIONS_BY_ID.set(id, merged);
        if (merged.key) CHAMPIONS_BY_KEY.set(String(merged.key).toLowerCase(), merged);
        counts.champions += 1;
      } else if (kind === 'item') {
        const existing = ITEMS_BY_ID.get(id) || { id, name: null, description: null, plaintext: null, image: null };
        ITEMS_BY_ID.set(id, {
          ...existing,
          id,
          name: firstString(record.name, existing.name),
          description: firstString(record.description, existing.description),
          plaintext: firstString(record.plaintext, existing.plaintext),
        });
        counts.items += 1;
      } else {
        const existing = RUNES_BY_ID.get(id) || {
          id, name: null, key: null, shortDesc: '', longDesc: '', icon: null, styleId: null, styleName: null,
        };
        const styleId = toInt(firstNumber(record.page_id, record.style_id, existing.styleId));
        RUNES_BY_ID.set(id, {
          ...existing,
          id,
          name: firstString(record.name, existing.name),
          key: firstString(record.key, existing.key),
          shortDesc: stripHtml(firstString(record.short_desc, record.shortDesc, existing.shortDesc)),
          longDesc: stripHtml(firstString(record.long_desc, record.longDesc, existing.longDesc)),
          icon: firstString(record.image_url, record.icon, existing.icon),
          styleId,
          styleName: existing.styleName || (styleId !== null ? runeStyleById(styleId)?.name : null),
        });
        counts.runes += 1;
      }
    }
  }

  return counts;
}

/* -------------------------------------------------------------------------- */
/* Image URLs                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Data Dragon versions to try for a given patch string.
 * `16.20` → `['16.20.1', '16.20']`, `16.20.1` → `['16.20.1']`.
 */
export function ddragonVersions(version) {
  const raw = typeof version === 'string' ? version.trim() : '';
  if (!raw) return [];
  if (/^\d+\.\d+\.\d+$/.test(raw)) return [raw];
  if (/^\d+\.\d+$/.test(raw)) return [`${raw}.1`, raw];
  if (/^\d+$/.test(raw)) return [raw];
  return [];
}

const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';
const OP_CDN = 'https://opgg-static.akamaized.net/meta/images/lol/latest';

/**
 * Candidate URLs for a champion portrait, most specific first.
 * @returns {string[]}
 */
export function championImageUrls(champion, version) {
  const urls = [];
  const explicit = firstString(champion?.squareUrl, champion?.imageUrl);
  if (explicit) urls.push(explicit);
  const key = firstString(champion?.key);
  if (key) {
    for (const v of ddragonVersions(version)) urls.push(`${DDRAGON}/${v}/img/champion/${key}.png`);
    urls.push(`${OP_CDN}/champion/${key}.png`);
  }
  return urls;
}

/**
 * Candidate URLs for an item icon.
 * @returns {string[]}
 */
export function itemImageUrls(itemId, version) {
  const id = toInt(itemId);
  if (id === null) return [];
  const urls = [];
  for (const v of ddragonVersions(version)) urls.push(`${DDRAGON}/${v}/img/item/${id}.png`);
  urls.push(`${OP_CDN}/item/${id}.png`);
  return urls;
}

/**
 * Candidate URLs for a perk icon.
 *
 * The reference serves perks from the OP.GG CDN; Data Dragon no longer ships
 * the `perk-styles` tree (every `…/img/perk-styles/**` path answers 403), so
 * the Data Dragon pattern is kept as the fallback rather than the primary.
 * @returns {string[]}
 */
export function runeImageUrls(rune, version) {
  const urls = [];
  const id = toInt(rune?.id);
  const explicit = firstString(rune?.icon);
  if (explicit && /^https?:\/\//i.test(explicit)) urls.push(explicit);
  if (id !== null) {
    urls.push(`${OP_CDN}/perk/${id}.png`);
    const styleId = toInt(rune?.styleId);
    if (styleId !== null) {
      for (const v of ddragonVersions(version)) urls.push(`${DDRAGON}/${v}/img/perk-styles/${styleId}/${id}.png`);
    }
  }
  return urls;
}

/** Candidate URLs for a stat-shard icon. */
export function shardImageUrls(shardId) {
  const id = toInt(shardId);
  if (id === null) return [];
  return [`${OP_CDN}/perkShard/${id}.png`];
}

/* -------------------------------------------------------------------------- */
/* Tiers                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tier chip metadata.
 *
 * The API's `tier` is `0` for the "OP" tier and `1…5` for the five regular
 * tiers — the reference's own `optier-0.svg` is the red OP badge.
 * @param {unknown} tier
 * @returns {{ tier: number|null, label: string, token: string }}
 */
export function tierInfo(tier) {
  const n = toInt(tier);
  if (n === null) return { tier: null, label: '-', token: '--text-muted' };
  if (n <= 0) return { tier: 0, label: 'OP', token: '--tier-op' };
  const capped = Math.min(n, 5);
  return { tier: n, label: `Tier ${capped}`, token: `--tier-${capped}` };
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

/** Unwrap the `{ data, meta }` envelope the API uses. */
function unwrap(raw) {
  // The counter endpoint answers with a bare list of per-champion rows.
  if (Array.isArray(raw)) return { counters: raw };
  if (!isObject(raw)) return {};
  const inner = raw.data;
  if (Array.isArray(inner)) return { counters: inner };
  if (isObject(inner)
    && (inner.summary || inner.runes || inner.rune_pages || inner.core_items
      || inner.skills || inner.champion || inner.counters)) {
    return inner;
  }
  return raw;
}

/** Normalised stat block. */
function normalizeStats(source) {
  const s = isObject(source) ? source : {};
  const tierData = isObject(s.tier_data) ? s.tier_data : (isObject(s.tierData) ? s.tierData : {});
  return {
    tier: toInt(firstNumber(s.tier, tierData.tier)),
    tierRank: toInt(firstNumber(s.tier_rank, s.tierRank, s.rank, tierData.rank)),
    winRate: firstNumber(s.win_rate, s.winRate),
    pickRate: firstNumber(s.pick_rate, s.pickRate),
    banRate: firstNumber(s.ban_rate, s.banRate),
    matches: toInt(firstNumber(s.matches, s.play, s.games, s.game_count, s.match_count, s.total_games)),
    kda: firstNumber(s.kda, s.avg_kda, s.kda_ratio),
  };
}

/** Champion identity. */
function normalizeChampion(payload, options) {
  const sources = [
    payload.champion,
    payload.champion_info,
    payload.championInfo,
    payload.meta,
    payload.metaData,
    payload.meta_data,
    payload.profile,
    payload.summary && payload.summary.champion,
    payload,
  ].filter(isObject);

  let name = null;
  let title = null;
  let key = null;
  let imageUrl = null;
  let squareUrl = null;

  for (const source of sources) {
    name = name ?? firstString(source.name, source.champion_name, source.display_name, source.displayName);
    title = title ?? firstString(source.title, source.champion_title, source.subtitle);
    key = key ?? firstString(source.key, source.champion_key, source.championKey);
    imageUrl = imageUrl ?? firstString(source.image_url, source.imageUrl, source.img_url, source.image);
    squareUrl = squareUrl ?? firstString(source.square, source.square_image_url, source.squareUrl);
  }

  const id = toInt(firstNumber(
    options.championId,
    payload.champion && payload.champion.id,
    payload.summary && payload.summary.id,
    payload.id,
  ));

  const known = championById(id) || (key ? championByKey(key) : null);

  return {
    id,
    key: key || (known ? known.key : null),
    name: name || (known ? known.name : null),
    title: title || (known ? known.title : null),
    imageUrl,
    squareUrl,
  };
}

/** Position list, each entry carrying its own rates. */
function normalizePositions(payload) {
  const list = firstArray(
    payload.positions,
    payload.summary && payload.summary.positions,
    payload.stats && payload.stats.positions,
    payload.role_stats,
  ) || [];

  return list
    .map((entry) => {
      if (!isObject(entry)) return null;
      const nested = isObject(entry.stats) ? entry.stats : entry;
      const name = firstString(entry.name, entry.position, entry.lane, entry.role);
      return {
        name: name ? name.toUpperCase() : null,
        role: firstString(entry.role, entry.role_name),
        stats: normalizeStats(nested),
        counters: normalizeCounterList(firstArray(entry.counters, entry.counter_list)),
      };
    })
    .filter(Boolean);
}

/** One counter/matchup entry. */
function normalizeCounter(entry) {
  if (!isObject(entry)) return null;
  const championId = toInt(firstNumber(
    entry.champion_id, entry.championId, entry.id, entry.target_champion_id, entry.targetChampionId,
  ));
  if (championId === null) return null;

  const matches = toInt(firstNumber(entry.play, entry.matches, entry.games, entry.game_count, entry.count));
  const wins = toInt(firstNumber(entry.win, entry.wins));
  const explicitRate = firstNumber(entry.win_rate, entry.winRate, entry.counter_win_rate, entry.counterWinRate);

  let winRate = explicitRate;
  if (winRate === null && matches && wins !== null) winRate = wins / matches;

  const laneKill = toInt(firstNumber(entry.lane_kill, entry.laneKill, entry.lane_kills));
  const laneDeath = toInt(firstNumber(entry.lane_death, entry.laneDeath));
  let laneKillRate = firstNumber(entry.lane_kill_rate, entry.laneKillRate);
  if (laneKillRate === null && laneKill !== null && laneDeath !== null && (laneKill + laneDeath) > 0) {
    laneKillRate = laneKill / (laneKill + laneDeath);
  }

  const known = championById(championId);

  return {
    championId,
    name: firstString(entry.name, entry.champion_name) || (known ? known.name : null),
    key: known ? known.key : null,
    winRate,
    matches,
    wins,
    laneKillRate,
  };
}

/** Counter list, dropping malformed entries. */
function normalizeCounterList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCounter).filter(Boolean);
}

/** A single item set (starter / core / boots / situational). */
function normalizeItemSet(entry) {
  if (!isObject(entry)) return null;
  const rawIds = firstArray(entry.ids, entry.items, entry.item_ids, entry.itemIds);
  const ids = (rawIds || [])
    .map((value) => (isObject(value) ? toInt(firstNumber(value.id, value.item_id)) : toInt(value)))
    .filter((id) => id !== null && id > 0);
  if (!ids.length) return null;

  const matches = toInt(firstNumber(entry.play, entry.matches, entry.games, entry.count));
  const wins = toInt(firstNumber(entry.win, entry.wins));
  let winRate = firstNumber(entry.win_rate, entry.winRate);
  if (winRate === null && matches && wins !== null) winRate = wins / matches;

  return {
    ids,
    winRate,
    pickRate: firstNumber(entry.pick_rate, entry.pickRate),
    matches,
  };
}

/** Item-set list. */
function normalizeItemSets(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeItemSet).filter(Boolean);
}

/** One perk. */
function normalizePerk(raw, styleId) {
  const source = isObject(raw) ? raw : null;
  const id = source
    ? toInt(firstNumber(source.id, source.perk_id, source.perkId))
    : toInt(raw);
  if (id === null) return null;

  const known = runeById(id);
  const resolvedStyle = source
    ? toInt(firstNumber(source.style_id, source.styleId, source.page_id, source.pageId)) ?? styleId ?? null
    : (styleId ?? (known ? known.styleId : null));

  return {
    id,
    name: (source ? firstString(source.name, source.title) : null) || (known ? known.name : null),
    key: (source ? firstString(source.key) : null) || (known ? known.key : null),
    shortDesc: stripHtml((source ? firstString(source.short_desc, source.shortDesc, source.description) : null)
      || (known ? known.shortDesc : '')),
    longDesc: stripHtml((source ? firstString(source.long_desc, source.longDesc) : null)
      || (known ? known.longDesc : '')),
    icon: (source ? firstString(source.icon, source.image_url, source.imageUrl) : null)
      || (known ? known.icon : null),
    styleId: resolvedStyle,
    styleName: (resolvedStyle !== null ? runeStyleById(resolvedStyle)?.name : null) || (known ? known.styleName : null),
  };
}

/** One stat shard. */
function normalizeShard(raw) {
  const id = toInt(isObject(raw) ? firstNumber(raw.id, raw.shard_id) : raw);
  if (id === null) return null;
  const known = shardById(id);
  return {
    id,
    name: (isObject(raw) ? firstString(raw.name) : null) || (known ? known.name : null),
    icon: (isObject(raw) ? firstString(raw.icon, raw.image_url) : null) || null,
  };
}

/**
 * One rune page (keystone + primary rows + secondary rows + shards).
 */
function normalizeRunePage(raw) {
  if (!isObject(raw)) return null;

  const primaryTree = isObject(raw.primary) ? raw.primary : null;
  const secondaryTree = isObject(raw.secondary) ? raw.secondary : null;

  const primaryStyleId = toInt(firstNumber(
    raw.primary_page_id, raw.primaryPageId,
    primaryTree && firstNumber(primaryTree.id, primaryTree.style_id, primaryTree.styleId),
  ));
  const secondaryStyleId = toInt(firstNumber(
    raw.secondary_page_id, raw.secondaryPageId,
    secondaryTree && firstNumber(secondaryTree.id, secondaryTree.style_id, secondaryTree.styleId),
  ));

  const rawPrimary = firstArray(
    primaryTree && firstArray(primaryTree.perks, primaryTree.runes),
    raw.primary_rune_ids, raw.primaryRuneIds,
  ) || [];
  const rawSecondary = firstArray(
    secondaryTree && firstArray(secondaryTree.runes, secondaryTree.perks),
    raw.secondary_rune_ids, raw.secondaryRuneIds,
  ) || [];
  const rawShards = firstArray(
    raw.shards && firstArray(raw.shards.ids, raw.shards.perks),
    raw.stat_mod_ids, raw.statModIds, raw.stat_mods,
  ) || [];

  const primaryPerks = rawPrimary
    .map((perk) => normalizePerk(perk, primaryStyleId))
    .filter(Boolean);
  const secondaryPerks = rawSecondary
    .map((perk) => normalizePerk(perk, secondaryStyleId))
    .filter(Boolean);
  const shards = rawShards.map(normalizeShard).filter(Boolean);

  if (!primaryPerks.length && !secondaryPerks.length && !shards.length) return null;

  const play = toInt(firstNumber(raw.play, raw.matches, raw.games));
  const win = toInt(firstNumber(raw.win, raw.wins));
  let winRate = firstNumber(raw.win_rate, raw.winRate);
  if (winRate === null && play && win !== null) winRate = win / play;

  return {
    id: toInt(firstNumber(raw.id, raw.page_id)),
    primaryStyleId,
    secondaryStyleId,
    primaryPerks,
    secondaryPerks,
    shards,
    winRate,
    pickRate: firstNumber(raw.pick_rate, raw.pickRate),
    matches: play,
  };
}

/** All rune pages of a champion, most picked first. */
function normalizeRunes(payload) {
  const pages = [];

  const runePages = firstArray(payload.rune_pages, payload.runePages, payload.rune_page, payload.runePage);
  if (runePages) {
    for (const entry of runePages) {
      const builds = firstArray(entry && entry.builds);
      if (builds && builds.length) {
        for (const build of builds) {
          const page = normalizeRunePage(build);
          if (page) pages.push(page);
        }
      } else {
        const page = normalizeRunePage(entry);
        if (page) pages.push(page);
      }
    }
  }

  if (!pages.length) {
    const runes = firstArray(payload.runes, payload.build && payload.build.runes);
    if (runes) {
      for (const entry of runes) {
        const page = normalizeRunePage(entry);
        if (page) pages.push(page);
      }
    } else {
      const page = normalizeRunePage(payload.runes || payload.rune_page || (payload.build && payload.build.runes));
      if (page) pages.push(page);
    }
  }

  pages.sort((a, b) => (b.pickRate ?? -1) - (a.pickRate ?? -1));
  return pages;
}

/** Skill descriptors (`{ key, name, description, image_url }`). */
function isSkillDescriptor(entry) {
  if (!isObject(entry)) return false;
  if (Array.isArray(entry.order)) return false;
  return Boolean(firstString(entry.key, entry.skill_key, entry.skillKey, entry.name, entry.title));
}

/**
 * Skill order, level chips and the skill-point sequence.
 */
function normalizeSkills(payload) {
  const rawSkills = firstArray(payload.skills, payload.skill_builds, payload.skillBuilds) || [];
  const descriptors = rawSkills.filter(isSkillDescriptor);

  const masteries = firstArray(payload.skill_masteries, payload.skillMasteries, payload.masteries) || [];
  const mastery = isObject(masteries[0]) ? masteries[0] : null;

  const orderSource = rawSkills.find((entry) => isObject(entry) && Array.isArray(entry.order))
    || (mastery && isObject(mastery.builds) ? mastery.builds[0] : null);

  const sequence = (firstArray(
    orderSource && orderSource.order,
    payload.skill_order, payload.skillOrder, payload.order,
  ) || []).map((key) => String(key).toUpperCase()).filter(Boolean);

  const maxOrder = (firstArray(
    mastery && mastery.ids,
    payload.mastery_order, payload.max_order,
  ) || []).map((key) => String(key).toUpperCase()).filter(Boolean);

  const levels = { Q: [], W: [], E: [], R: [] };
  sequence.forEach((key, index) => {
    if (levels[key]) levels[key].push(index + 1);
  });

  const skills = ['Q', 'W', 'E', 'R'].map((key) => {
    const descriptor = descriptors.find((entry) => {
      const entryKey = firstString(entry.key, entry.skill_key, entry.skillKey);
      return entryKey ? entryKey.toUpperCase() === key : false;
    });
    return {
      key,
      levels: levels[key] || [],
      name: descriptor ? firstString(descriptor.name, descriptor.title) : null,
      description: descriptor ? stripHtml(firstString(descriptor.description, descriptor.desc, descriptor.short_desc)) : null,
      imageUrl: descriptor ? firstString(descriptor.image_url, descriptor.imageUrl, descriptor.icon) : null,
    };
  });

  return {
    order: maxOrder.length ? maxOrder : sequence.slice(0, 3),
    sequence,
    levels,
    skills,
    pickRate: firstNumber(mastery && mastery.pick_rate, payload.skill_pick_rate),
  };
}

/** Build (item) sections. */
function normalizeBuilds(payload) {
  return {
    starters: normalizeItemSets(firstArray(
      payload.starter_items, payload.starterItems, payload.start_items, payload.startItems, payload.starters,
    )),
    core: normalizeItemSets(firstArray(
      payload.core_items, payload.coreItems, payload.core_builds, payload.items, payload.recommended_items,
    )),
    boots: normalizeItemSets(firstArray(
      payload.boots, payload.suggestion_boots, payload.suggestionBoots, payload.boots_items,
    )),
    last: normalizeItemSets(firstArray(
      payload.last_items, payload.lastItems, payload.situational_items, payload.situationalItems, payload.extra_items,
    )),
  };
}

/** Summoner spells — the payload only carries Data Dragon ids. */
function normalizeSummonerSpells(payload) {
  const list = firstArray(payload.summoner_spells, payload.summonerSpells) || [];
  return list
    .map((entry) => {
      if (!isObject(entry)) return null;
      const ids = firstArray(entry.ids) || [];
      const spellIds = ids.map((id) => toInt(id)).filter((id) => id !== null);
      if (!spellIds.length) return null;
      return {
        ids: spellIds,
        winRate: firstNumber(entry.win_rate, entry.winRate),
        pickRate: firstNumber(entry.pick_rate, entry.pickRate),
        matches: toInt(firstNumber(entry.play, entry.matches, entry.games)),
      };
    })
    .filter(Boolean);
}

/** Champion roles inside a position (FIGHTER, MARKSMAN …). */
function normalizeRoles(payload) {
  const sources = [];
  const summary = isObject(payload.summary) ? payload.summary : {};
  if (Array.isArray(summary.roles)) sources.push(...summary.roles);

  const positions = firstArray(payload.positions, summary.positions) || [];
  for (const position of positions) {
    if (isObject(position) && Array.isArray(position.roles)) sources.push(...position.roles);
  }

  return sources
    .map((entry) => {
      if (!isObject(entry)) return null;
      const stats = isObject(entry.stats) ? entry.stats : entry;
      return {
        name: firstString(entry.name, entry.role),
        winRate: firstNumber(stats.win_rate, stats.winRate),
        roleRate: firstNumber(stats.role_rate, stats.roleRate),
        matches: toInt(firstNumber(stats.play, stats.matches, stats.games)),
      };
    })
    .filter((entry) => entry && entry.name);
}

/** Patch trend — win rate per game version. */
function normalizeTrends(payload) {
  const list = firstArray(payload.trends) || [];
  const points = [];
  for (const entry of list) {
    if (!isObject(entry)) continue;
    const series = firstArray(entry.win, entry.win_rate, entry.rates) || [];
    for (const point of series) {
      if (!isObject(point)) continue;
      const rate = firstNumber(point.rate, point.win_rate, point.winRate);
      if (rate === null) continue;
      points.push({
        version: firstString(point.version, point.patch),
        rate,
        rank: toInt(firstNumber(point.rank)),
      });
    }
  }
  return points;
}

/**
 * Strong / weak counters.
 *
 * The live payload only ships a flat `counters[]` list; the split follows the
 * reference (win rate ≥ 50 % ⇒ strong, otherwise weak).
 */
function normalizeCounters(payload, positions) {
  const strongSource = firstArray(payload.strong_against, payload.strongAgainst);
  const weakSource = firstArray(payload.weak_against, payload.weakAgainst);

  let strong = normalizeCounterList(strongSource);
  let weak = normalizeCounterList(weakSource);

  if (!strong.length && !weak.length) {
    const flat = normalizeCounterList(firstArray(
      payload.counters,
      payload.summary && payload.summary.counters,
      positions[0] && positions[0].counters,
    ));
    strong = flat.filter((entry) => (entry.winRate ?? 0) >= 0.5);
    weak = flat.filter((entry) => (entry.winRate ?? 0) < 0.5);
  }

  // Worst counters first, best counters first — the reference's ordering.
  weak = [...weak].sort((a, b) => (a.winRate ?? 0) - (b.winRate ?? 0));
  strong = [...strong].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));

  return { strong, weak, all: [...strong, ...weak] };
}

/**
 * Lane-kill rates keyed by champion id.
 *
 * The lane-kill counters live in the dedicated counter document
 * (`…/{championId}/{lane}/counters/{enemyId}`), whose rows carry
 * `lane_kill` / `lane_death`; the rate is `lane_kill / (lane_kill + lane_death)`.
 *
 * @param {unknown} raw
 * @returns {Map<number, number>}
 */
export function extractLaneKillRates(raw) {
  const rates = new Map();
  const payload = unwrap(raw);
  const list = firstArray(payload.counters, payload.data, payload) || [];
  for (const entry of list) {
    const counter = normalizeCounter(entry);
    if (counter && counter.laneKillRate !== null) rates.set(counter.championId, counter.laneKillRate);
  }
  return rates;
}

/**
 * Normalise the whole champion-detail document.
 *
 * @param {unknown} raw - whatever `ctx.api.championDetail()` resolved to.
 * @param {{ championId?: number|string, position?: string, version?: string, tier?: string, mode?: string }} [options]
 * @returns {object} the canonical model consumed by the panels.
 */
/**
 * Adapt the main process's already-normalised champion-detail payload into the
 * raw shape the normalisers above understand.
 *
 * The main process owns the API contract (`opgg:champion-detail`), so the
 * renderer receives `{ champion, stats, runes, build, skills, counters }`
 * rather than the raw endpoint payload. This maps that shape back onto the
 * endpoint's field names so one set of normalisers serves both.
 *
 * @param {unknown} payload
 * @returns {unknown}
 */
function fromMainProcessDetail(payload) {
  if (!isObject(payload)) return payload;
  // Already raw (an endpoint payload) — nothing to do.
  if (!isObject(payload.champion) || !isObject(payload.build)) return payload;

  const build = payload.build;
  const runes = isObject(payload.runes) ? payload.runes : {};
  const primary = isObject(runes.primary) ? runes.primary : {};
  const secondary = isObject(runes.secondary) ? runes.secondary : {};
  const shards = Array.isArray(runes.shards) ? runes.shards : [];
  const counters = isObject(payload.counters) ? payload.counters : {};
  const skillOrders = Array.isArray(payload.skillOrders) ? payload.skillOrders : [];
  const order = skillOrders.length && Array.isArray(skillOrders[0].order)
    ? skillOrders[0].order
    : [];

  return {
    champion: payload.champion,
    summary: { id: payload.champion.id, average_stats: payload.stats },
    stats: payload.stats,
    rune_pages: [{
      id: primary.styleId,
      primary_rune_ids: (primary.perks || []).map((perk) => perk.id),
      secondary_rune_ids: (secondary.perks || []).map((perk) => perk.id),
      stat_mod_ids: shards.map((shard) => shard.id),
      pick_rate: payload.stats ? payload.stats.pickRate : null,
    }],
    starter_items: build.starterItems || [],
    core_items: build.coreItems || [],
    boots: build.boots || [],
    last_items: build.situationalItems || build.lastItems || [],
    skills: payload.skills || [],
    skill_masteries: order.length ? [{ ids: order, pick_rate: skillOrders[0].pickRate }] : [],
    counters: [...(counters.strong || []), ...(counters.weak || [])],
    summoner_spells: payload.summonerSpells || [],
    trends: payload.trends || [],
  };
}

export function normalizeChampionDetail(raw, options = {}) {
  const payload = fromMainProcessDetail(unwrap(raw));
  const meta = isObject(raw) && isObject(raw.meta) ? raw.meta : {};

  const champion = normalizeChampion(payload, options);

  const summary = isObject(payload.summary) ? payload.summary : {};
  const averageStats = normalizeStats(
    firstArray(summary.average_stats, summary.averageStats) ? summary.average_stats
      : (summary.averageStats || summary.stats),
  );

  const positions = normalizePositions(payload);
  const position = normalizePosition(options.position)
    || normalizePosition(payload.position)
    || normalizePosition(payload.lane)
    || (positions[0] ? normalizePosition(positions[0].name) : null);

  const positionStats = positions.find((entry) => normalizePosition(entry.name) === position);

  // The endpoint is per lane: when the requested lane carries no statistics
  // the champion's `average_stats` are used instead and the UI says so.
  const laneFallback = options.laneFallback !== undefined
    ? Boolean(options.laneFallback)
    : Boolean(position) && !positionStats;
  const stats = normalizeStats(
    positionStats ? positionStats.stats : (summary.stats || summary.average_stats || payload.stats),
  );

  const runes = normalizeRunes(payload);
  const builds = normalizeBuilds(payload);
  const skills = normalizeSkills(payload);
  const counters = normalizeCounters(payload, positions);
  const summonerSpells = normalizeSummonerSpells(payload);
  const roles = normalizeRoles(payload);
  const trends = normalizeTrends(payload);

  const version = firstString(options.version, meta.version, payload.version, payload.patch);

  return {
    champion,
    position,
    laneFallback,
    tier: options.tier || null,
    mode: options.mode || null,
    version,
    stats: {
      tier: stats.tier ?? averageStats.tier,
      tierRank: stats.tierRank ?? averageStats.tierRank,
      winRate: stats.winRate ?? averageStats.winRate,
      pickRate: stats.pickRate ?? averageStats.pickRate,
      banRate: stats.banRate ?? averageStats.banRate,
      matches: stats.matches ?? averageStats.matches,
      kda: stats.kda ?? averageStats.kda,
    },
    average: averageStats,
    positions,
    roles,
    runes,
    builds,
    skills,
    summonerSpells,
    trends,
    counters,
    matchups: counters.all,
    hasData: Boolean(
      positions.length
      || runes.length
      || builds.core.length
      || builds.starters.length
      || builds.boots.length
      || builds.last.length
      || counters.all.length
      || skills.sequence.length
      || (isObject(summary) && Object.keys(summary).length > 0),
    ),
  };
}

export default {
  POSITIONS,
  normalizePosition,
  normalizeChampionDetail,
  applyStaticData,
  tierInfo,
  championById,
  championByKey,
  itemById,
  runeById,
  shardById,
  runeStyleById,
  championImageUrls,
  itemImageUrls,
  runeImageUrls,
  shardImageUrls,
  stripHtml,
  formatRate,
  formatCount,
};
