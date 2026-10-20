/**
 * Segmented control — the pill row the reference uses for role tabs and
 * filter switches (24px tall, 4px radius, 13px labels).
 */

import { h } from '../core/dom.js';

/**
 * Create a segmented control.
 *
 * @param {object} options
 * @param {string|number} [options.value] - initially active value.
 * @param {Array<{value: string|number, label: string}|string>} [options.list] -
 *        alias of `options.options`.
 * @param {Array<{value: string|number, label: string}|string>} [options.options] -
 *        the segments.
 * @param {Function} [options.onChange] - called with `(value, event)`.
 * @param {string} [options.label] - accessible name of the group.
 * @returns {HTMLElement}
 */
export function createSegmentedControl(options = {}) {
  const list = options.options || options.list || [];

  const el = h('div.segmented-control', {
    role: 'tablist',
    'aria-label': options.label,
  });

  const items = new Map();

  const setValue = (next) => {
    const key = next === null || next === undefined ? '' : String(next);
    for (const [itemKey, button] of items) {
      const active = itemKey === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    }
  };

  for (const entry of list) {
    const option = typeof entry === 'object' && entry !== null
      ? { value: entry.value, label: entry.label ?? entry.value }
      : { value: entry, label: entry };

    const key = option.value === null || option.value === undefined ? '' : String(option.value);

    const button = h('button.segmented-control__item', {
      type: 'button',
      role: 'tab',
      text: option.label === null || option.label === undefined ? '' : String(option.label),
      dataset: { value: key },
    });

    button.addEventListener('click', (event) => {
      setValue(key);
      if (typeof options.onChange === 'function') options.onChange(key, event);
    });

    items.set(key, button);
    el.appendChild(button);
  }

  if (options.value !== null && options.value !== undefined) {
    setValue(options.value);
  }

  /** Programmatic access for pages that need to switch segments. */
  el.setValue = setValue;

  return el;
}
