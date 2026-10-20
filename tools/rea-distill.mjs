// Distill a REA `analyze-javascript-application` JSON result into compact, agent-readable evidence.
//
// Usage: node tools/rea-distill.mjs <rea-result.json> [--out <file.md>]
//
// The raw REA envelope is enormous because every inventoried file contributes
// graph nodes. This tool keeps only the facts a reconstruction agent needs:
//   - which sources were actually analysed
//   - Electron boundary facts (windows, preload, context bridge, IPC)
//   - per-file observation catalogue (operations REA recovered)
//   - semantic node labels + relations for the analysed modules
//   - REA's own declared limitations and unknowns
import { readFileSync, writeFileSync } from "node:fs";

const [, , file, ...flags] = process.argv;
if (!file) {
  console.error("usage: node tools/rea-distill.mjs <rea-result.json> [--out <file.md>]");
  process.exit(1);
}

const outIndex = flags.indexOf("--out");
const target = outIndex >= 0 ? flags[outIndex + 1] : file.replace(/\.json$/i, ".distilled.md");

const raw = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
const doc = JSON.parse(raw);
const result = doc?.data?.normalized_result ?? doc?.normalized_result ?? doc;
if (!result) {
  console.error("no normalized_result in input");
  process.exit(1);
}

const out = [];
const push = (s = "") => out.push(s);

const selected = new Set(result?.source_selection?.requested_paths ?? []);
push("# REA evidence distillation");
push();
push(`- evidence_id: \`${doc?.data?.evidence_id ?? "n/a"}\``);
push(`- application: \`${result?.input_path ?? ""}\``);
push(`- analysed sources: ${[...selected].map((p) => `\`${p}\``).join(", ") || "(none)"}`);
push(`- unselected inventoried files: ${result?.source_selection?.unselected_files ?? "n/a"}`);
push(`- REA duration: ${doc?.data?.meta?.duration ?? "n/a"}`);
push();

push("## REA summary counters");
push();
push("```json");
push(JSON.stringify(result?.summary ?? {}, null, 2));
push("```");
push();

// ---------------------------------------------------------------------------
// Application graph: keep only nodes whose observations point at analysed files
// ---------------------------------------------------------------------------
const graph = result?.graph ?? {};
const nodes = graph.nodes ?? [];
const edges = graph.edges ?? [];

const nodeById = new Map(nodes.map((n) => [n.node_id, n]));
const pathOf = (n) => n?.observations?.[0]?.properties?.path ?? null;

const relevant = nodes.filter((n) => {
  const p = pathOf(n);
  return p && selected.has(p);
});

const opCounts = new Map();
const byPath = new Map();
for (const n of relevant) {
  const p = pathOf(n);
  const bucket = byPath.get(p) ?? [];
  bucket.push(n);
  byPath.set(p, bucket);
  for (const o of n.observations ?? []) {
    const op = o.properties?.operation ?? o.evidence?.extractor?.operation ?? "unknown";
    opCounts.set(op, (opCounts.get(op) ?? 0) + 1);
  }
}

push("## Application-graph observation catalogue (analysed sources only)");
push();
push(`- relevant nodes: ${relevant.length} / ${nodes.length}`);
push();
push("| REA operation | count |");
push("| --- | --- |");
for (const [op, c] of [...opCounts].sort((a, b) => b[1] - a[1])) push(`| \`${op}\` | ${c} |`);
push();

const kindCounts = new Map();
for (const n of relevant) kindCounts.set(n.kind, (kindCounts.get(n.kind) ?? 0) + 1);
push("| graph node kind | count |");
push("| --- | --- |");
for (const [k, c] of [...kindCounts].sort((a, b) => b[1] - a[1])) push(`| \`${k}\` | ${c} |`);
push();

// ---------------------------------------------------------------------------
// Edges that touch analysed sources
// ---------------------------------------------------------------------------
const relevantIds = new Set(relevant.map((n) => n.node_id));
const relEdges = edges.filter((e) => relevantIds.has(e.source_node_id) || relevantIds.has(e.target_node_id));
const relationCounts = new Map();
for (const e of relEdges) relationCounts.set(e.relation, (relationCounts.get(e.relation) ?? 0) + 1);
push("## Graph relations touching analysed sources");
push();
push("| relation | count |");
push("| --- | --- |");
for (const [k, c] of [...relationCounts].sort((a, b) => b[1] - a[1])) push(`| \`${k}\` | ${c} |`);
push();

// ---------------------------------------------------------------------------
// Per-file observation dump (labels + key properties)
// ---------------------------------------------------------------------------
push("## Per-source observations");
push();
for (const [p, list] of byPath) {
  push(`### \`${p}\` (${list.length} nodes)`);
  push();
  for (const n of list) {
    for (const o of n.observations ?? []) {
      const props = o.properties ?? {};
      const op = props.operation ?? "?";
      const interesting = { ...props };
      delete interesting.path;
      delete interesting.operation;
      const extra = Object.keys(interesting).length ? ` ${JSON.stringify(interesting).slice(0, 1200)}` : "";
      push(`- \`${n.kind}\` / \`${op}\` — ${o.label ?? ""}${extra}`);
    }
  }
  push();
}

// ---------------------------------------------------------------------------
// Semantic graph: node labels + relations for analysed modules
// ---------------------------------------------------------------------------
const sem = result?.semantic_graph ?? {};
const semNodes = sem.nodes ?? [];
const semById = new Map(semNodes.map((n) => [n.node_id, n]));
const semRelevant = semNodes.filter((n) => selected.has(n?.identity?.module_path ?? ""));
const roleCounts = new Map();
for (const n of semRelevant) {
  const r = n.identity?.role_key ?? "n/a";
  roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
}
push("## Semantic roles recovered (analysed modules only)");
push();
push("| role_key | count |");
push("| --- | --- |");
for (const [k, c] of [...roleCounts].sort((a, b) => b[1] - a[1]).slice(0, 60)) push(`| \`${k}\` | ${c} |`);
push();

const semRelIds = new Set(semRelevant.map((n) => n.node_id));
const semRels = (sem.relations ?? []).filter((r) => semRelIds.has(r.source_node_id) || semRelIds.has(r.target_node_id));
const semRelCounts = new Map();
for (const r of semRels) semRelCounts.set(`${r.relation} (${r.resolution ?? "?"})`, (semRelCounts.get(`${r.relation} (${r.resolution ?? "?"})`) ?? 0) + 1);
push("| semantic relation | count |");
push("| --- | --- |");
for (const [k, c] of [...semRelCounts].sort((a, b) => b[1] - a[1]).slice(0, 60)) push(`| \`${k}\` | ${c} |`);
push();

// Filter semantic symbols down to the signal: Electron boundary paths, exported
// names, and constant-style property slots. Everything else (local bindings,
// argument placeholders, one-off reads) is noise for a reconstruction agent.
const NOISE = /^(expression|argument \d+|reference|unknown)$/;
const isNoiseLabel = (l) =>
  !l || NOISE.test(l) || /^[a-z_$]?$/.test(l) || /^argument \d+$/.test(l);

const boundaries = [];
const constants = new Map();
const exported = [];
for (const n of semRelevant) {
  const label = n.label ?? "";
  const role = n.identity?.role_key ?? "";
  if (n.kind === "boundary" || role.startsWith("boundary")) {
    boundaries.push({ label, module: n.identity?.module_path, role });
    continue;
  }
  if (n.kind === "export" || role.startsWith("export")) {
    exported.push({ label, module: n.identity?.module_path, role });
    continue;
  }
  if (n.kind === "property-slot") {
    const m = /\["([^"]+)"\]/.exec(role);
    const name = m?.[1];
    if (name && /^[A-Z][A-Z0-9_]{2,}$/.test(name)) {
      const key = `${n.identity?.module_path}::${name}`;
      constants.set(key, name);
    }
  }
}

push("## Electron boundary paths (context bridge / API surface)");
push();
for (const b of [...boundaries].sort((a, b) => a.label.localeCompare(b.label))) {
  push(`- \`${b.label}\` @ \`${b.module}\``);
}
push();

push("## Exported names");
push();
for (const e of [...exported].sort((a, b) => a.label.localeCompare(b.label))) {
  push(`- \`${e.label}\` @ \`${e.module}\``);
}
push();

push("## Constant-style property slots (IPC channel / event names)");
push();
for (const name of [...constants.values()].sort()) push(`- \`${name}\``);
push();

push("## Named semantic symbols (analysed modules)");
push();
const symbols = semRelevant
  .map((n) => ({ label: n.label, role: n.identity?.role_key, module: n.identity?.module_path, kind: n.kind }))
  .filter((s) => s.label && !isNoiseLabel(s.label) && s.kind !== "boundary" && s.kind !== "export" && s.kind !== "property-slot")
  .sort((a, b) => String(a.module).localeCompare(String(b.module)) || String(a.label).localeCompare(String(b.label)));
for (const s of symbols.slice(0, 3000)) push(`- \`${s.label}\` — ${s.kind} @ \`${s.module}\``);
push();

// ---------------------------------------------------------------------------
// Unknowns and limitations
// ---------------------------------------------------------------------------
const unknowns = sem.unknowns ?? [];
const famCounts = new Map();
for (const u of unknowns) famCounts.set(u.family, (famCounts.get(u.family) ?? 0) + 1);
push("## Unknown families (what REA could not resolve)");
push();
push("| family | count |");
push("| --- | --- |");
for (const [k, c] of [...famCounts].sort((a, b) => b[1] - a[1])) push(`| \`${k}\` | ${c} |`);
push();

if (result?.limitations?.length) {
  push("## REA declared limitations");
  push();
  for (const l of result.limitations) push(`- ${l}`);
  push();
}
if (graph.limitations?.length) {
  push("## Application-graph limitations");
  push();
  for (const l of graph.limitations) push(`- ${l}`);
  push();
}
if (result?.integrity_contradictions?.length) {
  push("## Integrity contradictions");
  push();
  for (const c of result.integrity_contradictions) push(`- ${JSON.stringify(c).slice(0, 600)}`);
  push();
}

writeFileSync(target, out.join("\n"), "utf8");
console.log(`wrote ${target} (${out.length} lines)`);
