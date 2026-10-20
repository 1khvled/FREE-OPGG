/**
 * Champion detail — header.
 *
 * Portrait, name (display font), champion title, tier chip, the stat strip
 * (win / pick / ban rate, matches, KDA) and the patch trend. The numeric cells
 * use the reference's 12px muted tabular-nums styling.
 */

import { h } from '../../../core/dom.js';
import { championImageUrls, tierInfo, formatRate, formatCount } from '../data.js';
import { createIconBox, statCell, initialsOf } from './common.js';

/**
 * @param {{ t: Function, model: object }} ctx
 * @returns {HTMLElement}
 */
export function renderHeader(ctx) {
  const { t, model } = ctx;
  const champion = model.champion;
  const stats = model.stats;
  const tier = tierInfo(stats.tier);

  const portrait = h('div.cd-portrait');
  portrait.appendChild(createIconBox(championImageUrls(champion, model.version), {
    alt: champion.name || '',
    initials: initialsOf(champion.name || champion.key || ''),
    className: 'cd-icon--portrait',
  }));

  const tierChip = h('span.cd-tier', {
    style: `--cd-tier: var(${tier.token});`,
    text: tier.label,
  });

  const titleRow = h('div.cd-header__title-row', null, [
    h('h2.cd-name', { text: champion.name || (champion.id !== null ? `#${champion.id}` : '-') }),
    tierChip,
    stats.tierRank !== null
      ? h('span.cd-tier-rank', { text: `#${stats.tierRank}` })
      : null,
  ]);

  const metaRow = h('div.cd-header__meta', null, [
    champion.title ? h('span.cd-title', { text: champion.title }) : null,
    model.position ? h('span.cd-position', { text: model.position.toUpperCase() }) : null,
  ]);

  const statStrip = h('div.cd-stats', null, [
    statCell(t('lol.champions.win-rate'), formatRate(stats.winRate)),
    statCell(t('lol.champions.pick-rate'), formatRate(stats.pickRate)),
    statCell(t('lol.champions.ban-rate'), formatRate(stats.banRate)),
    statCell(t('common.matches'), formatCount(stats.matches)),
    stats.kda !== null ? statCell(t('common.avg-kda'), stats.kda.toFixed(2)) : null,
  ]);

  const children = [titleRow, metaRow, statStrip];

  // The endpoint is per lane: when the requested lane has no data the
  // champion's average statistics are shown instead — say so.
  if (model.laneFallback && model.position) {
    children.push(h('p.cd-note', {
      text: t('lol.live.champion.v3.tier-from-other-lane', {
        n: tier.label,
        lane: model.position.toUpperCase(),
      }),
    }));
  }

  // Patch trend — the reference's win-rate history.
  const trend = (model.trends || []).slice(0, 5);
  if (trend.length) {
    children.push(h('div.cd-trend', null, trend.map((point) => h('span.cd-trend__point', null, [
      h('span.cd-trend__version', { text: point.version || '-' }),
      h('span.cd-trend__rate', { text: formatRate(point.rate) }),
    ]))));
  }

  return h('header.cd-header', null, [
    portrait,
    h('div.cd-header__info', null, children),
  ]);
}
