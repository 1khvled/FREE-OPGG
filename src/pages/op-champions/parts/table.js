/**
 * The OP champions table — the reference's div grid, exactly like the desktop
 * app's tier list.
 *
 *   div.champion-statistics-table            w 672px, radius 12px
 *     div.champion-statistics-table-header    h 32px, padding 0 12px
 *     div.champion-statistics-table-body
 *       div.champion-statistics-table-row     h 40px, padding-left 12px
 *
 * Seven columns: `#` (18px), the role icon (32px), `Champion` (219px),
 * `Tier` (48px) and `Win Rate` / `Pick Rate` / `Ban Rate` (94px each).
 *
 * The grid is produced by the shared `createSortableTable` component (variant
 * `grid`), so the reference's own class names and geometry are used as they
 * are — nothing is hand-rolled here.
 */

import { h } from '../../../core/dom.js';
import {
  attachTooltip,
  createChampionAvatar,
  createSortableTable,
  createStatCell,
  createTierChip,
} from '../../../components/index.js';
import { COLUMNS, portraitUrl, roleIconUrl, roleLabelKey } from '../data.js';
import { createTierGrade } from './tier-grade.js';

/**
 * The `#` cell — the ordinal of the row in the current order.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderRankCell(row) {
  return h('span.op-champion-rank', { text: String(row.ordinal ?? '') });
}

/**
 * The role cell — the lane the champion is played in.
 *
 * @param {object} row
 * @param {Function} t
 * @returns {HTMLElement}
 */
function renderRoleCell(row, t) {
  const url = roleIconUrl(row.lane);
  if (!url) return h('span.op-role--none', { 'aria-hidden': 'true' });

  const key = roleLabelKey(row.lane);
  const label = key ? t(key, null, '') : '';

  return h('img.op-role-icon', {
    src: url,
    alt: label,
    width: 20,
    height: 20,
    loading: 'lazy',
    draggable: 'false',
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
  const name = h('span.op-champion-name', { text: row.name, title: tooltip });

  return h('span.op-champion-cell', { title: tooltip }, [avatar, name]);
}

/**
 * The tier cell — the letter grade.
 *
 * The numeric tier (the bucket the letter stands for) and the tier's own rank
 * stay in the cell's tooltip, exactly like the overlay's badges do.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderTierCell(row) {
  const grade = createTierGrade(row.tierBucket);

  const chip = createTierChip(row.tier);
  const parts = [chip.outerHTML, `Tier ${row.tierBucket}`];
  if (row.rank !== null && row.rank !== undefined) parts.push(`#${row.rank}`);

  attachTooltip(grade, () => parts.join(' &middot; '));

  return grade;
}

/**
 * Create the table.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(sort:{column:string,direction:string})=>void} options.onSort
 * @param {(row:object)=>void} options.onRowClick
 */
export function createOpTable({ t, onSort, onRowClick }) {
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
        case 'role':
          return renderRoleCell(row, t);
        case 'champion':
          return renderChampionCell(row);
        case 'tier':
          return renderTierCell(row);
        case 'winRate':
          return createStatCell(row.winRate, { kind: 'percent' });
        case 'pickRate':
          return createStatCell(row.pickRate, { kind: 'percent' });
        case 'banRate':
          return createStatCell(row.banRate, { kind: 'percent' });
        default:
          return null;
      }
    },
  }));

  const table = createSortableTable({
    variant: 'grid',
    columns,
    label: t('common.op', null, 'OP champions'),
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
