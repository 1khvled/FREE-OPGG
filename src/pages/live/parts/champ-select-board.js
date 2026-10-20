/**
 * Live companion — champion-select board.
 *
 * The reference's `g.AA` component: "Left is your team, right is the enemy.
 * Includes confirmed picks and the champion currently hovered."
 *
 * The board is only rendered while a champion-select session exists; the
 * idle panel takes its place otherwise.
 */

import { h } from '../../../core/dom.js';
import { renderTeamPanel } from './team-panel.js';

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {object} options.session normalised champion-select session
 * @param {Node|Node[]} [options.middle] content between the two columns
 * @param {(championId: number) => void} [options.onSelect]
 * @param {(championId: number, slot: object) => string} options.championName
 * @param {(championId: number, slot: object) => string} options.championImage
 * @param {(championId: number) => number|null} [options.championTier]
 * @returns {HTMLElement}
 */
export function renderChampSelectBoard({
  t,
  session,
  middle = null,
  onSelect = null,
  championName,
  championImage,
  championTier = null,
}) {
  const mine = renderTeamPanel({
    t,
    title: t('lol.live.champion.v3.my-team'),
    slots: session.myTeam,
    bans: session.myBans,
    mirrored: false,
    actingBan: session.actingBan && session.actingBan.team === 'my' ? session.actingBan : null,
    onSelect,
    championName,
    championImage,
    championTier,
  });

  const theirs = renderTeamPanel({
    t,
    title: t('lol.live.champion.v3.enemy-team'),
    slots: session.theirTeam,
    bans: session.theirBans,
    mirrored: true,
    actingBan: session.actingBan && session.actingBan.team === 'their' ? session.actingBan : null,
    onSelect,
    championName,
    championImage,
    championTier,
  });

  return h('div.live-board', {}, [
    mine,
    h('div.live-board__main', {}, middle),
    theirs,
  ]);
}
