/**
 * Build row — recommended starter / core / boots / situational items.
 *
 * Reference copy: `lol.common.champion.core-items`, `lol.common.champion.boots`.
 */
import { h, image } from './dom.js';
import { itemIcon, itemMeta } from './assets.js';
import { errorState, loadingState } from './feedback.js';

export const meta = {
  id: 'build',
  titleKey: 'lol.common.champion.core-items',
};

function itemChip(id) {
  const info = itemMeta(id);
  const name = info ? info.name || String(id) : String(id);
  const description = info ? info.description || '' : '';
  return h(
    'span',
    { class: 'hud-item', title: description ? `${name}\n${description}` : name },
    image(itemIcon(id), name, 'hud-item__icon'),
  );
}

function itemGroup(ids) {
  return h('div', { class: 'hud-build__group' }, ...ids.map((id) => itemChip(id)));
}

export function render(ctx) {
  const { state, t, actions } = ctx;
  const detail = state.detail;
  const build = detail && detail.build;

  const groups = h('div', { class: 'hud-build__groups' });

  if (state.errors && state.errors.detail) {
    groups.appendChild(errorState(ctx, t('overlay.lol.could-not-check-due-to-a')));
  } else if (state.loading && state.loading.detail) {
    groups.appendChild(loadingState(ctx, t('lol.live.champion.v3.loading-item-information')));
  } else if (!build || (!build.starter.length && !build.core.length && !build.boots.length && !build.situational.length)) {
    groups.appendChild(
      h('div', { class: 'hud-empty' }, t('overlay.lol.starting-item-data-is-not-available')),
    );
  } else {
    const rows = [
      { label: t('lol.common.champion.starter-item'), ids: build.starter[0] || [] },
      { label: t('lol.common.champion.core-items'), ids: build.core[0] || [] },
      { label: t('lol.common.champion.boots'), ids: build.boots[0] || [] },
      { label: t('overlay.lol.situational'), ids: build.situational[0] || [] },
    ].filter((row) => row.ids.length > 0);

    for (const row of rows) {
      groups.appendChild(
        h(
          'div',
          { class: 'hud-build__row' },
          h('span', { class: 'hud-build__label' }, row.label),
          itemGroup(row.ids),
        ),
      );
    }
  }

  const apply = h(
    'button',
    {
      class: 'hud-btn hud-btn--ghost hud-interactive',
      type: 'button',
      title: t('lol.live.champion.v3.apply'),
      onclick: () => actions.applyBuild(),
    },
    t('lol.live.champion.v3.apply'),
  );

  return h(
    'section',
    { class: 'hud-panel hud-panel--build', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
      apply,
    ),
    groups,
  );
}
