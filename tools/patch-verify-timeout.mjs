// Bound the screenshot call in the page verifier.
//
// `Page.captureScreenshot` can never settle on a window that is created with
// `show: false` — the verification tools run the app hidden, so the capture
// must be bounded or the walk hangs forever.
//
// Usage: node tools/patch-verify-timeout.mjs
import { readFileSync, writeFileSync } from "node:fs";

const file = "tools/verify-pages.mjs";
let source = readFileSync(file, "utf8");

if (source.includes("captureScreenshotBounded")) {
  console.log("already patched");
  process.exit(0);
}

const anchor = "const send = (method, params = {}) => new Promise((res, reject) => {";
if (!source.includes(anchor)) {
  console.error("anchor not found");
  process.exit(1);
}

// Add a bounded capture helper next to `send`.
source = source.replace(
  anchor,
  `/**
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
  send('Page.captureScreenshot', { format: 'png' }).then((r) => r.data),
  new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
]);

${anchor}`,
);

source = source.replace(
  "    const shot = await send('Page.captureScreenshot', { format: 'png' });\n    const file = join(outDir, `app-${page}.png`);\n    writeFileSync(file, Buffer.from(shot.data, 'base64'));",
  "    const shot = await captureScreenshotBounded();\n    const file = join(outDir, `app-${page}.png`);\n    if (shot) writeFileSync(file, Buffer.from(shot, 'base64'));",
);

source = source.replace(
  "    console.log(`  screenshot -> ${file}`);",
  "    if (shot) console.log(`  screenshot -> ${file}`);",
);

writeFileSync(file, source, "utf8");
console.log(`patched ${file}`);
