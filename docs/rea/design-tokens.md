# Design tokens — measured, not guessed

Everything below was measured, not assumed:

- **Palette** — hex literals recovered by REA from the shipped styled-components
  theme in `D:\opgg_extracted\_decompressed\assets\react\*.js` (frequency-ranked),
  cross-checked against computed styles captured on the live tier-list page.
- **Geometry** — computed `getBoundingClientRect()` + `getComputedStyle()` on the
  live page (`thead th`, first `tbody tr`, tab strip).
- **Typography** — computed `font-size` / `line-height` / `font-weight` frequency
  census over 4 000 elements on the live page.

## Palette (frequency-ranked from the shipped renderer bundles)

| Hex | Hits | Role |
| --- | --- | --- |
| `#7b7a8e` | 122 | table column headers, de-emphasised labels |
| `#1c1c1f` | 70 | sunken surface, app chrome base |
| `#282830` | 64 | flat surface — table header row |
| `#31313c` | 56 | primary surface — table body rows |
| `#9e9eb1` | 41 | muted body text / secondary values |
| `#eb9c00` | 39 | gold — tier 2, emphasis |
| `#424254` | 30 | raised surface, borders |
| `#e84057` | 26 | red — tier OP, danger |
| `#5383e8` | 24 | primary blue accent |
| `#1ea1f7` | 23 | cyan accent |
| `#ffffff` | 23 | primary text |
| `#758592` | 22 | muted chrome text |
| `#e537a2` | 20 | pink accent (augment rarity) |
| `#5d5a73` | 19 | strong border |
| `#d31a45` | 19 | deep red (danger hover) |
| `#181819` | 19 | darkest surface |
| `#00ae0a` | 15 | green (win / positive delta) |
| `#006de2` | 15 | link blue |
| `#7ed321` | 12 | lime (tier 5 / positive) |
| `#08a6ff` | 12 | sky accent |
| `#2b2b30` | 11 | hover surface |
| `#515163` | 11 | divider |
| `#212125` | 10 | muted surface |
| `#ff8200` | 10 | orange (tier 1) |
| `#ff8e05` | 10 | orange variant |
| `#34d399` | 10 | emerald (positive) |
| `#00d7b0` | 8 | teal (tier 3) |
| `#98a0a7` | 8 | disabled text |
| `#f59e0b` | 8 | amber (warning) |
| `#e5e7eb` | 8 | light-theme surface |
| `#139020` | 7 | deep green |
| `#0093ff` | 7 | bright blue |
| `#721e1e` | 6 | deep danger surface |
| `#cb3535` | 6 | danger surface |
| `#4a4a54` | 6 | hairline border |
| `#3a3a44` | 6 | muted border |
| `#fde68a` | 6 | augment gold |
| `#b7b7c9` | 6 | faint text |
| `#ffd35c` | 5 | augment gold bright |
| `#cfcfe1` | 5 | faint surface |

## Live-page computed census (usage frequency)

**Backgrounds**

| Value | Count | Role |
| --- | --- | --- |
| `rgb(49,49,60)` | 473 | table row surface |
| `rgb(66,66,84)` | 30 | raised surface / border |
| `rgb(83,131,232)` | 30 | primary button fill |
| `rgb(0,187,163)` | 16 | teal chip |
| `rgba(0,0,0,0.75)` | 13 | overlay scrim |
| `rgb(40,40,48)` | 11 | table header surface |
| `rgb(235,156,0)` | 6 | gold badge |
| `rgb(103,102,120)` | 5 | disabled chip |
| `rgb(255,185,0)` | 5 | gold badge bright |
| `rgb(28,28,31)` | 4 | sunken surface |

**Text**

| Value | Count | Role |
| --- | --- | --- |
| `rgb(255,255,255)` | 2 723 | primary |
| `rgb(123,122,142)` | 334 | column headers |
| `rgb(158,158,177)` | 304 | muted values |
| `rgb(179,205,255)` | 94 | link / inactive tab |
| `rgb(235,238,241)` | 76 | high-emphasis body |
| `rgba(255,255,255,0.6)` | 26 | secondary text |
| `rgb(154,164,175)` | 22 | section label |
| `rgb(232,64,87)` | 12 | danger text |
| `rgb(83,131,232)` | 10 | accent text |

**Typography**

| Size / line / weight | Count | Use |
| --- | --- | --- |
| `14px / 20px / 400` | 2 584 | body, table rows, data cells |
| `12px / 16px / 400` | 517 | column headers, metadata |
| `16px / 16px / 400` | 326 | emphasised labels, inline icons |
| `14px / 16.1px / 400` | 166 | dense list rows |
| `16px / 24px / 400` | 103 | reading paragraph |
| `12px / 16px / 700` | 65 | uppercase micro-label |
| `15px / 24px / 400` | 14 | tab labels |
| `14px / 20px / 700` | 6 | bold body |

Font family: `Roboto, "Roboto Fallback", sans-serif, system-ui, sans-serif`.
The desktop app additionally ships **Axiforma** (Regular / Bold / Heavy) in
`D:\opgg_extracted\assets\fonts\Axiforma-*` — use it for the app chrome and
branding, Roboto for the product surface.

**Radii** — `0` (3 487), `4px` (245), `9999px` (190), `100px` (26), `6px` (25),
`12px` (7), `0 0 4px 4px` (6), `50%` (4).

**Cell padding** — `4px` (333), `4px 4px 4px 12px` (55, first cell),
`4px 12px 4px 4px` (55, last cell), `8px` (36), `8px 12px` (35), `12px` (18),
`12px 0px 9px` (16, tabs).

## Table geometry (measured)

```
thead th        height 32px   background #282830   color #7b7a8e   font 12px/16px
tbody tr td     height 41px   background #31313c   color #ffffff font 14px/20px
tbody tr td     color #9e9eb1 font 12px/16px for the numeric stat columns
th widths       rank 36px | champion 651px | tier 36px | role 36px
                win rate 67px | pick rate 67px | ban rate 67px (hidden below md)
                weak-against + counter 92px
tab button      font 15px/24px  padding 12px 0 9px  border-bottom 3px transparent
                active #ffffff   inactive #b3cdff   weight 700 when active
```

## 1:1 copy rules

- Table cells are `4px` padding; the row edge cells take `12px` on the outer side.
- Numeric columns use `font-variant-numeric: tabular-nums` (the reference class
  is `text-xs tabular-nums text-gray-600`).
- The tier column is 36px and holds a compact tier chip, not text.
- Role column holds a role icon chip, 36px.
- The counter column is a single 92px cell holding up to 3 stacked champion
  portraits with their counter win rate.
