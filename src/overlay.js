// ================= ARAM & MAYHEM CARD OVERLAY CONTROLLER =================

const DDRAGON_VER = '16.20.1';
let ddragonMap = {};
let runesMap = {};
let itemsMap = {};
let augmentsList = [];
let currentMode = 'aram';
let isCompact = false;
let isPinned = true;
let currentChampSelectData = null;
let cachedAramTierList = null;
let cachedArenaTierList = null;
let champDetailsCache = {};

let activeOverlayChampId = 266; // default Aatrox
let activeOverlayMode = 'ranked';
let activeOverlayPresetIdx = 0;
let activeOverlayFlashKey = 'D';
let activeOverlayChampDetail = null;
let autoRunesEnabled = true;

const SPELL_DATA = {
  Flash: { name: 'Flash', cd: 300, key: 'SummonerFlash', short: 'f' },
  Teleport: { name: 'Teleport', cd: 360, key: 'SummonerTeleport', short: 'tp' },
  Ignite: { name: 'Ignite', cd: 180, key: 'SummonerDot', short: 'ignite' },
  Cleanse: { name: 'Cleanse', cd: 210, key: 'SummonerBoost', short: 'cleanse' },
  Ghost: { name: 'Ghost', cd: 240, key: 'SummonerHaste', short: 'ghost' },
  Heal: { name: 'Heal', cd: 240, key: 'SummonerHeal', short: 'heal' },
  Barrier: { name: 'Barrier', cd: 180, key: 'SummonerBarrier', short: 'barrier' },
  Exhaust: { name: 'Exhaust', cd: 210, key: 'SummonerExhaust', short: 'exhaust' },
  Smite: { name: 'Smite', cd: 90, key: 'SummonerSmite', short: 'smite' },
  Mark: { name: 'Mark', cd: 80, key: 'SummonerSnowball', short: 'snowball' },
  Flee: { name: 'Flee', cd: 60, key: 'SummonerCherryHold', short: 'flee' }
};

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

function normalizeItemId(id) {
  if (!id) return 1001;
  const num = Number(id);
  if (isNaN(num)) return id;
  if (num >= 100000) return num % 10000;
  return num;
}

// ----------------- LOAD STATIC DATA -----------------
async function initStaticData() {
  try {
    const [ddragonRes, runesRes, augmentsRes, itemsRes] = await Promise.all([
      fetch('assets/champions_ddragon.json').then(r => r.json()).catch(() => null),
      fetch('assets/runes.json').then(r => r.json()).catch(() => null),
      fetch('assets/ranked_augments.json').then(r => r.json()).catch(() => fetch('assets/augments.json').then(r => r.json())).catch(() => null),
      fetch('assets/items.json').then(r => r.json()).catch(() => null)
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

    if (itemsRes?.data || itemsRes) {
      itemsMap = itemsRes.data || itemsRes;
    }

    if (Array.isArray(augmentsRes)) {
      augmentsList = augmentsRes;
      renderAugments(augmentsList);
    }

    // Initial render of default champion runes & build
    renderOverlayRunesAndBuild(activeOverlayChampId, activeOverlayMode);
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

function getTreeDetails(treeId) {
  const treeNames = {
    8000: 'Precision',
    8100: 'Domination',
    8200: 'Sorcery',
    8400: 'Resolve',
    8300: 'Inspiration'
  };
  const treeIcons = {
    8000: 'perk-images/Styles/7201_Precision.png',
    8100: 'perk-images/Styles/7200_Domination.png',
    8200: 'perk-images/Styles/7202_Sorcery.png',
    8400: 'perk-images/Styles/7204_Resolve.png',
    8300: 'perk-images/Styles/7203_Whimsy.png'
  };
  return {
    name: treeNames[treeId] || 'Precision',
    icon: `https://ddragon.leagueoflegends.com/cdn/img/${treeIcons[treeId] || 'perk-images/Styles/7201_Precision.png'}`
  };
}

function getRuneDetails(runeId) {
  const r = runesMap[runeId];
  if (r) {
    return {
      name: r.name,
      icon: `https://ddragon.leagueoflegends.com/cdn/img/${r.icon}`,
      desc: (r.shortDesc || r.longDesc || '').replace(/<[^>]*>/g, ' ')
    };
  }
  return {
    name: `Rune #${runeId}`,
    icon: 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Precision/Conqueror/Conqueror.png',
    desc: 'Empowering champion rune effect'
  };
}

function getSpellKeyById(spellId) {
  const map = {
    4: 'Flash',
    12: 'Teleport',
    14: 'Ignite',
    11: 'Smite',
    7: 'Heal',
    6: 'Ghost',
    21: 'Barrier',
    3: 'Exhaust',
    1: 'Cleanse',
    32: 'Mark'
  };
  return map[Number(spellId)] || 'Flash';
}

function getSpellIdByKey(key) {
  const map = {
    Flash: 4,
    Teleport: 12,
    Ignite: 14,
    Smite: 11,
    Heal: 7,
    Ghost: 6,
    Barrier: 21,
    Exhaust: 3,
    Cleanse: 1,
    Mark: 32,
    Flee: 22
  };
  return map[key] || 4;
}

// ----------------- 1:1 OP.GG RUNES & BUILD OVERLAY ENGINE -----------------

async function renderOverlayRunesAndBuild(champId, mode = activeOverlayMode) {
  activeOverlayChampId = champId;
  activeOverlayMode = mode;

  const champ = getChampDdragon(champId) || { id: 'Aatrox', name: `Champion ${champId}`, title: 'The Darkin Blade' };
  const avatarEl = document.getElementById('overlayChampAvatar');
  const nameEl = document.getElementById('overlayChampName');
  const roleEl = document.getElementById('overlayChampRoleTag');
  const wrEl = document.getElementById('overlayChampWrBadge');
  const prEl = document.getElementById('overlayChampPrBadge');
  const tierBadge = document.getElementById('overlayChampTierBadge');

  if (avatarEl) avatarEl.src = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${champ.id}.png`;
  if (nameEl) nameEl.textContent = champ.name;

  // Fetch live stats & detail
  const stats = await getChampionStatsAndBuild(champId, mode);
  if (tierBadge) {
    tierBadge.textContent = stats.tier;
    tierBadge.className = `champ-tier-badge ${stats.tierClass}`;
  }
  if (wrEl) wrEl.textContent = `${stats.winRate} WR`;
  if (prEl) prEl.textContent = `${stats.pickRate} Pick`;
  if (roleEl) roleEl.textContent = (mode === 'aram' ? 'ARAM' : mode === 'arena' ? 'ARENA' : (stats.position || 'TOP')).toUpperCase();

  // Fetch full build detail from OP.GG
  let detail = null;
  try {
    if (window.opgg?.getChampionDetail) {
      detail = await window.opgg.getChampionDetail(champId, 'none', 'all', mode);
      activeOverlayChampDetail = detail;
    }
  } catch (e) {
    console.error('Error fetching detail in overlay:', e);
  }

  const build = detail?.build || {};
  const runePages = build.rune_pages || (build.runes ? [build.runes[0]] : []);
  const activeRunePage = runePages[activeOverlayPresetIdx] || runePages[0] || {};

  // 1. Render Preset Pills
  const presetsEl = document.getElementById('overlayRunePresets');
  if (presetsEl && runePages.length > 0) {
    presetsEl.innerHTML = runePages.slice(0, 2).map((rp, idx) => {
      const pWr = rp.win_rate ? `${(rp.win_rate * 100).toFixed(1)}% WR` : (idx === 0 ? '53.8% WR' : '51.5% WR');
      const label = idx === 0 ? `Primary (${pWr})` : `Alternative (${pWr})`;
      return `<button class="preset-pill ${idx === activeOverlayPresetIdx ? 'active' : ''}" onclick="selectOverlayRunePreset(${idx})">${label}</button>`;
    }).join('');
  }

  // 2. Render Runes Visual Display
  const runesDisplay = document.getElementById('overlayRunesDisplay');
  if (runesDisplay) {
    const primaryStyleId = activeRunePage.primary_page_id || 8000;
    const subStyleId = activeRunePage.secondary_page_id || 8400;
    const primaryTree = getTreeDetails(primaryStyleId);
    const subTree = getTreeDetails(subStyleId);

    const primaryRuneIds = activeRunePage.primary_rune_ids || [8010, 9111, 9104, 8299];
    const secondaryRuneIds = activeRunePage.secondary_rune_ids || [8444, 8451];
    const statModIds = activeRunePage.stat_mod_ids || [5008, 5008, 5002];

    const keystone = getRuneDetails(primaryRuneIds[0]);

    runesDisplay.innerHTML = `
      <div class="overlay-runes-columns">
        <!-- Primary Tree -->
        <div class="rune-tree-col">
          <div class="rune-tree-header">
            <img class="tree-icon-mini" src="${primaryTree.icon}" />
            <span>${primaryTree.name}</span>
          </div>

          <div class="keystone-showcase">
            <img class="keystone-icon-glow" src="${keystone.icon}" data-tooltip-type="rune" data-tooltip-id="${primaryRuneIds[0]}" />
            <div>
              <div class="keystone-name-label">${keystone.name}</div>
              <div style="font-size: 9px; color: var(--opgg-cyan); font-weight: 700;">Keystone</div>
            </div>
          </div>

          <div class="slot-runes-list">
            ${primaryRuneIds.slice(1).map(id => {
              const r = getRuneDetails(id);
              return `
                <div class="slot-rune-row">
                  <img class="slot-rune-icon" src="${r.icon}" data-tooltip-type="rune" data-tooltip-id="${id}" />
                  <span class="slot-rune-title">${r.name}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Secondary Tree & Shards -->
        <div class="rune-tree-col">
          <div class="rune-tree-header">
            <img class="tree-icon-mini" src="${subTree.icon}" />
            <span>${subTree.name}</span>
          </div>

          <div class="slot-runes-list">
            ${secondaryRuneIds.map(id => {
              const r = getRuneDetails(id);
              return `
                <div class="slot-rune-row">
                  <img class="slot-rune-icon" src="${r.icon}" data-tooltip-type="rune" data-tooltip-id="${id}" />
                  <span class="slot-rune-title">${r.name}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="shards-container">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-dim); margin-bottom: 2px;">Stat Shards</div>
            ${statModIds.map(s => {
              const shardName = s === 5008 ? '+9 Adaptive Force' : s === 5005 ? '+10% Attack Speed' : s === 5007 ? '+8 Ability Haste' : s === 5002 ? '+6 Armor' : s === 5003 ? '+8 Magic Resist' : '+65 Health';
              return `<span class="shard-badge">${shardName}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 3. Render Summoner Spells
  const spellsRow = document.getElementById('overlaySpellsRow');
  if (spellsRow) {
    let s1 = 'Flash';
    let s2 = mode === 'aram' ? 'Mark' : (mode === 'arena' ? 'Flee' : 'Teleport');
    let wr = '53.2%';
    let pr = '68.5%';

    if (build.spells && build.spells[0]) {
      const sp = build.spells[0];
      wr = sp.win_rate ? `${(sp.win_rate * 100).toFixed(1)}%` : wr;
      pr = sp.pick_rate ? `${(sp.pick_rate * 100).toFixed(1)}%` : pr;
      if (Array.isArray(sp.ids) && sp.ids.length >= 2) {
        s1 = getSpellKeyById(sp.ids[0]);
        s2 = getSpellKeyById(sp.ids[1]);
      }
    }

    const firstSpell = activeOverlayFlashKey === 'D' ? s1 : s2;
    const secondSpell = activeOverlayFlashKey === 'D' ? s2 : s1;
    const sData1 = SPELL_DATA[firstSpell] || SPELL_DATA.Flash;
    const sData2 = SPELL_DATA[secondSpell] || SPELL_DATA.Teleport;

    spellsRow.innerHTML = `
      <div class="spell-pair-card">
        <div class="spell-icon-pair">
          <div style="position: relative;">
            <img class="spell-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/spell/${sData1.key}.png" data-tooltip-type="spell" data-tooltip-id="${firstSpell}" />
            <span style="position: absolute; bottom: -2px; right: -2px; background: #000; font-size: 8px; font-weight: 800; padding: 0 3px; border-radius: 2px;">D</span>
          </div>
          <div style="position: relative;">
            <img class="spell-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/spell/${sData2.key}.png" data-tooltip-type="spell" data-tooltip-id="${secondSpell}" />
            <span style="position: absolute; bottom: -2px; right: -2px; background: #000; font-size: 8px; font-weight: 800; padding: 0 3px; border-radius: 2px;">F</span>
          </div>
        </div>
        <div class="spell-pair-meta">
          <span class="spell-pair-wr">${wr} Win Rate</span>
          <span class="spell-pair-pr">${pr} Pick Rate</span>
        </div>
      </div>
    `;
  }

  // 4. Render Skill Max Priority & Progression
  const skillOrderEl = document.getElementById('overlaySkillOrderText');
  const skillsProgEl = document.getElementById('overlaySkillsProgression');
  const masteries = build.skill_masteries || [];
  const orderList = masteries[0]?.ids || ['Q', 'E', 'W'];
  if (skillOrderEl) skillOrderEl.textContent = orderList.join(' ➔ ');

  if (skillsProgEl) {
    const progression = [orderList[0], orderList[1], orderList[2], orderList[0], orderList[0], 'R'];
    skillsProgEl.innerHTML = progression.map((k, idx) => `
      <div class="skill-prog-step ${k === orderList[0] ? 'priority' : ''}">
        <span class="skill-prog-lvl">Lv.${idx + 1}</span>
        <span class="skill-prog-key">${k}</span>
      </div>
    `).join('');
  }

  // 5. Render Core Items & Build Path
  const itemsContainer = document.getElementById('overlayItemsSections');
  const itemsWrTag = document.getElementById('overlayItemsWrTag');
  if (itemsContainer) {
    const core = (build.core_items || []).slice(0, 3);
    const starters = (build.starter_items || []).slice(0, 2);
    const boots = (build.boots || []).slice(0, 3);
    const situational = (build.last_items || []).slice(0, 4);

    if (core[0]?.win_rate && itemsWrTag) {
      itemsWrTag.textContent = `${(core[0].win_rate * 100).toFixed(1)}% WR`;
    }

    const startersHtml = starters.length > 0 ? `
      <div class="item-sub-group">
        <span class="item-sub-title">Starting Items</span>
        <div class="item-icons-flex">
          ${(starters[0]?.ids || [1055, 2003]).map(id => {
            const norm = normalizeItemId(id);
            return `<img class="item-overlay-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${norm}.png" data-tooltip-type="item" data-tooltip-id="${norm}" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/1001.png'" />`;
          }).join('')}
        </div>
      </div>
    ` : '';

    const coreHtml = `
      <div class="item-sub-group">
        <span class="item-sub-title">Core Build Path (1st ➔ 2nd ➔ 3rd)</span>
        <div class="item-icons-flex">
          ${(core[0]?.ids || [3078, 3053, 3161]).map((id, idx, arr) => {
            const norm = normalizeItemId(id);
            return `
              <img class="item-overlay-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${norm}.png" data-tooltip-type="item" data-tooltip-id="${norm}" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/1001.png'" />
              ${idx < arr.length - 1 ? '<span class="item-arrow-divider">›</span>' : ''}
            `;
          }).join('')}
        </div>
      </div>
    `;

    const bootsHtml = boots.length > 0 ? `
      <div class="item-sub-group">
        <span class="item-sub-title">Recommended Boots</span>
        <div class="item-icons-flex">
          ${boots.slice(0, 3).map(b => {
            const norm = normalizeItemId(b.id || b.ids?.[0] || 3047);
            return `<img class="item-overlay-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${norm}.png" data-tooltip-type="item" data-tooltip-id="${norm}" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/3047.png'" />`;
          }).join('')}
        </div>
      </div>
    ` : '';

    const situationalHtml = situational.length > 0 ? `
      <div class="item-sub-group">
        <span class="item-sub-title">Situational Items</span>
        <div class="item-icons-flex">
          ${situational.slice(0, 4).map(s => {
            const norm = normalizeItemId(s.id || s.ids?.[0] || 3026);
            return `<img class="item-overlay-thumb" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${norm}.png" data-tooltip-type="item" data-tooltip-id="${norm}" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/1001.png'" />`;
          }).join('')}
        </div>
      </div>
    ` : '';

    itemsContainer.innerHTML = startersHtml + coreHtml + bootsHtml + situationalHtml;
  }
}

window.selectOverlayRunePreset = function(presetIdx) {
  activeOverlayPresetIdx = presetIdx;
  renderOverlayRunesAndBuild(activeOverlayChampId, activeOverlayMode);
};

// Quick Champion Search inside Overlay
const overlayChampSearchInput = document.getElementById('overlayChampSearchInput');
const overlayChampDropdown = document.getElementById('overlayChampDropdown');

if (overlayChampSearchInput && overlayChampDropdown) {
  overlayChampSearchInput.addEventListener('input', () => {
    const q = overlayChampSearchInput.value.trim().toLowerCase();
    if (!q) {
      overlayChampDropdown.style.display = 'none';
      return;
    }
    const matches = Object.values(ddragonMap).filter(c => c.name && c.name.toLowerCase().includes(q)).slice(0, 8);
    if (matches.length === 0) {
      overlayChampDropdown.style.display = 'none';
      return;
    }
    overlayChampDropdown.style.display = 'block';
    overlayChampDropdown.innerHTML = matches.map(c => `
      <div class="overlay-champ-drop-item" onclick="selectOverlayChampion(${c.key}, '${c.name.replace("'", "\\'")}')">
        <img src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${c.id}.png" />
        <span>${c.name}</span>
      </div>
    `).join('');
  });

  document.addEventListener('click', (e) => {
    if (!overlayChampSearchInput.contains(e.target) && !overlayChampDropdown.contains(e.target)) {
      overlayChampDropdown.style.display = 'none';
    }
  });
}

window.selectOverlayChampion = function(champId, champName) {
  if (overlayChampSearchInput) overlayChampSearchInput.value = '';
  if (overlayChampDropdown) overlayChampDropdown.style.display = 'none';
  showOverlayToast(`⚡ Loading OP.GG build for ${champName}...`);
  renderOverlayRunesAndBuild(Number(champId), activeOverlayMode);
};

// 1-Click Import Runes Button
const btnOverlayImportRunes = document.getElementById('btnOverlayImportRunes');
if (btnOverlayImportRunes) {
  btnOverlayImportRunes.addEventListener('click', async () => {
    if (!activeOverlayChampDetail) {
      showOverlayToast('No active champion build loaded', true);
      return;
    }
    const build = activeOverlayChampDetail.build || {};
    const runePages = build.rune_pages || (build.runes ? [build.runes[0]] : []);
    const activePage = runePages[activeOverlayPresetIdx] || runePages[0];
    if (!activePage) {
      showOverlayToast('No runes found for this champion', true);
      return;
    }
    const champName = document.getElementById('overlayChampName')?.textContent || 'Champion';
    const payload = {
      championName: champName,
      primaryStyleId: activePage.primary_page_id || 8000,
      subStyleId: activePage.secondary_page_id || 8400,
      selectedPerkIds: [
        ...(activePage.primary_rune_ids || [8010, 9111, 9104, 8299]),
        ...(activePage.secondary_rune_ids || [8444, 8451]),
        ...(activePage.stat_mod_ids || [5008, 5008, 5002])
      ]
    };
    try {
      const res = await window.opgg.lcuApplyRunes(payload);
      if (res?.success) {
        showOverlayToast(`⚡ OP.GG Runes imported for ${payload.championName}!`);
      } else {
        showOverlayToast(`Rune import failed: ${res?.error || 'League Client not connected'}`, true);
      }
    } catch (err) {
      showOverlayToast(`Rune error: ${err.message}`, true);
    }
  });
}

// 1-Click Import Spells Button
const btnOverlayImportSpells = document.getElementById('btnOverlayImportSpells');
if (btnOverlayImportSpells) {
  btnOverlayImportSpells.addEventListener('click', async () => {
    const build = activeOverlayChampDetail?.build || {};
    let s1Key = 'Flash';
    let s2Key = activeOverlayMode === 'aram' ? 'Mark' : (activeOverlayMode === 'arena' ? 'Flee' : 'Teleport');
    if (build.spells && build.spells[0]?.ids?.length >= 2) {
      s1Key = getSpellKeyById(build.spells[0].ids[0]);
      s2Key = getSpellKeyById(build.spells[0].ids[1]);
    }
    const s1Id = getSpellIdByKey(activeOverlayFlashKey === 'D' ? s1Key : s2Key);
    const s2Id = getSpellIdByKey(activeOverlayFlashKey === 'D' ? s2Key : s1Key);

    try {
      const res = await window.opgg.lcuApplySpells({ spell1Id: s1Id, spell2Id: s2Id });
      if (res?.success) {
        showOverlayToast(`🔮 Summoner Spells (${s1Key} + ${s2Key}) imported!`);
      } else {
        showOverlayToast(`Spells import failed: ${res?.error || 'Client not in champ select'}`, true);
      }
    } catch (err) {
      showOverlayToast(`Spells error: ${err.message}`, true);
    }
  });
}

// 1-Click Import Item Set Button
const btnOverlayImportItems = document.getElementById('btnOverlayImportItems');
if (btnOverlayImportItems) {
  btnOverlayImportItems.addEventListener('click', async () => {
    const champName = document.getElementById('overlayChampName')?.textContent || 'Champion';
    try {
      const res = await window.opgg.lcuApplyItemBuild({
        champId: activeOverlayChampId,
        champName,
        mode: activeOverlayMode,
        position: 'top'
      });
      if (res?.success) {
        showOverlayToast(`🎒 OP.GG Item Set imported to League Client!`);
      } else {
        showOverlayToast(`Item set import failed: ${res?.error || 'Client not running'}`, true);
      }
    } catch (err) {
      showOverlayToast(`Item set error: ${err.message}`, true);
    }
  });
}

// Flash Key Toggle (D vs F)
const btnFlashD = document.getElementById('btnFlashD');
const btnFlashF = document.getElementById('btnFlashF');
if (btnFlashD && btnFlashF) {
  btnFlashD.addEventListener('click', () => {
    activeOverlayFlashKey = 'D';
    btnFlashD.classList.add('active');
    btnFlashF.classList.remove('active');
    if (window.opgg?.lcuSetFlashKey) window.opgg.lcuSetFlashKey('D');
    renderOverlayRunesAndBuild(activeOverlayChampId, activeOverlayMode);
    showOverlayToast('Flash preference set to [D]');
  });
  btnFlashF.addEventListener('click', () => {
    activeOverlayFlashKey = 'F';
    btnFlashF.classList.add('active');
    btnFlashD.classList.remove('active');
    if (window.opgg?.lcuSetFlashKey) window.opgg.lcuSetFlashKey('F');
    renderOverlayRunesAndBuild(activeOverlayChampId, activeOverlayMode);
    showOverlayToast('Flash preference set to [F]');
  });
}

// Mode Selector Buttons
const modeButtons = [
  { btn: document.getElementById('btnOverlayModeRanked'), mode: 'ranked' },
  { btn: document.getElementById('btnOverlayModeAram'), mode: 'aram' },
  { btn: document.getElementById('btnOverlayModeArena'), mode: 'arena' }
];
modeButtons.forEach(({ btn, mode }) => {
  btn?.addEventListener('click', () => {
    modeButtons.forEach(m => m.btn?.classList.remove('active'));
    btn.classList.add('active');
    activeOverlayMode = mode;
    renderOverlayRunesAndBuild(activeOverlayChampId, mode);
  });
});

// Auto-Import Runes Toggle
const overlayAutoRunesCheck = document.getElementById('overlayAutoRunesCheck');
if (overlayAutoRunesCheck) {
  overlayAutoRunesCheck.addEventListener('change', (e) => {
    autoRunesEnabled = e.target.checked;
    if (window.opgg?.lcuAutoRunes) window.opgg.lcuAutoRunes(autoRunesEnabled);
    showOverlayToast(autoRunesEnabled ? '⚡ Auto-Import Runes: ON' : 'Auto-Import Runes: OFF');
  });
}

// Floating Interactive Tooltip in Overlay
const overlayGlobalTooltip = document.getElementById('overlayGlobalTooltip');

function showOverlayTooltip(e, contentHtml) {
  if (!overlayGlobalTooltip || !contentHtml) return;
  overlayGlobalTooltip.innerHTML = contentHtml;
  overlayGlobalTooltip.classList.add('show');
  positionOverlayTooltip(e);
}

function hideOverlayTooltip() {
  if (overlayGlobalTooltip) {
    overlayGlobalTooltip.classList.remove('show');
  }
}

function positionOverlayTooltip(e) {
  if (!overlayGlobalTooltip) return;
  const padding = 12;
  const rect = overlayGlobalTooltip.getBoundingClientRect();
  let x = e.clientX + padding;
  let y = e.clientY + padding;

  if (x + rect.width > window.innerWidth) {
    x = e.clientX - rect.width - padding;
  }
  if (y + rect.height > window.innerHeight) {
    y = e.clientY - rect.height - padding;
  }
  overlayGlobalTooltip.style.left = `${Math.max(8, x)}px`;
  overlayGlobalTooltip.style.top = `${Math.max(8, y)}px`;
}

window.addEventListener('mousemove', (e) => {
  if (overlayGlobalTooltip && overlayGlobalTooltip.classList.contains('show')) {
    positionOverlayTooltip(e);
  }
});

document.body.addEventListener('mouseover', (e) => {
  const target = e.target.closest('[data-tooltip-type]');
  if (!target) return;
  const type = target.getAttribute('data-tooltip-type');
  const id = target.getAttribute('data-tooltip-id');

  if (type === 'item') {
    const item = itemsMap[String(id)] || itemsMap[String(normalizeItemId(id))];
    if (item) {
      const statsList = Object.entries(item.stats || {}).map(([k, v]) => {
        const cleanKey = k.replace('Flat', '').replace('Mod', '').replace('PhysicalDamage', 'Attack Damage').replace('MagicDamage', 'Ability Power');
        return `<div>+${v} ${cleanKey}</div>`;
      }).join('');
      const cleanDesc = (item.description || '').replace(/<[^>]*>/g, ' ');
      const html = `
        <div class="tooltip-header">
          <img class="tooltip-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/${id}.png" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/item/1001.png'" />
          <div>
            <div class="tooltip-title">${item.name}</div>
            <div class="tooltip-cost">🪙 ${item.gold?.total || '3,000'} gold</div>
          </div>
        </div>
        ${statsList ? `<div class="tooltip-stats">${statsList}</div>` : ''}
        <div class="tooltip-desc">${cleanDesc}</div>
      `;
      showOverlayTooltip(e, html);
    }
  } else if (type === 'rune') {
    const r = getRuneDetails(Number(id));
    const html = `
      <div class="tooltip-header">
        <img class="tooltip-icon" src="${r.icon}" />
        <div>
          <div class="tooltip-title">${r.name}</div>
          <div style="font-size: 10px; color: var(--opgg-cyan); font-weight: 700;">Keystone / Rune</div>
        </div>
      </div>
      <div class="tooltip-desc">${r.desc}</div>
    `;
    showOverlayTooltip(e, html);
  } else if (type === 'spell') {
    const s = SPELL_DATA[id] || { name: id, cd: 300 };
    const html = `
      <div class="tooltip-header">
        <div>
          <div class="tooltip-title">${s.name}</div>
          <div style="font-size: 10px; color: #ffaa00; font-weight: 700;">Cooldown: ${s.cd}s</div>
        </div>
      </div>
      <div class="tooltip-desc">Summoner spell tactical advantage.</div>
    `;
    showOverlayTooltip(e, html);
  }
});

document.body.addEventListener('mouseout', (e) => {
  if (e.target.closest('[data-tooltip-type]')) {
    hideOverlayTooltip();
  }
});

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
btnTestDemo.addEventListener('click', () => {
  renderOverlayRunesAndBuild(222, 'ranked');
  loadDemoBench();
  showOverlayToast('🎲 Demo Champion (Jinx) & Bench Loaded!');
});

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

    // Update enemy spells
    if (data.theirTeam && data.theirTeam.length > 0) {
      renderOverlayEnemySpells(data.theirTeam);
    }

    // Auto-update Runes & Build Overlay for locked-in or hovered champion
    const myChamp = data.myChampionId || (data.myTeam && data.myTeam.find(m => m.cellId === data.localPlayerCellId)?.championId) || 0;
    if (myChamp && myChamp > 0 && myChamp !== activeOverlayChampId) {
      activeOverlayChampId = myChamp;
      renderOverlayRunesAndBuild(myChamp, currentMode);
      if (autoRunesEnabled) {
        const champ = getChampDdragon(myChamp);
        syncMyRunes(myChamp, champ?.name || 'Champion');
      }
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

// ----------------- ENEMY SUMMONER SPELL TRACKER (OVERLAY) -----------------
const overlayEnemyTimers = {};
const overlayEnemyGrid = document.getElementById('overlayEnemyTimersGrid');
const btnCopyOverlaySpellTimers = document.getElementById('btnCopyOverlaySpellTimers');
const btnResetSpellTimers = document.getElementById('btnResetSpellTimers');

function renderOverlayEnemySpells(theirTeam) {
  if (!overlayEnemyGrid) return;
  const opponents = (theirTeam && theirTeam.length > 0) ? theirTeam : [
    { championId: 86, role: 'TOP', spell1: 'Flash', spell2: 'Teleport' },
    { championId: 64, role: 'JGL', spell1: 'Flash', spell2: 'Smite' },
    { championId: 103, role: 'MID', spell1: 'Flash', spell2: 'Ignite' },
    { championId: 222, role: 'BOT', spell1: 'Flash', spell2: 'Heal' },
    { championId: 412, role: 'SUP', spell1: 'Flash', spell2: 'Exhaust' }
  ];

  overlayEnemyGrid.innerHTML = opponents.map((opp, idx) => {
    const champ = getChampDdragon(opp.championId || 86) || { name: opp.name || 'Enemy', id: 'Garen' };
    const role = opp.role || (['TOP', 'JGL', 'MID', 'BOT', 'SUP'][idx] || 'LANE');
    const s1Key = opp.spell1 || 'Flash';
    const s2Key = opp.spell2 || (idx === 1 ? 'Smite' : (idx === 0 ? 'Teleport' : (idx === 2 ? 'Ignite' : 'Heal')));
    const s1 = SPELL_DATA[s1Key] || SPELL_DATA.Flash;
    const s2 = SPELL_DATA[s2Key] || SPELL_DATA.Ignite;

    return `
      <div class="enemy-tracker-row" id="enemyRow-${idx}">
        <div class="enemy-tracker-champ">
          <img class="enemy-tracker-portrait" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/champion/${champ.id || 'Aatrox'}.png" onerror="this.src='assets/images/icon-alert.svg'" />
          <div class="enemy-tracker-info">
            <span class="enemy-tracker-name">${champ.name}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="enemy-tracker-role">${role}</span>
              <button class="ah-toggle-btn" id="ahLucidity-${idx}" onclick="toggleSpellAH(${idx}, 'lucidity')" title="Ionian Boots of Lucidity (-12 AH)">👟 Boots</button>
              <button class="ah-toggle-btn" id="ahCosmic-${idx}" onclick="toggleSpellAH(${idx}, 'cosmic')" title="Cosmic Insight Rune (-18 AH)">🔮 Cosmic</button>
            </div>
          </div>
        </div>

        <div class="enemy-tracker-spells">
          <!-- Spell 1 -->
          <div class="enemy-spell-box" id="spellBox-${idx}-1" onclick="triggerOverlaySpellTimer(${idx}, 1, '${s1Key}', '${role}')">
            <div class="enemy-spell-img-wrap">
              <img class="enemy-spell-img" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/spell/${s1.key}.png" alt="${s1.name}" />
              <div class="enemy-spell-cd-overlay" id="cdOverlay-${idx}-1"></div>
            </div>
            <div class="enemy-spell-label-wrap">
              <span class="enemy-spell-name">${s1.name}</span>
              <span class="enemy-spell-status" id="cdStatus-${idx}-1">Ready</span>
            </div>
          </div>

          <!-- Spell 2 -->
          <div class="enemy-spell-box" id="spellBox-${idx}-2" onclick="triggerOverlaySpellTimer(${idx}, 2, '${s2Key}', '${role}')">
            <div class="enemy-spell-img-wrap">
              <img class="enemy-spell-img" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VER}/img/spell/${s2.key}.png" alt="${s2.name}" />
              <div class="enemy-spell-cd-overlay" id="cdOverlay-${idx}-2"></div>
            </div>
            <div class="enemy-spell-label-wrap">
              <span class="enemy-spell-name">${s2.name}</span>
              <span class="enemy-spell-status" id="cdStatus-${idx}-2">Ready</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

const enemyAHState = {};
window.toggleSpellAH = function(idx, type) {
  if (!enemyAHState[idx]) enemyAHState[idx] = { lucidity: false, cosmic: false };
  enemyAHState[idx][type] = !enemyAHState[idx][type];
  const btn = document.getElementById(type === 'lucidity' ? `ahLucidity-${idx}` : `ahCosmic-${idx}`);
  if (btn) btn.classList.toggle('active', enemyAHState[idx][type]);
  showOverlayToast(`${type === 'lucidity' ? 'Ionian Boots' : 'Cosmic Insight'} reduction ${enemyAHState[idx][type] ? 'applied' : 'removed'}`);
};

window.triggerOverlaySpellTimer = function(idx, slot, spellName, role) {
  const timerKey = `${idx}-${slot}`;
  const box = document.getElementById(`spellBox-${idx}-${slot}`);
  const overlay = document.getElementById(`cdOverlay-${idx}-${slot}`);
  const status = document.getElementById(`cdStatus-${idx}-${slot}`);

  // If already counting, clicking cancels/resets it
  if (overlayEnemyTimers[timerKey]) {
    clearInterval(overlayEnemyTimers[timerKey].interval);
    delete overlayEnemyTimers[timerKey];
    if (box) box.classList.remove('counting');
    if (status) { status.textContent = 'Ready'; status.style.color = 'var(--opgg-cyan)'; }
    showOverlayToast(`Timer cancelled for ${role} ${spellName}`);
    return;
  }

  const baseData = SPELL_DATA[spellName] || SPELL_DATA.Flash;
  let baseSeconds = baseData.cd;

  // Apply Haste
  let haste = 0;
  if (enemyAHState[idx]?.lucidity) haste += 12;
  if (enemyAHState[idx]?.cosmic) haste += 18;
  const effectiveSeconds = Math.round(baseSeconds * (100 / (100 + haste)));

  let remaining = effectiveSeconds;
  if (box) box.classList.add('counting');

  const updateDisplay = () => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const txt = `${m}:${s < 10 ? '0' : ''}${s}`;
    if (overlay) overlay.textContent = txt;
    if (status) { status.textContent = txt; status.style.color = '#ffaa00'; }
  };

  updateDisplay();
  showOverlayToast(`⏱️ ${role} ${spellName} timer started: ${effectiveSeconds}s!`);

  overlayEnemyTimers[timerKey] = {
    role,
    spellName,
    remaining,
    total: effectiveSeconds,
    startedAt: Date.now(),
    interval: setInterval(() => {
      remaining--;
      overlayEnemyTimers[timerKey].remaining = remaining;
      updateDisplay();

      if (remaining <= 0) {
        clearInterval(overlayEnemyTimers[timerKey].interval);
        delete overlayEnemyTimers[timerKey];
        if (box) box.classList.remove('counting');
        if (status) { status.textContent = 'Ready!'; status.style.color = 'var(--opgg-cyan)'; }
        showOverlayToast(`🚨 ${role} ${spellName} is back UP!`);
      }
    }, 1000)
  };
};

if (btnResetSpellTimers) {
  btnResetSpellTimers.addEventListener('click', () => {
    Object.keys(overlayEnemyTimers).forEach(k => {
      clearInterval(overlayEnemyTimers[k].interval);
      delete overlayEnemyTimers[k];
    });
    document.querySelectorAll('.enemy-spell-box').forEach(b => b.classList.remove('counting'));
    document.querySelectorAll('.enemy-spell-status').forEach(s => { s.textContent = 'Ready'; s.style.color = 'var(--opgg-cyan)'; });
    showOverlayToast('All enemy spell cooldown timers reset.');
  });
}

if (btnCopyOverlaySpellTimers) {
  btnCopyOverlaySpellTimers.addEventListener('click', () => {
    const active = Object.values(overlayEnemyTimers);
    if (active.length === 0) {
      showOverlayToast('No active enemy spell timers to copy!', true);
      return;
    }
    const lines = active.map(t => {
      const remM = Math.floor(t.remaining / 60);
      const remS = t.remaining % 60;
      return `${t.role} ${t.spellName} (${remM}:${remS < 10 ? '0' : ''}${remS})`;
    });
    const chatMsg = `OP.GG Timers: ${lines.join(' | ')}`;
    if (window.opgg?.copyToClipboard) {
      window.opgg.copyToClipboard(chatMsg);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(chatMsg);
    }
    showOverlayToast(`📋 Copied spell timers to clipboard! Paste in game chat.`);
  });
}

// Initialize
initStaticData();
renderOverlayEnemySpells();

