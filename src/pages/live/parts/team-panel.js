/**
 * Live companion — team panel.
 *
 * One column of the draft board: the reference's `mn()` renderer. It shows
 * the five champion-select slots of a team and, underneath, the ban row.
 *
 * Reference behaviour reproduced here:
 *   - a slot that has nothing picked yet shows the "Choosing" state;
 *   - a slot with a hovered-but-unlocked champion shows the champion in
 *     italics (the reference's `intent` styling) and the "WAITING FOR PICK"
 *     eyebrow;
 *   - the local player's slot is tinted and carries the "ME" badge;
 *   - the assigned position is shown as a role badge, with an "est." marker
 *     when the position had to be inferred;
 *   - banned champions are greyed out and carry the "Ban {{n}}" label.
 */

import { h } from '../../../core/dom.js';
import { portrait, tierChip } from './ui.js';

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {string} options.title           "My team" / "Enemy team"
 * @param {Array} options.slots            normalised slots
 * @param {number[]} options.bans          champion ids, in ban order
 * @param {boolean} [options.mirrored]     true for the enemy column
 * @param {{team: string, index: number}|null} [options.actingBan]
 * @param {(championId: number) => void} [options.onSelect]
 * @param {(championId: number, slot: object) => string} options.championName
 * @param {(championId: number, slot: object) => string} options.championImage
 * @param {(championId: number) => number|null} [options.championTier]
 * @returns {HTMLElement}
 */
export function renderTeamPanel({
  t,
  title,
  slots,
  bans = [],
  mirrored = false,
  actingBan = null,
  onSelect = null,
  championName,
  championImage,
  championTier = null,
}) {
  const rows = slots.map((slot) => renderSlot({
    t, slot, mirrored, onSelect, championName, championImage, championTier,
  }));

  return h('div.live-team', { class: mirrored ? 'is-mirrored' : '' }, [
    h('header.live-team__head', {}, [
      h('h3.live-team__title', { text: title }),
      h('span.live-team__count.tabular', { text: String(slots.length) }),
    ]),
    h('div.live-team__slots', {}, rows),
    bans.length ? renderBans({ t, bans, mirrored, actingBan, championName, championImage }) : null,
  ]);
}

/**
 * One champion-select slot.
 * @returns {HTMLElement}
 */
function renderSlot({ t, slot, mirrored, onSelect, championName, championImage, championTier }) {
  const locked = slot.isLocked && slot.championId > 0;
  const hovered = !locked && (slot.isHovered || slot.intentChampionId > 0);
  const shownId = locked ? slot.championId : (slot.intentChampionId || 0);

  const name = shownId ? championName(shownId, slot) : '';
  const image = shownId ? championImage(shownId, slot) : '';
  const tierInfo = shownId && championTier ? championTier(shownId) : null;

  const classes = ['live-slot'];
  if (slot.isMe) classes.push('is-me');
  if (slot.isActing) classes.push('is-acting');
  if (hovered) classes.push('is-hovered');
  if (locked) classes.push('is-locked');
  if (mirrored) classes.push('is-mirrored');

  // A slot that carries a champion but whose name is unknown falls back to
  // the champion id — never to the "Choosing" state.
  const label = name
    ? name
    : (shownId ? `#${shownId}` : t('lol.live.champion.v3.choosing'));

  const children = [
    portrait({ src: image, name: name || '?', className: 'live-slot__portrait' }),
    h('div.live-slot__text', {}, [
      hovered
        ? h('span.live-slot__eyebrow', { text: t('lol.live.champion.v3.idle.eyebrow') })
        : null,
      h('span.live-slot__name', {
        class: hovered ? 'is-intent' : '',
        text: label,
      }),
      h('span.live-slot__meta', {}, [
        slot.position
          ? h('span.live-role', { text: slot.position })
          : h('span.live-role.live-role--empty', { text: '—' }),
        slot.isLaneEstimated
          ? h('span.live-slot__est', { text: t('lol.live.champion.v3.est') })
          : null,
        slot.isMe
          ? h('span.live-badge.live-badge--me', { text: t('lol.live.champion.v3.me') })
          : null,
      ]),
    ]),
    tierInfo
      ? tierChip(tierInfo.tier, tierInfo.label || t('lol.live.champion.v3.tier', { n: tierInfo.tier }))
      : null,
  ];

  const row = h('div.live-slot', { class: classes }, children);

  if (onSelect && shownId) {
    row.classList.add('is-clickable');
    row.addEventListener('click', () => onSelect(shownId));
  }

  return row;
}

/**
 * The ban row: greyed portraits plus the reference's ban label.
 * @returns {HTMLElement}
 */
function renderBans({ t, bans, mirrored, actingBan, championName, championImage }) {
  const slots = bans.map((championId, index) => {
    const label = championId > 0
      ? t('lol.live.champion.v3.ban-with-champion', { n: index + 1, champion: championName(championId) })
      : t('lol.live.champion.v3.ban', { n: index + 1 });

    const acting = Boolean(actingBan && actingBan.index === index);

    return h('div.live-ban', {
      class: acting ? 'is-acting' : '',
      title: label,
      'aria-label': label,
    }, [
      h('div.live-ban__portrait', {}, [
        championId > 0
          ? portrait({ src: championImage(championId), name: championName(championId), dimmed: true })
          : h('span.live-ban__empty', { 'aria-hidden': 'true' }),
      ]),
      h('span.live-ban__label', { text: t('lol.live.champion.v3.ban', { n: index + 1 }) }),
    ]);
  });

  return h('div.live-bans', { class: mirrored ? 'is-mirrored' : '' }, [
    h('span.live-bans__title', { text: t('lol.live.champion.v3.bans') }),
    h('div.live-bans__list', {}, slots),
  ]);
}
