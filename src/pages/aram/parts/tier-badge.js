/**
 * The tier badge.
 *
 * The reference renders the tier of the ARAM list as a small SVG shield:
 *
 *   https://desktop-app-data.op.gg/desktop/app/assets/images/optier-{tier}.svg
 *
 * with `tier` being `0` (OP) … `5`. The replica ships local copies of the six
 * badges under `src/assets/images/ui/`, so no request ever leaves the app.
 *
 * When the tier cannot be resolved the shared `createTierChip()` takes over —
 * it draws the same six colours as a text chip, so the row keeps its rhythm
 * instead of going blank.
 */

import { h } from '../../../core/dom.js';
import { createTierChip } from '../../../components/index.js';

/**
 * The URL of a tier badge.
 *
 * @param {number} tier - `0` (OP) … `5`.
 * @returns {string}
 */
export function tierBadgeUrl(tier) {
  return new URL(`../../../assets/images/ui/optier-${tier}.svg`, import.meta.url).href;
}

/**
 * Create the tier badge of a row.
 *
 * @param {number|string|null} tier - the numeric tier bucket (`0` = OP … `5`).
 * @returns {HTMLElement}
 */
export function createTierBadge(tier) {
  const bucket = Number(tier);

  if (!Number.isInteger(bucket) || bucket < 0 || bucket > 5) {
    return createTierChip(tier);
  }

  const label = bucket === 0 ? 'OP' : `Tier ${bucket}`;

  return h('img.aram-tier-badge', {
    src: tierBadgeUrl(bucket),
    alt: label,
    title: label,
    width: 24,
    height: 24,
    loading: 'lazy',
    draggable: 'false',
  });
}
