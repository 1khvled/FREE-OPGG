/**
 * The screen toolbar — the champion search box and the lane filter.
 *
 * The search box is the reference's own `.champion-statistics-search-bar`
 * (332 × 40px, 4px radius) and the lane filter is the same dropdown the
 * Champions screen uses for its region / tier / patch filters.
 */

import { h } from '../../../core/dom.js';
import { createSearchBar, createSelect } from '../../../components/index.js';
import { DEFAULT_LANE, LANE_FILTERS } from '../data.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {string} [options.lane] - the active lane.
 * @param {(query:string)=>void} options.onQuery
 * @param {(lane:string)=>void} options.onLane
 */
export function createToolbar({ t, lane, onQuery, onLane }) {
  const searchLabel = t('lol.champions.search', null, 'Search champions');

  const search = createSearchBar({
    placeholder: searchLabel,
    label: searchLabel,
    onInput: (value) => {
      if (typeof onQuery === 'function') onQuery(String(value || ''));
    },
  });

  const select = createSelect({
    value: lane || DEFAULT_LANE,
    label: 'Lane',
    options: LANE_FILTERS.map((entry) => ({
      value: entry.value,
      label: t(entry.labelKey, null, entry.fallback),
    })),
    onChange: (value) => {
      if (typeof onLane === 'function') onLane(String(value || ''));
    },
  });

  const element = h('div.modes__toolbar', {}, [
    h('div.modes__toolbar-search', {}, [search]),
    h('div.modes__toolbar-filter', {}, [select]),
  ]);

  return { element };
}
