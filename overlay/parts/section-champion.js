/**
 * Champion card — portrait, name, level and the live OP.GG tier badge.
 */
import { h, image } from './dom.js';
import { championIcon, championMeta } from './assets.js';

export const meta = {
  id: 'champion',
  titleKey: 'overlay.lol.champion',
  /** The champion card is part of the header strip, not a togglable panel. */
  header: true,
};

export function render(ctx) {
  const { state, t } = ctx;
  const champion = state.champion || null;

  if (!champion || champion.id === null || champion.id === undefined) {
    return h('div', { class: 'hud-champ hud-champ--empty' }, h('span', { class: 'hud-champ__placeholder' }));
  }

  const name = champion.name || (championMeta(champion.id) || {}).name || '';
  const meta_ = championMeta(champion.id);
  const portrait = championIcon(champion.id, name);
  const tier = champion.tier || null;

  const tierBadge = tier
    ? h(
        'span',
        {
          class: `hud-tier hud-tier--${tier.letterClass || tier.className}`,
          title: `${t('lol.live.champion.v3.tier-2')}: ${tier.grade}`,
        },
        tier.letter || tier.label,
      )
    : null;

  const level = champion.level !== null && champion.level !== undefined
    ? h('span', { class: 'hud-champ__level' }, `${t('local.level')} ${champion.level}`)
    : null;

  return h(
    'div',
    { class: 'hud-champ' },
    portrait ? image(portrait, name, 'hud-champ__portrait') : null,
    h(
      'div',
      { class: 'hud-champ__meta' },
      h('span', { class: 'hud-champ__name', title: name }, name),
      h('span', { class: 'hud-champ__sub' }, level, meta_ && meta_.key ? h('span', { class: 'hud-champ__key' }, meta_.key) : null),
    ),
    tierBadge,
  );
}
