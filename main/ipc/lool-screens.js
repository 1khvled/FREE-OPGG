/**
 * The League-of-Legends screens that need their own upstream service:
 * Combos, Buff / Nerf and the ARAM balance ratios.
 *
 * Every handler answers with a plain object — never with an exception — so the
 * renderer never has to guard `ipcRenderer.invoke` with try/catch:
 *
 *   success -> `{ ok: true, ...payload }`
 *   failure -> `{ ok: false, error: '...' }`
 *
 * The handlers take the **payload as their first and only argument**; the
 * registration in `main/ipc/index.js` adapts them to the `(event, payload)`
 * signature of the `privileged()` wrapper.
 */

'use strict';

const { RENDERER_TO_MAIN_INVOKE } = require('../../shared/channels.js');
const opgg = require('../services/opgg-client.js');

/** How many patch versions the combos screen keeps. */
const MAX_COMBO_VERSIONS = 20;

/**
 * Coerce a value into a finite number.
 *
 * @param {*} value
 * @returns {number|null}
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Strip the markup the upstream description carries.
 *
 * The source text is Korean (`baseLocale: 'ko_KR'`) and is rendered as-is —
 * it is never translated or "corrected".
 *
 * @param {*} value
 * @returns {string}
 */
function stripHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Read the champion name out of the handler payload.
 *
 * @param {*} payload
 * @returns {string}
 */
function readChampion(payload) {
  if (typeof payload === 'string') return payload.trim();
  if (payload && typeof payload === 'object') {
    const raw = payload.champion !== undefined ? payload.champion : payload.champ;
    if (typeof raw === 'string') return raw.trim();
    if (raw && typeof raw === 'object' && typeof raw.name === 'string') return raw.name.trim();
  }
  return '';
}

/**
 * `opgg:combos` — the champion's skill change history.
 *
 * PAYLOAD
 *   { champion: 'Jinx' }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     champion: 'Jinx',
 *     versions: [
 *       {
 *         version: '16.12.1',
 *         skills: [
 *           { version: '16.12.1', champ: 'Jinx', spellKey: 'JinxQ',
 *             slot: 'Q', baseLocale: 'ko_KR', description: '…plain text…' }
 *         ]
 *       }
 *     ]
 *   }
 *
 * The upstream payload is ~3.7 MB, so at most the 20 most recent patch
 * versions are kept and the HTML markup is stripped from the descriptions.
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleCombos(payload) {
  const champion = readChampion(payload);
  if (!champion) return { ok: false, error: 'champion is required' };

  const raw = await opgg.getCombos(champion);
  const list = Array.isArray(raw) ? raw : [];

  const versions = list.slice(0, MAX_COMBO_VERSIONS).map((entry) => ({
    version: entry && entry.version !== undefined && entry.version !== null
      ? String(entry.version)
      : null,
    skills: (entry && Array.isArray(entry.skills) ? entry.skills : []).map((skill) => ({
      version: skill && skill.version !== undefined && skill.version !== null
        ? String(skill.version)
        : null,
      champ: skill && skill.champ ? String(skill.champ) : null,
      spellKey: skill && skill.spellKey ? String(skill.spellKey) : null,
      slot: skill && skill.slot ? String(skill.slot) : null,
      baseLocale: skill && skill.baseLocale ? String(skill.baseLocale) : null,
      description: stripHtml(skill && skill.description),
    })),
  }));

  return { ok: true, champion, versions };
}

/**
 * Pick the entries for the requested locale.
 *
 * @param {object} data - the upstream payload
 * @param {string} locale
 * @returns {Array<object>}
 */
function pickLocaleEntries(data, locale) {
  if (!data || typeof data !== 'object') return [];

  const wanted = String(locale || 'en').trim().toLowerCase();
  if (Array.isArray(data[wanted])) return data[wanted];

  if (Array.isArray(data.en)) return data.en;

  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

/**
 * `opgg:buff-nerf` — the latest patch notes.
 *
 * PAYLOAD
 *   { locale?: 'en', gameType?: 'lol' }
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     patchVersion: '26.20',
 *     patchDate: '2026-10-07',
 *     isActive: true,
 *     title: '26.20 패치노트',
 *     entries: [ { id: 'Ambessa', key: '799', log: '…', status: 'nerf' } ]
 *   }
 *
 * `status` is `'buff'` or `'nerf'`.
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleBuffNerf(payload) {
  const args = payload && typeof payload === 'object' ? payload : {};
  const gameType = typeof args.gameType === 'string' && args.gameType.trim()
    ? args.gameType.trim()
    : 'lol';
  const locale = typeof args.locale === 'string' && args.locale.trim()
    ? args.locale.trim().toLowerCase()
    : 'en';

  const data = await opgg.getBuffNerf(gameType);
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'No buff / nerf data available' };
  }

  const entries = pickLocaleEntries(data, locale).map((entry) => {
    const status = entry && entry.status ? String(entry.status).trim().toLowerCase() : null;
    return {
      id: entry && entry.id ? String(entry.id) : null,
      key: entry && entry.key !== undefined && entry.key !== null ? String(entry.key) : null,
      log: entry && entry.log ? String(entry.log) : '',
      status: status === 'buff' || status === 'nerf' ? status : status || null,
    };
  });

  return {
    ok: true,
    patchVersion: data.patchVersion ? String(data.patchVersion) : null,
    patchDate: data.patchDate ? String(data.patchDate) : null,
    isActive: Boolean(data.isActive),
    title: data.title ? String(data.title) : null,
    entries,
  };
}

/**
 * `opgg:aram-balance` — the ARAM balance ratios.
 *
 * PAYLOAD
 *   (none)
 *
 * RESPONSE
 *   {
 *     ok: true,
 *     rows: [
 *       {
 *         championId: 1,
 *         attackSpeed: 100,
 *         damageDealt: 95,
 *         damageTaken: 105,
 *         cooldownReduction: 0,
 *         healing: 100,
 *         tenacity: 0,
 *         shieldAmount: 90,
 *         energyRegen: 100,
 *         areaOfEffectDamage: 100,
 *         default: false
 *       }
 *     ]
 *   }
 *
 * The values are **percentages against the reference champion** — `100` is the
 * baseline, so the renderer shows them as-is (`95%`, `100%`, …) and uses
 * `value / 100` for the bar length. Do not multiply them by 100 again.
 * The rows carry champion ids only; the names come from `opgg:static-data`.
 *
 * On failure: `{ ok: false, error: '...' }`.
 */
async function handleAramBalance() {
  const rows = await opgg.getAramBalance();

  return {
    ok: true,
    rows: (Array.isArray(rows) ? rows : []).map((row) => ({
      championId: toNumber(row && row.champion_id),
      attackSpeed: toNumber(row && row.attack_speed),
      damageDealt: toNumber(row && row.damage_dealt),
      damageTaken: toNumber(row && row.damage_taken),
      cooldownReduction: toNumber(row && row.cooldown_reduction),
      healing: toNumber(row && row.healing),
      tenacity: toNumber(row && row.tenacity),
      shieldAmount: toNumber(row && row.shield_amount),
      energyRegen: toNumber(row && row.energy_regen),
      areaOfEffectDamage: toNumber(row && row.area_of_effect_damage),
      default: Boolean(row && row.default),
    })),
  };
}

/**
 * Register the handlers.
 *
 * @param {object} ctx - `{ ipcMain, privileged }`
 */
function register(ctx) {
  const { ipcMain, privileged } = ctx;

  // `privileged` calls the handler with (event, payload) — these handlers take
  // the payload as their only argument, so they are adapted explicitly.
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.OPGG_COMBOS,
    privileged((event, payload) => handleCombos(payload)),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.OPGG_BUFF_NERF,
    privileged((event, payload) => handleBuffNerf(payload)),
  );
  ipcMain.handle(
    RENDERER_TO_MAIN_INVOKE.OPGG_ARAM_BALANCE,
    privileged((event, payload) => handleAramBalance(payload)),
  );
}

module.exports = register;
module.exports.handleCombos = handleCombos;
module.exports.handleBuffNerf = handleBuffNerf;
module.exports.handleAramBalance = handleAramBalance;
module.exports.stripHtml = stripHtml;
