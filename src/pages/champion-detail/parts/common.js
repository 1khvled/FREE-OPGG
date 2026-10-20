/**
 * Champion detail — shared UI atoms.
 *
 * Small, dependency-free helpers used by every panel: an icon box with a
 * graceful fallback chain (never a broken image), a floating tooltip, section
 * wrappers and empty states.
 */

import { h } from '../../../core/dom.js';
import * as i18nCore from '../../../core/i18n.js';

/** Namespace import: the optional `has` probe must never break the module. */
const i18nHas = typeof i18nCore.has === 'function' ? i18nCore.has : null;

/**
 * Translate a key only when the catalogue actually knows it.
 *
 * `core/i18n.js` logs a warning for every unknown key; the rune-advice texts
 * are optional (only a subset of the perks has one), so they are probed first.
 *
 * @param {Function} t - the translator handed over by the page context.
 * @param {string} key
 * @param {object} [vars]
 * @param {string} [fallback]
 */
export function safeT(t, key, vars, fallback) {
  if (i18nHas && !i18nHas(key)) {
    return fallback !== undefined ? fallback : '';
  }
  return t(key, vars, fallback);
}

/**
 * Build a translator that interpolates correctly.
 *
 * `core/i18n.js` caches by key alone, so a key used twice with different
 * variables would return the first interpolation for every call (the counter
 * options all said "Compare against Riven"). This wrapper reads the raw
 * template once and performs the `{{name}}` substitution itself.
 *
 * @param {Function} t - the catalogue translator.
 * @returns {(key: string, vars?: object, fallback?: string) => string}
 */
export function makeTranslator(t) {
  const templates = new Map();

  return (key, vars, fallback) => {
    if (!vars) return t(key, undefined, fallback);

    let template = templates.get(key);
    if (template === undefined) {
      template = t(key);
      templates.set(key, template);
    }
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name) => (
      vars[name] === undefined ? match : String(vars[name])
    ));
  };
}

/* -------------------------------------------------------------------------- */
/* Icon box                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Build a neutral placeholder block showing the champion's initial.
 * @param {string} initial
 * @param {string} [className]
 */
export function placeholderBlock(initial, className = '') {
  const text = (initial || '?').trim().charAt(0).toUpperCase() || '?';
  return h(`div.cd-placeholder${className ? `.${className}` : ''}`, {
    'aria-hidden': 'true',
    text,
  });
}

/**
 * An icon box that walks a list of candidate URLs and, when they all fail,
 * falls back to a neutral placeholder block.
 *
 * @param {string[]} urls - candidate image URLs, most specific first.
 * @param {{ alt?: string, initials?: string, className?: string }} [options]
 * @returns {HTMLElement} the wrapper element (always stays in the DOM).
 */
export function createIconBox(urls, options = {}) {
  const { alt = '', initials = '', className = '' } = options;
  const box = h(`span.cd-icon${className ? `.${className}` : ''}`);

  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (!list.length) {
    box.appendChild(placeholderBlock(initials));
    return box;
  }

  const img = h('img', { alt, loading: 'lazy', decoding: 'async' });
  let index = 0;

  img.addEventListener('error', () => {
    if (index < list.length) {
      img.src = list[index];
      index += 1;
      return;
    }
    const placeholder = placeholderBlock(initials);
    img.replaceWith(placeholder);
  });

  img.src = list[0];
  index = 1;
  box.appendChild(img);
  return box;
}

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A single floating tooltip shared by every panel of the screen.
 *
 * @returns {{ attach: (el: HTMLElement, content: {title?: string, body?: string}) => HTMLElement,
 *            destroy: () => void }}
 */
export function createTooltip() {
  const node = h('div.cd-tooltip', { role: 'tooltip', 'aria-hidden': 'true' });
  node.style.display = 'none';
  document.body.appendChild(node);

  function place(target) {
    const rect = target.getBoundingClientRect();
    node.style.left = '0px';
    node.style.top = '0px';
    const box = node.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (box.width / 2);
    let top = rect.top - box.height - 8;
    if (top < 8) top = rect.bottom + 8;
    left = Math.max(8, Math.min(left, window.innerWidth - box.width - 8));
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }

  function show(target, content) {
    if (!content || (!content.title && !content.body && !content.note)) return;
    while (node.firstChild) node.removeChild(node.firstChild);
    if (content.title) node.appendChild(h('div.cd-tooltip__title', { text: content.title }));
    if (content.body) node.appendChild(h('div.cd-tooltip__body', { text: content.body }));
    if (content.note) node.appendChild(h('div.cd-tooltip__note', { text: content.note }));
    node.style.display = 'block';
    place(target);
  }

  function hide() {
    node.style.display = 'none';
  }

  function attach(target, content) {
    if (!target || !content || (!content.title && !content.body && !content.note)) return target;
    target.addEventListener('mouseenter', () => show(target, content));
    target.addEventListener('mouseleave', hide);
    target.addEventListener('focus', () => show(target, content));
    target.addEventListener('blur', hide);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '0');
    return target;
  }

  return {
    attach,
    show,
    hide,
    destroy() {
      hide();
      if (node.parentNode) node.parentNode.removeChild(node);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Layout atoms                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A panel section with a title row.
 *
 * @param {string} title
 * @param {Array<Node|string|null>} children
 * @param {{ className?: string, head?: Node|null }} [options]
 */
export function section(title, children, options = {}) {
  const { className = '', head = null } = options;
  return h(`section.cd-panel${className ? `.${className}` : ''}`, null, [
    h('div.cd-panel__head', null, [
      h('h3.cd-panel__title', { text: title }),
      head,
    ]),
    h('div.cd-panel__body', null, children),
  ]);
}

/**
 * A labelled empty state — used whenever a sub-object of the payload is
 * missing, so the screen never shows a blank card.
 *
 * @param {string} label
 */
export function emptyState(label) {
  return h('div.cd-empty', { text: label });
}

/**
 * A small numeric cell (the reference's 12px muted table cell).
 *
 * @param {string} label
 * @param {string} value
 * @param {{ className?: string }} [options]
 */
export function statCell(label, value, options = {}) {
  const { className = '' } = options;
  return h(`div.cd-stat${className ? `.${className}` : ''}`, null, [
    h('span.cd-stat__label', { text: label }),
    h('span.cd-stat__value', { text: value }),
  ]);
}

/**
 * A percentage bar (the reference's duel bar).
 *
 * @param {number|null} left - 0..100
 * @param {number|null} right - 0..100
 * @param {{ leftLabel?: string, rightLabel?: string }} [options]
 */
export function duelBar(left, right, options = {}) {
  const { leftLabel = '', rightLabel = '' } = options;
  const fills = [];

  if (Number.isFinite(left)) {
    const width = Math.max(0, Math.min(100, left));
    fills.push(h('div.cd-duel__fill.cd-duel__fill--left', { style: { width: `${width}%` }, text: leftLabel }));
  }
  if (Number.isFinite(right)) {
    const width = Math.max(0, Math.min(100, right));
    fills.push(h('div.cd-duel__fill.cd-duel__fill--right', { style: { width: `${width}%` }, text: rightLabel }));
  }

  return h('div.cd-duel', null, fills);
}

/** Initials used by the placeholder block. */
export function initialsOf(name) {
  if (typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}
