/**
 * League Client Update (LCU) IPC handlers and the background watcher.
 *
 * The watcher polls the local League client at 1 Hz while it is running and
 * drops to one discovery attempt every 5 s while it is not — the reference is
 * deliberately CPU-conscious, so the same cadence is used here.
 *
 * Automations:
 *   - **auto accept** — `GET /lol-matchmaking/v1/ready-check` then
 *     `POST /lol-matchmaking/v1/ready-check/accept`
 *   - **auto runes**  — on champion lock the recommended rune page is written
 *     to `/lol-perks/v1/pages`
 *   - **auto build**  — on champion lock the recommended build is written to
 *     `/lol-item-sets/v1/item-sets/{summonerId}/sets` with `priority: true`
 *   - **auto spells** — on champion lock the champion-select spells are written
 *     to `/lol-champ-select/v1/session/my-selection`
 *
 * Every handler answers `{ ok: true, ... }` or `{ ok: false, error: '...' }`.
 */

'use strict';

const { MAIN_TO_RENDERER, RENDERER_TO_MAIN_INVOKE } = require('../../shared/channels.js');
const { LcuClient } = require('../services/lcu-client.js');
const lockfile = require('../services/league-lockfile.js');
const opgg = require('../services/opgg-client.js');

/** Poll cadence (ms). */
const POLL_CONNECTED = 1000;
const POLL_DISCONNECTED = 5000;

/** Flash spell id. */
const SPELL_FLASH = 4;

/** Recommended secondary spells per lane / mode. */
const SECONDARY_SPELLS = {
  aram: 32,
  arena: 22,
  jungle: 11,
  mid: 14,
  adc: 7,
  support: 14,
  top: 12,
};

/**
 * Coerce a value into a finite number.
 *
 * @param {*} value
 * @returns {number|null}
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * The background watcher.
 */
class LcuWatcher {
  /**
   * @param {object} ctx - `{ broadcast, windows }`
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.client = new LcuClient();
    this.timer = null;
    this.running = false;

    this.state = {
      connected: false,
      phase: 'None',
      summoner: null,
      session: null,
      readyCheck: null,
      queue: null,
      region: null,
    };

    this.automations = {
      autoAccept: false,
      autoRunes: false,
      autoBuilds: false,
      autoSpells: false,
      flashKey: 'D',
    };

    /** Champion ids the automations already ran for. */
    this.applied = { runes: null, build: null, spells: null };

    /** Cached queue / mode detection. */
    this.modeCache = null;

    /** Signature of the last pushed status (to avoid pointless IPC traffic). */
    this.lastStatusSignature = null;
  }

  /** Start the watcher loop. */
  start() {
    if (this.timer) return;
    this.schedule(0);
  }

  /** Stop the watcher loop. */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Schedule the next tick.
   *
   * @param {number} delay
   */
  schedule(delay) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.run(); }, delay);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  /**
   * One watcher tick.
   */
  async run() {
    if (this.running) {
      this.schedule(this.state.connected ? POLL_CONNECTED : POLL_DISCONNECTED);
      return;
    }
    this.running = true;
    try {
      if (!this.client.connected) await this.discover();
      if (this.client.connected) await this.processGameflow();
    } catch (err) {
      // The client may have closed mid-request; the next tick re-discovers.
    }
    this.running = false;
    this.schedule(this.state.connected ? POLL_CONNECTED : POLL_DISCONNECTED);
  }

  /**
   * Try to connect to the League client.
   */
  async discover() {
    const creds = await lockfile.discoverLeagueClient();
    if (!creds) {
      if (this.state.connected) {
        this.state.connected = false;
        this.state.summoner = null;
        this.state.phase = 'None';
        this.pushStatus();
      }
      return;
    }

    this.client.setCredentials(creds);

    const summoner = await this.client.get('/lol-summoner/v1/current-summoner').catch(() => null);
    if (!summoner || !summoner.summonerId) {
      this.client.clear();
      return;
    }

    const wasConnected = this.state.connected;
    this.state.connected = true;
    this.state.summoner = summoner;
    this.state.region = summoner.region || null;

    if (!wasConnected) this.pushStatus();
  }

  /**
   * Read the gameflow phase and run the automations.
   */
  async processGameflow() {
    const phase = await this.client.get('/lol-gameflow/v1/gameflow-phase').catch(() => null);
    const nextPhase = typeof phase === 'string' && phase ? phase : 'None';
    const phaseChanged = nextPhase !== this.state.phase;
    this.state.phase = nextPhase;

    if (phaseChanged) {
      this.ctx.broadcast(MAIN_TO_RENDERER.GAME_STATE_UPDATE, {
        phase: nextPhase,
        connected: this.state.connected,
        at: Date.now(),
      });
    }

    if (nextPhase === 'ReadyCheck') {
      await this.autoAccept();
    }

    if (nextPhase === 'ChampSelect') {
      await this.processChampSelect();
    } else {
      this.applied = { runes: null, build: null, spells: null };
      if (phaseChanged) this.pushStatus();
    }
  }

  /**
   * Auto-accept a ready check.
   */
  async autoAccept() {
    if (!this.automations.autoAccept) return;
    try {
      const readyCheck = await this.client.get('/lol-matchmaking/v1/ready-check');
      this.state.readyCheck = readyCheck;
      if (!readyCheck || readyCheck.state !== 'READY') {
        this.pushStatus();
        return;
      }
      await this.client.post('/lol-matchmaking/v1/ready-check/accept');
      this.pushStatus();
    } catch (err) {
      // The ready check may have expired between the read and the accept.
    }
  }

  /**
   * Read the champion-select session, push it to the renderer and run the
   * champion-lock automations.
   */
  async processChampSelect() {
    const session = await this.client.get('/lol-champ-select/v1/session').catch(() => null);
    if (!session) return;

    this.state.session = session;

    const myCellId = session.localPlayerCellId;
    const myTeam = Array.isArray(session.myTeam) ? session.myTeam : [];
    const member = myTeam.find((entry) => entry && entry.cellId === myCellId) || null;
    const championId = member ? (toNumber(member.championId) || toNumber(member.championPickIntent) || 0) : 0;

    const mode = await this.detectMode(session);
    const position = member && member.assignedPosition
      ? String(member.assignedPosition).toLowerCase()
      : 'top';

    this.ctx.broadcast(MAIN_TO_RENDERER.CHAMP_SELECT_UPDATE, {
      mode: mode.mode,
      queueName: mode.queueName,
      myChampionId: championId,
      myPosition: position,
      myTeam,
      theirTeam: Array.isArray(session.theirTeam) ? session.theirTeam : [],
      benchChampions: Array.isArray(session.benchChampions) ? session.benchChampions : [],
      benchEnabled: Boolean(session.benchEnabled),
      session,
      at: Date.now(),
    });

    this.pushStatus();

    if (championId > 0) {
      if (this.automations.autoRunes && this.applied.runes !== championId) {
        this.applied.runes = championId;
        await this.applyRecommendedRunes(championId, mode.mode);
      }
      if (this.automations.autoBuilds && this.applied.build !== championId) {
        this.applied.build = championId;
        await this.applyRecommendedBuild(championId, mode.mode, position);
      }
      if (this.automations.autoSpells && this.applied.spells !== championId) {
        this.applied.spells = championId;
        await this.applyRecommendedSpells(mode.mode, position);
      }
    }
  }

  /**
   * Detect the queue / mode of the current champion-select session.
   *
   * The detection costs two extra LCU requests, so it is cached for a few
   * seconds — the queue does not change while champion select runs.
   *
   * @param {object} session
   * @returns {Promise<{mode:string, queueName:string}>}
   */
  async detectMode(session) {
    const now = Date.now();
    if (this.modeCache && now - this.modeCache.at < 5000) return this.modeCache.value;

    let queueName = session.benchEnabled ? 'ARAM' : 'Ranked Solo';
    let mode = session.benchEnabled ? 'aram' : 'ranked';

    try {
      const flow = await this.client.get('/lol-gameflow/v1/session');
      const queue = flow && flow.gameData && flow.gameData.queue;
      if (queue) {
        queueName = queue.name || queueName;
        const queueLower = String(queueName).toLowerCase();
        const gameMode = String(queue.gameMode || '').toLowerCase();
        if (session.benchEnabled || queue.id === 450 || queue.id === 100 || gameMode === 'aram') {
          mode = 'aram';
        } else if (
          queue.id === 1700 || queue.id === 1710 || queue.id === 2400
          || gameMode === 'cherry' || gameMode === 'mayhem'
          || queueLower.includes('arena') || queueLower.includes('mayhem')
        ) {
          mode = 'arena';
        }
      }
    } catch (err) {
      // Keep the default mode.
    }

    this.modeCache = { value: { mode, queueName }, at: now };
    return this.modeCache.value;
  }

  /**
   * Fetch the recommended build of a champion.
   *
   * @param {number} championId
   * @param {string} mode
   * @param {string} position
   * @returns {Promise<object|null>}
   */
  async fetchBuild(championId, mode, position) {
    const lane = mode === 'aram' || mode === 'arena' ? 'none' : (position || 'top');
    const build = await opgg.getChampionBuild({
      champId: championId,
      mode: mode === 'arena' ? 'arena' : mode,
      position: lane,
      tier: 'all',
    }).catch(() => null);
    return build && build.data ? build.data : null;
  }

  /**
   * Write the recommended rune page.
   *
   * @param {number} championId
   * @param {string} mode
   * @returns {Promise<boolean>}
   */
  async applyRecommendedRunes(championId, mode) {
    const data = await this.fetchBuild(championId, mode, 'top');
    const runeSet = data && Array.isArray(data.runes) && data.runes[0] ? data.runes[0] : null;
    if (!runeSet) return false;

    const selectedPerkIds = [
      ...(runeSet.primary_rune_ids || []),
      ...(runeSet.secondary_rune_ids || []),
      ...(runeSet.stat_mod_ids || []),
    ];
    if (!selectedPerkIds.length) return false;

    const body = {
      autoModifiedSelections: [0],
      isActive: true,
      isDeletable: true,
      isEditable: true,
      isValid: true,
      order: 0,
      name: `OP.GG ${championId} (${String(mode).toUpperCase()})`,
      primaryStyleId: runeSet.primary_page_id || 8000,
      subStyleId: runeSet.secondary_page_id || 8400,
      selectedPerkIds,
      quickPlayChampionIds: [],
    };

    return this.writeRunePage(body);
  }

  /**
   * Write a rune page into the client.
   *
   * @param {object} body
   * @returns {Promise<boolean>}
   */
  async writeRunePage(body) {
    const pages = await this.client.get('/lol-perks/v1/pages').catch(() => null);
    if (!Array.isArray(pages)) return false;

    const editable = pages.find((page) => page && page.isEditable) || pages[0];
    if (editable && editable.id) {
      try {
        await this.client.put(`/lol-perks/v1/pages/${editable.id}`, body);
        return true;
      } catch (err) {
        // Fall through to the delete + create path.
      }
      try {
        await this.client.delete(`/lol-perks/v1/pages/${editable.id}`);
      } catch (err) { /* ignore */ }
    }

    try {
      await this.client.post('/lol-perks/v1/pages', body);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Write the recommended item build.
   *
   * @param {number} championId
   * @param {string} mode
   * @param {string} position
   * @returns {Promise<boolean>}
   */
  async applyRecommendedBuild(championId, mode, position) {
    const summoner = this.state.summoner;
    if (!summoner) return false;

    const summonerId = toNumber(summoner.summonerId) || toNumber(summoner.accountId);
    if (!summonerId) return false;

    const data = await this.fetchBuild(championId, mode, position);
    if (!data) return false;

    const toItems = (ids) => (ids || []).map((id) => ({ id: String(id), count: 1 }));
    const pathIds = (list) => {
      const first = Array.isArray(list) && list.length ? list[0] : null;
      return first && Array.isArray(first.ids) ? first.ids.map(Number) : [];
    };

    const starters = pathIds(data.starter_items);
    const core = pathIds(data.core_items);
    const boots = pathIds(data.boots);
    const situational = pathIds(data.last_items);

    if (!starters.length && !core.length) return false;

    const itemSet = {
      title: `OP.GG ${championId} (${String(mode).toUpperCase()})`,
      type: 'custom',
      map: mode === 'aram' ? 'HA' : 'any',
      mode: 'any',
      priority: true,
      blocks: [
        { type: 'Starter Items (OP.GG Recommended)', items: toItems(starters) },
        { type: 'Core Build Path', items: toItems(core) },
        { type: 'Boots Priority', items: toItems(boots) },
        { type: 'Situational & Counter Items', items: toItems(situational) },
      ],
    };

    try {
      await this.client.post(`/lol-item-sets/v1/item-sets/${summonerId}/sets`, { itemSets: [itemSet] });
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Write the recommended summoner spells.
   *
   * @param {string} mode
   * @param {string} position
   * @returns {Promise<boolean>}
   */
  async applyRecommendedSpells(mode, position) {
    const secondary = this.secondarySpellId(mode, position);
    const flashFirst = this.automations.flashKey !== 'D';
    const spell1Id = flashFirst ? secondary : SPELL_FLASH;
    const spell2Id = flashFirst ? SPELL_FLASH : secondary;

    try {
      await this.client.patch('/lol-champ-select/v1/session/my-selection', { spell1Id, spell2Id });
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * The recommended secondary summoner spell for a mode / lane.
   *
   * @param {string} mode
   * @param {string} position
   * @returns {number}
   */
  secondarySpellId(mode, position) {
    const normalisedMode = String(mode || 'ranked').toLowerCase();
    if (normalisedMode === 'aram') return SECONDARY_SPELLS.aram;
    if (normalisedMode === 'arena' || normalisedMode === 'mayhem') return SECONDARY_SPELLS.arena;

    const lane = String(position || 'top').toLowerCase();
    if (lane === 'jungle' || lane === 'jug') return SECONDARY_SPELLS.jungle;
    if (lane === 'mid' || lane === 'middle') return SECONDARY_SPELLS.mid;
    if (lane === 'adc' || lane === 'bottom') return SECONDARY_SPELLS.adc;
    if (lane === 'support' || lane === 'utility') return SECONDARY_SPELLS.support;
    return SECONDARY_SPELLS.top;
  }

  /**
   * The status snapshot that is pushed to the renderer.
   *
   * @returns {object}
   */
  status() {
    return {
      connected: this.state.connected,
      phase: this.state.phase,
      summoner: this.state.summoner,
      session: this.state.session,
      readyCheck: this.state.readyCheck,
      queue: this.state.queue,
      region: this.state.region,
      automations: { ...this.automations },
      at: Date.now(),
    };
  }

  /** Push the status to the renderer (only when it actually changed). */
  pushStatus() {
    const snapshot = this.status();
    const signature = JSON.stringify({
      connected: snapshot.connected,
      phase: snapshot.phase,
      summoner: snapshot.summoner ? snapshot.summoner.summonerId : null,
      readyCheck: snapshot.readyCheck ? snapshot.readyCheck.state : null,
      session: snapshot.session ? snapshot.session.actions : null,
      automations: snapshot.automations,
    });

    if (signature === this.lastStatusSignature) return;
    this.lastStatusSignature = signature;
    this.ctx.broadcast(MAIN_TO_RENDERER.LCU_EVENT, snapshot);
  }
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `lcu:status` — the current client status.
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     connected: true,
 *     phase: 'ChampSelect',
 *     summoner: { summonerId, accountId, puuid, displayName, … },
 *     session: { …champ-select session… },
 *     readyCheck: { state: 'READY', … } | null,
 *     queue: { … } | null,
 *     region: 'KR',
 *     automations: { autoAccept, autoRunes, autoBuilds, autoSpells, flashKey }
 *   }
 */
function handleStatus(ctx) {
  return { ok: true, ...ctx.lcu.status() };
}

/**
 * `lcu:request` — an arbitrary LCU request.
 *
 * PAYLOAD
 *   { method: 'GET', endpoint: '/lol-summoner/v1/current-summoner', data?: any }
 *
 * RESPONSE
 *   { ok: true, data: <upstream body> } | { ok: false, error: '…' }
 */
async function handleRequest(ctx, payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const method = String(args.method || 'GET').toUpperCase();
  const endpoint = String(args.endpoint || '');
  if (!endpoint) return { ok: false, error: 'endpoint is required' };

  try {
    const data = await ctx.lcu.client.request(method, endpoint, args.data);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * `lcu:my-profile` — the signed-in summoner.
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     connected: true,
 *     summoner: { … },
 *     ranked: { … },
 *     matchHistory: [ … ]
 *   }
 */
async function handleMyProfile(ctx) {
  if (!ctx.lcu.client.connected) {
    return { ok: false, error: 'League client is not connected', connected: false };
  }
  try {
    const [summoner, ranked, matchHistory] = await Promise.all([
      ctx.lcu.client.get('/lol-summoner/v1/current-summoner').catch(() => null),
      ctx.lcu.client.get('/lol-ranked/v1/current-ranked-stats').catch(() => null),
      ctx.lcu.client
        .get('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=20')
        .catch(() => null),
    ]);
    return {
      ok: true,
      connected: true,
      summoner,
      ranked,
      matchHistory: (matchHistory && matchHistory.games && matchHistory.games.games) || [],
    };
  } catch (err) {
    return { ok: false, error: err.message, connected: true };
  }
}

/**
 * `lcu:swap-bench` — swap the bench champion.
 *
 * PAYLOAD
 *   12 (the champion id)
 *
 * RESPONSE
 *   { ok: true, success: true } | { ok: false, success: false, error: '…' }
 */
async function handleSwapBench(ctx, payload) {
  const championId = toNumber(payload && payload.championId !== undefined ? payload.championId : payload);
  if (!championId) return { ok: false, success: false, error: 'championId is required' };
  if (!ctx.lcu.client.connected) {
    return { ok: false, success: false, error: 'League client is not connected' };
  }
  try {
    await ctx.lcu.client.post(`/lol-champ-select/v1/session/bench/swap/${championId}`);
    return { ok: true, success: true };
  } catch (err) {
    return { ok: false, success: false, error: err.message };
  }
}

/**
 * `lcu:apply-runes` — write a rune page.
 *
 * PAYLOAD
 *   { championName?: string, primaryStyleId: number, subStyleId: number, selectedPerkIds: number[] }
 *
 * RESPONSE
 *   { ok: true, success: true, page: <created page> } | { ok: false, success: false, error: '…' }
 */
async function handleApplyRunes(ctx, payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  if (!ctx.lcu.client.connected) {
    return { ok: false, success: false, error: 'League client is not connected' };
  }
  if (!Array.isArray(args.selectedPerkIds) || !args.selectedPerkIds.length) {
    return { ok: false, success: false, error: 'selectedPerkIds is required' };
  }

  const body = {
    autoModifiedSelections: [0],
    isActive: true,
    isDeletable: true,
    isEditable: true,
    isValid: true,
    order: 0,
    name: `OP.GG ${args.championName || 'Runes'}`,
    primaryStyleId: toNumber(args.primaryStyleId) || 8000,
    subStyleId: toNumber(args.subStyleId) || 8400,
    selectedPerkIds: args.selectedPerkIds.map(Number),
    quickPlayChampionIds: [],
  };

  const success = await ctx.lcu.writeRunePage(body);
  if (!success) return { ok: false, success: false, error: 'Could not write the rune page' };

  const pages = await ctx.lcu.client.get('/lol-perks/v1/pages').catch(() => []);
  return { ok: true, success: true, page: Array.isArray(pages) ? pages[0] : null };
}

/**
 * `lcu:apply-spells` — write the champion-select summoner spells.
 *
 * PAYLOAD
 *   { spell1Id: number, spell2Id: number }
 *
 * RESPONSE
 *   { ok: true, success: true } | { ok: false, success: false, error: '…' }
 */
async function handleApplySpells(ctx, payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  if (!ctx.lcu.client.connected) {
    return { ok: false, success: false, error: 'League client is not connected' };
  }
  const spell1Id = toNumber(args.spell1Id);
  const spell2Id = toNumber(args.spell2Id);
  if (!spell1Id || !spell2Id) {
    return { ok: false, success: false, error: 'spell1Id and spell2Id are required' };
  }
  try {
    await ctx.lcu.client.patch('/lol-champ-select/v1/session/my-selection', { spell1Id, spell2Id });
    return { ok: true, success: true };
  } catch (err) {
    return { ok: false, success: false, error: err.message };
  }
}

/**
 * `lcu:apply-item-build` — write a recommended item build.
 *
 * PAYLOAD
 *   { champId: number, champName?: string, mode?: string, position?: string }
 *
 * RESPONSE
 *   { ok: true, success: true } | { ok: false, success: false, error: '…' }
 */
async function handleApplyItemBuild(ctx, payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const champId = toNumber(args.champId !== undefined ? args.champId : args.championId);
  if (!champId) return { ok: false, success: false, error: 'champId is required' };
  if (!ctx.lcu.client.connected) {
    return { ok: false, success: false, error: 'League client is not connected' };
  }

  const mode = String(args.mode || 'ranked').toLowerCase();
  const position = String(args.position || 'top').toLowerCase();

  const success = await ctx.lcu.applyRecommendedBuild(champId, mode, position);
  if (!success) {
    return { ok: false, success: false, error: 'Could not write the item build' };
  }
  return { ok: true, success: true };
}

/**
 * `lcu:pick-ban` — pick or ban a champion in champion select.
 *
 * PAYLOAD
 *   { championId: number, action: 'pick'|'ban' }
 *
 * RESPONSE
 *   { ok: true, success: true } | { ok: false, success: false, error: '…' }
 */
async function handlePickBan(ctx, payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const championId = toNumber(args.championId);
  const action = String(args.action || 'pick').toLowerCase();
  if (!championId) return { ok: false, success: false, error: 'championId is required' };
  if (!ctx.lcu.client.connected) {
    return { ok: false, success: false, error: 'League client is not connected' };
  }
  if (action !== 'pick' && action !== 'ban') {
    return { ok: false, success: false, error: 'action must be "pick" or "ban"' };
  }
  try {
    await ctx.lcu.client.post(`/lol-champ-select/v1/session/actions/${action}/${championId}`);
    return { ok: true, success: true };
  } catch (err) {
    return { ok: false, success: false, error: err.message };
  }
}

/**
 * `lcu:start-recording` — not part of the League scope of this replica.
 *
 * RESPONSE
 *   { ok: false, error: 'Match recording is not supported in this build' }
 */
function handleStartRecording() {
  return { ok: false, error: 'Match recording is not supported in this build' };
}

/**
 * Toggle one automation and persist it.
 *
 * @param {object} ctx
 * @param {string} key
 * @param {*} payload
 * @returns {{ok:boolean, value:boolean}}
 */
function setAutomation(ctx, key, payload) {
  const value = Boolean(payload && payload.value !== undefined ? payload.value : payload);
  ctx.lcu.automations[key] = value;
  if (ctx.settings) ctx.settings.set(key, value);
  ctx.lcu.pushStatus();
  return { ok: true, value };
}

/**
 * `lcu:set-flash-key` — which key slot carries Flash.
 *
 * PAYLOAD
 *   'D' | 'F'
 *
 * RESPONSE
 *   { ok: true, value: 'D' }
 */
function handleSetFlashKey(ctx, payload) {
  const raw = payload && payload.value !== undefined ? payload.value : payload;
  const key = String(raw || '').toUpperCase() === 'D' ? 'D' : 'F';
  ctx.lcu.automations.flashKey = key;
  if (ctx.settings) ctx.settings.set('flashKey', key);
  ctx.lcu.pushStatus();
  return { ok: true, value: key };
}

/* -------------------------------------------------------------------------- */
/* Registration                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Register every LCU handler.
 *
 * @param {object} ctx - `{ ipcMain, privileged, lcu, settings }`
 */
function register(ctx) {
  const { ipcMain, privileged } = ctx;

  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_STATUS, privileged(() => handleStatus(ctx)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_REQUEST, privileged((event, payload) => handleRequest(ctx, payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_MY_PROFILE, privileged(() => handleMyProfile(ctx)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_SWAP_BENCH, privileged((event, payload) => handleSwapBench(ctx, payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_APPLY_RUNES, privileged((event, payload) => handleApplyRunes(ctx, payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_APPLY_SPELLS, privileged((event, payload) => handleApplySpells(ctx, payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_APPLY_ITEM_BUILD, privileged((event, payload) => handleApplyItemBuild(ctx, payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_PICK_BAN, privileged((event, payload) => handlePickBan(ctx, payload)));
  ipcMain.handle(RENDERER_TO_MAIN_INVOKE.LCU_START_RECORDING, privileged(() => handleStartRecording()));

  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.LCU_SET_AUTO_ACCEPT,
    privileged((event, payload) => setAutomation(ctx, 'autoAccept', payload)),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.LCU_SET_AUTO_RUNES,
    privileged((event, payload) => setAutomation(ctx, 'autoRunes', payload)),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.LCU_SET_AUTO_BUILDS,
    privileged((event, payload) => setAutomation(ctx, 'autoBuilds', payload)),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.LCU_SET_AUTO_SPELLS,
    privileged((event, payload) => setAutomation(ctx, 'autoSpells', payload)),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.LCU_SET_FLASH_KEY,
    privileged((event, payload) => handleSetFlashKey(ctx, payload)),
  );
}

module.exports = register;
module.exports.LcuWatcher = LcuWatcher;
module.exports.handleStatus = handleStatus;
