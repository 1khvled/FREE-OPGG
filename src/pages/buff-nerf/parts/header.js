/**
 * The Buff / Nerf header.
 *
 * The reference's patch-notes screen opens with the screen title, a one-line
 * explanation of what the screen shows and the patch it is about. The replica
 * adds the two facts the API delivers and the reference has no copy for:
 * the patch version and the patch date.
 *
 *   header.buff-nerf__header
 *     h1.buff-nerf__title              "Buff / Nerf"
 *     p.buff-nerf__subtitle            "See how champion skills changed across patches"
 *     p.buff-nerf__patch-title         the patch-note title (Korean, verbatim)
 *     div.buff-nerf__meta
 *       span.buff-nerf__meta-label     "Latest patch"
 *       span.buff-nerf__meta-value     the patch version
 *       span.buff-nerf__meta-dot       "·"
 *       span.buff-nerf__meta-value     the patch date
 */

import { h } from '../../../core/dom.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 */
export function createHeader({ t }) {
  const title = h('h1.buff-nerf__title', {
    text: t('common.buff-nerf', null, 'Buff / Nerf'),
  });

  const subtitle = h('p.buff-nerf__subtitle', {
    text: t(
      'lol.buff-nerf.see-how-champion-skills-changed-across',
      null,
      'See how champion skills changed across patches',
    ),
  });

  // The patch-note title comes from the API in Korean. It is rendered exactly
  // as it arrives — it is never translated.
  const patchTitle = h('p.buff-nerf__patch-title');

  const metaLabel = h('span.buff-nerf__meta-label', {
    text: t('lol.buff-nerf.latest-patch', null, 'Latest patch'),
  });

  const metaVersion = h('span.buff-nerf__meta-value');
  const metaDot = h('span.buff-nerf__meta-dot', { text: '·', 'aria-hidden': 'true' });
  const metaDate = h('span.buff-nerf__meta-value');

  const meta = h('div.buff-nerf__meta', {}, [metaLabel, metaVersion, metaDot, metaDate]);

  const element = h('header.buff-nerf__header', {}, [
    h('div.buff-nerf__heading', {}, [title]),
    subtitle,
    patchTitle,
    meta,
  ]);

  return {
    element,

    /**
     * Show the patch the notes belong to.
     *
     * @param {{version?:string|null, date?:string|null, title?:string|null}} patch
     */
    setPatch(patch) {
      const version = patch && patch.version ? String(patch.version) : '';
      const date = patch && patch.date ? String(patch.date) : '';
      const noteTitle = patch && patch.title ? String(patch.title) : '';

      metaVersion.textContent = version;
      metaDate.textContent = date;
      patchTitle.textContent = noteTitle;

      metaVersion.hidden = !version;
      metaDot.hidden = !version || !date;
      metaDate.hidden = !date;
      patchTitle.hidden = !noteTitle;
    },
  };
}
