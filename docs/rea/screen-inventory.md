# Screen inventory (reconstructed from the shipped renderer)

The reference renderer is a webpack bundle set under `assets/react/`. Each lazy
chunk is one screen or one feature of a screen. Names below are the chunk file
names; the mapping is derived from the chunk's exports, the route names present
in `assets/react/app.17903a6b.js`, and the `build.json` chunk manifest.

## LoL scope (this replica's scope)

| Chunk | Screen | What it shows |
| --- | --- | --- |
| `ChampionsV3.47962334.bundle.js` | Champions tier list | role tabs, tier/region/queue/patch filters, 8-column sortable champion table |
| `LoL.c4a25cd8.bundle.js` | LoL page container | layout shell, API client, v3 meta endpoints |
| `LoLHome.3dc65272.bundle.js` | LoL landing | league-wide meta, leaderboard entry points |
| `ChampionStatistics.54719aad.bundle.js` | Champion detail | win/pick/ban, roles, counters, trend |
| `ChampionRecommendation.b62c5bba.bundle.js` | Champion recommendation | recommended picks per context |
| `LiveChampion3.8c6f1092.bundle.js` | Live companion | champ-select board, ARAM bench, augment advisor |
| `LiveOPChampionsV2.3c917b01.bundle.js` | Live champion list | live-tier champion rows |
| `LiveOPChampions.2c4d6391.bundle.js` | Live champion list (legacy) | — |
| `MyPage.3f0173b5.bundle.js` | My page | profile, rank, match history |
| `Multisearch.5a65d8b2.bundle.js` | Multisearch | multi-summoner search |
| `OpggPickV2.ce271ea4.bundle.js` | Pick & ban | quick pick/ban assistant |
| `QuickPlayV2.bdaf014d.bundle.js` | Quick play | ARAM/Mayhem quick-play helper |
| `QuickPlay.346077f4.bundle.js` | Quick play (legacy) | — |
| `JungleCampRanking.d4cf92c8.bundle.js` | Jungle camps | camp ranking + timers |
| `AramMayhem.03c382ad.bundle.js` | ARAM / Mayhem | balance tags, augments |
| `GameMode.7c113a60.bundle.js` | Game modes | mode picker |
| `EndOfGame.74b1d5db.bundle.js` | End of game | post-game summary panel |
| `SideV2Game.0946ec15.bundle.js` | Side game panel | in-game side panel |
| `MainHome.73563816.bundle.js` | Desktop home | desktop landing page |
| `MainSettings.61f2dc02.bundle.js` | Settings | preferences |
| `MainNews.515e4813b.bundle.js` | News | patch notes feed |
| `LoLPatchNotes.d30fc9b0.bundle.js` | Patch notes | patch changelog |
| `LoLPusher.6ba58e62.bundle.js` | Pusher | desktop notification/push helper |
| `MediaContent.5ed509c4.bundle.js` | Media | video/article cards |
| `WebChampions.eb2a53c1.bundle.js` | Web champions | webview champions list |
| `WebApp.6c19e7a0.bundle.js` | Web app | embedded web content host |
| `DesktopApp.2d31a5dd.bundle.js` | Desktop app | desktop-specific chrome and routing |
| `overlay.e6ae753e.js` | In-game overlay | separate always-on-top renderer |
| `stratum.ef0c5379.js` | Stratum design system | shared UI primitives |

## Out of scope for this LoL-only replica

TFT (`TFTHome`, `TFTSoloRank`, `TFTItemBuild`, `TFTItemTier`, `TFTTeamBuilder`,
`TFTRevival`, `TFT15PowerUp`, `TFTAugmentSimpleTier`, `TFTRival`, `TFTPatdhNotes`,
`TFTMyProfile`, `TFTTreasure`), Valorant (`Valorant*`), Palworld (`Palworld*`),
MapleStory (`Maplestory*`), Diablo 4 (`Diablo4*`), TwoXKO, Supervise, Brawl
Tiers, DoomsBotRanking, Slate, BithumbEvent, AIChatBot / AIVoiceSettings,
Straylight / SlayTheSpire2.

These chunks are present in the reference bundle and are the source of the
reference's bloat. The replica deliberately omits them, and the shell must not
route to them.

---

## Reference shell structure (from `assets/react/index.html`)

```html
<html>
  <head>
    <title>OP.GG</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" />
    <style>
      html { width:100%; height:100%; margin:0; background:#1c1c1f; color:#fff }
      body { margin:0; width:100%; height:100%; overflow:hidden; font-family:Roboto,sans-serif }
      .spinner { animation:rotate 2s linear infinite; width:36px; height:36px; margin-top:24px }
      .spinner .path { stroke:#5F32E6; stroke-linecap:round; animation:dash 1.5s ease-in-out infinite }
      #discord, .entry-loading-action {
        display:flex; flex-direction:column; justify-content:center;
        padding:8px 12px; height:35px; box-sizing:border-box; line-height:19px;
        border-radius:8px; background-color:#5f32e6; cursor:pointer; margin-top:24px;
        -webkit-app-region:no-drag
      }
    </style>
  </head>
  <body>
    <div class="main">…entry loader…</div>
  </body>
</html>
```

Note the brand purple `#5f32e6` used by the entry loader and the Discord button,
and the app background `#1c1c1f` used behind the loader. The replica keeps both.

---

## Reference main-process window topology (REA evidence)

| Window | `preload` | `webPreferences` | Notes |
| --- | --- | --- | --- |
| Main | `preload.js` | `nodeIntegration:false, contextIsolation:true` | primary application window |
| Overlay | `preload.js` | `offscreen: OVERLAY, frame:false, alwaysOnTop:true, backgroundColor:"#00000000", partition:"persist:overlay"` | transparent in-game HUD |
| Stratum overlay | `preload.js` | `webSecurity:true, partition:"persist:stratum_overlay"` | second overlay surface |
| Chatbot | `preload_chatbot.js` | `webSecurity:false, webviewTag:true, nativeWindowOpen:true, backgroundThrottling:false` | out of scope |
| Member purchase | `preload_member_purchase.js` | `nodeIntegration:false, contextIsolation:true, nativeWindowOpen:true` | membership flow |

Other main-process facts recovered by REA:

- `protocol.registerSchemesAsPrivileged([...])` for the custom `opgg://` scheme
  with routes `opgg://images/`, `opgg://desktop-position-reset`,
  `opgg://overlay-position-reset`, `opgg://restart-admin`.
- `main/offline.html`, `main/offline_overlay.html`, `main/loading.html`,
  `main/updater.html`, `main/diagnostic.html` are the standalone shells loaded
  for network loss, overlay network loss, boot, update and diagnostics.
- 2 sender-validation observations on the main side — the replica must validate
  `event.senderFrame` for privileged handlers.
