// ═══════════════════════════════════════════════════════════
// render.js — 추천도 점수 + 언어 + 한국어자막 여부 표시
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
    const empty = `<div class="empty-state"><h3>😅 발견된 별이 없습니다</h3><p>감도를 🔭 광역으로 조절하거나 검색어를 변경해보세요.</p></div>`;
    $('#table-body').innerHTML = `<tr><td colspan="11">${empty}</td></tr>`;
    $('#view-card').innerHTML = empty;
    $('#view-compact').innerHTML = empty;
    $('#pagination').innerHTML = '';
    return;
  }

  // ★ 테이블 뷰 — 추천도 + 언어 + 한국어자막 여부
  $('#table-body').innerHTML = data.map(c => {
    const cat = c.category?.split(',')[0]?.trim() || '-';
    const color = getCatColor(cat);
    const checked = S.selectedIds.has(c.id) ? 'checked' : '';
    const rating = c.rating > 0 ? c.rating.toFixed(1) : '-';
    const enrollments = c.enrollments > 0 ? (c.enrollments >= 10000 ? `${Math.round(c.enrollments/1000)}K` : c.enrollments.toLocaleString()) : '-';
    const durationText = formatDuration(c.contentLength);
    const diffKR = {'Beginner':'초급','BEGINNER':'초급','Intermediate':'중급','INTERMEDIATE':'중급','Expert':'고급','EXPERT':'고급','All Levels':'전체','ALL_LEVELS':'전체'}[c.difficulty] || c.difficulty;
    const koSub = hasKoreanSub(c);
    
    // 추천도 점수 표시
    let scoreDisplay = '';
    if (c._score > 0) {
      if (c._score >= 80) scoreDisplay = `<span class="score-badge score-high">${c._score}</span>`;
      else if (c._score >= 40) scoreDisplay = `<span class="score-badge score-mid">${c._score}</span>`;
      else scoreDisplay = `<span class="score-badge score-low">${c._score}</span>`;
    }

    return `<tr style="--row-cat-color:${color}">
      <td class="col-check"><input type="checkbox" data-id="${c.id}" ${checked} /></td>
      <td class="td-score">${scoreDisplay}</td>
      <td title="${cat}"><span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)}</span></td>
      <td class="td-title"><a href="#" class="course-link" data-id="${c.id}" title="${c.title}">${c.title}</a></td>
      <td>${rating}</td>
      <td title="${c.enrollments?.toLocaleString()||0}명">${enrollments}</td>
      <td>${c.language}</td>
      <td>${koSub ? '🇰🇷' : '-'}</td>
      <td>${diffKR}</td>
      <td title="${durationText}">${durationText || '-'}</td>
      <td>${c.isNew?'<span class="badge-new">✨</span>':''}</td>
    </tr>`;
  }).join('');

  // 카드 뷰
  $('#view-card').innerHTML = data.map((c,i) => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || '-';
    const color = getCatColor(cat);
    const koSub = hasKoreanSub(c);
    
    return `<div class="course-card" style="animation-delay:${i*40}ms;--card-cat-color:${color}">
      <div class="card-cat-stripe"></div>
      <span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)} ${cat}</span>
      ${c._score > 0 ? `<span class="score-badge score-${c._score >= 80 ? 'high' : c._score >= 40 ? 'mid' : 'low'}" style="float:right">${c._score}점</span>` : ''}
      <h4>${c.title}</h4>
      <div class="card-meta">${c.instructor?.split(',')[0]?.trim()||''} · ${c.difficulty} · ${c.language}</div>
      <div class="card-tags">
        ${c.isNew?'<span class="badge-new">✨신규</span>':''}
        ${c.rating > 0 ? `<span class="cat-badge">⭐ ${c.rating.toFixed(1)}</span>` : ''}
        ${c.enrollments > 0 ? `<span class="cat-badge">👥 ${c.enrollments >= 10000 ? Math.round(c.enrollments/1000)+'K' : c.enrollments}</span>` : ''}
        ${koSub ? `<span class="cat-badge">🇰🇷</span>` : ''}
      </div>
      <a href="${url}" target="_blank" class="card-cta">🚀 워프 점프 →</a>
    </div>`;
  }).join('');

  // 컴팩트 뷰
  $('#view-compact').innerHTML = data.map(c => {
    return `<div class="compact-item">
      <input type="checkbox" data-id="${c.id}" ${S.selectedIds.has(c.id)?'checked':''} style="accent-color:var(--accent)" />
      ${c._score > 0 ? `<span class="score-badge score-${c._score >= 80 ? 'high' : c._score >= 40 ? 'mid' : 'low'}" style="font-size:0.7rem">${c._score}</span>` : ''}
      <span class="compact-title"><a href="#" class="course-link" data-id="${c.id}">${c.title}</a></span>
      <span style="font-size:0.75rem;color:var(--text-muted)">${c.language}</span>
      ${hasKoreanSub(c) ? '<span>🇰🇷</span>' : ''}
    </div>`;
  }).join('');

  // 강의 제목 클릭 → 사이드 패널
  document.querySelectorAll('.course-link[data-id]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const course = S.courses.find(c => c.id === link.dataset.id);
      if(course) openSidePanel(course);
    });
  });

  // 체크박스
  document.querySelectorAll('#table-body input[type="checkbox"], #view-compact input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if(cb.checked) S.selectedIds.add(cb.dataset.id);
      else S.selectedIds.delete(cb.dataset.id);
      updateFAB();
    });
  });

  renderPagination();
  updateFAB();
}

function renderPagination() {
  const container = $('#pagination');
  const totalPages = Math.ceil(S.filtered.length / S.rows);
  if(totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${S.page===1?'disabled':''} data-p="${S.page-1}">◀</button>`;
  const max = 7;
  let start = Math.max(1, S.page - Math.floor(max/2));
  let end = Math.min(totalPages, start + max - 1);
  if(end-start < max-1) start = Math.max(1, end-max+1);

  if(start>1) { html += `<button data-p="1">1</button>`; if(start>2) html += `<button disabled>…</button>`; }
  for(let i=start;i<=end;i++) html += `<button class="${i===S.page?'active':''}" data-p="${i}">${i}</button>`;
  if(end<totalPages) { if(end<totalPages-1) html += `<button disabled>…</button>`; html += `<button data-p="${totalPages}">${totalPages}</button>`; }
  html += `<button ${S.page===totalPages?'disabled':''} data-p="${S.page+1}">▶</button>`;

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

function renderDashCards() {
  const total = S.courses.length;
  const newCount = S.courses.filter(c => c.isNew).length;

  const cards = [
    { icon:'🌟', value: total, label:'전체 별', action: () => { resetAll(); }, tooltip: '모든 강의 표시' },
    { icon:'✨', value: newCount, label:'신규 별', action: () => { setMSValues('f-attr',['NEW']); applyFilters(); }, tooltip: '최근 3개월 내 업데이트' },
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
    card.style.cursor = 'pointer';
  });
}
