<div align="center">

# ⚡ FREE-OP.GG Desktop OpenSource

### The 1:1 Clean-Room, Ad-Free, Bloat-Free League of Legends Companion

[![Platform](https://img.shields.io/badge/platform-Windows-blue.svg?style=for-the-badge&logo=windows)](https://github.com/1khvled/FREE-OPGG)
[![Electron](https://img.shields.io/badge/Electron-33.4.11-47848F.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![League of Legends](https://img.shields.io/badge/League_of_Legends-Patch_16.20-C89B3C.svg?style=for-the-badge&logo=league-of-legends)](https://www.leagueoflegends.com/)
[![Ads](https://img.shields.io/badge/Ads-0%25-red.svg?style=for-the-badge)](#)
[![Overwolf](https://img.shields.io/badge/Overwolf-REMOVED-critical.svg?style=for-the-badge)](#)

<p align="center">
  <b>A blazing-fast, 100% open-source desktop clone of OP.GG built exclusively for League of Legends.</b><br/>
  Updated for <b>Patch 16.20</b> and live Data Dragon 16.20.1. Zero Overwolf bloatware. Zero tracking telemetry. Zero advertisements. Under 180MB RAM usage.
</p>

</div>

---

## 📖 Table of Contents
- [Why FREE-OP.GG?](#-why-free-opgg)
- [Key Features](#-key-features)
  - [1. Interactive Sortable Champion Tier List](#1-interactive-sortable-champion-tier-list)
  - [2. Patch 16.20 Meta Trends & Winrate Spikes](#2-patch-1620-meta-trends--winrate-spikes)
  - [3. 1v1 VS Matchup Analyzer](#3-1v1-vs-matchup-analyzer)
  - [4. In-Game Jungle Camps & Objective Timers HUD](#4-in-game-jungle-camps--objective-timers-hud)
  - [5. OP-Score Performance Engine with MVP & ACE Badges](#5-op-score-performance-engine-with-mvp--ace-badges)
  - [6. Live Champ Select & ARAM Bench Cards](#6-live-champ-select--aram-bench-cards)
  - [7. Team Composition & Damage Profile](#7-team-composition--damage-profile)
  - [8. In-Game Enemy Spell Cooldown Timers](#8-in-game-enemy-spell-cooldown-timers)
  - [9. Full In-Game Automations (Runes, Builds, Spells, Ready Check)](#9-full-in-game-automations)
  - [10. Official OP.GG Live Ranked Leaderboard](#10-official-opgg-live-ranked-leaderboard)
  - [11. Live Summoner Profile Viewer & Search](#11-live-summoner-profile-viewer--search)
  - [12. Dynamic Patch Auto-Update Engine](#12-dynamic-patch-auto-update-engine)
  - [13. My Profile & Live Match History](#13-my-profile--live-match-history)
  - [14. Lobby Multi-Search & Dodge Radar](#14-lobby-multi-search--dodge-radar)
  - [15. In-Game Floating Overlay HUD (Over Actual Match Window)](#15-in-game-floating-overlay-hud-over-actual-match-window)
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
- **Updated to Live Patch 16.20 / Data Dragon 16.20.1**: Includes 173 champions, latest balance numbers, rune adjustments, and item pools.
- **0% Ads & 0% Telemetry**: Clean-room implementation with zero third-party tracking or video ads.
- **Genuine OP.GG Live Data**: Directly consumes the live OP.GG endpoints for Ranked Solo/Duo, ARAM, and Arena/Mayhem.
- **Ultra-Lightweight**: Aggressive Chromium memory flags, process limits, and fast-path LCU polling keep memory footprint under **180MB RAM**.
- **Native Instant Launcher**: Includes a C# GUI launcher with zero console flash and instant single-instance activation.

---

## ✨ Key Features

### 1. Interactive Sortable Champion Tier List (Per Server & Per Rank)
- **Filters Bar (1:1 OP.GG Replica)**:
  - **Role Segmented Bar**: Authentic League icons for `TOP`, `JUNGLE` (3 grass blades), `MID`, `ADC`, `SUPPORT`, and `ALL`.
  - **Rank & Tier Selector**: Select between `Emerald +` (OP.GG Default), `Diamond +`, `Master +`, `Grandmaster`, `Challenger`, `Platinum +`, `Gold +`, `Silver +`, and `All Tiers`.
  - **Server / Region Selector**: Switch between `🌍 World` (Global), `Korea (KR)`, `North America (NA)`, `Europe West (EUW)`, `Europe Nordic (EUNE)`, `Oceania (OCE)`, `Brazil (BR)`, `Japan (JP)`, `LAN`, and `LAS`.
  - **Queue / Mode Selector**: `Ranked Solo`, `Ranked Flex`, `ARAM`, `Arena / Mayhem`, and `Normal`.
  - **Patch Selector**: `16.20`, `16.19`, `16.18`.
  - **Show All Toggle**: When enabled, displays off-meta picks and every champion who has played in the role (e.g. Jungle Karthus, Jungle Morgana, Jungle Sylas, Jungle Teemo, Jungle Twitch, Jungle Brand, Jungle Gwen).
- **10 Column Interactive Sortable Table**:
  - `RANK` with rank change indicators (`▲2`, `▼1`, `-`).
  - `CHAMPION` with portrait, name, role badge, and title.
  - `TIER` (`OP`, `Tier 1`, `Tier 2`, `Tier 3`, `Tier 4`, `Tier 5`).
  - `WIN RATE` with percentage text and visual progress bar (e.g. `52.23%`).
  - `PICK RATE` (e.g. `7.72%`).
  - `BAN RATE` (e.g. `6.41%`).
  - `MATCHES` total games played (e.g. `131,151` matches).
  - `KDA` average kill/death/assist ratio (e.g. `2.96:1`).
  - `HARDEST COUNTERS` top 3 counter champions with icons and win rates.
  - `BUILD & RUNES` 1-click modal for full rune trees and item builds.
- **Bi-Directional Sorting**: Click any column header (`Rank`, `Champion`, `Tier`, `Win Rate`, `Pick Rate`, `Ban Rate`, `Matches`, `KDA`) to sort ascending or descending with visual indicator arrows (▲ / ▼).

### 1.1 Optimized Arena & Mayhem Mode Tier List (1:1 OP.GG Replica)
- **Dedicated Arena / Mayhem Columns**:
  - `Rank` with rank change indicators (`▲`, `▼`, `-`).
  - `Champion` with portrait, name, and Arena archetype pill (`Fighter`, `Tank`, `Mage`, `Marksman`, `Support`).
  - `Tier` (`OP`, `Tier 1`, `Tier 2`, `Tier 3`, `Tier 4`, `Tier 5`).
  - `👑 1st Place %` (e.g. `18.2%`) sorted descending by default.
  - `Top 4 Rate` (Win Rate) with percentage and OP.GG visual progress bar.
  - `Avg Place` badge (`#2.84`, `#3.15`, `#4.12`) color-coded cyan for top contenders.
  - `Pick Rate` & `Ban Rate` percentages.
  - `Matches` total games played.
  - `Top Augments`: 3 interactive mini chips with glowing rarity borders (Prismatic, Gold, Silver) and tooltips.
  - `Arena Build`: 1-click modal for complete Arena setup.
- **Archetype / Class Filtering**: When Arena mode is selected, the role filter bar automatically maps to champion classes:
  - `TOP` ➔ **Fighters**
  - `JUNGLE` ➔ **Tanks**
  - `MID` ➔ **Mages**
  - `ADC` ➔ **Marksmen**
  - `SUPPORT` ➔ **Supports & Assassins**
  - `ALL` ➔ **All Champions**
- **Arena-Specific Champion Modal**:
  - **Prismatic Items**: Glowing cards for recommended prismatic items with win rate, pick rate, and 1st place finish rates.
  - **Tiered Augments**: Prismatic, Gold, and Silver augments with icons, descriptions, and win rates.
  - **2v2 Duo Synergies**: Top 8 best 2v2 partner champions with duo win rates, 1st place finishes, and match counts.
  - **Normalized Item IDs**: Automatically maps Arena internal item IDs (e.g. `223031` ➔ `3031`) to ensure seamless Data Dragon item icon loading.

### 2. Patch 16.20 Meta Trends & Winrate Spikes
- Real-time ticker banner featuring the **Top 5 Meta Gainers** (`▲` rank leaps and winrate spikes) and hardest-falling nerf victims.
- Click any trending champion card to immediately filter the tier table to that pick.

### 3. 1v1 VS Matchup Analyzer
- Head-to-Head duel analyzer embedded into the Champion Detail Modal.
- 3 visual split duel progress bars:
  - **Head-to-Head Win Rate** %
  - **Lane Solo Kill Rate** %
  - **First Tower & Turret Plates Advantage** %
- Interactive Opponent Dropdown: swap opponents on the fly to inspect lane dynamics.
- Pro Challenger Tips: level 1-3 power spike strategy, trading around core ability cooldown windows, and item spike timings.

### 4. In-Game Jungle Camps & Objective Timers HUD
- Interactive objective counters with circular visual countdowns:
  - **Dragon (Elemental / Elder)**: 5:00 countdown
  - **Baron Nashor**: 6:00 countdown
  - **Voidgrubs**: 4:00 countdown
  - **Rift Scuttler**: 2:30 countdown
  - **Blue / Red Buffs**: 5:00 countdown
- Synchronized Web Audio API sound alert at 30 seconds before respawn.

### 5. OP-Score Performance Engine with MVP & ACE Badges
- Authentic performance evaluation algorithm rated 1.0 to 10.0 based on KDA, CS pacing, kill participation, and match victory state.
- **👑 MVP Badge**: Gold luminous badge awarded to the highest impact carry on the winning team.
- **⭐ ACE Badge**: Purple gradient badge awarded to the standout player on the losing team.
- **CS Pacing Benchmarks**: Visual tag showing `🟢 Challenger Pace` (>=7.5 CS/min) or `🟡 Average` (>=5.0 CS/min).

### 6. Live Champ Select & ARAM Bench Cards
- **S+, S, A, B Tier Cards**: Automatically identifies champion tiers with animated pulsating glow borders:
  - 🟡 **S+ Tier** (God Tier / Must Pick)
  - 🟣 **S Tier** (OP Pick)
  - 🔵 **A Tier** (Strong Meta)
  - 🟢 **B Tier** (Viable)
- **1-Click ARAM Bench Swap**: Displays every champion currently rolled onto the ARAM bench (`benchChampions`). Click **⚡ Swap** to claim the champion instantly via `POST /lol-champ-select/v1/session/bench/swap/{id}`.

### 7. Team Composition & Damage Profile
- **Real-Time Damage Split**: Dynamic visual bar calculating Physical % vs Magic % vs True Damage % of your 5 champions.
- **Damage Alerts**: Warns immediately if your team is `⚠️ Heavy AD Comp` (>80% AD) or `⚠️ Heavy AP Comp` (>80% AP) so players can adjust their picks before locking in.
- **Frontline & CC Analysis**: Evaluates frontline tank wall and crowd control disruption ratings.

### 8. In-Game Enemy Spell Cooldown Timers
- **Tab Tracker HUD**: Interactive cooldown tracker for enemy summoner spells (Flash, Ignite, Teleport, Cleanse, Heal, Ghost).
- **1-Click Timer**: Click a spell button when an opponent burns a summoner spell to initiate a live countdown timer (`⏱️ 300s`).
- **Visual & Audio Alert**: Pulsates red during cooldown and alerts you when the enemy flash is back up.

### 9. Full In-Game Automations
Directly integrates with the local Riot League Client Update (LCU) API:
- **⚡ Auto-Runes**: Automatically imports and equips the highest win-rate rune page into `/lol-perks/v1/pages` upon champion lock.
- **📦 Auto-Builds**: Synthesizes mode-specific item sets (Starters, Core, Boots, Situational) and writes directly to `/lol-item-sets/v1/item-sets/{summonerId}/sets` so they appear directly in the in-game shop.
- **🧙 Auto-Spells (Flash on D or F)**: Automatically equips optimal summoner spells (Smite for Jungle, Teleport for Top, Ignite for Mid/Supp, Snowball for ARAM). Toggle between **Flash on D** and **Flash on F** with 1 click in the titlebar.
- **✅ Auto-Accept**: Automatically accepts matchmaking ready checks (`POST /lol-matchmaking/v1/ready-check/accept`).
- **🔊 Web Audio API Feedback**: Programmatic, zero-latency synthesizer chimes for ready checks, rune applications, and timer warnings with a titlebar toggle (`🔊 Sound: ON / OFF`).

### 10. Official OP.GG Live Ranked Leaderboard
- **100% Real OP.GG API Integration**: Powered directly by `https://lol-api-summoner.op.gg/api/{region}/rankings/ladder?page={page}`.
- **Server Selection**: Select across **KR, NA, EUW, EUNE, OCE, BR, JP, LAN, LAS**.
- **Tier & Ladder Filters**: Filter by `Challenger`, `Grandmaster`, `Master`, or `All Ranks`.
- **Pro Team Tags & Real Data**: Inspect real pro players (T1, Gen.G, HLE, C9, G2, etc.), current LP, total wins/losses, win rates, and their top 3 most-played champions with games and winrates.
- **Instant Search by Name**: Live filter or query any summoner on the ladder by typing into the integrated search box.
- **Full Pagination**: Seamless page navigation with prefetching and 3-minute in-memory caching.

### 11. Live Summoner Profile Viewer & Search
- **Inspect Anyone's Profile**: Click any player on the Ranked Leaderboard or search by summoner name anywhere in the app to open their full OP.GG profile.
- **Top 5 Champions Bar**: Displays their most-played champions, winrates, and games played.
- **Recent 20 Match History Cards**:
  - Victory / Defeat styling with match duration, queue type, and date.
  - Champion portrait, summoner spell icons, and rune keystones.
  - KDA ratio (Kills / Deaths / Assists) and kill participation.
  - Complete 6-item build + trinket slot display.
  - Authentic OP-Score rating with 👑 MVP and ⭐ ACE badges.
  - CS/min benchmark tags (`🟢 Challenger Pace`, `🟡 Master Pace`, `Average`).

### 12. Dynamic Patch Auto-Update Engine
- **Riot Version API Listener**: Automatically queries Riot's official version endpoint `https://ddragon.leagueoflegends.com/api/versions.json` on startup and in a background heartbeat every 30 minutes.
- **Auto-Sync Assets**: When Riot releases a new patch (e.g. 16.21+), the app automatically downloads the latest `champions_ddragon.json` and `runes.json`, clears memory caches, hot-swaps the UI dropdowns, and notifies the user with a titlebar update indicator.
- **Manual 1-Click Check**: Click the patch version pill in the titlebar to instantly poll Riot for new patches on demand.

### 13. My Profile & Live Match History
- **Summoner Profile**: Loads current account icon, summoner level, Solo/Duo rank, division, LP, win rate, and Flex rank directly from LCU.
- **Interactive Match History**: Deep inspect your own local match history with the same OP-Score and performance breakdown.

### 14. Lobby Multi-Search & Dodge Radar
- **Paste Lobby Chat**: Paste chat lines (e.g. `Player joined the lobby`) or 5 comma-separated summoner names.
- **1-Click LCU Import**: Directly pulls the 5 teammates from your active Champion Select session.
- **Dodge Radar**:
  - 🚨 **Tilt Streak Detection**: Flags players on a 3+ game loss streak.
  - 🔥 **On Fire Detection**: Flags players on a 3+ game win streak.
  - 🛡️ **Autofill Tag**: Flags off-role and autofilled teammates.
  - 🎯 **Lobby Safety Score**: Gives a clear `SAFE TO PLAY`, `PLAY WITH CAUTION`, or `🚨 RECOMMENDED TO DODGE` recommendation.

### 15. In-Game Floating Overlay HUD (Over Actual Match Window)
- **Over the Game Window**: The overlay HUD is built to float directly over the actual League in-game match window (`League of Legends (TM) Client`) as well as the champ select client.
- **Screen-Saver Always-On-Top**: Configured with `overlayWindow.setAlwaysOnTop(true, 'screen-saver')` so it stays seamlessly visible over borderless/fullscreen windowed game clients.
- **Global Toggle Hotkey**: Toggle the in-game HUD at any second using `Ctrl + Shift + O` (or `Cmd + Shift + O` on macOS).
- **Clean Titlebar**: Removed clutter from the main application titlebar—the overlay automatically docks and activates when your game starts.

---

## ⚡ Performance & Compute Optimizations

Unlike bloated desktop apps that consume 800MB–1.2GB of RAM and significant CPU, FREE-OP.GG is strictly optimized:
1. **Aggressive V8 Heap Hard-Cap**: `--max-old-space-size=128` limits Electron V8 memory footprint to under 128MB.
2. **Single Renderer Process Limit**: `--renderer-process-limit=1` prevents Chromium from spawning runaway helper sub-processes.
3. **Background Occlusion & Polling Throttle**: When the window is minimized or hidden, LCU polling drops from 2.5s down to 15s and immediately triggers `global.gc()` to reclaim unused RAM.
4. **Native Image Lazy-Loading**: All champion portraits, items, spells, and runes use `loading="lazy"` to prevent GPU/DOM thrashing.
5. **Zero WMIC Process Spawning**: Completely removed heavy WMIC CLI polling. LCU discovery runs via instantaneous native filesystem syscalls (`fs.existsSync`).
6. **In-Memory TTL Caches**: OP.GG ladder and tier queries are cached in-memory with strict time-to-live policies to eliminate redundant network requests.

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
