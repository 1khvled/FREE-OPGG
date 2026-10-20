/**
 * The patch-version list — the right hand column of the Combos screen.
 *
 * Every row is a collapsible entry:
 *
 *   button.combos-version__row     40px row — version on the left, the
 *                                   number of changed abilities on the right
 *   div.combos-version__body       the abilities of that patch, grouped by
 *                                   slot (Q / W / E / R)
 *
 * Inside a group every ability shows its `spellKey` (12px metadata) and the
 * change log — the upstream description, rendered verbatim with
 * `white-space: pre-line` so the line breaks the main process produced are
 * kept. The source text is Korean (`baseLocale: 'ko_KR'`); it is never
 * translated.
 */

import { h, clear } from '../../../core/dom.js';

/**
 * The chevron glyph of a collapsible row (inline SVG, no network request).
 *
 * @returns {SVGElement}
 */
function createChevron() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = '<path d="M6 3.5 L10.5 8 L6 12.5" stroke="currentColor" stroke-width="1.5" '
    + 'stroke-linecap="round" stroke-linejoin="round" />';
  return svg;
}

/**
 * @param {object} options
 * @param {(key:string, vars?:object, fallback?:string)=>string} options.t
 * @param {(version:object)=>void} [options.onToggle]
 */
export function createVersionList({ t, onToggle }) {
  const root = h('div.combos-versions');
  let versions = [];
  const expanded = new Set();

  function bodyFor(version) {
    const body = h('div.combos-version__body');

    if (!version.groups.length) {
      body.appendChild(h('p.combos-version__none', {
        text: t('lol.common.no-data', null, 'No data'),
      }));
      return body;
    }

    for (const group of version.groups) {
      const skills = h('div.combos-slot__skills');

      for (const skill of group.skills) {
        const row = h('div.combos-skill', {}, [
          h('div.combos-skill__key', {
            text: skill.spellKey || '—',
            title: skill.spellKey || '',
          }),
          h('div.combos-skill__text', { text: skill.description }),
        ]);
        skills.appendChild(row);
      }

      body.appendChild(h('div.combos-slot', {}, [
        h('span.combos-slot__badge', {
          text: group.slot || '—',
          'aria-hidden': 'true',
        }),
        skills,
      ]));
    }

    return body;
  }

  function rowFor(version, index) {
    const isOpen = expanded.has(index);
    const bodyId = `combos-version-body-${index}`;

    const row = h('button.combos-version__row', {
      type: 'button',
      'aria-expanded': isOpen ? 'true' : 'false',
      'aria-controls': bodyId,
    }, [
      h('span.combos-version__name', { text: version.version || '—' }),
      h('span.combos-version__count', {
        text: t('lol.buff-nerf.skill', { n: version.count }, `${version.count} skill`),
      }),
      createChevron(),
    ]);

    const body = bodyFor(version);
    body.id = bodyId;
    body.hidden = !isOpen;
    if (isOpen) row.classList.add('is-open');

    row.addEventListener('click', () => {
      const open = !expanded.has(index);
      if (open) expanded.add(index);
      else expanded.delete(index);

      row.classList.toggle('is-open', open);
      row.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.hidden = !open;

      if (typeof onToggle === 'function') onToggle(version, open);
    });

    return h('div.combos-version', {}, [row, body]);
  }

  function render() {
    clear(root);
    if (!versions.length) return;

    const fragment = document.createDocumentFragment();
    versions.forEach((version, index) => fragment.appendChild(rowFor(version, index)));
    root.appendChild(fragment);
  }

  return {
    element: root,
    /** Replace the version list. */
    setVersions(next) {
      versions = Array.isArray(next) ? next : [];
      expanded.clear();
      render();
    },
    /** Expand or collapse one version (by its index). */
    setExpanded(index, open) {
      if (open) expanded.add(index);
      else expanded.delete(index);
      render();
    },
  };
}
