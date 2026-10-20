/**
 * Settings — appearance, language, League Client automations, overlay and
 * about.
 *
 * Reference: `MainSettings.61f2dc02.bundle.js` (the settings window's shell)
 * and the `main.settings.*` / `common.settings.*` catalogue entries the
 * reference's own settings page renders.
 *
 * Every change is persisted through `ctx.api.setSetting(key, value)` and
 * mirrored into `state.settings`, which is what `src/app.js` reads to apply
 * the theme and the locale. Changes pushed by the main process arrive on
 * `ctx.api.onSettingsChanged(...)`.
 */

import { h, clear } from '../../core/dom.js';
import { bus } from '../../core/events.js';
import { AVAILABLE_LOCALES } from '../../core/i18n.js';
import { createSelect, createToggle, createSlider, createButton, createSearchInput } from '../_shared/form-controls.js';

export const meta = { id: 'settings', title: 'common.sidebar.settings', order: 90 };

/**
 * The locales the reference ships catalogues for.
 *
 * A locale is only offered when the build actually carries its catalogue:
 * `AVAILABLE_LOCALES` is the list of locale bundles the i18n runtime can load
 * from `src/i18n/locales/`, and every one of them was flattened from the
 * reference's own v3 bundle.
 */
export const LOCALES = [
  { value: 'en', label: 'English' },
  { value: 'ko', label: '한국어' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: '日本語' },
  { value: 'pl', label: 'Polski' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'tc', label: '繁體中文' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'sc', label: '简体中文' },
].map((entry) => ({
  ...entry,
  bundled: entry.value === 'en' || AVAILABLE_LOCALES.includes(entry.value),
}));

/** Themes the replica ships. */
export const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 * @returns {() => void} cleanup
 */
export function mount(container, ctx) {
  const { store, api, i18n } = ctx;
  const t = (key, vars, fallback) => (i18n && i18n.t ? i18n.t(key, vars, fallback) : (fallback ?? key));

  /* ---- stylesheet ------------------------------------------------------- */
  const sharedLink = document.createElement('link');
  sharedLink.rel = 'stylesheet';
  sharedLink.href = new URL('../_shared/shared.css', import.meta.url).href;
  document.head.appendChild(sharedLink);

  const pageLink = document.createElement('link');
  pageLink.rel = 'stylesheet';
  pageLink.href = new URL('./settings.css', import.meta.url).href;
  document.head.appendChild(pageLink);

  /* ---- root ------------------------------------------------------------- */
  const root = h('section.page.page--settings');
  const panels = h('div.st-panels');
  root.appendChild(panels);
  container.appendChild(root);

  let disposed = false;
  let version = null;
  let lcu = null;
  let lcuError = null;
  let flashKeyDraft = null;

  /* ---- settings access -------------------------------------------------- */
  function current() {
    return store.getState().settings || {};
  }

  /**
   * Persist a setting: mirror it into the store and hand it to the main
   * process. The store write is what makes the theme / locale take effect
   * immediately (see `src/app.js`).
   *
   * @param {string} key
   * @param {any} value
   */
  function persist(key, value) {
    const slice = current();
    store.setState({ settings: { ...slice, [key]: value } });
    try {
      api.setSetting(key, value);
    } catch {
      // `setSetting` is fire-and-forget; a dead bridge is not fatal here.
    }
  }

  /* ---- league client status --------------------------------------------- */
  async function refreshLcu() {
    try {
      lcu = await api.lcuStatus();
      lcuError = null;
    } catch (err) {
      lcu = null;
      lcuError = (err && err.message) ? err.message : String(err);
    }
    if (!disposed) render();
  }

  /* ---- rendering -------------------------------------------------------- */
  function panel(title, description, body) {
    const node = h('section.st-panel', null, [
      h('div.st-panel__head', null, [
        h('h2.st-panel__title', { text: title }),
        description ? h('p.st-panel__desc', { text: description }) : null,
      ]),
      h('div.st-panel__body', null, body),
    ]);
    return node;
  }

  function renderAppearance() {
    const slice = current();
    return panel(
      'Appearance',
      t('main.settings.manage-how-the-op-gg-app', null, 'Manage how the OP.GG app starts and appears.'),
      [
        createSelect({
          id: 'set-theme',
          label: 'Theme',
          value: slice.theme || 'dark',
          options: THEMES,
          onChange: (value) => persist('theme', value),
        }),
      ],
    );
  }

  function renderLanguage() {
    const slice = current();
    const locale = slice.locale || 'en';

    const select = createSelect({
      id: 'set-locale',
      label: t('main.settings.primary-language', null, 'Primary language'),
      value: locale,
      options: LOCALES.map((entry) => ({
        value: entry.value,
        label: entry.label,
        disabled: !entry.bundled,
      })),
      onChange: (value) => {
        const entry = LOCALES.find((item) => item.value === value);
        if (!entry || !entry.bundled) return;
        persist('locale', value);
      },
    });

    const body = [select];

    const bundled = LOCALES.filter((entry) => entry.bundled);
    if (bundled.length < LOCALES.length) {
      body.push(h('p.st-note', {
        text: `Only ${bundled.map((entry) => entry.label).join(', ')} is bundled in this build. `
          + `The remaining catalogues (${LOCALES.filter((entry) => !entry.bundled).map((entry) => entry.label).join(', ')}) `
          + `are not bundled, so they are listed as ${t('main.settings.unavailable', null, 'Unavailable')}.`,
      }));
    }

    body.push(h('p.st-note', {
      text: t('main.settings.this-language-is-currently-applied', null, 'This language is currently applied.'),
    }));

    return panel(
      t('common.settings.language', null, 'Language'),
      t('main.settings.installed-languages', null, 'Installed languages'),
      body,
    );
  }

  function renderAutomations() {
    const slice = current();

    const connected = Boolean(lcu && lcu.connected);
    const statusText = connected
      ? `League Client: ${(lcu && (lcu.phase || lcu.state)) || 'Connected'}`
      : 'League Client not detected';

    const flashInput = createSearchInput({
      id: 'set-flash-key',
      placeholder: 'D',
      value: flashKeyDraft === null ? (slice.flashKey || 'D') : flashKeyDraft,
      ariaLabel: 'Flash key',
      clearable: false,
      onInput: (value) => {
        flashKeyDraft = value;
      },
      onSubmit: (value) => {
        const key = String(value || '').trim().toUpperCase();
        if (!key) return;
        flashKeyDraft = key;
        persist('flashKey', key);
        try {
          api.setFlashKey(key);
        } catch {
          // fire and forget
        }
      },
    });

    const body = [
      h('div.st-status', { dataset: { state: connected ? 'online' : 'offline' } }, [
        h('span.st-status__dot', { 'aria-hidden': 'true' }),
        h('span.st-status__label', { text: statusText }),
      ]),
      h('div.st-rows', null, [
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: 'Auto-accept' }),
            h('span.st-row__desc', { text: 'Automatically accept ranked ready checks.' }),
          ]),
          createToggle({
            id: 'set-auto-accept',
            checked: Boolean(slice.autoAccept),
            onChange: (value) => {
              persist('autoAccept', value);
              try {
                api.setAutoAccept(value);
              } catch {
                // fire and forget
              }
            },
          }),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: t('main.settings.auto-rune', null, 'Auto Rune Setup') }),
            h('span.st-row__desc', { text: t('main.settings.auto-rune-desc', null, 'Automatically sets runes when selecting a champion.') }),
          ]),
          createToggle({
            id: 'set-auto-runes',
            checked: Boolean(slice.autoRunes),
            onChange: (value) => {
              persist('autoRunes', value);
              try {
                api.setAutoRunes(value);
              } catch {
                // fire and forget
              }
            },
          }),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: t('main.settings.auto-item', null, 'Auto Item Setup') }),
            h('span.st-row__desc', { text: t('main.settings.auto-item-desc', null, 'Automatically sets recommended items when selecting a champion.') }),
          ]),
          createToggle({
            id: 'set-auto-builds',
            checked: Boolean(slice.autoBuilds),
            onChange: (value) => {
              persist('autoBuilds', value);
              try {
                api.setAutoBuilds(value);
              } catch {
                // fire and forget
              }
            },
          }),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: t('main.settings.spell-auto-desc', null, 'Auto Spell & Flash Position Setting') }),
            h('span.st-row__desc', { text: 'Automatically sets your summoner spells when selecting a champion.' }),
          ]),
          createToggle({
            id: 'set-auto-spells',
            checked: Boolean(slice.autoSpells),
            onChange: (value) => {
              persist('autoSpells', value);
              try {
                api.setAutoSpells(value);
              } catch {
                // fire and forget
              }
            },
          }),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: 'Flash key' }),
            h('span.st-row__desc', { text: t('common.settings.spell-desc', null, 'Please select your preferred Flash hotkey.') }),
          ]),
          h('div.st-row__control', null, [
            flashInput,
            createButton({
              label: t('main.settings.save', null, 'Save'),
              onClick: () => {
                const key = String(flashKeyDraft === null ? (slice.flashKey || 'D') : flashKeyDraft).trim().toUpperCase();
                if (!key) return;
                flashKeyDraft = key;
                persist('flashKey', key);
                try {
                  api.setFlashKey(key);
                } catch {
                  // fire and forget
                }
              },
            }),
          ]),
        ]),
      ]),
    ];

    return panel(
      'League Client automations',
      t('main.settings.manage-automatic-settings-for-league-of', null, 'Manage automatic settings for League of Legends.'),
      body,
    );
  }

  function renderOverlay() {
    const slice = current();

    const body = [
      h('div.st-rows', null, [
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: 'Enable overlay' }),
            h('span.st-row__desc', { text: t('common.settings.overlay-desc', null, 'Sets whether to use the overlay while playing.') }),
          ]),
          createToggle({
            id: 'set-overlay-enabled',
            checked: slice.overlayEnabled !== false,
            onChange: (value) => {
              persist('overlayEnabled', value);
              try {
                if (value) api.openOverlay();
                else api.closeOverlay();
              } catch {
                // fire and forget
              }
            },
          }),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: t('overlay.settings.lol.editor.setting.opacity', null, 'Opacity') }),
          ]),
          h('div.st-row__control', null, [
            createSlider({
              id: 'set-overlay-opacity',
              value: typeof slice.overlayOpacity === 'number' ? slice.overlayOpacity : 0.9,
              min: 0.2,
              max: 1,
              step: 0.05,
              format: (value) => `${Math.round(value * 100)}%`,
              onChange: (value) => {
                persist('overlayOpacity', value);
                try {
                  api.setOverlayOpacity(value);
                } catch {
                  // fire and forget
                }
              },
            }),
          ]),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: t('overlay.settings.lol.editor.setting.size', null, 'Overlay Size') }),
            h('span.st-row__desc', { text: t('overlay.settings.lol.editor.setting.size_desc', null, 'Adjust the size of the overlay') }),
          ]),
          h('div.st-row__control', null, [
            createSlider({
              id: 'set-overlay-scale',
              value: typeof slice.overlayScale === 'number' ? slice.overlayScale : 1,
              min: 0.5,
              max: 1.5,
              step: 0.05,
              format: (value) => `${value.toFixed(2)}x`,
              onChange: (value) => {
                persist('overlayScale', value);
                try {
                  api.setOverlayScale(value);
                } catch {
                  // fire and forget
                }
              },
            }),
          ]),
        ]),
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: 'Dock to League Client' }),
            h('span.st-row__desc', { text: 'Move the overlay next to the League Client window.' }),
          ]),
          h('div.st-row__control', null, [
            createButton({
              label: 'Dock',
              onClick: () => {
                try {
                  api.dockOverlayToLeague();
                } catch {
                  // fire and forget
                }
              },
            }),
          ]),
        ]),
      ]),
    ];

    return panel(
      'Overlay',
      t('common.settings.overlay-desc', null, 'Sets whether to use the overlay while playing.'),
      body,
    );
  }

  function renderAbout() {
    const body = [
      h('div.st-rows', null, [
        h('div.st-row', null, [
          h('div.st-row__text', null, [
            h('span.st-row__label', { text: t('common.version', null, 'Version') }),
          ]),
          h('div.st-row__control', null, [
            h('span.st-value', { text: version || '—' }),
          ]),
        ]),
      ]),
      h('div.st-about', null, [
        h('p.st-about__line', {
          text: 'Ranked data, champion statistics and match history are fetched live from the public OP.GG and Riot Data Dragon APIs.',
        }),
        h('p.st-about__line', {
          text: 'League of Legends is a trademark of Riot Games. This project is not affiliated with or endorsed by Riot Games or OP.GG.',
        }),
        h('p.st-about__line', {
          text: 'Released under the MIT License. Source code and licence text are available in the project repository.',
        }),
      ]),
    ];

    return panel('About', null, body);
  }

  function render() {
    if (disposed) return;
    clear(panels);
    panels.appendChild(renderAppearance());
    panels.appendChild(renderLanguage());
    panels.appendChild(renderAutomations());
    panels.appendChild(renderOverlay());
    panels.appendChild(renderAbout());
  }

  /* ---- wiring ----------------------------------------------------------- */
  const unsubscribeStore = store.subscribe((state, changed) => {
    if (changed.includes('settings')) render();
  });

  // The locale catalogues are loaded lazily: when one lands, the settings
  // slice is written back into the store, which repaints this screen and
  // makes the shell repaint the chrome (the sidebar) in the new language.
  const offLocale = bus.on('i18n:locale', () => {
    if (disposed) return;
    store.setState({ settings: { ...current() } });
  });

  let unsubscribeSettings = null;
  try {
    unsubscribeSettings = api.onSettingsChanged((payload) => {
      const slice = current();
      const patch = payload && typeof payload === 'object' ? payload : {};
      store.setState({ settings: { ...slice, ...patch } });
    });
  } catch {
    unsubscribeSettings = null;
  }

  render();

  void Promise.resolve()
    .then(() => api.getVersion())
    .then((value) => {
      version = value === undefined || value === null ? null : String(value);
    })
    .catch(() => {
      version = null;
    })
    .then(() => refreshLcu());

  return () => {
    disposed = true;
    unsubscribeStore();
    offLocale();
    if (typeof unsubscribeSettings === 'function') unsubscribeSettings();
    sharedLink.remove();
    pageLink.remove();
    clear(root);
  };
}
