/**
 * Minimal observable store for the overlay.
 *
 * Same contract as `src/core/store.js` (`getState` / `setState` / `subscribe`)
 * but re-implemented here because the overlay may not import from `src/`.
 */
export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      if (!next) return state;
      state = { ...state, ...next };
      for (const listener of Array.from(listeners)) {
        try {
          listener(state);
        } catch {
          /* a broken subscriber must not break the HUD */
        }
      }
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
