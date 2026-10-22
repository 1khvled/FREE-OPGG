// Launch the app, capture a screenshot of its main window over CDP, and report
// any renderer console errors.
//
// Usage: node tools/verify-app.mjs [--port 9333] [--out <png>] [--wait 12000]
//
// The app is started with --remote-debugging-port so the Chrome DevTools
// Protocol can drive it. This is the same path REA's Electron observation
// tools use, so a capture produced here is comparable with REA evidence.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const port = Number(argOf('--port', '9333'));
const out = resolve(argOf('--out', 'docs/verify/app-main.png'));
const waitMs = Number(argOf('--wait', '12000'));
const root = resolve(process.argv[1], '..', '..');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!res.ok) throw new Error(`CDP /json/list -> ${res.status}`);
  return res.json();
}

async function waitForTarget(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const targets = await listTargets();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (err) {
      lastError = err;
    }
    await sleep(400);
  }
  throw new Error(`no CDP page target within ${timeoutMs}ms: ${lastError?.message ?? 'unknown'}`);
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const events = [];

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || 'CDP error'));
      else res(msg.result);
      return;
    }
    if (msg.method) events.push(msg);
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

  return { send, events };
}

// `require('electron')` resolves to the path of the packaged Electron binary.
const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`, '--hidden'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
});

let stdout = '';
let stderr = '';
child.stdout.on('data', (d) => { stdout += d.toString(); });
child.stderr.on('data', (d) => { stderr += d.toString(); });

let exitCode = 0;
try {
  const target = await waitForTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
  await new Promise((res, reject) => {
    ws.once('open', res);
    ws.once('error', reject);
  });

  const client = cdp(ws);
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  await client.send('Page.enable');

  await sleep(waitMs);

  const metrics = await client.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      url: location.href,
      title: document.title,
      bodyText: (document.body && document.body.innerText || '').slice(0, 4000),
      childCount: document.body ? document.body.children.length : 0,
      navItems: Array.from(document.querySelectorAll('.app-side__item')).map(e => e.textContent.trim()),
      tables: document.querySelectorAll('table').length,
      rows: document.querySelectorAll('tbody tr').length,
      errors: Array.from(document.querySelectorAll('.app-error')).map(e => e.innerText.slice(0,200))
    })`,
    returnByValue: true,
  });

  const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));

  const consoleErrors = client.events
    .filter((e) => e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params?.entry?.level))
    .map((e) => `${e.params.entry.level}: ${e.params.entry.text}`);

  const exceptions = client.events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text);

  console.log('=== page ===');
  console.log(metrics.result.value);
  console.log();
  console.log(`screenshot -> ${out}`);
  console.log(`console warnings/errors: ${consoleErrors.length}`);
  for (const line of consoleErrors.slice(0, 30)) console.log(`  ${line}`);
  console.log(`uncaught exceptions: ${exceptions.length}`);
  for (const line of exceptions.slice(0, 20)) console.log(`  ${line}`);

  exitCode = consoleErrors.filter((l) => l.startsWith('error:')).length + exceptions.length ? 1 : 0;
  ws.close();
} catch (err) {
  exitCode = 1;
  console.error('verification failed:', err.message);
  if (stdout.trim()) console.error('--- stdout ---\n' + stdout.slice(-2000));
  if (stderr.trim()) console.error('--- stderr ---\n' + stderr.slice(-2000));
} finally {
  child.kill();
  await sleep(500);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* already gone */ }
}

process.exit(exitCode);
