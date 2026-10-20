/**
 * Numeric stat cell.
 *
 * The reference renders its numeric columns (`text-xs tabular-nums
 * text-gray-600`): 12px/16px, `--text-muted`, tabular figures.
 *
 *   kind 'percent' -> `52.14%`   (two decimals by default)
 *   kind 'count'   -> `12,345`   (thousands separators)
 *   kind 'ratio'   -> `2.96:1`
 */

import { h, count } from '../core/dom.js';

/**
 * Format a percentage.
 *
 * Values greater than 1 are treated as already expressed in percent (the
 * OP.GG API returns both `0.5214` and `52.14` depending on the endpoint).
 *
 * @param {number|string} value
 * @param {number} digits
 * @returns {string}
 */
function formatPercent(value, digits) {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const scaled = Math.abs(n) > 1 ? n : n * 100;
  return `${scaled.toFixed(digits)}%`;
}

/**
 * Format a ratio.
 *
 * Accepts a number (rendered as `x:1`), a `[a, b]` tuple or an
 * `{ a, b }` / `{ numerator, denominator }` object.
 *
 * @param {number|Array|object} value
 * @param {number} digits
 * @returns {string}
 */
function formatRatio(value, digits) {
  if (value === null || value === undefined || value === '') return '-';

  if (Array.isArray(value)) {
    const left = Number(value[0]);
    const right = Number(value[1]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return '-';
    return `${left.toFixed(digits)}:${right.toFixed(digits)}`;
  }

  if (typeof value === 'object') {
    const left = Number(value.a ?? value.numerator ?? value[0]);
    const right = Number(value.b ?? value.denominator ?? value[1] ?? 1);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return '-';
    return `${left.toFixed(digits)}:${right.toFixed(digits)}`;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(digits)}:1`;
}

/**
 * Create a numeric stat cell.
 *
 * @param {number|string|Array|object} value
 * @param {object} [options]
 * @param {'percent'|'count'|'ratio'} [options.kind='count']
 * @param {number} [options.digits] - decimals (default 2 for percent/ratio).
 * @param {boolean} [options.muted=true] - muted (`--text-muted`) or primary text.
 * @returns {HTMLElement}
 */
export function createStatCell(value, options = {}) {
  const kind = options.kind || 'count';
  const digits = Number.isFinite(options.digits)
    ? options.digits
    : (kind === 'count' ? 0 : 2);

  let text;
  if (kind === 'percent') text = formatPercent(value, digits);
  else if (kind === 'ratio') text = formatRatio(value, digits);
  else if (kind === 'count') text = count(value);
  else text = String(value ?? '');

  const el = h('span.stat-cell', {
    class: `stat-cell--${kind}`,
    text,
  });

  if (options.muted === false) el.classList.add('is-emphasised');
  else el.classList.add('is-muted');

  return el;
}
