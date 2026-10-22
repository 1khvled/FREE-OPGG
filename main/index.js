/**
 * Electron entry point.
 *
 * Responsibilities:
 *   - register the `opgg://` protocol as a privileged scheme
 *   - create the main window and the (optional) overlay window
 *   - create the system tray icon
 *   - register every IPC handler from `shared/channels.js`
 *   - start the League client watcher and the patch checker
 *   - handle the single-instance lock and the `opgg://` deep links
 *
 * The process is deliberately frugal: the reference is CPU-conscious, so the
 * same Chromium switches are applied and no background work runs while the
 * League client is closed.
 */

'use strict';

const { app, BrowserWindow, globalShortcut } = require('electron');

const { MAIN_TO_RENDERER } = require('../shared/channels.js');
const protocolHandler = require('./protocol.js');
const windows = require('./windows.js');
const tray = require('./tray.js');
const updater = require('./updater.js');
const ipc = require('./ipc/index.js');

/* -------------------------------------------------------------------------- */
/* Chromium switches — keep the footprint small                                */
/* -------------------------------------------------------------------------- */

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-notifications');
app.commandLine.appendSwitch('disable-background-timer-throttling', 'false');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');

/* -------------------------------------------------------------------------- */
/* Protocol (must be registered before the app is ready)                        */
/* -------------------------------------------------------------------------- */

protocolHandler.registerScheme();
protocolHandler.setAsDefaultProtocolClient();

/* -------------------------------------------------------------------------- */
/* Single instance                                                             */
/* -------------------------------------------------------------------------- */

const gotTheLock = app.requestSingleInstanceLock();

/** The live IPC context (created once the app is ready). */
let ipcContext = null;

/**
 * Handle an `opgg://` deep link.
 *
 * @param {string} url
 */
function handleDeepLink(url) {
  if (!url) return;
  void protocolHandler.handleProtocolUrl(url).then((result) => {
    if (result && result.ok && result.action === 'desktop-position-reset') {
      const win = windows.getMainWindow();
      if (win) win.show();
    }
  });
}

/**
 * Focus (or create) the main window.
 */
function focusMainWindow() {
  const win = windows.getMainWindow();
  if (!win) {
    windows.createMainWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  // The verification tools run the app with `--hidden`; they must never raise
  // a window on the user's desktop.
  if (!process.argv.includes('--hidden')) {
    win.show();
    win.focus();
  }
}

/**
 * Register the global shortcuts of the reference.
 */
function registerShortcuts() {
  const toggles = [
    {
      accelerator: 'CommandOrControl+G',
      handler: () => {
        const overlay = windows.getOverlayWindow();
        if (!overlay) {
          void windows.createOverlayWindow({ show: true });
          return;
        }
        if (overlay.isVisible()) windows.hideOverlayWindow();
        else void windows.resetOverlayPosition().then(() => windows.showOverlayWindow());
      },
    },
    {
      accelerator: 'CommandOrControl+Shift+O',
      handler: () => {
        const overlay = windows.getOverlayWindow();
        if (!overlay) {
          void windows.createOverlayWindow({ show: true });
          return;
        }
        if (overlay.isVisible()) windows.hideOverlayWindow();
        else void windows.resetOverlayPosition().then(() => windows.showOverlayWindow());
      },
    },
    {
      // Shift+Tab only toggles the overlay interactivity — it never creates a
      // window, so it cannot steal the keyboard from the game.
      accelerator: 'Shift+Tab',
      handler: () => {
        const overlay = windows.getOverlayWindow();
        if (!overlay || !overlay.isVisible()) return;
        overlay.setIgnoreMouseEvents(true, { forward: true });
        windows.broadcast(MAIN_TO_RENDERER.OVERLAY_BOUNDS, {
          interactive: false,
          at: Date.now(),
        });
      },
    },
  ];

  for (const shortcut of toggles) {
    try {
      globalShortcut.register(shortcut.accelerator, shortcut.handler);
    } catch (err) {
      // Another application already owns the accelerator.
    }
  }
}

/**
 * Boot the application.
 */
function bootstrap() {
  protocolHandler.registerProtocolHandler();

  windows.createMainWindow();

  ipcContext = ipc.createContext();
  ipc.registerIpc(ipcContext);
  ipc.startWatcher(ipcContext);

  tray.createTray();
  registerShortcuts();
  updater.start();

  // Push the persisted settings and the current client status as soon as a
  // renderer is ready.
  const pushInitialState = (webContents) => {
    if (!webContents || webContents.isDestroyed()) return;
    try {
      webContents.send(MAIN_TO_RENDERER.SETTINGS_CHANGED, { ...ipcContext.settings.get() });
      webContents.send(MAIN_TO_RENDERER.LCU_EVENT, ipcContext.lcu.status());
    } catch (err) {
      // The window closed again already.
    }
  };

  app.on('browser-window-created', (event, browserWindow) => {
    browserWindow.webContents.on('did-finish-load', () => {
      pushInitialState(browserWindow.webContents);
    });
  });

  // The main window may already exist at this point.
  const main = windows.getMainWindow();
  if (main) {
    main.webContents.on('did-finish-load', () => pushInitialState(main.webContents));
  }
}

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    focusMainWindow();
    const url = protocolHandler.pickProtocolUrl(argv);
    if (url) handleDeepLink(url);
  });

  app.whenReady().then(bootstrap).catch(() => {
    // Boot failures must not leave a zombie process behind.
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windows.createMainWindow();
    } else {
      focusMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    if (ipcContext) ipc.stopWatcher(ipcContext);
    updater.stop();
    tray.destroyTray();
    try {
      globalShortcut.unregisterAll();
    } catch (err) { /* ignore */ }
  });

  app.on('will-quit', () => {
    if (ipcContext) ipc.stopWatcher(ipcContext);
  });

  // A protocol URL can also arrive as the first process argument.
  const initialUrl = protocolHandler.pickProtocolUrl(process.argv);
  if (initialUrl) {
    app.whenReady().then(() => handleDeepLink(initialUrl));
  }
}

module.exports = { bootstrap, handleDeepLink, focusMainWindow };
