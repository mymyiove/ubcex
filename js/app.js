// ═══════════════════════════════════════════════════════════
// app.js — 게이트 직무 반영 + 검색 버튼 + 헤더 클릭
// ═══════════════════════════════════════════════════════════

const ADMIN_CODE = 'jhj11';
const WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
const WORKER_SECRET = 'gogo1014';

document.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('kv_subdomain');
  if (saved && saved !== ADMIN_CODE) {
    $('#input-subdomain').value = saved;
    $('#gate-history').innerHTML = '💡 이전 모선: <a id="quick-launch">' + saved + '</a>';
    setTimeout(function() {
      var ql = $('#quick-launch');
      if (ql) ql.addEventListener('click', function() { $('#input-subdomain').value = saved; goStep2(); });
    }, 0);
  }

  $('#input-subdomain').addEventListener('input', function() {
    var v = $('#input-subdomain').value.trim();
    if (v === ADMIN_CODE) {
      $('#subdomain-preview').textContent = '🔧 관리자 모드로 진입합니다';
      $('#subdomain-preview').style.color = 'var(--warning)';
    } else {
      $('#subdomain-preview').textContent = v ? '✅ ' + v + '.udemy.com 연결 확인' : '';
      $('#subdomain-preview').style.color = 'var(--success)';
    }
  });

  $('#btn-step1-next').addEventListener('click', goStep2);
  $('#input-subdomain').addEventListener('keyup', function(e) { if (e.key === 'Enter') goStep2(); });

  var grid = $('#gate-job-grid');
  Object.entries(CURATION).forEach(function(entry) {
    var id = entry[0], data = entry[1];
    var card = document.createElement('div');
    card.className = 'gate-job-card';
    card.dataset.family = id;
    card.innerHTML = '<span class="emoji">' + data.emoji + '</span><span class="label">' + data.name + '</span>';
    card.addEventListener('click', function() { card.classList.toggle('selected'); });
    grid.appendChild(card);
  });

  $('#btn-launch').addEventListener('click', launch);
  $('#btn-skip').addEventListener('click', launch);

  window.addEventListener('scroll', function() {
    var btn = $('#scroll-to-top');
    if (btn) btn.classList.toggle('visible', window.scrollY > 300);
  });
  var scrollBtn = $('#scroll-to-top');
  if (scrollBtn) scrollBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
});

function goStep2() {
  var sub = $('#input-subdomain').value.trim();
  if (!sub) { toast('모선 주소를 입력해주세요.', 'error'); return; }
  if (sub === ADMIN_CODE) { enterAdminMode(); return; }
  S.subdomain = sub;
  localStorage.setItem('kv_subdomain', sub);
  $('#gate-step-1').classList.remove('active');
  $('#gate-step-2').classList.add('active');
}

// ═══ 관리자 모드 ═══
function enterAdminMode() {
  $('#gate-page').style.display = 'none';
  var ap = document.createElement('div');
  ap.id = 'admin-panel';
  ap.innerHTML = '<div class="admin-container"><div class="admin-header"><h1>🔧 관리자 콘솔</h1><p class="admin-subtitle">Udemy Business Course Explorer — 시스템 관리</p><button class="admin-exit-btn" id="admin-exit">🚪 나가기</button></div><div class="admin-status-cards"><div class="admin-card"><div class="admin-card-icon">📡</div><div class="admin-card-title">동기화</div><div class="admin-card-value" id="sync-status-value">확인 중...</div><div class="admin-card-sub" id="sync-status-sub"></div></div><div class="admin-card"><div class="admin-card-icon">📚</div><div class="admin-card-title">총 강의</div><div class="admin-card-value" id="courses-count-value">-</div><div class="admin-card-sub" id="courses-count-sub"></div></div><div class="admin-card"><div class="admin-card-icon">📦</div><div class="admin-card-title">Chunk</div><div class="admin-card-value" id="chunks-count-value">-</div><div class="admin-card-sub">분할 저장</div></div><div class="admin-card"><div class="admin-card-icon">🔑</div><div class="admin-card-title">API</div><div class="admin-card-value" id="api-status-value">확인 중...</div><div class="admin-card-sub" id="api-status-sub"></div></div></div><div class="admin-sections"><div class="admin-section"><h3>📡 강의 동기화</h3><div class="admin-btn-group"><button class="admin-btn admin-btn-primary" id="btn-sync-continue">▶️ 이어서</button><button class="admin-btn admin-btn-warning" id="btn-sync-reset">🔄 전체 재동기화</button><button class="admin-btn admin-btn-danger" id="btn-sync-auto">🚀 자동 전체</button></div><div class="admin-log" id="sync-log"></div></div><div class="admin-section"><h3>⭐ 항해사 PICK</h3><div class="admin-btn-group"><button class="admin-btn admin-btn-primary" id="btn-manage-picks">⭐ PICK 설정</button><button class="admin-btn" id="btn-view-picks">📋 현재 보기</button></div><div class="admin-log" id="picks-log"></div></div><div class="admin-section"><h3>🚫 제외 강의 관리</h3><p class="admin-desc">웅진데모 전용 강의 등 제외할 강의 ID를 관리합니다.</p><div class="admin-btn-group"><button class="admin-btn admin-btn-warning" id="btn-manage-excluded">🚫 제외 강의 설정</button><button class="admin-btn" id="btn-view-excluded">📋 현재 보기</button></div><div class="admin-log" id="excluded-log"></div></div><div class="admin-section"><h3>🔍 데이터 검증</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-verify-data">📊 현황</button><button class="admin-btn" id="btn-verify-sample">📋 샘플</button></div><div class="admin-log" id="verify-log"></div></div><div class="admin-section"><h3>🔑 API 테스트</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-test-graphql">🔐 GraphQL</button><button class="admin-btn" id="btn-test-gemini">🤖 Gemini</button></div><div class="admin-log" id="api-log"></div></div><div class="admin-section"><h3>📋 로우 데이터</h3><div class="admin-btn-group" style="align-items:center;"><label style="color:var(--text-secondary);font-size:0.85rem;">Chunk:</label><input type="number" id="chunk-number" value="0" min="0" max="50" style="width:60px;padding:0.4rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);text-align:center;" /><button class="admin-btn" id="btn-view-chunk">🔍 조회</button></div><div class="admin-log" id="raw-log"></div></div></div></div>';
  document.body.appendChild(ap);
  $('#admin-exit').addEventListener('click', exitAdminMode);
  $('#btn-sync-continue').addEventListener('click', function() { runSync(false); });
  $('#btn-sync-reset').addEventListener('click', function() { if(confirm('전체 재동기화?')) runSync(true); });
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
function exitAdminMode() { var p=$('#admin-panel'); if(p) p.remove(); $('#gate-page').style.display=''; $('#input-subdomain').value=''; }
async function loadAdminStatus() { try { var r=await fetch(WORKER_URL+'/status',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d=await r.json(); $('#sync-status-value').textContent=d.isComplete?'✅ 완료':d.synced?'⏳ 진행 중':'❌ 미완료'; $('#sync-status-sub').textContent=d.syncedAt?'마지막: '+new Date(d.syncedAt).toLocaleString('ko-KR'):'기록 없음'; $('#courses-count-value').textContent=(d.totalCount||0).toLocaleString(); $('#courses-count-sub').textContent=d.isComplete?'완료':'진행 중'; $('#chunks-count-value').textContent=d.totalChunks||0; } catch(e) { $('#sync-status-value').textContent='❌ 연결 실패'; } try { var r2=await fetch(WORKER_URL+'/test-token',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d2=await r2.json(); $('#api-status-value').textContent=d2.success?'✅ 정상':'❌ 오류'; $('#api-status-sub').textContent=d2.success?'GraphQL OK':'실패'; } catch(e) { $('#api-status-value').textContent='❌'; } }
async function runSync(isReset) { var l=$('#sync-log'); l.innerHTML='<div class="log-entry log-info">📡 시작...</div>'; try { var r=await fetch(WORKER_URL+'/sync'+(isReset?'?reset=true':''),{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d=await r.json(); l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅':'❌')+' '+(d.message||d.error)+'</div>'; } catch(e) { l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>'; } loadAdminStatus(); }
async function runAutoSync() { var l=$('#sync-log'); var b=$('#btn-sync-auto'); b.disabled=true; b.textContent='⏳...'; l.innerHTML='<div class="log-entry log-info">🚀 자동 시작...</div>'; var c=1,go=true; while(go) { l.innerHTML+='<div class="log-entry log-info">📡 ['+c+']...</div>'; l.scrollTop=l.scrollHeight; try { var ep=c===1?WORKER_URL+'/sync?reset=true':WORKER_URL+'/sync'; var r=await fetch(ep,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d=await r.json(); if(d.error){l.innerHTML+='<div class="log-entry log-error">❌ '+d.error+'</div>';break;} l.innerHTML+='<div class="log-entry log-success">✅ '+d.message+'</div>'; if(d.stoppedByTimeout){await new Promise(function(r){setTimeout(r,2000)});c++;}else{l.innerHTML+='<div class="log-entry log-success">🎉 완료! '+d.totalCount+'개</div>';go=false;} } catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';break;} l.scrollTop=l.scrollHeight; } b.disabled=false; b.textContent='🚀 자동 전체'; loadAdminStatus(); }
function manageCuratorPicksAdmin() { var c=localStorage.getItem('curator_picks'); var ids=c?JSON.parse(c):['8324','1717020','2360128']; var n=prompt('항해사 PICK 강의 ID (쉼표 구분):',ids.join(',')); if(n!==null){var i=n.split(',').map(function(x){return x.trim();}).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(i));var l=$('#picks-log');if(l)l.innerHTML='<div class="log-entry log-success">⭐ '+i.length+'개 업데이트</div>';toast('⭐ '+i.length+'개 업데이트');} }
function viewCurrentPicks() { var c=localStorage.getItem('curator_picks'); var ids=c?JSON.parse(c):['8324','1717020','2360128']; var l=$('#picks-log'); if(l)l.innerHTML='<div class="log-entry log-info">'+ids.map(function(id,i){return (i+1)+'. ID: '+id;}).join('<br>')+'</div>'; }
function manageExcludedCourses() { var c=localStorage.getItem('excluded_courses'); var ids=c?JSON.parse(c):[]; var n=prompt('제외할 강의 ID (쉼표 구분):',ids.join(',')); if(n!==null){var i=n.split(',').map(function(x){return x.trim();}).filter(Boolean);localStorage.setItem('excluded_courses',JSON.stringify(i));var l=$('#excluded-log');if(l)l.innerHTML='<div class="log-entry log-success">🚫 '+i.length+'개 제외 설정</div>';toast('🚫 '+i.length+'개 제외');} }
function viewExcludedCourses() { var c=localStorage.getItem('excluded_courses'); var ids=c?JSON.parse(c):[]; var l=$('#excluded-log'); if(l)l.innerHTML='<div class="log-entry log-info">🚫 제외: '+ids.length+'개<br>'+(ids.length>0?ids.join(', '):'없음')+'</div>'; }
async function verifyData() { var l=$('#verify-log'); l.innerHTML='<div class="log-entry log-info">🔍 검증...</div>'; var ch=0,t=0,s=0,k=0,d=0,r=0,e=0; while(true){try{var res=await fetch(WORKER_URL+'/get-courses?chunk='+ch,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!res.ok)break;var data=await res.json();if(!data||!Array.isArray(data)||data.length===0)break;t+=data.length;s+=data.filter(function(c){return c.subtitles&&c.subtitles!=='없음'&&c.subtitles!=='';}).length;k+=data.filter(function(c){return c.subtitles&&c.subtitles.toLowerCase().includes('ko');}).length;d+=data.filter(function(c){return c.contentLength&&typeof c.contentLength==='number'&&c.contentLength>0;}).length;r+=data.filter(function(c){return c.rating&&c.rating>0;}).length;e+=data.filter(function(c){return c.enrollments&&c.enrollments>0;}).length;ch++;}catch(err){break;}} var p=function(n){return t>0?(n/t*100).toFixed(1)+'%':'0%';}; l.innerHTML+='<div class="log-entry log-success">📚 총: '+t.toLocaleString()+' ('+ch+' chunks)<br>💬 자막: '+s.toLocaleString()+' ('+p(s)+')<br>🇰🇷 한국어: '+k.toLocaleString()+' ('+p(k)+')<br>⏱️ 시간: '+d.toLocaleString()+' ('+p(d)+')<br>⭐ 평점: '+r.toLocaleString()+' ('+p(r)+')<br>👥 수강: '+e.toLocaleString()+' ('+p(e)+')</div>'; }
async function verifySample() { var l=$('#verify-log'); l.innerHTML='<div class="log-entry log-info">📋 로드...</div>'; try{var r=await fetch(WORKER_URL+'/get-courses?chunk=0',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();if(!d||d.length===0){l.innerHTML+='<div class="log-entry log-error">❌ 없음</div>';return;}l.innerHTML+='<div class="log-entry"><strong>필드:</strong> '+Object.keys(d[0]).join(', ')+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }
async function testGraphQL() { var l=$('#api-log'); l.innerHTML='<div class="log-entry log-info">🔐 테스트...</div>'; try{var r=await fetch(WORKER_URL+'/test-token',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅ 성공':'❌ '+d.error)+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }
async function testGemini() { var l=$('#api-log'); l.innerHTML='<div class="log-entry log-info">🤖 테스트...</div>'; try{var r=await fetch('/api/ai-expand',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'python'})});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅ 성공':'❌ '+(d.error||'실패'))+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }
async function viewChunk() { var l=$('#raw-log'); var n=$('#chunk-number').value||'0'; l.innerHTML='<div class="log-entry log-info">📋 Chunk '+n+'...</div>'; try{var r=await fetch(WORKER_URL+'/get-courses?chunk='+n,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!r.ok){l.innerHTML+='<div class="log-entry log-error">❌ 없음</div>';return;}var d=await r.json();l.innerHTML+='<div class="log-entry log-success"><strong>📦 '+d.length+'개</strong><br>'+d.slice(0,3).map(function(c,i){return (i+1)+'. '+((c.title||'').substring(0,40));}).join('<br>')+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }

// ═══ 일반 모드 — 병렬 chunk 로딩 ═══
async function launch() {
  S.selectedFamilies = [];
  document.querySelectorAll('.gate-job-card.selected').forEach(function(c) {
    S.selectedFamilies.push(c.dataset.family);
  });
  var warp = $('#warp-overlay');
  warp.classList.add('active');
  var loadingPromise = playLaunchSequence();
  var dataLoaded = false;
  try {
    var totalChunks = 0;
    try { var r=await fetch(WORKER_URL+'/status',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var s=await r.json(); totalChunks=s.totalChunks||0; } catch(e) {}
    var allCourses = [];
    if (totalChunks > 0) {
      var m=$('#launch-message'); if(m) m.textContent='병렬 로딩 중... ('+totalChunks+' chunks)';
      var promises=[]; for(var i=0;i<totalChunks;i++){(function(idx){promises.push(fetch(WORKER_URL+'/get-courses?chunk='+idx,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}).then(function(r){return r.ok?r.json():[];}).catch(function(){return [];}));})(i);}
      var results=await Promise.all(promises);
      results.forEach(function(d){if(Array.isArray(d)&&d.length>0) allCourses=allCourses.concat(d);});
      if(m) m.textContent=allCourses.length.toLocaleString()+'개 로드 완료!';
    } else {
      var ci=0; while(true){try{var r2=await fetch(WORKER_URL+'/get-courses?chunk='+ci,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!r2.ok)break;var d2=await r2.json();if(!d2||!Array.isArray(d2)||d2.length===0)break;allCourses=allCourses.concat(d2);ci++;if(ci>=50)break;}catch(e){break;}}
    }
    var excluded = getExcludedCourses();
    if (excluded.length > 0) allCourses = allCourses.filter(function(c) { return !excluded.includes(c.id); });
    if (allCourses.length > 0) { S.courses = processCourses(allCourses); dataLoaded = true; }
  } catch (e) { console.error(e); }
  await loadingPromise;
  if (!dataLoaded) { toast('강의 데이터를 불러올 수 없습니다.', 'error'); warp.classList.remove('active'); return; }
  $('#launch-emoji').textContent = '🌟';
  $('#launch-message').textContent = '워프 점프!';
  $('#progress-fill').style.width = '100%';
  await new Promise(function(r) { setTimeout(r, 600); });
  warp.classList.remove('active');
  $('#gate-page').style.display = 'none';
  $('#app-container').style.display = 'block';
  initApp();
  toast('🌌 ' + S.subdomain + ' 우주에 도착! ' + S.courses.length.toLocaleString() + '개의 별');
}

async function playLaunchSequence() {
  for (var i = 0; i < LAUNCH_STEPS.length; i++) {
    var step = LAUNCH_STEPS[i];
    $('#launch-emoji').textContent = step.emoji;
    $('#launch-message').textContent = step.message;
    $('#progress-fill').style.width = ((i+1)/(LAUNCH_STEPS.length+1)*100)+'%';
    await new Promise(function(r) { setTimeout(r, 600 + Math.random() * 400); });
  }
}

// ═══ 앱 초기화 ═══
function initApp() {
  // 환영 메시지
  var jobNames = S.selectedFamilies.map(function(f) { return CURATION[f] ? CURATION[f].emoji : ''; }).join('');
  $('#welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? jobNames + ' 탐험가님, <strong>' + S.subdomain + '</strong> 우주에 도착했습니다!'
    : '탐험가님, <strong>' + S.subdomain + '</strong> 우주에 도착했습니다!';

  renderDashCards();
  initMultiSelects();
  if (typeof initHighlight === 'function') { initHighlight(); setupHoverPause(); }

  // ★ #1: 게이트 직무 선택 → 미션센터 은하 자동 선택
  if (S.selectedFamilies.length > 0 && typeof initMissionCenter === 'function') {
    initMissionCenter();
    // 첫 번째 선택된 직무로 은하 자동 선택
    setTimeout(function() {
      var firstFamily = S.selectedFamilies[0];
      var galaxyCard = document.querySelector('.galaxy-card[data-galaxy="' + firstFamily + '"]');
      if (galaxyCard) {
        galaxyCard.click();
      }
    }, 500);
  } else {
    if (typeof initMissionCenter === 'function') initMissionCenter();
  }

  if (typeof initStars === 'function') initStars();

  // 고정 헤더 탭
  $$('.header-nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      $$('.header-nav-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      switchTab(btn.dataset.tab);
    });
  });

  // 스마트 검색 제안
  var debounceTimer, suggestionTimer;
  $('#search-input').addEventListener('input', function() {
    clearTimeout(debounceTimer);
    clearTimeout(suggestionTimer);
    debounceTimer = setTimeout(applyFilters, 300);
    suggestionTimer = setTimeout(function() { showSearchSuggestions($('#search-input').value.trim()); }, 200);
  });
  $('#search-input').addEventListener('focus', function() {
    var v = $('#search-input').value.trim();
    if (v.length >= 2) showSearchSuggestions(v);
  });
  // ★ Enter 키로도 검색
  $('#search-input').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') { $('#search-suggestions').classList.remove('open'); applyFilters(); }
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.scanner-input-wrap')) {
      var sg = $('#search-suggestions');
      if (sg) sg.classList.remove('open');
    }
  });

  // 검색 모드
  $$('.scan-mode-btn[data-mode]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      $$('.scan-mode-btn[data-mode]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      S.searchMode = btn.dataset.mode;
      applyFilters();
    });
  });

  // 감도
  $$('.sensitivity-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      $$('.sensitivity-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      S.sensitivity = btn.dataset.sensitivity;
      applyFilters();
      toast('🎚️ 감도: ' + (SENSITIVITY_CONFIG[S.sensitivity] ? SENSITIVITY_CONFIG[S.sensitivity].label : ''));
    });
  });

  // AI 스캔
  $('#btn-ai-scan').addEventListener('click', handleAIScan);
  $('#btn-apply-ai').addEventListener('click', applyAIKeywords);
  $('#btn-ai-select-all').addEventListener('click', function() {
    document.querySelectorAll('#ai-panel-results .ai-kw-tag').forEach(function(t) { t.classList.add('selected'); });
  });
  $('#btn-ai-close').addEventListener('click', function() { $('#ai-panel').classList.remove('open'); });

  // ★ #3: 일반 검색 버튼
  var searchBtn = $('#btn-search');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      var sg = $('#search-suggestions');
      if (sg) sg.classList.remove('open');
      applyFilters();
      toast('🔍 검색 완료!');
    });
  }

  // 필터 토글
  $('#btn-filter-toggle').addEventListener('click', function() {
    $('#filters-grid').classList.toggle('open');
    $('#btn-filter-toggle').classList.toggle('active');
  });

  // 정렬, 표시
  $('#sort-select').addEventListener('change', applyFilters);
  $('#rows-select').addEventListener('change', function() { S.rows = parseInt($('#rows-select').value); S.page = 1; renderList(); });

  // CSV, 공유, 리셋
  $('#btn-csv').addEventListener('click', function() { downloadCSV(false); });
  $('#btn-share').addEventListener('click', shareLink);
  $('#btn-reset-inline').addEventListener('click', function() { resetAll(true); });

  // 뷰 모드
  $$('.view-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      $$('.view-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      S.viewMode = btn.dataset.view;
      renderList();
    });
  });

  // 전체 선택
  $('#check-all').addEventListener('change', function(e) {
    var ids = getPageData().map(function(c) { return c.id; });
    if (e.target.checked) ids.forEach(function(id) { S.selectedIds.add(id); });
    else ids.forEach(function(id) { S.selectedIds.delete(id); });
    renderList();
    updateFAB();
  });

  // FAB
  $('#fab-csv').addEventListener('click', function() { downloadCSV(true); });
  $('#fab-link').addEventListener('click', function() {
    var links = [];
    S.selectedIds.forEach(function(id) { var c = S.courses.find(function(x) { return x.id === id; }); if (c) links.push(buildCourseUrl(c)); });
    navigator.clipboard.writeText(links.join('\n'));
    toast('🔗 ' + links.length + '개 복사');
  });
  $('#fab-clear').addEventListener('click', function() { S.selectedIds.clear(); renderList(); updateFAB(); });

  // 사이드 패널
  $('#side-panel-overlay').addEventListener('click', function(e) { if (e.target === $('#side-panel-overlay')) closeSidePanel(); });
  $('#sp-close').addEventListener('click', closeSidePanel);

  // 멀티셀렉트 외부 클릭
  window.addEventListener('click', function(e) {
    if (!e.target.closest('.ms-wrap')) {
      document.querySelectorAll('.ms-panel').forEach(function(p) { p.classList.remove('open'); });
    }
  });

  // URL 파라미터
  applyURLParams();

  // 첫 필터링
  applyFilters();

  // ★ 헤더 제목 클릭 → 맨위로 + 3번 클릭 항해사 PICK
  var clickCount = 0;
  var title = $('#header-title');
  if (title) {
    title.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      clickCount++;
      setTimeout(function() { clickCount = 0; }, 1000);
      if (clickCount === 3) { if (typeof manageCuratorPicks === 'function') manageCuratorPicks(); clickCount = 0; }
    });
  }

  // 도움말
  var helpBtn = $('#btn-help');
  if (helpBtn) helpBtn.addEventListener('click', function() { $('#help-overlay').classList.add('active'); });
  var helpClose = $('#help-close');
  if (helpClose) helpClose.addEventListener('click', function() { $('#help-overlay').classList.remove('active'); });
  $('#help-overlay').addEventListener('click', function(e) { if (e.target === $('#help-overlay')) $('#help-overlay').classList.remove('active'); });

  // 키보드 단축키
  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && !e.target.matches('input,textarea,select')) { e.preventDefault(); $('#search-input').focus(); }
    if (e.key === 'Escape') { closeSidePanel(); $('#help-overlay').classList.remove('active'); $('#ai-panel').classList.remove('open'); var sg=$('#search-suggestions'); if(sg) sg.classList.remove('open'); }
    if (!e.target.matches('input,textarea,select')) {
      if (e.key === 'ArrowLeft' && S.page > 1) { S.page--; renderList(); }
      if (e.key === 'ArrowRight') { var tp = Math.ceil(S.filtered.length / S.rows); if (S.page < tp) { S.page++; renderList(); } }
    }
  });
}

function switchTab(tabId) {
  $$('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = $('#panel-' + tabId);
  if (panel) panel.classList.add('active');
  var listSection = $('#list-section');
  if (listSection) listSection.style.display = tabId === 'stars' ? 'none' : '';
}

// ═══ 스마트 검색 제안 ═══
function showSearchSuggestions(query) {
  var container = $('#search-suggestions');
  if (!container) return;
  if (query.length < 2) { container.classList.remove('open'); return; }
  var ql = query.toLowerCase();
  var titleMatches = S.courses.filter(function(c) { return c.title && c.title.toLowerCase().includes(ql); }).sort(function(a,b) { return (b.enrollments||0)-(a.enrollments||0); }).slice(0,3);
  var catMatches = [...new Set(S.courses.filter(function(c) { return c.category && c.category.toLowerCase().includes(ql); }).map(function(c) { return c.category ? c.category.split(',')[0].trim() : ''; }))].filter(Boolean).slice(0,2);
  var topicMatches = [...new Set(S.courses.filter(function(c) { return c.topic && c.topic.toLowerCase().includes(ql); }).map(function(c) { return c.topic; }))].filter(Boolean).slice(0,2);
  var koEnSuggestions = [];
  Object.entries(KO_EN_MAP).forEach(function(entry) {
    var ko=entry[0], enList=entry[1];
    if (ko.includes(ql) || enList.some(function(en) { return en.includes(ql); })) koEnSuggestions.push({ko:ko, en:enList[0]});
  });
  var html = '';
  if (titleMatches.length > 0) {
    html += '<div class="suggestion-category">🔥 인기 강의</div>';
    html += titleMatches.map(function(c) { return '<div class="suggestion-item" data-course-id="'+c.id+'"><span class="suggestion-icon">📖</span><span class="suggestion-text">'+(c.title.length>50?c.title.substring(0,50)+'...':c.title)+'</span><span class="suggestion-badge">⭐'+(c.rating?c.rating.toFixed(1):'-')+'</span></div>'; }).join('');
  }
  if (catMatches.length > 0) {
    html += '<div class="suggestion-category">🌌 카테고리</div>';
    html += catMatches.map(function(cat) { return '<div class="suggestion-item" data-category="'+cat+'"><span class="suggestion-icon">'+getCatEmoji(cat)+'</span><span class="suggestion-text">'+cat+'</span><span class="suggestion-badge">카테고리 필터</span></div>'; }).join('');
  }
  if (topicMatches.length > 0) {
    html += '<div class="suggestion-category">💡 주제</div>';
    html += topicMatches.map(function(topic) { return '<div class="suggestion-item" data-topic="'+topic+'"><span class="suggestion-icon">🏷️</span><span class="suggestion-text">'+topic+'</span></div>'; }).join('');
  }
  if (koEnSuggestions.length > 0) {
    html += '<div class="suggestion-category">🌐 번역 제안</div>';
    html += koEnSuggestions.slice(0,2).map(function(s) { return '<div class="suggestion-item" data-keyword="'+s.en+'"><span class="suggestion-icon">🔄</span><span class="suggestion-text">'+s.ko+' → '+s.en+'</span></div>'; }).join('');
  }
  if (!html) { container.classList.remove('open'); return; }
  container.innerHTML = html;
  container.classList.add('open');
  container.querySelectorAll('.suggestion-item').forEach(function(item) {
    item.addEventListener('click', function() {
      if (item.dataset.courseId) { var c=S.courses.find(function(x){return x.id===item.dataset.courseId;}); if(c) openSidePanel(c); }
      else if (item.dataset.category) { setMSValues('f-category',[item.dataset.category]); applyFilters(); }
      else if (item.dataset.topic) { $('#search-input').value=item.dataset.topic; applyFilters(); }
      else if (item.dataset.keyword) { var cur=$('#search-input').value.trim(); $('#search-input').value=cur?cur+', '+item.dataset.keyword:item.dataset.keyword; applyFilters(); }
      container.classList.remove('open');
    });
  });
}
