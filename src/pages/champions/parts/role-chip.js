/**
 * Role chip — the position icon that sits in the second table column.
 *
 * The reference ships one position icon per lane (desktop app assets); the
 * chip carries the lane name as its tooltip and as a screen-reader label.
 */

import { h } from '../../../core/dom.js';
import { roleIconUrl } from '../data.js';

/**
 * @param {string|null} role - `TOP`, `JUNGLE`, `MID`, `ADC`, `SUPPORT`, …
 * @param {string} [label] - human readable lane name.
 * @returns {HTMLElement}
 */
export function createRoleChip(role, label) {
  if (!role) {
    return h('span.champ-role.champ-role--none', { text: '--', 'aria-label': 'No role' });
  }

  const text = label || role;
  const icon = h('img.champ-role__icon', {
    src: roleIconUrl(role, false),
    alt: '',
    width: 20,
    height: 20,
    loading: 'lazy',
    draggable: 'false',
  });

  return h('span.champ-role', { title: text, 'data-role': role }, [
    icon,
    h('span.visually-hidden', { text }),
  ]);
}
