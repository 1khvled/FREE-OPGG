/**
 * Champion detail — 1v1 match-up analyser.
 *
 * Pick an opposing champion and read the lane match-up win rate, the lane-kill
 * rate and the resulting recommendation.
 *
 * Reference keys: `lol.champions.lane-kill-rate` and
 * `lol.live.champion.v3.banpick.counter.compare-against`.
 */

import { h } from '../../../core/dom.js';
import { championById, championImageUrls, formatRate, formatCount } from '../data.js';
import { createIconBox, duelBar, emptyState, initialsOf } from './common.js';

const SAFE_THRESHOLD = 0.55;
const RISKY_THRESHOLD = 0.45;

/**
 * @param {{ t: Function, model: object, tooltip: object, opponentId: number|null,
 *           onSelectOpponent: (id: number) => void }} ctx
 * @returns {HTMLElement}
 */
export function renderMatchupPanel(ctx) {
  const { t, model, tooltip, opponentId, onSelectOpponent } = ctx;

  const matchups = Array.isArray(model.matchups) ? model.matchups : [];
  const selected = matchups.find((entry) => entry.championId === opponentId) || null;
  const selectedKnown = selected ? championById(selected.championId) : null;
  const opponentName = selected
    ? (selected.name || selectedKnown?.name || `#${selected.championId}`)
    : '';

  /* ---- opponent picker --------------------------------------------------- */

  const options = matchups.map((entry) => {
    const known = championById(entry.championId);
    const label = entry.name || known?.name || `#${entry.championId}`;
    return h('option', {
      value: String(entry.championId),
      selected: entry.championId === opponentId ? 'selected' : null,
      text: t('lol.live.champion.v3.banpick.counter.compare-against', { name: label }),
    });
  });

  const select = h('select.cd-select', {
    'aria-label': t('lol.live.champion.v3.opponent'),
    on: {
      change: (event) => {
        const value = Number(event.target.value);
        if (Number.isFinite(value) && typeof onSelectOpponent === 'function') onSelectOpponent(value);
      },
    },
  }, options.length ? options : [h('option', { value: '', text: '-' })]);

  const picker = h('div.cd-matchup__picker', null, [
    h('label.cd-matchup__picker-label', {
      for: 'cd-matchup-opponent',
      text: t('lol.live.champion.v3.opponent'),
    }),
    select,
  ]);
  select.id = 'cd-matchup-opponent';

  /* ---- body -------------------------------------------------------------- */

  const body = h('div.cd-panel__body');

  if (!matchups.length) {
    body.appendChild(emptyState(t('common.lol.champions-one-trick-unavailable')));
  } else if (!selected) {
    body.appendChild(picker);
    body.appendChild(emptyState(t('lol.live.champion.v3.pick-an-opponent-to-see-the')));
  } else {
    const known = selectedKnown;

    const myRate = selected.winRate;
    const theirRate = myRate === null ? null : 1 - myRate;

    const myPortrait = createIconBox(championImageUrls(model.champion, model.version), {
      alt: model.champion.name || '',
      initials: initialsOf(model.champion.name || model.champion.key || ''),
      className: 'cd-icon--matchup',
    });
    const theirPortrait = createIconBox(championImageUrls(known, model.version), {
      alt: opponentName,
      initials: initialsOf(opponentName),
      className: 'cd-icon--matchup',
    });

    const versus = h('div.cd-matchup__versus', null, [
      h('div.cd-matchup__champ', null, [
        myPortrait,
        h('span.cd-matchup__champ-name', { text: model.champion.name || '-' }),
      ]),
      h('span.cd-matchup__vs', { text: 'VS' }),
      h('div.cd-matchup__champ', null, [
        theirPortrait,
        h('span.cd-matchup__champ-name', { text: opponentName }),
      ]),
    ]);

    /** One duel row: my value on the left, theirs on the right. */
    function duelRow(label, mine, theirs) {
      return h('div.cd-matchup__duel', null, [
        h('div.cd-matchup__duel-head', null, [
          h('span.cd-matchup__duel-label', { text: label }),
          h('span.cd-matchup__duel-mine', { text: formatRate(mine, 1) }),
          h('span.cd-matchup__duel-theirs', { text: formatRate(theirs, 1) }),
        ]),
        duelBar(
          mine === null ? null : mine * 100,
          theirs === null ? null : theirs * 100,
          {
            leftLabel: mine === null ? '' : `${(mine * 100).toFixed(1)}%`,
            rightLabel: theirs === null ? '' : `${(theirs * 100).toFixed(1)}%`,
          },
        ),
      ]);
    }

    const stats = h('div.cd-matchup__stats', null, [
      duelRow(t('lol.champions.win-rate'), myRate, theirRate),
      duelRow(t('lol.champions.lane-kill-rate'), selected.laneKillRate, selected.laneKillRate === null ? null : 1 - selected.laneKillRate),
    ]);

    let verdict = t('stratum.even');
    let verdictTone = 'even';
    if (myRate !== null) {
      if (myRate >= SAFE_THRESHOLD) {
        verdict = t('lol.live.champion.v3.banpick.blind.safe');
        verdictTone = 'safe';
      } else if (myRate <= RISKY_THRESHOLD) {
        verdict = t('lol.live.champion.v3.banpick.blind.risky');
        verdictTone = 'risky';
      }
    }

    const verdictNode = h('p.cd-matchup__verdict', {
      class: `cd-matchup__verdict--${verdictTone}`,
      text: verdict,
    });

    const notes = h('div.cd-matchup__notes', null, [
      selected.matches !== null
        ? h('span.cd-matchup__note', { text: t('lol.live.champion.v3.banpick.counter.games', { n: formatCount(selected.matches) }) })
        : null,
      selected.laneKillRate !== null
        ? h('span.cd-matchup__note', { text: t('lol.live.champion.v3.banpick.dominance.explain.lane-kill') })
        : null,
    ]);

    body.appendChild(picker);
    body.appendChild(versus);
    body.appendChild(stats);
    body.appendChild(verdictNode);
    body.appendChild(notes);
  }

  const title = model.position
    ? t('lol.live.champion.v3.banpick.counter.title-lane', { lane: model.position.toUpperCase() })
    : t('lol.live.champion.v3.banpick.counter.title');

  const panel = h('section.cd-panel.cd-panel--matchup', null, [
    h('div.cd-panel__head', null, [
      h('h3.cd-panel__title', { text: title }),
    ]),
    body,
  ]);

  if (selected) {
    tooltip.attach(select, { title: opponentName, body: formatRate(selected.winRate) });
  }

  return panel;
}
