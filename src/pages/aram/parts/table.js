/**
 * The ARAM tier list — the reference's div grid, exactly like the desktop
 * app's tier list.
 *
 *   div.champion-statistics-table            w 672px, radius 12px
 *     div.champion-statistics-table-header    h 32px, padding 0 12px
 *     div.champion-statistics-table-body
 *       div.champion-statistics-table-row     h 40px, padding-left 12px
 *
 * Seven columns: `#` (18px), the rank movement slot (32px), `Champion`
 * (219px), `Tier` (48px), `Win Rate` (94px), `Pick Rate` (94px) and the ARAM
 * balance tag (94px).
 *
 * Two columns differ from the ranked list:
 *
 *   - **There is no ban rate.** ARAM has no ban phase, so the seventh column
 *     carries the ARAM balance tag instead.
 *   - **There is no lane / role column.** ARAM has no lanes (`positions` is
 *     `null`), so the 32px slot the ranked list uses for the lane icon carries
 *     the rank movement instead — exactly what the ranked list itself does in
 *     that slot.
 *
 * The grid is produced by the shared `createSortableTable` component (variant
 * `grid`), so the reference's own class names and geometry are used as they
 * are — nothing is hand-rolled here.
 */

import { h } from '../../../core/dom.js';
import {
  createChampionAvatar,
  createSortableTable,
  createStatCell,
} from '../../../components/index.js';
import { COLUMNS, portraitUrl } from '../data.js';
import { createTierBadge } from './tier-badge.js';
import { createBalanceTag } from './balance-tag.js';

/** Sort indicator glyphs. */
const SORT_ASC = '▲';
const SORT_DESC = '▼';

/**
 * The `#` cell — the ordinal of the row in the current order.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderRankCell(row) {
  return h('span.aram-rank', { text: String(row.ordinal ?? '') });
}

/**
 * The rank movement cell.
 *
 * The reference's second column has no header label; it carries the rank
 * movement indicator (▲ / ▼) for a champion whose rank changed since the
 * previous patch.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderRankChangeCell(row) {
  const change = row.rankChange;
  if (change === null || change === undefined || change === 0) {
    return h('span.aram-rank-change--none', { 'aria-hidden': 'true', text: '–' });
  }

  const up = change > 0;

  return h('span.aram-rank-change', {
    'data-direction': up ? 'up' : 'down',
    text: `${up ? SORT_ASC : SORT_DESC}${Math.abs(change)}`,
    title: up
      ? `Up ${change} place${change === 1 ? '' : 's'} since the last patch`
      : `Down ${Math.abs(change)} place${change === -1 ? '' : 's'} since the last patch`,
  });
}

/**
 * The champion cell — the 32px portrait plus the champion name.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderChampionCell(row) {
  const avatar = createChampionAvatar({
    ...row,
    squareImageUrl: portraitUrl(row, 32),
  }, {
    size: 32,
    className: 'champion-img-32',
  });

  const tooltip = row.title ? `${row.name} — ${row.title}` : row.name;
  const name = h('span.aram-champion-name', { text: row.name, title: tooltip });

  return h('span.aram-champion-cell', { title: tooltip }, [avatar, name]);
}

/**
 * Create the table.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(sort:{column:string,direction:string})=>void} options.onSort
 * @param {(row:object)=>void} [options.onRowClick]
 */
export function createAramTable({ t, onSort, onRowClick }) {
  const columns = COLUMNS.map((column) => ({
    key: column.id,
    label: column.labelKey ? t(column.labelKey, null, column.fallback) : (column.label || ''),
    width: column.width,
    sortable: column.sortable !== false,
    // The reference's header cells carry the base column class as well as
    // their modifier; the shared table only adds the modifier.
    headerClassName: 'champion-statistics-table-column',
    cell: (row) => {
      switch (column.id) {
        case 'rank':
          return renderRankCell(row);
        case 'rankChange':
          return renderRankChangeCell(row);
        case 'champion':
          return renderChampionCell(row);
        case 'tier':
          return createTierBadge(row.tierBucket);
        case 'winRate':
          return createStatCell(row.winRate, { kind: 'percent' });
        case 'pickRate':
          return createStatCell(row.pickRate, { kind: 'percent' });
        case 'balance':
          return createBalanceTag(row.balance, row.balanceTag, t);
        default:
          return null;
      }
    },
  }));

  const table = createSortableTable({
    variant: 'grid',
    columns,
    label: t('lol.common.gameMode.aram', null, 'ARAM'),
    rowKey: (row) => (row.id === null || row.id === undefined ? row.name : row.id),
    onSort: (sort) => onSort(sort),
    onRowClick: (row) => onRowClick(row),
  });

  return {
    element: table.element,

    /**
     * Replace the body with the given (already sorted) rows.
     *
     * @param {Array<object>} rows
     * @param {{column:string,direction:string}} [sort] - the active sort.
     */
    setRows(rows, sort) {
      table.update(rows, sort);
    },
  };
}
