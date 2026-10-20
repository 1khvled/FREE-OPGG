/**
 * Shared feedback widgets for the HUD panels.
 */
import { h } from './dom.js';

/**
 * Error state with a retry affordance.
 * The overlay never leaves a panel blank when a request fails.
 */
export function errorState(ctx, message) {
  return h(
    'div',
    { class: 'hud-error' },
    h('span', { class: 'hud-error__text' }, message || ctx.t('overlay.lol.could-not-check-due-to-a')),
    h(
      'button',
      {
        class: 'hud-btn hud-btn--ghost hud-interactive',
        type: 'button',
        onclick: () => ctx.actions.retry(),
      },
      ctx.t('overlay.common.Reload'),
    ),
  );
}

/** Loading state. */
export function loadingState(ctx, message) {
  return h(
    'div',
    { class: 'hud-loading' },
    h('span', { class: 'hud-loading__dot' }),
    h('span', { class: 'hud-loading__text' }, message || ctx.t('lol.live.champion.v3.loading')),
  );
}
