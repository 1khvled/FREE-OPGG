/**
 * Sortable table.
 *
 * Two variants:
 *
 *   variant 'grid'  (default) — the reference's div grid, captured from the
 *                    shipped desktop renderer (docs/rea/desktop-ui.md):
 *
 *                      div.champion-statistics-table
 *                        div.champion-statistics-table-header
 *                          div.champion-statistics-table-row
 *                            div.champion-statistics-table-column
 *                            div.champion-statistics-table-column__1 … __5
 *                        div.champion-statistics-table-body
 *                          div.champion-statistics-table-row
 *                            div.champion-statistics-table-column
 *
 *                    Header row: 32px tall, padding 0 12px, 12px --text-label.
 *                    Body row:   40px tall, padding-left 12px, --text-primary.
 *                    Table:      border-radius 12px.
 *                    Columns:    # 18px (+4px margin) · role 32px ·
 *                                champion 219px · tier 48px (+8px margin) ·
 *                                win/pick/ban 94px (+8px margin).
 *
 *   variant 'table' — the web app's `<table>` geometry: 32px header on
 *                    --bg-surface-flat, 41px rows on --bg-surface, 4px cell
 *                    padding, 1px --border-row separators.
 *
 * The sort contract is identical in both variants: clicking a sortable
 * column calls `onSort({ column, direction })` and toggles asc/desc.
 */

import { h, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';

/**
 * @typedef {object} TableColumn
 * @property {string} key                - column key (also the sort key).
 * @property {string} [label]            - header label.
 * @property {number|string} [width]     - column width (px or any CSS length).
 * @property {'left'|'center'|'right'} [align] - horizontal alignment.
 * @property {boolean} [sortable=false]  - renders the sort affordance.
 * @property {(row: any) => (Node|string|null|undefined)} [cell] - cell renderer.
 * @property {string} [className]        - extra classes for the body cells.
 * @property {string} [headerClassName]  - extra classes for the header cell.
 * @property {string} [variantClass]     - forced reference modifier class
 *                                        (e.g. `champion-statistics-table-column__5`).
 */

/**
 * @typedef {object} TableSort
 * @property {string} column
 * @property {'asc'|'desc'} direction
 */

/** Reference column widths -> the reference's own modifier class. */
const REFERENCE_COLUMN_CLASS = {
  18: 'champion-statistics-table-column__1',
  32: 'champion-statistics-table-column__2',
  219: 'champion-statistics-table-column__3',
  48: 'champion-statistics-table-column__4',
  94: 'champion-statistics-table-column__5',
};

/**
 * Resolve the reference modifier class of a column.
 *
 * @param {TableColumn} column
 * @returns {string|null}
 */
function columnModifier(column) {
  if (column.variantClass) return column.variantClass;
  if (column.className) return null;
  const width = Number(column.width);
  return REFERENCE_COLUMN_CLASS[width] || null;
}

/**
 * Create a sortable table.
 *
 * @param {object} options
 * @param {TableColumn[]} [options.columns]
 * @param {any[]} [options.rows]
 * @param {TableSort|null} [options.sort] - active sort.
 * @param {Function} [options.onSort] - called with `({ column, direction })`.
 * @param {(row: any) => string|number} [options.rowKey] - stable row key.
 * @param {(row: any) => void} [options.onRowClick] - row activation handler.
 * @param {(row: any) => string} [options.rowHref] - optional href per row
 *        (grid variant wraps the row in an `<a>` like the reference does).
 * @param {Node} [options.emptyState] - rendered when there are no rows.
 * @param {string} [options.label] - accessible name of the table.
 * @param {'grid'|'table'} [options.variant='grid']
 * @param {number|string} [options.width] - table width (grid variant).
 * @returns {{ element: HTMLElement, update: (rows?: any[], sort?: TableSort|null) => void }}
 */
export function createSortableTable(options = {}) {
  const columns = options.columns || [];
  const variant = options.variant === 'table' ? 'table' : 'grid';
  const isGrid = variant === 'grid';

  let rows = options.rows || [];
  let sort = options.sort ? { column: options.sort.column, direction: options.sort.direction } : null;

  /** @type {Map<string, HTMLElement>} */
  const headerCells = new Map();

  let root;
  let headerEl;
  let bodyEl;

  if (isGrid) {
    root = h('div.champion-statistics-table', {
      role: 'table',
      'aria-label': options.label,
    });
    if (options.width !== undefined && options.width !== null) {
      root.style.width = typeof options.width === 'number' ? `${options.width}px` : String(options.width);
    }
    headerEl = h('div.champion-statistics-table-header', { role: 'row' });
    bodyEl = h('div.champion-statistics-table-body', { role: 'rowgroup' });
    root.appendChild(headerEl);
    root.appendChild(bodyEl);
  } else {
    root = h('table.data-table', { 'aria-label': options.label });
    headerEl = h('thead');
    bodyEl = h('tbody');
    root.appendChild(headerEl);
    root.appendChild(bodyEl);
  }

  /**
   * Build the content of a cell.
   *
   * @param {HTMLElement} cell
   * @param {any} row
   * @param {TableColumn} column
   */
  const fillCell = (cell, row, column) => {
    const content = typeof column.cell === 'function'
      ? column.cell(row)
      : (row ? row[column.key] : undefined);

    if (content instanceof Node) {
      cell.appendChild(content);
    } else {
      cell.textContent = content === null || content === undefined ? '' : String(content);
    }
  };

  const applyColumnStyle = (cell, column) => {
    if (column.width !== undefined && column.width !== null) {
      const width = typeof column.width === 'number' ? `${column.width}px` : String(column.width);
      cell.style.width = width;
      if (isGrid) cell.style.flex = `0 0 ${width}`;
    }
    if (column.align) cell.style.textAlign = column.align;
  };

  const renderSortState = () => {
    for (const [key, cell] of headerCells) {
      const indicator = cell.querySelector('.table-sort__indicator');
      const active = Boolean(sort && sort.column === key);
      cell.classList.toggle('is-sorted', active);
      if (cell.classList.contains('table-sort')) {
        cell.setAttribute('aria-sort', active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      }
      if (indicator) {
        indicator.textContent = active ? (sort.direction === 'asc' ? '▲' : '▼') : '';
        indicator.classList.toggle('is-visible', active);
      }
    }
  };

  /** Toggle the sort direction and notify the page. */
  const handleSort = (column) => {
    const direction = (sort && sort.column === column.key && sort.direction === 'asc')
      ? 'desc'
      : 'asc';
    sort = { column: column.key, direction };
    renderSortState();
    if (typeof options.onSort === 'function') {
      options.onSort({ column: column.key, direction });
    }
  };

  const buildHeaderCell = (column, tag) => {
    const cell = h(tag, tag === 'th' ? { scope: 'col' } : { role: 'columnheader' });
    applyColumnStyle(cell, column);

    const modifier = columnModifier(column);
    if (modifier) cell.classList.add(modifier);
    if (column.headerClassName) {
      cell.classList.add(...String(column.headerClassName).split(/\s+/).filter(Boolean));
    }

    cell.appendChild(h('span.data-table__label', {
      text: column.label === null || column.label === undefined ? '' : String(column.label),
    }));

    if (column.sortable) {
      cell.classList.add('table-sort');
      cell.setAttribute('aria-sort', 'none');
      cell.appendChild(h('span.table-sort__indicator', { 'aria-hidden': 'true' }));
      cell.addEventListener('click', () => handleSort(column));
    }

    return cell;
  };

  const renderHeader = () => {
    clear(headerEl);
    headerCells.clear();

    if (isGrid) {
      // The reference nests the header columns directly inside
      // `.champion-statistics-table-header` (there is no header row element).
      for (const column of columns) {
        const cell = buildHeaderCell(column, 'div');
        headerCells.set(column.key, cell);
        headerEl.appendChild(cell);
      }
    } else {
      const tr = h('tr');
      for (const column of columns) {
        const th = buildHeaderCell(column, 'th');
        headerCells.set(column.key, th);
        tr.appendChild(th);
      }
      headerEl.appendChild(tr);
    }

    renderSortState();
  };

  /** Attach the row activation behaviour to a row element. */
  const makeRowClickable = (rowEl, row) => {
    if (typeof options.onRowClick !== 'function') return;
    rowEl.classList.add('is-clickable');
    rowEl.tabIndex = 0;
    rowEl.addEventListener('click', () => options.onRowClick(row));
    rowEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        options.onRowClick(row);
      }
    });
  };

  const renderBody = () => {
    clear(bodyEl);

    if (!rows.length) {
      const empty = options.emptyState
        || h('span.text-muted', { text: t('lol.common.no-data') });

      if (isGrid) {
        const row = h('div.champion-statistics-table-row', { role: 'row' });
        const cell = h('div.champion-statistics-table-column.champion-statistics-table-empty', {
          role: 'cell',
        });
        cell.appendChild(empty);
        row.appendChild(cell);
        bodyEl.appendChild(row);
      } else {
        const tr = h('tr.data-table__empty-row');
        const td = h('td.data-table__empty', { colspan: String(Math.max(columns.length, 1)) });
        td.appendChild(empty);
        tr.appendChild(td);
        bodyEl.appendChild(tr);
      }
      return;
    }

    for (const row of rows) {
      if (isGrid) {
        const rowEl = h('div.champion-statistics-table-row', { role: 'row' });

        if (typeof options.rowKey === 'function') {
          const key = options.rowKey(row);
          if (key !== null && key !== undefined) rowEl.dataset.key = String(key);
        }

        makeRowClickable(rowEl, row);

        for (const column of columns) {
          const cell = h('div.champion-statistics-table-column', { role: 'cell' });
          applyColumnStyle(cell, column);

          const modifier = columnModifier(column);
          if (modifier) cell.classList.add(modifier);
          if (column.className) {
            cell.classList.add(...String(column.className).split(/\s+/).filter(Boolean));
          }

          fillCell(cell, row, column);
          rowEl.appendChild(cell);
        }

        if (typeof options.rowHref === 'function') {
          const href = options.rowHref(row);
          if (href) {
            const anchor = h('a.champion-statistics-table-link', { href, draggable: 'false' });
            anchor.appendChild(rowEl);
            bodyEl.appendChild(anchor);
            continue;
          }
        }

        bodyEl.appendChild(rowEl);
        continue;
      }

      const tr = h('tr.data-table__row');

      if (typeof options.rowKey === 'function') {
        const key = options.rowKey(row);
        if (key !== null && key !== undefined) tr.dataset.key = String(key);
      }

      makeRowClickable(tr, row);

      for (const column of columns) {
        const td = h('td');
        if (column.align) td.style.textAlign = column.align;
        if (column.className) {
          td.classList.add(...String(column.className).split(/\s+/).filter(Boolean));
        }
        fillCell(td, row, column);
        tr.appendChild(td);
      }

      bodyEl.appendChild(tr);
    }
  };

  /**
   * Re-render the table with new data and/or a new sort state.
   *
   * @param {any[]} [nextRows]
   * @param {TableSort|null} [nextSort]
   */
  const update = (nextRows, nextSort) => {
    if (nextRows !== undefined) rows = nextRows || [];
    if (nextSort !== undefined) {
      sort = nextSort ? { column: nextSort.column, direction: nextSort.direction } : null;
    }
    renderSortState();
    renderBody();
  };

  renderHeader();
  renderBody();

  return { element: root, update };
}
