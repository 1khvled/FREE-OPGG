// Drive an already-running Electron/Chrome target over CDP: evaluate JavaScript,
// capture a screenshot, or dump the accessibility tree.
//
// Usage:
//   node tools/cdp.mjs --port 9444 [--url <substring>] [--eval <expr>]
//                       [--shot <out.png>] [--dom <out.html>] [--wait 5000]
//                       [--size 1440x900]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(name);

const port = Number(argOf('--port', '9444'));
const urlFilter = argOf('--url');
const waitMs = Number(argOf('--wait', '3000'));
const outDir = resolve(argOf('--out-dir', 'docs/reference'));
const sizeArg = argOf('--size', '1440x900');
const [width, height] = sizeArg.split('x').map(Number);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
const targets = await listRes.json();
let target = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl && t.url !== 'devtools://devtools/');
if (urlFilter) target = targets.find((t) => t.type === 'page' && t.url.includes(urlFilter) && t.webSocketDebuggerUrl);
if (!target) {
  console.error('no page target found');
  console.error(targets.map((t) => `${t.type} | ${t.title} | ${t.url}`).join('\n'));
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
await new Promise((res, reject) => {
  ws.once('open', res);
  ws.once('error', reject);
});

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
  setTimeout(() => {
    if (pending.has(id)) {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }
  }, 30000);
});

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: false,
});
await sleep(waitMs);

console.log(`target: ${target.url}`);

if (has('--eval')) {
  const expression = argOf('--eval');
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  console.log(typeof result.result.value === 'string'
    ? result.result.value
    : JSON.stringify(result.result.value, null, 2));
}

if (has('--shot')) {
  const out = resolve(argOf('--shot'));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`screenshot -> ${out}`);
}

if (has('--dom')) {
  const out = resolve(argOf('--dom'));
  const html = await send('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html.result.value, 'utf8');
  console.log(`dom -> ${out}`);
}

ws.close();
process.exit(0);
