// ═══════════════════════════════════════════════════════════
// app.js — 메인 앱 (직무 클릭 즉시 출발 + 기본 검색 적용)
// ═══════════════════════════════════════════════════════════

var ADMIN_CODE = 'jhj11';
var WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
var WORKER_SECRET = 'gogo1014';

document.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('kv_subdomain');
  if (saved && saved !== ADMIN_CODE) {
    document.getElementById('input-subdomain').value = saved;
    document.getElementById('gate-history').innerHTML = '💡 이전 모선: <a id="quick-launch">' + saved + '</a>';
    setTimeout(function() {
      var ql = document.getElementById('quick-launch');
      if (ql) ql.addEventListener('click', function() { document.getElementById('input-subdomain').value = saved; goStep2(); });
    }, 0);
  }

  document.getElementById('input-subdomain').addEventListener('input', function() {
    var v = document.getElementById('input-subdomain').value.trim();
    var preview = document.getElementById('subdomain-preview');
    if (v === ADMIN_CODE) {
      preview.textContent = '🔧 관리자 모드로 진입합니다';
      preview.style.color = 'var(--warning)';
    } else {
      preview.textContent = v ? '✅ ' + v + '.udemy.com 연결 확인' : '';
      preview.style.color = 'var(--success)';
    }
  });

  document.getElementById('btn-step1-next').addEventListener('click', goStep2);
  document.getElementById('input-subdomain').addEventListener('keyup', function(e) { if (e.key === 'Enter') goStep2(); });

  // ★ 게이트 직무 카드 — 클릭 시 바로 출발
  var grid = document.getElementById('gate-job-grid');
  var curationEntries = Object.entries(CURATION);
  for (var i = 0; i < curationEntries.length; i++) {
    (function(id, data) {
      var card = document.createElement('div');
      card.className = 'gate-job-card';
      card.dataset.family = id;
      card.innerHTML = '<span class="emoji">' + data.emoji + '</span><span class="label">' + data.name + '</span>';
      card.addEventListener('click', function() {
        card.classList.add('selected');
        launch();
      });
      grid.appendChild(card);
    })(curationEntries[i][0], curationEntries[i][1]);
  }

  // ★ "자유롭게 우주 여행 출발!" = 직무 선택 없이 출발
  document.getElementById('btn-launch').addEventListener('click', launch);

  // 스크롤 버튼
  window.addEventListener('scroll', function() {
    var btn = document.getElementById('scroll-to-top');
    if (btn) btn.classList.toggle('visible', window.scrollY > 300);
  });
  var scrollBtn = document.getElementById('scroll-to-top');
  if (scrollBtn) scrollBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
});

function goStep2() {
  var sub = document.getElementById('input-subdomain').value.trim();
  if (!sub) { toast('모선 주소를 입력해주세요.', 'error'); return; }
  if (sub === ADMIN_CODE) { enterAdminMode(); return; }
  S.subdomain = sub;
  localStorage.setItem('kv_subdomain', sub);
  document.getElementById('gate-step-1').classList.remove('active');
  document.getElementById('gate-step-2').classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// 관리자 모드
// ═══════════════════════════════════════════════════════════
function enterAdminMode() {
  document.getElementById('gate-page').style.display = 'none';
  var ap = document.createElement('div');
  ap.id = 'admin-panel';
  ap.innerHTML = '<div class="admin-container">' +
    '<div class="admin-header"><h1>🔧 관리자 콘솔</h1><p class="admin-subtitle">Udemy Business Course Explorer — 시스템 관리</p><button class="admin-exit-btn" id="admin-exit">🚪 나가기</button></div>' +
    '<div class="admin-status-cards">' +
      '<div class="admin-card"><div class="admin-card-icon">📡</div><div class="admin-card-title">동기화</div><div class="admin-card-value" id="sync-status-value">확인 중...</div><div class="admin-card-sub" id="sync-status-sub"></div></div>' +
      '<div class="admin-card"><div class="admin-card-icon">📚</div><div class="admin-card-title">총 강의</div><div class="admin-card-value" id="courses-count-value">-</div><div class="admin-card-sub" id="courses-count-sub"></div></div>' +
      '<div class="admin-card"><div class="admin-card-icon">📦</div><div class="admin-card-title">Chunk</div><div class="admin-card-value" id="chunks-count-value">-</div><div class="admin-card-sub">분할 저장</div></div>' +
      '<div class="admin-card"><div class="admin-card-icon">🔑</div><div class="admin-card-title">API</div><div class="admin-card-value" id="api-status-value">확인 중...</div><div class="admin-card-sub" id="api-status-sub"></div></div>' +
    '</div>' +
    '<div class="admin-sections">' +
      '<div class="admin-section"><h3>📡 강의 동기화</h3><div class="admin-btn-group"><button class="admin-btn admin-btn-primary" id="btn-sync-continue">▶️ 이어서</button><button class="admin-btn admin-btn-warning" id="btn-sync-reset">🔄 전체 재동기화</button><button class="admin-btn admin-btn-danger" id="btn-sync-auto">🚀 자동 전체</button></div><div class="admin-log" id="sync-log"></div></div>' +
      '<div class="admin-section"><h3>⭐ 항해사 PICK</h3><div class="admin-btn-group"><button class="admin-btn admin-btn-primary" id="btn-manage-picks">⭐ PICK 설정</button><button class="admin-btn" id="btn-view-picks">📋 현재 보기</button></div><div class="admin-log" id="picks-log"></div></div>' +
      '<div class="admin-section"><h3>🚫 제외 강의 관리</h3><p class="admin-desc">웅진데모 전용 강의 등 제외할 강의 ID를 관리합니다.</p><div class="admin-btn-group"><button class="admin-btn admin-btn-warning" id="btn-manage-excluded">🚫 제외 강의 설정</button><button class="admin-btn" id="btn-view-excluded">📋 현재 보기</button></div><div class="admin-log" id="excluded-log"></div></div>' +
      '<div class="admin-section"><h3>🔍 데이터 검증</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-verify-data">📊 현황</button><button class="admin-btn" id="btn-verify-sample">📋 샘플</button></div><div class="admin-log" id="verify-log"></div></div>' +
      '<div class="admin-section"><h3>🔑 API 테스트</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-test-graphql">🔐 GraphQL</button><button class="admin-btn" id="btn-test-gemini">🤖 Gemini</button></div><div class="admin-log" id="api-log"></div></div>' +
      '<div class="admin-section"><h3>📋 로우 데이터</h3><div class="admin-btn-group" style="align-items:center;"><label style="color:var(--text-secondary);font-size:0.85rem;">Chunk:</label><input type="number" id="chunk-number" value="0" min="0" max="50" style="width:60px;padding:0.4rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);text-align:center;" /><button class="admin-btn" id="btn-view-chunk">🔍 조회</button></div><div class="admin-log" id="raw-log"></div></div>' +
    '</div></div>';
  document.body.appendChild(ap);

  document.getElementById('admin-exit').addEventListener('click', exitAdminMode);
  document.getElementById('btn-sync-continue').addEventListener('click', function() { runSync(false); });
  document.getElementById('btn-sync-reset').addEventListener('click', function() { if (confirm('전체 재동기화?')) runSync(true); });
  document.getElementById('btn-sync-auto').addEventListener('click', runAutoSync);
  document.getElementById('btn-manage-picks').addEventListener('click', manageCuratorPicksAdmin);
  document.getElementById('btn-view-picks').addEventListener('click', viewCurrentPicks);
  document.getElementById('btn-manage-excluded').addEventListener('click', manageExcludedCourses);
  document.getElementById('btn-view-excluded').addEventListener('click', viewExcludedCourses);
  document.getElementById('btn-verify-data').addEventListener('click', verifyData);
  document.getElementById('btn-verify-sample').addEventListener('click', verifySample);
  document.getElementById('btn-test-graphql').addEventListener('click', testGraphQL);
  document.getElementById('btn-test-gemini').addEventListener('click', testGemini);
  document.getElementById('btn-view-chunk').addEventListener('click', viewChunk);
  loadAdminStatus();
  toast('🔧 관리자 모드에 진입했습니다.');
}

function exitAdminMode() { var p = document.getElementById('admin-panel'); if (p) p.remove(); document.getElementById('gate-page').style.display = ''; document.getElementById('input-subdomain').value = ''; }

async function loadAdminStatus() {
  try { var r = await fetch(WORKER_URL+'/status',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d = await r.json(); document.getElementById('sync-status-value').textContent = d.isComplete?'✅ 완료':d.synced?'⏳ 진행 중':'❌ 미완료'; document.getElementById('sync-status-sub').textContent = d.syncedAt?'마지막: '+new Date(d.syncedAt).toLocaleString('ko-KR'):'기록 없음'; document.getElementById('courses-count-value').textContent = (d.totalCount||0).toLocaleString(); document.getElementById('courses-count-sub').textContent = d.isComplete?'완료':'진행 중'; document.getElementById('chunks-count-value').textContent = d.totalChunks||0; } catch(e) { document.getElementById('sync-status-value').textContent = '❌ 연결 실패'; }
  try { var r2 = await fetch(WORKER_URL+'/test-token',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d2 = await r2.json(); document.getElementById('api-status-value').textContent = d2.success?'✅ 정상':'❌ 오류'; document.getElementById('api-status-sub').textContent = d2.success?'GraphQL OK':'실패'; } catch(e) { document.getElementById('api-status-value').textContent = '❌'; }
}

async function runSync(isReset) { var l=document.getElementById('sync-log'); l.innerHTML='<div class="log-entry log-info">📡 시작...</div>'; try { var r=await fetch(WORKER_URL+'/sync'+(isReset?'?reset=true':''),{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d=await r.json(); l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅':'❌')+' '+(d.message||d.error)+'</div>'; } catch(e) { l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>'; } loadAdminStatus(); }

async function runAutoSync() { var l=document.getElementById('sync-log'); var b=document.getElementById('btn-sync-auto'); b.disabled=true; b.textContent='⏳...'; l.innerHTML='<div class="log-entry log-info">🚀 자동 시작...</div>'; var c=1,go=true; while(go) { l.innerHTML+='<div class="log-entry log-info">📡 ['+c+']...</div>'; l.scrollTop=l.scrollHeight; try { var ep=c===1?WORKER_URL+'/sync?reset=true':WORKER_URL+'/sync'; var r=await fetch(ep,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var d=await r.json(); if(d.error){l.innerHTML+='<div class="log-entry log-error">❌ '+d.error+'</div>';break;} l.innerHTML+='<div class="log-entry log-success">✅ '+d.message+'</div>'; if(d.stoppedByTimeout){await new Promise(function(r){setTimeout(r,2000)});c++;}else{l.innerHTML+='<div class="log-entry log-success">🎉 완료! '+d.totalCount+'개</div>';go=false;} } catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';break;} l.scrollTop=l.scrollHeight; } b.disabled=false; b.textContent='🚀 자동 전체'; loadAdminStatus(); }

function manageCuratorPicksAdmin() { var c=localStorage.getItem('curator_picks'); var ids=c?JSON.parse(c):['8324','1717020','2360128']; var n=prompt("항해사's PICK 강의 ID (쉼표 구분):",ids.join(',')); if(n!==null){var i=n.split(',').map(function(x){return x.trim();}).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(i));var l=document.getElementById('picks-log');if(l)l.innerHTML='<div class="log-entry log-success">⭐ '+i.length+'개 업데이트</div>';toast('⭐ '+i.length+'개 업데이트');} }
function viewCurrentPicks() { var c=localStorage.getItem('curator_picks'); var ids=c?JSON.parse(c):['8324','1717020','2360128']; var l=document.getElementById('picks-log'); if(l)l.innerHTML='<div class="log-entry log-info">'+ids.map(function(id,i){return (i+1)+'. ID: '+id;}).join('<br>')+'</div>'; }
function manageExcludedCourses() { var c=localStorage.getItem('excluded_courses'); var ids=c?JSON.parse(c):[]; var n=prompt('제외할 강의 ID (쉼표 구분):',ids.join(',')); if(n!==null){var i=n.split(',').map(function(x){return x.trim();}).filter(Boolean);localStorage.setItem('excluded_courses',JSON.stringify(i));var l=document.getElementById('excluded-log');if(l)l.innerHTML='<div class="log-entry log-success">🚫 '+i.length+'개 제외 설정</div>';toast('🚫 '+i.length+'개 제외');} }
function viewExcludedCourses() { var c=localStorage.getItem('excluded_courses'); var ids=c?JSON.parse(c):[]; var l=document.getElementById('excluded-log'); if(l)l.innerHTML='<div class="log-entry log-info">🚫 제외: '+ids.length+'개<br>'+(ids.length>0?ids.join(', '):'없음')+'</div>'; }
async function verifyData() { var l=document.getElementById('verify-log'); l.innerHTML='<div class="log-entry log-info">🔍 검증...</div>'; var ch=0,t=0,s=0,k=0,d=0,r=0,e=0; while(true){try{var res=await fetch(WORKER_URL+'/get-courses?chunk='+ch,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!res.ok)break;var data=await res.json();if(!data||!Array.isArray(data)||data.length===0)break;t+=data.length;s+=data.filter(function(c){return c.subtitles&&c.subtitles!=='없음'&&c.subtitles!=='';}).length;k+=data.filter(function(c){return c.subtitles&&c.subtitles.toLowerCase().indexOf('ko')!==-1;}).length;d+=data.filter(function(c){return c.contentLength&&typeof c.contentLength==='number'&&c.contentLength>0;}).length;r+=data.filter(function(c){return c.rating&&c.rating>0;}).length;e+=data.filter(function(c){return c.enrollments&&c.enrollments>0;}).length;ch++;}catch(err){break;}} var p=function(n){return t>0?(n/t*100).toFixed(1)+'%':'0%';}; l.innerHTML+='<div class="log-entry log-success">📚 총: '+t.toLocaleString()+' ('+ch+' chunks)<br>💬 자막: '+s.toLocaleString()+' ('+p(s)+')<br>🇰🇷 한국어: '+k.toLocaleString()+' ('+p(k)+')<br>⏱️ 시간: '+d.toLocaleString()+' ('+p(d)+')<br>⭐ 평점: '+r.toLocaleString()+' ('+p(r)+')<br>👥 수강: '+e.toLocaleString()+' ('+p(e)+')</div>'; }
async function verifySample() { var l=document.getElementById('verify-log'); l.innerHTML='<div class="log-entry log-info">📋 로드...</div>'; try{var r=await fetch(WORKER_URL+'/get-courses?chunk=0',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();if(!d||d.length===0){l.innerHTML+='<div class="log-entry log-error">❌ 없음</div>';return;}l.innerHTML+='<div class="log-entry"><strong>필드:</strong> '+Object.keys(d[0]).join(', ')+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }
async function testGraphQL() { var l=document.getElementById('api-log'); l.innerHTML='<div class="log-entry log-info">🔐 테스트...</div>'; try{var r=await fetch(WORKER_URL+'/test-token',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅ 성공':'❌ '+d.error)+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }
async function testGemini() { var l=document.getElementById('api-log'); l.innerHTML='<div class="log-entry log-info">🤖 테스트...</div>'; try{var r=await fetch('/api/ai-expand',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'python'})});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅ 성공':'❌ '+(d.error||'실패'))+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }
async function viewChunk() { var l=document.getElementById('raw-log'); var n=document.getElementById('chunk-number').value||'0'; l.innerHTML='<div class="log-entry log-info">📋 Chunk '+n+'...</div>'; try{var r=await fetch(WORKER_URL+'/get-courses?chunk='+n,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!r.ok){l.innerHTML+='<div class="log-entry log-error">❌ 없음</div>';return;}var d=await r.json();l.innerHTML+='<div class="log-entry log-success"><strong>📦 '+d.length+'개</strong><br>'+d.slice(0,3).map(function(c,i){return (i+1)+'. '+((c.title||'').substring(0,40));}).join('<br>')+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';} }

// ═══════════════════════════════════════════════════════════
// 일반 모드 — 병렬 chunk 로딩
// ═══════════════════════════════════════════════════════════
async function launch() {
  S.selectedFamilies = [];
  var selected = document.querySelectorAll('.gate-job-card.selected');
  for (var i = 0; i < selected.length; i++) S.selectedFamilies.push(selected[i].dataset.family);

  var warp = document.getElementById('warp-overlay');
  warp.classList.add('active');
  var loadingPromise = playLaunchSequence();

  var dataLoaded = false;
  try {
    var totalChunks = 0;
    try { var r = await fetch(WORKER_URL+'/status',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var s = await r.json(); totalChunks = s.totalChunks||0; } catch(e) {}

    var allCourses = [];
    if (totalChunks > 0) {
      var m = document.getElementById('launch-message');
      if (m) m.textContent = '병렬 로딩 중... ('+totalChunks+' chunks)';
      var promises = [];
      for (var i = 0; i < totalChunks; i++) {
        (function(idx) {
          promises.push(fetch(WORKER_URL+'/get-courses?chunk='+idx,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}).then(function(r){return r.ok?r.json():[];}).catch(function(){return [];}));
        })(i);
      }
      var results = await Promise.all(promises);
      for (var i = 0; i < results.length; i++) { if (Array.isArray(results[i]) && results[i].length > 0) allCourses = allCourses.concat(results[i]); }
      if (m) m.textContent = allCourses.length.toLocaleString()+'개 로드 완료!';
    } else {
      var ci = 0;
      while (true) {
        try { var r2 = await fetch(WORKER_URL+'/get-courses?chunk='+ci,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); if (!r2.ok) break; var d2 = await r2.json(); if (!d2||!Array.isArray(d2)||d2.length===0) break; allCourses = allCourses.concat(d2); ci++; if (ci>=50) break; } catch(e) { break; }
      }
    }

    var excluded = getExcludedCourses();
    if (excluded.length > 0) allCourses = allCourses.filter(function(c) { return excluded.indexOf(c.id) === -1; });
    if (allCourses.length > 0) { S.courses = processCourses(allCourses); dataLoaded = true; }
  } catch (e) { console.error(e); }

  await loadingPromise;
  if (!dataLoaded) { toast('강의 데이터를 불러올 수 없습니다.', 'error'); warp.classList.remove('active'); return; }

  document.getElementById('launch-emoji').textContent = '🌟';
  document.getElementById('launch-message').textContent = '워프 점프!';
  document.getElementById('progress-fill').style.width = '100%';
  await new Promise(function(r) { setTimeout(r, 600); });

  warp.classList.remove('active');
  document.getElementById('gate-page').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  initApp();
  toast('🌌 '+S.subdomain+' 우주에 도착! '+S.courses.length.toLocaleString()+'개의 별');
}

async function playLaunchSequence() {
  for (var i = 0; i < LAUNCH_STEPS.length; i++) {
    document.getElementById('launch-emoji').textContent = LAUNCH_STEPS[i].emoji;
    document.getElementById('launch-message').textContent = LAUNCH_STEPS[i].message;
    document.getElementById('progress-fill').style.width = ((i+1)/(LAUNCH_STEPS.length+1)*100)+'%';
    await new Promise(function(r) { setTimeout(r, 600+Math.random()*400); });
  }
}

// ═══════════════════════════════════════════════════════════
// 앱 초기화
// ═══════════════════════════════════════════════════════════
function initApp() {
  var jobEmojis = '';
  for (var i = 0; i < S.selectedFamilies.length; i++) {
    var fam = CURATION[S.selectedFamilies[i]];
    if (fam) jobEmojis += fam.emoji;
  }
  document.getElementById('welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? jobEmojis+' 탐험가님, <strong>'+S.subdomain+'</strong> 우주에 도착했습니다!'
    : '탐험가님, <strong>'+S.subdomain+'</strong> 우주에 도착했습니다!';

  S.searchMode = 'and';

  renderDashCards();
  initMultiSelects();

  if (typeof initHighlight === 'function') { initHighlight(); setupHoverPause(); }
  if (typeof initMissionCenter === 'function') initMissionCenter();

  // ★ 게이트 직무 → 미션센터 은하 자동 선택
  if (S.selectedFamilies.length > 0) {
    setTimeout(function() {
      var firstFamily = S.selectedFamilies[0];
      var galaxyCard = document.querySelector('.galaxy-card[data-galaxy="'+firstFamily+'"]');
      if (galaxyCard) galaxyCard.click();
    }, 500);
  }

  if (typeof initStars === 'function') initStars();

  // ═══ 이벤트 바인딩 ═══

  // 헤더 탭
  var navBtns = document.querySelectorAll('.header-nav-btn');
  for (var i = 0; i < navBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var j = 0; j < navBtns.length; j++) navBtns[j].classList.remove('active');
        btn.classList.add('active');
        switchTab(btn.dataset.tab);
      });
    })(navBtns[i]);
  }

  // 검색 입력
  var searchInput = document.getElementById('search-input');
  var debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFilters, 400);
      setTimeout(function() { showSearchSuggestions(searchInput.value.trim()); }, 250);
    });
    searchInput.addEventListener('focus', function() {
      if (searchInput.value.trim().length >= 2) showSearchSuggestions(searchInput.value.trim());
    });
    searchInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        var sg = document.getElementById('search-suggestions');
        if (sg) sg.classList.remove('open');
        clearTimeout(debounceTimer);
        applyFilters();
      }
    });
  }

  // 검색 제안 외부 클릭
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.scanner-input-wrap')) {
      var sg = document.getElementById('search-suggestions');
      if (sg) sg.classList.remove('open');
    }
  });

  // 검색 모드 (AND / OR)
  var modeBtns = document.querySelectorAll('.scan-mode-btn[data-mode]');
  for (var i = 0; i < modeBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('active');
        btn.classList.add('active');
        S.searchMode = btn.dataset.mode;
        applyFilters();
      });
    })(modeBtns[i]);
  }

  // 감도
  var sensBtns = document.querySelectorAll('.sensitivity-btn');
  for (var i = 0; i < sensBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var j = 0; j < sensBtns.length; j++) sensBtns[j].classList.remove('active');
        btn.classList.add('active');
        S.sensitivity = btn.dataset.sensitivity;
        applyFilters();
        var label = SENSITIVITY_CONFIG[S.sensitivity] ? SENSITIVITY_CONFIG[S.sensitivity].label : '';
        toast('🎚️ 감도: '+label);
      });
    })(sensBtns[i]);
  }

  // AI 내비
  var aiScan = document.getElementById('btn-ai-scan');
  if (aiScan) aiScan.addEventListener('click', handleAIScan);
  var applyAi = document.getElementById('btn-apply-ai');
  if (applyAi) applyAi.addEventListener('click', applyAIKeywords);
  var aiSelectAll = document.getElementById('btn-ai-select-all');
  if (aiSelectAll) aiSelectAll.addEventListener('click', function() {
    var tags = document.querySelectorAll('#ai-panel-results .ai-kw-tag');
    for (var i = 0; i < tags.length; i++) tags[i].classList.add('selected');
  });
  var aiClose = document.getElementById('btn-ai-close');
  if (aiClose) aiClose.addEventListener('click', function() { document.getElementById('ai-panel').classList.remove('open'); });

  // 검색 버튼
  var searchBtn = document.getElementById('btn-search');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      var sg = document.getElementById('search-suggestions');
      if (sg) sg.classList.remove('open');
      clearTimeout(debounceTimer);
      applyFilters();
    });
  }

  // 필터 토글
  var filterToggle = document.getElementById('btn-filter-toggle');
  if (filterToggle) {
    filterToggle.addEventListener('click', function() {
      document.getElementById('filters-grid').classList.toggle('open');
      filterToggle.classList.toggle('active');
    });
  }

  // 정렬 / 표시
  var sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.addEventListener('change', applyFilters);
  var rowsSel = document.getElementById('rows-select');
  if (rowsSel) rowsSel.addEventListener('change', function() { S.rows = parseInt(rowsSel.value); S.page = 1; renderList(); });

  // CSV / 공유 / 리셋
  var csvBtn = document.getElementById('btn-csv');
  if (csvBtn) csvBtn.addEventListener('click', function() { downloadCSV(false); });
  var shareBtn = document.getElementById('btn-share');
  if (shareBtn) shareBtn.addEventListener('click', shareLink);
  var resetBtn = document.getElementById('btn-reset-inline');
  if (resetBtn) resetBtn.addEventListener('click', function() { resetAll(true); });

  // 뷰 모드
  var viewBtns = document.querySelectorAll('.view-btn');
  for (var i = 0; i < viewBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        for (var j = 0; j < viewBtns.length; j++) viewBtns[j].classList.remove('active');
        btn.classList.add('active');
        if (btn.dataset.view) { S.viewMode = btn.dataset.view; renderList(); }
      });
    })(viewBtns[i]);
  }

  // 전체 선택
  var checkAll = document.getElementById('check-all');
  if (checkAll) {
    checkAll.addEventListener('change', function() {
      var ids = getPageData().map(function(c) { return c.id; });
      for (var i = 0; i < ids.length; i++) {
        if (checkAll.checked) S.selectedIds.add(ids[i]);
        else S.selectedIds.delete(ids[i]);
      }
      renderList(); updateFAB();
    });
  }

  // FAB
  var fabCsv = document.getElementById('fab-csv');
  if (fabCsv) fabCsv.addEventListener('click', function() { downloadCSV(true); });
  var fabLink = document.getElementById('fab-link');
  if (fabLink) fabLink.addEventListener('click', function() {
    var links = [];
    S.selectedIds.forEach(function(id) { var c = S.courses.find(function(x){return x.id===id;}); if(c) links.push(buildCourseUrl(c)); });
    navigator.clipboard.writeText(links.join('\n'));
    toast('🔗 '+links.length+'개 복사');
  });
  var fabClear = document.getElementById('fab-clear');
  if (fabClear) fabClear.addEventListener('click', function() { S.selectedIds.clear(); renderList(); updateFAB(); });

  // 사이드 패널
  var spOverlay = document.getElementById('side-panel-overlay');
  if (spOverlay) spOverlay.addEventListener('click', function(e) { if (e.target === spOverlay) closeSidePanel(); });
  var spClose = document.getElementById('sp-close');
  if (spClose) spClose.addEventListener('click', closeSidePanel);

  // ★ 멀티셀렉트 외부 클릭 — 체크박스 클릭 보호
  document.addEventListener('click', function(e) {
    if (e.target.closest('.ms-wrap')) return;
    if (e.target.closest('.filter-chip-x')) return;
    var panels = document.querySelectorAll('.ms-panel.open');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('open');
  });

  // URL 파라미터
  applyURLParams();

  // ★ 선택 직무가 있으면 해당 직무 카테고리로 기본 필터 적용
  if (S.selectedFamilies.length > 0 && !document.getElementById('search-input').value.trim()) {
    var jobCats = [];
    for (var fi = 0; fi < S.selectedFamilies.length; fi++) {
      var famData = CURATION[S.selectedFamilies[fi]];
      if (famData && famData.roles) {
        for (var ri = 0; ri < famData.roles.length; ri++) {
          if (famData.roles[ri].cats) {
            for (var ci = 0; ci < famData.roles[ri].cats.length; ci++) {
              if (jobCats.indexOf(famData.roles[ri].cats[ci]) === -1) {
                jobCats.push(famData.roles[ri].cats[ci]);
              }
            }
          }
        }
      }
    }
    if (jobCats.length > 0) {
      setMSValues('f-category', jobCats);
    }
  }

  // 첫 필터링
  applyFilters();

  // 헤더 제목 클릭 → 맨위로 + 3번 클릭 항해사 PICK
  var clickCount = 0;
  var headerTitle = document.getElementById('header-title');
  if (headerTitle) {
    headerTitle.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      clickCount++;
      setTimeout(function() { clickCount = 0; }, 1000);
      if (clickCount === 3) { if (typeof manageCuratorPicks === 'function') manageCuratorPicks(); clickCount = 0; }
    });
  }

  // 도움말
  var helpBtn = document.getElementById('btn-help');
  if (helpBtn) helpBtn.addEventListener('click', function() { document.getElementById('help-overlay').classList.add('active'); });
  var helpClose = document.getElementById('help-close');
  if (helpClose) helpClose.addEventListener('click', function() { document.getElementById('help-overlay').classList.remove('active'); });
  var helpOverlay = document.getElementById('help-overlay');
  if (helpOverlay) helpOverlay.addEventListener('click', function(e) { if (e.target === helpOverlay) helpOverlay.classList.remove('active'); });

  // CSV 모달
  var csvModalClose = document.getElementById('csv-modal-close');
  if (csvModalClose) csvModalClose.addEventListener('click', function() { document.getElementById('csv-modal-overlay').classList.remove('active'); });
  var csvModalOverlay = document.getElementById('csv-modal-overlay');
  if (csvModalOverlay) csvModalOverlay.addEventListener('click', function(e) { if (e.target === csvModalOverlay) csvModalOverlay.classList.remove('active'); });

  // 키보드 단축키
  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && !e.target.matches('input,textarea,select')) { e.preventDefault(); if (searchInput) searchInput.focus(); }
    if (e.key === 'Escape') {
      closeSidePanel();
      var ho = document.getElementById('help-overlay'); if (ho) ho.classList.remove('active');
      var ap = document.getElementById('ai-panel'); if (ap) ap.classList.remove('open');
      var sg = document.getElementById('search-suggestions'); if (sg) sg.classList.remove('open');
      var cm = document.getElementById('csv-modal-overlay'); if (cm) cm.classList.remove('active');
    }
    if (!e.target.matches('input,textarea,select')) {
      if (e.key === 'ArrowLeft' && S.page > 1) { S.page--; renderList(); }
      if (e.key === 'ArrowRight') { var tp = Math.ceil(S.filtered.length/S.rows); if (S.page < tp) { S.page++; renderList(); } }
    }
  });
}

// ═══════════════════════════════════════════════════════════
// 탭 전환
// ═══════════════════════════════════════════════════════════
function switchTab(tabId) {
  var panels = document.querySelectorAll('.tab-panel');
  for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
  var panel = document.getElementById('panel-'+tabId);
  if (panel) panel.classList.add('active');
  var listSection = document.getElementById('list-section');
  if (listSection) listSection.style.display = (tabId === 'stars') ? 'none' : '';
}

// ═══════════════════════════════════════════════════════════
// 스마트 검색 제안
// ═══════════════════════════════════════════════════════════
function showSearchSuggestions(query) {
  var container = document.getElementById('search-suggestions');
  if (!container) return;
  if (query.length < 2) { container.classList.remove('open'); return; }

  var ql = query.toLowerCase();
  var titleMatches = [], catSet = new Set(), topicSet = new Set(), koEnSuggestions = [];

  for (var i = 0; i < S.courses.length; i++) {
    var c = S.courses[i];
    if (c.title && c.title.toLowerCase().indexOf(ql) !== -1) titleMatches.push(c);
    if (c.category && c.category.toLowerCase().indexOf(ql) !== -1) catSet.add(c.category.split(',')[0].trim());
    if (c.topic && c.topic.toLowerCase().indexOf(ql) !== -1) topicSet.add(c.topic);
  }
  titleMatches.sort(function(a,b) { return (b.enrollments||0)-(a.enrollments||0); });
  titleMatches = titleMatches.slice(0, 3);
  var catMatches = Array.from(catSet).filter(Boolean).slice(0, 2);
  var topicMatches = Array.from(topicSet).filter(Boolean).slice(0, 2);

  var entries = Object.entries(KO_EN_MAP);
  for (var i = 0; i < entries.length; i++) {
    var ko = entries[i][0], enList = entries[i][1];
    var match = ko.indexOf(ql) !== -1;
    if (!match) { for (var j = 0; j < enList.length; j++) { if (enList[j].indexOf(ql) !== -1) { match = true; break; } } }
    if (match) koEnSuggestions.push({ ko: ko, en: enList[0] });
  }

  var html = '';
  if (titleMatches.length > 0) {
    html += '<div class="suggestion-category">🔥 인기 강의</div>';
    for (var i = 0; i < titleMatches.length; i++) {
      var c = titleMatches[i];
      html += '<div class="suggestion-item" data-course-id="'+c.id+'"><span class="suggestion-icon">📖</span><span class="suggestion-text">'+(c.title.length>50?c.title.substring(0,50)+'...':c.title)+'</span><span class="suggestion-badge">⭐'+(c.rating?c.rating.toFixed(1):'-')+'</span></div>';
    }
  }
  if (catMatches.length > 0) {
    html += '<div class="suggestion-category">🌌 카테고리</div>';
    for (var i = 0; i < catMatches.length; i++) {
      html += '<div class="suggestion-item" data-category="'+catMatches[i]+'"><span class="suggestion-icon">'+getCatEmoji(catMatches[i])+'</span><span class="suggestion-text">'+catMatches[i]+'</span><span class="suggestion-badge">카테고리 필터</span></div>';
    }
  }
  if (topicMatches.length > 0) {
    html += '<div class="suggestion-category">💡 주제</div>';
    for (var i = 0; i < topicMatches.length; i++) {
      html += '<div class="suggestion-item" data-topic="'+topicMatches[i]+'"><span class="suggestion-icon">🏷️</span><span class="suggestion-text">'+topicMatches[i]+'</span></div>';
    }
  }
  if (koEnSuggestions.length > 0) {
    html += '<div class="suggestion-category">🌐 번역 제안</div>';
    for (var i = 0; i < Math.min(2, koEnSuggestions.length); i++) {
      html += '<div class="suggestion-item" data-keyword="'+koEnSuggestions[i].en+'"><span class="suggestion-icon">🔄</span><span class="suggestion-text">'+koEnSuggestions[i].ko+' → '+koEnSuggestions[i].en+'</span></div>';
    }
  }

  if (!html) { container.classList.remove('open'); return; }
  container.innerHTML = html;
  container.classList.add('open');

  var items = container.querySelectorAll('.suggestion-item');
  for (var i = 0; i < items.length; i++) {
    (function(item) {
      item.addEventListener('click', function() {
        if (item.dataset.courseId) {
          var course = S.courses.find(function(x) { return x.id === item.dataset.courseId; });
          if (course) openSidePanel(course);
        } else if (item.dataset.category) {
          setMSValues('f-category', [item.dataset.category]);
          applyFilters();
        } else if (item.dataset.topic) {
          document.getElementById('search-input').value = item.dataset.topic;
          applyFilters();
        } else if (item.dataset.keyword) {
          var cur = document.getElementById('search-input').value.trim();
          document.getElementById('search-input').value = cur ? cur+', '+item.dataset.keyword : item.dataset.keyword;
          applyFilters();
        }
        container.classList.remove('open');
      });
    })(items[i]);
  }
}
