// ═══════════════════════════════════════════════════════════
// app.js — 앱 초기화, 게이트 페이지, 워프 전환 (마지막 로드!)
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // 저장된 서브도메인 로드
  const saved = localStorage.getItem('kv_subdomain');
  if (saved) {
    $('#input-subdomain').value = saved;
    $('#gate-history').innerHTML = `💡 이전 모선: <a id="quick-launch">${saved}</a>`;
    $('#quick-launch')?.addEventListener('click', () => { $('#input-subdomain').value = saved; goStep2(); });
  }

  // 서브도메인 미리보기
  $('#input-subdomain').addEventListener('input', () => {
    const v = $('#input-subdomain').value.trim();
    $('#subdomain-preview').textContent = v ? `✅ ${v}.udemy.com 연결 확인` : '';
  });

  // Step 1 → Step 2
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
  S.subdomain = sub;
  localStorage.setItem('kv_subdomain', sub);
  $('#gate-step-1').classList.remove('active');
  $('#gate-step-2').classList.add('active');
}

async function launch() {
  S.selectedFamilies = [...$$('.gate-job-card.selected')].map(c => c.dataset.family);

  // 워프 오버레이 표시
  const warp = $('#warp-overlay');
  warp.classList.add('active');

  // 로딩 단계 시작 (데이터 로드와 병렬)
  const loadingPromise = playLaunchSequence();
  
  // 데이터 로드
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

  // 로딩 시퀀스 완료 대기
  await loadingPromise;

  if (!dataLoaded) {
    toast('강의 데이터를 불러올 수 없습니다.', 'error');
    warp.classList.remove('active');
    return;
  }

  // 최종 워프 점프
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
  // 환영 메시지
  $('#welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? `${S.selectedFamilies.map(f => CURATION[f]?.emoji||'').join('')} 탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`
    : `탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`;

  // 대시보드 카드
  renderDashCards();

  // 필터 초기화
  initMultiSelects();

  // 선택한 직무 기반 기본 필터
  if (S.selectedFamilies.length > 0) {
    const defaultCats = new Set();
    S.selectedFamilies.forEach(f => {
      CURATION[f]?.roles.forEach(r => r.cats.forEach(c => defaultCats.add(c)));
    });
    setMSValues('f-category', [...defaultCats]);
  }

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

  // AI 스캔
  $('#btn-ai-scan').addEventListener('click', handleAIScan);

  // AI 패널 버튼
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
  $('#side-panel-overlay').addEventListener('click', (e) => { if(e.target === $('#side-panel-overlay')) closeSidePanel(); });
  $('#sp-close').addEventListener('click', closeSidePanel);
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeSidePanel(); });

  // 멀티셀렉트 외부 클릭 닫기
  window.addEventListener('click', e => { if(!e.target.closest('.ms-wrap')) $$('.ms-panel').forEach(p => p.classList.remove('open')); });

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
}
