// Stand-in for the OP.GG for Desktop preload bridge, used when the shipped
// renderer is served in a plain browser for observation.
//
// The reference renderer gates its desktop-only routes behind `window.api`
// (the context bridge). This stub provides the surface those routes probe for
// so the shipped UI can be observed outside Electron.
(() => {
  const noop = () => {};
  const listeners = new Map();

  const api = {
    send: noop,
    invoke: async () => ({}),
    on: (channel, handler) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel).add(handler);
      return () => listeners.get(channel).delete(handler);
    },
    off: noop,
    openExternal: (url) => window.open(url, '_blank'),
    storeGet: () => undefined,
    storeSet: noop,
    appUpdateManual: noop,
    isAdmin: false,
    heroCustom: { pickImage: noop, pruneImages: noop },
    ga: { props: {} },
    recorderApi: {},
    RevEngine: { loadFile: noop, pslist: noop },
  };

  try {
    Object.defineProperty(window, 'api', { value: api, writable: false, configurable: true });
  } catch {
    window.api = api;
  }
  try {
    Object.defineProperty(window, 'app', {
      value: { storeGet: api.storeGet, storeSet: api.storeSet, appUpdateManual: api.appUpdateManual },
      writable: false,
      configurable: true,
    });
  } catch {
    window.app = { storeGet: api.storeGet, storeSet: api.storeSet };
  }
})();
