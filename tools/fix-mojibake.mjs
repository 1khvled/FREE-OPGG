// Repair files that were double-encoded by a PowerShell `Get-Content -Raw` /
// `Set-Content -Encoding UTF8` round trip.
//
// PowerShell 5.1 decodes a BOM-less UTF-8 file with the ANSI code page, so
// every multi-byte character became two or three mojibake characters; writing
// it back as UTF-8 baked that in. This reverses the transform:
//   current bytes -> utf8 decode -> cp1252 encode -> original bytes -> utf8
//
// Usage: node tools/fix-mojibake.mjs <file> [<file> ...]
import { readFileSync, writeFileSync } from "node:fs";

/** Unicode code point for each cp1252 byte 0x80..0x9F. */
const CP1252_HIGH = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021,
  0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x0153, 0x017d, 0x017e,
  0x0080, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178, 0x0178,
];

/** Byte value for a Unicode code point in cp1252. */
const CP1252_BYTE = new Map();
for (let byte = 0x80; byte <= 0x9f; byte += 1) {
  if (!CP1252_BYTE.has(CP1252_HIGH[byte - 0x80])) {
    CP1252_BYTE.set(CP1252_HIGH[byte - 0x80], byte);
  }
}
for (let byte = 0xa0; byte <= 0xff; byte += 1) {
  CP1252_BYTE.set(byte, byte);
}

function cp1252Encode(text) {
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }
    const byte = CP1252_BYTE.get(code);
    if (byte === undefined) return null; // not representable — refuse to guess
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

let repaired = 0;
let skipped = 0;

for (const file of process.argv.slice(2)) {
  const raw = readFileSync(file);
  const hasBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const text = raw.toString('utf8').replace(/^\uFEFF/, '');

  const bytes = cp1252Encode(text);
  if (!bytes) {
    console.log(`skip ${file}: contains characters outside cp1252`);
    skipped += 1;
    continue;
  }

  const fixed = bytes.toString('utf8');
  if (fixed.includes('\uFFFD')) {
    console.log(`skip ${file}: repair produced invalid UTF-8`);
    skipped += 1;
    continue;
  }

  writeFileSync(file, Buffer.concat([Buffer.from(fixed, 'utf8')]));
  console.log(`repaired ${file} (bom=${hasBom})`);
  repaired += 1;
}

console.log(`repaired ${repaired}, skipped ${skipped}`);
