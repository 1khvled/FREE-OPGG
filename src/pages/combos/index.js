/**
 * Combos screen — a champion's skill history across patches.
 *
 * The screen is the desktop app's "Combos" page: a champion picker on the
 * left (the same searchable portrait grid the champions screen uses) and the
 * patch history of the selected champion on the right.
 *
 * Every patch version is a collapsible row — the version string on the left,
 * the number of changed abilities on the right. Expanding a row shows the
 * abilities of that patch, grouped by slot (Q / W / E / R), each with its
 * `spellKey` and the change log.
 *
 * The data comes from `ctx.api.combos({ champion })`, which resolves to
 *
 *   { ok, champion, versions: [ { version, skills: [ … ] } ] }
 *
 * The upstream service answers with Korean descriptions (`baseLocale:
 * 'ko_KR'`); they are rendered exactly as they arrive — never translated,
 * never "corrected" and never dropped.
 */

import { h, clear } from '../../core/dom.js';
import {
  collectChampions,
  defaultChampion,
  findChampion,
  normalizeVersions,
  portraitUrls,
} from './data.js';
import { createChampionPicker } from './parts/champion-picker.js';
import { createVersionList } from './parts/version-list.js';
import { createEmptyPanel, createErrorPanel, createSkeletonList } from './parts/states.js';

/** Route metadata. */
export const meta = {
  id: 'combos',
  title: 'common.Combos',
  order: 15,
  group: 'champions',
  icon: 'combos',
};

/**
 * Mount the Combos screen.
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
  stylesheet.href = new URL('./combos.css', import.meta.url).href;
  document.head.appendChild(stylesheet);

  /* ----------------------------------------------------------------- state */
  let champions = [];
  let selected = null;
  let versions = [];
  let status = 'loading';
  let error = null;
  let requestId = 0;
  let disposed = false;

  /* ------------------------------------------------------------------- DOM */
  const page = h('div.combos');

  const title = h('h1.combos-title', {
    text: t('common.Combos', null, 'Combos'),
  });
  const subtitle = h('p.combos-subtitle', {
    text: t('lol.buff-nerf.see-how-champion-skills-changed-across',
      null,
      'See how champion skills changed across patches'),
  });

  const chipPortrait = h('span.combos-chip__portrait');
  const chipName = h('span.combos-chip__name');
  const chipTitle = h('span.combos-chip__title');
  const chip = h('div.combos-chip', {}, [
    chipPortrait,
    h('span.combos-chip__identity', {}, [chipName, chipTitle]),
  ]);

  const header = h('header.combos-header', {}, [
    h('div.combos-header__titles', {}, [title, subtitle]),
    chip,
  ]);

  const picker = createChampionPicker({
    t,
    onSelect: (champion) => selectChampion(champion),
  });

  const panelMeta = h('div.combos-panel__meta');
  const panelBody = h('div.combos-panel__body');

  const panel = h('section.combos-panel', {}, [
    h('div.combos-panel__head', {}, [panelMeta]),
    panelBody,
  ]);

  const body = h('div.combos-body', {}, [
    h('aside.combos-picker-wrapper', {}, [picker.element]),
    panel,
  ]);

  page.append(header, body);
  container.appendChild(page);

  const versionList = createVersionList({ t });

  /* --------------------------------------------------------------- helpers */

  /** Paint the selected champion into the header chip. */
  function updateChip() {
    clear(chipPortrait);
    chipName.textContent = selected ? String(selected.name || '') : '';
    chipTitle.textContent = selected ? String(selected.title || '') : '';
    chip.hidden = !selected;

    if (!selected) return;

    const urls = portraitUrls(selected, 32);
    if (!urls.length) return;

    const img = h('img.combos-chip__image', {
      src: urls[0],
      alt: '',
      width: 32,
      height: 32,
      draggable: 'false',
    });

    let index = 0;
    img.addEventListener('error', () => {
      index += 1;
      if (index < urls.length) {
        img.src = urls[index];
        return;
      }
      img.remove();
      chipPortrait.classList.add('is-empty');
      chipPortrait.textContent = String(selected.name || '').slice(0, 1).toUpperCase();
    });

    chipPortrait.appendChild(img);
  }

  /** Render the right hand panel for the current status. */
  function render() {
    if (disposed) return;

    panelMeta.textContent = status === 'ready'
      ? t('lol.buff-nerf.changed-patches', { n: versions.length }, `Changed patches · ${versions.length}`)
      : '';

    clear(panelBody);

    if (status === 'loading') {
      panelBody.appendChild(createSkeletonList());
      return;
    }

    if (status === 'error') {
      panelBody.appendChild(createErrorPanel({
        message: error && error.message
          ? error.message
          : t('app.error', null, 'Something went wrong.'),
        onRetry: () => { void loadHistory(); },
      }));
      return;
    }

    if (!versions.length) {
      panelBody.appendChild(createEmptyPanel({
        message: t('lol.common.no-data', null, 'No data'),
      }));
      return;
    }

    versionList.setVersions(versions);
    panelBody.appendChild(versionList.element);
  }

  /* ------------------------------------------------------------------ data */

  /** Load the champion catalogue and open the screen on a champion. */
  async function loadChampions() {
    if (typeof ctx.api.staticData === 'function') {
      try {
        champions = collectChampions(await ctx.api.staticData());
      } catch {
        // The catalogue is optional: the screen reports it as an error below
        // when it is really missing.
        champions = [];
      }
    }

    if (disposed) return;

    picker.setChampions(champions);

    const requested = ctx.params ? ctx.params.champion : null;
    selected = (requested ? findChampion(champions, requested) : null)
      || defaultChampion(champions);

    if (!selected) {
      error = new Error(t('app.noChampions', null, 'No champions to show for the current filters.'));
      status = 'error';
      updateChip();
      render();
      return;
    }

    picker.setSelected(selected);
    updateChip();
    await loadHistory();
  }

  /** Load the skill history of the selected champion. */
  async function loadHistory() {
    if (!selected || !selected.key) return;

    const token = ++requestId;

    status = 'loading';
    error = null;
    versions = [];
    render();

    try {
      if (typeof ctx.api.combos !== 'function') {
        throw new Error(t('app.error', null, 'Something went wrong.'));
      }

      const payload = await ctx.api.combos({ champion: selected.key });

      if (disposed || token !== requestId) return;

      if (!payload || payload.ok === false) {
        error = new Error((payload && payload.error)
          ? String(payload.error)
          : t('app.error', null, 'Something went wrong.'));
        status = 'error';
        render();
        return;
      }

      versions = normalizeVersions(payload);
      status = 'ready';
    } catch (err) {
      if (disposed || token !== requestId) return;
      error = err instanceof Error ? err : new Error(String(err));
      status = 'error';
    }

    render();
  }

  /** Select a champion and load its history. */
  function selectChampion(champion) {
    if (!champion) return;
    selected = champion;
    picker.setSelected(champion);
    updateChip();
    void loadHistory();
  }

  /* -------------------------------------------------------------- lifecycle */

  void loadChampions();

  return () => {
    disposed = true;
    requestId += 1;
    if (stylesheet.parentNode) stylesheet.parentNode.removeChild(stylesheet);
    clear(container);
  };
}
