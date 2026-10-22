/**
 * Renderer bootstrap: route table, sidebar navigation, page lifecycle.
 *
 * Page contract (see docs/SPEC.md Â§2):
 *
 *   export const meta = { id, title, order, group };
 *   export function mount(container, ctx) { /* ... *\/ return optional cleanup }
 *
 * `ctx` exposes { store, api, i18n, navigate, params, bus }.
 *
 * The shell geometry (65px header, 174px sidebar, 156x34 items) is the
 * shipped desktop app's â€” see docs/rea/desktop-ui.md. The sidebar structure
 * follows the reference exactly: a "Champions" group, a "Direct" group and a
 * footer with the Discord entry and the build stamp.
 */

import { store } from './core/store.js';
import { api } from './core/api.js';
import { t, setLocale } from './core/i18n.js';
import { bus } from './core/events.js';
import { h, clear, replace, percent, count, escapeHtml } from './core/dom.js';

/* --------------------------------------------------------------------------
 * Build identity
 * ------------------------------------------------------------------------ */

/**
 * The reference prints a build stamp under the sidebar â€” `20260914 0836` in
 * the shipped build, i.e. `YYYYMMDD HHMM`. This is the replica's own stamp.
 */
const BUILD_STAMP = '20261020 2346';

/** The reference's Discord invite, taken from the shipped `index.html`. */
const DISCORD_URL = 'https://discord.gg/hsSC7vDWU8';

/** The reference's Discord glyph. */
const DISCORD_ICON = new URL('./assets/images/ui/icon-discord.svg', import.meta.url).href;

/* --------------------------------------------------------------------------
 * Route table
 * ------------------------------------------------------------------------ */

const ROUTES = [
  {
    id: 'champions',
    title: 'common.sidebar.tier',
    order: 10,
    group: 'champions',
    icon: 'tiers',
    load: () => import('./pages/champions/index.js'),
  },
  {
    id: 'combos',
    title: 'common.Combos',
    order: 20,
    group: 'champions',
    icon: 'combos',
    load: () => import('./pages/combos/index.js'),
  },
  {
    id: 'op-champions',
    title: 'common.op',
    order: 30,
    group: 'champions',
    icon: 'op-champions',
    load: () => import('./pages/op-champions/index.js'),
  },
  {
    id: 'aram',
    title: 'lol.common.gameMode.aram',
    order: 35,
    group: 'champions',
    icon: 'aram',
    load: () => import('./pages/aram/index.js'),
  },
  {
    id: 'aram-mayhem',
    title: 'lol.aram-mayhem.aram-mayhem',
    order: 36,
    group: 'champions',
    icon: 'aram-mayhem',
    load: () => import('./pages/aram-mayhem/index.js'),
  },
  {
    id: 'modes',
    title: 'common.sidebar.gameMode',
    order: 40,
    group: 'champions',
    icon: 'modes',
    load: () => import('./pages/modes/index.js'),
  },
  {
    id: 'buff-nerf',
    title: 'common.buff-nerf',
    order: 50,
    group: 'champions',
    icon: 'buff-nerf',
    load: () => import('./pages/buff-nerf/index.js'),
  },
  {
    id: 'live',
    title: 'common.sidebar.live',
    order: 60,
    group: 'direct',
    icon: 'live',
    load: () => import('./pages/live/index.js'),
  },
  {
    id: 'multisearch',
    title: 'common.live.tab.multisearch',
    order: 70,
    group: 'direct',
    icon: 'search',
    load: () => import('./pages/multisearch/index.js'),
  },
  {
    id: 'my-page',
    title: 'common.sidebar.my-info',
    order: 80,
    group: 'direct',
    icon: 'profile',
    load: () => import('./pages/my-page/index.js'),
  },
  {
    id: 'settings',
    title: 'common.sidebar.settings',
    order: 90,
    group: 'footer',
    icon: 'settings',
    load: () => import('./pages/settings/index.js'),
  },
  {
    // The reference's desktop sidebar does not list the leaderboards, but the
    // route exists â€” `#/leaderboard` and `?route=leaderboard` reach it.
    id: 'leaderboard',
    title: 'common.leaderboards',
    order: 95,
    group: 'direct',
    icon: 'leaderboard',
    hidden: true,
    load: () => import('./pages/leaderboard/index.js'),
  },
];

const SIDEBAR_GROUPS = [
  { id: 'champions', title: 'common.sidebar.champion' },
  { id: 'direct', title: 'app.direct' },
];

const routeById = new Map(ROUTES.map((r) => [r.id, r]));

/* --------------------------------------------------------------------------
 * Sidebar icons (18px inline SVG, stroke = currentColor)
 * ------------------------------------------------------------------------ */

const ICONS = {
  tiers: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16M6 16h3v-4H6zM11 16h3V6h-3zM16 16h3v-7h-3z"/></svg>',
  combos: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  'op-champions': '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18l-1.4-8.2a1 1 0 0 0-1.9.2L16 12l-1.7-3a1 1 0 0 0-1.7 0L11 12 8.3 9a1 1 0 0 0-1.9-.2L5 16.8a1 1 0 0 1-1-.8z"/><path d="M3 20h18"/></svg>',
  aram: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/><path d="M3 11c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/></svg>',
  'aram-mayhem': '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"/></svg>',
  modes: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5"/></svg>',
  'buff-nerf': '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17V8"/><path d="m3.5 12 3.5-3.5L10.5 12"/><path d="M17 7v9"/><path d="m13.5 12 3.5 3.5L20.5 12"/></svg>',
  live: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4"/><path d="M4.9 19.1a10 10 0 0 1 0-14.2"/><path d="M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
  search: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  profile: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  leaderboard: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/></svg>',
  settings: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a1.6 1.6 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a1.6 1.6 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.5l-.1-.1a1.6 1.6 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1z"/></svg>',
};

/* --------------------------------------------------------------------------
 * Shell
 * ------------------------------------------------------------------------ */

const els = {
  header: document.getElementById('app-header'),
  side: document.getElementById('app-side'),
  main: document.getElementById('app-main'),
  status: document.getElementById('app-status'),
  toastStack: document.getElementById('toast-stack'),
};

let currentCleanup = null;

/** The app version, shown next to the build stamp. */
let appVersion = '';

/* --------------------------------------------------------------------------
 * Hash routing
 *
 * The reference is a hash router (`#/OP.GG/combos`); the replica keeps the
 * same contract so every screen can be deep-linked, including the ones the
 * sidebar does not list.
 * ------------------------------------------------------------------------ */

let hashLock = false;

/**
 * Parse `location.hash` into a route id and its parameters.
 *
 * The reference's router has parameterised paths — `/lol/modes/:mode?` — so a
 * hash may carry extra path segments (`#/modes/arena`) as well as a query
 * string (`#/modes?mode=arena`). Both are returned as `params`; the first path
 * segment is the route id.
 */
function parseHashRoute() {
  const raw = String(window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return null;
  const [path, query] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  const id = segments[0];
  if (!id) return null;

  const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};
  // Extra path segments become parameters under their own name, so
  // `#/modes/arena` sets `params.mode = 'arena'`.
  if (segments.length > 1) {
    params.mode = params.mode || segments.slice(1).join('/');
  }

  return { id, params };
}

/**
 * Keep the address bar in step with the current screen.
 *
 * @param {string} id - the route id
 * @param {object} [params] - the route parameters
 */
function syncHash(id, params = {}) {
  const segments = [id];
  if (params && params.mode) segments.push(String(params.mode));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (key === 'mode' || value === undefined || value === null || value === '') continue;
    query.set(key, String(value));
  }
  const search = query.toString();
  const target = `#/${segments.join('/')}${search ? `?${search}` : ''}`;
  if (window.location.hash === target) return;
  hashLock = true;
  window.location.hash = target;
}

/* --------------------------------------------------------------------------
 * Sidebar
 * ------------------------------------------------------------------------ */

/** One navigation entry: `a.app-side__item > span.app-side__item-title`. */
function sideItem(route, activeId) {
  const active = route.id === activeId;
  return h('a.app-side__item', {
    href: `#/${route.id}`,
    'aria-current': active ? 'page' : null,
    class: active ? 'is-active' : '',
    on: {
      click: (event) => {
        event.preventDefault();
        navigate(route.id);
      },
    },
  }, [
    h('span.app-side__item-title', {
      html: `${ICONS[route.icon] || ''}<span>${escapeHtml(t(route.title))}</span>`,
    }),
  ]);
}

/** The footer: the settings entry, the Discord link and the build stamp. */
function sideFooter(activeId) {
  const footer = h('div.app-side__footer');

  const settings = ROUTES.find((r) => r.group === 'footer' && !r.hidden);
  if (settings) footer.appendChild(sideItem(settings, activeId));

  // The reference's footer menu: a Discord glyph that opens the invite.
  const menu = h('ul.app-side__menu');
  const item = h('li.app-side__menu-item', {}, [
    h('button.app-side__discord', {
      type: 'button',
      title: 'Discord',
      'aria-label': 'Discord',
      on: {
        click: () => {
          try {
            api.openExternal(DISCORD_URL);
          } catch (err) {
            console.error('[app] could not open the Discord invite', err);
          }
        },
      },
    }, [
      h('img.app-side__discord-icon', {
        src: DISCORD_ICON,
        alt: 'Discord',
        width: 20,
        height: 20,
        draggable: 'false',
      }),
    ]),
  ]);
  menu.appendChild(item);
  footer.appendChild(menu);

  const build = h('div.app-side__build');
  if (appVersion) build.appendChild(h('span.app-side__build-version', { text: `v${appVersion}` }));
  build.appendChild(h('span.app-side__build-stamp', { text: BUILD_STAMP }));
  footer.appendChild(build);

  return footer;
}

function renderSide() {
  const state = store.getState();
  clear(els.side);

  let first = true;
  for (const group of SIDEBAR_GROUPS) {
    const routes = ROUTES
      .filter((r) => r.group === group.id && !r.hidden)
      .sort((a, b) => a.order - b.order);
    if (!routes.length) continue;

    // The reference separates the groups with a single 1px contour.
    if (!first) els.side.appendChild(h('div.app-side__divider'));
    first = false;

    els.side.appendChild(h('div.app-side__section-title', { text: t(group.title) }));
    for (const route of routes) {
      els.side.appendChild(sideItem(route, state.route.id));
    }
  }

  els.side.appendChild(sideFooter(state.route.id));
}

function setActiveSide() {
  const state = store.getState();
  for (const link of els.side.querySelectorAll('.app-side__item')) {
    const href = link.getAttribute('href');
    const active = href === `#/${state.route.id}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function renderStatus() {
  const { lcu } = store.getState();
  const connected = Boolean(lcu.connected);
  els.status.dataset.state = connected ? 'online' : 'offline';
  els.status.querySelector('.app-status__label').textContent = connected
    ? (lcu.summoner?.displayName || 'Online')
    : 'Offline';
  els.status.title = connected
    ? `League Client: ${lcu.phase || 'Unknown'}`
    : 'League Client not detected';
}

/** Navigate to a page id. */
export function navigate(id, params = {}) {
  if (!routeById.has(id)) id = 'champions';
  store.setState({ route: { id, params } });
  void mountRoute(id, params);
  syncHash(id, params);
}

/** Guards against a slow page load overwriting a newer screen. */
let mountToken = 0;

async function mountRoute(id, params) {
  const route = routeById.get(id);
  if (!route) return;

  const token = (mountToken += 1);

  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (err) {
      console.error('[app] page cleanup failed', err);
    }
    currentCleanup = null;
  }

  clear(els.main);
  els.main.appendChild(h('div.app-loading', { text: t('app.loading', null, 'Loading...') }));

  let module;
  try {
    module = await route.load();
  } catch (err) {
    if (token !== mountToken) return;
    console.error(`[app] failed to load page "${id}"`, err);
    replace(els.main, h('div.app-error', {}, [
      h('p', { text: t('app.error', null, 'Something went wrong.') }),
      h('p.app-error__detail', { text: String(err && err.message ? err.message : err) }),
    ]));
    return;
  }

  if (token !== mountToken) return;

  clear(els.main);
  const page = h('div.app-page');
  els.main.appendChild(page);

  const ctx = {
    store,
    api,
    i18n: { t },
    bus,
    navigate,
    params: params || {},
    helpers: { percent, count },
  };

  try {
    currentCleanup = module.mount(page, ctx) || null;
  } catch (err) {
    if (token !== mountToken) return;
    console.error(`[app] page "${id}" failed to mount`, err);
    replace(page, h('div.app-error', {}, [
      h('p', { text: t('app.error', null, 'Something went wrong.') }),
      h('p.app-error__detail', { text: String(err && err.message ? err.message : err) }),
    ]));
    return;
  }

  setActiveSide();
  els.main.focus({ preventScroll: true });
}

/* --------------------------------------------------------------------------
 * Toasts
 * ------------------------------------------------------------------------ */

export function toast(message, kind = 'info', timeout = 3200) {
  const node = h(`div.toast.toast--${kind}`, { text: message });
  els.toastStack.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 220);
  }, timeout);
  return node;
}

/* --------------------------------------------------------------------------
 * League Client status
 * ------------------------------------------------------------------------ */

async function refreshLcuStatus() {
  try {
    const status = await api.lcuStatus();
    store.setState({ lcu: { ...store.getState().lcu, ...(status || {}) } });
  } catch {
    store.setState({ lcu: { ...store.getState().lcu, connected: false } });
  }
  renderStatus();
}

/* --------------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------------ */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
  store.setState({ theme });
}

function applySettings(settings = {}) {
  if (settings.theme) applyTheme(settings.theme);
  if (settings.locale) setLocale(settings.locale);
}

/** Read the app version from the main process for the build stamp. */
async function refreshVersion() {
  try {
    const info = await api.getVersion();
    const version = info && info.version ? String(info.version) : '';
    if (!version || version === appVersion) return;
    appVersion = version;
    renderSide();
  } catch (err) {
    console.error('[app] could not read the app version', err);
  }
}

function boot() {
  renderSide();
  setActiveSide();
  renderStatus();
  applyTheme(store.getState().settings.theme);

  store.subscribe((state, changed) => {
    if (changed.includes('lcu')) renderStatus();
    if (changed.includes('settings')) {
      applySettings(state.settings);
      renderSide();
    }
  });

  api.onSettingsChanged((settings) => {
    store.setState({ settings: { ...store.getState().settings, ...(settings || {}) } });
  });
  // A locale bundle that arrives late must repaint the chrome.
  bus.on('i18n:locale', () => renderSide());
  api.onLcuEvent((payload) => {
    store.setState({ lcu: { ...store.getState().lcu, ...(payload || {}) } });
    bus.emit('lcu:event', payload);
  });
  api.onChampSelectUpdate((payload) => bus.emit('lcu:champ-select', payload));
  api.onGameStateUpdate((payload) => bus.emit('lcu:game-state', payload));
  api.onTrayAction((action) => {
    if (action === 'settings') navigate('settings');
    else if (action && action.route) navigate(action.route, action.params);
  });

  // Hash routing: `#/champions` and `?route=champions` both work.
  window.addEventListener('hashchange', () => {
    if (hashLock) {
      hashLock = false;
      return;
    }
    const parsed = parseHashRoute();
    if (!parsed) return;
    if (store.getState().route.id === parsed.id) return;
    navigate(parsed.id, parsed.params);
  });

  // Initial route: the hash wins over `?route=`, which wins over the default.
  const params = new URLSearchParams(window.location.search);
  const hashRoute = parseHashRoute();
  const initial = (hashRoute && hashRoute.id)
    || params.get('route')
    || store.getState().route.id
    || 'champions';
  const initialParams = hashRoute && hashRoute.params
    ? hashRoute.params
    : Object.fromEntries(params.entries());
  delete initialParams.route;
  navigate(initial, initialParams);

  void refreshLcuStatus();
  setInterval(refreshLcuStatus, 5000);
  void refreshVersion();

  window.addEventListener('error', (event) => {
    console.error('[renderer] uncaught', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[renderer] unhandled rejection', event.reason);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

export { store, api, bus };
