/**
 * Window factories for the desktop app.
 *
 * Two windows exist:
 *
 *   - the **main window** — a regular, standard-framed browser window that
 *     loads `src/index.html`;
 *   - the **overlay window** — a frameless, transparent, always-on-top window
 *     that hosts the in-game HUD. It lives in its own `persist:overlay`
 *     session partition so overlay state never leaks into the main window.
 *
 * The overlay is click-through by default (`setIgnoreMouseEvents(true)`) so the
 * player can click straight through it into League of Legends.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { fileURLToPath } = require('url');
const { BrowserWindow, screen } = require('electron');

const { MAIN_TO_RENDERER } = require('../shared/channels.js');

/** Absolute path of the app root (the folder that holds `main/`, `src/`, …). */
const APP_ROOT = path.join(__dirname, '..');

/** Absolute path of the preload script shared by every window. */
const PRELOAD_PATH = path.join(APP_ROOT, 'preload', 'index.js');

/** Renderer entry point of the main window. */
const MAIN_ENTRY = path.join(APP_ROOT, 'src', 'index.html');

/** Candidate entry points of the overlay renderer, newest layout first. */
const OVERLAY_ENTRIES = [
  path.join(APP_ROOT, 'overlay', 'overlay.html'),
  path.join(APP_ROOT, 'src', 'overlay.html'),
];

/**
 * Reference main-window geometry.
 *
 * The reference app's layout needs 1242px of content: a 174px sidebar plus the
 * 1068px `.main-container` that holds the 356px champion grid and the 672px
 * tier table side by side. Anything narrower clips the table, so the window
 * never goes below that.
 */
const MAIN_WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 1242,
  minHeight: 680,
};

/** Session partition used by the overlay window. */
const OVERLAY_PARTITION = 'persist:overlay';

/** Live window handles. */
let mainWindow = null;
let overlayWindow = null;

/** Whether the overlay is pinned (always on top). */
let overlayPinned = true;

/** Overlay appearance. */
let overlayOpacity = 0.9;
let overlayScale = 1;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the overlay renderer entry point.
 *
 * The overlay renderer is being rebuilt in `overlay/`; `src/overlay.html` is the
 * older location and is still honoured so the app always has something to load.
 *
 * @returns {string|null}
 */
function resolveOverlayEntry() {
  for (const candidate of OVERLAY_ENTRIES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch (err) { /* ignore */ }
  }
  return null;
}

/**
 * Locate the League of Legends game window and read its bounds.
 *
 * Uses a short-lived PowerShell call with `user32!FindWindow`, the same trick
 * the shipped reference uses. Windows only.
 *
 * @returns {Promise<{x:number,y:number,width:number,height:number}|null>}
 */
function findLeagueGameBounds() {
  if (process.platform !== 'win32') return Promise.resolve(null);

  const script = `
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class WinApi {
        [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
        [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
      }
    "@
    $hwnd = [WinApi]::FindWindow($null, "League of Legends (TM) Client")
    if ($hwnd -eq [IntPtr]::Zero) { $hwnd = [WinApi]::FindWindow("RCLIENT", "League of Legends") }
    if ($hwnd -eq [IntPtr]::Zero) { $hwnd = [WinApi]::FindWindow($null, "League of Legends") }
    if ($hwnd -ne [IntPtr]::Zero) {
      $rect = New-Object WinApi+RECT
      if ([WinApi]::GetWindowRect($hwnd, [ref]$rect)) {
        Write-Output "$($rect.Left),$($rect.Top),$($rect.Right - $rect.Left),$($rect.Bottom - $rect.Top)"
      }
    }
  `;

  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${script.replace(/\r?\n/g, ' ')}"`, { timeout: 2500 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        resolve(null);
        return;
      }
      const parts = stdout.trim().split(',').map((n) => Number(n));
      if (parts.length === 4 && parts[2] > 200 && parts[3] > 200) {
        resolve({ x: parts[0], y: parts[1], width: parts[2], height: parts[3] });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Push the window state to a renderer.
 *
 * @param {string} channel
 * @param {object} payload
 */
function broadcast(channel, payload) {
  for (const win of [mainWindow, overlayWindow]) {
    if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
      try {
        win.webContents.send(channel, payload);
      } catch (err) { /* the window went away mid-send */ }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Main window                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Create (or recreate) the main window.
 *
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW.width,
    height: MAIN_WINDOW.height,
    minWidth: MAIN_WINDOW.minWidth,
    minHeight: MAIN_WINDOW.minHeight,
    show: false,
    backgroundColor: '#000000',
    icon: path.join(APP_ROOT, 'assets', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile(MAIN_ENTRY);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  const pushState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    broadcast(MAIN_TO_RENDERER.WINDOW_STATE, {
      maximized: mainWindow.isMaximized(),
      minimized: mainWindow.isMinimized(),
      focused: mainWindow.isFocused(),
      fullScreen: mainWindow.isFullScreen(),
    });
  };

  mainWindow.on('maximize', pushState);
  mainWindow.on('unmaximize', pushState);
  mainWindow.on('focus', pushState);
  mainWindow.on('blur', pushState);
  mainWindow.on('minimize', pushState);
  mainWindow.on('restore', pushState);
  mainWindow.on('enter-full-screen', pushState);
  mainWindow.on('leave-full-screen', pushState);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const { shell } = require('electron');
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/** @returns {BrowserWindow|null} */
function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

/* -------------------------------------------------------------------------- */
/* Overlay window                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Create (or show) the overlay window.
 *
 * @param {object} [options]
 * @param {boolean} [options.show] - show the window immediately
 * @returns {Promise<BrowserWindow|null>}
 */
async function createOverlayWindow(options = {}) {
  const show = options.show !== false;

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (show && !overlayWindow.isVisible()) overlayWindow.showInactive();
    return overlayWindow;
  }

  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.bounds;

  let bounds = { x: display.bounds.x, y: display.bounds.y, width: screenWidth, height: screenHeight };
  try {
    const game = await findLeagueGameBounds();
    if (game && game.width > 400 && game.height > 300) bounds = game;
  } catch (err) { /* fall back to the primary display */ }

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    icon: path.join(APP_ROOT, 'assets', 'icon.ico'),
    webPreferences: {
      preload: PRELOAD_PATH,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false,
      partition: OVERLAY_PARTITION,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Click-through by default: the player interacts with the game, not the HUD.
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  const entry = resolveOverlayEntry();
  if (entry) {
    overlayWindow.loadFile(entry);
  }

  if (show) overlayWindow.showInactive();

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

/** @returns {BrowserWindow|null} */
function getOverlayWindow() {
  return overlayWindow && !overlayWindow.isDestroyed() ? overlayWindow : null;
}

/**
 * Hide the overlay window (it is kept alive so it can be shown again fast).
 */
function hideOverlayWindow() {
  const win = getOverlayWindow();
  if (win) win.hide();
}

/**
 * Show the overlay window without stealing focus from the game.
 */
function showOverlayWindow() {
  const win = getOverlayWindow();
  if (win) win.showInactive();
}

/**
 * Toggle the overlay window's mouse transparency.
 *
 * @param {boolean} ignore
 * @param {object} [options] - Electron's `setIgnoreMouseEvents` options
 */
function setOverlayIgnoreMouseEvents(ignore, options) {
  const win = getOverlayWindow();
  if (!win) return;
  win.setIgnoreMouseEvents(Boolean(ignore), options || { forward: true });
}

/**
 * Toggle the overlay's always-on-top state.
 *
 * @returns {boolean} the new pinned state
 */
function toggleOverlayPin() {
  overlayPinned = !overlayPinned;
  const win = getOverlayWindow();
  if (win) win.setAlwaysOnTop(overlayPinned, 'screen-saver');
  return overlayPinned;
}

/** @returns {boolean} */
function isOverlayPinned() {
  return overlayPinned;
}

/**
 * Move the overlay onto the running League of Legends game window.
 *
 * @returns {Promise<{ok:boolean, bounds?:object}>}
 */
async function dockOverlayToLeague() {
  const win = getOverlayWindow();
  if (!win) return { ok: false, error: 'Overlay window is not open' };
  const bounds = await findLeagueGameBounds();
  if (!bounds) return { ok: false, error: 'League of Legends window not found' };
  win.setBounds(bounds);
  return { ok: true, bounds };
}

/**
 * Move the overlay to an absolute position.
 *
 * @param {{x:number,y:number}} bounds
 * @returns {boolean}
 */
function moveOverlay(bounds) {
  const win = getOverlayWindow();
  if (!win || !bounds) return false;
  const current = win.getBounds();
  win.setBounds({ ...current, x: Math.round(bounds.x), y: Math.round(bounds.y) });
  return true;
}

/**
 * Resize the overlay.
 *
 * @param {{width:number,height:number}} bounds
 * @returns {boolean}
 */
function resizeOverlay(bounds) {
  const win = getOverlayWindow();
  if (!win || !bounds) return false;
  const current = win.getBounds();
  const width = Number.isFinite(bounds.width) ? Math.round(bounds.width) : current.width;
  const height = Number.isFinite(bounds.height) ? Math.round(bounds.height) : current.height;
  win.setBounds({ ...current, width, height });
  return true;
}

/**
 * Read the overlay's current bounds.
 *
 * @returns {{x:number,y:number,width:number,height:number}|null}
 */
function getOverlayBounds() {
  const win = getOverlayWindow();
  if (!win) return null;
  const { x, y, width, height } = win.getBounds();
  return { x, y, width, height };
}

/**
 * Reset the overlay to the bounds of the running game (or the primary display).
 *
 * @returns {Promise<{ok:boolean, bounds?:object}>}
 */
async function resetOverlayPosition() {
  const win = getOverlayWindow();
  if (!win) return { ok: false, error: 'Overlay window is not open' };

  let bounds = null;
  try {
    bounds = await findLeagueGameBounds();
  } catch (err) { /* ignore */ }

  if (!bounds) {
    const display = screen.getPrimaryDisplay();
    bounds = {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    };
  }
  win.setBounds(bounds);
  return { ok: true, bounds };
}

/**
 * Set the overlay opacity.
 *
 * @param {number} value - 0.2 .. 1
 * @returns {number} the applied value
 */
function setOverlayOpacity(value) {
  const num = Number(value);
  overlayOpacity = Number.isFinite(num) ? Math.min(1, Math.max(0.2, num)) : overlayOpacity;
  const win = getOverlayWindow();
  if (win) {
    try {
      win.setOpacity(overlayOpacity);
    } catch (err) { /* not supported on this platform */ }
  }
  return overlayOpacity;
}

/** @returns {number} */
function getOverlayOpacity() {
  return overlayOpacity;
}

/**
 * Set the overlay zoom factor.
 *
 * @param {number} value - 0.5 .. 2
 * @returns {number} the applied value
 */
function setOverlayScale(value) {
  const num = Number(value);
  overlayScale = Number.isFinite(num) ? Math.min(2, Math.max(0.5, num)) : overlayScale;
  const win = getOverlayWindow();
  if (win && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.setZoomFactor(overlayScale);
  }
  return overlayScale;
}

/** @returns {number} */
function getOverlayScale() {
  return overlayScale;
}

/**
 * Centre the main window on the primary display.
 *
 * @returns {{ok:boolean, bounds?:object}}
 */
function resetDesktopPosition() {
  const win = getMainWindow();
  if (!win) return { ok: false, error: 'Main window is not open' };
  const display = screen.getPrimaryDisplay();
  const { width, height } = win.getBounds();
  const bounds = {
    x: Math.round((display.size.width - width) / 2),
    y: Math.round((display.size.height - height) / 2),
  };
  win.setBounds(bounds);
  return { ok: true, bounds };
}

/**
 * Sender validation.
 *
 * A privileged IPC handler must only answer requests that came from one of the
 * app's own renderer frames. Anything else (a stray web page, an injected
 * frame, a devtools extension) is rejected.
 *
 * @param {Electron.IpcMainInvokeEvent|Object} event
 * @returns {boolean}
 */
function isTrustedSender(event) {
  const frame = event && event.senderFrame;
  if (!frame) return false;

  const url = String(frame.url || '');
  if (!url) return false;

  if (url.startsWith('file://')) {
    let filePath;
    try {
      filePath = fileURLToPath(url);
    } catch (err) {
      return false;
    }
    const resolved = path.resolve(filePath);
    return resolved === APP_ROOT || resolved.startsWith(APP_ROOT + path.sep);
  }

  if (url.startsWith('opgg://')) return true;

  return false;
}

module.exports = {
  APP_ROOT,
  PRELOAD_PATH,
  MAIN_ENTRY,
  MAIN_WINDOW,
  OVERLAY_PARTITION,
  createMainWindow,
  getMainWindow,
  createOverlayWindow,
  getOverlayWindow,
  hideOverlayWindow,
  showOverlayWindow,
  setOverlayIgnoreMouseEvents,
  toggleOverlayPin,
  isOverlayPinned,
  dockOverlayToLeague,
  moveOverlay,
  resizeOverlay,
  getOverlayBounds,
  resetOverlayPosition,
  setOverlayOpacity,
  getOverlayOpacity,
  setOverlayScale,
  getOverlayScale,
  resetDesktopPosition,
  findLeagueGameBounds,
  resolveOverlayEntry,
  broadcast,
  isTrustedSender,
};
