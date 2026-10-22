// Report the i18n keys a shipped bundle references, with the values they map
// to in the reference's English catalogue.
//
// Usage: node tools/rea-bundle-copy.mjs <bundleFile> [prefix]
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const file = process.argv[2];
const prefix = process.argv[3] || "";
const limit = Number(process.argv[4] || 200);

const catalogue = JSON.parse(
  readFileSync("D:/opgg_extracted/assets/i18n/v3/en/app.json", "utf8").replace(/^\uFEFF/, ""),
);

const flat = new Map();
(function walk(node, path) {
  if (node && typeof node === "object" && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    return;
  }
  flat.set(path, node);
})(catalogue, "");

const bytes = readFileSync(file);
const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");

const keys = new Set();
for (const match of text.matchAll(/[\w$]{1,3}\("([a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_-]+)+)"\)/g)) {
  keys.add(match[1]);
}

const filtered = [...keys].filter((k) => k.startsWith(prefix)).sort();
for (const key of filtered.slice(0, limit)) {
  console.log(`${key} = ${JSON.stringify(flat.get(key))}`);
}
console.log(`\n${filtered.length} key(s) under "${prefix}"`);
