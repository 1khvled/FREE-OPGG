/**
 * Queue / mode options for the champion tier list and champion detail.
 *
 * `apiMode` is the segment the OP.GG champion API expects:
 *   ranked  → /api/{region}/champions/ranked
 *   aram    → /api/{region}/champions/aram/
 *   arena   → /api/{region}/champions/arena/
 *   normal  → /api/{region}/champions/normal/
 *
 * `positions` lists the lane keys a queue is filtered by. Ranked queues are
 * lane-scoped; ARAM / Arena / Normal have no lane filter.
 *
 * Pure data — no imports, no side effects.
 */

/**
 * @typedef {object} Queue
 * @property {string} value     Stable option id used by the UI state.
 * @property {string} label     English display label.
 * @property {string} apiMode   Mode segment for the OP.GG API.
 * @property {string[]} positions Lane keys the queue is filtered by.
 * @property {string} i18nKey   Reference i18n key for the label.
 */

/** Lane keys, in the order the reference renders the role tabs. */
export const LANE_KEYS = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

/** @type {Queue[]} */
export const QUEUES = [
  {
    value: 'ranked_solo',
    label: 'Ranked Solo',
    apiMode: 'ranked',
    positions: LANE_KEYS.slice(),
    i18nKey: 'lol.champions.queue-solo',
  },
  {
    value: 'ranked_flex',
    label: 'Ranked Flex',
    apiMode: 'ranked',
    positions: LANE_KEYS.slice(),
    i18nKey: 'lol.champions.queue-flex',
  },
  {
    value: 'aram',
    label: 'ARAM',
    apiMode: 'aram',
    positions: [],
    i18nKey: 'lol.common.gameMode.aram',
  },
  {
    value: 'arena',
    label: 'Arena / Mayhem',
    apiMode: 'arena',
    positions: [],
    i18nKey: 'lol.common.gameMode.arena',
  },
  {
    value: 'normal',
    label: 'Normal',
    apiMode: 'normal',
    positions: [],
    i18nKey: 'lol.champions.normal',
  },
];

/** The queue the reference opens with. */
export const DEFAULT_QUEUE = 'ranked_solo';

/**
 * The queue for an option id, an API mode, or `null` when unknown.
 *
 * @param {string} value
 * @returns {Queue|null}
 */
export function queueByValue(value) {
  if (value === null || value === undefined) return null;
  const needle = String(value).trim().toLowerCase();
  return (
    QUEUES.find((queue) => queue.value === needle) ||
    QUEUES.find((queue) => queue.apiMode === needle) ||
    null
  );
}

/**
 * The API mode for a queue option id.
 *
 * @param {string} value
 * @returns {string} the mode segment, `ranked` when unknown
 */
export function queueApiMode(value) {
  const queue = queueByValue(value);
  return queue ? queue.apiMode : 'ranked';
}

/**
 * The lane keys a queue is filtered by.
 *
 * @param {string} value
 * @returns {string[]}
 */
export function queuePositions(value) {
  const queue = queueByValue(value);
  return queue ? queue.positions.slice() : [];
}
