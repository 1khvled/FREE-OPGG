// Capture a screenshot of the app without ever showing a window on the
// user's desktop.
//
// The app is launched with `--capture=<file>`, which makes the main process
// place the window off the desktop area (x = -32000) and keep it out of the
// taskbar. The capture itself is taken over the DevTools Protocol, from the
// renderer's own surface, so nothing appears on the screen.
//
// Usage:
//   node tools/shot.mjs <page> [<page> ...] [--port 9480] [--out docs/verify]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const pages = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));
const port = Number(argOf('--port', '9480'));
const outDir = resolve(argOf('--out', 'docs/verify'));
const profileDir = resolve(argOf('--profile', 'docs/verify/.capture-profile'));
const settleMs = Number(argOf('--settle', '12000'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const electronBin = createRequire(import.meta.url)('electron');
mkdirSync(outDir, { recursive: true });

for (const page of pages) {
  const file = join(outDir, `app-${page}.png`);
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });

  const child = spawn(electronBin, [
    '.',
    `--capture=${file}`,
    `--capture-route=${page}`,
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${port}`,
  ], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.resume();
  child.stderr.resume();

  let captured = false;
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

    if (target) {
      const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
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
        setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`${method} timed out`)); } }, 40000);
      });

      await send('Page.enable');
      await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
      await sleep(2000);
      await send('Runtime.evaluate', {
        expression: `(() => { location.hash = '#/${page}'; return true; })()`,
        returnByValue: true,
      });
      await sleep(settleMs);

      const shot = await Promise.race([
        send('Page.captureScreenshot', { format: 'png', fromSurface: false, captureBeyondViewport: true })
          .then((r) => r.data),
        new Promise((resolve) => setTimeout(() => resolve(null), 25000)),
      ]);
      if (shot) {
        writeFileSync(file, Buffer.from(shot, 'base64'));
        captured = true;
      }
      ws.close();
    }
  } catch (err) {
    console.log(`  ${page}: ${err.message}`);
  }

  if (child.exitCode === null) child.kill();
  await sleep(400);
  try { process.kill(child.pid, 'SIGKILL'); } catch { /* gone */ }
  console.log(`${page}: ${captured || existsSync(file) ? `captured -> ${file}` : 'capture failed'}`);
}

rmSync(profileDir, { recursive: true, force: true });
process.exit(0);
