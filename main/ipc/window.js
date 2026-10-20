/**
 * Window and overlay IPC handlers.
 *
 * The main window uses the standard OS frame, so the only window chrome the
 * renderer drives is minimize / maximize / close. The overlay window is
 * frameless, transparent and click-through; it can be moved, resized, pinned,
 * faded and scaled.
 */

'use strict';

const { RENDERER_TO_MAIN, RENDERER_TO_MAIN_INVOKE } = require('../../shared/channels.js');

/**
 * Register the window and overlay handlers.
 *
 * @param {object} ctx - `{ ipcMain, windows }`
 */
function register(ctx) {
  const { ipcMain, windows, privileged } = ctx;

  /* ------------------------------------------------------------- main window */

  ipcMain.on(RENDERER_TO_MAIN.MINIMIZE, () => {
    const win = windows.getMainWindow();
    if (win) win.minimize();
  });

  ipcMain.on(RENDERER_TO_MAIN.MAXIMIZE, () => {
    const win = windows.getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on(RENDERER_TO_MAIN.CLOSE, () => {
    const win = windows.getMainWindow();
    if (!win) return;
    // The app keeps running in the tray — the reference behaves the same way.
    win.hide();
  });

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.WINDOW_IS_MAXIMIZED, privileged(() => {
    const win = windows.getMainWindow();
    return { ok: true, maximized: Boolean(win && win.isMaximized()) };
  }));

  /* ------------------------------------------------------------ overlay window */

  ipcMain.on(RENDERER_TO_MAIN.OPEN_OVERLAY, () => {
    void windows.createOverlayWindow({ show: true });
  });

  ipcMain.on(RENDERER_TO_MAIN.CLOSE_OVERLAY, () => {
    windows.hideOverlayWindow();
  });

  ipcMain.on(RENDERER_TO_MAIN.SET_OVERLAY_IGNORE_MOUSE, (event, payload) => {
    const ignore = typeof payload === 'boolean'
      ? payload
      : Boolean(payload && payload.ignore);
    const options = payload && typeof payload === 'object' && payload.options
      ? payload.options
      : { forward: true };
    windows.setOverlayIgnoreMouseEvents(ignore, options);
  });

  ipcMain.on(RENDERER_TO_MAIN.MOVE_OVERLAY, (event, payload) => {
    windows.moveOverlay(payload || {});
  });

  ipcMain.on(RENDERER_TO_MAIN.RESIZE_OVERLAY, (event, payload) => {
    windows.resizeOverlay(payload || {});
  });

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OVERLAY_TOGGLE_PIN, privileged(() => ({
    ok: true,
    pinned: windows.toggleOverlayPin(),
  })));

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OVERLAY_DOCK_TO_LEAGUE, privileged(async () => {
    const result = await windows.dockOverlayToLeague();
    return { ok: Boolean(result.ok), bounds: result.bounds || null, error: result.error || null };
  }));

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OVERLAY_GET_BOUNDS, privileged(() => ({
    ok: true,
    bounds: windows.getOverlayBounds(),
    pinned: windows.isOverlayPinned(),
    opacity: windows.getOverlayOpacity(),
    scale: windows.getOverlayScale(),
  })));

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OVERLAY_SET_OPACITY, privileged((event, payload) => {
    const value = typeof payload === 'object' && payload !== null ? payload.value : payload;
    const opacity = windows.setOverlayOpacity(value);
    if (ctx.settings) ctx.settings.set('overlayOpacity', opacity);
    return { ok: true, opacity };
  }));

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.OVERLAY_SET_SCALE, privileged((event, payload) => {
    const value = typeof payload === 'object' && payload !== null ? payload.value : payload;
    const scale = windows.setOverlayScale(value);
    if (ctx.settings) ctx.settings.set('overlayScale', scale);
    return { ok: true, scale };
  }));
}

module.exports = register;
