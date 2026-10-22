// Probe the live overlay: inject mock state and report what the HUD rendered.
//
// Usage: node tools/probe-overlay.mjs [--port 9363]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const port = Number(argOf('--port', '9363'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`, '--hidden'], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.resume();
child.stderr.resume();

const connect = async (url) => {
  const ws = new WebSocket(url);
  await new Promise((res, reject) => { ws.once('open', res); ws.once('error', reject); });
  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve: r, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else r(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((res, reject) => {
    id += 1; pending.set(id, { resolve: res, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 20000);
  });
  return { ws, send };
};

try {
  let target = null;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !target) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      target = targets.find((t) => t.type === 'page' && t.url.includes('index.html') && t.webSocketDebuggerUrl);
    } catch { /* not up */ }
    if (!target) await sleep(400);
  }
  const main = await connect(target.webSocketDebuggerUrl);
  await main.send('Runtime.enable');
  await sleep(4000);
  await main.send('Runtime.evaluate', { expression: "window.opgg.send('overlay:open')", returnByValue: true });
  await sleep(4000);

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ot = targets.find((t) => t.type === 'page' && t.url.includes('overlay'));
  const o = await connect(ot.webSocketDebuggerUrl);
  await o.send('Runtime.enable');
  await sleep(1500);

  const probe = await o.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.querySelector('[class*="hud"]');
      return JSON.stringify({
        hasBridge: !!window.opggOverlay,
        hasStore: !!(window.opggOverlay && window.opggOverlay.store),
        stateKeys: window.opggOverlay ? Object.keys(window.opggOverlay.store.getState()) : [],
        sections: window.opggOverlay ? window.opggOverlay.store.getState().sections : null,
        visible: window.opggOverlay ? window.opggOverlay.store.getState().visible : null,
        rootClass: root ? root.className : null,
        rootDataVisible: root ? root.dataset.visible : null,
        panels: document.querySelectorAll('.hud-panel').length,
        bodyChildren: document.body.children.length,
        html: document.body.innerHTML.slice(0, 400),
      });
    })()`,
    returnByValue: true,
  });
  console.log('BEFORE:', probe.result.value);

  const injected = await o.send('Runtime.evaluate', {
    expression: `(() => {
      window.opggOverlay.store.setState({
        visible: true, interactive: true, connected: true, phase: 'inGame', mode: 'mayhem',
        champion: { id: 266, name: 'Zed', level: 9, tier: { grade: 'OP', rank: 1, className: 'tier-op', label: 'OP', letter: 'S+', letterClass: 'tier-splus' } },
        bench: [{ championId: 86, name: 'Annie', available: true, winRate: 0.53, tier: { grade: 'Tier 1', rank: 2, className: 'tier-1', label: 'Tier 1', letter: 'S', letterClass: 'tier-s' } }],
        detail: { augments: [{ id: 1, name: 'Accelerating Sorcery', rarity: 'prismatic', rarityLabel: 'Prismatic', description: 'x', winRate: 0.62, pickRate: 0.14, tier: { grade: 'S+', label: 'S+', letter: 'S+', letterClass: 'tier-splus', className: 'tier-op' } }] },
      });
      const s = window.opggOverlay.store.getState();
      return JSON.stringify({ visible: s.visible, bench: s.bench.length, aug: s.detail.augments.length, sections: s.sections });
    })()`,
    returnByValue: true,
  });
  console.log('AFTER setState:', injected.result.value);
  await sleep(500);

  const after = await o.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.querySelector('[class*="hud"]');
      return JSON.stringify({
        rootDataVisible: root ? root.dataset.visible : null,
        panels: document.querySelectorAll('.hud-panel').length,
        benchCards: document.querySelectorAll('.hud-bench-card').length,
        augmentCards: document.querySelectorAll('.hud-augment').length,
        tiers: Array.from(document.querySelectorAll('.hud-tier')).map(e => e.textContent.trim()),
        text: document.body.innerText.replace(/\\s+/g,' ').slice(0, 260),
      });
    })()`,
    returnByValue: true,
  });
  console.log('AFTER:', after.result.value);
} catch (err) {
  console.error('failed:', err.message);
} finally {
  child.kill();
  await sleep(400);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
}
process.exit(0);
