/**
 * Runes row — the recommended rune page: keystone, tree rows and shards.
 *
 * Reference copy: `lol.champions.rune-advice.toggle` ("Rune tips").
 */
import { h, image } from './dom.js';
import { runeIcon, runeMeta, runePageIcon, runePageMeta, shardIcon } from './assets.js';
import { errorState, loadingState } from './feedback.js';

export const meta = {
  id: 'runes',
  titleKey: 'lol.champions.rune-advice.toggle',
};

function runeChip(id, size) {
  const info = runeMeta(id);
  const title = info ? `${info.name || id}` : String(id);
  const description = info ? info.long_desc || info.description || '' : '';
  const el = h(
    'span',
    {
      class: `hud-rune hud-rune--${size}`,
      title: description ? `${title}\n${description}` : title,
    },
    image(runeIcon(id), title, 'hud-rune__icon'),
  );
  return el;
}

function shardChip(id) {
  const el = h(
    'span',
    { class: 'hud-rune hud-rune--shard', title: String(id) },
    image(shardIcon(id), String(id), 'hud-rune__icon'),
  );
  return el;
}

function treeChip(id) {
  if (id === null || id === undefined) return null;
  const info = runePageMeta(id);
  const title = info ? info.name || String(id) : String(id);
  return h(
    'span',
    { class: 'hud-rune hud-rune--tree', title },
    image(runePageIcon(id), title, 'hud-rune__icon'),
  );
}

export function render(ctx) {
  const { state, t, actions } = ctx;
  const detail = state.detail;
  const runes = detail && detail.runes;

  const body = h('div', { class: 'hud-runes__body' });

  if (state.errors && state.errors.detail) {
    body.appendChild(errorState(ctx, t('overlay.lol.could-not-check-due-to-a')));
  } else if (state.loading && state.loading.detail) {
    body.appendChild(loadingState(ctx, t('lol.live.champion.v3.loading-rune-information')));
  } else if (!runes || (!runes.primary.length && !runes.secondary.length && !runes.shards.length)) {
    body.appendChild(
      h('div', { class: 'hud-empty' }, t('lol.live.champion.v3.no-recommended-runes')),
    );
  } else {
    const primary = h(
      'div',
      { class: 'hud-runes__tree hud-runes__tree--primary' },
      treeChip(runes.primaryTree),
      ...runes.primary.map((rune) => runeChip(rune.id, 'major')),
    );
    const secondary = h(
      'div',
      { class: 'hud-runes__tree hud-runes__tree--secondary' },
      treeChip(runes.secondaryTree),
      ...runes.secondary.map((rune) => runeChip(rune.id, 'minor')),
    );
    const shards = h(
      'div',
      { class: 'hud-runes__shards' },
      ...runes.shards.map((shard) => shardChip(shard.id)),
    );

    body.appendChild(primary);
    body.appendChild(secondary);
    if (runes.shards.length) body.appendChild(shards);
  }

  const apply = h(
    'button',
    {
      class: 'hud-btn hud-btn--ghost hud-interactive',
      type: 'button',
      title: t('lol.live.champion.v3.apply'),
      onclick: () => actions.applyRunes(),
    },
    t('lol.live.champion.v3.apply'),
  );

  return h(
    'section',
    { class: 'hud-panel hud-panel--runes', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
      apply,
    ),
    body,
  );
}
