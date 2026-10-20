// List the reference application's sidebar routes and labels.
//
// Usage: node tools/rea-sidebar.mjs [bundleDir]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const dir = process.argv[2] || "D:/opgg_extracted/assets/react";

let text = "";
for (const name of readdirSync(dir)) {
  if (!name.endsWith(".js")) continue;
  const bytes = readFileSync(join(dir, name));
  const source = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString("utf8") : bytes.toString("utf8");
  if (source.includes("side-href-item")) text += `\n/* ${name} */\n${source}`;
}

const routes = [...text.matchAll(/to:"(\/[a-z0-9\-/:]*)"/g)].map((m) => m[1]);
console.log("=== sidebar route targets ===");
for (const r of [...new Set(routes)]) console.log(`  ${r}`);

console.log("\n=== sidebar item labels ===");
const labels = [...text.matchAll(/side-href-item-title[^)]*\)\}\)?,?"([A-Za-z .'\-]{2,40})"/g)].map((m) => m[1]);
for (const l of [...new Set(labels)]) console.log(`  ${l}`);

console.log("\n=== hard-coded sidebar strings ===");
const strings = [...text.matchAll(/"(Tiers|Combos|OP Champions|OP\.GG Pick|Multi-recherche|My info|Spell preference|Builds|Team comps|Game modes|Game stats|My collection|Latest updates|Video content|Combo practice|Champions|Direct)"/g)].map((m) => m[1]);
for (const s of [...new Set(strings)]) console.log(`  ${s}`);
