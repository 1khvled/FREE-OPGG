// List the i18n keys a shipped bundle references, so a page's missing copy
// can be found by diffing against the reference's key set.
//
// Usage: node tools/rea-i18n-keys.mjs <bundleFile> [prefix]
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const file = process.argv[2];
const prefix = process.argv[3] || "";

const bytes = readFileSync(file);
const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");

// The reference calls the translator as f("key") / l("key") / t("key") / n("key").
const keys = new Set();
for (const match of text.matchAll(/[\w$]{1,3}\("([a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_-]+)+)"\)/g)) {
  keys.add(match[1]);
}

const filtered = [...keys].filter((k) => k.startsWith(prefix)).sort();
for (const key of filtered) console.log(key);
console.log(`\n${filtered.length} key(s) under "${prefix}"`);
