// Probe the shape of a REA analyze-javascript-application JSON result (bounded output).
import { readFileSync } from "node:fs";

const file = process.argv[2];
const doc = JSON.parse(readFileSync(file, "utf8"));

const out = [];
function walk(value, path, depth) {
  if (out.length > 400) return;
  if (depth > 3) return;
  if (Array.isArray(value)) {
    out.push(`${path}  [array ${value.length}]`);
    if (value.length && typeof value[0] === "object" && value[0] !== null) {
      walk(value[0], `${path}[0]`, depth + 1);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const p = path ? `${path}.${k}` : k;
      if (v === null || typeof v !== "object") {
        out.push(`${p}  : ${typeof v}`);
      } else {
        walk(v, p, depth + 1);
      }
    }
    return;
  }
  out.push(`${path}  : ${typeof value}`);
}

walk(doc, "", 0);
process.stdout.write(out.join("\n"));
