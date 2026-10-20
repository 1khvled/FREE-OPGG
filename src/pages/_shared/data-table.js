/**
 * Shared data table — a sortable div grid with the desktop app's table
 * geometry (see docs/rea/desktop-ui.md §3).
 *
 * Geometry (measured from the shipped renderer):
 *   wrapper     border-radius 12px, 12px label colour
 *   header row  32px tall, `padding: 0 12px`, 12px `--text-label`
 *   body row    40px tall, `padding-left: 12px`
 *
 * The reference's table is a div grid rather than a `<table>`; this module
 * mirrors that so the column widths, hover behaviour and radii match.
 */

import { h } from '../../core/dom.js';

/** Sort direction glyphs. */
const SORT_GLYPH = { asc: '▲', desc: '▼' };

/**
 * @typedef {object} TableColumn
 * @property {string} key - stable column id, also the sort key.
 * @property {string} [label] - header text.
 * @property {number|string} [width] - fixed column width (px or CSS length).
 * @property {boolean} [flex] - let the column take the remaining width.
 * @property {'left'|'center'|'right'} [align]
 * @property {boolean} [numeric] - muted numeric styling (12px, tabular-nums).
 * @property {boolean} [sortable]
 * @property {(row:any, index:number)=>Node|string|number} [render]
 * @property {(row:any)=>any} [sortValue]
 */

/**
 * Build the class list of a column cell.
 *
 * @param {TableColumn} column
 * @param {boolean} isHead
 * @param {boolean} isSorted
 * @returns {string}
 */
function columnClasses(column, isHead, isSorted) {
  const classes = ['dt__col'];
  if (isHead) classes.push('dt__col--head');
  if (column.numeric) classes.push('dt__col--numeric');
  if (column.align) classes.push(`dt__col--${column.align}`);
  if (isSorted) classes.push('is-sorted');
  return classes.join(' ');
}

/**
 * Fixed width style for a column.
 *
 * @param {TableColumn} column
 * @returns {object|null}
 */
function columnStyle(column) {
  if (column.width) {
    const width = typeof column.width === 'number' ? `${column.width}px` : column.width;
    return { flex: `0 0 ${width}` };
  }
  if (column.flex) return { flex: '1 1 auto' };
  return null;
}

/**
 * Create the data table.
 *
 * @param {object} options
 * @param {TableColumn[]} options.columns
 * @param {any[]} options.rows
 * @param {{column:string,direction:'asc'|'desc'}} [options.sort]
 * @param {(key:string)=>void} [options.onSort]
 * @param {Node|string} [options.empty] - rendered when there are no rows.
 * @param {Function} [options.onRowClick]
 * @param {string} [options.className]
 * @param {string} [options.label] - accessible name of the grid.
 * @returns {HTMLElement}
 */
export function createDataTable({
  columns,
  rows,
  sort = null,
  onSort = null,
  empty = null,
  onRowClick = null,
  className = '',
  label = null,
}) {
  const classes = ['dt'];
  if (className) classes.push(className);

  const table = h('div', {
    class: classes.join(' '),
    role: 'table',
    'aria-label': label || null,
  });

  /* ---- header ---------------------------------------------------------- */
  const head = h('div.dt__head', { role: 'row' });
  for (const column of columns) {
    const isSorted = Boolean(sort && sort.column === column.key);
    const headCell = h('div', {
      class: columnClasses(column, true, isSorted),
      role: 'columnheader',
      style: columnStyle(column),
      'aria-sort': isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : null,
    });

    if (column.sortable && onSort) {
      headCell.appendChild(h('button.dt__sort', {
        type: 'button',
        on: { click: () => onSort(column.key) },
      }, [
        h('span.dt__label', { text: column.label ?? '' }),
        h('span.dt__glyph', { 'aria-hidden': 'true', text: isSorted ? SORT_GLYPH[sort.direction] : '' }),
      ]));
    } else {
      headCell.appendChild(h('span.dt__label', { text: column.label ?? '' }));
    }
    head.appendChild(headCell);
  }
  table.appendChild(head);

  /* ---- body ------------------------------------------------------------ */
  const body = h('div.dt__body', { role: 'rowgroup' });

  if (!Array.isArray(rows) || rows.length === 0) {
    body.appendChild(h('div.dt__row.dt__row--empty', { role: 'row' }, [
      h('div.dt__col.dt__col--empty', { role: 'cell' }, [
        empty || h('span.dt__dash', { text: '—' }),
      ]),
    ]));
  } else {
    rows.forEach((row, index) => {
      const rowElement = h('div.dt__row', {
        role: 'row',
        tabindex: onRowClick ? '0' : null,
        on: onRowClick
          ? {
            click: () => onRowClick(row, index),
            keydown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onRowClick(row, index);
              }
            },
          }
          : null,
      });

      for (const column of columns) {
        const cell = h('div', {
          class: columnClasses(column, false, false),
          role: 'cell',
          style: columnStyle(column),
        });

        const content = column.render ? column.render(row, index) : row[column.key];
        if (content === null || content === undefined) {
          cell.appendChild(h('span.dt__dash', { text: '—' }));
        } else if (content instanceof Node) {
          cell.appendChild(content);
        } else {
          cell.appendChild(document.createTextNode(String(content)));
        }
        rowElement.appendChild(cell);
      }
      body.appendChild(rowElement);
    });
  }

  table.appendChild(body);
  return table;
}

/**
 * Sort rows by the active sort descriptor.
 *
 * @param {any[]} rows
 * @param {TableColumn[]} columns
 * @param {{column:string,direction:'asc'|'desc'}} [sort]
 * @returns {any[]}
 */
export function sortRows(rows, columns, sort) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  if (!sort || !sort.column) return list;

  const column = (columns || []).find((entry) => entry.key === sort.column);
  if (!column) return list;

  const direction = sort.direction === 'desc' ? -1 : 1;
  const valueOf = column.sortValue || ((row) => row[column.key]);

  return list.sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);

    const leftMissing = left === null || left === undefined || left === '';
    const rightMissing = right === null || right === undefined || right === '';
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction;
  });
}

/**
 * Toggle a sort descriptor: clicking the active column flips the direction,
 * clicking a new column starts ascending.
 *
 * @param {{column:string,direction:'asc'|'desc'}} [sort]
 * @param {string} column
 * @returns {{column:string,direction:'asc'|'desc'}}
 */
export function toggleSort(sort, column) {
  if (sort && sort.column === column) {
    return { column, direction: sort.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { column, direction: 'asc' };
}
