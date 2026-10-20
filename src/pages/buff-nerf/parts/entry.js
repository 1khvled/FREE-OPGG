/**
 * One patch-note entry.
 *
 *   li.buff-nerf__entry
 *     span.buff-nerf__portrait          the square champion portrait (40 × 40, 4px)
 *     div.buff-nerf__entry-body
 *       div.buff-nerf__entry-head
 *         span.buff-nerf__entry-name    the champion name
 *         span.buff-nerf__badge         "Buff" / "Nerf"
 *       p.buff-nerf__entry-log          the change text, newlines preserved
 *
 * The change log is the upstream service's own text. It already contains the
 * newlines that separate the changed lines, so it is rendered with
 * `white-space: pre-line` and is never reflowed, trimmed or translated.
 */

import { h } from '../../../core/dom.js';
import { PORTRAIT_RADIUS, PORTRAIT_SIZE } from '../data.js';

/**
 * The square champion portrait.
 *
 * The candidates are tried in order and the frame degrades to the
 * champion's initial when none of them answers — the reference shows an empty
 * box, the replica keeps the rhythm of the list.
 *
 * @param {object} entry - a normalised entry with its portrait candidates.
 * @returns {HTMLElement}
 */
function createPortrait(entry) {
  const frame = h('span.buff-nerf__portrait__frame');
  const sources = Array.isArray(entry.imageSources) ? entry.imageSources.filter(Boolean) : [];

  const placeholder = () => {
    const glyph = h('span.buff-nerf__portrait__placeholder', {
      'aria-hidden': 'true',
      text: String(entry.name || '').trim().charAt(0).toUpperCase(),
    });
    frame.textContent = '';
    frame.appendChild(glyph);
  };

  if (!sources.length) {
    placeholder();
    return frame;
  }

  const img = h('img.buff-nerf__portrait__img', {
    src: sources[0],
    alt: entry.name || '',
    loading: 'lazy',
    decoding: 'async',
  });

  let index = 0;
  img.addEventListener('error', () => {
    index += 1;
    if (index < sources.length) {
      img.src = sources[index];
      return;
    }
    img.remove();
    placeholder();
  });

  frame.appendChild(img);
  return frame;
}

/**
 * @param {object} options
 * @param {object} options.entry - a normalised entry (with the resolved champion).
 * @param {string} options.badgeLabel - the text of the status badge.
 * @param {string} options.accent - `'buff'`, `'nerf'` or `'neutral'`.
 */
export function createEntry({ entry, badgeLabel, accent }) {
  const portrait = h('span.buff-nerf__portrait', {}, [createPortrait(entry)]);

  const badge = h('span.buff-nerf__badge', {
    class: `buff-nerf__badge--${accent}`,
    text: badgeLabel,
  });

  const log = h('p.buff-nerf__entry-log', { text: entry.log || '' });

  const item = h('li.buff-nerf__entry', {}, [
    portrait,
    h('div.buff-nerf__entry-body', {}, [
      h('div.buff-nerf__entry-head', {}, [
        h('span.buff-nerf__entry-name', { text: entry.name || '' }),
        badge,
      ]),
      log,
    ]),
  ]);

  // The change log is the tooltip of the entry: it can be long, and the
  // reference keeps the full text available on hover.
  if (entry.log) item.setAttribute('title', entry.log);

  return item;
}
