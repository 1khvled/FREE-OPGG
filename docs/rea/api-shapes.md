# Live API shapes (verified against the running API)

Every response below was fetched from the live endpoints while building the
replica. All endpoints are called with the header
`User-Agent: OP.GG Desktop App`, which the reference also sends.

---

## `GET https://lol-api-champion.op.gg/api/GLOBAL/champions/ranked?tier={tier}`

`tier` ∈ `all`, `emerald_plus`, `diamond_plus`, `master_plus`, `grandmaster`,
`challenger`, `platinum_plus`, `gold_plus`, `silver_plus`.

```jsonc
{
  "data": [ {
    "id": 86, "is_rotation": false, "is_rip": false,
    "average_stats": {
      "play": 166224, "win_rate": 0.504777, "pick_rate": 0.0673965,
      "ban_rate": 0.044555, "kda": 1.819111, "tier": 3, "rank": 42,
      "tier_data": { "tier": 3, "rank": 42, "rank_prev": 41, "rank_prev_patch": 33 }
    },
    "positions": [ {
      "name": "TOP",                       // TOP | JUNGLE | MID | ADC | SUPPORT
      "stats": {
        "play": 150925, "win_rate": 0.506251, "pick_rate": 0.0615279,
        "role_rate": 0.907962, "ban_rate": 0.0445094, "kda": 1.792694,
        "tier_data": { "tier": 1, "rank": 6, "rank_prev": 5, "rank_prev_patch": 2 }
      },
      "roles": [ { "name": "FIGHTER", "stats": { "win_rate": 0.481972,
                    "role_rate": 0.413911, "play": 57659, "win": 27790 } } ],
      "counters": [ { "champion_id": 11, "play": 357, "win": 157 } ]
    } ],
    "roles": [ /* same shape */ ]
  } ],
  "meta": { "version": "16.20", "cached_at": "2026-10-21 00:42:22",
            "match_count": 24663589, "analyzed_at": "2026-10-21T00:42:22+09:00" }
}
```

- `tier` is a **number 1..5**; `0` means the "OP" tier. Labels: `OP`, `Tier 1` … `Tier 5`.
- Every rate is a **0..1 ratio**.
- Rank change = `tier_data.rank_prev` − `tier_data.rank`; **positive = moved up**.
  `rank_prev_patch` is a different figure (the rank on the previous patch).
- `positions` only lists the lanes a champion is played in. For an off-meta
  lane, fall back to `average_stats` — the reference still lists the champion.
- `counters` carry only `{ champion_id, play, win }`. Counter win rate is
  `win / play`; the name must be resolved from the champion id.

## `GET https://lol-api-champion.op.gg/api/GLOBAL/champions/aram/`

Same envelope, but `positions` is `null` and `ban_rate` is `null`.

```jsonc
{ "id": 86,
  "average_stats": { "play": 70921, "win_rate": 0.512951, "pick_rate": 0.0625413,
                     "ban_rate": null, "kda": 2.846225, "tier": 2, "rank": 44,
                     "tier_data": { "tier": 2, "rank": 44, "rank_prev": 44, "rank_prev_patch": 49 } },
  "positions": null,
  "roles": [ { "name": "TANK", "stats": { "win_rate": 0.495178, "role_rate": 0.569668,
                "play": 37536, "win": 18587 } } ] }
```

## `GET https://lol-api-champion.op.gg/api/GLOBAL/champions/arena/`

Arena / Mayhem. Counts, not rates — the client must derive the rates.

```jsonc
{ "id": 86, "is_rotation": false, "is_rip": false,
  "average_stats": {
    "win": 43583, "play": 83264, "total_place": 284326, "first_place": 14385,
    "pick_rate": 0.110745, "ban_rate": 0.0504778,
    "kills": 728711, "assists": 818261, "deaths": 601056,
    "tier": 2, "rank": 49,
    "tier_data": { "tier": 2, "rank": 49, "rank_prev": 49, "rank_prev_patch": 30 } } }
```

- win rate = `win / play`
- average place = `total_place / play`
- first-place % = `first_place / play`

## `GET https://lol-api-champion.op.gg/api/GLOBAL/champions/ranked/{champId}/{position}?tier={tier}&is_more=true`

Champion detail. `data` keys:

```
summary, summoner_spells, core_items, mythic_items, boots, starter_items,
last_items, rune_pages, runes, skill_masteries, skills, skill_evolves,
trends, game_lengths, counters, single_items, combination_items, single_runes
```

```jsonc
"core_items":    [ { "ids": [6631, 3046, 3033], "play": 21921, "win": 12051, "pick_rate": 0.2306 } ]
"boots":         [ { "ids": [3006],       "play": 90268, "win": 46525, "pick_rate": 0.6672 } ]
"starter_items": [ { "ids": [1054, 2003], "play": 79435, "win": 39803, "pick_rate": 0.5682 } ]
"summoner_spells": [ { "ids": [4, 14], "win": 66023, "play": 129912, "pick_rate": 0.9243 } ]

"rune_pages": [ { "id": 8010, "primary_page_id": 8000, "secondary_page_id": 8200,
                  "play": 72104, "win": 36699, "pick_rate": 0.5017,
                  "builds": [ { "id": 8010, "primary_page_id": 8000,
                                "primary_rune_ids": [8010, 9111, 9105, 8299],
                                "secondary_page_id": 8200,
                                "secondary_rune_ids": [8224, 8234],
                                "stat_mod_ids": [5008, 5008, 5001],
                                "play": 56219, "win": 28490, "pick_rate": 0.7797 } ] } ] ]

"skills": [ { "order": ["E","Q","W","E","E","R","E","Q","E","Q","R","Q","Q","W","W"],
              "play": 60140, "win": 32549, "pick_rate": 0.5607 } ]

"counters": [ { "champion_id": 24, "play": 5966, "win": 3320 } ]

"trends": [ { "total_rank": 250, "total_position_rank": 62,
              "win": [ { "version": "16.20", "rate": 0.5063, "rank": 20, "created_at": "..." },
                       { "version": "16.19", "rate": 0.5071, "rank": 20, ... } ] } ]
```

- Rune ids are Data Dragon perk ids. `primary_rune_ids[0]` is the keystone,
  the next three are the primary tree rows; `secondary_rune_ids` are the two
  secondary rows; `stat_mod_ids` are the three stat shards.
- `skills[].order` is the 15-slot skill-point sequence.
- `summary` is one row of the ranked tier list.

## `GET https://lol-api-champion.op.gg/api/meta/champion-names?hl=en_US`

```json
{ "data": [ { "id": 1, "name": "Annie" } ] }
```

## `GET https://lol-api-champion.op.gg/api/meta/augments`

```jsonc
{ "data": [ {
  "id": 1, "name": "Accelerating Sorcery", "key": "AcceleratingSorcery",
  "largeIcon": "https://opgg-static.akamaized.net/meta/images/lol/latest/augment/acceleratingsorcery_large.png",
  "smallIcon": "https://opgg-static.akamaized.net/meta/images/lol/latest/augment/acceleratingsorcery_small.png",
  "rarity": 8,
  "desc": "Using Abilities grant you stacking Ability Haste. This resets each round.",
  "tooltip": "Using an Ability grants ? Ability Haste, stacking infinitely, this resets each round."
} ] }
```

`rarity` is numeric; the reference's tiers are Prismatic / Gold / Silver.

---

## Summoner API (`https://lol-api-summoner.op.gg`)

### Resolve a Riot ID

```
GET /api/v2/{region}/summoners?riot_id={urlencoded gameName#tagLine}
```

```json
{ "data": [ { "puuid": "...", "game_name": "...", "tagline": "..." } ],
  "meta": { "current_page": 1, "from": 0, "last_page": 0, "per_page": 10, "to": 10, "total": 0 } }
```

`data` may hold several entries (Riot IDs are not unique) — the reference picks
the entry whose `game_name` **and** `tagline` match the query exactly.

### Profile

```
GET /api/v3/{region}/summoners/{puuid}?hl={locale}
```
→ `{ "data": { ...profile } }`

### Match history

```
GET /api/v3/{region}/summoners/{puuid}/games?game_type=TOTAL&limit=20&hl={locale}
```
→ `{ "data": { "games": [ ... ] } }`

### Keyword search

```
GET /api/meta/keywords?hl={locale}
```

---

## Image URLs

**These were HTTP-verified.** The paths that read as "obvious" from the
web app are dead on the CDN the desktop app actually uses.

| Asset | Working URL | Notes |
| --- | --- | --- |
| Champion portrait | `https://opgg-static.akamaized.net/meta/images/lol/latest/champion/{Key}.png?image=c_scale,q_auto,w_{32\|46\|48}` | `{Key}` is the Data Dragon square name (`Aatrox`, `Akali`). The `.../images/champions/{Key}.png` path returns **403**. |
| Item | `https://opgg-static.akamaized.net/meta/images/lol/latest/item/{id}.png` | |
| Summoner spell | `https://opgg-static.akamaized.net/meta/images/lol/latest/spell/{Key}.png` | e.g. `SummonerFlash.png` |
| Profile icon | `https://opgg-static.akamaized.net/meta/images/profile_icons/profileIcon{id}.jpg` | **`.jpg`**, and under `meta/images`, not `images` |
| Data Dragon champion | `https://ddragon.leagueoflegends.com/cdn/16.20.1/img/champion/{Key}.png` | needs the **full** version — `cdn/latest` returns 403 |

Perk icons are not on the `meta` CDN under `perk-styles`; use the
`src/data/runes.js` registry, which maps OP.GG's own perk ids to names and
keys, and the Data Dragon `perk-styles` tree for the image.

---

## League Client (LCU)

`GET https://127.0.0.1:{port}{path}` with
`Authorization: Basic base64("riot:" + token)` and `rejectUnauthorized: false`.

| Purpose | Endpoint |
| --- | --- |
| Session | `/lol-champ-select/v1/session` |
| Ready check | `/lol-matchmaking/v1/ready-check` |
| Accept | `POST /lol-matchmaking/v1/ready-check/accept` |
| Rune pages | `/lol-perks/v1/pages` |
| Item sets | `/lol-item-sets/v1/item-sets/{summonerId}/sets` |
| Bench swap | `POST /lol-champ-select/v1/session/bench/swap/{championId}` |
| Gameflow | `/lol-gameflow/v1/gameflow-phase` |
| Summoner | `/lol-summoner/v1/current-summoner` |
