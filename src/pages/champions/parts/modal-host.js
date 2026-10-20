/**
 * Champion detail modal host.
 *
 * The desktop app opens the champion detail from the tier list. This module
 * only provides the *host*: the scrim, the raised panel, the close button and
 * the hand-off to `ctx.navigate('champion-detail', …)`.
 *
 * When the champion-detail page module is available it is mounted inside the
 * panel; when it is not, a well-formed empty state (champion name + close
 * button) is rendered instead — the panel is never broken.
 */

import { h, clear } from '../../../core/dom.js';
import { portraitUrls } from '../data.js';

/** The champion-detail page module is probed once and then cached. */
let detailModule = null;
let detailProbe = null;

async function loadDetailModule() {
  if (detailModule) return detailModule;
  if (!detailProbe) {
    detailProbe = import('../../champion-detail/index.js')
      .then((mod) => {
        detailModule = mod && typeof mod.mount === 'function' ? mod : null;
        return detailModule;
      })
      .catch(() => null);
  }
  return detailProbe;
}

/**
 * @param {object} options
 * @param {object} options.ctx - the page context.
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 */
export function createModalHost({ ctx, t }) {
  const header = h('header.champion-detail-modal__header');
  const body = h('div.champion-detail-modal__body');
  const panel = h('section.champion-detail-modal__panel', {
    role: 'dialog',
    'aria-modal': 'true',
  }, [header, body]);

  const backdrop = h('div.champion-detail-modal__backdrop', {
    'aria-hidden': 'true',
    on: { click: () => close() },
  });

  const root = h('div.champion-detail-modal', { hidden: true }, [backdrop, panel]);
  document.body.appendChild(root);

  let detailCleanup = null;
  let open = false;

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  function close() {
    if (!open) return;
    open = false;
    root.hidden = true;
    document.removeEventListener('keydown', onKeydown, true);
    if (typeof detailCleanup === 'function') {
      try {
        detailCleanup();
      } catch {
        /* the detail page may already be gone */
      }
      detailCleanup = null;
    }
    clear(body);
    clear(header);
  }

  function renderEmpty(champion) {
    clear(body);
    body.appendChild(h('div.champ-state.champ-state--empty', { role: 'status' }, [
      h('p.champ-state__title', { text: champion.name }),
      h('p.champ-state__message', {
        text: t('lol.champions.change-filter', null, 'There is not enough data to show. Change region, tier, or patch filter above to see more data.'),
      }),
      h('button.champ-state__action', {
        type: 'button',
        on: { click: () => close() },
      }, [t('common.close', null, 'Close')]),
    ]));
  }

  function renderHeader(champion) {
    clear(header);

    const portrait = h('div.champion-detail-modal__portrait');
    const urls = portraitUrls(champion, 48);
    if (urls.length) {
      const img = h('img.champion-detail-modal__portrait-image', {
        src: urls[0],
        alt: champion.name,
        width: 40,
        height: 40,
        loading: 'lazy',
        draggable: 'false',
      });
      let index = 0;
      img.addEventListener('error', () => {
        index += 1;
        if (index < urls.length) img.src = urls[index];
        else img.remove();
      });
      portrait.appendChild(img);
    }

    const identity = h('div.champion-detail-modal__identity', {}, [
      h('h2.champion-detail-modal__name', { text: champion.name }),
      champion.title
        ? h('span.champion-detail-modal__title', { text: champion.title })
        : null,
    ]);

    const actions = h('div.champion-detail-modal__actions');

    // The hand-off to the champion-detail route.
    const openPage = h('button.champion-detail-modal__open', {
      type: 'button',
      title: t('common.Champions', null, 'Champions'),
      on: {
        click: () => {
          ctx.navigate('champion-detail', {
            championId: champion.id,
            position: champion.role || 'TOP',
            key: champion.key,
          });
        },
      },
    }, [t('lol.champions.champion', null, 'Champion')]);

    const closeButton = h('button.champion-detail-modal__close', {
      type: 'button',
      'aria-label': t('common.close', null, 'Close'),
      title: t('common.close', null, 'Close'),
      on: { click: () => close() },
    }, [h('span', { 'aria-hidden': 'true', text: '×' })]);

    actions.append(openPage, closeButton);
    header.append(portrait, identity, actions);
  }

  /**
   * Open the modal for a champion row.
   *
   * @param {object} champion - normalised champion row.
   */
  async function show(champion) {
    open = true;
    root.hidden = false;
    renderHeader(champion);
    clear(body);
    body.appendChild(h('div.champ-state.champ-state--loading', {}, [
      h('p.champ-state__message', { text: t('lol.mypage.loading', null, 'Loading...') }),
    ]));
    document.addEventListener('keydown', onKeydown, true);

    const mod = await loadDetailModule();
    if (!open) return;

    if (!mod) {
      renderEmpty(champion);
      return;
    }

    try {
      clear(body);
      detailCleanup = mod.mount(body, {
        ...ctx,
        params: {
          championId: champion.id,
          position: champion.role || 'TOP',
          key: champion.key,
          name: champion.name,
        },
      }) || null;
    } catch {
      renderEmpty(champion);
    }
  }

  return {
    element: root,
    show,
    close,
    /** Remove the host from the DOM (page cleanup). */
    destroy() {
      close();
      if (root.parentNode) root.parentNode.removeChild(root);
    },
  };
}
