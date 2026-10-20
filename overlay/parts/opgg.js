/**
 * OP.GG data access for the overlay.
 *
 * All requests go through the main process (`opgg:*` channels); the overlay
 * renderer performs no network I/O of its own.
 */
import { INVOKE, tryInvoke } from './bridge.js';
import { installStaticData } from './assets.js';

/** Champion detail: tier, runes, build, skills, augments. */
export async function championDetail(params) {
  return tryInvoke(INVOKE, 'OPGG_CHAMPION_DETAIL', params, null);
}

/** Mode tier list, used for the ARAM bench tier badges. */
export async function modeTierList(params) {
  return tryInvoke(INVOKE, 'OPGG_MODE_TIER_LIST', params, null);
}

/**
 * Reference meta dictionaries (champions, items, runes, rune trees, spells,
 * augments). Cached for the lifetime of the overlay window.
 */
let staticDataPromise = null;

export function staticData() {
  if (!staticDataPromise) {
    staticDataPromise = tryInvoke(INVOKE, 'OPGG_STATIC_DATA', null, null).then((payload) => {
      if (payload) installStaticData(payload);
      return payload;
    });
  }
  return staticDataPromise;
}

/** Current patch version, used to resolve the Data Dragon version. */
export async function currentPatch() {
  return tryInvoke(INVOKE, 'OPGG_CURRENT_PATCH', null, null);
}
