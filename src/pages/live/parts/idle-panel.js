/**
 * Live companion — idle panel.
 *
 * Shown while the League Client is not in a champion select, and whenever the
 * client is not connected at all. It reproduces the reference's idle panel:
 * an eyebrow, a title, a description, a hint and the list of supported
 * modes with their per-mode description.
 *
 * Reference copy:
 *   - `lol.live.champion.v3.idle.eyebrow`     → "WAITING FOR PICK"
 *   - `lol.live.champion.v3.idle.title`
 *   - `lol.live.champion.v3.idle.hint`
 *   - `lol.live.champion.v3.idle.section-title` → "Supported modes"
 *   - `lol.live.champion.v3.idle.section-sub`
 *   - `lol.live.champion.v3.idle.mode.*.desc`
 */

import { h } from '../../../core/dom.js';
import { icon, pill } from './ui.js';
import { LOCAL } from '../strings.js';

/**
 * The supported-mode catalogue, in the reference's order.
 * The `icon` values are the reference's own asset names; the replica falls
 * back to a text glyph when the asset cannot be loaded.
 */
const MODES = [
  {
    key: 'rift',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-RIFT.png',
    fallback: 'SR',
    nameKey: 'lol.live.champion.v3.summoners-rift',
    descKey: 'lol.live.champion.v3.idle.mode.rift.desc',
  },
  {
    key: 'aram',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-ARAM.png',
    fallback: 'AR',
    nameKey: 'lol.common.lane.aram',
    descKey: 'lol.live.champion.v3.idle.mode.aram.desc',
  },
  {
    key: 'aram-mayhem',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-ARAM.png',
    fallback: 'AM',
    nameKey: 'lol.common.gameMode.aram-mayhem',
    descKey: 'lol.live.champion.v3.idle.mode.mayhem.desc',
  },
  {
    key: 'classic',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-RIFT.png',
    fallback: 'CL',
    nameKey: 'lol.live.champion.v3.lol-classic',
    descKey: 'lol.live.champion.v3.idle.mode.classic.desc',
    isNew: true,
  },
  {
    key: 'urf',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-URF.png',
    fallback: 'UR',
    nameKey: 'lol.common.gameMode.urf',
    descKey: 'lol.live.champion.v3.idle.mode.urf.desc',
    tagKey: 'lol.live.champion.v3.idle.redirect-tag',
  },
  {
    key: 'arena',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-ALL.png',
    fallback: 'AE',
    nameKey: 'lol.common.gameMode.arena',
    descKey: 'lol.live.champion.v3.idle.mode.arena.desc',
    isNew: true,
  },
  {
    key: 'other',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-ALL.png',
    fallback: '··',
    nameKey: 'lol.live.champion.v3.idle.mode.other.name',
    descKey: 'lol.live.champion.v3.idle.mode.other.desc',
  },
  {
    key: 'aram-mayhem-classic',
    icon: 'https://desktop-app-data.op.gg/desktop/app/assets/images/icon-position-ARAM.png',
    fallback: 'MC',
    nameKey: 'lol.live.champion.v3.aram-mayhem-classic',
    descKey: 'lol.live.champion.v3.idle.mode.mayhem-classic.desc',
    tagKey: 'lol.common.not-supported',
    muted: true,
  },
];

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {boolean} [options.connected] false while the client is not running
 * @param {string} [options.activeMode] the detected game mode, if any
 * @returns {HTMLElement}
 */
export function renderIdlePanel({ t, connected = false, activeMode = '' }) {
  const cards = MODES.map((mode) => h('article.live-mode', {
    class: [mode.muted ? 'is-muted' : '', activeMode === mode.key ? 'is-active' : ''],
  }, [
    icon({ src: mode.icon, alt: t(mode.nameKey), className: 'live-icon--mode', fallback: mode.fallback }),
    h('div.live-mode__body', {}, [
      h('div.live-mode__head', {}, [
        h('h4.live-mode__name', { text: t(mode.nameKey) }),
        mode.isNew ? pill(LOCAL.newBadge, { tone: 'new' }) : null,
        mode.tagKey ? pill(t(mode.tagKey), { tone: 'tag' }) : null,
      ]),
      h('p.live-mode__desc', { text: t(mode.descKey) }),
    ]),
  ]));

  return h('section.live-idle', {}, [
    h('div.live-idle__head', {}, [
      h('span.live-idle__eyebrow', { text: t('lol.live.champion.v3.idle.eyebrow') }),
      h('h2.live-idle__title', { text: t('lol.live.champion.v3.idle.title') }),
      connected
        ? h('p.live-idle__desc', { text: t('common.lol.champion_pick') })
        : h('p.live-idle__desc', { text: LOCAL.waitingForClient }),
      h('p.live-idle__hint', { text: t('lol.live.champion.v3.idle.hint') }),
    ]),
    h('div.live-idle__section', {}, [
      h('h3.live-idle__section-title', { text: t('lol.live.champion.v3.idle.section-title') }),
      h('p.live-idle__section-sub', { text: t('lol.live.champion.v3.idle.section-sub') }),
      h('div.live-idle__modes', {}, cards),
    ]),
  ]);
}
