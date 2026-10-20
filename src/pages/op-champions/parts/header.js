/**
 * The screen heading.
 *
 * The reference's "OP champions" screen shows the honey-badge icon next to the
 * `common.op` title and the "Click a champion to see one-trick builds on
 * OP.GG." line underneath it, plus the number of champions in the tier.
 */

import { h } from '../../../core/dom.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @returns {{ element: HTMLElement, setCount: (count:number) => void }}
 */
export function createHeader({ t }) {
  const count = h('span.op-champions__count', { text: '0' });

  const heading = h('div.op-champions__heading', {}, [
    h('h1.op-champions__title', { text: t('common.op', null, 'OP champions') }),
    count,
  ]);

  const subtitle = h('p.op-champions__subtitle', {
    text: t('lol.common.op-masters-builds', null, 'Click a champion to see one-trick builds on OP.GG.'),
  });

  const element = h('header.op-champions__header', {}, [heading, subtitle]);

  return {
    element,

    /**
     * Show how many champions are in the tier.
     *
     * @param {number} count - the number of champions.
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
