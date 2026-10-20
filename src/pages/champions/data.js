/**
 * Champions screen — page-local data shaping.
 *
 * Everything here is pure: it turns whatever the main process returned into
 * the row shape the table renders, and it owns the option catalogues for the
 * filter bar. No DOM, no network, no store access.
 *
 * The normaliser is deliberately tolerant. The tier-list endpoint has changed
 * shape several times (bare array / `{ data: [...] }` / `{ champions: [...] }`)
 * and the desktop main process may hand back either the raw OP.GG payload or
 * an already-flattened row set, so every field is looked up through a small
 * list of aliases.
 */

/* -------------------------------------------------------------------------
 * Option catalogues
 * ---------------------------------------------------------------------- */

/**
 * Role tabs — the desktop app is role-scoped, there is no "All" tab.
 * The values are the OP.GG lane codes.
 */
export const ROLE_TABS = [
  { value: 'TOP', labelKey: 'lol.common.lane.top', fallback: 'Top' },
  { value: 'JUNGLE', labelKey: 'lol.common.lane.jungle', fallback: 'Jungle' },
  { value: 'MID', labelKey: 'lol.common.lane.mid', fallback: 'Middle' },
  // The reference desktop app labels the ADC slot "Bottom", not "AD Carry" —
  // the shipped French bundle renders `lol.common.lane.bottom` as "Bas".
  { value: 'ADC', labelKey: 'lol.common.lane.bottom', fallback: 'Bottom' },
  { value: 'SUPPORT', labelKey: 'lol.common.lane.support', fallback: 'Support' },
];

/** The tab that is active when the store carries no role (or the "All" role). */
export const DEFAULT_ROLE = ROLE_TABS[0].value;

/** Tier filter — the `tier` query parameter the champion API accepts. */
export const TIER_OPTIONS = [
  { value: 'all', labelKey: 'common.lol.tier.all', fallback: 'All Tiers' },
  { value: 'emerald_plus', labelKey: 'common.lol.tier.emerald', fallback: 'Emerald', suffix: ' +' },
  { value: 'diamond_plus', labelKey: 'common.lol.tier.diamond', fallback: 'Diamond', suffix: ' +' },
  { value: 'master_plus', labelKey: 'common.lol.tier.master', fallback: 'Master', suffix: ' +' },
  { value: 'grandmaster', labelKey: 'common.lol.tier.grandmaster', fallback: 'Grandmaster' },
  { value: 'challenger', labelKey: 'common.lol.tier.challenger', fallback: 'Challenger' },
  { value: 'platinum_plus', labelKey: 'common.lol.tier.platinum', fallback: 'Platinum', suffix: ' +' },
  { value: 'gold_plus', labelKey: 'common.lol.tier.gold', fallback: 'Gold', suffix: ' +' },
  { value: 'silver_plus', labelKey: 'common.lol.tier.silver', fallback: 'Silver', suffix: ' +' },
];

/** Region filter — the API region codes and the reference's flag icons. */
export const REGION_OPTIONS = [
  // The reference desktop app shows the region code in the dropdown toggle
  // ("GLOBAL"), not the catalogue's "All Regions".
  { value: 'GLOBAL', label: 'GLOBAL' },
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

/**
 * Table columns. `label` is used when the reference catalogue has no key for
 * the header (the catalogue is missing "Role" and "Counter").
 *
 * The desktop table has seven columns: `#`, the role icon, `Champion`,
 * `Tier`, `Win Rate`, `Pick Rate` and `Ban Rate`. There is no counter column.
 */
export const COLUMNS = [
  { id: 'rank', label: '#', defaultDirection: 'asc', sortable: true },
  { id: 'roleIcon', label: '', defaultDirection: 'asc', sortable: false },
  { id: 'champion', labelKey: 'lol.champions.champion', fallback: 'Champion', defaultDirection: 'asc', sortable: true },
  { id: 'tier', labelKey: 'lol.champions.tier', fallback: 'Tier', defaultDirection: 'asc', sortable: true },
  { id: 'winRate', labelKey: 'lol.champions.win-rate', fallback: 'Win Rate', defaultDirection: 'desc', sortable: true },
  { id: 'pickRate', labelKey: 'lol.champions.pick-rate', fallback: 'Pick Rate', defaultDirection: 'desc', sortable: true },
  { id: 'banRate', labelKey: 'lol.champions.ban-rate', fallback: 'Ban Rate', defaultDirection: 'desc', sortable: true },
];

/** The column slot each table column is rendered into (`__1` … `__5`). */
export const COLUMN_SLOT = {
  rank: '1',
  roleIcon: '2',
  champion: '3',
  tier: '4',
  winRate: '5',
  pickRate: '5',
  banRate: '5',
};

/** Rank of a role inside the role order, used by the role sort. */
export const ROLE_ORDER = ROLE_TABS.map((role) => role.value);

/**
 * Tier chips. `OP` is the reference's top tier; 1..5 are the classic tiers.
 */
export const TIER_META = {
  0: { key: 'op', label: 'OP', token: '--tier-op' },
  1: { key: '1', label: 'Tier 1', token: '--tier-1' },
  2: { key: '2', label: 'Tier 2', token: '--tier-2' },
  3: { key: '3', label: 'Tier 3', token: '--tier-3' },
  4: { key: '4', label: 'Tier 4', token: '--tier-4' },
  5: { key: '5', label: 'Tier 5', token: '--tier-5' },
};

/* -------------------------------------------------------------------------
 * Reference assets
 * ---------------------------------------------------------------------- */

/** Desktop app asset base (role icons, arrows, region flags). */
export const ASSET_BASE = 'https://desktop-app-data.op.gg/desktop/app/assets/images/';

/** OP.GG static CDN. */
const CDN_BASE = 'https://opgg-static.akamaized.net';

/** Square champion portraits. */
const PORTRAIT_META = `${CDN_BASE}/meta/images/lol/latest/champion/{key}.png`;
const PORTRAIT_SQUARE = `${CDN_BASE}/images/champions/{square}.png`;
const PORTRAIT_DDRAGON = 'https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/{key}.png';
const SPLASH_CDN = `${CDN_BASE}/meta/images/lol/latest/champion/centered/{key}_0.jpg`;

/** The image service query the reference uses to resize a portrait. */
function resizeQuery(size) {
  return `?image=c_scale,q_auto,w_${size}`;
}

/** Champion names whose Data Dragon key cannot be derived from the display name. */
const KEY_OVERRIDES = {
  'nunu & willump': 'Nunu',
  wukong: 'MonkeyKing',
  "cho'gath": 'ChoGath',
  'dr. mundo': 'DrMundo',
  'master yi': 'MasterYi',
  'miss fortune': 'MissFortune',
  'reksai': 'RekSai',
  "vel'koz": 'VelKoz',
  velkoz: 'VelKoz',
  "kai'sa": 'Kaisa',
  "k'sante": 'KSante',
  'renata glasc': 'RenataGlasc',
  'twisted fate': 'TwistedFate',
  'lee sin': 'LeeSin',
  'aurelion sol': 'AurelionSol',
};

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

/**
 * Normalise a rate to a 0..1 fraction.
 *
 * The magnitude decides the scale: `|value| <= 1` is read as a ratio
 * (`0.5214` → 52.14%), anything larger is read as a percentage
 * (`52.14` → 52.14%). `null` stays `null` so "no data" is never faked.
 */
export function normalizeRate(value) {
  const n = toNumber(value);
  if (n === null) return null;
  if (Math.abs(n) <= 1) return n;
  return n / 100;
}

/** Format a 0..1 fraction as `52.14%`; `--` when there is no data. */
export function formatRate(fraction, digits = 2) {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return '--';
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Uppercase a value and drop the spaces. */
function slug(value) {
  return String(value ?? '').trim().toUpperCase();
}

/* -------------------------------------------------------------------------
 * Champion records / name index
 * ---------------------------------------------------------------------- */

/**
 * Collect `{ id, key, name, title, imageUrl, square }` records out of an
 * arbitrary payload.
 *
 * Understands the reference's champion-name list (`[{ id, name }]`), the OP.GG
 * champion metadata (`[{ id, key, name, image_url, title }]`) and the Data
 * Dragon champion map (`{ Aatrox: { id, key, name, title } }`), including the
 * `{ data: ... }` wrappers the main process may add around them.
 *
 * @param {*} raw
 * @returns {Array<object>}
 */
export function collectChampionRecords(raw) {
  const records = [];
  const seen = new Set();

  const push = (record) => {
    if (!record || typeof record !== 'object') return;
    const name = typeof record.name === 'string' ? record.name : '';
    if (!name) return;
    const id = firstDefined(record.id, record.champion_id, record.championId);
    const numericId = toNumber(id);
    const identity = numericId !== null ? `id:${numericId}` : `name:${name.toLowerCase()}`;
    if (seen.has(identity)) return;
    seen.add(identity);

    const rawKey = firstDefined(record.key, record.champion_key, record.championKey);
    const key = typeof rawKey === 'string' && rawKey && !/^\d+$/.test(rawKey)
      ? rawKey
      : (typeof id === 'string' && id ? id : deriveKey(name));

    records.push({
      id: numericId,
      key: key || null,
      name,
      title: typeof record.title === 'string' ? record.title : '',
      imageUrl: typeof record.image_url === 'string'
        ? record.image_url
        : (typeof record.imageUrl === 'string' ? record.imageUrl : null),
      square: typeof record.square === 'string' ? record.square : null,
    });
  };

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (Array.isArray(node.data)) {
      walk(node.data);
      return;
    }
    if (Array.isArray(node.champions)) {
      walk(node.champions);
      return;
    }

    if (typeof node.name === 'string' && node.name) {
      push(node);
      return;
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') walk(value);
    }
  };

  walk(raw);
  return records;
}

/** Derive a Data Dragon key from a display name (`Dr. Mundo` → `DrMundo`). */
export function deriveKey(name) {
  const lower = String(name ?? '').trim().toLowerCase();
  if (!lower) return null;
  if (KEY_OVERRIDES[lower]) return KEY_OVERRIDES[lower];
  const derived = lower.replace(/[^a-z0-9]/g, '');
  return derived ? derived.charAt(0).toUpperCase() + derived.slice(1) : null;
}

/** Create an empty name index. */
export function createNameIndex() {
  return { byId: new Map(), byKey: new Map() };
}

/** Build a name index out of champion records. */
export function createIndexFromRecords(records) {
  const index = createNameIndex();
  for (const record of records) {
    const entry = {
      name: record.name,
      key: record.key,
      title: record.title,
      square: record.square || null,
      imageUrl: record.imageUrl || null,
    };
    if (record.id !== null && record.id !== undefined) index.byId.set(record.id, entry);
    if (record.key) index.byKey.set(String(record.key).toLowerCase(), entry);
    if (record.name) index.byKey.set(record.name.toLowerCase(), entry);
  }
  return index;
}

/** Look a champion up in the index by numeric id or by key/name. */
export function lookupName(index, id, key) {
  if (!index) return null;
  const numeric = toNumber(id);
  if (numeric !== null && index.byId.has(numeric)) return index.byId.get(numeric);
  if (key) {
    const lowered = String(key).toLowerCase();
    if (index.byKey.has(lowered)) return index.byKey.get(lowered);
  }
  return null;
}

/* -------------------------------------------------------------------------
 * Row normalisation
 * ---------------------------------------------------------------------- */

/** Extract the row array out of any of the accepted payload shapes. */
export function extractRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return [];

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
 * Extract the payload meta block.
 *
 * The live endpoint answers with
 * `{ data: [...], meta: { version, cached_at, match_count, analyzed_at } }`.
 *
 * @param {*} payload
 * @returns {{version:string|null, cachedAt:string|null, matchCount:number|null, analyzedAt:string|null}}
 */
export function extractMeta(payload) {
  const meta = (payload && typeof payload === 'object' && !Array.isArray(payload))
    ? payload.meta
    : null;
  // The main process returns the patch at the top level; the raw API nests it
  // under `meta`. Both shapes have to work.
  const source = meta && typeof meta === 'object' ? meta : (payload || {});
  if (!source || typeof source !== 'object') {
    return { version: null, cachedAt: null, matchCount: null, analyzedAt: null };
  }
  return {
    version: firstDefined(source.version, source.patch) || null,
    cachedAt: firstDefined(source.cached_at, source.cachedAt, source.updatedAt) || null,
    matchCount: toNumber(firstDefined(source.match_count, source.matchCount)),
    analyzedAt: firstDefined(source.analyzed_at, source.analyzedAt, source.updatedAt) || null,
  };
}

/** Play count of a position entry. */
function positionPlay(position) {
  if (!position || typeof position !== 'object') return 0;
  return toNumber(firstDefined(position.play, position.games, position.stats?.play)) || 0;
}

/**
 * Pick the position entry that matches the requested role.
 *
 * The desktop app is role-scoped, so the position that matches the active
 * role is the one that carries the numbers.
 */
export function pickPosition(raw, role) {
  const positions = Array.isArray(raw?.positions) ? raw.positions : [];
  if (!positions.length) return null;

  const wanted = role && role !== 'ALL' ? slug(role) : null;
  if (wanted) {
    return positions.find((entry) => slug(firstDefined(entry?.name, entry?.position, entry?.role)) === wanted) || null;
  }

  return positions
    .slice()
    .sort((a, b) => positionPlay(b) - positionPlay(a))[0] || null;
}

/** Resolve the tier number (0 = OP, 1..5) out of the many possible fields. */
function resolveTier(...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    if (typeof candidate === 'string') {
      const text = candidate.trim().toLowerCase();
      if (text === 'op' || text === 'op+' || text === 's+' || text === 'god') return 0;
      const parsed = parseFloat(text);
      if (Number.isFinite(parsed)) return Math.min(5, Math.max(0, Math.round(parsed)));
      continue;
    }
    const parsed = toNumber(candidate);
    if (parsed !== null) return Math.min(5, Math.max(0, Math.round(parsed)));
  }
  return null;
}

/**
 * Normalise one counter entry.
 *
 * The live payload only carries `{ champion_id, play, win }` — no name and no
 * rate. The rate is `win / play`; the name has to be resolved from the
 * champion-name map and stays `null` when it cannot be resolved. A name is
 * never invented.
 */
function normalizeCounter(raw, index) {
  if (!raw || typeof raw !== 'object') return null;

  const id = firstDefined(raw.champion_id, raw.championId, raw.id, raw.champion?.id);
  const numericId = toNumber(id);
  const key = firstDefined(raw.key, raw.champion_key, raw.square, raw.champion?.key) || null;
  const known = lookupName(index, numericId, key);

  let winRate = normalizeRate(firstDefined(raw.win_rate, raw.winRate, raw.win_rate_pct));
  if (winRate === null) {
    const wins = toNumber(firstDefined(raw.win, raw.wins));
    const plays = toNumber(firstDefined(raw.play, raw.plays, raw.games));
    if (wins !== null && plays !== null && plays > 0) winRate = wins / plays;
  }

  const name = firstDefined(raw.name, raw.champion_name, known?.name) || null;

  return {
    id: numericId,
    key: (typeof key === 'string' && key) || known?.key || null,
    square: known?.square || null,
    name,
    winRate,
  };
}

/**
 * Normalise a single champion row.
 *
 * @param {object} raw - the row as delivered by the main process.
 * @param {object} ctx  - `{ role, names }`.
 * @returns {object|null} the normalised row, or `null` when the row carries
 *                       no usable champion identity at all.
 */
export function normalizeRow(raw, ctx = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const names = ctx.names || createNameIndex();
  const role = ctx.role || 'TOP';

  const id = firstDefined(raw.id, raw.champion_id, raw.championId);
  const numericId = toNumber(id);

  // `key` doubles as the image key (a champion name such as "Aatrox"); the
  // numeric Data Dragon key ("266") is not usable for a URL, so it is skipped.
  const rawKey = firstDefined(raw.key, raw.champion_key, raw.championKey, raw.image_key);
  const key = typeof rawKey === 'string' && rawKey && !/^\d+$/.test(rawKey) ? rawKey : null;

  const known = lookupName(names, numericId, key);

  const name = firstDefined(
    raw.name,
    raw.champion_name,
    raw.championName,
    raw.champion?.name,
    known?.name,
    key,
  ) || '';

  if (numericId === null && !name && !key) return null;

  // Without a name from the API the row still has to be identifiable, but the
  // champion id is the only honest label available.
  const displayName = name || (numericId !== null ? `#${numericId}` : '');

  const requestedRole = role && role !== 'ALL' ? slug(role) : null;
  const position = pickPosition(raw, role);
  const stats = (position && position.stats) || {};
  const tierData = stats.tier_data || (position && position.tier_data) || {};
  const avgStats = raw.average_stats || raw.averageStats || {};
  const avgTierData = avgStats.tier_data || {};

  // ---- tier ---------------------------------------------------------------
  let tier = resolveTier(
    raw.tier,
    raw.tier_rank,
    raw.tierRank,
    tierData.tier,
    stats.tier,
    avgStats.tier,
    avgTierData.tier,
  );

  // ---- rank ---------------------------------------------------------------
  const rank = toNumber(firstDefined(
    raw.rank,
    raw.rank_num,
    raw.rankNum,
    tierData.rank,
    stats.rank,
    avgTierData.rank,
    avgStats.rank,
  ));

  // ---- rank change --------------------------------------------------------
  let rankChange = toNumber(firstDefined(raw.rank_change, raw.rankChange, raw.rank_diff, raw.rankDiff));
  if (rankChange === null) {
    const previous = toNumber(firstDefined(tierData.rank_prev, tierData.rankPrev, avgTierData.rank_prev));
    if (previous !== null && rank !== null) rankChange = previous - rank;
  }

  // ---- rates --------------------------------------------------------------
  const winRate = normalizeRate(firstDefined(raw.win_rate, raw.winRate, stats.win_rate, avgStats.win_rate));
  const pickRate = normalizeRate(firstDefined(raw.pick_rate, raw.pickRate, stats.pick_rate, avgStats.pick_rate));
  const banRate = normalizeRate(firstDefined(raw.ban_rate, raw.banRate, stats.ban_rate, avgStats.ban_rate));
  const matches = toNumber(firstDefined(raw.matches, raw.games, raw.play, stats.play, avgStats.play));
  const kda = toNumber(firstDefined(raw.kda, stats.kda, avgStats.kda));

  // ---- role ---------------------------------------------------------------
  const hasPositions = Array.isArray(raw.positions) && raw.positions.length > 0;
  let roleValue = slug(firstDefined(
    raw.role,
    raw.position,
    raw.lane,
    position && firstDefined(position.name, position.position, position.role),
    firstRoleName(raw.roles),
  )) || null;

  // An off-meta pick (the champion does not play the selected role) is still
  // listed, but it is flagged so the role filter can drop it.
  const offMeta = Boolean(requestedRole && hasPositions && !position);
  if (requestedRole && !roleValue) roleValue = requestedRole;

  // ---- counters -----------------------------------------------------------
  const counterSource = firstDefined(
    raw.counters,
    raw.hardest_counters,
    raw.hardestCounters,
    raw.weak_against,
    raw.weakAgainst,
    position && position.counters,
  );
  const counters = (Array.isArray(counterSource) ? counterSource : [])
    .map((entry) => normalizeCounter(entry, names))
    .filter(Boolean)
    .sort((a, b) => (a.winRate ?? Number.MAX_SAFE_INTEGER) - (b.winRate ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 3);

  // The reference promotes the very top of Tier 1 to "OP".
  if (tier === 1 && rank !== null && rank > 0 && rank <= 3) tier = 0;

  return {
    id: numericId,
    key: key || known?.key || deriveKey(name) || null,
    square: typeof raw.square === 'string' ? raw.square : null,
    imageUrl: typeof raw.image_url === 'string'
      ? raw.image_url
      : (typeof raw.imageUrl === 'string' ? raw.imageUrl : (known?.imageUrl || null)),
    name: displayName,
    title: firstDefined(raw.title, raw.champion_title, raw.champion?.title, known?.title) || '',
    tier,
    tierRank: toNumber(firstDefined(tierData.rank, avgTierData.rank)),
    rank: rank ?? null,
    rankChange: rankChange ?? null,
    role: roleValue,
    winRate,
    pickRate,
    banRate,
    matches,
    kda,
    counters,
    offMeta,
    isRip: Boolean(raw.is_rip ?? raw.isRip),
    isRotation: Boolean(raw.is_rotation ?? raw.isRotation),
  };
}

/** First name of a `roles` array (either `['TOP']` or `[{ name: 'TOP' }]`). */
function firstRoleName(roles) {
  if (!Array.isArray(roles) || !roles.length) return undefined;
  const first = roles[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') return firstDefined(first.name, first.role, first.position);
  return undefined;
}

/**
 * Normalise a whole payload into rows.
 *
 * @param {*} payload - whatever `ctx.api.champions()` resolved with.
 * @param {object} options - `{ role, names }`.
 */
export function normalizeRows(payload, options = {}) {
  const names = options.names || createNameIndex();
  const role = options.role || 'TOP';
  const list = extractRows(payload);
  const rows = [];

  list.forEach((raw) => {
    const row = normalizeRow(raw, { role, names });
    if (row) rows.push(row);
  });

  return rows;
}

/* -------------------------------------------------------------------------
 * Images
 * ---------------------------------------------------------------------- */

/**
 * Candidate portrait URLs, best first.
 *
 * The reference's grid uses `…/images/champions/{square}.png`; when the
 * payload does not carry a `square` key the OP.GG metadata path
 * (`…/meta/images/lol/latest/champion/{key}.png`) is used, which is what the
 * champion API's own `image_url` points at. Data Dragon is the last resort.
 */
export function portraitUrls(row, size = 32) {
  const urls = [];
  // Order matters: the first entry is the one the browser actually requests,
  // and every one of these paths was HTTP-verified. Data Dragon's champion
  // path answers 403 from the desktop shell, so the OP.GG mirror leads.
  if (row?.key) {
    urls.push(`${PORTRAIT_META.replace('{key}', row.key)}${resizeQuery(size)}`);
  }
  if (row?.imageUrl) urls.push(`${row.imageUrl}${resizeQuery(size)}`);
  if (row?.square) urls.push(`${PORTRAIT_SQUARE.replace('{square}', row.square)}${resizeQuery(size)}`);
  if (row?.key) {
    urls.push(PORTRAIT_DDRAGON.replace('{key}', row.key));
    urls.push(SPLASH_CDN.replace('{key}', row.key));
  }
  return urls;
}

/** Splash art URL for the champion-detail modal header. */
export function splashUrl(row) {
  if (!row?.key) return null;
  return SPLASH_CDN.replace('{key}', row.key);
}

/**
 * Position icon URL for a role chip (the white variant for the active tab).
 *
 * The reference loads these from `desktop-app-data.op.gg`, but that host
 * answers 403 to the desktop shell, so the replica ships local copies under
 * `src/assets/images/ui/`.
 */
export function roleIconUrl(role, active = false) {
  if (!role) return null;
  const value = slug(role);
  return active
    ? `assets/images/ui/icon-position-${value}-wh.svg`
    : `assets/images/ui/icon-position-${value}.png`;
}

/** Region flag icon URL. */
export function regionIconUrl(region) {
  if (!region) return null;
  return `assets/images/ui/01-icon-icon-${String(region).toLowerCase()}.svg`;
}

/** The reference's down-arrow glyph. */
export function downArrowUrl() {
  return 'assets/images/ui/icon-down.svg';
}

/** The reference's search glyph. */
export function searchIconUrl() {
  return `${ASSET_BASE}icon-search.svg`;
}

/* -------------------------------------------------------------------------
 * Patches
 * ---------------------------------------------------------------------- */

/**
 * Build the patch dropdown list out of the current patch.
 *
 * The reference shows the patch as `16.20` and lets the user step back
 * through the previous patches. Only the patches that can be derived from
 * the current one are offered.
 *
 * @param {string|null} current - e.g. `16.20` or `16.20.1`.
 * @returns {Array<{value:string,label:string}>}
 */
export function buildPatchOptions(current) {
  const options = [];
  const match = /(\d+)\.(\d+)/.exec(String(current ?? ''));
  if (!match) return options;

  const major = Number(match[1]);
  const minor = Number(match[2]);

  for (let step = 0; step < 3; step += 1) {
    const patch = minor - step;
    if (patch < 0) break;
    const text = `${major}.${patch}`;
    options.push({ value: text, label: text });
  }

  return options;
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
      const av = a.tier ?? 9;
      const bv = b.tier ?? 9;
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
 * Sort rows client-side. The direction only applies to the primary column;
 * ties always fall back to the OP.GG rank and then the champion name so the
 * order stays stable.
 */
export function sortRows(rows, sort) {
  const column = sort?.column || 'rank';
  const direction = sort?.direction === 'desc' ? -1 : 1;

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
