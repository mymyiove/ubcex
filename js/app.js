// ═══════════════════════════════════════════════════════════
// app.js — 고정 헤더 탭 + 필터 토글 + 제외 강의 + 병렬 로딩
// ═══════════════════════════════════════════════════════════

const ADMIN_CODE = 'jhj11';
const WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
const WORKER_SECRET = 'gogo1014';

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('kv_subdomain');
  if (saved && saved !== ADMIN_CODE) {
    $('#input-subdomain').value = saved;
    $('#gate-history').innerHTML = `💡 이전 모선: <a id="quick-launch">${saved}</a>`;
    $('#quick-launch')?.addEventListener('click', () => { $('#input-subdomain').value = saved; goStep2(); });
  }

  $('#input-subdomain').addEventListener('input', () => {
    const v = $('#input-subdomain').value.trim();
    if (v === ADMIN_CODE) {
      $('#subdomain-preview').textContent = '🔧 관리자 모드로 진입합니다';
      $('#subdomain-preview').style.color = 'var(--warning)';
    } else {
      $('#subdomain-preview').textContent = v ? `✅ ${v}.udemy.com 연결 확인` : '';
      $('#subdomain-preview').style.color = 'var(--success)';
    }
  });

  $('#btn-step1-next').addEventListener('click', goStep2);
  $('#input-subdomain').addEventListener('keyup', e => { if (e.key === 'Enter') goStep2(); });

  const grid = $('#gate-job-grid');
  Object.entries(CURATION).forEach(([id, data]) => {
    const card = document.createElement('div');
    card.className = 'gate-job-card';
    card.dataset.family = id;
    card.innerHTML = `<span class="emoji">${data.emoji}</span><span class="label">${data.name}</span>`;
    card.addEventListener('click', () => card.classList.toggle('selected'));
    grid.appendChild(card);
  });

  $('#btn-launch').addEventListener('click', launch);
  $('#btn-skip').addEventListener('click', launch);

  window.addEventListener('scroll', () => { $('#scroll-to-top').classList.toggle('visible', window.scrollY > 300); });
  $('#scroll-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
});

function goStep2() {
  const sub = $('#input-subdomain').value.trim();
  if (!sub) { toast('모선 주소를 입력해주세요.', 'error'); return; }
  if (sub === ADMIN_CODE) { enterAdminMode(); return; }
  S.subdomain = sub;
  localStorage.setItem('kv_subdomain', sub);
  $('#gate-step-1').classList.remove('active');
  $('#gate-step-2').classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// 관리자 모드 (간소화)
// ═══════════════════════════════════════════════════════════
function enterAdminMode() {
  $('#gate-page').style.display = 'none';
  const adminPanel = document.createElement('div');
  adminPanel.id = 'admin-panel';
  adminPanel.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h1>🔧 관리자 콘솔</h1>
        <p class="admin-subtitle">Udemy Business Course Explorer — 시스템 관리</p>
        <button class="admin-exit-btn" id="admin-exit">🚪 나가기</button>
      </div>
      <div class="admin-status-cards">
        <div class="admin-card"><div class="admin-card-icon">📡</div><div class="admin-card-title">동기화</div><div class="admin-card-value" id="sync-status-value">확인 중...</div><div class="admin-card-sub" id="sync-status-sub"></div></div>
        <div class="admin-card"><div class="admin-card-icon">📚</div><div class="admin-card-title">총 강의</div><div class="admin-card-value" id="courses-count-value">-</div><div class="admin-card-sub" id="courses-count-sub"></div></div>
        <div class="admin-card"><div class="admin-card-icon">📦</div><div class="admin-card-title">Chunk</div><div class="admin-card-value" id="chunks-count-value">-</div><div class="admin-card-sub">분할 저장 단위</div></div>
        <div class="admin-card"><div class="admin-card-icon">🔑</div><div class="admin-card-title">API</div><div class="admin-card-value" id="api-status-value">확인 중...</div><div class="admin-card-sub" id="api-status-sub"></div></div>
      </div>
      <div class="admin-sections">
        <div class="admin-section"><h3>📡 강의 동기화</h3><div class="admin-btn-group">
          <button class="admin-btn admin-btn-primary" id="btn-sync-continue">▶️ 이어서</button>
          <button class="admin-btn admin-btn-warning" id="btn-sync-reset">🔄 전체 재동기화</button>
          <button class="admin-btn admin-btn-danger" id="btn-sync-auto">🚀 자동 전체</button>
        </div><div class="admin-log" id="sync-log"></div></div>
        <div class="admin-section"><h3>⭐ 큐레이터 PICK</h3><div class="admin-btn-group">
          <button class="admin-btn admin-btn-primary" id="btn-manage-picks">⭐ PICK 설정</button>
          <button class="admin-btn" id="btn-view-picks">📋 현재 보기</button>
        </div><div class="admin-log" id="picks-log"></div></div>
        <div class="admin-section"><h3>🚫 제외 강의 관리</h3><p class="admin-desc">웅진데모 전용 강의 등 제외할 강의 ID를 관리합니다.</p><div class="admin-btn-group">
          <button class="admin-btn admin-btn-warning" id="btn-manage-excluded">🚫 제외 강의 설정</button>
          <button class="admin-btn" id="btn-view-excluded">📋 현재 보기</button>
        </div><div class="admin-log" id="excluded-log"></div></div>
        <div class="admin-section"><h3>🔍 데이터 검증</h3><div class="admin-btn-group">
          <button class="admin-btn" id="btn-verify-data">📊 현황</button>
          <button class="admin-btn" id="btn-verify-sample">📋 샘플</button>
        </div><div class="admin-log" id="verify-log"></div></div>
        <div class="admin-section"><h3>🔑 API 테스트</h3><div class="admin-btn-group">
          <button class="admin-btn" id="btn-test-graphql">🔐 GraphQL</button>
          <button class="admin-btn" id="btn-test-gemini">🤖 Gemini</button>
        </div><div class="admin-log" id="api-log"></div></div>
        <div class="admin-section"><h3>📋 로우 데이터</h3><div class="admin-btn-group" style="align-items:center;">
          <label style="color:var(--text-secondary);font-size:0.85rem;">Chunk:</label>
          <input type="number" id="chunk-number" value="0" min="0" max="50" style="width:60px;padding:0.4rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);text-align:center;" />
          <button class="admin-btn" id="btn-view-chunk">🔍 조회</button>
        </div><div class="admin-log" id="raw-log"></div></div>
      </div>
    </div>
  `;
  document.body.appendChild(adminPanel);
  $('#admin-exit').addEventListener('click', exitAdminMode);
  $('#btn-sync-continue').addEventListener('click', () => runSync(false));
  $('#btn-sync-reset').addEventListener('click', () => { if(confirm('전체 재동기화?')) runSync(true); });
  $('#btn-sync-auto').addEventListener('click', runAutoSync);
  $('#btn-manage-picks').addEventListener('click', manageCuratorPicksAdmin);
  $('#btn-view-picks').addEventListener('click', viewCurrentPicks);
  $('#btn-manage-excluded').addEventListener('click', manageExcludedCourses);
  $('#btn-view-excluded').addEventListener('click', viewExcludedCourses);
  $('#btn-verify-data').addEventListener('click', verifyData);
  $('#btn-verify-sample').addEventListener('click', verifySample);
  $('#btn-test-graphql').addEventListener('click', testGraphQL);
  $('#btn-test-gemini').addEventListener('click', testGemini);
  $('#btn-view-chunk').addEventListener('click', viewChunk);
  loadAdminStatus();
  toast('🔧 관리자 모드에 진입했습니다.');
}

function exitAdminMode() { const p=$('#admin-panel'); if(p) p.remove(); $('#gate-page').style.display=''; $('#input-subdomain').value=''; }

async function loadAdminStatus() {
  try { const r=await fetch(`${WORKER_URL}/status`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); $('#sync-status-value').textContent=d.isComplete?'✅ 완료':d.synced?'⏳ 진행 중':'❌ 미완료'; $('#sync-status-sub').textContent=d.syncedAt?`마지막: ${new Date(d.syncedAt).toLocaleString('ko-KR')}`:'기록 없음'; $('#courses-count-value').textContent=(d.totalCount||0).toLocaleString(); $('#courses-count-sub').textContent=d.isComplete?'완료':'진행 중'; $('#chunks-count-value').textContent=d.totalChunks||0; } catch(e) { $('#sync-status-value').textContent='❌ 연결 실패'; }
  try { const r=await fetch(`${WORKER_URL}/test-token`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); $('#api-status-value').textContent=d.success?'✅ 정상':'❌ 오류'; $('#api-status-sub').textContent=d.success?'GraphQL OK':'실패'; } catch(e) { $('#api-status-value').textContent='❌'; }
}

async function runSync(isReset) { const l=$('#sync-log'); l.innerHTML=`<div class="log-entry log-info">📡 시작...</div>`; try { const r=await fetch(`${WORKER_URL}/sync${isReset?'?reset=true':''}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); l.innerHTML+=`<div class="log-entry ${d.success?'log-success':'log-error'}">${d.success?'✅':'❌'} ${d.message||d.error}</div>`; } catch(e) { l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`; } loadAdminStatus(); }

async function runAutoSync() { const l=$('#sync-log'); const b=$('#btn-sync-auto'); b.disabled=true; b.textContent='⏳...'; l.innerHTML=`<div class="log-entry log-info">🚀 자동 시작...</div>`; let c=1,go=true; while(go) { l.innerHTML+=`<div class="log-entry log-info">📡 [${c}]...</div>`; l.scrollTop=l.scrollHeight; try { const ep=c===1?`${WORKER_URL}/sync?reset=true`:`${WORKER_URL}/sync`; const r=await fetch(ep,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); if(d.error){l.innerHTML+=`<div class="log-entry log-error">❌ ${d.error}</div>`;break;} l.innerHTML+=`<div class="log-entry log-success">✅ ${d.message}</div>`; if(d.stoppedByTimeout){await new Promise(r=>setTimeout(r,2000));c++;}else{l.innerHTML+=`<div class="log-entry log-success">🎉 완료! ${d.totalCount}개</div>`;go=false;} } catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;break;} l.scrollTop=l.scrollHeight; } b.disabled=false; b.textContent='🚀 자동 전체'; loadAdminStatus(); }

function manageCuratorPicksAdmin() { const c=localStorage.getItem('curator_picks'); const ids=c?JSON.parse(c):['8324','1717020','2360128']; const n=prompt('큐레이터 PICK 강의 ID (쉼표 구분):',ids.join(',')); if(n!==null){const i=n.split(',').map(x=>x.trim()).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(i));const l=$('#picks-log');if(l)l.innerHTML=`<div class="log-entry log-success">⭐ ${i.length}개 업데이트</div>`;toast(`⭐ ${i.length}개 업데이트`);} }
function viewCurrentPicks() { const c=localStorage.getItem('curator_picks'); const ids=c?JSON.parse(c):['8324','1717020','2360128']; const l=$('#picks-log'); if(l)l.innerHTML=`<div class="log-entry log-info">${ids.map((id,i)=>`${i+1}. ID: ${id}`).join('<br>')}</div>`; }

// ★ 제외 강의 관리
function manageExcludedCourses() { const c=localStorage.getItem('excluded_courses'); const ids=c?JSON.parse(c):[]; const n=prompt('제외할 강의 ID (쉼표 구분):\n\n웅진데모 전용 강의 등',ids.join(',')); if(n!==null){const i=n.split(',').map(x=>x.trim()).filter(Boolean);localStorage.setItem('excluded_courses',JSON.stringify(i));const l=$('#excluded-log');if(l)l.innerHTML=`<div class="log-entry log-success">🚫 ${i.length}개 제외 설정</div>`;toast(`🚫 ${i.length}개 강의가 제외 목록에 추가`);} }
function viewExcludedCourses() { const c=localStorage.getItem('excluded_courses'); const ids=c?JSON.parse(c):[]; const l=$('#excluded-log'); if(l)l.innerHTML=`<div class="log-entry log-info">🚫 제외 강의: ${ids.length}개<br>${ids.length>0?ids.join(', '):'없음'}</div>`; }

async function verifyData() { const l=$('#verify-log'); l.innerHTML=`<div class="log-entry log-info">🔍 검증...</div>`; let ch=0,t=0,s=0,k=0,d=0,r=0,e=0; while(true){try{const res=await fetch(`${WORKER_URL}/get-courses?chunk=${ch}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});if(!res.ok)break;const data=await res.json();if(!data||!Array.isArray(data)||data.length===0)break;t+=data.length;s+=data.filter(c=>c.subtitles&&c.subtitles!=='없음'&&c.subtitles!=='').length;k+=data.filter(c=>c.subtitles&&c.subtitles.toLowerCase().includes('ko')).length;d+=data.filter(c=>c.contentLength&&typeof c.contentLength==='number'&&c.contentLength>0).length;r+=data.filter(c=>c.rating&&c.rating>0).length;e+=data.filter(c=>c.enrollments&&c.enrollments>0).length;ch++;}catch(err){break;}} const p=(n)=>t>0?`${(n/t*100).toFixed(1)}%`:'0%'; l.innerHTML+=`<div class="log-entry log-success">📚 총: ${t.toLocaleString()} (${ch} chunks)<br>💬 자막: ${s.toLocaleString()} (${p(s)})<br>🇰🇷 한국어: ${k.toLocaleString()} (${p(k)})<br>⏱️ 시간: ${d.toLocaleString()} (${p(d)})<br>⭐ 평점: ${r.toLocaleString()} (${p(r)})<br>👥 수강: ${e.toLocaleString()} (${p(e)})</div>`; }

async function verifySample() { const l=$('#verify-log'); l.innerHTML=`<div class="log-entry log-info">📋 로드...</div>`; try{const r=await fetch(`${WORKER_URL}/get-courses?chunk=0`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});const d=await r.json();if(!d||d.length===0){l.innerHTML+=`<div class="log-entry log-error">❌ 없음</div>`;return;}const s=d[0];l.innerHTML+=`<div class="log-entry"><strong>필드:</strong> ${Object.keys(s).join(', ')}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

async function testGraphQL() { const l=$('#api-log'); l.innerHTML=`<div class="log-entry log-info">🔐 테스트...</div>`; try{const r=await fetch(`${WORKER_URL}/test-token`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});const d=await r.json();l.innerHTML+=`<div class="log-entry ${d.success?'log-success':'log-error'}">${d.success?'✅ 성공':'❌ '+d.error}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

async function testGemini() { const l=$('#api-log'); l.innerHTML=`<div class="log-entry log-info">🤖 테스트...</div>`; try{const r=await fetch('/api/ai-expand',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'python'})});const d=await r.json();l.innerHTML+=`<div class="log-entry ${d.success?'log-success':'log-error'}">${d.success?'✅ 성공':'❌ '+(d.error||'실패')}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

async function viewChunk() { const l=$('#raw-log'); const n=$('#chunk-number').value||'0'; l.innerHTML=`<div class="log-entry log-info">📋 Chunk ${n}...</div>`; try{const r=await fetch(`${WORKER_URL}/get-courses?chunk=${n}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});if(!r.ok){l.innerHTML+=`<div class="log-entry log-error">❌ 없음</div>`;return;}const d=await r.json();l.innerHTML+=`<div class="log-entry log-success"><strong>📦 ${d.length}개</strong><br>${d.slice(0,3).map((c,i)=>`${i+1}. ${c.title?.substring(0,40)}`).join('<br>')}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

// ═══════════════════════════════════════════════════════════
// 일반 모드 — 병렬 chunk 로딩
// ═══════════════════════════════════════════════════════════
async function launch() {
  S.selectedFamilies = [...$$('.gate-job-card.selected')].map(c => c.dataset.family);
  const warp = $('#warp-overlay');
  warp.classList.add('active');
  const loadingPromise = playLaunchSequence();

  let dataLoaded = false;
  try {
    let totalChunks = 0;
    try { const r=await fetch(`${WORKER_URL}/status`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const s=await r.json(); totalChunks=s.totalChunks||0; } catch(e) {}

    let allCourses = [];
    if (totalChunks > 0) {
      const m=$('#launch-message'); if(m) m.textContent=`병렬 로딩 중... (${totalChunks} chunks)`;
      const promises=[]; for(let i=0;i<totalChunks;i++){promises.push(fetch(`${WORKER_URL}/get-courses?chunk=${i}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}).then(r=>r.ok?r.json():[]).catch(()=>[]));} 
      const results=await Promise.all(promises);
      results.forEach(d=>{if(Array.isArray(d)&&d.length>0) allCourses=allCourses.concat(d);});
      if(m) m.textContent=`${allCourses.length.toLocaleString()}개 로드 완료!`;
    } else {
      let ci=0; while(true){try{const r=await fetch(`${WORKER_URL}/get-courses?chunk=${ci}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});if(!r.ok)break;const d=await r.json();if(!d||!Array.isArray(d)||d.length===0)break;allCourses=allCourses.concat(d);ci++;if(ci>=50)break;}catch(e){break;}}
    }

    // ★ 제외 강의 필터링
    const excluded = getExcludedCourses();
    if (excluded.length > 0) {
      allCourses = allCourses.filter(c => !excluded.includes(c.id));
    }

    if (allCourses.length > 0) { S.courses = processCourses(allCourses); dataLoaded = true; }
  } catch (e) { console.error(e); }

  await loadingPromise;
  if (!dataLoaded) { toast('강의 데이터를 불러올 수 없습니다.', 'error'); warp.classList.remove('active'); return; }

  $('#launch-emoji').textContent = '🌟';
  $('#launch-message').textContent = '워프 점프!';
  $('#progress-fill').style.width = '100%';
  await new Promise(r => setTimeout(r, 600));

  warp.classList.remove('active');
  $('#gate-page').style.display = 'none';
  $('#app-container').style.display = 'block';
  initApp();
  toast(`🌌 ${S.subdomain} 우주에 도착! ${S.courses.length.toLocaleString()}개의 별`);
}

async function playLaunchSequence() {
  for (let i = 0; i < LAUNCH_STEPS.length; i++) {
    const step = LAUNCH_STEPS[i];
    $('#launch-emoji').textContent = step.emoji;
    $('#launch-message').textContent = step.message;
    $('#progress-fill').style.width = `${((i+1)/(LAUNCH_STEPS.length+1))*100}%`;
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
  }
}

// ═══════════════════════════════════════════════════════════
// 앱 초기화
// ═══════════════════════════════════════════════════════════
function initApp() {
  $('#welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? `${S.selectedFamilies.map(f=>CURATION[f]?.emoji||'').join('')} 탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`
    : `탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`;

  renderDashCards();
  initMultiSelects();
  if (typeof initHighlight === 'function') { initHighlight(); setupHoverPause(); }

  // ★ 고정 헤더 탭 이벤트
  $$('.header-nav-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.header-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchTab(btn.dataset.tab);
  }));

  let debounce;
  $('#search-input')?.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(applyFilters, 300); });

  $$('.scan-mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => { $$('.scan-mode-btn[data-mode]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); S.searchMode=btn.dataset.mode; applyFilters(); });
  });

  $$('.sensitivity-btn').forEach(btn => {
    btn.addEventListener('click', () => { $$('.sensitivity-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); S.sensitivity=btn.dataset.sensitivity; applyFilters(); toast(`🎚️ 감도: ${SENSITIVITY_CONFIG[S.sensitivity]?.label}`); });
  });

  $('#btn-ai-scan')?.addEventListener('click', handleAIScan);
  $('#btn-apply-ai')?.addEventListener('click', applyAIKeywords);
  $('#btn-ai-select-all')?.addEventListener('click', () => $$('#ai-panel-results .ai-kw-tag').forEach(t=>t.classList.add('selected')));
  $('#btn-ai-close')?.addEventListener('click', () => $('#ai-panel').classList.remove('open'));

  // ★ 상세 필터 토글 (검색창 옆 버튼)
  $('#btn-filter-toggle')?.addEventListener('click', () => {
    const grid = $('#filters-grid');
    const btn = $('#btn-filter-toggle');
    grid.classList.toggle('open');
    btn.classList.toggle('active');
  });

  $('#sort-select')?.addEventListener('change', applyFilters);
  $('#rows-select')?.addEventListener('change', () => { S.rows=parseInt($('#rows-select').value); S.page=1; renderList(); });

  $('#btn-csv')?.addEventListener('click', () => downloadCSV(false));
  $('#btn-share')?.addEventListener('click', shareLink);
  $('#btn-reset-inline')?.addEventListener('click', () => resetAll(true));

  $$('.view-btn').forEach(btn => btn.addEventListener('click', () => { $$('.view-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); S.viewMode=btn.dataset.view; renderList(); }));

  $('#check-all')?.addEventListener('change', (e) => { const ids=getPageData().map(c=>c.id); if(e.target.checked) ids.forEach(id=>S.selectedIds.add(id)); else ids.forEach(id=>S.selectedIds.delete(id)); renderList(); updateFAB(); });

  $('#fab-csv')?.addEventListener('click', () => downloadCSV(true));
  $('#fab-link')?.addEventListener('click', () => { const links=[...S.selectedIds].map(id=>{const c=S.courses.find(x=>x.id===id);return c?buildCourseUrl(c):'';}).filter(Boolean); navigator.clipboard.writeText(links.join('\n')); toast(`🔗 ${links.length}개 복사`); });
  $('#fab-clear')?.addEventListener('click', () => { S.selectedIds.clear(); renderList(); updateFAB(); });

  $('#side-panel-overlay')?.addEventListener('click', (e) => { if(e.target===$('#side-panel-overlay')) closeSidePanel(); });
  $('#sp-close')?.addEventListener('click', closeSidePanel);

  window.addEventListener('click', e => { if(!e.target.closest('.ms-wrap')) $$('.ms-panel').forEach(p=>p.classList.remove('open')); });

  if (typeof initMissionCenter === 'function') initMissionCenter();
  if (typeof initStars === 'function') initStars();
  applyURLParams();
  applyFilters();

  // 큐레이터 PICK (로고 3번 클릭)
  let clickCount = 0;
  const title = $('.header-title');
  if (title) { title.addEventListener('click', () => { clickCount++; setTimeout(()=>{clickCount=0;},1000); if(clickCount===3){if(typeof manageCuratorPicks==='function')manageCuratorPicks();clickCount=0;} }); }

  // 도움말
  $('#btn-help')?.addEventListener('click', () => { $('#help-overlay')?.classList.add('active'); });
  $('#help-close')?.addEventListener('click', () => { $('#help-overlay')?.classList.remove('active'); });
  $('#help-overlay')?.addEventListener('click', (e) => { if(e.target===$('#help-overlay')) $('#help-overlay').classList.remove('active'); });

  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if(e.key==='/'&&!e.target.matches('input,textarea,select')){e.preventDefault();$('#search-input')?.focus();}
    if(e.key==='Escape'){closeSidePanel();$('#help-overlay')?.classList.remove('active');$('#ai-panel')?.classList.remove('open');}
    if(!e.target.matches('input,textarea,select')){
      if(e.key==='ArrowLeft'&&S.page>1){S.page--;renderList();}
      if(e.key==='ArrowRight'){const tp=Math.ceil(S.filtered.length/S.rows);if(S.page<tp){S.page++;renderList();}}
    }
  });
}

function switchTab(tabId) {
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $(`#panel-${tabId}`)?.classList.add('active');
  $('#list-section').style.display = tabId === 'stars' ? 'none' : '';
}
