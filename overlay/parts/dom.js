/**
 * Tiny DOM helpers for the overlay.
 *
 * The overlay is a separate renderer and must not import from `src/`, so it
 * carries its own minimal builder instead of reusing `src/core/dom.js`.
 */

/**
 * Create an element.
 *
 *   h('div', { class: 'card', onclick: fn }, 'text', h('span', null, 'x'))
 */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);

  if (props && typeof props === 'object' && !Array.isArray(props) && !(props instanceof Node)) {
    for (const key of Object.keys(props)) {
      const value = props[key];
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') {
        el.className = String(value);
      } else if (key === 'text') {
        el.textContent = String(value);
      } else if (key === 'html') {
        el.innerHTML = String(value);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(el.dataset, value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  } else if (props !== undefined && props !== null) {
    children.unshift(props);
  }

  appendAll(el, children);
  return el;
}

/** Append children (strings, numbers, nodes, arrays, falsy values skipped). */
export function appendAll(parent, children) {
  for (const child of children.flat(4)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Remove every child of a node. */
export function clear(node) {
  if (!node) return node;
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Replace the children of a node. */
export function replace(node, ...children) {
  if (!node) return node;
  clear(node);
  appendAll(node, children);
  return node;
}

/** Escape a string for safe interpolation into HTML. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * An image that degrades to a placeholder when the CDN has no asset.
 * The overlay never renders a broken-image glyph over the game.
 */
export function image(src, alt, className) {
  const el = h('img', {
    class: className ? `img ${className}` : 'img',
    src: src || '',
    alt: alt || '',
    loading: 'lazy',
    draggable: 'false',
  });
  el.addEventListener('error', () => {
    el.classList.add('img--missing');
    el.removeAttribute('src');
  });
  return el;
}

/** A text node with an optional title tooltip. */
export function label(text, title, className) {
  const el = h('span', { class: className || 'label', text: text ?? '' });
  if (title) el.title = title;
  return el;
}

/** Build an SVG element with attributes and children. */
export function svg(tag, attrs, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const key of Object.keys(attrs || {})) {
    const value = attrs[key];
    if (value === null || value === undefined || value === false) continue;
    el.setAttribute(key, String(value));
  }
  appendAll(el, children);
  return el;
}
