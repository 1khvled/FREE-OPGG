# Rebuild specification — OP.GG for Desktop (LoL scope), clean-room 1:1 replica

Target: `D:\open-opgg` (git repo, branch `main`).
Reference artifact: `D:\opgg_extracted` (OP.GG for Desktop v3.1.4, extracted Electron app).
Evidence: `D:\rea` (REA 6.5.0), distilled into `docs/rea/`.

---

## 0. What "1:1" means here

The replica must match the reference **visually, structurally and behaviourally**:

| Dimension | 1:1 requirement |
| --- | --- |
| Visual | Same palette, same spacing rhythm, same typography scale, same table geometry, same component states. See `docs/rea/design-tokens.md`. |
| Structural | Same screen inventory, same screen order, same navigation model, same column sets, same data shown per column. |
| Behavioural | Same data sources (live OP.GG endpoints), same live League Client (LCU) automations, same overlay behaviour, same keyboard/pointer affordances. |
| Contract | Same IPC channel vocabulary and same context-bridge surface shape (see `shared/channels.js`). |

This is a **clean-room reconstruction**: rebuild from observed behaviour, public
API shapes and design tokens. Do not paste minified vendor code into the repo.

---

## 1. Evidence index (`docs/rea/`)

| File | What it gives you |
| --- | --- |
| `design-tokens.md` | Exact palette, typography scale, spacing, radii, table geometry — measured, not guessed. |
| `ipc-channels.md` | The 357 literal channel strings recovered from the shipped main/preload bundles. |
| `screen-inventory.md` | The reference's screen inventory and what each one shows. |
| `rea-main.distilled.md` | REA evidence for the main process: 171 handlers, 176 channels, 2 sender-validation sites, module graph. |
| `rea-preload.distilled.md` | REA evidence for the preload: 5 contextBridge APIs, 77 exposed members, the constant channel names. |

Source bundles for deeper digging (already gunzipped for you):

- `D:\opgg_extracted\_decompressed\assets\react\*.js` — renderer bundles
  (`app.17903a6b.js` = app shell, `LoL.c4a25cd8.bundle.js` = LoL pages,
  `overlay.e6ae753e.js` = in-game overlay, `stratum.ef0c5379.js` = design system).
- `D:\opgg_extracted\assets\main\main.js` — Electron main (1.9 MB, plain text).
- `D:\opgg_extracted\assets\main\preload.js` — context bridge.
- `D:\opgg_extracted\assets\i18n\locales\en.json` + `assets/i18n\v3\en\app.json` — UI strings.

---

## 2. Target architecture

```
D:\open-opgg\
├─ package.json                  # scripts: start / build / dist / verify
├─ shared\
│  └─ channels.js               # DONE — IPC contract, single source of truth
├─ main\                         # Electron main process (ES modules)
│  ├─ index.js                  # bootstrap + app lifecycle
│  ├─ windows.js                # main window + overlay window + frameless chrome
│  ├─ tray.js                   # system tray + context menu
│  ├─ protocol.js               # opgg:// custom protocol
│  ├─ updater.js                # patch / app update check
│  ├─ ipc\
│  │  ├─ index.js               # registers every channel from shared/channels.js
│  │  ├─ window.js  lcu.js  opgg.js  system.js
│  └─ services\
│     ├─ league-lockfile.js     # Riot client discovery + lockfile parsing
│     ├─ lcu-client.js          # authenticated LCU HTTPS client
│     ├─ opgg-client.js         # OP.GG API client (axios + retry + cache)
│     └─ settings-store.js      # persisted settings
├─ preload\
│  └─ index.js                  # contextBridge surface, mirrors shared/channels.js
├─ src\                         # renderer (ES modules, no bundler needed)
│  ├─ index.html
│  ├─ app.js                    # bootstrap + router
│  ├─ core\
│  │  ├─ store.js               # observable state (pub/sub) — the shared contract
│  │  ├─ api.js                 # typed wrapper over window.opgg.invoke/send
│  │  ├─ dom.js                 # tiny h()/el() helpers, no framework
│  │  └─ events.js              # bus
│  ├─ styles\
│  │  ├─ tokens.css             # DONE — design tokens
│  │  ├─ base.css               # reset + typography + scrollbars
│  │  └─ components.css         # shared component styles
│  ├─ components\               # shared UI atoms
│  ├─ pages\                    # one directory per screen
│  │  ├─ champions\  champion-detail\  live\  leaderboard\
│  │  ├─ multisearch\  my-page\  settings\
│  ├─ data\                     # static data + caches
│  └─ i18n\en.json              # UI strings
├─ overlay\                     # separate renderer for the in-game HUD
│  ├─ overlay.html  overlay.js  overlay.css
└─ docs\rea\                    # evidence (read-only)
```

### Core contract every page module must honour

```js
// src/pages/<name>/index.js
export const meta = {
  id: 'champions',            // route id
  title: 'Champions',         // nav label (i18n key)
  order: 10,                  // nav order
};

export function mount(container, ctx) {
  // ctx = { store, api, i18n, navigate, params }
  // Return an optional unmount() cleanup.
}
```

`ctx.store` is a plain observable (`getState`, `setState(patch)`, `subscribe(fn)`).
`ctx.api` exposes `invoke(channel, payload)` / `send(channel, payload)` plus typed
helpers (`api.champions()`, `api.championDetail()`, `api.lcuStatus()`, …).
`ctx.i18n.t(key, vars)` resolves strings from `src/i18n/en.json`.

**Rules**
1. A page module must not reach into another page's DOM or state directly.
2. A page module must not import from `src/main/**`.
3. All network access goes through `ctx.api` (which calls the main process).
4. All styling uses the CSS variables from `src/styles/tokens.css`. No hard-coded
   hex colours in page CSS — use the token names.

---

## 3. Screen inventory (1:1 with the reference)

| # | Screen | Route id | Source of truth |
| --- | --- | --- | --- |
| 1 | **Champions tier list** — role tabs (All/Top/Jungle/Mid/ADC/Support), tier selector, region selector, queue selector, patch selector, 8-column sortable table (Rank, Champion, Tier, Role, Win rate, Pick rate, Ban rate, Weak against + Counter) | `champions` | `ChampionsV3.47962334.bundle.js`, `LoL.c4a25cd8.bundle.js` |
| 2 | **Champion detail** — portrait, tier, win/pick/ban, runes, build, skills, counters, synergy | `champion-detail` | `ChampionStatistics.54719aad.bundle.js` |
| 3 | **Live companion** — champ-select pick/ban board, ARAM bench cards, augment advisor, my profile | `live` | `LiveChampion3.8c6f1092.bundle.js`, `LiveOPChampionsV2.3c917b01.bundle.js` |
| 4 | **Leaderboard** — ranked ladder by region/tier | `leaderboard` | `LoLHome.3dc65272.bundle.js` |
| 5 | **Multisearch** — multi-summoner search + dodge radar | `multisearch` | `Multisearch.5a65d8b2.bundle.js` |
| 6 | **My page** — profile + match history | `my-page` | `MyPage.3f0173b5.bundle.js` |
| 7 | **Settings** — theme, locale, overlay options, automations | `settings` | `MainSettings.61f2dc02.bundle.js` |
| 8 | **In-game overlay** — separate always-on-top window | `overlay` | `overlay.e6ae753e.js` |

---

## 4. Non-negotiable visual rules

1. **Palette** — only the tokens in `src/styles/tokens.css`. The reference palette
   is: app `#000000`, row `#31313c`, raised `#424254`, flat `#282830`, sunken
   `#1c1c1f`, label `#7b7a8e`, muted `#9e9eb1`, link `#b3cdff`, accent `#5383e8`.
2. **Typography** — Roboto 400/700. 14px body and table rows, 12px column headers
   and metadata only, 13px chips/buttons, 15px tabs, 16px reading text.
   Never below 12px.
3. **Table geometry** — header row 32px tall on `#282830` with `#7b7a8e` 12px
   labels; body rows 41px tall on `#31313c` with 4px cell padding; the first
   cell gets `4px 4px 4px 12px` and the last `4px 12px 4px 4px`.
4. **Tab strip** — 15px/24px, 3px transparent bottom border, active tab white,
   inactive `#b3cdff`, 12px top / 9px bottom padding.
5. **No fake data.** Every number rendered must come from a live endpoint or a
   clearly-labelled offline cache with a visible "cached" marker.

---

## 5. Data sources (live, from the reference)

Base hosts observed in the shipped main process:

- `https://lol-api-champion.op.gg` — champion tier lists, builds, runes
- `https://lol-api-summoner.op.gg` — summoner profiles, match history
- `https://desktop-api.op.gg` — desktop-specific services
- `https://desktop-app-data.op.gg` — app data, offsets, runtime assets
- `https://desktop-patch.op.gg/update/` — update manifest
- `https://ddragon.leagueoflegends.com` — Data Dragon (champions, items, runes)
- `https://stats-platform-api.op.gg/graphql` — GraphQL stats

Endpoint catalogue with the exact paths the reference uses:
`docs/rea/endpoints.md`.

---

## 6. LCU (League Client Update) integration

Reconstructed from the reference main process:

1. Discover the Riot client: `%LOCALAPPDATA%\Riot Games\RiotClientInstalls.json`
   → `LeagueClientUx.exe` directory → `<dir>\lockfile`.
2. Parse `processName:pid:port:token:protocol`.
3. Call `https://127.0.0.1:<port><path>` with `Authorization: Basic base64("riot:" + token)`
   and `rejectUnauthorized: false` (Riot uses a self-signed cert).
4. Automations:
   - **Auto-accept** — `GET /lol-matchmaking/v1/ready-check` → `POST .../accept`
   - **Auto-runes** — on champ lock, read `/lol-perks/v1/pages`, write the
     recommended rune page
   - **Auto-build** — write `/lol-item-sets/v1/item-sets/{summonerId}/sets` with
     `priority: true` so the build shows in the in-game shop
   - **Auto-spells** — write `/lol-champ-select/v1/session` spells
   - **Bench swap** — `POST /lol-champ-select/v1/session/bench/swap/{championId}`

---

## 7. Definition of done (per agent)

- Code lives only in the directories you own.
- No `console.log` left behind; use the `app:log` channel in debug builds only.
- No hard-coded hex colours, no text below 12px.
- The module is importable and `mount()` returns cleanly; no global leakage.
- `node --check` passes on every file you wrote.
- You did not modify `shared/channels.js`, `src/styles/tokens.css`, or another
  agent's directory.
