/**
 * System tray icon and context menu.
 *
 * The tray is the app's persistent entry point: it survives the main window
 * being closed and it is the only way to reach the settings screen and the
 * in-game overlay once the window is hidden.
 *
 * Menu actions are forwarded to the renderer on `MAIN_TO_RENDERER.TRAY_ACTION`.
 * The payload is either:
 *
 *   - the string `'settings'` — the renderer navigates to the settings page, or
 *   - an object `{ route, params }` — the renderer navigates to that route.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { Tray, Menu, app } = require('electron');

const { MAIN_TO_RENDERER } = require('../shared/channels.js');
const windows = require('./windows.js');

/** Candidate tray icon files, newest first. */
const ICON_CANDIDATES = [
  path.join(__dirname, '..', 'src', 'assets', 'images', 'tray-icon.png'),
  path.join(__dirname, '..', 'src', 'assets', 'images', 'tray-icon.ico'),
  path.join(__dirname, '..', 'assets', 'icon.ico'),
];

let tray = null;

/**
 * Resolve the tray icon path.
 *
 * @returns {string|null}
 */
function resolveIconPath() {
  for (const candidate of ICON_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (err) { /* ignore */ }
  }
  return null;
}

/**
 * Push a tray action to the renderer.
 *
 * @param {string|{route?:string,params?:object,action?:string}} payload
 */
function notifyTrayAction(payload) {
  windows.broadcast(MAIN_TO_RENDERER.TRAY_ACTION, payload);
}

/**
 * Build the tray context menu.
 *
 * @returns {Electron.Menu}
 */
function buildContextMenu() {
  const win = windows.getMainWindow();
  const visible = Boolean(win && win.isVisible());

  return Menu.buildFromTemplate([
    {
      label: 'Open OP.GG',
      click: () => {
        const main = windows.getMainWindow() || windows.createMainWindow();
        if (main.isMinimized()) main.restore();
        main.show();
        main.focus();
        notifyTrayAction({ route: 'champions', params: {} });
      },
    },
    {
      label: visible ? 'Hide window' : 'Show window',
      click: () => {
        const main = windows.getMainWindow();
        if (!main) {
          windows.createMainWindow();
          return;
        }
        if (main.isVisible()) main.hide();
        else {
          main.show();
          main.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'In-game overlay',
      click: () => {
        void windows.createOverlayWindow({ show: true });
        notifyTrayAction({ action: 'overlay-opened' });
      },
    },
    {
      label: 'Settings',
      click: () => {
        const main = windows.getMainWindow() || windows.createMainWindow();
        main.show();
        main.focus();
        notifyTrayAction('settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
}

/**
 * Create the tray icon.
 *
 * Safe to call more than once — the previous tray is destroyed first.
 *
 * @returns {Tray|null}
 */
function createTray() {
  const iconPath = resolveIconPath();
  if (!iconPath) return null;

  try {
    if (tray && !tray.isDestroyed()) tray.destroy();
    tray = new Tray(iconPath);
    tray.setToolTip('OP.GG for Desktop');
    tray.setContextMenu(buildContextMenu());
    tray.on('click', () => {
      const main = windows.getMainWindow();
      if (!main) {
        windows.createMainWindow();
        return;
      }
      if (main.isVisible() && main.isFocused()) main.hide();
      else {
        if (main.isMinimized()) main.restore();
        main.show();
        main.focus();
      }
    });
    return tray;
  } catch (err) {
    tray = null;
    return null;
  }
}

/**
 * Refresh the tray context menu (e.g. after the window visibility changed).
 */
function refreshTray() {
  if (!tray || tray.isDestroyed()) return;
  try {
    tray.setContextMenu(buildContextMenu());
  } catch (err) { /* ignore */ }
}

/** Destroy the tray icon. */
function destroyTray() {
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy();
    } catch (err) { /* ignore */ }
  }
  tray = null;
}

/** @returns {Tray|null} */
function getTray() {
  return tray && !tray.isDestroyed() ? tray : null;
}

module.exports = {
  createTray,
  refreshTray,
  destroyTray,
  getTray,
  buildContextMenu,
  notifyTrayAction,
  resolveIconPath,
};
