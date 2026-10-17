const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

// ================= ULTRA-LOW MEMORY & COMPUTE OPTIMIZATION SWITCHES =================
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-speech-api');
app.commandLine.appendSwitch('disable-notifications');
app.commandLine.appendSwitch('disable-background-timer-throttling', 'false');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames');

let mainWindow = null;
let overlayWindow = null;
let overlayPinned = true;

let activeDDragonVersion = '16.20.1';
let activePatch = '16.20';
let patchCheckInterval = null;

let lcuState = {
  connected: false,
  port: null,
  token: null,
  summoner: null,
  gameflow: 'None',
  autoAccept: true,
  autoRunes: true,
  autoBuilds: true,
  autoSpells: true,
  flashKey: 'F', // 'D' or 'F'
  lastAutoRuneChamp: null,
  lastAutoBuildChamp: null,
  lastAutoSpellChamp: null
};
let lcuPollInterval = null;

// SSL agent for local self-signed Riot certificates
const lcuAgent = new https.Agent({ rejectUnauthorized: false });

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1080,
    minHeight: 680,
    frame: false,
    backgroundColor: '#1c1c1f',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('minimize', () => {
    // Ultra-low RAM & CPU throttling when minimized
    if (lcuPollInterval) {
      clearInterval(lcuPollInterval);
      lcuPollInterval = setInterval(checkLcuHeartbeat, 15000);
    }
    if (global.gc) {
      try { global.gc(); } catch (e) {}
    }
  });

  mainWindow.on('restore', () => {
    if (lcuPollInterval) {
      clearInterval(lcuPollInterval);
      lcuPollInterval = setInterval(checkLcuHeartbeat, 2500);
      checkLcuHeartbeat();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------- OVERLAY WINDOW (ARAM & MAYHEM CARD OVERLAY) -----------------

async function getLeagueClientBounds() {
  if (process.platform !== 'win32') return null;
  return new Promise((resolve) => {
    const ps = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class WinApi {
          [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
          [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
          [StructLayout(LayoutKind.Sequential)]
          public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
        }
"@
      # 1. Match active League match in-game client window
      $hwnd = [WinApi]::FindWindow($null, "League of Legends (TM) Client")
      # 2. Match client / champ select window
      if ($hwnd -eq [IntPtr]::Zero) {
        $hwnd = [WinApi]::FindWindow("RCLIENT", "League of Legends")
      }
      if ($hwnd -eq [IntPtr]::Zero) {
        $hwnd = [WinApi]::FindWindow($null, "League of Legends")
      }
      if ($hwnd -ne [IntPtr]::Zero) {
        $rect = New-Object WinApi+RECT
        if ([WinApi]::GetWindowRect($hwnd, [ref]$rect)) {
          Write-Output "$($rect.Left),$($rect.Top),$($rect.Right - $rect.Left),$($rect.Bottom - $rect.Top)"
        }
      }
    `;
    exec(`powershell -NoProfile -Command "${ps.replace(/\r?\n/g, ' ')}"`, { timeout: 2000 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) return resolve(null);
      const parts = stdout.trim().split(',').map(Number);
      if (parts.length === 4 && parts[2] > 200 && parts[3] > 200) {
        resolve({ x: parts[0], y: parts[1], width: parts[2], height: parts[3] });
      } else {
        resolve(null);
      }
    });
  });
}

async function createOverlayWindow(showImmediately = false) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (showImmediately) {
      const bounds = await getLeagueClientBounds();
      if (bounds) {
        const curr = overlayWindow.getBounds();
        const targetW = Math.min(curr.width, bounds.width - 20);
        const targetX = Math.round(bounds.x + (bounds.width - targetW) / 2);
        const targetY = Math.round(bounds.y + 15);
        overlayWindow.setBounds({ x: targetX, y: targetY, width: targetW, height: curr.height });
      }
      overlayWindow.show();
      overlayWindow.focus();
    }
    return overlayWindow;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  const defaultWidth = 1140;
  const defaultHeight = 380;
  let initialX = Math.round((screenWidth - defaultWidth) / 2);
  let initialY = 40;

  try {
    const lcuBounds = await getLeagueClientBounds();
    if (lcuBounds) {
      const targetW = Math.min(defaultWidth, lcuBounds.width - 20);
      initialX = Math.round(lcuBounds.x + (lcuBounds.width - targetW) / 2);
      initialY = Math.round(lcuBounds.y + 15);
    }
  } catch (e) {}

  overlayWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    minWidth: 640,
    minHeight: 140,
    x: initialX,
    y: initialY,
    transparent: true,
    frame: false,
    alwaysOnTop: overlayPinned,
    skipTaskbar: false,
    resizable: true,
    hasShadow: true,
    show: showImmediately,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  if (overlayPinned) {
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  overlayWindow.loadFile(path.join(__dirname, 'src', 'overlay.html'));

  overlayWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

// ----------------- LCU CONNECTOR & AUTO-HOOKS -----------------

function readLockfile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parts = data.split(':');
      if (parts.length >= 5) {
        return {
          process: parts[0],
          pid: parts[1],
          port: parts[2],
          token: parts[3],
          protocol: parts[4]
        };
      }
    }
  } catch (err) {}
  return null;
}

async function findLcuCredentials() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
  const commonPaths = [
    'C:\\Riot Games\\League of Legends\\lockfile',
    'D:\\Riot Games\\League of Legends\\lockfile',
    'E:\\Riot Games\\League of Legends\\lockfile',
    path.join(localAppData, 'Riot Games', 'League of Legends', 'lockfile')
  ];

  for (const p of commonPaths) {
    const cred = readLockfile(p);
    if (cred) return cred;
  }

  // Riot Client lockfile discovery
  const riotClientLockfile = path.join(localAppData, 'Riot Games', 'Riot Client', 'Config', 'lockfile');
  const rcCred = readLockfile(riotClientLockfile);
  if (rcCred) {
    try {
      const sessionUrl = `https://127.0.0.1:${rcCred.port}/product-session/v1/sessions`;
      const auth = Buffer.from(`riot:${rcCred.token}`).toString('base64');
      const res = await new Promise((resolve, reject) => {
        const req = https.get(sessionUrl, {
          agent: lcuAgent,
          headers: { 'Authorization': `Basic ${auth}` },
          timeout: 2000
        }, (response) => {
          let body = '';
          response.on('data', d => body += d);
          response.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });

      if (res && typeof res === 'object') {
        for (const session of Object.values(res)) {
          if (session && session.productId === 'league_of_legends' && session.launchConfiguration?.workingDirectory) {
            const leagueLock = path.join(session.launchConfiguration.workingDirectory, 'lockfile');
            const lCred = readLockfile(leagueLock);
            if (lCred) return lCred;
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

function lcuApiCall(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    if (!lcuState.connected || !lcuState.port || !lcuState.token) {
      return reject(new Error('LCU not connected'));
    }

    const auth = Buffer.from(`riot:${lcuState.token}`).toString('base64');
    const options = {
      hostname: '127.0.0.1',
      port: lcuState.port,
      path: endpoint,
      method: method.toUpperCase(),
      agent: lcuAgent,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 4000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('LCU timeout')); });

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

// ----------------- AUTO-RUNES & AUTO-ITEM SETS ENGINE -----------------

async function executeAutoRunes(champId, mode = 'ranked', champName = 'Champion') {
  try {
    const lane = mode === 'aram' ? 'none' : 'top';
    const detailUrl = `https://lol-api-champion.op.gg/api/GLOBAL/champions/${mode}/${champId}/${lane}?tier=all`;
    const res = await fetchHttpsJson(detailUrl);
    const build = res.data || {};
    const runes = build.runes || (build.rune_pages && build.rune_pages[0]);

    if (!runes) return false;

    const payload = {
      name: `OP.GG ${champName} (${mode.toUpperCase()})`,
      primaryStyleId: runes.primary_page_id || 8000,
      subStyleId: runes.secondary_page_id || 8400,
      selectedPerkIds: [
        ...(runes.primary_rune_ids || [8010, 9111, 9104, 8299]),
        ...(runes.secondary_rune_ids || [8444, 8451]),
        ...(runes.stat_mod_ids || [5008, 5008, 5002])
      ]
    };

    const pages = await lcuApiCall('GET', '/lol-perks/v1/pages');
    if (Array.isArray(pages)) {
      const editablePage = pages.find(p => p.isEditable) || pages[0];
      if (editablePage && editablePage.id) {
        await lcuApiCall('DELETE', `/lol-perks/v1/pages/${editablePage.id}`);
      }
      await lcuApiCall('POST', '/lol-perks/v1/pages', { ...payload, current: true });
      return true;
    }
  } catch (err) {
    console.error('AutoRunes error:', err.message);
  }
  return false;
}

async function executeAutoItemBuilds(champId, mode = 'ranked', champName = 'Champion') {
  try {
    if (!lcuState.summoner) return false;
    const lane = mode === 'aram' ? 'none' : 'top';
    const detailUrl = `https://lol-api-champion.op.gg/api/GLOBAL/champions/${mode}/${champId}/${lane}?tier=all`;
    const res = await fetchHttpsJson(detailUrl);
    const build = res.data || {};

    const starters = (build.starter_items?.[0]?.ids || [1055, 2003]).map(id => ({ id: String(id), count: 1 }));
    const core = (build.core_items?.[0]?.ids || [3078, 3053, 3161]).map(id => ({ id: String(id), count: 1 }));
    const boots = (build.boots?.slice(0, 2).map(b => b.id || b.ids?.[0]) || [3047, 3111]).map(id => ({ id: String(id), count: 1 }));
    const situational = (build.last_items?.slice(0, 4).map(l => l.id || l.ids?.[0]) || [3026, 3075]).map(id => ({ id: String(id), count: 1 }));

    const itemSet = {
      title: `OP.GG ${champName} (${mode.toUpperCase()})`,
      type: 'custom',
      map: mode === 'aram' ? 'HA' : 'any',
      mode: 'any',
      priority: true,
      blocks: [
        { type: 'Starter Items (OP.GG Recommended)', items: starters },
        { type: 'Core Build Path', items: core },
        { type: 'Boots Priority', items: boots },
        { type: 'Situational & Counter Items', items: situational }
      ]
    };

    const accountId = lcuState.summoner.accountId || lcuState.summoner.summonerId;
    await lcuApiCall('POST', `/lol-item-sets/v1/item-sets/${accountId}/sets`, {
      itemSets: [itemSet]
    });
    return true;
  } catch (err) {
    console.error('AutoItemBuilds error:', err.message);
  }
  return false;
}

async function executeAutoSpells(champId, mode = 'ranked', position = 'top') {
  try {
    if (!lcuState.connected) return false;
    let spellSecondary = 12; // Default Teleport

    const normMode = (mode || '').toLowerCase();
    const pos = (position || '').toLowerCase();

    if (normMode === 'aram') {
      spellSecondary = 32; // Mark / Snowball
    } else if (normMode === 'arena' || normMode === 'cherry' || normMode === 'mayhem') {
      spellSecondary = 22; // Flee
    } else {
      if (pos === 'jungle' || pos === 'jug') {
        spellSecondary = 11; // Smite
      } else if (pos === 'mid') {
        spellSecondary = 14; // Ignite
      } else if (pos === 'adc' || pos === 'bottom') {
        spellSecondary = 7; // Heal
      } else if (pos === 'support' || pos === 'utility') {
        spellSecondary = 14; // Ignite
      } else {
        spellSecondary = 12; // Teleport
      }
    }

    const flashId = 4; // Flash
    const spell1Id = lcuState.flashKey === 'D' ? flashId : spellSecondary;
    const spell2Id = lcuState.flashKey === 'D' ? spellSecondary : flashId;

    await lcuApiCall('PATCH', '/lol-champ-select/v1/session/my-selection', {
      spell1Id,
      spell2Id
    });
    return true;
  } catch (err) {
    console.error('AutoSpells error:', err.message);
  }
  return false;
}

// ----------------- HEARTBEAT LOOP (OPTIMIZED LOW-CPU) -----------------

async function processActiveGameflow() {
  try {
    const gameflow = await lcuApiCall('GET', '/lol-gameflow/v1/gameflow-phase');
    lcuState.gameflow = gameflow || 'None';

    // 1. Auto Accept Ready Check
    if (lcuState.autoAccept && lcuState.gameflow === 'ReadyCheck') {
      await lcuApiCall('POST', '/lol-matchmaking/v1/ready-check/accept').catch(() => {});
    }

    // 2. Active Champ Select Live Companion & Auto Runes/Builds/Spells
    if (lcuState.gameflow === 'ChampSelect') {
      const session = await lcuApiCall('GET', '/lol-champ-select/v1/session');
      if (session && session.myTeam) {
        const myCellId = session.localPlayerCellId;
        const myMember = session.myTeam.find(m => m.cellId === myCellId);
        const champId = myMember ? (myMember.championId || myMember.championPickIntent || 0) : 0;
        
        // Queue and mode detection
        let mode = session.benchEnabled ? 'aram' : 'ranked';
        let queueName = session.benchEnabled ? 'ARAM' : 'Ranked Solo';
        try {
          const gfSession = await lcuApiCall('GET', '/lol-gameflow/v1/session');
          const q = gfSession?.gameData?.queue;
          if (q) {
            queueName = q.name || queueName;
            const qLower = queueName.toLowerCase();
            const gMode = (q.gameMode || '').toLowerCase();
            if (session.benchEnabled || q.id === 450 || q.id === 100 || gMode === 'aram') {
              mode = 'aram';
            } else if (q.id === 1700 || q.id === 1710 || q.id === 2400 || gMode === 'cherry' || gMode === 'mayhem' || qLower.includes('arena') || qLower.includes('mayhem')) {
              mode = 'mayhem';
            }
          }
        } catch (e) {}

        // Auto Runes
        if (champId > 0 && champId !== lcuState.lastAutoRuneChamp && lcuState.autoRunes) {
          lcuState.lastAutoRuneChamp = champId;
          await executeAutoRunes(champId, mode);
        }

        // Auto Item Build
        if (champId > 0 && champId !== lcuState.lastAutoBuildChamp && lcuState.autoBuilds) {
          lcuState.lastAutoBuildChamp = champId;
          await executeAutoItemBuilds(champId, mode);
        }

        // Auto Summoner Spells
        if (champId > 0 && champId !== lcuState.lastAutoSpellChamp && lcuState.autoSpells) {
          lcuState.lastAutoSpellChamp = champId;
          const assignedPos = myMember?.assignedPosition || 'top';
          await executeAutoSpells(champId, mode, assignedPos);
        }

        const isAramOrMayhem = (mode === 'aram' || mode === 'mayhem' || session.benchEnabled);

        // Auto-activate Overlay Window if in ARAM or Mayhem champ select
        if (isAramOrMayhem) {
          if (!overlayWindow || overlayWindow.isDestroyed()) {
            createOverlayWindow(true);
          } else if (!overlayWindow.isVisible()) {
            overlayWindow.show();
          }
        }

        // Broadcast live champ select update with ARAM bench and team cards to BOTH windows
        const champSelectPayload = {
          mode,
          queueName,
          myChampionId: champId,
          myTeam: session.myTeam,
          theirTeam: session.theirTeam || [],
          benchChampions: session.benchChampions || [],
          benchEnabled: !!session.benchEnabled
        };

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('lcu:champ-select-update', champSelectPayload);
        }
        if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
          overlayWindow.webContents.send('lcu:champ-select-update', champSelectPayload);
        }
      }
    } else {
      lcuState.lastAutoRuneChamp = null;
      lcuState.lastAutoBuildChamp = null;
      lcuState.lastAutoSpellChamp = null;
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function checkLcuHeartbeat() {
  try {
    // Fast path: if already connected, test connection and process gameflow without touching disk
    if (lcuState.connected && lcuState.port && lcuState.token) {
      const ok = await processActiveGameflow();
      if (ok) return;
      // Connection lost
      lcuState.connected = false;
      lcuState.summoner = null;
      lcuState.gameflow = 'None';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('lcu:status-change', lcuState);
      }
      if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
        overlayWindow.webContents.send('lcu:status-change', lcuState);
      }
    }

    // Slow path: scan lockfiles on disk
    const creds = await findLcuCredentials();
    if (creds) {
      lcuState.port = creds.port;
      lcuState.token = creds.token;

      // Verify connection by fetching current summoner
      const auth = Buffer.from(`riot:${creds.token}`).toString('base64');
      const summoner = await new Promise((resolve, reject) => {
        const req = https.get({
          hostname: '127.0.0.1',
          port: creds.port,
          path: '/lol-summoner/v1/current-summoner',
          agent: lcuAgent,
          headers: { 'Authorization': `Basic ${auth}` },
          timeout: 2000
        }, (res) => {
          let b = '';
          res.on('data', d => b += d);
          res.on('end', () => {
            try { resolve(JSON.parse(b)); } catch (e) { resolve(null); }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });

      if (summoner && summoner.summonerId) {
        lcuState.connected = true;
        lcuState.summoner = summoner;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('lcu:status-change', lcuState);
        }
        if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
          overlayWindow.webContents.send('lcu:status-change', lcuState);
        }
        await processActiveGameflow();
        return;
      }
    }
  } catch (err) {}

  if (lcuState.connected) {
    lcuState.connected = false;
    lcuState.summoner = null;
    lcuState.gameflow = 'None';
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('lcu:status-change', lcuState);
    }
    if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
      overlayWindow.webContents.send('lcu:status-change', lcuState);
    }
  }
}

// ----------------- OP.GG LIVE DATA PROXY -----------------

function fetchHttpsJson(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = Object.assign({
      'User-Agent': 'OP.GG Desktop App',
      'Accept': 'application/json'
    }, customHeaders);

    https.get(url, { headers, timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Parse Error', raw: data });
        }
      });
    }).on('error', reject);
  });
}

const cache = {
  championNames: null,
  championDetails: {}
};

// ----------------- PATCH AUTO-UPDATE ENGINE -----------------

async function checkPatchAutoUpdate(isManual = false) {
  try {
    const versions = await fetchHttpsJson('https://ddragon.leagueoflegends.com/api/versions.json');
    if (Array.isArray(versions) && versions.length > 0) {
      const latestVer = versions[0];
      const latestPatch = latestVer.split('.').slice(0, 2).join('.');

      const isNew = latestVer !== activeDDragonVersion || isManual;
      if (isNew) {
        console.log(`[Auto-Patch] Detected DDragon version: ${latestVer} (Patch ${latestPatch})`);
        activeDDragonVersion = latestVer;
        activePatch = latestPatch;

        // Download updated champions and runes in background
        const assetsDir = path.join(__dirname, 'src', 'assets');
        try {
          const newChamps = await fetchHttpsJson(`https://ddragon.leagueoflegends.com/cdn/${latestVer}/data/en_US/champion.json`);
          if (newChamps && newChamps.data) {
            fs.writeFileSync(path.join(assetsDir, 'champions_ddragon.json'), JSON.stringify(newChamps));
          }
        } catch (e) {}

        try {
          const newRunes = await fetchHttpsJson(`https://ddragon.leagueoflegends.com/cdn/${latestVer}/data/en_US/runesReforged.json`);
          if (Array.isArray(newRunes) && newRunes.length > 0) {
            fs.writeFileSync(path.join(assetsDir, 'runes.json'), JSON.stringify(newRunes));
          }
        } catch (e) {}

        // Invalidate memory caches
        cache.championNames = null;
        cache.championDetails = {};

        const payload = {
          version: activeDDragonVersion,
          patch: activePatch,
          patches: [
            latestPatch,
            versions[1] ? versions[1].split('.').slice(0, 2).join('.') : '16.19',
            versions[2] ? versions[2].split('.').slice(0, 2).join('.') : '16.18'
          ],
          isNewPatch: latestVer !== activeDDragonVersion
        };

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('patch:auto-updated', payload);
        }
        if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
          overlayWindow.webContents.send('patch:auto-updated', payload);
        }

        return { success: true, updated: true, ...payload };
      }
      return { success: true, updated: false, version: activeDDragonVersion, patch: activePatch };
    }
  } catch (err) {
    console.warn('[Auto-Patch] Check failed:', err.message);
    return { success: false, error: err.message, version: activeDDragonVersion, patch: activePatch };
  }
}

// ----------------- IPC HANDLERS -----------------

// Main Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() || false);

// Overlay Window controls
ipcMain.on('overlay:open', () => createOverlayWindow(true));
ipcMain.on('overlay:close', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
});
ipcMain.on('overlay:minimize', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.minimize();
});
ipcMain.on('overlay:set-compact', (e, compact) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const b = overlayWindow.getBounds();
    overlayWindow.setBounds({ x: b.x, y: b.y, width: b.width, height: compact ? 190 : 380 });
  }
});
ipcMain.handle('overlay:toggle-pin', () => {
  overlayPinned = !overlayPinned;
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setAlwaysOnTop(overlayPinned);
  }
  return overlayPinned;
});
ipcMain.handle('overlay:dock-to-league', async () => {
  const bounds = await getLeagueClientBounds();
  if (bounds && overlayWindow && !overlayWindow.isDestroyed()) {
    const curr = overlayWindow.getBounds();
    const targetW = Math.min(curr.width, bounds.width - 20);
    const targetX = Math.round(bounds.x + (bounds.width - targetW) / 2);
    const targetY = Math.round(bounds.y + 15);
    overlayWindow.setBounds({ x: targetX, y: targetY, width: targetW, height: curr.height });
    return { success: true };
  }
  return { success: false };
});

// LCU IPC
ipcMain.handle('lcu:status', () => lcuState);
ipcMain.handle('lcu:request', async (e, { method, endpoint, data }) => {
  try {
    return await lcuApiCall(method, endpoint, data);
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('lcu:auto-accept', (e, enabled) => {
  lcuState.autoAccept = !!enabled;
  return lcuState.autoAccept;
});
ipcMain.handle('lcu:auto-runes', (e, enabled) => {
  lcuState.autoRunes = !!enabled;
  return lcuState.autoRunes;
});
ipcMain.handle('lcu:auto-builds', (e, enabled) => {
  lcuState.autoBuilds = !!enabled;
  return lcuState.autoBuilds;
});
ipcMain.handle('lcu:auto-spells', (e, enabled) => {
  lcuState.autoSpells = !!enabled;
  return lcuState.autoSpells;
});
ipcMain.handle('lcu:set-flash-key', (e, key) => {
  lcuState.flashKey = key === 'D' ? 'D' : 'F';
  return lcuState.flashKey;
});

// Summoner Profile & Live Match History from LCU
ipcMain.handle('lcu:my-profile', async () => {
  if (!lcuState.connected) {
    return { connected: false, error: 'League Client not connected' };
  }
  try {
    const [summoner, ranked, matchHistory] = await Promise.all([
      lcuApiCall('GET', '/lol-summoner/v1/current-summoner').catch(() => null),
      lcuApiCall('GET', '/lol-ranked/v1/current-ranked-stats').catch(() => null),
      lcuApiCall('GET', '/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=20').catch(() => null)
    ]);
    return {
      connected: true,
      summoner,
      ranked,
      matchHistory: matchHistory?.games?.games || []
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
});

// ARAM Bench Swap
ipcMain.handle('lcu:swap-bench', async (e, championId) => {
  try {
    await lcuApiCall('POST', `/lol-champ-select/v1/session/bench/swap/${championId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Apply runes manually
ipcMain.handle('lcu:apply-runes', async (e, runesPayload) => {
  if (!lcuState.connected) {
    return { success: false, error: 'League Client is not connected' };
  }
  try {
    const pages = await lcuApiCall('GET', '/lol-perks/v1/pages');
    if (Array.isArray(pages)) {
      const editablePage = pages.find(p => p.isEditable) || pages[0];
      const pageBody = {
        name: `OP.GG ${runesPayload.championName || 'Runes'}`,
        primaryStyleId: runesPayload.primaryStyleId,
        subStyleId: runesPayload.subStyleId,
        selectedPerkIds: runesPayload.selectedPerkIds,
        current: true
      };

      if (editablePage && editablePage.id) {
        await lcuApiCall('DELETE', `/lol-perks/v1/pages/${editablePage.id}`);
      }
      const created = await lcuApiCall('POST', '/lol-perks/v1/pages', pageBody);
      return { success: true, page: created };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Static Assets (DDragon & Runes) with offline local reading
ipcMain.handle('opgg:static-data', async () => {
  const assetsDir = path.join(__dirname, 'src', 'assets');
  let ddragon = null;
  let runes = null;
  try {
    const ddPath = path.join(assetsDir, 'champions_ddragon.json');
    if (fs.existsSync(ddPath)) {
      ddragon = JSON.parse(fs.readFileSync(ddPath, 'utf8'));
    }
  } catch (e) {}
  try {
    const runesPath = path.join(assetsDir, 'runes.json');
    if (fs.existsSync(runesPath)) {
      runes = JSON.parse(fs.readFileSync(runesPath, 'utf8'));
    }
  } catch (e) {}
  return { ddragon, runes };
});

// OP.GG Champion Tier List (Ranked, ARAM, Arena/Mayhem) with per-server & per-tier live endpoints
ipcMain.handle('opgg:champions', async (e, args = {}) => {
  let mode = 'ranked';
  let tier = 'emerald_plus';
  let region = 'GLOBAL';
  let patch = '16.20';

  if (typeof args === 'string') {
    tier = args;
  } else if (args && typeof args === 'object') {
    mode = args.mode || 'ranked';
    tier = args.tier || 'emerald_plus';
    region = (args.region || 'GLOBAL').toUpperCase();
    patch = args.patch || '16.20';
  }

  const normalizedMode = (mode || 'ranked').toLowerCase();
  const cacheKey = `champs_${region}_${tier}_${normalizedMode}`;
  if (cache[cacheKey]) {
    return {
      mode: normalizedMode,
      tier,
      region,
      patch,
      names: cache.championNames || [],
      data: cache[cacheKey],
      cached: true
    };
  }

  const assetsDir = path.join(__dirname, 'src', 'assets');

  // 1. Fetch & cache Champion Names
  if (!cache.championNames) {
    try {
      const namesRes = await fetchHttpsJson('https://lol-api-champion.op.gg/api/meta/champion-names?hl=en_US');
      if (namesRes && Array.isArray(namesRes.data) && namesRes.data.length > 0) {
        cache.championNames = namesRes.data;
      }
    } catch (err) {
      console.warn('Network fetch for champion-names failed:', err.message);
    }

    if (!cache.championNames) {
      try {
        const fallbackNamesPath = path.join(assetsDir, 'champion_names_cache.json');
        if (fs.existsSync(fallbackNamesPath)) {
          cache.championNames = JSON.parse(fs.readFileSync(fallbackNamesPath, 'utf8'));
        }
      } catch (err) {}
    }
  }

  // 2. Determine target API URL and fallback file
  let apiUrl = '';
  let fallbackFile = '';

  if (normalizedMode === 'aram') {
    apiUrl = `https://lol-api-champion.op.gg/api/${region}/champions/aram/`;
    fallbackFile = 'aram_champions_cache.json';
  } else if (normalizedMode === 'arena' || normalizedMode === 'mayhem') {
    apiUrl = `https://lol-api-champion.op.gg/api/${region}/champions/arena/`;
    fallbackFile = 'arena_champions_cache.json';
  } else {
    apiUrl = `https://lol-api-champion.op.gg/api/${region}/champions/ranked?tier=${tier}`;
    fallbackFile = 'ranked_champions_cache.json';
  }

  try {
    const res = await fetchHttpsJson(apiUrl);
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      cache[cacheKey] = res.data;
      return {
        mode: normalizedMode,
        tier,
        region,
        patch,
        names: cache.championNames || [],
        data: res.data
      };
    }
  } catch (err) {
    console.warn(`Fetch error for ${apiUrl}:`, err.message);
  }

  // 3. Fallback to pre-cached real OP.GG data
  try {
    const fallbackPath = path.join(assetsDir, fallbackFile);
    if (fs.existsSync(fallbackPath)) {
      const cachedData = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      cache[cacheKey] = cachedData;
      return {
        mode: normalizedMode,
        tier,
        region,
        patch,
        names: cache.championNames || [],
        data: cachedData,
        isFallback: true
      };
    }
  } catch (err) {}

  return {
    mode: normalizedMode,
    tier,
    region,
    patch,
    names: cache.championNames || [],
    data: [],
    error: 'Failed to fetch live OP.GG data and no local cache was found'
  };
});

// Mode Tier List (ARAM / Arena / Mayhem)
ipcMain.handle('opgg:mode-tierlist', async (e, mode = 'aram') => {
  try {
    const tierMode = (mode === 'mayhem' || mode === 'arena') ? 'arena' : 'aram';
    const cacheKey = `tierList_${tierMode}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    const res = await fetchHttpsJson(`https://lol-api-champion.op.gg/api/GLOBAL/champions/${tierMode}/`);
    if (res && res.data) {
      cache[cacheKey] = res.data;
      return res.data;
    }
    const assetsDir = path.join(__dirname, 'src', 'assets');
    const fallbackPath = path.join(assetsDir, `${tierMode}_champions_cache.json`);
    if (fs.existsSync(fallbackPath)) {
      const cached = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      cache[cacheKey] = cached;
      return cached;
    }
    return [];
  } catch (err) {
    return [];
  }
});

// OP.GG Champion Detail (with mode support: ranked, aram, arena)
ipcMain.handle('opgg:champion-detail', async (e, { champId, position = 'top', tier = 'all', mode = 'ranked' }) => {
  const cacheKey = `${champId}_${position}_${tier}_${mode}`;
  if (cache.championDetails[cacheKey]) {
    return cache.championDetails[cacheKey];
  }

  try {
    const isSpecialMode = mode === 'aram' || mode === 'arena' || mode === 'mayhem';
    const lane = isSpecialMode ? 'none' : (position || 'top').toLowerCase();

    let buildPromise;
    if (mode === 'arena' || mode === 'mayhem') {
      // Arena doesn't have a lane build endpoint, fallback to ranked top lane
      buildPromise = fetchHttpsJson(`https://lol-api-champion.op.gg/api/GLOBAL/champions/ranked/${champId}/top?tier=${tier}&is_more=true`);
    } else {
      buildPromise = fetchHttpsJson(`https://lol-api-champion.op.gg/api/GLOBAL/champions/${mode}/${champId}/${lane}?tier=${tier}&is_more=true`);
    }

    const [summary, build] = await Promise.all([
      fetchHttpsJson(`https://lol-api-champion.op.gg/api/GLOBAL/champions/${mode}/${champId}/summaries?tier=${tier}`),
      buildPromise
    ]);

    const result = {
      summary: summary.data || {},
      build: build.data || {}
    };
    cache.championDetails[cacheKey] = result;
    return result;
  } catch (err) {
    return { error: err.message };
  }
});

// Multi-Search (Lobby Scouting)
ipcMain.handle('opgg:multi-search', async (e, { query, region = 'kr' }) => {
  if (!query) return [];

  const lines = query.split('\n');
  const names = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const joinedMatch = trimmed.match(/^(.+?)\s+(?:joined the lobby|a rejoint le salon|trat do pokoju|ist der Lobby beigetreten)/i);
    if (joinedMatch) {
      names.add(joinedMatch[1].trim());
    } else if (trimmed.includes(',')) {
      trimmed.split(',').forEach(n => {
        const clean = n.trim();
        if (clean) names.add(clean);
      });
    } else {
      names.add(trimmed);
    }
  }

  const nameList = Array.from(names).slice(0, 5);
  const results = [];

  for (const name of nameList) {
    try {
      const summonerData = await fetchHttpsJson(`https://lol-api-summoner.op.gg/api/${region}/summoners/${encodeURIComponent(name)}`);
      results.push({
        queryName: name,
        data: summonerData.data || null,
        error: summonerData.message || null
      });
    } catch (err) {
      results.push({
        queryName: name,
        data: null,
        error: err.message
      });
    }
  }
  return results;
});

// ----------------- RANKED LEADERBOARD & SUMMONER PROFILES -----------------

const leaderboardCache = {};
ipcMain.handle('opgg:get-leaderboard', async (e, { region = 'kr', page = 1 } = {}) => {
  const normRegion = (region || 'kr').toLowerCase();
  const cacheKey = `${normRegion}_p${page}`;
  const now = Date.now();
  if (leaderboardCache[cacheKey] && (now - leaderboardCache[cacheKey].timestamp < 180000)) {
    return leaderboardCache[cacheKey].data;
  }

  try {
    const url = `https://lol-api-summoner.op.gg/api/${normRegion}/rankings/ladder?page=${page}`;
    const res = await fetchHttpsJson(url);
    if (res && Array.isArray(res.data)) {
      const result = {
        success: true,
        region: normRegion,
        page,
        total: res.meta?.total || 1000,
        list: res.data
      };
      leaderboardCache[cacheKey] = { timestamp: now, data: result };
      return result;
    }
  } catch (err) {
    console.warn(`Leaderboard fetch error for ${normRegion}:`, err.message);
  }

  return {
    success: false,
    region: normRegion,
    page,
    list: []
  };
});

const profileCache = {};
ipcMain.handle('opgg:get-summoner-profile', async (e, { summonerId, gameName, tagline, region = 'kr' } = {}) => {
  const normRegion = (region || 'kr').toLowerCase();
  const cacheKey = `${normRegion}_${summonerId || `${gameName}#${tagline}`}`;
  const now = Date.now();
  if (profileCache[cacheKey] && (now - profileCache[cacheKey].timestamp < 120000)) {
    return profileCache[cacheKey].data;
  }

  try {
    let targetId = summonerId;
    let targetProfile = null;

    if (targetId) {
      const [pRes, gRes] = await Promise.all([
        fetchHttpsJson(`https://lol-api-summoner.op.gg/api/${normRegion}/summoners/${targetId}`).catch(() => null),
        fetchHttpsJson(`https://lol-api-summoner.op.gg/api/${normRegion}/summoners/${targetId}/games`).catch(() => null)
      ]);
      if (pRes && pRes.data) {
        const result = {
          success: true,
          profile: pRes.data,
          games: gRes?.data || []
        };
        profileCache[cacheKey] = { timestamp: now, data: result };
        return result;
      }
    }

    // Search in current ladder if gameName provided
    const ladderUrl = `https://lol-api-summoner.op.gg/api/${normRegion}/rankings/ladder?page=1`;
    const ladderRes = await fetchHttpsJson(ladderUrl).catch(() => null);
    if (ladderRes && Array.isArray(ladderRes.data)) {
      const searchLower = (gameName || '').toLowerCase().trim();
      const match = ladderRes.data.find(item => {
        const s = item.summoner || {};
        const gName = (s.game_name || '').toLowerCase();
        const sName = (s.name || '').toLowerCase();
        return gName === searchLower || sName === searchLower || gName.includes(searchLower);
      });

      if (match && match.summoner) {
        targetProfile = match.summoner;
        targetId = targetProfile.summoner_id;
        let games = [];
        if (targetId) {
          const gRes = await fetchHttpsJson(`https://lol-api-summoner.op.gg/api/${normRegion}/summoners/${targetId}/games`).catch(() => null);
          games = gRes?.data || [];
        }
        const result = {
          success: true,
          profile: targetProfile,
          ladderRank: match.rank,
          games
        };
        profileCache[cacheKey] = { timestamp: now, data: result };
        return result;
      }
    }

    // Check LCU if locally connected summoner matches
    if (lcuState.connected && lcuState.summoner) {
      const localName = (lcuState.summoner.displayName || lcuState.summoner.gameName || '').toLowerCase();
      if (!gameName || localName.includes((gameName || '').toLowerCase())) {
        const [summoner, ranked, matchHistory] = await Promise.all([
          lcuApiCall('GET', '/lol-summoner/v1/current-summoner').catch(() => null),
          lcuApiCall('GET', '/lol-ranked/v1/current-ranked-stats').catch(() => null),
          lcuApiCall('GET', '/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=20').catch(() => null)
        ]);
        const result = {
          success: true,
          isLocalLcu: true,
          summoner,
          ranked,
          matchHistory: matchHistory?.games?.games || []
        };
        return result;
      }
    }
  } catch (err) {
    console.warn('Summoner profile fetch error:', err.message);
  }

  return { success: false, error: 'Summoner not found on OP.GG or in client' };
});

// Patch Auto-Update IPC
ipcMain.handle('opgg:check-patch-update', async () => {
  return await checkPatchAutoUpdate(true);
});
ipcMain.handle('opgg:get-current-patch', () => {
  return { version: activeDDragonVersion, patch: activePatch };
});

// Utility IPC
ipcMain.on('app:openExternal', (e, url) => shell.openExternal(url));
ipcMain.handle('app:copyToClipboard', (e, text) => {
  clipboard.writeText(text);
  return true;
});

// ----------------- APP LIFECYCLE -----------------

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();

    checkLcuHeartbeat();
    lcuPollInterval = setInterval(checkLcuHeartbeat, 2500);

    // Initial check for patch update and 30-min periodic check
    checkPatchAutoUpdate(false);
    patchCheckInterval = setInterval(() => checkPatchAutoUpdate(false), 30 * 60 * 1000);

    // Global shortcut Ctrl+Shift+O to toggle in-game overlay over League
    try {
      const { globalShortcut } = require('electron');
      globalShortcut.register('CommandOrControl+Shift+O', async () => {
        if (!overlayWindow || overlayWindow.isDestroyed()) {
          await createOverlayWindow(true);
        } else if (overlayWindow.isVisible()) {
          overlayWindow.hide();
        } else {
          const bounds = await getLeagueClientBounds();
          if (bounds) {
            const curr = overlayWindow.getBounds();
            const targetW = Math.min(curr.width, bounds.width - 20);
            const targetX = Math.round(bounds.x + (bounds.width - targetW) / 2);
            const targetY = Math.round(bounds.y + 15);
            overlayWindow.setBounds({ x: targetX, y: targetY, width: targetW, height: curr.height });
          }
          overlayWindow.show();
          overlayWindow.focus();
        }
      });
    } catch (e) {}

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('will-quit', () => {
    try {
      const { globalShortcut } = require('electron');
      globalShortcut.unregisterAll();
    } catch (e) {}
  });

  app.on('window-all-closed', () => {
    if (lcuPollInterval) clearInterval(lcuPollInterval);
    if (patchCheckInterval) clearInterval(patchCheckInterval);
    if (process.platform !== 'darwin') app.quit();
  });
}
