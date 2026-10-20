// Remove a duplicated key from the replica's app-level i18n catalogues.
//
// `src/i18n/app.en.json` and `src/i18n/app.extras.en.json` are merged by
// `src/core/i18n.js`; a key defined in both is ambiguous.
//
// Usage: node tools/dedupe-i18n.mjs <key>
import { readFileSync, writeFileSync } from "node:fs";

const key = process.argv[2];
if (!key) {
  console.error("usage: node tools/dedupe-i18n.mjs <key>");
  process.exit(1);
}

const files = ["src/i18n/app.en.json", "src/i18n/app.extras.en.json"];
const owners = files.filter((file) => {
  try {
    return Object.prototype.hasOwnProperty.call(JSON.parse(readFileSync(file, "utf8")), key);
  } catch {
    return false;
  }
});

if (owners.length < 2) {
  console.log(`"${key}" is defined in ${owners.length} file(s) — nothing to do`);
  process.exit(0);
}

// Keep the first owner (app.en.json is the primary catalogue) and drop the key
// from the others.
for (const file of owners.slice(1)) {
  const catalogue = JSON.parse(readFileSync(file, "utf8"));
  delete catalogue[key];
  writeFileSync(file, `${JSON.stringify(catalogue, null, 2)}\n`, "utf8");
  console.log(`removed "${key}" from ${file}`);
}
console.log(`kept "${key}" in ${owners[0]}`);
