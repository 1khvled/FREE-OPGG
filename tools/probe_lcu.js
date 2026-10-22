// Diagnostic: check whether the local League Client is reachable.
//
// This is a standalone probe — it needs no Electron and no app instance, so
// it can be run when the app reports "League Client not connected" and you
// want to know whether the problem is discovery, the token, or the client.
//
// Usage: node tools/probe_lcu.js
const https = require('https');

const {
  candidateLockfilePaths,
  discoverLeagueClient,
  readLockfile,
} = require('../main/services/league-lockfile.js');

const agent = new https.Agent({ rejectUnauthorized: false });

function get(url, token) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${token}`).toString('base64');
    const request = https.get(url, {
      agent,
      headers: { Authorization: `Basic ${auth}` },
      timeout: 3000,
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`bad json: ${body.slice(0, 120)}`));
        }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  console.log('=== STEP 1: common LoL lockfile paths ===');
  for (const path of candidateLockfilePaths()) {
    const credentials = readLockfile(path);
    console.log(`  ${credentials ? 'HIT ' : 'miss'} ${path}`);
  }

  console.log('\n=== STEP 2: discovery ===');
  const client = await discoverLeagueClient();
  if (!client) {
    console.log('  no League Client found');
    process.exitCode = 1;
    return;
  }
  console.log(`  port=${client.port} pid=${client.pid} protocol=${client.protocol}`);

  console.log('\n=== STEP 3: reachability ===');
  const base = `${client.protocol || 'https'}://127.0.0.1:${client.port}`;
  for (const path of ['/lol-summoner/v1/current-summoner', '/lol-gameflow/v1/gameflow-phase']) {
    try {
      const body = await get(`${base}${path}`, client.token);
      console.log(`  200 ${path} -> ${JSON.stringify(body).slice(0, 160)}`);
    } catch (err) {
      console.log(`  ERR ${path} -> ${err.message}`);
      process.exitCode = 1;
    }
  }
})();
