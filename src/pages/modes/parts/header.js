/**
 * The screen heading.
 *
 * The reference's "Game modes" screen shows the `common.sidebar.gameMode`
 * title, the number of champions the mode covers and the balance section's
 * own heading (`lol.common.gameMode.balance.title`).
 */

import { h } from '../../../core/dom.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @returns {{ element: HTMLElement, setCount: (count:number) => void }}
 */
export function createHeader({ t }) {
  const count = h('span.modes__count', { text: '0' });

  const heading = h('div.modes__heading', {}, [
    h('h1.modes__title', { text: t('common.sidebar.gameMode', null, 'Game modes') }),
    count,
  ]);

  const subtitle = h('p.modes__subtitle', {
    text: t('lol.common.gameMode.balance.title', null, 'Balance Adjustments'),
  });

  const element = h('header.modes__header', {}, [heading, subtitle]);

  return {
    element,

    /**
     * Show how many champions the table currently lists.
     *
     * @param {number} value - the number of champions.
     */
    setCount(value) {
      const n = Number.isFinite(value) ? value : 0;
      count.textContent = String(n);

      const label = `${t('lol.champions.champion-list', null, 'Champion list')} · ${n}`;
      count.setAttribute('title', label);
      count.setAttribute('aria-label', label);
    },
  };
}
