/**
 * The screen heading.
 *
 * The ARAM screen shows the queue's own title (`lol.common.gameMode.aram` =
 * "ARAM"), the patch the tier list was built for and the number of champions
 * the list covers.
 */

import { h } from '../../../core/dom.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @returns {{ element: HTMLElement, setCount: (count:number) => void, setPatch: (patch:string|null) => void }}
 */
export function createHeader({ t }) {
  const count = h('span.aram__count', { text: '0' });
  const patch = h('span.aram__patch', { hidden: true });

  const heading = h('div.aram__heading', {}, [
    h('h1.aram__title', { text: t('lol.common.gameMode.aram', null, 'ARAM') }),
    patch,
    count,
  ]);

  const subtitle = h('p.aram__subtitle', {
    text: t('lol.champions.champion-list', null, 'Champion list'),
  });

  const element = h('header.aram__header', {}, [heading, subtitle]);

  return {
    element,

    /**
     * Show how many champions the list covers.
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

    /**
     * Show the patch the tier list was built for.
     *
     * @param {string|null} value - e.g. `16.20`.
     */
    setPatch(value) {
      const text = value === null || value === undefined ? '' : String(value).trim();
      if (!text) {
        patch.hidden = true;
        patch.textContent = '';
        return;
      }
      patch.hidden = false;
      patch.textContent = text;
      patch.setAttribute('title', text);
    },
  };
}
