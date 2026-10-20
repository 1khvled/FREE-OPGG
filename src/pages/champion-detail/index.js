/**
 * Champion detail screen.
 *
 * The champion page of the reference app: portrait, tier, win/pick/ban rates,
 * the recommended rune page, the item build, the skill build, the counters and
 * the 1v1 match-up analyser.
 *
 * Data comes from `ctx.api.championDetail({ championId, position, tier, mode })`
 * and is normalised by `data.js`, which accepts every shape the endpoint has
 * had across the reference's releases.
 *
 * Page contract (docs/SPEC.md §2):
 *   export const meta = { id, title, order };
 *   export function mount(container, ctx) { … return optional cleanup }
 */

import { h, clear } from '../../core/dom.js';
import {
  POSITIONS,
  normalizePosition,
  normalizeChampionDetail,
  applyStaticData,
  extractLaneKillRates,
} from './data.js';
import { createTooltip, makeTranslator } from './parts/common.js';
import { renderHeader } from './parts/header.js';
import { renderRunesPanel } from './parts/runes-panel.js';
import { renderBuildPanel } from './parts/build-panel.js';
import { renderSkillsPanel } from './parts/skills-panel.js';
import { renderCountersPanel } from './parts/counters-panel.js';
import { renderMatchupPanel } from './parts/matchup-panel.js';

export const meta = {
  id: 'champion-detail',
  title: 'common.champion',
  order: 15,
};

/* -------------------------------------------------------------------------- */
/* Stylesheet                                                                  */
/* -------------------------------------------------------------------------- */

let styleLink = null;
let styleUsers = 0;

/** Append the page stylesheet to `<head>`; returns the release function. */
function acquireStylesheet() {
  styleUsers += 1;
  if (!styleLink) {
    styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = new URL('./champion-detail.css', import.meta.url).href;
    styleLink.dataset.opggPage = 'champion-detail';
    document.head.appendChild(styleLink);
  }
  return () => {
    styleUsers -= 1;
    if (styleUsers > 0 || !styleLink) return;
    styleLink.remove();
    styleLink = null;
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Mount the champion-detail screen.
 *
 * @param {HTMLElement} container
 * @param {{ store: object, api: object, i18n: { t: Function }, navigate: Function, params: object }} ctx
 * @returns {() => void} cleanup
 */
export function mount(container, ctx) {
  const t = typeof ctx?.i18n?.t === 'function'
    ? makeTranslator(ctx.i18n.t)
    : (key, vars, fallback) => (fallback !== undefined ? fallback : key);

  const params = ctx?.params || {};
  const championId = Number.parseInt(params.championId ?? params.id ?? params.champion_id, 10);
  const position = normalizePosition(params.position ?? params.lane ?? params.role)
    || POSITIONS[2];

  const tooltip = createTooltip();
  const releaseStyles = acquireStylesheet();

  const root = h('div.cd-root');
  container.appendChild(root);

  let model = null;
  let opponentId = null;
  let disposed = false;

  /* ---- request parameters ------------------------------------------------ */

  function requestParams(extra = {}) {
    const state = ctx?.store?.getState?.() || {};
    const filters = state.champions?.filters || {};
    return {
      championId: Number.isFinite(championId) ? championId : null,
      position,
      region: params.region || filters.region || 'GLOBAL',
      tier: params.tier || filters.tier || 'emerald_plus',
      mode: params.mode || filters.queue || 'ranked',
      version: params.version || filters.patch || undefined,
      ...extra,
    };
  }

  function setStoreDetail(patch) {
    if (!ctx?.store?.setState) return;
    const current = ctx.store.getState?.()?.detail || {};
    ctx.store.setState({ detail: { ...current, championId, position, ...patch } });
  }

  /* ---- states ------------------------------------------------------------ */

  function renderState(kind, message, detail) {
    clear(root);
    const children = [h('p.cd-state__text', { text: message })];
    if (detail) children.push(h('p.cd-state__detail', { text: detail }));
    if (kind !== 'loading') {
      children.push(h('button.cd-button', {
        type: 'button',
        on: { click: () => { void load(); } },
        text: t('common.refresh-txt'),
      }));
    }
    root.appendChild(h(`div.cd-state.cd-state--${kind}`, null, children));
  }

  function renderContent() {
    clear(root);

    const view = {
      t,
      model,
      tooltip,
      opponentId,
      onSelectOpponent: selectOpponent,
    };

    root.appendChild(renderHeader(view));
    root.appendChild(h('div.cd-grid', null, [
      h('div.cd-column.cd-column--main', null, [
        renderRunesPanel(view),
        renderBuildPanel(view),
        renderSkillsPanel(view),
      ]),
      h('div.cd-column.cd-column--side', null, [
        renderCountersPanel(view),
        renderMatchupPanel(view),
      ]),
    ]));
  }

  /* ---- data -------------------------------------------------------------- */

  async function load() {
    if (disposed) return;
    renderState('loading', t('lol.buff-nerf.loading-champion-data'));
    setStoreDetail({ loading: true, error: null });

    let raw = null;
    let error = null;
    let laneFallback = false;

    try {
      raw = await ctx.api.championDetail(requestParams());
    } catch (firstError) {
      error = firstError;
      // The endpoint is per lane: a champion that never plays the requested
      // lane answers 404. Retry without the lane and fall back to the
      // champion's average statistics instead of showing nothing.
      if (position) {
        try {
          raw = await ctx.api.championDetail(requestParams({ position: undefined }));
          error = null;
          laneFallback = true;
        } catch (secondError) {
          error = secondError;
        }
      }
    }

    if (disposed) return;

    if (error || !raw) {
      const message = String(error?.message || error || '');
      setStoreDetail({ loading: false, error: message });
      renderState('error', t('lol.live.champion.v3.failed-to-load-champion-info'), message);
      return;
    }

    model = normalizeChampionDetail(raw, {
      championId: Number.isFinite(championId) ? championId : null,
      position: laneFallback ? null : position,
      laneFallback,
      tier: requestParams().tier,
      mode: requestParams().mode,
    });

    setStoreDetail({ loading: false, error: null, data: raw });

    if (!model.hasData) {
      renderState('empty', t('lol.champions.change-filter'));
      return;
    }

    // Preselect the strongest counter so the match-up analyser has a subject.
    if (!opponentId && model.matchups.length) opponentId = model.matchups[0].championId;

    renderContent();
  }

  /**
   * The lane-kill rate lives in the counter endpoint, not in the champion
   * document. When the main process forwards a `targetChampion` parameter the
   * matching rows come back with the lane-kill counters, so the match-up panel
   * is enriched with them.
   */
  async function enrichOpponent(id) {
    if (!Number.isFinite(id) || !ctx?.api?.championDetail) return;
    try {
      const raw = await ctx.api.championDetail(requestParams({ targetChampion: id }));
      if (disposed || !model) return;
      const rates = extractLaneKillRates(raw);
      if (!rates.has(id)) return;
      const entry = model.counters.all.find((item) => item.championId === id);
      if (!entry || entry.laneKillRate !== null) return;
      entry.laneKillRate = rates.get(id);
      renderContent();
    } catch {
      /* The optional counter lookup failed — the panel keeps its dashes. */
    }
  }

  function selectOpponent(id) {
    opponentId = Number.isFinite(id) ? id : null;
    renderContent();
    void enrichOpponent(opponentId);
  }

  /* ---- boot -------------------------------------------------------------- */

  void load();

  // Best-effort metadata refresh: the live static-data payload refines the
  // champion / item / rune names the shipped Data Dragon snapshot carries.
  if (ctx?.api?.staticData) {
    Promise.resolve(ctx.api.staticData())
      .then((payload) => {
        if (disposed) return;
        applyStaticData(payload);
        if (model && model.hasData) renderContent();
      })
      .catch(() => { /* the local snapshot already covers the metadata */ });
  }

  return () => {
    disposed = true;
    releaseStyles();
    tooltip.destroy();
    if (root.parentNode) root.parentNode.removeChild(root);
  };
}

/** Alias for hosts that embed the screen in a modal instead of routing to it. */
export const mountChampionDetail = mount;

export default { meta, mount, mountChampionDetail };
