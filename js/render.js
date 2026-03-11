// ═══════════════════════════════════════════════════════════
// render.js — 테이블/카드/컴팩트 렌더링, 페이지네이션, FAB, 대시보드
// ═══════════════════════════════════════════════════════════

function getPageData() {
  const start = (S.page - 1) * S.rows;
  return S.filtered.slice(start, start + S.rows);
}

function renderList() {
  const data = getPageData();

  $('#view-table').style.display = S.viewMode==='table' ? '' : 'none';
  $('#view-card').className = `card-grid ${S.viewMode==='card'?'active':''}`;
  $('#view-compact').className = `compact-list ${S.viewMode==='compact'?'active':''}`;

  if(data.length === 0) {
    const empty = `<div class="empty-state"><h3>😅 발견된 별이 없습니다</h3><p>스캐너 설정을 변경해보세요.</p></div>`;
    $('#table-body').innerHTML = `<tr><td colspan="12">${empty}</td></tr>`;
    $('#view-card').innerHTML = empty;
    $('#view-compact').innerHTML = empty;
    $('#pagination').innerHTML = '';
    return;
  }

  // 테이블 뷰 — 자막 데이터 개선, 한국어 표시
  $('#table-body').innerHTML = data.map(c => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || 'N/A';
    const color = getCatColor(cat);
    const checked = S.selectedIds.has(c.id) ? 'checked' : '';
    const rating = c.rating > 0 ? c.rating.toFixed(1) : '-';
    const enrollments = c.enrollments > 0 ? (c.enrollments > 1000 ? `${Math.round(c.enrollments/1000)}K` : c.enrollments.toLocaleString()) : '-';
    
    // 자막 처리 개선 — 다양한 형태의 자막 데이터 처리
    let subtitlesDisplay = '-';
    if (c.subtitles && c.subtitles !== '없음') {
      const subtitleText = c.subtitles.toLowerCase();
      if (subtitleText.includes('korean') || subtitleText.includes('한국어') || subtitleText.includes('ko')) {
        subtitlesDisplay = '🇰🇷 한국어';
      } else if (subtitleText.includes('english') || subtitleText.includes('en')) {
        subtitlesDisplay = '🇺🇸 영어';
      } else if (subtitleText.includes('spanish') || subtitleText.includes('es')) {
        subtitlesDisplay = '🇪🇸 스페인어';
      } else if (subtitleText.includes('chinese') || subtitleText.includes('zh')) {
        subtitlesDisplay = '🇨🇳 중국어';
      } else if (subtitleText.includes('japanese') || subtitleText.includes('ja')) {
        subtitlesDisplay = '🇯🇵 일본어';
      } else {
        const langs = c.subtitles.split(',').map(s => s.trim()).slice(0, 2);
        subtitlesDisplay = langs.join(', ');
        if (langs.length > 2) subtitlesDisplay += '...';
      }
    }

    // 난이도 한국어화
    const difficultyKR = {
      'Beginner': '초급',
      'Intermediate': '중급', 
      'Expert': '고급',
      'All Levels': '모든 수준'
    }[c.difficulty] || c.difficulty;

    // 언어 한국어화
    const languageKR = {
      'English': '영어',
      'Korean': '한국어',
      'Spanish': '스페인어',
      'French': '프랑스어',
      'German': '독일어',
      'Japanese': '일본어',
      'Chinese': '중국어'
    }[c.language] || c.language;

    return `<tr style="--row-cat-color:${color}">
      <td class="col-check"><input type="checkbox" data-id="${c.id}" ${checked} /></td>
      <td><span class="cat-badge" style="border-color:${color}33;color:${color}" title="${cat}">${getCatEmoji(cat)} ${cat.length > 12 ? cat.substring(0,12)+'...' : cat}</span></td>
      <td title="${c.topic||''}">${c.topic ? (c.topic.length > 15 ? c.topic.substring(0,15)+'...' : c.topic) : '-'}</td>
      <td><a href="#" class="course-link" data-id="${c.id}" title="강의 상세 정보 보기">${c.title}</a></td>
      <td><button class="detail-btn" data-id="${c.id}" title="강의 상세 정보">📋</button></td>
      <td title="평점: ${rating}/5.0">${rating}</td>
      <td title="수강신청자 수: ${c.enrollments?.toLocaleString() || 0}명">${enrollments}</td>
      <td title="강의 언어: ${languageKR}">${languageKR}</td>
      <td title="자막 언어: ${c.subtitles||'없음'}">${subtitlesDisplay}</td>
      <td title="난이도: ${difficultyKR}">${difficultyKR}</td>
      <td title="${c.instructor||''}">${c.instructor ? (c.instructor.length > 20 ? c.instructor.substring(0,20)+'...' : c.instructor) : '-'}</td>
      <td>${c.isNew?'<span class="badge-new" title="최근 3개월 내 업데이트">✨신규</span>':''}</td>
    </tr>`;
  }).join('');

  // 카드 뷰
  $('#view-card').innerHTML = data.map((c,i) => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || 'N/A';
    const color = getCatColor(cat);
    const hasKoreanSub = c.subtitles && (c.subtitles.toLowerCase().includes('korean') || c.subtitles.includes('한국어') || c.subtitles.toLowerCase().includes('ko'));
    
    return `<div class="course-card" style="animation-delay:${i*40}ms;--card-cat-color:${color}">
      <div class="card-cat-stripe"></div>
      <span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)} ${cat}</span>
      <h4>${c.title}</h4>
      <div class="card-meta">${c.instructor?.split(',')[0]?.trim()||''} · ${c.difficulty} · ${c.language}</div>
      <div class="card-tags">
        ${c.isNew?'<span class="badge-new">✨신규</span>':''}
        ${c.rating > 0 ? `<span class="cat-badge">⭐ ${c.rating.toFixed(1)}</span>` : ''}
        ${c.enrollments > 0 ? `<span class="cat-badge">👥 ${c.enrollments > 1000 ? Math.round(c.enrollments/1000)+'K' : c.enrollments}</span>` : ''}
        ${hasKoreanSub ? `<span class="cat-badge">🇰🇷 자막</span>` : ''}
      </div>
      <a href="${url}" target="_blank" class="card-cta">🚀 워프 점프 →</a>
    </div>`;
  }).join('');

  // 컴팩트 뷰
  $('#view-compact').innerHTML = data.map(c => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || '';
    return `<div class="compact-item">
      <input type="checkbox" data-id="${c.id}" ${S.selectedIds.has(c.id)?'checked':''} style="accent-color:var(--accent)" />
      <span class="cat-badge" style="font-size:0.7rem">${getCatEmoji(cat)}</span>
      <span class="compact-title"><a href="${url}" target="_blank">${c.title}</a></span>
      <span style="font-size:0.75rem;color:var(--text-muted)">${c.difficulty}</span>
      <span style="font-size:0.75rem;color:var(--text-muted)">${c.language}</span>
    </div>`;
  }).join('');

  // 강의 제목 클릭 → 사이드 패널 열기
  document.querySelectorAll('.course-link[data-id]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const course = S.courses.find(c => c.id === link.dataset.id);
      if(course) openSidePanel(course);
    });
  });

  // 체크박스 이벤트
  document.querySelectorAll('#table-body input[type="checkbox"], #view-compact input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if(cb.checked) S.selectedIds.add(cb.dataset.id);
      else S.selectedIds.delete(cb.dataset.id);
      updateFAB();
    });
  });

  // 상세 버튼 이벤트
  document.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const course = S.courses.find(c => c.id === btn.dataset.id);
      if(course) openSidePanel(course);
    });
  });

  renderPagination();
  updateFAB();
}

function renderPagination() {
  const container = $('#pagination');
  const totalPages = Math.ceil(S.filtered.length / S.rows);
  if(totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${S.page===1?'disabled':''} data-p="${S.page-1}" title="이전 페이지">◀</button>`;
  const max = 7;
  let start = Math.max(1, S.page - Math.floor(max/2));
  let end = Math.min(totalPages, start + max - 1);
  if(end-start < max-1) start = Math.max(1, end-max+1);

  if(start>1) { html += `<button data-p="1" title="첫 페이지">1</button>`; if(start>2) html += `<button disabled>…</button>`; }
  for(let i=start;i<=end;i++) html += `<button class="${i===S.page?'active':''}" data-p="${i}" title="${i}페이지">${i}</button>`;
  if(end<totalPages) { if(end<totalPages-1) html += `<button disabled>…</button>`; html += `<button data-p="${totalPages}" title="마지막 페이지">${totalPages}</button>`; }
  html += `<button ${S.page===totalPages?'disabled':''} data-p="${S.page+1}" title="다음 페이지">▶</button>`;

  container.innerHTML = html;
  container.querySelectorAll('button:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => { 
      S.page = parseInt(btn.dataset.p); 
      renderList(); 
      $('#list-section').scrollIntoView({behavior:'smooth'}); 
    });
  });
}

function updateFAB() {
  const fab = $('#fab');
  if(S.selectedIds.size > 0) {
    fab.classList.add('visible');
    $('#fab-count').textContent = `🛸 ${S.selectedIds.size}개 별 선택`;
  } else {
    fab.classList.remove('visible');
  }
}

// 대시보드 카드 — 한글자막 정확한 카운팅
function renderDashCards() {
  const total = S.courses.length;
  const newCount = S.courses.filter(c => c.isNew).length;
  const highRated = S.courses.filter(c => c.rating >= 4.5).length;
  const popular = S.courses.filter(c => c.enrollments > 1000).length;
  
  // 한글자막 정확한 카운팅 — 다양한 형태 체크
  const withKoreanSub = S.courses.filter(c => {
    if (!c.subtitles || c.subtitles === '없음') return false;
    const subText = c.subtitles.toLowerCase();
    return subText.includes('korean') || subText.includes('한국어') || subText.includes('ko-') || subText.includes('ko_');
  }).length;

  const cards = [
    { icon:'🌟', value: total, label:'전체 별', action: () => { resetAll(); }, tooltip: '모든 강의를 표시합니다' },
    { icon:'💬', value: withKoreanSub, label:'한글자막', action: () => { setMSValues('f-subtitles',['Korean','한국어','ko']); applyFilters(); }, tooltip: '한국어 자막이 있는 강의' },
    { icon:'✨', value: newCount, label:'신규 별', action: () => { setMSValues('f-attr',['NEW']); applyFilters(); }, tooltip: '최근 3개월 내 업데이트된 강의' },
    { icon:'⭐', value: highRated, label:'고평점 별', action: () => { setMSValues('f-rating',['4.5']); applyFilters(); }, tooltip: '평점 4.5점 이상 강의' },
    { icon:'🔥', value: popular, label:'인기 별', action: () => { $('#sort-select').value='enrollments'; applyFilters(); }, tooltip: '수강신청 1000명 이상 강의' },
  ];

  const container = $('#dash-cards');
  container.innerHTML = cards.map((c,i) => `
    <div class="dash-card" data-idx="${i}" title="${c.tooltip}">
      <span class="icon">${c.icon}</span>
      <span class="value" data-target="${c.value}">0</span>
      <span class="label">${c.label}</span>
    </div>
  `).join('');

  container.querySelectorAll('.dash-card').forEach((card, i) => {
    const target = parseInt(card.querySelector('.value').dataset.target);
    animateCount(card.querySelector('.value'), target, 1200);
    if (cards[i].action) card.addEventListener('click', cards[i].action);
    card.style.cursor = cards[i].action ? 'pointer' : 'default';
  });
}
