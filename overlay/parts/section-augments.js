/**
 * Augment advisor — the augments that fit the current champion, with their
 * rarity and tier.
 *
 * Reference copy: `overlay.common.lol-mayhem-augments` ("Augment Tier"),
 * `overlay.lol.unable-to-load-augments`.
 */
import { h, image } from './dom.js';
import { augmentIcon } from './assets.js';
import { formatPercent } from './format.js';
import { errorState, loadingState } from './feedback.js';

export const meta = {
  id: 'augments',
  titleKey: 'overlay.common.lol-mayhem-augments',
};

const RARITY_CLASS = {
  prismatic: 'hud-augment--prismatic',
  gold: 'hud-augment--gold',
  silver: 'hud-augment--silver',
  normal: 'hud-augment--normal',
};

export function render(ctx) {
  const { state, t } = ctx;
  const detail = state.detail;
  const augments = (detail && detail.augments) || [];
  const loading = state.loading && state.loading.augments;

  const body = h('div', { class: 'hud-augments__body' });

  if (state.errors && state.errors.detail) {
    body.appendChild(errorState(ctx, t('overlay.lol.unable-to-load-augments')));
  } else if (!augments.length) {
    body.appendChild(
      h(
        'div',
        { class: 'hud-empty' },
        loading ? t('stratum.loading-first-augment') : t('overlay.lol.unable-to-load-augments'),
      ),
    );
  } else {
    const cards = augments.map((augment, index) =>
      h(
        'article',
        { class: `hud-augment ${RARITY_CLASS[augment.rarity] || RARITY_CLASS.normal}` },
        h(
          'header',
          { class: 'hud-augment__head' },
          augment.icon || augmentIcon(augment.id)
            ? image(augment.icon || augmentIcon(augment.id), augment.name, 'hud-augment__icon')
            : null,
          h(
            'div',
            { class: 'hud-augment__titlebox' },
            h('span', { class: 'hud-augment__name' }, augment.name),
            h('span', { class: 'hud-augment__rarity' }, augment.rarityLabel),
          ),
          augment.tier
            ? h(
              'span',
              {
                class: `hud-tier hud-tier--${augment.tier.letterClass || augment.tier.className}`,
                title: augment.tier.label,
              },
              augment.tier.letter || augment.tier.label,
            )
            : null,
        ),
        augment.description
          ? h('p', { class: 'hud-augment__desc' }, augment.description)
          : null,
        h(
          'footer',
          { class: 'hud-augment__foot' },
          augment.winRate !== null && augment.winRate !== undefined
            ? h('span', { class: 'hud-augment__wr' }, formatPercent(augment.winRate))
            : null,
          augment.pickRate !== null && augment.pickRate !== undefined
            ? h('span', { class: 'hud-augment__pr' }, t('overlay.lol.pick', { n: (augment.pickRate * 100).toFixed(1) }))
            : null,
          h('span', { class: 'hud-augment__index' }, t('overlay.lol.recommendation', { n: index + 1 })),
        ),
      ),
    );
    body.appendChild(h('div', { class: 'hud-augments__cards' }, ...cards));
  }

  return h(
    'section',
    { class: 'hud-panel hud-panel--augments', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
    ),
    body,
  );
}
