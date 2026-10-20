/**
 * Table states: loading skeleton, error and empty.
 *
 * The reference's empty copy is `lol.champions.change-filter`; the error
 * state always carries a retry affordance so a failed request never leaves
 * the screen blank.
 */

import { h, clear } from '../../../core/dom.js';
import { COLUMNS, COLUMN_SLOT } from '../data.js';

/**
 * A skeleton table that mirrors the real geometry.
 *
 * @param {number} [count] - number of placeholder rows.
 * @returns {HTMLElement}
 */
export function createSkeletonTable(count = 10) {
  const table = h('div.champion-statistics-table.champion-statistics-table--skeleton');

  const header = h('div.champion-statistics-table-header');
  for (const column of COLUMNS) {
    const slot = COLUMN_SLOT[column.id];
    header.appendChild(h(`div.champion-statistics-table-column.champion-statistics-table-column__${slot}`));
  }

  const body = h('div.champion-statistics-table-body');
  for (let row = 0; row < count; row += 1) {
    const line = h('div.champion-statistics-table-row.champion-statistics-table-row--skeleton');
    const widths = ['14px', '20px', '150px', '40px', '48px', '48px', '48px'];
    COLUMNS.forEach((column, index) => {
      const slot = COLUMN_SLOT[column.id];
      const cell = h(`div.champion-statistics-table-column.champion-statistics-table-column__${slot}`);
      cell.appendChild(h('span.champion-skeleton', { style: { width: widths[index] } }));
      line.appendChild(cell);
    });
    body.appendChild(line);
  }

  table.append(header, body);
  return table;
}

/**
 * Error state with a retry button.
 *
 * @param {object} options
 * @param {string} options.message - what went wrong.
 * @param {() => void} options.onRetry
 * @param {(key:string, vars?:object, fallback?:string)=>string} [options.t]
 */
export function createErrorState({ message, onRetry, t }) {
  const translate = t || ((key, vars, fallback) => fallback ?? key);
  const retryLabel = translate('lol.buff-nerf.retry', null, 'Retry');

  return h('div.champ-state.champ-state--error', { role: 'alert' }, [
    h('p.champ-state__message', { text: message }),
    h('button.champ-state__action', {
      type: 'button',
      on: { click: () => onRetry() },
    }, [retryLabel]),
  ]);
}

/**
 * Empty state — the reference asks the user to widen the filters.
 *
 * @param {object} options
 * @param {string} options.message
 */
export function createEmptyState({ message }) {
  return h('div.champ-state.champ-state--empty', { role: 'status' }, [
    h('p.champ-state__message', { text: message }),
  ]);
}

/**
 * Replace the content of a slot.
 *
 * @param {HTMLElement} slot
 * @param {HTMLElement|null} content
 */
export function setSlotContent(slot, content) {
  clear(slot);
  if (content) slot.appendChild(content);
  return slot;
}
