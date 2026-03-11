// ═══════════════════════════════════════════════════════════
// mission.js — 미션 센터 (직무별 큐레이션)
// ═══════════════════════════════════════════════════════════

function initMissionCenter() {
  const grid = $('#galaxy-grid');
  grid.innerHTML = Object.entries(CURATION).map(([id, data]) =>
    `<div class="galaxy-card ${id===S.currentGalaxy?'active':''}" data-galaxy="${id}">
      <span class="emoji">${data.emoji}</span>
      <span class="label">${data.name}</span>
    </div>`
  ).join('');

  grid.querySelectorAll('.galaxy-card').forEach(card => {
    card.addEventListener('click', () => {
      S.currentGalaxy = card.dataset.galaxy;
      grid.querySelectorAll('.galaxy-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      renderOrbits(card.dataset.galaxy);
    });
  });

  renderOrbits(S.currentGalaxy);

  let debounce;
  $('#mission-search').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(handleMissionSearch, 300);
  });
}

function renderOrbits(galaxyId, roles=null) {
  const grid = $('#orbit-grid');
  const toRender = roles || (CURATION[galaxyId]?.roles || []);

  grid.innerHTML = toRender.map((role, i) =>
    `<div class="orbit-card" data-role="${role.id}" style="animation-delay:${i*50}ms">
      <h4>🛰️ ${role.name}</h4>
      <div class="orbit-tags">${role.keywords.map(k => `<span class="cat-badge">${k}</span>`).join('')}</div>
    </div>`
  ).join('');

  grid.querySelectorAll('.orbit-card').forEach(card => {
    card.addEventListener('click', () => {
      const roleId = card.dataset.role;
      let role;
      for(const fam of Object.values(CURATION)) { role = fam.roles.find(r => r.id===roleId); if(role) break; }
      if(role) applyMissionRole(role);
    });
  });
}

function handleMissionSearch() {
  const term = $('#mission-search').value.toLowerCase().trim();
  if(!term) { renderOrbits(S.currentGalaxy); return; }
  const matched = [];
  for(const fam of Object.values(CURATION)) {
    fam.roles.forEach(role => {
      if(`${role.name} ${role.keywords.join(' ')} ${role.prompt}`.toLowerCase().includes(term)) matched.push(role);
    });
  }
  renderOrbits(null, matched);
}

function applyMissionRole(role) {
  resetAll(false);
  $('#search-input').value = role.prompt;
  if(role.cats?.length) setMSValues('f-category', role.cats);

  const level = document.querySelector('input[name="lv"]:checked')?.value;
  let diffs = [];
  if(level==='beginner') diffs = ['Beginner','All Levels'];
  else if(level==='intermediate') diffs = ['Intermediate'];
  else if(level==='expert') diffs = ['Expert'];
  if(diffs.length) setMSValues('f-difficulty', diffs);

  switchTab('explore');
  S.searchMode = 'or';
  $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
  $('.scan-mode-btn[data-mode="or"]').classList.add('active');
  applyFilters();
  toast(`🛰️ ${role.name} 항로로 스캔을 시작합니다.`);
}
