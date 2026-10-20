/**
 * Native select control styled like the reference's filter dropdowns:
 * 32px tall, `--bg-surface-raised` fill, `--border-subtle` border, 4px radius,
 * 13px labels.
 */

import { h } from '../core/dom.js';

/**
 * Create a select.
 *
 * @param {object} options
 * @param {string|number} [options.value] - initially selected value.
 * @param {Array<{value: string|number, label: string}|string>} [options.list] -
 *        alias of `options.options` (kept for convenience).
 * @param {Array<{value: string|number, label: string}|string>} [options.options] -
 *        the choices.
 * @param {Function} [options.onChange] - called with `(value, event)`.
 * @param {string} [options.label] - accessible name (also used as the title).
 * @param {string} [options.name] - form field name.
 * @param {string} [options.id] - element id.
 * @param {boolean} [options.disabled=false]
 * @returns {HTMLSelectElement}
 */
export function createSelect(options = {}) {
  const list = options.options || options.list || [];

  const select = h('select.select', {
    name: options.name,
    id: options.id,
    'aria-label': options.label,
    title: options.label,
  });

  if (options.disabled) select.disabled = true;

  for (const entry of list) {
    const option = typeof entry === 'object' && entry !== null
      ? { value: entry.value, label: entry.label ?? entry.value }
      : { value: entry, label: entry };

    const el = h('option', {
      value: option.value === null || option.value === undefined ? '' : String(option.value),
      text: option.label === null || option.label === undefined ? '' : String(option.label),
    });

    select.appendChild(el);
  }

  if (options.value !== null && options.value !== undefined) {
    select.value = String(options.value);
  }

  if (typeof options.onChange === 'function') {
    select.addEventListener('change', (event) => {
      options.onChange(select.value, event);
    });
  }

  return select;
}
