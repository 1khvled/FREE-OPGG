/**
 * Loading / error / empty states.
 *
 * The skeleton follows the reference's table rhythm (40px rows in the desktop
 * build) with a subtle pulse animation.
 */

import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';

/**
 * Create a loading skeleton.
 *
 * @param {number} [rows=5] - number of skeleton rows.
 * @returns {HTMLElement}
 */
export function createLoadingSkeleton(rows = 5) {
  const count = Math.max(1, Number(rows) || 1);
  const el = h('div.state.state--loading', { 'aria-busy': 'true' });

  for (let index = 0; index < count; index += 1) {
    const row = h('div.skeleton-row');
    row.appendChild(h('span.skeleton-block.skeleton-block--avatar'));
    row.appendChild(h('span.skeleton-block.skeleton-block--bar'));
    row.appendChild(h('span.skeleton-block.skeleton-block--bar.skeleton-block--short'));
    el.appendChild(row);
  }

  return el;
}

/**
 * Create an error state.
 *
 * @param {object} options
 * @param {string} [options.message] - the error text.
 * @param {Function} [options.onRetry] - when given, a "Retry" button is shown.
 * @returns {HTMLElement}
 */
export function createErrorState(options = {}) {
  const el = h('div.state.state--error', { role: 'alert' });

  el.appendChild(h('p.state__message', {
    text: options.message || t('common.error.title'),
  }));

  if (typeof options.onRetry === 'function') {
    const button = h('button.button.button--primary.state__action', {
      type: 'button',
      text: t('lol.buff-nerf.retry'),
    });
    button.addEventListener('click', () => options.onRetry());
    el.appendChild(button);
  }

  return el;
}

/**
 * Create an empty state.
 *
 * @param {object} options
 * @param {string} [options.message] - the text.
 * @param {Node|string} [options.action] - optional action element (or text).
 * @returns {HTMLElement}
 */
export function createEmptyState(options = {}) {
  const el = h('div.state.state--empty');

  el.appendChild(h('p.state__message', {
    text: options.message || t('lol.common.no-data'),
  }));

  if (options.action !== undefined && options.action !== null) {
    if (options.action instanceof Node) {
      el.appendChild(options.action);
    } else {
      el.appendChild(h('span.state__action-text', { text: String(options.action) }));
    }
  }

  return el;
}
