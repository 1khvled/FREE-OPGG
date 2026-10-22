/**
 * The ARAM balance tag — the buff / nerf badge of the seventh column.
 *
 * The tag is derived from the ARAM balance payload
 * (`GET /api/contents/aram-balance`), whose numbers are percentages against
 * the reference champion of the mode (100 % = the baseline):
 *
 *   `net = (damage dealt - 100) + (100 - damage taken)`
 *
 * Dealing more damage is a buff, taking more damage is a nerf, so the two
 * headline columns are summed against their own baseline. A positive sum is a
 * **buff**, a negative sum is a **nerf** and a sum of zero means there is no
 * headline change — such a champion gets no tag at all (and so does a
 * champion without a balance row).
 *
 * The badge carries the verdict; the tooltip carries the numbers.
 */

import { h, escapeHtml } from '../../../core/dom.js';
import { attachTooltip } from '../../../components/index.js';
import { BALANCE_STATS, TAG_BUFF } from '../data.js';

/**
 * The tooltip body — the verdict and every ratio that moved.
 *
 * @param {object} balance - the normalised balance row.
 * @param {object} tag - the outcome of `balanceTag()`.
 * @param {(key:string, vars?:object, fallback?:string)=>string} t
 * @returns {string} the tooltip HTML.
 */
function tooltipHtml(balance, tag, t) {
  const headline = tag.kind === TAG_BUFF
    ? t('lol.buff-nerf.buff', null, 'Buff')
    : t('lol.buff-nerf.nerf', null, 'Nerf');

  const rows = [];

  for (const stat of BALANCE_STATS) {
    const value = balance[stat.id];
    if (value === null || value === undefined) continue;

    // The two headline columns are always listed; every other ratio is only
    // listed when it actually moved away from its baseline.
    const isHeadline = stat.id === 'damageDealt' || stat.id === 'damageTaken';
    if (!isHeadline && value === stat.baseline) continue;

    const label = stat.labelKey ? t(stat.labelKey, null, stat.fallback) : stat.label;

    rows.push(
      '<div class="aram-balance__tip-row">'
      + `<span>${escapeHtml(label)}</span>`
      + `<span>${escapeHtml(String(value))} %</span>`
      + '</div>',
    );
  }

  return [
    `<div class="aram-balance__tip-head aram-balance__tip-head--${tag.kind}">${escapeHtml(headline)}</div>`,
    ...rows,
  ].join('');
}

/**
 * Create the balance tag of a row.
 *
 * @param {object|null} balance - the normalised balance row (or `null`).
 * @param {object|null} tag - the outcome of `balanceTag()` (or `null`).
 * @param {(key:string, vars?:object, fallback?:string)=>string} t
 * @returns {HTMLElement}
 */
export function createBalanceTag(balance, tag, t) {
  if (!balance || !tag) {
    return h('span.aram-balance__none', { 'aria-hidden': 'true', text: '—' });
  }

  const label = tag.kind === TAG_BUFF
    ? t('lol.buff-nerf.buff', null, 'Buff')
    : t('lol.buff-nerf.nerf', null, 'Nerf');

  const badge = h('span.aram-balance', {
    class: `aram-balance--${tag.kind}`,
    text: label,
  });

  attachTooltip(badge, () => tooltipHtml(balance, tag, t));

  return badge;
}
