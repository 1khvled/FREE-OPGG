/**
 * Game modes screen — page-local data shaping.
 *
 * The reference's "Game modes" screen (`/lol/modes/:mode?/:championId?`) is
 * **mode parameterised**: the mode decides both the champion list and the
 * stat set. Three modes are on offer:
 *
 *   | Mode         | Champion list     | Stat set |
 *   |--------------|-------------------|----------|
 *   | ARAM         | the ARAM tier list| win rate, pick rate |
 *   | Arena        | the arena tier list| win rate, avg. place, 1st rate, pick rate, ban rate, 2nd rate |
 *   | Nexus Blitz  | the arena tier list| like Arena |
 *
 * Two payloads feed the table:
 *
 *   1. `ctx.api.modeTierList(mode)` — the mode's champion list. The rows are
 *      the standard champion rows (`id`, `name`, `winRate`, `pickRate`, …);
 *      the arena rows also carry the raw `average_stats` the arena stats are
 *      computed from.
 *
 *   2. `ctx.api.aramBalance()` — the nine **balance ratios** (attack speed,
 *      damage dealt, …). They are the same for every mode: they say how a
 *      champion's numbers compare to the reference champion of the mode.
 *
 * Three facts drive the whole module:
 *
 *   1. **The balance values are already percentages against the reference
 *      champion.** `100` is the baseline and `95` means "95 % of the
 *      reference value". They are never multiplied by 100 again — `95` is
 *      rendered as `95 %` and the bar length is `value / 100`.
 *
 *   2. **The balance rows carry champion ids only.** The names and the
 *      portraits come from `ctx.api.staticData()`. A champion that cannot be
 *      resolved keeps its numeric id as the label — a name is never invented.
 *
 *   3. **The reference computes the mode stats like this** (the shipped
 *      `docs/rea/game-mode-bundle.js`):
 *
 *        // arena
 *        ["win-rate",   (i.win / i.play * 100).toFixed(2) + "%"],
 *        ["Avg. Place", (i.total_place / i.play).toFixed(2)],
 *        ["1st Rate",   (i.first_place / i.play * 100).toFixed(2) + "%"],
 *        ["pick-rate",  (100 * i.pick_rate).toFixed(2) + "%"],
 *        ["ban-rate",   (100 * i.ban_rate).toFixed(2) + "%"],
 *        ["2nd Rate",   (i.win / i.play * 100).toFixed(2) + "%"],
 *        // aram
 *        ["win-rate",  (100 * i.win_rate).toFixed(2) + "%"],
 *        ["pick-rate", (100 * i.pick_rate).toFixed(2) + "%"]
 *
 * Everything in this module is pure: no DOM, no network, no store.
 */

/* -------------------------------------------------------------------------
 * Option catalogues
 * ---------------------------------------------------------------------- */

import { LANES, ROLE_TO_LANE } from '../../data/index.js';

/**
 * The modes the reference's modes screen offers.
 *
 * `tierList` is the tier list the mode's champion list is read from — the
 * Nexus Blitz list is the arena list — and `statSet` is the stat set the
 * reference computes for the mode.
 */
export const MODES = [
  {
    value: 'aram',
    labelKey: 'lol.common.gameMode.aram',
    fallback: 'ARAM',
    tierList: 'aram',
    statSet: 'aram',
  },
  {
    value: 'arena',
    labelKey: 'lol.common.gameMode.arena',
    fallback: 'Arena',
    tierList: 'arena',
    statSet: 'arena',
  },
  {
    value: 'nexus_blitz',
    labelKey: 'lol.common.gameMode.nexus_blitz',
    fallback: 'Nexus Blitz',
    tierList: 'arena',
    statSet: 'arena',
  },
];

/** The mode the screen opens on when the URL carries none. */
export const DEFAULT_MODE = 'aram';

/**
 * The stat sets of the modes.
 *
 * The labels are the reference's own strings; the three ARAM-only ones live
 * in the desktop shell's catalogue (`src/i18n/app.en.json`).
 */
export const MODE_STATS = {
  aram: [
    { id: 'winRate', labelKey: 'lol.champions.win-rate', fallback: 'Win Rate' },
    { id: 'pickRate', labelKey: 'lol.champions.pick-rate', fallback: 'Pick Rate' },
  ],
  arena: [
    { id: 'winRate', labelKey: 'lol.champions.win-rate', fallback: 'Win Rate' },
    { id: 'avgPlace', labelKey: 'app.avgPlace', fallback: 'Avg. Place' },
    { id: 'firstRate', labelKey: 'app.firstRate', fallback: '1st Rate' },
    { id: 'pickRate', labelKey: 'lol.champions.pick-rate', fallback: 'Pick Rate' },
    { id: 'banRate', labelKey: 'lol.champions.ban-rate', fallback: 'Ban Rate' },
    { id: 'secondRate', labelKey: 'app.secondRate', fallback: '2nd Rate' },
  ],
};

/**
 * The nine balance ratios of the mode, in the reference's column order.
 *
 * The labels are the reference's own catalogue strings
 * (`lol.common.gameMode.balance.*`). The catalogue has no entry for the
 * area-of-effect ratio, so that column carries a literal English label
 * instead of a key — asking `t()` for a key that does not exist would print
 * a missing-key warning into the console.
 */
export const STAT_COLUMNS = [
  {
    id: 'attackSpeed',
    labelKey: 'lol.common.gameMode.balance.attack_speed',
    fallback: 'Attack Speed',
  },
  {
    id: 'damageDealt',
    labelKey: 'lol.common.gameMode.balance.damage_dealt',
    fallback: 'Damage Dealt',
  },
  {
    id: 'damageTaken',
    labelKey: 'lol.common.gameMode.balance.damage_taken',
    fallback: 'Damage Taken',
  },
  {
    id: 'cooldownReduction',
    labelKey: 'lol.common.gameMode.balance.cooldown_reduction',
    fallback: 'Cooldown Reduction',
  },
  {
    id: 'healing',
    labelKey: 'lol.common.gameMode.balance.healing',
    fallback: 'Healing',
  },
  {
    id: 'tenacity',
    labelKey: 'lol.common.gameMode.balance.tenacity',
    fallback: 'Tenacity',
  },
  {
    id: 'shieldAmount',
    labelKey: 'lol.common.gameMode.balance.shield_amount',
    fallback: 'Shield Amount',
  },
  {
    id: 'energyRegen',
    labelKey: 'lol.common.gameMode.balance.energy_regen',
    fallback: 'Energy Regen',
  },
  {
    id: 'areaOfEffectDamage',
    // The reference catalogue has no key for this ratio.
    label: 'Area of Effect Damage',
  },
];

/**
 * The lane filter options.
 *
 * The values are the OP.GG lane codes; the labels are the reference's own
 * lane strings. The desktop app calls the ADC slot "Bottom", not "AD Carry".
 */
export const LANE_FILTERS = [
  { value: 'ALL', labelKey: 'common.all', fallback: 'All' },
  { value: 'TOP', labelKey: 'lol.common.lane.top', fallback: 'Top' },
  { value: 'JUNGLE', labelKey: 'lol.common.lane.jungle', fallback: 'Jungle' },
  { value: 'MID', labelKey: 'lol.common.lane.mid', fallback: 'Middle' },
  { value: 'ADC', labelKey: 'lol.common.lane.bottom', fallback: 'Bottom' },
  { value: 'SUPPORT', labelKey: 'lol.common.lane.support', fallback: 'Support' },
];

/** The lane the filter starts on — every champion is listed. */
export const DEFAULT_LANE = 'ALL';

/** The column the table starts sorted by. */
export const DEFAULT_SORT = { column: 'champion', direction: 'asc' };

/**
 * The field aliases of every balance ratio, in priority order.
 *
 * The main process hands back the camel-cased names; the raw upstream payload
 * uses snake_case. Both are accepted so the page keeps working when the main
 * process changes what it forwards.
 */
const STAT_ALIASES = {
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

/** First defined value of a list of field names. */
function pick(source, ...names) {
  if (!source || typeof source !== 'object') return undefined;
  for (const name of names) {
    const value = source[name];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

/* -------------------------------------------------------------------------
 * Modes
 * ---------------------------------------------------------------------- */

/**
 * Keep only the modes the reference offers.
 *
 * @param {string|undefined|null} value
 * @returns {string} a mode key.
 */
export function normalizeMode(value) {
  const candidate = String(value ?? '').trim().toLowerCase();
  return MODES.some((mode) => mode.value === candidate) ? candidate : DEFAULT_MODE;
}

/**
 * The mode record of a mode key.
 *
 * @param {string} value
 * @returns {object}
 */
export function modeByValue(value) {
  const key = normalizeMode(value);
  return MODES.find((mode) => mode.value === key) || MODES[0];
}

/**
 * The stat set of a mode.
 *
 * @param {string} value - the mode key.
 * @returns {Array<object>}
 */
export function statsOfMode(value) {
  const mode = modeByValue(value);
  return MODE_STATS[mode.statSet] || MODE_STATS.aram;
}

/* -------------------------------------------------------------------------
 * Balance rows
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

  for (const key of ['rows', 'data', 'list', 'items', 'champions']) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
}

/**
 * Normalise one balance row.
 *
 * The row carries a champion id and the nine ratios. A row without a numeric
 * champion id cannot be identified at all and is dropped; every other row
 * survives, even when one of its ratios is missing — a missing ratio stays
 * `null` and is rendered as "no data", never as a zero.
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function normalizeRow(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const championId = toNumber(firstDefined(raw.championId, raw.champion_id, raw.id));
  if (championId === null) return null;

  const row = { championId };

  for (const column of STAT_COLUMNS) {
    const aliases = STAT_ALIASES[column.id] || [column.id];
    let value;
    for (const alias of aliases) {
      value = firstDefined(raw[alias]);
      if (value !== undefined) break;
    }
    row[column.id] = toNumber(value);
  }

  return row;
}

/**
 * Normalise a whole payload into balance rows.
 *
 * @param {*} payload - whatever `ctx.api.aramBalance()` resolved with.
 * @returns {Array<object>}
 */
export function normalizeRows(payload) {
  return extractRows(payload)
    .map((raw) => normalizeRow(raw))
    .filter(Boolean);
}

/**
 * Index the balance rows by champion id.
 *
 * @param {Array<object>} rows
 * @returns {Map<number, object>}
 */
export function indexBalanceRows(rows) {
  const index = new Map();
  for (const row of rows || []) {
    if (!row || row.championId === null || row.championId === undefined) continue;
    index.set(row.championId, row);
  }
  return index;
}

/* -------------------------------------------------------------------------
 * Mode rows (the mode's champion list)
 * ---------------------------------------------------------------------- */

/**
 * Format a ratio the way the reference does: `(ratio * 100).toFixed(2) + "%"`.
 *
 * @param {number|null} ratio
 * @returns {string|null} the formatted value, or `null` when there is no data.
 */
export function formatPercent(ratio) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return null;
  return `${(ratio * 100).toFixed(2)}%`;
}

/**
 * Format a plain number the way the reference does: `value.toFixed(2)`.
 *
 * @param {number|null} value
 * @returns {string|null}
 */
export function formatDecimal(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

/**
 * The stat values of one mode row, exactly as the reference computes them.
 *
 * The reference reads the raw `average_stats` of the tier list:
 *
 *   aram  — `win_rate` and `pick_rate` are ratios already,
 *   arena — the rates are derived from the counts:
 *           win rate     = win / play
 *           average place = total_place / play
 *           first rate   = first_place / play
 *
 * A stat that cannot be computed stays `null`; it is never faked.
 *
 * The flattened champion rows of the main process are the fallback for the
 * ARAM rates. A rate of exactly `0` there is the main process' placeholder
 * for "no value" (a champion in a tier list never has a pick rate of zero),
 * so it is read as "no data" rather than as a real zero.
 *
 * @param {object} raw - the tier list row.
 * @param {string} statSet - `aram` or `arena`.
 * @returns {object} `{ id: { text, value } }` — the formatted text and the
 *                   numeric value the column sorts by.
 */
export function normalizeModeStats(raw, statSet) {
  const stats = pick(raw, 'average_stats', 'averageStats', 'stats') || {};

  const play = toNumber(pick(stats, 'play'));
  const win = toNumber(pick(stats, 'win'));
  const totalPlace = toNumber(pick(stats, 'total_place', 'totalPlace'));
  const firstPlace = toNumber(pick(stats, 'first_place', 'firstPlace'));

  const winRateRatio = toNumber(pick(stats, 'win_rate', 'winRate'))
    ?? flatRate(pick(raw, 'winRate', 'win_rate'));

  const pickRateRatio = toNumber(pick(stats, 'pick_rate', 'pickRate'))
    ?? flatRate(pick(raw, 'pickRate', 'pick_rate'));

  const banRateRatio = toNumber(pick(stats, 'ban_rate', 'banRate'))
    ?? flatRate(pick(raw, 'banRate', 'ban_rate'));

  if (statSet === 'aram') {
    return {
      winRate: stat(winRateRatio, formatPercent),
      pickRate: stat(pickRateRatio, formatPercent),
    };
  }

  // Arena: the rates are derived from the counts.
  const winRate = play && win !== null ? win / play : null;
  const firstRate = play && firstPlace !== null ? firstPlace / play : null;

  return {
    winRate: stat(winRate, formatPercent),
    avgPlace: stat(play && totalPlace !== null ? totalPlace / play : null, formatDecimal),
    firstRate: stat(firstRate, formatPercent),
    pickRate: stat(pickRateRatio, formatPercent),
    banRate: stat(banRateRatio, formatPercent),
    secondRate: stat(winRate, formatPercent),
  };
}

/**
 * Build a stat cell value.
 *
 * @param {number|null} value - the numeric value.
 * @param {Function} format - the formatter.
 * @returns {{text: string|null, value: number|null}}
 */
function stat(value, format) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return { text: null, value: null };
  }
  return { text: format(value), value };
}

/**
 * A rate of the flattened champion row.
 *
 * The main process writes `0` when the tier list has no value for the field,
 * so a rate of exactly zero means "no data" here.
 *
 * @param {*} value
 * @returns {number|null}
 */
function flatRate(value) {
  const rate = toNumber(value);
  if (rate === null || rate === 0) return null;
  return rate;
}

/**
 * Normalise one mode row (one champion of the mode's tier list).
 *
 * @param {object} raw
 * @param {object} mode - the mode record.
 * @returns {object|null}
 */
export function normalizeModeRow(raw, mode) {
  if (!raw || typeof raw !== 'object') return null;

  const championId = toNumber(firstDefined(raw.id, raw.championId, raw.champion_id));
  if (championId === null) return null;

  return {
    championId,
    name: typeof raw.name === 'string' ? raw.name : '',
    tier: typeof raw.tier === 'string' ? raw.tier : null,
    stats: normalizeModeStats(raw, mode.statSet),
  };
}

/**
 * Normalise a whole tier list payload into mode rows.
 *
 * @param {*} payload - whatever `ctx.api.modeTierList()` resolved with.
 * @param {object} mode - the mode record.
 * @returns {Array<object>}
 */
export function normalizeModeRows(payload, mode) {
  return extractRows(payload)
    .map((raw) => normalizeModeRow(raw, mode))
    .filter(Boolean);
}

/* -------------------------------------------------------------------------
 * Champion catalogue
 * ---------------------------------------------------------------------- */

/**
 * Collect the champion records of the static data into an id keyed index.
 *
 * `ctx.api.staticData()` answers with
 * `{ champions: [{ id, key, name, title, squareImageUrl, imageUrl, tags }] }`
 * plus a `championNames` list; both are read so a champion that is only
 * present in the name list still gets its name.
 *
 * @param {*} payload
 * @returns {Map<number, object>}
 */
export function collectChampions(payload) {
  const index = new Map();
  if (!payload || typeof payload !== 'object') return index;

  const list = Array.isArray(payload.champions)
    ? payload.champions
    : (Array.isArray(payload.data) ? payload.data : []);

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;

    const id = toNumber(firstDefined(entry.id, entry.champion_id, entry.championId));
    if (id === null) continue;

    index.set(id, {
      id,
      key: firstDefined(entry.key, entry.champion_key) || null,
      name: typeof entry.name === 'string' ? entry.name : '',
      title: typeof entry.title === 'string' ? entry.title : '',
      squareImageUrl: firstDefined(entry.squareImageUrl, entry.square_image_url) || null,
      imageUrl: firstDefined(entry.imageUrl, entry.image_url) || null,
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
    });
  }

  const names = Array.isArray(payload.championNames) ? payload.championNames : [];
  for (const entry of names) {
    if (!entry || typeof entry !== 'object') continue;

    const id = toNumber(firstDefined(entry.id, entry.champion_id, entry.championId));
    if (id === null) continue;

    const name = typeof entry.name === 'string' ? entry.name : '';
    if (!name) continue;

    const known = index.get(id);
    if (known) {
      if (!known.name) known.name = name;
      continue;
    }

    index.set(id, {
      id,
      key: null,
      name,
      title: '',
      squareImageUrl: null,
      imageUrl: null,
      tags: [],
    });
  }

  return index;
}

/**
 * The lanes a champion can be played in, derived from its own role tags.
 *
 * The static data carries Data Dragon style role tags (`["Mage","Support"]`).
 * Both the plain lane tags (`top`, `jungle`, …) and the role tags that map
 * onto a lane (`Marksman` → ADC, `Support` → SUPPORT, …) are honoured, so a
 * champion with two tags is listed under both lanes.
 *
 * @param {string[]|string|null|undefined} tags
 * @returns {string[]} the lane keys, without duplicates.
 */
export function lanesOf(tags) {
  const list = Array.isArray(tags) ? tags : (tags ? [tags] : []);
  const lanes = [];

  const add = (lane) => {
    if (lane && lane !== 'ALL' && !lanes.includes(lane)) lanes.push(lane);
  };

  for (const tag of list) {
    const value = String(tag ?? '').trim().toLowerCase();
    if (!value) continue;

    const direct = LANES.find((lane) => lane.tags.includes(value));
    if (direct) add(direct.key);

    const mapped = ROLE_TO_LANE[value];
    if (mapped) add(mapped);
  }

  return lanes;
}

/* -------------------------------------------------------------------------
 * Merging
 * ---------------------------------------------------------------------- */

/**
 * Merge the mode's champion list with the balance ratios and the champion
 * catalogue.
 *
 * The mode's list is the master: every champion of the mode is a row, even
 * when the mode has no balance ratio for it (the balance cells then show "no
 * data"). A champion that cannot be resolved keeps its numeric id as the
 * label — the id is the only honest name available and no name is ever
 * invented.
 *
 * @param {Array<object>} modeRows - the normalised mode rows.
 * @param {Map<number, object>} balanceIndex - the balance rows by champion id.
 * @param {Map<number, object>} championIndex - the champion catalogue.
 * @returns {Array<object>}
 */
export function mergeModeRows(modeRows, balanceIndex, championIndex) {
  const balances = balanceIndex instanceof Map ? balanceIndex : new Map();
  const catalogue = championIndex instanceof Map ? championIndex : new Map();

  return modeRows.map((row) => {
    const champion = catalogue.get(row.championId) || null;
    const balance = balances.get(row.championId) || null;

    const name = (champion && champion.name) || row.name || '';

    const balanceValues = {};
    for (const column of STAT_COLUMNS) {
      balanceValues[column.id] = balance ? balance[column.id] : null;
    }

    return {
      ...row,
      name: name || String(row.championId),
      resolved: Boolean(name),
      championKey: (champion && champion.key) || null,
      title: (champion && champion.title) || '',
      squareImageUrl: (champion && champion.squareImageUrl) || null,
      imageUrl: (champion && champion.imageUrl) || null,
      lanes: lanesOf(champion && champion.tags),
      balance: balanceValues,
    };
  });
}

/**
 * Merge the raw tier list into the rows of the flattened one.
 *
 * The main process hands back the flattened champion rows, which do not carry
 * the raw counts the arena stats are derived from; the raw tier list does.
 * The rows are matched by champion id.
 *
 * The raw list also carries the `is_rip` flag — the tier list's own marker
 * for a champion that is not in the mode (the retired *Ultimate Spellbook*
 * variants of the arena list, which are duplicates of a live champion and
 * have no games at all). Those rows are dropped.
 *
 * @param {Array<object>} rows - the rows of the flattened tier list.
 * @param {Array<object>} rawRows - the rows of the raw tier list.
 * @returns {Array<object>} the rows, with `average_stats` where known.
 */
export function mergeRawTierList(rows, rawRows) {
  const raw = new Map();

  for (const entry of rawRows || []) {
    if (!entry || typeof entry !== 'object') continue;
    const id = toNumber(firstDefined(entry.id, entry.championId, entry.champion_id));
    if (id === null) continue;

    raw.set(id, {
      stats: entry.average_stats || entry.averageStats || null,
      retired: Boolean(entry.is_rip ?? entry.isRip),
    });
  }

  const merged = [];

  for (const row of rows || []) {
    if (!row || typeof row !== 'object') {
      merged.push(row);
      continue;
    }

    const id = toNumber(firstDefined(row.id, row.championId, row.champion_id));
    const known = id === null ? null : raw.get(id);

    if (known && known.retired) continue;

    if (!row.average_stats && !row.averageStats && known && known.stats) {
      merged.push({ ...row, average_stats: known.stats });
      continue;
    }

    merged.push(row);
  }

  return merged;
}

/* -------------------------------------------------------------------------
 * Formatting
 * ---------------------------------------------------------------------- */

/**
 * Format a balance ratio as the reference writes it: the raw percentage
 * followed by ` %`. The value is never scaled — `95` is `95 %`, not `9500 %`.
 *
 * @param {number|null} value
 * @returns {string}
 */
export function formatRatio(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} %`;
}

/**
 * The bar length of a balance ratio — the ratio itself, `value / 100`.
 *
 * @param {number|null} value
 * @returns {number} a number between 0 and 1 for the baseline range.
 */
export function barRatio(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return value / 100;
}

/**
 * The tone of a balance ratio.
 *
 * `up`   — above the reference champion (green),
 * `down` — below the reference champion (red),
 * `base` — exactly the reference champion (muted),
 * `unknown` — no value at all.
 *
 * @param {number|null} value
 * @returns {'up'|'down'|'base'|'unknown'}
 */
export function ratioTone(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'unknown';
  if (Math.abs(value - 100) < 1e-9) return 'base';
  return value > 100 ? 'up' : 'down';
}

/* -------------------------------------------------------------------------
 * Filtering & sorting
 * ---------------------------------------------------------------------- */

/**
 * The rows the current search term and lane filter let through.
 *
 * @param {Array<object>} rows
 * @param {object} [options] - `{ query, lane }`.
 * @returns {Array<object>}
 */
export function filterRows(rows, options = {}) {
  const query = String(options.query || '').trim().toLowerCase();
  const lane = options.lane || DEFAULT_LANE;

  return rows.filter((row) => {
    if (lane !== DEFAULT_LANE) {
      const lanes = row.lanes || [];
      if (!lanes.includes(lane)) return false;
    }
    if (!query) return true;
    return String(row.name || '').toLowerCase().includes(query);
  });
}

/**
 * The numeric value a column sorts by.
 *
 * The mode stats are `{ text, value }` pairs, the balance ratios are plain
 * numbers and the champion column sorts by name.
 *
 * @param {object} row
 * @param {string} column
 * @returns {number|string|null}
 */
export function sortValue(row, column) {
  if (!row) return null;
  if (column === 'champion') return String(row.name || '');

  if (row.stats && row.stats[column] && typeof row.stats[column] === 'object') {
    return row.stats[column].value;
  }
  if (row.balance && Object.prototype.hasOwnProperty.call(row.balance, column)) {
    return row.balance[column];
  }
  return null;
}

/**
 * Sort the rows client-side.
 *
 * The direction applies to the active column; ties always fall back to the
 * champion name so the order is stable.
 *
 * @param {Array<object>} rows
 * @param {{column:string,direction:'asc'|'desc'}} [sort]
 * @returns {Array<object>}
 */
export function sortRows(rows, sort) {
  const column = (sort && sort.column) || 'champion';
  const direction = sort && sort.direction === 'desc' ? -1 : 1;

  return rows.slice().sort((a, b) => {
    let result = 0;

    if (column === 'champion') {
      result = String(a.name || '').localeCompare(String(b.name || ''), 'en');
    } else {
      const left = sortValue(a, column);
      const right = sortValue(b, column);
      const leftMissing = left === null || left === undefined;
      const rightMissing = right === null || right === undefined;

      if (leftMissing && rightMissing) result = 0;
      else if (leftMissing) result = 1;
      else if (rightMissing) result = -1;
      else if (typeof left === 'number' && typeof right === 'number') result = left - right;
      else result = String(left).localeCompare(String(right), 'en', { numeric: true });
    }

    if (result !== 0) return result * direction;
    return String(a.name || '').localeCompare(String(b.name || ''), 'en');
  });
}
