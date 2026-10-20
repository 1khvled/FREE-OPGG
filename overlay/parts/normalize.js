/**
 * Payload normalisation.
 *
 * The overlay consumes three very different shapes — Riot LCU snapshots, the
 * reference's OP.GG champion payloads and the compact game-state summaries the
 * main process pushes — and every one of them has changed shape over the
 * reference's lifetime. Everything is normalised here so the renderers only
 * ever see one model.
 *
 * Normalisers never invent data: a field that is absent stays absent and the
 * corresponding HUD section simply hides.
 */

/* -------------------------------------------------------------------------- */
/* primitives                                                                  */
/* -------------------------------------------------------------------------- */

/** First finite number among the candidates. */
export function num(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** First non-empty string among the candidates. */
export function str(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** Unwrap a `{ data }` envelope if the main process wrapped the payload. */
export function unwrap(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload;
}

/** First defined property among the candidate keys of an object. */
export function field(source, ...keys) {
  if (!source || typeof source !== 'object') return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* tiers                                                                       */
/* -------------------------------------------------------------------------- */

/** Token class per tier grade. */
const TIER_CLASS = {
  op: 'tier-op',
  s: 'tier-1',
  a: 'tier-2',
  b: 'tier-3',
  c: 'tier-4',
  d: 'tier-5',
  1: 'tier-1',
  2: 'tier-2',
  3: 'tier-3',
  4: 'tier-4',
  5: 'tier-5',
};

/**
 * Normalise a tier badge.
 *
 * Accepts the reference's `{ grade, rank }` objects, plain grades
 * (`"OP"`, `"1"`, `"S+"`) and plain ranks (`1`..`5`).
 */
export function normalizeTier(raw) {
  if (raw === null || raw === undefined) return null;

  let grade = null;
  let rank = null;

  if (typeof raw === 'object') {
    grade = str(
      field(raw, 'grade', 'tier', 'label', 'name', 'tier_name'),
    );
    rank = num(field(raw, 'rank', 'tierRank', 'tier_rank', 'position'));
  } else {
    grade = str(raw);
  }

  if (!grade) {
    if (rank === null) return null;
    grade = String(rank);
  }

  const key = String(grade).trim().toLowerCase();
  let className;
  if (key === 'op' || key === 's+' || key === 'splus') className = TIER_CLASS.op;
  else if (key === 's') className = TIER_CLASS.s;
  else if (key === 'a') className = TIER_CLASS.a;
  else if (key === 'b') className = TIER_CLASS.b;
  else if (key === 'c') className = TIER_CLASS.c;
  else if (key === 'd') className = TIER_CLASS.d;
  else if (/^[1-5]$/.test(key)) className = TIER_CLASS[key];
  else className = TIER_CLASS.d;

  return {
    grade: String(grade).trim(),
    rank,
    className,
    /** `OP` / `S+` / `1` — the short label shown in the badge. */
    label: String(grade).trim().toUpperCase(),
  };
}

/* -------------------------------------------------------------------------- */
/* modes                                                                       */
/* -------------------------------------------------------------------------- */

const QUEUE_MODES = {
  420: 'aram',
  450: 'mayhem',
  700: 'arena',
  720: 'arena',
  440: 'ranked',
  430: 'ranked',
  490: 'swiftplay',
  4200: 'classic',
};

/** Normalise a mode name from any casing. */
export function normalizeModeName(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace(/[\s_-]/g, '').toLowerCase();
  if (!raw) return null;
  if (raw.includes('mayhem')) return 'mayhem';
  if (raw.includes('arena')) return 'arena';
  if (raw.includes('aram')) return 'aram';
  if (raw.includes('urf')) return 'urf';
  if (raw.includes('swift')) return 'swiftplay';
  if (raw.includes('nexusblitz') || raw.includes('nexus')) return 'nexus-blitz';
  if (raw.includes('brawl')) return 'brawl';
  if (raw.includes('ranked')) return 'ranked';
  if (raw.includes('classic')) return 'classic';
  if (raw.includes('normal') || raw.includes('summoner')) return 'classic';
  return 'other';
}

/** Detect the game mode from a payload of any shape. */
export function detectMode(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const explicit = str(
    field(payload, 'mode', 'gameMode', 'game_mode', 'queueType'),
  );
  const explicitMode = normalizeModeName(explicit);
  if (explicitMode) return explicitMode;

  const queueId = num(
    field(payload, 'queueId', 'queue_id'),
    field(payload.gameflow, 'queueId'),
    field(payload.session, 'queueId'),
  );
  if (queueId !== null && QUEUE_MODES[queueId]) return QUEUE_MODES[queueId];

  const gameType = str(field(payload, 'gameType', 'game_type'), field(payload.session, 'gameType'));
  const gameMode = normalizeModeName(gameType);
  if (gameMode) return gameMode;

  return null;
}

/* -------------------------------------------------------------------------- */
/* champion detail                                                             */
/* -------------------------------------------------------------------------- */

/** Normalise the reference's `rune_build`. */
export function normalizeRunes(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const build = raw.rune_build || raw.runeBuild || raw;

  const primaryIds = toIdArray(field(build, 'primary_rune_ids', 'primaryRuneIds'));
  const secondaryIds = toIdArray(field(build, 'secondary_rune_ids', 'secondaryRuneIds'));
  const shardIds = toIdArray(field(build, 'shard_ids', 'shardIds', 'perk_ids_shards'));
  const primaryTree = num(field(build, 'primary_page_id', 'primaryPageId'));
  const secondaryTree = num(field(build, 'secondary_page_id', 'secondaryPageId'));

  if (!primaryIds.length && !secondaryIds.length && !shardIds.length) return null;

  return {
    /** The keystone plus the two minor rows of the primary tree. */
    primary: primaryIds.map((id) => ({ id })),
    /** The two minor rows of the secondary tree. */
    secondary: secondaryIds.map((id) => ({ id })),
    shards: shardIds.map((id) => ({ id })),
    primaryTree,
    secondaryTree,
  };
}

function toIdArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const entry of value) {
    const id = num(typeof entry === 'object' ? field(entry, 'id', 'perkId') : entry);
    if (id !== null) out.push(id);
  }
  return out;
}

/** Normalise the reference's item build arrays (`{ ids: [...] }` entries). */
export function normalizeBuild(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const groups = (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        const ids = Array.isArray(entry) ? entry : toIdArray(field(entry, 'ids', 'items'));
        return ids.filter((id) => id >= 0);
      })
      .filter((ids) => ids.length > 0);
  };

  const starter = groups(field(raw, 'startItems', 'start_items', 'starterItems', 'starter_items'));
  const core = groups(field(raw, 'coreItems', 'core_items', 'core'));
  const boots = groups(field(raw, 'boots'));
  const situational = groups(field(raw, 'lastItems', 'last_items', 'situational', 'situationalItems'));

  if (!starter.length && !core.length && !boots.length && !situational.length) return null;
  return { starter, core, boots, situational };
}

/** Normalise the reference's skill list (`skills[0].order`). */
export function normalizeSkills(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const skills = raw.skills;
  const order = Array.isArray(skills) && skills.length ? field(skills[0], 'order') : null;
  const sequence = Array.isArray(order) ? order.map((entry) => String(entry).toUpperCase()) : [];

  /* The reference's order starts with the passive (`P`); the HUD shows the
     Q/W/E/R priority plus the full point sequence. */
  const priority = [];
  for (const key of sequence) {
    if (!['Q', 'W', 'E', 'R'].includes(key)) continue;
    if (!priority.includes(key)) priority.push(key);
  }

  if (!priority.length) return null;
  return {
    /** The 4-point priority order, e.g. `['Q', 'E', 'W', 'R']`. */
    order: priority,
    /** The full 18-point sequence. */
    sequence,
  };
}

/** Normalise an augment list. */
export function normalizeAugments(raw) {
  const list = Array.isArray(raw) ? raw : field(raw, 'augments', 'augmentStats', 'data');
  if (!Array.isArray(list)) return [];

  const out = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const id = num(field(entry, 'id', 'augmentId', 'augment_id'));
    const name = str(field(entry, 'name', 'title'));
    if (id === null && !name) continue;

    const tier = normalizeTier(
      field(entry, 'tier', 'tierName', 'tier_name', 'grade') ??
        field(entry.average_stats, 'tier'),
    );
    const rarityRaw = field(entry, 'rarity');
    const rarity = normalizeRarity(rarityRaw);

    out.push({
      id,
      name,
      description: str(field(entry, 'description', 'desc', 'longDesc', 'long_desc')),
      icon: str(field(entry, 'image_url', 'imageUrl', 'icon')),
      rarity,
      rarityLabel: rarityLabel(rarity),
      tier,
      winRate: num(field(entry, 'win_rate', 'winRate')),
      pickRate: num(field(entry, 'pick_rate', 'pickRate')),
    });
  }
  return out;
}

/** Rarity buckets used by the reference's augment metadata. */
function normalizeRarity(raw) {
  if (raw === null || raw === undefined) return 'normal';
  if (typeof raw === 'number') {
    if (raw >= 3) return 'prismatic';
    if (raw === 2) return 'gold';
    if (raw === 1) return 'silver';
    return 'normal';
  }
  const key = String(raw).trim().toLowerCase();
  if (key === 'prismatic' || key === 'prism') return 'prismatic';
  if (key === 'gold') return 'gold';
  if (key === 'silver') return 'silver';
  if (key === 'prismatic_tier' || key === 'prismatictier') return 'prismatic';
  return 'normal';
}

function rarityLabel(rarity) {
  switch (rarity) {
    case 'prismatic':
      return 'Prismatic';
    case 'gold':
      return 'Gold';
    case 'silver':
      return 'Silver';
    default:
      return 'Normal';
  }
}

/**
 * Normalise the reference's champion payload.
 *
 * Covers the live-companion shape (`summary`, `rune_build`, `startItems`,
 * `coreItems`, `skills`, `average_stats`) and the flat shape.
 */
export function normalizeChampionDetail(raw, fallbackId) {
  const source = unwrap(raw);
  if (!source || typeof source !== 'object') return null;

  const summary = field(source, 'summary', 'champion', 'championInfo') || {};
  const id = num(field(source, 'id', 'championId', 'champion_id'), field(summary, 'id'), fallbackId);
  const name = str(field(source, 'name'), field(summary, 'name'));

  const stats = field(source, 'average_stats', 'averageStats', 'stats') || {};
  const tier = normalizeTier(
    field(source, 'tier', 'tier_info', 'tierInfo') ??
      field(stats, 'tier') ??
      field(source, 'championTier'),
  );

  const runes = normalizeRunes(source);
  const build = normalizeBuild(source);
  const skills = normalizeSkills(source);
  const augments = normalizeAugments(field(source, 'augments', 'augmentStats'));

  if (id === null && !name && !runes && !build && !skills) return null;

  return {
    id,
    name,
    key: str(field(source, 'key'), field(summary, 'key')),
    tier,
    winRate: num(field(source, 'win_rate', 'winRate'), field(stats, 'win_rate', 'winRate')),
    pickRate: num(field(source, 'pick_rate', 'pickRate'), field(stats, 'pick_rate', 'pickRate')),
    runes,
    build,
    skills,
    augments,
  };
}

/* -------------------------------------------------------------------------- */
/* champion select                                                             */
/* -------------------------------------------------------------------------- */

/** Normalise a champion-select snapshot. */
export function normalizeChampSelect(raw) {
  const source = unwrap(raw);
  if (!source || typeof source !== 'object') return null;

  const session = field(source, 'session', 'champSelect', 'champSelectSession') || source;
  const myTeam = Array.isArray(field(session, 'myTeam')) ? field(session, 'myTeam') : [];
  const theirTeam = Array.isArray(field(session, 'theirTeam')) ? field(session, 'theirTeam') : [];

  const me = myTeam.find((member) => member && (member.championId || member.championPickIntent));
  const championId = num(
    field(source, 'myChampionId', 'my_champion_id'),
    me && field(me, 'championId', 'championPickIntent'),
  );

  const benchSource = field(source, 'benchChampions', 'bench_champions', 'bench');
  const bench = Array.isArray(benchSource)
    ? benchSource
        .map((entry) => {
          if (typeof entry === 'number') return { championId: entry, available: true };
          return {
            championId: num(field(entry, 'championId', 'champion_id', 'id')),
            available: field(entry, 'available') !== false,
          };
        })
        .filter((entry) => entry.championId !== null)
    : [];

  const spells = [];
  if (me && Array.isArray(field(me, 'spells'))) {
    for (const spell of field(me, 'spells')) {
      const id = num(field(spell, 'summonerId', 'summoner_id', 'id'));
      if (id !== null) spells.push(id);
    }
  }

  return {
    phase: str(field(source, 'phase'), field(session, 'phase'), field(source, 'timer', 'phase')),
    mode: detectMode(source),
    championId,
    bench,
    spells,
    myTeam: myTeam.map((member) => ({
      championId: num(field(member, 'championId', 'championPickIntent')),
      position: str(field(member, 'assignedPosition', 'position')),
      completed: field(member, 'completed') === true,
    })),
    theirTeam: theirTeam.map((member) => ({
      championId: num(field(member, 'championId', 'championPickIntent')),
      position: str(field(member, 'assignedPosition', 'position')),
      completed: field(member, 'completed') === true,
    })),
    timer: num(field(source, 'timer'), field(session, 'timer')),
  };
}

/* -------------------------------------------------------------------------- */
/* game state                                                                  */
/* -------------------------------------------------------------------------- */

/** Normalise an in-game / gameflow snapshot. */
export function normalizeGameState(raw) {
  const source = unwrap(raw);
  if (!source || typeof source !== 'object') return null;

  const gameData = field(source, 'gameData', 'game_data') || {};
  const phase = str(
    field(source, 'phase'),
    field(source.gameflow, 'phase'),
    field(source, 'gameflowPhase'),
  );

  const myTeam = Array.isArray(field(gameData, 'myTeam')) ? field(gameData, 'myTeam') : [];
  const theirTeam = Array.isArray(field(gameData, 'theirTeam')) ? field(gameData, 'theirTeam') : [];

  const me = myTeam.find((member) => member && field(member, 'championId'));
  const championId = num(
    field(source, 'myChampionId', 'champion_id', 'championId'),
    me && field(me, 'championId'),
  );

  const gameTime = num(
    field(source, 'gameTime', 'game_time', 'timer'),
    field(gameData, 'gameTime'),
    field(source.gameflow, 'gameTime'),
  );

  const level = num(
    field(source, 'level', 'championLevel'),
    me && field(me, 'level'),
  );

  const spells = normalizeSpellList(
    field(source, 'spells', 'mySpells', 'playerSpells', 'allySpells'),
  );
  const enemySpells = normalizeSpellList(
    field(source, 'enemySpells', 'theirSpells', 'opponentSpells'),
  );

  const objectives = normalizeObjectives(field(source, 'objectives', 'objectiveTimers'));
  const camps = normalizeCamps(field(source, 'jungleCamps', 'camps', 'jungleTimers'));

  const enemyTeam = theirTeam.map((member, index) => ({
    championId: num(field(member, 'championId')),
    championName: str(field(member, 'championName', 'name')),
    summonerName: str(field(member, 'summonerName')),
    position: str(field(member, 'position', 'assignedPosition')),
    index,
  }));

  return {
    phase,
    mode: detectMode(source),
    championId,
    level,
    gameTime,
    spells,
    enemySpells,
    objectives,
    camps,
    enemyTeam,
  };
}

/** Normalise a list of tracked spells. */
function normalizeSpellList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const id = num(field(entry, 'id', 'summonerId', 'spellId'));
    const name = str(field(entry, 'name', 'spellName'));
    if (id === null && !name) continue;
    out.push({
      id,
      name,
      champion: str(field(entry, 'champion', 'championName')),
      remaining: num(field(entry, 'cooldownRemaining', 'remaining', 'cooldown')),
      total: num(field(entry, 'cooldownTotal', 'total', 'duration')),
      icon: str(field(entry, 'icon', 'image_url')),
    });
  }
  return out;
}

/** Normalise objective timers. */
function normalizeObjectives(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw) ? raw : Object.entries(raw).map(([key, value]) => ({ key, ...value }));
  const out = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const key = str(field(entry, 'key', 'id', 'type'));
    if (!key) continue;
    out.push({
      key,
      label: str(field(entry, 'label', 'name')),
      spawnAt: num(field(entry, 'spawnAt', 'spawn_at', 'nextSpawn', 'respawnAt')),
      alive: field(entry, 'alive') === true,
      aliveKnown: field(entry, 'alive') !== undefined,
      type: str(field(entry, 'monster', 'variant')),
    });
  }
  return out;
}

/** Normalise jungle camp timers. */
function normalizeCamps(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const key = str(field(entry, 'key', 'id', 'name'));
    if (!key) continue;
    out.push({
      key,
      label: str(field(entry, 'label', 'name')),
      spawnAt: num(field(entry, 'spawnAt', 'spawn_at', 'respawnAt', 'nextSpawn')),
      alive: field(entry, 'alive') === true,
      aliveKnown: field(entry, 'alive') !== undefined,
      icon: str(field(entry, 'icon', 'image_url')),
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* bench                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Normalise the ARAM bench and attach the tier data from the mode tier list.
 *
 * @param {Array} bench   bench entries (`championId`, `available`)
 * @param {Map}   tierMap champion id -> `{ tier, winRate }`
 */
export function normalizeBench(bench, tierMap) {
  if (!Array.isArray(bench)) return [];
  return bench
    .map((entry) => {
      const championId = num(field(entry, 'championId', 'champion_id', 'id'));
      if (championId === null) return null;
      const stats = tierMap ? tierMap.get(championId) : null;
      return {
        championId,
        available: field(entry, 'available') !== false,
        tier: stats ? normalizeTier(stats.tier) : null,
        winRate: stats ? num(field(stats, 'winRate', 'win_rate', 'average_win_rate')) : null,
      };
    })
    .filter(Boolean);
}

/** Build the champion id -> tier map from a mode tier list payload. */
export function buildTierMap(raw) {
  const list = Array.isArray(raw) ? raw : field(unwrap(raw), 'data', 'champions', 'list');
  const map = new Map();
  if (!Array.isArray(list)) return map;
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const id = num(field(entry, 'championId', 'champion_id', 'id'));
    if (id === null) continue;
    const stats = field(entry, 'average_stats', 'averageStats');
    map.set(id, {
      tier: field(entry, 'tier') ?? (stats ? field(stats, 'tier') : null),
      winRate: num(field(entry, 'win_rate', 'winRate'), stats ? field(stats, 'win_rate', 'winRate') : null),
      name: str(field(entry, 'name')),
    });
  }
  return map;
}
