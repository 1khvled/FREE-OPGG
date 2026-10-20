// Render the overlay's ARAM / Mayhem panels with mock data and screenshot them.
//
// The overlay only draws when a League Client is connected, so this harness
// injects a state snapshot into the overlay's own store (`window.opggOverlay`)
// to verify the card layout, the letter grades and the augment advisor.
//
// Usage: node tools/verify-overlay.mjs [--port 9360]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const port = Number(argOf('--port', '9360'));
const outDir = resolve(argOf('--out', 'docs/verify'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.resume();
child.stderr.resume();

let exitCode = 0;
try {
  let target = null;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !target) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      target = targets.find((t) => t.type === 'page' && t.url.includes('index.html') && t.webSocketDebuggerUrl);
    } catch { /* not up yet */ }
    if (!target) await sleep(400);
  }
  if (!target) throw new Error('no page target');

  // Open the overlay window from the main renderer.
  const mainWs = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, reject) => { mainWs.once('open', res); mainWs.once('error', reject); });
  let mid = 0;
  const mpending = new Map();
  mainWs.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && mpending.has(msg.id)) {
      const { resolve: r, reject } = mpending.get(msg.id);
      mpending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else r(msg.result);
    }
  });
  const msend = (method, params = {}) => new Promise((res, reject) => {
    mid += 1; mpending.set(mid, { resolve: res, reject });
    mainWs.send(JSON.stringify({ id: mid, method, params }));
    setTimeout(() => { if (mpending.has(mid)) { mpending.delete(mid); reject(new Error('timeout')); } }, 30000);
  });
  await msend('Runtime.enable');
  await sleep(4000);
  await msend('Runtime.evaluate', { expression: "window.opgg.send('overlay:open')", returnByValue: true });
  await sleep(5000);

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const overlayTarget = targets.find((t) => t.type === 'page' && t.url.includes('overlay'));
  if (!overlayTarget) throw new Error('the overlay window did not open');

  const ws = new WebSocket(overlayTarget.webSocketDebuggerUrl);
  await new Promise((res, reject) => { ws.once('open', res); ws.once('error', reject); });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve: r, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else r(msg.result);
      return;
    }
    if (msg.method) events.push(msg);
  });
  const send = (method, params = {}) => new Promise((res, reject) => {
    id += 1; pending.set(id, { resolve: res, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 30000);
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 620, deviceScaleFactor: 1, mobile: false });
  await sleep(1500);

  // Inject a mock ARAM / Mayhem state.
  const mock = `(() => {
    if (!window.opggOverlay) return 'no store';
    const t = (g) => (window.opggOverlay.normalizeTier ? window.opggOverlay.normalizeTier(g) : null);
    const state = {
      visible: true,
      interactive: true,
      connected: true,
      phase: 'inGame',
      mode: 'mayhem',
      champion: { id: 266, name: 'Zed', level: 9, tier: { grade: 'OP', rank: 1, className: 'tier-op', label: 'OP', letter: 'S+', letterClass: 'tier-splus' } },
      detail: {
        augments: [
          { id: 1, name: 'Accelerating Sorcery', rarity: 'prismatic', rarityLabel: 'Prismatic', icon: '', description: 'Using Abilities grant you stacking Ability Haste.', winRate: 0.62, pickRate: 0.14, tier: { grade: 'S+', rank: 1, className: 'tier-op', label: 'S+', letter: 'S+', letterClass: 'tier-splus' } },
          { id: 2, name: 'Absolute Focus', rarity: 'gold', rarityLabel: 'Gold', icon: '', description: 'Gains 10% bonus attack damage.', winRate: 0.55, pickRate: 0.21, tier: { grade: 'S', rank: 3, className: 'tier-1', label: 'S', letter: 'S', letterClass: 'tier-s' } },
          { id: 3, name: 'Gathering Storm', rarity: 'silver', rarityLabel: 'Silver', icon: '', description: 'Scales with the game clock.', winRate: 0.51, pickRate: 0.09, tier: { grade: 'A', rank: 6, className: 'tier-2', label: 'A', letter: 'A', letterClass: 'tier-a' } },
        ],
      },
      bench: [
        { championId: 86, name: 'Annie', available: true, winRate: 0.53, tier: { grade: 'Tier 1', rank: 2, className: 'tier-1', label: 'Tier 1', letter: 'S', letterClass: 'tier-s' } },
        { championId: 64, name: 'Lee Sin', available: true, winRate: 0.51, tier: { grade: 'Tier 3', rank: 9, className: 'tier-3', label: 'Tier 3', letter: 'B', letterClass: 'tier-b' } },
        { championId: 222, name: 'Jinx', available: false, winRate: 0.49, tier: { grade: 'Tier 5', rank: 20, className: 'tier-5', label: 'Tier 5', letter: 'D', letterClass: 'tier-d' } },
      ],
    };
    window.opggOverlay.store.setState(state);
    return 'ok';
  })()`;
  // The overlay polls the League Client every 2s and overwrites the store when
  // the client is unreachable, so the mock has to be re-injected until it
  // lands between two polls.
  let parsed = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await send('Runtime.evaluate', { expression: mock, returnByValue: true });
    await sleep(200);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('hud');
        if (root) { root.dataset.visible = 'true'; root.dataset.interactive = 'true'; root.setAttribute('aria-hidden', 'false'); }
        return 'shown';
      })()`,
      returnByValue: true,
    });
    await sleep(150);
    const probe = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        benchCards: document.querySelectorAll('.hud-bench-card').length,
        augmentCards: document.querySelectorAll('.hud-augment').length,
      })`,
      returnByValue: true,
    });
    const counts = JSON.parse(probe.result.value);
    if (counts.benchCards > 0) break;
    await sleep(400);
  }

  const info = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400),
      tierBadges: Array.from(document.querySelectorAll('.hud-tier')).map(e => e.textContent.trim() + '|' + e.className),
      benchCards: document.querySelectorAll('.hud-bench-card').length,
      augmentCards: document.querySelectorAll('.hud-augment').length,
      imgs: document.querySelectorAll('img').length,
      broken: Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth === 0).length,
    })`,
    returnByValue: true,
  });
  parsed = JSON.parse(info.result.value);
  console.log('\n=== overlay ===');
  console.log(`  bench cards: ${parsed.benchCards}   augment cards: ${parsed.augmentCards}`);
  console.log(`  images: ${parsed.imgs} (broken ${parsed.broken})`);
  console.log('  tier badges:');
  for (const badge of parsed.tierBadges) console.log(`    ${badge}`);

  mkdirSync(outDir, { recursive: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'app-overlay-mock.png'), Buffer.from(shot.data, 'base64'));
  console.log(`  screenshot -> ${join(outDir, 'app-overlay-mock.png')}`);

  const errors = events.filter((e) => e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error');
  if (errors.length) {
    exitCode = 1;
    console.log(`  ${errors.length} console error(s)`);
    for (const e of errors.slice(0, 5)) console.log(`    ${e.params.entry.text.slice(0, 140)}`);
  } else {
    console.log('  no console errors');
  }

  ws.close();
  mainWs.close();
} catch (err) {
  exitCode = 1;
  console.error('failed:', err.message);
} finally {
  child.kill();
  await sleep(400);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
}
process.exit(exitCode);
