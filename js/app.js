// ═══════════════════════════════════════════════════════════
// app.js — 메인 앱 + 임시 목록 + 관리자 + 썸네일 다운로드
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
  var previewEl = document.getElementById('subdomain-preview');
  if (previewEl) {
    previewEl.style.cursor = 'pointer';
    previewEl.addEventListener('click', function() {
      var sub = document.getElementById('input-subdomain').value.trim();
      if (sub && sub !== ADMIN_CODE) window.open('https://' + sub + '.udemy.com', '_blank');
    });
  }
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
  var gateClickCount = 0;
  var gateLabel = document.querySelector('.gate-input-group label');
  if (gateLabel) {
    gateLabel.addEventListener('click', function() {
      gateClickCount++;
      setTimeout(function() { gateClickCount = 0; }, 1000);
      if (gateClickCount === 3) { enterAdminMode(); gateClickCount = 0; }
    });
  }
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

function downloadSampleCSV() {
  var headers = '강의명\t강의명번역\t카테고리\t서브카테고리\t난이도\t수강시간(h)\t평점\t리뷰 수\t최근 업데이트\t강의 개요\t강의개요번역';
  var s1 = 'JavaシリーズVol.1【ゼロからJavaの基礎文法と開発ツールを同時に学ぶ】\tJava 시리즈 Vol.1 【0부터 Java의 기초 문법과 개발 툴을 동시에 배우다】\tDevelopment\tProgramming Languages\tBeginner\t2.3\t4.4\t334\t2025-06-21\t私は、新人教育でJavaを教えてきました\t나는 신인 교육에서 자바를 가르쳐 왔습니다';
  var s2 = 'ビジネス日本語コミュニケーション入門\t비즈니스 일본어 커뮤니케이션 입문\tBusiness\tCommunication\tBeginner\t1.5\t4.2\t128\t2025-03-15\tビジネスシーンで使える日本語を学びます\t비즈니스 현장에서 사용할 수 있는 일본어를 배웁니다';
  var s3 = 'AI・機械学習の基礎と実践\tAI·머신러닝의 기초와 실전\tIT & Software\tData Science\tIntermediate\t4.0\t4.6\t567\t2025-09-10\tAIと機械学習の基本概念から実践まで\tAI와 머신러닝의 기본 개념부터 실전까지';
  var csv = '\uFEFF' + headers + '\n' + s1 + '\n' + s2 + '\n' + s3;
  var blob = new Blob([csv], {type: 'text/tab-separated-values;charset=utf-8;'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '임시목록_샘플양식.tsv'; a.click(); URL.revokeObjectURL(a.href);
  toast('📥 샘플 양식 다운로드 완료!');
}

function downloadThumbnail(imageUrl, uid) {
  fetch(imageUrl).then(function(res) { return res.blob(); }).then(function(blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'udemy_thumb_' + uid + '.jpg'; a.click(); URL.revokeObjectURL(a.href);
  }).catch(function() { window.open(imageUrl, '_blank'); toast('⚠️ 직접 다운로드 실패 — 새 탭에서 우클릭 → 저장', 'warning'); });
}

// ═══ 관리자 모드 ═══
function enterAdminMode() {
  document.getElementById('gate-page').style.display = 'none';
  var existingApp = document.getElementById('app-container');
  if (existingApp) existingApp.style.display = 'none';
  var footer = document.querySelector('.app-footer');
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
      // 임시 목록
      '<div class="admin-section"><h3>📋 임시 목록 모드 <button class="admin-btn" id="btn-temp-help" style="padding:0.3rem 0.6rem;font-size:0.75rem;margin-left:0.5rem;">❓ 사용법</button> <button class="admin-btn" id="btn-temp-sample" style="padding:0.3rem 0.6rem;font-size:0.75rem;margin-left:0.3rem;">📥 샘플 양식</button></h3><p class="admin-desc">외부 강의 목록(CSV/텍스트)을 업로드하여 임시로 큐레이션합니다.</p><div class="admin-btn-group"><label class="admin-btn admin-btn-primary" style="cursor:pointer;">📥 CSV 업로드<input type="file" id="temp-csv-upload" accept=".csv,.tsv,.txt" style="display:none;" /></label><button class="admin-btn admin-btn-primary" id="btn-temp-paste">📝 텍스트 붙여넣기</button><button class="admin-btn admin-btn-warning" id="btn-temp-restore" style="display:none;">↩️ 원래 목록 복원</button></div><div id="temp-paste-area" style="display:none;margin-top:0.8rem;"><textarea id="temp-paste-text" rows="8" placeholder="탭 또는 쉼표로 구분된 데이터를 붙여넣으세요.&#10;첫 줄은 헤더 (📥 샘플 양식 참고)" style="width:100%;padding:0.8rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);font-size:0.82rem;font-family:Consolas,monospace;resize:vertical;"></textarea><button class="admin-btn admin-btn-primary" id="btn-temp-apply-paste" style="margin-top:0.5rem;">🚀 이 목록으로 전환</button></div><div class="admin-log" id="temp-log"></div></div>' +
      // 썸네일 다운로드
      '<div class="admin-section"><h3>🖼️ 썸네일 다운로드</h3><p class="admin-desc">과정 UID(ID)를 입력하면 해당 강의의 썸네일 이미지를 다운로드합니다. 데이터가 로드된 상태에서 사용하세요.</p><div class="admin-btn-group" style="align-items:center;"><input type="text" id="thumb-uid" placeholder="과정 UID 입력 (쉼표로 여러 개 가능)" style="flex:1;padding:0.5rem 0.8rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);font-size:0.85rem;" /><button class="admin-btn admin-btn-primary" id="btn-thumb-search">🔍 검색</button><button class="admin-btn" id="btn-thumb-download-all" style="display:none;">📥 전체 다운로드</button></div><div id="thumb-results" style="display:flex;flex-wrap:wrap;gap:0.8rem;margin-top:0.8rem;"></div><div class="admin-log" id="thumb-log"></div></div>' +
      // 데이터 검증
      '<div class="admin-section"><h3>🔍 데이터 검증</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-verify-data">📊 현황</button><button class="admin-btn" id="btn-verify-sample">📋 샘플</button></div><div class="admin-log" id="verify-log"></div></div>' +
      '<div class="admin-section"><h3>🔑 API 테스트</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-test-graphql">🔐 GraphQL</button><button class="admin-btn" id="btn-test-gemini">🤖 Gemini</button></div><div class="admin-log" id="api-log"></div></div>' +
      '<div class="admin-section"><h3>📋 로우 데이터</h3><div class="admin-btn-group" style="align-items:center;"><label style="color:var(--text-secondary);font-size:0.85rem;">Chunk:</label><input type="number" id="chunk-number" value="0" min="0" max="50" style="width:60px;padding:0.4rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);text-align:center;" /><button class="admin-btn" id="btn-view-chunk">🔍 조회</button></div><div class="admin-log" id="raw-log"></div></div>' +
    '</div></div>';
  if (footer) document.body.insertBefore(ap, footer);
  else document.body.appendChild(ap);

  // 기존 이벤트
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

  // 샘플 + 도움말
  var btnTempSample = document.getElementById('btn-temp-sample');
  if (btnTempSample) btnTempSample.addEventListener('click', downloadSampleCSV);
  var btnTempHelp = document.getElementById('btn-temp-help');
  if (btnTempHelp) btnTempHelp.addEventListener('click', function() {
    var h = document.createElement('div');
    h.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;justify-content:center;align-items:center;padding:2rem;';
    h.innerHTML = '<div style="background:var(--bg-nebula);border:1px solid var(--border);border-radius:var(--radius);max-width:600px;width:100%;max-height:80vh;overflow-y:auto;padding:2rem;position:relative;"><button onclick="this.parentElement.parentElement.remove()" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--text-secondary);font-size:1.5rem;cursor:pointer;">&times;</button><h2 style="color:var(--accent-light);margin-bottom:1rem;">📋 임시 목록 모드 사용법</h2><div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.8;"><h3 style="color:var(--text-bright);margin:1rem 0 0.5rem;">📥 1단계: 양식 준비</h3><p><strong>📥 샘플 양식</strong> 버튼으로 TSV 파일을 다운로드하세요.</p><div style="background:var(--bg-card-solid);padding:0.8rem;border-radius:var(--radius-xs);margin:0.5rem 0;font-family:Consolas,monospace;font-size:0.78rem;"><strong>필수:</strong> 강의명<br><strong>권장:</strong> 카테고리, 강의개요, 난이도, 평점<br><strong>번역:</strong> 강의명번역, 강의개요번역 (외국어 시)</div><h3 style="color:var(--text-bright);margin:1rem 0 0.5rem;">📤 2단계: 업로드</h3><p>CSV 업로드 또는 텍스트 붙여넣기</p><h3 style="color:var(--text-bright);margin:1rem 0 0.5rem;">🔍 3단계: 검색</h3><p>🚪 나가기 → 메인 화면에서 검색/필터 사용!</p><h3 style="color:var(--text-bright);margin:1rem 0 0.5rem;">↩️ 4단계: 복원</h3><p>관리자 모드 → ↩️ 원래 목록 복원</p><h3 style="color:var(--text-bright);margin:1rem 0 0.5rem;">🌐 외국어 팁</h3><p>구글 시트: <code style="background:var(--bg-card-solid);padding:0.2rem 0.4rem;border-radius:3px;">=GOOGLETRANSLATE(A2,"ja","ko")</code></p><h3 style="color:var(--warning);margin:1rem 0 0.5rem;">⚠️ 주의</h3><ul style="padding-left:1.2rem;"><li>새로고침 시 사라짐</li><li>UTF-8 권장 (EUC-KR 자동 감지)</li></ul></div></div>';
    h.addEventListener('click', function(e) { if (e.target === h) h.remove(); });
    document.body.appendChild(h);
  });

  // 임시 목록 이벤트
  var tempCsvUpload = document.getElementById('temp-csv-upload');
  if (tempCsvUpload) tempCsvUpload.addEventListener('change', function(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) { var text = ev.target.result; if (text.indexOf('�') !== -1) { var r2 = new FileReader(); r2.onload = function(ev2) { parseTempList(ev2.target.result); }; r2.readAsText(file, 'EUC-KR'); } else parseTempList(text); };
    reader.readAsText(file, 'UTF-8');
  });
  var btnTempPaste = document.getElementById('btn-temp-paste');
  if (btnTempPaste) btnTempPaste.addEventListener('click', function() { var a = document.getElementById('temp-paste-area'); if (a) a.style.display = a.style.display === 'none' ? 'block' : 'none'; });
  var btnTempApplyPaste = document.getElementById('btn-temp-apply-paste');
  if (btnTempApplyPaste) btnTempApplyPaste.addEventListener('click', function() { var t = document.getElementById('temp-paste-text').value.trim(); if (!t) { toast('데이터를 입력해주세요.', 'warning'); return; } parseTempList(t); });
  var btnTempRestore = document.getElementById('btn-temp-restore');
  if (btnTempRestore) btnTempRestore.addEventListener('click', function() { if (S._originalCourses) { S.courses = S._originalCourses; S._originalCourses = null; document.getElementById('temp-log').innerHTML = '<div class="log-entry log-success">✅ 원래 목록 복원!</div>'; btnTempRestore.style.display = 'none'; toast('↩️ 원래 목록 복원!'); } });
  if (S._originalCourses) { var rb = document.getElementById('btn-temp-restore'); if (rb) rb.style.display = ''; }

  // ★ 썸네일 다운로드 이벤트
  var btnThumbSearch = document.getElementById('btn-thumb-search');
  if (btnThumbSearch) btnThumbSearch.addEventListener('click', function() {
    var input = document.getElementById('thumb-uid').value.trim();
    if (!input) { toast('과정 UID를 입력해주세요.', 'warning'); return; }
    var uids = input.split(/[,\s]+/).map(function(u) { return u.trim(); }).filter(Boolean);
    var results = document.getElementById('thumb-results');
    var log = document.getElementById('thumb-log');
    var dlAllBtn = document.getElementById('btn-thumb-download-all');
    results.innerHTML = '';
    if (log) log.innerHTML = '<div class="log-entry log-info">🔍 ' + uids.length + '개 검색 중...</div>';
    var found = [], notFound = [];
    var searchData = S._originalCourses || S.courses || [];
    for (var i = 0; i < uids.length; i++) {
      var uid = uids[i];
      var course = null;
      for (var j = 0; j < searchData.length; j++) { if (String(searchData[j].id) === String(uid)) { course = searchData[j]; break; } }
      if (course && course.image) {
        found.push(course);
        var safeTitle = (course.title || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        results.innerHTML += '<div style="background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.8rem;text-align:center;width:200px;"><img src="' + course.image + '" alt="" style="width:100%;border-radius:4px;margin-bottom:0.5rem;" /><div style="font-size:0.75rem;color:var(--text-primary);margin-bottom:0.3rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + safeTitle + '">' + (course.title || '').substring(0, 30) + '</div><div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:0.5rem;">ID: ' + uid + '</div><button class="admin-btn" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="downloadThumbnail(\'' + course.image + '\',\'' + uid + '\')">📥 다운로드</button></div>';
      } else notFound.push(uid);
    }
    if (log) {
      log.innerHTML = '<div class="log-entry log-success">✅ ' + found.length + '개 발견</div>';
      if (notFound.length > 0) log.innerHTML += '<div class="log-entry log-error">❌ ' + notFound.length + '개 미발견: ' + notFound.join(', ') + '</div><div class="log-entry log-info">💡 먼저 메인 화면에서 데이터를 로드해주세요.</div>';
    }
    if (found.length > 1 && dlAllBtn) dlAllBtn.style.display = '';
  });
  var btnThumbDownloadAll = document.getElementById('btn-thumb-download-all');
  if (btnThumbDownloadAll) btnThumbDownloadAll.addEventListener('click', function() {
    var imgs = document.querySelectorAll('#thumb-results img');
    for (var i = 0; i < imgs.length; i++) { (function(img, idx) { setTimeout(function() { var p = img.closest('div'); var ut = p ? p.querySelectorAll('div')[1] : null; var uid = ut ? ut.textContent.replace('ID: ', '') : 'thumb_' + idx; downloadThumbnail(img.src, uid); }, idx * 500); })(imgs[i], i); }
    toast('📥 ' + imgs.length + '개 썸네일 다운로드 시작!');
  });

  loadAdminStatus();
  toast('🔧 관리자 모드에 진입했습니다.');
}

function exitAdminMode() {
  var p = document.getElementById('admin-panel'); if (p) p.remove();
  if (S.courses && S.courses.length > 0 && S._originalCourses) {
    document.getElementById('gate-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    S.subdomain = S.subdomain || 'temp';
    initApp();
    toast('📋 임시 목록 ' + S.courses.length + '개로 탐색 모드!');
  } else if (S.courses && S.courses.length > 0 && S.subdomain) {
    document.getElementById('gate-page').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    initApp();
  } else {
    document.getElementById('gate-page').style.display = '';
    document.getElementById('input-subdomain').value = '';
  }
}

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

async function launch() {
  S.selectedFamilies = [];
  var selected = document.querySelectorAll('.gate-job-card.selected');
  for (var i = 0; i < selected.length; i++) S.selectedFamilies.push(selected[i].dataset.family);
  var warp = document.getElementById('warp-overlay'); warp.classList.add('active');
  var loadingPromise = playLaunchSequence();
  var dataLoaded = false;
  try {
    var totalChunks = 0;
    try { var r = await fetch(WORKER_URL+'/status',{headers:{'Authorization':'Bearer '+WORKER_SECRET}}); var s = await r.json(); totalChunks = s.totalChunks||0; } catch(e) {}
    var allCourses = [];
    if (totalChunks > 0) {
      var m = document.getElementById('launch-message'); if (m) m.textContent = '병렬 로딩 중... ('+totalChunks+' chunks)';
      var promises = [];
      for (var i = 0; i < totalChunks; i++) { (function(idx){ promises.push(fetch(WORKER_URL+'/get-courses?chunk='+idx,{headers:{'Authorization':'Bearer '+WORKER_SECRET}}).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];})); })(i); }
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

function initApp() {
  S.searchMode = 'and'; S.showAllResults = false;
  renderDashCards(); initMultiSelects();
  if (typeof initHighlight === 'function') { initHighlight(); setupHoverPause(); }
  if (typeof initMissionCenter === 'function') initMissionCenter();
  if (S.selectedFamilies && S.selectedFamilies.length > 0) { setTimeout(function() { var fc = S.selectedFamilies[0]; var gc = document.querySelector('.galaxy-card[data-galaxy="'+fc+'"]'); if (gc) gc.click(); }, 500); }
  if (typeof initStars === 'function') initStars();

  var navBtns = document.querySelectorAll('.header-nav-btn');
  for (var i = 0; i < navBtns.length; i++) { (function(btn) { btn.addEventListener('click', function() { for (var j = 0; j < navBtns.length; j++) navBtns[j].classList.remove('active'); btn.classList.add('active'); switchTab(btn.dataset.tab); }); })(navBtns[i]); }

  var searchInput = document.getElementById('search-input'); var debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', function() { clearTimeout(debounceTimer); debounceTimer = setTimeout(function() { showSearchSuggestions(searchInput.value.trim()); }, 250); });
    searchInput.addEventListener('focus', function() { if (searchInput.value.trim().length >= 2) showSearchSuggestions(searchInput.value.trim()); });
    searchInput.addEventListener('keyup', function(e) { if (e.key === 'Enter') { var sg = document.getElementById('search-suggestions'); if (sg) sg.classList.remove('open'); clearTimeout(debounceTimer); S.showAllResults = false; applyFilters(); } });
  }
  document.addEventListener('click', function(e) { if (!e.target.closest('.scanner-input-wrap')) { var sg = document.getElementById('search-suggestions'); if (sg) sg.classList.remove('open'); } });

  var modeBtns = document.querySelectorAll('.scan-mode-btn[data-mode]');
  for (var i = 0; i < modeBtns.length; i++) { (function(btn) { btn.addEventListener('click', function() { for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('active'); btn.classList.add('active'); S.searchMode = btn.dataset.mode; S.showAllResults = false; applyFilters(); }); })(modeBtns[i]); }

  var sensBtns = document.querySelectorAll('.sensitivity-btn');
  for (var i = 0; i < sensBtns.length; i++) { (function(btn) { btn.addEventListener('click', function() { for (var j = 0; j < sensBtns.length; j++) sensBtns[j].classList.remove('active'); btn.classList.add('active'); S.sensitivity = btn.dataset.sensitivity; S.showAllResults = false; applyFilters(); toast('🎚️ 감도: '+(SENSITIVITY_CONFIG[S.sensitivity]?SENSITIVITY_CONFIG[S.sensitivity].label:'')); }); })(sensBtns[i]); }

  var aiScan = document.getElementById('btn-ai-scan'); if (aiScan) aiScan.addEventListener('click', handleAIScan);
  var applyAi = document.getElementById('btn-apply-ai'); if (applyAi) applyAi.addEventListener('click', applyAIKeywords);
  var aiSelectAll = document.getElementById('btn-ai-select-all'); if (aiSelectAll) aiSelectAll.addEventListener('click', function() { var tags = document.querySelectorAll('#ai-panel-results .ai-kw-tag'); for (var i = 0; i < tags.length; i++) tags[i].classList.add('selected'); });
  var aiClose = document.getElementById('btn-ai-close'); if (aiClose) aiClose.addEventListener('click', function() { document.getElementById('ai-panel').classList.remove('open'); });
  var searchBtn = document.getElementById('btn-search'); if (searchBtn) searchBtn.addEventListener('click', function() { var sg = document.getElementById('search-suggestions'); if (sg) sg.classList.remove('open'); clearTimeout(debounceTimer); S.showAllResults = false; applyFilters(); });
  var filterToggle = document.getElementById('btn-filter-toggle'); if (filterToggle) filterToggle.addEventListener('click', function() { document.getElementById('filters-grid').classList.toggle('open'); filterToggle.classList.toggle('active'); });
  var sortSel = document.getElementById('sort-select'); if (sortSel) sortSel.addEventListener('change', applyFilters);
  var rowsSel = document.getElementById('rows-select'); if (rowsSel) rowsSel.addEventListener('change', function() { S.rows = parseInt(rowsSel.value); S.page = 1; renderList(); });
  var csvBtn = document.getElementById('btn-csv'); if (csvBtn) csvBtn.addEventListener('click', function() { downloadCSV(false); });
  var shareBtn = document.getElementById('btn-share'); if (shareBtn) shareBtn.addEventListener('click', shareLink);
  var resetBtn = document.getElementById('btn-reset-inline'); if (resetBtn) resetBtn.addEventListener('click', function() { S.showAllResults = false; resetAll(true); });

  var viewBtns = document.querySelectorAll('.view-btn');
  for (var i = 0; i < viewBtns.length; i++) { (function(btn) { btn.addEventListener('click', function() { for (var j = 0; j < viewBtns.length; j++) viewBtns[j].classList.remove('active'); btn.classList.add('active'); if (btn.dataset.view) { S.viewMode = btn.dataset.view; renderList(); } }); })(viewBtns[i]); }

  var checkAll = document.getElementById('check-all');
  if (checkAll) checkAll.addEventListener('change', function() { var ids = getPageData().map(function(c) { return c.id; }); for (var i = 0; i < ids.length; i++) { if (checkAll.checked) S.selectedIds.add(ids[i]); else S.selectedIds.delete(ids[i]); } renderList(); updateFAB(); });

  var fabCsv = document.getElementById('fab-csv'); if (fabCsv) fabCsv.addEventListener('click', function() { downloadCSV(true); });
  var fabLink = document.getElementById('fab-link'); if (fabLink) fabLink.addEventListener('click', function() { var links = []; S.selectedIds.forEach(function(id) { var c = S.courses.find(function(x){return x.id===id;}); if(c) links.push(buildCourseUrl(c)); }); navigator.clipboard.writeText(links.join('\n')); toast('🔗 '+links.length+'개 복사'); });
  var fabClear = document.getElementById('fab-clear'); if (fabClear) fabClear.addEventListener('click', function() { S.selectedIds.clear(); renderList(); updateFAB(); });

  var spOverlay = document.getElementById('side-panel-overlay'); if (spOverlay) spOverlay.addEventListener('click', function(e) { if (e.target === spOverlay) closeSidePanel(); });
  var spClose = document.getElementById('sp-close'); if (spClose) spClose.addEventListener('click', closeSidePanel);

  document.addEventListener('click', function(e) { if (e.target.closest('.ms-wrap')) return; if (e.target.closest('.filter-chip-x')) return; var panels = document.querySelectorAll('.ms-panel.open'); for (var i = 0; i < panels.length; i++) panels[i].classList.remove('open'); });

  applyURLParams();

  if (S.selectedFamilies && S.selectedFamilies.length > 0 && !document.getElementById('search-input').value.trim()) {
    var jobKeywords = [];
    for (var fi = 0; fi < S.selectedFamilies.length; fi++) { var famData = CURATION[S.selectedFamilies[fi]]; if (famData) { var nameWords = famData.name.split(/[\/·,\s]+/); for (var ni = 0; ni < nameWords.length; ni++) { var w = nameWords[ni].trim(); if (w.length >= 2 && jobKeywords.indexOf(w) === -1) jobKeywords.push(w); } } }
    if (jobKeywords.length > 0) { document.getElementById('search-input').value = jobKeywords.join(', '); S.searchMode = 'or'; var mbs = document.querySelectorAll('.scan-mode-btn[data-mode]'); for (var mi = 0; mi < mbs.length; mi++) { mbs[mi].classList.remove('active'); if (mbs[mi].getAttribute('data-mode') === 'or') mbs[mi].classList.add('active'); } }
  }

  applyFilters();

  // 헤더 로고 3번 클릭 → 관리자 모드
  var clickCount = 0;
  var headerTitle = document.getElementById('header-title');
  if (headerTitle) headerTitle.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    clickCount++; setTimeout(function() { clickCount = 0; }, 1000);
    if (clickCount === 3) { document.getElementById('app-container').style.display = 'none'; enterAdminMode(); clickCount = 0; }
  });

  var helpBtn = document.getElementById('btn-help'); if (helpBtn) helpBtn.addEventListener('click', function() { document.getElementById('help-overlay').classList.add('active'); });
  var helpClose = document.getElementById('help-close'); if (helpClose) helpClose.addEventListener('click', function() { document.getElementById('help-overlay').classList.remove('active'); });
  var helpOverlay = document.getElementById('help-overlay'); if (helpOverlay) helpOverlay.addEventListener('click', function(e) { if (e.target === helpOverlay) helpOverlay.classList.remove('active'); });

  var backGateBtn = document.getElementById('btn-back-gate');
  if (backGateBtn) backGateBtn.addEventListener('click', function() {
    if (confirm('처음 화면으로 돌아가시겠습니까?\n현재 검색 상태가 초기화됩니다.')) {
      document.getElementById('app-container').style.display = 'none';
      document.getElementById('gate-page').style.display = '';
      document.getElementById('gate-step-2').classList.remove('active');
      document.getElementById('gate-step-1').classList.add('active');
      var selectedCards = document.querySelectorAll('.gate-job-card.selected');
      for (var i = 0; i < selectedCards.length; i++) selectedCards[i].classList.remove('selected');
      resetAll(false);
    }
  });

  var csvModalClose = document.getElementById('csv-modal-close'); if (csvModalClose) csvModalClose.addEventListener('click', function() { document.getElementById('csv-modal-overlay').classList.remove('active'); });
  var csvModalOverlay = document.getElementById('csv-modal-overlay'); if (csvModalOverlay) csvModalOverlay.addEventListener('click', function(e) { if (e.target === csvModalOverlay) csvModalOverlay.classList.remove('active'); });

  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && !e.target.matches('input,textarea,select')) { e.preventDefault(); if (searchInput) searchInput.focus(); }
    if (e.key === 'Escape') { closeSidePanel(); var ho = document.getElementById('help-overlay'); if (ho) ho.classList.remove('active'); var ap = document.getElementById('ai-panel'); if (ap) ap.classList.remove('open'); var sg = document.getElementById('search-suggestions'); if (sg) sg.classList.remove('open'); var cm = document.getElementById('csv-modal-overlay'); if (cm) cm.classList.remove('active'); }
    if (!e.target.matches('input,textarea,select')) { if (e.key === 'ArrowLeft' && S.page > 1) { S.page--; renderList(); } if (e.key === 'ArrowRight') { var tp = Math.ceil(S.filtered.length/S.rows); if (S.page < tp) { S.page++; renderList(); } } }
  });

  var welcomeMsg = '🚀 탐험가님, ' + S.subdomain + ' 우주에 도착했습니다! ' + S.courses.length.toLocaleString() + '개의 별이 기다리고 있어요.';
  var tips = [ welcomeMsg, '🔍 띄어쓰기는 AND 검색! "AI 영업" → AI와 영업이 모두 포함된 강의만 표시됩니다.', '🤖 AI 내비로 키워드를 확장해보세요! 단, 5개 미만이 최적의 품질을 보장합니다.', '🎚️ 검색 결과가 너무 적으면 감도를 🔭 광역으로, 너무 많으면 🔬 정밀로 조절하세요.', '📋 강의를 체크하고 📋 미션 보고서로 CSV 다운로드할 수 있어요!', '🇰🇷 한국어로 검색하면 자동으로 영어 번역도 함께 검색됩니다.', '⌨️ / 키를 누르면 검색창으로 바로 이동! Esc로 패널을 닫을 수 있어요.', '🛸 미션 센터에서 직무별 맞춤 강의를 탐색해보세요!', '⭐ 강의 제목을 클릭하면 상세 정보 + 한국어 번역을 볼 수 있어요.', '🔗 공유 링크로 동료에게 검색 조건을 공유할 수 있습니다.', '📅 업데이트 필터로 최신 강의만 골라볼 수 있어요!', '📊 AND 모드는 정확한 결과, OR 모드는 더 많은 결과를 보여줍니다.', '💡 "AI 영업"처럼 검색하면 뒤쪽 키워드(영업)에 더 높은 가중치가 부여됩니다.' ];
  var tipIndex = 0; var tipsText = document.getElementById('tips-text');
  if (tipsText) { tipsText.textContent = tips[0]; setInterval(function() { tipsText.classList.add('fade'); setTimeout(function() { tipIndex = (tipIndex + 1) % tips.length; tipsText.textContent = tips[tipIndex]; tipsText.classList.remove('fade'); }, 400); }, 6000); }
}

function switchTab(tabId) { var panels = document.querySelectorAll('.tab-panel'); for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active'); var panel = document.getElementById('panel-'+tabId); if (panel) panel.classList.add('active'); var listSection = document.getElementById('list-section'); if (listSection) listSection.style.display = (tabId === 'stars') ? 'none' : ''; }

function showSearchSuggestions(query) {
  var container = document.getElementById('search-suggestions'); if (!container) return;
  if (query.length < 2) { container.classList.remove('open'); return; }
  var ql = query.toLowerCase();
  var titleMatches = [], catSet = new Set(), topicSet = new Set(), koEnSuggestions = [];
  for (var i = 0; i < S.courses.length; i++) {
    var c = S.courses[i];
    var searchTitle = (c.title || '') + (c._titleTranslated ? ' ' + c._titleTranslated : '');
    if (searchTitle.toLowerCase().indexOf(ql) !== -1) titleMatches.push(c);
    if (c.category && c.category.toLowerCase().indexOf(ql) !== -1) catSet.add(c.category.split(',')[0].trim());
    if (c.topic && c.topic.toLowerCase().indexOf(ql) !== -1) topicSet.add(c.topic.split('|')[0].trim());
  }
  titleMatches.sort(function(a,b) { return (b.enrollments||0)-(a.enrollments||0); });
  titleMatches = titleMatches.slice(0, 3);
  var catMatches = Array.from(catSet).filter(Boolean).slice(0, 2);
  var topicMatches = Array.from(topicSet).filter(Boolean).slice(0, 2);
  var entries = Object.entries(KO_EN_MAP);
  for (var i = 0; i < entries.length; i++) { var ko = entries[i][0], enList = entries[i][1]; var match = ko.indexOf(ql) !== -1; if (!match) { for (var j = 0; j < enList.length; j++) { if (enList[j].indexOf(ql) !== -1) { match = true; break; } } } if (match) koEnSuggestions.push({ ko: ko, en: enList[0] }); }
  var html = '';
  if (titleMatches.length > 0) { html += '<div class="suggestion-category">🔥 인기 강의</div>'; for (var i = 0; i < titleMatches.length; i++) { var c = titleMatches[i]; var dt = c._titleTranslated ? c._titleTranslated : c.title; html += '<div class="suggestion-item" data-course-id="'+c.id+'"><span class="suggestion-icon">📖</span><span class="suggestion-text">'+(dt.length>50?dt.substring(0,50)+'...':dt)+'</span><span class="suggestion-badge">⭐'+(c.rating?c.rating.toFixed(1):'-')+'</span></div>'; } }
  if (catMatches.length > 0) { html += '<div class="suggestion-category">🌌 카테고리</div>'; for (var i = 0; i < catMatches.length; i++) html += '<div class="suggestion-item" data-category="'+catMatches[i]+'"><span class="suggestion-icon">'+getCatEmoji(catMatches[i])+'</span><span class="suggestion-text">'+catMatches[i]+'</span><span class="suggestion-badge">카테고리 필터</span></div>'; }
  if (topicMatches.length > 0) { html += '<div class="suggestion-category">💡 주제</div>'; for (var i = 0; i < topicMatches.length; i++) html += '<div class="suggestion-item" data-topic="'+topicMatches[i]+'"><span class="suggestion-icon">🏷️</span><span class="suggestion-text">'+topicMatches[i]+'</span></div>'; }
  if (koEnSuggestions.length > 0) { html += '<div class="suggestion-category">🌐 번역 제안</div>'; for (var i = 0; i < Math.min(2, koEnSuggestions.length); i++) html += '<div class="suggestion-item" data-keyword="'+koEnSuggestions[i].en+'"><span class="suggestion-icon">🔄</span><span class="suggestion-text">'+koEnSuggestions[i].ko+' → '+koEnSuggestions[i].en+'</span></div>'; }
  if (!html) { container.classList.remove('open'); return; }
  container.innerHTML = html; container.classList.add('open');
  var items = container.querySelectorAll('.suggestion-item');
  for (var i = 0; i < items.length; i++) { (function(item) { item.addEventListener('click', function() {
    if (item.dataset.courseId) { var course = S.courses.find(function(x){return x.id===item.dataset.courseId;}); if (course) openSidePanel(course); }
    else if (item.dataset.category) { setMSValues('f-category',[item.dataset.category]); applyFilters(); }
    else if (item.dataset.topic) { document.getElementById('search-input').value = item.dataset.topic; applyFilters(); }
    else if (item.dataset.keyword) { var cur = document.getElementById('search-input').value.trim(); document.getElementById('search-input').value = cur ? cur+', '+item.dataset.keyword : item.dataset.keyword; applyFilters(); }
    container.classList.remove('open');
  }); })(items[i]); }
}

function parseTempList(text) {
  var log = document.getElementById('temp-log');
  if (log) log.innerHTML = '<div class="log-entry log-info">📋 파싱 중...</div>';
  var lines = text.split('\n').filter(function(l) { return l.trim().length > 0; });
  if (lines.length < 2) { if (log) log.innerHTML += '<div class="log-entry log-error">❌ 최소 2줄 필요</div>'; return; }
  var separator = lines[0].indexOf('\t') !== -1 ? '\t' : ',';
  var headers = lines[0].split(separator).map(function(h) { return h.trim().toLowerCase().replace(/"/g, '').replace(/\s+/g, ''); });
  var titleIdx=-1, titleTransIdx=-1, catIdx=-1, subCatIdx=-1, descIdx=-1, descTransIdx=-1;
  var headlineIdx=-1, headlineTransIdx=-1, langIdx=-1, idIdx=-1, diffIdx=-1;
  var durationIdx=-1, ratingIdx=-1, enrollIdx=-1, updatedIdx=-1;
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (h==='title'||h==='제목'||h==='강의명') titleIdx = i;
    else if (h==='강의명번역'||h==='title_kr'||h==='titletranslated') titleTransIdx = i;
    else if (h==='category'||h==='카테고리'||h==='분류') catIdx = i;
    else if (h==='subcategory'||h==='서브카테고리'||h==='소분류') subCatIdx = i;
    else if (h==='description'||h==='설명'||h==='상세설명') descIdx = i;
    else if (h==='설명번역'||h==='description_kr') descTransIdx = i;
    else if (h==='headline'||h==='소개'||h==='강의소개'||h==='강의개요') headlineIdx = i;
    else if (h==='강의개요번역'||h==='headline_kr') headlineTransIdx = i;
    else if (h==='language'||h==='언어') langIdx = i;
    else if (h==='id'||h==='강의id') idIdx = i;
    else if (h==='#'||h==='no') { if (idIdx === -1) idIdx = i; }
    else if (h==='difficulty'||h==='난이도'||h==='level') diffIdx = i;
    else if (h==='duration'||h==='수강시간'||h==='수강시간(h)'||h==='시간') durationIdx = i;
    else if (h==='rating'||h==='평점') ratingIdx = i;
    else if (h==='enrollments'||h==='수강생'||h==='리뷰수') enrollIdx = i;
    else if (h==='updated'||h==='최근업데이트'||h==='업데이트') updatedIdx = i;
  }
  if (titleIdx === -1) { if (log) log.innerHTML += '<div class="log-entry log-error">❌ title/강의명 컬럼 없음<br>헤더: ' + headers.join(', ') + '</div>'; return; }
  var courses = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = [];
    if (separator === ',') { var line = lines[i]; var inQuote = false; var current = ''; for (var j = 0; j < line.length; j++) { if (line[j] === '"') { inQuote = !inQuote; } else if (line[j] === ',' && !inQuote) { cols.push(current.trim()); current = ''; } else { current += line[j]; } } cols.push(current.trim()); }
    else { cols = lines[i].split(separator).map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); }
    var title = titleIdx < cols.length ? cols[titleIdx] : '';
    if (!title) continue;
    var titleTrans = titleTransIdx !== -1 && titleTransIdx < cols.length ? cols[titleTransIdx] : '';
    var headlineTrans = headlineTransIdx !== -1 && headlineTransIdx < cols.length ? cols[headlineTransIdx] : '';
    var descTrans = descTransIdx !== -1 && descTransIdx < cols.length ? cols[descTransIdx] : '';
    var headline = headlineIdx !== -1 && headlineIdx < cols.length ? cols[headlineIdx] : '';
    var desc = descIdx !== -1 && descIdx < cols.length ? cols[descIdx] : '';
    var durationMin = 0;
    if (durationIdx !== -1 && durationIdx < cols.length) durationMin = Math.round((parseFloat(cols[durationIdx]) || 0) * 60);
    courses.push({
      id: idIdx !== -1 && idIdx < cols.length ? String(cols[idIdx]) : 'temp_' + i,
      title: title,
      category: catIdx !== -1 && catIdx < cols.length ? cols[catIdx] : '',
      topic: (subCatIdx !== -1 && subCatIdx < cols.length ? cols[subCatIdx] : '') + (titleTrans ? ' | ' + titleTrans : ''),
      description: desc + (descTrans ? ' ' + descTrans : ''),
      headline: headline + (headlineTrans ? ' ' + headlineTrans : ''),
      language: langIdx !== -1 && langIdx < cols.length ? cols[langIdx] : 'ja',
      instructor: '', difficulty: diffIdx !== -1 && diffIdx < cols.length ? (cols[diffIdx] || 'All Levels') : 'All Levels',
      objectives: '', subtitles: '',
      lastUpdated: updatedIdx !== -1 && updatedIdx < cols.length ? (cols[updatedIdx] || '') : new Date().toISOString(),
      url: '', image: '', contentLength: durationMin,
      rating: ratingIdx !== -1 && ratingIdx < cols.length ? (parseFloat(cols[ratingIdx]) || 0) : 0,
      enrollments: enrollIdx !== -1 && enrollIdx < cols.length ? (parseInt(String(cols[enrollIdx]).replace(/,/g, '')) || 0) : 0,
      isNew: false, _titleTranslated: titleTrans, _headlineTranslated: headlineTrans, _descTranslated: descTrans, _search: '', _score: 0
    });
  }
  if (courses.length === 0) { if (log) log.innerHTML += '<div class="log-entry log-error">❌ 파싱된 강의 없음</div>'; return; }
  if (!S._originalCourses) S._originalCourses = S.courses.slice();
  S.courses = courses;
  var restoreBtn = document.getElementById('btn-temp-restore'); if (restoreBtn) restoreBtn.style.display = '';
  if (log) {
    log.innerHTML += '<div class="log-entry log-success">✅ ' + courses.length + '개 로드!</div>';
    log.innerHTML += '<div class="log-entry log-info">' + (titleIdx !== -1 ? '강의명✅ ' : '') + (titleTransIdx !== -1 ? '강의명번역✅ ' : '') + (catIdx !== -1 ? '카테고리✅ ' : '') + (subCatIdx !== -1 ? '서브카테고리✅ ' : '') + (headlineIdx !== -1 ? '강의개요✅ ' : '') + (headlineTransIdx !== -1 ? '강의개요번역✅ ' : '') + (diffIdx !== -1 ? '난이도✅ ' : '') + (durationIdx !== -1 ? '수강시간✅ ' : '') + (ratingIdx !== -1 ? '평점✅ ' : '') + (enrollIdx !== -1 ? '리뷰수✅ ' : '') + (updatedIdx !== -1 ? '업데이트✅ ' : '') + '</div>';
    if (titleTransIdx !== -1) log.innerHTML += '<div class="log-entry log-success">🌐 번역 컬럼 감지! 한국어 검색 가능</div>';
    log.innerHTML += '<div class="log-entry log-info">샘플: ' + courses[0].title.substring(0, 50) + '</div>';
    if (courses[0]._titleTranslated) log.innerHTML += '<div class="log-entry log-info">번역: ' + courses[0]._titleTranslated.substring(0, 50) + '</div>';
  }
  toast('📋 임시 목록 ' + courses.length + '개 로드!' + (titleTransIdx !== -1 ? ' (번역 포함)' : ''));
}
