/**
 * Renderer-side API facade.
 *
 * Every call crosses the context bridge into the Electron main process, so the
 * renderer never performs privileged I/O itself. The channel names come from
 * the preload-exposed `window.opgg.channels`, which is the same object the
 * main process uses — there is exactly one contract.
 */

/** Resolve the bridge, with a clear error when the preload is missing. */
function bridge() {
  const api = typeof window !== 'undefined' ? window.opgg : null;
  if (!api) {
    throw new Error('[api] context bridge unavailable — preload did not run');
  }
  return api;
}

/** Channel name lookup, tolerant of a missing channel map. */
function channel(group, key) {
  const map = bridge().channels || {};
  const bag = map[group] || {};
  return bag[key] || key;
}

/** Invoke a main-process handler and return its result. */
export async function invoke(group, key, payload) {
  const api = bridge();
  return api.invoke(channel(group, key), payload);
}

/** Fire-and-forget message to the main process. */
export function send(group, key, payload) {
  const api = bridge();
  api.send(channel(group, key), payload);
}

/** Subscribe to a main-process push channel. Returns an unsubscribe function. */
export function on(group, key, handler) {
  const api = bridge();
  return api.on(channel(group, key), handler);
}

/* -------------------------------------------------------------------------- */
/* Typed helpers                                                              */
/* -------------------------------------------------------------------------- */

const INVOKE = 'RENDERER_TO_MAIN_INVOKE';
const SEND = 'RENDERER_TO_MAIN';
const RECEIVE = 'MAIN_TO_RENDERER';

export const api = {
  /* window */
  isMaximized: () => invoke(INVOKE, 'WINDOW_IS_MAXIMIZED'),
  minimize: () => send(SEND, 'MINIMIZE'),
  maximize: () => send(SEND, 'MAXIMIZE'),
  close: () => send(SEND, 'CLOSE'),
  openExternal: (url) => send(SEND, 'OPEN_EXTERNAL', url),
  copyToClipboard: (text) => invoke(INVOKE, 'APP_COPY_TO_CLIPBOARD', text),
  getVersion: () => invoke(INVOKE, 'APP_GET_VERSION'),
  getPaths: () => invoke(INVOKE, 'APP_GET_PATHS'),

  /* settings */
  setSetting: (key, value) => send(SEND, 'SETTINGS_SET', { key, value }),
  onSettingsChanged: (handler) => on(RECEIVE, 'SETTINGS_CHANGED', handler),
  onUpdateStatus: (handler) => on(RECEIVE, 'UPDATE_STATUS', handler),
  onWindowState: (handler) => on(RECEIVE, 'WINDOW_STATE', handler),
  onTrayAction: (handler) => on(RECEIVE, 'TRAY_ACTION', handler),
  onTaskProgress: (handler) => on(RECEIVE, 'TASK_PROGRESS', handler),

  /* champion data */
  staticData: () => invoke(INVOKE, 'OPGG_STATIC_DATA'),
  champions: (params) => invoke(INVOKE, 'OPGG_CHAMPIONS', params),
  modeTierList: (mode) => invoke(INVOKE, 'OPGG_MODE_TIER_LIST', mode),
  championDetail: (params) => invoke(INVOKE, 'OPGG_CHAMPION_DETAIL', params),
  multiSearch: (params) => invoke(INVOKE, 'OPGG_MULTI_SEARCH', params),
  leaderboard: (params) => invoke(INVOKE, 'OPGG_LEADERBOARD', params),
  summonerProfile: (params) => invoke(INVOKE, 'OPGG_SUMMONER_PROFILE', params),
  matchHistory: (params) => invoke(INVOKE, 'OPGG_MATCH_HISTORY', params),
  currentPatch: () => invoke(INVOKE, 'OPGG_CURRENT_PATCH'),
  checkPatchUpdate: () => invoke(INVOKE, 'OPGG_CHECK_PATCH_UPDATE'),

  /* champion extras */
  combos: (params) => invoke(INVOKE, 'OPGG_COMBOS', params),
  buffNerf: (params) => invoke(INVOKE, 'OPGG_BUFF_NERF', params),
  aramBalance: (params) => invoke(INVOKE, 'OPGG_ARAM_BALANCE', params),

  /* league client */
  lcuStatus: () => invoke(INVOKE, 'LCU_STATUS'),
  lcuRequest: (payload) => invoke(INVOKE, 'LCU_REQUEST', payload),
  myProfile: () => invoke(INVOKE, 'LCU_MY_PROFILE'),
  swapBench: (championId) => invoke(INVOKE, 'LCU_SWAP_BENCH', championId),
  applyRunes: (payload) => invoke(INVOKE, 'LCU_APPLY_RUNES', payload),
  applySpells: (payload) => invoke(INVOKE, 'LCU_APPLY_SPELLS', payload),
  applyItemBuild: (payload) => invoke(INVOKE, 'LCU_APPLY_ITEM_BUILD', payload),
  setAutoAccept: (v) => invoke(INVOKE, 'LCU_SET_AUTO_ACCEPT', v),
  setAutoRunes: (v) => invoke(INVOKE, 'LCU_SET_AUTO_RUNES', v),
  setAutoBuilds: (v) => invoke(INVOKE, 'LCU_SET_AUTO_BUILDS', v),
  setAutoSpells: (v) => invoke(INVOKE, 'LCU_SET_AUTO_SPELLS', v),
  setFlashKey: (key) => invoke(INVOKE, 'LCU_SET_FLASH_KEY', key),
  onLcuEvent: (handler) => on(RECEIVE, 'LCU_EVENT', handler),
  onChampSelectUpdate: (handler) => on(RECEIVE, 'CHAMP_SELECT_UPDATE', handler),
  onGameStateUpdate: (handler) => on(RECEIVE, 'GAME_STATE_UPDATE', handler),

  /* overlay */
  openOverlay: () => send(SEND, 'OPEN_OVERLAY'),
  closeOverlay: () => send(SEND, 'CLOSE_OVERLAY'),
  setOverlayIgnoreMouse: (v) => send(SEND, 'SET_OVERLAY_IGNORE_MOUSE', v),
  moveOverlay: (bounds) => send(SEND, 'MOVE_OVERLAY', bounds),
  resizeOverlay: (bounds) => send(SEND, 'RESIZE_OVERLAY', bounds),
  toggleOverlayPin: () => invoke(INVOKE, 'OVERLAY_TOGGLE_PIN'),
  dockOverlayToLeague: () => invoke(INVOKE, 'OVERLAY_DOCK_TO_LEAGUE'),
  overlayBounds: () => invoke(INVOKE, 'OVERLAY_GET_BOUNDS'),
  setOverlayOpacity: (v) => invoke(INVOKE, 'OVERLAY_SET_OPACITY', v),
  setOverlayScale: (v) => invoke(INVOKE, 'OVERLAY_SET_SCALE', v),
};

export default api;
