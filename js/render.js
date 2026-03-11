// ═══════════════════════════════════════════════════════════
// render.js — 강사명 추가 + 수강생 표시 개선 + 대시보드 3개
// ═══════════════════════════════════════════════════════════

let currentSortColumn = null;
let currentSortDirection = 'desc';

function getPageData() {
  const start = (S.page - 1) * S.rows;
  return S.filtered.slice(start, start + S.rows);
}

function sortByColumn(column) {
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
  } else {
    currentSortColumn = column;
    currentSortDirection = 'desc';
  }

  const dir = currentSortDirection === 'desc' ? -1 : 1;

  S.filtered.sort((a, b) => {
    let va, vb;
    switch (column) {
      case 'score': va = a._score || 0; vb = b._score || 0; break;
      case 'category': va = a.category || ''; vb = b.category || ''; return dir * va.localeCompare(vb);
      case 'title': va = a.title || ''; vb = b.title || ''; return dir * va.localeCompare(vb);
      case 'rating': va = a.rating || 0; vb = b.rating || 0; break;
      case 'enrollments': va = a.enrollments || 0; vb = b.enrollments || 0; break;
      case 'language': va = a.language || ''; vb = b.language || ''; return dir * va.localeCompare(vb);
      case 'difficulty': va = a.difficulty || ''; vb = b.difficulty || ''; return dir * va.localeCompare(vb);
      case 'duration': va = a.contentLength || 0; vb = b.contentLength || 0; break;
      case 'instructor': va = a.instructor || ''; vb = b.instructor || ''; return dir * va.localeCompare(vb);
      default: return 0;
    }
    return dir * (va - vb);
  });

  S.page = 1;

  $$('th.sortable').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === column) {
      th.classList.add(currentSortDirection === 'desc' ? 'sort-desc' : 'sort-asc');
    }
  });

  renderList();
}

function renderList() {
  const data = getPageData();

  $('#view-table').style.display = S.viewMode === 'table' ? '' : 'none';
  $('#view-card').className = `card-grid ${S.viewMode === 'card' ? 'active' : ''}`;
  $('#view-compact').className = `compact-list ${S.viewMode === 'compact' ? 'active' : ''}`;

  if (data.length === 0) {
    const empty = `<div class="empty-state"><h3>😅 발견된 별이 없습니다</h3><p>감도를 🔭 광역으로 조절하거나 검색어를 변경해보세요.</p></div>`;
    $('#table-body').innerHTML = `<tr><td colspan="12">${empty}</td></tr>`;
    $('#view-card').innerHTML = empty;
    $('#view-compact').innerHTML = empty;
    $('#pagination').innerHTML = '';
    return;
  }

  const scoreTooltip = '추천도 산출: 제목 +40~50점, 카테고리 +30점, 주제 +20~25점, 소개 +15점, 학습목표 +10점, 설명 +5점(광역), 신규 +3점, 한국어자막 +3점, 고평점 +5점';

  // ★ 테이블 뷰 — 강사명 추가
  $('#table-body').innerHTML = data.map(c => {
    const cat = c.category?.split(',')[0]?.trim() || '-';
    const color = getCatColor(cat);
    const checked = S.selectedIds.has(c.id) ? 'checked' : '';
    const rating = c.rating > 0 ? c.rating.toFixed(1) : '-';
    
    // ★ 수강생 표시 개선
    let enrollments = '-';
    if (c.enrollments > 0) {
      if (c.enrollments < 10) enrollments = `${c.enrollments}▼`;
      else if (c.enrollments >= 10000) enrollments = `${Math.round(c.enrollments/1000)}K`;
      else enrollments = c.enrollments.toLocaleString();
    }
    
    const durationText = formatDuration(c.contentLength);
    const diffKR = {'Beginner':'초급','BEGINNER':'초급','Intermediate':'중급','INTERMEDIATE':'중급','Expert':'고급','EXPERT':'고급','All Levels':'전체','ALL_LEVELS':'전체'}[c.difficulty] || c.difficulty;
    const koSub = hasKoreanSub(c);
    const instructor = c.instructor ? (c.instructor.length > 15 ? c.instructor.substring(0,15)+'...' : c.instructor) : '-';

    let scoreDisplay = '';
    if (c._score > 0) {
      const cls = c._score >= 80 ? 'score-high' : c._score >= 40 ? 'score-mid' : 'score-low';
      scoreDisplay = `<span class="score-badge ${cls}" title="${scoreTooltip}">${c._score}</span>`;
    }

    return `<tr style="--row-cat-color:${color}">
      <td class="col-check"><input type="checkbox" data-id="${c.id}" ${checked} /></td>
      <td class="td-score">${scoreDisplay}</td>
      <td title="${cat}"><span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)}</span></td>
      <td class="td-title"><a href="#" class="course-link" data-id="${c.id}" title="${c.title}">${c.title}</a></td>
      <td>${rating}</td>
      <td title="${c.enrollments?.toLocaleString() || 0}명">${enrollments}</td>
      <td>${c.language}</td>
      <td>${koSub ? '🇰🇷' : '-'}</td>
      <td>${diffKR}</td>
      <td title="${durationText}">${durationText || '-'}</td>
      <td title="${c.instructor||''}">${instructor}</td>
      <td>${c.isNew ? '<span class="badge-new">✨</span>' : ''}</td>
    </tr>`;
  }).join('');

  // 카드 뷰
  $('#view-card').innerHTML = data.map((c, i) => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || '-';
    const color = getCatColor(cat);
    const koSub = hasKoreanSub(c);

    return `<div class="course-card" style="animation-delay:${i * 40}ms;--card-cat-color:${color}">
      <div class="card-cat-stripe"></div>
      <span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)} ${cat}</span>
      ${c._score > 0 ? `<span class="score-badge score-${c._score >= 80 ? 'high' : c._score >= 40 ? 'mid' : 'low'}" style="float:right">${c._score}점</span>` : ''}
      <h4>${c.title}</h4>
      <div class="card-meta">${c.instructor?.split(',')[0]?.trim() || ''} · ${c.difficulty} · ${c.language}</div>
      <div class="card-tags">
        ${c.isNew ? '<span class="badge-new">✨신규</span>' : ''}
        ${c.rating > 0 ? `<span class="cat-badge">⭐ ${c.rating.toFixed(1)}</span>` : ''}
        ${c.enrollments > 0 ? `<span class="cat-badge">👥 ${c.enrollments >= 10000 ? Math.round(c.enrollments / 1000) + 'K' : c.enrollments}</span>` : ''}
        ${koSub ? `<span class="cat-badge">🇰🇷</span>` : ''}
      </div>
      <a href="${url}" target="_blank" class="card-cta">🚀 워프 점프 →</a>
    </div>`;
  }).join('');

  // 컴팩트 뷰
  $('#view-compact').innerHTML = data.map(c => {
    return `<div class="compact-item">
      <input type="checkbox" data-id="${c.id}" ${S.selectedIds.has(c.id) ? 'checked' : ''} style="accent-color:var(--accent)" />
      ${c._score > 0 ? `<span class="score-badge score-${c._score >= 80 ? 'high' : c._score >= 40 ? 'mid' : 'low'}" style="font-size:0.7rem">${c._score}</span>` : ''}
      <span class="compact-title"><a href="#" class="course-link" data-id="${c.id}">${c.title}</a></span>
      <span style="font-size:0.75rem;color:var(--text-muted)">${c.language}</span>
      ${hasKoreanSub(c) ? '<span>🇰🇷</span>' : ''}
    </div>`;
  }).join('');

  document.querySelectorAll('.course-link[data-id]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const course = S.courses.find(c => c.id === link.dataset.id);
      if (course) openSidePanel(course);
    });
  });

  document.querySelectorAll('#table-body input[type="checkbox"], #view-compact input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) S.selectedIds.add(cb.dataset.id);
      else S.selectedIds.delete(cb.dataset.id);
      updateFAB();
    });
  });

  document.querySelectorAll('th.sortable').forEach(th => {
    th.style.cursor = 'pointer';
    th.onclick = () => sortByColumn(th.dataset.sort);
  });

  renderPagination();
  updateFAB();
}

function renderPagination() {
  const container = $('#pagination');
  const totalPages = Math.ceil(S.filtered.length / S.rows);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${S.page === 1 ? 'disabled' : ''} data-p="${S.page - 1}">◀</button>`;
  const max = 7;
  let start = Math.max(1, S.page - Math.floor(max / 2));
  let end = Math.min(totalPages, start + max - 1);
  if (end - start < max - 1) start = Math.max(1, end - max + 1);

  if (start > 1) { html += `<button data-p="1">1</button>`; if (start > 2) html += `<button disabled>…</button>`; }
  for (let i = start; i <= end; i++) html += `<button class="${i === S.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
  if (end < totalPages) { if (end < totalPages - 1) html += `<button disabled>…</button>`; html += `<button data-p="${totalPages}">${totalPages}</button>`; }
  html += `<button ${S.page === totalPages ? 'disabled' : ''} data-p="${S.page + 1}">▶</button>`;

  container.innerHTML = html;
  container.querySelectorAll('button:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      S.page = parseInt(btn.dataset.p);
      renderList();
      $('#list-section').scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function updateFAB() {
  const fab = $('#fab');
  if (S.selectedIds.size > 0) {
    fab.classList.add('visible');
    $('#fab-count').textContent = `🛸 ${S.selectedIds.size}개 별 선택`;
  } else {
    fab.classList.remove('visible');
  }
}

// ★ 대시보드 카드 — 전체별 + 신규별 + 발견된별 (3개)
function renderDashCards() {
  const total = S.courses.length;
  const newCount = S.courses.filter(c => c.isNew).length;
  const filteredCount = S.filtered.length;

  const cards = [
    { icon: '🌟', value: total, label: '전체 별', action: () => { resetAll(); }, tooltip: '모든 강의 표시' },
    { icon: '✨', value: newCount, label: '신규 별', action: () => { setMSValues('f-attr', ['NEW']); applyFilters(); }, tooltip: '최근 3개월 내 업데이트' },
    { icon: '🔍', value: filteredCount, label: '발견된 별', action: null, tooltip: '현재 필터링된 강의 수' },
  ];

  const container = $('#dash-cards');
  container.innerHTML = cards.map((c, i) => `
    <div class="dash-card ${c.action ? 'clickable' : ''}" data-idx="${i}" title="${c.tooltip}">
      <span class="icon">${c.icon}</span>
      <span class="value" data-target="${c.value}">0</span>
      <span class="label">${c.label}</span>
    </div>
  `).join('');

  container.querySelectorAll('.dash-card').forEach((card, i) => {
    const target = parseInt(card.querySelector('.value').dataset.target);
    animateCount(card.querySelector('.value'), target, 1200);
    if (cards[i].action) {
      card.addEventListener('click', cards[i].action);
      card.style.cursor = 'pointer';
    }
  });
}
