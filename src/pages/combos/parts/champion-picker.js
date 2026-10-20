/**
 * The champion picker — the searchable portrait grid that sits on the left of
 * the Combos screen.
 *
 * The reference's champions screen has the very same control
 * (`.champion-statistics-search`): a 332 × 40px search bar with the magnifier
 * glyph on the right, and below it a grid of 46 × 59px portrait tiles with the
 * champion name under the portrait.
 *
 * The reference tiles are laid out with `flex-wrap` and a 4px margin, which
 * makes six of them fit into the 356px panel; the Combos screen shows five
 * per row, so the replica uses an explicit five-column grid.
 *
 * The name under the portrait is 12px here: the reference renders 11px, which
 * is below the house typography floor.
 */

import { h, clear } from '../../../core/dom.js';
import { createSearchBar } from '../../../components/index.js';
import { portraitUrls } from '../data.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(champion:object)=>void} [options.onSelect]
 */
export function createChampionPicker({ t, onSelect }) {
  const root = h('div.combos-picker');

  const search = createSearchBar({
    placeholder: t('lol.champions.search', null, 'Search champions'),
    label: t('lol.champions.search', null, 'Search champions'),
  });

  const grid = h('div.combos-grid');

  root.append(
    h('div.combos-picker__search', {}, [search]),
    grid,
  );

  let source = [];
  let query = '';
  let selectedKey = null;

  function matches(champion) {
    if (!query) return true;
    const needle = query.toLowerCase();
    const name = String(champion.name || '').toLowerCase();
    const key = String(champion.key || '').toLowerCase();
    return name.includes(needle) || key.includes(needle);
  }

  function tile(champion) {
    const name = String(champion.name || '');
    const key = String(champion.key || '');
    const urls = portraitUrls(champion, 46);

    const portrait = h('span.combos-tile__portrait');

    if (urls.length) {
      const img = h('img.combos-tile__image', {
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
        portrait.classList.add('is-empty');
        portrait.textContent = name.slice(0, 1).toUpperCase();
      });

      portrait.appendChild(img);
    } else {
      portrait.classList.add('is-empty');
      portrait.textContent = name.slice(0, 1).toUpperCase();
    }

    const item = h('div.combos-tile', {
      title: key ? `${name} (${key})` : name,
    }, [
      portrait,
      h('span.combos-tile__name', { text: name }),
    ]);

    if (key && key === selectedKey) item.classList.add('is-selected');

    const button = h('button.combos-tile__button', {
      type: 'button',
      'aria-pressed': key && key === selectedKey ? 'true' : 'false',
      on: {
        click: () => {
          if (typeof onSelect === 'function') onSelect(champion);
        },
      },
    }, [item]);

    return button;
  }

  function render() {
    clear(grid);
    const fragment = document.createDocumentFragment();
    let visible = 0;

    for (const champion of source) {
      if (!matches(champion)) continue;
      visible += 1;
      fragment.appendChild(tile(champion));
    }

    if (!visible) {
      fragment.appendChild(h('p.combos-picker__empty', {
        text: t('lol.buff-nerf.no-matching-champions', null, 'No matching champions'),
      }));
    }

    grid.appendChild(fragment);
  }

  search.input.addEventListener('input', () => {
    query = search.input.value.trim();
    render();
  });

  return {
    element: root,
    /** Replace the champion catalogue. */
    setChampions(champions) {
      source = Array.isArray(champions) ? champions : [];
      render();
    },
    /** Mark the selected champion. */
    setSelected(champion) {
      selectedKey = champion && champion.key ? champion.key : null;
      render();
    },
    /** The raw search input (focus management). */
    input: search.input,
  };
}
