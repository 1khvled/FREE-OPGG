// Add `--hidden` to every Electron launch in the tools directory.
//
// The verification tools drive the app over the Chrome DevTools Protocol; they
// must never put a window on the user's desktop or steal focus. The main
// process honours `--hidden` by keeping the window off screen.
//
// Usage: node tools/add-hidden-flag.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "tools";
let changed = 0;

for (const name of readdirSync(dir)) {
  if (!name.endsWith(".mjs")) continue;
  const file = join(dir, name);
  const source = readFileSync(file, "utf8");
  if (!source.includes("--remote-debugging-port")) continue;
  if (source.includes("'--hidden'")) continue;

  const updated = source.replace(
    /(`--remote-debugging-port=\$\{port\}`|'--remote-debugging-port=\$\{port\}')/g,
    (match) => `${match}, '--hidden'`,
  );
  if (updated === source) continue;
  writeFileSync(file, updated, "utf8");
  console.log(`added --hidden to ${file}`);
  changed += 1;
}

console.log(`${changed} tool(s) updated`);
