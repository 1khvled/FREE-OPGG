/**
 * Live companion — shared UI atoms.
 *
 * Small, dependency-free building blocks used by every part of the Live
 * screen. They only rely on `h()` from the renderer core and on the CSS
 * classes defined in `live.css`.
 */

import { h } from '../../../core/dom.js';

/* --------------------------------------------------------------------------
 * Champion portrait
 * ------------------------------------------------------------------------ */

/**
 * Render a champion portrait.
 *
 * When no image URL is known the tile falls back to the champion's initials,
 * so the layout never collapses and no placeholder artwork is invented.
 *
 * @param {{src?: string, name?: string, className?: string, dimmed?: boolean}} options
 * @returns {HTMLElement}
 */
export function portrait({ src = '', name = '', className = '', dimmed = false } = {}) {
  const initials = name ? name.slice(0, 2).toUpperCase() : '?';
  const node = h('div.live-portrait', {
    class: [className, dimmed ? 'is-dimmed' : ''],
    title: name,
  });

  if (src) {
    const img = h('img', { src, alt: name, loading: 'lazy' });
    img.addEventListener('error', () => {
      img.remove();
      node.appendChild(h('span.live-portrait__initials', { text: initials }));
    }, { once: true });
    node.appendChild(img);
  } else {
    node.appendChild(h('span.live-portrait__initials', { text: initials }));
  }

  return node;
}

/* --------------------------------------------------------------------------
 * Tier chip
 * ------------------------------------------------------------------------ */

/**
 * Render a compact tier chip.
 *
 * The reference uses a coloured SVG glyph; the replica uses the tier palette
 * from `tokens.css` so the chip stays legible at 12px.
 *
 * @param {number|null} tier  1 (OP) … 5
 * @param {string} [label]
 * @returns {HTMLElement}
 */
export function tierChip(tier, label) {
  const value = Number.isFinite(tier) ? Number(tier) : null;
  const node = h('span.live-tier', {
    class: value ? `is-tier-${Math.min(Math.max(value, 1), 5)}` : 'is-unknown',
    text: label || (value ? `T${value}` : '—'),
  });
  return node;
}

/* --------------------------------------------------------------------------
 * Generic chip / pill
 * ------------------------------------------------------------------------ */

/**
 * @param {string} text
 * @param {{tone?: string, title?: string, className?: string}} [options]
 * @returns {HTMLElement}
 */
export function pill(text, { tone = '', title = '', className = '' } = {}) {
  return h('span.live-pill', {
    class: [tone ? `is-${tone}` : '', className],
    title: title || undefined,
    text,
  });
}

/* --------------------------------------------------------------------------
 * Section shell
 * ------------------------------------------------------------------------ */

/**
 * A titled panel — the reference's `g.at` / `g.ZB` section header.
 *
 * @param {{title: string, subtitle?: string, actions?: Node|Node[], className?: string}} options
 * @returns {HTMLElement}
 */
export function panel({ title, subtitle = '', actions = null, className = '' } = {}) {
  return h('section.live-panel', { class: className }, [
    h('header.live-panel__head', {}, [
      h('div.live-panel__titles', {}, [
        h('h3.live-panel__title', { text: title }),
        subtitle ? h('p.live-panel__subtitle', { text: subtitle }) : null,
      ]),
      actions ? h('div.live-panel__actions', {}, actions) : null,
    ]),
  ]);
}

/* --------------------------------------------------------------------------
 * Empty / error states
 * ------------------------------------------------------------------------ */

/**
 * @param {string} text
 * @returns {HTMLElement}
 */
export function emptyState(text) {
  return h('p.live-empty', { text });
}

/**
 * @param {string} text
 * @param {(() => void)|null} [onRetry]
 * @param {string} [retryLabel]
 * @returns {HTMLElement}
 */
export function errorState(text, onRetry, retryLabel) {
  return h('div.live-error', {}, [
    h('p.live-error__text', { text }),
    onRetry
      ? h('button.live-button.live-button--ghost', { type: 'button', on: { click: onRetry }, text: retryLabel || 'Retry' })
      : null,
  ]);
}

/* --------------------------------------------------------------------------
 * Small icon
 * ------------------------------------------------------------------------ */

/**
 * A small square image (rune / item / mode icon). Falls back to a text
 * placeholder when no URL is known or when the image fails to load.
 *
 * @param {{src?: string, alt?: string, className?: string, fallback?: string}} options
 * @returns {HTMLElement}
 */
export function icon({ src = '', alt = '', className = '', fallback = '' } = {}) {
  const node = h('span.live-icon', { class: className, title: alt });
  if (src) {
    const img = h('img', { src, alt, loading: 'lazy' });
    img.addEventListener('error', () => {
      img.remove();
      if (fallback) node.appendChild(h('span.live-icon__fallback', { text: fallback }));
    }, { once: true });
    node.appendChild(img);
  } else if (fallback) {
    node.appendChild(h('span.live-icon__fallback', { text: fallback }));
  }
  return node;
}
