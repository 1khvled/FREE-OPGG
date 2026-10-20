/**
 * Shared UI atoms.
 *
 * Every component is a factory that returns a DOM element (or a small handle
 * object with an `element` property). Components are pure: they take their
 * data through arguments, they never touch the store, they never perform
 * network calls and they never fabricate values.
 *
 * Importing this module also injects `src/styles/components.css` into the
 * document head exactly once, so any page that imports a component gets the
 * shared styles automatically.
 *
 *   import { createTierChip, createSortableTable } from '../../components/index.js';
 */

/* ---- Atoms ---------------------------------------------------------------- */
export { createTierChip, tierToken } from './tier-chip.js';
export { createRoleChip, normalizeRole } from './role-chip.js';
export { createChampionAvatar } from './champion-avatar.js';
export { createChampionTile } from './champion-tile.js';
export { createItemIcon, createRuneIcon, createSummonerSpellIcon } from './icons.js';
export { createStatCell } from './stat-cell.js';

/* ---- Controls ------------------------------------------------------------- */
export { createSelect } from './select.js';
export { createToggle } from './toggle.js';
export { createSegmentedControl } from './segmented-control.js';
export { createSearchInput } from './search-input.js';
export { createSearchBar } from './search-bar.js';
export { createDropdownToggle } from './dropdown-toggle.js';
export { createTabs } from './tabs.js';

/* ---- Containers ----------------------------------------------------------- */
export { createSortableTable } from './sortable-table.js';
export { createModal } from './modal.js';
export { createTooltip, attachTooltip, detachTooltip, hideTooltip, sanitizeTooltipHtml } from './tooltip.js';

/* ---- States & feedback ---------------------------------------------------- */
export { createLoadingSkeleton, createErrorState, createEmptyState } from './states.js';
export { createToast } from './toast.js';

/* --------------------------------------------------------------------------- *
 * Stylesheet injection
 * --------------------------------------------------------------------------- */

/**
 * Resolve the stylesheet URL relative to this module, so the link works no
 * matter which document loaded the script.
 *
 * @returns {string}
 */
function stylesheetHref() {
  try {
    return new URL('../styles/components.css', import.meta.url).href;
  } catch {
    return 'styles/components.css';
  }
}

/**
 * Append the shared component stylesheet to `document.head` once.
 */
function ensureStylesheet() {
  if (typeof document === 'undefined' || !document.head) return;

  const href = stylesheetHref();

  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some((link) => {
      if (link.getAttribute('href') === href) return true;
      try {
        return new URL(link.href, document.baseURI).href === href;
      } catch {
        return false;
      }
    });

  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

ensureStylesheet();
