/**
 * Transient HUD toast.
 *
 * The toast is the overlay's only feedback channel: it confirms a bench swap,
 * a rune/build apply or a lock-state change without stealing focus.
 */

let timer = null;

/**
 * Show a message.
 * @param {HTMLElement} node the toast container
 * @param {string} message  the text to show
 */
export function showToast(node, message) {
  if (!node || !message) return;
  node.textContent = message;
  node.classList.add('is-visible');
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    node.classList.remove('is-visible');
    timer = null;
  }, 2600);
}

/** Hide the toast immediately. */
export function hideToast(node) {
  if (!node) return;
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
  node.classList.remove('is-visible');
}
