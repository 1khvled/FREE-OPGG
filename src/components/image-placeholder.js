/**
 * Shared image frame with a graceful fallback.
 *
 * The reference renders champion portraits, item icons and rune icons as
 * plain `<img>` tags served from OP.GG's static CDN and Riot's Data Dragon.
 * When the network is unavailable (offline desktop app, blocked CDN, a
 * champion that was just reworked) the reference shows an empty box; this
 * helper shows a neutral block with the entity's first letter instead, which
 * keeps the table rhythm intact.
 *
 * Internal module — not re-exported from `index.js`.
 */

import { h } from '../core/dom.js';

/**
 * Build an image frame that walks a list of sources and finally degrades to a
 * neutral placeholder.
 *
 * @param {object} options
 * @param {string} options.className       - classes applied to the frame.
 * @param {string[]} [options.sources]     - candidate URLs, tried in order.
 * @param {string} [options.alt]           - accessible name of the entity.
 * @param {string} [options.fallbackText]  - glyph shown by the placeholder.
 * @param {number} [options.size]          - square edge length in pixels.
 * @param {number} [options.radius]        - corner radius in pixels.
 * @param {boolean} [options.eager]        - skip lazy loading.
 * @returns {HTMLElement}
 */
export function createFallbackImage(options = {}) {
  const {
    className = 'fallback-image',
    sources = [],
    alt = '',
    fallbackText = '',
    size = null,
    radius = null,
    eager = false,
  } = options;

  const frame = h('span', { class: className });

  if (size) {
    frame.style.width = `${size}px`;
    frame.style.height = `${size}px`;
  }
  if (radius !== null && radius !== undefined) {
    frame.style.borderRadius = `${radius}px`;
  }

  const candidates = (Array.isArray(sources) ? sources : [sources]).filter(Boolean);

  const buildPlaceholder = () => {
    const placeholder = h('span.fallback-image__placeholder', {
      'aria-hidden': 'true',
      text: fallbackText || '',
    });
    return placeholder;
  };

  if (!candidates.length) {
    frame.setAttribute('role', 'img');
    frame.setAttribute('aria-label', alt);
    frame.appendChild(buildPlaceholder());
    return frame;
  }

  const img = h('img.fallback-image__img', {
    src: candidates[0],
    alt,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
  });

  let index = 0;
  img.addEventListener('error', () => {
    index += 1;
    if (index < candidates.length) {
      img.src = candidates[index];
      return;
    }
    if (img.parentNode) img.parentNode.removeChild(img);
    frame.setAttribute('role', 'img');
    frame.setAttribute('aria-label', alt);
    frame.appendChild(buildPlaceholder());
  });

  frame.appendChild(img);
  return frame;
}

/** First character of a label, upper-cased — used for placeholders. */
export function initialOf(value) {
  const text = String(value ?? '').trim();
  return text ? text.charAt(0).toUpperCase() : '';
}
