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
- **Arena Champion Detail (Augments, Prismatics & Synergies)**:
  `https://lol-api-champion.op.gg/api/GLOBAL/champions/arena/{champId}`
- **Arena Meta Augments Catalog**:
  `https://lol-api-champion.op.gg/api/meta/augments`
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

### D. Interactive Column Sorting Engine & 1:1 Filters Bar
- **1:1 OP.GG Replica Filter Bar**:
  - Segmented role icons (`TOP`, `JUNGLE`, `MID`, `ADC`, `SUPPORT`, `ALL`).
  - Tier filter dropdown (`Emerald +`, `Diamond +`, `Master +`, `Grandmaster`, `Challenger`, `Platinum +`, `Gold +`, `Silver +`, `All Tiers`).
  - Server / Region dropdown (`🌍 World`, `KR`, `NA`, `EUW`, `EUNE`, `OCE`, `BR`, `JP`, `LAN`, `LAS`).
  - Queue / Mode dropdown (`Ranked Solo`, `Ranked Flex`, `ARAM`, `Arena / Mayhem`, `Normal`).
   - Patch selector (`16.20`, `16.19`, `16.18`).
   - `Show All` checkbox toggle for off-meta champions.
- **10 Interactively Sortable Columns**:
  - `RANK` (with rank change `▲2`, `▼1`, `-`).
  - `CHAMPION` (portrait, name, role badge, title).
  - `TIER` (`OP`, `Tier 1`, `Tier 2`, `Tier 3`, `Tier 4`, `Tier 5`).
  - `WIN RATE` (percentage + visual progress bar).
  - `PICK RATE` (percentage).
  - `BAN RATE` (percentage).
  - `MATCHES` (total games played e.g. 131,151).
  - `KDA` (kill/death/assist ratio e.g. 2.96:1).
  - `HARDEST COUNTERS` (top 3 counters with icons and win rates).
  - `BUILD & RUNES` (1-click build inspection).
- Direction toggle (ascending `▲` / descending `▼`) with active column glow styling and rank tie-breaking.
- Dynamic instant re-rendering with zero lag.

### E. Patch 16.20 Meta Trends & Spikes Banner
- Top horizontal trending bar highlighting the 5 fastest-rising champions (`▲ Rank Leaps`, `+Winrate Spikes`) and hardest-falling nerf victims.
- 1-click filter jump: clicking any trending champion card immediately filters the champions list to that pick.

### F. 1v1 VS Matchup Analyzer
- Head-to-Head duel analyzer embedded into the Champion Detail Modal.
- Duel meters with visual split bars:
  - **Head-to-Head Win Rate** %
  - **Lane Solo Kill Rate** %
  - **First Tower & Plates Advantage** %
- Interactive Opponent Dropdown: swap opponents on the fly to inspect lane dynamics.
- Pro Challenger Tips: level 1-3 power spike strategy, trading around core ability cooldown windows, and item spike timings.

### G. In-Game Jungle Camps & Objective Timers HUD
- Interactive companion counters with circular progress:
  - **Dragon (Elemental / Elder)**: 5:00 countdown
  - **Baron Nashor**: 6:00 countdown
  - **Voidgrubs**: 4:00 countdown
  - **Rift Scuttler**: 2:30 countdown
  - **Blue / Red Buffs**: 5:00 countdown
- Synchronized Web Audio API sound alerts at 30 seconds before respawn.

### H. Authentic OP-Score, MVP & ACE Engine
- Accurate performance evaluation rating on a 1.0 - 10.0 scale based on KDA, CS/min pacing, kill participation, and match victory state.
- **👑 MVP Badge**: Gold luminous badge awarded to the highest impact carry on the winning team.
- **⭐ ACE Badge**: Purple gradient badge awarded to the standout player on the losing team.
- **CS Pacing Benchmarks**: Visual tag showing `🟢 Challenger Pace` (>=7.5 CS/min) or `🟡 Average` (>=5.0 CS/min).

### I. Web Audio API Zero-Bloat Sound Engine
- High-fidelity synthesized audio feedback using pure browser `AudioContext` (no external audio files required, zero disk overhead).
- Audio chimes for Ready-Check auto-accept, rune injection confirmation, and objective timer warnings.
- Header `🔊 Sound: ON / OFF` toggle with persistent preference state.

### J. Rich League Companion Features
1. **Auto-Summoner Spells**:
   - Automatically synchronizes optimal summoner spells (e.g. Flash + Ignite, Flash + Teleport, Smite + Flash) directly to the active champ select session via `/lol-champ-select/v1/session/my-selection`.
   - Dedicated Flash slot preference toggle: **[F]** or **[D]** selectable directly in the titlebar.
2. **My Profile & 20 Recent Match History**:
   - Pulls live summoner identity from `/lol-summoner/v1/current-summoner`.
   - Displays Ranked Solo and Ranked Flex tier, division, LP, win rate, and games played from `/lol-ranked/v1/current-ranked-stats`.
   - Renders 20 recent matches from `/lol-match-history/v1/products/lol/current-summoner/matches` with KDA, kill participation, items, keystone runes, CS/min, OP-Score, MVP/ACE badges, and victory/defeat gradient bars.
3. **Live Team Damage Composition Analyzer**:
   - In Champ Select, dynamically tallies the team's damage distribution into Physical %, Magic %, and True Damage %.
   - Analyzes frontline bulk and CC readiness; displays prominent warning alerts for Full AD (>80%) or Full AP (>80%) drafts to help players adjust before game start.
4. **Enemy Live Summoner Spell Cooldown Timers**:
   - Interactive live 300s Flash and secondary spell timers (Ignite, Teleport, Cleanse, Heal, Ghost, Exhaust) for all 5 enemy champions.
   - Click to start/reset cooldown countdowns with visual circular progress and audio notifications.
5. **Lobby Dodge Radar**:
   - Evaluates teammates in champion select for tilt streaks (3+ consecutive losses 🚨), win streaks (🔥), autofilled roles (🛡️), or low champion mastery.
   - Calculates a live Lobby Safety Score (e.g., `92% Safe - High Win Probability` vs `Dodge Recommended`).

6. **Official OP.GG Live Ranked Leaderboard & Summoner Inspector**:
   - Queries `https://lol-api-summoner.op.gg/api/{region}/rankings/ladder?page={page}` (100 players per page, KR/NA/EUW/etc.).
   - Displays rank, LP, pro team tags, winrate, and top 3 played champions with 3-minute in-memory caching.
   - Live summoner profile inspector with top 5 played champions and 20 recent match cards with OP-Score, MVP/ACE badges, and CS/min tags.
7. **Dynamic Patch Auto-Update Engine**:
   - Background check on startup and every 30 minutes querying `https://ddragon.leagueoflegends.com/api/versions.json`.
   - Automatically downloads latest champion and rune datasets from Riot, clears memory caches, and notifies renderer.
8. **In-Game Overlay Floating Over Match Window**:
   - Targets `"League of Legends (TM) Client"` (the actual in-game match window) and `"League of Legends"`.
   - Uses `overlayWindow.setAlwaysOnTop(true, 'screen-saver')` and `CommandOrControl+Shift+O` global hotkey.
   - Removed titlebar launcher clutter from the main application.

---

## 4. Ultra-Low Compute & Resource Optimization Architecture

Unlike bloated Overwolf apps or the official client which consume 600MB-1.5GB of RAM and 5-15% CPU:
1. **Zero WMIC Polling**: Completely removed `wmic process` spawning loops. Windows checks direct lockfile timestamps, eliminating all CPU spikes and child process thrashing.
2. **Fast-Path Memory Polling**: Once connected to the LCU port, a persistent keepalive ping operates at 2500ms intervals using zero disk I/O.
3. **Background Occlusion & Polling Throttle**: When the window is minimized or hidden, LCU polling automatically throttles down from 2.5s to 15s and immediately invokes `global.gc()` to free memory.
4. **V8 Memory Constraints**: Configured Chromium switches:
   - `--max-old-space-size=128` (hard-caps JavaScript heap at 128MB)
   - `--renderer-process-limit=1`
   - `--disable-site-isolation-trials`
   - `--disable-backgrounding-occluded-windows`
5. **Native Lazy-Loading**: All image elements (`img`) leverage `loading="lazy"` to eliminate off-screen DOM and GPU memory consumption.
6. **Input Debouncing & In-Memory Caching**: Search and role filter queries are debounced with cached DOM fragment renders; remote API calls use strict TTL caches.
7. **Idle Footprint**: Under 130MB RAM total across all Electron processes, with ~0.0% CPU usage while running in the background.

---

## 5. Launchers & Executables

1. **Fast Launcher** (Desktop):
   - Path: `C:\Users\Abdelli\Desktop\OP.GG-Launcher.exe`
   - Native C# binary, zero console window popup, checks if instance is running, brings window to focus or starts unpacked binary immediately.
2. **Standalone Unpacked Binary**:
   - Path: `D:\open-opgg\dist\win-unpacked\OP.GG Desktop OpenSource.exe`
3. **Setup Installer**:
   - Path: `C:\Users\Abdelli\Desktop\OP.GG-Desktop-Setup-1.0.0.exe`
   - Full NSIS installer.

---

## 6. GitHub Repository & Build Commands

- **GitHub Repository**: [https://github.com/1khvled/FREE-OPGG.git](https://github.com/1khvled/FREE-OPGG.git)

Run commands from `D:\open-opgg`:

```bash
# Run the application in development mode
npx electron .

# Build the portable unpacked executable
npm run dist:dir

# Build the standalone Windows installer
npm run dist

# Push updates to GitHub
git add .
git commit -m "Your commit message"
git push origin main
```

