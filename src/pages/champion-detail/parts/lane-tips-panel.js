/**
 * Champion detail — lane tips.
 *
 * The reference's champion page carries a "Lane Tips" section: a short, lane
 * specific tip for the champion, sourced from its match-up analysis.
 *
 * The replica has no match-up-analysis endpoint, so the tip is *derived* from
 * the counters the page already loads: the opponent with the lowest matchup
 * win rate is the champion's hardest counter, and the tip says the lane is
 * losing to it. The win rate and the game count quoted are that counter's own
 * real numbers — nothing is invented.
 *
 * Reference keys: `lol.common.champion.line-tip` (the section title),
 * `lol.common.champion.tip-no-data` (the empty state) and
 * `common.lol.champions-one-trick-unavailable` (no records for the selected
 * position or opponent).
 */

import { h } from '../../../core/dom.js';
import { championById, championImageUrls, formatRate, formatCount } from '../data.js';
import { createIconBox, emptyState, initialsOf } from './common.js';

/**
 * @param {{ t: Function, model: object, tooltip: object }} ctx
 * @returns {HTMLElement}
 */
export function renderLaneTipsPanel(ctx) {
  const { t, model, tooltip } = ctx;
  const counters = Array.isArray(model.counters?.all) ? model.counters.all : [];

  const body = h('div.cd-panel__body');

  if (!counters.length) {
    // No counter data at all — the reference shows its "no tips" placeholder.
    body.appendChild(emptyState(t('lol.common.champion.tip-no-data')));
  } else {
    // The hardest counter is the opponent with the lowest matchup win rate.
    const rated = counters
      .filter((entry) => Number.isFinite(entry.winRate))
      .sort((a, b) => a.winRate - b.winRate);

    if (!rated.length) {
      // Counter rows exist, but none of them carries a record for the
      // selected position.
      body.appendChild(emptyState(t('common.lol.champions-one-trick-unavailable')));
    } else {
      const hardest = rated[0];
      const known = championById(hardest.championId);
      const name = hardest.name || known?.name || `#${hardest.championId}`;

      const portrait = createIconBox(championImageUrls(known, model.version), {
        alt: name,
        initials: initialsOf(name),
        className: 'cd-icon--counter',
      });

      const stats = h('div.cd-lane-tip__stats', null, [
        h('span.cd-lane-tip__stat', null, [
          h('span.cd-lane-tip__label', { text: t('lol.champions.win-rate') }),
          h('span.cd-lane-tip__value', { text: formatRate(hardest.winRate) }),
        ]),
        hardest.matches !== null
          ? h('span.cd-lane-tip__stat', null, [
            h('span.cd-lane-tip__label', { text: t('lol.common.matches') }),
            h('span.cd-lane-tip__value', { text: formatCount(hardest.matches) }),
          ])
          : null,
      ]);

      const row = h('div.cd-lane-tip', null, [
        portrait,
        h('div.cd-lane-tip__main', null, [
          h('p.cd-lane-tip__sentence', { text: t('app.laneTip.losing', { champion: name }) }),
          stats,
        ]),
      ]);

      tooltip.attach(row, {
        title: name,
        body: `${t('lol.champions.win-rate')} ${formatRate(hardest.winRate)}`,
      });

      body.appendChild(row);
    }
  }

  return h('section.cd-panel.cd-panel--lane-tips', null, [
    h('div.cd-panel__head', null, [
      h('h3.cd-panel__title', { text: t('lol.common.champion.line-tip') }),
    ]),
    body,
  ]);
}

export default renderLaneTipsPanel;
