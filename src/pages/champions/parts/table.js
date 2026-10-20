/**
 * The champions table — a div grid, exactly like the desktop app.
 *
 * The reference is not a `<table>`: it is
 *
 *   div.champion-statistics-table            w 672px, radius 12px
 *     div.champion-statistics-table-header    h 32px, padding 0 12px
 *     div.champion-statistics-table-body
 *       a.champion-statistics-table-row       h 40px, padding-left 12px
 *
 * Seven columns: `#` (18px), the role icon (32px), `Champion` (219px),
 * `Tier` (48px) and `Win Rate` / `Pick Rate` / `Ban Rate` (94px each).
 * There is no counter column in the desktop app.
 */

import { h, clear } from '../../../core/dom.js';
import { COLUMNS, COLUMN_SLOT, formatRate } from '../data.js';import { createTierChip } from './tier-chip.js';
import { createRoleChip } from './role-chip.js';
import { createChampionCell } from './champion-cell.js';

/** Sort indicator glyphs. */
const SORT_ASC = '▲';
const SORT_DESC = '▼';
const SORT_IDLE = '⇅';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {{column:string,direction:string}} options.sort
 * @param {(column:string)=>void} options.onSort
 * @param {(row:object)=>void} options.onRowClick
 */
export function createTable({ t, sort, onSort, onRowClick }) {
  const table = h('div.champion-statistics-table');

  const header = h('div.champion-statistics-table-header');
  const body = h('div.champion-statistics-table-body');

  table.append(header, body);

  let currentSort = sort || { column: 'rank', direction: 'asc' };
  let currentRole = null;

  function columnLabel(column) {
    return column.labelKey ? t(column.labelKey, null, column.fallback) : column.label;
  }

  function renderHead() {
    clear(header);

    for (const column of COLUMNS) {
      const slot = COLUMN_SLOT[column.id];
      const active = currentSort.column === column.id;
      const cell = h(`div.champion-statistics-table-column.champion-statistics-table-column__${slot}`);

      if (column.id === 'roleIcon') {
        // The reference leaves the second header cell empty: it carries the
        // rank-change indicator, which has no label.
        header.appendChild(cell);
        continue;
      }

      const label = h('span.champion-statistics-table-column__label', { text: columnLabel(column) });
      cell.appendChild(label);

      if (column.sortable) {
        cell.classList.add('is-sortable');
        if (active) cell.classList.add('is-sorted');
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute(
          'aria-sort',
          active ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none',
        );
        cell.appendChild(h('span.champion-statistics-table-column__sort', {
          'aria-hidden': 'true',
          text: active ? (currentSort.direction === 'asc' ? SORT_ASC : SORT_DESC) : SORT_IDLE,
        }));
        cell.addEventListener('click', () => onSort(column.id));
        cell.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSort(column.id);
          }
        });
      }

      header.appendChild(cell);
    }
  }

  /** Rank-change indicator: ▲2 / ▼1 / – (exposed on the row's tooltip). */
  function rankChangeText(change) {
    if (change === null || change === undefined || change === 0) return '–';
    if (change > 0) return `${SORT_ASC}${Math.abs(change)}`;
    return `${SORT_DESC}${Math.abs(change)}`;
  }

  function renderRow(row, index) {
    const name = String(row.name || '');

    // The reference's first column is the ordinal of the row in the current
    // order; the OP's own rank and its change are exposed on hover.
    const ordinal = String(index + 1);
    const rankLabel = row.rank === null || row.rank === undefined
      ? ''
      : ` · rank ${row.rank} ${rankChangeText(row.rankChange)}`;
    const roleLabel = row.role ? ` · ${row.role}` : '';

    const link = h('a.champion-statistics-table-row', {
      draggable: 'false',
      href: `#/OP.GG/champions/${encodeURIComponent(name)}`,
      'data-champion-id': row.id === null ? '' : String(row.id),
      'data-role': row.role || '',
      title: `${name}${row.title ? ` — ${row.title}` : ''}${roleLabel}${rankLabel}`,
      on: {
        click: (event) => {
          event.preventDefault();
          onRowClick(row);
        },
      },
    });

    // -- # (ordinal) ---------------------------------------------------------
    const rankCell = h('div.champion-statistics-table-column.champion-statistics-table-column__1');
    rankCell.appendChild(h('span.champion-rank', { text: ordinal }));
    link.appendChild(rankCell);

    // -- rank change ---------------------------------------------------------
    // The reference's second column is 32px wide, has no header label and is
    // empty for a champion whose rank did not move. It carries the rank
    // change indicator.
    const roleCell = h('div.champion-statistics-table-column.champion-statistics-table-column__2');
    const change = row.rankChange;
    if (change !== null && change !== undefined && change !== 0) {
      roleCell.appendChild(h('span.champion-rank-change', {
        text: rankChangeText(change),
        'data-direction': change > 0 ? 'up' : 'down',
        title: change > 0
          ? `Up ${change} place${change === 1 ? '' : 's'} since the last patch`
          : `Down ${Math.abs(change)} place${change === -1 ? '' : 's'} since the last patch`,
      }));
    }
    link.appendChild(roleCell);

    // -- champion ------------------------------------------------------------
    const championCell = h('div.champion-statistics-table-column.champion-statistics-table-column__3');
    championCell.appendChild(createChampionCell(row));
    link.appendChild(championCell);

    // -- tier ----------------------------------------------------------------
    const tierCell = h('div.champion-statistics-table-column.champion-statistics-table-column__4');
    tierCell.appendChild(createTierChip(row.tier));
    link.appendChild(tierCell);

    // -- rates ---------------------------------------------------------------
    const winCell = h('div.champion-statistics-table-column.champion-statistics-table-column__5');
    winCell.appendChild(h('span.champion-stat', { text: formatRate(row.winRate) }));
    link.appendChild(winCell);

    const pickCell = h('div.champion-statistics-table-column.champion-statistics-table-column__5');
    pickCell.appendChild(h('span.champion-stat', { text: formatRate(row.pickRate) }));
    link.appendChild(pickCell);

    const banCell = h('div.champion-statistics-table-column.champion-statistics-table-column__5');
    banCell.appendChild(h('span.champion-stat', { text: formatRate(row.banRate) }));
    link.appendChild(banCell);

    if (row.rankChange !== null && row.rankChange !== undefined && row.rankChange !== 0) {
      link.setAttribute('data-rank-change', rankChangeText(row.rankChange));
    }

    return link;
  }

  renderHead();

  return {
    element: table,
    /** Replace the body with the given (already sorted) rows. */
    setRows(rows) {
      clear(body);
      const fragment = document.createDocumentFragment();
      rows.forEach((row, index) => fragment.appendChild(renderRow(row, index)));
      body.appendChild(fragment);
    },
    /** Update the sort state and repaint the header. */
    setSort(next) {
      currentSort = next || { column: 'rank', direction: 'asc' };
      renderHead();
    },
    /** Update the role icon shown in the second header cell. */
    setRole(role) {
      currentRole = role;
      renderHead();
    },
  };
}
