/**
 * Loading / error / empty states of the Buff / Nerf screen.
 *
 * The reference never leaves a blank panel: a request in flight shows what
 * it is loading, a failure shows the message plus a retry affordance, and an
 * empty result shows a labelled placeholder.
 *
 * The shared `.state` classes live in src/styles/components.css.
 */

import { h } from '../../../core/dom.js';

/**
 * The in-flight state.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @returns {HTMLElement}
 */
export function createLoadingState({ t }) {
  return h('div.state.buff-nerf__state', {
    role: 'status',
    'aria-live': 'polite',
    'aria-busy': 'true',
  }, [
    h('p.state__message', {
      text: t('lol.buff-nerf.loading-champion-data', null, 'Loading champion data...'),
    }),
  ]);
}

/**
 * The failure state.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {string} [options.message]
 * @param {Function} [options.onRetry]
 * @returns {HTMLElement}
 */
export function createErrorState({ t, message, onRetry }) {
  const el = h('div.state.state--error.buff-nerf__state', { role: 'alert' }, [
    h('p.state__message', { text: message || '' }),
  ]);

  if (typeof onRetry === 'function') {
    el.appendChild(h('button.button.button--primary.state__action', {
      type: 'button',
      text: t('lol.buff-nerf.retry', null, 'Retry'),
      on: { click: () => onRetry() },
    }));
  }

  return el;
}

/**
 * The empty state.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {string} [options.message]
 * @returns {HTMLElement}
 */
export function createEmptyState({ t, message }) {
  return h('div.state.state--empty.buff-nerf__state', { role: 'status' }, [
    h('p.state__message', { text: message || '' }),
  ]);
}
