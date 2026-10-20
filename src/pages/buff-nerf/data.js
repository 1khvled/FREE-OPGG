/**
 * Buff / Nerf screen — page-local data shaping.
 *
 * The screen shows the patch notes of the latest League of Legends patch:
 * which champions were buffed, which were nerfed and what exactly changed.
 *
 * The upstream payload (`GET https://desktop-api.op.gg/buff-nerf/latest?gameType=lol`)
 * answers with one array per locale:
 *
 *   { patchVersion: '26.20',
 *     patchDate: '2026-10-07',
 *     isActive: true,
 *     title: '26.20 패치노트',
 *     en: [ { id: 'Ambessa', key: '799', log: '…', status: 'nerf' } ] }
 *
 * The naming of an entry is unusual and is worth spelling out, because the
 * fields do not mean what they look like:
 *
 *   - `id`   — the champion **display name** ("Ambessa"), not a numeric id;
 *   - `key`  — the **numeric champion id** ("799"), not a square name;
 *   - `log`  — the change text, already carrying its newlines;
 *   - `status` — `'buff'` or `'nerf'`.
 *
 * Everything in this module is pure: no DOM, no network, no store. The
 * normaliser is deliberately tolerant — the upstream payload has changed
 * shape more than once (bare array, `{ data: [...] }`, `{ entries: [...] }`,
 * a locale map) and the desktop main process may hand back either the raw
 * upstream payload or an already-flattened envelope, so every field is
 * looked up through a small list of aliases.
 */

import { championById, championPortrait } from '../../data/index.js';

/* -------------------------------------------------------------------------
 * Constants
 * ---------------------------------------------------------------------- */

/** Edge length of the square champion portrait of an entry. */
export const PORTRAIT_SIZE = 40;

/** Corner radius of the square champion portrait of an entry. */
export const PORTRAIT_RADIUS = 4;

/** The two statuses the upstream service reports. */
export const STATUS_BUFF = 'buff';
export const STATUS_NERF = 'nerf';

/**
 * The columns the screen renders.
 *
 * `buff` and `nerf` are the two real buckets. `other` catches an entry whose
 * status is neither (the upstream service also knows `adjust`, `update` and
 * `no change`); it is only rendered when it actually holds something, so the
 * common case stays a two-column layout.
 */
export const COLUMNS = [
  {
    id: 'buff',
    labelKey: 'lol.buff-nerf.buff',
    fallback: 'Buff',
    badgeKey: 'lol.buff-nerf.buff',
    badgeFallback: 'Buff',
    accent: 'buff',
  },
  {
    id: 'nerf',
    labelKey: 'lol.buff-nerf.nerf',
    fallback: 'Nerf',
    badgeKey: 'lol.buff-nerf.nerf',
    badgeFallback: 'Nerf',
    accent: 'nerf',
  },
  {
    id: 'other',
    labelKey: 'lol.buff-nerf.buff-nerf',
    fallback: 'Buff / Nerf',
    badgeKey: 'lol.buff-nerf.buff-nerf',
    badgeFallback: 'Buff / Nerf',
    accent: 'neutral',
  },
];

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

/** Coerce a value into a non-empty string, or `null`. */
export function toText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text.trim() === '' ? null : text;
}

/** Parse a value into a finite number, or `null`. */
export function toNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Normalise the status of an entry to `'buff'`, `'nerf'` or `null`. */
export function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (status === STATUS_BUFF) return STATUS_BUFF;
  if (status === STATUS_NERF) return STATUS_NERF;
  return null;
}

/* -------------------------------------------------------------------------
 * Payload extraction
 * ---------------------------------------------------------------------- */

/**
 * Extract the entry array out of any of the accepted payload shapes.
 *
 * @param {*} payload
 * @returns {Array<object>}
 */
export function extractEntries(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  // The flattened envelope of the desktop main process.
  for (const candidate of [payload.entries, payload.data, payload.list, payload.rows, payload.items]) {
    if (Array.isArray(candidate)) return candidate;
  }

  // The raw upstream payload is a map of locale → entries.
  for (const locale of ['en', 'en_US', 'kr', 'ko_KR']) {
    if (Array.isArray(payload[locale])) return payload[locale];
  }

  // Any other locale map.
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length
      && value.every((entry) => entry && typeof entry === 'object'
        && ('log' in entry || 'status' in entry || 'key' in entry))) {
      return value;
    }
  }

  return [];
}

/**
 * Extract the champion list out of the static-data payload.
 *
 * @param {*} raw
 * @returns {Array<object>}
 */
export function extractChampionList(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];

  for (const candidate of [raw.champions, raw.data, raw.list, raw.rows]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

/* -------------------------------------------------------------------------
 * Normalisation
 * ---------------------------------------------------------------------- */

/**
 * Normalise one entry of the patch notes.
 *
 * Rules
 *   - `id` is the champion display name unless it is numeric, in which case
 *     it is the champion id;
 *   - the champion id is taken from `key` first (that is where the upstream
 *     service keeps it) and from `id` second;
 *   - a `key` that is not numeric is kept as the square name;
 *   - the change log is copied verbatim — its newlines are meaningful;
 *   - an unknown status becomes `null` and the entry lands in the "other"
 *     column instead of being silently dropped.
 *
 * @param {object} raw
 * @returns {object|null}
 */
export function normalizeEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const rawId = raw.id;
  const idNumber = toNumber(rawId);
  const keyNumber = toNumber(raw.key);

  const championId = firstDefined(
    keyNumber,
    idNumber,
    toNumber(raw.championId),
    toNumber(raw.champion_id),
  ) ?? null;

  // `id` is the display name in the upstream payload — but only when it is
  // not a number.
  let name = null;
  if (rawId !== null && rawId !== undefined && rawId !== '' && idNumber === null) {
    name = toText(rawId);
  }
  if (!name) {
    name = toText(firstDefined(
      raw.name,
      raw.champion_name,
      raw.championName,
      raw.champion && raw.champion.name,
    ));
  }

  // A non-numeric key is a square name ("Ambessa"), a numeric one is the id.
  const keyText = toText(raw.key);
  const altKey = toText(firstDefined(raw.champion_key, raw.championKey));
  const championKey = (keyText && toNumber(keyText) === null)
    ? keyText
    : (altKey && toNumber(altKey) === null ? altKey : null);

  return {
    championId: championId === undefined ? null : championId,
    championKey,
    name: name || '',
    status: normalizeStatus(raw.status),
    // The status as the upstream service spelled it. It is kept so that an
    // entry with an unknown status ("adjust", "update", …) can still be
    // labelled instead of being hidden.
    rawStatus: toText(raw.status) || null,
    // The change log is rendered exactly as the upstream service produced it.
    log: raw.log === null || raw.log === undefined ? '' : String(raw.log),
  };
}

/**
 * Normalise the whole payload of `ctx.api.buffNerf()`.
 *
 * @param {*} payload
 * @returns {{patchVersion:string|null, patchDate:string|null, isActive:boolean, title:string|null, entries:Array<object>}}
 */
export function normalizePayload(payload) {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : {};

  return {
    patchVersion: toText(firstDefined(source.patchVersion, source.version, source.patch)) || null,
    patchDate: toText(firstDefined(source.patchDate, source.date)) || null,
    isActive: source.isActive !== false,
    title: toText(source.title) || null,
    entries: extractEntries(payload).map(normalizeEntry).filter(Boolean),
  };
}

/**
 * Build the champion index of the static-data payload.
 *
 * The index is keyed by the numeric champion id, which is exactly what the
 * patch-notes entries carry.
 *
 * @param {*} staticData
 * @returns {Map<number, object>}
 */
export function buildChampionIndex(staticData) {
  const index = new Map();

  for (const entry of extractChampionList(staticData)) {
    if (!entry || typeof entry !== 'object') continue;

    const id = toNumber(entry.id);
    if (id === null) continue;

    index.set(id, {
      id,
      key: toText(entry.key) || null,
      name: toText(entry.name) || '',
      title: toText(entry.title) || '',
      squareImageUrl: toText(firstDefined(entry.squareImageUrl, entry.square_image_url)) || null,
      imageUrl: toText(firstDefined(entry.imageUrl, entry.image_url)) || null,
    });
  }

  return index;
}

/**
 * Resolve the champion of an entry.
 *
 * The static-data payload is the source of truth for the champion itself: it
 * maps the numeric champion id of an entry onto the champion's square name
 * and display name. The local champion registry is the fallback, so an entry
 * still gets a portrait when the static data could not be loaded.
 *
 * The portrait URL is **not** taken from the static data verbatim: the
 * static data pins the CDN to the current Data Dragon version, and the CDN
 * mirror answers 403 for a version it has not published yet. The replica
 * therefore asks the shared image helper for the `latest` path — the URL
 * every other screen of the replica uses — and keeps the static-data URL as
 * the second candidate.
 *
 * @param {object} entry - a normalised entry.
 * @param {Map<number, object>} index - the static-data champion index.
 * @returns {{name: string, key: string|null, imageUrl: string|null, imageSources: string[]}}
 */
export function resolveEntryChampion(entry, index) {
  const record = entry && entry.championId !== null && entry.championId !== undefined
    ? (index && index.get ? index.get(entry.championId) : null)
    : null;

  const local = entry && entry.championId !== null && entry.championId !== undefined
    ? championById(entry.championId)
    : null;

  const key = (record && record.key) || (local && local.key) || (entry && entry.championKey) || null;
  const name = (record && record.name) || (local && local.name) || (entry && entry.name) || '';

  const imageSources = [];

  if (key) {
    const latest = championPortrait({ key }, PORTRAIT_SIZE);
    if (latest) imageSources.push(latest);
  }

  if (record && record.squareImageUrl) imageSources.push(record.squareImageUrl);
  if (record && record.imageUrl) imageSources.push(record.imageUrl);

  const imageUrl = imageSources[0] || null;

  return { name, key, imageUrl, imageSources };
}

/* -------------------------------------------------------------------------
 * Grouping & filtering
 * ---------------------------------------------------------------------- */

/**
 * Group the entries into the columns the screen renders.
 *
 * @param {Array<object>} entries
 * @returns {{buff: Array<object>, nerf: Array<object>, other: Array<object>}}
 */
export function groupEntries(entries) {
  const groups = { buff: [], nerf: [], other: [] };

  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry.status === STATUS_BUFF) groups.buff.push(entry);
    else if (entry.status === STATUS_NERF) groups.nerf.push(entry);
    else groups.other.push(entry);
  }

  return groups;
}

/**
 * The entries a search term lets through.
 *
 * The reference's search box matches on the champion name and on the key;
 * here the key is the numeric champion id, so both are matched.
 *
 * @param {Array<object>} entries
 * @param {string} query
 * @returns {Array<object>}
 */
export function filterEntries(entries, query) {
  const list = Array.isArray(entries) ? entries : [];
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return list.slice();

  return list.filter((entry) => {
    if (String(entry.name || '').toLowerCase().includes(needle)) return true;
    if (entry.championKey && String(entry.championKey).toLowerCase().includes(needle)) return true;
    if (entry.championId !== null && entry.championId !== undefined) {
      if (String(entry.championId).includes(needle)) return true;
    }
    return false;
  });
}

/**
 * The columns that actually hold something.
 *
 * The "other" column (an entry whose status is neither buff nor nerf) is only
 * rendered when it is not empty, so the usual screen stays a two-column
 * layout.
 *
 * @param {{buff: Array<object>, nerf: Array<object>, other: Array<object>}} groups
 * @returns {Array<object>}
 */
export function visibleColumns(groups) {
  const buckets = groups || { buff: [], nerf: [], other: [] };

  return COLUMNS
    .map((column) => ({ ...column, entries: buckets[column.id] || [] }))
    .filter((column) => column.id !== 'other' || column.entries.length > 0);
}
