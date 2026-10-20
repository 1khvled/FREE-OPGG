/**
 * Renderer-side cache with a TTL and LRU eviction.
 *
 * The champion tier list re-renders on every filter change; without a cache
 * each re-render would hit the network again. `createCache()` keeps the last
 * `maxEntries` results alive for `ttlMs` milliseconds.
 *
 * Pure with respect to the network and the DOM — the only side effect is
 * reading the clock.
 */

/**
 * @typedef {object} CacheEntry
 * @property {*} value
 * @property {number} expiresAt
 */

/**
 * Create a cache.
 *
 * @param {object} [options]
 * @param {number} [options.ttlMs=60000] - entry lifetime in milliseconds.
 * @param {number} [options.maxEntries=200] - maximum number of live entries;
 *        the least recently used entry is evicted first.
 * @param {number} [options.now] - clock override (milliseconds since epoch),
 *        handy for tests.
 * @returns {{
 *   get: (key: string) => *,
 *   set: (key: string, value: *) => *,
 *   has: (key: string) => boolean,
 *   delete: (key: string) => boolean,
 *   clear: () => void,
 *   size: number,
 *   keys: () => string[]
 * }}
 */
export function createCache({ ttlMs = 60000, maxEntries = 200, now = null } = {}) {
  /** @type {Map<string, CacheEntry>} */
  const store = new Map();

  const lifetime = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 60000;
  const capacity = Number.isFinite(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 200;
  const clock = typeof now === 'function' ? now : () => Date.now();

  /** Remove expired entries; called before every read and write. */
  function sweep() {
    const time = clock();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= time) store.delete(key);
    }
  }

  /** Drop the least recently used entry. */
  function evict() {
    while (store.size > capacity) {
      const oldest = store.keys().next();
      if (oldest.done) break;
      store.delete(oldest.value);
    }
  }

  return {
    /**
     * Read a value. Returns `undefined` when the key is unknown or expired.
     * @param {string} key
     */
    get(key) {
      sweep();
      const entry = store.get(key);
      if (!entry) return undefined;
      // Refresh recency (Map keeps insertion order).
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },

    /**
     * Write a value. Returns the stored value.
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      sweep();
      store.delete(key);
      store.set(key, { value, expiresAt: clock() + lifetime });
      evict();
      return value;
    },

    /**
     * Whether a live entry exists.
     * @param {string} key
     */
    has(key) {
      sweep();
      return store.has(key);
    },

    /**
     * Remove a key.
     * @param {string} key
     */
    delete(key) {
      return store.delete(key);
    },

    /** Drop every entry. */
    clear() {
      store.clear();
    },

    /** Number of live entries. */
    get size() {
      sweep();
      return store.size;
    },

    /** The live keys, least recently used first. */
    keys() {
      sweep();
      return Array.from(store.keys());
    },
  };
}

/**
 * A module-level cache for the champion tier list / detail payloads.
 *
 * Keyed by the full request signature (region + mode + tier + lane + …).
 *
 * @type {ReturnType<typeof createCache>}
 */
export const championCache = createCache({ ttlMs: 60000, maxEntries: 200 });
