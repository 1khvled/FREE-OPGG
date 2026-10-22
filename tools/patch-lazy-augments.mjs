// Add the observer cleanup to the ARAM: Mayhem page's unmount handler.
//
// Usage: node tools/patch-lazy-augments.mjs
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/pages/aram-mayhem/index.js";
let source = readFileSync(file, "utf8");

const anchor = "    disposed = true;\n    loadToken += 1;\n";
if (!source.includes(anchor)) {
  console.error("anchor not found");
  process.exit(1);
}
if (source.includes("cellObserver.disconnect()")) {
  console.log("already patched");
  process.exit(0);
}

source = source.replace(
  anchor,
  `${anchor}
    if (cellObserver) {
      cellObserver.disconnect();
      cellObserver = null;
    }
    enrichQueue = [];
`,
);

writeFileSync(file, source, "utf8");
console.log(`patched ${file}`);
