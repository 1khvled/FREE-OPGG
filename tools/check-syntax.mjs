// Syntax-check every JavaScript file in the project.
//
// Usage: node tools/check-syntax.mjs [rootDir]
//
// The renderer uses ES modules and the main process uses CommonJS, so the
// checker picks the right goal per file: `module` for anything under src/ or
// overlay/, `script` (CommonJS) for main/, preload/ and shared/.
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const root = process.argv[2] || process.cwd();
const SKIP = new Set(["node_modules", ".git", "dist", ".cache", "docs", "tools"]);

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if ([".js", ".mjs", ".cjs"].includes(extname(entry.name))) acc.push(full);
  }
  return acc;
}

const files = walk(root);
let failures = 0;

// Node's `--check` picks the module goal from the file extension, so ES module
// sources are checked through a temporary `.mjs` copy.
const tmpDir = join(tmpdir(), `opgg-syntax-${process.pid}`);
mkdirSync(tmpDir, { recursive: true });

for (const file of files) {
  const rel = relative(root, file);
  const isModule = /^(src|overlay)[\\/]/.test(rel);
  let target = file;
  if (isModule) {
    target = join(tmpDir, `${rel.replace(/[\\/]/g, "_")}.mjs`);
    writeFileSync(target, readFileSync(file));
  }
  try {
    execFileSync(process.execPath, ["--check", target], { stdio: "pipe" });
  } catch (err) {
    failures += 1;
    const detail = (err.stderr ? err.stderr.toString() : err.message)
      .split("\n")
      .filter((line) => line.trim() && !line.includes("node:internal"))
      .slice(0, 6)
      .join("\n");
    console.error(`FAIL ${rel}\n${detail}\n`);
  }
}

console.log(`checked ${files.length} file(s); ${failures} failure(s)`);
rmSync(tmpDir, { recursive: true, force: true });
process.exit(failures ? 1 : 0);
