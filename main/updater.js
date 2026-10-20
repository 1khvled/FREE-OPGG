/**
 * Patch / version tracking.
 *
 * The reference ships a small "auto patch" engine that watches the Riot Data
 * Dragon version list and the OP.GG meta version list and tells the UI when a
 * new patch is live.
 *
 * This replica is deliberately **download-free**: it only *checks* what the
 * current version is and whether a newer patch exists. Nothing is fetched from
 * an untrusted host and nothing is executed automatically.
 */

'use strict';

const { app } = require('electron');

const { MAIN_TO_RENDERER } = require('../shared/channels.js');
const opgg = require('./services/opgg-client.js');

/** Current known Data Dragon version + patch. */
let current = {
  version: null,
  patch: null,
  updatedAt: null,
};

/** Interval handle for the periodic check. */
let timer = null;

/**
 * Extract the `major.minor` patch from a full version string.
 *
 * @param {string|null} version
 * @returns {string|null}
 */
function toPatch(version) {
  if (!version) return null;
  const parts = String(version).split('.');
  if (parts.length < 2) return String(version);
  return `${parts[0]}.${parts[1]}`;
}

/**
 * Broadcast the update status to the renderer.
 *
 * @param {object} payload
 */
function broadcastStatus(payload) {
  const windows = require('./windows.js');
  windows.broadcast(MAIN_TO_RENDERER.UPDATE_STATUS, payload);
}

/**
 * Read the current patch state.
 *
 * @returns {{ok:boolean, version:string|null, patch:string|null, updatedAt:number|null}}
 */
function getCurrentPatch() {
  return {
    ok: true,
    version: current.version,
    patch: current.patch,
    updatedAt: current.updatedAt,
    appVersion: safeAppVersion(),
  };
}

/**
 * `app.getVersion()` without exploding outside Electron.
 *
 * @returns {string|null}
 */
function safeAppVersion() {
  try {
    return app.getVersion();
  } catch (err) {
    return null;
  }
}

/**
 * Look up the newest Data Dragon version and the newest OP.GG patch.
 *
 * @returns {Promise<{version:string|null, patch:string|null, versions:string[]}>}
 */
async function resolveLatest() {
  let version = null;
  let versions = [];

  try {
    versions = await opgg.getDdragonVersions();
    if (versions.length) version = versions[0];
  } catch (err) {
    versions = [];
  }

  if (!version) {
    try {
      const opggVersions = await opgg.getGameVersions();
      if (opggVersions.length) version = opggVersions[0];
    } catch (err) {
      version = null;
    }
  }

  return { version, patch: toPatch(version), versions };
}

/**
 * Check whether a newer patch is available.
 *
 * @param {object} [options]
 * @param {boolean} [options.manual] - a user-initiated check (always reports)
 * @returns {Promise<object>} the update status payload
 */
async function checkForPatchUpdate(options = {}) {
  const manual = Boolean(options.manual);

  try {
    const latest = await resolveLatest();
    const known = current.version;
    const updateAvailable = Boolean(latest.version && known && latest.version !== known);

    if (!known || updateAvailable) {
      current = {
        version: latest.version,
        patch: latest.patch,
        updatedAt: Date.now(),
      };
    }

    const payload = {
      ok: true,
      manual,
      current: { version: current.version, patch: current.patch },
      latest: { version: latest.version, patch: latest.patch },
      updateAvailable,
      checkedAt: Date.now(),
      appVersion: safeAppVersion(),
    };

    if (updateAvailable) broadcastStatus(payload);
    return payload;
  } catch (err) {
    const payload = {
      ok: false,
      error: err.message,
      current: { version: current.version, patch: current.patch },
      latest: { version: null, patch: null },
      updateAvailable: false,
      checkedAt: Date.now(),
      appVersion: safeAppVersion(),
    };
    if (manual) broadcastStatus(payload);
    return payload;
  }
}

/**
 * Start the periodic check.
 *
 * @param {number} [intervalMs]
 */
function start(intervalMs = 30 * 60 * 1000) {
  stop();
  void checkForPatchUpdate({ manual: false });
  timer = setInterval(() => {
    void checkForPatchUpdate({ manual: false });
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
}

/** Stop the periodic check. */
function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  checkForPatchUpdate,
  getCurrentPatch,
  start,
  stop,
  toPatch,
  get current() {
    return { ...current };
  },
};
