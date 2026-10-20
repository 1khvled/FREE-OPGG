/**
 * Champion avatar — the square champion portrait used in tables, pick bans
 * and counter columns.
 *
 * Image resolution order:
 *   1. `champion.squareImageUrl` (the API's square portrait)
 *   2. `https://opgg-static.akamaized.net/images/champions/{key}.png`
 *   3. `champion.imageUrl`
 *   4. neutral placeholder block with the champion's first letter
 *
 * The reference wraps the portrait in `.champion-img-32` (32 × 32px,
 * border-radius 4px, margin-right 8px) inside the statistics table — pass
 * that class through `options.className` to reproduce it exactly.
 */

import { h } from '../core/dom.js';
import { createFallbackImage, initialOf } from './image-placeholder.js';

/** OP.GG static CDN base for champion portraits. */
const STATIC_BASE = 'https://opgg-static.akamaized.net/images/champions';

/**
 * Canonical champion key (used for the CDN path).
 *
 * @param {{ key?: string|number, name?: string, id?: string|number }} champion
 * @returns {string}
 */
function championKey(champion) {
  if (!champion) return '';
  const raw = champion.key ?? champion.name ?? champion.id ?? '';
  return String(raw).trim().replace(/\s+/g, '');
}

/**
 * Create a champion portrait.
 *
 * @param {{ id?: number|string, key?: string, name?: string, imageUrl?: string, squareImageUrl?: string }} champion
 * @param {object} [options]
 * @param {32|40|46|48|64} [options.size=40] - square edge length in pixels.
 * @param {number} [options.radius=4] - corner radius in pixels.
 * @param {string} [options.className] - extra classes (e.g. `champion-img-32`).
 * @param {Function} [options.onClick] - click handler (makes it focusable).
 * @returns {HTMLElement}
 */
export function createChampionAvatar(champion, options = {}) {
  const size = options.size ?? 40;
  const radius = options.radius ?? 4;
  const name = champion?.name ?? '';
  const key = championKey(champion);

  const sources = [];
  if (champion?.squareImageUrl) sources.push(champion.squareImageUrl);
  if (key) sources.push(`${STATIC_BASE}/${key}.png`);
  if (champion?.imageUrl) sources.push(champion.imageUrl);

  const el = createFallbackImage({
    className: 'champion-avatar',
    sources,
    alt: name,
    fallbackText: initialOf(name || key),
    size,
    radius,
  });

  if (options.className) {
    el.classList.add(...String(options.className).split(/\s+/).filter(Boolean));
  }

  if (typeof options.onClick === 'function') {
    el.classList.add('is-clickable');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', (event) => options.onClick(champion, event));
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        options.onClick(champion, event);
      }
    });
  }

  return el;
}
