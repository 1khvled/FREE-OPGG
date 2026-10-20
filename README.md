<div align="center">

# OP.GG for Desktop — Clean-Room Open-Source Replica

### A 1:1 reconstruction of OP.GG for Desktop, rebuilt with REA evidence

[![Electron](https://img.shields.io/badge/Electron-33.4.11-47848F.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![League of Legends](https://img.shields.io/badge/League_of_Legends-Patch_16.20-C89B3C.svg?style=for-the-badge&logo=league-of-legends)](https://www.leagueoflegends.com/)
[![Ads](https://img.shields.io/badge/Ads-0%25-red.svg?style=for-the-badge)](#)
[![Telemetry](https://img.shields.io/badge/Telemetry-0%25-red.svg?style=for-the-badge)](#)

<p align="center">
  <b>An open-source, ad-free, telemetry-free desktop companion for League of Legends</b><br/>
  Rebuilt from the ground up against evidence recovered from the shipped application
  with <b>REA (Reverse Engineer Anything)</b>.
</p>

</div>

---

## What changed in v2

v1 was a hand-written approximation. **v2 is a measured reconstruction.**

Every design decision in v2 is backed by evidence extracted from the shipped
OP.GG for Desktop v3.1.4 bundle using [REA](https://github.com/morluto/rea):

| Fact | How it was established | Where it lives |
| --- | --- | --- |
| 176 literal IPC channels, 171 main handlers | `rea analyze-javascript-application` on the shipped `main.js` + `preload.js` | `docs/rea/rea-main.distilled.md` |
| 5 contextBridge APIs, 77 exposed members | same analysis, preload scope | `docs/rea/rea-preload.distilled.md` |
| 357 channel literals, named | alias-resolved literal extraction | `docs/rea/ipc-channels.md` |
| 4094 exact UI strings | the shipped i18n bundle, flattened | `docs/rea/i18n.en.json` |
| Palette, typography scale, table geometry | REA theme literals + computed-style capture of the live tier list | `docs/rea/design-tokens.md` |
| Screen inventory and window topology | chunk manifest + `webPreferences` in the shipped main process | `docs/rea/screen-inventory.md` |
| Live API catalogue | host + path extraction from the shipped bundles | `docs/rea/endpoints.md` |

---

## Architecture

```
open-opgg/
├─ main/                 Electron main process (CommonJS)
│  ├─ index.js           bootstrap, lifecycle, opgg:// protocol
│  ├─ windows.js         main window + frameless transparent overlay window
│  ├─ tray.js            system tray
│  ├─ updater.js         patch / app update check
│  ├─ ipc/               one module per channel group
│  └─ services/          league-lockfile, lcu-client, opgg-client
├─ preload/index.js      contextBridge: invoke / send / on / channels
├─ shared/channels.js    the single IPC contract (required by main + preload)
├─ src/                  renderer (ES modules, no bundler)
│  ├─ app.js             route table, navigation, page lifecycle
│  ├─ core/              store, api, dom, i18n, events
│  ├─ components/        shared UI atoms
│  ├─ pages/             one directory per screen
│  ├─ data/              static data, caches, normalisers
│  ├─ styles/            tokens.css → base.css → components.css
│  └─ i18n/en.json       4094 reference strings
├─ overlay/              separate renderer for the in-game HUD
└─ docs/rea/             the evidence bundle
```

**One contract, one source of truth.** `shared/channels.js` is CommonJS so the
main process and the preload can both `require` it, and the preload re-exposes
it to the renderer as `window.opgg.channels`. There is no second copy.

---

## Screens

| Screen | What it does |
| --- | --- |
| **Champions** | Role tabs, tier/region/queue/patch filters, 8-column sortable tier list, champion detail modal |
| **Live** | Champion-select board, ARAM bench cards, augment advisor, my profile, one-click rune/build/spell application |
| **Leaderboard** | Ranked ladder by region and tier |
| **Multisearch** | Multi-summoner search |
| **My page** | Profile, most-played champions, match history |
| **Settings** | Theme, language, League Client automations, overlay options |
| **Overlay** | Frameless always-on-top in-game HUD: champion card, runes, build, skills, spell cooldowns, bench, objective timers |

---

## League Client integration

The main process talks to the local Riot client directly:

1. Find the client via `%LOCALAPPDATA%\Riot Games\RiotClientInstalls.json` →
   `LeagueClientUx.exe` → `lockfile`.
2. Parse `processName:pid:port:token:protocol`.
3. Call `https://127.0.0.1:<port><path>` with `Authorization: Basic base64("riot:" + token)`.

Automations: **auto-accept** (ready check), **auto-runes** (write the
recommended rune page on champion lock), **auto-build** (write an item set with
`priority: true` so it appears in the in-game shop) and **auto-spells**.

---

## Deliberate divergences from the shipped app

The replica is a clean-room build. Three things are intentionally different:

1. **No telemetry.** The shipped app embeds Google Analytics, Google Tag
   Manager, Rybbit and Sentry. The replica ships none of them.
2. **No ads.** The shipped app loads promotional iframes. The replica does not.
3. **League of Legends only.** The shipped bundle contains TFT, Valorant,
   Palworld, MapleStory, Diablo 4, TwoXKO and more — roughly 1.4 MB of the
   renderer. The replica omits all of it.

---

## Development

```bash
npm install       # dependencies
npm start         # run the app
npm run check     # syntax-check every source file
npm run dist      # build a Windows installer
```

Requires Node.js 22.19+ / 24.11+ and a League of Legends client for the
League Client features (everything else works without it).

---

## Evidence tooling

`tools/` holds the scripts used to mine the reference bundle. They are part of
the project because the evidence must be reproducible:

| Tool | Purpose |
| --- | --- |
| `tools/rea-distill.mjs` | Condense a REA analysis JSON into agent-readable evidence |
| `tools/rea-decompress.mjs` | Gunzip the shipped renderer bundles (they are stored compressed) |
| `tools/rea-ipc-channels.mjs` | Recover the literal channel vocabulary |
| `tools/rea-i18n.mjs` | Flatten and search the shipped i18n bundle |
| `tools/rea-web-capture.mjs` | Extract DOM/screenshot artifacts from a REA browser capture |
| `tools/check-syntax.mjs` | Project-wide syntax check |

---

## License

MIT — see [LICENSE](LICENSE). This project is not affiliated with, endorsed by,
or connected to OP.GG or Riot Games.
