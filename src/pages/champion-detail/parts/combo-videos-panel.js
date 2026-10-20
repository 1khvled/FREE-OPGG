/**
 * Champion detail — combo videos.
 *
 * The reference's champion page carries a "Combo Videos" section: the
 * champion's combo clips, loaded from the reference's own video service
 * (`lol.live.champion.v3.loading-combo-videos` while the request is in
 * flight, `lol.live.champion.v3.no-combo-videos-yet` when the service has
 * nothing for the champion).
 *
 * The replica ships no such endpoint, so the section renders the reference's
 * empty copy and offers a link out to a YouTube search for the champion's
 * combos. The link is a real, working destination — no video entry is ever
 * fabricated.
 *
 * Reference keys: `lol.live.champion.v3.combos.go-page` (the section title),
 * `lol.live.champion.v3.no-combo-videos-yet` (the empty copy) and
 * `lol.live.champion.v3.loading-combo-videos` (the loading copy).
 */

import { h, clear } from '../../../core/dom.js';
import { emptyState } from './common.js';

/** The reference's video service is not part of the replica; YouTube is. */
const YOUTUBE_SEARCH = 'https://www.youtube.com/results?search_query=';

/**
 * @param {{ t: Function, model: object, api?: object, videos?: Array }} ctx
 * @returns {HTMLElement}
 */
export function renderComboVideosPanel(ctx) {
  const { t, model, api } = ctx;

  const champion = model.champion || {};
  const championName = champion.name || champion.key || '';

  const body = h('div.cd-panel__body');
  const panel = h('section.cd-panel.cd-panel--combo-videos', null, [
    h('div.cd-panel__head', null, [
      h('h3.cd-panel__title', { text: t('lol.live.champion.v3.combos.go-page') }),
    ]),
    body,
  ]);

  /**
   * The link out to the champion's combo videos.
   *
   * @returns {HTMLElement|null}
   */
  function youtubeLink() {
    if (!championName) return null;

    const href = `${YOUTUBE_SEARCH}${encodeURIComponent(championName)}+combo+guide`;
    const link = h('a.cd-videos__link', {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      text: t('app.comboVideos.youtube', { champion: championName }),
    });

    // The desktop app hands external links to the system browser; the plain
    // anchor stays the fallback when the bridge is not available.
    link.addEventListener('click', (event) => {
      if (typeof api?.openExternal !== 'function') return;
      event.preventDefault();
      try {
        api.openExternal(href);
      } catch {
        // The bridge refused the request — let the anchor do its job.
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    });

    return link;
  }

  /**
   * Paint the body for the current state.
   *
   * @param {'loading'|'empty'} state
   */
  function paint(state) {
    clear(body);

    if (state === 'loading') {
      body.appendChild(h('p.cd-videos__status', {
        text: t('lol.live.champion.v3.loading-combo-videos'),
      }));
      return;
    }

    body.appendChild(emptyState(t('lol.live.champion.v3.no-combo-videos-yet')));

    const link = youtubeLink();
    if (link) body.appendChild(link);
  }

  paint('loading');

  // The reference resolves its own video service here. The replica has no
  // video endpoint, so the list resolves empty and the panel falls back to
  // the reference's empty copy. The promise resolves before the browser
  // paints, so the loading copy never flashes on screen.
  Promise.resolve().then(() => {
    if (panel.isConnected) paint('empty');
  });

  return panel;
}

export default renderComboVideosPanel;
