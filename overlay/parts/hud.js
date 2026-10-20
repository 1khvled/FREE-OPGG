/**
 * HUD shell.
 *
 * Builds the floating HUD: a draggable header (brand, mode, champion card,
 * section toggles, lock pin) plus the panel strip. The shell owns the
 * visible / interactive state machine; the section modules own their content.
 */
import { h, clear, replace } from './dom.js';
import { t } from './i18n.js';

import * as championSection from './section-champion.js';
import * as runesSection from './section-runes.js';
import * as buildSection from './section-build.js';
import * as skillsSection from './section-skills.js';
import * as spellsSection from './section-spells.js';
import * as benchSection from './section-bench.js';
import * as augmentsSection from './section-augments.js';
import * as objectivesSection from './section-objectives.js';

/** Panel sections in display order. */
const SECTIONS = [
  runesSection,
  buildSection,
  skillsSection,
  spellsSection,
  benchSection,
  augmentsSection,
  objectivesSection,
];

/** Mode chip labels, using the reference's game-mode strings. */
const MODE_LABEL = {
  aram: 'lol.common.gameMode.aram',
  mayhem: 'lol.common.gameMode.aram-mayhem',
  arena: 'lol.common.gameMode.arena',
  ranked: 'common.ranked',
  classic: 'lol.live.champion.v3.lol-classic',
  urf: 'lol.common.gameMode.urf',
  swiftplay: 'common.ranked',
  'nexus-blitz': 'lol.common.gameMode.nexus_blitz',
  brawl: 'lol.common.gameMode.brawl',
  other: 'lol.common.gameMode.normal',
};

export function createHud(root, options) {
  const { actions, store } = options;

  const championSlot = h('div', { class: 'hud__champ-slot' });
  const modeChip = h('span', { class: 'hud__mode' }, '');
  const toggleRow = h('nav', { class: 'hud__toggles' });
  const panelStrip = h('div', { class: 'hud__panels' });

  const lockButton = h(
    'button',
    {
      class: 'hud-icon-btn hud-interactive',
      type: 'button',
      dataset: { action: 'lock' },
      title: `${t('local.unlock')} · Shift+Tab`,
      onclick: () => actions.setInteractive(!store.getState().interactive),
    },
    h('span', { class: 'hud-icon-btn__glyph' }, '🔒'),
    h('span', { class: 'hud-icon-btn__text' }, t('local.lock')),
  );

  const hideButton = h(
    'button',
    {
      class: 'hud-icon-btn hud-interactive',
      type: 'button',
      dataset: { action: 'hide' },
      title: `${t('local.hide')} · Ctrl+Shift+O`,
      onclick: () => actions.hide(),
    },
    h('span', { class: 'hud-icon-btn__glyph' }, '✕'),
  );

  const header = h(
    'header',
    { class: 'hud__header' },
    h(
      'div',
      { class: 'hud__brand' },
      h('span', { class: 'hud__logo' }, 'OP.GG'),
      modeChip,
    ),
    championSlot,
    toggleRow,
    h('div', { class: 'hud__actions' }, lockButton, hideButton),
  );

  replace(root, header, panelStrip);

  let lastSignature = '';

  /** Build the section toggle chips. */
  function renderToggles(sections) {
    clear(toggleRow);
    for (const section of SECTIONS) {
      const active = sections[section.meta.id] !== false;
      toggleRow.appendChild(
        h(
          'button',
          {
            class: `hud-chip hud-interactive${active ? ' is-active' : ''}`,
            type: 'button',
            dataset: { toggle: section.meta.id },
            title: t(section.meta.titleKey),
            onclick: () => actions.toggleSection(section.meta.id),
          },
          t(section.meta.titleKey),
        ),
      );
    }
  }

  /** Signature of everything the panels render from. */
  function signature(state) {
    return JSON.stringify({
      champion: state.champion,
      detail: state.detail,
      bench: state.bench,
      spells: { player: state.spells && state.spells.player, enemy: state.spells && state.spells.enemy },
      objectives: state.game && state.game.objectives,
      camps: state.game && state.game.camps,
      sections: state.sections,
      loading: state.loading,
    });
  }

  /** Render the champion card and the panels. */
  function render() {
    const state = store.getState();

    modeChip.textContent = state.mode ? t(MODE_LABEL[state.mode] || MODE_LABEL.other) : '';
    modeChip.classList.toggle('is-hidden', !state.mode);

    const champ = championSection.render({ state, t, actions });
    replace(championSlot, champ);

    renderToggles(state.sections);

    const next = signature(state);
    if (next === lastSignature) return;
    lastSignature = next;

    clear(panelStrip);
    for (const section of SECTIONS) {
      if (state.sections[section.meta.id] === false) continue;
      const node = section.render({ state, t, actions });
      if (node) panelStrip.appendChild(node);
    }

    /* The live values (cooldown rings, countdowns) are re-applied immediately
       so a rebuilt panel never shows a stale or empty timer. */
    tick(Date.now());
  }

  /** Refresh the live parts of the HUD (cooldown rings, objective countdowns). */
  function tick(now) {
    const state = store.getState();
    for (const section of SECTIONS) {
      if (typeof section.tick !== 'function') continue;
      if (state.sections[section.meta.id] === false) continue;
      const node = panelStrip.querySelector(`[data-section="${section.meta.id}"]`);
      if (!node) continue;
      section.tick({ state, t, actions }, node, now);
    }
  }

  /** Show or hide the HUD. */
  function setVisible(visible) {
    root.dataset.visible = visible ? 'true' : 'false';
    root.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }

  /** Enable or disable pointer interaction. */
  function setInteractive(interactive) {
    root.dataset.interactive = interactive ? 'true' : 'false';
    lockButton.classList.toggle('is-unlocked', interactive);
    lockButton.querySelector('.hud-icon-btn__glyph').textContent = interactive ? '🔓' : '🔒';
    lockButton.querySelector('.hud-icon-btn__text').textContent = interactive ? t('local.unlock') : t('local.lock');
    lockButton.title = interactive
      ? `${t('local.lock')} · Shift+Tab`
      : `${t('local.unlock')} · Shift+Tab`;
  }

  return { render, tick, setVisible, setInteractive, header, panelStrip };
}
