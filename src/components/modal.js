/**
 * Modal — scrim (`--bg-overlay-scrim`, rgba(0,0,0,0.75)) plus a raised panel
 * with a title bar and a close button. Closes on ESC and on backdrop click.
 *
 * The component does not mount itself: append `element` wherever the page
 * wants it (usually `document.body`).
 */

import { h, clear } from '../core/dom.js';
import { t } from '../core/i18n.js';

/**
 * Create a modal.
 *
 * @param {object} options
 * @param {string} [options.title=''] - title bar text.
 * @param {Node|string} [options.content] - panel body.
 * @param {Function} [options.onClose] - called after the modal closed.
 * @param {number|string} [options.width] - panel width (px or CSS length).
 * @param {boolean} [options.closeOnBackdrop=true]
 * @param {boolean} [options.closeOnEscape=true]
 * @returns {{ element: HTMLElement, setContent: (node: Node|string) => void, close: () => void }}
 */
export function createModal(options = {}) {
  const title = options.title ?? '';

  const panel = h('div.modal__panel', { role: 'document' });
  if (options.width !== undefined && options.width !== null) {
    panel.style.width = typeof options.width === 'number' ? `${options.width}px` : String(options.width);
  }

  const closeButton = h('button.modal__close', {
    type: 'button',
    'aria-label': t('common.close'),
    title: t('common.close'),
  });
  closeButton.appendChild(h('span.modal__close-glyph', { 'aria-hidden': 'true', text: '×' }));

  const header = h('div.modal__header');
  header.appendChild(h('h2.modal__title', { text: title }));
  header.appendChild(closeButton);

  const body = h('div.modal__body');

  panel.appendChild(header);
  panel.appendChild(body);

  const backdrop = h('div.modal__backdrop', { 'aria-hidden': 'true' });

  const element = h('div.modal', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title || undefined,
  });
  element.appendChild(backdrop);
  element.appendChild(panel);

  let closed = false;

  const setContent = (node) => {
    clear(body);
    if (node === null || node === undefined) return;
    if (node instanceof Node) body.appendChild(node);
    else body.textContent = String(node);
  };

  setContent(options.content);

  const onKeydown = (event) => {
    if (event.key === 'Escape' && options.closeOnEscape !== false) {
      event.stopPropagation();
      close();
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKeydown, true);
    if (element.parentNode) element.parentNode.removeChild(element);
    if (typeof options.onClose === 'function') options.onClose();
  };

  closeButton.addEventListener('click', () => close());

  if (options.closeOnBackdrop !== false) {
    backdrop.addEventListener('click', () => close());
  }

  document.addEventListener('keydown', onKeydown, true);

  return { element, setContent, close };
}
