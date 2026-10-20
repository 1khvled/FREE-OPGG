// Strip the "Jade_" variant prefix from the champion registry keys.
//
// The champion tier-list endpoint now returns ids in the 60xxx range for the
// "Jade" variants of the base champions. OP.GG's meta endpoint names them
// `Jade_Annie` and friends, but the image CDN only serves the base square
// name (`Annie.png`), so the registry keeps the base key and records the
// variant separately.
//
// Usage: node tools/fix-champion-variants.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] || 'src/data/champions.js';
let source = readFileSync(file, 'utf8');
let count = 0;

source = source.replace(
  /key: "Jade_([A-Za-z0-9]+)"/g,
  (match, base) => {
    count += 1;
    return `key: "${base}", variantKey: "${match.slice('key: "'.length, -1)}"`;
  },
);

writeFileSync(file, source, 'utf8');
console.log(`rewrote ${count} variant key(s) in ${file}`);
