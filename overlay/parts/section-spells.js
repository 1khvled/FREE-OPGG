/**
 * Spell row — the player's summoner spells with a cooldown ring, plus the
 * enemy spell tracker.
 *
 * Reference copy: `overlay.lol.spellcheck.title` ("Spell Timer"),
 * `overlay.lol.enemy-skill-cooldowns` and the objective-timer naming pattern
 * `overlay.lol.objective-timer.champion-flash` ("{{champion}} Flash").
 *
 * Cooldowns come from two sources, in order of authority:
 *
 *  1. the live game state pushed by the main process (`cooldownRemaining`);
 *  2. the manual tracker — the reference's spell tracker is user driven
 *     ("Click on enemy team's spell to track their cooldowns"), so clicking a
 *     spell starts its countdown from the spell's real cooldown length.
 */
import { h, image, svg } from './dom.js';
import { spellIcon, spellMeta } from './assets.js';
import { formatClock, remainingFraction } from './format.js';

export const meta = {
  id: 'spells',
  titleKey: 'overlay.lol.spellcheck.title',
};

const RING_RADIUS = 14;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Real summoner spell cooldown lengths, in seconds. */
const SPELL_COOLDOWN = {
  flash: 300,
  teleport: 300,
  ghost: 300,
  exhaust: 210,
  ignite: 210,
  barrier: 210,
  cleanse: 210,
  heal: 240,
  smite: 90,
  snowball: 180,
  mark: 15,
  dash: 15,
  heal2: 240,
};

/** Cooldown length for a spell, from its id or name. */
export function spellCooldown(id, name) {
  const meta_ = id !== null && id !== undefined ? spellMeta(id) : null;
  const label = String(
    (meta_ && (meta_.name || meta_.key)) || name || '',
  )
    .toLowerCase()
    .replace(/summoner/, '')
    .replace(/[^a-z]/g, '');
  if (SPELL_COOLDOWN[label] !== undefined) return SPELL_COOLDOWN[label];
  return 300;
}

function spellButton(ctx, entry, key, options) {
  const { actions } = ctx;
  const labelled = Boolean(options && options.withLabel);
  const name = entry.name || (entry.id !== null && entry.id !== undefined ? `Spell ${entry.id}` : 'Spell');
  const icon = entry.icon || spellIcon(entry.id, entry.spellName || null);
  const total = entry.total || spellCooldown(entry.id, entry.spellName || name);

  const progress = svg('circle', {
    class: 'hud-ring__progress',
    cx: 18,
    cy: 18,
    r: RING_RADIUS,
    'stroke-dasharray': String(RING_LENGTH),
    'stroke-dashoffset': String(RING_LENGTH),
  });

  const ring = svg('svg', { class: 'hud-ring', viewBox: '0 0 36 36' },
    svg('circle', { class: 'hud-ring__track', cx: 18, cy: 18, r: RING_RADIUS }),
    progress);

  const glyph = icon ? image(icon, name, 'hud-spell__icon') : null;

  if (!labelled) {
    return h(
      'button',
      {
        class: 'hud-spell hud-interactive',
        type: 'button',
        dataset: { spellKey: key, spellTotal: String(total) },
        title: name,
        onclick: () => actions.toggleSpellTracker(key, { name, total }),
      },
      ring,
      glyph,
      h('span', { class: 'hud-spell__time', dataset: { spellTime: key } }, ''),
    );
  }

  return h(
    'button',
    {
      class: 'hud-spell hud-spell--row hud-interactive',
      type: 'button',
      dataset: { spellKey: key, spellTotal: String(total) },
      title: name,
      onclick: () => actions.toggleSpellTracker(key, { name, total }),
    },
    ring,
    glyph,
    h('span', { class: 'hud-spell__label' }, name),
    h('span', { class: 'hud-spell__time hud-spell__time--inline', dataset: { spellTime: key } }, ''),
  );
}

export function render(ctx) {
  const { state, t } = ctx;

  const player = (state.spells && state.spells.player) || [];
  const enemy = (state.spells && state.spells.enemy) || [];
  const enemyTeam = (state.game && state.game.enemyTeam) || [];

  const body = h('div', { class: 'hud-spells__body' });

  if (player.length) {
    body.appendChild(
      h(
        'div',
        { class: 'hud-spells__player' },
        ...player.map((entry, index) =>
          spellButton(ctx, entry, entry.id !== null && entry.id !== undefined ? `p${entry.id}` : `p${index}`),
        ),
      ),
    );
  }

  /* ---- enemy tracker ---------------------------------------------------- */
  const enemyRows = [];
  for (const entry of enemy) {
    const key = entry.champion ? `e${entry.champion}${entry.id ?? entry.name}` : `e${entry.id ?? entry.name}`;
    const label = entry.champion
      ? t('overlay.lol.objective-timer.champion-flash', { champion: entry.champion })
      : entry.name || t('overlay.lol.objective-timer.flash');
    enemyRows.push(spellButton(ctx, { ...entry, name: label, spellName: entry.name }, key, { withLabel: true }));
  }

  if (!enemyRows.length && enemyTeam.length) {
    for (const member of enemyTeam) {
      if (member.championId === null) continue;
      const key = `eflash${member.championId}`;
      const label = t('overlay.lol.objective-timer.champion-flash', {
        champion: member.championName || `#${member.index + 1}`,
      });
      enemyRows.push(
        spellButton(ctx, { name: label, id: 4, spellName: 'Flash' }, key, { withLabel: true }),
      );
    }
  }

  if (enemyRows.length) {
    body.appendChild(
      h(
        'div',
        { class: 'hud-spells__enemy' },
        h('span', { class: 'hud-spells__enemy-label' }, t('overlay.lol.enemy-skill-cooldowns')),
        h('div', { class: 'hud-spells__enemy-list' }, ...enemyRows),
      ),
    );
  }

  if (!player.length && !enemyRows.length) {
    /* Nothing to track yet — the panel only exists once the game state
       provides spells or an enemy team. */
    if (!enemyTeam.length) return null;
    body.appendChild(h('div', { class: 'hud-empty' }, t('overlay.lol.spellcheck.default')));
  }

  return h(
    'section',
    { class: 'hud-panel hud-panel--spells', dataset: { section: meta.id } },
    h(
      'header',
      { class: 'hud-panel__head' },
      h('h3', { class: 'hud-panel__title' }, t(meta.titleKey)),
    ),
    body,
  );
}

/**
 * Refresh the countdown rings.
 * Called once a second while the HUD is visible.
 */
export function tick(ctx, root, now) {
  if (!root) return;
  const tracker = ctx.state.spellTracker || {};
  const state = ctx.state;

  /* Live cooldowns pushed by the main process win over the manual tracker. */
  const live = new Map();
  for (const entry of (state.spells && state.spells.player) || []) {
    if (entry.id === null || entry.id === undefined) continue;
    live.set(`p${entry.id}`, entry);
  }
  for (const entry of (state.spells && state.spells.enemy) || []) {
    if (entry.id === null || entry.id === undefined) continue;
    live.set(entry.champion ? `e${entry.champion}${entry.id}` : `e${entry.id}`, entry);
  }

  for (const node of root.querySelectorAll('[data-spell-key]')) {
    const key = node.getAttribute('data-spell-key');
    const total = Number(node.getAttribute('data-spell-total')) || 0;
    const tracked = tracker[key];
    const pushed = live.get(key);
    const timeNode = node.querySelector('[data-spell-time]');
    const progress = node.querySelector('.hud-ring__progress');

    let remaining = 0;
    let active = false;

    if (pushed && pushed.remaining !== null && pushed.remaining !== undefined) {
      remaining = Math.max(0, Math.ceil(pushed.remaining));
      active = remaining > 0;
    } else if (tracked) {
      remaining = Math.max(0, Math.ceil((tracked.endsAt - now) / 1000));
      active = remaining > 0;
    }

    if (timeNode) {
      timeNode.textContent = tracked || pushed ? formatClock(remaining) : '';
      timeNode.classList.toggle('is-active', active);
    }
    if (progress) {
      const fraction = tracked || pushed ? remainingFraction(remaining, total) : 0;
      progress.setAttribute('stroke-dashoffset', String(RING_LENGTH * (1 - fraction)));
      progress.classList.toggle('is-running', active);
    }
    node.classList.toggle('is-tracking', Boolean(tracked));
  }
}
