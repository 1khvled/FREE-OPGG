/**
 * Game modes screen — page-local data shaping.
 *
 * The reference's "Game modes" screen (`/lol/modes`) shows the per-champion
 * **balance ratios** of the mode: how each champion's numbers compare to the
 * reference champion of that mode.
 *
 * The data arrives from `ctx.api.aramBalance()`:
 *
 *   { ok: true, rows: [ { championId, attackSpeed, damageDealt, damageTaken,
 *                         cooldownReduction, healing, tenacity, shieldAmount,
 *                         energyRegen, areaOfEffectDamage, default } ] }
 *
 * Two facts drive the whole module:
 *
 *   1. **The values are already percentages against the reference champion.**
 *      `100` is the baseline and `95` means "95 % of the reference value".
 *      They are never multiplied by 100 again — `95` is rendered as `95 %` and
 *      the bar length is `value / 100`.
 *
 *   2. **The rows carry champion ids only.** The names and the portraits come
 *      from `ctx.api.staticData()`. A champion that cannot be resolved keeps
 *      its numeric id as the label — a name is never invented.
 *
 * Everything in this module is pure: no DOM, no network, no store.
 */

/* -------------------------------------------------------------------------
 * Option catalogues
 * ---------------------------------------------------------------------- */

import { LANES, ROLE_TO_LANE } from '../../data/index.js';

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
 * The field aliases of every ratio, in priority order.
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

/**
 * Attach the champion identity to the balance rows.
 *
 * A champion that cannot be resolved keeps its numeric id as the label — the
 * id is the only honest name available and no name is ever invented.
 *
 * @param {Array<object>} rows - the normalised balance rows.
 * @param {Map<number, object>} index - the champion index.
 * @returns {Array<object>}
 */
export function mergeRows(rows, index) {
  const catalogue = index instanceof Map ? index : new Map();

  return rows.map((row) => {
    const champion = catalogue.get(row.championId) || null;
    const name = (champion && champion.name) || '';

    return {
      ...row,
      name: name || String(row.championId),
      resolved: Boolean(name),
      championKey: (champion && champion.key) || null,
      title: (champion && champion.title) || '',
      squareImageUrl: (champion && champion.squareImageUrl) || null,
      imageUrl: (champion && champion.imageUrl) || null,
      lanes: lanesOf(champion && champion.tags),
    };
  });
}

/* -------------------------------------------------------------------------
 * Formatting
 * ---------------------------------------------------------------------- */

/**
 * Format a ratio as the reference writes it: the raw percentage followed by
 * ` %`. The value is never scaled — `95` is `95 %`, not `9500 %`.
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
 * The bar length of a ratio — the ratio itself, `value / 100`.
 *
 * @param {number|null} value
 * @returns {number} a number between 0 and 1 for the baseline range.
 */
export function barRatio(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return value / 100;
}

/**
 * The tone of a ratio.
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
      const left = a[column];
      const right = b[column];
      const leftMissing = left === null || left === undefined;
      const rightMissing = right === null || right === undefined;

      if (leftMissing && rightMissing) result = 0;
      else if (leftMissing) result = 1;
      else if (rightMissing) result = -1;
      else result = left - right;
    }

    if (result !== 0) return result * direction;
    return String(a.name || '').localeCompare(String(b.name || ''), 'en');
  });
}
