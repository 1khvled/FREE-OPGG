// Dump the reference application's route table.
//
// Usage: node tools/rea-routes.mjs
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const file = "D:/opgg_extracted/assets/react/DesktopApp.2d31a5dd.bundle.js";
const bytes = readFileSync(file);
const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");

// The route table is a tree of { id, i18nKey, path, subMenu: [...] }.
const routeRe = /\{id:"([^"]+)",i18nKey:"([^"]+)",path:"([^"]+)"(?:,subMenu:\[)?/g;
const seen = new Set();
const rows = [];
let match;
while ((match = routeRe.exec(text)) !== null) {
  const key = `${match[1]}|${match[2]}|${match[3]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  rows.push({ id: match[1], i18nKey: match[2], path: match[3] });
}

console.log("=== reference route table ===");
for (const row of rows) {
  console.log(`  ${row.path.padEnd(34)} ${row.id.padEnd(24)} ${row.i18nKey}`);
}
console.log(`\n${rows.length} routes`);

const lol = rows.filter((r) => r.path.startsWith("/lol"));
console.log(`\n=== League of Legends routes (${lol.length}) ===`);
for (const row of lol) console.log(`  ${row.path.padEnd(34)} ${row.i18nKey}`);
