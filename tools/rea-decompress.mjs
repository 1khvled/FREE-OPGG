// Decompress gzip-compressed OP.GG renderer bundles into a readable mirror tree.
//
// The shipped `assets/react/*.js` files are gzip streams (magic 1f 8b) that the
// desktop shell serves with Content-Encoding: gzip. Static analysis needs the
// decoded text, so this mirrors the tree into a sibling directory.
//
// Usage: node tools/rea-decompress.mjs <srcDir> <outDir>
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { gunzipSync } from "node:zlib";

const [, , srcDir, outDir] = process.argv;
if (!srcDir || !outDir) {
  console.error("usage: node tools/rea-decompress.mjs <srcDir> <outDir>");
  process.exit(1);
}

const GZIP = Buffer.from([0x1f, 0x8b]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

mkdirSync(outDir, { recursive: true });
let plain = 0;
let gz = 0;
let failed = 0;

for (const file of walk(srcDir)) {
  const rel = relative(srcDir, file);
  const dest = join(outDir, rel);
  mkdirSync(join(dest, ".."), { recursive: true });
  const bytes = readFileSync(file);
  if (bytes.length > 2 && bytes[0] === GZIP[0] && bytes[1] === GZIP[1]) {
    try {
      const out = gunzipSync(bytes);
      writeFileSync(dest, out);
      gz += 1;
      continue;
    } catch (err) {
      failed += 1;
      console.error(`gunzip failed for ${rel}: ${err.message}`);
    }
  }
  writeFileSync(dest, bytes);
  plain += 1;
}

console.log(`plain=${plain} gunzipped=${gz} failed=${failed} -> ${outDir}`);
