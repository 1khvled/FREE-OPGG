// Unit-check the overlay's tier normalisation: the letter grade, its CSS class
// and the fallback label.
//
// Usage: node tools/test-overlay-tier.mjs
import assert from 'node:assert/strict';
import { normalizeTier } from '../overlay/parts/normalize.js';

const cases = [
  // raw grade                       -> letter, class
  [0, 'S+', 'tier-splus'],
  [1, 'S', 'tier-s'],
  [2, 'A', 'tier-a'],
  [3, 'B', 'tier-b'],
  [4, 'C', 'tier-c'],
  [5, 'D', 'tier-d'],
  ['OP', 'S+', 'tier-splus'],
  ['op', 'S+', 'tier-splus'],
  ['S+', 'S+', 'tier-splus'],
  ['S', 'S', 'tier-s'],
  ['A', 'A', 'tier-a'],
  ['B', 'B', 'tier-b'],
  ['C', 'C', 'tier-c'],
  ['D', 'D', 'tier-d'],
  // the labels the main process returns
  ['Tier 1', 'S', 'tier-s'],
  ['Tier 2', 'A', 'tier-a'],
  ['Tier 3', 'B', 'tier-b'],
  ['Tier 4', 'C', 'tier-c'],
  ['Tier 5', 'D', 'tier-d'],
  ['tier 2', 'A', 'tier-a'],
];

let failed = 0;
for (const [input, letter, className] of cases) {
  const result = normalizeTier(input);
  try {
    assert.equal(result.letter, letter, `letter for ${JSON.stringify(input)}`);
    assert.equal(result.letterClass, className, `class for ${JSON.stringify(input)}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${JSON.stringify(input)} -> ${JSON.stringify(result)}\n     ${err.message}`);
  }
}

// The object form the API uses: `{ tier, rank, tier_data }`.
const objectForm = normalizeTier({ tier: 2, rank: 14 });
if (objectForm.letter !== 'A') {
  failed += 1;
  console.error(`FAIL object form -> ${JSON.stringify(objectForm)}`);
}

console.log(`${cases.length + 1 - failed}/${cases.length + 1} tier-grade assertions passed`);
process.exit(failed ? 1 : 0);
