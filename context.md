# OP.GG for Desktop — Clean-Room Replica: Context & Architecture

> v2 — rebuilt from evidence recovered with REA.
> Spec: `docs/SPEC.md` · Evidence: `docs/rea/README.md` · Ground truth: `docs/rea/desktop-ui.md`

---

## 1. What this project is

A clean-room, ad-free, telemetry-free desktop replica of **OP.GG for Desktop
v3.1.4**, scoped to League of Legends.

It is **not** a copy of the shipped code. It is a reconstruction from
observable behaviour, public API shapes, and design tokens — the same method
[REA](https://github.com/morluto/rea) exists to support.

Three deliberate divergences from the shipped app:

1. **No telemetry.** The shipped app embeds Google Analytics, Google Tag
   Manager, Rybbit and Sentry. This one ships none of them.
2. **No ads.** The shipped app renders promotional iframes (`#side-ads`).
3. **League of Legends only.** The shipped renderer ships TFT, Valorant,
   Palworld, MapleStory, Diablo 4, TwoXKO and more — about 1.4 MB of dead
   weight. None of it is here.

---

## 2. Directory layout

```
D:\open-opgg\
├─ main\                    Electron main process (CommonJS)
│  ├─ index.js              bootstrap, lifecycle, opgg:// protocol
│  ├─ windows.js            main window + frameless transparent overlay
│  ├─ tray.js               system tray
│  ├─ protocol.js           opgg:// custom scheme
│  ├─ updater.js            patch / app update check
│  ├─ settings-store.js     atomic JSON persistence
│  ├─ ipc\                  one module per channel group
│  └─ services\
│     ├─ league-lockfile.js Riot client discovery + lockfile parsing
│     ├─ lcu-client.js      authenticated LCU HTTPS client
│     └─ opgg-client.js     OP.GG API client (cache, retry, normalisation)
├─ preload\index.js         contextBridge: invoke / send / on / channels
├─ shared\channels.js       THE IPC contract (CommonJS, required by main+preload)
├─ src\                     renderer (ES modules, no bundler)
│  ├─ index.html            shell markup
│  ├─ app.js                route table, sidebar, page lifecycle
│  ├─ core\                 store / api / dom / i18n / events
│  ├─ components\           shared UI atoms
│  ├─ pages\                one directory per screen
│  ├─ data\                 static data, caches, normalisers
│  ├─ styles\               tokens.css -> base.css -> components.css
│  └─ i18n\                 en.json (reference catalogue) + app.en.json
├─ overlay\                 separate renderer for the in-game HUD
├─ docs\                    SPEC.md, AGENT_BRIEF.md, rea\ (evidence bundle)
└─ tools\                   the evidence + verification tooling
```

---

## 3. The one contract

`shared/channels.js` is CommonJS so the main process and the preload can both
`require` it. The preload re-exposes it to the renderer:

```js
window.opgg = {
  invoke(channel, payload),   // -> Promise
  send(channel, payload),      // -> void
  on(channel, handler),        // -> unsubscribe
  channels,                    // the contract object
};
```

`invoke` and `send` reject any channel that is not in the contract, so a
renderer bug can never reach an arbitrary main-process handler.

**The renderer never performs privileged I/O.** Every network call, file read
and League Client interaction crosses the bridge into the main process.

---

## 4. Page contract

```js
// src/pages/<name>/index.js
export const meta = { id: 'champions', title: 'common.sidebar.tier', order: 10, group: 'champions' };
export function mount(container, ctx) {
  // ctx = { store, api, i18n: { t }, bus, navigate, params, helpers }
  return () => { /* optional cleanup */ };
}
```

The shell (`src/app.js`) owns the header and the sidebar; pages own only their
content region.

---

## 5. Design system

All colour, spacing, radius and type values live in `src/styles/tokens.css`
as CSS custom properties. **No page CSS may contain a hex literal.**

The palette was measured, not guessed — see `docs/rea/design-tokens.md` and
`docs/rea/desktop-ui.md`. The headline values:

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#000000` | body |
| `--bg-surface-sunken` | `#1c1c1f` | app header, main area |
| `--bg-surface-flat` | `#282830` | table header rows, logo plate |
| `--bg-surface` | `#31313c` | table rows |
| `--bg-surface-raised` | `#424254` | dividers |
| `--bg-surface-hover` | `#2b2b30` | inputs, hover |
| `--text-primary` | `#ffffff` | |
| `--text-label` | `#7b7a8e` | column headers, inactive nav |
| `--text-muted` | `#9e9eb1` | secondary values |
| `--brand` | `#5f32e6` | **active nav item, active tab, loader button** |
| `--tier-op` … `--tier-5` | `#e84057 #ff8200 #eb9c00 #00bba3 #5383e8 #9e9eb1` | tier chips |

Typography floor: **12px** for column headers, labels and metadata; 13px for
chips and buttons; 14px for body and data cells; 15px for tabs; 16px for
reading text. The reference renders champion names in the portrait grid at
11px; the replica deliberately ships 12px instead.

Shell geometry (measured): header 65px, sidebar 174px, sidebar item 156×34
with 4px radius and 10px/14px padding, table rows 40px, table header 32px,
table radius 12px.

---

## 6. Data

### Live endpoints (all verified against the running API)

| Host | Purpose |
| --- | --- |
| `https://lol-api-champion.op.gg` | tier lists, builds, runes, counters, augments |
| `https://lol-api-summoner.op.gg` | summoner profiles, match history |
| `https://desktop-api.op.gg` | desktop services |
| `https://ddragon.leagueoflegends.com` | Data Dragon |
| `https://opgg-static.akamaized.net` | champion images |

The ranked tier list returns:

```json
{ "data": [ { "id": 86, "average_stats": { "win_rate": 0.504777, "tier": 3, ... },
              "positions": [ { "name": "TOP", "stats": { ... },
                               "counters": [ { "champion_id": 11, "play": 357, "win": 157 } ] } ] } ],
  "meta": { "version": "16.20", "analyzed_at": "..." } }
```

Rules that follow from it:

- `tier` is a number 1..5 (`0` = OP). Labels are `OP`, `Tier 1` … `Tier 5`.
- Every rate is a 0..1 ratio.
- Rank change = `tier_data.rank_prev` − `tier_data.rank` (positive = moved up).
- `counters` carry only `{ champion_id, play, win }`; the counter's win rate is
  `win / play` and the name must be resolved from the champion id.
- `positions` only lists the lanes a champion is actually played in; for an
  off-meta lane the reference falls back to `average_stats` rather than
  hiding the champion.

`src/data/normalize.js` implements all of this defensively — the renderer
normalises even though the main process already normalises, because the
endpoints change shape between patches.

---

## 7. League Client (LCU) integration

1. Discover the client: `%LOCALAPPDATA%\Riot Games\RiotClientInstalls.json`
   → `LeagueClientUx.exe` → `<dir>\lockfile`.
2. Parse `processName:pid:port:token:protocol`.
3. `https://127.0.0.1:<port><path>` with
   `Authorization: Basic base64("riot:" + token)` and
   `rejectUnauthorized: false`.

Automations:

| Automation | League Client endpoints |
| --- | --- |
| Auto-accept | `GET /lol-matchmaking/v1/ready-check` → `POST .../accept` |
| Auto-runes | read `/lol-perks/v1/pages`, write the recommended page on champion lock |
| Auto-build | write `/lol-item-sets/v1/item-sets/{summonerId}/sets` with `priority: true` |
| Auto-spells | write the champion-select session spells |
| Bench swap | `POST /lol-champ-select/v1/session/bench/swap/{championId}` |

Polling is deliberately slow (≈1 Hz) and stops entirely when the client is not
running, because the shipped app's biggest complaint is CPU use.

---

## 8. Overlay

A separate renderer in a frameless, transparent, always-on-top window with its
own session partition. It is invisible and non-interactive when nothing is
happening (`opacity: 0` + `pointer-events: none`, not `display: none`).
`Shift+Tab` toggles interaction; `Ctrl+Shift+O` shows/hides it. It uses the
same context bridge as the main window and the same channel contract.

---

## 9. Verification

```bash
npm run check                      # syntax-check every source file
node tools/verify-app.mjs          # launch, screenshot, report renderer errors
node tools/cdp.mjs --port 9333 --shot out.png   # drive a running app over CDP
```

`tools/verify-app.mjs` starts Electron with `--remote-debugging-port`, captures
a screenshot of the main window, dumps the rendered text and nav items, and
fails on any renderer console error or uncaught exception.

---

## 10. License

MIT. Not affiliated with, endorsed by, or connected to OP.GG or Riot Games.
