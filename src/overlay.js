// ================= ARAM & MAYHEM CARD OVERLAY CONTROLLER =================

const DDRAGON_VER = '16.20.1';
let ddragonMap = {};
let runesMap = {};
let augmentsList = [];
let currentMode = 'aram';
let isCompact = false;
let isPinned = true;
let currentChampSelectData = null;
let cachedAramTierList = null;
let cachedArenaTierList = null;
let champDetailsCache = {};

// DOM Elements
const overlayContainer = document.getElementById('overlayContainer');
const overlayModeText = document.getElementById('overlayModeText');
const benchCardsScroll = document.getElementById('benchCardsScroll');
const benchEmptyState = document.getElementById('benchEmptyState');
const benchCount = document.getElementById('benchCount');
const teamCardsRow = document.getElementById('teamCardsRow');
const augmentsGrid = document.getElementById('augmentsGrid');
const augmentSearch = document.getElementById('augmentSearch');
const filterChips = document.querySelectorAll('.filter-chip');
const navTabs = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');
const overlayToast = document.getElementById('overlayToast');

const btnTestDemo = document.getElementById('btnTestDemo');
const btnDockLeague = document.getElementById('btnDockLeague');
const btnToggleCompact = document.getElementById('btnToggleCompact');
const btnPinTop = document.getElementById('btnPinTop');
const btnCloseOverlay = document.getElementById('btnCloseOverlay');
const btnSyncCurrentRunes = document.getElementById('btnSyncCurrentRunes');

function showOverlayToast(msg, isError = false) {
  overlayToast.textContent = msg;
  overlayToast.style.borderColor = isError ? '#e84057' : '#00bba3';
  overlayToast.classList.add('show');
  setTimeout(() => overlayToast.classList.remove('show'), 3000);
}

// ----------------- LOAD STATIC DATA -----------------
async function initStaticData() {
  try {
    const [ddragonRes, runesRes, augmentsRes] = await Promise.all([
      fetch('assets/champions_ddragon.json').then(r => r.json()).catch(() => null),
      fetch('assets/runes.json').then(r => r.json()).catch(() => null),
      fetch('assets/ranked_augments.json').then(r => r.json()).catch(() => fetch('assets/augments.json').then(r => r.json())).catch(() => null)
    ]);

    if (ddragonRes?.data) {
      Object.values(ddragonRes.data).forEach(c => {
        ddragonMap[c.key] = c;
        ddragonMap[c.id.toLowerCase()] = c;
      });
    }

    if (Array.isArray(runesRes)) {
      runesRes.forEach(tree => {
        runesMap[tree.id] = tree;
        tree.slots.forEach(slot => {
          slot.runes.forEach(rune => {
            runesMap[rune.id] = rune;
          });
        });
      });
    }

    if (Array.isArray(augmentsRes)) {
      augmentsList = augmentsRes;
      renderAugments(augmentsList);
    }
  } catch (err) {
    console.error('Static data load error:', err);
  }
}

function getChampDdragon(champId) {
  return ddragonMap[String(champId)] || null;
}

function getRuneInfo(runeId) {
  return runesMap[runeId] || { name: 'Rune', icon: 'perk-images/Styles/7200_Domination.png' };
}

// ----------------- NAVIGATION TABS -----------------
navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    navTabs.forEach(t => t.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const tabName = tab.getAttribute('data-tab');
    const panel = document.getElementById(`panel-${tabName}`);
    if (panel) panel.classList.add('active');
  });
});

// ----------------- WINDOW ACTION CONTROLS -----------------
btnTestDemo.addEventListener('click', () => loadDemoBench());

btnToggleCompact.addEventListener('click', () => {
  isCompact = !isCompact;
  overlayContainer.classList.toggle('compact', isCompact);
  document.getElementById('compactLabel').textContent = isCompact ? 'Full' : 'Compact';
  if (window.opgg?.overlaySetCompact) {
    window.opgg.overlaySetCompact(isCompact);
  }
});

btnDockLeague.addEventListener('click', async () => {
  if (window.opgg?.overlayDockToLeague) {
    const res = await window.opgg.overlayDockToLeague();
    if (res?.success) {
      showOverlayToast('🗗 Docked directly over League client!');
    } else {
      showOverlayToast('League client window not detected. Centered on screen.', true);
    }
  }
});

btnPinTop.addEventListener('click', async () => {
  if (window.opgg?.overlayTogglePin) {
    isPinned = await window.opgg.overlayTogglePin();
    btnPinTop.classList.toggle('active', isPinned);
    showOverlayToast(isPinned ? '📌 Always on Top: ON' : 'Always on Top: OFF');
  }
});

btnCloseOverlay.addEventListener('click', () => {
  if (window.opgg?.overlayClose) {
    window.opgg.overlayClose();
  }
});

// ----------------- TIER LIST & CHAMPION STATS ENGINE -----------------

async function getModeTierList(mode = 'aram') {
  if (mode === 'aram' && cachedAramTierList) return cachedAramTierList;
  if ((mode === 'arena' || mode === 'mayhem') && cachedArenaTierList) return cachedArenaTierList;

  try {
    if (window.opgg?.getModeTierList) {
      const data = await window.opgg.getModeTierList(mode);
      if (mode === 'aram') cachedAramTierList = data;
      else cachedArenaTierList = data;
      return data;
    }
  } catch (e) {}
  return [];
}

async function getChampionStatsAndBuild(champId, mode = 'aram') {
  const cacheKey = `${champId}_${mode}`;
  if (champDetailsCache[cacheKey]) return champDetailsCache[cacheKey];

  let stats = {
    tier: 'B',
    tierClass: 'tier-b',
    winRate: '50.0%',
    isGoldWr: false,
    pickRate: '5.0%',
    rank: 80,
    keystoneId: 8010,
    keystoneName: 'Conqueror',
    keystoneIcon: 'perk-images/Styles/Precision/Conqueror/Conqueror.png',
    starterItems: [1001, 1055],
    coreItems: [3078, 3053, 3161]
  };

  try {
    // 1. Get tier stats from mode tier list
    const tierList = await getModeTierList(mode);
    const champEntry = tierList.find(c => c.id === champId);
    if (champEntry && champEntry.average_stats) {
      const wr = (champEntry.average_stats.win_rate * 100);
      const pr = (champEntry.average_stats.pick_rate * 100);
      stats.winRate = `${wr.toFixed(1)}%`;
      stats.pickRate = `${pr.toFixed(1)}%`;
      stats.rank = champEntry.average_stats.rank || 1;
      stats.isGoldWr = wr >= 53.0;

      const rawTier = champEntry.average_stats.tier || 2;
      if (rawTier === 1 && wr >= 53.2) {
        stats.tier = 'S+ (OP)';
        stats.tierClass = 'tier-splus';
      } else if (rawTier === 1) {
        stats.tier = 'S-TIER';
        stats.tierClass = 'tier-s';
      } else if (rawTier === 2) {
        stats.tier = 'A-TIER';
        stats.tierClass = 'tier-a';
      } else if (rawTier === 3) {
        stats.tier = 'B-TIER';
        stats.tierClass = 'tier-b';
      } else {
        stats.tier = 'C-TIER';
        stats.tierClass = 'tier-b';
      }
    }

    // 2. Get runes & items build
    if (window.opgg?.getChampionDetail) {
      const detail = await window.opgg.getChampionDetail(champId, 'none', 'all', mode);
      const build = detail?.build || {};

      if (build.runes && build.runes[0]) {
        const primaryRuneId = build.runes[0].primary_rune_ids?.[0] || build.runes[0].id;
        if (primaryRuneId) {
          stats.keystoneId = primaryRuneId;
          const rInfo = getRuneInfo(primaryRuneId);
          stats.keystoneName = rInfo.name || 'Keystone';
          stats.keystoneIcon = rInfo.icon || 'perk-images/Styles/Precision/Conqueror/Conqueror.png';
        }
      }

      if (build.starter_items && build.starter_items[0]?.ids) {
        stats.starterItems = build.starter_items[0].ids.slice(0, 2);
      }
      if (build.core_items && build.core_items[0]?.ids) {
        stats.coreItems = build.core_items[0].ids.slice(0, 3);
      }
    }
  } catch (e) {
    console.error('Error fetching champion stats:', e);
  }

  champDetailsCache[cacheKey] = stats;
  return stats;
}

// ----------------- RENDER ARAM BENCH CARDS -----------------
async function renderBenchCards(benchChampions, mode = 'aram') {
  if (!benchChampions || benchChampions.length === 0) {
    benchCardsScroll.innerHTML = `
      <div class="empty-overlay-state">
        <div class="spinner-small" style="margin-bottom: 8px;"></div>
        <h4>Waiting for ARAM Bench Rerolls...</h4>
        <p>When you or your teammates reroll, glowing champion cards appear here with S-Tier/A-Tier ratings and 1-click swap.</p>
        <button class="btn-demo-trigger" onclick="loadDemoBench()">Click to Preview Demo Bench Cards</button>
      </div>
    `;
    benchCount.textContent = '0';
    return;
  }

  benchCount.textContent = String(benchChampions.length);
  benchCardsScroll.innerHTML = `
    <div class="empty-overlay-state">
      <div class="spinner-small" style="margin-bottom: 8px;"></div>
      <span>Loading OP.GG live ARAM stats for bench cards...</span>
    </div>
  `;

  const cardsHtmlArray = await Promise.all(benchChampions.map(async (b) => {
    const champId = b.championId;
    const ddragon = getChampDdragon(champId) || { id: 'Aatrox', name: `Champion ${champId}` };
    const stats = await getChampionStatsAndBuild(champId, mode);

    const runeImg = `https://ddragon.leagueoflegends.com/cdn/img/${stats.keystoneIcon}`;
    const champImg = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${ddragon.id}.png`;

    const starterItemsHtml = stats.starterItems.map(itemId => `
      <img class="item-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${itemId}.png" title="Starter Item" onerror="this.style.display='none'" />
    `).join('');

    const coreItemsHtml = stats.coreItems.map(itemId => `
      <img class="item-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${itemId}.png" title="Core Item" onerror="this.style.display='none'" />
    `).join('');

    return `
      <div class="bench-card ${stats.tierClass}" id="bench-card-${champId}">
        <div class="card-header-row">
          <div class="champ-portrait-wrapper">
            <img src="${champImg}" alt="${ddragon.name}" />
            <div class="champ-tier-badge ${stats.tierClass}">${stats.tier}</div>
          </div>
          <div class="card-meta-info">
            <div class="card-champ-name" title="${ddragon.name}">${ddragon.name}</div>
            <div class="card-winrate-row">
              <span class="card-winrate ${stats.isGoldWr ? 'gold' : ''}">${stats.winRate} WR</span>
              <span class="card-rank">#${stats.rank}</span>
            </div>
            <div class="card-pickrate">${stats.pickRate} Pick</div>
          </div>
        </div>

        <div class="card-runes-row">
          <div class="rune-badge-combo" title="${stats.keystoneName}">
            <img class="rune-keystone-icon" src="${runeImg}" alt="${stats.keystoneName}" onerror="this.src='assets/images/icon-alert.svg'" />
            <span class="rune-name-label">${stats.keystoneName}</span>
          </div>
          <div class="card-items-preview">
            ${starterItemsHtml}
            ${coreItemsHtml}
          </div>
        </div>

        <button class="btn-swap-bench-card" onclick="triggerBenchSwap(${champId}, '${ddragon.name}')">
          <span>⚡ Swap</span>
        </button>
      </div>
    `;
  }));

  benchCardsScroll.innerHTML = cardsHtmlArray.join('');
}

// ----------------- RENDER TEAM CARDS -----------------
async function renderTeamCards(myTeam, myChampId, mode = 'aram') {
  if (!myTeam || myTeam.length === 0) {
    teamCardsRow.innerHTML = `
      <div class="empty-overlay-state">
        <h4>No Active Team in Champion Select</h4>
        <p>Teammate champion cards will appear here as soon as champion select begins.</p>
      </div>
    `;
    return;
  }

  const teamHtmlArray = await Promise.all(myTeam.map(async (member) => {
    const cId = member.championId || member.championPickIntent || 0;
    const isMe = cId === myChampId && cId > 0;
    const ddragon = getChampDdragon(cId) || (cId > 0 ? { id: 'Aatrox', name: `Champion ${cId}` } : null);
    const stats = cId > 0 ? await getChampionStatsAndBuild(cId, mode) : null;

    const champImg = ddragon ? `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${ddragon.id}.png` : 'assets/images/icon-alert.svg';
    const runeImg = stats ? `https://ddragon.leagueoflegends.com/cdn/img/${stats.keystoneIcon}` : '';

    const coreItemsHtml = stats ? stats.coreItems.map(itemId => `
      <img class="item-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${itemId}.png" title="Core Item" onerror="this.style.display='none'" />
    `).join('') : '';

    return `
      <div class="team-card ${isMe ? 'is-me' : ''}">
        ${isMe ? '<div class="me-indicator-badge">⚡ YOUR CHAMPION</div>' : ''}
        <div class="card-header-row">
          <div class="champ-portrait-wrapper">
            <img src="${champImg}" />
            ${stats ? `<div class="champ-tier-badge ${stats.tierClass}">${stats.tier}</div>` : ''}
          </div>
          <div class="card-meta-info">
            <div class="card-champ-name">${ddragon ? ddragon.name : 'Selecting...'}</div>
            ${stats ? `
              <div class="card-winrate-row">
                <span class="card-winrate ${stats.isGoldWr ? 'gold' : ''}">${stats.winRate} WR</span>
                <span class="card-rank">#${stats.rank}</span>
              </div>
              <div class="card-pickrate">${stats.pickRate} Pick</div>
            ` : '<span style="font-size: 11px; color: #717d96;">Picking...</span>'}
          </div>
        </div>

        ${stats ? `
          <div class="card-runes-row">
            <div class="rune-badge-combo" title="${stats.keystoneName}">
              <img class="rune-keystone-icon" src="${runeImg}" onerror="this.src='assets/images/icon-alert.svg'" />
              <span class="rune-name-label">${stats.keystoneName}</span>
            </div>
            <div class="card-items-preview">
              ${coreItemsHtml}
            </div>
          </div>
        ` : ''}

        ${isMe && cId > 0 ? `
          <button class="btn-sync-runes-card" onclick="syncMyRunes(${cId}, '${ddragon?.name || ''}')">
            <span>⚡ Sync Runes & Build</span>
          </button>
        ` : ''}
      </div>
    `;
  }));

  teamCardsRow.innerHTML = teamHtmlArray.join('');
}

// ----------------- RENDER MAYHEM / ARENA AUGMENTS -----------------
function renderAugments(list) {
  if (!list || list.length === 0) {
    augmentsGrid.innerHTML = '<div class="empty-overlay-state"><h4>No Augment Cards Found</h4><p>Try searching for a different augment name, effect, or champion archetype.</p></div>';
    return;
  }

  augmentsGrid.innerHTML = list.map(aug => {
    const isSPlus = aug.tier === 'S+';
    const isS = aug.tier === 'S';
    const isA = aug.tier === 'A';
    const tierPillClass = isSPlus ? 'splus' : (isS ? 's' : (isA ? 'a' : 'b'));
    const rarityClass = (aug.rarity || 'Silver').toLowerCase();

    const champMiniHtml = (aug.bestChampions || []).slice(0, 4).map(c => {
      const champKey = c.id || c.name || 'Aatrox';
      return `<img class="champ-mini-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${champKey}.png" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/Aatrox.png'" title="${c.name || c.id}" />`;
    }).join('');

    return `
      <div class="augment-card ${aug.rarity}">
        <div class="augment-top">
          <div class="augment-name-group">
            <img class="augment-icon-img" src="${aug.smallIcon || aug.largeIcon || 'assets/images/icon-alert.svg'}" onerror="this.src='https://opgg-static.akamaized.net/meta/images/lol/latest/augment/acceleratingsorcery_small.png'" alt="${aug.name}" />
            <div>
              <div class="augment-name">${aug.name}</div>
              <span class="augment-rarity-badge ${rarityClass}">${aug.rarity}</span>
            </div>
          </div>
          <span class="augment-tier-pill ${tierPillClass}">${aug.tier} TIER</span>
        </div>
        <div class="augment-desc">${aug.description}</div>
        <div class="augment-footer">
          <div class="augment-stats">
            <span class="augment-winrate">${aug.winRate}% WR</span>
            <span style="color: #ffaa00; font-weight: 700;">👑 ${aug.firstPlaceRate || '16.0'}%</span>
            <span>Avg #${aug.avgPlace}</span>
          </div>
          <div class="augment-champ-synergies" title="Best Champion Synergies">
            ${champMiniHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Augment Search & Multi-Filters (Rarity + Tier)
const tierChips = document.querySelectorAll('.tier-chip');

augmentSearch.addEventListener('input', filterAugments);
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterAugments();
  });
});

tierChips.forEach(chip => {
  chip.addEventListener('click', () => {
    tierChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filterAugments();
  });
});

function filterAugments() {
  const query = augmentSearch.value.trim().toLowerCase();
  const activeRarityChip = document.querySelector('.filter-chip.active');
  const rarity = activeRarityChip ? activeRarityChip.getAttribute('data-rarity') : 'all';

  const activeTierChip = document.querySelector('.tier-chip.active');
  const tier = activeTierChip ? activeTierChip.getAttribute('data-tier') : 'all';

  const filtered = augmentsList.filter(aug => {
    const matchesRarity = rarity === 'all' || aug.rarity === rarity;
    const matchesTier = tier === 'all' || aug.tier === tier;
    const matchesText = !query ||
      aug.name.toLowerCase().includes(query) ||
      aug.description.toLowerCase().includes(query) ||
      (aug.bestChampions && aug.bestChampions.some(c => (c.name || '').toLowerCase().includes(query)));
    return matchesRarity && matchesTier && matchesText;
  });

  renderAugments(filtered);
}

// ----------------- IN-GAME 3-CHOICE AUGMENT DECISION PICKER -----------------
const btnCompareChoices = document.getElementById('btnCompareChoices');
const pickerCard1 = document.getElementById('pickerCard1');
const pickerCard2 = document.getElementById('pickerCard2');
const pickerCard3 = document.getElementById('pickerCard3');
const pickerResults = document.getElementById('pickerResults');

if (btnCompareChoices) {
  btnCompareChoices.addEventListener('click', runChoiceComparison);
  [pickerCard1, pickerCard2, pickerCard3].forEach(inp => {
    inp?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runChoiceComparison();
    });
  });
}

function runChoiceComparison() {
  const c1 = pickerCard1?.value.trim().toLowerCase() || '';
  const c2 = pickerCard2?.value.trim().toLowerCase() || '';
  const c3 = pickerCard3?.value.trim().toLowerCase() || '';

  if (!c1 && !c2 && !c3) {
    showOverlayToast('Type in at least 1 or 2 card choices to compare!', true);
    return;
  }

  const findBestMatch = (query) => {
    if (!query) return null;
    return augmentsList.find(a => a.name.toLowerCase() === query) ||
           augmentsList.find(a => a.name.toLowerCase().includes(query)) ||
           null;
  };

  const matches = [findBestMatch(c1), findBestMatch(c2), findBestMatch(c3)].filter(Boolean);
  if (matches.length === 0) {
    pickerResults.style.display = 'block';
    pickerResults.innerHTML = '<div style="color: #f87171; font-size: 11px; padding: 6px;">No matching augment cards found. Check spelling.</div>';
    return;
  }

  matches.sort((a, b) => {
    if (a.tierRank !== b.tierRank) return a.tierRank - b.tierRank;
    return b.winRate - a.winRate;
  });

  const bestAugment = matches[0];

  pickerResults.style.display = 'grid';
  pickerResults.innerHTML = matches.map((m, idx) => {
    const isWinner = m.id === bestAugment.id;
    return `
      <div class="picker-result-card ${isWinner ? 'winner' : ''}">
        ${isWinner ? '<div class="winner-badge">👑 OP.GG TOP PICK</div>' : ''}
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${m.smallIcon || m.largeIcon}" style="width: 28px; height: 28px; border-radius: 50%;" />
          <div>
            <div style="font-weight: 800; font-size: 11px; color: #fff;">${m.name}</div>
            <div style="font-size: 10px; color: var(--text-dim);">${m.rarity} • <b style="color: ${isWinner ? 'var(--opgg-cyan)' : '#ffb800'};">${m.tier} Tier</b></div>
          </div>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: var(--opgg-cyan); margin-top: 4px;">
          ${m.winRate}% Win Rate • Avg #${m.avgPlace} • 👑 ${m.firstPlaceRate}% 1st
        </div>
      </div>
    `;
  }).join('');
}

// ----------------- 1-CLICK BENCH SWAP -----------------
window.triggerBenchSwap = async function(champId, champName) {
  const card = document.getElementById(`bench-card-${champId}`);
  if (card) {
    const swapBtn = card.querySelector('.btn-swap-bench-card');
    if (swapBtn) {
      swapBtn.innerHTML = '<span>⚡ Swapping...</span>';
      swapBtn.style.opacity = '0.7';
    }
  }

  try {
    if (window.opgg?.lcuSwapBench) {
      const res = await window.opgg.lcuSwapBench(champId);
      if (res?.success) {
        showOverlayToast(`⚡ Swapped to ${champName}! Runes auto-syncing...`);
      } else {
        showOverlayToast(`Swap failed: ${res?.error || 'Champion may have been taken'}`, true);
      }
    } else {
      showOverlayToast(`⚡ [Demo Mode] Swapped to ${champName}!`);
    }
  } catch (err) {
    showOverlayToast(`Swap error: ${err.message}`, true);
  }

  if (card) {
    const swapBtn = card.querySelector('.btn-swap-bench-card');
    if (swapBtn) {
      swapBtn.innerHTML = '<span>⚡ Swap</span>';
      swapBtn.style.opacity = '1';
    }
  }
};

window.syncMyRunes = async function(champId, champName) {
  try {
    const detail = await window.opgg.getChampionDetail(champId, 'none', 'all', currentMode);
    const runes = detail?.build?.runes?.[0];
    if (runes) {
      const payload = {
        championName: champName,
        primaryStyleId: runes.primary_page_id || 8000,
        subStyleId: runes.secondary_page_id || 8400,
        selectedPerkIds: [
          ...(runes.primary_rune_ids || []),
          ...(runes.secondary_rune_ids || []),
          ...(runes.stat_mod_ids || [])
        ]
      };
      const res = await window.opgg.lcuApplyRunes(payload);
      if (res?.success) {
        showOverlayToast(`⚡ OP.GG Runes imported for ${champName}!`);
      } else {
        showOverlayToast(`Rune import failed: ${res?.error || 'Client error'}`, true);
      }
    }
  } catch (err) {
    showOverlayToast(`Rune sync error: ${err.message}`, true);
  }
};

btnSyncCurrentRunes.addEventListener('click', () => {
  if (currentChampSelectData?.myChampionId) {
    const champ = getChampDdragon(currentChampSelectData.myChampionId);
    syncMyRunes(currentChampSelectData.myChampionId, champ?.name || 'Champion');
  } else {
    showOverlayToast('No champion locked in yet!', true);
  }
});

// ----------------- DEMO BENCH DATA (FOR TESTING OVERLAY) -----------------
window.loadDemoBench = function() {
  const demoBench = [
    { championId: 222 }, // Jinx (S+)
    { championId: 266 }, // Aatrox (S)
    { championId: 53 },  // Blitzcrank (S+)
    { championId: 99 },  // Lux (S)
    { championId: 145 }, // Kai'Sa (S)
    { championId: 122 }, // Darius (A)
    { championId: 17 },  // Teemo (A)
    { championId: 111 }  // Nautilus (S)
  ];

  const demoTeam = [
    { cellId: 1, championId: 222 },
    { cellId: 2, championId: 266 },
    { cellId: 3, championId: 53 },
    { cellId: 4, championId: 99 },
    { cellId: 5, championId: 145 }
  ];

  overlayModeText.textContent = 'ARAM & MAYHEM CARD OVERLAY (DEMO ACTIVE)';
  renderBenchCards(demoBench, 'aram');
  renderTeamCards(demoTeam, 222, 'aram');
  showOverlayToast('🎲 Demo ARAM Bench & Team Cards Loaded!');
};

// ----------------- LCU EVENT HOOKS -----------------
if (window.opgg?.onChampSelectUpdate) {
  window.opgg.onChampSelectUpdate((data) => {
    currentChampSelectData = data;
    currentMode = data.mode || 'aram';

    const isMayhem = currentMode === 'mayhem' || (data.queueName && data.queueName.toLowerCase().includes('mayhem'));
    overlayModeText.textContent = isMayhem ? '⚔️ ARAM: MAYHEM CARD OVERLAY (ACTIVE)' : '🎲 ARAM CARD OVERLAY (ACTIVE)';

    // Update bench cards
    if (data.benchChampions && data.benchChampions.length > 0) {
      renderBenchCards(data.benchChampions, currentMode);
      // Auto-switch to bench tab if we just entered ARAM
      const activeTab = document.querySelector('.nav-tab.active');
      if (!activeTab || activeTab.getAttribute('data-tab') === 'augments') {
        document.getElementById('tabBench').click();
      }
    } else {
      renderBenchCards([], currentMode);
    }

    // Update team cards
    if (data.myTeam && data.myTeam.length > 0) {
      renderTeamCards(data.myTeam, data.myChampionId, currentMode);
    }
  });
}

if (window.opgg?.onLcuStatus) {
  window.opgg.onLcuStatus((status) => {
    if (status.connected && status.gameflow === 'ChampSelect') {
      overlayModeText.textContent = '⚡ LIVE CHAMPION SELECT ACTIVE';
    }
  });
}

// Initialize
initStaticData();
