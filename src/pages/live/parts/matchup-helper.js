/**
 * Live companion — matchup helper.
 *
 * The middle column of the draft board. It pairs the champion the player
 * locked with the opponent on the same lane and shows the matchup tip the
 * reference fetches from OP.GG.
 *
 * Reference copy:
 *   - `lol.live.champion.v3.tip.my-laner`  → "Your lane opponent"
 *   - `lol.live.champion.v3.tip.waiting-enemy-picks`
 *   - `lol.live.champion.v3.tip.no-tip-yet`
 *   - `lol.live.champion.v3.vs-champion`    → "vs {{champion}}"
 */

import { h } from '../../../core/dom.js';
import { portrait, tierChip } from './ui.js';
import { LOCAL } from '../strings.js';

/**
 * Pick the local player's slot.
 *
 * The player counts as soon as they have a champion — locked or still being
 * hovered — so the helper always pairs the right two champions.
 *
 * @param {object} session
 * @returns {object|null}
 */
function mySlot(session) {
  const mine = session.myTeam.find((slot) => (
    slot.isMe && (slot.championId > 0 || slot.intentChampionId > 0)
  ));
  if (mine) return mine;
  return session.myTeam.find((slot) => slot.isLocked && slot.championId > 0) || null;
}

/**
 * The champion a slot currently shows: the locked champion, or the one being
 * hovered.
 *
 * @param {object|null} slot
 * @returns {number}
 */
function shownChampionId(slot) {
  if (!slot) return 0;
  if (slot.isLocked && slot.championId > 0) return slot.championId;
  return slot.championId > 0 ? slot.championId : slot.intentChampionId;
}

/**
 * Pick the enemy champion playing the same lane.
 * @param {object} session
 * @param {object|null} mine
 * @returns {object|null}
 */
function enemyLaner(session, mine) {
  if (!mine || !mine.position) return null;
  const sameLane = session.theirTeam.find((slot) => (
    slot.position === mine.position && slot.championId > 0
  ));
  return sameLane || null;
}

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {object} options.session normalised champion-select session
 * @param {{name?: string, tip?: string}|null} [options.tip] OP.GG lane tip
 * @param {(championId: number, slot: object) => string} options.championName
 * @param {(championId: number, slot: object) => string} options.championImage
 * @param {(championId: number) => number|null} [options.championTier]
 * @returns {HTMLElement}
 */
export function renderMatchupHelper({
  t,
  session,
  tip = null,
  championName,
  championImage,
  championTier = null,
}) {
  const mine = mySlot(session);
  const enemy = enemyLaner(session, mine);

  const myChampionId = shownChampionId(mine);
  const enemyChampionId = enemy ? enemy.championId : 0;

  const side = (championId, slot, label) => {
    if (!championId) {
      return h('div.live-matchup__side.live-matchup__side--empty', {}, [
        h('span.live-matchup__side-label', { text: label }),
        portrait({ src: '', name: '?', className: 'live-matchup__portrait' }),
        h('span.live-matchup__side-name', { text: LOCAL.noChampionSelected }),
      ]);
    }
    const name = championName(championId, slot) || `#${championId}`;
    const tierInfo = championTier ? championTier(championId) : null;
    return h('div.live-matchup__side', {}, [
      h('span.live-matchup__side-label', { text: label }),
      portrait({ src: championImage(championId, slot), name, className: 'live-matchup__portrait' }),
      h('span.live-matchup__side-name', { text: name }),
      tierInfo
        ? tierChip(tierInfo.tier, tierInfo.label || t('lol.live.champion.v3.tier', { n: tierInfo.tier }))
        : null,
    ]);
  };

  let note;
  if (!myChampionId) {
    note = LOCAL.noChampionSelected;
  } else if (!enemyChampionId) {
    note = t('lol.live.champion.v3.tip.waiting-enemy-picks');
  } else if (tip && tip.tip) {
    note = tip.tip;
  } else {
    note = t('lol.live.champion.v3.tip.no-tip-yet');
  }

  return h('div.live-matchup', {}, [
    h('header.live-matchup__head', {}, [
      h('h3.live-matchup__title', { text: t('lol.live.champion.v3.tip.my-laner') }),
      mine && mine.position
        ? h('span.live-role', { text: mine.position })
        : null,
    ]),
    h('div.live-matchup__body', {}, [
      side(myChampionId, mine, LOCAL.myChampion),
      h('span.live-matchup__vs', {
        text: enemyChampionId
          ? t('lol.live.champion.v3.vs-champion', { champion: championName(enemyChampionId, enemy) || `#${enemyChampionId}` })
          : t('lol.live.champion.v3.opponent'),
      }),
      side(enemyChampionId, enemy, t('lol.live.champion.v3.opponent')),
    ]),
    h('p.live-matchup__note', { text: note }),
  ]);
}
