/**
 * Champion detail — summoner spells panel.
 *
 * The reference shows the recommended spell pair with its pick rate
 * (`lol.common.champion.summoner-spells`). The endpoint only carries the spell
 * ids; the main process resolves the names and icons from the summoner spell
 * catalogue.
 */

import { h } from '../../../core/dom.js';
import { createIconBox, emptyState } from './common.js';
import { formatRate } from '../data.js';

/**
 * @param {{ t: Function, model: object, tooltip: object }} ctx
 * @returns {HTMLElement}
 */
export function renderSummonerSpellsPanel(ctx) {
  const { t, model, tooltip } = ctx;

  const groups = Array.isArray(model.summonerSpells) ? model.summonerSpells : [];
  const body = h('div.cd-panel__body');

  const panel = h('section.cd-panel.cd-panel--spells', null, [
    h('div.cd-panel__head', null, [
      h('h3.cd-panel__title', { text: t('lol.common.champion.summoner-spells') }),
    ]),
    body,
  ]);

  function render() {
    while (body.firstChild) body.removeChild(body.firstChild);

    if (!groups.length) {
      body.appendChild(emptyState(t('lol.common.champion.tip-no-data')));
      return;
    }

    const rows = groups.slice(0, 4).map((group) => {
      const icons = (group.spells || []).map((spell) => {
        const label = spell.name || `Spell ${spell.id}`;
        const box = createIconBox(spell.imageUrl ? [spell.imageUrl] : [], {
          alt: label,
          initials: (label || '?').charAt(0),
          className: 'cd-icon--spell',
        });
        const button = h('button.cd-spell', { type: 'button', 'aria-label': label }, [box]);
        tooltip.attach(button, { title: label, body: '' });
        return button;
      });

      return h('div.cd-spells__row', null, [
        h('div.cd-spells__icons', null, icons),
        h('span.cd-spells__rate', {
          text: group.pickRate === null || group.pickRate === undefined
            ? '-'
            : formatRate(group.pickRate, 1),
        }),
      ]);
    });

    body.appendChild(h('div.cd-spells', null, rows));
  }

  render();
  return panel;
}
