/**
 * Search bar — the reference's champions search input.
 *
 * Measured from the shipped desktop renderer (docs/rea/desktop-ui.md):
 *
 *   .champion-statistics-search-bar   332 × 40px, background #2b2b30
 *                                     (--bg-surface-hover), border-radius 4px,
 *                                     padding 1px 30px 1px 2px,
 *                                     magnifier glyph on the right.
 */

import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';

/**
 * Build the magnifier glyph (inline SVG, no network request).
 *
 * @returns {SVGElement}
 */
function createSearchGlyph() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = '<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />'
    + '<path d="M10.5 10.5 L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />';
  return svg;
}

/**
 * Create a search bar.
 *
 * @param {object} [options]
 * @param {string} [options.placeholder] - defaults to the reference's
 *        "Unified Search" string.
 * @param {string} [options.value=''] - initial value.
 * @param {Function} [options.onInput] - called with `(value, event)` on input.
 * @param {string} [options.label] - accessible name.
 * @param {string} [options.className] - extra classes for the wrapper.
 * @returns {HTMLElement} - the wrapper; the native input is `element.input`.
 */
export function createSearchBar(options = {}) {
  const placeholder = options.placeholder ?? t('common.launcher.header.search.placeholder');

  const input = h('input.champion-statistics-search-bar__field', {
    type: 'search',
    placeholder,
    value: options.value ?? '',
    'aria-label': options.label ?? placeholder,
  });

  const el = h('div.champion-statistics-search-bar', null, [
    input,
    h('span.champion-statistics-search-bar__icon', { 'aria-hidden': 'true' }, createSearchGlyph()),
  ]);

  if (options.className) {
    el.classList.add(...String(options.className).split(/\s+/).filter(Boolean));
  }

  if (typeof options.onInput === 'function') {
    input.addEventListener('input', (event) => {
      options.onInput(input.value, event);
    });
  }

  /** The native `<input>` element. */
  el.input = input;

  return el;
}
