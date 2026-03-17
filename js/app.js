// ═══════════════════════════════════════════════════════════
// app.js — 메인 앱
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
    if (v === ADMIN_CODE) { preview.textContent = '🔧 관리자 모드로 진입합니다'; preview.style.color = 'var(--warning)'; }
    else { preview.textContent = v ? '✅ ' + v + '.udemy.com 연결 확인' : ''; preview.style.color = 'var(--success)'; }
  });
  document.getElementById('btn-step1-next').addEventListener('click', goStep2);
  document.getElementById('input-subdomain').addEventListener('keyup', function(e) { if (e.key === 'Enter') goStep2(); });
  var grid = document.getElementById('gate-job-grid');
  var curationEntries = Object.entries(CURATION);
  for (var i = 0; i < curationEntries.length; i++) {
    (function(id, data) {
      var card = document.createElement('div');
      card.className = 'gate-job-card';
      card.dataset.family = id;
      card.innerHTML = '<span class="emoji">' + data.emoji + '</span><span class="label">' + data.name + '</span>';
      card.addEventListener('click', function() { card.classList.add('selected'); launch(); });
      grid.appendChild(card);
    })(curationEntries[i][0], curationEntries[i][1]);
  }
  document.getElementById('btn-launch').addEventListener('click', launch);
  window.addEventListener('scroll', function() { var btn = document.getElementById('scroll-to-top'); if (btn) btn.classList.toggle('visible', window.scrollY > 300); });
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

// ═══ 관리자 모드 ═══
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
  loadAdminStatus(); toast('🔧 관리자 모드에 진입했습니다.');
}
function exitAdminMode() { var p=document.getElementById('admin-panel'); if(p)p.remove(); document.getElementById('gate-page').style.display=''; document.getElementById('input-subdomain').value=''; }
async function loadAdminStatus(){try{var r=await fetch(WORKER_URL+'/status',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();document.getElementById('sync-status-value').textContent=d.isComplete?'✅ 완료':d.synced?'⏳ 진행 중':'❌ 미완료';document.getElementById('sync-status-sub').textContent=d.syncedAt?'마지막: '+new Date(d.syncedAt).toLocaleString('ko-KR'):'기록 없음';document.getElementById('courses-count-value').textContent=(d.totalCount||0).toLocaleString();document.getElementById('courses-count-sub').textContent=d.isComplete?'완료':'진행 중';document.getElementById('chunks-count-value').textContent=d.totalChunks||0;}catch(e){document.getElementById('sync-status-value').textContent='❌ 연결 실패';}try{var r2=await fetch(WORKER_URL+'/test-token',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d2=await r2.json();document.getElementById('api-status-value').textContent=d2.success?'✅ 정상':'❌ 오류';document.getElementById('api-status-sub').textContent=d2.success?'GraphQL OK':'실패';}catch(e){document.getElementById('api-status-value').textContent='❌';}}
async function runSync(isReset){var l=document.getElementById('sync-log');l.innerHTML='<div class="log-entry log-info">📡 시작...</div>';try{var r=await fetch(WORKER_URL+'/sync'+(isReset?'?reset=true':''),{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅':'❌')+' '+(d.message||d.error)+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';}loadAdminStatus();}
async function runAutoSync(){var l=document.getElementById('sync-log');var b=document.getElementById('btn-sync-auto');b.disabled=true;b.textContent='⏳...';l.innerHTML='<div class="log-entry log-info">🚀 자동 시작...</div>';var c=1,go=true;while(go){l.innerHTML+='<div class="log-entry log-info">📡 ['+c+']...</div>';l.scrollTop=l.scrollHeight;try{var ep=c===1?WORKER_URL+'/sync?reset=true':WORKER_URL+'/sync';var r=await fetch(ep,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();if(d.error){l.innerHTML+='<div class="log-entry log-error">❌ '+d.error+'</div>';break;}l.innerHTML+='<div class="log-entry log-success">✅ '+d.message+'</div>';if(d.stoppedByTimeout){await new Promise(function(r){setTimeout(r,2000)});c++;}else{l.innerHTML+='<div class="log-entry log-success">🎉 완료! '+d.totalCount+'개</div>';go=false;}}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';break;}l.scrollTop=l.scrollHeight;}b.disabled=false;b.textContent='🚀 자동 전체';loadAdminStatus();}
function manageCuratorPicksAdmin(){var c=localStorage.getItem('curator_picks');var ids=c?JSON.parse(c):['8324','1717020','2360128'];var n=prompt("항해사's PICK 강의 ID (쉼표 구분):",ids.join(','));if(n!==null){var i=n.split(',').map(function(x){return x.trim();}).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(i));var l=document.getElementById('picks-log');if(l)l.innerHTML='<div class="log-entry log-success">⭐ '+i.length+'개 업데이트</div>';toast('⭐ '+i.length+'개 업데이트');}}
function viewCurrentPicks(){var c=localStorage.getItem('curator_picks');var ids=c?JSON.parse(c):['8324','1717020','2360128'];var l=document.getElementById('picks-log');if(l)l.innerHTML='<div class="log-entry log-info">'+ids.map(function(id,i){return(i+1)+'. ID: '+id;}).join('<br>')+'</div>';}
function manageExcludedCourses(){var c=localStorage.getItem('excluded_courses');var ids=c?JSON.parse(c):[];var n=prompt('제외할 강의 ID (쉼표 구분):',ids.join(','));if(n!==null){var i=n.split(',').map(function(x){return x.trim();}).filter(Boolean);localStorage.setItem('excluded_courses',JSON.stringify(i));var l=document.getElementById('excluded-log');if(l)l.innerHTML='<div class="log-entry log-success">🚫 '+i.length+'개 제외 설정</div>';toast('🚫 '+i.length+'개 제외');}}
function viewExcludedCourses(){var c=localStorage.getItem('excluded_courses');var ids=c?JSON.parse(c):[];var l=document.getElementById('excluded-log');if(l)l.innerHTML='<div class="log-entry log-info">🚫 제외: '+ids.length+'개<br>'+(ids.length>0?ids.join(', '):'없음')+'</div>';}
async function verifyData(){var l=document.getElementById('verify-log');l.innerHTML='<div class="log-entry log-info">🔍 검증...</div>';var ch=0,t=0,s=0,k=0,d=0,r=0,e=0;while(true){try{var res=await fetch(WORKER_URL+'/get-courses?chunk='+ch,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!res.ok)break;var data=await res.json();if(!data||!Array.isArray(data)||data.length===0)break;t+=data.length;s+=data.filter(function(c){return c.subtitles&&c.subtitles!=='없음'&&c.subtitles!=='';}).length;k+=data.filter(function(c){return c.subtitles&&c.subtitles.toLowerCase().indexOf('ko')!==-1;}).length;d+=data.filter(function(c){return c.contentLength&&typeof c.contentLength==='number'&&c.contentLength>0;}).length;r+=data.filter(function(c){return c.rating&&c.rating>0;}).length;e+=data.filter(function(c){return c.enrollments&&c.enrollments>0;}).length;ch++;}catch(err){break;}}var p=function(n){return t>0?(n/t*100).toFixed(1)+'%':'0%';};l.innerHTML+='<div class="log-entry log-success">📚 총: '+t.toLocaleString()+' ('+ch+' chunks)<br>💬 자막: '+s.toLocaleString()+' ('+p(s)+')<br>🇰🇷 한국어: '+k.toLocaleString()+' ('+p(k)+')<br>⏱️ 시간: '+d.toLocaleString()+' ('+p(d)+')<br>⭐ 평점: '+r.toLocaleString()+' ('+p(r)+')<br>👥 수강: '+e.toLocaleString()+' ('+p(e)+')</div>';}
async function verifySample(){var l=document.getElementById('verify-log');l.innerHTML='<div class="log-entry log-info">📋 로드...</div>';try{var r=await fetch(WORKER_URL+'/get-courses?chunk=0',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();if(!d||d.length===0){l.innerHTML+='<div class="log-entry log-error">❌ 없음</div>';return;}l.innerHTML+='<div class="log-entry"><strong>필드:</strong> '+Object.keys(d[0]).join(', ')+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';}}
async function testGraphQL(){var l=document.getElementById('api-log');l.innerHTML='<div class="log-entry log-info">🔐 테스트...</div>';try{var r=await fetch(WORKER_URL+'/test-token',{headers:{'Authorization':'Bearer '+WORKER_SECRET}});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅ 성공':'❌ '+d.error)+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';}}
async function testGemini(){var l=document.getElementById('api-log');l.innerHTML='<div class="log-entry log-info">🤖 테스트...</div>';try{var r=await fetch('/api/ai-expand',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'python'})});var d=await r.json();l.innerHTML+='<div class="log-entry '+(d.success?'log-success':'log-error')+'">'+(d.success?'✅ 성공':'❌ '+(d.error||'실패'))+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';}}
async function viewChunk(){var l=document.getElementById('raw-log');var n=document.getElementById('chunk-number').value||'0';l.innerHTML='<div class="log-entry log-info">📋 Chunk '+n+'...</div>';try{var r=await fetch(WORKER_URL+'/get-courses?chunk='+n,{headers:{'Authorization':'Bearer '+WORKER_SECRET}});if(!r.ok){l.innerHTML+='<div class="log-entry log-error">❌ 없음</div>';return;}var d=await r.json();l.innerHTML+='<div class="log-entry log-success"><strong>📦 '+d.length+'개</strong><br>'+d.slice(0,3).map(function(c,i){return(i+1)+'. '+((c.title||'').substring(0,40));}).join('<br>')+'</div>';}catch(e){l.innerHTML+='<div class="log-entry log-error">❌ '+e.message+'</div>';}}

// ═══ 일반 모드 — 병렬 chunk 로딩 ═══
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
        (function(idx){ promises.push(fetch(WORKER_URL+'/get-courses?chunk='+idx,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];})); })(i);
      }
      var results = await Promise.all(promises);
      for (var i = 0; i < results.length; i++) { if (Array.isArray(results[i]) && results[i].length > 0) allCourses = allCourses.concat(results[i]); }
      if (m) m.textContent = allCourses.length.toLocaleString()+'개 로드 완료!';
    } else {
      var ci = 0;
      while (true) { try { var r2 = await fetch(WORKER_URL+'/get-courses?chunk='+ci,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); if (!r2.ok) break; var d2 = await r2.json(); if (!d2||!Array.isArray(d2)||d2.length===0) break; allCourses = allCourses.concat(d2); ci++; if (ci>=50) break; } catch(e) { break; } }
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
