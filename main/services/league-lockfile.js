/**
 * Riot / League client discovery.
 *
 * The League client (LeagueClientUx.exe) writes a `lockfile` next to its
 * executable while it is running. The file has the shape
 *
 *     processName:pid:port:token:protocol
 *
 * and is the only supported way to talk to the local LCU API.
 *
 * Discovery order (mirrors the shipped reference):
 *
 *   1. `%LOCALAPPDATA%\Riot Games\RiotClientInstalls.json`
 *      -> the `LeagueClientUx.exe` entry -> `<dir>\lockfile`
 *   2. `%LOCALAPPDATA%\Riot Games\League of Legends\lockfile`
 *   3. `C:\Riot Games\League of Legends\lockfile`
 *   4. `D:\Riot Games\League of Legends\lockfile`
 *   5. Riot Client lockfile -> `/product-session/v1/sessions`
 *      -> `launchConfiguration.workingDirectory` -> `<dir>\lockfile`
 *
 * Nothing here talks to the network except step 5, which talks to the local
 * Riot Client over loopback.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

/** Loopback agent that accepts Riot's self-signed certificate. */
const LOOPBACK_AGENT = new https.Agent({ keepAlive: false, rejectUnauthorized: false });

/** Hard timeout for the local Riot Client session lookup. */
const SESSION_TIMEOUT_MS = 2500;

/**
 * Parse the contents of a Riot `lockfile`.
 *
 * @param {string} text - raw file contents
 * @returns {{process:string,pid:number,port:number,token:string,protocol:string}|null}
 */
function parseLockfile(text) {
  if (!text) return null;
  const parts = String(text).trim().split(':');
  if (parts.length < 5) return null;

  const processName = parts[0].trim();
  const pid = Number.parseInt(parts[1], 10);
  const port = Number.parseInt(parts[2], 10);
  const token = parts[3].trim();
  const protocol = parts[4].trim();

  if (!processName || !token) return null;
  if (!Number.isFinite(pid) || pid <= 0) return null;
  if (!Number.isFinite(port) || port <= 0) return null;

  return { process: processName, pid, port, token, protocol };
}

/**
 * Read and parse a lockfile from disk.
 *
 * @param {string} filePath
 * @returns {{process:string,pid:number,port:number,token:string,protocol:string}|null}
 */
function readLockfile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return parseLockfile(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

/** `%LOCALAPPDATA%` with a sane fallback. */
function localAppData() {
  if (process.env.LOCALAPPDATA) return process.env.LOCALAPPDATA;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(home, 'AppData', 'Local');
}

/** Path of `RiotClientInstalls.json`. */
function riotClientInstallsPath() {
  return path.join(localAppData(), 'Riot Games', 'RiotClientInstalls.json');
}

/**
 * Read `RiotClientInstalls.json`.
 *
 * The file maps a product label to the full path of its executable, e.g.
 *
 *     { "League of Legends (TM) Client": "C:\\Riot Games\\League of Legends\\LeagueClientUx.exe" }
 *
 * @returns {Array<{product:string,executable:string,dir:string}>}
 */
function readRiotClientInstalls() {
  const file = riotClientInstallsPath();
  let raw;
  try {
    if (!fs.existsSync(file)) return [];
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const out = [];
  for (const [product, value] of Object.entries(parsed)) {
    if (typeof value !== 'string' || !value) continue;
    const dir = /\.exe$/i.test(value) ? path.dirname(value) : value;
    out.push({ product, executable: value, dir });
  }
  return out;
}

/**
 * Every directory that could hold a League client `lockfile`.
 *
 * @returns {string[]}
 */
function candidateLockfilePaths() {
  const paths = [];
  const push = (p) => {
    if (p && !paths.includes(p)) paths.push(p);
  };

  for (const install of readRiotClientInstalls()) {
    const dir = install.dir;
    if (!dir) continue;
    // Only trust installs that actually ship the League client.
    if (/league/i.test(install.product) || fs.existsSync(path.join(dir, 'LeagueClientUx.exe'))) {
      push(path.join(dir, 'lockfile'));
    }
  }

  push(path.join(localAppData(), 'Riot Games', 'League of Legends', 'lockfile'));
  push('C:\\Riot Games\\League of Legends\\lockfile');
  push('D:\\Riot Games\\League of Legends\\lockfile');
  push('E:\\Riot Games\\League of Legends\\lockfile');

  return paths;
}

/**
 * Ask the Riot Client for the working directory of the running League client.
 *
 * @returns {Promise<string|null>}
 */
function leagueWorkingDirectoryFromRiotClient() {
  const lock = readLockfile(
    path.join(localAppData(), 'Riot Games', 'Riot Client', 'Config', 'lockfile'),
  );
  if (!lock) return Promise.resolve(null);

  const auth = Buffer.from(`riot:${lock.token}`).toString('base64');
  const options = {
    hostname: '127.0.0.1',
    port: lock.port,
    path: '/product-session/v1/sessions',
    method: 'GET',
    agent: LOOPBACK_AGENT,
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    timeout: SESSION_TIMEOUT_MS,
  };

  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    let request;
    try {
      request = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const sessions = parsed && typeof parsed === 'object' ? Object.values(parsed) : [];
            for (const session of sessions) {
              if (!session || typeof session !== 'object') continue;
              const product = String(session.productId || '');
              if (!/league/i.test(product)) continue;
              const workDir = session.launchConfiguration && session.launchConfiguration.workingDirectory;
              if (workDir) return done(workDir);
            }
            done(null);
          } catch (err) {
            done(null);
          }
        });
      });
    } catch (err) {
      done(null);
      return;
    }

    request.on('error', () => done(null));
    request.on('timeout', () => { request.destroy(); done(null); });
    request.end();
  });
}

/**
 * Discover the running League client.
 *
 * @returns {Promise<{path:string,process:string,pid:number,port:number,token:string,protocol:string}|null>}
 */
async function discoverLeagueClient() {
  for (const candidate of candidateLockfilePaths()) {
    const creds = readLockfile(candidate);
    if (creds) return { path: candidate, ...creds };
  }

  const workDir = await leagueWorkingDirectoryFromRiotClient();
  if (workDir) {
    const creds = readLockfile(path.join(workDir, 'lockfile'));
    if (creds) return { path: path.join(workDir, 'lockfile'), ...creds };
  }

  return null;
}

/**
 * Best-effort check whether a League game client window exists.
 *
 * Used to dock the overlay window onto the running game.
 *
 * @returns {Promise<boolean>}
 */
function isLeagueGameRunning() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    if (process.platform !== 'win32') {
      resolve(false);
      return;
    }
    const script = 'Get-Process -Name "League of Legends" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Id';
    exec(`powershell -NoProfile -Command "${script}"`, { timeout: 2500 }, (err, stdout) => {
      resolve(!err && Boolean(stdout && stdout.trim()));
    });
  });
}

module.exports = {
  parseLockfile,
  readLockfile,
  readRiotClientInstalls,
  candidateLockfilePaths,
  discoverLeagueClient,
  isLeagueGameRunning,
  localAppData,
};
