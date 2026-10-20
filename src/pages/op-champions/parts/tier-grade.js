/**
 * Tier grade badge — the letter grade the in-game overlay shows.
 *
 * OP.GG's own tier list numbers its buckets 1..5 (0 is the "OP" tier), but
 * the overlay has always shown a letter grade: `S+` for the OP tier, then
 * `S`, `A`, `B`, `C`, `D`.
 *
 * The letter is the headline of the "Tier" cell; the numeric tier stays
 * available in the cell's tooltip.
 */

import { h } from '../../../core/dom.js';
import { TIER_GRADES } from '../data.js';

/**
 * Create a tier grade badge.
 *
 * @param {number|string} bucket - the numeric tier bucket (0 = OP … 5).
 * @param {object} [options]
 * @param {string} [options.title] - the tooltip text.
 * @returns {HTMLElement}
 */
export function createTierGrade(bucket, options = {}) {
  const key = Number(bucket);
  const grade = (Number.isFinite(key) && TIER_GRADES[key]) || TIER_GRADES[5];

  const el = h('span.op-tier-grade', {
    class: grade.className,
    text: grade.letter,
  });

  if (options.title) el.setAttribute('title', options.title);
  el.setAttribute('aria-label', grade.letter);

  return el;
}
