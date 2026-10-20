/**
 * Role tabs — Top / Jungle / Mid / ADC / Support.
 *
 * The desktop app is role-scoped: there is no "All" tab. The reference
 * treatment is `.recommendation-tab` (36px tall, 10px 16px padding, 12px
 * label); the active tab paints its background with the brand purple and
 * swaps the position icon for its white variant.
 */

import { h } from '../../../core/dom.js';
import { roleIconUrl } from '../data.js';

/**
 * @param {object} options
 * @param {Array<{value:string,labelKey?:string,fallback?:string}>} options.tabs
 * @param {string} options.value - the active role.
 * @param {(value:string)=>void} options.onChange
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 */
export function createRoleTabs({ tabs, value, onChange, t }) {
  const root = h('div.statistics-tabs__roles', { role: 'tablist', 'aria-label': 'Role' });
  const entries = [];

  for (const tab of tabs) {
    const label = tab.labelKey ? t(tab.labelKey, null, tab.fallback) : tab.label;
    const icon = h('img.recommendation-tab__icon', {
      src: roleIconUrl(tab.value, false),
      alt: '',
      width: 18,
      height: 18,
      loading: 'lazy',
      draggable: 'false',
    });
    const title = h('span.recommendation-tab-title', { text: label });

    const button = h('div.recommendation-tab', {
      role: 'tab',
      tabindex: '0',
      'data-role': tab.value,
      'aria-selected': 'false',
      on: {
        click: () => onChange(tab.value),
        keydown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onChange(tab.value);
          }
        },
      },
    }, [icon, title]);

    entries.push({ value: tab.value, button, icon, title });
    root.appendChild(button);
  }

  function setValue(next) {
    for (const entry of entries) {
      const active = entry.value === next;
      entry.button.classList.toggle('recommendation-tab-active', active);
      entry.button.setAttribute('aria-selected', active ? 'true' : 'false');
      entry.title.classList.toggle('recommendation-tab-title-active', active);
      const src = roleIconUrl(entry.value, active);
      if (src && entry.icon.getAttribute('src') !== src) entry.icon.setAttribute('src', src);
    }
  }

  setValue(value);

  return { element: root, setValue };
}
