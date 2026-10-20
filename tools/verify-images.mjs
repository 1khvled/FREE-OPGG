// Start the app, wait for it to settle, and report every image that failed to
// load together with the element that holds it.
//
// Usage: node tools/verify-images.mjs [--port 9333] [--wait 15000]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const port = Number(argOf('--port', '9334'));
const waitMs = Number(argOf('--wait', '15000'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
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

  const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
  await new Promise((res, reject) => { ws.once('open', res); ws.once('error', reject); });

  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else res(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((res, reject) => {
    id += 1;
    pending.set(id, { resolve: res, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`${method} timed out`)); } }, 30000);
  });

  await send('Runtime.enable');
  await sleep(waitMs);

  const result = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      broken: Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth === 0)
        .map(i => ({ src: i.currentSrc || i.src, cls: i.className, alt: i.alt })),
      pending: Array.from(document.querySelectorAll('img')).filter(i => !i.complete).length,
      total: document.querySelectorAll('img').length,
      ok: Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth > 0).length
    })`,
    returnByValue: true,
  });

  const parsed = JSON.parse(result.result.value);
  console.log(`images: ${parsed.ok} loaded, ${parsed.broken.length} broken, ${parsed.pending} still loading (of ${parsed.total})`);
  const byHost = new Map();
  for (const b of parsed.broken) {
    let host = '?';
    try { host = new URL(b.src).host + new URL(b.src).pathname.replace(/[^/]*$/, '*'); } catch { /* keep ? */ }
    if (!byHost.has(host)) byHost.set(host, { count: 0, sample: b });
    byHost.get(host).count += 1;
  }
  for (const [host, info] of byHost) {
    console.log(`  ${info.count}x ${host}`);
    console.log(`       class="${info.sample.cls}" alt="${info.sample.alt}"`);
  }
  console.log('\nfirst 8 broken sources:');
  for (const b of parsed.broken.slice(0, 8)) console.log(`  ${b.cls} -> ${b.src}`);
  ws.close();
} catch (err) {
  console.error('failed:', err.message);
} finally {
  child.kill();
  await sleep(400);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
}
process.exit(0);
