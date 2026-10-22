// Dump the reference application's React route table.
//
// The route menu tree (tools/rea-routes.mjs) is the navigation; this is the
// router, which is the authoritative list of pages.
//
// Usage: node tools/rea-router.mjs [bundleFile]
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const file = process.argv[2] || "D:/opgg_extracted/assets/react/DesktopApp.2d31a5dd.bundle.js";

const bytes = readFileSync(file);
const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");

const routes = [];
for (const match of text.matchAll(/path:"(\/[^"]*)"[^}]*?component:\s*([A-Za-z0-9_$]+)/g)) {
  routes.push({ path: match[1], component: match[2] });
}

console.log("=== reference router ===");
for (const route of routes) {
  if (route.path.startsWith("/lol") || route.path.startsWith("/overlay/lol")) {
    console.log(`  ${route.path.padEnd(42)} ${route.component}`);
  }
}
console.log(`\n${routes.length} routes total, ${routes.filter((r) => r.path.startsWith('/lol')).length} of them League of Legends`);
