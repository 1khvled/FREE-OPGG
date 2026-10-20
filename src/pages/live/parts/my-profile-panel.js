/**
 * Live companion — my profile panel.
 *
 * Summoner level, rank tier and the most played champions of the signed-in
 * account, read from `ctx.api.myProfile()`.
 *
 * Reference copy:
 *   - `common.live.tab.myprofile`  → "My profile"
 *   - `lol.mypage.most-champions`  → "Most Played Champions This Season"
 */

import { h } from '../../../core/dom.js';
import { portrait, tierChip, emptyState, errorState } from './ui.js';
import { LOCAL } from '../strings.js';

/**
 * @param {object} options
 * @param {(key: string, vars?: object, fallback?: string) => string} options.t
 * @param {object|null} options.profile normalised profile
 * @param {boolean} [options.loading]
 * @param {string|null} [options.error]
 * @param {() => void} [options.onRetry]
 * @param {(championId: number) => string} [options.championName]
 * @param {(championId: number) => string} [options.championImage]
 * @returns {HTMLElement}
 */
export function renderMyProfilePanel({
  t,
  profile,
  loading = false,
  error = null,
  onRetry = null,
  championName = null,
  championImage = null,
}) {
  const body = (() => {
    if (loading) return h('p.live-empty', { text: t('lol.live.champion.v3.loading') });
    if (error) return errorState(error, onRetry, t('lol.buff-nerf.retry'));
    if (!profile) return emptyState(LOCAL.waitingForClient);

    const name = profile.name
      ? (profile.tagLine ? `${profile.name}#${profile.tagLine}` : profile.name)
      : LOCAL.waitingForClient;

    return h('div.live-profile__body', {}, [
      h('div.live-profile__identity', {}, [
        h('span.live-profile__name', { text: name }),
        profile.level !== null && profile.level !== undefined
          ? h('span.live-profile__level', { text: `${LOCAL.level} ${profile.level}` })
          : null,
        profile.tier
          ? h('span.live-profile__tier', { text: profile.rank || profile.tier })
          : null,
      ]),
      h('div.live-profile__champions', {}, [
        h('h4.live-profile__subtitle', { text: t('lol.mypage.most-champions') }),
        profile.mostChampions.length
          ? h('ul.live-profile__list', {}, profile.mostChampions.map((champion) => h('li.live-profile__row', {}, [
            portrait({
              src: champion.image || (championImage ? championImage(champion.championId) : ''),
              name: champion.name || (championName ? championName(champion.championId) : ''),
              className: 'live-profile__portrait',
            }),
            h('span.live-profile__champion-name', {
              text: champion.name || (championName ? championName(champion.championId) : `#${champion.championId}`),
            }),
            champion.tier !== null && champion.tier !== undefined
              ? tierChip(champion.tier, t('lol.live.champion.v3.tier', { n: champion.tier }))
              : null,
            champion.winRate !== null && champion.winRate !== undefined
              ? h('span.live-profile__winrate.tabular', { text: `${(champion.winRate * 100).toFixed(1)}%` })
              : null,
            champion.play !== null && champion.play !== undefined
              ? h('span.live-profile__games.tabular', { text: `${champion.play} ${t('common.Games')}` })
              : null,
          ])))
          : emptyState(t('lol.live.champion.v3.no-results')),
      ]),
    ]);
  })();

  return h('section.live-panel.live-panel--profile', {}, [
    h('header.live-panel__head', {}, [
      h('div.live-panel__titles', {}, [
        h('h3.live-panel__title', { text: t('common.live.tab.myprofile') }),
      ]),
    ]),
    body,
  ]);
}
