/**
 * Shared form controls — used by the leaderboard, multisearch, my-page and
 * settings screens only.
 *
 * Desktop density (see docs/rea/desktop-ui.md): every label and value is
 * 12px, inputs are 36-40px tall with a 4px radius on the `--bg-surface-hover`
 * input surface, and the dropdown trigger matches the reference's
 * `.dropdown-toggle` (36px, 4px radius, 12px left padding).
 *
 * Colours come exclusively from `src/styles/tokens.css`.
 */

import { h } from '../../core/dom.js';

/**
 * Normalise the accepted option shapes into `{ value, label, disabled }`.
 *
 * @param {Array<string|{value?:string,label?:string,disabled?:boolean}>} options
 * @returns {Array<{value:string,label:string,disabled:boolean}>}
 */
export function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => {
    if (option && typeof option === 'object') {
      return {
        value: String(option.value ?? ''),
        label: String(option.label ?? option.value ?? ''),
        disabled: Boolean(option.disabled),
      };
    }
    return { value: String(option), label: String(option), disabled: false };
  });
}

/**
 * A plain button.
 *
 * @param {object} options
 * @param {string} options.label
 * @param {Function} [options.onClick]
 * @param {'ghost'|'primary'|'danger'} [options.variant='ghost']
 * @param {'button'|'submit'} [options.type='button']
 * @param {boolean} [options.disabled]
 * @param {string} [options.title]
 * @param {string} [options.ariaLabel]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createButton({
  label,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled = false,
  title = null,
  ariaLabel = null,
  className = '',
}) {
  const classes = ['fc-btn', `fc-btn--${variant}`];
  if (className) classes.push(className);
  return h('button', {
    class: classes.join(' '),
    type,
    disabled: disabled || null,
    title: title || null,
    'aria-label': ariaLabel || null,
    on: onClick ? { click: onClick } : null,
  }, [label]);
}

/**
 * A label + control + optional description block.
 *
 * @param {object} options
 * @param {string} [options.id] - id of the control the label points at.
 * @param {string} [options.label]
 * @param {HTMLElement} [options.control]
 * @param {string} [options.description]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createLabelledField({ id, label, control, description = null, className = '' }) {
  const classes = ['fc-field'];
  if (className) classes.push(className);
  const field = h('div', { class: classes.join(' ') });
  if (label) field.appendChild(h('label.fc-field__label', { for: id || null, text: label }));
  if (control) field.appendChild(control);
  if (description) field.appendChild(h('p.fc-field__desc', { text: description }));
  return field;
}

/**
 * A dropdown. The visible trigger mirrors the reference's `.dropdown-toggle`;
 * the native `<select>` is used underneath so keyboard behaviour is correct.
 *
 * @param {object} options
 * @param {string} [options.id]
 * @param {string} [options.label]
 * @param {string} [options.value]
 * @param {Array} options.options
 * @param {Function} [options.onChange] - receives the new value.
 * @param {boolean} [options.disabled]
 * @param {string} [options.description]
 * @param {string} [options.ariaLabel]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  description = null,
  ariaLabel = null,
  className = '',
}) {
  const select = h('select.fc-select__input', {
    id: id || null,
    disabled: disabled || null,
    'aria-label': ariaLabel || null,
    on: onChange ? { change: (event) => onChange(event.target.value, event) } : null,
  });

  for (const option of normalizeOptions(options)) {
    select.appendChild(h('option', {
      value: option.value,
      disabled: option.disabled || null,
      text: option.label,
    }));
  }
  if (value !== undefined && value !== null) select.value = String(value);

  const control = h('div.fc-select', null, [select]);

  if (!label) return control;
  return createLabelledField({ id, label, control, description, className });
}

/**
 * A switch. The track mirrors the reference's `.ms-recent-switch` (32×12px
 * with a 16px thumb) but is sized for the desktop settings density.
 *
 * @param {object} options
 * @param {string} [options.id]
 * @param {string} [options.label]
 * @param {string} [options.description]
 * @param {boolean} [options.checked]
 * @param {boolean} [options.disabled]
 * @param {Function} [options.onChange] - receives the new checked state.
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createToggle({
  id,
  label,
  description = null,
  checked = false,
  disabled = false,
  onChange,
  className = '',
}) {
  const input = h('input.fc-toggle__input', {
    type: 'checkbox',
    id: id || null,
    checked: Boolean(checked),
    disabled: disabled || null,
    on: onChange ? { change: (event) => onChange(event.target.checked, event) } : null,
  });

  const control = h('span.fc-toggle__track', { 'aria-hidden': 'true' }, [
    h('span.fc-toggle__thumb'),
  ]);

  const classes = ['fc-toggle'];
  if (className) classes.push(className);

  const toggle = h('div', { class: classes.join(' ') }, [input, control]);
  if (!label) return toggle;
  return createLabelledField({
    id,
    label,
    control: toggle,
    description,
    className: 'fc-field--inline',
  });
}

/**
 * A range slider with a value readout.
 *
 * @param {object} options
 * @param {string} [options.id]
 * @param {string} [options.label]
 * @param {number} options.value
 * @param {number} [options.min]
 * @param {number} [options.max]
 * @param {number} [options.step]
 * @param {Function} [options.onInput]
 * @param {Function} [options.onChange]
 * @param {(value:number)=>string} [options.format]
 * @param {boolean} [options.disabled]
 * @param {string} [options.description]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createSlider({
  id,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onInput,
  onChange,
  format = (v) => String(v),
  disabled = false,
  description = null,
  className = '',
}) {
  const readout = h('span.fc-slider__value', { text: format(value) });

  const input = h('input.fc-slider__input', {
    type: 'range',
    id: id || null,
    min,
    max,
    step,
    value: String(value),
    disabled: disabled || null,
    on: {
      input: (event) => {
        const next = Number(event.target.value);
        readout.textContent = format(next);
        if (onInput) onInput(next, event);
      },
      change: (event) => {
        const next = Number(event.target.value);
        if (onChange) onChange(next, event);
      },
    },
  });

  const control = h('div.fc-slider', null, [input, readout]);
  if (!label) return control;
  return createLabelledField({ id, label, control, description, className });
}

/**
 * A search box. `multiline` turns it into the textarea the multi-search
 * screen uses to accept several Riot IDs at once.
 *
 * @param {object} options
 * @param {string} [options.id]
 * @param {string} [options.placeholder]
 * @param {string} [options.value]
 * @param {Function} [options.onInput] - receives the raw string.
 * @param {Function} [options.onSubmit] - receives the raw string.
 * @param {Function} [options.onClear]
 * @param {boolean} [options.multiline]
 * @param {number} [options.rows]
 * @param {boolean} [options.disabled]
 * @param {string} [options.ariaLabel]
 * @param {string} [options.className]
 * @returns {HTMLElement}
 */
export function createSearchInput({
  id,
  placeholder = '',
  value = '',
  onInput,
  onSubmit,
  onClear,
  multiline = false,
  clearable = true,
  rows = 4,
  disabled = false,
  ariaLabel = null,
  className = '',
}) {
  const handleInput = (event) => {
    if (onInput) onInput(event.target.value, event);
  };

  const handleKeydown = (event) => {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      if (onSubmit) onSubmit(event.target.value, event);
    }
  };

  const input = multiline
    ? h('textarea.fc-search__input.fc-search__input--multiline', {
      id: id || null,
      rows,
      placeholder,
      disabled: disabled || null,
      'aria-label': ariaLabel || null,
      value: String(value ?? ''),
      on: { input: handleInput },
    })
    : h('input.fc-search__input', {
      type: 'search',
      id: id || null,
      placeholder,
      disabled: disabled || null,
      'aria-label': ariaLabel || null,
      value: String(value ?? ''),
      on: { input: handleInput, keydown: handleKeydown },
    });

  const clear = h('button.fc-search__clear', {
    type: 'button',
    'aria-label': 'Clear',
    on: {
      click: () => {
        input.value = '';
        if (onClear) onClear();
        if (onInput) onInput('');
        input.focus();
      },
    },
  }, ['×']);

  const classes = ['fc-search'];
  if (multiline) classes.push('fc-search--multiline');
  if (className) classes.push(className);

  return h('div', { class: classes.join(' ') }, clearable ? [input, clear] : [input]);
}

/**
 * Split a free-form query into individual Riot IDs / summoner names.
 *
 * Accepts newline, comma or semicolon separated input, which is what the
 * multi-search screen accepts.
 *
 * @param {string} input
 * @returns {string[]}
 */
export function splitQuery(input) {
  if (!input) return [];
  return String(input)
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
