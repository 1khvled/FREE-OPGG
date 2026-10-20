// Report the API path fragments a shipped bundle concatenates into requests.
//
// Usage: node tools/rea-bundle-api.mjs [dir] [nameFilter]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const dir = process.argv[2] || "D:/opgg_extracted/assets/react";
const only = process.argv[3];

for (const name of readdirSync(dir)) {
  if (!name.endsWith(".js")) continue;
  if (only && !name.toLowerCase().includes(only.toLowerCase())) continue;
  const bytes = readFileSync(join(dir, name));
  const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");

  const hosts = new Set([...text.matchAll(/"(https?:\/\/[A-Za-z0-9._\-]+\.op\.gg)"/g)].map((m) => m[1]));
  const frags = new Set();
  for (const m of text.matchAll(/"(\/(?:api|v\d|meta|contents|stats|champions|summoners|games|queues|seasons)[A-Za-z0-9\/_\-{}.]{0,60})"/g)) {
    frags.add(m[1]);
  }
  if (!hosts.size && !frags.size) continue;
  console.log(`\n=== ${name} ===`);
  if (hosts.size) console.log(`  hosts: ${[...hosts].join(", ")}`);
  for (const f of [...frags].slice(0, 25)) console.log(`  ${f}`);
}
