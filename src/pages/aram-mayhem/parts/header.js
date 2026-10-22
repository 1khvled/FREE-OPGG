/**
 * ARAM: Mayhem — the page header.
 *
 * The reference's header is a single row: the search field on the left and
 * the match counter on the right.
 *
 *   div.header
 *     div.search                    the field, 400px wide
 *       div.search-field            the relative wrapper of the input
 *         input                     the field itself
 *         button.search-clear       the round clear button (only with a query)
 *     div.search-meta               the match counter (only with a query)
 *       span.search-meta__count     "3 / 12" or "No results."
 *       div.search-meta-nav         the previous / next buttons
 *
 * The page title (`h1`) is a sibling of the header row, the way the
 * reference has it.
 *
 * The chevron glyph is the reference's own polygon; the five groups it is
 * wrapped in add up to the identity transform, so the polygon is placed
 * directly and painted with `currentColor` — the button's own colour.
 */

import { h } from '../../../core/dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create an SVG element with its attributes.
 *
 * @param {string} name
 * @param {object} attributes
 * @returns {SVGElement}
 */
function svg(name, attributes) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  return el;
}

/**
 * The reference's chevron glyph, rotated.
 *
 * @param {number} rotate - the rotation in degrees.
 * @returns {SVGElement}
 */
function createChevron(rotate) {
  const root = svg('svg', {
    width: '16px',
    height: '16px',
    viewBox: '0 0 24 24',
    version: '1.1',
    'aria-hidden': 'true',
    focusable: 'false',
    style: `transform: rotate(${rotate}deg)`,
  });

  const group = svg('g', {
    stroke: 'none',
    'stroke-width': '1',
    fill: 'none',
    'fill-rule': 'evenodd',
  });

  group.appendChild(svg('polygon', {
    id: 'Mask',
    points: '10.8 12 15 16.5 13.6 18 8 12 13.6 6 15 7.5',
    fill: 'currentColor',
  }));

  root.appendChild(group);
  return root;
}

/**
 * Create the header of the ARAM: Mayhem screen.
 *
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(value:string)=>void} options.onQuery - called on every keystroke.
 * @param {()=>void} options.onClear - called when the clear button is used.
 * @param {(delta:number)=>void} options.onStep - called by the counter's arrows.
 * @returns {{element:HTMLElement, input:HTMLInputElement, focus:Function, setQuery:Function, setState:Function}}
 */
export function createHeader({ t, onQuery, onClear, onStep }) {
  const title = h('h1', {
    text: t('lol.aram-mayhem.aram-mayhem', null, 'ARAM: Mayhem'),
  });

  const placeholder = t('lol.buff-nerf.search-champions', null, 'Search champions...');

  const input = h('input', {
    type: 'text',
    placeholder,
    'aria-label': placeholder,
    autocomplete: 'off',
    spellcheck: 'false',
    on: {
      input: (event) => onQuery(event.target.value),
    },
  });

  const clearButton = h('button.search-clear', {
    type: 'button',
    'aria-label': t('app.close', null, 'Close'),
    hidden: true,
    on: {
      click: () => onClear(),
    },
  }, [h('span.search-clear-sign', { text: '×' })]);

  const search = h('div.search', {}, [
    h('div.search-field', {}, [input, clearButton]),
  ]);

  const count = h('span.search-meta__count');

  // The catalogue has no key for the two stepper buttons; they carry a plain
  // English accessible name instead of a missing key.
  const previous = h('button.search-meta-btn', {
    type: 'button',
    'aria-label': 'Previous match',
    on: { click: () => onStep(-1) },
  }, [createChevron(90)]);

  const next = h('button.search-meta-btn', {
    type: 'button',
    'aria-label': 'Next match',
    on: { click: () => onStep(1) },
  }, [createChevron(270)]);

  const nav = h('div.search-meta-nav', {}, [previous, next]);
  const meta = h('div.search-meta', { hidden: true }, [count, nav]);

  const element = h('div.header', {}, [search, meta]);

  return {
    element,
    title,
    input,

    /** Focus the search field. */
    focus() {
      input.focus();
      input.select();
    },

    /** Write a value into the field without firing the input handler. */
    setQuery(value) {
      input.value = String(value ?? '');
    },

    /**
     * Update the header for the current search.
     *
     * @param {object} state
     * @param {string} state.query
     * @param {number} state.total - the number of matches.
     * @param {number} state.index - the index of the current match.
     */
    setState({ query, total, index }) {
      const active = String(query || '').trim().length > 0;

      clearButton.hidden = !active;
      meta.hidden = !active;

      if (!active) {
        count.textContent = '';
        return;
      }

      count.textContent = total > 0
        ? `${index + 1} / ${total}`
        : t('lol.common.no-results', null, 'No results.');

      nav.hidden = total <= 0;
    },
  };
}
