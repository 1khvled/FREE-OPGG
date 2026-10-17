// ================= 1:1 OP.GG IN-GAME HUD OVERLAY CONTROLLER =================

const DDRAGON_VER = '16.20.1';
let ddragonMap = {};
let runesMap = {};
let itemsMap = {};
let augmentsDatabase = [];
let championAugmentsCache = {};
const champAugmentsMemo = new Map();

let currentChampId = 266; // Default Aatrox
let currentChampName = 'Aatrox';
let currentMode = 'mayhem';
let isUnlockedInteractive = false;
let currentSessionData = null;

// DOM Elements
const hudTopBar = document.getElementById('hudTopBar');
const hudChampImg = document.getElementById('hudChampImg');
const hudChampName = document.getElementById('hudChampName');
const hudChampTier = document.getElementById('hudChampTier');
const hudModeTag = document.getElementById('hudModeTag');
const benchBadgeCount = document.getElementById('benchBadgeCount');
const hudShortcutHint = document.getElementById('hudShortcutHint');
const hudLockStateText = document.getElementById('hudLockStateText');
const btnHudDemo = document.getElementById('btnHudDemo');
const btnHudClose = document.getElementById('btnHudClose');

// Widgets
const hudAugmentAdvisor = document.getElementById('hudAugmentAdvisor');
const augmentChampBadge = document.getElementById('augmentChampBadge');
const smartVerdictBanner = document.getElementById('smartVerdictBanner');
const verdictHeadline = document.getElementById('verdictHeadline');
const verdictSubtext = document.getElementById('verdictSubtext');
const augmentChoicesContainer = document.getElementById('augmentChoicesContainer');
const augmentSearchDrawer = document.getElementById('augmentSearchDrawer');
const hudAugmentSearchInput = document.getElementById('hudAugmentSearchInput');
const hudAugmentSearchResults = document.getElementById('hudAugmentSearchResults');
const btnToggleAugmentSearch = document.getElementById('btnToggleAugmentSearch');
const btnCloseAugmentSearch = document.getElementById('btnCloseAugmentSearch');
const btnRerollDemoOffers = document.getElementById('btnRerollDemoOffers');
const btnMinimizeAugments = document.getElementById('btnMinimizeAugments');

const hudBenchWidget = document.getElementById('hudBenchWidget');
const benchCardsRow = document.getElementById('benchCardsRow');
const btnMinimizeBench = document.getElementById('btnMinimizeBench');

const hudBuildWidget = document.getElementById('hudBuildWidget');
const buildWrBadge = document.getElementById('buildWrBadge');
const skillMaxText = document.getElementById('skillMaxText');
const skillProgressionBar = document.getElementById('skillProgressionBar');
const coreItemsRow = document.getElementById('coreItemsRow');
const situationalItemsRow = document.getElementById('situationalItemsRow');
const btnMinimizeBuild = document.getElementById('btnMinimizeBuild');

const hudTimersWidget = document.getElementById('hudTimersWidget');
const flashTimersList = document.getElementById('flashTimersList');
const btnMinimizeTimers = document.getElementById('btnMinimizeTimers');
const hudToast = document.getElementById('hudToast');

// Navigation toggle buttons
const btnToggleAugments = document.getElementById('btnToggleAugments');
const btnToggleBench = document.getElementById('btnToggleBench');
const btnToggleBuild = document.getElementById('btnToggleBuild');
const btnToggleTimers = document.getElementById('btnToggleTimers');

function showHudToast(msg) {
  if (!hudToast) return;
  hudToast.textContent = msg;
  hudToast.classList.add('show');
  setTimeout(() => hudToast.classList.remove('show'), 2500);
}

// ----------------- MOUSE PASS-THROUGH LOGIC (CRITICAL FOR IN-GAME) -----------------
function setupMousePassthrough() {
  document.querySelectorAll('.hud-interactive').forEach(el => {
    el.addEventListener('mouseenter', () => {
      window.opgg?.setIgnoreMouseEvents(false);
    });
    el.addEventListener('mouseleave', () => {
      if (!isUnlockedInteractive) {
        window.opgg?.setIgnoreMouseEvents(true, { forward: true });
      }
    });
  });
}

function setInteractiveMode(unlocked) {
  isUnlockedInteractive = unlocked;
  if (hudShortcutHint) {
    hudShortcutHint.classList.toggle('unlocked', unlocked);
  }
  if (hudLockStateText) {
    hudLockStateText.textContent = unlocked ? 'Lock' : 'Unlock';
  }

  if (unlocked) {
    window.opgg?.setIgnoreMouseEvents(false);
    showHudToast('🔓 OP.GG Overlay Unlocked (Cursor Active) — Press Shift+Tab to Lock');
  } else {
    window.opgg?.setIgnoreMouseEvents(true, { forward: true });
    showHudToast('🔒 OP.GG Overlay Locked (Clicks pass through into League)');
  }
}

if (hudShortcutHint) {
  hudShortcutHint.addEventListener('click', () => {
    setInteractiveMode(!isUnlockedInteractive);
  });
}

if (window.opgg?.onOverlayInteractiveToggle) {
  window.opgg.onOverlayInteractiveToggle(() => {
    setInteractiveMode(!isUnlockedInteractive);
  });
}

// ----------------- STATIC DATA LOADER -----------------
async function initData() {
  try {
    const [ddRes, runesRes, itemsRes, dbRes, cacheRes] = await Promise.all([
      fetch('assets/champions_ddragon.json').then(r => r.json()).catch(() => null),
      fetch('assets/runes.json').then(r => r.json()).catch(() => null),
      fetch('assets/items.json').then(r => r.json()).catch(() => null),
      fetch('assets/augments_database.json').then(r => r.json()).catch(() => fetch('assets/ranked_augments.json').then(r => r.json())).catch(() => []),
      fetch('assets/champion_augments_cache.json').then(r => r.json()).catch(() => ({}))
    ]);

    if (ddRes?.data) {
      Object.values(ddRes.data).forEach(c => {
        ddragonMap[c.key] = c;
        ddragonMap[c.id.toLowerCase()] = c;
      });
    }

    if (Array.isArray(runesRes)) {
      runesRes.forEach(t => {
        runesMap[t.id] = t;
        t.slots?.forEach(s => s.runes?.forEach(r => runesMap[r.id] = r));
      });
    }

    if (itemsRes?.data) {
      itemsMap = itemsRes.data;
    }

    if (Array.isArray(dbRes)) {
      augmentsDatabase = dbRes;
    }
    if (cacheRes && typeof cacheRes === 'object') {
      championAugmentsCache = cacheRes;
    }

    // Render initial state for active champion
    updateActiveChampion(266, 'Aatrox', 'mayhem');
    renderDemoAugments();
    renderDemoBench();
    renderBuildAndSkills();
    renderSpellTimers();
    setupMousePassthrough();
  } catch (err) {
    console.error('Failed to init static data in overlay:', err);
  }
}

function getChampionInfo(champId) {
  const d = ddragonMap[String(champId)];
  if (d) return d;
  return { id: 'Aatrox', key: '266', name: 'Aatrox', title: 'the Darkin Blade', tags: ['Fighter'] };
}

// ----------------- CHAMPION & MODE SYNC -----------------
function updateActiveChampion(champId, champName, mode = 'mayhem') {
  currentChampId = Number(champId) || 266;
  currentMode = mode;
  const info = getChampionInfo(currentChampId);
  currentChampName = champName || info.name || 'Champion';

  if (hudChampImg) {
    hudChampImg.src = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${info.id || 'Aatrox'}.png`;
  }
  if (hudChampName) {
    hudChampName.textContent = currentChampName;
  }
  if (hudModeTag) {
    hudModeTag.textContent = mode === 'aram' ? 'ARAM' : (mode === 'mayhem' ? 'ARAM: MAYHEM' : 'RANKED SOLO');
  }
  if (augmentChampBadge) {
    augmentChampBadge.textContent = `${currentChampName} • ${(info.tags || ['Fighter']).join(' / ')}`;
  }

  // Adjust widget visibility based on mode
  if (mode === 'aram') {
    if (hudBenchWidget) hudBenchWidget.style.display = 'block';
    if (hudAugmentAdvisor) hudAugmentAdvisor.style.display = 'none';
  } else if (mode === 'mayhem' || mode === 'arena') {
    if (hudBenchWidget) hudBenchWidget.style.display = 'block';
    if (hudAugmentAdvisor) hudAugmentAdvisor.style.display = 'block';
  } else {
    if (hudBenchWidget) hudBenchWidget.style.display = 'none';
    if (hudAugmentAdvisor) hudAugmentAdvisor.style.display = 'none';
  }

  renderBuildAndSkills();
  renderDemoAugments();
}

// ----------------- 1. MAYHEM AUGMENT ADVISOR (PER-CHAMPION WIN RATES & TIERING) -----------------
function computeAugmentsForChamp(champId) {
  if (champAugmentsMemo.has(champId)) {
    return champAugmentsMemo.get(champId);
  }

  const champ = getChampionInfo(champId);
  const tags = (champ.tags || ['Fighter']).map(t => t.toLowerCase());
  const cacheKey = String(champId);
  const cachedOverrides = championAugmentsCache[cacheKey] || championAugmentsCache[champ.name] || {};

  const ranked = augmentsDatabase.map(raw => {
    let wr = raw.winRate || 51.5;
    let pick = raw.pickRate || 12.0;
    let first = raw.firstPlaceRate || 22.0;

    const lowerName = (raw.name || '').toLowerCase();
    const lowerDesc = (raw.desc || raw.description || '').toLowerCase();
    const combined = `${lowerName} ${lowerDesc}`;

    let synergyBonus = 0;
    let synergyReason = 'Standard viability';

    if (tags.includes('fighter') || tags.includes('assassin')) {
      if (combined.includes('attack damage') || combined.includes('ad') || combined.includes('crit') || combined.includes('omnivamp') || combined.includes('lifesteal')) {
        synergyBonus += 4.5;
        synergyReason = `High synergy with ${champ.name}'s physical & AD scaling`;
      }
    }
    if (tags.includes('mage') || tags.includes('support')) {
      if (combined.includes('ability power') || combined.includes('ap') || combined.includes('magic') || combined.includes('burn')) {
        synergyBonus += 4.5;
        synergyReason = `Massive synergy with ${champ.name}'s AP burst and magic abilities`;
      }
    }
    if (tags.includes('tank')) {
      if (combined.includes('health') || combined.includes('armor') || combined.includes('goliath') || combined.includes('shield')) {
        synergyBonus += 4.0;
        synergyReason = `Excellent durability and health scaling for ${champ.name}`;
      }
    }
    if (combined.includes('bread and butter') || combined.includes('haste') || combined.includes('cooldown')) {
      synergyBonus += 3.2;
      synergyReason = `Lowers primary ability cooldown for constant pressure`;
    }

    if (cachedOverrides[raw.id]) {
      const ov = cachedOverrides[raw.id];
      if (ov.winRate) wr = ov.winRate;
      if (ov.tier) return { ...raw, ...ov };
    }

    const finalWr = parseFloat((wr + synergyBonus).toFixed(2));
    let tier = 'B';
    if (finalWr >= 55.5) tier = 'S+';
    else if (finalWr >= 52.8) tier = 'S';
    else if (finalWr >= 50.0) tier = 'A';
    else if (finalWr >= 47.0) tier = 'B';
    else tier = 'C';

    return {
      ...raw,
      winRate: finalWr,
      tier,
      synergyReason
    };
  });

  ranked.sort((a, b) => b.winRate - a.winRate);
  champAugmentsMemo.set(champId, ranked);
  return ranked;
}

let activeThreeOffers = [];

function renderDemoAugments() {
  const ranked = computeAugmentsForChamp(currentChampId);
  if (ranked.length < 3) return;

  // Pick 3 interesting offers (e.g. 1 S+, 1 S or A, 1 B or C)
  const splus = ranked.find(a => a.tier === 'S+') || ranked[0];
  const mid = ranked.find(a => a.tier === 'S' || a.tier === 'A') || ranked[4];
  const low = ranked.find(a => a.tier === 'B' || a.tier === 'C') || ranked[ranked.length - 1];

  activeThreeOffers = [splus, mid, low].sort(() => 0.5 - Math.random());
  renderThreeOffers(activeThreeOffers);
}

function renderThreeOffers(offers) {
  if (!augmentChoicesContainer) return;

  // Smart Verdict Evaluation
  const bestOffer = [...offers].sort((a, b) => b.winRate - a.winRate)[0];
  const isHighRoll = bestOffer.winRate >= 54.0;
  const isRerollRec = bestOffer.winRate < 50.0;

  if (smartVerdictBanner && verdictHeadline && verdictSubtext) {
    if (isHighRoll) {
      smartVerdictBanner.className = 'smart-verdict-banner';
      verdictHeadline.textContent = `🔥 OP.GG VERDICT: DO NOT REROLL! High-Roll Detected (${bestOffer.name} is ${bestOffer.tier} Tier)`;
      verdictSubtext.textContent = `${bestOffer.name} holds a massive ${bestOffer.winRate}% Win Rate with ${currentChampName}. ${bestOffer.synergyReason}.`;
    } else if (isRerollRec) {
      smartVerdictBanner.className = 'smart-verdict-banner reroll';
      verdictHeadline.textContent = `🎲 OP.GG VERDICT: REROLL RECOMMENDED! Low Synergy Offer`;
      verdictSubtext.textContent = `Highest offer win rate is only ${bestOffer.winRate}%. Rerolling is statistically favored for ${currentChampName}.`;
    } else {
      smartVerdictBanner.className = 'smart-verdict-banner';
      verdictHeadline.textContent = `✔️ OP.GG VERDICT: SOLID PICK (${bestOffer.name} - ${bestOffer.tier} Tier)`;
      verdictSubtext.textContent = `${bestOffer.name} is an above-average choice (${bestOffer.winRate}% WR). Safe to lock in if low on dice.`;
    }
  }

  augmentChoicesContainer.innerHTML = offers.map(a => {
    const rarityClass = (a.rarityName || 'Gold').toLowerCase();
    const tierClass = a.tier === 'S+' ? 'tier-splus' : (a.tier === 'S' ? 'tier-s' : (a.tier === 'A' ? 'tier-a' : 'tier-b'));
    const isPick = a === bestOffer && a.winRate >= 50.0;

    return `
      <div class="hud-augment-card ${tierClass}">
        <div class="card-top-header">
          <div class="card-augment-icon-wrap">
            <img class="card-augment-icon" src="${a.icon || 'https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/adapt_small.png'}" alt="${a.name}" onerror="this.src='https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/adapt_small.png'" />
            <div class="card-rarity-pill ${rarityClass}">${a.rarityName || 'Gold'}</div>
          </div>
          <div class="card-stats-column">
            <div class="card-tier-badge ${tierClass}">${a.tier} TIER</div>
            <div class="card-wr-val ${a.winRate >= 54 ? 'high' : ''}">${a.winRate}%</div>
            <div class="card-wr-label">Champion Win Rate</div>
          </div>
        </div>

        <div class="card-augment-title">${a.name}</div>
        <div class="card-augment-desc">${a.desc || a.description || 'Enhances champion abilities with unique passives.'}</div>

        <div class="card-synergy-box">
          <strong>OP.GG Synergy:</strong> ${a.synergyReason}
        </div>

        <div class="card-verdict-pill ${isPick ? 'pick' : 'reroll'}">
          ${isPick ? '⭐ RECOMMENDED PICK' : (a.winRate < 50 ? '🎲 REROLL CANDIDATE' : 'SECONDARY CHOICE')}
        </div>
      </div>
    `;
  }).join('');

  setupMousePassthrough();
}

// ----------------- AUGMENT LIVE SEARCH DRAWER -----------------
if (btnToggleAugmentSearch) {
  btnToggleAugmentSearch.addEventListener('click', () => {
    const isVisible = augmentSearchDrawer.style.display !== 'none';
    augmentSearchDrawer.style.display = isVisible ? 'none' : 'block';
    if (!isVisible && hudAugmentSearchInput) {
      hudAugmentSearchInput.focus();
      filterAugmentSearchResults('');
    }
  });
}

if (btnCloseAugmentSearch) {
  btnCloseAugmentSearch.addEventListener('click', () => {
    augmentSearchDrawer.style.display = 'none';
  });
}

if (hudAugmentSearchInput) {
  hudAugmentSearchInput.addEventListener('input', (e) => {
    filterAugmentSearchResults(e.target.value.trim().toLowerCase());
  });
}

function filterAugmentSearchResults(query) {
  if (!hudAugmentSearchResults) return;
  const ranked = computeAugmentsForChamp(currentChampId);
  const filtered = query ? ranked.filter(a => a.name.toLowerCase().includes(query) || (a.desc || '').toLowerCase().includes(query)) : ranked.slice(0, 15);

  hudAugmentSearchResults.innerHTML = filtered.map(a => `
    <div class="drawer-item-row">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="${a.icon || 'https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/adapt_small.png'}" style="width: 24px; height: 24px; border-radius: 4px;" />
        <span style="font-weight: 800; font-size: 12px; color: #fff;">${a.name}</span>
        <span style="font-size: 10px; color: #888;">(${a.rarityName})</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="hud-tier-tag ${a.tier === 'S+' ? 'tier-splus' : (a.tier === 'S' ? 'tier-s' : 'tier-a')}">${a.tier}</span>
        <span style="font-weight: 800; font-size: 12px; color: ${a.winRate >= 53 ? 'var(--opgg-cyan)' : '#bbb'};">${a.winRate}% WR</span>
      </div>
    </div>
  `).join('');
}

if (btnRerollDemoOffers) {
  btnRerollDemoOffers.addEventListener('click', () => {
    const ranked = computeAugmentsForChamp(currentChampId);
    activeThreeOffers = [...ranked].sort(() => 0.5 - Math.random()).slice(0, 3);
    renderThreeOffers(activeThreeOffers);
    showHudToast('🎲 Generated 3 new Mayhem augment offers');
  });
}

// ----------------- 2. ARAM BENCH CARDS (DOCK IN CHAMP SELECT) -----------------
function renderDemoBench() {
  const demoBenchIds = [84, 222, 99, 157, 412]; // Akali, Jinx, Lux, Yasuo, Thresh
  renderBenchCards(demoBenchIds);
}

function renderBenchCards(benchIds) {
  if (!benchCardsRow) return;
  if (!benchIds || benchIds.length === 0) {
    benchCardsRow.innerHTML = '<div style="font-size: 12px; color: #777; padding: 10px;">Bench is empty.</div>';
    if (benchBadgeCount) benchBadgeCount.textContent = '0';
    return;
  }

  if (benchBadgeCount) benchBadgeCount.textContent = String(benchIds.length);

  benchCardsRow.innerHTML = benchIds.map(id => {
    const champ = getChampionInfo(id);
    const wr = 48.0 + ((Number(id) * 13) % 70) / 10;
    const tier = wr >= 53.5 ? 'S+' : (wr >= 51.5 ? 'S' : (wr >= 49.5 ? 'A' : 'B'));

    return `
      <div class="hud-bench-card" data-champ-id="${id}" title="Click to swap with ${champ.name}">
        <div class="bench-portrait-wrap">
          <img src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${champ.id || 'Aatrox'}.png" alt="${champ.name}" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/Aatrox.png'" />
        </div>
        <div class="bench-champ-name">${champ.name}</div>
        <div class="bench-wr-tag">${tier} • ${wr.toFixed(1)}%</div>
        <button class="bench-swap-btn" data-swap-id="${id}">SWAP</button>
      </div>
    `;
  }).join('');

  // Attach swap click listener
  benchCardsRow.querySelectorAll('.bench-swap-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const cid = Number(btn.getAttribute('data-swap-id'));
      const champ = getChampionInfo(cid);
      const res = await window.opgg?.lcuSwapBench(cid);
      if (res?.success) {
        showHudToast(`✅ Swapped to ${champ.name}!`);
        updateActiveChampion(cid, champ.name, 'aram');
      } else {
        showHudToast(`Bench swap simulated for ${champ.name}`);
        updateActiveChampion(cid, champ.name, 'aram');
      }
    });
  });

  setupMousePassthrough();
}

// ----------------- 3. IN-GAME RECOMMENDED BUILD & SKILL HUD -----------------
function renderBuildAndSkills() {
  if (skillMaxText) skillMaxText.textContent = 'Q > E > W';
  if (buildWrBadge) buildWrBadge.textContent = '53.2% WR';

  if (skillProgressionBar) {
    const skills = ['Q', 'E', 'W', 'Q', 'Q', 'R', 'Q', 'E', 'Q', 'E', 'R', 'E', 'E', 'W', 'W', 'R', 'W', 'W'];
    skillProgressionBar.innerHTML = skills.map((s, idx) => `
      <div class="skill-block ${idx === 0 || idx === 3 || idx === 4 || idx === 5 ? 'active' : ''}">${s}</div>
    `).join('');
  }

  if (coreItemsRow) {
    // 3078 Trinity, 3053 Sterak, 3161 Shojin
    coreItemsRow.innerHTML = [3078, 3053, 3161].map(id => `
      <img class="hud-item-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${id}.png" alt="Item" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/1055.png'" title="Core Item #${id}" />
    `).join('');
  }

  if (situationalItemsRow) {
    // 3026 GA, 3075 Thornmail, 3156 Maw
    situationalItemsRow.innerHTML = [3026, 3075, 3156].map(id => `
      <img class="hud-item-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${id}.png" alt="Item" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/3047.png'" title="Counter Item #${id}" />
    `).join('');
  }
}

// ----------------- 4. ARAM HEALTH RELIC & SPELL TIMERS -----------------
const activeTimers = {};

function renderSpellTimers() {
  document.querySelectorAll('.relic-timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const relicKey = btn.getAttribute('data-relic');
      startRelicTimer(relicKey, btn);
    });
  });

  if (flashTimersList) {
    const roles = ['TOP', 'JUG', 'MID', 'ADC', 'SUP'];
    flashTimersList.innerHTML = roles.map(role => `
      <div class="flash-timer-row" data-role="${role}">
        <span>${role} Flash</span>
        <span class="timer-countdown" id="flashTimer-${role}">Ready</span>
      </div>
    `).join('');

    flashTimersList.querySelectorAll('.flash-timer-row').forEach(row => {
      row.addEventListener('click', () => {
        const role = row.getAttribute('data-role');
        startFlashTimer(role, row);
      });
    });
  }
}

function startRelicTimer(key, btn) {
  if (activeTimers[key]) {
    clearInterval(activeTimers[key]);
    delete activeTimers[key];
    btn.classList.remove('counting');
    const label = btn.querySelector('.timer-countdown');
    if (label) label.textContent = 'Ready';
    return;
  }

  let rem = 60;
  btn.classList.add('counting');
  const label = btn.querySelector('.timer-countdown');

  activeTimers[key] = setInterval(() => {
    rem--;
    if (label) label.textContent = `${rem}s`;
    if (rem <= 0) {
      clearInterval(activeTimers[key]);
      delete activeTimers[key];
      btn.classList.remove('counting');
      if (label) label.textContent = 'Ready!';
      showHudToast(`🚨 ${key.toUpperCase()} Health Relic is back UP!`);
    }
  }, 1000);
}

function startFlashTimer(role, row) {
  const key = `flash-${role}`;
  const label = document.getElementById(`flashTimer-${role}`);
  if (activeTimers[key]) {
    clearInterval(activeTimers[key]);
    delete activeTimers[key];
    row.classList.remove('counting');
    if (label) label.textContent = 'Ready';
    return;
  }

  let rem = 300;
  row.classList.add('counting');

  activeTimers[key] = setInterval(() => {
    rem--;
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    if (label) label.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    if (rem <= 0) {
      clearInterval(activeTimers[key]);
      delete activeTimers[key];
      row.classList.remove('counting');
      if (label) label.textContent = 'Ready!';
      showHudToast(`🚨 ${role} Flash is back UP!`);
    }
  }, 1000);
}

// ----------------- HUD WIDGET TOGGLES & MINIMIZE -----------------
function setupWidgetControls() {
  if (btnToggleAugments && hudAugmentAdvisor) {
    btnToggleAugments.addEventListener('click', () => {
      const isVisible = hudAugmentAdvisor.style.display !== 'none';
      hudAugmentAdvisor.style.display = isVisible ? 'none' : 'block';
      btnToggleAugments.classList.toggle('active', !isVisible);
    });
  }

  if (btnToggleBench && hudBenchWidget) {
    btnToggleBench.addEventListener('click', () => {
      const isVisible = hudBenchWidget.style.display !== 'none';
      hudBenchWidget.style.display = isVisible ? 'none' : 'block';
      btnToggleBench.classList.toggle('active', !isVisible);
    });
  }

  if (btnToggleBuild && hudBuildWidget) {
    btnToggleBuild.addEventListener('click', () => {
      const isVisible = hudBuildWidget.style.display !== 'none';
      hudBuildWidget.style.display = isVisible ? 'none' : 'block';
      btnToggleBuild.classList.toggle('active', !isVisible);
    });
  }

  if (btnToggleTimers && hudTimersWidget) {
    btnToggleTimers.addEventListener('click', () => {
      const isVisible = hudTimersWidget.style.display !== 'none';
      hudTimersWidget.style.display = isVisible ? 'none' : 'block';
      btnToggleTimers.classList.toggle('active', !isVisible);
    });
  }

  // Minimize buttons
  if (btnMinimizeAugments && hudAugmentAdvisor) {
    btnMinimizeAugments.addEventListener('click', () => hudAugmentAdvisor.classList.toggle('minimized'));
  }
  if (btnMinimizeBench && hudBenchWidget) {
    btnMinimizeBench.addEventListener('click', () => hudBenchWidget.classList.toggle('minimized'));
  }
  if (btnMinimizeBuild && hudBuildWidget) {
    btnMinimizeBuild.addEventListener('click', () => hudBuildWidget.classList.toggle('minimized'));
  }
  if (btnMinimizeTimers && hudTimersWidget) {
    btnMinimizeTimers.addEventListener('click', () => hudTimersWidget.classList.toggle('minimized'));
  }

  if (btnHudDemo) {
    const demoPool = [
      { id: 266, name: 'Aatrox', mode: 'mayhem' },
      { id: 222, name: 'Jinx', mode: 'aram' },
      { id: 99, name: 'Lux', mode: 'mayhem' },
      { id: 157, name: 'Yasuo', mode: 'arena' }
    ];
    let poolIdx = 0;
    btnHudDemo.addEventListener('click', () => {
      poolIdx = (poolIdx + 1) % demoPool.length;
      const d = demoPool[poolIdx];
      updateActiveChampion(d.id, d.name, d.mode);
      showHudToast(`Switched Demo Champion to ${d.name} (${d.mode.toUpperCase()})`);
    });
  }

  if (btnHudClose) {
    btnHudClose.addEventListener('click', () => {
      window.opgg?.overlayClose();
    });
  }
}

// ----------------- LCU EVENT LISTENER -----------------
if (window.opgg?.onChampSelectUpdate) {
  window.opgg.onChampSelectUpdate((data) => {
    currentSessionData = data;
    const champId = data.myChampionId || 266;
    const mode = data.mode || (data.benchEnabled ? 'aram' : 'ranked');
    updateActiveChampion(champId, null, mode);

    if (data.benchChampions && data.benchChampions.length > 0) {
      renderBenchCards(data.benchChampions.map(b => b.championId));
    }
  });
}

// Boot
setupWidgetControls();
initData();
