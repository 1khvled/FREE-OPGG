/**
 * Toast — uses the shell's toast styling (`.toast`, `.toast--info`,
 * `.toast--error`, `.toast--success` from src/styles/base.css).
 *
 * The toast appends itself to `#toast-stack` when the shell provides one.
 */

import { h } from '../core/dom.js';

/** Kinds the shell styles. */
const KINDS = ['info', 'error', 'success', 'warning'];

/**
 * Create a toast.
 *
 * @param {string} message - the text.
 * @param {'info'|'error'|'success'|'warning'} [kind='info']
 * @param {number} [timeout=3200] - auto-dismiss delay in ms (0 = sticky).
 * @returns {HTMLElement} - the toast element (with a `close()` method).
 */
export function createToast(message, kind = 'info', timeout = 3200) {
  const safeKind = KINDS.includes(kind) ? kind : 'info';

  const el = h('div.toast', {
    class: `toast--${safeKind}`,
    text: message === null || message === undefined ? '' : String(message),
  });

  const stack = document.getElementById('toast-stack');
  if (stack) stack.appendChild(el);

  let timer = null;

  const close = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    el.classList.remove('is-visible');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 220);
  };

  el.close = close;

  // Let the element paint before the transition starts.
  requestAnimationFrame(() => el.classList.add('is-visible'));

  if (timeout > 0) {
    timer = setTimeout(close, timeout);
  }

  return el;
}
