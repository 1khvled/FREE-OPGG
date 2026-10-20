/**
 * Live companion — string helpers.
 *
 * Every piece of copy on the Live screen comes from the reference's own
 * English catalogue (`src/i18n/en.json`, 4094 entries). `createTranslator()`
 * resolves catalogue keys first and only falls back to a local constant when
 * the reference genuinely has no key for the string — and it does so without
 * emitting the core i18n module's "missing key" warning, so the console stays
 * clean.
 *
 * The `LOCAL` map below lists every string the reference catalogue does not
 * contain. They are deliberately few and each one is a technical label
 * (League Client phase names, a verb, a noun) rather than product copy.
 */

import en from '../../i18n/en.json' with { type: 'json' };
import { has } from '../../core/i18n.js';

/**
 * Strings the reference catalogue does not provide.
 * @type {Readonly<Record<string, string>>}
 */
export const LOCAL = {
  /* League Client connection + phase */
  connected: 'Connected',
  disconnected: 'Disconnected',
  leagueClient: 'League Client',
  phaseLobby: 'Lobby',
  phaseChampSelect: 'ChampSelect',
  phaseGame: 'Game',
  phaseNone: 'None',
  waitingForClient: 'Waiting for the League Client…',

  /* Labels the reference expresses only inside longer sentences */
  level: 'Level',
  build: 'Build',
  spells: 'Spells',
  swap: 'Swap',
  lane: 'Lane',
  rank: 'Rank',
  keystone: 'Keystone',
  starterItems: 'Starter items',
  myChampion: 'My champion',
  noChampionSelected: 'No champion selected yet',
  nothingOnTheBench: 'No champions on the bench right now',
  /* The reference flags the Arena and LoL Classic modes as new; the
     catalogue has no key for the badge, so the label is local. */
  newBadge: 'NEW',
};

/** Replace `{{name}}` placeholders, exactly like the core i18n runtime. */
function interpolate(text, vars) {
  if (typeof text !== 'string' || !vars) return text;
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, name) => (
    vars[name] === undefined ? match : String(vars[name])
  ));
}

/**
 * The raw catalogue template of a key.
 *
 * The core i18n runtime caches the *interpolated* result of the first call,
 * so `t('lol.live.champion.v3.ban', { n: 1 })` would poison every later
 * call with `n: 2`. The template is therefore read from the catalogue
 * itself and interpolated per call.
 *
 * @param {string} key
 * @param {(key: string, vars?: object, fallback?: string) => string} t
 * @returns {string}
 */
function templateFor(key, t) {
  if (en && Object.prototype.hasOwnProperty.call(en, key)) return en[key];
  return t(key);
}

/**
 * Wrap the page's `t()` so that a missing catalogue key resolves to a local
 * constant without logging a warning, and so that keys with `{{vars}}` are
 * interpolated per call.
 *
 * @param {(key: string, vars?: object, fallback?: string) => string} t
 * @returns {(key: string, vars?: object, fallback?: string) => string}
 */
export function createTranslator(t) {
  return function translate(key, vars, fallback) {
    if (!has(key)) {
      return interpolate(fallback !== undefined ? fallback : key, vars);
    }
    if (!vars) return t(key, undefined, fallback);
    return interpolate(templateFor(key, t), vars);
  };
}
