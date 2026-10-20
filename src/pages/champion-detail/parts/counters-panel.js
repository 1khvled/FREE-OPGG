/**
 * Champion detail — counters panel.
 *
 * Two columns — strong against and weak against — each with three champion
 * portraits and their match-up win rate, exactly like the reference's counter
 * block (red for the hard counters, blue for the favourable ones).
 *
 * Labels: `lol.champions.strong-against` / `lol.champions.weak-against`.
 */

import { h } from '../../../core/dom.js';
import { championById, championImageUrls, formatRate } from '../data.js';
import { createIconBox, emptyState, initialsOf } from './common.js';

const COUNTER_COUNT = 3;

/**
 * @param {{ t: Function, model: object, tooltip: object }} ctx
 * @returns {HTMLElement}
 */
export function renderCountersPanel(ctx) {
  const { t, model, tooltip } = ctx;
  const counters = model.counters || { strong: [], weak: [] };

  /** One counter entry: portrait + win rate. */
  function counterItem(entry, tone) {
    const known = championById(entry.championId);
    const label = entry.name || known?.name || `#${entry.championId}`;

    const portrait = createIconBox(championImageUrls(known, model.version), {
      alt: label,
      initials: initialsOf(label),
      className: 'cd-icon--counter',
    });

    const button = h('button.cd-counter', {
      type: 'button',
      class: `cd-counter--${tone}`,
      'aria-label': label,
    }, [
      portrait,
      h('span.cd-counter__stats', null, [
        h('span.cd-counter__label', { text: t('lol.common.win-ratio-short') }),
        h('span.cd-counter__value', { text: formatRate(entry.winRate) }),
      ]),
    ]);

    tooltip.attach(button, {
      title: label,
      body: entry.matches !== null
        ? `${formatRate(entry.winRate)} · ${entry.matches.toLocaleString('en-US')} ${t('lol.common.matches')}`
        : formatRate(entry.winRate),
    });

    return button;
  }

  function column(title, entries, tone) {
    const items = entries.slice(0, COUNTER_COUNT);
    return h('div.cd-counters__column', null, [
      h('div.cd-counters__title', { text: title }),
      items.length
        ? h('div.cd-counters__list', null, items.map((entry) => counterItem(entry, tone)))
        : emptyState(t('lol.champions.change-filter')),
    ]);
  }

  return h('section.cd-panel.cd-panel--counters', null, [
    h('div.cd-counters', null, [
      column(t('lol.champions.strong-against'), counters.strong || [], 'strong'),
      column(t('lol.champions.weak-against'), counters.weak || [], 'weak'),
    ]),
  ]);
}
