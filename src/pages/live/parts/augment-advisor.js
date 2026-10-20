/**
 * Live companion — augment advisor (Arena / ARAM: Mayhem).
 *
 * The reference lists the augments of the current champion, grouped by
 * rarity, behind a search box and a rarity filter. The augment catalogue
 * (`/api/meta/augments`) supplies the icon, the name and the description;
 * the arena champion-detail endpoint supplies the per-champion ranking.
 *
 * Reference copy:
 *   - `common.Augment`                          → "Augment"
 *   - `lol.live.champion.v3.search-augment`     → "Search Augments"
 *   - `lol.live.champion.v3.no-results`         → "No results"
 *   - `common.lol.tier.silver` / `common.lol.tier.gold` / `lol.augment.prism`
 *   - `common.all`                              → "All"
 */

import { h } from '../../../core/dom.js';
import { icon, pill } from './ui.js';
import { RARITY } from '../data.js';

/** Rarity filter definitions, in the reference's order. */
const RARITY_FILTERS = [
  { value: 'all', labelKey: 'common.all' },
  { value: RARITY.SILVER, labelKey: 'common.lol.tier.silver' },
  { value: RARITY.GOLD, labelKey: 'common.lol.tier.gold' },
  { value: RARITY.PRISMATIC, labelKey: 'lol.augment.prism' },
];

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {Array} options.augments normalised augments
 * @param {string} options.query current search text
 * @param {string} options.rarity active rarity filter
 * @param {number|null} [options.expandedId] the augment whose details are open
 * @param {(query: string) => void} options.onQuery
 * @param {(rarity: string) => void} options.onRarity
 * @param {(id: number) => void} [options.onToggle]
 * @param {boolean} [options.loading]
 * @returns {HTMLElement}
 */
export function renderAugmentAdvisor({
  t, augments, query, rarity, expandedId = null, onQuery, onRarity, onToggle, loading = false,
}) {
  const tabs = RARITY_FILTERS.map((filter) => h('button.live-tab', {
    type: 'button',
    class: rarity === filter.value ? 'is-active' : '',
    on: { click: () => onRarity(filter.value) },
  }, [h('span.live-tab__label', { text: t(filter.labelKey) })]));

  const search = h('div.live-search', {}, [
    h('input.live-search__input', {
      type: 'search',
      value: query,
      placeholder: t('lol.live.champion.v3.search-augment'),
      'aria-label': t('lol.live.champion.v3.search-augment'),
      'data-focus-key': 'live-augment-search',
      on: { input: (event) => onQuery(event.target.value) },
    }),
  ]);

  const rows = augments.map((augment) => renderAugmentRow(t, augment, expandedId, onToggle));

  const body = loading
    ? h('p.live-empty', { text: t('lol.live.champion.v3.loading-augment-information') })
    : (rows.length
      ? h('div.live-augments__list', {}, rows)
      : h('p.live-empty', { text: t('lol.live.champion.v3.no-results') }));

  return h('section.live-panel.live-panel--augments', {}, [
    h('header.live-panel__head', {}, [
      h('div.live-panel__titles', {}, [
        h('h3.live-panel__title', { text: t('common.Augment') }),
      ]),
      h('div.live-panel__actions.live-tabs', {}, tabs),
    ]),
    search,
    body,
  ]);
}

/**
 * One augment row: the compact chip plus the optional detail block.
 * @returns {HTMLElement}
 */
function renderAugmentRow(t, augment, expandedId, onToggle) {
  const expanded = expandedId === augment.id;

  const row = h('div.live-augment', { class: expanded ? 'is-expanded' : '' }, [
    icon({
      src: augment.smallIcon || augment.icon,
      alt: augment.name,
      className: 'live-icon--augment',
    }),
    h('button.live-augment__button', {
      type: 'button',
      'aria-expanded': expanded ? 'true' : 'false',
      on: {
        click: () => {
          if (onToggle) onToggle(augment.id);
        },
      },
    }, [
      h('span.live-augment__text', {}, [
        h('span.live-augment__name', { text: augment.name || `#${augment.id}` }),
        h('span.live-augment__meta', {}, [
          pill(augment.rarity, { tone: `rarity-${augment.rarity.toLowerCase()}` }),
          augment.rank ? h('span.live-augment__rank', { text: augment.rank }) : null,
          augment.winRate !== null && augment.winRate !== undefined
            ? h('span.live-augment__stat.tabular', { text: `${(augment.winRate * 100).toFixed(2)}%` })
            : null,
          augment.play
            ? h('span.live-augment__stat.tabular', { text: `${t('common.Games')} ${augment.play}` })
            : null,
        ]),
      ]),
    ]),
  ]);

  if (expanded) {
    row.appendChild(h('div.live-augment__detail', {}, [
      augment.icon
        ? icon({ src: augment.icon, alt: augment.name, className: 'live-icon--augment-large' })
        : null,
      h('p.live-augment__description', {
        text: augment.description || t('lol.live.champion.v3.no-augment-stats-for-this-champion'),
      }),
    ]));
  }

  return row;
}
