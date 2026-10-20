/**
 * Observable application store.
 *
 * A tiny pub/sub store is enough for this app and keeps the renderer
 * dependency-free. Pages read slices with `getState()` and re-render in
 * response to `subscribe()`.
 */

/**
 * @param {object} initialState
 * @returns {{
 *   getState: () => object,
 *   setState: (patch: object|((s:object)=>object)) => object,
 *   update: (path: string, value: any) => object,
 *   subscribe: (fn: (s:object, changed:string[]) => void) => () => void,
 *   select: (fn: (s:object) => any) => any
 * }}
 */
export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    if (!next || typeof next !== 'object') return state;
    const changed = [];
    for (const key of Object.keys(next)) {
      if (state[key] !== next[key]) changed.push(key);
    }
    state = { ...state, ...next };
    if (changed.length) {
      for (const fn of [...listeners]) {
        try {
          fn(state, changed);
        } catch (err) {
          console.error('[store] subscriber failed', err);
        }
      }
    }
    return state;
  }

  /** Set a dotted path, e.g. `update('filters.role', 'jungle')`. */
  function update(path, value) {
    const parts = String(path).split('.');
    const root = { ...state };
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...(cursor[key] || {}) };
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
    return setState(root);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function select(fn) {
    return fn(state);
  }

  return { getState, setState, update, subscribe, select };
}

/**
 * The single application store.
 *
 * Shape:
 *   route         { id, params }
 *   theme         'dark' | 'light'
 *   locale        'en'
 *   lcu           { connected, phase, summoner, session, readyCheck }
 *   champions     { byId, order, loading, error, filters, lastUpdated }
 *   detail        { championId, position, data, loading, error }
 *   leaderboard   { rows, loading, error, filters }
 *   multisearch   { results, loading, error }
 *   myPage        { profile, matches, loading, error }
 *   overlay       { visible, docked, opacity, scale, ignoreMouse }
 *   settings      { ... }
 */
export const store = createStore({
  route: { id: 'champions', params: {} },
  theme: 'dark',
  locale: 'en',
  lcu: { connected: false, phase: 'None', summoner: null, session: null, readyCheck: null },
  champions: {
    byId: {},
    order: [],
    loading: false,
    error: null,
    lastUpdated: null,
    filters: {
      role: 'ALL',
      // The reference desktop app opens on "Platinum +", not "Emerald +".
      tier: 'platinum_plus',
      region: 'GLOBAL',
      queue: 'ranked',
      patch: null,
      showAll: false,
    },
    sort: { column: 'rank', direction: 'asc' },
  },
  detail: { championId: null, position: 'top', data: null, loading: false, error: null },
  leaderboard: { rows: [], loading: false, error: null, filters: { region: 'GLOBAL', tier: 'challenger' } },
  multisearch: { results: [], loading: false, error: null },
  myPage: { profile: null, matches: [], loading: false, error: null },
  overlay: { visible: false, docked: false, opacity: 1, scale: 1, ignoreMouse: false },
  settings: {
    theme: 'dark',
    locale: 'en',
    autoAccept: false,
    autoRunes: false,
    autoBuilds: false,
    autoSpells: false,
    flashKey: 'D',
    overlayEnabled: true,
    overlayOpacity: 0.9,
    overlayScale: 1,
    overlayDocked: true,
  },
});
