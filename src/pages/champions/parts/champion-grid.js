/**
 * The champion portrait grid that sits beside the table — the reference
 * calls it the "search" panel.
 *
 *   div.champion-statistics-search          w 356px, padding 12px 0 0
 *     div.champion-statistics-search-top
 *       input.champion-statistics-search-bar
 *       img (icon-search.svg)
 *     div.champion-statistics-search-bottom
 *       a > div.item-champion
 *             div.champion-statistics-champion-img-wrapper > img (46px)
 *             div.item-champion-name
 *
 * The reference renders the names at 11px here; the house rule floors
 * metadata at 12px, so the replica ships 12px (see champions.css).
 */

import { h, clear } from '../../../core/dom.js';
import { portraitUrls, searchIconUrl } from '../data.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(champion:object)=>void} [options.onSelect]
 * @param {(query:string)=>void} [options.onQuery]
 */
export function createChampionGrid({ t, onSelect, onQuery }) {
  const root = h('div.champion-statistics-search');

  const input = h('input.champion-statistics-search-bar', {
    type: 'search',
    placeholder: t('lol.champions.search', null, 'Search champions'),
    'aria-label': t('lol.champions.search', null, 'Search champions'),
    autocomplete: 'off',
  });

  const top = h('div.champion-statistics-search-top', {}, [
    input,
    h('img.champion-statistics-search-icon', {
      src: searchIconUrl(),
      alt: '',
      width: 16,
      height: 16,
      'aria-hidden': 'true',
    }),
  ]);

  const bottom = h('div.champion-statistics-search-bottom');

  root.append(top, bottom);

  let query = '';
  let source = [];

  function matches(champion) {
    if (!query) return true;
    const needle = query.toLowerCase();
    return String(champion.name || '').toLowerCase().includes(needle);
  }
  function tile(champion) {
    const name = String(champion.name || '');
    const wrapper = h('div.champion-statistics-champion-img-wrapper');
    const urls = portraitUrls(champion, 46);

    if (urls.length) {
      const img = h('img.champion-statistics-champion-img', {
        src: urls[0],
        alt: '',
        width: 46,
        height: 46,
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
        wrapper.classList.add('is-empty');
        wrapper.textContent = name.slice(0, 1).toUpperCase();
      });

      wrapper.appendChild(img);
    } else {
      wrapper.classList.add('is-empty');
      wrapper.textContent = name.slice(0, 1).toUpperCase();
    }

    const item = h('div.item-champion', {}, [
      wrapper,
      h('div.item-champion-name', { text: name, title: name }),
    ]);

    const link = h('a.item-champion-link', {
      draggable: 'false',
      href: `#/OP.GG/champions/${encodeURIComponent(name)}`,
      on: {
        click: (event) => {
          event.preventDefault();
          if (typeof onSelect === 'function') onSelect(champion);
        },
      },
    }, [item]);

    return link;
  }

  function render(champions) {
    clear(bottom);
    const fragment = document.createDocumentFragment();
    for (const champion of champions) {
      if (!matches(champion)) continue;
      fragment.appendChild(tile(champion));
    }
    bottom.appendChild(fragment);
  }

  input.addEventListener('input', () => {
    query = input.value.trim();
    render(source);
    if (typeof onQuery === 'function') onQuery(query);
  });

  return {
    element: root,
    /** Replace the grid content. */
    setChampions(champions) {
      source = Array.isArray(champions) ? champions : [];
      render(source);
    },
    /** The current search term. */
    getQuery() {
      return query;
    },
    /** The raw search input (for focus management). */
    input,
  };
}
