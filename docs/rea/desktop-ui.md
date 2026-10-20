# Desktop app ground truth — OP.GG for Desktop v3.1.4

**This is the authoritative 1:1 spec.** The earlier `design-tokens.md` was
measured from the *web* app (`op.gg/lol/champions`). The **desktop** app has its
own layout, and it differs. Everything below was captured by running the
shipped renderer bundle (`D:\opgg_extracted\assets\react`) in a browser with
the preload bridge stubbed (`tools/bridge-stub.js`), then reading the live DOM
and computed styles.

Reproduce it with:

```bash
node tools/serve-renderer.mjs --root D:/opgg_extracted/assets/react \
     --port 8899 --prefix /react --inject D:/open-opgg/tools/bridge-stub.js
# then open http://127.0.0.1:8899/react/index.html
```

---

## 1. Shell

```
header#app-header-win.app-header     h 65px, bg #1c1c1f, padding 0 16px, flex
  img  icon-opggsquare.svg            32px
  img  img-sidebar-lol.svg            24px, margin-left 18px, margin-right 4px
  div  "League of Legends"

div.main                               margin 64px 0 0, flex, bg #1c1c1f
  div.side                             w 174px, padding 18px 10px 12px, flex column, font 12px
  div.main-container                   w 1068px, padding 20px, flex, gap 16px
```

`body` — background `#000000`, colour `#ffffff`, font **Roboto 16px**.
`#app-header-win` — background `#1c1c1f` (`rgba(28,28,31,1)`), height 65px,
padding `0 16px`, font-size 12px.

### Brand purple — `#5f32e6`

This is the desktop app's **primary accent** and it is not in the web
palette. It colours:

- the active sidebar item (`.side-href-item-active .item` background),
- the active role tab (`.recommendation-tab-active` background),
- the entry-loader button (`.entry-loading-action`),
- the entry-loader spinner stroke.

Add it to the token set as `--brand: #5f32e6`.

---

## 2. Sidebar — `.side`

Width **174px**, padding `18px 10px 12px`, flex column, font-size 12px.

```
div.side
  div                        "Champions"     section title
  a.side-href-item.side-href-item-active[href="#/OP.GG/"]
    div.item                 "Tiers"
  a.side-href-item[href="#/OP.GG/combos"]
    div.item                 "Combos"
  a.side-href-item[href="#/OP.GG/op-champions"]
    div.item                 "OP Champions"
  div.side-contour                          1px divider
  div                        "Direct"        section title
  div.item.side-href-item                   "OP.GG Pick"
  div.item.side-href-item                   "Multi-recherche"
  div.item.side-href-item                   (one more)
  ul
    li.side-menu-item        img icon-discord.svg
  div                        "20260914 0836"   build stamp
```

**Section title** — `font-weight: bold; margin-bottom: 8px; font-size: 12px;`

**Item** — `display:flex; align-items:center; width:156px; height:34px;
border-radius:4px; padding:10px 14px;`
Active item background `#5f32e6`, colour `#ffffff`.
Inactive item colour `#7b7a8e` (the `Direct` group renders at `rgb(123,122,142)`).

**Item title** — `span.side-href-item-title { display:flex; align-items:center;
gap:10px }` with a leading 18–20px SVG icon.

**Divider** — `.side-contour { height:1px; background:#424254; margin:18px 0; }`

---

## 3. Champions screen — `.main-container.champion-statistics`

```
div.main-container.champion-statistics
  div.statistics-tabs                h 36px, flex, margin 20px auto 0
    div                              role tab group
      div.recommendation-tab.recommendation-tab-active
        img  icon-position-TOP-wh.svg
        span.recommendation-tab-title.recommendation-tab-title-active   "Top"
      div.recommendation-tab         JUNGLE / MID / ADC / SUPPORT
    div.dropdown-container           region
      div > button.dropdown-toggle.has-icon
        img  01-icon-icon-global.svg
        span "GLOBAL"
        img.down-arrow  icon-down.svg
    div.dropdown-container           tier
      div > button.dropdown-toggle
        span "Platinum +"
        img.down-arrow  icon-down.svg
    div.dropdown-container           patch
      div > button.dropdown-toggle
        span "16.20"
        img.down-arrow  icon-down.svg
  div.champion-statistics-bottom     flex row
    div.champion-statistics-search   w 356px, padding 12px 0 0
      div.champion-statistics-search-top
        input.champion-statistics-search-bar
        img  icon-search.svg
      div.champion-statistics-search-bottom
        a > div.item-champion
             div.champion-statistics-champion-img-wrapper > img  (46px)
             div.item-champion-name
    div.champion-statistics-table-wrapper
      div.champion-statistics-table
        div.champion-statistics-table-header
        div.champion-statistics-table-body
```

### Role tabs

- `.recommendation-tab` — `display:flex; padding:10px 16px; height:36px;
  border-radius:4px 0 0 4px; font-size:12px;`
- **active** background `#5f32e6`, colour `#ffffff`; inactive is transparent
  with the muted label colour.
- `.recommendation-tab-title` — 12px, `margin: 0 6px 0 0`.
- Icons: `icon-position-TOP-wh.svg`, `icon-position-JUNGLE.png`,
  `icon-position-MID.png`, `icon-position-ADC.png`, `icon-position-SUPPORT.png`.
- There is **no "All" tab** — the desktop app is role-scoped.

### Dropdowns

- `.dropdown-container { margin-left: 12px }`
- `.dropdown-toggle { display:flex; height:36px; border-radius:4px;
  padding-left:12px; font-size:12px; }`
- `.dropdown-toggle span { margin-left: 8px }`
- The region dropdown carries a leading flag/global icon and the class
  `has-icon`; the tier and patch dropdowns do not.
- Every dropdown ends with `img.down-arrow` (`icon-down.svg`).

### Champion portrait grid (the "search" panel)

- `.champion-statistics-search` — width 356px, `padding: 12px 0 0`.
- `.champion-statistics-search-bar` — width 332px, height 40px,
  background `#2b2b30`, `border-radius: 4px`, `padding: 1px 30px 1px 2px`,
  with `img icon-search.svg` on the right.
- `.champion-statistics-search-bottom` — `padding: 12px 12px 4px 10px`,
  wrapping flex row of portraits.
- `.item-champion` — 46×59px, `margin: 4px`, colour `#9e9eb1`.
- `.item-champion-name` — the reference uses **11px** here. The house rule
  floors metadata at 12px, so the replica ships 12px (a deliberate,
  documented divergence).
- Portrait URL: `https://opgg-static.akamaized.net/images/champions/{Square}.png?image=c_scale,q_auto,w_46`

### Statistics table — **a div grid, not a `<table>`**

`.champion-statistics-table` — width 672px, `border-radius: 12px`, colour
`#7b7a8e`, font-size 12px, flex column.

Header: `.champion-statistics-table-header` — height 32px,
`padding: 0 12px`, flex row.

**Seven columns** (note: the desktop app has **no** "Weak against" column —
that is a web-only column):

| # | Class | Header | Width | Extra |
| --- | --- | --- | --- | --- |
| 1 | `champion-statistics-table-column__1` | `#` | 18px | `margin-right: 4px` |
| 2 | `champion-statistics-table-column__2` | *(role icon)* | 32px | |
| 3 | `champion-statistics-table-column__3` | `Champion` | 219px | |
| 4 | `champion-statistics-table-column__4` | `Tier` | 48px | `margin-right: 8px` |
| 5 | `champion-statistics-table-column__5` | `Win Rate` | 94px | `margin-right: 8px` |
| 5 | `champion-statistics-table-column__5` | `Pick Rate` | 94px | `margin-right: 8px` |
| 5 | `champion-statistics-table-column__5` | `Ban Rate` | 94px | `margin-right: 8px` |

Row: `.champion-statistics-table-row` — height **40px**, `padding-left: 12px`,
flex row, colour `#ffffff`.

Each row is wrapped in `<a draggable="false" href="#/OP.GG/champions/{Name}">`.

Champion cell: `div.champion-img-32` — 32×32px, `border-radius: 4px`,
`margin-right: 8px`, containing the champion portrait.

---

## 4. Entry loader (what the user sees at start-up)

From the shipped `assets/react/index.html`:

- `.entry-loading-logo` — 120×120px, `border-radius: 24px`,
  `background: #282830`, `animation: pulse 2s infinite`.
- `.entry-loading-title` — `font-size: 24px; font-weight: 700; line-height: 29px`.
- `.entry-loading-message` — `font-size: 18px; line-height: 22px; color: #9e9eb1`.
- `.entry-loading-action` — `background-color: #5f32e6; border-radius: 8px;
  padding: 8px 12px; font-size: 20px;`
- `.spinner .path` — `stroke: #5F32E6`, 36×36px, 2s rotate + 1.5s dash.
- The brand mark is an inline SVG in `#424254`.

---

## 5. Corrected token table

| Token | Value | Where |
| --- | --- | --- |
| `--bg-app` | `#000000` | body |
| `--bg-surface` | `#1c1c1f` | app header, `.main` |
| `--bg-surface-flat` | `#282830` | entry logo, table header rows (web) |
| `--bg-surface-raised` | `#424254` | divider, brand mark |
| `--bg-surface-hover` | `#2b2b30` | search input |
| `--bg-surface` (rows) | `#31313c` | web table rows |
| `--text-primary` | `#ffffff` | |
| `--text-label` | `#7b7a8e` | table header, inactive sidebar |
| `--text-muted` | `#9e9eb1` | champion name in the grid |
| `--brand` | `#5f32e6` | active tab, active sidebar item, loader button |
| `--tier-*` | `#e84057 #ff8200 #eb9c00 #00bba3 #5383e8 #9e9eb1` | tier chips |

---

## 6. What this changes versus the web app

| Aspect | Web app | **Desktop app (correct)** |
| --- | --- | --- |
| Navigation | top tab bar | **320/174px left sidebar** with sections |
| Table | `<table>` with `<thead>/<tbody>` | **div grid**, 7 columns, 40px rows |
| Columns | #, Champion, Tier, Role, Win, Pick, Ban, Weak against | **#, (role icon), Champion, Tier, Win, Pick, Ban** |
| Role tabs | includes "All" | **Top / Jungle / Mid / ADC / Support only** |
| Filters | tier, region, queue, patch | **region, tier, patch** (3 dropdowns) |
| Extra panel | — | **champion portrait grid** beside the table |
| Accent | `#5383e8` blue | **`#5f32e6` purple** for active states |
