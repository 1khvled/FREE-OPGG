/**
 * ARAM bench strip — the bench champions with their tier badge and a
 * click-to-swap action.
 */
import { h, image } from './dom.js';
import { championIcon, championMeta } from './assets.js';
import { formatPercent } from './format.js';
import { errorState, loadingState } from './feedback.js';

export const meta = {
  id: 'bench',
  titleKey: 'local.bench',
};

export function render(ctx) {
  const { state, t, actions } = ctx;
  const bench = state.bench || [];

  const body = h('div', { class: 'hud-bench__body' });

  if (!bench.length) {
    body.appendChild(
      state.errors && state.errors.bench
        ? errorState(ctx, t('overlay.lol.could-not-check-due-to-a'))
        : h('div', { class: 'hud-empty' }, t('local.bench')),
    );
  } else {
    const cards = bench.map((entry) => {
      const info = championMeta(entry.championId);
      const name = (info && info.name) || `Champion ${entry.championId}`;
      const tier = entry.tier;

      const swap = h(
        'button',
        {
          class: 'hud-btn hud-btn--tiny hud-interactive',
          type: 'button',
          title: `${t('local.swap')} · ${name}`,
          disabled: entry.available === false,
          onclick: (event) => {
            event.stopPropagation();
            actions.swapBench(entry.championId);
          },
        },
        t('local.swap'),
      );

      const card = h(
        'div',
        {
          class: `hud-bench-card${entry.available === false ? ' is-unavailable' : ''}`,
          title: name,
        },
        image(championIcon(entry.championId, name), name, 'hud-bench-card__portrait'),
        h(
          'div',
          { class: 'hud-bench-card__meta' },
          h('span', { class: 'hud-bench-card__name' }, name),
          h(
            'span',
            { class: 'hud-bench-card__stats' },
            tier
              ? h(
                'span',
                {
                  class: `hud-tier hud-tier--${tier.letterClass || tier.className}`,
                  title: tier.label,
                },
                tier.letter || tier.label,
              )
              : null,
            entry.winRate !== null && entry.winRate !== undefined
              ? h('span', { class: 'hud-bench-card__wr' }, formatPercent(entry.winRate))
              : null,
          ),
        ),
        swap,
      );
      return card;
    });
    body.appendChild(h('div', { class: 'hud-bench__cards' }, ...cards));
  }

  return h(
    'section',
    { class: 'hud-panel hud-panel--bench', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
    ),
    body,
  );
}
