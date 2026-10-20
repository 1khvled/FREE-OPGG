/**
 * Live companion — connection header.
 *
 * Shows what the League Client is currently doing: whether it is connected,
 * which phase it is in (Lobby / ChampSelect / Game / None) and which summoner
 * is logged in.
 */

import { h } from '../../../core/dom.js';
import { PHASES } from '../data.js';
import { LOCAL } from '../strings.js';

/**
 * Human label for a phase.
 * @param {(key: string, vars?: object, fallback?: string) => string} t
 * @param {string} phase
 * @returns {string}
 */
export function phaseText(t, phase) {
  switch (phase) {
    case PHASES.LOBBY: return LOCAL.phaseLobby;
    case PHASES.CHAMPSELECT: return LOCAL.phaseChampSelect;
    case PHASES.GAME: return LOCAL.phaseGame;
    default: return LOCAL.phaseNone;
  }
}

/**
 * Format seconds as `m:ss`.
 * @param {number|null} seconds
 * @returns {string}
 */
export function formatClock(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '';
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {object} options.status normalised League Client status
 * @param {object|null} options.session normalised champion-select session
 * @param {number|null} options.timeLeft seconds left in the current phase
 * @param {string} options.view current board view: 'draft' | 'champion'
 * @param {() => void} options.onToggleView
 * @returns {HTMLElement}
 */
export function renderConnectionHeader({ t, status, session, timeLeft, view, onToggleView }) {
  const connected = Boolean(status && status.connected);
  const phase = status ? status.phase : PHASES.NONE;
  const summoner = status ? status.summoner : null;

  const statusBlock = h('div.live-header__status', { dataset: { state: connected ? 'online' : 'offline' } }, [
    h('span.live-header__dot', { 'aria-hidden': 'true' }),
    h('span.live-header__status-text', { text: connected ? LOCAL.connected : LOCAL.disconnected }),
  ]);

  const phaseBlock = h('div.live-header__phase', {}, [
    h('span.live-header__phase-label', { text: LOCAL.leagueClient }),
    h('span.live-header__phase-value', { text: phaseText(t, phase) }),
    session && session.hasSession && timeLeft !== null && timeLeft !== undefined
      ? h('span.live-header__timer.tabular', { text: formatClock(timeLeft) })
      : null,
  ]);

  const summonerBlock = summoner
    ? h('div.live-header__summoner', {}, [
      h('span.live-header__summoner-name', {
        text: summoner.tagLine ? `${summoner.displayName}#${summoner.tagLine}` : summoner.displayName,
      }),
      summoner.level !== null && summoner.level !== undefined
        ? h('span.live-header__summoner-level', { text: `${LOCAL.level} ${summoner.level}` })
        : null,
    ])
    : h('div.live-header__summoner.live-header__summoner--empty', {
      text: connected ? '—' : LOCAL.waitingForClient,
    });

  const toggleLabel = view === 'draft'
    ? t('lol.live.champion.v3.show-champion')
    : t('lol.live.champion.v3.show-draft');

  const toggle = h('button.live-button.live-button--toggle', {
    type: 'button',
    title: toggleLabel,
    on: { click: onToggleView },
  }, [h('span.live-button__label', { text: toggleLabel })]);

  return h('header.live-header', {}, [
    statusBlock,
    h('div.live-header__divider', { 'aria-hidden': 'true' }),
    phaseBlock,
    h('div.live-header__divider', { 'aria-hidden': 'true' }),
    summonerBlock,
    h('div.live-header__spacer'),
    toggle,
  ]);
}
