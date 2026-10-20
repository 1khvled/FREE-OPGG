/**
 * The Game modes screen's loading / error / empty states.
 *
 * The skeleton mirrors the table's own geometry (a 32px header and 40px
 * rows), so the screen does not jump when the data arrives. The error state
 * carries a retry button — a failed request is never rendered as "there is
 * nothing to show".
 */

import { h } from '../../../core/dom.js';
import { createEmptyState, createErrorState } from '../../../components/index.js';
import { STAT_COLUMNS } from '../data.js';

/**
 * The table skeleton.
 *
 * @param {number} [rows=12] - number of skeleton rows.
 * @returns {HTMLElement}
 */
export function createSkeletonTable(rows = 12) {
  const count = Math.max(1, Number(rows) || 1);

  const el = h('div.modes__skeleton', { 'aria-busy': 'true' });

  const head = h('div.modes__skeleton-head');
  head.appendChild(h('span.modes__skeleton-block.modes__skeleton-block--champion'));
  for (let index = 0; index < STAT_COLUMNS.length; index += 1) {
    head.appendChild(h('span.modes__skeleton-block'));
  }
  el.appendChild(head);

  for (let index = 0; index < count; index += 1) {
    const row = h('div.modes__skeleton-row');
    row.appendChild(h('span.modes__skeleton-block.modes__skeleton-block--avatar'));
    row.appendChild(h('span.modes__skeleton-block.modes__skeleton-block--name'));
    for (let column = 0; column < STAT_COLUMNS.length; column += 1) {
      row.appendChild(h('span.modes__skeleton-block'));
    }
    el.appendChild(row);
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
 * The empty state — no champion matches the current filters.
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
