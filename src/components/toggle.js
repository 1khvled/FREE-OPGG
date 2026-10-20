/**
 * Switch / toggle — a 13px label on the left, the track on the right.
 */

import { h } from '../core/dom.js';

/**
 * Create a toggle.
 *
 * @param {object} options
 * @param {boolean} [options.checked=false] - initial state.
 * @param {Function} [options.onChange] - called with `(checked, event)`.
 * @param {string} [options.label=''] - label rendered to the left of the switch.
 * @param {boolean} [options.disabled=false]
 * @returns {HTMLElement} - a `<label>` wrapping the hidden checkbox.
 */
export function createToggle(options = {}) {
  const checked = Boolean(options.checked);
  const labelText = options.label ?? '';

  const input = h('input.toggle__input', {
    type: 'checkbox',
    checked,
  });

  if (options.disabled) input.disabled = true;
  if (options.name) input.name = options.name;

  const el = h('label.toggle', {
    class: options.disabled ? 'is-disabled' : null,
  });

  el.appendChild(h('span.toggle__label', { text: labelText }));
  el.appendChild(input);
  el.appendChild(h('span.toggle__track', { 'aria-hidden': 'true' }, h('span.toggle__thumb')));

  if (typeof options.onChange === 'function') {
    input.addEventListener('change', (event) => {
      options.onChange(input.checked, event);
    });
  }

  /** Programmatic access for pages that need to flip the switch. */
  Object.defineProperty(el, 'checked', {
    get: () => input.checked,
    set: (next) => { input.checked = Boolean(next); },
  });

  return el;
}
