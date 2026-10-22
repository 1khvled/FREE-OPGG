// Call an IPC handler inside the running app and print the result.
//
// Usage: node tools/probe-ipc.mjs <channel> [jsonPayload] [--port 9338]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const channel = argv[0];
function readPayload(raw) {
  if (raw === undefined) return undefined;
  if (raw.endsWith('.json')) return JSON.parse(readFileSync(raw, 'utf8').replace(/^\uFEFF/, ''));
  return JSON.parse(raw);
}
const payload = argv[1] && !argv[1].startsWith('--') ? readPayload(argv[1]) : undefined;
const port = Number(argOf('--port', '9338'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`, '--hidden'], {
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
  await sleep(4000);

  const reducer = argOf('--reduce', '');
  const expression = `(async () => {
    try {
      const result = await window.opgg.invoke(${JSON.stringify(channel)}, ${JSON.stringify(payload ?? null)});
      const reduced = ${reducer ? `(${reducer})(result)` : 'result'};
      return JSON.stringify(reduced, (k, v) => {
        if (Array.isArray(v)) return v.length > 4 ? [...v.slice(0, 2), '...(' + v.length + ' items)'] : v;
        return v;
      }).slice(0, 6000);
    } catch (err) { return 'THREW: ' + err.message; }
  })()`;

  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
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
