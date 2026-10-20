# Endpoint catalogue (recovered from the shipped bundles)

Hosts observed in `assets/main/main.js` and `assets/react/LoL*.bundle.js`.

| Host | Role |
| --- | --- |
| `https://lol-api-champion.op.gg` | champion tier lists, builds, runes, matchups |
| `https://lol-api-summoner.op.gg` | summoner profiles, match history, rank |
| `https://desktop-api.op.gg` | desktop-only services (hardware, playtime, obs) |
| `https://desktop-app-data.op.gg` | app data, i18n bundles, offsets, runtime assets |
| `https://desktop-app-data.s3.ap-northeast-2.amazonaws.com/desktop/app/` | app data bucket |
| `https://desktop-patch.op.gg/update/` | update manifest |
| `https://op.gg/desktop/`, `https://op.gg/desktop/app/` | desktop landing pages |
| `https://stats-platform-api.op.gg/graphql` | GraphQL stats (also `-alpha`, `-stage`) |
| `https://member.op.gg`, `https://member-api.op.gg` | membership / trial |
| `https://tft-api.op.gg/api/v3/` | TFT meta (out of LoL scope) |
| `https://ddragon.leagueoflegends.com` | Riot Data Dragon |
| `https://opgg-static.akamaized.net` | champion / item / rune image CDN |

## Champion API (`lol-api-champion.op.gg`)

Recovered paths and the parameter sets the reference uses:

| Path | Notes |
| --- | --- |
| `/api/meta/champion-names` | champion id → name map; `?hl=en_US` |
| `/api/meta/versions` | data-dragon version list |
| `/api/meta/aram-augments` | ARAM augment catalogue |
| `/api/GLOBAL/champions/ranked` | ranked tier list; `?tier=emerald_plus\|diamond_plus\|master_plus\|all` |
| `/api/GLOBAL/champions/aram/` | ARAM tier list |
| `/api/GLOBAL/champions/arena/` | Arena / Mayhem tier list |
| `/api/GLOBAL/champions/arena/{champId}` | arena detail — augments, prism items, synergies |
| `/api/GLOBAL/champions/{mode}/{champId}/{position}` | build + runes; `?tier=&is_more=true` |
| `/api/meta/augments` | augment catalogue |

Observed `tier` values: `all`, `emerald_plus`, `diamond_plus`, `master_plus`,
plus `grandmaster`, `challenger`, `platinum_plus`, `gold_plus`, `silver_plus`.
Observed regions: `GLOBAL`, `KR`, `NA`, `EUW`, `EUNE`, `OCE`, `BR`, `JP`, `LAN`, `LAS`.

## Summoner API (`lol-api-summoner.op.gg`)

| Path | Notes |
| --- | --- |
| `/api/member/summoners` | summoner search by name |
| `/api/summoners/{region}/{gameName}/{tagLine}` | profile |
| `/api/summoners/{region}/{gameName}/{tagLine}/match-history` | match history |

## Desktop API (`desktop-api.op.gg`)

| Path | Notes |
| --- | --- |
| `/api/v1/hardware/` | hardware profile |
| `/api/v1/` | base path for desktop services |
| `/game/playtime/log` | playtime reporting |
| `/game/maple/budget` | data budget |
| `/obs` | observability |
| `/stat/game/list` | game list |

## GraphQL (`stats-platform-api.op.gg/graphql`)

Used for match-level statistics. Environment variants observed:
`-alpha`, `-stage`.

## Static / CDN

| Path | Notes |
| --- | --- |
| `https://desktop-app-data.op.gg/app/i18n/` | i18n bundles (v3, per locale) |
| `https://desktop-app-data.op.gg/app/offsets/offsets.json` | memory offsets per game |
| `https://desktop-app-data.op.gg/runtime-assets` | overlay runtime assets |
| `https://desktop-app-data.op.gg/valorant.txt` | version marker (out of scope) |

## Tracking (the replica omits all of it)

The shipped app contains Google Analytics, Google Tag Manager, Rybbit and Sentry
endpoints. The clean-room replica **does not** ship any telemetry, ad or
crash-reporting SDK. Record this as a deliberate divergence, not an omission.

## Localisation

The reference ships its own i18n bundles:

- `assets/i18n/locales/{de,en,es,fr,ja,kr,pl,pt,ru,sc,tc,tr}.json`
- `assets/i18n/v3/<locale>/app.json` (24 locales)

`assets/i18n/ddragon.js` maps Data Dragon locales.
