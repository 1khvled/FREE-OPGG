/**
 * Live companion — data normalisers.
 *
 * Everything the Live screen renders comes from one of three places:
 *
 *   1. the League Client (LCU) session snapshot, pushed by the main process
 *      through `CHAMP_SELECT_UPDATE` / `GAME_STATE_UPDATE` / `LCU_EVENT`;
 *   2. the League Client status (`LCU_STATUS`);
 *   3. the OP.GG HTTP API through `ctx.api` (tier lists, champion detail).
 *
 * The main process is allowed to speak either camelCase (the raw Riot shape)
 * or PascalCase (the shape Riot's own WebSocket uses on some endpoints), and
 * it is allowed to enrich the raw session with champion names and portraits.
 * Every normaliser below therefore reads through `pick()`, which accepts a
 * list of candidate key names and falls back to a case-insensitive scan.
 *
 * Nothing here invents data: when a field is absent the normaliser returns
 * `null` and the UI omits the element instead of showing a made-up value.
 */

/* --------------------------------------------------------------------------
 * Primitive helpers
 * ------------------------------------------------------------------------ */

/**
 * Read the first present value among `names` from `source`.
 * Falls back to a case-insensitive key scan, so `championId`, `ChampionId`
 * and `championid` all resolve to the same field.
 *
 * @param {object} source
 * @param {...string} names
 * @returns {any}
 */
export function pick(source, ...names) {
  if (!source || typeof source !== 'object') return undefined;
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(source, name) && source[name] !== undefined) {
      return source[name];
    }
  }
  const keys = Object.keys(source);
  for (const name of names) {
    const wanted = name.toLowerCase();
    for (const key of keys) {
      if (key.toLowerCase() === wanted && source[key] !== undefined) return source[key];
    }
  }
  return undefined;
}

/**
 * Read the first array found among `names`, descending one extra level into
 * `{ data: [...] }` wrappers (the OP.GG API always wraps its payload).
 *
 * @param {object} source
 * @param {...string} names
 * @returns {Array}
 */
export function pickArray(source, ...names) {
  const direct = pick(source, ...names);
  if (Array.isArray(direct)) return direct;
  if (direct && typeof direct === 'object') {
    const nested = pick(direct, 'data', 'items', 'list', 'rows');
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

/** Coerce to an integer, or `fallback` when the value is missing/garbage. */
export function toInt(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Coerce to a finite number, or `fallback`. */
export function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce to a boolean; strings such as `"false"` are handled correctly. */
export function toBool(value, fallback = false) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (text === 'true' || text === '1' || text === 'yes') return true;
  if (text === 'false' || text === '0' || text === 'no' || text === '') return false;
  return fallback;
}

/** Coerce to a trimmed string, or `fallback`. */
export function toStr(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === '' ? fallback : text;
}

/* --------------------------------------------------------------------------
 * Roles / positions
 * ------------------------------------------------------------------------ */

/**
 * The League Client reports `assignedPosition` in lower case. The reference
 * maps it to a fixed set of display codes (see `ji` in the shipped bundle).
 */
export const POSITION_LABELS = {
  top: 'TOP',
  jungle: 'JUNGLE',
  middle: 'MID',
  mid: 'MID',
  bottom: 'ADC',
  adc: 'ADC',
  utility: 'SUPPORT',
  support: 'SUPPORT',
};

/** Canonical order used by the reference's role chips. */
export const POSITION_ORDER = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

/**
 * Resolve a raw position to its display code.
 * @param {string} value
 * @returns {string} display code, or `''` when the position is unknown.
 */
export function positionLabel(value) {
  const key = toStr(value).toLowerCase();
  if (!key || key === 'none') return '';
  if (POSITION_LABELS[key]) return POSITION_LABELS[key];
  const upper = toStr(value).toUpperCase();
  return POSITION_ORDER.includes(upper) ? upper : upper;
}

/* --------------------------------------------------------------------------
 * League Client phase
 * ------------------------------------------------------------------------ */

/** The four phases the Live screen distinguishes. */
export const PHASES = { NONE: 'None', LOBBY: 'Lobby', CHAMPSELECT: 'ChampSelect', GAME: 'Game' };

const GAME_PHASES = new Set([
  'GameStart', 'InProgress', 'PreEndOfGame', 'EndOfGame', 'WaitingForStats', 'Reconnect',
]);

/**
 * Map a raw League Client gameflow phase onto the four display phases.
 * @param {string} phase
 * @returns {string} one of `PHASES`
 */
export function phaseLabel(phase) {
  const raw = toStr(phase);
  if (!raw) return PHASES.NONE;
  if (raw === 'None') return PHASES.NONE;
  if (raw === 'Lobby') return PHASES.LOBBY;
  if (raw === 'ChampSelect') return PHASES.CHAMPSELECT;
  if (GAME_PHASES.has(raw)) return PHASES.GAME;
  if (raw.toLowerCase() === 'champselect') return PHASES.CHAMPSELECT;
  if (raw.toLowerCase() === 'lobby') return PHASES.LOBBY;
  if (raw.toLowerCase() === 'game') return PHASES.GAME;
  return raw;
}

/* --------------------------------------------------------------------------
 * Game mode detection
 * ------------------------------------------------------------------------ */

const MODE_BY_QUEUE = new Map([
  [400, 'rift'], [420, 'rift'], [440, 'rift'],
  [450, 'aram'], [720, 'aram'], [3240, 'aram'],
  [2400, 'aram-mayhem'], [2401, 'aram-mayhem'], [2403, 'aram-mayhem'], [2405, 'aram-mayhem'],
  [2450, 'aram-mayhem-classic'],
  [900, 'urf'], [1900, 'urf'],
  [1700, 'arena'], [1710, 'arena'], [1750, 'arena'],
  [1300, 'nexus-blitz'],
  [4300, 'classic'], [4310, 'classic'],
]);

const MODE_BY_MAP = {
  ARAM: 'aram',
  KIWI: 'aram-mayhem',
  KIWI_JADE: 'aram-mayhem-classic',
  JADE: 'classic',
  CHERRY: 'arena',
  URF: 'urf',
  ARURF: 'urf',
};

/**
 * Detect the game mode from the queue id and map id, exactly the way the
 * reference does (map id wins for the special modes).
 *
 * @param {number|null} queueId
 * @param {string|null} mapId
 * @returns {string} mode slug
 */
export function modeForQueue(queueId, mapId) {
  const map = toStr(mapId).toUpperCase();
  if (map && MODE_BY_MAP[map]) return MODE_BY_MAP[map];
  const queue = toInt(queueId, -1);
  if (queue !== -1 && MODE_BY_QUEUE.has(queue)) return MODE_BY_QUEUE.get(queue);
  return 'etc';
}

/** Modes that show the ARAM bench / reroll pool. */
export function isBenchMode(mode) {
  return mode === 'aram' || mode === 'aram-mayhem' || mode === 'aram-mayhem-classic';
}

/** Modes that show the augment advisor. */
export function isAugmentMode(mode) {
  return mode === 'arena' || mode === 'aram-mayhem' || mode === 'aram-mayhem-classic';
}

/* --------------------------------------------------------------------------
 * Champion slots
 * ------------------------------------------------------------------------ */

/**
 * @typedef {object} LiveSlot
 * @property {number} cellId
 * @property {number} championId      0 when nothing is picked yet
 * @property {number} intentChampionId  the champion currently hovered
 * @property {string} position        display code (`TOP`, `MID`, …) or ''
 * @property {boolean} isMe
 * @property {boolean} isActing       this cell has the active pick
 * @property {boolean} isLocked       the pick is confirmed
 * @property {boolean} isHovered      a champion is hovered but not locked
 * @property {string} championName
 * @property {string} championSquareImage
 * @property {number} pickTurn
 */

/**
 * Normalise one champion-select slot.
 *
 * @param {object} raw
 * @param {{localPlayerCellId?: number, actions?: Array}} [context]
 * @returns {LiveSlot}
 */
export function normalizeSlot(raw, context = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const localPlayerCellId = toInt(context.localPlayerCellId, -1);
  const actions = Array.isArray(context.actions) ? context.actions : [];

  const cellId = toInt(pick(source, 'cellId'), -1);
  const rawChampionId = toInt(pick(source, 'championId'), 0) || 0;
  const intentChampionId = toInt(pick(source, 'championPickIntent', 'pickIntent', 'intentChampionId'), 0) || 0;

  const position = positionLabel(pick(source, 'assignedPosition', 'position', 'assignedRole'));

  const pickAction = actions.find((a) => (
    a && toInt(pick(a, 'actorCellId'), -1) === cellId && toStr(pick(a, 'type')) === 'pick'
  ));
  const isActing = Boolean(pickAction && toBool(pick(pickAction, 'isInProgress'), false));
  const actionCompleted = Boolean(pickAction && toBool(pick(pickAction, 'completed'), false));
  const actionChampionId = pickAction ? (toInt(pick(pickAction, 'championId'), 0) || 0) : 0;

  // The champion is locked when the member carries one, or when the pick
  // action for this cell has completed.
  const championId = rawChampionId > 0
    ? rawChampionId
    : (actionCompleted ? actionChampionId : 0);

  const explicitLocked = pick(source, 'isLocked', 'locked');
  const isLocked = explicitLocked === undefined
    ? championId > 0
    : toBool(explicitLocked, false);

  const explicitHovered = pick(source, 'isHovered', 'hovered');
  const isHovered = explicitHovered === undefined
    ? (championId === 0 && intentChampionId > 0)
    : toBool(explicitHovered, false);

  const isMe = pick(source, 'isMe') !== undefined
    ? toBool(pick(source, 'isMe'), false)
    : (localPlayerCellId !== -1 && cellId === localPlayerCellId);

  return {
    cellId,
    championId,
    intentChampionId,
    position,
    isMe,
    isActing,
    isLocked,
    isHovered,
    championName: toStr(pick(source, 'championName', 'name', 'champion_name')),
    championSquareImage: toStr(pick(source, 'championSquareImage', 'squarePortraitPath', 'championSquareImagePath', 'imageUrl')),
    pickTurn: toInt(pick(source, 'pickTurn', 'order'), 0) || 0,
    assignedPosition: toStr(pick(source, 'assignedPosition', 'position')),
    summonerName: toStr(pick(source, 'summonerName', 'summonerNameTag', 'displayName')),
  };
}

/* --------------------------------------------------------------------------
 * Champion-select session
 * ------------------------------------------------------------------------ */

/**
 * @typedef {object} LiveSession
 * @property {boolean} hasSession
 * @property {string} phase
 * @property {number} timeLeft            seconds left in the current phase
 * @property {number} totalTime           seconds in the current phase
 * @property {boolean} isBanPhase
 * @property {{team: string, index: number}|null} actingBan
 * @property {LiveSlot[]} myTeam
 * @property {LiveSlot[]} theirTeam
 * @property {number[]} myBans
 * @property {number[]} theirBans
 * @property {Array} bench                bench champions
 * @property {boolean} benchEnabled
 * @property {number} queueId
 * @property {string} mapId
 * @property {string} mode
 */

/**
 * Pull the champion-select session out of an event payload.
 *
 * The main process may push the raw session, or wrap it (`{ session }`,
 * `{ champSelectSession }`, `{ data }`).
 *
 * @param {object} payload
 * @returns {object|null}
 */
export function extractSessionPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const nested = pick(payload, 'session', 'champSelectSession', 'champSelect', 'data');
  return nested && typeof nested === 'object' && !Array.isArray(nested) ? nested : payload;
}

/**
 * Normalise the League Client champion-select session.
 *
 * Accepts the raw Riot session (`myTeam` / `theirTeam` / `actions` /
 * `bans` / `timer` / `benchChampions`) and any PascalCase variant, plus
 * optional OP.GG enrichment (`championName`, `championSquareImage`).
 *
 * @param {object} raw
 * @returns {LiveSession}
 */
export function normalizeSession(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const localPlayerCellId = toInt(pick(source, 'localPlayerCellId'), -1);

  // `actions` is an array of arrays in the Riot payload.
  const actionsRaw = pick(source, 'actions');
  const actions = [];
  if (Array.isArray(actionsRaw)) {
    for (const entry of actionsRaw) {
      if (Array.isArray(entry)) actions.push(...entry.filter(Boolean));
      else if (entry) actions.push(entry);
    }
  }

  const myTeamRaw = pickArray(source, 'myTeam');
  const theirTeamRaw = pickArray(source, 'theirTeam');
  const context = { localPlayerCellId, actions };
  const myTeam = myTeamRaw.map((slot) => normalizeSlot(slot, context));
  const theirTeam = theirTeamRaw.map((slot) => normalizeSlot(slot, context));

  const timer = pick(source, 'timer') || {};
  const timeLeftMs = toNumber(pick(timer, 'adjustedTimeLeftInPhase'), null);
  const totalTimeMs = toNumber(pick(timer, 'totalTimeInPhase'), null);

  const bans = pick(source, 'bans') || {};
  let myBans = pickArray(bans, 'myTeamBans').map((v) => toInt(v, 0) || 0);
  let theirBans = pickArray(bans, 'theirTeamBans').map((v) => toInt(v, 0) || 0);

  const actorCellId = (action) => toInt(pick(action, 'actorCellId'), -1);
  const isMyCell = (action) => myTeam.some((slot) => slot.cellId === actorCellId(action));
  const isTheirCell = (action) => theirTeam.some((slot) => slot.cellId === actorCellId(action));

  // Fall back to the ban actions when the session carries no `bans` block.
  const banActions = actions.filter((a) => toStr(pick(a, 'type')) === 'ban');
  const myBanActions = banActions.filter(isMyCell);
  const theirBanActions = banActions.filter(isTheirCell);

  if (myBans.length === 0 && myBanActions.length > 0) {
    myBans = myBanActions.map((a) => toInt(pick(a, 'championId'), 0) || 0);
  }
  if (theirBans.length === 0 && theirBanActions.length > 0) {
    theirBans = theirBanActions.map((a) => toInt(pick(a, 'championId'), 0) || 0);
  }

  // The index of the ban that is currently being made, per team.
  const myBansInProgress = myBanActions.findIndex((a) => toBool(pick(a, 'isInProgress'), false));
  const theirBansInProgress = theirBanActions.findIndex((a) => toBool(pick(a, 'isInProgress'), false));

  let actingBan = null;
  if (myBansInProgress >= 0) actingBan = { team: 'my', index: myBansInProgress };
  else if (theirBansInProgress >= 0) actingBan = { team: 'their', index: theirBansInProgress };

  const isBanPhase = banActions.some((a) => toBool(pick(a, 'isInProgress'), false));

  const bench = normalizeBench(pick(source, 'benchChampions'));
  const queueId = toInt(pick(source, 'queueId'), -1);
  const mapId = toStr(pick(source, 'mapId'));

  return {
    hasSession: myTeam.length > 0 || theirTeam.length > 0,
    phase: phaseLabel(pick(source, 'phase')),
    timeLeft: timeLeftMs === null ? null : Math.max(0, Math.round(timeLeftMs / 1000)),
    totalTime: totalTimeMs === null ? null : Math.max(0, Math.round(totalTimeMs / 1000)),
    timerPhase: toStr(pick(timer, 'phase')),
    isBanPhase,
    actingBan,
    myTeam,
    theirTeam,
    myBans,
    theirBans,
    bench: bench.champions,
    benchEnabled: toBool(pick(source, 'benchEnabled'), bench.champions.length > 0),
    localPlayerCellId,
    queueId,
    mapId,
    mode: modeForQueue(queueId, mapId),
  };
}

/**
 * Normalise the ARAM bench (the reroll pool).
 *
 * Accepts `{ benchChampions: [...] }`, a bare array, or the entries may carry
 * `championName` / `championSquareImage` when the main process enriched them.
 *
 * @param {object|Array} raw
 * @returns {{champions: Array, enabled: boolean}}
 */
export function normalizeBench(raw) {
  const list = Array.isArray(raw)
    ? raw
    : pickArray(raw && typeof raw === 'object' ? raw : {}, 'benchChampions', 'bench', 'champions');
  const champions = list
    .map((entry) => {
      if (entry === null || entry === undefined) return null;
      if (typeof entry === 'number' || typeof entry === 'string') {
        const id = toInt(entry, null);
        return id === null ? null : { championId: id, championName: '', championSquareImage: '', available: true };
      }
      const source = entry;
      const championId = toInt(pick(source, 'championId', 'id'), 0) || 0;
      if (!championId) return null;
      return {
        championId,
        championName: toStr(pick(source, 'championName', 'name')),
        championSquareImage: toStr(pick(source, 'championSquareImage', 'squarePortraitPath', 'imageUrl')),
        available: pick(source, 'available') === undefined
          ? true
          : toBool(pick(source, 'available'), true),
      };
    })
    .filter(Boolean);
  return { champions, enabled: champions.length > 0 };
}

/* --------------------------------------------------------------------------
 * League Client status
 * ------------------------------------------------------------------------ */

/**
 * @typedef {object} LiveStatus
 * @property {boolean} connected
 * @property {string} phase        one of `PHASES`
 * @property {string} rawPhase
 * @property {object|null} summoner
 * @property {number} queueId
 * @property {string} mapId
 * @property {boolean} isChampSelect
 * @property {boolean} isInGame
 */

/**
 * Normalise the League Client status payload.
 *
 * @param {object} raw
 * @returns {LiveStatus}
 */
export function normalizeStatus(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const connected = toBool(pick(source, 'connected', 'isConnected', 'online'), false);
  const rawPhase = toStr(pick(source, 'phase', 'gameflow', 'gameFlow', 'gameflowPhase'), 'None');
  const phase = phaseLabel(rawPhase);

  const summonerRaw = pick(source, 'summoner', 'account', 'player');
  let summoner = null;
  if (summonerRaw && typeof summonerRaw === 'object') {
    const displayName = toStr(pick(summonerRaw, 'displayName', 'gameName', 'name'));
    const tagLine = toStr(pick(summonerRaw, 'tagLine', 'tag'));
    if (displayName || tagLine) {
      summoner = {
        displayName,
        tagLine,
        level: toInt(pick(summonerRaw, 'summonerLevel', 'level'), null),
        puuid: toStr(pick(summonerRaw, 'puuid')),
        summonerId: toInt(pick(summonerRaw, 'summonerId', 'id'), null),
      };
    }
  }
  if (!summoner) {
    const name = toStr(pick(source, 'summonerName', 'displayName'));
    if (name) summoner = { displayName: name, tagLine: toStr(pick(source, 'tagLine')), level: null, puuid: '', summonerId: null };
  }

  const queueId = toInt(pick(source, 'queueId'), -1);
  const mapId = toStr(pick(source, 'mapId'));

  return {
    connected,
    phase,
    rawPhase,
    summoner,
    queueId,
    mapId,
    gameId: toStr(pick(source, 'gameId')),
    isChampSelect: phase === PHASES.CHAMPSELECT,
    isInGame: phase === PHASES.GAME,
    mode: modeForQueue(queueId, mapId),
  };
}

/* --------------------------------------------------------------------------
 * My profile
 * ------------------------------------------------------------------------ */

/**
 * @typedef {object} LiveProfile
 * @property {number|null} level
 * @property {string} tier
 * @property {string} rank
 * @property {string} name
 * @property {string} tagLine
 * @property {Array} mostChampions
 */

/**
 * Normalise the "my profile" payload (summoner level, rank tier, most played
 * champions). Everything is optional — the panel renders only what exists.
 *
 * @param {object} raw
 * @returns {LiveProfile}
 */
export function normalizeProfile(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  const level = toInt(
    pick(source, 'level', 'summonerLevel', 'profileLevel')
      ?? pick(pick(source, 'summoner') || {}, 'level', 'summonerLevel'),
    null,
  );

  const rankBlock = pick(source, 'rank', 'ranks', 'tier') || {};
  const firstRank = Array.isArray(rankBlock) ? rankBlock[0] : rankBlock;

  const tier = toStr(
    pick(source, 'tier', 'tierName')
      ?? pick(firstRank, 'tier', 'name', 'tierName')
      ?? pick(pick(source, 'summoner') || {}, 'tier'),
  );
  const division = toStr(pick(firstRank, 'division', 'rank', 'grade'));
  const rank = [tier, division].filter(Boolean).join(' ');

  const mostChampions = pickArray(source, 'mostChampions', 'most_champions', 'mostPlayedChampions', 'champions', 'topChampions', 'masteries')
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const championId = toInt(pick(entry, 'championId', 'id', 'champion_id'), 0) || 0;
      if (!championId) return null;
      return {
        championId,
        name: toStr(pick(entry, 'name', 'championName')),
        image: toStr(pick(entry, 'image', 'imageUrl', 'championSquareImage', 'squarePortraitPath')),
        tier: toInt(pick(entry, 'tier'), null),
        winRate: toNumber(pick(entry, 'winRate', 'win_rate'), null),
        play: toInt(pick(entry, 'play', 'games', 'count'), null),
      };
    })
    .filter(Boolean);

  return {
    level,
    tier,
    rank,
    name: toStr(pick(source, 'displayName', 'name', 'summonerName', 'gameName')),
    tagLine: toStr(pick(source, 'tagLine', 'tag')),
    mostChampions,
  };
}

/* --------------------------------------------------------------------------
 * Tier lists
 * ------------------------------------------------------------------------ */

/**
 * @typedef {object} TierEntry
 * @property {number} championId
 * @property {string} name
 * @property {number|null} tier   1 (OP) … 5, 0 = OP
 * @property {string} tierLabel  "OP" | "Tier 1" … "Tier 5"
 * @property {number|null} winRate 0..1
 * @property {number|null} avgPlace
 * @property {number|null} firstPlaceRate 0..1
 * @property {number|null} pickRate 0..1
 * @property {string} image
 */

/**
 * Normalise one champion entry of an OP.GG tier list.
 *
 * Two shapes must collapse into one row:
 *
 *   ranked / ARAM — `average_stats.win_rate` is a ratio already, `positions`
 *                   is an array (ARAM: `null`) and `ban_rate` may be `null`;
 *   arena         — there is no `win_rate` and no `positions`; the rates are
 *                   derived from the counts:
 *                     win rate     = win / play
 *                     average place = total_place / play
 *                     1st rate     = first_place / play
 *
 * @param {object} raw
 * @returns {TierEntry|null}
 */
export function normalizeTierEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const championId = toInt(pick(raw, 'id', 'championId', 'champion_id'), 0) || 0;
  if (!championId) return null;

  const stats = pick(raw, 'average_stats', 'averageStats', 'stats') || {};
  const tierData = pick(stats, 'tier_data', 'tierData') || {};

  const play = toInt(pick(stats, 'play'), null);
  const win = toInt(pick(stats, 'win'), null);
  const totalPlace = toInt(pick(stats, 'total_place', 'totalPlace'), null);
  const firstPlace = toInt(pick(stats, 'first_place', 'firstPlace'), null);

  const winRate = toNumber(pick(stats, 'win_rate', 'winRate'), null)
    ?? (play && win !== null ? win / play : null);
  const avgPlace = totalPlace !== null && play ? totalPlace / play : null;
  const firstPlaceRate = firstPlace !== null && play ? firstPlace / play : null;

  const tier = toInt(pick(stats, 'tier') ?? pick(tierData, 'tier') ?? pick(raw, 'tier'), null);
  const rank = toInt(pick(stats, 'rank') ?? pick(tierData, 'rank'), null);
  const rankPrev = toInt(pick(tierData, 'rank_prev', 'rankPrev'), null);

  return {
    championId,
    name: toStr(pick(raw, 'name')),
    tier,
    tierLabel: tierLabel(tier, rank),
    rank,
    rankPrev,
    winRate,
    avgPlace,
    firstPlaceRate,
    pickRate: toNumber(pick(stats, 'pick_rate', 'pickRate') ?? pick(raw, 'pick_rate', 'pickRate'), null),
    banRate: toNumber(pick(stats, 'ban_rate', 'banRate') ?? pick(raw, 'ban_rate', 'banRate'), null),
    play,
    win,
    kda: toNumber(pick(stats, 'kda'), null),
    image: toStr(pick(raw, 'image_url', 'imageUrl', 'squarePortraitPath', 'image')),
    positions: pickArray(raw, 'positions'),
    roles: pickArray(raw, 'roles'),
  };
}

/**
 * The reference's tier labels: `OP`, then `Tier 1` … `Tier 5`.
 * A tier of `0` is OP; a tier of `1` with a top-3 rank is OP as well.
 *
 * @param {number|null} tier
 * @param {number|null} rank
 * @returns {string}
 */
export function tierLabel(tier, rank = null) {
  if (tier === null || tier === undefined) return '';
  if (tier === 0 || (tier === 1 && rank !== null && rank !== undefined && rank <= 3)) return 'OP';
  if (tier >= 1 && tier <= 5) return `Tier ${tier}`;
  return `Tier ${tier}`;
}

/**
 * Normalise a whole OP.GG tier list into a `Map` keyed by champion id.
 * @param {object|Array} raw
 * @returns {Map<number, TierEntry>}
 */
export function normalizeTierList(raw) {
  const list = Array.isArray(raw)
    ? raw
    : pickArray(raw && typeof raw === 'object' ? raw : {}, 'data', 'champions', 'list', 'rows');
  const map = new Map();
  for (const entry of list) {
    const normalised = normalizeTierEntry(entry);
    if (normalised) map.set(normalised.championId, normalised);
  }
  return map;
}

/**
 * The average win rate of a tier list — the baseline the ARAM balance tag is
 * measured against.
 *
 * @param {Map<number, TierEntry>} list
 * @returns {number|null}
 */
export function averageWinRate(list) {
  if (!list || !list.size) return null;
  let sum = 0;
  let count = 0;
  for (const entry of list.values()) {
    if (entry.winRate === null || entry.winRate === undefined) continue;
    sum += entry.winRate;
    count += 1;
  }
  return count ? sum / count : null;
}

/**
 * The ARAM balance tag.
 *
 * The reference ships a hard-coded buff/nerf table; the replica derives the
 * same information from the live ARAM tier list instead — a champion whose
 * ARAM win rate is meaningfully above (or below) the ARAM average is tagged
 * as buffed (or nerfed).
 *
 * @param {TierEntry|null} entry
 * @param {number|null} baseline average ARAM win rate
 * @returns {'buff'|'nerf'|null}
 */
export function aramBalanceTag(entry, baseline) {
  if (!entry || entry.winRate === null || entry.winRate === undefined) return null;
  if (baseline === null || baseline === undefined) return null;
  const delta = entry.winRate - baseline;
  if (delta >= 0.02) return 'buff';
  if (delta <= -0.02) return 'nerf';
  return null;
}

/* --------------------------------------------------------------------------
 * Champion detail (runes + items)
 * ------------------------------------------------------------------------ */

/**
 * @typedef {object} RuneRef
 * @property {number} id
 * @property {string} name
 * @property {string} icon
 */

/**
 * @typedef {object} ItemRef
 * @property {number} id
 * @property {string} name
 * @property {string} icon
 */

/**
 * Normalise the champion-detail payload: keystone rune, starter items, core
 * items. Every list is empty when the endpoint did not provide it.
 *
 * @param {object} raw
 * @returns {{id: number|null, name: string, keystone: RuneRef|null, runes: RuneRef[], starterItems: ItemRef[], coreItems: ItemRef[]}}
 */
export function normalizeChampionDetail(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const inner = pick(source, 'data');
  const data = inner && typeof inner === 'object' && !Array.isArray(inner) ? inner : source;
  const summary = pick(data, 'summary') || {};

  const id = toInt(pick(summary, 'id', 'championId') ?? pick(data, 'championId', 'id'), null);
  const name = toStr(pick(summary, 'name') ?? pick(data, 'name'));

  // --- runes -------------------------------------------------------------
  const runePages = pickArray(data, 'rune_pages', 'runePages');
  const firstBuild = (() => {
    for (const page of runePages) {
      const builds = pickArray(page, 'builds');
      if (builds.length) return builds[0];
    }
    return null;
  })();

  const runes = firstBuild
    ? pickArray(firstBuild, 'runes').map((rune) => ({
      id: toInt(pick(rune, 'id'), 0) || 0,
      name: toStr(pick(rune, 'name')),
      icon: toStr(pick(rune, 'icon_url', 'iconUrl', 'icon')),
    }))
    : [];

  const primaryId = toInt(pick(firstBuild, 'primary_rune', 'primaryRune', 'keystone'), null);
  const keystone = (() => {
    if (primaryId !== null) {
      const found = runes.find((r) => r.id === primaryId);
      if (found) return found;
    }
    return runes.length ? runes[0] : null;
  })();

  // --- items -------------------------------------------------------------
  const itemRefs = (value) => pickArray(value, 'ids', 'items').map((itemId) => {
    const numeric = toInt(typeof itemId === 'object' ? pick(itemId, 'id', 'itemId') : itemId, 0) || 0;
    const meta = typeof itemId === 'object' ? itemId : null;
    return {
      id: numeric,
      name: toStr(meta ? pick(meta, 'name') : ''),
      icon: toStr(meta ? pick(meta, 'image_url', 'imageUrl', 'icon') : ''),
    };
  }).filter((item) => item.id > 0);

  const starterItems = itemRefs(pick(data, 'starter_items', 'starterItems', 'startItems'));
  const coreItems = itemRefs(pick(data, 'core_items', 'coreItems'));

  return { id, name, keystone, runes, starterItems, coreItems };
}

/* --------------------------------------------------------------------------
 * Augments
 * ------------------------------------------------------------------------ */

export const RARITY = {
  PRISMATIC: 'Prismatic',
  GOLD: 'Gold',
  SILVER: 'Silver',
};

const RARITY_ORDER = [RARITY.PRISMATIC, RARITY.GOLD, RARITY.SILVER];

/** The numeric rarity values OP.GG uses in the augment catalogue. */
export const RARITY_VALUE = {
  [RARITY.PRISMATIC]: 8,
  [RARITY.GOLD]: 4,
  [RARITY.SILVER]: 1,
};

/**
 * Resolve an augment rarity to one of the three display rarities.
 *
 * The catalogue's `rarity` is numeric and exact: `8` = Prismatic,
 * `4` = Gold, `1` = Silver. The `augment_group` buckets use their own scale
 * (2 = Prismatic, 1 = Gold, 0 = Silver) and are mapped by the caller.
 *
 * @param {string|number|null} value
 * @returns {string} one of `RARITY`
 */
export function rarityLabel(value) {
  if (value === null || value === undefined) return RARITY.SILVER;
  if (typeof value === 'number') {
    if (value === RARITY_VALUE[RARITY.PRISMATIC] || value >= RARITY_VALUE[RARITY.PRISMATIC]) return RARITY.PRISMATIC;
    if (value === RARITY_VALUE[RARITY.GOLD] || value >= RARITY_VALUE[RARITY.GOLD]) return RARITY.GOLD;
    return RARITY.SILVER;
  }
  const text = String(value).trim().toLowerCase();
  if (!text) return RARITY.SILVER;
  if (text.startsWith('prism') || text === 'legendary' || text === 'prismatic') return RARITY.PRISMATIC;
  if (text.startsWith('gold')) return RARITY.GOLD;
  return RARITY.SILVER;
}

/** The `augment_group` bucket keys used by the reference. */
export const AUGMENT_GROUP_RARITY = { 2: RARITY.PRISMATIC, 1: RARITY.GOLD, 0: RARITY.SILVER };

/**
 * Build an augment catalogue (`Map<id, meta>`) out of an arbitrary payload.
 *
 * The catalogue endpoint (`/api/meta/augments`) returns
 * `{ data: [{ id, name, key, largeIcon, smallIcon, rarity, desc, tooltip }] }`
 * — `rarity` is numeric (8 = Prismatic, 4 = Gold, 1 = Silver).
 *
 * An entry only counts as a catalogue entry when it carries a name **and**
 * either a rarity or an augment icon, so a champion tier list (which also has
 * `id` + `name`) never pollutes the catalogue.
 *
 * @param {object|Array} payload
 * @returns {Map<number, {id:number,name:string,icon:string,smallIcon:string,description:string,rarity:string,rarityValue:number|null}>}
 */
export function collectAugmentCatalogue(payload) {
  const catalogue = new Map();
  const seen = new Set();

  const visit = (node, depth) => {
    if (!node || depth > 5 || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const entry of node) visit(entry, depth + 1);
      return;
    }

    const id = toInt(pick(node, 'id', 'augmentId', 'augment_id'), null);
    const name = toStr(pick(node, 'name', 'title', 'displayName'));
    const rarityRaw = pick(node, 'rarity', 'rarityName');
    const largeIcon = toStr(pick(node, 'largeIcon'));
    const smallIconRaw = toStr(pick(node, 'smallIcon'));
    const iconRaw = toStr(pick(node, 'icon'));
    const hasAugmentIcon = Boolean(
      largeIcon
      || smallIconRaw
      || (iconRaw && /augment/i.test(iconRaw)),
    );
    const descriptionRaw = toStr(pick(node, 'desc', 'description', 'tooltip', 'shortDesc'));

    if (id !== null && name && (rarityRaw !== undefined || hasAugmentIcon || descriptionRaw)) {
      const existing = catalogue.get(id);
      const icon = largeIcon || (iconRaw && /augment/i.test(iconRaw) ? iconRaw : '') || (existing ? existing.icon : '');
      const smallIcon = smallIconRaw || icon || (existing ? existing.smallIcon : '');
      catalogue.set(id, {
        id,
        name,
        icon,
        smallIcon,
        description: descriptionRaw || (existing ? existing.description : ''),
        rarity: rarityLabel(rarityRaw !== undefined ? rarityRaw : (existing ? existing.rarity : null)),
        rarityValue: rarityRaw !== undefined && rarityRaw !== null && !Number.isNaN(Number(rarityRaw))
          ? Number(rarityRaw)
          : (existing ? existing.rarityValue : null),
      });
    }

    for (const [key, value] of Object.entries(node)) {
      if (/augment/i.test(key)) visit(value, depth + 1);
    }
  };

  if (Array.isArray(payload)) {
    visit(payload, 0);
  } else if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (/augment/i.test(key)) visit(value, 0);
    }
    // The catalogue endpoint wraps its list in `data`.
    const data = pick(payload, 'data');
    if (Array.isArray(data)) visit(data, 0);
    const direct = pick(payload, 'augments', 'augment_list', 'augmentList');
    if (Array.isArray(direct)) visit(direct, 0);
  }

  return catalogue;
}

/**
 * The augment catalogue shipped with the app (`src/assets/meta_augments.json`
 * is a verbatim capture of `/api/meta/augments`).
 *
 * It is used only as a fallback, and only when the live catalogue could not
 * be reached — live data always wins.
 *
 * @returns {Promise<Map<number, object>>}
 */
export async function loadLocalAugmentCatalogue() {
  const catalogue = new Map();
  try {
    const module = await import('../../assets/meta_augments.json', { with: { type: 'json' } });
    const payload = module.default || module;
    for (const [id, meta] of collectAugmentCatalogue(payload)) catalogue.set(id, meta);
  } catch {
    // The offline cache is optional.
  }
  return catalogue;
}

/**
 * @typedef {object} LiveAugment
 * @property {number} id
 * @property {string} name
 * @property {string} rarity        Prismatic | Gold | Silver
 * @property {number|null} rarityValue the raw numeric rarity
 * @property {string} icon          large icon (card face)
 * @property {string} smallIcon     small icon (compact chip)
 * @property {string} description
 * @property {string} rank    the per-champion ranking, when available
 * @property {number|null} winRate
 * @property {number|null} pickRate
 * @property {number|null} play
 */

/**
 * Normalise an augment list.
 *
 * Entries may be
 *   - `{ id, name, rarity, largeIcon, smallIcon, desc }` (a catalogue entry),
 *   - `{ id, tier, win, play, pick_rate, win_rate }` (a per-champion stat
 *     row), or
 *   - a bare id, in which case the name/icon are resolved from `catalogue`.
 *
 * The per-champion ranking is published by the arena champion-detail
 * endpoint under `build.augment_group`; the buckets `2` / `1` / `0` map to
 * Prismatic / Gold / Silver.
 *
 * @param {object|Array} raw  the `augments` array, the `augment_group` map,
 *                             the `build` object or any payload containing
 *                             either
 * @param {Map<number, object>} [catalogue]
 * @returns {LiveAugment[]}
 */
export function normalizeAugments(raw, catalogue = new Map()) {
  const out = [];
  const push = (entry, forcedRarity) => {
    if (entry === null || entry === undefined) return;

    if (typeof entry === 'number' || typeof entry === 'string') {
      const id = toInt(entry, null);
      if (id === null) return;
      const meta = catalogue.get(id);
      out.push({
        id,
        name: meta ? meta.name : '',
        rarity: meta ? meta.rarity : (forcedRarity || RARITY.SILVER),
        rarityValue: meta ? meta.rarityValue : null,
        icon: meta ? meta.icon : '',
        smallIcon: meta ? meta.smallIcon : '',
        description: meta ? meta.description : '',
        rank: '',
        winRate: null,
        pickRate: null,
        play: null,
      });
      return;
    }

    if (typeof entry !== 'object') return;

    const id = toInt(pick(entry, 'id', 'augmentId', 'augment_id'), null);
    if (id === null) return;
    const meta = catalogue.get(id);

    const rarityRaw = pick(entry, 'rarity', 'rarityName');
    const rarity = rarityRaw !== undefined
      ? rarityLabel(rarityRaw)
      : (meta ? meta.rarity : (forcedRarity || RARITY.SILVER));

    const play = toInt(pick(entry, 'play', 'games'), null);
    const win = toInt(pick(entry, 'win', 'wins'), null);
    const winRate = toNumber(pick(entry, 'win_rate', 'winRate'), null)
      ?? (play && win !== null ? win / play : null);
    const pickRate = toNumber(pick(entry, 'pick_rate', 'pickRate'), null);

    const icon = toStr(pick(entry, 'largeIcon', 'icon', 'iconUrl', 'image', 'image_url'))
      || (meta ? meta.icon : '');
    const smallIcon = toStr(pick(entry, 'smallIcon')) || (meta ? meta.smallIcon : '') || icon;

    out.push({
      id,
      name: toStr(pick(entry, 'name', 'title')) || (meta ? meta.name : ''),
      rarity,
      rarityValue: rarityRaw !== undefined && rarityRaw !== null && !Number.isNaN(Number(rarityRaw))
        ? Number(rarityRaw)
        : (meta ? meta.rarityValue : null),
      icon,
      smallIcon,
      description: toStr(pick(entry, 'desc', 'description', 'tooltip', 'shortDesc'))
        || (meta ? meta.description : ''),
      rank: toStr(pick(entry, 'rank', 'tier', 'grade', 'gradeName')),
      winRate,
      pickRate,
      play,
    });
  };

  if (!raw) return out;

  if (Array.isArray(raw)) {
    for (const entry of raw) push(entry, null);
    return out;
  }

  // `augment_group` — `{ '2': [...], '1': [...], '0': [...] }`
  const groups = [pick(raw, 'augment_group', 'augmentGroup'), pick(pick(raw, 'build') || {}, 'augment_group', 'augmentGroup')];
  for (const group of groups) {
    if (!group || typeof group !== 'object') continue;
    for (const [key, value] of Object.entries(group)) {
      const rarity = AUGMENT_GROUP_RARITY[Number(key)] || RARITY.SILVER;
      for (const entry of (Array.isArray(value) ? value : [])) push(entry, rarity);
    }
  }

  const lists = [
    pickArray(raw, 'augments', 'augment_list', 'augmentList'),
    pickArray(pick(raw, 'build') || {}, 'augments', 'augment_list', 'augmentList'),
  ];
  for (const list of lists) {
    for (const entry of list) push(entry, null);
  }

  return out;
}

/** Sort augments by rarity (prismatic first), then by play count. */
export function sortAugments(augments) {
  return [...augments].sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity);
    const rb = RARITY_ORDER.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return (b.play || 0) - (a.play || 0);
  });
}

/* --------------------------------------------------------------------------
 * Static-data lookups
 * ------------------------------------------------------------------------ */

/**
 * Build a champion id → entry index out of the app's static data.
 * @param {object} staticData
 * @returns {Map<number, {name: string, image: string, key: string}>}
 */
export function buildChampionIndex(staticData) {
  const index = new Map();
  const list = pickArray(staticData, 'champions', 'championNames', 'data');
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const id = toInt(pick(entry, 'id', 'championId'), 0) || 0;
    if (!id) continue;
    index.set(id, {
      name: toStr(pick(entry, 'name')),
      image: toStr(pick(entry, 'image_url', 'imageUrl', 'squarePortraitPath', 'image')),
      key: toStr(pick(entry, 'key')),
    });
  }
  return index;
}

/**
 * Build an item id → entry index out of the app's static data.
 * @param {object} staticData
 * @returns {Map<number, {name: string, image: string}>}
 */
export function buildItemIndex(staticData) {
  const index = new Map();
  const list = pickArray(staticData, 'items', 'itemList', 'data');
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const id = toInt(pick(entry, 'id', 'itemId'), 0) || 0;
    if (!id) continue;
    index.set(id, {
      name: toStr(pick(entry, 'name')),
      image: toStr(pick(entry, 'image_url', 'imageUrl', 'icon', 'image')),
    });
  }
  return index;
}
