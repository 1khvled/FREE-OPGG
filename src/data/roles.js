/**
 * Lane (role tab) options for the champion tier list.
 *
 * The reference renders five role tabs plus an "All" tab and filters the
 * champion rows by `positions[].name` (TOP | JUNGLE | MID | ADC | SUPPORT).
 *
 * `tags` are the lane tags a champion carries in Data Dragon / the OP.GG
 * champion metadata, lower-cased. `laneForTags()` maps a champion's tag list
 * back to the best matching lane.
 *
 * Pure data — no imports, no side effects.
 */

/**
 * @typedef {object} Lane
 * @property {string} key   Lane key (`ALL`, `TOP`, `JUNGLE`, `MID`, `ADC`, `SUPPORT`).
 * @property {string} label English display label.
 * @property {string[]} tags Lane tags that match this lane.
 * @property {string} i18nKey Reference i18n key for the label.
 */

/** @type {Lane[]} */
export const LANES = [
  { key: 'ALL', label: 'All', tags: [], i18nKey: 'common.all' },
  { key: 'TOP', label: 'Top', tags: ['top'], i18nKey: 'lol.common.lane.top' },
  { key: 'JUNGLE', label: 'Jungle', tags: ['jungle'], i18nKey: 'lol.common.lane.jungle' },
  { key: 'MID', label: 'Mid', tags: ['mid'], i18nKey: 'lol.common.lane.mid' },
  { key: 'ADC', label: 'ADC', tags: ['adc'], i18nKey: 'lol.common.lane.adc' },
  { key: 'SUPPORT', label: 'Support', tags: ['support'], i18nKey: 'lol.common.lane.support' },
];

/** The lane tab the reference opens with. */
export const DEFAULT_LANE = 'ALL';

/**
 * Role tag → lane key.
 *
 * Covers the lane tags themselves (`top`, `jungle`, …) as well as the Data
 * Dragon / OP.GG role tags the champion metadata carries
 * (`Marksman`, `Fighter`, `Mage`, `Tank`, `Assassin`, `Support`, …) and the
 * role names the champion API returns inside `positions[].roles[]`
 * (`MARKSMAN`, `FIGHTER`, `MAGE`, `TANK`, `SLAYER`, `CONTROLLER`).
 *
 * @type {Record<string, string>}
 */
export const ROLE_TO_LANE = {
  top: 'TOP',
  fighter: 'TOP',
  bruiser: 'TOP',
  tank: 'TOP',
  jungle: 'JUNGLE',
  skirmisher: 'JUNGLE',
  mid: 'MID',
  mage: 'MID',
  artillery: 'MID',
  assassin: 'MID',
  specialist: 'MID',
  adc: 'ADC',
  marksman: 'ADC',
  shooter: 'ADC',
  support: 'SUPPORT',
  catcher: 'SUPPORT',
  controller: 'SUPPORT',
  warden: 'SUPPORT',
};

/**
 * Best lane for a champion's tag list.
 *
 * Resolution order:
 *   1. the first tag that is a lane tag of a lane (`top`, `jungle`, …),
 *   2. the first tag that maps to a lane through `ROLE_TO_LANE`,
 *   3. `ALL` when nothing matches.
 *
 * Never throws; `null` / non-array input yields `ALL`.
 *
 * @param {string[]|string|null|undefined} tags
 * @returns {string} a lane key
 */
export function laneForTags(tags) {
  if (tags === null || tags === undefined) return 'ALL';
  const list = Array.isArray(tags) ? tags : [tags];
  const cleaned = list
    .filter((tag) => tag !== null && tag !== undefined)
    .map((tag) => String(tag).trim().toLowerCase())
    .filter(Boolean);
  if (!cleaned.length) return 'ALL';

  for (const tag of cleaned) {
    const lane = LANES.find((entry) => entry.tags.includes(tag));
    if (lane) return lane.key;
  }
  for (const tag of cleaned) {
    if (ROLE_TO_LANE[tag]) return ROLE_TO_LANE[tag];
  }
  return 'ALL';
}

/**
 * The lane record for a lane key, or `null` when unknown.
 *
 * @param {string} key
 * @returns {Lane|null}
 */
export function laneByKey(key) {
  if (key === null || key === undefined) return null;
  const upper = String(key).trim().toUpperCase();
  return LANES.find((lane) => lane.key === upper) || null;
}

/**
 * The English label for a lane key, or the key itself when unknown.
 *
 * @param {string} key
 * @returns {string}
 */
export function laneLabel(key) {
  const lane = laneByKey(key);
  return lane ? lane.label : String(key ?? '');
}
