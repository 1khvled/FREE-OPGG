// Drive the champion-detail modal over CDP and report every panel it renders.
//
// Usage: node tools/verify-detail-panels.mjs [--port 9373]
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { WebSocket } from "ws";

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const port = Number(argOf('--port', '9373'));
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
    } catch { /* not up */ }
    if (!target) await sleep(400);
  }
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
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('timeout')); } }, 30000);
  });

  await send('Runtime.enable');
  await sleep(12000);

  await send('Runtime.evaluate', {
    expression: `(() => { const row = document.querySelector('.champion-statistics-table-body a'); if (row) row.click(); return 'clicked'; })()`,
    returnByValue: true,
  });
  await sleep(8000);

  const info = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      panels: Array.from(document.querySelectorAll('.cd-panel')).map(p => ({
        cls: p.className,
        title: (p.querySelector('.cd-panel__title') || {}).textContent || (p.querySelector('.cd-export-runes__label') || {}).textContent || '',
      })),
      spellRows: document.querySelectorAll('.cd-spells__row').length,
      spellIcons: document.querySelectorAll('.cd-spells__icons img').length,
      exportButton: !!document.querySelector('.cd-export-runes'),
      errors: Array.from(document.querySelectorAll('.app-error')).map(e => e.innerText.slice(0, 120)),
    })`,
    returnByValue: true,
  });
  const parsed = JSON.parse(info.result.value);

  console.log('=== champion detail panels ===');
  for (const panel of parsed.panels) {
    console.log(`  ${panel.cls.replace('cd-panel ', '').padEnd(26)} "${String(panel.title).trim()}"`);
  }
  console.log(`  summoner spell rows: ${parsed.spellRows} (icons ${parsed.spellIcons})`);
  console.log(`  export rune button: ${parsed.exportButton ? 'present' : 'MISSING'}`);
  if (parsed.errors.length) { exitCode = 1; console.log(`  errors: ${parsed.errors.join(' | ')}`); }

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
