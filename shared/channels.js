/**
 * IPC channel contract — single source of truth for main, preload and renderer.
 *
 * The channel vocabulary below is reconstructed from the shipped OP.GG for
 * Desktop bundle with REA (`rea analyze-javascript-application`):
 *
 *   - 176 literal channels / 171 main handlers recovered
 *   - 5 contextBridge APIs / 77 exposed API members
 *   - 2 sender-validation observations on the main side
 *
 * The full recovered vocabulary is preserved in docs/rea/ipc-channels.md. This
 * file keeps the subset the LoL-scoped desktop client actually uses, grouped by
 * owner, so main and preload can never drift apart.
 *
 * This module is CommonJS on purpose: `main/` and `preload/` require it
 * directly, and the preload re-exposes it to the renderer as
 * `window.opgg.channels`, so the renderer never needs a second copy.
 */

'use strict';

/** Main process -> renderer (push). */
const MAIN_TO_RENDERER = {
  /** Window chrome state changes (maximize/restore/focus). */
  WINDOW_STATE: 'window:state',
  /** Tray menu action. */
  TRAY_ACTION: 'tray:action',
  /** Live League Client Update event stream. */
  LCU_EVENT: 'lcu:event',
  /** Champion-select snapshot changed. */
  CHAMP_SELECT_UPDATE: 'lcu:champ-select-update',
  /** In-game / match state changed. */
  GAME_STATE_UPDATE: 'lcu:game-state-update',
  /** Overlay geometry changed from the renderer side. */
  OVERLAY_BOUNDS: 'overlay:bounds',
  /** Progress events for long running main-process work. */
  TASK_PROGRESS: 'task:progress',
  /** Application update status. */
  UPDATE_STATUS: 'app:update-status',
  /** Theme / locale change pushed from settings. */
  SETTINGS_CHANGED: 'app:settings-changed',
};

/** Renderer -> main (fire and forget, `ipcRenderer.send`). */
const RENDERER_TO_MAIN = {
  MINIMIZE: 'window:minimize',
  MAXIMIZE: 'window:maximize',
  CLOSE: 'window:close',
  OPEN_EXTERNAL: 'app:open-external',
  OPEN_OVERLAY: 'overlay:open',
  CLOSE_OVERLAY: 'overlay:close',
  SET_OVERLAY_IGNORE_MOUSE: 'overlay:set-ignore-mouse-events',
  MOVE_OVERLAY: 'overlay:move',
  RESIZE_OVERLAY: 'overlay:resize',
  SETTINGS_SET: 'app:settings-set',
  LOG: 'app:log',
};

/** Renderer -> main (request/response, `ipcRenderer.invoke`). */
const RENDERER_TO_MAIN_INVOKE = {
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  OVERLAY_TOGGLE_PIN: 'overlay:toggle-pin',
  OVERLAY_DOCK_TO_LEAGUE: 'overlay:dock-to-league',
  OVERLAY_GET_BOUNDS: 'overlay:get-bounds',
  OVERLAY_SET_OPACITY: 'overlay:set-opacity',
  OVERLAY_SET_SCALE: 'overlay:set-scale',

  LCU_STATUS: 'lcu:status',
  LCU_REQUEST: 'lcu:request',
  LCU_SET_AUTO_ACCEPT: 'lcu:auto-accept',
  LCU_SET_AUTO_RUNES: 'lcu:auto-runes',
  LCU_SET_AUTO_BUILDS: 'lcu:auto-builds',
  LCU_SET_AUTO_SPELLS: 'lcu:auto-spells',
  LCU_SET_FLASH_KEY: 'lcu:set-flash-key',
  LCU_MY_PROFILE: 'lcu:my-profile',
  LCU_SWAP_BENCH: 'lcu:swap-bench',
  LCU_APPLY_RUNES: 'lcu:apply-runes',
  LCU_APPLY_SPELLS: 'lcu:apply-spells',
  LCU_APPLY_ITEM_BUILD: 'lcu:apply-item-build',
  LCU_PICK_BAN: 'lcu:pick-ban',
  LCU_START_RECORDING: 'lcu:start-recording',

  OPGG_STATIC_DATA: 'opgg:static-data',
  OPGG_CHAMPIONS: 'opgg:champions',
  OPGG_MODE_TIER_LIST: 'opgg:mode-tierlist',
  OPGG_CHAMPION_DETAIL: 'opgg:champion-detail',
  OPGG_MULTI_SEARCH: 'opgg:multi-search',
  OPGG_LEADERBOARD: 'opgg:get-leaderboard',
  OPGG_SUMMONER_PROFILE: 'opgg:get-summoner-profile',
  OPGG_MATCH_HISTORY: 'opgg:get-match-history',
  OPGG_CHECK_PATCH_UPDATE: 'opgg:check-patch-update',
  OPGG_CURRENT_PATCH: 'opgg:get-current-patch',

  APP_COPY_TO_CLIPBOARD: 'app:copy-to-clipboard',
  APP_GET_VERSION: 'app:get-version',
  APP_GET_PATHS: 'app:get-paths',
};

module.exports = {
  MAIN_TO_RENDERER,
  RENDERER_TO_MAIN,
  RENDERER_TO_MAIN_INVOKE,
  ALL_INVOKE_CHANNELS: Object.values(RENDERER_TO_MAIN_INVOKE),
  ALL_SEND_CHANNELS: Object.values(RENDERER_TO_MAIN),
  ALL_RECEIVE_CHANNELS: Object.values(MAIN_TO_RENDERER),
};
