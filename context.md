# OP.GG Desktop OpenSource — Context & Architecture Guide

## 1. Executive Summary

**OP.GG Desktop OpenSource** is a 100% clean-room, ad-free, bloat-free desktop companion built exclusively for **League of Legends**.
- **No Valorant, No TFT, No other games**: Stripped down completely to LoL.
- **Zero Ads & Zero Telemetry**: Completely eliminated Overwolf bloatware, Google Analytics, Sentry logging, and promotional iframes.
- **Direct Live OP.GG Endpoints**: Consumes official, live OP.GG APIs for Ranked Solo, ARAM, and Mayhem/Arena.
- **Local Riot League Client Update (LCU) Integration**: Automatically injects rune pages upon champion lock, injects mode-tailored item builds directly into the in-game shop, and monitors champion select events in real time.
- **ARAM & Mayhem Live Card Overlay**: Displays real-time S+, S, A, and B tier cards over champions and reroll bench pools with instant 1-click swapping (`POST /lol-champ-select/v1/session/bench/swap/{id}`) and transparent glassmorphism overlay.

---

## 2. Directory Layout (`D:\open-opgg`)

```
D:\open-opgg\
├── main.js                     # Electron main process (LCU polling, IPC, API bridges, window lifecycle)
├── preload.js                  # Context bridge exposing secure window.opgg APIs to renderer
├── package.json                # Dependencies, electron-builder configuration, scripts
├── context.md                  # This architecture and operations document
├── assets\                     # Application icons and branding assets
│   ├── icon.ico                # Desktop binary icon
│   └── icon.png
├── tools\                      # Native companion tools & helpers
│   └── Launcher.cs             # C# Native Windows GUI Launcher source (zero console popup)
├── src\                        # Web-based frontend presentation layer
│   ├── index.html              # Main application window (Champions, Live Companion, Multi-Search, Leaderboard)
│   ├── style.css               # Official OP.GG dark palette, Axiforma font, and responsive styling
│   ├── renderer.js             # Reactive engine for main window (filters, search, modals, LCU listeners)
│   ├── overlay.html            # Floating transparent in-game ARAM & Mayhem card overlay window
│   ├── overlay.css             # Glassmorphism styling, S/A/B tier badges, pulsating glows
│   ├── overlay.js              # Overlay logic, live bench synchronization, augment browsing
│   └── assets\                 # Local cached champion and game data
│       ├── augments.json       # Arena / Mayhem augment cards and rankings
│       ├── champions_ddragon.json # Data Dragon champion metadata and icons
│       ├── runes.json          # Complete Riot Runes Reforged perk trees
│       ├── champion_names_cache.json
│       ├── ranked_champions_cache.json
│       ├── aram_champions_cache.json
│       └── arena_champions_cache.json
└── dist\                       # Packaged distribution artifacts
    ├── win-unpacked\           # Instant standalone portable directory
    │   └── OP.GG Desktop OpenSource.exe
    └── OP.GG-Desktop-Setup-1.0.0.exe # Full NSIS standalone installer
```

---

## 3. Core Modules & Technical Mechanics

### A. Live OP.GG API Integration (Zero Fake Data)

The app queries official live OP.GG endpoints with robust fallback to real pre-cached responses:
- **Champion Names Meta**:
  `https://lol-api-champion.op.gg/api/meta/champion-names?hl=en_US`
- **Ranked Champion Tiers & Stats**:
  `https://lol-api-champion.op.gg/api/GLOBAL/champions/ranked?tier=emerald_plus`
  *(Supports `all`, `emerald_plus`, `diamond_plus`, `master_plus`)*
- **ARAM Champion Tiers**:
  `https://lol-api-champion.op.gg/api/GLOBAL/champions/aram/`
- **Arena / Mayhem Tiers**:
  `https://lol-api-champion.op.gg/api/GLOBAL/champions/arena/`
- **Champion Builds & Runes Detail**:
  `https://lol-api-champion.op.gg/api/GLOBAL/champions/{mode}/{champId}/{position}?tier={tier}&is_more=true`

### B. Riot League Client Update (LCU) Integration

The app connects directly to the local League client via HTTPS using the credentials parsed from `lockfile`:
1. **Lockfile Discovery**:
   - Analyzes Riot Client installations at `%LOCALAPPDATA%\Riot Games\RiotClientInstalls.json`
   - Scans `LeagueClientUx.exe` directories: `C:\Riot Games\League of Legends\lockfile` or `D:\Riot Games\League of Legends\lockfile`.
   - Parses `processName:PID:PORT:TOKEN:PROTOCOL`.
2. **LCU API Communication**:
   - Uses basic auth `Basic base64('riot:' + token)` with `rejectUnauthorized: false` for Riot's self-signed certificates.
3. **Automations**:
   - **Auto-Accept**: Listens for `/lol-matchmaking/v1/ready-check` and calls `POST /lol-matchmaking/v1/ready-check/accept`.
   - **Auto-Runes**: Upon champion lock in `/lol-champ-select/v1/session`, retrieves recommended rune perks and updates `/lol-perks/v1/pages`.
   - **Auto-Builds**: Synthesizes recommended items for the champion (Starters, Core, Boots, Situational) and writes directly to `/lol-item-sets/v1/item-sets/{summonerId}/sets` with `priority: true` so they display directly in the in-game shop.

### C. ARAM & Mayhem Live Card Overlay

OP.GG's newest card overlay highlights champions and rerolls:
- **ARAM Bench Card Overlay**:
  - Highlights available bench champions (`benchChampions` from `/lol-champ-select/v1/session`).
  - Cards feature tier ranks (**S+ God Tier**, **S OP**, **A**, **B**), win rates, keystone icon, and recommended starter items.
  - Clicking **⚡ Swap** on any card calls `POST /lol-champ-select/v1/session/bench/swap/{championId}`.
- **Mayhem Augment Cards**:
  - Displays rankings for Prismatic, Gold, and Silver augments during Arena/Mayhem picking phases.
- **Floating Overlay Window**:
  - Frameless, glassmorphism window with transparency (`alwaysOnTop: true`, `frame: false`, `transparent: true`).
  - Supports automatic docking directly over the `LeagueClientUx` window using Win32 window bounds.
  - Can be toggled anytime from the titlebar or Live Champ Select panel.

---

## 4. Launchers & Executables

1. **Fast Launcher** (Desktop):
   - Path: `C:\Users\Abdelli\Desktop\OP.GG-Launcher.exe`
   - Native C# binary, zero console window popup, checks if instance is running, brings window to focus or starts unpacked binary immediately.
2. **Standalone Unpacked Binary**:
   - Path: `D:\open-opgg\dist\win-unpacked\OP.GG Desktop OpenSource.exe`
3. **Setup Installer**:
   - Path: `C:\Users\Abdelli\Desktop\OP.GG-Desktop-Setup-1.0.0.exe`
   - Full NSIS installer.

---

## 5. Development & Build Commands

Run commands from `D:\open-opgg`:

```bash
# Run the application in development mode
npx electron .

# Build the portable unpacked executable
npx electron-builder --win dir

# Build the standalone Windows installer
npm run dist
```
