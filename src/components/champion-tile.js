/**
 * Champion tile — the portrait tile the reference shows in the champions
 * search panel (`.champion-statistics-search-bottom`).
 *
 * Measured from the shipped desktop renderer (docs/rea/desktop-ui.md):
 *
 *   .item-champion                        46 × 59px, margin 4px, #9e9eb1
 *   .champion-statistics-champion-img-wrapper   46px-wide portrait
 *   .item-champion-name                   the champion name under the portrait
 *
 * The reference renders the name at 11px; the house typography floor is 12px,
 * so the replica deliberately ships 12px (documented divergence).
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
 * Create a champion tile.
 *
 * @param {{ id?: number|string, key?: string, name?: string, imageUrl?: string, squareImageUrl?: string }} champion
 * @param {object} [options]
 * @param {46|32} [options.size=46] - portrait width in pixels.
 * @param {Function} [options.onClick] - click handler.
 * @returns {HTMLElement}
 */
export function createChampionTile(champion, options = {}) {
  const size = options.size === 32 ? 32 : 46;
  const name = champion?.name ?? '';
  const key = championKey(champion);

  const sources = [];
  if (champion?.squareImageUrl) sources.push(champion.squareImageUrl);
  if (key) sources.push(`${STATIC_BASE}/${key}.png?image=c_scale,q_auto,w_${size}`);
  if (champion?.imageUrl) sources.push(champion.imageUrl);

  const portrait = createFallbackImage({
    className: 'champion-statistics-champion-img',
    sources,
    alt: name,
    fallbackText: initialOf(name || key),
    size,
    radius: 0,
    eager: true,
  });

  const wrapper = h('div.champion-statistics-champion-img-wrapper', null, portrait);

  const el = h('div.item-champion', null, [
    wrapper,
    h('div.item-champion-name', { text: name }),
  ]);

  if (typeof options.onClick === 'function') {
    el.classList.add('is-clickable');
    el.tabIndex = 0;
    el.addEventListener('click', () => options.onClick(champion));
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        options.onClick(champion);
      }
    });
  }

  return el;
}
