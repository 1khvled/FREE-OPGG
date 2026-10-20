/**
 * Persisted application settings.
 *
 * The file lives at `<userData>/settings.json` and is written atomically
 * (temp file + rename) so a crash mid-write can never leave a truncated
 * settings file behind.
 *
 * The defaults mirror the `settings` slice of `src/core/store.js` exactly, so
 * the renderer never has to special-case a missing value.
 *
 * Every mutation notifies the change listeners; `main/ipc/index.js` forwards
 * those notifications to the renderer on `MAIN_TO_RENDERER.SETTINGS_CHANGED`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Default settings — must stay in sync with `src/core/store.js`.
 */
const DEFAULTS = Object.freeze({
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
});

/** Keys whose value must be a boolean. */
const BOOLEAN_KEYS = [
  'autoAccept', 'autoRunes', 'autoBuilds', 'autoSpells',
  'overlayEnabled', 'overlayDocked',
];

/** Keys whose value must be a number inside [min, max]. */
const NUMBER_RANGES = {
  overlayOpacity: [0.2, 1],
  overlayScale: [0.5, 2],
};

/** Allowed themes. */
const THEMES = ['dark', 'light'];

/** Allowed flash keys. */
const FLASH_KEYS = ['D', 'F'];

/**
 * Coerce a value into the type the settings schema expects.
 *
 * @param {string} key
 * @param {*} value
 * @returns {*} the coerced value, or `undefined` when the value is invalid
 */
function coerce(key, value) {
  if (value === undefined || value === null) return undefined;

  if (BOOLEAN_KEYS.includes(key)) {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1 || value === '1') return true;
    if (value === 'false' || value === 0 || value === '0') return false;
    return undefined;
  }

  if (key === 'flashKey') {
    const upper = String(value).toUpperCase();
    return FLASH_KEYS.includes(upper) ? upper : undefined;
  }

  if (key === 'theme') {
    const lower = String(value).toLowerCase();
    return THEMES.includes(lower) ? lower : undefined;
  }

  if (key === 'locale') {
    const lower = String(value).toLowerCase();
    return /^[a-z]{2}(-[a-z0-9]{2,8})?$/i.test(lower) ? lower : undefined;
  }

  if (NUMBER_RANGES[key]) {
    const num = Number(value);
    if (!Number.isFinite(num)) return undefined;
    const [min, max] = NUMBER_RANGES[key];
    return Math.min(max, Math.max(min, num));
  }

  return value;
}

class SettingsStore {
  /**
   * @param {object} [options]
   * @param {string} [options.filePath] - override the settings file location
   */
  constructor(options = {}) {
    this.filePath = options.filePath || null;
    this.values = { ...DEFAULTS };
    this.listeners = new Set();
    this.loaded = false;
  }

  /** Absolute path of the settings file. */
  getFilePath() {
    if (this.filePath) return this.filePath;
    // Required lazily so the module stays importable outside Electron.
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'settings.json');
  }

  /** Read the settings file from disk (missing/corrupt files fall back to defaults). */
  load() {
    const file = this.getFilePath();
    let raw = null;
    try {
      if (fs.existsSync(file)) raw = fs.readFileSync(file, 'utf8');
    } catch (err) {
      raw = null;
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [key, value] of Object.entries(parsed)) {
            if (!(key in DEFAULTS)) continue;
            const coerced = coerce(key, value);
            if (coerced !== undefined) this.values[key] = coerced;
          }
        }
      } catch (err) {
        // A corrupt file must never stop the app from booting.
        this.values = { ...DEFAULTS };
      }
    }

    this.loaded = true;
    return this.values;
  }

  /** Write the settings file atomically (temp file + rename). */
  save() {
    const file = this.getFilePath();
    const dir = path.dirname(file);
    const tmp = path.join(dir, `${path.basename(file)}.${process.pid}.tmp`);

    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(this.values, null, 2), 'utf8');
      fs.renameSync(tmp, file);
      return true;
    } catch (err) {
      try { fs.existsSync(tmp) && fs.unlinkSync(tmp); } catch (cleanupErr) { /* ignore */ }
      return false;
    }
  }

  /**
   * Read one setting (or the whole object when `key` is omitted).
   *
   * @param {string} [key]
   * @returns {*}
   */
  get(key) {
    if (key === undefined) return { ...this.values };
    return this.values[key];
  }

  /**
   * Write one setting.
   *
   * @param {string} key
   * @param {*} value
   * @returns {{ok:boolean, value?:*, error?:string}}
   */
  set(key, value) {
    if (!(key in DEFAULTS)) {
      return { ok: false, error: `Unknown setting "${key}"` };
    }
    const coerced = coerce(key, value);
    if (coerced === undefined) {
      return { ok: false, error: `Invalid value for "${key}"` };
    }
    if (this.values[key] === coerced) return { ok: true, value: coerced };

    this.values[key] = coerced;
    this.save();
    this.emit({ [key]: coerced }, key);
    return { ok: true, value: coerced };
  }

  /**
   * Write several settings at once.
   *
   * @param {object} patch
   * @returns {{ok:boolean, error?:string, values?:object}}
   */
  setAll(patch) {
    if (!patch || typeof patch !== 'object') {
      return { ok: false, error: 'Settings patch must be an object' };
    }
    const changed = {};
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULTS)) continue;
      const coerced = coerce(key, value);
      if (coerced === undefined) continue;
      if (this.values[key] === coerced) continue;
      this.values[key] = coerced;
      changed[key] = coerced;
    }
    if (!Object.keys(changed).length) return { ok: true, values: { ...this.values } };

    this.save();
    this.emit(changed, Object.keys(changed));
    return { ok: true, values: { ...this.values } };
  }

  /** Restore the defaults. */
  reset() {
    this.values = { ...DEFAULTS };
    this.save();
    this.emit({ ...this.values }, Object.keys(this.values));
    return { ...this.values };
  }

  /**
   * Subscribe to changes.
   *
   * @param {(settings:object, changedKey:string|null) => void} listener
   * @returns {() => void} unsubscribe
   */
  onChange(listener) {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify the listeners.
   *
   * @param {object} changed
   * @param {string|string[]} keys
   */
  emit(changed, keys) {
    const changedKey = Array.isArray(keys) ? keys[0] : keys;
    for (const listener of [...this.listeners]) {
      try {
        listener({ ...this.values }, changedKey);
      } catch (err) {
        // A broken listener must not break the settings write.
      }
    }
  }
}

module.exports = { SettingsStore, DEFAULTS, coerce };
