# Round 3 brief — ARAM, ARAM: Mayhem and the modes page

Read `D:\open-opgg\docs\AGENT_BRIEF.md` first (the general rules), then this
file. The visual rules in `AGENT_BRIEF_ROUND2.md` §4 still apply unchanged.

## Why this round exists

The user compared the replica against OP.GG and found two problems:

1. **There is no ARAM page and no ARAM: Mayhem page.** OP.GG has both, and so
   must the replica.
2. **The "Game modes" page is meaningless** — it shows a table of balance
   percentages with no way to choose a mode. The reference's own page is
   *mode-parameterised*; the replica had hard-coded one mode.

## The reference's real router

`node tools/rea-router.mjs` dumps the shipped router (96 routes, **26 of them
League of Legends**):

```
/lol/home                                  /lol/aram-mayhem
/lol                                       /lol/modes/:mode?/:championId?
/lol/stats                                 /lol/quickplay
/lol/collections                           /lol/quickplay/v2
/lol/live/recommendation                   /lol/champions
/lol/live/recommendation/v2                /lol/champions/:championName
/lol/live/multisearch                      /lol/buff-nerf
/lol/live/champion/v3                      /lol/buff-nerf/:championKey
/lol/live/ingame                           /lol/live-op-champions
/lol/match-detail                          /lol/live-op-champions/v2
/lol/live/end-of-game                       /lol/media/:type?
/lol/brawl-tiers                           /lol/patch-notes
                                            /lol/jungle-camp-ranking
                                            /lol/dooms-bot-ranking
```

Note `/lol/modes/:mode?/:championId?` — the modes page takes a **mode** and a
**champion**.

---

## 1. ARAM tier list — agent `aram`

**New page** `src/pages/aram/`, route id `aram`, title `lol.common.gameMode.aram`
("ARAM"), group `champions`, order between OP champions and Game modes.

OP.GG's ARAM tier list is the same seven-column div grid as the ranked tier
list, with the ARAM queue's data.

### Data

`ctx.api.modeTierList('aram')` → `{ ok, mode, patch, updatedAt, rows }` where
each row is the standard champion row.

The live shape (`GET https://lol-api-champion.op.gg/api/GLOBAL/champions/aram/`):

```jsonc
{ "data": [ {
  "id": 86, "is_rotation": false, "is_rip": false,
  "average_stats": { "play": 70921, "win_rate": 0.512951, "pick_rate": 0.0625413,
                     "ban_rate": null, "kda": 2.846225, "tier": 2, "rank": 44,
                     "tier_data": { "tier": 2, "rank": 44, "rank_prev": 44, "rank_prev_patch": 49 } },
  "positions": null,                       // ← no lanes in ARAM
  "roles": [ { "name": "TANK", "stats": { "win_rate": 0.495178, "role_rate": 0.569668,
                                          "play": 37536, "win": 18587 } } ]
} ] }
```

**ARAM has no lanes** (`positions` is `null`) and no ban rate. The page must
therefore hide the lane filter and the ban-rate column, and fall back to
`average_stats` for every row. Write a page-local normaliser in
`src/pages/aram/data.js` — do not reuse the ranked page's lane logic.

### Layout

- Title `lol.common.gameMode.aram` ("ARAM") and the patch version.
- A champion portrait grid (the same 46×59px tiles the Champions screen uses)
  and the seven-column div grid.
- Columns: `#`, (role icon), `Champion`, `Tier`, `Win Rate`, `Pick Rate`, and
  the **ARAM balance tag** in place of the ban rate.

**Balance tag.** The reference pairs the tier list with
`GET https://lol-api-champion.op.gg/api/contents/aram-balance`, whose rows are
`{ champion_id, attack_speed, damage_dealt, damage_taken, cooldown_reduction,
healing, tenacity, shield_amount, energy_regen, area_of_effect_damage,
default }` — each a percentage of the reference champion (100 = baseline).
The balance tag is the headline change: a champion whose damage dealt is
**above 100 %** is buffed, **below 100 %** is nerfed. Use the sum of the
"dealt" and "taken" columns against their 100 % baseline to decide, and show
the dominant change in the tooltip. The reference renders the tier icon as
`https://desktop-app-data.op.gg/desktop/app/assets/images/optier-{tier}.svg` —
local copies are in `src/assets/images/ui/optier-{0..5}.svg`.

Never invent a balance tag: a champion whose balance row is missing gets no
tag, and one whose numbers are all exactly 100 % gets neither.

### Copy

`lol.common.gameMode.aram` ("ARAM"), `lol.champions.champion-list`
("Champion list"), `lol.champions.search` ("Search champions"),
`lol.buff-nerf.buff` ("Buff"), `lol.buff-nerf.nerf`.

---

## 2. ARAM: Mayhem — agent `mayhem`

**New page** `src/pages/aram-mayhem/`, route id `aram-mayhem`, title
`lol.aram-mayhem.aram-mayhem` ("ARAM: Mayhem"), group `champions`.

This page is **not** a tier table like the ranked one. The shipped bundle
`AramMayhem.03c382ad.bundle.js` (decompressed copy:
`docs/rea/aram-mayhem-bundle.js`) contains its exact styles. **Reproduce it.**

### Structure

```
h1                          the page title
  header row                display:flex; align-items:center; justify-content:space-between; gap:20px
    search box              width 400px
      input                 flex 1, no background/border, colour #fff, 14px, placeholder #9E9EB1
    (mode / filter control)
  div.tier-table            the six tier rows
    div.tier-table-row.tier-table-row.row-N
      div.tier-table-row-col1      the tier label
      div.tier-table-row-col2      the champions in that tier
        div.swarm-tier            one champion
          div.pal-image            64x64 portrait
          div                     the champion name (48px, ellipsis)
          div.augment-name         an augment they pair with (64px, 11px)
```

### The reference's exact CSS (from the bundle — use these values)

```css
.page        { display:flex; flex-direction:column; padding:20px; gap:24px;
               height:100%; font-size:12px; overflow:hidden; }
.page h1     { font-size:16px !important; line-height:20px !important;
               color:#fff !important; font-weight:400 !important; margin:0 !important; }
.header      { display:flex; align-items:center; justify-content:space-between;
               gap:20px; flex-shrink:0; }
.search      { display:flex; align-items:center; gap:10px; padding:10px 15px;
               background:#282830; border-radius:8px; border:1px solid #31313C;
               flex-shrink:0; width:400px; }
.search input{ flex:1; background:none; border:none; color:#fff; font-size:14px;
               outline:none; width:100%; padding-right:28px; }
.search input::placeholder { color:#9E9EB1; }

.tier-table  { width:100%; display:flex; flex-direction:column; border-radius:12px;
               flex:1; overflow-y:auto; overflow-x:hidden; }
.tier-table-row { display:flex; backdrop-filter:blur(11px);
               background-image:radial-gradient(circle at 50% 0, rgba(50,50,60,.15), rgba(50,50,60,.25) 95%); }
.tier-table-row:first-of-type { border-radius:12px 12px 0 0; }
.tier-table-row:last-of-type  { border-radius:0 0 12px 12px; }
.tier-table-row-col1 { width:56px; display:flex; align-items:center;
               justify-content:center; border-bottom:1px solid #121212;
               background-color:rgba(var(--point-rgb), 0.102); }
.tier-table-row-col2 { display:flex; flex-wrap:wrap; padding:12px; gap:12px;
               flex:1; border-bottom:1px solid #121212; }

.row-0 { background-color:#F15A5A1A; border-top-left-radius:12px; }   /* red   */
.row-1 { background-color:#0093FF1A; }                                /* blue  */
.row-2 { background-color:#00BBA31A; }                                /* teal  */
.row-3 { background-color:#FFB9001A; }                                /* gold  */
.row-4 { background-color:#8892A11A; }                                /* grey  */
.row-5 { background-color:#A88A671A; border-bottom-left-radius:12px; }/* brown */

.swarm-tier  { display:flex; flex-direction:column; align-items:center; gap:12px; }
.swarm-tier:hover div { text-decoration:underline; }
.swarm-tier div { width:48px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.augment-name{ width:64px; word-break:keep-all; font-size:11px; text-align:center; }
.pal-image   { display:flex; align-items:center; justify-content:center;
               position:relative; width:64px; height:64px; border:1px solid #31313C;
               border-radius:8px; background:#282830; overflow:hidden; }
.pal-image img { width:100%; height:100%; z-index:100; }
.pal-image::before { width:calc(100% - 4px); height:calc(100% - 4px);
               position:absolute; top:2px; left:2px; content:"";
               background-color:#282830; border-radius:6px; overflow:hidden; }
.search-highlight { background-color:#FFD700; color:#000; padding:2px 4px;
               border-radius:3px; font-weight:bold; }
.highlighted { background-color:rgba(255,215,0,0.1); border-radius:4px; padding:2px; }
.pal-speed   { color:#9E9EB1; }
```

**Colour literals in this page's CSS are the reference's own values.** Put them
in a `:root` block at the top of `aram-mayhem.css` as custom properties and
reference the variables in the rules, so the file still has no bare hex in a
rule.

### Data

`ctx.api.modeTierList('arena')` → `{ ok, mode: 'arena', patch, updatedAt, rows }`.
The live shape (`GET https://lol-api-champion.op.gg/api/GLOBAL/champions/arena/`):

```jsonc
{ "data": [ {
  "id": 86, "is_rotation": false, "is_rip": false,
  "average_stats": { "win": 43583, "play": 83264, "total_place": 284326,
                     "first_place": 14385, "pick_rate": 0.110745, "ban_rate": 0.0504778,
                     "kills": 728711, "assists": 818261, "deaths": 601056,
                     "tier": 2, "rank": 49,
                     "tier_data": { "tier": 2, "rank": 49, "rank_prev": 49, "rank_prev_patch": 30 } }
} ] }
```

The augment pairing comes from the champion detail endpoint
(`GET https://lol-api-champion.op.gg/api/GLOBAL/champions/arena/{champId}`),
whose `augment_group` is:

```jsonc
"augment_group": [ { "rarity": 1, "augments": [
  { "id": 22, "win": 3702, "play": 7166, "total_place": 24594, "first_place": 1163,
    "pick_rate": 0.0886, "win_rate": 0.5166061959252023 } ] } ]
```

Call it through `ctx.api.championDetail({ championId, mode: 'arena' })`.

### Rules

- Six tier rows, **tier 0 (OP) first**, then 1..5. A row with no champions is
  **not rendered**.
- The tier label cell shows the reference's tier badge (the local
  `optier-{0..5}.svg` icons, or the letter grade as a fallback).
- Each champion shows its portrait and the **augments it pairs with** — the
  augment icons from the augment catalogue
  (`https://opgg-static.akamaized.net/meta/images/lol/latest/augment/{key}_small.png`),
  with the augment name beneath in `.augment-name`.
- **Search filters the champions**; the reference highlights the matches
  (`.search-highlight` / `.highlighted`).
- The page must never fabricate an augment pairing: a champion with no
  `augment_group` shows its portrait and name only.

---

## 3. Game modes — agent `modes`

The existing `src/pages/modes/` page shows the ARAM balance table with no way
to change the mode. The reference's page is `/lol/modes/:mode?/:championId?`:
it takes a **mode** and a **champion**.

### What to change

Give the page a **mode selector** — the reference's own keys:

| Mode | i18n key | Value | Balance source |
| --- | --- | --- | --- |
| ARAM | `lol.common.gameMode.aram` | "ARAM" | `api/contents/aram-balance` |
| Arena | `lol.common.gameMode.arena` | "Arena" | the arena tier list |
| Nexus Blitz | `lol.common.gameMode.nexus_blitz` | "Nexus Blitz" | the arena tier list |

And make the page's **stats per mode** match the reference, which switches on
the mode:

- **ARAM**: `Win Rate` and `Pick Rate` only.
- **Arena**: `Win Rate`, `Avg. Place` (total_place / play), `1st Rate`
  (first_place / play), `Pick Rate`, `Ban Rate`, `2nd Rate` (win / play).

The reference computes:

```js
// arena / mayhem
stats = [
  ["win-rate",   (i.win / i.play * 100).toFixed(2) + "%"],
  ["Avg. Place", (i.total_place / i.play).toFixed(2)],
  ["1st Rate",   (i.first_place / i.play * 100).toFixed(2) + "%"],
  ["pick-rate",  (100 * i.pick_rate).toFixed(2) + "%"],
  ["ban-rate",   (100 * i.ban_rate).toFixed(2) + "%"],
  ["2nd Rate",   (i.win / i.play * 100).toFixed(2) + "%"],
]
// aram
stats = [
  ["win-rate",  (100 * i.win_rate).toFixed(2) + "%"],
  ["pick-rate", (100 * i.pick_rate).toFixed(2) + "%"],
]
```

Use the reference's own labels where they exist
(`lol.champions.win-rate`, `lol.champions.pick-rate`, `lol.champions.ban-rate`)
and put the two ARAM-only ones in `src/i18n/app.en.json` as
`app.avgPlace` ("Avg. Place") and `app.firstRate` ("1st Rate") and
`app.secondRate` ("2nd Rate").

The mode selection lives in the URL: `#/modes/aram`, `#/modes/arena`,
`#/modes/nexus_blitz`. The shell agent owns the router, so **report the route
ids you need** and the shell agent will wire them.

---

## 4. The shell — the orchestrator owns it

`src/app.js` and `src/styles/base.css` are the orchestrator's. The sidebar will
end up as:

```
Champions
  Champion tier     #/champions
  Combos            #/combos
  OP champions      #/op-champions
  ARAM              #/aram
  ARAM: Mayhem      #/aram-mayhem
  Game modes        #/modes
  Buff / Nerf       #/buff-nerf
Direct
  Live              #/live
  Multi-search      #/multisearch
  My info           #/my-page
```

Report your page id, title key, group and order. Do not edit `src/app.js`.

---

## 5. Definition of done

- `node tools/check-syntax.mjs .` → 0 failures
- `node tools/check-undefined.mjs src` → 0 undefined calls
- Your page renders with live data, no console error, no exception, no broken
  image, and no error state.
- No hex literals in a rule (put them in a `:root` block as custom properties).
- Never below 12px type — the reference's `.augment-name` is 11px; ship 12px
  and say so in a comment.
- Never invent data.
- Do not `git commit`.
- Do not edit `tools/verify-pages.mjs` — report your page id instead.
