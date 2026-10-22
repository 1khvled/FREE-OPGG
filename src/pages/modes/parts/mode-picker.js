/**
 * The mode picker.
 *
 * The reference's modes screen is mode parameterised, and its own mode
 * picker is a row of `.recommendation-tab` pills inside a `.statistics-tabs`
 * strip (see the shipped `docs/rea/game-mode-bundle.js`). The replica's
 * shared `createTabs` component renders exactly those pills, so the picker
 * is the same widget the Champions screen's role tabs use.
 *
 * The mode lives in the URL, so picking one hands the mode to the shell
 * through `ctx.navigate('modes', { mode })` — the screen is rebuilt with the
 * new mode's champion list and stat set.
 */

import { h } from '../../../core/dom.js';
import { createTabs } from '../../../components/index.js';
import { MODES } from '../data.js';

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {string} options.mode - the active mode.
 * @param {(mode:string)=>void} options.onChange
 */
export function createModePicker({ t, mode, onChange }) {
  const tabs = createTabs({
    variant: 'pill',
    label: t('common.sidebar.gameMode', null, 'Game modes'),
    value: mode,
    tabs: MODES.map((entry) => ({
      id: entry.value,
      label: t(entry.labelKey, null, entry.fallback),
    })),
    onChange: (id) => {
      if (typeof onChange === 'function') onChange(String(id));
    },
  });

  const element = h('div.modes__modes', {}, [tabs.element]);

  return { element };
}
