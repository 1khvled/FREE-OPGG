# Agent brief — read this first

You are one member of a swarm rebuilding `D:\open-opgg` as a clean-room 1:1
replica of **OP.GG for Desktop v3.1.4** (League of Legends scope).

Read these files before writing code:

1. `D:\open-opgg\docs\SPEC.md` — the full rebuild specification.
2. `D:\open-opgg\docs\rea\design-tokens.md` — measured palette, typography, geometry.
3. `D:\open-opgg\docs\rea\screen-inventory.md` — the reference's screens and shell.
4. `D:\open-opgg\docs\rea\endpoints.md` — live API catalogue.
5. `D:\open-opgg\docs\rea\ipc-channels.md` — the 357 recovered IPC channel literals.
6. `D:\open-opgg\docs\rea\i18n.en.json` — 4094 exact UI strings (use these verbatim).

## The contracts you MUST honour

### Renderer core (already written — do not modify)

- `D:\open-opgg\src\core\store.js` → `store` (`getState`, `setState`, `update`, `subscribe`, `select`).
- `D:\open-opgg\src\core\api.js` → `api` (typed helpers, all calls go to the main process).
- `D:\open-opgg\src\core\dom.js` → `h`, `append`, `clear`, `replace`, `debounce`, `throttle`, `percent`, `count`, `escapeHtml`.
- `D:\open-opgg\src\core\i18n.js` → `t(key, vars, fallback)`; keys are the reference's dotted keys.
- `D:\open-opgg\src\core\events.js` → `bus.on/off/emit`.
- `D:\open-opgg\src\styles\tokens.css` → CSS variables. **Never hard-code a hex colour.**

### Page module contract

```js
// src/pages/<name>/index.js
import { h } from '../../core/dom.js';

export const meta = { id: 'champions', title: 'common.Champions', order: 10 };

export function mount(container, ctx) {
  // ctx = { store, api, i18n: { t }, bus, navigate, params, helpers }
  container.appendChild(/* ... */);
  return () => { /* optional cleanup */ };
}
```

- `ctx.api.*` is asynchronous and may reject — always handle errors and show a
  visible error state. Never leave a blank screen.
- `ctx.store.subscribe(fn)` — call the returned function to unsubscribe.
- `ctx.i18n.t('lol.champions.win-rate')` — reference keys, exact strings.
- `ctx.navigate('champion-detail', { championId: 12 })` to change screen.

### Hard rules

1. **Only write inside the directories you were assigned.** Another agent owns the
   rest; touching it causes a conflict.
2. **Renderer code is ES modules** (`import`/`export`). The main process and
   preload are CommonJS (`require`). Do not mix.
3. **No UI framework.** Build DOM with the `h()` helper or `innerHTML` with
   `escapeHtml` for untrusted strings.
4. **No telemetry, no analytics, no ad SDKs, no Sentry.** The replica ships none.
5. **Never fabricate data.** If an endpoint fails, show the error state and a
   retry affordance. Do not invent numbers.
6. **Typography floor**: 12px for column headers and metadata only; 14px for
   body, rows and data cells; 13px for chips and buttons; 15px for tabs;
   16px for reading paragraphs. Never 10px or 11px.
7. Use CSS custom properties from `tokens.css` for every colour, radius, spacing
   step and font size. Page-specific CSS goes in a `<name>.css` file inside your
   own directory, imported by your `index.js` via a relative `./name.css` import
   (the renderer is served over `file://`; use a plain `<link>` in the page
   module's sibling HTML only if necessary — prefer injecting a `<style>` tag or
   a `<link>` element you append to `document.head`).
8. `node --check <file>` must pass on every JavaScript file you write.
9. Do not run `npm install` — `node_modules` already exists.
10. Do not `git commit`. The orchestrator commits.

## Where the reference source lives

- Decompressed renderer bundles (readable JS):
  `D:\opgg_extracted\_decompressed\assets\react\*.js`
  (`ChampionsV3.47962334.bundle.js`, `LoL.c4a25cd8.bundle.js`,
  `LiveChampion3.8c6f1092.bundle.js`, `overlay.e6ae753e.js`,
  `app.17903a6b.js`, `stratum.ef0c5379.js`, …)
- Electron main process (plain text, 1.9 MB): `D:\opgg_extracted\assets\main\main.js`
- Preload: `D:\opgg_extracted\assets\main\preload.js`
- The previous working implementation, kept for reference:
  `D:\opgg_extracted\legacy_openopgg\{main.js, renderer.js, style.css, overlay.js, overlay.css}`

Use the reference to confirm behaviour, strings, layout and data shapes. Do not
paste minified vendor code into this repo.

## Definition of done

- Every file you were assigned exists and is coherent.
- `node --check` passes on all your JavaScript.
- The module follows the page contract and cleans up after itself.
- No hex literals in your CSS; no font-size below 12px.
- No console noise left behind.
