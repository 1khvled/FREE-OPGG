/**
 * Champion detail — skills panel.
 *
 * Q/W/E/R in the reference's skill order, the levels at which each ability is
 * levelled (the "level chips") and the full skill-point sequence.
 *
 * Section title: `lol.common.champion.skill-builds`.
 */

import { h } from '../../../core/dom.js';
import { emptyState, section } from './common.js';

const SKILL_KEYS = ['Q', 'W', 'E', 'R'];

/**
 * @param {{ t: Function, model: object, tooltip: object }} ctx
 * @returns {HTMLElement}
 */
export function renderSkillsPanel(ctx) {
  const { t, model, tooltip } = ctx;
  const skills = model.skills || {};
  const sequence = Array.isArray(skills.sequence) ? skills.sequence : [];

  if (!sequence.length) {
    return section(t('lol.common.champion.skill-builds'), [emptyState(t('lol.champions.change-filter'))], {
      className: 'cd-panel--skills',
    });
  }

  const rows = SKILL_KEYS.map((key) => {
    const skill = (skills.skills || []).find((entry) => entry.key === key) || { key, levels: [] };
    const levels = new Set(skill.levels || []);

    const cells = h('div.cd-skill__cells', null, sequence.map((entry, index) => {
      const active = entry === key;
      const cell = h('span.cd-skill__cell', {
        class: active ? 'is-active' : '',
        text: active ? String(index + 1) : '',
      });
      if (active) cell.style.setProperty('--cd-skill-color', `var(--cd-skill-${key.toLowerCase()})`);
      return cell;
    }));

    const chip = h('span.cd-skill__chip', {
      class: `cd-skill__chip--${key.toLowerCase()}`,
      text: key,
    });

    const levelChips = h('div.cd-skill__levels', null, (skill.levels || []).map((level) => h(
      'span.cd-skill__level',
      { text: `Lv ${level}` },
    )));

    const row = h('div.cd-skill', null, [
      h('div.cd-skill__head', null, [
        chip,
        skill.name ? h('span.cd-skill__name', { text: skill.name }) : null,
        levelChips,
      ]),
      cells,
    ]);

    if (skill.description || skill.imageUrl) {
      tooltip.attach(chip, { title: skill.name || key, body: skill.description || '' });
    }

    return row;
  });

  const order = Array.isArray(skills.order) && skills.order.length
    ? skills.order.join(' > ')
    : '';

  const head = order ? h('span.cd-skills__order', { text: order }) : null;

  return section(t('lol.common.champion.skill-builds'), rows, {
    className: 'cd-panel--skills',
    head,
  });
}
