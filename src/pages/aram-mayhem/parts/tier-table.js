/**
 * ARAM: Mayhem — the swarm table.
 *
 *   div.tier-table
 *     div.tier-table-row                 one tier
 *       div.tier-table-row-col1.row-N    the tier label (the coloured rail)
 *       div.tier-table-row-col2          the champions of the tier
 *
 * The tier colour (`row-0` … `row-5`) sits on the label cell: the reference
 * paints the 56px rail with the tier colour and rounds its outer corners, so
 * the rail follows the rounded corners of the table.
 */

import { h, replace } from '../../../core/dom.js';
import { tierBadgeLetter, tierBadgeUrl, tierLabel } from '../data.js';

/**
 * Create the swarm table.
 *
 * @returns {{element:HTMLElement, setRows:Function}}
 */
export function createTierTable() {
  const element = h('div.tier-table');

  return {
    element,

    /**
     * Fill the table with the tier rows.
     *
     * @param {Array<{tier:number, champions:Array<object>}>} rows
     * @param {Function} cellFactory - builds the cell of one champion; it
     *   returns the cell handle of `parts/champion-cell.js`.
     * @returns {Array<{element:HTMLElement, tier:number, cells:Array<object>}>}
     *   the row views, in display order.
     */
    setRows(rows, cellFactory) {
      const list = Array.isArray(rows) ? rows : [];
      const views = [];

      replace(element, list.map((row) => {
        const view = createTierRow(row, cellFactory);
        views.push(view);
        return view.element;
      }));

      return views;
    },
  };
}

/**
 * Create one tier row.
 *
 * @param {{tier:number, champions:Array<object>}} row
 * @param {Function} cellFactory
 * @returns {{element:HTMLElement, tier:number, cells:Array<object>}}
 */
function createTierRow(row, cellFactory) {
  const bucket = row.tier;

  const badge = h('img', {
    src: tierBadgeUrl(bucket),
    alt: `${tierLabel(bucket)} (${tierBadgeLetter(bucket)})`,
    width: 24,
    height: 24,
    draggable: 'false',
  });

  const label = h('div', {
    style: {
      display: 'flex',
      width: '24px',
      height: '24px',
      alignItems: 'center',
      justifyContent: 'center',
    },
  }, [badge]);

  const col1 = h(`div.tier-table-row-col1.row-${bucket}`, {
    title: tierLabel(bucket),
  }, [label]);

  const cells = row.champions.map((champion) => ({
    champion,
    handle: cellFactory(champion),
  }));

  const col2 = h('div.tier-table-row-col2', {}, cells.map((entry) => entry.handle.element));

  const element = h('div.tier-table-row', {}, [col1, col2]);

  return { element, tier: bucket, cells };
}
