/**
 * Small formatters shared by the leaderboard, multisearch, my-page and
 * settings screens.
 *
 * `formatRelativeTime` reproduces the reference's `timeForToday` helper
 * (recovered from the shipped renderer bundle, module 78890) word for word:
 *
 *   < 1 min   "A few seconds ago"
 *   < 1 hour  "N minute(s) ago"
 *   < 1 day   "N hour(s) ago"
 *   < 1 year  "N day(s) ago"
 *   else      "N year(s) ago"
 */

import { percent, count } from '../../core/dom.js';

/**
 * @param {string|number|Date|null|undefined} value
 * @param {number} [digits=2]
 * @returns {string}
 */
export function formatRate(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return percent(Number(value), digits);
}

/**
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return count(value);
}

/**
 * Format a ratio that may arrive either as a fraction (0..1) or as a
 * percentage (0..100). OP.GG's API uses fractions for `win_rate`.
 *
 * @param {number|null|undefined} value
 * @param {number} [digits=1]
 * @returns {string}
 */
export function formatWinRate(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const numeric = Number(value);
  const pct = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return `${pct.toFixed(digits)}%`;
}

/**
 * @param {number|string|null|undefined} value - a fraction (0..1) or a percent.
 * @returns {number|null} - a percentage in 0..100.
 */
export function toPercent(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric > 0 && numeric <= 1) return numeric * 100;
  return numeric;
}

/**
 * Relative time, matching the reference's `timeForToday`.
 *
 * @param {string|number|Date|null|undefined} value
 * @returns {string}
 */
export function formatRelativeTime(value) {
  if (value === null || value === undefined || value === '') return '-';
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return '-';

  const now = new Date();
  const minutes = Math.floor((now.getTime() - then.getTime()) / 1000 / 60);

  const plural = (amount, singular, pluralForm) => `${amount} ${amount === 1 ? singular : pluralForm}`;

  if (minutes < 1) return 'A few seconds ago';
  if (minutes < 60) return plural(minutes, 'minute ago', 'minutes ago');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, 'hour ago', 'hours ago');

  const days = Math.floor(minutes / 60 / 24);
  if (days < 365) return plural(days, 'day ago', 'days ago');

  return plural(Math.floor(days / 365), 'year ago', 'years ago');
}

/**
 * Match duration, matching the reference's `M minutes S seconds` layout.
 *
 * @param {number|null|undefined} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return '-';
  const minutes = Math.floor(total / 60);
  const rest = Math.floor(total % 60);
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}

/**
 * KDA ratio as the reference renders it (`2.34`, or "Perfect" for 0 deaths).
 *
 * @param {number|null|undefined} kills
 * @param {number|null|undefined} deaths
 * @param {number|null|undefined} assists
 * @returns {string}
 */
export function formatKda(kills, deaths, assists) {
  const k = Number(kills) || 0;
  const d = Number(deaths) || 0;
  const a = Number(assists) || 0;
  if (d === 0) return 'Perfect';
  return ((k + a) / d).toFixed(2);
}

/**
 * Split a `gameName#tagline` Riot ID.
 *
 * @param {string} value
 * @returns {{gameName:string, tagline:string}}
 */
export function splitRiotId(value) {
  const raw = String(value ?? '').trim();
  const hash = raw.indexOf('#');
  if (hash === -1) return { gameName: raw, tagline: '' };
  return { gameName: raw.slice(0, hash).trim(), tagline: raw.slice(hash + 1).trim() };
}
