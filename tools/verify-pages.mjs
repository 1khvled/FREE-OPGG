// Walk every screen of the app, screenshot each one, and report any renderer
// error, uncaught exception or broken image.
//
// Usage: node tools/verify-pages.mjs [--port 9336] [--wait 6000] [--out docs/verify]
//                               [--attach <port>] [--exe <path>]
//
// With `--attach <port>` the verifier drives an app that is already running
// (a packaged build, for example) instead of launching one from source.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const port = Number(argOf('--port', '9336'));
const waitMs = Number(argOf('--wait', '6000'));
const outDir = resolve(argOf('--out', 'docs/verify'));
const attachPort = argOf('--attach', null);
const exePath = argOf('--exe', null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  'champions',
  'combos',
  'op-champions',
  'modes',
  'aram',
  'aram-mayhem',
  'buff-nerf',
  'live',
  'multisearch',
  'my-page',
  'settings',
  // The reference's desktop sidebar does not list the leaderboards; the route
  // is reached through the hash router instead.
  'leaderboard',
];

const electronBin = createRequire(import.meta.url)('electron');
let child = null;
if (!attachPort) {
  const command = exePath || electronBin;
  const args = exePath
    ? [`--remote-debugging-port=${port}`, '--hidden']
    : ['.', `--remote-debugging-port=${port}`, '--hidden'];
  child = spawn(command, args, {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.resume();
  child.stderr.resume();
}
const targetPort = attachPort ? Number(attachPort) : port;

let exitCode = 0;
try {
  let target = null;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline && !target) {
    try {
      const res = await fetch(`http://127.0.0.1:${targetPort}/json/list`);
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
  /**
 * Capture a screenshot, but never wait forever.
 *
 * The app runs hidden during verification and a capture of a window that was
 * never shown can hang indefinitely, so it is bounded and failures are not
 * fatal — the walk still reports the page's health.
 *
 * @param {number} [timeoutMs=15000]
 * @returns {Promise<string|null>} the base64 PNG, or null
 */
const captureScreenshotBounded = (timeoutMs = 15000) => Promise.race([
  send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    .then((r) => r.data),
  new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
]);

const send = (method, params = {}) => new Promise((res, reject) => {
    id += 1; pending.set(id, { resolve: res, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`${method} timed out`)); } }, 60000);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(4000);

  mkdirSync(outDir, { recursive: true });

  for (const page of PAGES) {
    const before = events.length;
    const nav = await send('Runtime.evaluate', {
      expression: `(() => {
        const link = document.querySelector('.app-side__item[href="#/${page}"]');
        if (link) { link.click(); return 'clicked'; }
        if (window.location.hash === '#/${page}') return 'already-there';
        window.location.hash = '#/${page}';
        return 'hash';
      })()`,
      returnByValue: true,
    });
    await sleep(waitMs);

    const info = await send('Runtime.evaluate', {
      expression: `(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return JSON.stringify({
          route: window.location.hash,
          heading: (document.querySelector('.app-main') || {}).innerText ? document.querySelector('.app-main').innerText.slice(0, 220) : '',
          errors: Array.from(document.querySelectorAll('.app-error')).map(e => e.innerText.slice(0, 200)),
          errorStates: Array.from(document.querySelectorAll('.state--error')).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 200)),
          images: imgs.length,
          brokenImages: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
          pendingImages: imgs.filter(i => !i.complete).length,
        });
      })()`,
      returnByValue: true,
    });

    const shot = await captureScreenshotBounded();
    const file = join(outDir, `app-${page}.png`);
    if (shot) writeFileSync(file, Buffer.from(shot, 'base64'));

    const pageEvents = events.slice(before);
    const consoleErrors = pageEvents
      .filter((e) => e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
      .map((e) => {
        const entry = e.params.entry;
        return entry.url ? `${entry.text} [${entry.url}]` : entry.text;
      });
    const exceptions = pageEvents
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text);

    const parsed = JSON.parse(info.result.value);
    const problems = [];
    if (parsed.errors.length) problems.push(`error panel: ${parsed.errors.join(' | ')}`);
    if (parsed.errorStates && parsed.errorStates.length) problems.push(`error state: ${parsed.errorStates.join(' | ')}`);
    if (parsed.brokenImages) problems.push(`${parsed.brokenImages} broken image(s)`);
    if (consoleErrors.length) problems.push(`${consoleErrors.length} console error(s)`);
    if (exceptions.length) problems.push(`${exceptions.length} exception(s)`);
    if (parsed.route !== `#/${page}`) problems.push(`landed on ${parsed.route || '(no hash)'}`);

    console.log(`\n=== ${page} ===`);
    console.log(`  nav ${nav.result.value} -> ${parsed.route}`);
    console.log(`  ${parsed.heading.split('\n').filter(Boolean).slice(0, 6).join(' / ')}`);
    console.log(`  images ${parsed.images} (broken ${parsed.brokenImages}, pending ${parsed.pendingImages})`);
    if (shot) console.log(`  screenshot -> ${file}`);
    if (problems.length) {
      exitCode = 1;
      console.log(`  PROBLEMS: ${problems.join('; ')}`);
      for (const line of consoleErrors.slice(0, 4)) console.log(`    ${line.slice(0, 160)}`);
      for (const line of exceptions.slice(0, 4)) console.log(`    ${String(line).slice(0, 160)}`);
    } else {
      console.log('  clean');
    }
  }

  ws.close();
} catch (err) {
  exitCode = 1;
  console.error('failed:', err.message);
} finally {
  if (child) {
    child.kill();
    await sleep(400);
    try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
  }
}
process.exit(exitCode);
