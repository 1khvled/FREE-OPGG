// Find which shipped bundles reference a route or i18n key, and print the
// surrounding context.
//
// Usage: node tools/rea-route.mjs <needle> [dir]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const needle = process.argv[2];
const dir = process.argv[3] || "D:/opgg_extracted/assets/react";
const limit = Number(process.argv[4] || 4);

let remaining = limit;
for (const name of readdirSync(dir)) {
  if (!name.endsWith(".js")) continue;
  const bytes = readFileSync(join(dir, name));
  const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");
  if (!text.includes(needle)) continue;

  const index = text.indexOf(needle);
  console.log(`\n=== ${name} (first hit at ${index}) ===`);
  console.log(`  …${text.slice(Math.max(0, index - 420), index + 520).replace(/\s+/g, " ")}…`);

  const apiHits = [...text.matchAll(/"(\/api\/[A-Za-z0-9\/_\-{}.]{2,60})"/g)].map((m) => m[1]);
  if (apiHits.length) {
    console.log(`  api paths: ${[...new Set(apiHits)].slice(0, 20).join(", ")}`);
  }
  remaining -= 1;
  if (remaining <= 0) break;
}
