/**
 * Tier chip — the compact badge that sits in the tier column.
 *
 * The API's `tier` is a number between 1 and 5; `0` is the reference's "OP"
 * tier. Every tier owns a colour token in `tokens.css`
 * (`--tier-op` … `--tier-5`).
 */

import { h } from '../../../core/dom.js';
import { TIER_META } from '../data.js';

/**
 * @param {number|null} tier - 0 (OP) … 5.
 * @returns {HTMLElement}
 */
export function createTierChip(tier) {
  const meta = TIER_META[tier];
  if (!meta) {
    return h('span.champ-tier.champ-tier--none', { text: '--', 'aria-label': 'No tier' });
  }
  return h(`span.champ-tier.champ-tier--${meta.key}`, {
    title: meta.label,
    'data-tier': meta.key,
    text: meta.label,
  });
}
