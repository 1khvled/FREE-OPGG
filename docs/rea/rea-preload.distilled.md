# REA evidence distillation

- evidence_id: `ev_eef81d1270978a6c10fb3460f316859583b0e09ba501da5f5e9e72d514154fba`
- application: `D:\opgg_extracted`
- analysed sources: `assets/main/preload.js`
- unselected inventoried files: 20431
- REA duration: n/a

## REA summary counters

```json
{
  "browser_windows": 0,
  "explicit_web_preferences": 0,
  "preload_entrypoints": 0,
  "context_bridge_apis": 5,
  "exposed_api_members": 77,
  "ipc": {
    "operations": 71,
    "literal_channels": 35,
    "dynamic_channel_operations": 0,
    "renderer_transmissions": 70,
    "renderer_listeners": 1,
    "main_handlers": 0,
    "paired_renderer_transmissions": 0,
    "ambiguous_renderer_transmissions": 0,
    "unpaired_literal_renderer_transmissions": 70
  },
  "sender_validation_observations": 0,
  "utility_processes": 0,
  "resolved_utility_entrypoints": 0,
  "native_addon_bindings": 0,
  "resolved_native_addon_bindings": 0
}
```

## Application-graph observation catalogue (analysed sources only)

- relevant nodes: 6 / 37369

| REA operation | count |
| --- | --- |
| `extract-bundler-module` | 3 |
| `extract-bundler-registration` | 1 |
| `recover-source-module` | 1 |
| `inventory-relevant-file` | 1 |

| graph node kind | count |
| --- | --- |
| `javascript-module` | 4 |
| `javascript-chunk` | 1 |
| `javascript-asset` | 1 |

## Graph relations touching analysed sources

| relation | count |
| --- | --- |
| `contains` | 42 |
| `invokes` | 31 |
| `exposes` | 6 |
| `imports` | 4 |
| `sends` | 3 |
| `loads` | 1 |

## Per-source observations

### `assets/main/preload.js` (6 nodes)

- `javascript-chunk` / `?` — webpack-bootstrap@686:bootstrap@686 {"bundler":"webpack","runtime":"webpack-bootstrap@686","chunk_keys":["bootstrap@686"],"unknown_chunk_keys":0,"runtime_require_name":"t","runtime_module_cache_status":"not-observed","entry_module_keys":["44271"],"unknown_entry_module_keys":0,"async_chunk_keys":[],"unknown_async_chunk_keys":0,"module_count":3}
- `javascript-module` / `?` — assets/main/preload.js {"semantic_role":"source-module","source_sha256":"80da449a0f1cac43b2d6f352e75300314c87bc6b0989586bb3f4790c1cc16a12","logical_module_key":"assets/main/preload.js","module_format":"commonjs","import_relationships":1,"type_relationships":0,"export_relationships":1,"export_names":["default"],"type_export_names":[],"omitted_export_names":0}
- `javascript-module` / `?` — 44271 {"bundler":"webpack","runtime":"webpack-bootstrap@686","chunk_keys":["bootstrap@686"],"module_key":"44271","factory_require_name":"t","runtime_entry":true,"source_sha256":"0628640a375cd82421ce29cc25dbdc404b40cffb9e515acfb8c89074f744e328","structural_fingerprint_sha256":"f4cae5c94d30404fb18e5f8be3fd6459b5b2444ecb7c10e7437c80926a248fba","structural_fingerprint_algorithm":"babel-ast-v3","exports":[]}
- `javascript-module` / `?` — 79654 {"bundler":"webpack","runtime":"webpack-bootstrap@686","chunk_keys":["bootstrap@686"],"module_key":"79654","factory_require_name":null,"runtime_entry":false,"source_sha256":"929ed95a14fbea56e0f65173a27b45722268989eae142357e13db0ec0286b5a8","structural_fingerprint_sha256":"6e9854d22280042f70742aeace8b9cba9c688ad97dda508e5c48a52ef444d080","structural_fingerprint_algorithm":"babel-ast-v3","exports":[]}
- `javascript-asset` / `?` — assets/main/preload.js {"bytes":14057,"inventory_artifact_id":"art_2737465d2a9ff24be854091d231bccc16d6b47efe1547a9b8feee52c96cfd5f2","unpacked":false,"file_kind":"javascript","text_status":"included","parse_status":"partial","json_parse_status":null,"json_top_level_keys":[],"omitted_json_top_level_keys":0,"vendor_markers":[]}
- `javascript-module` / `?` — 84157 {"bundler":"webpack","runtime":"webpack-bootstrap@686","chunk_keys":["bootstrap@686"],"module_key":"84157","factory_require_name":null,"runtime_entry":false,"source_sha256":"5dbe9b8d9a31c45215b9024254f2a7dd08b208bbac8ee38f9c5c04f03767da5e","structural_fingerprint_sha256":"6ab8a59d8c384a0eeccb3750a11a0bfbc9d80df748bac294f3ed5c3e417b0c8a","structural_fingerprint_algorithm":"babel-ast-v3","exports":[]}

## Semantic roles recovered (analysed modules only)

| role_key | count |
| --- | --- |
| `timer:schedule:13350:13407` | 1 |
| `electron-path:d7ead7eabd8efa14da936a1efa595b0d0216c5e1e2cb377eb9b3d2bed6e5fa16:0` | 1 |
| `electron-path:ecbf0ef42e254d4cdda871d3562c6b7648a12b386665a67d814d9a7d42ca34b0:0` | 1 |
| `reference:362:read:e` | 1 |
| `argument:call:call:7462:7482:1` | 1 |
| `reference:218:read:Object` | 1 |
| `definition:scope:function:1410:2220:binding:u:1` | 1 |
| `object:read:1132:1136` | 1 |
| `reference:189:read:o` | 1 |
| `definition:scope:function:762:1049:binding:e:0` | 1 |
| `definition:scope:function:2259:2450:binding:r:0` | 1 |
| `reference:552:read:o` | 1 |
| `object:read:1981:1988` | 1 |
| `object:read:2600:2606` | 1 |
| `property:["scope:function:705:13636:binding:C",["CONNECT"]]` | 1 |
| `reference:517:read:e` | 1 |
| `call:call:call:13372:13401` | 1 |
| `call:call:call:4955:5924` | 1 |
| `object:read:11432:11440` | 1 |
| `call:call:call:5505:5533` | 1 |
| `definition:scope:function:13851:13983:binding:i:0` | 1 |
| `callable:function:9661:9721:return:1:9672:1:9720` | 1 |
| `argument:call:call:7965:7996:0` | 1 |
| `reference:79:read:Symbol` | 1 |
| `call:call:call:6413:6451` | 1 |
| `definition:scope:function:705:13636:binding:s:0` | 1 |
| `property:["scope:function:705:13636:binding:h",["STATUS"]]` | 1 |
| `reference:597:read:u` | 1 |
| `argument:call:call:6146:6166:0` | 1 |
| `argument:call:call:8368:8380:0` | 1 |
| `reference:372:read:n` | 1 |
| `reference:263:read:n` | 1 |
| `argument:call:call:6413:6451:3` | 1 |
| `reference:280:read:t` | 1 |
| `definition:scope:function:1076:2230:binding:o:0` | 1 |
| `call:call:call:10745:10786` | 1 |
| `call:call:call:11649:11921` | 1 |
| `callable:function:2259:2450:return:1:2400:1:2449` | 1 |
| `reference:584:read:arguments` | 1 |
| `binding:scope:function:12471:12650:binding:n` | 1 |
| `argument:call:call:3551:3659:0` | 1 |
| `object:read:10970:10974` | 1 |
| `argument:call:call:7638:7658:0` | 1 |
| `electron-path:667a69afa0469c36a93d9109721a53fe50d97ac437d4241f556182601bddc80a:2` | 1 |
| `argument:call:call:10244:10323:0` | 1 |
| `argument:call:call:6032:6070:2` | 1 |
| `argument:call:call:1179:1249:0` | 1 |
| `object:read:12309:12323` | 1 |
| `argument:call:call:5568:5597:0` | 1 |
| `argument:call:call:6647:6686:0` | 1 |
| `callable:function:8387:8420:return:1:8399:1:8419` | 1 |
| `argument:call:call:13595:13629:0` | 1 |
| `binding:scope:function:2259:2450:binding:r` | 1 |
| `callable:callable:function:6701:6760` | 1 |
| `binding:scope:function:6918:6999:binding:e` | 1 |
| `reference:573:read:e` | 1 |
| `reference:81:read:t` | 1 |
| `definition:scope:function:7719:7826:binding:e:0` | 1 |
| `object:read:1708:1715` | 1 |
| `call:call:call:13146:13166` | 1 |

| semantic relation | count |
| --- | --- |
| `aliases (candidate)` | 2950 |
| `reads (resolved)` | 564 |
| `captures (resolved)` | 309 |
| `defines (resolved)` | 253 |
| `reads-property (candidate)` | 242 |
| `aliases (resolved)` | 87 |
| `argument-to-parameter (resolved)` | 77 |
| `calls (resolved)` | 47 |
| `calls (candidate)` | 46 |
| `returns-to-call (resolved)` | 43 |
| `writes (resolved)` | 34 |
| `argument-to-parameter (candidate)` | 21 |
| `writes-property (candidate)` | 18 |
| `returns-to-call (candidate)` | 7 |
| `registers-listener (resolved)` | 4 |
| `removes-listener (candidate)` | 3 |
| `writes-property (resolved)` | 3 |
| `registers-listener (candidate)` | 2 |
| `removes-listener (resolved)` | 2 |
| `schedules-timer (resolved)` | 1 |
| `creates-promise (candidate)` | 1 |
| `creates-promise (resolved)` | 1 |

## Electron boundary paths (context bridge / API surface)

- `api.openExternal` @ `assets/main/preload.js`
- `app.ga.props` @ `assets/main/preload.js`
- `app.heroCustom.pickImage` @ `assets/main/preload.js`
- `app.heroCustom.pruneImages` @ `assets/main/preload.js`
- `app.isAdmin` @ `assets/main/preload.js`
- `recorderApi.cancelAimRuntimeAssets` @ `assets/main/preload.js`
- `recorderApi.detectPreviewTargetRgba` @ `assets/main/preload.js`
- `recorderApi.detectTarget` @ `assets/main/preload.js`
- `recorderApi.detectTargetRgba` @ `assets/main/preload.js`
- `recorderApi.ensureAimRuntimeAssets` @ `assets/main/preload.js`
- `recorderApi.getAimRuntimeAssetsPlan` @ `assets/main/preload.js`
- `recorderApi.getAimRuntimeAssetsStatus` @ `assets/main/preload.js`
- `recorderApi.getDefaultSaveDirectory` @ `assets/main/preload.js`
- `recorderApi.getLatestVideo` @ `assets/main/preload.js`
- `recorderApi.getNativeCombatReviewFrame` @ `assets/main/preload.js`
- `recorderApi.getRecordingTarget` @ `assets/main/preload.js`
- `recorderApi.getSaveDirectory` @ `assets/main/preload.js`
- `recorderApi.getVideoSource` @ `assets/main/preload.js`
- `recorderApi.listVideos` @ `assets/main/preload.js`
- `recorderApi.openSaveDirectory` @ `assets/main/preload.js`
- `recorderApi.pickSaveDirectory` @ `assets/main/preload.js`
- `recorderApi.readShotImages` @ `assets/main/preload.js`
- `recorderApi.readVideo` @ `assets/main/preload.js`
- `recorderApi.removeAimRuntimeAssets` @ `assets/main/preload.js`
- `recorderApi.saveCombatReviewSession` @ `assets/main/preload.js`
- `recorderApi.saveLiveShotSession` @ `assets/main/preload.js`
- `recorderApi.saveShotCrops` @ `assets/main/preload.js`
- `recorderApi.saveVideo` @ `assets/main/preload.js`
- `recorderApi.startClickTracking` @ `assets/main/preload.js`
- `recorderApi.startNativeCombatReviewCapture` @ `assets/main/preload.js`
- `recorderApi.stopClickTracking` @ `assets/main/preload.js`
- `recorderApi.stopNativeCombatReviewCapture` @ `assets/main/preload.js`
- `recorderApi.warmPreviewDetector` @ `assets/main/preload.js`
- `RevEngine.loadFile` @ `assets/main/preload.js`
- `RevEngine.pslist` @ `assets/main/preload.js`

## Exported names


## Constant-style property slots (IPC channel / event names)

- `APPLY_PERK_PAGES`
- `APP_STATUS`
- `APP_UPDATE_CHECK`
- `APP_UPDATE_MANUAL`
- `CHECK_INSTALLED`
- `CLEAR`
- `CONNECT`
- `DELETE`
- `ENABLE_GUEST`
- `EXECUTE`
- `EXPORT`
- `FILE_CACHE`
- `GET`
- `GET_AUTO_UPLOAD_ENABLED`
- `GET_CURRENT_GAMEFLOW`
- `GET_END_OF_GAME_STATS`
- `GET_PERK_PAGES`
- `GET_QUICK_PLAY_METADATA`
- `GET_SUMMONER_BY_IDS`
- `INIT`
- `LIST_APPLICATION_WINDOWS`
- `LIST_HISTORY_SAVES`
- `LOCAL_STORE`
- `LOGOUT`
- `MEMBER`
- `MEMBERSHIP_TRIAL_STATUS`
- `OPEN_DIRECTORY`
- `OPEN_PURCHASE_WINDOW`
- `OPEN_URL_WITH_MEMBER`
- `OPGG_APP_ACTION`
- `OPGG_APP_REQUEST`
- `REMOVE`
- `SCREENSHOT`
- `SENTRY_RELEASE`
- `SET`
- `SET_AUTO_UPLOAD_ENABLED`
- `SET_ENABLED`
- `SET_QUICK_PLAY_METADATA`
- `SET_USER_SCALE`
- `SET_USER_SCALE_FORCED`
- `STATUS`
- `SYNC`
- `SYNC_COOKIES`
- `SYNC_EVENT`
- `UPDATE_PERK_PAGES`
- `USE_UNIFIED_ID`
- `WRITE_APPLICATION_WINDOW`

## Named semantic symbols (analysed modules)

- `A` — binding @ `assets/main/preload.js`
- `A` — expression @ `assets/main/preload.js`
- `A` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `arguments` — expression @ `assets/main/preload.js`
- `Array` — expression @ `assets/main/preload.js`
- `Array` — expression @ `assets/main/preload.js`
- `assets/main/preload.js` — module @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `assignment` — expression @ `assets/main/preload.js`
- `C` — expression @ `assets/main/preload.js`
- `C` — expression @ `assets/main/preload.js`
- `C` — binding @ `assets/main/preload.js`
- `C` — expression @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `call` — call-site @ `assets/main/preload.js`
- `catch` — expression @ `assets/main/preload.js`
- `catch` — expression @ `assets/main/preload.js`
- `catch` — expression @ `assets/main/preload.js`
- `catch` — expression @ `assets/main/preload.js`
- `catch` — expression @ `assets/main/preload.js`
- `catch` — expression @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `closure` — function @ `assets/main/preload.js`
- `console` — expression @ `assets/main/preload.js`
- `console` — expression @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `construct` — call-site @ `assets/main/preload.js`
- `define` — expression @ `assets/main/preload.js`
- `define` — expression @ `assets/main/preload.js`
- `define` — expression @ `assets/main/preload.js`
- `E` — expression @ `assets/main/preload.js`
- `E` — expression @ `assets/main/preload.js`
- `E` — expression @ `assets/main/preload.js`
- `E` — expression @ `assets/main/preload.js`
- `E` — expression @ `assets/main/preload.js`
- `E` — binding @ `assets/main/preload.js`
- `E` — expression @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.invoke` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.send` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.send` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.send` — call-site @ `assets/main/preload.js`
- `electron.ipcRenderer.sendSync` — call-site @ `assets/main/preload.js`
- `Error` — expression @ `assets/main/preload.js`
- `Error` — expression @ `assets/main/preload.js`
- `Error` — expression @ `assets/main/preload.js`
- `event` — event @ `assets/main/preload.js`
- `event` — event @ `assets/main/preload.js`
- `event` — event @ `assets/main/preload.js`
- `exports` — expression @ `assets/main/preload.js`
- `exports` — expression @ `assets/main/preload.js`
- `exports` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `function` — expression @ `assets/main/preload.js`
- `global` — expression @ `assets/main/preload.js`
- `global` — expression @ `assets/main/preload.js`
- `global` — expression @ `assets/main/preload.js`
- `globalThis` — expression @ `assets/main/preload.js`
- `globalThis` — expression @ `assets/main/preload.js`
- `Iterator` — expression @ `assets/main/preload.js`
- `Iterator` — expression @ `assets/main/preload.js`
- `module` — expression @ `assets/main/preload.js`
- `module` — expression @ `assets/main/preload.js`
- `O` — binding @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `O` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `Object` — expression @ `assets/main/preload.js`
- `off:listener` — listener @ `assets/main/preload.js`
- `off:listener` — listener @ `assets/main/preload.js`
- `on` — listener @ `assets/main/preload.js`
- `on` — listener @ `assets/main/preload.js`
- `on:listener` — listener @ `assets/main/preload.js`
- `on:listener` — listener @ `assets/main/preload.js`
- `on:RECV` — listener @ `assets/main/preload.js`
- `once:loaded` — listener @ `assets/main/preload.js`
- `P` — binding @ `assets/main/preload.js`
- `P` — expression @ `assets/main/preload.js`
- `P` — expression @ `assets/main/preload.js`
- `P` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `parameter` — expression @ `assets/main/preload.js`
- `process` — expression @ `assets/main/preload.js`
- `process` — expression @ `assets/main/preload.js`
- `Promise` — expression @ `assets/main/preload.js`
- `Promise` — expression @ `assets/main/preload.js`
- `Promise.new` — promise @ `assets/main/preload.js`
- `Promise.then` — promise @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read` — expression @ `assets/main/preload.js`
- `read:/__awaiter` — expression @ `assets/main/preload.js`
- `read:/__generator` — expression @ `assets/main/preload.js`
- `read:/__spreadArray` — expression @ `assets/main/preload.js`
- `read:/_sentryDebugIds` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/0` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/1` — expression @ `assets/main/preload.js`
- `read:/2` — expression @ `assets/main/preload.js`
- `read:/2` — expression @ `assets/main/preload.js`
- `read:/2` — expression @ `assets/main/preload.js`
- `read:/3` — expression @ `assets/main/preload.js`
- `read:/amd` — expression @ `assets/main/preload.js`
- `read:/APP_STATUS` — expression @ `assets/main/preload.js`
- `read:/APP_STATUS` — expression @ `assets/main/preload.js`
- `read:/APP_STATUS` — expression @ `assets/main/preload.js`
- `read:/APP_STATUS` — expression @ `assets/main/preload.js`
- `read:/APP_UPDATE_CHECK` — expression @ `assets/main/preload.js`
- `read:/APP_UPDATE_MANUAL` — expression @ `assets/main/preload.js`
- `read:/applicationName` — expression @ `assets/main/preload.js`
- `read:/applicationName` — expression @ `assets/main/preload.js`
- `read:/apply` — expression @ `assets/main/preload.js`
- `read:/apply` — expression @ `assets/main/preload.js`
- `read:/APPLY_PERK_PAGES` — expression @ `assets/main/preload.js`
- `read:/call` — expression @ `assets/main/preload.js`
- `read:/call` — expression @ `assets/main/preload.js`
- `read:/call` — expression @ `assets/main/preload.js`
- `read:/captureMode` — expression @ `assets/main/preload.js`
- `read:/captureMode` — expression @ `assets/main/preload.js`
- `read:/CHECK_INSTALLED` — expression @ `assets/main/preload.js`
- `read:/CLEAR` — expression @ `assets/main/preload.js`
- `read:/CLEAR` — expression @ `assets/main/preload.js`
- `read:/concat` — expression @ `assets/main/preload.js`
- `read:/CONNECT` — expression @ `assets/main/preload.js`
- `read:/contextBridge` — expression @ `assets/main/preload.js`
- `read:/create` — expression @ `assets/main/preload.js`
- `read:/DELETE` — expression @ `assets/main/preload.js`
- `read:/DELETE` — expression @ `assets/main/preload.js`
- `read:/done` — expression @ `assets/main/preload.js`
- `read:/done` — expression @ `assets/main/preload.js`
- `read:/ENABLE_GUEST` — expression @ `assets/main/preload.js`
- `read:/engagements` — expression @ `assets/main/preload.js`
- `read:/engagements` — expression @ `assets/main/preload.js`
- `read:/error` — expression @ `assets/main/preload.js`
- `read:/error` — expression @ `assets/main/preload.js`
- `read:/error` — expression @ `assets/main/preload.js`
- `read:/Error` — expression @ `assets/main/preload.js`
- `read:/eventNames` — expression @ `assets/main/preload.js`
- `read:/EXECUTE` — expression @ `assets/main/preload.js`
- `read:/EXPORT` — expression @ `assets/main/preload.js`
- `read:/EXPORT` — expression @ `assets/main/preload.js`
- `read:/exports` — expression @ `assets/main/preload.js`
- `read:/exports` — expression @ `assets/main/preload.js`
- `read:/exports` — expression @ `assets/main/preload.js`
- `read:/exports` — expression @ `assets/main/preload.js`
- `read:/exposeInMainWorld` — expression @ `assets/main/preload.js`
- `read:/exposeInMainWorld` — expression @ `assets/main/preload.js`
- `read:/exposeInMainWorld` — expression @ `assets/main/preload.js`
- `read:/exposeInMainWorld` — expression @ `assets/main/preload.js`
- `read:/exposeInMainWorld` — expression @ `assets/main/preload.js`
- `read:/FILE_CACHE` — expression @ `assets/main/preload.js`
- `read:/FILE_CACHE` — expression @ `assets/main/preload.js`
- `read:/FILE_CACHE` — expression @ `assets/main/preload.js`
- `read:/FILE_CACHE` — expression @ `assets/main/preload.js`
- `read:/filter` — expression @ `assets/main/preload.js`
- `read:/forEach` — expression @ `assets/main/preload.js`
- `read:/forEach` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/freeze` — expression @ `assets/main/preload.js`
- `read:/GET` — expression @ `assets/main/preload.js`
- `read:/GET` — expression @ `assets/main/preload.js`
- `read:/GET` — expression @ `assets/main/preload.js`
- `read:/GET` — expression @ `assets/main/preload.js`
- `read:/GET_AUTO_UPLOAD_ENABLED` — expression @ `assets/main/preload.js`
- `read:/GET_CURRENT_GAMEFLOW` — expression @ `assets/main/preload.js`
- `read:/GET_END_OF_GAME_STATS` — expression @ `assets/main/preload.js`
- `read:/GET_PERK_PAGES` — expression @ `assets/main/preload.js`
- `read:/GET_QUICK_PLAY_METADATA` — expression @ `assets/main/preload.js`
- `read:/GET_SUMMONER_BY_IDS` — expression @ `assets/main/preload.js`
- `read:/id` — expression @ `assets/main/preload.js`
- `read:/includes` — expression @ `assets/main/preload.js`
- `read:/INIT` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke` — expression @ `assets/main/preload.js`
- `read:/invoke/apply` — expression @ `assets/main/preload.js`
- `read:/invoke/apply` — expression @ `assets/main/preload.js`
- `read:/invoke/apply` — expression @ `assets/main/preload.js`
- `read:/invoke/apply` — expression @ `assets/main/preload.js`
- `read:/ipcRenderer` — expression @ `assets/main/preload.js`
- `read:/iterator` — expression @ `assets/main/preload.js`
- `read:/label` — expression @ `assets/main/preload.js`
- `read:/label` — expression @ `assets/main/preload.js`
- `read:/label` — expression @ `assets/main/preload.js`
- `read:/label` — expression @ `assets/main/preload.js`
- `read:/label` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/length` — expression @ `assets/main/preload.js`
- `read:/LIST_APPLICATION_WINDOWS` — expression @ `assets/main/preload.js`
- `read:/LIST_HISTORY_SAVES` — expression @ `assets/main/preload.js`
- `read:/LOCAL_STORE` — expression @ `assets/main/preload.js`
- `read:/LOCAL_STORE` — expression @ `assets/main/preload.js`
- `read:/LOCAL_STORE` — expression @ `assets/main/preload.js`
- `read:/LOCAL_STORE` — expression @ `assets/main/preload.js`
- `read:/loginRequired` — expression @ `assets/main/preload.js`
- `read:/LOGOUT` — expression @ `assets/main/preload.js`
- `read:/LOGOUT` — expression @ `assets/main/preload.js`
- `read:/ME` — expression @ `assets/main/preload.js`
- `read:/MEMBER` — expression @ `assets/main/preload.js`
- `read:/MEMBERSHIP_TRIAL_STATUS` — expression @ `assets/main/preload.js`
- `read:/next` — expression @ `assets/main/preload.js`
- `read:/next` — expression @ `assets/main/preload.js`
- `read:/next` — expression @ `assets/main/preload.js`
- `read:/off` — expression @ `assets/main/preload.js`
- `read:/off` — expression @ `assets/main/preload.js`
- `read:/on` — expression @ `assets/main/preload.js`
- `read:/on` — expression @ `assets/main/preload.js`
- `read:/on` — expression @ `assets/main/preload.js`
- `read:/on` — expression @ `assets/main/preload.js`
- `read:/on` — expression @ `assets/main/preload.js`
- `read:/once` — expression @ `assets/main/preload.js`
- `read:/OPEN_DIRECTORY` — expression @ `assets/main/preload.js`
- `read:/OPEN_PURCHASE_WINDOW` — expression @ `assets/main/preload.js`
- `read:/OPEN_URL_WITH_MEMBER` — expression @ `assets/main/preload.js`
- `read:/OPEN_URL_WITH_MEMBER` — expression @ `assets/main/preload.js`
- `read:/OPGG_APP_ACTION` — expression @ `assets/main/preload.js`
- `read:/OPGG_APP_REQUEST` — expression @ `assets/main/preload.js`
- `read:/ops/pop` — expression @ `assets/main/preload.js`
- `read:/ops/pop` — expression @ `assets/main/preload.js`
- `read:/ops/push` — expression @ `assets/main/preload.js`
- `read:/path` — expression @ `assets/main/preload.js`
- `read:/path` — expression @ `assets/main/preload.js`
- `read:/platform` — expression @ `assets/main/preload.js`
- `read:/prototype` — expression @ `assets/main/preload.js`
- `read:/prototype/hasOwnProperty/call` — expression @ `assets/main/preload.js`
- `read:/prototype/slice/call` — expression @ `assets/main/preload.js`
- `read:/prototype/slice/call` — expression @ `assets/main/preload.js`
- `read:/push` — expression @ `assets/main/preload.js`
- `read:/push` — expression @ `assets/main/preload.js`
- `read:/REMOVE` — expression @ `assets/main/preload.js`
- `read:/removeAllListeners` — expression @ `assets/main/preload.js`
- `read:/removeListener` — expression @ `assets/main/preload.js`
- `read:/removeListener` — expression @ `assets/main/preload.js`
- `read:/result` — expression @ `assets/main/preload.js`
- `read:/return` — expression @ `assets/main/preload.js`
- `read:/return` — expression @ `assets/main/preload.js`
- `read:/SCREENSHOT` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/send` — expression @ `assets/main/preload.js`
- `read:/sendSync` — expression @ `assets/main/preload.js`
- `read:/sendSync` — expression @ `assets/main/preload.js`
- `read:/sendSync` — expression @ `assets/main/preload.js`
- `read:/sendSync` — expression @ `assets/main/preload.js`
- `read:/sendSync` — expression @ `assets/main/preload.js`
- `read:/sendSync` — expression @ `assets/main/preload.js`
- `read:/sent` — expression @ `assets/main/preload.js`
- `read:/session` — expression @ `assets/main/preload.js`
- `read:/session` — expression @ `assets/main/preload.js`
- `read:/SET` — expression @ `assets/main/preload.js`
- `read:/SET` — expression @ `assets/main/preload.js`
- `read:/SET_AUTO_UPLOAD_ENABLED` — expression @ `assets/main/preload.js`
- `read:/SET_ENABLED` — expression @ `assets/main/preload.js`
- `read:/SET_QUICK_PLAY_METADATA` — expression @ `assets/main/preload.js`
- `read:/SET_USER_SCALE` — expression @ `assets/main/preload.js`
- `read:/SET_USER_SCALE_FORCED` — expression @ `assets/main/preload.js`
- `read:/shotAnalyses` — expression @ `assets/main/preload.js`
- `read:/shotAnalyses` — expression @ `assets/main/preload.js`
- `read:/shotEntries` — expression @ `assets/main/preload.js`
- `read:/shotEntries` — expression @ `assets/main/preload.js`
- `read:/splice` — expression @ `assets/main/preload.js`
- `read:/splice` — expression @ `assets/main/preload.js`
- `read:/stack` — expression @ `assets/main/preload.js`
- `read:/STATUS` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC` — expression @ `assets/main/preload.js`
- `read:/SYNC_COOKIES` — expression @ `assets/main/preload.js`
- `read:/SYNC_EVENT` — expression @ `assets/main/preload.js`
- `read:/then` — expression @ `assets/main/preload.js`
- `read:/throw` — expression @ `assets/main/preload.js`
- `read:/throw` — expression @ `assets/main/preload.js`
- `read:/trys` — expression @ `assets/main/preload.js`
- `read:/trys/pop` — expression @ `assets/main/preload.js`
- `read:/trys/pop` — expression @ `assets/main/preload.js`
- `read:/UPDATE_PERK_PAGES` — expression @ `assets/main/preload.js`
- `read:/USE_UNIFIED_ID` — expression @ `assets/main/preload.js`
- `read:/value` — expression @ `assets/main/preload.js`
- `read:/value` — expression @ `assets/main/preload.js`
- `read:/value` — expression @ `assets/main/preload.js`
- `read:/windowName` — expression @ `assets/main/preload.js`
- `read:/WRITE_APPLICATION_WINDOW` — expression @ `assets/main/preload.js`
- `RECV` — event @ `assets/main/preload.js`
- `removeAllListeners` — listener @ `assets/main/preload.js`
- `removeListener` — listener @ `assets/main/preload.js`
- `removeListener` — listener @ `assets/main/preload.js`
- `require` — expression @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `return` — return-site @ `assets/main/preload.js`
- `S` — binding @ `assets/main/preload.js`
- `S` — expression @ `assets/main/preload.js`
- `self` — expression @ `assets/main/preload.js`
- `self` — expression @ `assets/main/preload.js`
- `setTimeout` — timer @ `assets/main/preload.js`
- `setTimeout` — expression @ `assets/main/preload.js`
- `Symbol` — expression @ `assets/main/preload.js`
- `Symbol` — expression @ `assets/main/preload.js`
- `T` — binding @ `assets/main/preload.js`
- `T` — expression @ `assets/main/preload.js`
- `T` — expression @ `assets/main/preload.js`
- `TypeError` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `variable` — expression @ `assets/main/preload.js`
- `window` — expression @ `assets/main/preload.js`
- `window` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write` — expression @ `assets/main/preload.js`
- `write:/_sentryDebugIdIdentifier` — expression @ `assets/main/preload.js`
- `write:/_sentryDebugIds` — expression @ `assets/main/preload.js`
- `write:/code` — expression @ `assets/main/preload.js`
- `write:/exports` — expression @ `assets/main/preload.js`
- `write:/exports` — expression @ `assets/main/preload.js`
- `write:/exports` — expression @ `assets/main/preload.js`
- `write:/id` — expression @ `assets/main/preload.js`
- `write:/keys` — expression @ `assets/main/preload.js`
- `write:/label` — expression @ `assets/main/preload.js`
- `write:/label` — expression @ `assets/main/preload.js`
- `write:/label` — expression @ `assets/main/preload.js`
- `write:/label` — expression @ `assets/main/preload.js`
- `write:/label` — expression @ `assets/main/preload.js`
- `write:/next` — expression @ `assets/main/preload.js`
- `write:/o` — expression @ `assets/main/preload.js`
- `write:/resolve` — expression @ `assets/main/preload.js`
- `write:/return` — expression @ `assets/main/preload.js`
- `write:/SENTRY_RELEASE` — expression @ `assets/main/preload.js`
- `write:/throw` — expression @ `assets/main/preload.js`

## Unknown families (what REA could not resolve)

| family | count |
| --- | --- |
| `object-flow` | 15117 |
| `data-flow` | 14992 |
| `call-flow` | 14926 |
| `event` | 14777 |
| `promise-ownership` | 14773 |
| `resource-lifecycle` | 14772 |
| `boundary` | 14772 |
| `timer` | 14772 |
| `child-process` | 14772 |
| `request` | 14772 |
| `configuration` | 14772 |
| `closure` | 14772 |

## REA declared limitations

- Caller-selected source analysis leaves 20431 inventoried files outside analysis scope. Inventory identity covers the complete artifact; relationships through unselected sources remain unknown.
- CommonJS and ESM binding relationships were recovered from inert syntax and resolved only within the inventoried artifact container.
- Electron API identity follows proven lexical module aliases and structurally verified module-namespace interop. Other reassignments, dynamic selections, and visibly overwritten namespace members are unresolved; missing findings do not establish absence. Arbitrary call side effects and runtime registration are not evaluated.
- Electron relationships are derived from inert syntax; runtime registration, reachability, defaults, and enforcement remain unproven.
- Graph coverage is incomplete; unavailable facts remain explicit and must not be read as absence.
- JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed.
- Static imports, entrypoints, workers, endpoints, and storage relationships do not prove runtime execution.
- Static paths and relationships may remain unresolved when expressions are dynamic or obfuscated.
- Webpack/Rspack factories were recovered from AST literals; REA did not invoke push handlers or bundle bootstrap code.

## Application-graph limitations

- Caller-selected source analysis leaves 20431 inventoried files outside analysis scope. Inventory identity covers the complete artifact; relationships through unselected sources remain unknown.
- CommonJS and ESM binding relationships were recovered from inert syntax and resolved only within the inventoried artifact container.
- Electron API identity follows proven lexical module aliases and structurally verified module-namespace interop. Other reassignments, dynamic selections, and visibly overwritten namespace members are unresolved; missing findings do not establish absence. Arbitrary call side effects and runtime registration are not evaluated.
- Electron relationships are derived from inert syntax; runtime registration, reachability, defaults, and enforcement remain unproven.
- Graph coverage is incomplete; unavailable facts remain explicit and must not be read as absence.
- JavaScript and HTML were parsed as inert text; bundle bootstrap code was never executed.
- Static imports, entrypoints, workers, endpoints, and storage relationships do not prove runtime execution.
- Static paths and relationships may remain unresolved when expressions are dynamic or obfuscated.
- Webpack/Rspack factories were recovered from AST literals; REA did not invoke push handlers or bundle bootstrap code.
