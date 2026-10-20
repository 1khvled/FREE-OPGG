/**
 * IPC registration.
 *
 * Every channel that the renderer may use comes from `shared/channels.js` —
 * nothing is hard-coded here. The four modules below register their slice of
 * the contract:
 *
 *   - `window.js`  — main window + overlay window
 *   - `lcu.js`     — League Client Update integration
 *   - `opgg.js`    — OP.GG data layer
 *   - `system.js`  — clipboard, external links, version, paths, settings
 *
 * ## Sender validation
 *
 * Privileged handlers are wrapped in `privileged()`. The wrapper checks
 * `event.senderFrame` and rejects anything that is not a frame of this
 * application (`file://` inside the app root, or the `opgg://` scheme). This is
 * the main-process counterpart of the two sender-validation sites recovered
 * from the shipped bundle: a request from an unexpected frame is ignored
 * instead of being executed.
 */

'use strict';

const { ipcMain } = require('electron');

const {
  MAIN_TO_RENDERER,
  RENDERER_TO_MAIN,
  RENDERER_TO_MAIN_INVOKE,
  ALL_INVOKE_CHANNELS,
  ALL_SEND_CHANNELS,
  ALL_RECEIVE_CHANNELS,
} = require('../../shared/channels.js');

const windows = require('../windows.js');
const updater = require('../updater.js');
const { SettingsStore } = require('../services/settings-store.js');

const registerWindowIpc = require('./window.js');
const registerLcuIpc = require('./lcu.js');
const registerOpggIpc = require('./opgg.js');
const registerSystemIpc = require('./system.js');

const { LcuWatcher } = require('./lcu.js');

/**
 * Wrap a handler so that it only runs for a trusted sender frame and never
 * throws across the bridge.
 *
 * @param {(event:*, payload:*) => *} handler
 * @returns {(event:*, payload:*) => Promise<object>}
 */
function privileged(handler) {
  return async (event, payload) => {
    if (!windows.isTrustedSender(event)) {
      return { ok: false, error: 'Rejected: untrusted sender frame' };
    }
    try {
      const result = await handler(event, payload);
      if (result && typeof result === 'object' && typeof result.ok === 'boolean') return result;
      return { ok: true, data: result === undefined ? null : result };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : String(err) };
    }
  };
}

/**
 * Wrap a fire-and-forget listener with the same sender check.
 *
 * @param {(event:*, payload:*) => void} handler
 * @returns {(event:*, payload:*) => void}
 */
function guardedOn(handler) {
  return (event, payload) => {
    if (!windows.isTrustedSender(event)) return;
    try {
      handler(event, payload);
    } catch (err) {
      // A failing listener must never crash the main process.
    }
  };
}

/**
 * Create the shared IPC context.
 *
 * @returns {object}
 */
function createContext() {
  const settings = new SettingsStore();
  settings.load();

  const broadcast = (channel, payload) => windows.broadcast(channel, payload);

  const lcu = new LcuWatcher({ broadcast, windows });

  // Restore the persisted automations.
  lcu.automations.autoAccept = Boolean(settings.get('autoAccept'));
  lcu.automations.autoRunes = Boolean(settings.get('autoRunes'));
  lcu.automations.autoBuilds = Boolean(settings.get('autoBuilds'));
  lcu.automations.autoSpells = Boolean(settings.get('autoSpells'));
  lcu.automations.flashKey = settings.get('flashKey') === 'D' ? 'D' : 'F';

  return {
    ipcMain,
    windows,
    settings,
    lcu,
    updater,
    broadcast,
    privileged,
    guardedOn,
  };
}

/**
 * Register every IPC handler.
 *
 * @param {object} ctx - the context created by {@link createContext}
 */
function registerIpc(ctx) {
  registerWindowIpc(ctx);
  registerLcuIpc(ctx);
  registerOpggIpc(ctx);
  registerSystemIpc(ctx);
}

/**
 * Start the League client watcher.
 *
 * @param {object} ctx
 */
function startWatcher(ctx) {
  ctx.lcu.start();
}

/**
 * Stop the League client watcher.
 *
 * @param {object} ctx
 */
function stopWatcher(ctx) {
  ctx.lcu.stop();
}

module.exports = {
  createContext,
  registerIpc,
  startWatcher,
  stopWatcher,
  privileged,
  guardedOn,
  channels: {
    MAIN_TO_RENDERER,
    RENDERER_TO_MAIN,
    RENDERER_TO_MAIN_INVOKE,
    ALL_INVOKE_CHANNELS,
    ALL_SEND_CHANNELS,
    ALL_RECEIVE_CHANNELS,
  },
};
