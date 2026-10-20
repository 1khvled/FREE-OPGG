/**
 * Tier filter options and tier colour tokens for the champion tier list.
 *
 * The filter list mirrors the reference dropdown exactly
 * (`9387.90956ede.bundle.js`, module 48762, export `yR`): the reference builds
 * the visible label as `t('common.lol.tier.' + key) + (suffix ? ' ' + suffix : '')`
 * and keeps the raw API value in `value`.
 *
 * `silver_plus` is not in the reference's own dropdown (its `ibsg` entry
 * already covers "gold and below"), but it is a documented tier value
 * (`docs/rea/endpoints.md`) so it is offered as well. The reference offers no
 * `bronze_plus` / `iron_plus` entry, so neither is offered here.
 *
 * Pure data — no imports, no side effects.
 */

/**
 * @typedef {object} TierFilter
 * @property {string} value    Value sent to the API (`?tier=`).
 * @property {string} label    English display label, e.g. `Emerald +`.
 * @property {string} key      Reference tier key (`gold`, `emerald`, …) — the
 *                             suffix of the i18n key `common.lol.tier.<key>`.
 * @property {string} i18nKey  Full i18n key for the tier name.
 * @property {string} suffix   `'+'` / `'-'` / `''` — the qualifier appended to
 *                             the tier name.
 * @property {string} icon     Reference icon URL for the dropdown.
 */

/** @type {TierFilter[]} */
export const TIER_FILTERS = [
  { value: 'all', label: 'All Tiers', key: 'all', i18nKey: 'common.lol.tier.all', suffix: '', icon: '' },
  { value: 'ibsg', label: 'Gold -', key: 'gold', i18nKey: 'common.lol.tier.gold', suffix: '-', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_gold.webp' },
  { value: 'silver_plus', label: 'Silver +', key: 'silver', i18nKey: 'common.lol.tier.silver', suffix: '+', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_silver.webp' },
  { value: 'gold_plus', label: 'Gold +', key: 'gold', i18nKey: 'common.lol.tier.gold', suffix: '+', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_gold.webp' },
  { value: 'platinum_plus', label: 'Platinum +', key: 'platinum', i18nKey: 'common.lol.tier.platinum', suffix: '+', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_platinum.webp' },
  { value: 'emerald_plus', label: 'Emerald +', key: 'emerald', i18nKey: 'common.lol.tier.emerald', suffix: '+', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_emerald.webp' },
  { value: 'diamond_plus', label: 'Diamond +', key: 'diamond', i18nKey: 'common.lol.tier.diamond', suffix: '+', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_diamond.webp' },
  { value: 'master', label: 'Master', key: 'master', i18nKey: 'common.lol.tier.master', suffix: '', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_master.webp' },
  { value: 'master_plus', label: 'Master +', key: 'master', i18nKey: 'common.lol.tier.master', suffix: '+', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_master.webp' },
  { value: 'grandmaster', label: 'Grandmaster', key: 'grandmaster', i18nKey: 'common.lol.tier.grandmaster', suffix: '', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_grandmaster.webp' },
  { value: 'challenger', label: 'Challenger', key: 'challenger', i18nKey: 'common.lol.tier.challenger', suffix: '', icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon_challenger.webp' },
];

/** The tier filter the reference opens with. */
export const DEFAULT_TIER = 'emerald_plus';

/**
 * Tier bucket → CSS custom property from `src/styles/tokens.css`.
 *
 * The six buckets match the reference's six tiers: `OP`, `Tier 1` … `Tier 5`
 * (the reference spells the same scale `OP`, `S`, `A`, `B`, `C`, `D`).
 *
 * @type {Record<string, string>}
 */
export const TIER_COLORS = {
  OP: '--tier-op',
  'Tier 1': '--tier-1',
  'Tier 2': '--tier-2',
  'Tier 3': '--tier-3',
  'Tier 4': '--tier-4',
  'Tier 5': '--tier-5',
};

/**
 * The CSS custom property for a tier.
 *
 * Accepts a tier label (`'OP'`, `'Tier 3'`), a tier rank (`0` … `5`) or a tier
 * object produced by `normalizeTier`.
 *
 * @param {string|number|{tier?: string, tierRank?: number}} tier
 * @returns {string} the token name, `--tier-5` when unknown
 */
export function tierColorToken(tier) {
  if (tier === null || tier === undefined) return TIER_COLORS['Tier 5'];
  if (typeof tier === 'object') {
    if (TIER_COLORS[tier.tier]) return TIER_COLORS[tier.tier];
    return tierColorToken(tier.tierRank);
  }
  if (typeof tier === 'number') {
    if (tier === 0) return TIER_COLORS.OP;
    const key = `Tier ${tier}`;
    return TIER_COLORS[key] || TIER_COLORS['Tier 5'];
  }
  const label = String(tier).trim();
  if (TIER_COLORS[label]) return TIER_COLORS[label];
  const numeric = Number(label.replace(/^tier[\s_-]*/i, ''));
  return tierColorToken(Number.isFinite(numeric) ? numeric : null);
}

/**
 * The tier filter for an API tier value, or `null` when unknown.
 *
 * @param {string} value
 * @returns {TierFilter|null}
 */
export function tierFilterByValue(value) {
  if (value === null || value === undefined) return null;
  const needle = String(value).trim().toLowerCase();
  return TIER_FILTERS.find((filter) => filter.value === needle) || null;
}

/**
 * The English label for an API tier value, or the value itself when unknown.
 *
 * @param {string} value
 * @returns {string}
 */
export function tierFilterLabel(value) {
  const filter = tierFilterByValue(value);
  return filter ? filter.label : String(value ?? '');
}
