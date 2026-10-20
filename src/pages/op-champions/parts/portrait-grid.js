/**
 * The champion portrait grid that sits beside the table — the reference calls
 * it the "search" panel.
 *
 *   div.champion-statistics-search          w 356px, padding 12px 0 0
 *     div.champion-statistics-search-top    the search bar
 *     div.champion-statistics-search-bottom
 *       div.item-champion                   46 × 59px
 *         div.champion-statistics-champion-img-wrapper
 *         div.item-champion-name            12px (the reference uses 11px)
 *
 * The grid lists the champions of the OP tier — the same rows the table
 * shows — and the search box filters both.
 */

import { h, clear } from '../../../core/dom.js';
import { createChampionTile, createSearchBar } from '../../../components/index.js';
import { portraitUrl } from '../data.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(champion:object)=>void} [options.onSelect]
 * @param {(query:string)=>void} [options.onQuery]
 */
export function createPortraitGrid({ t, onSelect, onQuery }) {
  const root = h('div.op-champions__grid.champion-statistics-search');

  const placeholder = t('lol.champions.search', null, 'Search champions');

  const search = createSearchBar({
    placeholder,
    label: placeholder,
    onInput: (value) => {
      query = String(value || '').trim().toLowerCase();
      render();
      if (typeof onQuery === 'function') onQuery(query);
    },
  });

  const bottom = h('div.champion-statistics-search-bottom');

  root.append(h('div.champion-statistics-search-top', {}, [search]), bottom);

  let source = [];
  let query = '';

  function matches(champion) {
    if (!query) return true;
    return String(champion.name || '').toLowerCase().includes(query);
  }

  function render() {
    clear(bottom);

    const fragment = document.createDocumentFragment();
    for (const champion of source) {
      if (!matches(champion)) continue;

      const tile = createChampionTile({
        ...champion,
        // The reference's portraits come from OP.GG's own CDN; the shared
        // helper builds the resized URL.
        squareImageUrl: portraitUrl(champion, 46),
      }, {
        size: 46,
        onClick: (entry) => {
          if (typeof onSelect === 'function') onSelect(entry);
        },
      });

      fragment.appendChild(tile);
    }

    bottom.appendChild(fragment);
  }

  return {
    element: root,

    /** Replace the grid content. */
    setChampions(champions) {
      source = Array.isArray(champions) ? champions : [];
      render();
    },
  };
}
