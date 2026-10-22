/**
 * ARAM: Mayhem — one champion of the swarm table.
 *
 * The reference's cell is a column of three things: the portrait, the name
 * and the augment the champion pairs with.
 *
 *   div.swarm-tier
 *     div.pal-image        the 64 × 64 portrait plate
 *       img
 *     div                  the champion name, 48px wide, ellipsised
 *       span.champion-name
 *     div.works            the augment icons
 *       div.work
 *         img
 *     div.augment-name     the name of the augment they pair with
 *
 * The augment strip and its label only exist when the champion really has an
 * augment pairing: a champion without an `augment_group` shows its portrait
 * and its name, nothing else.
 */

import { h, replace } from '../../../core/dom.js';
import { portraitUrl } from '../data.js';

/**
 * Mark the searched part of a champion name.
 *
 * The name is escaped before the mark is inserted, so an untrusted name can
 * never inject markup.
 *
 * @param {string} name
 * @param {string} query
 * @returns {string} the HTML of the name.
 */
export function highlightName(name, query) {
  const raw = String(name ?? '');
  const needle = String(query ?? '').trim();
  if (!needle) return escapeText(raw);

  const index = raw.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return escapeText(raw);

  const before = escapeText(raw.slice(0, index));
  const match = escapeText(raw.slice(index, index + needle.length));
  const after = escapeText(raw.slice(index + needle.length));

  return `${before}<mark class="search-highlight">${match}</mark>${after}`;
}

/**
 * Escape the characters that would break out of the name markup.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

/**
 * Create the cell of one champion.
 *
 * @param {object} champion - `{ id, name, imageUrl }`.
 * @param {object} [options]
 * @param {string} [options.query] - the current search term.
 * @param {Function} [options.onSelect] - called when the cell is activated.
 * @returns {{element:HTMLElement, nameElement:HTMLElement, setAugments:Function, setCurrent:Function, scrollIntoView:Function}}
 */
export function createChampionCell(champion, options = {}) {
  const query = options.query || '';
  const onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;

  const plate = h('div.pal-image');

  const source = portraitUrl(champion);
  if (source) {
    const image = h('img', {
      src: source,
      alt: champion.name,
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
      on: {
        error: () => {
          image.remove();
          plate.classList.add('pal-image--empty');
        },
      },
    });
    plate.appendChild(image);
  } else {
    plate.classList.add('pal-image--empty');
  }

  const nameElement = h('span.champion-name');
  nameElement.innerHTML = highlightName(champion.name, query);

  const nameCell = h('div', {}, [nameElement]);

  const works = h('div.works');
  const augmentLabel = h('div.augment-name');

  const element = h('div.swarm-tier', {
    title: champion.name,
    role: 'button',
    tabindex: '0',
    on: {
      click: () => {
        if (onSelect) onSelect(champion);
      },
      keydown: (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (onSelect) onSelect(champion);
      },
    },
  }, [plate, nameCell]);

  /**
   * Show the augments the champion pairs with.
   *
   * @param {Array<object>} augments - the picked augments, best first.
   */
  function setAugments(augments) {
    const list = Array.isArray(augments) ? augments : [];

    if (!list.length) {
      if (works.parentNode) works.remove();
      if (augmentLabel.parentNode) augmentLabel.remove();
      return;
    }

    replace(works, list.map((augment) => h('div.work', { title: augment.name }, [
      h('img', {
        src: augment.iconUrl,
        alt: augment.name,
        loading: 'lazy',
        decoding: 'async',
        referrerpolicy: 'no-referrer',
        on: {
          error: (event) => {
            event.target.remove();
          },
        },
      }),
    ])));

    augmentLabel.textContent = list[0].name;
    augmentLabel.title = list.map((augment) => augment.name).join(', ');

    if (!works.parentNode) element.appendChild(works);
    if (!augmentLabel.parentNode) element.appendChild(augmentLabel);
  }

  return {
    element,
    nameElement,

    setAugments,

    /**
     * Write the name into the cell, marking the searched part of it.
     *
     * @param {string} html - the escaped name, with the match marked.
     */
    setHighlight(html) {
      nameElement.innerHTML = html;
    },

    /**
     * Mark the cell as the current search match.
     *
     * @param {boolean} current
     */
    setCurrent(current) {
      nameElement.classList.toggle('highlighted', Boolean(current));
    },

    /** Scroll the cell into the middle of the table. */
    scrollIntoView() {
      if (typeof element.scrollIntoView !== 'function') return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
  };
}
