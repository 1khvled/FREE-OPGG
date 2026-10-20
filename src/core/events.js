/**
 * Tiny event bus used for cross-component notifications inside the renderer.
 *
 * The store handles state; the bus handles "something happened that is not
 * state" (toasts, focus requests, one-shot signals between pages).
 */

const channels = new Map();

/** Subscribe to an event. Returns an unsubscribe function. */
export function on(name, handler) {
  if (!channels.has(name)) channels.set(name, new Set());
  channels.get(name).add(handler);
  return () => off(name, handler);
}

/** Unsubscribe a handler from an event. */
export function off(name, handler) {
  const set = channels.get(name);
  if (set) set.delete(handler);
}

/** Emit an event. Handler errors never break the emitter. */
export function emit(name, payload) {
  const set = channels.get(name);
  if (!set) return;
  for (const handler of [...set]) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[bus] handler for "${name}" failed`, err);
    }
  }
}

/** Remove every listener (used by the overlay renderer on teardown). */
export function reset() {
  channels.clear();
}

export const bus = { on, off, emit, reset };
export default bus;
