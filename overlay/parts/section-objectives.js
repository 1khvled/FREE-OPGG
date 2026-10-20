/**
 * Objective timers — dragon / herald / baron and the jungle camp timers.
 *
 * Reference copy: `overlay.lol.objective-timer.objective`,
 * `overlay.lol.objective-timer.dragon`, `overlay.lol.objective-timer.herald`
 * and `overlay.lol.objective-timer.champion-flash` for the naming pattern.
 *
 * The timers are only rendered when the main process supplies real spawn
 * timestamps; nothing is estimated.
 */
import { h, image } from './dom.js';
import { formatClock, secondsUntil } from './format.js';

export const meta = {
  id: 'objectives',
  titleKey: 'overlay.lol.objective-timer.objective',
};

const OBJECTIVE_LABEL = {
  dragon: 'overlay.lol.objective-timer.dragon',
  elder: 'overlay.lol.objective-timer.elder-dragon',
  'elder-dragon': 'overlay.lol.objective-timer.elder-dragon',
  herald: 'overlay.lol.objective-timer.herald',
  baron: 'local.baron',
  'baron-nashor': 'local.baron',
};

function objectiveRow(ctx, objective) {
  const { t } = ctx;
  const key = String(objective.key || '').toLowerCase();
  const labelKey = OBJECTIVE_LABEL[key];
  const label = objective.label || (labelKey ? t(labelKey) : t('overlay.lol.objective-timer.objective'));

  return h(
    'div',
    { class: 'hud-objective', dataset: { objectiveKey: objective.key } },
    h('span', { class: 'hud-objective__name' }, label),
    h('span', { class: 'hud-objective__time', dataset: { objectiveTime: objective.key } }, ''),
  );
}

function campRow(ctx, camp) {
  return h(
    'div',
    { class: 'hud-objective hud-objective--camp', dataset: { campKey: camp.key } },
    camp.icon ? image(camp.icon, camp.label || camp.key, 'hud-objective__icon') : null,
    h('span', { class: 'hud-objective__name' }, camp.label || camp.key),
    h('span', { class: 'hud-objective__time', dataset: { campTime: camp.key } }, ''),
  );
}

export function render(ctx) {
  const { state, t } = ctx;
  const game = state.game || {};
  const objectives = game.objectives || [];
  const camps = game.camps || [];

  if (!objectives.length && !camps.length) return null;

  const body = h('div', { class: 'hud-objectives__body' });

  if (objectives.length) {
    body.appendChild(
      h(
        'div',
        { class: 'hud-objectives__group' },
        h('span', { class: 'hud-objectives__label' }, t('overlay.lol.objective-timer.objective')),
        h('div', { class: 'hud-objectives__rows' }, ...objectives.map((objective) => objectiveRow(ctx, objective))),
      ),
    );
  }

  if (camps.length) {
    body.appendChild(
      h(
        'div',
        { class: 'hud-objectives__group' },
        h('span', { class: 'hud-objectives__label' }, t('overlay.common.lol-jungle-timer')),
        h('div', { class: 'hud-objectives__rows' }, ...camps.map((camp) => campRow(ctx, camp))),
      ),
    );
  }

  return h(
    'section',
    { class: 'hud-panel hud-panel--objectives', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
    ),
    body,
  );
}

/** Refresh the objective countdowns. Called once a second. */
export function tick(ctx, root, now) {
  if (!root) return;
  const game = ctx.state.game || {};

  for (const objective of game.objectives || []) {
    const node = root.querySelector(`[data-objective-time="${cssEscape(objective.key)}"]`);
    if (!node) continue;
    node.textContent = objective.spawnAt ? formatClock(secondsUntil(objective.spawnAt, now)) : '';
  }

  for (const camp of game.camps || []) {
    const node = root.querySelector(`[data-camp-time="${cssEscape(camp.key)}"]`);
    if (!node) continue;
    node.textContent = camp.spawnAt ? formatClock(secondsUntil(camp.spawnAt, now)) : '';
  }
}

/** Minimal CSS attribute-value escaping for querySelector. */
function cssEscape(value) {
  return String(value ?? '').replace(/["\\]/g, '\\$&');
}
