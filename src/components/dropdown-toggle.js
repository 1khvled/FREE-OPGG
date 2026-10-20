/**
 * Dropdown toggle — the reference's filter dropdown button
 * (region / tier / patch pickers).
 *
 * Measured from the shipped desktop renderer (docs/rea/desktop-ui.md):
 *
 *   .dropdown-toggle      36px tall, border-radius 4px, padding-left 12px, flex
 *   .dropdown-toggle span margin-left 8px
 *   .dropdown-toggle.has-icon  carries the leading flag / global icon
 *   img.down-arrow        12px chevron-down at the end
 */

import { h } from '../core/dom.js';

/**
 * Build the 12px chevron-down glyph (inline SVG, no network request).
 *
 * @returns {SVGElement}
 */
function createChevron() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = '<path d="M2.5 4.5 L6 8 L9.5 4.5" stroke="var(--text-muted)" '
    + 'stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />';
  return svg;
}

/**
 * Create a dropdown toggle button.
 *
 * @param {object} options
 * @param {string} [options.label=''] - the button text.
 * @param {string|Node} [options.icon] - leading icon (image URL or node).
 * @param {Function} [options.onClick] - click handler.
 * @param {string} [options.className] - extra classes.
 * @param {boolean} [options.disabled=false]
 * @returns {HTMLElement}
 */
export function createDropdownToggle(options = {}) {
  const label = options.label ?? '';

  const el = h('button.dropdown-toggle', {
    type: 'button',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
  });

  if (options.className) {
    el.classList.add(...String(options.className).split(/\s+/).filter(Boolean));
  }
  if (options.disabled) el.disabled = true;

  if (options.icon) {
    el.classList.add('has-icon');
    const icon = options.icon instanceof Node
      ? options.icon
      : h('img.dropdown-toggle__icon', { src: String(options.icon), alt: '', 'aria-hidden': 'true' });
    el.appendChild(icon);
  }

  el.appendChild(h('span.dropdown-toggle__label', { text: label }));
  el.appendChild(h('span.dropdown-toggle__chevron', { 'aria-hidden': 'true' }, createChevron()));

  if (typeof options.onClick === 'function') {
    el.addEventListener('click', (event) => options.onClick(event));
  }

  return el;
}
