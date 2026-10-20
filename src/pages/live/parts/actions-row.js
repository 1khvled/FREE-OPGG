/**
 * Live companion — actions row.
 *
 * "Apply runes", "Apply build" and "Apply spells" write the OP.GG
 * recommendation straight into the League Client.
 *
 * The actions are never optimistic: the button enters a pending state, and
 * the reference's success / failure copy is only shown once the League
 * Client has answered.
 *
 * Reference copy:
 *   - `lol.live.champion.v3.apply`         → "Apply"
 *   - `lol.live.champion.v3.applying`      → "Applying..."
 *   - `lol.live.champion.v3.apply-failed`  → "Apply failed"
 *   - `lol.live.champion.v3.the-recommended-mastery-page-is-applied`
 *   - `common.apply-complete`              → "Apply Complete"
 */

import { h } from '../../../core/dom.js';
import { LOCAL } from '../strings.js';

/**
 * @typedef {object} ActionState
 * @property {'idle'|'pending'|'ok'|'error'} status
 * @property {string} [reason]
 */

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {object} options.states `{ runes, build, spells }` action states
 * @param {boolean} [options.enabled] whether an action can be performed at all
 * @param {() => void} options.onRunes
 * @param {() => void} options.onBuild
 * @param {() => void} options.onSpells
 * @returns {HTMLElement}
 */
export function renderActionsRow({ t, states, enabled = true, onRunes, onBuild, onSpells }) {
  const button = (key, label, handler) => {
    const state = states[key] || { status: 'idle' };
    const pending = state.status === 'pending';
    return h('div.live-action', {}, [
      h('button.live-button.live-button--primary', {
        type: 'button',
        disabled: !enabled || pending,
        on: { click: handler },
      }, [
        h('span.live-button__label', {
          text: pending
            ? t('lol.live.champion.v3.applying')
            : t('lol.live.champion.v3.apply'),
        }),
        h('span.live-action__target', { text: label }),
      ]),
      state.status === 'ok'
        ? h('span.live-action__result.is-ok', { text: t('common.apply-complete') })
        : null,
      state.status === 'error'
        ? h('span.live-action__result.is-error', {
          text: state.reason
            ? `${t('lol.live.champion.v3.apply-failed')} (${state.reason})`
            : t('lol.live.champion.v3.apply-failed'),
        })
        : null,
    ]);
  };

  return h('section.live-panel.live-panel--actions', {}, [
    h('header.live-panel__head', {}, [
      h('div.live-panel__titles', {}, [
        h('h3.live-panel__title', { text: t('lol.live.champion.v3.the-recommended-mastery-page-is-applied') }),
      ]),
    ]),
    h('div.live-actions', {}, [
      button('runes', t('lol.live.champion.v3.runes'), onRunes),
      button('build', LOCAL.build, onBuild),
      button('spells', LOCAL.spells, onSpells),
    ]),
  ]);
}
