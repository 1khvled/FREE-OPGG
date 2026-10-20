/**
 * Live companion screen.
 *
 * Shows what the League Client is currently doing and gives the player
 * one-click actions: apply the OP.GG rune page, item build and summoner
 * spells, swap an ARAM bench champion, and read the augment advisor for
 * Arena / ARAM: Mayhem.
 *
 * The screen is built from the reference's own LiveChampionV3 behaviour:
 *
 *   - `LiveChampion3.8c6f1092.bundle.js` — the live champion route, the idle
 *     panel and the mode catalogue;
 *   - `8377.b7dba868.bundle.js`           — the shared `g.AA` draft board and
 *     the `g.gY` bench strip;
 *   - `AramMayhem.03c382ad.bundle.js`     — the augment tiers.
 *
 * Data sources (never fabricated):
 *   - `ctx.api.lcuStatus()`               — client state, phase, summoner
 *   - `ctx.api.onChampSelectUpdate()`     — the champion-select session
 *   - `ctx.api.onGameStateUpdate()`       — the in-game state
 *   - `ctx.api.onLcuEvent()`              — generic client events
 *   - `ctx.api.myProfile()`               — level, rank tier, most played
 *   - `ctx.api.modeTierList(mode)`        — tier / win rate per champion
 *   - `ctx.api.championDetail({...})`     — runes, items, augments
 *   - `ctx.api.staticData()`              — champion and item images
 */

import { h, replace, clear } from '../../core/dom.js';
import {
  RARITY,
  aramBalanceTag,
  averageWinRate,
  extractSessionPayload,
  isAugmentMode,
  isBenchMode,
  buildChampionIndex,
  buildItemIndex,
  collectAugmentCatalogue,
  loadLocalAugmentCatalogue,
  normalizeAugments,
  normalizeChampionDetail,
  normalizeProfile,
  normalizeSession,
  normalizeStatus,
  normalizeTierList,
  pick,
  sortAugments,
  toStr,
} from './data.js';
import { createTranslator, LOCAL } from './strings.js';
import { renderActionsRow } from './parts/actions-row.js';
import { renderAugmentAdvisor } from './parts/augment-advisor.js';
import { renderBenchCards } from './parts/bench-cards.js';
import { renderChampSelectBoard } from './parts/champ-select-board.js';
import { renderConnectionHeader } from './parts/connection-header.js';
import { renderIdlePanel } from './parts/idle-panel.js';
import { renderMatchupHelper } from './parts/matchup-helper.js';
import { renderMyProfilePanel } from './parts/my-profile-panel.js';
import { portrait, tierChip } from './parts/ui.js';

export const meta = {
  id: 'live',
  title: 'common.sidebar.live',
  order: 20,
};

/* --------------------------------------------------------------------------
 * Mount
 * ------------------------------------------------------------------------ */

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 * @returns {() => void} cleanup
 */
export function mount(container, ctx) {
  const t = createTranslator(ctx.i18n.t);
  const store = ctx.store;

  /* ---- stylesheet ----------------------------------------------------- */
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./live.css', import.meta.url).href;
  document.head.appendChild(link);

  /* ---- page state ----------------------------------------------------- */
  let statusRevision = 0;
  const state = {
    status: null,
    session: null,
    timeLeft: null,
    profile: null,
    profileLoading: false,
    profileError: null,
    tierList: new Map(),
    tierListMode: null,
    benchDetails: new Map(),
    championDetail: null,
    championDetailRaw: null,
    championDetailMode: null,
    augments: [],
    augmentLoading: false,
    swapPending: null,
    swapFailed: null,
    actions: {
      runes: { status: 'idle' },
      build: { status: 'idle' },
      spells: { status: 'idle' },
    },
    view: 'draft',
    augmentQuery: '',
    augmentRarity: 'all',
    augmentExpanded: null,
    staticData: null,
    championIndex: new Map(),
    itemIndex: new Map(),
  };

  /* ---- DOM skeleton --------------------------------------------------- */
  const headerSlot = h('div.live__header-slot');
  const bodySlot = h('div.live__body-slot');
  const root = h('div.live', {}, [headerSlot, bodySlot]);
  container.appendChild(root);

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  /** The game mode currently being played. */
  function currentMode() {
    if (state.session && state.session.mode && state.session.mode !== 'etc') return state.session.mode;
    if (state.status && state.status.mode && state.status.mode !== 'etc') return state.status.mode;
    return 'etc';
  }

  /** The champion the local player locked, if any. */
  function myChampionId() {
    const session = state.session;
    if (!session) return 0;
    const mine = session.myTeam.find((slot) => slot.isMe && slot.isLocked && slot.championId > 0);
    if (mine) return mine.championId;
    const locked = session.myTeam.find((slot) => slot.isLocked && slot.championId > 0);
    return locked ? locked.championId : 0;
  }

  /** The lane the local player is assigned to. */
  function myLane() {
    const session = state.session;
    if (!session) return '';
    const mine = session.myTeam.find((slot) => slot.isMe) || session.myTeam.find((slot) => slot.championId > 0);
    return mine ? mine.position : '';
  }

  function championName(championId, slot = null) {
    if (slot && slot.championName) return slot.championName;
    const entry = state.tierList.get(championId);
    if (entry && entry.name) return entry.name;
    const staticEntry = state.championIndex.get(championId);
    if (staticEntry && staticEntry.name) return staticEntry.name;
    return '';
  }

  function championImage(championId, slot = null) {
    if (slot && slot.championSquareImage) return slot.championSquareImage;
    const entry = state.tierList.get(championId);
    if (entry && entry.image) return entry.image;
    const staticEntry = state.championIndex.get(championId);
    if (staticEntry && staticEntry.image) return staticEntry.image;
    return '';
  }

  function championTier(championId) {
    const entry = state.tierList.get(championId);
    if (!entry || entry.tier === null || entry.tier === undefined) return null;
    return { tier: entry.tier, label: entry.tierLabel || '' };
  }

  function itemImage(item) {
    if (item.icon) return item.icon;
    const entry = state.itemIndex.get(item.id);
    return entry ? entry.image : '';
  }

  /** The payload the League Client expects for an "apply" action. */
  function actionPayload() {
    const filters = (store.getState().champions && store.getState().champions.filters) || {};
    const settings = store.getState().settings || {};
    const lane = myLane();
    return {
      championId: myChampionId(),
      championName: championName(myChampionId()),
      lane,
      position: lane.toLowerCase(),
      queueId: state.session ? state.session.queueId : -1,
      mapId: state.session ? state.session.mapId : '',
      mode: currentMode(),
      region: filters.region || 'GLOBAL',
      tier: filters.tier || 'emerald_plus',
      version: filters.patch || '',
      flashKey: settings.flashKey || 'D',
    };
  }

  /* ------------------------------------------------------------------ *
   * Data loading
   * ------------------------------------------------------------------ */

  async function loadStaticData() {
    if (state.staticData) return;
    try {
      const data = await ctx.api.staticData();
      state.staticData = data || null;
      state.championIndex = buildChampionIndex(state.staticData);
      state.itemIndex = buildItemIndex(state.staticData);
    } catch {
      // Static data is optional: the screen still works without portraits.
      state.staticData = null;
    }
  }

  async function loadProfile() {
    state.profileLoading = true;
    state.profileError = null;
    render();
    try {
      const raw = await ctx.api.myProfile();
      state.profile = normalizeProfile(raw);
    } catch (err) {
      state.profile = null;
      state.profileError = err && err.message ? err.message : String(err);
    } finally {
      state.profileLoading = false;
      render();
    }
  }

  async function loadTierList(mode) {
    if (!mode || mode === 'etc') return;
    if (state.tierListMode === mode) return;
    state.tierListMode = mode;
    try {
      const raw = await ctx.api.modeTierList(mode);
      const list = normalizeTierList(raw);
      if (list.size) {
        state.tierList = list;
        render();
      } else {
        state.tierListMode = null;
      }
    } catch {
      // The tier list is supplementary; the board renders without it and a
      // later session update retries the fetch.
      state.tierListMode = null;
    }
  }

  async function loadChampionDetail(championId, mode) {
    if (!championId) return;
    const key = `${mode}:${championId}`;
    if (state.championDetailMode === key) return;
    state.championDetailMode = key;
    state.championDetail = null;
    state.championDetailRaw = null;
    try {
      const raw = await ctx.api.championDetail({ championId, mode });
      state.championDetailRaw = raw;
      state.championDetail = normalizeChampionDetail(raw);
      render();
    } catch {
      state.championDetail = null;
      state.championDetailRaw = null;
    }
  }

  async function loadAugments(championId, mode) {
    if (!championId || !isAugmentMode(mode)) {
      state.augments = [];
      return;
    }
    state.augmentLoading = true;
    render();

    const sources = [];
    const detailMode = mode === 'arena' ? 'arena' : 'aram';

    try {
      sources.push(await ctx.api.championDetail({ championId, mode: detailMode }));
    } catch {
      // fall through to the tier list
    }
    try {
      sources.push(await ctx.api.modeTierList('arena'));
    } catch {
      // the catalogue is optional
    }
    if (state.staticData) sources.push(state.staticData);

    const catalogue = new Map();
    for (const source of sources) {
      for (const [id, meta] of collectAugmentCatalogue(source)) catalogue.set(id, meta);
    }

    // Offline fallback: the shipped capture of `/api/meta/augments`.
    if (!catalogue.size) {
      for (const [id, meta] of await loadLocalAugmentCatalogue()) catalogue.set(id, meta);
    }

    let augments = [];
    for (const source of sources) {
      augments = augments.concat(normalizeAugments(source, catalogue));
    }

    // De-duplicate by augment id, keeping the richest entry.
    const merged = new Map();
    for (const augment of augments) {
      const existing = merged.get(augment.id);
      if (!existing) {
        merged.set(augment.id, augment);
        continue;
      }
      merged.set(augment.id, {
        id: augment.id,
        name: existing.name || augment.name,
        rarity: existing.rarity !== RARITY.SILVER ? existing.rarity : augment.rarity,
        icon: existing.icon || augment.icon,
        description: existing.description || augment.description,
        rank: existing.rank || augment.rank,
        winRate: existing.winRate !== null ? existing.winRate : augment.winRate,
        pickRate: existing.pickRate !== null ? existing.pickRate : augment.pickRate,
        play: existing.play || augment.play,
      });
    }

    state.augments = sortAugments([...merged.values()]);
    state.augmentLoading = false;
    render();
  }

  /** Fetch the per-champion details the bench cards need (runes + items). */
  async function loadBenchDetails(champions) {
    for (const champion of champions) {
      if (state.benchDetails.has(champion.championId)) continue;
      state.benchDetails.set(champion.championId, null);
      try {
        const raw = await ctx.api.championDetail({ championId: champion.championId, mode: 'aram' });
        const detail = normalizeChampionDetail(raw);
        state.benchDetails.set(champion.championId, {
          keystone: detail.keystone
            ? { name: detail.keystone.name, icon: detail.keystone.icon }
            : null,
          starterItems: detail.starterItems.map((item) => ({ ...item, icon: itemImage(item) })),
        });
        render();
      } catch {
        // Keep the null marker so the card simply omits the extra rows.
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * League Client events
   * ------------------------------------------------------------------ */

  function applyStatus(raw) {
    if (!raw) return;
    statusRevision += 1;
    const status = normalizeStatus(raw);
    state.status = status;
    const lcu = store.getState().lcu || {};
    store.setState({
      lcu: {
        ...lcu,
        connected: status.connected,
        phase: status.phase,
        summoner: status.summoner,
        queueId: status.queueId,
        mapId: status.mapId,
        mode: status.mode,
        raw: raw,
      },
    });
  }

  function applySession(payload) {
    const raw = extractSessionPayload(payload);
    if (!raw) return;
    const wrapper = payload && typeof payload === 'object' ? payload : {};
    const session = normalizeSession({ ...wrapper, ...raw });

    state.session = session;
    state.timeLeft = session.timeLeft;

    // Publish the session on the shared store slice so other screens (and the
    // app shell) can read the current draft.
    const lcu = store.getState().lcu || {};
    store.setState({ lcu: { ...lcu, session } });

    const mode = currentMode();
    void loadTierList(mode);
    void loadStaticData().then(() => render());

    const championId = myChampionId();
    if (championId) {
      void loadChampionDetail(championId, detailModeFor(mode));
      void loadAugments(championId, mode);
    } else {
      state.augments = [];
    }

    if (session.bench.length) void loadBenchDetails(session.bench);

    render();
  }

  /** The champion API mode for a game mode. */
  function detailModeFor(mode) {
    switch (mode) {
      case 'aram': return 'aram';
      case 'aram-mayhem': return 'aram';
      case 'aram-mayhem-classic': return 'aram_mayhem_classic';
      case 'classic': return 'classic';
      case 'arena': return 'arena';
      case 'urf': return 'urf';
      default: return 'ranked';
    }
  }

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */

  async function runAction(kind, invoke) {
    state.actions[kind] = { status: 'pending' };
    render();
    try {
      const result = await invoke();
      if (result && result.ok === false) {
        state.actions[kind] = {
          status: 'error',
          reason: result.reason || result.error || result.status || '',
        };
      } else {
        state.actions[kind] = { status: 'ok' };
      }
    } catch (err) {
      state.actions[kind] = { status: 'error', reason: err && err.message ? err.message : String(err) };
    }
    render();
  }

  async function swapBench(championId) {
    state.swapPending = championId;
    state.swapFailed = null;
    render();
    try {
      const result = await ctx.api.swapBench(championId);
      if (result && result.ok === false) {
        state.swapFailed = championId;
      }
    } catch (err) {
      state.swapFailed = championId;
    } finally {
      state.swapPending = null;
      render();
    }
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */

  let rendering = false;

  function render() {
    if (rendering) return;
    rendering = true;
    try {
      const focus = captureFocus();
      paint();
      restoreFocus(focus);
    } finally {
      rendering = false;
    }
  }

  function captureFocus() {
    const active = document.activeElement;
    if (!active || typeof active.getAttribute !== 'function') return null;
    const key = active.getAttribute('data-focus-key');
    if (!key) return null;
    return {
      key,
      start: active.selectionStart,
      end: active.selectionEnd,
    };
  }

  function restoreFocus(focus) {
    if (!focus) return;
    const next = root.querySelector(`[data-focus-key="${focus.key}"]`);
    if (!next) return;
    next.focus();
    if (typeof next.setSelectionRange === 'function' && focus.start !== null && focus.start !== undefined) {
      try {
        next.setSelectionRange(focus.start, focus.end);
      } catch {
        // not a text input
      }
    }
  }

  /** Repaint only the connection header (used by the one-second countdown). */
  function renderHeader() {
    replace(headerSlot, renderConnectionHeader({
      t,
      status: state.status,
      session: state.session,
      timeLeft: state.timeLeft,
      view: state.view,
      onToggleView: () => {
        state.view = state.view === 'draft' ? 'champion' : 'draft';
        render();
      },
    }));
  }

  function paint() {
    const status = state.status;
    const session = state.session;
    const connected = Boolean(status && status.connected);

    renderHeader();

    if (!connected || !session || !session.hasSession) {
      // The idle panel takes over; the profile stays visible as soon as the
      // client is connected, so the player keeps their identity at hand.
      const idleAside = connected ? renderAside({ t, session, mode: currentMode() }) : null;
      replace(bodySlot, h('div.live__body', {}, [
        h('div.live__main', {}, [
          renderIdlePanel({
            t,
            connected,
            activeMode: connected ? currentMode() : '',
          }),
        ]),
        idleAside ? h('div.live__aside', {}, idleAside) : null,
      ]));
      return;
    }

    const mode = currentMode();
    const aside = renderAside({ t, session, mode });
    const championId = myChampionId();
    const main = state.view === 'draft'
      ? renderDraftView({ t, session })
      : renderChampionView({ t });

    // The actions row is always available: it writes the recommendation
    // straight into the League Client, whichever view is on screen.
    const actions = renderActionsRow({
      t,
      states: state.actions,
      enabled: championId > 0,
      onRunes: () => runAction('runes', () => ctx.api.applyRunes(actionPayload())),
      onBuild: () => runAction('build', () => ctx.api.applyItemBuild(actionPayload())),
      onSpells: () => runAction('spells', () => ctx.api.applySpells(actionPayload())),
    });

    replace(bodySlot, h('div.live__body', {}, [
      h('div.live__main', {}, [...main, actions]),
      aside ? h('div.live__aside', {}, aside) : null,
    ]));
  }

  function renderDraftView({ t: tr, session }) {
    return [renderChampSelectBoard({
      t: tr,
      session,
      middle: renderMatchupHelper({
        t: tr,
        session,
        tip: laneTip(),
        championName,
        championImage,
        championTier,
      }),
      onSelect: (championId) => {
        if (ctx.navigate) ctx.navigate('champion-detail', { championId });
      },
      championName,
      championImage,
      championTier,
    })];
  }

  function renderChampionView({ t: tr }) {
    const championId = myChampionId();
    const lane = myLane();
    const detail = state.championDetail;
    const name = championName(championId);
    const tierInfo = championTier(championId);
    const entry = state.tierList.get(championId);

    const summary = h('section.live-panel.live-panel--champion', {}, [
      h('header.live-panel__head', {}, [
        h('div.live-panel__titles', {}, [
          h('h3.live-panel__title', { text: tr('lol.live.champion.v3.overview') }),
        ]),
      ]),
      championId
        ? h('div.live-champion', {}, [
          portrait({ src: championImage(championId), name: name || '?', className: 'live-champion__portrait' }),
          h('div.live-champion__body', {}, [
            h('span.live-champion__name', { text: name || `#${championId}` }),
            h('span.live-champion__meta', {}, [
              lane ? h('span.live-role', { text: lane }) : null,
              tierInfo
                ? tierChip(tierInfo.tier, tierInfo.label || tr('lol.live.champion.v3.tier', { n: tierInfo.tier }))
                : null,
            ]),
            entry && entry.avgPlace !== null && entry.avgPlace !== undefined
              ? h('span.live-champion__stat', { text: `${tr('common.Avg. Place')} ${entry.avgPlace.toFixed(2)}` })
              : null,
            entry && entry.firstPlaceRate !== null && entry.firstPlaceRate !== undefined
              ? h('span.live-champion__stat.tabular', { text: `${tr('common.1st Rate')} ${(entry.firstPlaceRate * 100).toFixed(1)}%` })
              : null,
            detail && detail.keystone
              ? h('span.live-champion__keystone', { text: `${LOCAL.keystone}: ${detail.keystone.name}` })
              : null,
            detail && detail.starterItems.length
              ? h('span.live-champion__items', {
                text: `${LOCAL.starterItems}: ${detail.starterItems.map((item) => item.name || item.id).join(' · ')}`,
              })
              : null,
          ]),
          h('button.live-button.live-button--ghost', {
            type: 'button',
            on: {
              click: () => {
                if (ctx.navigate) ctx.navigate('champion-detail', { championId });
              },
            },
          }, [h('span.live-button__label', { text: tr('lol.live.champion.v3.show-champion') })]),
        ])
        : h('p.live-empty', { text: LOCAL.noChampionSelected }),
    ]);

    return [
      summary,
    ];
  }

  function renderAside({ t: tr, session, mode }) {
    const panels = [];

    panels.push(renderMyProfilePanel({
      t: tr,
      profile: state.profile,
      loading: state.profileLoading,
      error: state.profileError,
      onRetry: loadProfile,
      championName,
      championImage,
    }));

    if (session && isBenchMode(mode) && session.bench.length) {
      panels.push(renderBenchCards({
        t: tr,
        slots: benchSlots(),
        pendingId: state.swapPending,
        failedId: state.swapFailed,
        onSwap: swapBench,
      }));
    }

    // The augment advisor only makes sense once a champion has been picked.
    if (isAugmentMode(mode) && myChampionId() > 0) {
      panels.push(renderAugmentAdvisor({
        t: tr,
        augments: filteredAugments(),
        query: state.augmentQuery,
        rarity: state.augmentRarity,
        expandedId: state.augmentExpanded,
        loading: state.augmentLoading,
        onQuery: (value) => {
          state.augmentQuery = value;
          render();
        },
        onRarity: (value) => {
          state.augmentRarity = value;
          render();
        },
        onToggle: (id) => {
          state.augmentExpanded = state.augmentExpanded === id ? null : id;
          render();
        },
      }));
    }

    return panels;
  }

  /** The bench slots, enriched with tier / win rate / runes / items. */
  function benchSlots() {
    const session = state.session;
    if (!session) return [];
    const baseline = averageWinRate(state.tierList);
    return session.bench.map((champion) => {
      const entry = state.tierList.get(champion.championId);
      const detail = state.benchDetails.get(champion.championId) || null;
      return {
        championId: champion.championId,
        name: champion.championName || (entry ? entry.name : ''),
        image: champion.championSquareImage || (entry ? entry.image : ''),
        tier: entry ? entry.tier : null,
        tierLabel: entry ? entry.tierLabel : '',
        winRate: entry ? entry.winRate : null,
        balance: aramBalanceTag(entry, baseline),
        available: champion.available,
        keystone: detail ? detail.keystone : null,
        starterItems: detail ? detail.starterItems : [],
      };
    });
  }

  /** The augments after the rarity filter and the search box. */
  function filteredAugments() {
    const query = state.augmentQuery.replace(/\s+/g, '').toLowerCase();
    return state.augments.filter((augment) => {
      if (state.augmentRarity !== 'all' && augment.rarity !== state.augmentRarity) return false;
      if (!query) return true;
      return String(augment.name || '').replace(/\s+/g, '').toLowerCase().includes(query);
    });
  }

  /** The OP.GG lane tip for the current champion, when the API provided one. */
  function laneTip() {
    const raw = state.championDetailRaw;
    if (!raw) return null;
    const data = pick(raw, 'data') && typeof pick(raw, 'data') === 'object' ? pick(raw, 'data') : raw;
    const tips = pick(data, 'tips');
    if (!tips) return null;
    const lane = myLane().toLowerCase();
    const tip = pick(tips, lane);
    if (!tip) return null;
    return {
      name: toStr(pick(tip, 'name')),
      tip: toStr(pick(tip, 'tip')),
    };
  }

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */

  const unsubscribes = [];

  const offStore = store.subscribe((s, changed) => {
    if (!changed.includes('lcu')) return;
    const raw = (s.lcu && s.lcu.raw) || s.lcu;
    if (!raw) return;
    state.status = normalizeStatus(raw);
    render();
  });
  unsubscribes.push(offStore);

  if (typeof ctx.api.onChampSelectUpdate === 'function') {
    const off = ctx.api.onChampSelectUpdate((payload) => applySession(payload));
    if (typeof off === 'function') unsubscribes.push(off);
  }

  if (typeof ctx.api.onGameStateUpdate === 'function') {
    const off = ctx.api.onGameStateUpdate((payload) => {
      applyStatus({ ...(payload || {}), connected: true });
    });
    if (typeof off === 'function') unsubscribes.push(off);
  }

  if (typeof ctx.api.onLcuEvent === 'function') {
    const off = ctx.api.onLcuEvent((payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (payload.session || payload.myTeam || payload.theirTeam) {
        applySession(payload);
        return;
      }
      if ('connected' in payload || 'phase' in payload || 'gameflow' in payload || 'summoner' in payload) {
        applyStatus(payload);
      }
    });
    if (typeof off === 'function') unsubscribes.push(off);
  }

  /* ---- polling -------------------------------------------------------- */
  let statusTimer = null;
  const pollStatus = async () => {
    // A pushed event that arrives while the request is in flight is newer
    // than the answer, so the answer is dropped.
    const revision = statusRevision;
    try {
      const raw = await ctx.api.lcuStatus();
      if (revision !== statusRevision) return;
      applyStatus(raw);
    } catch {
      if (revision !== statusRevision) return;
      applyStatus({ connected: false });
    }
  };

  /* ---- countdown ------------------------------------------------------ */
  let clockTimer = null;

  /* ---- first paint ---------------------------------------------------- */
  render();
  void pollStatus();
  void loadStaticData().then(() => render());
  void loadProfile();

  statusTimer = setInterval(pollStatus, 5000);
  clockTimer = setInterval(() => {
    if (state.timeLeft === null || state.timeLeft === undefined) return;
    if (state.timeLeft <= 0) return;
    state.timeLeft -= 1;
    // Only the header carries the clock, so the body is left alone.
    renderHeader();
  }, 1000);

  /* ---- cleanup -------------------------------------------------------- */
  return function cleanup() {
    for (const off of unsubscribes) {
      try {
        off();
      } catch {
        // ignore
      }
    }
    if (statusTimer) clearInterval(statusTimer);
    if (clockTimer) clearInterval(clockTimer);
    link.remove();
    clear(root);
    root.remove();
  };
}

/* --------------------------------------------------------------------------
 * End of module
 * ------------------------------------------------------------------------ */
