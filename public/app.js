// =========================================================================
// ग्राम पंचायत लोरड़ी देजगरा (Lordi Daijagra) - Election War Room Engine
// Focused, Simple, Robust Planning Machine
// =========================================================================

const SUPABASE_URL = 'https://xobccfrgwnffsupjydmu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvYmNjZnJnd25mZnN1cGp5ZG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NTgzMzcsImV4cCI6MjEwNzUzNDMzN30.FZ1OZbVMamC24kZfOb4kGW1A4MLY3_qvj0c9aXPLOjo';

let supabaseClient = null;

// Application State
let allVoters = []; // Full 2,673 voters
let filteredVoters = [];
let activeWard = 'ALL'; // 'ALL' or 1 to 9
let activeBottomTab = 'families'; // 'families', 'voters', 'key', 'analytics'
let activeKeyFilter = 'big_families'; // 'big_families', 'decision_makers', 'elders', 'outstation'
let activeViewMode = 'families';
let currentPage = 1;
const PAGE_SIZE = 30;

// Filter states
let filterLeaning = '';
let filterCaste = '';
let filterMohalla = '';
let filterElderlyOnly = false;
let searchQuery = '';

let currentSelectedVoterForSlip = null;
const TARGET_VICTORY_VOTES = 950; // Target needed to win Sarpanch

const wardCounts = {
  1: 360, 2: 205, 3: 243, 4: 368, 5: 274, 6: 251, 7: 413, 8: 254, 9: 305
};

// Hindi to English Transliteration Map for phonetic bilingual search
const charMap = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क्ष': 'ksh', 'त्र': 'tra', 'ज्ञ': 'gya',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', '्': '',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

function transliterateHindi(text) {
  if (!text) return '';
  let str = '';
  const s = text.trim();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    str += charMap[ch] !== undefined ? charMap[ch] : ch;
  }
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '');
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  renderWardPills();
  await loadVotersData();
  await refreshOverallStats();
  if (window.lucide) lucide.createIcons();
});

// =========================================================================
// WARD SELECTOR (Modern Clean Scrolling Tabs)
// =========================================================================
function renderWardPills() {
  const container = document.getElementById('ward-pills-bar');
  if (!container) return;

  let html = `
    <button onclick="selectWard('ALL')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs ${activeWard === 'ALL' ? 'bg-emerald-700 text-white shadow-emerald-700/25 shadow-md ring-2 ring-emerald-500/30' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'}">
      <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>
      <span>सभी 9 वार्ड</span>
      <span class="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${activeWard === 'ALL' ? 'bg-emerald-900/60 text-emerald-100' : 'bg-slate-200/80 text-slate-600'}">2,673</span>
    </button>
  `;

  for (let w = 1; w <= 9; w++) {
    const isSel = activeWard === w;
    const c = wardCounts[w] || 0;
    html += `
      <button onclick="selectWard(${w})" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all shadow-xs ${isSel ? 'bg-emerald-700 text-white shadow-emerald-700/25 shadow-md ring-2 ring-emerald-500/30' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'}">
        <span>वार्ड ${w}</span>
        <span class="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${isSel ? 'bg-emerald-900/60 text-emerald-100' : 'bg-slate-200/80 text-slate-600'}">${c}</span>
      </button>
    `;
  }

  container.innerHTML = html;

  // Update active ward indicator subheader
  const indText = document.getElementById('active-ward-text');
  const indAction = document.getElementById('active-ward-action');
  if (indText) {
    if (activeWard === 'ALL') {
      indText.innerText = 'सभी 9 वार्ड (कुल 2,673 मतदाता • ~380 परिवार)';
      if (indAction) indAction.classList.add('hidden');
    } else {
      indText.innerText = `वार्ड नं. ${activeWard} चुना हुआ है (कुल ${wardCounts[activeWard]} मतदाता)`;
      if (indAction) indAction.classList.remove('hidden');
    }
  }

  if (window.lucide) lucide.createIcons();
}

// Select Ward
async function selectWard(ward) {
  activeWard = ward;
  currentPage = 1;
  renderWardPills();
  await loadVotersData();
}

// =========================================================================
// BOTTOM NAVIGATION BAR (Mobile Native Tab Switching)
// =========================================================================
function switchBottomTab(tab) {
  activeBottomTab = tab;

  // Update bottom tab buttons styling
  const tabs = ['families', 'voters', 'key', 'analytics'];
  tabs.forEach(t => {
    const btn = document.getElementById(`bnav-${t}`);
    if (!btn) return;
    const dot = btn.querySelector('.bnav-dot');
    if (t === tab) {
      btn.className = 'flex flex-col items-center justify-center flex-1 py-1 text-emerald-700 font-black transition active:scale-95';
      if (dot) dot.classList.remove('hidden');
    } else {
      btn.className = 'flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-slate-900 font-semibold transition active:scale-95';
      if (dot) dot.classList.add('hidden');
    }
  });

  const votersWorkspace = document.getElementById('voters-workspace-section');
  const analyticsWorkspace = document.getElementById('analytics-workspace-section');
  const keySubtabs = document.getElementById('key-vip-subtabs');

  if (tab === 'analytics') {
    if (votersWorkspace) votersWorkspace.classList.add('hidden');
    if (analyticsWorkspace) analyticsWorkspace.classList.remove('hidden');
    renderAnalyticsView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Voters / Families / Key Workspace
  if (analyticsWorkspace) analyticsWorkspace.classList.add('hidden');
  if (votersWorkspace) votersWorkspace.classList.remove('hidden');

  if (tab === 'families') {
    activeViewMode = 'families';
    if (keySubtabs) keySubtabs.classList.add('hidden');
  } else if (tab === 'voters') {
    activeViewMode = 'cards';
    if (keySubtabs) keySubtabs.classList.add('hidden');
  } else if (tab === 'key') {
    activeViewMode = 'key';
    if (keySubtabs) keySubtabs.classList.remove('hidden');
    updateKeySubtabStyles();
  }

  currentPage = 1;
  applyFilters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setKeyFilter(subFilter) {
  activeKeyFilter = subFilter;
  updateKeySubtabStyles();
  applyFilters();
}

function updateKeySubtabStyles() {
  const subFilters = ['big_families', 'decision_makers', 'elders', 'outstation'];
  subFilters.forEach(f => {
    const btn = document.getElementById(`keytab-${f}`);
    if (!btn) return;
    if (f === activeKeyFilter) {
      btn.className = 'py-1.5 px-1 rounded-lg bg-white text-emerald-800 shadow-xs font-black transition';
    } else {
      btn.className = 'py-1.5 px-1 rounded-lg text-slate-600 font-medium hover:text-slate-900 transition';
    }
  });
}

function filterByLeaningQuick(leaning) {
  if (filterLeaning === leaning) {
    filterLeaning = '';
  } else {
    filterLeaning = leaning;
  }
  updateLeaningFilterPillStyles();
  applyFilters();
}

function updateLeaningFilterPillStyles() {
  const suppPill = document.getElementById('pill-filter-supporter');
  const swingPill = document.getElementById('pill-filter-swing');
  const oppPill = document.getElementById('pill-filter-opposition');

  if (suppPill) suppPill.classList.toggle('ring-2', filterLeaning === 'supporter');
  if (suppPill) suppPill.classList.toggle('ring-emerald-600', filterLeaning === 'supporter');

  if (swingPill) swingPill.classList.toggle('ring-2', filterLeaning === 'swing');
  if (swingPill) swingPill.classList.toggle('ring-amber-500', filterLeaning === 'swing');

  if (oppPill) oppPill.classList.toggle('ring-2', filterLeaning === 'opposition');
  if (oppPill) oppPill.classList.toggle('ring-rose-600', filterLeaning === 'opposition');
}

function toggleElderlyFilter() {
  filterElderlyOnly = !filterElderlyOnly;
  const btn = document.getElementById('btn-toggle-elderly');
  if (btn) {
    btn.className = filterElderlyOnly 
      ? 'px-2.5 py-1 rounded-xl border border-purple-500 bg-purple-600 text-white font-bold whitespace-nowrap shadow-xs' 
      : 'px-2.5 py-1 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 font-bold whitespace-nowrap';
  }
  applyFilters();
}

// =========================================================================
// DATA FETCHING & SYNCHRONIZATION
// =========================================================================
async function loadVotersData() {
  const container = document.getElementById('voters-container');
  if (!container) return;

  container.innerHTML = `
    <div class="py-16 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2"></div>
      <p class="text-xs font-bold text-slate-600">डेटा लोड हो रहा है...</p>
    </div>
  `;

  try {
    let allRecords = [];
    const batchSize = 1000;
    let from = 0;

    while (true) {
      let query = supabaseClient
        .from('voters')
        .select('*')
        .order('ward_no', { ascending: true })
        .order('serial_no', { ascending: true })
        .range(from, from + batchSize - 1);

      if (activeWard !== 'ALL') {
        query = query.eq('ward_no', activeWard);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;

      allRecords = allRecords.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    // Pre-calculate English transliterations for instant bilingual search
    allRecords.forEach(v => {
      v.name_en = v.name_en || transliterateHindi(v.name_hi);
      v.relative_en = transliterateHindi(v.relative_name);
      v.caste_en = transliterateHindi(v.caste);
      v.mohalla_en = transliterateHindi(v.mohalla);
    });

    allVoters = allRecords;
    applyFilters();
  } catch (err) {
    console.error('Error fetching voters:', err);
    container.innerHTML = `
      <div class="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-800 text-xs">
        <p class="font-bold text-sm">डेटा लोड नहीं हो पाया!</p>
        <p class="mt-1 text-rose-600">${err.message || 'इंटरनेट चेक करें।'}</p>
        <button onclick="loadVotersData()" class="mt-2.5 px-3 py-1.5 bg-rose-700 text-white font-bold rounded-lg touch-btn">पुनः प्रयास करें</button>
      </div>
    `;
  }
}

// Refresh Overall Stats & Target Victory Meter
async function refreshOverallStats() {
  try {
    let allStatsData = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await supabaseClient
        .from('voters')
        .select('political_leaning')
        .range(from, from + batchSize - 1);

      if (error || !data || data.length === 0) break;
      allStatsData = allStatsData.concat(data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    let supporters = 0;
    let swing = 0;
    let opposition = 0;

    allStatsData.forEach(v => {
      if (v.political_leaning === 'supporter') {
        supporters++;
      } else if (v.political_leaning === 'opposition') {
        opposition++;
      } else {
        swing++;
      }
    });

    const targetPercent = Math.min(100, Math.round((supporters / TARGET_VICTORY_VOTES) * 100));

    // Update Top Numbers
    const suppEl = document.getElementById('stat-supporters');
    const swingEl = document.getElementById('stat-swing');
    const oppEl = document.getElementById('stat-opposition');

    if (suppEl) suppEl.innerText = supporters.toLocaleString();
    if (swingEl) swingEl.innerText = swing.toLocaleString();
    if (oppEl) oppEl.innerText = opposition.toLocaleString();

    // Update Victory Meter
    const meterSupp = document.getElementById('meter-supporters');
    const meterPct = document.getElementById('meter-percent');
    if (meterSupp) meterSupp.innerText = supporters.toLocaleString();
    if (meterPct) meterPct.innerText = `${targetPercent}% पूरा`;

  } catch (e) {
    console.warn('Stats refresh error:', e);
  }
}

// =========================================================================
// SEARCH & FILTERS ENGINE
// =========================================================================
let searchDebounceTimeout = null;
function handleSearchInput() {
  const val = document.getElementById('search-input').value;
  searchQuery = val.trim().toLowerCase();
  
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.classList.toggle('hidden', searchQuery.length === 0);

  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    currentPage = 1;
    applyFilters();
  }, 150);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  searchQuery = '';
  document.getElementById('clear-search-btn').classList.add('hidden');
  currentPage = 1;
  applyFilters();
}

function applyFilters() {
  filterCaste = document.getElementById('filter-caste')?.value || '';
  filterMohalla = document.getElementById('filter-mohalla')?.value || '';

  filteredVoters = allVoters.filter(v => {
    // Leaning Quick Filter
    if (filterLeaning) {
      if (filterLeaning === 'supporter' && v.political_leaning !== 'supporter') return false;
      if (filterLeaning === 'swing' && v.political_leaning !== 'swing' && v.political_leaning !== 'neutral') return false;
      if (filterLeaning === 'opposition' && v.political_leaning !== 'opposition') return false;
    }

    // Caste & Dhani
    if (filterCaste && v.caste !== filterCaste) return false;
    if (filterMohalla && v.mohalla !== filterMohalla) return false;

    // Elderly filter
    if (filterElderlyOnly && (!v.age || v.age < 65)) return false;

    // Key Tab Sub-Filters
    if (activeBottomTab === 'key') {
      if (activeKeyFilter === 'decision_makers' && !v.is_key_decision_maker) return false;
      if (activeKeyFilter === 'elders' && (!v.age || v.age < 65)) return false;
      if (activeKeyFilter === 'outstation' && !v.is_outstation) return false;
    }

    // Bilingual Search (English + Hindi)
    if (searchQuery) {
      const q = searchQuery;
      const nameHi = (v.name_hi || '').toLowerCase();
      const nameEn = (v.name_en || '').toLowerCase();
      const relHi = (v.relative_name || '').toLowerCase();
      const relEn = (v.relative_en || '').toLowerCase();
      const epic = (v.epic_no || '').toLowerCase();
      const phone = (v.mobile_no || '') + (v.alternate_mobile || '');
      const house = (v.house_no || '').toString().toLowerCase();
      const serial = (v.serial_no || '').toString();

      const match = nameHi.includes(q) || nameEn.includes(q) ||
                    relHi.includes(q) || relEn.includes(q) ||
                    epic.includes(q) || phone.includes(q) ||
                    house.includes(q) || serial === q;

      if (!match) return false;
    }

    return true;
  });

  // Sort by age descending for elderly view
  if (filterElderlyOnly || (activeBottomTab === 'key' && activeKeyFilter === 'elders')) {
    filteredVoters.sort((a, b) => (b.age || 0) - (a.age || 0));
  }

  const showingCount = document.getElementById('showing-count');
  if (showingCount) showingCount.innerText = filteredVoters.length.toLocaleString();

  renderCurrentView();
}

// Render Current View
function renderCurrentView() {
  const container = document.getElementById('voters-container');
  const paginationBar = document.getElementById('pagination-bar');
  if (!container) return;

  if (filteredVoters.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
        <p class="text-sm font-bold text-slate-800">कोई वोटर नहीं मिला</p>
        <p class="text-xs text-slate-500">सर्च क्लियर करें या फ़िल्टर रीसेट करें।</p>
        <button onclick="clearSearch()" class="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold">सर्च हटाएं</button>
      </div>
    `;
    if (paginationBar) paginationBar.classList.add('hidden');
    return;
  }

  // 1. Families View (Used for 'families' tab or 'key' with 'big_families')
  if (activeBottomTab === 'families' || (activeBottomTab === 'key' && activeKeyFilter === 'big_families')) {
    renderFamiliesView(container, filteredVoters, activeBottomTab === 'key' && activeKeyFilter === 'big_families');
    if (paginationBar) paginationBar.classList.add('hidden');
  } 
  // 2. Individual Voters View (Used for 'voters' tab or decision makers, elders, outstation)
  else {
    if (paginationBar) paginationBar.classList.remove('hidden');
    const totalPages = Math.ceil(filteredVoters.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    document.getElementById('current-page-num').innerText = currentPage;
    document.getElementById('total-pages-num').innerText = totalPages;
    document.getElementById('prev-page-btn').disabled = currentPage === 1;
    document.getElementById('next-page-btn').disabled = currentPage === totalPages;

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const currentBatch = filteredVoters.slice(startIdx, startIdx + PAGE_SIZE);

    renderCardsView(container, currentBatch);
  }

  if (window.lucide) lucide.createIcons();
}

function changePage(delta) {
  currentPage += delta;
  renderCurrentView();
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

// =========================================================================
// 1. REDESIGNED FAMILY CARDS (परिवार वार कार्ड)
// =========================================================================
function renderFamiliesView(container, list, onlyBigFamilies = false) {
  const familyMap = new Map();

  list.forEach(v => {
    // Unique family ID based on Ward + House No (supports 129A, 129B) + Relative Name
    const fid = `W${v.ward_no}_H${v.house_no || '0'}_${v.relative_name || 'HEAD'}`;
    if (!familyMap.has(fid)) {
      familyMap.set(fid, []);
    }
    familyMap.get(fid).push(v);
  });

  let families = Array.from(familyMap.entries());

  if (onlyBigFamilies) {
    families = families.filter(([fid, mems]) => mems.length >= 5);
  }

  // Sort families by count descending (largest families first!)
  families.sort((a, b) => b[1].length - a[1].length);

  let html = `<div class="space-y-3.5">`;

  families.forEach(([fid, members], idx) => {
    // Head of family: oldest member
    members.sort((a, b) => (b.age || 0) - (a.age || 0));
    const head = members[0];
    const totalVotes = members.length;

    // Check key decision maker
    const keyMaker = members.find(m => m.is_key_decision_maker);

    // Vote Leaning Counts
    const ourVotes = members.filter(m => m.political_leaning === 'supporter').length;
    const oppVotes = members.filter(m => m.political_leaning === 'opposition').length;
    const swingVotes = totalVotes - ourVotes - oppVotes;

    // Status Determination
    const isFamilySupporter = ourVotes === totalVotes && totalVotes > 0;
    const isFamilyOpp = oppVotes === totalVotes && totalVotes > 0;
    const isFamilySwing = !isFamilySupporter && !isFamilyOpp;

    let borderAccent = 'border-l-amber-500';
    let statusPill = `<span class="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">🟡 संशय / बात करनी है</span>`;

    if (ourVotes > 0 && ourVotes === totalVotes) {
      borderAccent = 'border-l-emerald-600';
      statusPill = `<span class="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">🟢 पक्का परिवार (${totalVotes}/${totalVotes})</span>`;
    } else if (ourVotes > 0) {
      borderAccent = 'border-l-emerald-500';
      statusPill = `<span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">🟢 ${ourVotes} पक्के • 🟡 ${swingVotes} संशय</span>`;
    } else if (oppVotes === totalVotes) {
      borderAccent = 'border-l-rose-600';
      statusPill = `<span class="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">🔴 विरोधी परिवार</span>`;
    }

    const headPhone = members.find(m => m.mobile_no)?.mobile_no;
    const headInitial = (head.relative_name || head.name_hi || 'प').substring(0, 1);

    html += `
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 border-l-[6px] ${borderAccent} p-3.5 space-y-3 transition hover:shadow-sm">
        
        <!-- Family Header -->
        <div class="flex items-start justify-between gap-2.5 pb-2 border-b border-slate-100">
          
          <div class="flex items-start gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-black text-sm flex items-center justify-center flex-shrink-0 border border-slate-200 shadow-2xs">
              ${headInitial}
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900 leading-tight">
                श्री ${head.relative_name || head.name_hi} का परिवार
              </h3>
              
              <div class="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-semibold text-slate-600">
                <span class="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200 font-mono font-bold">🏠 मकान: ${head.house_no || '-'}</span>
                <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">वार्ड ${head.ward_no}</span>
                ${head.caste ? `<span class="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg">👥 ${head.caste}</span>` : ''}
                ${head.mohalla ? `<span class="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg">📍 ${head.mohalla}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Total Votes Badge -->
          <div class="text-right flex-shrink-0">
            <span class="px-2.5 py-1 bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1">
              <i data-lucide="vote" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>${totalVotes} वोट</span>
            </span>
          </div>

        </div>

        <!-- 3-Way Segmented Control: 1-Click Family Leaning -->
        <div class="bg-slate-100 p-1 rounded-xl border border-slate-200 grid grid-cols-3 gap-1 text-xs font-bold text-center">
          <button onclick="setEntireFamilyQuick('${fid}', 'supporter')" class="py-1.5 px-1 rounded-lg transition active:scale-95 flex items-center justify-center gap-1 ${isFamilySupporter ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-700' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}">
            <span>🟢</span>
            <span>${isFamilySupporter ? '✓ हमारा पक्का' : 'हमारा पक्का'}</span>
          </button>
          <button onclick="setEntireFamilyQuick('${fid}', 'swing')" class="py-1.5 px-1 rounded-lg transition active:scale-95 flex items-center justify-center gap-1 ${isFamilySwing ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-600' : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'}">
            <span>🟡</span>
            <span>${isFamilySwing ? '✓ संशय' : 'संशय (मिलना है)'}</span>
          </button>
          <button onclick="setEntireFamilyQuick('${fid}', 'opposition')" class="py-1.5 px-1 rounded-lg transition active:scale-95 flex items-center justify-center gap-1 ${isFamilyOpp ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-700' : 'text-slate-600 hover:bg-rose-50 hover:text-rose-800'}">
            <span>🔴</span>
            <span>${isFamilyOpp ? '✓ विरोधी' : 'विरोधी'}</span>
          </button>
        </div>

        <!-- Key Decision Maker Alert (If set) -->
        ${keyMaker ? `
          <div class="bg-amber-50/80 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base">⚡</span>
              <div>
                <span class="text-[10px] text-amber-800 font-bold block uppercase tracking-wide">घर का मुख्य निर्णायक सदस्य:</span>
                <span class="font-extrabold text-slate-900">${keyMaker.name_hi}</span>
                <span class="text-slate-500 font-semibold text-[11px]">(${keyMaker.age} वर्ष)</span>
              </div>
            </div>
            ${keyMaker.mobile_no ? `
              <a href="tel:${keyMaker.mobile_no}" class="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 font-extrabold text-slate-950 rounded-lg text-xs flex items-center gap-1 shadow-xs">
                <i data-lucide="phone-call" class="w-3 h-3"></i>
                <span>कॉल</span>
              </a>
            ` : `
              <button onclick="openEditModal('${keyMaker.id}')" class="text-amber-800 font-bold text-[11px] underline">
                + फोन जोड़ें
              </button>
            `}
          </div>
        ` : ''}

        <!-- Members Rows List -->
        <div class="space-y-1.5 pt-1">
          ${members.map((m, mIdx) => {
            const isMSupporter = m.political_leaning === 'supporter';
            const isMOpp = m.political_leaning === 'opposition';
            const isMSwing = !isMSupporter && !isMOpp;

            return `
              <div class="bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs transition">
                
                <!-- Member Info -->
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono text-slate-400 text-[10px] font-bold">#${m.serial_no}</span>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-extrabold text-slate-900 truncate">${m.name_hi}</span>
                      <span class="text-slate-500 text-[11px] whitespace-nowrap">(${m.age} वर्ष, ${m.gender})</span>
                      ${mIdx === 0 ? '<span class="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded">👑 मुखिया</span>' : ''}
                      ${m.is_key_decision_maker ? '<span class="bg-yellow-200 text-yellow-950 text-[10px] font-black px-1.5 py-0.2 rounded">⚡ निर्णायक</span>' : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 truncate mt-0.5">
                      ${m.relation_type || 'पिता / पति'}: ${m.relative_name}
                      ${m.mobile_no ? `• 📞 <span class="font-mono text-slate-700">${m.mobile_no}</span>` : ''}
                    </div>
                  </div>
                </div>

                <!-- Member Quick Actions -->
                <div class="flex items-center gap-1 flex-shrink-0">
                  
                  <!-- 1-Tap Leaning Cycle Button -->
                  <button onclick="toggleSingleVoterLeaning('${m.id}')" class="px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-0.5 transition active:scale-95 ${
                    isMSupporter ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    isMOpp ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-amber-100 text-amber-800 border border-amber-300'
                  }" title="क्लिक करके वोट बदलें">
                    <span>${isMSupporter ? '🟢 पक्का' : isMOpp ? '🔴 विरोधी' : '🟡 संशय'}</span>
                  </button>

                  ${m.mobile_no ? `
                    <a href="tel:${m.mobile_no}" class="p-1.5 bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg shadow-2xs" title="फ़ोन करें">
                      <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                    </a>
                  ` : ''}

                  <button onclick="openSlipModal('${m.id}')" class="p-1.5 bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg shadow-2xs" title="वोटर पर्ची">
                    <i data-lucide="ticket" class="w-3.5 h-3.5"></i>
                  </button>

                  <button onclick="openEditModal('${m.id}')" class="p-1.5 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs" title="एडिट">
                    <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                  </button>

                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- Family Footer Actions -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          
          <button onclick="openFamilyEditModal('${fid}')" class="text-emerald-700 hover:text-emerald-900 font-extrabold flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-emerald-50 transition">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            <span>पूरे परिवार का डेटा बदलें (मकान, ढाणी, जाति)</span>
          </button>

          ${headPhone ? `
            <a href="https://wa.me/91${headPhone}?text=${encodeURIComponent(`सादर प्रणाम श्री ${head.relative_name || head.name_hi} जी, आपके पूरे परिवार के स्नेह और आशीर्वाद हेतु हम आपके साथ हैं!`)}" target="_blank" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              <span>व्हाट्सएप</span>
            </a>
          ` : ''}

        </div>

      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// =========================================================================
// 2. ALL VOTERS CARDS VIEW
// =========================================================================
function renderCardsView(container, list) {
  let html = `<div class="space-y-3">`;

  list.forEach(v => {
    let borderAccent = 'border-l-slate-300';
    let statusText = '🟡 संशय';
    let statusClass = 'text-amber-800 bg-amber-100 border border-amber-300';

    if (v.political_leaning === 'supporter') {
      borderAccent = 'border-l-emerald-600';
      statusText = '🟢 हमारा पक्का';
      statusClass = 'text-emerald-800 bg-emerald-100 border border-emerald-300';
    } else if (v.political_leaning === 'opposition') {
      borderAccent = 'border-l-rose-600';
      statusText = '🔴 विरोधी';
      statusClass = 'text-rose-800 bg-rose-100 border border-rose-300';
    } else {
      borderAccent = 'border-l-amber-500';
    }

    html += `
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 border-l-[5px] ${borderAccent} p-3.5 space-y-2">
        
        <div class="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
          <div class="flex items-center gap-1.5 font-bold">
            <span class="bg-slate-900 text-white font-mono text-[11px] px-2 py-0.5 rounded">W-${v.ward_no}</span>
            <span class="text-emerald-700 font-mono">#${v.serial_no}</span>
            <span class="text-slate-500">मकान: <b class="text-slate-800 font-mono">${v.house_no || '-'}</b></span>
          </div>
          <div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusClass}">${statusText}</span>
          </div>
        </div>

        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-base font-black text-slate-900 leading-tight">
              ${v.name_hi}
              <span class="text-xs font-normal text-slate-500">(${v.age || '-'} वर्ष, ${v.gender || '-'})</span>
            </div>
            <div class="text-xs text-slate-600 mt-0.5">
              ${v.relation_type || 'संबंध'}: <b class="text-slate-800">${v.relative_name || '-'}</b>
            </div>
            <div class="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-1.5">
              ${v.mohalla ? `<span>📍 ${v.mohalla}</span>` : ''}
              ${v.caste ? `<span class="text-blue-700 font-bold">👥 ${v.caste}</span>` : ''}
              ${v.is_key_decision_maker ? '<span class="bg-yellow-300 text-slate-950 text-[10px] font-black px-1.5 rounded">⚡ निर्णायक</span>' : ''}
              ${v.is_outstation ? '<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 rounded">✈️ प्रवासी</span>' : ''}
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <span class="font-mono text-[11px] font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 block text-slate-700">
              ${v.epic_no || 'EPIC नहीं'}
            </span>
          </div>
        </div>

        <!-- Action Row -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          
          <!-- 3 Quick Toggles -->
          <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button onclick="setIndividualQuickLeaning('${v.id}', 'supporter')" class="px-2 py-1 rounded text-xs transition touch-btn ${v.political_leaning === 'supporter' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600'}">
              🟢
            </button>
            <button onclick="setIndividualQuickLeaning('${v.id}', 'swing')" class="px-2 py-1 rounded text-xs transition touch-btn ${v.political_leaning === 'swing' ? 'bg-amber-500 text-white font-bold' : 'text-slate-600'}">
              🟡
            </button>
            <button onclick="setIndividualQuickLeaning('${v.id}', 'opposition')" class="px-2 py-1 rounded text-xs transition touch-btn ${v.political_leaning === 'opposition' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600'}">
              🔴
            </button>
          </div>

          <div class="flex items-center gap-1.5">
            ${v.mobile_no ? `
              <a href="tel:${v.mobile_no}" class="px-2.5 py-1 bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] flex items-center gap-1">
                <i data-lucide="phone" class="w-3 h-3"></i>
                <span>कॉल</span>
              </a>
            ` : ''}

            <button onclick="openSlipModal('${v.id}')" class="p-1.5 bg-slate-100 text-slate-700 rounded-lg" title="पर्ची">
              <i data-lucide="ticket" class="w-3.5 h-3.5 text-amber-600"></i>
            </button>

            <button onclick="openEditModal('${v.id}')" class="px-2.5 py-1 bg-slate-900 text-white font-bold rounded-lg text-[11px] flex items-center gap-1">
              <i data-lucide="edit-2" class="w-3 h-3"></i>
              <span>एडिट</span>
            </button>
          </div>

        </div>

      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// =========================================================================
// 3. ANALYTICS WORKSPACE VIEW (चुनावी गणित व रणनीति)
// =========================================================================
function renderAnalyticsView() {
  const container = document.getElementById('analytics-workspace-section');
  if (!container) return;

  // Compute breakdown stats
  let totalSupporters = 0;
  let totalSwing = 0;
  let totalOpposition = 0;

  const wardStats = {};
  for (let w = 1; w <= 9; w++) {
    wardStats[w] = { total: 0, supporters: 0, swing: 0, opposition: 0 };
  }

  const casteStats = {};
  const mohallaStats = {};
  let age18to35 = 0;
  let age36to50 = 0;
  let age51plus = 0;

  allVoters.forEach(v => {
    const w = v.ward_no;
    if (wardStats[w]) wardStats[w].total++;

    if (v.political_leaning === 'supporter') {
      totalSupporters++;
      if (wardStats[w]) wardStats[w].supporters++;
    } else if (v.political_leaning === 'opposition') {
      totalOpposition++;
      if (wardStats[w]) wardStats[w].opposition++;
    } else {
      totalSwing++;
      if (wardStats[w]) wardStats[w].swing++;
    }

    // Caste
    const c = v.caste || 'अवर्गीकृत';
    if (!casteStats[c]) casteStats[c] = { total: 0, supporters: 0, swing: 0 };
    casteStats[c].total++;
    if (v.political_leaning === 'supporter') casteStats[c].supporters++;
    else casteStats[c].swing++;

    // Mohalla
    const m = v.mohalla || 'देजगरा मुख्य बस्ती';
    if (!mohallaStats[m]) mohallaStats[m] = { total: 0, supporters: 0 };
    mohallaStats[m].total++;
    if (v.political_leaning === 'supporter') mohallaStats[m].supporters++;

    // Age
    if (v.age) {
      if (v.age <= 35) age18to35++;
      else if (v.age <= 50) age36to50++;
      else age51plus++;
    }
  });

  const winPercent = Math.min(100, Math.round((totalSupporters / TARGET_VICTORY_VOTES) * 100));
  const remainingNeeded = Math.max(0, TARGET_VICTORY_VOTES - totalSupporters);

  container.innerHTML = `
    <!-- 1. Victory Goal Card -->
    <section class="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-emerald-300 font-bold text-xs uppercase tracking-wider block">🎯 सरपंच जीत का लक्ष्य</span>
          <div class="text-2xl font-black mt-0.5">
            ${totalSupporters.toLocaleString()} <span class="text-sm font-semibold text-emerald-200">/ 950 वोट</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-xs font-black bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full border border-emerald-400/40">
            ${winPercent}% पूर्ण
          </span>
          <p class="text-[11px] text-emerald-300 mt-1 font-semibold">जीत हेतु शेष: ${remainingNeeded} वोट</p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="w-full bg-black/40 rounded-full h-3 p-0.5">
        <div class="bg-gradient-to-r from-emerald-400 to-teal-300 h-2 rounded-full transition-all duration-500" style="width: ${winPercent}%"></div>
      </div>
    </section>

    <!-- 2. Ward by Ward Table -->
    <section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
      <h3 class="text-sm font-black text-slate-900 flex items-center gap-1.5">
        <i data-lucide="building-2" class="w-4 h-4 text-emerald-600"></i>
        <span>वार्ड अनुसार समीकरण (वार्ड 1 से 9)</span>
      </h3>

      <div class="overflow-x-auto no-scrollbar">
        <table class="w-full text-xs text-left">
          <thead>
            <tr class="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
              <th class="py-2 px-2.5 rounded-l-lg">वार्ड</th>
              <th class="py-2 px-2">कुल</th>
              <th class="py-2 px-2 text-emerald-700">🟢 पक्के</th>
              <th class="py-2 px-2 text-amber-700">🟡 संशय</th>
              <th class="py-2 px-2 text-rose-700">🔴 विरोधी</th>
              <th class="py-2 px-2 rounded-r-lg text-right">स्थिति</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-semibold">
            ${Object.keys(wardStats).map(w => {
              const s = wardStats[w];
              const pct = s.total > 0 ? Math.round((s.supporters / s.total) * 100) : 0;
              return `
                <tr class="hover:bg-slate-50 cursor-pointer" onclick="selectWard(${w}); switchBottomTab('families');">
                  <td class="py-2.5 px-2.5 font-bold text-slate-900">वार्ड ${w}</td>
                  <td class="py-2.5 px-2 font-mono">${s.total}</td>
                  <td class="py-2.5 px-2 text-emerald-700 font-mono font-bold">${s.supporters}</td>
                  <td class="py-2.5 px-2 text-amber-700 font-mono">${s.swing}</td>
                  <td class="py-2.5 px-2 text-rose-700 font-mono">${s.opposition}</td>
                  <td class="py-2.5 px-2 text-right">
                    <span class="bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[11px]">${pct}%</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 3. Caste Breakdown -->
    <section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
      <h3 class="text-sm font-black text-slate-900 flex items-center gap-1.5">
        <i data-lucide="users" class="w-4 h-4 text-blue-600"></i>
        <span>जातिगत समीकरण (Caste Equation)</span>
      </h3>

      <div class="grid grid-cols-2 gap-2 text-xs">
        ${Object.keys(casteStats).sort((a,b) => casteStats[b].total - casteStats[a].total).map(c => `
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
            <div class="flex items-center justify-between font-bold text-slate-900">
              <span>${c}</span>
              <span class="font-mono text-slate-500">${casteStats[c].total} वोट</span>
            </div>
            <div class="text-[11px] text-emerald-700 font-bold flex items-center justify-between">
              <span>🟢 पक्के: ${casteStats[c].supporters}</span>
              <span class="text-amber-700">🟡 संशय: ${casteStats[c].swing}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- 4. Age Demographics -->
    <section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
      <h3 class="text-sm font-black text-slate-900 flex items-center gap-1.5">
        <i data-lucide="pie-chart" class="w-4 h-4 text-purple-600"></i>
        <span>उम्र वर्ग (Age Demographics)</span>
      </h3>

      <div class="grid grid-cols-3 gap-2 text-center text-xs">
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-2.5">
          <span class="text-[11px] font-bold text-purple-800 block">युवा (18-35)</span>
          <b class="text-base font-black text-purple-950">${age18to35}</b>
          <span class="text-[10px] text-purple-600 block mt-0.5">भावी निर्णायक</span>
        </div>
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
          <span class="text-[11px] font-bold text-blue-800 block">मध्यम (36-50)</span>
          <b class="text-base font-black text-blue-950">${age36to50}</b>
          <span class="text-[10px] text-blue-600 block mt-0.5">परिवार मुखिया</span>
        </div>
        <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
          <span class="text-[11px] font-bold text-emerald-800 block">वरिष्ठ (51+)</span>
          <b class="text-base font-black text-emerald-950">${age51plus}</b>
          <span class="text-[10px] text-emerald-600 block mt-0.5">आशीर्वाद जरूरी</span>
        </div>
      </div>
    </section>
  `;

  if (window.lucide) lucide.createIcons();
}

// =========================================================================
// QUICK ACTIONS & DATABASE UPDATES
// =========================================================================
async function setEntireFamilyQuick(familyId, leaning) {
  const members = allVoters.filter(v => (v.family_id || `W${v.ward_no}_H${v.house_no || '0'}_${v.relative_name || 'HEAD'}`) === familyId);
  if (members.length === 0) return;

  const candidate = leaning === 'supporter' ? 'हमारा प्रत्याशी' : leaning === 'opposition' ? 'प्रतिद्वंदी' : 'तय नहीं';

  members.forEach(m => {
    m.political_leaning = leaning;
    m.candidate_preference = candidate;
  });
  renderCurrentView();

  try {
    const ids = members.map(m => m.id);
    const { error } = await supabaseClient
      .from('voters')
      .update({ 
        political_leaning: leaning, 
        candidate_preference: candidate, 
        updated_at: new Date().toISOString() 
      })
      .in('id', ids);

    if (error) throw error;
    await refreshOverallStats();
    showToast(`पूरे परिवार (${members.length} वोट) का रुझान सुरक्षित!`);
  } catch (err) {
    console.error('Quick family update error:', err);
    showToast('परिवार अपडेट विफल', 'error');
  }
}

async function setIndividualQuickLeaning(voterId, leaning) {
  const v = allVoters.find(x => x.id === voterId);
  if (!v) return;

  const candidate = leaning === 'supporter' ? 'हमारा प्रत्याशी' : leaning === 'opposition' ? 'प्रतिद्वंदी' : 'तय नहीं';
  v.political_leaning = leaning;
  v.candidate_preference = candidate;
  renderCurrentView();

  try {
    const { error } = await supabaseClient
      .from('voters')
      .update({ 
        political_leaning: leaning, 
        candidate_preference: candidate, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', voterId);

    if (error) throw error;
    await refreshOverallStats();
    showToast(`वोटर का रुझान दर्ज हुआ!`);
  } catch (err) {
    console.error('Update error:', err);
    showToast('अपडेट विफल', 'error');
  }
}

// 1-Tap Toggle for Member inside Family Card
async function toggleSingleVoterLeaning(voterId) {
  const v = allVoters.find(x => x.id === voterId);
  if (!v) return;

  let nextLeaning = 'supporter';
  let nextPref = 'हमारा प्रत्याशी';

  if (v.political_leaning === 'supporter') {
    nextLeaning = 'opposition';
    nextPref = 'प्रतिद्वंदी';
  } else if (v.political_leaning === 'opposition') {
    nextLeaning = 'swing';
    nextPref = 'तय नहीं';
  }

  v.political_leaning = nextLeaning;
  v.candidate_preference = nextPref;
  renderCurrentView();

  try {
    const { error } = await supabaseClient
      .from('voters')
      .update({
        political_leaning: nextLeaning,
        candidate_preference: nextPref,
        updated_at: new Date().toISOString()
      })
      .eq('id', voterId);

    if (error) throw error;
    await refreshOverallStats();
    showToast(`वोटर #${v.serial_no} का रुझान बदला!`);
  } catch (err) {
    console.error('Leaning toggle error:', err);
    showToast('अपडेट विफल', 'error');
  }
}

// =========================================================================
// BULK FAMILY DATA EDIT MODAL
// =========================================================================
function openFamilyEditModal(familyId) {
  const members = allVoters.filter(v => (v.family_id || `W${v.ward_no}_H${v.house_no || '0'}_${v.relative_name || 'HEAD'}`) === familyId);
  if (members.length === 0) return;

  const head = members[0];
  document.getElementById('bulk-family-id').value = familyId;
  document.getElementById('family-modal-head-name').innerText = `परिवार: श्री ${head.relative_name || head.name_hi}`;
  document.getElementById('family-modal-count-info').innerText = `वार्ड ${head.ward_no} • कुल ${members.length} वोट`;

  document.getElementById('bulk-house-no').value = head.house_no || '';
  document.getElementById('bulk-mohalla').value = head.mohalla || '';
  document.getElementById('bulk-caste').value = head.caste || '';
  document.getElementById('bulk-candidate').value = head.candidate_preference || 'तय नहीं';
  document.getElementById('bulk-issue').value = head.local_issue || '';

  document.getElementById('family-edit-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeFamilyEditModal() {
  document.getElementById('family-edit-modal').classList.add('hidden');
}

async function saveFamilyBulkData(event) {
  event.preventDefault();
  const familyId = document.getElementById('bulk-family-id').value;
  const newHouse = document.getElementById('bulk-house-no').value.trim();
  const newMohalla = document.getElementById('bulk-mohalla').value.trim();
  const newCaste = document.getElementById('bulk-caste').value.trim();
  const newPref = document.getElementById('bulk-candidate').value;
  const newIssue = document.getElementById('bulk-issue').value.trim();

  const members = allVoters.filter(v => (v.family_id || `W${v.ward_no}_H${v.house_no || '0'}_${v.relative_name || 'HEAD'}`) === familyId);
  if (members.length === 0) return;

  let leaning = 'swing';
  if (newPref === 'हमारा प्रत्याशी') leaning = 'supporter';
  else if (newPref && newPref.includes('प्रतिद्वंदी')) leaning = 'opposition';

  const updates = {
    house_no: newHouse,
    mohalla: newMohalla,
    caste: newCaste,
    candidate_preference: newPref,
    political_leaning: leaning,
    local_issue: newIssue,
    updated_at: new Date().toISOString()
  };

  members.forEach(m => Object.assign(m, updates));
  closeFamilyEditModal();
  renderCurrentView();

  try {
    const ids = members.map(m => m.id);
    const { error } = await supabaseClient
      .from('voters')
      .update(updates)
      .in('id', ids);

    if (error) throw error;
    await refreshOverallStats();
    showToast(`पूरे परिवार (${members.length} वोट) का विवरण अपडेट हुआ!`);
  } catch (err) {
    console.error('Bulk save error:', err);
    showToast('सेव नहीं हो पाया', 'error');
  }
}

// =========================================================================
// INDIVIDUAL VOTER EDIT MODAL
// =========================================================================
function openEditModal(voterId) {
  const v = allVoters.find(x => x.id === voterId);
  if (!v) return;

  document.getElementById('edit-voter-id').value = v.id;
  document.getElementById('edit-modal-voter-name').innerText = `${v.name_hi} (#${v.serial_no})`;
  document.getElementById('edit-modal-epic').innerText = `वार्ड ${v.ward_no} • EPIC: ${v.epic_no || '-'}`;

  document.getElementById('edit-mobile').value = v.mobile_no || '';
  document.getElementById('edit-alt-mobile').value = v.alternate_mobile || '';
  document.getElementById('edit-house-no').value = v.house_no || '';
  document.getElementById('edit-caste').value = v.caste || '';
  document.getElementById('edit-mohalla').value = v.mohalla || '';
  document.getElementById('edit-occupation').value = v.occupation || '';
  document.getElementById('edit-candidate-pref').value = v.candidate_preference || 'तय नहीं';
  document.getElementById('edit-leaning').value = v.political_leaning || 'swing';
  document.getElementById('edit-key-decision-maker').checked = !!v.is_key_decision_maker;
  document.getElementById('edit-outstation').checked = !!v.is_outstation;
  document.getElementById('edit-outstation-city').value = v.outstation_city || '';
  document.getElementById('edit-notes').value = v.notes || '';

  document.getElementById('voter-edit-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeEditModal() {
  document.getElementById('voter-edit-modal').classList.add('hidden');
}

async function saveVoterData(event) {
  event.preventDefault();
  const voterId = document.getElementById('edit-voter-id').value;
  const v = allVoters.find(x => x.id === voterId);
  if (!v) return;

  const updates = {
    mobile_no: document.getElementById('edit-mobile').value.trim(),
    alternate_mobile: document.getElementById('edit-alt-mobile').value.trim(),
    house_no: document.getElementById('edit-house-no').value.trim(),
    caste: document.getElementById('edit-caste').value.trim(),
    mohalla: document.getElementById('edit-mohalla').value.trim(),
    occupation: document.getElementById('edit-occupation').value.trim(),
    candidate_preference: document.getElementById('edit-candidate-pref').value,
    political_leaning: document.getElementById('edit-leaning').value,
    is_key_decision_maker: document.getElementById('edit-key-decision-maker').checked,
    is_outstation: document.getElementById('edit-outstation').checked,
    outstation_city: document.getElementById('edit-outstation-city').value.trim(),
    notes: document.getElementById('edit-notes').value.trim(),
    updated_at: new Date().toISOString()
  };

  Object.assign(v, updates);
  closeEditModal();
  renderCurrentView();

  try {
    const { error } = await supabaseClient
      .from('voters')
      .update(updates)
      .eq('id', voterId);

    if (error) throw error;
    await refreshOverallStats();
    showToast('वोटर विवरण सुरक्षित हुआ!');
  } catch (err) {
    console.error('Save voter error:', err);
    showToast('सेव विफल', 'error');
  }
}

// =========================================================================
// VOTER SLIP & WHATSAPP
// =========================================================================
function openSlipModal(voterId) {
  const v = allVoters.find(x => x.id === voterId);
  if (!v) return;

  currentSelectedVoterForSlip = v;
  document.getElementById('slip-name').innerText = v.name_hi;
  document.getElementById('slip-age-gender').innerText = `${v.age || '-'} वर्ष, ${v.gender || '-'}`;
  document.getElementById('slip-relation').innerText = `${v.relation_type || 'पिता / पति'}: ${v.relative_name || '-'}`;
  document.getElementById('slip-ward').innerText = `वार्ड नं. ${v.ward_no}`;
  document.getElementById('slip-serial').innerText = `#${v.serial_no}`;
  document.getElementById('slip-epic').innerText = v.epic_no || '-';
  document.getElementById('slip-house').innerText = v.house_no || '-';

  document.getElementById('voter-slip-modal').classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

function closeSlipModal() {
  document.getElementById('voter-slip-modal').classList.add('hidden');
}

function sendWhatsAppSlip() {
  if (!currentSelectedVoterForSlip) return;
  const v = currentSelectedVoterForSlip;

  const msg = `🏛️ *ग्राम पंचायत लोरड़ी देजगरा - मतदाता पर्ची 2026*
------------------------------
👤 *मतदाता:* ${v.name_hi} (${v.age || '-'} वर्ष, ${v.gender || '-'})
👨‍👩‍👧 *${v.relation_type || 'रिश्तेदार'}:* ${v.relative_name}
🔢 *क्रमांक (Sr No):* #${v.serial_no}
🏛️ *वार्ड नंबर:* वार्ड नं. ${v.ward_no}
🏠 *मकान नंबर:* ${v.house_no || '-'}
🆔 *वोटर कार्ड (EPIC):* ${v.epic_no || '-'}
📍 *मतदान केंद्र:* ${v.booth_name || 'रा.उ.मा.वि. लोरड़ी देजगरा'}

------------------------------
_गाँव के चहुंमुखी विकास और खुशहाली के लिए अपना अमूल्य मत देकर विजयी बनाएं!_`;

  let url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  if (v.mobile_no && v.mobile_no.length === 10) {
    url = `https://wa.me/91${v.mobile_no}?text=${encodeURIComponent(msg)}`;
  }
  window.open(url, '_blank');
}

// Export CSV
function exportCurrentFilteredList() {
  if (filteredVoters.length === 0) {
    showToast('एक्सपोर्ट के लिए कोई डेटा नहीं है', 'error');
    return;
  }

  const headers = ['Ward', 'Serial', 'EPIC', 'Name', 'Relation', 'Relative', 'House', 'Age', 'Gender', 'Dhani', 'Caste', 'Mobile', 'Candidate Preference', 'Leaning', 'Key Decision Maker'];
  const rows = filteredVoters.map(v => [
    v.ward_no, v.serial_no, `"${v.epic_no || ''}"`, `"${v.name_hi || ''}"`,
    `"${v.relation_type || ''}"`, `"${v.relative_name || ''}"`, `"${v.house_no || ''}"`,
    v.age, v.gender, `"${v.mohalla || ''}"`, `"${v.caste || ''}"`,
    `"${v.mobile_no || ''}"`, `"${v.candidate_preference || ''}"`, `"${v.political_leaning || ''}"`,
    v.is_key_decision_maker ? 'Yes' : 'No'
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lordi_Daijagra_Ward_${activeWard}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('CSV डाउनलोड हो गया!');
}

async function refreshData() {
  await loadVotersData();
  await refreshOverallStats();
  showToast('डेटा ताज़ा हो गया!');
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toast-message');
  const icon = document.getElementById('toast-icon');
  if (!toast || !msg) return;

  msg.innerText = message;
  if (type === 'error') {
    if (icon) icon.className = 'w-4 h-4 text-rose-400';
  } else {
    if (icon) icon.className = 'w-4 h-4 text-emerald-400';
  }

  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2200);
}

// =========================================================================
// PWA INSTALLATION & SERVICE WORKER LOGIC
// =========================================================================
let deferredInstallPrompt = null;

// Register Service Worker for fast caching & offline readiness
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('✅ ServiceWorker Registered successfully:', reg.scope);
      })
      .catch(err => {
        console.log('⚠️ ServiceWorker note:', err.message);
      });
  });
}

// Catch Chrome's native beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  
  const banner = document.getElementById('pwa-install-banner');
  if (banner && localStorage.getItem('pwa_banner_dismissed') !== 'true') {
    banner.classList.remove('hidden');
  }
});

// Check dismissed status on load
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner && localStorage.getItem('pwa_banner_dismissed') === 'true') {
    banner.classList.add('hidden');
  }
});

// Native 1-Click Install or iOS Helper
async function installPWA() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      showToast('Lordi Daijagra ऐप फोन में इंस्टॉल हो गया! 📱');
      dismissInstallBanner();
    }
    deferredInstallPrompt = null;
  } else {
    const guideModal = document.getElementById('pwa-guide-modal');
    if (guideModal) {
      guideModal.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  }
}

function dismissInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.classList.add('hidden');
  }
  localStorage.setItem('pwa_banner_dismissed', 'true');
}

function closePwaGuideModal() {
  const guideModal = document.getElementById('pwa-guide-modal');
  if (guideModal) {
    guideModal.classList.add('hidden');
  }
}
