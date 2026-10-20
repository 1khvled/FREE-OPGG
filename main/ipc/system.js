/**
 * Application level IPC handlers (clipboard, external links, version, paths,
 * settings, logging).
 */

'use strict';

const path = require('path');
const { app, clipboard, shell } = require('electron');

const { MAIN_TO_RENDERER, RENDERER_TO_MAIN, RENDERER_TO_MAIN_INVOKE } = require('../../shared/channels.js');

/** Only these schemes may be opened with the system browser. */
const ALLOWED_EXTERNAL_SCHEMES = ['http:', 'https:', 'mailto:'];

/**
 * Register the application level handlers.
 *
 * @param {object} ctx - `{ ipcMain, settings, broadcast, privileged }`
 */
function register(ctx) {
  const { ipcMain, settings, broadcast, privileged } = ctx;

  /* ----------------------------------------------------------- external links */

  ipcMain.on(RENDERER_TO_MAIN.OPEN_EXTERNAL, (event, payload) => {
    const url = typeof payload === 'string' ? payload : (payload && payload.url);
    if (!url) return;
    let parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      return;
    }
    if (!ALLOWED_EXTERNAL_SCHEMES.includes(parsed.protocol)) return;
    void shell.openExternal(parsed.toString());
  });

  /* --------------------------------------------------------------- clipboard */

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.APP_COPY_TO_CLIPBOARD, privileged((event, payload) => {
    const text = typeof payload === 'string' ? payload : (payload && payload.text);
    if (typeof text !== 'string') return { ok: false, error: 'text must be a string' };
    clipboard.writeText(text);
    return { ok: true };
  }));

  /* ----------------------------------------------------------------- version */

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.APP_GET_VERSION, privileged(() => ({
    ok: true,
    version: app.getVersion(),
    name: app.getName(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  })));

  /* ------------------------------------------------------------------- paths */

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.APP_GET_PATHS, privileged(() => {
    let appPath = null;
    try {
      appPath = app.getAppPath();
    } catch (err) {
      appPath = null;
    }
    const paths = {
      userData: safePath('userData'),
      appPath,
      home: safePath('home'),
      temp: safePath('temp'),
      downloads: safePath('downloads'),
      exe: process.execPath,
    };
    return { ok: true, paths };
  }));

  /* ---------------------------------------------------------------- settings */

  ipcMain.on(RENDERER_TO_MAIN.SETTINGS_SET, (event, payload) => {
    if (!settings) return;
    if (payload && typeof payload === 'object' && payload.key !== undefined) {
      settings.set(String(payload.key), payload.value);
      return;
    }
    if (payload && typeof payload === 'object') {
      settings.setAll(payload);
    }
  });

  /* -------------------------------------------------------------------- log */

  ipcMain.on(RENDERER_TO_MAIN.LOG, (event, payload) => {
    if (!process.env.OPGG_DEBUG) return;
    const level = (payload && payload.level) || 'info';
    const message = (payload && payload.message) || '';
    const prefix = '[renderer]';
    if (level === 'error') console.error(prefix, message, payload && payload.detail ? payload.detail : '');
    else if (level === 'warn') console.warn(prefix, message);
    else console.log(prefix, message);
  });

  /* ------------------------------------------------- settings change fan-out */

  if (settings && typeof settings.onChange === 'function') {
    settings.onChange((values) => {
      broadcast(MAIN_TO_RENDERER.SETTINGS_CHANGED, { ...values });
    });
  }
}

/**
 * `app.getPath(name)` without throwing for unknown names.
 *
 * @param {string} name
 * @returns {string|null}
 */
function safePath(name) {
  try {
    return app.getPath(name);
  } catch (err) {
    return null;
  }
}

module.exports = register;
module.exports.safePath = safePath;
