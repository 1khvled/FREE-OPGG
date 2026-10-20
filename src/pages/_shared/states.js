/**
 * Shared loading / error / empty states for the leaderboard, multisearch,
 * my-page and settings screens.
 *
 * The reference never leaves a blank panel: a request in flight shows a
 * skeleton that matches the real row metrics (32px header, 40px rows), a
 * failure shows the message plus a retry affordance, and an empty result
 * shows a labelled placeholder.
 */

import { h } from '../../core/dom.js';

/**
 * A loading skeleton that mirrors the table geometry.
 *
 * @param {object} [options]
 * @param {number} [options.rows=6] - number of skeleton rows.
 * @param {number} [options.columns=5] - number of skeleton cells per row.
 * @param {string} [options.label] - accessible description.
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createLoadingSkeleton({ rows = 6, columns = 5, label = 'Loading', className = '' } = {}) {
  const classes = ['st', 'st--loading'];
  if (className) classes.push(className);

  const wrap = h('div', {
    class: classes.join(' '),
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': 'true',
  });

  const grid = h('div.st__skeleton', { 'aria-hidden': 'true' });
  for (let row = 0; row < rows; row += 1) {
    const line = h('div.st__skeleton-row');
    for (let column = 0; column < columns; column += 1) {
      line.appendChild(h('span.st__skeleton-cell'));
    }
    grid.appendChild(line);
  }

  wrap.appendChild(grid);
  wrap.appendChild(h('span.visually-hidden', { text: label }));
  return wrap;
}

/**
 * An error panel with a retry button.
 *
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.detail]
 * @param {Function} [options.onRetry]
 * @param {string} [options.retryLabel]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createErrorState({
  title = 'Something went wrong',
  detail = null,
  onRetry = null,
  retryLabel = 'Retry',
  className = '',
} = {}) {
  const classes = ['st', 'st--error'];
  if (className) classes.push(className);

  const wrap = h('div', { class: classes.join(' '), role: 'alert' });
  wrap.appendChild(h('p.st__title', { text: title }));
  if (detail) wrap.appendChild(h('p.st__detail', { text: detail }));

  if (onRetry) {
    wrap.appendChild(h('button.fc-btn.fc-btn--primary.st__retry', {
      type: 'button',
      on: { click: onRetry },
    }, [retryLabel]));
  }
  return wrap;
}

/**
 * An empty-result panel.
 *
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.description]
 * @param {Node} [options.action]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createEmptyState({
  title = 'No data',
  description = null,
  action = null,
  className = '',
} = {}) {
  const classes = ['st', 'st--empty'];
  if (className) classes.push(className);

  const wrap = h('div', { class: classes.join(' '), role: 'status' });
  wrap.appendChild(h('p.st__title', { text: title }));
  if (description) wrap.appendChild(h('p.st__detail', { text: description }));
  if (action) wrap.appendChild(action);
  return wrap;
}
