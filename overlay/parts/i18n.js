/**
 * Overlay strings.
 *
 * The overlay is a separate renderer and may not import from `src/`, so the
 * subset of the reference bundle it needs is carried here verbatim. Every
 * value below is copied from `docs/rea/i18n.en.json` (the recovered 4094-string
 * bundle) — the keys are the reference's own dotted keys.
 *
 * The `local.*` entries are the only strings with no reference key; they are
 * short English labels for HUD affordances the reference names only inside
 * longer sentences.
 */

const STRINGS = {
  /* ---- reference keys (verbatim) ---------------------------------------- */
  'overlay.lol.champion': 'Champion',
  'overlay.lol.item': 'Item',
  'overlay.lol.checking-stats': 'Checking stats',
  'overlay.lol.could-not-check-due-to-a': 'Could not check due to a temporary error',
  'overlay.lol.closes-in-s': 'closes in {{n}}s',
  'overlay.lol.enemy-skill-cooldowns': 'Enemy Skill Cooldowns',
  'overlay.lol.objective-timer.champion-flash': '{{champion}} Flash',
  'overlay.lol.objective-timer.dragon': 'Dragon',
  'overlay.lol.objective-timer.elder-dragon': 'Elder Dragon',
  'overlay.lol.objective-timer.flash': 'Flash',
  'overlay.lol.objective-timer.herald': 'Herald',
  'overlay.lol.objective-timer.objective': 'Objective',
  'overlay.lol.objective-timer.support-flash': 'Support Flash',
  'overlay.lol.pick': '{{n}}% pick',
  'overlay.lol.recommendation': 'Recommendation {{n}}',
  'overlay.lol.spellcheck.default': 'Unable to retrieve enemy data.',
  'overlay.lol.spellcheck.sync': 'Sync with the team',
  'overlay.lol.spellcheck.sync-desc':
    'Synchronize spell cooldown with friends or teammates using OP.GG for Desktop.',
  'overlay.lol.spellcheck.title': 'Spell Timer',
  'overlay.lol.starting-item-data-is-not-available': 'Starting item data is not available yet.',
  'overlay.lol.starting-items': 'Starting Items',
  'overlay.lol.unable-to-load-augments': 'Unable to load augments',
  'overlay.lol.situational': 'Situational',

  'overlay.common.Reload': 'Refresh',
  'overlay.common.lol-aram-heal-timer': 'ARAM Health Timers',
  'overlay.common.lol-item-build': 'Item builds',
  'overlay.common.lol-jungle-timer': 'Jungle timers',
  'overlay.common.lol-mayhem-augments': 'Augment Tier',
  'overlay.common.lol-skill': 'Skill recommendations',
  'overlay.common.lol-spell-check': 'Spell tracker',

  'lol.champions.rune-advice.toggle': 'Rune tips',
  'lol.common.champion.boots': 'Boots',
  'lol.common.champion.core-items': 'Core Items',
  'lol.common.champion.starter-item': 'Starter Items',
  'lol.common.champion.skill-builds': 'Skill Builds',
  'lol.common.champion.summoner-spells': 'Summoner Spells',
  'lol.common.gameMode.aram': 'ARAM',
  'lol.common.gameMode.aram-mayhem': 'ARAM: Mayhem',
  'lol.common.item': 'Item',
  'lol.common.tier-avg': 'Avg. Tier',

  'lol.live.champion.v3.apply': 'Apply',
  'lol.live.champion.v3.apply-failed': 'Apply failed',
  'lol.live.champion.v3.applying': 'Applying...',
  'lol.live.champion.v3.failed-to-load-champion-info': 'Failed to load champion info.',
  'lol.live.champion.v3.loading': 'Loading',
  'lol.live.champion.v3.loading-augment-information': 'Loading augment information.',
  'lol.live.champion.v3.loading-item-information': 'Loading item information.',
  'lol.live.champion.v3.loading-rune-information': 'Loading rune information.',
  'lol.live.champion.v3.loading-skill-information': 'Loading skill information.',
  'lol.live.champion.v3.no-augment-stats-for-this-champion': 'No augment stats for this champion yet',
  'lol.live.champion.v3.no-recommended-runes': 'No recommended runes',
  'lol.live.champion.v3.runes': 'Runes',
  'lol.live.champion.v3.tier': 'Tier {{n}}',
  'lol.live.champion.v3.tier-2': 'Tier',

  'common.close': 'Close',
  'common.lol.kNoRarity': 'Normal',
  'common.lol.rarity': 'Rarity',
  'common.lol.tier.gold': 'Gold',
  'common.lol.tier.silver': 'Silver',
  'common.loading-item-info': 'Loading item information.',
  'common.loading-rune-info': 'Loading rune information.',
  'common.show-more': 'Show more',
  'lol.augment.prism': 'Prismatic',

  'stratum.item-build': 'Item Build',
  'stratum.loading-first-augment': 'Loading first augment',
  'stratum.mayhem-augments': 'Mayhem Augments',
  'stratum.no-level-data': 'No level data',
  'stratum.recommended-build': 'RECOMMENDED BUILD',
  'stratum.skill-recommend': 'Skill Recommend',
  'stratum.tier': 'Tier',
  'stratum.top-tier-pick': 'Top tier pick',
  'stratum.waiting-for-champion-build': 'Waiting for champion build',

  /* ---- labels with no reference key ------------------------------------- */
  'local.bench': 'Bench',
  'local.swap': 'Swap',
  'local.lock': 'Lock',
  'local.unlock': 'Unlock',
  'local.hide': 'Hide',
  'local.show': 'Show',
  'local.level': 'Lv',
  'local.camps': 'Camps',
  'local.baron': 'Baron',
  'local.no-data': 'No data',
};

/**
 * Resolve a string.
 *
 *   t('overlay.lol.objective-timer.champion-flash', { champion: 'Ahri' })
 *
 * Unknown keys fall back to the supplied fallback, then to the key itself, so
 * a missing translation is visible rather than silently blank.
 */
export function t(key, vars, fallback) {
  let value = STRINGS[key];
  if (value === undefined) value = fallback !== undefined ? fallback : key;
  if (vars && typeof vars === 'object') {
    for (const name of Object.keys(vars)) {
      const token = `{{${name}}}`;
      if (value.includes(token)) value = value.split(token).join(String(vars[name]));
    }
  }
  return value;
}

/** True when the key exists in the carried bundle. */
export function has(key) {
  return Object.prototype.hasOwnProperty.call(STRINGS, key);
}

export default t;
