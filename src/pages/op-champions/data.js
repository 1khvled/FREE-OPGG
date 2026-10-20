/**
 * OP Champions screen — page-local data shaping.
 *
 * The reference's "OP champions" screen (`/lol/live-op-champions/v2`) lists the
 * champions of the **OP tier** — tier 0, the very top of the ladder.
 *
 * There is **no dedicated endpoint**: the screen reuses the champion tier list
 * (`ctx.api.champions`) and keeps what the API itself marks as `OP`. The main
 * process maps the numeric tier 0 to the label `'OP'` and hands back the
 * tier's own rank as `tierRank`.
 *
 * Where the OP tier lives
 * -----------------------
 * The API marks the leading champion of a lane as `OP`, and the marker sits in
 * that lane's own tier data (`positions[].tier`). Which lane leaders carry
 * the marker depends on the rank band the list is read for: with `all` the
 * lane leader is `Tier 1`, with `emerald_plus` it is `OP`, with `challenger`
 * it is `OP` again. The screen therefore reads the tier list of the high rank
 * bands (see `OP_TIER_BANDS`) and merges everything the API marks as `OP` —
 * nothing is invented and no row is promoted by a local heuristic.
 *
 * Everything in this module is pure — it turns whatever the main process
 * returned into the row shape the table renders and it owns the option
 * catalogues (roles, columns, tier grades). No DOM, no network, no store.
 *
 * The normaliser is deliberately tolerant: the tier-list endpoint has changed
 * shape several times (bare array / `{ data: [...] }` / `{ rows: [...] }`) and
 * the desktop main process may hand back either the raw OP.GG payload or an
 * already-flattened row set, so every field is looked up through a small list
 * of aliases.
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
 * Role tabs — the reference's lane tabs.
 *
 * The values are the OP.GG lane codes and they are also the `position` the
 * tier-list endpoint expects, which is what makes the per-lane tier (and
 * therefore the per-lane OP tier) resolve.
 */
export const ROLE_TABS = [
  { value: 'TOP', labelKey: 'lol.common.lane.top', fallback: 'Top' },
  { value: 'JUNGLE', labelKey: 'lol.common.lane.jungle', fallback: 'Jungle' },
  { value: 'MID', labelKey: 'lol.common.lane.mid', fallback: 'Middle' },
  // The reference desktop app labels the ADC slot "Bottom", not "AD Carry".
  { value: 'ADC', labelKey: 'lol.common.lane.bottom', fallback: 'Bottom' },
  { value: 'SUPPORT', labelKey: 'lol.common.lane.support', fallback: 'Support' },
];

/** The tab that is active when the store carries no role (or the "All" role). */
export const DEFAULT_ROLE = ROLE_TABS[0].value;

/** The label of the tier that sits at the top of the ladder. */
export const OP_TIER = 'OP';

/**
 * The rank bands the OP tier is read from.
 *
 * The API only marks a lane leader as `OP` for some of the bands, so the
 * screen reads the high bands — the ones the reference's own tier list offers
 * — and merges their answers. `all` is the reference's "All Tiers" option and
 * is read as well, so a band that is not listed here still contributes.
 */
export const OP_TIER_BANDS = [
  'all',
  'emerald_plus',
  'master_plus',
  'challenger',
];

/**
 * Table columns — the seven columns of the desktop tier list.
 *
 * The widths are the reference's own (`18 / 32 / 219 / 48 / 94` px) and they
 * map onto the reference's modifier classes `…-column__1` … `…-column__5`.
 */
export const COLUMNS = [
  { id: 'rank', label: '#', width: 18, sortable: true, defaultDirection: 'asc' },
  // The role icon column carries no label in the reference.
  { id: 'role', label: '', width: 32, sortable: false },
  { id: 'champion', labelKey: 'lol.champions.champion', fallback: 'Champion', width: 219, sortable: true, defaultDirection: 'asc' },
  { id: 'tier', labelKey: 'lol.champions.tier', fallback: 'Tier', width: 48, sortable: true, defaultDirection: 'asc' },
  { id: 'winRate', labelKey: 'lol.champions.win-rate', fallback: 'Win Rate', width: 94, sortable: true, defaultDirection: 'desc' },
  { id: 'pickRate', labelKey: 'lol.champions.pick-rate', fallback: 'Pick Rate', width: 94, sortable: true, defaultDirection: 'desc' },
  { id: 'banRate', labelKey: 'lol.champions.ban-rate', fallback: 'Ban Rate', width: 94, sortable: true, defaultDirection: 'desc' },
];

/**
 * Letter grades — the scale the in-game overlay uses.
 *
 * OP.GG's own tier list numbers its buckets 1..5 (0 is the "OP" tier), but
 * the overlay has always shown a letter grade: `S+` for the OP tier, then
 * `S`, `A`, `B`, `C`, `D`. The letter is the headline of the "Tier" cell; the
 * numeric tier stays available in the cell's tooltip.
 */
export const TIER_GRADES = {
  0: { letter: 'S+', className: 'tier-splus' },
  1: { letter: 'S', className: 'tier-s' },
  2: { letter: 'A', className: 'tier-a' },
  3: { letter: 'B', className: 'tier-b' },
  4: { letter: 'C', className: 'tier-c' },
  5: { letter: 'D', className: 'tier-d' },
};

/** The lanes the reference ships a position icon for. */
const ROLE_ICONS = new Set(['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']);

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

/** Uppercase a value and drop the spaces. */
export function slug(value) {
  return String(value ?? '').trim().toUpperCase();
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

  const candidates = [payload.data, payload.champions, payload.rows, payload.list, payload.items];
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
 * Extract the payload meta block (patch version, analysis timestamp).
 *
 * @param {*} payload
 * @returns {{version: string|null, analyzedAt: string|null}}
 */
export function extractMeta(payload) {
  const source = (payload && typeof payload === 'object' && !Array.isArray(payload))
    ? (payload.meta && typeof payload.meta === 'object' ? payload.meta : payload)
    : null;
  if (!source) return { version: null, analyzedAt: null };

  return {
    version: firstDefined(source.version, source.patch) || null,
    analyzedAt: firstDefined(source.analyzed_at, source.analyzedAt, source.updatedAt) || null,
  };
}

/* -------------------------------------------------------------------------
 * Positions
 * ---------------------------------------------------------------------- */

/**
 * Normalise one position entry of a champion.
 *
 * @param {object} raw
 * @returns {object|null}
 */
function normalizePosition(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const name = slug(firstDefined(raw.name, raw.position, raw.role));
  if (!name) return null;

  const tierLabel = firstDefined(raw.tier, raw.tier_name, raw.tierName);
  const tierInfo = normalizeTier(tierLabel);

  return {
    name,
    tier: String(tierLabel ?? tierInfo.tier).trim(),
    tierBucket: tierInfo.tierRank,
    rank: toNumber(firstDefined(raw.rank, raw.tierRank, raw.tier_rank)),
    winRate: normalizeRates(firstDefined(raw.win_rate, raw.winRate)),
    pickRate: normalizeRates(firstDefined(raw.pick_rate, raw.pickRate)),
    banRate: normalizeRates(firstDefined(raw.ban_rate, raw.banRate)),
    matches: toNumber(firstDefined(raw.matches, raw.play, raw.games)),
  };
}

/* -------------------------------------------------------------------------
 * Row normalisation
 * ---------------------------------------------------------------------- */

/**
 * Normalise one champion row.
 *
 * @param {object} raw - the row as delivered by the main process.
 * @param {object} [ctx] - `{ role }`, the lane the list was requested for.
 * @returns {object|null} the normalised row, or `null` when the row carries
 *                       no usable champion identity at all.
 */
export function normalizeRow(raw, ctx = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const requestedRole = ctx.role || DEFAULT_ROLE;

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

  // ---- tier ---------------------------------------------------------------
  // The main process hands back the tier as a label (`'OP'`, `'Tier 1'` …);
  // `normalizeTier()` turns it into the numeric bucket the letter grade uses.
  const tierLabel = firstDefined(raw.tier, raw.tier_name, raw.tierName, raw.tierLabel);
  const tierInfo = normalizeTier(tierLabel);
  const tier = String(tierLabel ?? tierInfo.tier).trim();

  // ---- rank ---------------------------------------------------------------
  // `tierRank` is the rank of the row *inside* its tier (1 … 5 for the OP
  // tier), not the tier bucket.
  const rank = toNumber(firstDefined(
    raw.tierRank,
    raw.tier_rank,
    raw.rank,
    raw.rank_num,
    raw.rankNum,
  ));

  // ---- rates --------------------------------------------------------------
  const winRate = normalizeRates(firstDefined(raw.win_rate, raw.winRate, raw.win_rate_pct));
  const pickRate = normalizeRates(firstDefined(raw.pick_rate, raw.pickRate));
  const banRate = normalizeRates(firstDefined(raw.ban_rate, raw.banRate));
  const matches = toNumber(firstDefined(raw.matches, raw.play, raw.games, raw.stats?.play));
  const kda = toNumber(firstDefined(raw.kda, raw.stats?.kda));

  // ---- positions ----------------------------------------------------------
  const rawPositions = Array.isArray(raw.positions) ? raw.positions : [];
  const positions = rawPositions.map(normalizePosition).filter(Boolean);

  // ---- role ---------------------------------------------------------------
  const primary = primaryPosition(rawPositions);
  const role = slug(firstDefined(
    raw.role,
    raw.position,
    raw.lane,
    primary && firstDefined(primary.name, primary.position, primary.role),
  )) || null;

  return {
    id,
    key: key || (resolved && resolved.key) || null,
    name,
    title: firstDefined(raw.title, raw.champion_title, raw.champion?.title, resolved && resolved.title) || '',
    squareImageUrl: firstDefined(raw.squareImageUrl, raw.square_image_url) || null,
    imageUrl: firstDefined(raw.imageUrl, raw.image_url) || null,
    tier,
    tierBucket: tierInfo.tierRank,
    rank,
    role,
    winRate,
    pickRate,
    banRate,
    matches,
    kda,
    positions,
    offMeta: !playsRole(rawPositions, requestedRole),
  };
}

/**
 * Normalise a whole payload into rows.
 *
 * @param {*} payload - whatever `ctx.api.champions()` resolved with.
 * @param {object} [options] - `{ role }`.
 * @returns {Array<object>}
 */
export function normalizeRows(payload, options = {}) {
  return extractRows(payload)
    .map((raw) => normalizeRow(raw, options))
    .filter(Boolean);
}

/**
 * Is a tier label the OP tier?
 *
 * @param {string|number} tier
 * @returns {boolean}
 */
export function isOpTier(tier) {
  if (tier === null || tier === undefined) return false;
  if (typeof tier === 'number') return tier === 0;
  return String(tier).trim().toUpperCase() === OP_TIER;
}

/**
 * The OP entries of one champion row.
 *
 * The row's own tier is the lane the list was requested for; the positions
 * carry every other lane the API has tier data for.
 *
 * @param {object} row - a normalised row.
 * @param {object} options - `{ role }`.
 * @returns {Array<object>} the OP entries of the row.
 */
function opEntriesOf(row, options) {
  const role = options.role || DEFAULT_ROLE;
  const entries = [];

  const base = {
    id: row.id,
    key: row.key,
    name: row.name,
    title: row.title,
    squareImageUrl: row.squareImageUrl,
    imageUrl: row.imageUrl,
    tier: OP_TIER,
    tierBucket: 0,
  };

  // The tier the API put on the row itself — the requested lane.
  if (isOpTier(row.tier)) {
    entries.push({
      ...base,
      lane: role,
      rank: row.rank,
      winRate: row.winRate,
      pickRate: row.pickRate,
      banRate: row.banRate,
      matches: row.matches,
    });
  }

  // The tier the API put on the individual lanes.
  for (const position of row.positions) {
    if (!isOpTier(position.tier)) continue;
    if (position.name === role && entries.length) continue;

    entries.push({
      ...base,
      lane: position.name,
      rank: position.rank,
      winRate: position.winRate,
      pickRate: position.pickRate,
      banRate: position.banRate,
      matches: position.matches,
    });
  }

  return entries;
}

/**
 * Collect the OP tier entries out of one or more tier-list payloads.
 *
 * @param {Array<{payload: *, band?: string}>} sources - the payloads to read.
 * @param {object} [options] - `{ role }`.
 * @returns {Array<object>} the OP entries.
 */
export function collectOpRows(sources, options = {}) {
  const list = Array.isArray(sources) ? sources : [sources];
  const byIdentity = new Map();

  for (const source of list) {
    const payload = source && typeof source === 'object' && 'payload' in source
      ? source.payload
      : source;
    const band = source && typeof source === 'object' && source.band ? source.band : null;

    for (const row of normalizeRows(payload, options)) {
      for (const entry of opEntriesOf(row, options)) {
        const identity = `${row.id === null || row.id === undefined ? row.name : row.id}:${entry.lane}`;
        if (byIdentity.has(identity)) continue;
        byIdentity.set(identity, { ...entry, band });
      }
    }
  }

  return Array.from(byIdentity.values());
}

/* -------------------------------------------------------------------------
 * Images
 * ---------------------------------------------------------------------- */

/**
 * Portrait URL of a champion row.
 *
 * The reference's portraits come from OP.GG's own CDN; the shared
 * `championPortrait()` helper builds that URL (and resizes it), so the page
 * never has to know a CDN pattern. The payload's own URL is the fallback.
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

/**
 * Position icon URL for a role chip.
 *
 * The reference loads these from `desktop-app-data.op.gg`, but that host
 * answers 403 to the desktop shell, so the replica ships local copies under
 * `src/assets/images/ui/`.
 *
 * @param {string} role
 * @returns {string|null}
 */
export function roleIconUrl(role) {
  if (!role) return null;
  const value = slug(role);
  if (!ROLE_ICONS.has(value)) return null;
  return `assets/images/ui/icon-position-${value}.png`;
}

/**
 * The i18n key of a lane's label (`TOP` → `lol.common.lane.top`).
 *
 * @param {string} role
 * @returns {string|null}
 */
export function roleLabelKey(role) {
  if (!role) return null;
  const tab = ROLE_TABS.find((entry) => entry.value === slug(role));
  return tab ? tab.labelKey : null;
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
    case 'banRate':
      return (a.banRate ?? -1) - (b.banRate ?? -1);
    default:
      return 0;
  }
}

/**
 * Sort rows client-side.
 *
 * The direction only applies to the primary column; ties always fall back to
 * the tier's own rank and then to the champion name so the order is stable.
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
