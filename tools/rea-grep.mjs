// Search the shipped renderer bundles for a pattern, transparently gunzipping
// the compressed ones.
//
// Usage: node tools/rea-grep.mjs <pattern> [fileGlob] [--max 20]
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const argv = process.argv.slice(2);
const pattern = argv[0];
const dir = argv[1] && !argv[1].startsWith("--") ? argv[1] : "D:/opgg_extracted/assets/react";
const maxIndex = argv.indexOf("--max");
const limit = maxIndex >= 0 ? Number(argv[maxIndex + 1]) : 20;

const regex = new RegExp(pattern, "g");
let shown = 0;
let fileHits = 0;

for (const name of readdirSync(dir)) {
  if (!/\.(js|html|css)$/.test(name)) continue;
  let text;
  try {
    const bytes = readFileSync(join(dir, name));
    text = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString("utf8") : bytes.toString("utf8");
  } catch {
    continue;
  }
  const matches = [...text.matchAll(regex)];
  if (!matches.length) continue;
  fileHits += 1;
  console.log(`\n=== ${name} (${matches.length} hits) ===`);
  for (const m of matches.slice(0, limit)) {
    const start = Math.max(0, m.index - 220);
    console.log(`  …${text.slice(start, m.index + 260).replace(/\s+/g, " ")}…`);
    shown += 1;
    if (shown >= limit) break;
  }
  if (shown >= limit) break;
}

if (!fileHits) console.log(`no match for /${pattern}/ in ${dir}`);
