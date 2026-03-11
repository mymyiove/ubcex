// ═══════════════════════════════════════════════════════════
// app.js — 앱 초기화, 게이트 페이지, 워프 전환, 관리자 모드
// ═══════════════════════════════════════════════════════════

const ADMIN_CODE = 'jhj11';
const WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
const WORKER_SECRET = 'gogo1014';

document.addEventListener('DOMContentLoaded', () => {
  // 저장된 서브도메인 로드
  const saved = localStorage.getItem('kv_subdomain');
  if (saved && saved !== ADMIN_CODE) {
    $('#input-subdomain').value = saved;
    $('#gate-history').innerHTML = `💡 이전 모선: <a id="quick-launch">${saved}</a>`;
    $('#quick-launch')?.addEventListener('click', () => { $('#input-subdomain').value = saved; goStep2(); });
  }

  // 서브도메인 미리보기
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

  // Step 1 → Step 2 또는 관리자 모드
  $('#btn-step1-next').addEventListener('click', goStep2);
  $('#input-subdomain').addEventListener('keyup', e => { if(e.key==='Enter') goStep2(); });

  // 직무 선택 그리드 생성
  const grid = $('#gate-job-grid');
  Object.entries(CURATION).forEach(([id, data]) => {
    const card = document.createElement('div');
    card.className = 'gate-job-card';
    card.dataset.family = id;
    card.innerHTML = `<span class="emoji">${data.emoji}</span><span class="label">${data.name}</span>`;
    card.addEventListener('click', () => card.classList.toggle('selected'));
    grid.appendChild(card);
  });

  // 출발 버튼
  $('#btn-launch').addEventListener('click', launch);
  $('#btn-skip').addEventListener('click', launch);

  // 스크롤 투 탑
  window.addEventListener('scroll', () => { $('#scroll-to-top').classList.toggle('visible', window.scrollY > 300); });
  $('#scroll-to-top').addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
});

function goStep2() {
  const sub = $('#input-subdomain').value.trim();
  if (!sub) { toast('모선 주소를 입력해주세요.', 'error'); return; }
  
  // ★ 관리자 모드 체크
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
  
  // 관리자 패널 생성
  const adminPanel = document.createElement('div');
  adminPanel.id = 'admin-panel';
  adminPanel.innerHTML = `
    <div class="admin-container">
      <div class="admin-header">
        <h1>🔧 관리자 콘솔</h1>
        <p class="admin-subtitle">Udemy Business Course Explorer — 시스템 관리</p>
        <button class="admin-exit-btn" id="admin-exit" title="일반 모드로 돌아갑니다">🚪 나가기</button>
      </div>

      <!-- 상태 카드 -->
      <div class="admin-status-cards" id="admin-status-cards">
        <div class="admin-card" id="card-sync">
          <div class="admin-card-icon">📡</div>
          <div class="admin-card-title">동기화 상태</div>
          <div class="admin-card-value" id="sync-status-value">확인 중...</div>
          <div class="admin-card-sub" id="sync-status-sub"></div>
        </div>
        <div class="admin-card" id="card-courses">
          <div class="admin-card-icon">📚</div>
          <div class="admin-card-title">총 강의 수</div>
          <div class="admin-card-value" id="courses-count-value">-</div>
          <div class="admin-card-sub" id="courses-count-sub"></div>
        </div>
        <div class="admin-card" id="card-chunks">
          <div class="admin-card-icon">📦</div>
          <div class="admin-card-title">Chunk 수</div>
          <div class="admin-card-value" id="chunks-count-value">-</div>
          <div class="admin-card-sub">데이터 분할 저장 단위</div>
        </div>
        <div class="admin-card" id="card-api">
          <div class="admin-card-icon">🔑</div>
          <div class="admin-card-title">API 상태</div>
          <div class="admin-card-value" id="api-status-value">확인 중...</div>
          <div class="admin-card-sub" id="api-status-sub"></div>
        </div>
      </div>

      <!-- 기능 섹션 -->
      <div class="admin-sections">
        
        <!-- 동기화 관리 -->
        <div class="admin-section">
          <h3>📡 강의 동기화</h3>
          <p class="admin-desc">Udemy Business GraphQL API에서 강의 데이터를 가져옵니다.</p>
          <div class="admin-btn-group">
            <button class="admin-btn admin-btn-primary" id="btn-sync-continue" title="마지막 지점부터 이어서 동기화">
              ▶️ 이어서 동기화
            </button>
            <button class="admin-btn admin-btn-warning" id="btn-sync-reset" title="모든 데이터를 삭제하고 처음부터 다시 동기화">
              🔄 전체 재동기화 (Reset)
            </button>
            <button class="admin-btn admin-btn-danger" id="btn-sync-auto" title="완료될 때까지 자동으로 반복 동기화">
              🚀 자동 전체 동기화
            </button>
          </div>
          <div class="admin-log" id="sync-log"></div>
        </div>

        <!-- 데이터 검증 -->
        <div class="admin-section">
          <h3>🔍 데이터 검증</h3>
          <p class="admin-desc">저장된 강의 데이터의 품질을 확인합니다.</p>
          <div class="admin-btn-group">
            <button class="admin-btn" id="btn-verify-data" title="자막, 시간, 평점 등 데이터 현황 확인">
              📊 데이터 현황 확인
            </button>
            <button class="admin-btn" id="btn-verify-sample" title="첫 번째 chunk의 샘플 데이터 확인">
              📋 샘플 데이터 보기
            </button>
          </div>
          <div class="admin-log" id="verify-log"></div>
        </div>

        <!-- API 테스트 -->
        <div class="admin-section">
          <h3>🔑 API 테스트</h3>
          <p class="admin-desc">외부 API 연결 상태를 확인합니다.</p>
          <div class="admin-btn-group">
            <button class="admin-btn" id="btn-test-graphql" title="GraphQL OAuth 토큰 발급 테스트">
              🔐 GraphQL 토큰 테스트
            </button>
            <button class="admin-btn" id="btn-test-gemini" title="Gemini AI API 연결 테스트">
              🤖 Gemini AI 테스트
            </button>
          </div>
          <div class="admin-log" id="api-log"></div>
        </div>

        <!-- 로우 데이터 -->
        <div class="admin-section">
          <h3>📋 로우 데이터 조회</h3>
          <p class="admin-desc">특정 chunk의 강의 데이터를 직접 확인합니다.</p>
          <div class="admin-btn-group" style="align-items:center;">
            <label style="color:var(--text-secondary);font-size:0.85rem;">Chunk 번호:</label>
            <input type="number" id="chunk-number" value="0" min="0" max="50" style="width:60px;padding:0.4rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-bright);text-align:center;" />
            <button class="admin-btn" id="btn-view-chunk" title="해당 chunk의 데이터를 조회합니다">
              🔍 조회
            </button>
          </div>
          <div class="admin-log" id="raw-log"></div>
        </div>

      </div>
    </div>
  `;
  
  document.body.appendChild(adminPanel);
  
  // 이벤트 바인딩
  $('#admin-exit').addEventListener('click', exitAdminMode);
  $('#btn-sync-continue').addEventListener('click', () => runSync(false));
  $('#btn-sync-reset').addEventListener('click', () => {
    if (confirm('⚠️ 모든 데이터를 삭제하고 처음부터 다시 동기화합니다. 계속하시겠습니까?')) {
      runSync(true);
    }
  });
  $('#btn-sync-auto').addEventListener('click', runAutoSync);
  $('#btn-verify-data').addEventListener('click', verifyData);
  $('#btn-verify-sample').addEventListener('click', verifySample);
  $('#btn-test-graphql').addEventListener('click', testGraphQL);
  $('#btn-test-gemini').addEventListener('click', testGemini);
  $('#btn-view-chunk').addEventListener('click', viewChunk);
  
  // 초기 상태 로드
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

// 상태 로드
async function loadAdminStatus() {
  try {
    const res = await fetch(`${WORKER_URL}/status`, {
      headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
    });
    const data = await res.json();
    
    $('#sync-status-value').textContent = data.isComplete ? '✅ 완료' : data.synced ? '⏳ 진행 중' : '❌ 미완료';
    $('#sync-status-sub').textContent = data.syncedAt ? `마지막: ${new Date(data.syncedAt).toLocaleString('ko-KR')}` : '동기화 기록 없음';
    $('#courses-count-value').textContent = (data.totalCount || 0).toLocaleString();
    $('#courses-count-sub').textContent = data.isComplete ? '동기화 완료' : '동기화 진행 중';
    $('#chunks-count-value').textContent = data.totalChunks || 0;
  } catch (e) {
    $('#sync-status-value').textContent = '❌ 연결 실패';
    $('#sync-status-sub').textContent = e.message;
  }

  // API 상태 확인
  try {
    const tokenRes = await fetch(`${WORKER_URL}/test-token`, {
      headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
    });
    const tokenData = await tokenRes.json();
    $('#api-status-value').textContent = tokenData.success ? '✅ 정상' : '❌ 오류';
    $('#api-status-sub').textContent = tokenData.success ? 'GraphQL 토큰 발급 가능' : tokenData.error || '토큰 발급 실패';
  } catch (e) {
    $('#api-status-value').textContent = '❌ 연결 실패';
    $('#api-status-sub').textContent = e.message;
  }
}

// 동기화 실행
async function runSync(isReset) {
  const log = $('#sync-log');
  const endpoint = isReset ? `${WORKER_URL}/sync?reset=true` : `${WORKER_URL}/sync`;
  
  log.innerHTML = `<div class="log-entry log-info">📡 ${isReset ? '전체 재동기화' : '이어서 동기화'} 시작...</div>`;
  
  try {
    const res = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
    });
    const data = await res.json();
    
    if (data.success) {
      log.innerHTML += `<div class="log-entry log-success">✅ ${data.message}</div>`;
    } else {
      log.innerHTML += `<div class="log-entry log-error">❌ 오류: ${data.error}</div>`;
    }
  } catch (e) {
    log.innerHTML += `<div class="log-entry log-error">❌ 통신 오류: ${e.message}</div>`;
  }
  
  loadAdminStatus();
}

// 자동 전체 동기화
async function runAutoSync() {
  const log = $('#sync-log');
  const btn = $('#btn-sync-auto');
  btn.disabled = true;
  btn.textContent = '⏳ 동기화 진행 중...';
  
  log.innerHTML = `<div class="log-entry log-info">🚀 자동 전체 동기화 시작 (완료될 때까지 반복)...</div>`;
  
  let cycleCount = 1;
  let keepGoing = true;
  
  while (keepGoing) {
    log.innerHTML += `<div class="log-entry log-info">📡 [사이클 ${cycleCount}] 데이터 수집 중...</div>`;
    log.scrollTop = log.scrollHeight;
    
    try {
      const endpoint = cycleCount === 1 
        ? `${WORKER_URL}/sync?reset=true` 
        : `${WORKER_URL}/sync`;
      
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
      });
      const data = await res.json();
      
      if (data.error) {
        log.innerHTML += `<div class="log-entry log-error">❌ 에러: ${data.error}</div>`;
        break;
      }
      
      log.innerHTML += `<div class="log-entry log-success">✅ ${data.message}</div>`;
      
      if (data.stoppedByTimeout) {
        log.innerHTML += `<div class="log-entry log-info">⏳ 이어받기 준비 중... (2초 대기)</div>`;
        await new Promise(r => setTimeout(r, 2000));
        cycleCount++;
      } else {
        log.innerHTML += `<div class="log-entry log-success">🎉 전체 동기화 완료! 총 ${data.totalCount}개 강의</div>`;
        keepGoing = false;
      }
    } catch (e) {
      log.innerHTML += `<div class="log-entry log-error">❌ 통신 오류: ${e.message}</div>`;
      break;
    }
    
    log.scrollTop = log.scrollHeight;
  }
  
  btn.disabled = false;
  btn.textContent = '🚀 자동 전체 동기화';
  loadAdminStatus();
}

// 데이터 검증
async function verifyData() {
  const log = $('#verify-log');
  log.innerHTML = `<div class="log-entry log-info">🔍 데이터 검증 시작...</div>`;
  
  let chunk = 0;
  let total = 0;
  let subsCount = 0;
  let koreanSubCount = 0;
  let durationCount = 0;
  let ratingCount = 0;
  let enrollCount = 0;
  let imageCount = 0;
  
  while (true) {
    try {
      const res = await fetch(`${WORKER_URL}/get-courses?chunk=${chunk}`, {
        headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data || !Array.isArray(data) || data.length === 0) break;
      
      total += data.length;
      subsCount += data.filter(c => c.subtitles && c.subtitles !== '없음' && c.subtitles !== '').length;
      koreanSubCount += data.filter(c => {
        if (!c.subtitles) return false;
        const s = c.subtitles.toLowerCase();
        return s.includes('ko') || s.includes('korean') || s.includes('한국어');
      }).length;
      durationCount += data.filter(c => c.contentLength && c.contentLength > 0 && typeof c.contentLength === 'number').length;
      ratingCount += data.filter(c => c.rating && c.rating > 0).length;
      enrollCount += data.filter(c => c.enrollments && c.enrollments > 0).length;
      imageCount += data.filter(c => c.image && c.image !== '').length;
      
      log.innerHTML += `<div class="log-entry">📦 Chunk ${chunk}: ${data.length}개 확인</div>`;
      chunk++;
    } catch (e) {
      if (chunk === 0) log.innerHTML += `<div class="log-entry log-error">❌ 데이터 로드 실패: ${e.message}</div>`;
      break;
    }
  }
  
  const pct = (n) => total > 0 ? `${(n/total*100).toFixed(1)}%` : '0%';
  
  log.innerHTML += `
    <div class="log-entry log-success">
      <strong>📊 데이터 검증 결과</strong><br>
      ─────────────────────<br>
      📚 총 강의: <strong>${total.toLocaleString()}개</strong> (${chunk}개 chunk)<br>
      💬 자막 데이터: <strong>${subsCount.toLocaleString()}개</strong> (${pct(subsCount)})<br>
      🇰🇷 한국어 자막: <strong>${koreanSubCount.toLocaleString()}개</strong> (${pct(koreanSubCount)})<br>
      ⏱️ 시간 데이터 (숫자): <strong>${durationCount.toLocaleString()}개</strong> (${pct(durationCount)})<br>
      ⭐ 평점 데이터: <strong>${ratingCount.toLocaleString()}개</strong> (${pct(ratingCount)})<br>
      👥 수강신청 데이터: <strong>${enrollCount.toLocaleString()}개</strong> (${pct(enrollCount)})<br>
      🖼️ 썸네일 이미지: <strong>${imageCount.toLocaleString()}개</strong> (${pct(imageCount)})
    </div>
  `;
  log.scrollTop = log.scrollHeight;
}

// 샘플 데이터 보기
async function verifySample() {
  const log = $('#verify-log');
  log.innerHTML = `<div class="log-entry log-info">📋 샘플 데이터 로드 중...</div>`;
  
  try {
    const res = await fetch(`${WORKER_URL}/get-courses?chunk=0`, {
      headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
    });
    const data = await res.json();
    
    if (!data || data.length === 0) {
      log.innerHTML += `<div class="log-entry log-error">❌ 데이터 없음</div>`;
      return;
    }
    
    const sample = data[0];
    log.innerHTML += `
      <div class="log-entry">
        <strong>📋 첫 번째 강의 전체 데이터:</strong><br>
        ─────────────────────<br>
        <strong>필드 목록:</strong> ${Object.keys(sample).join(', ')}<br>
        ─────────────────────<br>
        ${Object.entries(sample).map(([k, v]) => {
          const val = typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v;
          return `<strong>${k}:</strong> ${val}`;
        }).join('<br>')}
      </div>
    `;
    
    // 자막 있는 강의 샘플
    const withSubs = data.filter(c => c.subtitles && c.subtitles !== '없음' && c.subtitles !== '');
    if (withSubs.length > 0) {
      log.innerHTML += `
        <div class="log-entry log-success">
          <strong>💬 자막 있는 강의 샘플 (${withSubs.length}/${data.length}개):</strong><br>
          ${withSubs.slice(0, 5).map(c => `- ${c.title.substring(0,40)}: [${c.subtitles}]`).join('<br>')}
        </div>
      `;
    } else {
      log.innerHTML += `<div class="log-entry log-error">❌ 이 chunk에 자막 데이터가 있는 강의가 없습니다.</div>`;
    }
    
  } catch (e) {
    log.innerHTML += `<div class="log-entry log-error">❌ 오류: ${e.message}</div>`;
  }
  log.scrollTop = log.scrollHeight;
}

// GraphQL 토큰 테스트
async function testGraphQL() {
  const log = $('#api-log');
  log.innerHTML = `<div class="log-entry log-info">🔐 GraphQL 토큰 발급 테스트...</div>`;
  
  try {
    const res = await fetch(`${WORKER_URL}/test-token`, {
      headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
    });
    const data = await res.json();
    
    if (data.success) {
      log.innerHTML += `<div class="log-entry log-success">✅ GraphQL OAuth 토큰 발급 성공!</div>`;
    } else {
      log.innerHTML += `<div class="log-entry log-error">❌ 토큰 발급 실패: ${data.error || '알 수 없는 오류'}</div>`;
    }
  } catch (e) {
    log.innerHTML += `<div class="log-entry log-error">❌ 통신 오류: ${e.message}</div>`;
  }
}

// Gemini AI 테스트
async function testGemini() {
  const log = $('#api-log');
  log.innerHTML = `<div class="log-entry log-info">🤖 Gemini AI 테스트...</div>`;
  
  try {
    const res = await fetch('/api/ai-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'python programming' })
    });
    const data = await res.json();
    
    if (data.success) {
      log.innerHTML += `<div class="log-entry log-success">✅ Gemini AI 연결 성공!<br>확장 키워드: ${data.data?.english_keywords?.slice(0,5).join(', ') || 'N/A'}</div>`;
    } else {
      log.innerHTML += `<div class="log-entry log-error">❌ Gemini AI 오류: ${data.error || '알 수 없는 오류'}</div>`;
    }
  } catch (e) {
    log.innerHTML += `<div class="log-entry log-error">❌ 통신 오류: ${e.message}</div>`;
  }
}

// 로우 데이터 조회
async function viewChunk() {
  const log = $('#raw-log');
  const chunkNum = $('#chunk-number').value || '0';
  log.innerHTML = `<div class="log-entry log-info">📋 Chunk ${chunkNum} 로드 중...</div>`;
  
  try {
    const res = await fetch(`${WORKER_URL}/get-courses?chunk=${chunkNum}`, {
      headers: { 'Authorization': `Bearer ${WORKER_SECRET}` }
    });
    
    if (!res.ok) {
      log.innerHTML += `<div class="log-entry log-error">❌ Chunk ${chunkNum}을 찾을 수 없습니다. (HTTP ${res.status})</div>`;
      return;
    }
    
    const data = await res.json();
    
    if (!data || data.length === 0) {
      log.innerHTML += `<div class="log-entry log-error">❌ Chunk ${chunkNum}에 데이터가 없습니다.</div>`;
      return;
    }
    
    log.innerHTML += `
      <div class="log-entry log-success">
        <strong>📦 Chunk ${chunkNum}: ${data.length}개 강의</strong><br>
        ─────────────────────<br>
        ${data.slice(0, 10).map((c, i) => 
          `${i+1}. <strong>${c.title?.substring(0,50) || 'N/A'}</strong><br>` +
          `   📊 ${c.difficulty} | 🌐 ${c.language} | ⭐ ${c.rating?.toFixed(1) || '-'} | 👥 ${c.enrollments || '-'}<br>` +
          `   💬 자막: ${c.subtitles || '없음'} | ⏱️ ${c.contentLength || '-'}분`
        ).join('<br>─────────────────────<br>')}
        ${data.length > 10 ? `<br>... 외 ${data.length - 10}개` : ''}
      </div>
    `;
  } catch (e) {
    log.innerHTML += `<div class="log-entry log-error">❌ 오류: ${e.message}</div>`;
  }
  log.scrollTop = log.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
// 일반 모드 — 워프 전환 + 앱 초기화
// ═══════════════════════════════════════════════════════════
async function launch() {
  S.selectedFamilies = [...$$('.gate-job-card.selected')].map(c => c.dataset.family);

  const warp = $('#warp-overlay');
  warp.classList.add('active');

  const loadingPromise = playLaunchSequence();
  
  let dataLoaded = false;
  try {
    const res = await fetch('/api/courses');
    const data = await res.json();

    if (data.courses && data.courses.length > 0) {
      S.courses = processCourses(data.courses);
      dataLoaded = true;
    }
  } catch (e) {
    console.error(e);
  }

  await loadingPromise;

  if (!dataLoaded) {
    toast('강의 데이터를 불러올 수 없습니다.', 'error');
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

function initApp() {
  $('#welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? `${S.selectedFamilies.map(f => CURATION[f]?.emoji||'').join('')} 탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`
    : `탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`;

  renderDashCards();
  initMultiSelects();

  if (S.selectedFamilies.length > 0) {
    const defaultCats = new Set();
    S.selectedFamilies.forEach(f => {
      CURATION[f]?.roles.forEach(r => r.cats.forEach(c => defaultCats.add(c)));
    });
    setMSValues('f-category', [...defaultCats]);
  }

  $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  let debounce;
  $('#search-input').addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(applyFilters, 300); });

  $$('.scan-mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.searchMode = btn.dataset.mode;
      applyFilters();
    });
  });

  // 감도 조절 버튼
  $$('.sensitivity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.sensitivity-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.sensitivity = btn.dataset.sensitivity;
      applyFilters();
      toast(`🎚️ 감도가 ${SENSITIVITY_CONFIG[S.sensitivity]?.label}로 변경되었습니다.`);
    });
  });

  $('#btn-ai-scan').addEventListener('click', handleAIScan);
  $('#btn-apply-ai').addEventListener('click', applyAIKeywords);
  $('#btn-ai-select-all').addEventListener('click', () => $$('#ai-panel-results .ai-kw-tag').forEach(t => t.classList.add('selected')));
  $('#btn-ai-close').addEventListener('click', () => $('#ai-panel').classList.remove('open'));

  $('#filters-toggle').addEventListener('click', () => {
    $('#filters-toggle').classList.toggle('open');
    $('#filters-grid').classList.toggle('open');
  });

  $('#sort-select').addEventListener('change', applyFilters);
  $('#rows-select').addEventListener('change', () => { S.rows = parseInt($('#rows-select').value); S.page = 1; renderList(); });

  $('#btn-csv').addEventListener('click', () => downloadCSV(false));
  $('#btn-share').addEventListener('click', shareLink);
  $('#btn-reset').addEventListener('click', () => resetAll(true));

  $$('.view-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    S.viewMode = btn.dataset.view;
    renderList();
  }));

  $('#check-all').addEventListener('change', (e) => {
    const pageIds = getPageData().map(c => c.id);
    if (e.target.checked) pageIds.forEach(id => S.selectedIds.add(id));
    else pageIds.forEach(id => S.selectedIds.delete(id));
    renderList();
    updateFAB();
  });

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

  $('#side-panel-overlay').addEventListener('click', (e) => { if(e.target === $('#side-panel-overlay')) closeSidePanel(); });
  $('#sp-close').addEventListener('click', closeSidePanel);
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeSidePanel(); });

  window.addEventListener('click', e => { if(!e.target.closest('.ms-wrap')) $$('.ms-panel').forEach(p => p.classList.remove('open')); });

  initMissionCenter();
  initStars();
  applyURLParams();
  applyFilters();
}

function switchTab(tabId) {
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $$('.tab-btn').forEach(b => b.classList.remove('active'));
  $(`#panel-${tabId}`).classList.add('active');
  $(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
  $('#list-section').style.display = tabId === 'stars' ? 'none' : '';
}
