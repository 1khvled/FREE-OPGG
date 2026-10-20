/**
 * Renderer bootstrap: route table, sidebar navigation, page lifecycle.
 *
 * Page contract (see docs/SPEC.md §2):
 *
 *   export const meta = { id, title, order, group };
 *   export function mount(container, ctx) { /* ... *\/ return optional cleanup }
 *
 * `ctx` exposes { store, api, i18n, navigate, params, bus }.
 *
 * The shell geometry (65px header, 174px sidebar, 156x34 items) is the
 * shipped desktop app's — see docs/rea/desktop-ui.md.
 */

import { store } from './core/store.js';
import { api } from './core/api.js';
import { t, setLocale } from './core/i18n.js';
import { bus } from './core/events.js';
import { h, clear, replace, percent, count } from './core/dom.js';

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
    id: 'live',
    title: 'common.sidebar.live',
    order: 20,
    group: 'champions',
    icon: 'live',
    load: () => import('./pages/live/index.js'),
  },
  {
    id: 'leaderboard',
    title: 'common.leaderboards',
    order: 30,
    group: 'champions',
    icon: 'leaderboard',
    load: () => import('./pages/leaderboard/index.js'),
  },
  {
    id: 'multisearch',
    title: 'common.live.tab.multisearch',
    order: 40,
    group: 'direct',
    icon: 'search',
    load: () => import('./pages/multisearch/index.js'),
  },
  {
    id: 'my-page',
    title: 'common.sidebar.my-info',
    order: 50,
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
  live: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/><circle cx="12" cy="12" r="9"/></svg>',
  leaderboard: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/></svg>',
  search: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  profile: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  settings: '<svg class="app-side__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.5 1.5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1z"/></svg>',
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

function renderSide() {
  const state = store.getState();
  clear(els.side);

  for (const group of SIDEBAR_GROUPS) {
    const routes = ROUTES.filter((r) => r.group === group.id).sort((a, b) => a.order - b.order);
    if (!routes.length) continue;

    els.side.appendChild(h('div.app-side__section-title', { text: t(group.title) }));
    for (const route of routes) {
      const active = state.route.id === route.id;
      const item = h('a.app-side__item', {
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
          html: `${ICONS[route.icon] || ''}<span>${t(route.title)}</span>`,
        }),
      ]);
      els.side.appendChild(item);
    }
    els.side.appendChild(h('div.app-side__divider'));
  }

  const footer = h('div.app-side__footer');
  const settings = ROUTES.find((r) => r.group === 'footer');
  if (settings) {
    const active = state.route.id === settings.id;
    footer.appendChild(h('a.app-side__item', {
      href: `#/${settings.id}`,
      'aria-current': active ? 'page' : null,
      class: active ? 'is-active' : '',
      on: {
        click: (event) => {
          event.preventDefault();
          navigate(settings.id);
        },
      },
    }, [
      h('span.app-side__item-title', {
        html: `${ICONS[settings.icon] || ''}<span>${t(settings.title)}</span>`,
      }),
    ]));
  }
  footer.appendChild(h('div.app-side__build', { text: 'OP.GG for Desktop' }));
  els.side.appendChild(footer);
}

function setActiveSide() {
  const state = store.getState();
  for (const link of els.side.querySelectorAll('.app-side__item')) {
    const href = link.getAttribute('href');
    const active = href === `#/${state.route.id}`;
    link.classList.toggle('is-active', active);
    link.setAttribute('aria-current', active ? 'page' : 'null');
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
}

async function mountRoute(id, params) {
  const route = routeById.get(id);
  if (!route) return;

  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (err) {
      console.error('[app] page cleanup failed', err);
    }
    currentCleanup = null;
  }

  clear(els.main);
  els.main.appendChild(h('div.app-loading', { text: t('common.loading', null, 'Loading...') }));

  let module;
  try {
    module = await route.load();
  } catch (err) {
    console.error(`[app] failed to load page "${id}"`, err);
    replace(els.main, h('div.app-error', {}, [
      h('p', { text: t('common.error', null, 'Something went wrong.') }),
      h('p.app-error__detail', { text: String(err && err.message ? err.message : err) }),
    ]));
    return;
  }

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
    console.error(`[app] page "${id}" failed to mount`, err);
    replace(page, h('div.app-error', {}, [
      h('p', { text: t('common.error', null, 'Something went wrong.') }),
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

  // Initial route: allow ?route=champions deep links.
  const params = new URLSearchParams(window.location.search);
  const initial = params.get('route') || store.getState().route.id || 'champions';
  const initialParams = Object.fromEntries(params.entries());
  delete initialParams.route;
  navigate(initial, initialParams);

  void refreshLcuStatus();
  setInterval(refreshLcuStatus, 5000);

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
