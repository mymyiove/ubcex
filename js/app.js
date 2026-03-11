// ═══════════════════════════════════════════════════════════
// app.js — 앱 초기화, 게이트, 워프, 관리자 모드, chunk 직접 로딩
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

  if (sub === ADMIN_CODE) {
    enterAdminMode();
    return;
  }

  S.subdomain = sub;
  localStorage.setItem('kv_subdomain', sub);
  $('#gate-step-1').classList.remove('active');
  $('#gate-step-2').classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// 관리자 모드
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
        <button class="admin-exit-btn" id="admin-exit" title="일반 모드로 돌아갑니다">🚪 나가기</button>
      </div>

      <div class="admin-status-cards">
        <div class="admin-card">
          <div class="admin-card-icon">📡</div>
          <div class="admin-card-title">동기화 상태</div>
          <div class="admin-card-value" id="sync-status-value">확인 중...</div>
          <div class="admin-card-sub" id="sync-status-sub"></div>
        </div>
        <div class="admin-card">
          <div class="admin-card-icon">📚</div>
          <div class="admin-card-title">총 강의 수</div>
          <div class="admin-card-value" id="courses-count-value">-</div>
          <div class="admin-card-sub" id="courses-count-sub"></div>
        </div>
        <div class="admin-card">
          <div class="admin-card-icon">📦</div>
          <div class="admin-card-title">Chunk 수</div>
          <div class="admin-card-value" id="chunks-count-value">-</div>
          <div class="admin-card-sub">데이터 분할 저장 단위</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-icon">🔑</div>
          <div class="admin-card-title">API 상태</div>
          <div class="admin-card-value" id="api-status-value">확인 중...</div>
          <div class="admin-card-sub" id="api-status-sub"></div>
        </div>
      </div>

      <div class="admin-sections">
        <div class="admin-section">
          <h3>📡 강의 동기화</h3>
          <p class="admin-desc">Udemy Business GraphQL API에서 강의 데이터를 가져옵니다.</p>
          <div class="admin-btn-group">
            <button class="admin-btn admin-btn-primary" id="btn-sync-continue" title="마지막 지점부터 이어서">▶️ 이어서 동기화</button>
            <button class="admin-btn admin-btn-warning" id="btn-sync-reset" title="처음부터 다시">🔄 전체 재동기화</button>
            <button class="admin-btn admin-btn-danger" id="btn-sync-auto" title="완료될 때까지 자동 반복">🚀 자동 전체 동기화</button>
          </div>
          <div class="admin-log" id="sync-log"></div>
        </div>

        <div class="admin-section">
          <h3>🔍 데이터 검증</h3>
          <p class="admin-desc">저장된 강의 데이터의 품질을 확인합니다.</p>
          <div class="admin-btn-group">
            <button class="admin-btn" id="btn-verify-data" title="데이터 현황 확인">📊 데이터 현황</button>
            <button class="admin-btn" id="btn-verify-sample" title="샘플 데이터 확인">📋 샘플 보기</button>
          </div>
          <div class="admin-log" id="verify-log"></div>
        </div>

        <div class="admin-section">
          <h3>🔑 API 테스트</h3>
          <p class="admin-desc">외부 API 연결 상태를 확인합니다.</p>
          <div class="admin-btn-group">
            <button class="admin-btn" id="btn-test-graphql" title="GraphQL 토큰 테스트">🔐 GraphQL 테스트</button>
            <button class="admin-btn" id="btn-test-gemini" title="Gemini AI 테스트">🤖 Gemini 테스트</button>
          </div>
          <div class="admin-log" id="api-log"></div>
        </div>

        <div class="admin-section">
          <h3>📋 로우 데이터 조회</h3>
          <p class="admin-desc">특정 chunk의 강의 데이터를 직접 확인합니다.</p>
          <div class="admin-btn-group" style="align-items:center;">
            <label style="color:var(--text-secondary);font-size:0.85rem;">Chunk:</label>
            <input type="number" id="chunk-number" value="0" min="0" max="50" style="width:60px;padding:0.4rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);text-align:center;" />
            <button class="admin-btn" id="btn-view-chunk" title="조회">🔍 조회</button>
          </div>
          <div class="admin-log" id="raw-log"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(adminPanel);

  $('#admin-exit').addEventListener('click', exitAdminMode);
  $('#btn-sync-continue').addEventListener('click', () => runSync(false));
  $('#btn-sync-reset').addEventListener('click', () => {
    if (confirm('⚠️ 모든 데이터를 삭제하고 처음부터 다시 동기화합니다. 계속?')) runSync(true);
  });
  $('#btn-sync-auto').addEventListener('click', runAutoSync);
  $('#btn-verify-data').addEventListener('click', verifyData);
  $('#btn-verify-sample').addEventListener('click', verifySample);
  $('#btn-test-graphql').addEventListener('click', testGraphQL);
  $('#btn-test-gemini').addEventListener('click', testGemini);
  $('#btn-view-chunk').addEventListener('click', viewChunk);

  loadAdminStatus();
  toast('🔧 관리자 모드에 진입했습니다.');
}

function exitAdminMode() {
  const panel = $('#admin-panel');
  if (panel) panel.remove();
  $('#gate-page').style.display = '';
  $('#input-subdomain').value = '';
  $('#subdomain-preview').textContent = '';
  $('#subdomain-preview').style.color = 'var(--success)';
}

async function loadAdminStatus() {
  try {
    const res = await fetch(`${WORKER_URL}/status`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
    const data = await res.json();
    $('#sync-status-value').textContent = data.isComplete ? '✅ 완료' : data.synced ? '⏳ 진행 중' : '❌ 미완료';
    $('#sync-status-sub').textContent = data.syncedAt ? `마지막: ${new Date(data.syncedAt).toLocaleString('ko-KR')}` : '기록 없음';
    $('#courses-count-value').textContent = (data.totalCount || 0).toLocaleString();
    $('#courses-count-sub').textContent = data.isComplete ? '완료' : '진행 중';
    $('#chunks-count-value').textContent = data.totalChunks || 0;
  } catch (e) {
    $('#sync-status-value').textContent = '❌ 연결 실패';
  }

  try {
    const tokenRes = await fetch(`${WORKER_URL}/test-token`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
    const tokenData = await tokenRes.json();
    $('#api-status-value').textContent = tokenData.success ? '✅ 정상' : '❌ 오류';
    $('#api-status-sub').textContent = tokenData.success ? 'GraphQL 토큰 OK' : '토큰 실패';
  } catch (e) {
    $('#api-status-value').textContent = '❌ 연결 실패';
  }
}

async function runSync(isReset) {
  const log = $('#sync-log');
  log.innerHTML = `<div class="log-entry log-info">📡 ${isReset ? '전체 재동기화' : '이어서 동기화'} 시작...</div>`;
  try {
    const res = await fetch(`${WORKER_URL}/sync${isReset ? '?reset=true' : ''}`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
    const data = await res.json();
    log.innerHTML += `<div class="log-entry ${data.success ? 'log-success' : 'log-error'}">${data.success ? '✅' : '❌'} ${data.message || data.error}</div>`;
  } catch (e) {
    log.innerHTML += `<div class="log-entry log-error">❌ 통신 오류: ${e.message}</div>`;
  }
  loadAdminStatus();
}

async function runAutoSync() {
  const log = $('#sync-log');
  const btn = $('#btn-sync-auto');
  btn.disabled = true;
  btn.textContent = '⏳ 진행 중...';
  log.innerHTML = `<div class="log-entry log-info">🚀 자동 전체 동기화 시작...</div>`;

  let cycle = 1;
  let keepGoing = true;

  while (keepGoing) {
    log.innerHTML += `<div class="log-entry log-info">📡 [사이클 ${cycle}] 수집 중...</div>`;
    log.scrollTop = log.scrollHeight;
    try {
      const endpoint = cycle === 1 ? `${WORKER_URL}/sync?reset=true` : `${WORKER_URL}/sync`;
      const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
      const data = await res.json();
      if (data.error) { log.innerHTML += `<div class="log-entry log-error">❌ ${data.error}</div>`; break; }
      log.innerHTML += `<div class="log-entry log-success">✅ ${data.message}</div>`;
      if (data.stoppedByTimeout) {
        log.innerHTML += `<div class="log-entry log-info">⏳ 2초 대기...</div>`;
        await new Promise(r => setTimeout(r, 2000));
        cycle++;
      } else {
        log.innerHTML += `<div class="log-entry log-success">🎉 완료! 총 ${data.totalCount}개</div>`;
        keepGoing = false;
      }
    } catch (e) {
      log.innerHTML += `<div class="log-entry log-error">❌ ${e.message}</div>`;
      break;
    }
    log.scrollTop = log.scrollHeight;
  }
  btn.disabled = false;
  btn.textContent = '🚀 자동 전체 동기화';
  loadAdminStatus();
}

async function verifyData() {
  const log = $('#verify-log');
  log.innerHTML = `<div class="log-entry log-info">🔍 검증 시작...</div>`;
  let chunk = 0, total = 0, subsCount = 0, koSubCount = 0, durCount = 0, ratingCount = 0, enrollCount = 0;
  while (true) {
    try {
      const res = await fetch(`${WORKER_URL}/get-courses?chunk=${chunk}`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
      if (!res.ok) break;
      const data = await res.json();
      if (!data || !Array.isArray(data) || data.length === 0) break;
      total += data.length;
      subsCount += data.filter(c => c.subtitles && c.subtitles !== '없음' && c.subtitles !== '').length;
      koSubCount += data.filter(c => c.subtitles && c.subtitles.toLowerCase().includes('ko')).length;
      durCount += data.filter(c => c.contentLength && typeof c.contentLength === 'number' && c.contentLength > 0).length;
      ratingCount += data.filter(c => c.rating && c.rating > 0).length;
      enrollCount += data.filter(c => c.enrollments && c.enrollments > 0).length;
      chunk++;
    } catch (e) { break; }
  }
  const pct = (n) => total > 0 ? `${(n / total * 100).toFixed(1)}%` : '0%';
  log.innerHTML += `<div class="log-entry log-success"><strong>📊 결과</strong><br>📚 총: ${total.toLocaleString()}개 (${chunk} chunks)<br>💬 자막: ${subsCount.toLocaleString()} (${pct(subsCount)})<br>🇰🇷 한국어자막: ${koSubCount.toLocaleString()} (${pct(koSubCount)})<br>⏱️ 시간: ${durCount.toLocaleString()} (${pct(durCount)})<br>⭐ 평점: ${ratingCount.toLocaleString()} (${pct(ratingCount)})<br>👥 수강: ${enrollCount.toLocaleString()} (${pct(enrollCount)})</div>`;
}

async function verifySample() {
  const log = $('#verify-log');
  log.innerHTML = `<div class="log-entry log-info">📋 샘플 로드 중...</div>`;
  try {
    const res = await fetch(`${WORKER_URL}/get-courses?chunk=0`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
    const data = await res.json();
    if (!data || data.length === 0) { log.innerHTML += `<div class="log-entry log-error">❌ 데이터 없음</div>`; return; }
    const s = data[0];
    log.innerHTML += `<div class="log-entry"><strong>필드:</strong> ${Object.keys(s).join(', ')}<br>${Object.entries(s).map(([k, v]) => `<strong>${k}:</strong> ${typeof v === 'string' && v.length > 80 ? v.substring(0, 80) + '...' : v}`).join('<br>')}</div>`;
    const withSubs = data.filter(c => c.subtitles && c.subtitles !== '없음' && c.subtitles !== '');
    log.innerHTML += `<div class="log-entry log-success">💬 자막 있는 강의: ${withSubs.length}/${data.length}개<br>${withSubs.slice(0, 3).map(c => `- ${c.title?.substring(0, 35)}: [${c.subtitles}]`).join('<br>')}</div>`;
  } catch (e) { log.innerHTML += `<div class="log-entry log-error">❌ ${e.message}</div>`; }
}

async function testGraphQL() {
  const log = $('#api-log');
  log.innerHTML = `<div class="log-entry log-info">🔐 테스트 중...</div>`;
  try {
    const res = await fetch(`${WORKER_URL}/test-token`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
    const data = await res.json();
    log.innerHTML += `<div class="log-entry ${data.success ? 'log-success' : 'log-error'}">${data.success ? '✅ 토큰 발급 성공' : '❌ 실패: ' + data.error}</div>`;
  } catch (e) { log.innerHTML += `<div class="log-entry log-error">❌ ${e.message}</div>`; }
}

async function testGemini() {
  const log = $('#api-log');
  log.innerHTML = `<div class="log-entry log-info">🤖 테스트 중...</div>`;
  try {
    const res = await fetch('/api/ai-expand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'python' }) });
    const data = await res.json();
    log.innerHTML += `<div class="log-entry ${data.success ? 'log-success' : 'log-error'}">${data.success ? '✅ Gemini 연결 성공' : '❌ ' + (data.error || '실패')}</div>`;
  } catch (e) { log.innerHTML += `<div class="log-entry log-error">❌ ${e.message}</div>`; }
}

async function viewChunk() {
  const log = $('#raw-log');
  const num = $('#chunk-number').value || '0';
  log.innerHTML = `<div class="log-entry log-info">📋 Chunk ${num} 로드 중...</div>`;
  try {
    const res = await fetch(`${WORKER_URL}/get-courses?chunk=${num}`, { headers: { 'Authorization': `Bearer ${WORKER_SECRET}` } });
    if (!res.ok) { log.innerHTML += `<div class="log-entry log-error">❌ Chunk ${num} 없음</div>`; return; }
    const data = await res.json();
    log.innerHTML += `<div class="log-entry log-success"><strong>📦 Chunk ${num}: ${data.length}개</strong><br>${data.slice(0, 5).map((c, i) => `${i + 1}. <strong>${c.title?.substring(0, 45)}</strong> | ⭐${c.rating?.toFixed(1) || '-'} | 👥${c.enrollments || '-'} | 💬${c.subtitles || '없음'}`).join('<br>')}${data.length > 5 ? `<br>... 외 ${data.length - 5}개` : ''}</div>`;
  } catch (e) { log.innerHTML += `<div class="log-entry log-error">❌ ${e.message}</div>`; }
}

// ═══════════════════════════════════════════════════════════
// 일반 모드 — 워프 전환 + 프론트엔드 직접 chunk 로딩
// ═══════════════════════════════════════════════════════════
async function launch() {
  S.selectedFamilies = [...$$('.gate-job-card.selected')].map(c => c.dataset.family);
  const warp = $('#warp-overlay');
  warp.classList.add('active');
  const loadingPromise = playLaunchSequence();

  let dataLoaded = false;
  try {
    // ★ 프론트엔드에서 직접 Worker chunk 로딩 (Pages Function 우회)
    let allCourses = [];
    let chunkIndex = 0;

    while (true) {
      try {
        const chunkRes = await fetch(`${WORKER_URL}/get-courses?chunk=${chunkIndex}`, {
          headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
        });

        if (!chunkRes.ok) {
          if (chunkIndex === 0) {
            console.error('Worker 첫 chunk 로드 실패:', chunkRes.status);
          }
          break;
        }

        const chunkData = await chunkRes.json();
        if (!chunkData || !Array.isArray(chunkData) || chunkData.length === 0) break;

        allCourses = allCourses.concat(chunkData);
        chunkIndex++;

        // 로딩 메시지 업데이트
        const msgEl = $('#launch-message');
        if (msgEl) msgEl.textContent = `강의 데이터 로딩 중... (${allCourses.length.toLocaleString()}개)`;

        if (chunkIndex >= 50) break;
      } catch (e) {
        console.warn(`Chunk ${chunkIndex} 로드 실패:`, e.message);
        if (chunkIndex === 0) break;
        break;
      }
    }

    if (allCourses.length > 0) {
      S.courses = processCourses(allCourses);
      dataLoaded = true;
    }
  } catch (e) {
    console.error('데이터 로드 실패:', e);
  }

  await loadingPromise;

  if (!dataLoaded) {
    toast('강의 데이터를 불러올 수 없습니다. 관리자 모드에서 동기화 상태를 확인해주세요.', 'error');
    warp.classList.remove('active');
    return;
  }

  $('#launch-emoji').textContent = '🌟';
  $('#launch-message').textContent = '워프 점프!';
  $('#progress-fill').style.width = '100%';
  await new Promise(r => setTimeout(r, 600));

  warp.classList.remove('active');
  $('#gate-page').style.display = 'none';
  $('#app-container').style.display = 'block';
  initApp();
  toast(`🌌 탐험가님, ${S.subdomain} 우주에 도착했습니다! ${S.courses.length.toLocaleString()}개의 별이 빛나고 있습니다.`);
}

async function playLaunchSequence() {
  for (let i = 0; i < LAUNCH_STEPS.length; i++) {
    const step = LAUNCH_STEPS[i];
    $('#launch-emoji').textContent = step.emoji;
    $('#launch-message').textContent = step.message;
    $('#progress-fill').style.width = `${((i + 1) / (LAUNCH_STEPS.length + 1)) * 100}%`;
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
  }
}

// ═══════════════════════════════════════════════════════════
// 앱 초기화
// ═══════════════════════════════════════════════════════════
function initApp() {
  $('#welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? `${S.selectedFamilies.map(f => CURATION[f]?.emoji || '').join('')} 탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`
    : `탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`;

  renderDashCards();
  initMultiSelects();

  // ★ 카테고리 자동 필터 제거 — 이전 버그 원인

  // 탭 이벤트
  $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  // 검색
  let debounce;
  $('#search-input').addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(applyFilters, 300); });

  // 검색 모드
  $$('.scan-mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.searchMode = btn.dataset.mode;
      applyFilters();
    });
  });

  // ★ 감도 조절 버튼
  $$('.sensitivity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.sensitivity-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.sensitivity = btn.dataset.sensitivity;
      applyFilters();
      toast(`🎚️ 감도: ${SENSITIVITY_CONFIG[S.sensitivity]?.label}`);
    });
  });

  // AI 스캔
  $('#btn-ai-scan').addEventListener('click', handleAIScan);
  $('#btn-apply-ai').addEventListener('click', applyAIKeywords);
  $('#btn-ai-select-all').addEventListener('click', () => $$('#ai-panel-results .ai-kw-tag').forEach(t => t.classList.add('selected')));
  $('#btn-ai-close').addEventListener('click', () => $('#ai-panel').classList.remove('open'));

  // 필터 토글
  $('#filters-toggle').addEventListener('click', () => {
    $('#filters-toggle').classList.toggle('open');
    $('#filters-grid').classList.toggle('open');
  });

  // 정렬, 표시 개수
  $('#sort-select').addEventListener('change', applyFilters);
  $('#rows-select').addEventListener('change', () => { S.rows = parseInt($('#rows-select').value); S.page = 1; renderList(); });

  // 기능 버튼
  $('#btn-csv').addEventListener('click', () => downloadCSV(false));
  $('#btn-share').addEventListener('click', shareLink);
  $('#btn-reset').addEventListener('click', () => resetAll(true));

  // 뷰 모드 전환
  $$('.view-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.viewMode = btn.dataset.view;
    renderList();
  }));

  // 전체 선택 체크박스
  $('#check-all').addEventListener('change', (e) => {
    const pageIds = getPageData().map(c => c.id);
    if (e.target.checked) pageIds.forEach(id => S.selectedIds.add(id));
    else pageIds.forEach(id => S.selectedIds.delete(id));
    renderList();
    updateFAB();
  });

  // FAB 버튼
  $('#fab-csv').addEventListener('click', () => downloadCSV(true));
  $('#fab-link').addEventListener('click', () => {
    const links = [...S.selectedIds].map(id => {
      const c = S.courses.find(x => x.id === id);
      return c ? buildCourseUrl(c) : '';
    }).filter(Boolean);
    navigator.clipboard.writeText(links.join('\n'));
    toast(`🔗 ${links.length}개 별의 좌표가 복사되었습니다.`);
  });
  $('#fab-clear').addEventListener('click', () => { S.selectedIds.clear(); renderList(); updateFAB(); });

  // 사이드 패널
  $('#side-panel-overlay').addEventListener('click', (e) => { if (e.target === $('#side-panel-overlay')) closeSidePanel(); });
  $('#sp-close').addEventListener('click', closeSidePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidePanel(); });

  // 멀티셀렉트 외부 클릭 닫기
  window.addEventListener('click', e => { if (!e.target.closest('.ms-wrap')) $$('.ms-panel').forEach(p => p.classList.remove('open')); });

  // 미션 센터
  initMissionCenter();

  // TOP 6
  initStars();

  // URL 파라미터 적용
  applyURLParams();

  // 첫 필터링
  applyFilters();
}

// 탭 전환
function switchTab(tabId) {
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $(`#panel-${tabId}`).classList.add('active');
  $(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  $('#list-section').style.display = tabId === 'stars' ? 'none' : '';
