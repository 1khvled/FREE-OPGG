// Report identifiers that are called but never defined or imported in a file.
//
// `node --check` only catches syntax errors, so a typo in a helper name
// (`primaryPosition` vs `primaryPostion`) ships a page that throws a
// ReferenceError at runtime. This catches that class of bug statically.
//
// Usage: node tools/check-undefined.mjs <fileOrDir> [<fileOrDir> ...]
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const GLOBALS = new Set([
  'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
  'RegExp', 'Error', 'TypeError', 'RangeError', 'Promise', 'Symbol', 'Map',
  'Set', 'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'BigInt', 'parseInt',
  'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'setTimeout', 'clearTimeout', 'setInterval',
  'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'structuredClone', 'queueMicrotask', 'console', 'globalThis', 'undefined',
  'document', 'window', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'fetch', 'URL', 'URLSearchParams', 'Intl', 'TextEncoder',
  'TextDecoder', 'AbortController', 'performance', 'crypto', 'Function', 'eval',
  'DOMParser', 'HTMLElement', 'Element', 'Node', 'CustomEvent', 'Event',
  'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'AbortSignal',
  'WeakRef', 'FinalizationRegistry', 'AggregateError', 'Intl',
]);

const KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'new',
  'function', 'await', 'of', 'in', 'do', 'else', 'try', 'delete', 'void',
  'yield', 'case', 'default', 'export', 'import', 'class', 'extends', 'super',
  'this', 'get', 'set', 'static', 'async', 'constructor', 'then', 'catch',
]);

/** Expand a path that may be a file or a directory. */
function expand(path) {
  const abs = resolve(path);
  let stat;
  try {
    stat = statSync(abs);
  } catch {
    return [];
  }
  if (stat.isFile()) return [abs];
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs)$/.test(entry.name)) out.push(full);
    }
  };
  walk(abs);
  return out;
}

/**
 * Blank out comments, string literals and regex literals, keeping the line
 * structure so line numbers stay correct.
 */
function stripNonCode(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  let prevMeaningful = '';

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (ch === '/' && next === '*') {
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  '; i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out += ' '; i += 1;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\') { out += '  '; i += 2; continue; }
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += ' '; i += 1;
      continue;
    }
    // A regex literal: a `/` that follows an operator or a bracket.
    if (ch === '/' && !/[A-Za-z0-9_$)\]]/.test(prevMeaningful)) {
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n) {
        const c = source[j];
        if (c === '\\') { j += 2; continue; }
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) { closed = true; break; }
        else if (c === '\n') break;
        j += 1;
      }
      if (closed) {
        out += ' '.repeat(j - i + 1);
        i = j + 1;
        prevMeaningful = '/';
        continue;
      }
    }

    out += ch;
    if (!/\s/.test(ch)) prevMeaningful = ch;
    i += 1;
  }
  return out;
}

/** The parameter names of a function/arrow signature starting at `open`. */
function paramsAt(source, open) {
  let depth = 0;
  let i = open;
  const names = [];
  let current = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '(' || ch === '{' || ch === '[') depth += 1;
    if (ch === ')' || ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0) {
        if (current.trim()) names.push(current.trim());
        break;
      }
    }
    if (ch === ',' && depth === 1) { names.push(current.trim()); current = ''; i += 1; continue; }
    current += ch;
    i += 1;
  }
  return names
    .flatMap((part) => part.split('=')[0].split(':').pop().split('.').pop())
    .map((name) => name.replace(/[{}[\]]/g, '').trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
}

const files = process.argv.slice(2).flatMap(expand);
let total = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const source = stripNonCode(raw);

  const defined = new Set(GLOBALS);

  for (const m of source.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  for (const m of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  for (const m of source.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(':')[0].split('=')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) defined.add(name);
    }
  }
  for (const m of source.matchAll(/import\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.split(/\s+as\s+/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) defined.add(name);
    }
  }
  for (const m of source.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) defined.add(m[1]);

  // Parameter names of every function and arrow signature.
  for (const m of source.matchAll(/function\s*[A-Za-z_$][\w$]*\s*\(/g)) {
    for (const name of paramsAt(source, m.index + m[0].length - 1)) defined.add(name);
  }
  for (const m of source.matchAll(/([A-Za-z_$][\w$]*)\s*=>\s*[{(]/g)) {
    const open = source.indexOf('(', m.index);
    if (open < 0) continue;
    for (const name of paramsAt(source, open)) defined.add(name);
  }
  // Method shorthand in an object literal or a class body: `name(args) {`.
  for (const m of source.matchAll(/([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g)) {
    defined.add(m[1]);
    for (const part of m[2].split(',')) {
      const name = part.split('=')[0].replace(/[{}[\]]/g, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) defined.add(name);
    }
  }
  for (const m of source.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g)) defined.add(m[1]);
  for (const m of source.matchAll(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  // A destructured parameter with a default (`{ format = (v) => … }`) is a
  // definition too; the name is bound either way.
  for (const m of source.matchAll(/([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);

  const missing = new Map();
  for (const m of source.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (defined.has(name) || KEYWORDS.has(name)) continue;
    const line = source.slice(0, m.index).split('\n').length;
    if (!missing.has(name)) missing.set(name, line);
  }

  if (missing.size) {
    console.log(`\n${relative(process.cwd(), file)}`);
    for (const [name, line] of missing) {
      console.log(`  line ${line}: "${name}" is called but never defined or imported`);
      total += 1;
    }
  }
}

console.log(`\n${total} undefined call(s) in ${files.length} file(s)`);
process.exit(total ? 1 : 0);
