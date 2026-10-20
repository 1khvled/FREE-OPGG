/**
 * Tab strip.
 *
 * Two variants, both measured from the shipped desktop renderer
 * (docs/rea/desktop-ui.md):
 *
 *   variant 'pill'      (default) — the reference's role tabs:
 *                        height 36px, padding 10px 16px, border-radius 4px 0 0 4px,
 *                        label 12px, active background --brand with a
 *                        --text-primary label, inactive transparent with a
 *                        --text-muted label.
 *                        Class names: `recommendation-tab`,
 *                        `recommendation-tab-active`, `recommendation-tab-title`,
 *                        `recommendation-tab-title-active`.
 *
 *   variant 'underline' — the web-app underline strip: 15px/24px labels, 3px
 *                        transparent bottom border, 12px top / 9px bottom
 *                        padding, active --text-primary (weight 700),
 *                        inactive --text-secondary.
 *                        Class names: `tabs`, `tabs__item`, `is-active`.
 */

import { h } from '../core/dom.js';

/**
 * Create a tab strip.
 *
 * @param {object} options
 * @param {string|number} [options.value] - active tab id.
 * @param {Array<{id: string|number, label: string, icon?: string|Node}>} [options.tabs]
 *        the tabs; `icon` may be an image URL or a ready-made node.
 * @param {Function} [options.onChange] - called with `(id, event)`.
 * @param {string} [options.label] - accessible name of the tab list.
 * @param {'pill'|'underline'} [options.variant='pill']
 * @returns {{ element: HTMLElement, setValue: (id: string|number) => void }}
 */
export function createTabs(options = {}) {
  const tabs = options.tabs || [];
  const variant = options.variant === 'underline' ? 'underline' : 'pill';
  const isPill = variant === 'pill';

  const el = h('div.tabs', {
    class: `tabs--${variant}`,
    role: 'tablist',
    'aria-label': options.label,
  });

  const buttons = new Map();

  const setValue = (next) => {
    const key = next === null || next === undefined ? '' : String(next);
    for (const [tabId, button] of buttons) {
      const active = tabId === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;

      if (isPill) {
        button.classList.toggle('recommendation-tab-active', active);
        const title = button.querySelector('.recommendation-tab-title');
        if (title) title.classList.toggle('recommendation-tab-title-active', active);
      }
    }
  };

  for (const tab of tabs) {
    const id = tab.id === null || tab.id === undefined ? '' : String(tab.id);

    const button = h('button', {
      type: 'button',
      role: 'tab',
      dataset: { tabId: id },
    });

    if (isPill) {
      button.classList.add('recommendation-tab');
    } else {
      button.classList.add('tabs__item');
    }

    if (tab.icon) {
      const icon = tab.icon instanceof Node
        ? tab.icon
        : h('img.recommendation-tab-icon', { src: String(tab.icon), alt: '', 'aria-hidden': 'true' });
      button.appendChild(icon);
    }

    const labelText = tab.label === null || tab.label === undefined ? '' : String(tab.label);
    const title = h('span', {
      text: labelText,
    });
    if (isPill) title.classList.add('recommendation-tab-title');
    else title.classList.add('tabs__label');
    button.appendChild(title);

    button.addEventListener('click', (event) => {
      setValue(id);
      if (typeof options.onChange === 'function') options.onChange(id, event);
    });

    buttons.set(id, button);
    el.appendChild(button);
  }

  if (options.value !== null && options.value !== undefined) {
    setValue(options.value);
  }

  return { element: el, setValue };
}
