/**
 * Regions the OP.GG champion / summoner APIs accept.
 *
 * The API path segment is the region code (`/api/{region}/champions/ranked`),
 * so the code is the wire value and `name`/`label` are the display text.
 *
 * Reference: the region dropdown in the shipped renderer
 * (`9387.90956ede.bundle.js`, module 48762) and the region list documented in
 * `docs/rea/endpoints.md`.
 *
 * Pure data — no imports, no side effects.
 */

/**
 * @typedef {object} Region
 * @property {string} code    Wire value used in API paths (e.g. `GLOBAL`).
 * @property {string} name    English display name (e.g. `North America`).
 * @property {string} label   English display label — same as `name`, kept for
 *                            symmetry with the other option lists.
 * @property {string} i18nKey Reference i18n key (e.g. `common.lol.region.na`).
 */

/** @type {Region[]} */
export const REGIONS = [
  { code: 'GLOBAL', name: 'Global', label: 'Global', i18nKey: 'common.lol.region.global' },
  { code: 'KR', name: 'Korea', label: 'Korea', i18nKey: 'common.lol.region.kr' },
  { code: 'NA', name: 'North America', label: 'North America', i18nKey: 'common.lol.region.na' },
  { code: 'EUW', name: 'Europe West', label: 'Europe West', i18nKey: 'common.lol.region.euw' },
  { code: 'EUNE', name: 'Europe Nordic', label: 'Europe Nordic', i18nKey: 'common.lol.region.eune' },
  { code: 'OCE', name: 'Oceania', label: 'Oceania', i18nKey: 'common.lol.region.oce' },
  { code: 'BR', name: 'Brazil', label: 'Brazil', i18nKey: 'common.lol.region.br' },
  { code: 'JP', name: 'Japan', label: 'Japan', i18nKey: 'common.lol.region.jp' },
  { code: 'LAN', name: 'Latin America North', label: 'Latin America North', i18nKey: 'common.lol.region.lan' },
  { code: 'LAS', name: 'Latin America South', label: 'Latin America South', i18nKey: 'common.lol.region.las' },
];

/** The region the reference opens with. */
export const DEFAULT_REGION = 'GLOBAL';

/**
 * Display label for a region code.
 *
 * Accepts the wire code in any case (`na`, `NA`, `NA `), a region object, or a
 * region name. Unknown values are returned unchanged so the UI can still show
 * something meaningful instead of `undefined`.
 *
 * @param {string|{code?: string, name?: string}} code
 * @returns {string}
 */
export function regionLabel(code) {
  if (code === null || code === undefined) return '';
  if (typeof code === 'object') {
    return regionLabel(code.code || code.name || '');
  }
  const raw = String(code).trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const match = REGIONS.find((region) => region.code === upper);
  if (match) return match.name;
  const byName = REGIONS.find(
    (region) => region.name.toLowerCase() === raw.toLowerCase(),
  );
  return byName ? byName.name : raw;
}

/**
 * The region record for a code, or `null` when unknown.
 *
 * @param {string} code
 * @returns {Region|null}
 */
export function regionByCode(code) {
  if (code === null || code === undefined) return null;
  const upper = String(code).trim().toUpperCase();
  return REGIONS.find((region) => region.code === upper) || null;
}

/**
 * The i18n key for a region code, or `null` when unknown.
 *
 * @param {string} code
 * @returns {string|null}
 */
export function regionI18nKey(code) {
  const region = regionByCode(code);
  return region ? region.i18nKey : null;
}

/**
 * The API path segment for a region code — always upper case.
 *
 * @param {string} code
 * @returns {string}
 */
export function regionCode(code) {
  const region = regionByCode(code);
  return region ? region.code : String(code || '').trim().toUpperCase();
}
