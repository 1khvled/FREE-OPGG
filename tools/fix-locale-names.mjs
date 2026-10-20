// Repair the locale native names in the settings page and scan the whole
// source tree for leftover double-encoded text.
//
// Usage: node tools/fix-locale-names.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".git", "dist", "docs"]);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(js|mjs|css|html|json)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const settingsFile = join(ROOT, 'src', 'pages', 'settings', 'index.js');
let source = readFileSync(settingsFile, 'utf8');

const CORRECT = new Map([
  ["'ko', label: '핍국어'", "'ko', label: '한국어'"],
  ["'ja', label: '日捬誏'", "'ja', label: '日本語'"],
]);

for (const [from, to] of CORRECT) {
  if (source.includes(from)) {
    source = source.replace(from, to);
    console.log(`fixed ${from} -> ${to}`);
  }
}
writeFileSync(settingsFile, source, 'utf8');

// Scan for the classic mojibake markers.
const MARKERS = ['â€', 'Ã©', 'Ã¡', 'Ã¼', 'Â°', 'Ð', 'Ñ', 'ï¿½'];
let suspect = 0;
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('\uFFFD')) {
    console.log(`REPLACEMENT CHAR in ${relative(ROOT, file)}`);
    suspect += 1;
    continue;
  }
  for (const marker of MARKERS) {
    if (text.includes(marker)) {
      const line = text.split('\n').find((l) => l.includes(marker));
      console.log(`MOJIBAKE (${marker}) in ${relative(ROOT, file)}: ${line.trim().slice(0, 120)}`);
      suspect += 1;
      break;
    }
  }
}
console.log(suspect ? `${suspect} file(s) need attention` : 'no mojibake found');
