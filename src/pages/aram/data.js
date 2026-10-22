/**
 * ARAM tier list — page-local data shaping.
 *
 * The ARAM tier list is the ranked tier list filled with the ARAM queue's own
 * data. `ctx.api.modeTierList('aram')` answers with
 *
 *   { ok: true, mode: 'aram', patch, updatedAt, cached,
 *     rows: [ { id, key, name, title, squareImageUrl, imageUrl,
 *                tier: 'Tier 2', tierRank, winRate, pickRate, banRate,
 *                matches, kda, roles, rank, rankChange, counters,
 *                positions: [] } ] }
 *
 * Three things make ARAM different from the ranked list, and all three are
 * handled here — the page never reuses the ranked page's lane logic:
 *
 *   1. **There are no lanes.** The ARAM payload's `positions` is `null`, so
 *      there is no lane filter and no lane column; every row falls back to
 *      its `average_stats` (the league-wide numbers).
 *   2. **There are no bans.** ARAM has no ban phase, so the ban rate is never
 *      rendered; the seventh column carries the ARAM balance tag instead.
 *   3. **Every champion has a balance row.** `ctx.api.aramBalance({})` answers
 *      with one row of per-stat percentages against the reference champion
 *      (100 % = the baseline); the buff / nerf tag is derived from it.
 *
 * The normaliser is deliberately tolerant: the tier-list endpoint has changed
 * shape several times (bare array / `{ data: [...] }` / `{ rows: [...] }`) and
 * the main process hands back an already-flattened row set, so every field is
 * looked up through a small list of aliases.
 *
 * Everything in this module is pure — no DOM, no network, no store.
 */

/* -------------------------------------------------------------------------
 * Shared data helpers
 * ---------------------------------------------------------------------- */

import {
  championPortrait,
  normalizeRates,
  normalizeTier,
  resolveChampion,
} from '../../data/index.js';

/* -------------------------------------------------------------------------
 * Option catalogues
 * ---------------------------------------------------------------------- */

/**
 * The seven columns of the ARAM tier list.
 *
 * The widths are the reference's own (`18 / 32 / 219 / 48 / 94` px) and they
 * map onto the reference's modifier classes `…-column__1` … `…-column__5`, so
 * the ARAM list is the very same div grid as the ranked one.
 *
 * The second column is the 32px slot the ranked list uses for the rank
 * movement indicator. ARAM has **no lanes**, so there is no lane / role icon
 * in it — the slot carries the rank movement instead, exactly like the
 * ranked list does.
 */
export const COLUMNS = [
  { id: 'rank', label: '#', width: 18, sortable: true, defaultDirection: 'asc' },
  { id: 'rankChange', label: '', width: 32, sortable: false },
  { id: 'champion', labelKey: 'lol.champions.champion', fallback: 'Champion', width: 219, sortable: true, defaultDirection: 'asc' },
  { id: 'tier', labelKey: 'lol.champions.tier', fallback: 'Tier', width: 48, sortable: true, defaultDirection: 'asc' },
  { id: 'winRate', labelKey: 'lol.champions.win-rate', fallback: 'Win Rate', width: 94, sortable: true, defaultDirection: 'desc' },
  { id: 'pickRate', labelKey: 'lol.champions.pick-rate', fallback: 'Pick Rate', width: 94, sortable: true, defaultDirection: 'desc' },
  // The balance column replaces the ranked list's ban rate. The reference
  // catalogue has no key for a "balance" column header (the balance string
  // it does have — `lol.common.gameMode.balance.title` — is the section
  // title of the Game modes screen), so the header carries a literal label.
  { id: 'balance', label: 'Balance', width: 94, sortable: false },
];

/**
 * The balance ratios of the ARAM balance payload.
 *
 * Every value is a **percentage against the reference champion** — `100` is
 * the baseline — so the values are never scaled again. Cooldown reduction and
 * tenacity are *bonuses* on top of the baseline, so their baseline is `0`
 * (that is what the upstream payload sends).
 */
export const BALANCE_STATS = [
  {
    id: 'attackSpeed',
    labelKey: 'lol.common.gameMode.balance.attack_speed',
    fallback: 'Attack Speed',
    baseline: 100,
  },
  {
    id: 'damageDealt',
    labelKey: 'lol.common.gameMode.balance.damage_dealt',
    fallback: 'Damage Dealt',
    baseline: 100,
  },
  {
    id: 'damageTaken',
    labelKey: 'lol.common.gameMode.balance.damage_taken',
    fallback: 'Damage Taken',
    baseline: 100,
  },
  {
    id: 'cooldownReduction',
    labelKey: 'lol.common.gameMode.balance.cooldown_reduction',
    fallback: 'Cooldown Reduction',
    baseline: 0,
  },
  {
    id: 'healing',
    labelKey: 'lol.common.gameMode.balance.healing',
    fallback: 'Healing',
    baseline: 100,
  },
  {
    id: 'tenacity',
    labelKey: 'lol.common.gameMode.balance.tenacity',
    fallback: 'Tenacity',
    baseline: 0,
  },
  {
    id: 'shieldAmount',
    labelKey: 'lol.common.gameMode.balance.shield_amount',
    fallback: 'Shield Amount',
    baseline: 100,
  },
  {
    id: 'energyRegen',
    labelKey: 'lol.common.gameMode.balance.energy_regen',
    fallback: 'Energy Regen',
    baseline: 100,
  },
  {
    // The reference catalogue has no key for the area-of-effect ratio.
    id: 'areaOfEffectDamage',
    label: 'Area of Effect Damage',
    baseline: 100,
  },
];

/** The two balance tags the tier list can carry. */
export const TAG_BUFF = 'buff';
export const TAG_NERF = 'nerf';

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

/* -------------------------------------------------------------------------
 * Payload extraction
 * ---------------------------------------------------------------------- */

/**
 * Extract the row array out of any of the accepted payload shapes.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
export function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [payload.data, payload.rows, payload.champions, payload.list, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      const nested = extractRows(candidate);
      if (nested.length) return nested;
    }
  }
  return [];
}

/**
 * Extract the payload meta block (the patch version and the analysis time).
 *
 * The main process answers with `{ ok, mode, patch, updatedAt, cached, rows }`;
 * the raw API nests the version under `meta`.
 *
 * @param {*} payload
 * @returns {{version:string|null, updatedAt:string|null}}
 */
export function extractMeta(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { version: null, updatedAt: null };
  }

  const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : payload;

  return {
    version: firstDefined(meta.version, meta.patch, meta.patch_version) || null,
    updatedAt: firstDefined(meta.analyzed_at, meta.analyzedAt, meta.updatedAt, meta.cached_at) || null,
  };
}

/* -------------------------------------------------------------------------
 * Row normalisation
 * ---------------------------------------------------------------------- */

/** The ARAM roles of a row (`TANK`, `MARKSMAN`, `MAGE`, …). */
function normalizeRoles(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const names = [];

  for (const entry of list) {
    if (typeof entry === 'string') {
      const value = entry.trim();
      if (value && !names.includes(value)) names.push(value);
      continue;
    }
    if (entry && typeof entry === 'object') {
      const value = firstDefined(entry.name, entry.role, entry.role_name);
      if (typeof value === 'string' && value.trim() && !names.includes(value.trim())) {
        names.push(value.trim());
      }
    }
  }

  return names;
}

/**
 * Normalise one champion row of the ARAM tier list.
 *
 * ARAM has no lanes, so the row's numbers always come from its
 * `average_stats` — the lane-scoped `positions` are never consulted.
 *
 * @param {object} raw - the row as delivered by the main process.
 * @returns {object|null} the normalised row, or `null` when the row carries
 *                       no usable champion identity at all.
 */
export function normalizeRow(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = toNumber(firstDefined(raw.id, raw.champion_id, raw.championId));

  // `key` doubles as the image key (a champion name such as "Aatrox"); the
  // numeric Data Dragon key ("266") is not usable for a URL, so it is skipped.
  const rawKey = firstDefined(raw.key, raw.champion_key, raw.championKey, raw.image_key);
  const key = typeof rawKey === 'string' && rawKey && !/^\d+$/.test(rawKey) ? rawKey : null;

  const resolved = resolveChampion(key ? { key } : (id !== null ? { id } : null));

  const name = firstDefined(
    raw.name,
    raw.champion_name,
    raw.championName,
    raw.champion?.name,
    resolved && resolved.name,
    key,
  ) || '';

  if (id === null && !name) return null;

  // ---- stats --------------------------------------------------------------
  // ARAM has no lanes: `positions` is `null`, so the league-wide averages are
  // the only numbers the row has.
  const average = (raw.average_stats && typeof raw.average_stats === 'object')
    ? raw.average_stats
    : (raw.averageStats && typeof raw.averageStats === 'object' ? raw.averageStats : {});

  const stats = Object.keys(average).length ? average : raw;

  const tierData = (stats.tier_data && typeof stats.tier_data === 'object')
    ? stats.tier_data
    : ((stats.tierData && typeof stats.tierData === 'object')
      ? stats.tierData
      : ((average.tier_data && typeof average.tier_data === 'object') ? average.tier_data : {}));

  // ---- tier ---------------------------------------------------------------
  const tierSource = firstDefined(
    raw.tier,
    raw.tier_name,
    raw.tierName,
    raw.tierLabel,
    tierData.tier,
    stats.tier,
    average.tier,
  );

  const tierInfo = tierSource === undefined ? null : normalizeTier(tierSource);
  let tierBucket = tierInfo ? tierInfo.tierRank : null;
  // The main process hands the tier back as a label (`'OP'`, `'Tier 2'` …),
  // the raw API as a number (2) — the label is then the normalised one.
  let tier = tierSource === undefined
    ? ''
    : (typeof tierSource === 'number' ? (tierInfo ? tierInfo.tier : '') : String(tierSource).trim());
  if (tierInfo && !tier) tier = tierInfo.tier;

  // ---- rank ---------------------------------------------------------------
  const rank = toNumber(firstDefined(
    raw.rank,
    raw.tierRank,
    raw.tier_rank,
    tierData.rank,
    stats.rank,
    average.rank,
  ));

  // ---- rank movement ------------------------------------------------------
  let rankChange = toNumber(firstDefined(raw.rank_change, raw.rankChange, raw.rank_diff, raw.rankDiff));
  if (rankChange === null) {
    const previous = toNumber(firstDefined(tierData.rank_prev, tierData.rankPrev));
    if (previous !== null && rank !== null) rankChange = previous - rank;
  }

  // The reference promotes the very top of Tier 1 to "OP" (the tier the
  // "OP champions" screen lists). The main process already does it for the
  // rows it hands back; doing it here as well keeps the raw payload honest.
  if (tierBucket === 1 && rank !== null && rank > 0 && rank <= 3) {
    tierBucket = 0;
    tier = 'OP';
  }

  // ---- rates --------------------------------------------------------------
  // ARAM has no bans: the ban rate is never read and never rendered.
  const winRate = normalizeRates(firstDefined(
    raw.win_rate, raw.winRate, stats.win_rate, average.win_rate,
  ));
  const pickRate = normalizeRates(firstDefined(
    raw.pick_rate, raw.pickRate, stats.pick_rate, average.pick_rate,
  ));
  const matches = toNumber(firstDefined(
    raw.matches, raw.play, raw.games, stats.play, average.play,
  ));
  const kda = toNumber(firstDefined(raw.kda, stats.kda, average.kda));

  return {
    id,
    key: key || (resolved && resolved.key) || null,
    name,
    title: firstDefined(raw.title, raw.champion_title, raw.champion?.title, resolved && resolved.title) || '',
    squareImageUrl: firstDefined(raw.squareImageUrl, raw.square_image_url) || null,
    imageUrl: firstDefined(raw.imageUrl, raw.image_url) || null,
    tier,
    tierBucket,
    rank,
    rankChange: rankChange ?? null,
    roles: normalizeRoles(firstDefined(raw.roles, raw.role_stats)),
    winRate,
    pickRate,
    matches,
    kda,
  };
}

/**
 * Normalise a whole payload into ARAM tier-list rows.
 *
 * @param {*} payload - whatever `ctx.api.modeTierList('aram')` resolved with.
 * @returns {Array<object>}
 */
export function normalizeRows(payload) {
  return extractRows(payload)
    .map((raw) => normalizeRow(raw))
    .filter(Boolean);
}

/* -------------------------------------------------------------------------
 * ARAM balance
 * ---------------------------------------------------------------------- */

/** The field aliases of every balance ratio, in priority order. */
const BALANCE_ALIASES = {
  attackSpeed: ['attackSpeed', 'attack_speed'],
  damageDealt: ['damageDealt', 'damage_dealt'],
  damageTaken: ['damageTaken', 'damage_taken'],
  cooldownReduction: ['cooldownReduction', 'cooldown_reduction'],
  healing: ['healing'],
  tenacity: ['tenacity'],
  shieldAmount: ['shieldAmount', 'shield_amount'],
  energyRegen: ['energyRegen', 'energy_regen'],
  areaOfEffectDamage: ['areaOfEffectDamage', 'area_of_effect_damage'],
};

/**
 * Normalise one balance row.
 *
 * A row without a numeric champion id cannot be attached to a champion and is
 * dropped; every other row survives, even when one of its ratios is missing —
 * a missing ratio stays `null` and is rendered as "no data", never as a zero.
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function normalizeBalanceRow(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const championId = toNumber(firstDefined(raw.championId, raw.champion_id, raw.id));
  if (championId === null) return null;

  const row = { championId };

  for (const stat of BALANCE_STATS) {
    const aliases = BALANCE_ALIASES[stat.id] || [stat.id];
    let value;
    for (const alias of aliases) {
      value = firstDefined(raw[alias]);
      if (value !== undefined) break;
    }
    row[stat.id] = toNumber(value);
  }

  row.isDefault = Boolean(firstDefined(raw.default, raw.isDefault, raw.is_default));

  return row;
}

/**
 * Normalise the balance payload into an index keyed by champion id.
 *
 * @param {*} payload - whatever `ctx.api.aramBalance({})` resolved with.
 * @returns {Map<number, object>}
 */
export function normalizeBalance(payload) {
  const index = new Map();

  for (const raw of extractRows(payload)) {
    const row = normalizeBalanceRow(raw);
    if (!row) continue;
    index.set(row.championId, row);
  }

  return index;
}

/**
 * Derive the buff / nerf tag of a balance row.
 *
 * The balance numbers are percentages against the **reference champion** of
 * the mode: `100` is the baseline. The headline change is the sum of the two
 * headline columns, each measured against its own baseline:
 *
 *   `net = (damage dealt - 100) + (100 - damage taken)`
 *
 * Dealing more damage is a buff; taking more damage is a nerf, so the second
 * term is inverted. A champion whose numbers are all exactly at the baseline
 * has no headline change at all and gets **no** tag — and a champion without a
 * balance row never gets one either. Nothing is ever invented.
 *
 * @param {object|null} balance - a normalised balance row.
 * @returns {{kind:string, net:number, dominant:string, dominantDelta:number}|null}
 */
export function balanceTag(balance) {
  if (!balance) return null;

  const dealt = balance.damageDealt;
  const taken = balance.damageTaken;
  if (dealt === null || taken === null) return null;

  // Every ratio is at its baseline — there is no change to report.
  const atBaseline = BALANCE_STATS.every((stat) => {
    const value = balance[stat.id];
    return value === null || value === stat.baseline;
  });
  if (atBaseline) return null;

  const dealtDelta = dealt - 100;
  const takenDelta = 100 - taken;
  const net = dealtDelta + takenDelta;

  // The two headline numbers cancel each other out — no headline change.
  if (net === 0) return null;

  const dominant = Math.abs(dealtDelta) >= Math.abs(takenDelta)
    ? 'damageDealt'
    : 'damageTaken';

  return {
    kind: net > 0 ? TAG_BUFF : TAG_NERF,
    net,
    dominant,
    dominantDelta: dominant === 'damageDealt' ? dealtDelta : takenDelta,
  };
}

/* -------------------------------------------------------------------------
 * Images
 * ---------------------------------------------------------------------- */

/**
 * Portrait URL of a champion row.
 *
 * The shared `championPortrait()` helper builds the OP.GG CDN URL (and
 * resizes it), so the page never has to know a CDN pattern. The payload's own
 * URL is the fallback.
 *
 * @param {object} row
 * @param {number} [size=32]
 * @returns {string|null}
 */
export function portraitUrl(row, size = 32) {
  if (!row) return null;

  if (row.key) {
    const url = championPortrait({ key: row.key }, size);
    if (url) return url;
  }

  return firstDefined(row.squareImageUrl, row.imageUrl) || null;
}

/* -------------------------------------------------------------------------
 * Sorting
 * ---------------------------------------------------------------------- */

/** Compare two rows for one column. */
function compareRows(column, a, b) {
  switch (column) {
    case 'rank': {
      const av = a.rank ?? Number.MAX_SAFE_INTEGER;
      const bv = b.rank ?? Number.MAX_SAFE_INTEGER;
      return av - bv;
    }
    case 'champion':
      return String(a.name || '').localeCompare(String(b.name || ''), 'en');
    case 'tier': {
      const av = a.tierBucket ?? 9;
      const bv = b.tierBucket ?? 9;
      if (av !== bv) return av - bv;
      return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
    }
    case 'winRate':
      return (a.winRate ?? -1) - (b.winRate ?? -1);
    case 'pickRate':
      return (a.pickRate ?? -1) - (b.pickRate ?? -1);
    default:
      return 0;
  }
}

/**
 * Sort rows client-side.
 *
 * The direction only applies to the primary column; ties always fall back to
 * the OP.GG rank and then to the champion name so the order stays stable.
 *
 * @param {Array<object>} rows
 * @param {{column:string,direction:string}} [sort]
 * @returns {Array<object>}
 */
export function sortRows(rows, sort) {
  const column = (sort && sort.column) || 'rank';
  const direction = sort && sort.direction === 'desc' ? -1 : 1;

  return rows.slice().sort((a, b) => {
    const primary = compareRows(column, a, b);
    if (primary !== 0) return primary * direction;
    const byRank = (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
    if (byRank !== 0) return byRank;
    return String(a.name || '').localeCompare(String(b.name || ''), 'en');
  });
}

/** Default sort direction when a column becomes active for the first time. */
export function defaultDirection(column) {
  const definition = COLUMNS.find((entry) => entry.id === column);
  return definition ? definition.defaultDirection : 'asc';
}

/**
 * The rows the current search term lets through.
 *
 * @param {Array<object>} rows
 * @param {string} query
 * @returns {Array<object>}
 */
export function filterRows(rows, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => String(row.name || '').toLowerCase().includes(needle));
}
