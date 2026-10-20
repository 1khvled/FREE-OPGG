// Inspect the reference i18n bundle and extract a flat key -> value map.
//
// Usage:
//   node tools/rea-i18n.mjs <app.json> [--list <substring>] [--grep <substring>]
//   node tools/rea-i18n.mjs <app.json> --out <file.json>
import { readFileSync, writeFileSync } from "node:fs";

const [, , file, ...flags] = process.argv;
if (!file) {
  console.error("usage: node tools/rea-i18n.mjs <app.json> [--list <sub>] [--grep <sub>] [--out <file>]");
  process.exit(1);
}

const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const doc = JSON.parse(raw);

const flat = new Map();
function walk(node, path) {
  if (node === null || node === undefined) return;
  if (typeof node === "object" && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`));
    return;
  }
  flat.set(path, node);
}
walk(doc, "");

const outIndex = flags.indexOf("--out");
if (outIndex >= 0) {
  const target = flags[outIndex + 1];
  const obj = {};
  for (const [k, v] of [...flat].sort()) obj[k] = v;
  writeFileSync(target, JSON.stringify(obj, null, 2), "utf8");
  console.log(`wrote ${target} (${Object.keys(obj).length} keys)`);
  process.exit(0);
}

const listIndex = flags.indexOf("--list");
const grepIndex = flags.indexOf("--grep");
const needle = listIndex >= 0 ? flags[listIndex + 1] : grepIndex >= 0 ? flags[grepIndex + 1] : "";
const mode = listIndex >= 0 ? "list" : "grep";

console.log(`total keys: ${flat.size}`);
if (!needle) {
  for (const [k] of [...flat].sort().slice(0, 120)) console.log(k);
  process.exit(0);
}

let count = 0;
for (const [k, v] of [...flat].sort()) {
  const hit = mode === "list" ? k.toLowerCase().includes(needle.toLowerCase()) : String(v).toLowerCase().includes(needle.toLowerCase());
  if (hit) {
    console.log(`${k} = ${typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v)}`);
    count += 1;
    if (count >= 400) break;
  }
}
console.log(`\n(${count} matches)`);
