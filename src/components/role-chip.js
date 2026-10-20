/**
 * Role chip — the compact badge the reference shows in the "Role" column of
 * the champions tier list.
 *
 * The reference column is 36px wide and holds a role icon; this component
 * renders the equivalent textual chip (12px uppercase label on
 * `--bg-surface-raised`) with a per-role accent colour.
 *
 * Accepted roles (case-insensitive): TOP, JUNGLE, MID, ADC, SUPPORT.
 * Aliases: 'BOTTOM' and 'DUO' resolve to ADC, 'MIDDLE' resolves to MID.
 */

import { h } from '../core/dom.js';

/** Role alias -> canonical role key. */
const ROLE_ALIASES = {
  TOP: 'top',
  JUNGLE: 'jungle',
  JUNGELER: 'jungle',
  MID: 'mid',
  MIDDLE: 'mid',
  ADC: 'adc',
  BOTTOM: 'adc',
  DUO: 'adc',
  CARRY: 'adc',
  SUPPORT: 'support',
  SUP: 'support',
  SUPP: 'support',
};

/** Canonical role key -> the label the reference prints. */
const ROLE_LABEL = {
  top: 'TOP',
  jungle: 'JUNGLE',
  mid: 'MID',
  adc: 'ADC',
  support: 'SUPPORT',
};

/**
 * Normalise a role value.
 *
 * @param {string} role
 * @returns {'top'|'jungle'|'mid'|'adc'|'support'|null}
 */
export function normalizeRole(role) {
  if (role === null || role === undefined) return null;
  const key = String(role).trim().toUpperCase().replace(/\s+/g, '');
  return ROLE_ALIASES[key] || null;
}

/**
 * Create a role chip.
 *
 * @param {string} role - TOP | JUNGLE | MID | ADC | SUPPORT (case-insensitive).
 * @param {object} [options]
 * @param {boolean} [options.full=false] - true lets the chip grow past 36px so
 *        long labels ("JUNGLE", "SUPPORT") are never truncated. The default
 *        keeps the reference's 36px column geometry.
 * @returns {HTMLElement}
 */
export function createRoleChip(role, options = {}) {
  const key = normalizeRole(role);
  const label = key ? ROLE_LABEL[key] : '';

  const el = h('span.role-chip', {
    dataset: { role: key || 'unknown' },
    title: label,
  });

  if (key) el.classList.add(`role-chip--${key}`);
  if (options.full) el.classList.add('role-chip--full');

  el.appendChild(h('span.role-chip__label', { text: label }));
  return el;
}
