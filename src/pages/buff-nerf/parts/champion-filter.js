/**
 * The champion filter.
 *
 * The reference's patch-notes screen filters its champion list with a plain
 * text field ("Search champions (name / key)"). The replica uses the shared
 * search control — the desktop app's `.champion-statistics-search-bar` with
 * its magnifier glyph — and narrows it to the reference's 240px field.
 *
 * The filter matches the champion name and the champion key (the numeric
 * champion id the patch-notes entries carry), exactly like the reference.
 */

import { h } from '../../../core/dom.js';
import { createSearchBar } from '../../../components/index.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(query:string)=>void} [options.onQuery] - called with the raw term.
 */
export function createChampionFilter({ t, onQuery }) {
  const placeholder = t('lol.buff-nerf.search-champions', null, 'Search champions...');

  const search = createSearchBar({
    placeholder,
    label: placeholder,
    className: 'buff-nerf__search',
    onInput: (value) => {
      if (typeof onQuery === 'function') onQuery(String(value ?? ''));
    },
  });

  const element = h('div.buff-nerf__filter', {}, [search]);

  return {
    element,

    /** The native `<input>` element (focus management). */
    input: search.input,

    /** Put a term into the field (used when the route carries one). */
    setValue(value) {
      search.input.value = String(value ?? '');
    },

    /** The current term. */
    getValue() {
      return search.input.value;
    },
  };
}
