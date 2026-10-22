<div align="center">

# OP.GG for Desktop — Clean-Room Open-Source Replica

### A 1:1 reconstruction of OP.GG for Desktop, rebuilt from measured evidence

[![Electron](https://img.shields.io/badge/Electron-33.4.11-47848F.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![League of Legends](https://img.shields.io/badge/League_of_Legends-Patch_16.20-C89B3C.svg?style=for-the-badge&logo=league-of-legends)](https://www.leagueoflegends.com/)
[![Ads](https://img.shields.io/badge/Ads-0%25-red.svg?style=for-the-badge)](#)
[![Telemetry](https://img.shields.io/badge/Telemetry-0%25-red.svg?style=for-the-badge)](#)

<p align="center">
  <b>An open-source, ad-free, telemetry-free desktop companion for League of Legends</b><br/>
  Rebuilt from the ground up against evidence recovered with
  <b>REA (Reverse Engineer Anything)</b> from the shipped application.
</p>

</div>

---

## What this is

v1 of this project was a hand-written approximation of op.gg. **v2 is a
measurement.** Every design decision is backed by a fact extracted from the
shipped OP.GG for Desktop v3.1.4 bundle, and every fact is reproducible with
the tooling in `tools/`.

| Fact | How it was established | Where it lives |
| --- | --- | --- |
| 176 literal IPC channels, 171 main handlers | `rea analyze_javascript_application` over the shipped `main.js` + `preload.js` | `docs/rea/rea-main.distilled.md` |
| 5 contextBridge APIs, 77 exposed members | same analysis, preload scope | `docs/rea/rea-preload.distilled.md` |
| 357 channel names | alias-resolved literal extraction | `docs/rea/ipc-channels.md` |
| 4094 exact UI strings | the shipped i18n bundle, flattened | `docs/rea/i18n.en.json` |
| 108 routes (26 League of Legends) | the shipped React router | `tools/rea-router.mjs` |
| Palette, typography, table geometry | REA theme literals + computed-style capture | `docs/rea/design-tokens.md` |
| The desktop shell's real layout | the shipped renderer served locally and read live | `docs/rea/desktop-ui.md` |
| Live API catalogue | host/path extraction from the shipped bundles | `docs/rea/endpoints.md` |
| Live response shapes | fetched from the running API while building | `docs/rea/api-shapes.md` |

### How the reference was observed

The shipped renderer is gzip-compressed and expects to be served one directory
below its bundles. `tools/serve-renderer.mjs` does exactly that, with
`tools/bridge-stub.js` standing in for the preload bridge, so the reference UI
could be read live:

```bash
node tools/serve-renderer.mjs --root D:/opgg_extracted/assets/react \
     --port 8899 --prefix /react --inject tools/bridge-stub.js
# → http://127.0.0.1:8899/react/index.html
```

The extracted app itself also runs: `D:\opgg_extracted\_probe_main.js` supplies
the Overwolf SDK surface the shipped main process expects, and
`tools/cdp.mjs` then drives it over the Chrome DevTools Protocol.

---

## Screens

| Screen | What it does |
| --- | --- |
| **Champion tier** | Role tabs, tier/region/queue/patch filters, 7-column sortable div-grid table, champion detail modal |
| **Combos** | A champion's skill history across patches |
| **OP champions** | The tier-0 list — the top of every lane |
| **ARAM** | The ARAM tier list with the ARAM balance tag |
| **ARAM: Mayhem** | The augment-swarm tier table |
| **Game modes** | Per-mode champion balance: ARAM, Arena, Nexus Blitz |
| **Buff / Nerf** | The latest patch's champion changes, buffs and nerfs side by side |
| **Live** | Champion-select board, ARAM bench cards, augment advisor, my profile, one-click rune/build/spell application |
| **Leaderboard** | Ranked ladder by region and tier |
| **Multi-search** | Multi-summoner search |
| **My info** | Profile, most-played champions, match history |
| **Settings** | Theme, language (12 locales), League Client automations, overlay options |

Plus the **in-game overlay** — a frameless, transparent, always-on-top HUD
with the champion card, runes, build, skills, spell cooldowns, ARAM bench,
augment advisor and objective timers.

### The champion detail

Portrait, tier, win/pick/ban, matches and KDA · the recommended rune tree with
perk tooltips · starter / core / boots / recommended builds · support item ·
summoner spells · skill builds · strong and weak against · a 1v1 matchup
analyser · lane tips · combo videos — and **Export Rune Build**, which writes
the recommended rune page into the League Client.

---

## Architecture

```
open-opgg/
├─ main/                 Electron main process (CommonJS)
│  ├─ index.js           bootstrap, lifecycle, opgg:// protocol
│  ├─ windows.js         main window + frameless transparent overlay
│  ├─ tray.js            system tray
│  ├─ updater.js         patch / app update check
│  ├─ ipc/               one module per channel group
│  └─ services/          league-lockfile, lcu-client, opgg-client
├─ preload/index.js      contextBridge: invoke / send / on / channels
├─ shared/channels.js    THE IPC contract (required by main + preload)
├─ src/                  renderer (ES modules, no bundler)
│  ├─ app.js             route table, sidebar, page lifecycle
│  ├─ core/              store, api, dom, i18n, events
│  ├─ components/        shared UI atoms
│  ├─ pages/             one directory per screen
│  ├─ data/              static data, caches, normalisers
│  ├─ styles/            fonts → tokens → base → components
│  └─ i18n/              en.json (4094 reference keys) + 11 locales
├─ overlay/              separate renderer for the in-game HUD
├─ docs/rea/             the evidence bundle
└─ tools/                the evidence and verification tooling
```

### One contract, one source of truth

`shared/channels.js` is CommonJS so the main process and the preload can both
`require` it, and the preload re-exposes it to the renderer as
`window.opgg.channels`. The renderer cannot reach an unlisted channel, and
there is no second copy of the vocabulary anywhere.

### The renderer never performs privileged I/O

Every network call, file read and League Client interaction crosses the
bridge into the main process. `main/ipc/index.js` validates the sender frame
of every privileged handler.

---

## Design system

All colour, spacing, radius and type values live in `src/styles/tokens.css`
as CSS custom properties. **No page CSS may contain a hex literal.**

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#000000` | body |
| `--bg-surface-sunken` | `#1c1c1f` | app header, main area |
| `--bg-surface-flat` | `#282830` | table header rows, input fills |
| `--bg-surface` | `#31313c` | table rows |
| `--bg-surface-raised` | `#424254` | dividers |
| `--text-primary` | `#ffffff` | |
| `--text-label` | `#7b7a8e` | column headers, inactive nav |
| `--text-muted` | `#9e9eb1` | secondary values |
| `--brand` | `#5f32e6` | **active nav item, active tab, loader button** |
| `--tier-op` … `--tier-5` | `#e84057 #ff8200 #eb9c00 #00bba3 #5383e8 #9e9eb1` | tier chips |
| `--font-display` | Axiforma | app chrome |
| `--font-sans` | Roboto | product surface |

Shell geometry: header 65px, sidebar 174px, sidebar item 156×34 with a 4px
radius, table header 32px, table rows 40px, panel radius 12px.

Type sizes: **12px** for column headers, labels and metadata; 13px for chips
and buttons; 14px for body and data cells; 15px for tabs; 16px for reading
text. Never below 12px.

---

## League Client integration

The main process talks to the local Riot client directly:

1. Find the client via `%LOCALAPPDATA%\Riot Games\RiotClientInstalls.json`
   → `LeagueClientUx.exe` → `lockfile`.
2. Parse `processName:pid:port:token:protocol`.
3. Call `https://127.0.0.1:<port><path>` with
   `Authorization: Basic base64("riot:" + token)`.

| Automation | League Client endpoints |
| --- | --- |
| Auto-accept | `GET /lol-matchmaking/v1/ready-check` → `POST …/accept` |
| Auto-runes | on champion lock, write the recommended page to `/lol-perks/v1/pages` |
| Auto-build | `POST /lol-item-sets/v1/item-sets/{summonerId}/sets` with `priority: true` |
| Auto-spells | `PATCH /lol-champ-select/v1/session/my-selection` |
| Bench swap | `POST /lol-champ-select/v1/session/bench/swap/{championId}` |

Polling is deliberately slow (≈1 Hz) and stops entirely when the client is not
running. `node tools/probe_lcu.js` checks reachability without Electron.

---

## Deliberate divergences

1. **No telemetry.** The shipped app embeds Google Analytics, Google Tag
   Manager, Rybbit and Sentry. This one ships none of them.
2. **No ads.** The shipped app renders promotional iframes.
3. **League of Legends only.** TFT, Valorant, Palworld, MapleStory, Diablo 4
   and the rest are omitted — about 1.4 MB of the shipped renderer.
4. **The updater never downloads.** It reports whether a newer build exists
   and stops there.

---

## Building and running

```bash
npm install          # see the note below
npm start            # run the app
npm run check        # syntax + undefined-identifier check
npm test             # contract tests
npm run verify       # drive the real app and screenshot every screen
npm run dist         # Windows installer
npm run dist:portable
```

> **npm 11 blocks install scripts**, so Electron's `postinstall` — which
> fetches the binary — never runs. If `npm install` leaves you without an
> Electron binary, run `node node_modules/electron/install.js` once, or set
> `ELECTRON_MIRROR` to a mirror you trust.

Build outputs land in `dist/`:

```
OP.GG Desktop OpenSource 2.0.0.exe   portable, single file
OP.GG-Desktop-Setup-2.0.0.exe        NSIS installer
win-unpacked/OP.GG Desktop OpenSource.exe
```

The build is unsigned, so SmartScreen warns on first launch — **More info →
Run anyway**. A code-signing certificate in `package.json` clears that.

---

## Verification

```bash
npm run check      # 146 files, 0 syntax errors, 0 undefined calls
npm test           # 22 contract tests
npm run verify     # 10 screens, 0 console errors, 0 broken images
```

`tools/verify-pages.mjs` launches the app, walks every screen, screenshots it
and fails on a console error, an uncaught exception, a broken image **or a
page that renders its own error state**. `--attach <port>` points it at an
already-running build, so the packaged executable is verified exactly like the
source tree.

| Tool | Purpose |
| --- | --- |
| `tools/check-syntax.mjs` | Project-wide syntax check |
| `tools/check-undefined.mjs` | Find identifiers that are called but never defined |
| `tools/test-core.mjs` | Contract tests for the core modules |
| `tools/test-overlay-tier.mjs` | Assert the overlay's tier-grade mapping |
| `tools/verify-pages.mjs` | Walk every screen, screenshot it, assert a clean console |
| `tools/verify-interactions.mjs` | Exercise the champion modal and the overlay window |
| `tools/verify-overlay.mjs` | Render the overlay's ARAM panels with mock data |
| `tools/verify-detail-panels.mjs` | List the panels the champion detail rendered |
| `tools/verify-images.mjs` | Report every image that failed to load |
| `tools/probe-ipc.mjs` | Call an IPC handler inside the running app |
| `tools/probe_lcu.js` | Check whether the League Client is reachable |
| `tools/rea-routes.mjs` | Dump the reference's route table |
| `tools/rea-router.mjs` | Dump the reference's React router |
| `tools/rea-i18n-keys.mjs` | List the i18n keys a shipped bundle references |
| `tools/rea-bundle-copy.mjs` | Resolve a bundle's i18n keys to their English values |
| `tools/rea-grep.mjs` | Search the shipped bundles, gunzipping them |

---

## License

MIT — see [LICENSE](LICENSE). This project is not affiliated with, endorsed by,
or connected to OP.GG or Riot Games.
