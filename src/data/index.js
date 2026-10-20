/**
 * Public surface of the data layer.
 *
 * Page modules import from here:
 *
 * ```js
 * import { normalizeChampionRow, LANES, championSquare } from '../../data/index.js';
 * ```
 *
 * Everything re-exported here is pure and side-effect free.
 */

/* ---- regions ---------------------------------------------------------- */
export {
  REGIONS,
  DEFAULT_REGION,
  regionLabel,
  regionByCode,
  regionI18nKey,
  regionCode,
} from './regions.js';

/* ---- tiers ------------------------------------------------------------ */
export {
  TIER_FILTERS,
  TIER_COLORS,
  DEFAULT_TIER,
  tierColorToken,
  tierFilterByValue,
  tierFilterLabel,
} from './tiers.js';

/* ---- queues ----------------------------------------------------------- */
export {
  QUEUES,
  DEFAULT_QUEUE,
  LANE_KEYS,
  queueByValue,
  queueApiMode,
  queuePositions,
} from './queues.js';

/* ---- roles / lanes ---------------------------------------------------- */
export {
  LANES,
  DEFAULT_LANE,
  ROLE_TO_LANE,
  laneForTags,
  laneByKey,
  laneLabel,
} from './roles.js';

/* ---- images ----------------------------------------------------------- */
export {
  DD_VERSION_FALLBACK,
  OPGG_STATIC_BASE,
  OPGG_META_BASE,
  DDRAGON_BASE,
  IMAGE_PROXY_TRANSFORM,
  SUMMONER_SPELLS,
  resolveChampion,
  championSquareName,
  championSquare,
  championPortrait,
  championSquareReference,
  championLoading,
  championSplash,
  championPassive,
  championSpell,
  itemIcon,
  runeIcon,
  runeStyleIcon,
  runeShardIcon,
  spellIcon,
  profileIcon,
  summonerSpellById,
  summonerSpellName,
  ddragonItemIcon,
  ddragonSpellIcon,
  ddragonRuneIcon,
  ddragonChampionIcon,
} from './images.js';

/* ---- registries ------------------------------------------------------- */
export {
  CHAMPIONS,
  championById,
  championByName,
  championName,
  championKeyById,
  championIdByName,
} from './champions.js';

export {
  RUNE_PAGES,
  RUNES,
  runeById,
  runeName,
  runePageById,
  runesForPage,
} from './runes.js';

/* ---- normalisers ------------------------------------------------------ */
export {
  normalizeRates,
  normalizeTier,
  tierFromRank,
  normalizeCounters,
  normalizeChampionRow,
  normalizeChampionList,
  normalizeBuildEntry,
  normalizeChampionDetail,
  normalizeSummoner,
  normalizeMatchList,
  normalizeLeaderboard,
  normalizeAugment,
} from './normalize.js';

/* ---- cache ------------------------------------------------------------ */
export { createCache, championCache } from './cache.js';
