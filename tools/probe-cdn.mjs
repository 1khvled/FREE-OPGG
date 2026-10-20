// Probe how the renderer sees the champion image CDN: load a burst of images
// at several sizes and report which ones fail.
//
// Usage: node tools/probe-cdn.mjs [--port 9335]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const port = Number(argOf('--port', '9335'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`], {
  cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.resume();
child.stderr.resume();

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

  const ws = new WebSocket(target.webSocketDebuggerUrl);
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
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 60000);
  });

  await send('Runtime.enable');
  await sleep(3000);

  const script = `(async () => {
    const names = ['Warwick','Nautilus','MasterYi','Seraphine','Vex','Teemo','Gangplank','Leblanc','Annie','Olaf','Galio','TwistedFate','XinZhao','Urgot','Fiddlesticks','Kayle','Alistar','Ryze','Sion','Sivir','Soraka','Tristana','Jinx','Aatrox','Akali','Yone','Zed','Sylas','Ornn','Aphelios','Rell','Pyke','Ambessa','Mel','Yunara','Locke','Sett','Lillia','Gwen','Rumble','Qiyana','Vi','Nami','Azir','Yuumi','Samira','Thresh','Illaoi','RekSai','Ivern','Kalista','Bard','Rakan','Xayah'];
    const base = 'https://opgg-static.akamaized.net/meta/images/lol/latest/champion/';
    const probe = async (url) => {
      try { const r = await fetch(url); return r.status; } catch (e) { return 'ERR ' + e.message; }
    };
    const out = {};
    for (const size of [32, 46]) {
      const statuses = await Promise.all(names.map(n => probe(base + n + '.png?image=c_scale,q_auto,w_' + size)));
      const counts = {};
      for (const s of statuses) counts[s] = (counts[s] || 0) + 1;
      out['w_' + size] = counts;
    }
    // Same burst, but with the version-pinned path.
    const pinned = 'https://opgg-static.akamaized.net/meta/images/lol/16.20.1/champion/';
    const statuses = await Promise.all(names.map(n => probe(pinned + n + '.png?image=c_scale,q_auto,w_32')));
    const counts = {};
    for (const s of statuses) counts[s] = (counts[s] || 0) + 1;
    out.pinned_w_32 = counts;
    return JSON.stringify(out);
  })()`;

  const result = await send('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true });
  console.log(result.result.value);
  ws.close();
} catch (err) {
  console.error('failed:', err.message);
} finally {
  child.kill();
  await sleep(400);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
}
process.exit(0);
