/**
 * Tooltip — a single floating element shared by the whole app, positioned
 * above its anchor and clamped to the viewport.
 *
 * The tooltip body is HTML (item / rune descriptions), so the markup is
 * sanitised before insertion: `<script>` (and other executable elements) are
 * removed and inline event handlers are dropped.
 */

import { h } from '../core/dom.js';

/** Singleton tooltip element. */
let tooltipElement = null;

/** anchor element -> content provider. */
const providers = new WeakMap();

/** anchor element -> registered listeners (so they can be removed again). */
const listeners = new WeakMap();

/**
 * Create (or fetch) the singleton tooltip element.
 *
 * @returns {HTMLElement}
 */
export function createTooltip() {
  if (tooltipElement && tooltipElement.isConnected) return tooltipElement;

  tooltipElement = h('div.tooltip', {
    role: 'tooltip',
    'aria-hidden': 'true',
  });
  tooltipElement.style.display = 'none';
  document.body.appendChild(tooltipElement);

  return tooltipElement;
}

/**
 * Remove every executable construct from a HTML fragment.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeTooltipHtml(html) {
  const source = String(html ?? '');
  if (!source) return '';

  const parsed = new DOMParser().parseFromString(source, 'text/html');

  parsed.querySelectorAll('script, iframe, object, embed, link, meta, base, form').forEach((node) => {
    node.remove();
  });

  parsed.querySelectorAll('*').forEach((node) => {
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
      } else if ((name === 'href' || name === 'src' || name === 'xlink:href')
        && /^\s*javascript:/i.test(attr.value)) {
        node.removeAttribute(attr.name);
      }
    }
  });

  return parsed.body.innerHTML;
}

/**
 * Hide the tooltip.
 */
export function hideTooltip() {
  if (!tooltipElement) return;
  tooltipElement.classList.remove('is-visible');
  tooltipElement.style.display = 'none';
  tooltipElement.setAttribute('aria-hidden', 'true');
  tooltipElement.innerHTML = '';
}

/**
 * Show the tooltip for an anchor.
 *
 * @param {HTMLElement} anchor
 */
function showTooltip(anchor) {
  const provider = providers.get(anchor);
  if (typeof provider !== 'function') return;

  let html;
  try {
    html = provider(anchor);
  } catch {
    html = '';
  }

  if (html === null || html === undefined || html === '') {
    hideTooltip();
    return;
  }

  const tooltip = createTooltip();
  tooltip.innerHTML = sanitizeTooltipHtml(html);
  tooltip.style.display = 'block';
  tooltip.setAttribute('aria-hidden', 'false');
  tooltip.classList.add('is-visible');

  const anchorRect = anchor.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const margin = 8;

  let left = anchorRect.left + (anchorRect.width / 2) - (tipRect.width / 2);
  left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));

  let top = anchorRect.top - tipRect.height - gap;
  if (top < margin) {
    top = anchorRect.bottom + gap;
    if (top + tipRect.height > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - tipRect.height - gap);
    }
  }

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

/**
 * Attach a tooltip to an element.
 *
 * @param {HTMLElement} element - the anchor.
 * @param {() => string} provider - returns the tooltip HTML.
 * @returns {() => void} - detach callback (same effect as `detachTooltip`).
 */
export function attachTooltip(element, provider) {
  if (!element || typeof provider !== 'function') return () => {};

  detachTooltip(element);
  providers.set(element, provider);

  const onEnter = () => showTooltip(element);
  const onLeave = () => hideTooltip();

  element.addEventListener('mouseenter', onEnter);
  element.addEventListener('mouseleave', onLeave);
  element.addEventListener('focus', onEnter);
  element.addEventListener('blur', onLeave);
  element.addEventListener('click', onLeave);

  listeners.set(element, { enter: onEnter, leave: onLeave });

  return () => detachTooltip(element);
}

/**
 * Detach the tooltip from an element.
 *
 * @param {HTMLElement} element
 */
export function detachTooltip(element) {
  if (!element) return;

  const handlers = listeners.get(element);
  if (handlers) {
    element.removeEventListener('mouseenter', handlers.enter);
    element.removeEventListener('mouseleave', handlers.leave);
    element.removeEventListener('focus', handlers.enter);
    element.removeEventListener('blur', handlers.leave);
    element.removeEventListener('click', handlers.leave);
    listeners.delete(element);
  }

  providers.delete(element);
  hideTooltip();
}
