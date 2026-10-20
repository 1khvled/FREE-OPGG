/**
 * Champion detail — build panel.
 *
 * Starter items, core items, boots and the situational ("last") items, each
 * rendered as an icon row with a hover tooltip carrying the item name and its
 * (HTML-stripped) description.
 *
 * Section titles are the reference's own keys:
 *   `lol.common.champion.starter-item`, `lol.common.champion.core-items`,
 *   `lol.common.champion.boots`, `lol.common.champion.recommend-item-builds`.
 */

import { h } from '../../../core/dom.js';
import { itemById, itemImageUrls, formatRate, formatCount, stripHtml } from '../data.js';
import { createIconBox, emptyState, section } from './common.js';

/**
 * @param {{ t: Function, model: object, tooltip: object }} ctx
 * @returns {HTMLElement}
 */
export function renderBuildPanel(ctx) {
  const { t, model, tooltip } = ctx;
  const builds = model.builds || {};

  /** One item icon with its tooltip. */
  function itemIcon(itemId, className = '') {
    const info = itemById(itemId);
    const label = info?.name || `#${itemId}`;
    const body = info?.plaintext || stripHtml(info?.description);
    const icon = createIconBox(itemImageUrls(itemId, model.version), {
      alt: label,
      initials: (label || '?').charAt(0),
      className: `cd-icon--item${className ? `.${className}` : ''}`,
    });
    const button = h('button.cd-item', { type: 'button', 'aria-label': label }, [icon]);
    tooltip.attach(button, { title: label, body });
    return button;
  }

  /** A build row: the item icons plus the aggregated rates. */
  function buildRow(entry, options = {}) {
    const { showRates = true } = options;
    const icons = h('div.cd-build__icons', null, entry.ids.map((id, index) => {
      const parts = [];
      if (index > 0) parts.push(h('span.cd-build__arrow', { text: '›' }));
      parts.push(itemIcon(id));
      return h('span.cd-build__item', null, parts);
    }));

    const rates = h('div.cd-build__rates', null, [
      showRates && entry.winRate !== null
        ? h('span.cd-build__rate', { text: `${t('common.win-rate')} ${formatRate(entry.winRate)}` })
        : null,
      showRates && entry.pickRate !== null
        ? h('span.cd-build__rate', { text: `${t('common.pick-rate-txt')} ${formatRate(entry.pickRate)}` })
        : null,
      entry.matches !== null
        ? h('span.cd-build__matches', { text: `${formatCount(entry.matches)} ${t('lol.common.matches')}` })
        : null,
    ]);

    return h('div.cd-build__row', null, [icons, rates]);
  }

  /** A titled group of build rows. */
  function group(title, entries, options = {}) {
    const head = options.head || null;
    const body = entries.length
      ? entries.map((entry) => buildRow(entry, options))
      : [emptyState(t('lol.champions.change-filter'))];
    return section(title, body, { className: `cd-panel--build${options.className ? `.${options.className}` : ''}`, head });
  }

  const starters = builds.starters || [];
  const core = builds.core || [];
  const boots = builds.boots || [];
  const last = builds.last || [];

  const wrapper = h('div.cd-builds');

  wrapper.appendChild(group(t('lol.common.champion.starter-item'), starters.slice(0, 4)));
  wrapper.appendChild(group(t('lol.common.champion.core-items'), core.slice(0, 5)));
  wrapper.appendChild(group(t('lol.common.champion.boots'), boots.slice(0, 4)));
  wrapper.appendChild(group(t('lol.common.champion.recommend-item-builds'), last.slice(0, 6)));

  /* The reference shows a separate "Support Item" section for support
     champions, listing the situational items that follow the support quest
     item. The quest ids are filtered out, exactly as the reference does. */
  const isSupport = (model.roles || []).some((role) => String(role.name || '').toUpperCase() === 'SUPPORT')
    || (model.champion && Array.isArray(model.champion.tags)
      && model.champion.tags.some((tag) => String(tag).toUpperCase() === 'SUPPORT'));
  if (isSupport && last.length) {
    const questIds = new Set([3869, 3870, 3871, 3876, 3877]);
    const supportItems = last
      .filter((entry) => !(entry.ids || []).some((id) => questIds.has(id)))
      .slice(0, 3);
    if (supportItems.length) {
      wrapper.appendChild(group(t('lol.common.champion.supportItems'), supportItems));
    }
  }

  return wrapper;
}
