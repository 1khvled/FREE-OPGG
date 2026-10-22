// Exercise the interactive paths of the app: open a champion detail modal,
// open the in-game overlay, and check that both render.
//
// Usage: node tools/verify-interactions.mjs [--port 9337]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const port = Number(argOf('--port', '9337'));
const outDir = resolve(argOf('--out', 'docs/verify'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
const child = spawn(electronBin, ['.', `--remote-debugging-port=${port}`, '--hidden'], {
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
  const send = (method, params = {}) => new Promise((res, reject) => {
    id += 1; pending.set(id, { resolve: res, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`${method} timed out`)); } }, 60000);
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await sleep(9000);
  mkdirSync(outDir, { recursive: true });

  // --- champion detail modal ------------------------------------------------
  const clicked = await evaluate(`(() => {
    const row = document.querySelector('.champion-statistics-table-body a');
    if (!row) return 'no row';
    row.click();
    return 'clicked ' + (row.getAttribute('href') || '');
  })()`);
  await sleep(7000);

  const modal = JSON.parse(await evaluate(`(() => {
    const panel = document.querySelector('.modal__panel') || document.querySelector('[class*="modal"]');
    const imgs = Array.from(document.querySelectorAll('img'));
    return JSON.stringify({
      opened: !!panel,
      text: panel ? panel.innerText.replace(/\\s+/g, ' ').slice(0, 500) : '',
      images: imgs.length,
      broken: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
    });
  })()`));

  console.log('=== champion detail ===');
  console.log(`  ${clicked}`);
  console.log(`  opened: ${modal.opened}`);
  console.log(`  images: ${modal.images} (broken ${modal.broken})`);
  console.log(`  ${modal.text}`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, 'app-champion-detail.png'), Buffer.from(shot.data, 'base64'));
  if (!modal.opened) { exitCode = 1; console.log('  PROBLEM: modal did not open'); }

  // --- overlay --------------------------------------------------------------
  const overlayResult = JSON.parse(await evaluate(`(async () => {
    await window.opgg.send('overlay:open');
    return JSON.stringify({ sent: true });
  })()`));
  console.log('\n=== overlay ===');
  console.log(`  ${JSON.stringify(overlayResult)}`);

  await sleep(6000);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const overlayTarget = targets.find((t) => t.type === 'page' && t.url.includes('overlay'));
  console.log(`  overlay window: ${overlayTarget ? overlayTarget.url : 'NOT OPEN'}`);
  if (overlayTarget) {
    const ows = new WebSocket(overlayTarget.webSocketDebuggerUrl);
    await new Promise((res, reject) => { ows.once('open', res); ows.once('error', reject); });
    let oid = 0;
    const opending = new Map();
    ows.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && opending.has(msg.id)) {
        const { resolve: r, reject } = opending.get(msg.id);
        opending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message)); else r(msg.result);
      }
    });
    const osend = (method, params = {}) => new Promise((res, reject) => {
      oid += 1; opending.set(oid, { resolve: res, reject });
      ows.send(JSON.stringify({ id: oid, method, params }));
      setTimeout(() => { if (opending.has(oid)) { opending.delete(oid); reject(new Error('timeout')); } }, 30000);
    });
    await osend('Runtime.enable');
    const oinfo = await osend('Runtime.evaluate', {
      expression: `JSON.stringify({
        body: document.body ? document.body.innerText.replace(/\\s+/g,' ').slice(0, 300) : '',
        hud: !!document.querySelector('[class*="hud"]'),
        imgs: document.querySelectorAll('img').length,
        broken: Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth === 0).length,
      })`,
      returnByValue: true,
    });
    console.log(`  ${oinfo.result.value}`);
    const oshot = await osend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(outDir, 'app-overlay.png'), Buffer.from(oshot.data, 'base64'));
    console.log(`  screenshot -> ${join(outDir, 'app-overlay.png')}`);
    ows.close();
  } else {
    exitCode = 1;
    console.log('  PROBLEM: overlay window did not open');
  }

  ws.close();
} catch (err) {
  exitCode = 1;
  console.error('failed:', err.message);
} finally {
  child.kill();
  await sleep(400);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
}
process.exit(exitCode);
