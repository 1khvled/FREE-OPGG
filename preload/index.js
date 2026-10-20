/**
 * Context bridge.
 *
 * The renderer gets exactly **one** global: `window.opgg`.
 *
 *   window.opgg.invoke(channel, payload)  -> Promise<result>
 *   window.opgg.send(channel, payload)     -> void
 *   window.opgg.on(channel, handler)       -> unsubscribe()
 *   window.opgg.channels                   -> the channel maps
 *
 * `invoke` and `send` only accept channel names that exist in
 * `shared/channels.js` — the single source of truth. Anything else is rejected
 * before it reaches the main process.
 *
 * The preload is CommonJS on purpose; the renderer is ES modules and never
 * touches Node APIs directly.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');
const channels = require('../shared/channels.js');

/** Channels the renderer may `invoke` (request / response). */
const INVOKE_CHANNELS = new Set(channels.ALL_INVOKE_CHANNELS);

/** Channels the renderer may `send` (fire and forget). */
const SEND_CHANNELS = new Set(channels.ALL_SEND_CHANNELS);

/** Channels the renderer may subscribe to (main -> renderer push). */
const RECEIVE_CHANNELS = new Set(channels.ALL_RECEIVE_CHANNELS);

/**
 * Invoke a main-process handler.
 *
 * @param {string} channel
 * @param {*} [payload]
 * @returns {Promise<*>}
 */
function invoke(channel, payload) {
  if (!INVOKE_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`[opgg] blocked invoke on unknown channel "${channel}"`));
  }
  return ipcRenderer.invoke(channel, payload);
}

/**
 * Send a fire-and-forget message to the main process.
 *
 * @param {string} channel
 * @param {*} [payload]
 */
function send(channel, payload) {
  if (!SEND_CHANNELS.has(channel)) {
    throw new Error(`[opgg] blocked send on unknown channel "${channel}"`);
  }
  ipcRenderer.send(channel, payload);
}

/**
 * Subscribe to a main-process push channel.
 *
 * @param {string} channel
 * @param {(payload:*) => void} handler
 * @returns {() => void} unsubscribe
 */
function on(channel, handler) {
  if (!RECEIVE_CHANNELS.has(channel)) {
    return () => {};
  }
  if (typeof handler !== 'function') {
    return () => {};
  }

  const listener = (event, payload) => {
    try {
      handler(payload);
    } catch (err) {
      // A failing renderer handler must not break the IPC channel.
      console.error('[opgg] listener failed', err);
    }
  };

  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('opgg', {
  invoke,
  send,
  on,
  channels: {
    MAIN_TO_RENDERER: channels.MAIN_TO_RENDERER,
    RENDERER_TO_MAIN: channels.RENDERER_TO_MAIN,
    RENDERER_TO_MAIN_INVOKE: channels.RENDERER_TO_MAIN_INVOKE,
  },
});
