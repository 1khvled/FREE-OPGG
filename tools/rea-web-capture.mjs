// Extract the useful artifacts from a REA browser-scenario capture.
//
// Usage: node tools/rea-web-capture.mjs <capture.json> [--out <dir>]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [, , file, ...flags] = process.argv;
if (!file) {
  console.error("usage: node tools/rea-web-capture.mjs <capture.json> [--out <dir>]");
  process.exit(1);
}
const outIndex = flags.indexOf("--out");
const outDir = outIndex >= 0 ? flags[outIndex + 1] : file.replace(/\.json$/i, ".artifacts");
mkdirSync(outDir, { recursive: true });

const doc = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
const data = doc?.data ?? doc;
const normalized = data?.normalized_result ?? data?.result ?? data;

const written = [];
function dump(name, value) {
  if (value === undefined || value === null) return;
  const target = join(outDir, name);
  if (typeof value === "string") {
    writeFileSync(target, value, "utf8");
  } else {
    writeFileSync(target, JSON.stringify(value, null, 2), "utf8");
  }
  written.push(`${name} (${typeof value === "string" ? value.length : "json"} bytes)`);
}

// Walk the result for known artifact-bearing keys.
const visit = (node, path) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => visit(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    const p = `${path}.${k}`;
    if (k === "dom" && typeof v === "string") dump("dom.html", v);
    else if (k === "html" && typeof v === "string") dump("dom.html", v);
    else if (k === "accessibility" && typeof v === "string") dump("accessibility.txt", v);
    else if (k === "text" && typeof v === "string" && /accessib/i.test(path)) dump("accessibility.txt", v);
    else if (k === "screenshot") dump("screenshot.json", v);
    else if (k === "url" && typeof v === "string") dump("final-url.txt", v);
    else if (k === "network" && v && typeof v === "object") dump("network.json", v);
    else visit(v, p);
  }
};
visit(normalized, "result");

// Screenshot bytes are often carried as a base64 field inside a descriptor.
const findBase64 = (node, path) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((v, i) => findBase64(v, `${path}[${i}]`));
  for (const [k, v] of Object.entries(node)) {
    const p = `${path}.${k}`;
    if (typeof v === "string" && v.length > 10000 && /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 200))) {
      const target = join(outDir, "screenshot.png");
      writeFileSync(target, Buffer.from(v, "base64"));
      written.push(`screenshot.png (${v.length} b64 chars)`);
    } else if (v && typeof v === "object") {
      findBase64(v, p);
    }
  }
};
findBase64(normalized, "result");

console.log(`artifacts -> ${outDir}`);
for (const w of written) console.log(`  - ${w}`);
