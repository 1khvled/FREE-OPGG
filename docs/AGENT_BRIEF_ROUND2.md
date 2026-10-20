# Round 2 brief — the missing reference screens

Read `D:\open-opgg\docs\AGENT_BRIEF.md` first (the general rules), then this file.

The reference's full route table was recovered with
`node tools/rea-routes.mjs` (108 routes, 14 of them League of Legends):

```
/lol/home                          common.sidebar.home
/lol                               common.live.tab.myprofile
/lol/collections                   common.sidebar.collections
/lol/live/recommendation/v2        common.sidebar.live
/lol/quickplay/v2                  common.live.tab.quickPlay
/lol/live/multisearch              common.live.tab.multisearch
/lol/live/champion/v3              common.live.tab.champion
/lol/live/ingame                   common.live.tab.ingame
/lol/live/end-of-game              common.live.tab.eog
/lol/champions                     lol.champions.sidebar.analysis
/lol/live-op-champions/v2          common.op
/lol/modes                         common.sidebar.gameMode
/lol/buff-nerf                     common.buff-nerf
```

The desktop shell's own sidebar adds `/combos` ("Combos") and `/op-champions`
("OP Champions").

**Already built:** Champions (`/lol/champions`), Live (`/lol/live/champion/v3`),
Leaderboard, Multi-search (`/lol/live/multisearch`), My info (`/lol`), Settings,
the champion detail modal and the in-game overlay.

**This round builds:** Combos, OP Champions, Buff / Nerf, Game modes — plus the
champion-detail extras, the Axiforma webfont, the locale bundles and the
sidebar.

---

## 1. New IPC channels (agent `backend` owns these)

Add to `RENDERER_TO_MAIN_INVOKE` in `D:\open-opgg\shared\channels.js`:

```js
OPGG_COMBOS: 'opgg:combos',
OPGG_BUFF_NERF: 'opgg:buff-nerf',
OPGG_ARAM_BALANCE: 'opgg:aram-balance',
```

The renderer calls them through `ctx.api` — add to `D:\open-opgg\src\core\api.js`:

```js
combos: (params) => invoke(INVOKE, 'OPGG_COMBOS', params),
buffNerf: (params) => invoke(INVOKE, 'OPGG_BUFF_NERF', params),
aramBalance: (params) => invoke(INVOKE, 'OPGG_ARAM_BALANCE', params),
```

## 2. Response shapes (exact — the page agents code against these)

```js
// opgg:combos      payload { champion: 'Jinx' }
//   -> GET https://desktop-api.op.gg/skill?champ={champion}
{
  ok: true,
  champion: 'Jinx',
  versions: [
    { version: '16.12.1',
      skills: [ { version, champ, spellKey, slot, baseLocale, description } ] }
  ]
}

// opgg:buff-nerf   payload { locale?: 'en' }
//   -> GET https://desktop-api.op.gg/buff-nerf/latest?gameType=lol
{
  ok: true,
  patchVersion: '26.20',
  patchDate: '2026-10-07',
  isActive: true,
  title: '…',
  entries: [ { id: 'Ambessa', key: '799', log: '…', status: 'nerf' | 'buff' } ]
}

// opgg:aram-balance payload {}
//   -> GET https://lol-api-champion.op.gg/api/contents/aram-balance
{
  ok: true,
  rows: [ { championId, attackSpeed, damageDealt, damageTaken, cooldownReduction,
            healing, tenacity, shieldAmount, energyRegen, areaOfEffectDamage,
            default } ]
}
```

Every handler returns `{ ok: false, error: '…' }` on failure and never throws
across the bridge.

### Two important facts about the live data

1. **`/skill` is enormous** — about 4.5 MB for one champion. The main process
   must trim it: keep at most the 20 most recent versions, and strip the HTML
   tags from `description` (the reference renders the text). The source text is
   Korean (`baseLocale: 'ko_KR'`); do not translate it, just render it.
2. **`aram-balance` has no champion names** — only ids. The page resolves the
   names from `ctx.api.staticData()`.

## 3. Page contract (unchanged)

```js
export const meta = { id, title, order, group, icon };
export function mount(container, ctx) { /* → optional cleanup */ }
```

`ctx` = `{ store, api, i18n: { t }, bus, navigate, params, helpers }`.

Route ids and titles for the new screens:

| Directory | `meta.id` | `meta.title` | `meta.group` |
| --- | --- | --- | --- |
| `src/pages/combos/` | `combos` | `common.Combos` | `champions` |
| `src/pages/op-champions/` | `op-champions` | `common.op` | `champions` |
| `src/pages/buff-nerf/` | `buff-nerf` | `common.buff-nerf` | `champions` |
| `src/pages/modes/` | `modes` | `common.sidebar.gameMode` | `champions` |

`common.op` = "OP champions", `common.buff-nerf` = "Buff / Nerf",
`common.sidebar.gameMode` = "Game modes". `common.Combos` does not exist in the
catalogue — add it to `src/i18n/app.en.json` as "Combos".

The reference's sidebar order inside the "Champions" group is:
**Tiers · Combos · OP Champions · Game modes · Buff / Nerf**.

## 4. Visual rules (unchanged and strict)

- `src/styles/tokens.css` is the only source of colour, radius, spacing and
  type size. **No hex literals in page CSS.**
- Table geometry: 32px header, **40px** rows, 12px muted numeric cells with
  `tabular-nums`, 12px panel radius.
- Tier badges: the letter grade scale `S+ / S / A / B / C / D` with the
  `tier-splus` / `tier-s` / `tier-a` … classes (see `overlay/overlay.css`).
- Never below 12px type.
- The reference's own copy is in `src/i18n/en.json` — use it verbatim.

## 5. The four new screens

### Combos (`/combos`)
The reference's "Combos" screen shows a champion's **skill history across
patches**: every patch version, the abilities that changed, and the change
log. The data is `opgg:combos`.

Layout: a champion picker (a searchable grid of champion portraits, like the
one on the Champions screen) on the left, and on the right a vertical list of
patch versions; each version expands to the abilities that changed (`slot`:
Q/W/E/R), each with the change text. The reference's copy for the screen is
`lol.champions.combos-*` if present — search the catalogue.

### OP Champions (`/lol/live-op-champions/v2`)
The reference's "OP champions" list — the champions in the **OP tier** (tier 0,
the top of the ladder). It reuses the champion tier list, so there is **no new
endpoint**: call `ctx.api.champions({ ...filters })` and keep the rows whose
`tier` is `'OP'` (the tier label the main process returns).

Layout: the same portrait grid and the same seven-column table as the
Champions screen, but filtered to the OP tier, with the reference's own
`common.op` heading and a count of how many champions are in the tier.

### Buff / Nerf (`/lol/buff-nerf`)
The reference's patch-notes screen: which champions were buffed or nerfed in
the latest patch, and by how much. The data is `opgg:buff-nerf`.

Layout: a two-column list — buffs on one side, nerfs on the other — each entry
showing the champion portrait, the name, a `Buff` / `Nerf` badge, and the
change log. The reference's copy: `lol.buff-nerf.buff` ("Buff"),
`lol.buff-nerf.nerf`, `lol.buff-nerf.champion-list` ("Champion list"),
`lol.buff-nerf.changed-patches` ("Changed patches · {{n}}"),
`lol.buff-nerf.by-patch` ("By patch"),
`lol.buff-nerf.patch-note` if present.

### Game modes (`/lol/modes`)
The reference's "Game modes" screen: the per-champion **balance ratios** for
the mode, from `opgg:aram-balance` — attack speed, damage dealt, damage
taken, cooldown reduction, healing, tenacity, shield, energy regeneration and
area-of-effect damage, each as a ratio against the reference value.

Layout: a table of champions with a column per stat, the value shown as a
percentage with a bar whose length is the ratio and whose colour is green above
100 % and red below. The champion name and portrait come from
`ctx.api.staticData()`.

## 6. The champion-detail extras

The reference's champion detail has two more sections that the replica lacks:

- **Lane Tips** (`lol.common.champion.line-tip`) — a short lane-specific tip
  for the champion. The reference sources it from the match-up analysis; the
  replica derives it from the counters it already has: name the opponent with
  the lowest win rate and say the lane is losing to it. **Never invent a
  number** — if there is no counter data, show the reference's empty state
  (`lol.common.champion.tip-no-data`).
- **Combo Videos** (`lol.live.champion.v3.combo-videos`, "Combo Videos") — a
  list of the champion's combo videos. The reference loads them from its own
  video service; the replica has no such endpoint, so render the section with
  the reference's empty copy
  (`lol.live.champion.v3.no-combo-videos-yet`) and a link to the champion's
  YouTube search. Do not fabricate video entries.

## 7. Fonts

`src/assets/fonts/Axiforma-{Regular,Bold,Heavy}` ship in the repo but no
`@font-face` declares them, so `--font-display` silently falls back to Roboto.

Add `src/styles/fonts.css` with the three `@font-face` rules pointing at
`../assets/fonts/…` (relative to `src/styles/`), link it from
`src/index.html` **before** `tokens.css`, and set `--font-display` to
`'Axiforma', 'Roboto', sans-serif`. Use `--font-display` for the app chrome
(the sidebar, the header, the page titles) exactly as the reference does for
its desktop chrome.

## 8. Locales

The reference ships `assets/i18n/locales/{de,en,es,fr,ja,kr,pl,pt,ru,sc,tc,tr}.json`
and `assets/i18n/v3/<locale>/app.json` for 24 locales. Copy the **v3** bundles
for the locales the replica lists in Settings into `src/i18n/locales/<code>.json`
(flatten them to dotted keys, exactly as `src/i18n/en.json` is flattened), and
make `src/core/i18n.js` load them lazily.

`src/core/i18n.js` is owned by the `extras` agent alone — do not let two
agents edit it.

If a locale file cannot be flattened (duplicate keys, odd shapes), skip that
locale and leave it marked as unavailable in the Settings list. **Never** ship a
half-translated catalogue as if it were complete.

## 9. The sidebar

`src/app.js` and `src/styles/base.css` are owned by the `shell` agent alone.

The reference's sidebar (captured live) is:

```
Champions
  Tiers            -> #/OP.GG/
  Combos           -> #/OP.GG/combos
  OP Champions     -> #/OP.GG/op-champions
  ────────────────
Direct
  OP.GG Pick       (greyed out in the LoL build)
  Multi-recherche  (greyed out in the LoL build)
  ────────────────
  [discord icon]
  20260914 0836    (build stamp)
```

The replica's sidebar must show: the Champions group with **Tiers, Combos, OP
Champions, Game modes, Buff / Nerf**; the Direct group with the existing
**Multi-search** and **My info**; the Discord link in the footer; and the
**build stamp** (the app version and the build time) where the reference has it.

The reference's sidebar item is 156×34px, radius 4px, padding 10px 14px, and
the active item's background is `--brand` (#5f32e6). The footer Discord item is
a `li.side-menu-item` with the `icon-discord.svg` icon.

## 10. Definition of done

- Every file you own exists, is coherent and passes `node --check`.
- `node tools/check-syntax.mjs .` reports 0 failures.
- `node tools/verify-pages.mjs` renders every screen with no console error, no
  exception and no broken image. **Add your new screens to the `PAGES` list in
  `tools/verify-pages.mjs`** — but only the `shell` agent may edit that file, so
  instead report your page ids and let the shell agent add them.
- No hex literals in CSS, no type below 12px, no invented data, no telemetry.
- Do not `git commit`.
