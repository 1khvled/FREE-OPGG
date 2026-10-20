/**
 * Overlay-local settings.
 *
 * The overlay window keeps its own transient UI state (which HUD sections are
 * open, where the HUD sits, whether the HUD is unlocked) in the overlay
 * partition's `localStorage`. The same values are mirrored to the main
 * process through `app:settings-set` so the main process stays the owner of
 * the persisted settings and can restore them when the overlay is recreated.
 */
import { SEND, trySend, log } from './bridge.js';

const STORAGE_KEY = 'opgg.overlay.hud.v1';

/** Settings key used when mirroring to the main process. */
const MAIN_KEY = 'overlay.hud';

const DEFAULTS = {
  /** Section id -> visible. */
  sections: {
    runes: true,
    build: true,
    skills: true,
    spells: true,
    bench: true,
    augments: true,
    objectives: true,
  },
  /** HUD offset inside the overlay window, in CSS pixels. */
  offset: { x: 0, y: 0 },
  /** Whether the HUD currently steals the mouse from the game. */
  interactive: false,
  /** Whether the user hid the HUD with Ctrl+Shift+O. */
  hidden: false,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      ...clone(DEFAULTS),
      ...parsed,
      sections: { ...DEFAULTS.sections, ...(parsed.sections || {}) },
      offset: { ...DEFAULTS.offset, ...(parsed.offset || {}) },
    };
  } catch (err) {
    log('settings-read-failed', { message: String(err && err.message ? err.message : err) });
    return clone(DEFAULTS);
  }
}

/** The current overlay settings (a fresh copy). */
export function getSettings() {
  return readStorage();
}

/**
 * Merge a patch into the overlay settings, persist locally and mirror to the
 * main process. Returns the merged settings.
 */
export function updateSettings(patch) {
  const current = readStorage();
  const next = {
    ...current,
    ...(patch || {}),
    sections: { ...current.sections, ...((patch && patch.sections) || {}) },
    offset: { ...current.offset, ...((patch && patch.offset) || {}) },
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    log('settings-write-failed', { message: String(err && err.message ? err.message : err) });
  }
  trySend(SEND, 'SETTINGS_SET', { key: MAIN_KEY, value: next });
  return next;
}
