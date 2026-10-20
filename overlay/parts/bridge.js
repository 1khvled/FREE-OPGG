/**
 * Context-bridge access for the in-game overlay renderer.
 *
 * The overlay runs in its own frameless, transparent, always-on-top Electron
 * window but talks to the main process through exactly the same bridge the
 * main renderer uses:
 *
 *   window.opgg.invoke(channel, payload)
 *   window.opgg.send(channel, payload)
 *   window.opgg.on(channel, handler)
 *   window.opgg.channels
 *
 * Channel *names* are never hard-coded here — they are resolved from
 * `window.opgg.channels`, which the preload exposes straight from
 * `shared/channels.js`. That keeps main, preload and renderer from drifting.
 */

/** Channel groups as named in `shared/channels.js`. */
export const SEND = 'RENDERER_TO_MAIN';
export const INVOKE = 'RENDERER_TO_MAIN_INVOKE';
export const RECEIVE = 'MAIN_TO_RENDERER';

/** True when the preload bridge is present. */
export function hasBridge() {
  return typeof window !== 'undefined' && !!window.opgg;
}

/** The bridge object, or a thrown error when the preload never ran. */
export function bridge() {
  if (!hasBridge()) {
    throw new Error('[overlay] context bridge unavailable — preload did not run');
  }
  return window.opgg;
}

/**
 * Resolve a channel name from the bridge's channel map.
 * Falls back to the key itself so a missing entry never throws.
 */
export function channel(group, key) {
  const map = (hasBridge() && window.opgg.channels) || {};
  const bag = map[group] || {};
  return bag[key] || key;
}

/** Invoke a main-process handler. Rejects when the handler fails. */
export function invoke(group, key, payload) {
  return bridge().invoke(channel(group, key), payload);
}

/** Fire-and-forget message to the main process. */
export function send(group, key, payload) {
  bridge().send(channel(group, key), payload);
}

/** Subscribe to a main-process push channel. Returns an unsubscribe function. */
export function on(group, key, handler) {
  const off = bridge().on(channel(group, key), handler);
  return typeof off === 'function' ? off : () => {};
}

/**
 * Invoke a handler and swallow failures.
 * Returns `fallback` when the bridge or the handler is unavailable.
 */
export async function tryInvoke(group, key, payload, fallback = null) {
  try {
    const result = await invoke(group, key, payload);
    return result === undefined ? fallback : result;
  } catch (err) {
    log('invoke-failed', { group, key, message: String(err && err.message ? err.message : err) });
    return fallback;
  }
}

/**
 * Send a message and swallow failures (the overlay must never crash the
 * window because the main process was busy).
 */
export function trySend(group, key, payload) {
  try {
    send(group, key, payload);
    return true;
  } catch (err) {
    log('send-failed', { group, key, message: String(err && err.message ? err.message : err) });
    return false;
  }
}

/**
 * Route a diagnostic message to the main process' `app:log` channel.
 * The overlay never writes to the console — that would be noise in a window
 * the user can see over their game.
 */
export function log(scope, detail) {
  try {
    if (!hasBridge()) return;
    send(SEND, 'LOG', { scope: `overlay.${scope}`, detail: detail ?? null });
  } catch {
    /* logging must never throw */
  }
}
