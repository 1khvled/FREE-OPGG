/**
 * Combos screen — page-local data shaping.
 *
 * Everything here is pure: no DOM, no network, no store access. The screen
 * shows a champion's **skill history across patches** — every patch version
 * the upstream service knows about, the abilities that version carries and
 * the change log (the ability description) of each.
 *
 * The upstream payload (`GET https://desktop-api.op.gg/skill?champ=<key>`)
 * answers with an array of
 *
 *   { version: '16.12.1',
 *     skills: [ { version, champ, spellKey, slot, baseLocale, description } ] }
 *
 * The main process trims it to the 20 most recent versions and strips the
 * markup from the descriptions. The description text is **Korean**
 * (`baseLocale: 'ko_KR'`) and is rendered verbatim: it is never translated,
 * never "corrected" and never dropped.
 */

/* -------------------------------------------------------------------------
 * Slots
 * ---------------------------------------------------------------------- */

/** The ability slots, in the order the reference groups them. */
export const SLOT_ORDER = ['Q', 'W', 'E', 'R'];

/* -------------------------------------------------------------------------
 * Images
 * ---------------------------------------------------------------------- */

const CDN_BASE = 'https://opgg-static.akamaized.net';
const PORTRAIT_META = `${CDN_BASE}/meta/images/lol/latest/champion/{key}.png`;
const SPLASH_CDN = `${CDN_BASE}/meta/images/lol/latest/champion/centered/{key}_0.jpg`;

/** The image service query the reference uses to resize a portrait. */
function resizeQuery(size) {
  return `?image=c_scale,q_auto,w_${size}`;
}

/**
 * Candidate portrait URLs for a champion, best first.
 *
 * The first entry is the one the browser requests. Every path was verified
 * against the CDN: the OP.GG metadata mirror answers 200, the plain
 * `images/champions/{key}.png` path answers 403 from the desktop shell and is
 * therefore not used.
 *
 * @param {object} champion
 * @param {number} [size=46]
 * @returns {string[]}
 */
export function portraitUrls(champion, size = 46) {
  const urls = [];
  if (champion && champion.imageUrl) urls.push(`${champion.imageUrl}${resizeQuery(size)}`);
  if (champion && champion.key) urls.push(`${PORTRAIT_META.replace('{key}', champion.key)}${resizeQuery(size)}`);
  if (champion && champion.key) urls.push(SPLASH_CDN.replace('{key}', champion.key));
  return urls;
}

/* -------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------- */

/** First value that is neither `null`, `undefined` nor an empty string. */
export function firstDefined(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    return value;
  }
  return undefined;
}

/** Coerce a value into a string, keeping `null` for "no value". */
function toText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text === '' ? null : text;
}

/* -------------------------------------------------------------------------
 * Champion catalogue
 * ---------------------------------------------------------------------- */

/**
 * Collect the champion catalogue out of the static-data payload.
 *
 * `ctx.api.staticData()` answers with
 * `{ ok, patch, champions: [{ id, key, name, title, imageUrl, … }], … }`,
 * but the payload is also accepted in its bare-array and `{ data: … }`
 * shapes, and the champion-name list is used as a last resort so that the
 * screen still has something to show when only the names are known.
 *
 * @param {*} raw
 * @returns {Array<{id:number|null,key:string|null,name:string,title:string,imageUrl:string|null}>}
 */
export function collectChampions(raw) {
  const list = extractChampionArray(raw);
  const champions = [];
  const seen = new Set();

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;

    const name = toText(entry.name);
    if (!name) continue;

    const key = toText(entry.key);
    const identity = key || name.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);

    const id = Number.isFinite(Number(entry.id)) && entry.id !== null && entry.id !== undefined
      ? Number(entry.id)
      : null;

    champions.push({
      id,
      key,
      name,
      title: toText(entry.title) || '',
      imageUrl: toText(entry.image_url) || toText(entry.imageUrl) || toText(entry.squareImageUrl) || null,
    });
  }

  return champions;
}

/** Pull the champion array out of any of the accepted payload shapes. */
function extractChampionArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return [];

  // `champions` is the rich list and therefore wins over the other candidates.
  for (const candidate of [raw.champions, raw.data, raw.championNames, raw.list, raw.rows]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/**
 * The champion the screen opens on.
 *
 * The reference opens the screen on a specific champion; the replica opens it
 * on the first champion of the static catalogue that carries a key (the key is
 * what the upstream service needs).
 *
 * @param {Array<object>} champions
 * @returns {object|null}
 */
export function defaultChampion(champions) {
  const list = Array.isArray(champions) ? champions : [];
  return list.find((champion) => champion && champion.key) || list[0] || null;
}

/**
 * Find a champion by key or by display name.
 *
 * @param {Array<object>} champions
 * @param {string} needle
 * @returns {object|null}
 */
export function findChampion(champions, needle) {
  const wanted = String(needle ?? '').trim().toLowerCase();
  if (!wanted) return null;

  const list = Array.isArray(champions) ? champions : [];
  return list.find((champion) => champion && champion.key
    && champion.key.toLowerCase() === wanted)
    || list.find((champion) => champion && champion.name
      && champion.name.toLowerCase() === wanted)
    || null;
}

/* -------------------------------------------------------------------------
 * Version normalisation
 * ---------------------------------------------------------------------- */

/**
 * Normalise one ability entry.
 *
 * @param {object} raw
 * @returns {object|null}
 */
function normalizeSkill(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const spellKey = toText(raw.spellKey);
  const slot = normalizeSlot(raw.slot);

  // An entry without a spell key and without a description carries nothing
  // that could be rendered.
  if (!spellKey && !raw.description) return null;

  return {
    spellKey: spellKey || '',
    slot,
    // The description is rendered exactly as the upstream service produced it.
    description: raw.description === null || raw.description === undefined
      ? ''
      : String(raw.description),
    baseLocale: toText(raw.baseLocale),
    champ: toText(raw.champ),
    version: toText(raw.version),
  };
}

/** Normalise the ability slot: a single upper-case letter (`q` → `Q`). */
function normalizeSlot(value) {
  const text = toText(value);
  if (!text) return '';
  const letter = text.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : text.trim().toUpperCase();
}

/**
 * Extract the version array out of any of the accepted payload shapes.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
function extractVersionArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== 'object') return [];

  for (const candidate of [payload.versions, payload.data, payload.list, payload.rows, payload.items]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/**
 * Compare two version strings. Newest first.
 *
 * `16.12.1` is newer than `15.24.1`, and `16.12` is newer than `16.9`.
 * Non-numeric parts count as `0`.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareVersions(a, b) {
  const left = String(a ?? '').split('.');
  const right = String(b ?? '').split('.');
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const l = parseInt(left[index], 10);
    const r = parseInt(right[index], 10);
    const lv = Number.isFinite(l) ? l : 0;
    const rv = Number.isFinite(r) ? r : 0;
    if (lv !== rv) return rv - lv;
  }
  return 0;
}

/**
 * Normalise the whole payload into the version list the screen renders.
 *
 * Rules
 *   - the payload may be the main-process envelope (`{ ok, champion,
 *     versions }`), the bare upstream array or a `{ data: [...] }` wrapper;
 *   - a version is `{ version, skills }`; the version string falls back to
 *     the version of its first ability and to `null` when there is none;
 *   - the abilities are grouped by slot in the order Q, W, E, R; an unknown
 *     slot is kept and sorted after the known ones;
 *   - inside a slot the abilities are sorted by their `spellKey`, so the
 *     order does not depend on the order the upstream service happened to
 *     use;
 *   - `count` is the number of ability entries the version carries;
 *   - the versions are sorted newest first.
 *
 * @param {*} payload
 * @returns {Array<{version:string|null,count:number,groups:Array<{slot:string,skills:Array<object>}>}>}
 */
export function normalizeVersions(payload) {
  const list = extractVersionArray(payload);
  const versions = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;

    const rawSkills = Array.isArray(entry.skills) ? entry.skills : [];
    const skills = rawSkills.map(normalizeSkill).filter(Boolean);

    const version = toText(entry.version)
      || (skills.length ? skills[0].version : null)
      || null;

    versions.push({
      version,
      count: skills.length,
      groups: groupBySlot(skills),
    });
  }

  versions.sort((a, b) => compareVersions(a.version, b.version));
  return versions;
}

/**
 * Group the abilities of one version by slot.
 *
 * @param {Array<object>} skills
 * @returns {Array<{slot:string,skills:Array<object>}>}
 */
export function groupBySlot(skills) {
  const buckets = new Map();

  for (const skill of skills) {
    const slot = skill.slot || '';
    if (!buckets.has(slot)) buckets.set(slot, []);
    buckets.get(slot).push(skill);
  }

  const slots = [...buckets.keys()].sort((a, b) => {
    const ai = SLOT_ORDER.indexOf(a);
    const bi = SLOT_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return slots.map((slot) => ({
    slot,
    skills: buckets.get(slot).slice().sort((a, b) => a.spellKey.localeCompare(b.spellKey)),
  }));
}
