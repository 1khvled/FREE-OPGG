/**
 * The `opgg://` custom protocol.
 *
 * The reference registers `opgg` as the default protocol client and uses it
 * for three Windows jump-list tasks plus local image delivery:
 *
 *   - `opgg://restart-admin`            — relaunch the app with admin rights
 *   - `opgg://overlay-position-reset`   — re-dock the overlay onto the game
 *   - `opgg://desktop-position-reset`   — centre the main window
 *   - `opgg://images/<file>`            — serve a local image from userData
 *
 * The scheme is registered as *privileged* (standard + secure), so it is
 * treated like a normal origin by the renderer.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { protocol, app } = require('electron');

/** The scheme handled by this module. */
const SCHEME = 'opgg';

/** Roots that `opgg://images/...` may read from. */
function imageRoots() {
  const roots = [];
  try {
    roots.push(path.join(app.getPath('userData'), 'hero-custom'));
  } catch (err) { /* ignore */ }
  roots.push(path.join(__dirname, '..', 'src', 'assets', 'images'));
  return roots;
}

/**
 * Register the scheme as privileged. Must run **before** `app.whenReady()`.
 */
function registerScheme() {
  try {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: SCHEME,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: true,
          stream: true,
          corsEnabled: true,
          allowServiceWorkers: false,
        },
      },
    ]);
  } catch (err) {
    // Registering twice throws; the scheme is already privileged then.
  }
}

/**
 * Resolve a request path inside one of the allowed roots.
 *
 * @param {string} relative
 * @returns {string|null} an absolute path, or `null` when it escapes the roots
 */
function resolveImagePath(relative) {
  const cleaned = String(relative || '').replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('\0')) return null;

  for (const root of imageRoots()) {
    const candidate = path.resolve(root, cleaned);
    const rootResolved = path.resolve(root);
    if (candidate === rootResolved) continue;
    if (!candidate.startsWith(rootResolved + path.sep)) continue;
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    } catch (err) { /* ignore */ }
  }
  return null;
}

/**
 * Guess the mime type of a local image.
 *
 * @param {string} filePath
 * @returns {string}
 */
function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

/**
 * Relaunch the application with administrator privileges.
 *
 * Uses the `elevate.exe` helper that ships next to the packaged app. When the
 * helper is missing (development builds) nothing is launched and the caller is
 * told why.
 *
 * @returns {{ok:boolean, error?:string}}
 */
function restartAsAdmin() {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Elevated restart is only available on Windows' };
  }

  const candidates = [
    path.join(process.resourcesPath || '', 'elevate.exe'),
    path.join(__dirname, '..', '..', 'resources', 'elevate.exe'),
  ];

  for (const helper of candidates) {
    try {
      if (!helper || !fs.existsSync(helper)) continue;
      const child = spawn(helper, [process.execPath], { detached: true, stdio: 'ignore' });
      child.on('error', () => { /* the quit below still happens */ });
      child.unref();
      setTimeout(() => app.quit(), 1000);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  return { ok: false, error: 'elevate.exe is not available in this build' };
}

/**
 * Handle an `opgg://` URL.
 *
 * @param {string} rawUrl
 * @returns {Promise<{ok:boolean, action?:string, error?:string}>}
 */
async function handleProtocolUrl(rawUrl) {
  const url = String(rawUrl || '');
  if (!url.toLowerCase().startsWith(`${SCHEME}://`)) {
    return { ok: false, error: 'Unsupported URL' };
  }

  if (url.includes('restart-admin')) {
    const result = restartAsAdmin();
    return { ok: result.ok, action: 'restart-admin', error: result.error };
  }

  if (url.includes('overlay-position-reset')) {
    const windows = require('./windows.js');
    const result = await windows.resetOverlayPosition();
    return { ok: result.ok, action: 'overlay-position-reset', error: result.error };
  }

  if (url.includes('desktop-position-reset')) {
    const windows = require('./windows.js');
    const result = windows.resetDesktopPosition();
    return { ok: result.ok, action: 'desktop-position-reset', error: result.error };
  }

  return { ok: false, error: `Unknown action for "${url}"` };
}

/**
 * Install the protocol handler. Must run **after** `app.whenReady()`.
 */
function registerProtocolHandler() {
  try {
    protocol.handle(SCHEME, async (request) => {
      const url = request.url || '';

      // `opgg://images/<file>` — serve a local image.
      const imagesMatch = /^opgg:\/\/images\/(.+)$/i.exec(url);
      if (imagesMatch) {
        const file = resolveImagePath(decodeURIComponent(imagesMatch[1]));
        if (!file) {
          return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
        }
        try {
          const body = fs.readFileSync(file);
          return new Response(body, {
            status: 200,
            headers: { 'content-type': mimeTypeFor(file), 'cache-control': 'no-cache' },
          });
        } catch (err) {
          return new Response('Not readable', { status: 500, headers: { 'content-type': 'text/plain' } });
        }
      }

      const result = await handleProtocolUrl(url);
      if (!result.ok) {
        return new Response(result.error || 'Bad request', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        });
      }
      return new Response('OK', { status: 200, headers: { 'content-type': 'text/plain' } });
    });
  } catch (err) {
    // A second registration throws — the handler is already installed.
  }
}

/**
 * Register this app as the handler for `opgg://` URLs.
 *
 * @returns {boolean}
 */
function setAsDefaultProtocolClient() {
  try {
    if (process.defaultApp && process.argv.length >= 2) {
      return app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(process.argv[1])]);
    }
    return app.setAsDefaultProtocolClient(SCHEME);
  } catch (err) {
    return false;
  }
}

/**
 * Pick the `opgg://` URL out of a process argv list (Windows passes it as the
 * first argument when the app is launched through the protocol handler).
 *
 * @param {string[]} argv
 * @returns {string|null}
 */
function pickProtocolUrl(argv) {
  if (!Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (typeof arg === 'string' && arg.toLowerCase().startsWith(`${SCHEME}://`)) return arg;
  }
  return null;
}

module.exports = {
  SCHEME,
  registerScheme,
  registerProtocolHandler,
  setAsDefaultProtocolClient,
  handleProtocolUrl,
  pickProtocolUrl,
  resolveImagePath,
  restartAsAdmin,
};
