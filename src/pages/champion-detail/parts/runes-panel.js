/**
 * Champion detail — runes panel.
 *
 * The recommended rune page: keystone, the three primary-tree rows, the two
 * secondary-tree rows and the three stat shards — a four-row grid of square
 * perk icons with hover tooltips, exactly like the reference's rune block.
 *
 * The panel title is the reference's `lol.common.champion.export-rune`
 * ("Export Rune Build"); the tooltip toggle uses
 * `lol.champions.rune-advice.toggle` ("Rune tips") and the hint below the grid
 * uses `lol.champions.rune-modify`.
 */

import { h } from '../../../core/dom.js';
import { runeImageUrls, shardImageUrls, camelToKebab, formatRate } from '../data.js';
import { createIconBox, emptyState, safeT } from './common.js';

const ADVICE_PREFIX = 'lol.champions.rune-advice.';

/** The reference's rune-advice copy for a perk, or an empty string. */
function adviceFor(t, perk) {
  if (!perk || !perk.key) return '';
  return safeT(t, `${ADVICE_PREFIX}${camelToKebab(perk.key)}`, null, '');
}

/**
 * @param {{ t: Function, model: object, tooltip: object }} ctx
 * @returns {HTMLElement}
 */
export function renderRunesPanel(ctx) {
  const { t, model, tooltip } = ctx;

  const pages = Array.isArray(model.runes) ? model.runes : [];
  let pageIndex = 0;
  let showTips = false;

  const body = h('div.cd-panel__body');
  const panel = h('section.cd-panel.cd-panel--runes', null, [
    h('div.cd-panel__head', null, [
      h('h3.cd-panel__title', { text: t('lol.common.champion.export-rune') }),
      h('button.cd-toggle', {
        type: 'button',
        'aria-pressed': 'false',
        on: {
          click: () => {
            showTips = !showTips;
            panel.querySelector('.cd-toggle').setAttribute('aria-pressed', showTips ? 'true' : 'false');
            panel.querySelector('.cd-toggle').classList.toggle('is-active', showTips);
            render();
          },
        },
        text: t('lol.champions.rune-advice.toggle'),
      }),
    ]),
    body,
  ]);

  /** One perk icon with its tooltip. */
  function perkIcon(perk, kind) {
    const label = perk.name || (perk.id !== null ? `Rune ${perk.id}` : 'Rune');
    const urls = kind === 'shard' ? shardImageUrls(perk.id) : runeImageUrls(perk, model.version);
    const icon = createIconBox(urls, {
      alt: label,
      initials: (label || '?').charAt(0),
      className: `cd-icon--${kind}`,
    });

    const button = h(`button.cd-perk.cd-perk--${kind}`, {
      type: 'button',
      'aria-label': label,
    }, [icon]);

    const advice = adviceFor(t, perk);
    tooltip.attach(button, {
      title: label,
      body: perk.shortDesc || perk.longDesc || '',
      note: showTips ? advice : '',
    });

    return button;
  }

  /** One row of the grid. */
  function row(kind, label, perks) {
    return h('div.cd-runes__row', null, [
      h('span.cd-runes__label', { text: label || '' }),
      h('div.cd-runes__icons', null, perks.map((perk) => perkIcon(perk, kind))),
    ]);
  }

  function render() {
    while (body.firstChild) body.removeChild(body.firstChild);

    if (!pages.length) {
      body.appendChild(emptyState(t('lol.live.champion.v3.no-rune-stats-for-this-lane')));
      return;
    }

    const page = pages[Math.min(pageIndex, pages.length - 1)];
    const primary = page.primaryPerks || [];
    const secondary = page.secondaryPerks || [];
    const shards = page.shards || [];

    const grid = h('div.cd-runes', null, [
      row('keystone', t('lol.common.gameMode.mainRune'), primary.slice(0, 1)),
      row('primary', null, primary.slice(1, 4)),
      row('secondary', t('lol.common.gameMode.subRune'), secondary.slice(0, 2)),
      row('shard', null, shards.slice(0, 3)),
    ]);

    body.appendChild(grid);

    if (pages.length > 1) {
      const chips = h('div.cd-runes__pages', null, pages.slice(0, 6).map((entry, index) => h(
        'button.cd-chip',
        {
          type: 'button',
          class: index === pageIndex ? 'is-active' : '',
          on: { click: () => { pageIndex = index; render(); } },
        },
        [
          h('span.cd-chip__label', { text: t('lol.live.champion.v3.rune-set', { n: index + 1 }) }),
          h('span.cd-chip__value', { text: formatRate(entry.pickRate, 1) }),
        ],
      )));
      body.appendChild(chips);
    }

    if (showTips) {
      body.appendChild(h('p.cd-runes__note', { text: t('lol.champions.rune-modify') }));
    }
  }

  render();
  return panel;
}
