// Static server for the shipped renderer bundle.
//
// Usage: node tools/serve-renderer.mjs [--root <dir>] [--port 8899] [--prefix /react]
//
// The shipped `assets/react/index.html` references its entry bundle as
// `../app.17903a6b.js` and webpack's publicPath is `../`, so the page must be
// served one directory below the bundle root. This server serves the bundle
// root and mounts the page under `--prefix`.
//
// `.js` files are stored gzip-compressed in the shipped app, so they are
// served with `Content-Encoding: gzip` exactly as the production CDN does.
import { createServer } from "node:http";
import { createReadStream, statSync, existsSync, readFileSync } from "node:fs";
import { join, extname, resolve, normalize } from "node:path";

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const root = resolve(argOf('--root', 'D:/opgg_extracted/assets/react'));
const port = Number(argOf('--port', '8899'));
const prefix = argOf('--prefix', '/react');
const injectFile = argOf('--inject', null);

/**
 * Optional script injected ahead of the shipped bundle. The reference app
 * gates its desktop-only routes behind the preload bridge (`window.api`), so
 * serving it in a plain browser needs a stand-in for that bridge.
 */
let injectSource = '';
if (injectFile && existsSync(injectFile)) {
  injectSource = `<script>${readFileSync(injectFile, 'utf8')}</script>`;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.startsWith(prefix)) pathname = pathname.slice(prefix.length) || '/';
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const target = join(root, normalize(pathname).replace(/^([/\\])+/, ''));
  if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`not found: ${pathname}`);
    console.log(`404 ${pathname}`);
    return;
  }

  const headers = {
    'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  };
  if (extname(target).toLowerCase() === '.js') headers['Content-Encoding'] = 'gzip';

  if (injectSource && extname(target).toLowerCase() === '.html') {
    const html = readFileSync(target, 'utf8').replace('<script defer="defer"', `${injectSource}<script defer="defer"`);
    res.writeHead(200, headers);
    res.end(html);
    console.log(`200 ${pathname} (injected)`);
    return;
  }

  res.writeHead(200, headers);
  createReadStream(target).pipe(res);
  console.log(`200 ${pathname}`);
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${root} at http://127.0.0.1:${port}${prefix}/index.html`);
});
