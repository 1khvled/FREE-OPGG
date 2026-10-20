// Pin every OP.GG image URL to the CDN's `latest` segment.
//
// The CDN publishes `/meta/images/lol/{version}/…` per release but lags the
// Data Dragon version, so a version-pinned champion path answers 403 until
// the CDN catches up. `latest` always resolves to what has been published.
//
// Usage: node tools/pin-cdn-latest.mjs <file>
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2] || "main/ipc/opgg.js";
let source = readFileSync(file, "utf8");

const before = source;
source = source.replace(/\$\{CDN_ROOT\}\/\$\{version\}/g, "${CDN_ROOT}/latest");
source = source.replace(
  /const CDN_ROOT = 'https:\/\/opgg-static\.akamaized\.net\/meta\/images\/lol(?:\/latest)?';/,
  "const CDN_ROOT = 'https://opgg-static.akamaized.net/meta/images/lol';",
);

writeFileSync(file, source, "utf8");
console.log(`${before === source ? "no change" : "rewritten"}: ${file}`);
