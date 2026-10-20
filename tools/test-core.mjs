// Contract tests for the renderer's core modules.
//
// Usage: node tools/test-core.mjs
//
// These cover the contracts the swarm's modules depend on: the i18n
// interpolation cache, the observable store, the DOM helper, the data
// normalisers against the live API shapes, and the IPC contract's shape.
import assert from 'node:assert/strict';

import { t, setLocale, has } from '../src/core/i18n.js';
import { createStore } from '../src/core/store.js';
import {
  normalizeRates,
  normalizeTier,
  normalizeCounters,
  normalizeChampionRow,
  normalizeChampionList,
  normalizeChampionDetail,
  normalizeSummoner,
  normalizeMatchList,
  normalizeLeaderboard,
  normalizeAugment,
  createCache,
  REGIONS,
  TIER_FILTERS,
  LANES,
  QUEUES,
  championSquare,
} from '../src/data/index.js';
import {
  MAIN_TO_RENDERER,
  RENDERER_TO_MAIN,
  RENDERER_TO_MAIN_INVOKE,
} from '../shared/channels.js';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
  }
}

/* -------------------------------------------------------------------------- */
/* i18n                                                                       */
/* -------------------------------------------------------------------------- */

test('i18n resolves a reference string', () => {
  assert.equal(t('lol.champions.win-rate'), 'Win Rate');
});

test('i18n interpolates different variables for the same key', () => {
  // The reference has templated strings such as `Ban {{n}}`. A cache keyed
  // on the key alone would freeze the first interpolation.
  const first = t('lol.live.champion.v3.ban', { n: 1 });
  const second = t('lol.live.champion.v3.ban', { n: 2 });
  assert.notEqual(first, second);
  assert.match(String(first), /1/);
  assert.match(String(second), /2/);
});

test('i18n returns the fallback for an unknown key', () => {
  assert.equal(t('definitely.not.a.real.key', null, 'Fallback'), 'Fallback');
});

test('i18n exposes key presence', () => {
  assert.equal(has('lol.champions.tier'), true);
  assert.equal(has('definitely.not.a.real.key'), false);
});

test('i18n locale switch falls back to english', () => {
  setLocale('zz');
  assert.equal(t('lol.champions.tier'), 'Tier');
  setLocale('en');
});

/* -------------------------------------------------------------------------- */
/* store                                                                      */
/* -------------------------------------------------------------------------- */

test('store notifies subscribers with the changed keys', () => {
  const store = createStore({ a: 1, b: 2 });
  const seen = [];
  const off = store.subscribe((state, changed) => seen.push(changed.join(',')));
  store.setState({ a: 3 });
  store.setState({ a: 3 });
  store.setState({ b: 9 });
  off();
  store.setState({ a: 100 });
  assert.deepEqual(seen, ['a', 'b']);
  assert.equal(store.getState().a, 100);
});

test('store supports dotted updates', () => {
  const store = createStore({ filters: { role: 'ALL' } });
  store.update('filters.role', 'jungle');
  assert.equal(store.getState().filters.role, 'jungle');
});

/* -------------------------------------------------------------------------- */
/* data normalisers — against the live API shapes                             */
/* -------------------------------------------------------------------------- */

test('normalizeRates keeps 0..1 ratios and rescales percentages', () => {
  assert.equal(normalizeRates(0.5214), 0.5214);
  assert.equal(normalizeRates(52.14), 0.5214);
  assert.equal(normalizeRates(null), null);
  assert.equal(normalizeRates(undefined), null);
});

test('normalizeTier maps the numeric tiers to reference labels', () => {
  assert.equal(normalizeTier(0).tier, 'OP');
  assert.equal(normalizeTier(1).tier, 'Tier 1');
  assert.equal(normalizeTier(5).tier, 'Tier 5');
  assert.equal(normalizeTier('OP').tier, 'OP');
  assert.equal(normalizeTier('op').tier, 'OP');
  assert.equal(normalizeTier('tier_3').tier, 'Tier 3');
  assert.equal(normalizeTier('Tier 2').tier, 'Tier 2');
  assert.equal(typeof normalizeTier(3).tierRank, 'number');
});

test('normalizeCounters derives the win rate from counts', () => {
  const counters = normalizeCounters([{ champion_id: 11, play: 100, win: 55 }]);
  assert.equal(counters.length, 1);
  assert.equal(counters[0].id, 11);
  assert.ok(Math.abs(counters[0].winRate - 0.55) < 1e-9);
});

test('normalizeChampionRow reads the live ranked shape', () => {
  const row = normalizeChampionRow({
    id: 86,
    average_stats: {
      play: 150925,
      win_rate: 0.506251,
      pick_rate: 0.0615279,
      ban_rate: 0.0445094,
      kda: 1.792694,
      tier: 1,
      rank: 6,
      tier_data: { tier: 1, rank: 6, rank_prev: 5, rank_prev_patch: 2 },
    },
    positions: [{
      name: 'TOP',
      stats: {
        play: 150925,
        win_rate: 0.506251,
        pick_rate: 0.0615279,
        ban_rate: 0.0445094,
        kda: 1.792694,
        tier_data: { tier: 1, rank: 6, rank_prev: 5, rank_prev_patch: 2 },
      },
      counters: [{ champion_id: 11, play: 357, win: 157 }],
    }],
  });
  assert.equal(row.id, 86);
  assert.ok(Math.abs(row.winRate - 0.506251) < 1e-9);
  assert.equal(row.rank, 6);
  // rank_prev (5) - rank (6) = -1, i.e. the champion moved down one place.
  assert.equal(row.rankChange, -1);
  assert.equal(row.counters.length, 1);
});

test('normalizeChampionList unwraps { data, meta } and exposes the patch', () => {
  const list = normalizeChampionList({
    data: [{ id: 1, average_stats: { win_rate: 0.5, tier: 3 } }],
    meta: { version: '16.20', analyzed_at: '2026-10-21T00:42:22+09:00' },
  });
  assert.equal(list.rows.length, 1);
  assert.equal(list.patch, '16.20');
  assert.ok(list.updatedAt);
});

test('normalizeChampionList accepts a bare array', () => {
  const list = normalizeChampionList([{ id: 1, average_stats: { win_rate: 0.5 } }]);
  assert.equal(list.rows.length, 1);
});

test('normalizeChampionDetail reads the live detail shape', () => {
  const detail = normalizeChampionDetail({
    summary: { id: 86, average_stats: { win_rate: 0.5, tier: 1 } },
    core_items: [{ ids: [6631, 3046, 3033], play: 21921, win: 12051, pick_rate: 0.2306 }],
    boots: [{ ids: [3006], play: 90268, win: 46525, pick_rate: 0.6672 }],
    starter_items: [{ ids: [1054, 2003], play: 79435, win: 39803, pick_rate: 0.5682 }],
    rune_pages: [{
      id: 8010,
      builds: [{
        primary_rune_ids: [8010, 9111, 9105, 8299],
        secondary_rune_ids: [8224, 8234],
        stat_mod_ids: [5008, 5008, 5001],
        play: 56219, win: 28490, pick_rate: 0.7797,
      }],
    }],
    skills: [{ order: ['E', 'Q', 'W'], play: 60140, win: 32549, pick_rate: 0.5607 }],
    counters: [{ champion_id: 24, play: 5966, win: 3320 }],
  });
  assert.ok(detail.champion);
  assert.ok(Array.isArray(detail.build.coreItems));
  assert.ok(detail.build.coreItems.length > 0);
  assert.ok(detail.runes);
  assert.ok(detail.skills.length > 0);
});

test('normalisers never throw on empty input', () => {
  assert.doesNotThrow(() => normalizeChampionRow(null));
  assert.doesNotThrow(() => normalizeChampionList(null));
  assert.doesNotThrow(() => normalizeChampionDetail(null));
  assert.doesNotThrow(() => normalizeSummoner(null));
  assert.doesNotThrow(() => normalizeMatchList(null));
  assert.doesNotThrow(() => normalizeLeaderboard(null));
  assert.doesNotThrow(() => normalizeAugment(null));
  assert.doesNotThrow(() => normalizeCounters(null));
});

test('normalizeAugment keeps the numeric rarity and maps the tier', () => {
  const augment = normalizeAugment({
    id: 1,
    name: 'Accelerating Sorcery',
    largeIcon: 'https://example.test/large.png',
    smallIcon: 'https://example.test/small.png',
    rarity: 8,
    desc: 'Using Abilities grant you stacking Ability Haste.',
  });
  assert.equal(augment.name, 'Accelerating Sorcery');
  assert.ok(augment.rarity);
  assert.ok(augment.icon);
});

test('normalizeSummoner and normalizeLeaderboard tolerate partial payloads', () => {
  const summoner = normalizeSummoner({ puuid: 'abc', game_name: 'Hideonakaka', tagline: '0000' });
  assert.ok(summoner);
  const board = normalizeLeaderboard([{ rank: 1, name: 'A', lp: 1234 }]);
  assert.equal(board.length, 1);
});

/* -------------------------------------------------------------------------- */
/* cache                                                                      */
/* -------------------------------------------------------------------------- */

test('cache expires entries by TTL and evicts by LRU', () => {
  const cache = createCache({ ttlMs: 20, maxEntries: 2 });
  cache.set('a', 1);
  assert.equal(cache.get('a'), 1);
  cache.set('b', 2);
  cache.set('c', 3);
  assert.equal(cache.get('a'), undefined, 'oldest entry should be evicted');
  assert.equal(cache.get('c'), 3);
});

/* -------------------------------------------------------------------------- */
/* catalogues                                                                 */
/* -------------------------------------------------------------------------- */

test('region, tier and lane catalogues match the reference', () => {
  const codes = REGIONS.map((r) => r.code);
  for (const expected of ['GLOBAL', 'KR', 'NA', 'EUW', 'EUNE', 'OCE', 'BR', 'JP', 'LAN', 'LAS']) {
    assert.ok(codes.includes(expected), `missing region ${expected}`);
  }
  const tierValues = TIER_FILTERS.map((t) => t.value);
  for (const expected of ['all', 'emerald_plus', 'diamond_plus', 'master_plus', 'grandmaster', 'challenger']) {
    assert.ok(tierValues.includes(expected), `missing tier ${expected}`);
  }
  const laneKeys = LANES.map((l) => l.key);
  for (const expected of ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT']) {
    assert.ok(laneKeys.includes(expected), `missing lane ${expected}`);
  }
  assert.ok(QUEUES.length > 0);
});

test('champion square URLs use the data dragon square name', () => {
  const url = championSquare({ key: 'Aatrox' });
  assert.match(String(url), /Aatrox/);
});

/* -------------------------------------------------------------------------- */
/* IPC contract                                                               */
/* -------------------------------------------------------------------------- */

test('the IPC contract has no duplicate channel names', () => {
  const all = [
    ...Object.values(MAIN_TO_RENDERER),
    ...Object.values(RENDERER_TO_MAIN),
    ...Object.values(RENDERER_TO_MAIN_INVOKE),
  ];
  assert.equal(new Set(all).size, all.length, 'duplicate channel name in the contract');
});

test('the IPC contract covers every channel the renderer uses', () => {
  const invoke = Object.values(RENDERER_TO_MAIN_INVOKE);
  for (const channel of [
    'lcu:status', 'lcu:request', 'lcu:swap-bench', 'lcu:apply-runes',
    'lcu:apply-item-build', 'lcu:apply-spells', 'lcu:my-profile',
    'opgg:champions', 'opgg:champion-detail', 'opgg:mode-tierlist',
    'opgg:static-data', 'opgg:multi-search', 'opgg:get-leaderboard',
    'opgg:get-summoner-profile', 'opgg:get-current-patch',
    'overlay:toggle-pin', 'overlay:dock-to-league',
    'app:copy-to-clipboard', 'app:get-version',
  ]) {
    assert.ok(invoke.includes(channel), `missing invoke channel ${channel}`);
  }
});

/* -------------------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failed} failure(s):\n`);
  for (const f of failures) {
    console.error(`  FAIL ${f.name}`);
    console.error(`       ${f.err.message.split('\n')[0]}`);
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
