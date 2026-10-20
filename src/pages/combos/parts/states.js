/**
 * The Combos screen's loading / error / empty states.
 *
 * The upstream skill history is a multi-megabyte payload, so the loading
 * state is a **skeleton** that mirrors the 40px version rows instead of a
 * spinner. The error state carries a retry button — a failed request is never
 * rendered as "this champion has no history".
 */

import { h } from '../../../core/dom.js';
import { createEmptyState, createErrorState } from '../../../components/index.js';

/**
 * The skeleton of the version list.
 *
 * @param {number} [rows=8] - number of skeleton rows.
 * @returns {HTMLElement}
 */
export function createSkeletonList(rows = 8) {
  const count = Math.max(1, Number(rows) || 1);
  const el = h('div.combos-skeleton', { 'aria-busy': 'true' });

  for (let index = 0; index < count; index += 1) {
    el.appendChild(h('div.combos-skeleton__row', {}, [
      h('span.combos-skeleton__bar.combos-skeleton__bar--version'),
      h('span.combos-skeleton__bar.combos-skeleton__bar--count'),
    ]));
  }

  return el;
}

/**
 * The error state with a retry button.
 *
 * @param {object} options
 * @param {string} [options.message]
 * @param {Function} [options.onRetry]
 * @returns {HTMLElement}
 */
export function createErrorPanel(options = {}) {
  return createErrorState({
    message: options.message,
    onRetry: options.onRetry,
  });
}

/**
 * The empty state — the champion has no history at all.
 *
 * @param {object} options
 * @param {string} [options.message]
 * @returns {HTMLElement}
 */
export function createEmptyPanel(options = {}) {
  return createEmptyState({
    message: options.message,
  });
}
