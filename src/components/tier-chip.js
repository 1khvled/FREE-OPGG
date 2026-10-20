/**
 * Tier chip — the compact badge the reference shows in the "Tier" column of
 * the champions tier list (36px column, coloured chip, no extra text).
 *
 * Accepted tier values (case-insensitive, spaces tolerated):
 *
 *   'OP'            -> OP   (red)
 *   1 .. 5          -> 1..5 (orange / gold / teal / blue / grey)
 *   'Tier 1'..'5'   -> 1..5
 *   'S+' / 'S'      -> orange family
 *   'A'             -> gold family
 *   'B'             -> teal family
 *
 * Colours come exclusively from the `--tier-op` … `--tier-5` tokens.
 */

import { h } from '../core/dom.js';

/**
 * Canonical tier descriptor.
 * @typedef {{ key: string, label: string, token: string }} TierDescriptor
 */

/** Tier value -> design token carrying its colour. */
const TIER_TOKEN = {
  op: '--tier-op',
  1: '--tier-1',
  2: '--tier-2',
  3: '--tier-3',
  4: '--tier-4',
  5: '--tier-5',
};

/**
 * Normalise any accepted tier representation into a descriptor.
 *
 * @param {string|number} tier
 * @returns {TierDescriptor|null}
 */
function normalizeTier(tier) {
  if (tier === null || tier === undefined) return null;

  if (typeof tier === 'number') {
    const n = Math.trunc(tier);
    return TIER_TOKEN[n] ? { key: String(n), label: String(n), token: TIER_TOKEN[n] } : null;
  }

  const raw = String(tier).trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();

  if (upper === 'OP') return { key: 'op', label: 'OP', token: TIER_TOKEN.op };
  if (upper === 'S+') return { key: '1', label: 'S+', token: TIER_TOKEN[1] };
  if (upper === 'S') return { key: '1', label: 'S', token: TIER_TOKEN[1] };
  if (upper === 'A') return { key: '2', label: 'A', token: TIER_TOKEN[2] };
  if (upper === 'B') return { key: '3', label: 'B', token: TIER_TOKEN[3] };

  const prefixed = /^TIER[\s_-]*([1-5])$/i.exec(raw);
  if (prefixed) {
    const n = prefixed[1];
    return { key: n, label: n, token: TIER_TOKEN[n] };
  }

  if (/^[1-5]$/.test(raw)) return { key: raw, label: raw, token: TIER_TOKEN[raw] };

  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
    return { key: String(numeric), label: String(numeric), token: TIER_TOKEN[numeric] };
  }

  return null;
}

/**
 * Create a tier chip.
 *
 * @param {string|number} tier - 'OP', 1..5, 'Tier 1'..'Tier 5', 'S', 'S+', 'A', 'B'.
 * @param {object} [options]
 * @param {'sm'|'md'} [options.size='sm'] - 'sm' = 20px tall (table), 'md' = 24px.
 * @param {boolean} [options.showLabel=true] - false renders a colour-only chip.
 * @returns {HTMLElement}
 */
export function createTierChip(tier, options = {}) {
  const size = options.size === 'md' ? 'md' : 'sm';
  const showLabel = options.showLabel !== false;
  const descriptor = normalizeTier(tier);

  const el = h('span.tier-chip', {
    class: `tier-chip--${size}`,
    dataset: { tier: descriptor ? descriptor.key : 'unknown' },
  });

  if (descriptor) {
    el.classList.add(`tier-chip--${descriptor.key}`);
    el.setAttribute('title', descriptor.label);
  }

  if (showLabel) {
    el.appendChild(h('span.tier-chip__label', { text: descriptor ? descriptor.label : '-' }));
  } else {
    el.setAttribute('aria-label', descriptor ? descriptor.label : 'Tier');
    el.setAttribute('role', 'img');
  }

  return el;
}

/** Exposed for pages that need the colour token of a tier (e.g. inline charts). */
export function tierToken(tier) {
  const descriptor = normalizeTier(tier);
  return descriptor ? descriptor.token : null;
}
