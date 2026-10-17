const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('opgg', {
  // Main Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Overlay Window controls
  overlayOpen: () => ipcRenderer.send('overlay:open'),
  overlayClose: () => ipcRenderer.send('overlay:close'),
  overlayMinimize: () => ipcRenderer.send('overlay:minimize'),
  overlaySetCompact: (compact) => ipcRenderer.send('overlay:set-compact', compact),
  overlayTogglePin: () => ipcRenderer.invoke('overlay:toggle-pin'),
  overlayDockToLeague: () => ipcRenderer.invoke('overlay:dock-to-league'),

  // LCU Integration & Automations
  lcuStatus: () => ipcRenderer.invoke('lcu:status'),
  lcuRequest: (method, endpoint, data) => ipcRenderer.invoke('lcu:request', { method, endpoint, data }),
  lcuApplyRunes: (runesData) => ipcRenderer.invoke('lcu:apply-runes', runesData),
  lcuAutoAccept: (enabled) => ipcRenderer.invoke('lcu:auto-accept', enabled),
  lcuAutoRunes: (enabled) => ipcRenderer.invoke('lcu:auto-runes', enabled),
  lcuAutoBuilds: (enabled) => ipcRenderer.invoke('lcu:auto-builds', enabled),
  lcuAutoSpells: (enabled) => ipcRenderer.invoke('lcu:auto-spells', enabled),
  lcuSetFlashKey: (key) => ipcRenderer.invoke('lcu:set-flash-key', key),
  lcuSwapBench: (championId) => ipcRenderer.invoke('lcu:swap-bench', championId),
  getMyProfile: () => ipcRenderer.invoke('lcu:my-profile'),

  onLcuStatus: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on('lcu:status-change', handler);
    return () => ipcRenderer.removeListener('lcu:status-change', handler);
  },
  onChampSelectUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('lcu:champ-select-update', handler);
    return () => ipcRenderer.removeListener('lcu:champ-select-update', handler);
  },

  // OP.GG Data APIs
  getChampions: (opts) => ipcRenderer.invoke('opgg:champions', opts),
  getChampionDetail: (champId, position, tier, mode) => ipcRenderer.invoke('opgg:champion-detail', { champId, position, tier, mode }),
  getModeTierList: (mode) => ipcRenderer.invoke('opgg:mode-tierlist', mode),
  getStaticData: () => ipcRenderer.invoke('opgg:static-data'),
  multiSearch: (query, region) => ipcRenderer.invoke('opgg:multi-search', { query, region }),

  // Utilities
  openExternal: (url) => ipcRenderer.send('app:openExternal', url),
  copyToClipboard: (text) => ipcRenderer.invoke('app:copyToClipboard', text)
});
