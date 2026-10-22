/**
 * The balance table — the reference's div grid, exactly like the desktop
 * app's tier list.
 *
 *   div.champion-statistics-table.modes__table
 *     div.champion-statistics-table-header     h 32px
 *     div.champion-statistics-table-body
 *       div.champion-statistics-table-row      h 40px
 *
 * The columns are, in order:
 *
 *   1. the champion — the 32px portrait and the name;
 *   2. the mode's stats — the set the reference computes for the mode
 *      (ARAM: win rate and pick rate; Arena: win rate, avg. place, 1st rate,
 *      pick rate, ban rate and 2nd rate);
 *   3. the nine balance ratios (attack speed, damage dealt, …), which are the
 *      same for every mode.
 *
 * A balance cell is a percentage and a bar whose length is the ratio
 * (`value / 100`):
 *
 *   > 100 %  green   — stronger than the reference champion
 *   = 100 %  muted   — the reference champion
 *   < 100 %  red     — weaker than the reference champion
 *
 * The balance values are **already** percentages against the reference
 * champion, so `95` is rendered as `95 %` and never scaled again. The mode
 * stats are the reference's own strings (`51.29%`, `4.32`).
 */

import { h } from '../../../core/dom.js';
import { createChampionAvatar, createSortableTable } from '../../../components/index.js';
import {
  STAT_COLUMNS,
  barRatio,
  formatRatio,
  ratioTone,
  statsOfMode,
} from '../data.js';

/** The width of a mode stat column. */
export const MODE_COLUMN_WIDTH = 88;

/** The width of a balance column. */
export const BALANCE_COLUMN_WIDTH = 88;

/**
 * The champion portrait.
 *
 * A champion that could not be resolved has no portrait; the cell falls back
 * to the shared neutral placeholder so the row keeps its rhythm and no
 * broken image is requested.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderPortrait(row) {
  if (row.championKey) {
    return createChampionAvatar({
      key: row.championKey,
      name: row.name,
      squareImageUrl: row.squareImageUrl,
      imageUrl: row.imageUrl,
    }, {
      size: 32,
      radius: 4,
      className: 'champion-img-32',
    });
  }

  const initial = String(row.name || '').charAt(0).toUpperCase();

  return h('span.champion-img-32.modes__portrait--empty', {
    role: 'img',
    'aria-label': row.name,
  }, [
    h('span.fallback-image__placeholder', { 'aria-hidden': 'true', text: initial }),
  ]);
}

/**
 * The champion cell — the 32px portrait plus the champion name.
 *
 * @param {object} row
 * @returns {HTMLElement}
 */
function renderChampionCell(row) {
  const tooltip = row.title ? `${row.name} — ${row.title}` : row.name;

  return h('div.modes__champion', { title: tooltip }, [
    renderPortrait(row),
    h('span.modes__champion-name', { text: row.name }),
  ]);
}

/**
 * A mode stat cell — the reference's own formatted number.
 *
 * @param {object} row
 * @param {object} stat - the entry of the mode's stat set.
 * @returns {HTMLElement}
 */
function renderModeStatCell(row, stat) {
  const value = row.stats ? row.stats[stat.id] : null;
  const text = value && value.text ? value.text : '—';

  return h('span.modes__mode-stat', { text });
}

/**
 * A balance cell — the percentage and its bar.
 *
 * @param {object} row
 * @param {object} column - the entry of `STAT_COLUMNS`.
 * @returns {HTMLElement}
 */
function renderBalanceCell(row, column) {
  const value = row.balance ? row.balance[column.id] : null;
  const tone = ratioTone(value);
  const ratio = barRatio(value);

  // The bar length is the ratio itself; a bar longer than the track (a value
  // above 100 %) is clipped by the track, and a negative value draws nothing.
  const width = `${Math.max(0, ratio) * 100}%`;

  return h('div.modes__stat', { class: `modes__stat--${tone}` }, [
    h('span.modes__ratio', { text: formatRatio(value) }),
    h('span.modes__bar', { 'aria-hidden': 'true' }, [
      h('span.modes__bar-fill', { style: { width } }),
    ]),
  ]);
}

/**
 * Create the balance table.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {string} options.mode - the active mode; it decides the stat set.
 * @param {(sort:{column:string,direction:string})=>void} options.onSort
 * @param {(row:object)=>void} [options.onRowClick]
 */
export function createModesTable({ t, mode, onSort, onRowClick }) {
  const columns = [
    {
      key: 'champion',
      label: t('lol.champions.champion', null, 'Champion'),
      className: 'modes__cell modes__cell--champion',
      // The grid variant only puts the reference's own class on the body
      // cells, so the header cells have to ask for it explicitly.
      headerClassName: 'champion-statistics-table-column modes__cell modes__cell--head modes__cell--champion',
      sortable: true,
      cell: (row) => renderChampionCell(row),
    },
    ...statsOfMode(mode).map((stat) => ({
      key: stat.id,
      label: t(stat.labelKey, null, stat.fallback),
      width: MODE_COLUMN_WIDTH,
      className: 'modes__cell modes__cell--stat',
      headerClassName: 'champion-statistics-table-column modes__cell modes__cell--head',
      sortable: true,
      cell: (row) => renderModeStatCell(row, stat),
    })),
    ...STAT_COLUMNS.map((column) => ({
      key: column.id,
      // The area-of-effect ratio has no entry in the reference catalogue, so
      // that column carries a literal label instead of a key.
      label: column.labelKey ? t(column.labelKey, null, column.fallback) : column.label,
      width: BALANCE_COLUMN_WIDTH,
      className: 'modes__cell modes__cell--stat',
      headerClassName: 'champion-statistics-table-column modes__cell modes__cell--head',
      sortable: true,
      cell: (row) => renderBalanceCell(row, column),
    })),
  ];

  const table = createSortableTable({
    variant: 'grid',
    columns,
    label: t('lol.common.gameMode.balance.title', null, 'Balance Adjustments'),
    rowKey: (row) => row.championId,
    onSort: (sort) => {
      if (typeof onSort === 'function') onSort(sort);
    },
    onRowClick: (row) => {
      if (typeof onRowClick === 'function') onRowClick(row);
    },
  });

  table.element.classList.add('modes__table');

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
