/**
 * The two-column patch-notes list.
 *
 *   div.buff-nerf__columns
 *     section.buff-nerf__column.buff-nerf__column--buff
 *       div.buff-nerf__column-head
 *         h3.buff-nerf__column-title     "Buff"
 *         span.buff-nerf__column-count   the number of entries
 *       ul.buff-nerf__entries
 *         li.buff-nerf__entry           (see ./entry.js)
 *     section.buff-nerf__column.buff-nerf__column--nerf
 *       …
 *
 * Buffs are on the left, nerfs on the right. A third column appears only
 * when an entry carries a status that is neither buff nor nerf — the
 * upstream service also knows "adjust", "update" and "no change".
 */

import { h } from '../../../core/dom.js';
import { createEntry } from './entry.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {Array<object>} options.columns - the columns to render.
 * @returns {HTMLElement}
 */
export function createEntryColumns({ t, columns }) {
  const root = h('div.buff-nerf__columns');

  for (const column of columns || []) {
    const list = h('ul.buff-nerf__entries');

    for (const entry of column.entries || []) {
      // The badge repeats the column it sits in: "Buff" on the left, "Nerf"
      // on the right. An entry with an unknown status keeps its own label.
      const badgeLabel = column.id === 'other' && entry.rawStatus
        ? entry.rawStatus
        : t(column.badgeKey, null, column.badgeFallback);

      list.appendChild(createEntry({
        entry,
        badgeLabel,
        accent: column.accent,
      }));
    }

    root.appendChild(h('section.buff-nerf__column', {
      class: `buff-nerf__column--${column.id}`,
    }, [
      h('div.buff-nerf__column-head', {}, [
        h('h3.buff-nerf__column-title', {
          text: t(column.labelKey, null, column.fallback),
        }),
        h('span.buff-nerf__column-count', {
          text: String((column.entries || []).length),
        }),
      ]),
      list,
    ]));
  }

  return root;
}
