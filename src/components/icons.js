/**
 * Icon atoms for items, runes and summoner spells.
 *
 * All icons are served by Riot's Data Dragon CDN:
 *
 *   item   https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{id}.png
 *   rune   https://ddragon.leagueoflegends.com/cdn/{version}/img/perk-styles/{style}/{perk}.png
 *   spell  https://ddragon.leagueoflegends.com/cdn/{version}/img/spell/{id}.png
 *
 * `{version}` defaults to `latest`, which Data Dragon accepts as an alias for
 * the current patch.
 */

import { createFallbackImage, initialOf } from './image-placeholder.js';

/** Data Dragon CDN base. */
const DDRAGON = 'https://ddragon.leagueoflegends.com/cdn';

/**
 * Normalise the `version` segment.
 *
 * @param {string} [version]
 * @returns {string}
 */
function resolveVersion(version) {
  const value = String(version ?? '').trim();
  return value || 'latest';
}

/**
 * Derive the Data Dragon perk-style tree from an OP.GG asset path such as
 * `perk-images/Styles/Domination/Electrocute/Electrocute.png`.
 *
 * @param {string} icon
 * @returns {string|null}
 */
function styleFromIconPath(icon) {
  if (!icon) return null;
  const parts = String(icon).split('/').filter(Boolean);
  const stylesIndex = parts.findIndex((part) => part.toLowerCase() === 'styles');
  if (stylesIndex === -1 || !parts[stylesIndex + 1]) return null;
  return parts[stylesIndex + 1];
}

/**
 * Build the frame for an icon.
 *
 * @param {object} options
 * @returns {HTMLElement}
 */
function buildIcon(className, url, options) {
  const sources = [url];
  if (options.icon && !/^https?:/i.test(options.icon)) {
    // OP.GG relative asset paths — try them after the CDN copy.
    sources.push(`https://opgg-static.akamaized.net/${options.icon.replace(/^\//, '')}`);
  } else if (options.icon) {
    sources.push(options.icon);
  }
  if (options.sources) sources.push(...options.sources);

  return createFallbackImage({
    className,
    sources,
    alt: options.alt ?? '',
    fallbackText: initialOf(options.alt ?? options.label ?? ''),
    size: options.size ?? null,
    radius: options.radius ?? null,
  });
}

/**
 * Create an item icon.
 *
 * @param {string|number} id - Data Dragon item id, e.g. `1001` or `1055`.
 * @param {object} [options]
 * @param {string} [options.version='latest'] - Data Dragon version segment.
 * @param {number} [options.size] - square edge length in pixels.
 * @param {number} [options.radius] - corner radius in pixels.
 * @param {string} [options.alt] - accessible name (defaults to the item id).
 * @param {string} [options.icon] - extra candidate URL / OP.GG asset path.
 * @param {string[]} [options.sources] - extra candidate URLs.
 * @returns {HTMLElement}
 */
export function createItemIcon(id, options = {}) {
  const version = resolveVersion(options.version);
  const url = `${DDRAGON}/${version}/img/item/${id}.png`;
  return buildIcon('item-icon', url, {
    ...options,
    alt: options.alt ?? (id ? String(id) : ''),
  });
}

/**
 * Create a rune (perk) icon.
 *
 * @param {string} id - perk key, e.g. `Electrocute`.
 * @param {object} [options]
 * @param {string} [options.version='latest'] - Data Dragon version segment.
 * @param {string} [options.style] - perk-style tree, e.g. `Domination`.
 *        Derived from `options.icon` when omitted.
 * @param {string} [options.perk] - overrides the perk filename (defaults to `id`).
 * @param {number} [options.size] - square edge length in pixels.
 * @param {number} [options.radius] - corner radius in pixels.
 * @param {string} [options.alt] - accessible name (defaults to the perk key).
 * @param {string} [options.icon] - OP.GG asset path used to derive the style.
 * @returns {HTMLElement}
 */
export function createRuneIcon(id, options = {}) {
  const version = resolveVersion(options.version);
  const perk = options.perk ?? id;
  const style = options.style ?? styleFromIconPath(options.icon) ?? 'Perk';
  const url = `${DDRAGON}/${version}/img/perk-styles/${style}/${perk}.png`;
  return buildIcon('rune-icon', url, {
    ...options,
    alt: options.alt ?? (id ? String(id) : ''),
  });
}

/**
 * Create a summoner spell icon.
 *
 * @param {string|number} id - Data Dragon spell id, e.g. `SummonerFlash`.
 * @param {object} [options]
 * @param {string} [options.version='latest'] - Data Dragon version segment.
 * @param {number} [options.size] - square edge length in pixels.
 * @param {number} [options.radius] - corner radius in pixels.
 * @param {string} [options.alt] - accessible name (defaults to the spell id).
 * @returns {HTMLElement}
 */
export function createSummonerSpellIcon(id, options = {}) {
  const version = resolveVersion(options.version);
  const url = `${DDRAGON}/${version}/img/spell/${id}.png`;
  return buildIcon('spell-icon', url, {
    ...options,
    alt: options.alt ?? (id ? String(id) : ''),
  });
}
