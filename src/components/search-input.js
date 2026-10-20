/**
 * Search input — alias of the reference's search bar.
 *
 * The desktop renderer has a single search control
 * (`.champion-statistics-search-bar`, 332 × 40px, `--bg-surface-hover` fill,
 * 4px radius, magnifier on the right), so `createSearchInput` and
 * `createSearchBar` are the same component under two names.
 */

import { createSearchBar } from './search-bar.js';

/**
 * Create a search input.
 *
 * @param {object} [options]
 * @param {string} [options.placeholder]
 * @param {string} [options.value='']
 * @param {Function} [options.onInput] - called with `(value, event)`.
 * @param {string} [options.label]
 * @param {string} [options.className]
 * @returns {HTMLElement} - the wrapper; the native input is `element.input`.
 */
export function createSearchInput(options = {}) {
  const el = createSearchBar(options);
  el.classList.add('search-input');
  return el;
}
