# Evidence bundle

Everything in this folder was recovered from the shipped **OP.GG for Desktop
v3.1.4** bundle at `D:\opgg_extracted` with **REA 6.5.0**
(`D:\rea`, `rea-agents@6.5.0`).

| File | What it is | How it was produced |
| --- | --- | --- |
| **`desktop-ui.md`** | **The authoritative 1:1 spec** — shell, sidebar, Champions screen, table geometry, every computed colour and size | The shipped renderer was served locally with a stubbed preload bridge and read live through the DOM + computed styles |
| `design-tokens.md` | Palette, typography scale, spacing, radii, table geometry | REA theme literals from the shipped bundles + a computed-style census of the live tier list |
| `screen-inventory.md` | The reference's screen inventory, chunk map, window topology, `opgg://` routes | Chunk manifest + `webPreferences` extracted from the shipped main process |
| `endpoints.md` | Every live API host and path the reference uses | Host/path extraction from the shipped bundles |
| `ipc-channels.md` | The 357 literal IPC channel strings | Alias-resolved literal extraction from the shipped `main.js` / `preload.js` |
| `i18n.en.json` | 4094 exact UI strings | The shipped i18n bundle, flattened to dotted keys |
| `rea-main.distilled.md` | REA evidence for the main process | `rea analyze-javascript-application --source-path assets/main/main.js --source-path assets/main/preload.js` |
| `rea-preload.distilled.md` | REA evidence for the preload | `rea analyze-javascript-application --source-path assets/main/preload.js` |

## Key REA findings

```
context_bridge_apis            5
exposed_api_members            77
ipc.operations                242
ipc.literal_channels          176
ipc.main_handlers             171
ipc.paired_renderer_transmissions  60
sender_validation_observations    2
```

## Reproducing the analysis

The REA MCP server is registered with OpenCode:

```json
"rea": { "type": "local", "command": ["node", "D:\\rea\\scripts\\rea.mjs", "mcp"] }
```

The CLI works without any registration:

```bash
# static analysis of the shipped app
node D:/rea/scripts/rea.mjs analyze-javascript-application D:/opgg_extracted \
     --source-path assets/main/main.js --source-path assets/main/preload.js \
     --format json --full-output > rea-main.json

# condense it
node D:/open-opgg/tools/rea-distill.mjs D:/opgg_extracted/rea-main.json

# the shipped renderer is stored gzip-compressed
node D:/open-opgg/tools/rea-decompress.mjs D:/opgg_extracted/assets/react D:/opgg_extracted/_decompressed/assets/react

# recover the channel vocabulary
node D:/open-opgg/tools/rea-ipc-channels.mjs D:/opgg_extracted/assets/main/main.js

# search the shipped strings
node D:/open-opgg/tools/rea-i18n.mjs D:/opgg_extracted/assets/i18n/v3/en/app.json --list <substring>
```

## Observing the shipped UI

The shipped renderer is stored gzip-compressed and expects to be served one
directory below its bundles (`../app.17903a6b.js`, webpack `publicPath` is
`../`).

```bash
node tools/serve-renderer.mjs \
  --root D:/opgg_extracted/assets/react \
  --port 8899 --prefix /react \
  --inject D:/open-opgg/tools/bridge-stub.js
# open http://127.0.0.1:8899/react/index.html
```

`tools/bridge-stub.js` stands in for the preload bridge, which the shipped
renderer checks before rendering its desktop-only routes.

The extracted app itself can also be run: it expects the Overwolf SDK to
attach to `electron.app.overwolf`, so `D:\opgg_extracted\_probe_main.js`
provides that stub. With `--remote-debugging-port` the running app can be
driven with `tools/cdp.mjs`.

## Tooling

| Tool | Purpose |
| --- | --- |
| `tools/rea-distill.mjs` | Condense a REA analysis JSON into agent-readable evidence |
| `tools/rea-decompress.mjs` | Gunzip the shipped renderer bundles |
| `tools/rea-ipc-channels.mjs` | Recover the literal channel vocabulary |
| `tools/rea-i18n.mjs` | Flatten and search the shipped i18n bundle |
| `tools/rea-web-capture.mjs` | Extract DOM/screenshot artifacts from a REA browser capture |
| `tools/rea-shape.mjs` | Inspect the shape of a REA result envelope |
| `tools/serve-renderer.mjs` | Serve the shipped renderer for observation |
| `tools/bridge-stub.js` | Stand-in for the preload bridge |
| `tools/cdp.mjs` | Drive a running Electron/Chrome target over CDP |
| `tools/verify-app.mjs` | Launch this app, screenshot it, and report renderer errors |
| `tools/check-syntax.mjs` | Project-wide syntax check |
