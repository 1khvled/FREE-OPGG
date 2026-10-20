/**
 * Filter bar — the region, tier and patch dropdowns of the desktop app.
 *
 * The reference markup is
 *
 *   div.dropdown-container
 *     div
 *       button.dropdown-toggle[.has-icon]
 *         img (region flag)   span "GLOBAL"   img.down-arrow
 *
 * The region dropdown carries a leading flag icon (`.has-icon`), the tier and
 * patch dropdowns do not. Every dropdown ends with the reference's
 * `icon-down.svg` arrow.
 */

import { h, clear } from '../../../core/dom.js';
import { downArrowUrl, regionIconUrl } from '../data.js';

/**
 * A labelled dropdown.
 *
 * @param {object} options
 * @param {string} options.name - data attribute / test hook.
 * @param {string} options.value - the selected option value.
 * @param {Array<{value:string,labelKey?:string,label?:string,fallback?:string,suffix?:string}>} options.options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(value:string)=>void} options.onChange
 * @param {boolean} [options.hasIcon=false] - render a leading icon.
 * @param {(value:string)=>string|null} [options.iconUrl] - leading icon URL.
 */
function createDropdown({ name, value, options, t, onChange, hasIcon = false, iconUrl = null }) {
  const root = h('div.dropdown-container', { 'data-dropdown': name });
  const inner = h('div');

  const valueEl = h('span');
  const arrow = h('img.down-arrow', {
    src: downArrowUrl(),
    alt: '',
    width: 10,
    height: 10,
    'aria-hidden': 'true',
  });

  const button = h('button.dropdown-toggle', {
    type: 'button',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'data-dropdown-toggle': name,
  });

  if (hasIcon) {
    button.classList.add('has-icon');
    const icon = h('img.dropdown-toggle__icon', {
      src: iconUrl ? iconUrl(value) : null,
      alt: '',
      width: 16,
      height: 16,
      'aria-hidden': 'true',
    });
    button.appendChild(icon);
  }

  button.append(valueEl, arrow);

  const menu = h('ul.dropdown-menu', {
    role: 'listbox',
    'aria-label': name,
    hidden: true,
  });

  inner.append(button, menu);
  root.appendChild(inner);

  let current = value;
  let entries = [];
  let open = false;

  function optionLabel(option) {
    const base = option.labelKey ? t(option.labelKey, null, option.fallback) : option.label;
    return option.suffix ? `${base}${option.suffix}` : base;
  }

  function currentOption() {
    return options.find((option) => option.value === current) || null;
  }

  function sync() {
    const option = currentOption();
    valueEl.textContent = option ? optionLabel(option) : '';
    for (const entry of entries) {
      const selected = entry.option.value === current;
      entry.item.classList.toggle('is-selected', selected);
      entry.item.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
    if (hasIcon && iconUrl) {
      const icon = button.querySelector('.dropdown-toggle__icon');
      const src = iconUrl(current);
      if (icon && src) icon.setAttribute('src', src);
    }
  }

  function build() {
    clear(menu);
    entries = options.map((option) => {
      const item = h('li.dropdown-menu__item', {
        role: 'option',
        tabindex: '-1',
        'data-value': option.value,
        on: {
          click: () => {
            close();
            select(option.value);
          },
        },
      }, [optionLabel(option)]);
      menu.appendChild(item);
      return { option, item };
    });
    sync();
  }

  function select(next) {
    if (next === current) return;
    current = next;
    sync();
    onChange(next);
  }

  function onDocumentClick(event) {
    if (!root.contains(event.target)) close();
  }

  function onDocumentKeydown(event) {
    if (event.key === 'Escape') {
      close();
      button.focus();
    }
  }

  function show() {
    if (open) return;
    open = true;
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onDocumentKeydown, true);
  }

  function close() {
    if (!open) return;
    open = false;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocumentClick, true);
    document.removeEventListener('keydown', onDocumentKeydown, true);
  }

  button.addEventListener('click', () => {
    if (open) close();
    else show();
  });

  build();

  return {
    element: root,
    setValue(next) {
      current = next;
      sync();
    },
    setOptions(next) {
      options = next;
      build();
    },
  };
}

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {object} options.filters - the current filter values.
 * @param {object} options.options - `{ region, tier, patch }` option lists.
 * @param {(patch:object)=>void} options.onChange
 */
export function createFilterBar({ t, filters, options, onChange }) {
  const root = h('div.statistics-tabs__filters');

  const regionDropdown = createDropdown({
    name: 'region',
    value: filters.region,
    options: options.region,
    t,
    hasIcon: true,
    iconUrl: regionIconUrl,
    onChange: (value) => onChange({ region: value }),
  });

  const tierDropdown = createDropdown({
    name: 'tier',
    value: filters.tier,
    options: options.tier,
    t,
    onChange: (value) => onChange({ tier: value }),
  });

  const patchDropdown = createDropdown({
    name: 'patch',
    value: filters.patch ?? '',
    options: options.patch,
    t,
    onChange: (value) => onChange({ patch: value || null }),
  });

  root.append(regionDropdown.element, tierDropdown.element, patchDropdown.element);

  return {
    element: root,
    /** Reflect an externally changed filter value. */
    setValues(next) {
      if (next.region !== undefined) regionDropdown.setValue(next.region);
      if (next.tier !== undefined) tierDropdown.setValue(next.tier);
      if (next.patch !== undefined) patchDropdown.setValue(next.patch ?? '');
    },
    /** Swap the patch list once the current patch is known. */
    setPatchOptions(next) {
      patchDropdown.setOptions(next);
    },
  };
}
