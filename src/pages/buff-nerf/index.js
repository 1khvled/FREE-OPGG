/**
 * Buff / Nerf screen — the patch notes of the latest League of Legends patch.
 *
 * The reference's patch-notes screen (`/lol/buff-nerf`, i18n key
 * `common.buff-nerf` = "Buff / Nerf") answers one question: which champions
 * were buffed, which were nerfed, and what exactly changed.
 *
 *   div.buff-nerf
 *     header.buff-nerf__header       the title, the patch version and its date
 *     div.buff-nerf__list-head        the "Champion list" heading + the filter
 *     div.buff-nerf__body             the two columns (buffs | nerfs)
 *
 * The data is `ctx.api.buffNerf({ locale, gameType })`, which resolves to
 *
 *   { ok, patchVersion, patchDate, isActive, title,
 *     entries: [ { id: 'Ambessa', key: '799', log: '…', status: 'nerf' } ] }
 *
 * Two things about that payload are worth remembering:
 *
 *   - `id` is the champion **display name** and `key` is the **numeric
 *     champion id** — the fields are named the other way round;
 *   - `log` is the change text, and it already carries the newlines that
 *     separate the changed lines. It is rendered verbatim.
 *
 * The patch-note `title` comes from the API in Korean; it is rendered as it
 * arrives and never translated.
 *
 * A failed request is never shown as "this patch changed nothing": the
 * failure gets its own state with a retry affordance.
 */

import { h, replace } from '../../core/dom.js';
import {
  buildChampionIndex,
  filterEntries,
  groupEntries,
  normalizePayload,
  resolveEntryChampion,
  visibleColumns,
} from './data.js';
import { createHeader } from './parts/header.js';
import { createChampionFilter } from './parts/champion-filter.js';
import { createEntryColumns } from './parts/entry-columns.js';
import {
  createEmptyState,
  createErrorState,
  createLoadingState,
} from './parts/states.js';

/** Route metadata. */
export const meta = {
  id: 'buff-nerf',
  title: 'common.buff-nerf',
  order: 50,
  group: 'champions',
};

/**
 * Mount the Buff / Nerf screen.
 *
 * @param {HTMLElement} container
 * @param {object} ctx - `{ store, api, i18n, bus, navigate, params, helpers }`.
 * @returns {() => void} cleanup.
 */
export function mount(container, ctx) {
  const t = ctx.i18n.t;

  /* ---------------------------------------------------------------- styles */
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./buff-nerf.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  const params = ctx.params || {};

  let status = 'loading';
  let error = null;
  let patch = { version: null, date: null, title: null, isActive: true };
  let entries = [];
  let championIndex = new Map();
  let query = String(params.champion || params.query || params.q || '');
  let disposed = false;
  let loadToken = 0;

  /* ------------------------------------------------------------------- DOM */
  const header = createHeader({ t });

  const filter = createChampionFilter({
    t,
    onQuery: (value) => {
      query = String(value ?? '');
      render();
    },
  });

  if (query) filter.setValue(query);

  const sectionTitle = h('h2.buff-nerf__section-title', {
    text: t('lol.buff-nerf.champion-list', null, 'Champion list'),
  });

  const listHead = h('div.buff-nerf__list-head', {}, [
    sectionTitle,
    filter.element,
  ]);

  const body = h('div.buff-nerf__body');

  const page = h('div.buff-nerf', {}, [header.element, listHead, body]);

  container.appendChild(page);

  /* --------------------------------------------------------------- helpers */

  /**
   * The locale the patch notes are requested in.
   *
   * The upstream service answers with one array per locale ("en", "kr", …),
   * so the short code is what travels with the request.
   */
  function readLocale() {
    const state = ctx.store && typeof ctx.store.getState === 'function'
      ? ctx.store.getState()
      : null;

    const raw = String((state && state.locale) || 'en').toLowerCase();
    const short = raw.split(/[-_]/)[0] || 'en';

    // The upstream locale map spells Korean "kr".
    return short === 'ko' ? 'kr' : short;
  }

  /** The copy of the failure state. */
  function failureMessage() {
    if (error && error.message) return error.message;
    return t(
      'lol.buff-nerf.failed-to-load-data',
      { n: t('common.champion', null, 'champion') },
      'Failed to load champion data',
    );
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    header.setPatch(patch);

    if (status === 'loading') {
      replace(body, createLoadingState({ t }));
      return;
    }

    if (status === 'error') {
      replace(body, createErrorState({
        t,
        message: failureMessage(),
        onRetry: () => { void load(); },
      }));
      return;
    }

    // The patch really has no changes — this is only reached after a
    // successful request.
    if (!entries.length) {
      replace(body, createEmptyState({
        t,
        message: t(
          'lol.buff-nerf.no-changes-in-the-last-patches',
          { n: 1 },
          'No changes in the last 1 patches',
        ),
      }));
      return;
    }

    const visible = filterEntries(entries, query);

    if (!visible.length) {
      replace(body, createEmptyState({
        t,
        message: t('lol.buff-nerf.no-matching-champions', null, 'No matching champions'),
      }));
      return;
    }

    replace(body, createEntryColumns({
      t,
      columns: visibleColumns(groupEntries(visible)),
    }));
  }

  /* ------------------------------------------------------------------ data */

  async function load() {
    const token = ++loadToken;

    status = 'loading';
    error = null;
    render();

    try {
      if (typeof ctx.api.buffNerf !== 'function') {
        throw new Error('The patch notes service is not available.');
      }

      const staticRequest = typeof ctx.api.staticData === 'function'
        ? ctx.api.staticData().catch(() => null)
        : Promise.resolve(null);

      const [payload, staticData] = await Promise.all([
        ctx.api.buffNerf({ locale: readLocale(), gameType: 'lol' }),
        staticRequest,
      ]);

      if (!payload || typeof payload !== 'object') {
        throw new Error('The patch notes could not be loaded.');
      }

      if (payload.ok === false) {
        throw new Error(payload.error
          ? String(payload.error)
          : t(
            'lol.buff-nerf.failed-to-load-data',
            { n: t('common.champion', null, 'champion') },
            'Failed to load champion data',
          ));
      }

      const normalized = normalizePayload(payload);

      // The static champion data resolves the portrait of every entry; when
      // it is missing the local champion registry is the fallback.
      const index = buildChampionIndex(staticData);
      if (index.size) championIndex = index;

      patch = {
        version: normalized.patchVersion,
        date: normalized.patchDate,
        title: normalized.title,
        isActive: normalized.isActive,
      };

      entries = normalized.entries.map((entry) => ({
        ...entry,
        ...resolveEntryChampion(entry, championIndex),
      }));

      status = 'ready';
    } catch (err) {
      error = err;
      status = 'error';
      entries = [];
    }

    if (disposed || token !== loadToken) return;
    render();
  }

  /* -------------------------------------------------------------- lifecycle */

  const unsubscribe = ctx.store && typeof ctx.store.subscribe === 'function'
    ? ctx.store.subscribe((state, changed) => {
      if (!changed || !changed.includes('locale')) return;
      void load();
    })
    : null;

  void load();

  return () => {
    disposed = true;
    loadToken += 1;
    if (unsubscribe) unsubscribe();
    if (stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    replace(container, null);
  };
}
