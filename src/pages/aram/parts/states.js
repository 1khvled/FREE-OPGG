/**
 * The ARAM screen's loading / error / empty states.
 *
 * The skeleton mirrors the table's own geometry (a 32px header and 40px
 * rows), so the screen does not jump when the data arrives. The error state
 * carries a retry button — a failed request is never rendered as "there is
 * nothing to show".
 */

import { h } from '../../../core/dom.js';
import { createEmptyState, createErrorState } from '../../../components/index.js';
import { COLUMNS } from '../data.js';

/**
 * The table skeleton.
 *
 * @param {number} [rows=12] - number of skeleton rows.
 * @returns {HTMLElement}
 */
export function createSkeletonTable(rows = 12) {
  const count = Math.max(1, Number(rows) || 1);

  const el = h('div.aram__skeleton', { 'aria-busy': 'true' });

  const head = h('div.aram__skeleton-head');
  for (let index = 0; index < COLUMNS.length; index += 1) {
    head.appendChild(h('span.aram__skeleton-block'));
  }
  el.appendChild(head);

  for (let index = 0; index < count; index += 1) {
    const row = h('div.aram__skeleton-row');
    row.appendChild(h('span.aram__skeleton-block.aram__skeleton-block--avatar'));
    row.appendChild(h('span.aram__skeleton-block.aram__skeleton-block--name'));
    for (let column = 2; column < COLUMNS.length; column += 1) {
      row.appendChild(h('span.aram__skeleton-block'));
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
 * The empty state — no champion matches the current search.
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
