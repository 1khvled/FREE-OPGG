/**
 * Skill row — the Q/W/E/R priority order and the full skill-point sequence.
 *
 * Reference copy: `lol.common.champion.skill-builds`.
 */
import { h } from './dom.js';
import { errorState, loadingState } from './feedback.js';

export const meta = {
  id: 'skills',
  titleKey: 'lol.common.champion.skill-builds',
};

const SKILL_KEYS = ['Q', 'W', 'E', 'R'];

export function render(ctx) {
  const { state, t } = ctx;
  const detail = state.detail;
  const skills = detail && detail.skills;

  const body = h('div', { class: 'hud-skills__body' });

  if (state.errors && state.errors.detail) {
    body.appendChild(errorState(ctx, t('overlay.lol.could-not-check-due-to-a')));
  } else if (state.loading && state.loading.detail) {
    body.appendChild(loadingState(ctx, t('lol.live.champion.v3.loading-skill-information')));
  } else if (!skills || !skills.order.length) {
    body.appendChild(
      h('div', { class: 'hud-empty' }, t('lol.live.champion.v3.loading-skill-information')),
    );
  } else {
    const priority = h(
      'div',
      { class: 'hud-skills__priority' },
      ...SKILL_KEYS.map((key) => {
        const position = skills.order.indexOf(key);
        const active = position >= 0;
        return h(
          'span',
          {
            class: `hud-skill hud-skill--${key.toLowerCase()}${active ? ' is-active' : ''}`,
            title: active ? `${key} · ${position + 1}` : key,
          },
          key,
          active ? h('span', { class: 'hud-skill__rank' }, String(position + 1)) : null,
        );
      }),
    );

    const sequence = h(
      'div',
      { class: 'hud-skills__sequence', title: skills.sequence.join(' > ') },
      ...skills.sequence.map((key, index) =>
        h(
          'span',
          {
            class: `hud-skill hud-skill--${key.toLowerCase()} hud-skill--seq${
              skills.order[0] === key ? ' is-first' : ''
            }`,
          },
          key,
        ),
      ),
    );

    body.appendChild(priority);
    body.appendChild(sequence);
  }

  return h(
    'section',
    { class: 'hud-panel hud-panel--skills', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
    ),
    body,
  );
}
