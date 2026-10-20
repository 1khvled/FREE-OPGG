/**
 * Minimal DOM helpers.
 *
 * The renderer intentionally avoids a UI framework: the reference app's
 * fidelity comes from its design tokens and exact geometry, both of which are
 * cheaper to guarantee with explicit DOM construction than with a virtual DOM.
 */

/**
 * Create an element.
 *
 * @param {string} tag - tag name, optionally with `.class` suffixes
 *                        (`div.row.row--active`) and an `#id`.
 * @param {object} [props] - attributes; `class`, `style` (object or string),
 *                           `dataset` (object), `on` (event map), `html`
 *                           (innerHTML — only for trusted strings) and
 *                           `text` (textContent).
 * @param {Array|Node|string} [children]
 * @returns {HTMLElement}
 */
export function h(tag, props = null, children = null) {
  const match = /^([a-zA-Z0-9-]+)?((?:[.#][^.#]+)*)$/.exec(tag) || [];
  const name = match[1] || 'div';
  const el = document.createElement(name);

  if (match[2]) {
    for (const token of match[2].match(/[.#][^.#]+/g) || []) {
      if (token[0] === '.') el.classList.add(token.slice(1));
      else el.id = token.slice(1);
    }
  }

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      switch (key) {
        case 'class':
          if (Array.isArray(value)) value.filter(Boolean).forEach((c) => el.classList.add(c));
          else el.className = `${el.className} ${value}`.trim();
          break;
        case 'style':
          if (typeof value === 'string') el.setAttribute('style', value);
          else Object.assign(el.style, value);
          break;
        case 'dataset':
          Object.assign(el.dataset, value);
          break;
        case 'on':
          for (const [evt, fn] of Object.entries(value)) {
            if (typeof fn === 'function') el.addEventListener(evt, fn);
          }
          break;
        case 'html':
          el.innerHTML = value;
          break;
        case 'text':
          el.textContent = value;
          break;
        case 'value':
          el.value = value;
          break;
        case 'checked':
        case 'disabled':
        case 'selected':
          el[key] = Boolean(value);
          break;
        default:
          el.setAttribute(key, value === true ? '' : String(value));
      }
    }
  }

  append(el, children);
  return el;
}

/** Append children (nodes, arrays, strings, null) to a parent element. */
export function append(parent, children) {
  if (children === null || children === undefined) return parent;
  if (Array.isArray(children)) {
    for (const child of children) append(parent, child);
    return parent;
  }
  if (children instanceof Node) parent.appendChild(children);
  else parent.appendChild(document.createTextNode(String(children)));
  return parent;
}

/** Remove every child of a node. */
export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Replace a node's children in one go. */
export function replace(node, children) {
  clear(node);
  append(node, children);
  return node;
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} wait - milliseconds
 */
export function debounce(fn, wait = 150) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
}

/** Throttle a function to at most one call per `interval` ms (trailing call kept). */
export function throttle(fn, interval = 100) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    const remaining = interval - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        last = Date.now();
        fn(...args);
      }, remaining);
    }
  };
}

/** Format a ratio (0..1) as a percentage string with `digits` decimals. */
export function percent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return `${(n * 100).toFixed(digits)}%`;
}

/** Format a number with thousands separators. */
export function count(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-US');
}

/** Escape a string for safe insertion into HTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
