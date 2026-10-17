<div align="center">

# ⚡ FREE-OP.GG Desktop OpenSource

### The 1:1 Clean-Room, Ad-Free, Bloat-Free League of Legends Companion

[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg?style=for-the-badge&logo=windows)](https://github.com/1khvled/FREE-OPGG)
[![Electron](https://img.shields.io/badge/Electron-33.4.11-47848F.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![League of Legends](https://img.shields.io/badge/League_of_Legends-Patch_14.20+-C89B3C.svg?style=for-the-badge&logo=league-of-legends)](https://www.leagueoflegends.com/)
[![Ads](https://img.shields.io/badge/Ads-0%25-red.svg?style=for-the-badge)](#)
[![Overwolf](https://img.shields.io/badge/Overwolf-REMOVED-critical.svg?style=for-the-badge)](#)

<p align="center">
  <b>A blazing-fast, 100% open-source desktop clone of OP.GG built exclusively for League of Legends.</b><br/>
  Zero Overwolf bloatware. Zero tracking telemetry. Zero advertisements. Under 180MB RAM usage.
</p>

</div>

---

## 📖 Table of Contents
- [Why FREE-OP.GG?](#-why-free-opgg)
- [Key Features](#-key-features)
  - [1. Interactive Sortable Champion Tier List](#1-interactive-sortable-champion-tier-list)
  - [2. Live Champ Select & ARAM Bench Cards](#2-live-champ-select--aram-bench-cards)
  - [3. Team Composition & Damage Profile](#3-team-composition--damage-profile)
  - [4. In-Game Enemy Spell Cooldown Timers](#4-in-game-enemy-spell-cooldown-timers)
  - [5. Full In-Game Automations (Runes, Builds, Spells, Ready Check)](#5-full-in-game-automations)
  - [6. My Profile & Live Match History](#6-my-profile--live-match-history)
  - [7. Lobby Multi-Search & Dodge Radar](#7-lobby-multi-search--dodge-radar)
  - [8. Floating Glassmorphism Overlay HUD](#8-floating-glassmorphism-overlay-hud)
- [Performance & Compute Optimizations](#-performance--compute-optimizations)
- [Architecture & Mechanics](#-architecture--mechanics)
- [Installation & Quickstart](#-installation--quickstart)
- [Build from Source](#-build-from-source)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🚀 Why FREE-OP.GG?

The official OP.GG desktop app has become increasingly bloated: it installs background Overwolf processes, runs advertising video engines in iframes, loads Sentry crash reporting, drains 800MB–1.2GB of RAM, and includes games you might not play (Valorant, TFT).

**FREE-OP.GG** solves this:
- **100% League of Legends Focused**: Pure LoL companion experience. No Valorant, no TFT, no unrelated games.
- **0% Ads & 0% Telemetry**: Clean-room implementation with zero third-party tracking or video ads.
- **Genuine OP.GG Live Data**: Directly consumes the live OP.GG endpoints for Ranked Solo/Duo, ARAM, and Arena/Mayhem.
- **Ultra-Lightweight**: Aggressive Chromium memory flags, process limits, and fast-path LCU polling keep memory footprint under **180MB RAM**.
- **Native Instant Launcher**: Includes a C# GUI launcher with zero console flash and instant single-instance activation.

---

## ✨ Key Features

### 1. Interactive Sortable Champion Tier List
- **Full Column Sorting**: Click any column header (`Rank`, `Champion`, `Tier`, `Win Rate`, `Pick Rate`, `Ban Rate`) to sort ascending or descending with visual indicator arrows (▲ / ▼).
- **All Lanes Supported**: Seamless filtering across `TOP`, `JUNGLE`, `MID`, `ADC`, `SUPPORT`, and `ALL`.
- **Game Modes**:
  - **Ranked Solo/Duo**: Emerald+, Diamond+, Master+, All Tiers.
  - **ARAM Mode**: Real ARAM tier rankings, win rates (e.g. Swain #1 63.5% WR), and pick rates.
  - **Arena / Mayhem**: Arena champion stats and placement ratings.
- **Matchup Counters**: Displays top 3 hardest counters with champion portraits, titles, and win rates.
- **Detailed Build Inspection Modal**:
  - Primary & Secondary Runes Reforged perk trees with stat shards.
  - Core Mythic/Legendary build paths, starter items, boots, and situational counters.
  - 1–18 Skill Max progression table (Q, W, E, R).

### 2. Live Champ Select & ARAM Bench Cards
- **S+, S, A, B Tier Cards**: Automatically identifies champion tiers with animated pulsating glow borders:
  - 🟡 **S+ Tier** (God Tier / Must Pick)
  - 🟣 **S Tier** (OP Pick)
  - 🔵 **A Tier** (Strong Meta)
  - 🟢 **B Tier** (Viable)
- **1-Click ARAM Bench Swap**: Displays every champion currently rolled onto the ARAM bench (`benchChampions`). Click **⚡ Swap** to claim the champion instantly via `POST /lol-champ-select/v1/session/bench/swap/{id}`.

### 3. Team Composition & Damage Profile
- **Real-Time Damage Split**: Dynamic visual bar calculating Physical % vs Magic % vs True Damage % of your 5 champions.
- **Damage Alerts**: Warns immediately if your team is `⚠️ Heavy AD Comp` (>80% AD) or `⚠️ Heavy AP Comp` (>80% AP) so players can adjust their picks before locking in.
- **Frontline & CC Analysis**: Evaluates frontline tank wall and crowd control disruption ratings.

### 4. In-Game Enemy Spell Cooldown Timers
- **Tab Tracker HUD**: Interactive cooldown tracker for enemy summoner spells (Flash, Ignite, Teleport, Cleanse, Heal, Ghost).
- **1-Click Timer**: Click a spell button when an opponent burns a summoner spell to initiate a live countdown timer (`⏱️ 300s`).
- **Visual & Audio Alert**: Pulsates red during cooldown and alerts you when the enemy flash is back up.

### 5. Full In-Game Automations
Directly integrates with the local Riot League Client Update (LCU) API:
- **⚡ Auto-Runes**: Automatically imports and equips the highest win-rate rune page into `/lol-perks/v1/pages` upon champion lock.
- **📦 Auto-Builds**: Synthesizes mode-specific item sets (Starters, Core, Boots, Situational) and writes directly to `/lol-item-sets/v1/item-sets/{summonerId}/sets` so they appear directly in the in-game shop.
- **🧙 Auto-Spells (Flash on D or F)**: Automatically equips optimal summoner spells (Smite for Jungle, Teleport for Top, Ignite for Mid/Supp, Snowball for ARAM). Toggle between **Flash on D** and **Flash on F** with 1 click in the titlebar.
- **✅ Auto-Accept**: Automatically accepts matchmaking ready checks (`POST /lol-matchmaking/v1/ready-check/accept`).

### 6. My Profile & Live Match History
- **Summoner Profile**: Loads current account icon, summoner level, Solo/Duo rank, division, LP, win rate, and Flex rank directly from LCU.
- **Recent 20 Matches**:
  - Victory / Defeat outcome banner with match duration and date.
  - Champion portrait and summoner spell icons.
  - KDA ratio (Kills / Deaths / Assists) and kill participation.
  - Complete 6-item build + trinket slot display.

### 7. Lobby Multi-Search & Dodge Radar
- **Paste Lobby Chat**: Paste chat lines (e.g. `Player joined the lobby`) or 5 comma-separated summoner names.
- **1-Click LCU Import**: Directly pulls the 5 teammates from your active Champion Select session.
- **Dodge Radar**:
  - 🚨 **Tilt Streak Detection**: Flags players on a 3+ game loss streak.
  - 🔥 **On Fire Detection**: Flags players on a 3+ game win streak.
  - 🛡️ **Autofill Tag**: Flags off-role and autofilled teammates.
  - 🎯 **Lobby Safety Score**: Gives a clear `SAFE TO PLAY`, `PLAY WITH CAUTION`, or `🚨 RECOMMENDED TO DODGE` recommendation.

### 8. Floating Glassmorphism Overlay HUD
- **Transparent Frameless Window**: Dedicated overlay window (`src/overlay.html`) with glassmorphism blur and transparency.
- **Auto-Docking**: Uses Win32 window metrics to automatically dock above the `LeagueClientUx.exe` window during champion select.
- **Compact & Full Modes**: Toggle between full card view and a slim bench-only bar.

---

## ⚡ Performance & Compute Optimizations

Unlike electron apps that consume gigabytes of memory, FREE-OP.GG is strictly optimized:
1. **Chromium Memory Cap**: `--max-old-space-size=192` limits V8 garbage collection heap.
2. **Process Limit**: `renderer-process-limit=2` prevents Chromium from spawning unnecessary utility sub-processes.
3. **Zero WMIC Process Spawning**: Completely removed heavy WMIC CLI polling. LCU discovery runs via instantaneous native filesystem syscalls (`fs.existsSync`).
4. **Fast-Path In-Memory Heartbeat**: Once connected to the League client, heartbeat checks run directly against memory sockets rather than hitting disk.
5. **Debounced UI Rendering**: Champion search input is debounced with zero layout thrashing.
6. **Background Occlusion & Throttling**: Memory is automatically pruned when the window is minimized or occluded.

---

## 🛠️ Architecture & Mechanics

```
┌─────────────────────────────────────────────────────────────────┐
│                      FREE-OP.GG Desktop                         │
├───────────────────────────────┬─────────────────────────────────┤
│         Main Process          │        Renderer Process         │
│         (Node/Electron)       │        (HTML5 / CSS3 / JS)      │
├───────────────────────────────┼─────────────────────────────────┤
│ • LCU Heartbeat & Lockfile    │ • Sortable Champion Tier Table  │
│ • Auto-Runes Injector         │ • Live Champ Select & Bench     │
│ • Auto-Builds Item Sets       │ • Team Damage Split (AD/AP/True)│
│ • Auto-Spells (D/F Key)       │ • Enemy Spell Cooldown Timers   │
│ • OP.GG Live HTTPS API Proxy  │ • Profile & Match History List  │
│ • Floating In-Game Overlay    │ • Lobby Dodge Radar             │
└───────────────▲───────────────┴────────────────▲────────────────┘
                │ IPC Context Bridge (preload.js)│
                └────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│       Riot Games LCU          │       │        OP.GG Live API         │
│  (127.0.0.1:PORT / HTTPS)     │       │  (lol-api-champion.op.gg)     │
├───────────────────────────────┤       ├───────────────────────────────┤
│ • /lol-champ-select/v1        │       │ • /api/GLOBAL/champions/ranked│
│ • /lol-perks/v1/pages         │       │ • /api/GLOBAL/champions/aram  │
│ • /lol-item-sets/v1           │       │ • /api/GLOBAL/champions/arena │
│ • /lol-match-history/v1       │       │ • /api/meta/champion-names    │
└───────────────────────────────┘       └───────────────────────────────┘
```

---

## 📦 Installation & Quickstart

### Method 1: Instant Fast Launcher (Recommended)
1. Download or clone this repository.
2. Run `tools/OP.GG-Launcher.exe` directly from your Desktop.
3. The app starts immediately with zero console window.

### Method 2: Standalone Setup Installer
Run `dist/OP.GG-Desktop-Setup-1.0.0.exe` to install to your system with start menu and desktop shortcuts.

---

## 🔨 Build from Source

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on Node v20/v24)
- npm v9+
- Windows 10/11

### Steps
```bash
# Clone the repository
git clone https://github.com/1khvled/FREE-OPGG.git
cd FREE-OPGG

# Install dependencies
npm install

# Launch in development mode
npm start

# Package portable unpacked executable (dist/win-unpacked)
npm run dist:dir

# Package standalone Windows NSIS installer (dist/OP.GG-Desktop-Setup-1.0.0.exe)
npm run dist
```

---

## ❓ Troubleshooting

- **"LoL: Disconnected" in Titlebar**:
  - Launch your League of Legends client and log in. OP.GG connects automatically via local LCU.
  - If your League client is run as Administrator, run OP.GG as Administrator so Windows allows IPC between the processes.
- **Runes Not Applying**:
  - Ensure you have at least one editable rune page in your League client. The app will automatically overwrite your active page.
- **Overlay Window Not Showing**:
  - Click `🎮 Overlay HUD` in the top titlebar or the pop-out button in the Live Game tab to open the overlay anytime.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - open-source and free for the community.

*League of Legends is a registered trademark of Riot Games, Inc. OP.GG is a registered trademark of OP.GG, Inc. This project is not affiliated with, endorsed by, or sponsored by Riot Games, Inc. or OP.GG, Inc.*
