// Diagnostic: replicate main.js findLcuCredentials() discovery to test LCU reachability.
const fs = require('fs');
const https = require('https');
const path = require('path');

const localAppData = process.env.LOCALAPPDATA;
const agent = new https.Agent({ rejectUnauthorized: false });

function readLockfile(p) {
  try {
    if (!fs.existsSync(p)) return null;
    const parts = fs.readFileSync(p, 'utf-8').split(':');
    if (parts.length < 5) return null;
    return { processName: parts[0], pid: parts[1], port: parts[2], token: parts[3], protocol: parts[4] };
  } catch (e) { return null; }
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${token}`).toString('base64');
    const req = https.get(url, {
      agent,
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 3000
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('bad json: ' + body.slice(0, 120))); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  console.log('=== STEP 1: common LoL lockfile paths ===');
  const common = [
    'C:\\Riot Games\\League of Legends\\lockfile',
    'D:\\Riot Games\\League of Legends\\lockfile',
    'E:\\Riot Games\\League of Legends\\lockfile',
    path.join(localAppData, 'Riot Games', 'League of Legends', 'lockfile')
  ];
  for (const p of common) {
    const c = readLockfile(p);
    console.log(`  ${c ? 'HIT ' : 'miss'} ${p}`);
  }

  console.log('\n=== STEP 2: Riot Client lockfile ===');
  const rcPath = path.join(localAppData, 'Riot Games', 'Riot Client', 'Config', 'lockfile');
  const rc = readLockfile(rcPath);
  if (!rc) { console.log('  no Riot Client lockfile'); process.exit(1); }
  console.log(`  port=${rc.port} pid=${rc.pid} token=${rc.token.slice(0, 6)}...`);

  console.log('\n=== STEP 3: query /product-session/v1/sessions ===');
  let sessions;
  try {
    sessions = await get(`https://127.0.0.1:${rc.port}/product-session/v1/sessions`, rc.token);
  } catch (e) {
    console.log('  FAILED: ' + e.message);
    process.exit(1);
  }
  const entries = Object.values(sessions || {});
  console.log(`  OK - ${entries.length} session(s):`);
  for (const s of entries) {
    console.log(`    product=${s.productId} running=${s.launchConfiguration?.launchArguments?.length !== undefined ? 'yes' : '?'} cwd=${s.launchConfiguration?.workingDirectory}`);
  }

  console.log('\n=== STEP 4: LoL lockfile from session workingDirectory ===');
  const lolSession = entries.find(s => s.productId === 'league_of_legends');
  if (!lolSession) { console.log('  no league_of_legends session'); process.exit(1); }
  const cwd = lolSession.launchConfiguration?.workingDirectory;
  const lf = path.join(cwd, 'lockfile');
  const lcred = readLockfile(lf);
  if (!lcred) { console.log(`  MISSING lockfile at ${lf}`); process.exit(1); }
  console.log(`  FOUND: port=${lcred.port} token=${lcred.token.slice(0, 6)}...`);

  console.log('\n=== STEP 5: verify LoL LCU responds ===');
  try {
    const phase = await get(`https://127.0.0.1:${lcred.port}/lol-gameflow/v1/gameflow-phase`, lcred.token);
    console.log('  gameflow-phase =', phase);
    const summoner = await get(`https://127.0.0.1:${lcred.port}/lol-summoner/v1/current-summoner`, lcred.token);
    console.log(`  summoner = "${summoner?.displayName}" (puuid ${summoner?.puuid?.slice(0, 8)}...)`);
  } catch (e) {
    console.log('  FAILED: ' + e.message);
    process.exit(1);
  }

  console.log('\n>>> LCU IS REACHABLE <<<');
})();