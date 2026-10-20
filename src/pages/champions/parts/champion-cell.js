/**
 * Champion cell — the 32px square portrait plus the champion name.
 *
 * The reference cell is `div.champion-img-32` (32×32px, 4px radius, 8px
 * margin-right) followed by the champion name. The champion title (for
 * example "the Darkin Blade") is exposed on hover through the native
 * tooltip, exactly like the reference does for its champion grid.
 */

import { h } from '../../../core/dom.js';
import { portraitUrls } from '../data.js';

/** First letters of a champion name, used when no portrait can be loaded. */
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * @param {object} row - normalised champion row.
 * @param {number} [size=32] - portrait edge length.
 * @returns {HTMLElement}
 */
export function createChampionCell(row, size = 32) {
  const portrait = h('div.champion-img-32');
  const urls = portraitUrls(row, size);

  if (urls.length) {
    const img = h('img.champion-img-32__image', {
      src: urls[0],
      alt: row.name,
      width: size,
      height: size,
      loading: 'lazy',
      draggable: 'false',
    });

    let index = 0;
    img.addEventListener('error', () => {
      index += 1;
      if (index < urls.length) {
        img.src = urls[index];
        return;
      }
      img.remove();
      portrait.classList.add('is-empty');
      portrait.textContent = initials(row.name);
    });

    portrait.appendChild(img);
  } else {
    portrait.classList.add('is-empty');
    portrait.textContent = initials(row.name);
  }

  const tooltip = row.title ? `${row.name} — ${row.title}` : row.name;
  const name = h('span.champion-name', { text: row.name, title: tooltip });

  return h('span.champion-cell', { title: tooltip }, [portrait, name]);
}
