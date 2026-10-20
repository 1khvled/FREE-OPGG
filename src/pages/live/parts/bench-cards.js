/**
 * Live companion — ARAM bench (reroll) cards.
 *
 * The reference's `g.gY` bench strip, enriched with the OP.GG data the
 * replica can reach: the champion portrait, the tier badge, the ARAM win
 * rate, the keystone rune and the recommended starter items.
 *
 * Every figure comes from a live endpoint; when a value is not available the
 * corresponding element is simply not rendered.
 *
 * Reference copy:
 *   - `lol.live.champion.v3.apply`         → "Apply"
 *   - `lol.live.champion.v3.applying`      → "Applying..."
 *   - `lol.live.champion.v3.apply-failed`  → "Apply failed"
 */

import { h } from '../../../core/dom.js';
import { portrait, tierChip, pill, icon, emptyState } from './ui.js';
import { LOCAL } from '../strings.js';

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {Array} options.slots enriched bench slots
 * @param {number|null} [options.pendingId] champion id currently being swapped
 * @param {number|null} [options.failedId] champion id whose swap failed
 * @param {(championId: number) => void} options.onSwap
 * @returns {HTMLElement}
 */
export function renderBenchCards({ t, slots, pendingId = null, failedId = null, onSwap }) {
  if (!slots.length) {
    return h('section.live-panel.live-panel--bench', {}, [
      h('header.live-panel__head', {}, [
        h('div.live-panel__titles', {}, [
          h('h3.live-panel__title', { text: LOCAL.swap }),
        ]),
      ]),
      emptyState(LOCAL.nothingOnTheBench),
    ]);
  }

  const cards = slots.map((slot) => renderBenchCard({
    t, slot, pending: pendingId === slot.championId, failed: failedId === slot.championId, onSwap,
  }));

  return h('section.live-panel.live-panel--bench', {}, [
    h('header.live-panel__head', {}, [
      h('div.live-panel__titles', {}, [
        h('h3.live-panel__title', { text: LOCAL.swap }),
      ]),
    ]),
    h('div.live-bench__grid', {}, cards),
  ]);
}

/**
 * @returns {HTMLElement}
 */
function renderBenchCard({ t, slot, pending, failed, onSwap }) {
  const classes = ['live-bench-card'];
  if (!slot.available) classes.push('is-unavailable');
  if (pending) classes.push('is-pending');

  const action = h('button.live-button.live-button--apply', {
    type: 'button',
    disabled: pending || !slot.available,
    title: LOCAL.swap,
    on: {
      click: (event) => {
        event.stopPropagation();
        onSwap(slot.championId);
      },
    },
  }, [
    h('span.live-button__label', {
      text: pending
        ? t('lol.live.champion.v3.applying')
        : (failed ? t('lol.live.champion.v3.apply-failed') : t('lol.live.champion.v3.apply')),
    }),
  ]);

  return h('article.live-bench-card', { class: classes }, [
    h('div.live-bench-card__head', {}, [
      portrait({
        src: slot.image,
        name: slot.name || '?',
        className: 'live-bench-card__portrait',
        dimmed: !slot.available,
      }),
      h('div.live-bench-card__badges', {}, [
        slot.tier !== null && slot.tier !== undefined
          ? tierChip(slot.tier, slot.tierLabel || t('lol.live.champion.v3.tier', { n: slot.tier }))
          : null,
        slot.balance
          ? pill(
            slot.balance === 'buff' ? t('lol.buff-nerf.buff') : t('lol.buff-nerf.nerf'),
            { tone: slot.balance },
          )
          : null,
      ]),
    ]),
    h('span.live-bench-card__name', { text: slot.name || `#${slot.championId}` }),
    slot.winRate !== null && slot.winRate !== undefined
      ? h('span.live-bench-card__winrate.tabular', {
        text: `${t('lol.champions.win-rate')} ${(slot.winRate * 100).toFixed(2)}%`,
      })
      : null,
    slot.keystone
      ? h('div.live-bench-card__keystone', { title: slot.keystone.name }, [
        icon({ src: slot.keystone.icon, alt: slot.keystone.name, className: 'live-icon--rune' }),
        h('span.live-bench-card__keystone-name', { text: slot.keystone.name }),
      ])
      : null,
    slot.starterItems && slot.starterItems.length
      ? h('div.live-bench-card__items', { title: LOCAL.starterItems }, slot.starterItems.map((item) => (
        icon({ src: item.icon, alt: item.name, className: 'live-icon--item' })
      )))
      : null,
    action,
  ]);
}
