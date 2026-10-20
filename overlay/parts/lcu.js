/**
 * League Client Update (LCU) access for the overlay.
 *
 * Every call crosses the context bridge into the main process; the overlay
 * never talks to the Riot client directly.
 */
import { INVOKE, tryInvoke } from './bridge.js';

/**
 * Current LCU status.
 * Expected shape: `{ connected: boolean }` (other truthy variants are
 * tolerated by `isConnected`).
 */
export async function status() {
  return tryInvoke(INVOKE, 'LCU_STATUS', null, null);
}

/** True when the LCU status payload says the client is reachable. */
export function isConnected(payload) {
  if (!payload) return false;
  if (typeof payload === 'boolean') return payload;
  if (payload.connected === true) return true;
  if (payload.connected === false) return false;
  if (payload.available === true) return true;
  if (typeof payload.status === 'string') {
    return ['connected', 'online', 'ready', 'ok'].includes(payload.status.toLowerCase());
  }
  return false;
}

/**
 * Perform an arbitrary LCU request.
 *
 * @param {string} method  HTTP method, e.g. `GET`
 * @param {string} path    LCU path, e.g. `/lol-champ-select/v1/session`
 * @param {*}      body    optional request body
 */
export async function request(method, path, body) {
  return tryInvoke(INVOKE, 'LCU_REQUEST', { method, path, body: body ?? null }, null);
}

/** Swap the player's champion with a bench champion. */
export async function swapBench(championId) {
  return tryInvoke(INVOKE, 'LCU_SWAP_BENCH', { championId }, null);
}

/**
 * Apply a rune page.
 * The payload carries both the raw ids and a ready-made page so the main
 * process can pick whichever shape it prefers.
 */
export async function applyRunes(payload) {
  return tryInvoke(INVOKE, 'LCU_APPLY_RUNES', payload, null);
}

/** Apply the recommended item build to the in-game shop. */
export async function applyItemBuild(payload) {
  return tryInvoke(INVOKE, 'LCU_APPLY_ITEM_BUILD', payload, null);
}
