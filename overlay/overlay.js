/**
 * OP.GG in-game overlay — renderer entry point.
 *
 * The overlay runs in its own frameless, transparent, always-on-top Electron
 * window that floats over the League match window. It is a separate renderer:
 * it never imports from `src/` and it never performs network I/O itself —
 * every request crosses the context bridge into the main process.
 *
 * Behaviour:
 *   - the HUD is invisible and non-interactive while nothing is happening
 *     (no League Client, no game in progress);
 *   - while passive it never steals clicks from the game (the main process
 *     toggles `setIgnoreMouseEvents`, the overlay also toggles it locally);
 *   - Shift+Tab toggles interaction, Ctrl+Shift+O shows/hides the overlay;
 *   - timers run at 1 Hz and only while the HUD is visible.
 */
import { RECEIVE, SEND, on, trySend, log, hasBridge } from './parts/bridge.js';
import { t } from './parts/i18n.js';
import { createStore } from './parts/store.js';
import { getSettings, updateSettings } from './parts/settings.js';
import { createHud } from './parts/hud.js';
import { createTicker, createImmediateTicker } from './parts/tickers.js';
import { installHotkeys } from './parts/hotkeys.js';
import { showToast } from './parts/toast.js';
import { setDdragonVersion } from './parts/assets.js';

import * as lcu from './parts/lcu.js';
import * as opgg from './parts/opgg.js';
import {
  normalizeChampSelect,
  normalizeGameState,
  normalizeChampionDetail,
  normalizeBench,
  buildTierMap,
  detectMode,
} from './parts/normalize.js';

/* -------------------------------------------------------------------------- */
/* bootstrap                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The overlay links `../src/styles/tokens.css`; if that link ever fails the
 * whole HUD would lose its colours, so the reference is verified and the
 * stylesheet re-injected when necessary.
 */
function ensureTokens() {
  const resolved = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--bg-surface')
    .trim();
  if (resolved) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../src/styles/tokens.css';
  document.head.appendChild(link);
}

const root = document.getElementById('hud');
const toastNode = document.getElementById('toast');

if (!root) {
  log('boot-failed', { reason: '#hud missing' });
} else {
  ensureTokens();
  start();
}

function start() {
  const settings = getSettings();

  const store = createStore({
    /** The HUD is drawn only when the League Client is up and a game is running. */
    visible: false,
    /** Whether the HUD steals the mouse from the game. */
    interactive: false,
    /** Ctrl+Shift+O hides the overlay without closing the window. */
    hidden: settings.hidden === true,
    /** League Client reachable. */
    connected: false,
    /** `offline` | `lobby` | `champSelect` | `inGame` */
    phase: 'offline',
    mode: null,
    champion: null,
    detail: null,
    bench: [],
    spells: { player: [], enemy: [] },
    game: null,
    /** Manual cooldown tracker: key -> { name, total, endsAt }. */
    spellTracker: {},
    sections: { ...settings.sections },
    offset: { ...settings.offset },
    loading: { detail: false, augments: false, bench: false },
    errors: { detail: false, bench: false },
  });

  /* ---- actions ---------------------------------------------------------- */

  const actions = {
    setInteractive(interactive) {
      const next = Boolean(interactive);
      store.setState({ interactive: next });
      hud.setInteractive(next);
      syncMouseIgnore();
      updateSettings({ interactive: next });
      showToast(
        toastNode,
        next ? t('local.unlock') : t('local.lock'),
      );
    },

    toggleInteractive() {
      actions.setInteractive(!store.getState().interactive);
    },

    toggleSection(id) {
      const state = store.getState();
      const sections = { ...state.sections, [id]: state.sections[id] === false };
      store.setState({ sections });
      updateSettings({ sections });
    },

    toggleVisible() {
      const hidden = !store.getState().hidden;
      store.setState({ hidden });
      updateSettings({ hidden });
      applyVisibility();
      showToast(toastNode, hidden ? t('local.hide') : t('local.show'));
    },

    hide() {
      store.setState({ hidden: true });
      updateSettings({ hidden: true });
      applyVisibility();
    },

    toggleSpellTracker(key, info) {
      const state = store.getState();
      const tracker = { ...state.spellTracker };
      if (tracker[key]) {
        delete tracker[key];
      } else {
        const total = Number(info && info.total) || 300;
        tracker[key] = { name: (info && info.name) || '', total, endsAt: Date.now() + total * 1000 };
      }
      store.setState({ spellTracker: tracker });
      hud.tick(Date.now());
    },

    async applyRunes() {
      const detail = store.getState().detail;
      const runes = detail && detail.runes;
      if (!runes) return;
      const champion = store.getState().champion || {};
      showToast(toastNode, t('lol.live.champion.v3.applying'));
      const result = await lcu.applyRunes({
        championId: champion.id,
        mode: store.getState().mode,
        primaryStyleId: runes.primaryTree,
        secondaryStyleId: runes.secondaryTree,
        selectedPerkIds: [...runes.primary.map((rune) => rune.id), ...runes.secondary.map((rune) => rune.id)],
        shardIds: runes.shards.map((shard) => shard.id),
        runes,
      });
      const ok = result && (result.success === undefined || result.success === true);
      showToast(toastNode, ok ? t('lol.live.champion.v3.apply') : t('lol.live.champion.v3.apply-failed'));
    },

    async applyBuild() {
      const detail = store.getState().detail;
      const build = detail && detail.build;
      if (!build) return;
      const champion = store.getState().champion || {};
      showToast(toastNode, t('lol.live.champion.v3.applying'));
      const result = await lcu.applyItemBuild({
        championId: champion.id,
        mode: store.getState().mode,
        items: [...(build.starter[0] || []), ...(build.core[0] || [])],
        starter: build.starter[0] || [],
        core: build.core[0] || [],
        boots: build.boots[0] || [],
        situational: build.situational[0] || [],
      });
      const ok = result && (result.success === undefined || result.success === true);
      showToast(toastNode, ok ? t('lol.live.champion.v3.apply') : t('lol.live.champion.v3.apply-failed'));
    },

    async swapBench(championId) {
      showToast(toastNode, t('lol.live.champion.v3.applying'));
      const result = await lcu.swapBench(championId);
      const ok = result && (result.success === undefined || result.success === true);
      showToast(toastNode, ok ? t('local.swap') : t('lol.live.champion.v3.apply-failed'));
      if (ok) await syncChampSelect();
    },

    retry() {
      const state = store.getState();
      store.setState({ errors: { ...state.errors, detail: false, bench: false } });
      if (state.champion && state.champion.id !== null) {
        loadDetail(state.champion.id, state.mode);
      }
      if (state.bench && state.bench.length) loadBenchTiers();
    },
  };

  /* ---- HUD -------------------------------------------------------------- */

  const hud = createHud(root, { store, actions });
  hud.setVisible(false);
  /* The HUD always starts passive: it must never steal the mouse from the
     game before the user has explicitly unlocked it. */
  hud.setInteractive(false);

  /* The 1 Hz ticker only runs while the HUD is visible. */
  const ticker = createTicker((now) => {
    hud.tick(now);
    reportGeometry();
  }, 1000);

  /* The LCU reachability poll runs for the lifetime of the window. */
  const statusTicker = createImmediateTicker(() => {
    refreshStatus();
  }, 2000);

  /* ---- mouse pass-through ------------------------------------------------ */

  function syncMouseIgnore() {
    const state = store.getState();
    const shouldIgnore = !state.visible || !state.interactive;
    trySend(SEND, 'SET_OVERLAY_IGNORE_MOUSE', shouldIgnore);
  }

  function applyVisibility() {
    const state = store.getState();
    const visible =
      !state.hidden &&
      state.connected &&
      (state.phase === 'champSelect' || state.phase === 'inGame');

    store.setState({ visible });
    hud.setVisible(visible);
    hud.setInteractive(state.interactive);

    if (visible) {
      ticker.start();
    } else {
      ticker.stop();
    }
    syncMouseIgnore();
  }

  /* ---- data -------------------------------------------------------------- */

  let detailRequestId = 0;

  async function loadDetail(championId, mode) {
    if (championId === null || championId === undefined) return;
    const requestId = ++detailRequestId;
    const state = store.getState();
    const wantsAugments = mode === 'arena' || mode === 'mayhem';
    store.setState({
      loading: { ...state.loading, detail: true, augments: wantsAugments },
      errors: { ...state.errors, detail: false },
    });

    const raw = await opgg.championDetail({
      championId,
      mode: mode || 'ranked',
    });
    if (requestId !== detailRequestId) return;

    const detail = normalizeChampionDetail(raw, championId);
    const current = store.getState();
    store.setState({
      detail,
      champion: detail
        ? {
            ...(current.champion || {}),
            id: detail.id ?? championId,
            name: detail.name || (current.champion && current.champion.name) || null,
            tier: detail.tier || (current.champion && current.champion.tier) || null,
          }
        : current.champion,
      loading: { ...current.loading, detail: false, augments: false },
      errors: { ...current.errors, detail: detail ? false : true },
    });
  }

  async function loadBenchTiers() {
    const state = store.getState();
    if (!state.bench || !state.bench.length) return;
    store.setState({ loading: { ...state.loading, bench: true } });

    const raw = await opgg.modeTierList({ mode: 'aram' });
    const tierMap = buildTierMap(raw);
    const current = store.getState();
    store.setState({
      bench: normalizeBench(current.bench, tierMap),
      loading: { ...current.loading, bench: false },
      errors: { ...current.errors, bench: tierMap.size ? false : current.errors.bench },
    });
  }

  async function syncChampSelect() {
    const res = await lcu.request('GET', '/lol-champ-select/v1/session');
    if (!res || typeof res !== 'object') return;
    applyChampSelect(res);
  }

  function applyChampSelect(payload) {
    const snapshot = normalizeChampSelect(payload);
    if (!snapshot) return;

    const state = store.getState();
    const mode = snapshot.mode || state.mode;
    const championId = snapshot.championId;

    /* Keep the tier data already resolved for the bench; it is re-fetched
       only when the bench itself changed. */
    const previous = new Map((state.bench || []).map((entry) => [entry.championId, entry]));
    const bench = normalizeBench(snapshot.bench, null).map((entry) => {
      const known = previous.get(entry.championId);
      return known ? { ...entry, tier: known.tier, winRate: known.winRate } : entry;
    });

    store.setState({
      phase: 'champSelect',
      mode,
      connected: true,
      bench,
      champion: championId
        ? { ...(state.champion || {}), id: championId, name: (state.champion && state.champion.name) || null }
        : state.champion,
    });

    applyVisibility();

    const benchChanged = bench.length !== (state.bench || []).length
      || bench.some((entry) => !previous.has(entry.championId));
    if (bench.length && benchChanged) loadBenchTiers();
    if (championId && championId !== state.champion?.id) {
      store.setState({
        champion: { id: championId, name: null, level: state.champion?.level ?? null, tier: null },
        detail: null,
      });
      loadDetail(championId, mode);
    }
  }

  function applyGameState(payload) {
    const snapshot = normalizeGameState(payload);
    if (!snapshot) return;

    const state = store.getState();
    const mode = snapshot.mode || state.mode;

    store.setState({
      phase: 'inGame',
      mode,
      connected: true,
      game: snapshot,
      spells: {
        player: snapshot.spells,
        enemy: snapshot.enemySpells,
      },
      champion: snapshot.championId
        ? {
            ...(state.champion || {}),
            id: snapshot.championId,
            level: snapshot.level ?? (state.champion && state.champion.level) ?? null,
          }
        : state.champion,
    });

    applyVisibility();

    if (snapshot.championId && snapshot.championId !== state.champion?.id) {
      store.setState({
        champion: { id: snapshot.championId, name: null, level: snapshot.level ?? null, tier: null },
        detail: null,
      });
      loadDetail(snapshot.championId, mode);
    }
  }

  /* ---- LCU lifecycle ----------------------------------------------------- */

  async function refreshStatus() {
    const status = await lcu.status();
    const connected = lcu.isConnected(status);
    const state = store.getState();

    if (connected === state.connected) return;
    store.setState({ connected });

    if (connected) {
      await syncGameflow();
    } else {
      store.setState({
        phase: 'offline',
        champion: null,
        detail: null,
        bench: [],
        game: null,
        spells: { player: [], enemy: [] },
        spellTracker: {},
      });
    }
    applyVisibility();
  }

  async function syncGameflow() {
    const gameflow = await lcu.request('GET', '/lol-gameflow/v1/session');
    if (!gameflow || typeof gameflow !== 'object') return;

    const phase = gameflow.phase;
    if (phase === 'ChampSelect') {
      await syncChampSelect();
    } else if (phase === 'InProgress') {
      applyGameState(gameflow);
    } else {
      const state = store.getState();
      store.setState({
        phase: 'lobby',
        mode: detectMode(gameflow) || state.mode,
      });
      applyVisibility();
    }
  }

  /* LCU events arrive in bursts; coalesce them into one resync. */
  let syncTimer = null;

  function scheduleSync() {
    if (syncTimer !== null) return;
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      syncGameflow();
    }, 400);
  }

  /* ---- render loop ------------------------------------------------------- */

  store.subscribe(() => hud.render());

  /* The transparent overlay window must not be bigger than the HUD, so the
     main process is told the content size whenever it changes. */
  let reportedSize = { width: 0, height: 0 };

  function reportGeometry() {
    const state = store.getState();
    if (!state.visible) return;

    /* The HUD root fills the window, so the content box is measured from the
       header and the panel strip instead of the root element. */
    const header = hud.header.getBoundingClientRect();
    const panels = hud.panelStrip.getBoundingClientRect();
    const left = Math.min(header.left, panels.left);
    const top = Math.min(header.top, panels.top);
    const right = Math.max(header.right, panels.right);
    const bottom = Math.max(header.bottom, panels.bottom);

    const width = Math.ceil(right - left);
    const height = Math.ceil(bottom - top);
    if (!width || !height) return;
    if (width === reportedSize.width && height === reportedSize.height) return;
    reportedSize = { width, height };
    trySend(SEND, 'RESIZE_OVERLAY', { width, height });
    trySend(SEND, 'MOVE_OVERLAY', {
      x: state.offset.x,
      y: state.offset.y,
      width,
      height,
    });
  }

  /* ---- main process channels --------------------------------------------- */

  const offs = [];

  if (hasBridge()) {
    offs.push(
      on(RECEIVE, 'LCU_EVENT', (payload) => {
        store.setState({ connected: true });
        /* Only champ-select and gameflow events change what the HUD shows. */
        const uri =
          typeof payload === 'string'
            ? payload
            : (payload && (payload.uri || payload.event || payload.path)) || '';
        if (/champ-select|gameflow/i.test(String(uri))) scheduleSync();
      }),
    );

    offs.push(
      on(RECEIVE, 'CHAMP_SELECT_UPDATE', (payload) => {
        applyChampSelect(payload);
      }),
    );

    offs.push(
      on(RECEIVE, 'GAME_STATE_UPDATE', (payload) => {
        applyGameState(payload);
      }),
    );

    offs.push(
      on(RECEIVE, 'SETTINGS_CHANGED', (payload) => {
        if (!payload || typeof payload !== 'object') return;
        const value = payload.value && typeof payload.value === 'object' ? payload.value : payload;
        if (value && value.sections) {
          store.setState({ sections: { ...store.getState().sections, ...value.sections } });
        }
      }),
    );
  }

  /* ---- hotkeys ----------------------------------------------------------- */

  installHotkeys({
    toggleInteractive: () => actions.toggleInteractive(),
    toggleVisible: () => actions.toggleVisible(),
  });

  /* ---- go ---------------------------------------------------------------- */

  // The reference's meta dictionaries give the HUD its exact icons and names.
  opgg.staticData();
  opgg.currentPatch().then((patch) => {
    const value = typeof patch === 'string' ? patch : patch && (patch.version || patch.patch);
    if (typeof value === 'string' && /^\d+\.\d+/.test(value)) {
      setDdragonVersion(/^\d+\.\d+\.\d+$/.test(value) ? value : `${value}.1`);
    }
  });

  statusTicker.start();
  refreshStatus();

  window.addEventListener('beforeunload', () => {
    ticker.stop();
    statusTicker.stop();
    if (syncTimer !== null) {
      window.clearTimeout(syncTimer);
      syncTimer = null;
    }
    for (const off of offs) {
      try {
        off();
      } catch {
        /* unsubscribe must never throw */
      }
    }
  });

  /* Keep a reference so the debug console can inspect the HUD state without
     leaking anything into the game window. */
  window.opggOverlay = { store, actions };
}
