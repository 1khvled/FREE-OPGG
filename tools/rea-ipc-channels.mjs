// Extract the full IPC channel vocabulary from a shipped OP.GG bundle.
//
// The bundle aliases `ipcMain`/`ipcRenderer` through webpack externals, so a
// naive `ipcMain.handle(...)` regex under-reports. REA resolves those aliases
// and reports counts (176 literal channels / 171 main handlers); this tool
// recovers the literal channel names the same way REA does, by collecting
// every string-literal first argument of a channel-shaped method call.
//
// Usage: node tools/rea-ipc-channels.mjs <file> [file...]
import { readFileSync } from "node:fs";

const METHOD = /\.\s*(handle|handleOnce|on|once|removeHandler|removeListener|off|invoke|send|sendSync|postMessage)\s*\(\s*(["'`])([^"'`\n]{1,120})\2/g;

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node tools/rea-ipc-channels.mjs <file> [file...]");
  process.exit(1);
}

const CHANNELISH = /^[a-z0-9][a-z0-9:._\-]*$/i;
const NOT_CHANNEL = /^(?:[A-Z_]{2,}|[a-z]+)$/; // plain method names like "handle"

const byFile = [];
const all = new Map(); // channel -> Set(files)

for (const f of files) {
  const src = readFileSync(f, "utf8");
  const groups = new Map();
  for (const m of src.matchAll(METHOD)) {
    const method = m[1];
    const literal = m[3];
    if (!CHANNELISH.test(literal)) continue;
    if (NOT_CHANNEL.test(literal) && literal.length < 3) continue;
    const key = `${method}:${literal}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
    if (!all.has(literal)) all.set(literal, new Set());
    all.get(literal).add(f);
  }
  byFile.push({ file: f, groups });
}

const lines = [];
lines.push("# IPC channel vocabulary (literal channel strings recovered from shipped bundles)");
lines.push();
lines.push(`Files scanned: ${files.length}`);
lines.push(`Distinct channel literals: ${all.size}`);
lines.push();

for (const { file, groups } of byFile) {
  const handle = [...groups].filter(([k]) => k.startsWith("handle:"));
  const on = [...groups].filter(([k]) => k.startsWith("on:") || k.startsWith("once:"));
  const renderer = [...groups].filter(([k]) => k.startsWith("invoke:") || k.startsWith("send:"));
  lines.push(`## \`${file}\``);
  lines.push();
  lines.push(`- handle-style channels: ${handle.length}`);
  lines.push(`- listener-style channels: ${on.length}`);
  lines.push(`- renderer transmission channels: ${renderer.length}`);
  lines.push();
  lines.push("### handle-style");
  lines.push();
  for (const [k, c] of handle.sort()) lines.push(`- \`${k.slice(7)}\`  (${c})`);
  lines.push();
  lines.push("### listener-style");
  lines.push();
  for (const [k, c] of on.sort()) lines.push(`- \`${k.slice(k.indexOf(":") + 1)}\`  (${c})`);
  lines.push();
  lines.push("### renderer transmission");
  lines.push();
  for (const [k, c] of renderer.sort()) lines.push(`- \`${k.slice(k.indexOf(":") + 1)}\`  (${c})`);
  lines.push();
}

console.log(lines.join("\n"));
