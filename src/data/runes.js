/**
 * Rune (perk) registry.
 *
 * Source of truth: OP.GG's public rune metadata endpoints
 *   GET https://lol-api-champion.op.gg/api/meta/rune-pages   (the five trees)
 *   GET https://lol-api-champion.op.gg/api/meta/runes        (every perk)
 *
 * The champion build endpoint only returns perk *ids*
 * (`primary_rune_ids`, `secondary_rune_ids`, `stat_mod_ids`), so the names
 * and the tree each perk belongs to are resolved from here.
 *
 * Pure data — no imports, no side effects.
 */

/** Rune trees (styles). id → { name, description }. */
export const RUNE_PAGES = {
  8000: { name: "Precision", description: "Improved attacks and sustained damage" },
  8100: { name: "Domination", description: "Burst damage and target access" },
  8200: { name: "Sorcery", description: "Empowered abilities and resource manipulation" },
  8300: { name: "Inspiration", description: "Creative tools and rule bending" },
  8400: { name: "Resolve", description: "Durability and crowd control" },
};

/** Every perk. id → { pageId, name, key, slot, row }. */
export const RUNES = {
  8005: { pageId: 8000, name: "Press the Attack", key: "PressTheAttack", slot: 0, row: 0 },
  8008: { pageId: 8000, name: "Lethal Tempo", key: "LethalTempo", slot: 0, row: 1 },
  8009: { pageId: 8000, name: "Presence of Mind", key: "PresenceOfMind", slot: 1, row: 2 },
  8010: { pageId: 8000, name: "Conqueror", key: "Conqueror", slot: 0, row: 3 },
  8014: { pageId: 8000, name: "Coup de Grace", key: "CoupDeGrace", slot: 3, row: 0 },
  8017: { pageId: 8000, name: "Cut Down", key: "CutDown", slot: 3, row: 1 },
  8021: { pageId: 8000, name: "Fleet Footwork", key: "FleetFootwork", slot: 0, row: 2 },
  8105: { pageId: 8100, name: "Relentless Hunter", key: "RelentlessHunter", slot: 3, row: 1 },
  8106: { pageId: 8100, name: "Ultimate Hunter", key: "UltimateHunter", slot: 3, row: 2 },
  8112: { pageId: 8100, name: "Electrocute", key: "Electrocute", slot: 0, row: 0 },
  8126: { pageId: 8100, name: "Cheap Shot", key: "CheapShot", slot: 1, row: 0 },
  8128: { pageId: 8100, name: "Dark Harvest", key: "DarkHarvest", slot: 0, row: 1 },
  8135: { pageId: 8100, name: "Treasure Hunter", key: "TreasureHunter", slot: 3, row: 0 },
  8137: { pageId: 8100, name: "Sixth Sense", key: "SixthSense", slot: 2, row: 0 },
  8139: { pageId: 8100, name: "Taste of Blood", key: "TasteOfBlood", slot: 1, row: 1 },
  8140: { pageId: 8100, name: "Grisly Mementos", key: "GrislyMementos", slot: 2, row: 1 },
  8141: { pageId: 8100, name: "Deep Ward", key: "DeepWard", slot: 2, row: 2 },
  8143: { pageId: 8100, name: "Sudden Impact", key: "SuddenImpact", slot: 1, row: 2 },
  8210: { pageId: 8200, name: "Transcendence", key: "Transcendence", slot: 2, row: 0 },
  8214: { pageId: 8200, name: "Summon Aery", key: "SummonAery", slot: 0, row: 0 },
  8224: { pageId: 8200, name: "Axiom Arcanist", key: "NullifyingOrb", slot: 1, row: 0 },
  8226: { pageId: 8200, name: "Manaflow Band", key: "ManaflowBand", slot: 1, row: 1 },
  8229: { pageId: 8200, name: "Arcane Comet", key: "ArcaneComet", slot: 0, row: 1 },
  8230: { pageId: 8200, name: "Stormraider's Surge", key: "PhaseRush", slot: 0, row: 2 },
  8232: { pageId: 8200, name: "Waterwalking", key: "Waterwalking", slot: 3, row: 1 },
  8233: { pageId: 8200, name: "Absolute Focus", key: "AbsoluteFocus", slot: 2, row: 2 },
  8234: { pageId: 8200, name: "Celerity", key: "Celerity", slot: 2, row: 1 },
  8236: { pageId: 8200, name: "Gathering Storm", key: "GatheringStorm", slot: 3, row: 2 },
  8237: { pageId: 8200, name: "Scorch", key: "Scorch", slot: 3, row: 0 },
  8242: { pageId: 8400, name: "Unflinching", key: "Unflinching", slot: 3, row: 2 },
  8275: { pageId: 8200, name: "Nimbus Cloak", key: "NimbusCloak", slot: 1, row: 2 },
  8299: { pageId: 8000, name: "Last Stand", key: "LastStand", slot: 3, row: 2 },
  8304: { pageId: 8300, name: "Magical Footwear", key: "MagicalFootwear", slot: 1, row: 1 },
  8306: { pageId: 8300, name: "Hextech Flashtraption", key: "HextechFlashtraption", slot: 1, row: 0 },
  8313: { pageId: 8300, name: "Triple Tonic", key: "PerfectTiming", slot: 2, row: 0 },
  8316: { pageId: 8300, name: "Jack Of All Trades", key: "JackOfAllTrades", slot: 3, row: 2 },
  8321: { pageId: 8300, name: "Cash Back", key: "CashBack", slot: 1, row: 2 },
  8345: { pageId: 8300, name: "Biscuit Delivery", key: "BiscuitDelivery", slot: 2, row: 2 },
  8347: { pageId: 8300, name: "Cosmic Insight", key: "CosmicInsight", slot: 3, row: 0 },
  8351: { pageId: 8300, name: "Glacial Augment", key: "GlacialAugment", slot: 0, row: 0 },
  8352: { pageId: 8300, name: "Time Warp Tonic", key: "TimeWarpTonic", slot: 2, row: 1 },
  8360: { pageId: 8300, name: "Unsealed Spellbook", key: "UnsealedSpellbook", slot: 0, row: 1 },
  8369: { pageId: 8300, name: "First Strike", key: "FirstStrike", slot: 0, row: 2 },
  8401: { pageId: 8400, name: "Shield Bash", key: "ShieldBash", slot: 1, row: 2 },
  8410: { pageId: 8300, name: "Approach Velocity", key: "ApproachVelocity", slot: 3, row: 1 },
  8429: { pageId: 8400, name: "Conditioning", key: "Conditioning", slot: 2, row: 0 },
  8437: { pageId: 8400, name: "Grasp of the Undying", key: "GraspOfTheUndying", slot: 0, row: 0 },
  8439: { pageId: 8400, name: "Aftershock", key: "Aftershock", slot: 0, row: 1 },
  8444: { pageId: 8400, name: "Second Wind", key: "SecondWind", slot: 2, row: 1 },
  8446: { pageId: 8400, name: "Demolish", key: "Demolish", slot: 1, row: 0 },
  8451: { pageId: 8400, name: "Overgrowth", key: "Overgrowth", slot: 3, row: 0 },
  8453: { pageId: 8400, name: "Revitalize", key: "Revitalize", slot: 3, row: 1 },
  8463: { pageId: 8400, name: "Font of Life", key: "FontOfLife", slot: 1, row: 1 },
  8465: { pageId: 8400, name: "Guardian", key: "Guardian", slot: 0, row: 2 },
  8473: { pageId: 8400, name: "Bone Plating", key: "BonePlating", slot: 2, row: 2 },
  8992: { pageId: 8200, name: "Deathfire Touch", key: "DeathfireTouch", slot: 0, row: 3 },
  9101: { pageId: 8000, name: "Absorb Life", key: "AbsorbLife", slot: 1, row: 0 },
  9103: { pageId: 8000, name: "Legend: Bloodline", key: "LegendBloodline", slot: 2, row: 2 },
  9104: { pageId: 8000, name: "Legend: Alacrity", key: "LegendAlacrity", slot: 2, row: 0 },
  9105: { pageId: 8000, name: "Legend: Haste", key: "LegendHaste", slot: 2, row: 1 },
  9111: { pageId: 8000, name: "Triumph", key: "Triumph", slot: 1, row: 1 },
  9923: { pageId: 8100, name: "Hail of Blades", key: "HailOfBlades", slot: 0, row: 2 },
};

/** Perk record for a perk id, or `null` when unknown. */
export function runeById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return null;
  return RUNES[num] || null;
}

/** Perk display name for a perk id, or `null` when unknown. */
export function runeName(id) {
  const rune = runeById(id);
  return rune ? rune.name : null;
}

/** Rune tree record (Precision, Domination, …) for a page id. */
export function runePageById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return null;
  return RUNE_PAGES[num] || null;
}

/** The perk ids that belong to a rune tree, in slot order. */
export function runesForPage(pageId) {
  const num = Number(pageId);
  if (!Number.isFinite(num)) return [];
  return Object.keys(RUNES)
    .map((id) => RUNES[id])
    .filter((rune) => rune.pageId === num)
    .sort((a, b) => a.slot - b.slot || a.row - b.row)
    .map((rune) => Number(Object.keys(RUNES).find((id) => RUNES[id] === rune)));
}
