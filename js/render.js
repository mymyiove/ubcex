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

  // 테이블 뷰 — 자막 컬럼 추가, 텍스트 오버플로우 처리
  $('#table-body').innerHTML = data.map(c => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || 'N/A';
    const color = getCatColor(cat);
    const checked = S.selectedIds.has(c.id) ? 'checked' : '';
    const rating = c.rating > 0 ? c.rating.toFixed(1) : '-';
    const enrollments = c.enrollments > 0 ? (c.enrollments > 1000 ? `${Math.round(c.enrollments/1000)}K` : c.enrollments.toLocaleString()) : '-';
    
    // 자막 처리 — 한국어 포함 여부 체크
    let subtitlesDisplay = '-';
    if (c.subtitles && c.subtitles !== '없음') {
      const hasKorean = c.subtitles.includes('한국어') || c.subtitles.includes('Korean');
      if (hasKorean) {
        subtitlesDisplay = '🇰🇷 한국어';
      } else {
        const langs = c.subtitles.split(',').map(s => s.trim()).slice(0, 2);
        subtitlesDisplay = langs.join(', ');
        if (langs.length > 2) subtitlesDisplay += '...';
      }
    }

    return `<tr style="--row-cat-color:${color}">
      <td class="col-check"><input type="checkbox" data-id="${c.id}" ${checked} /></td>
      <td><span class="cat-badge" style="border-color:${color}33;color:${color}" title="${cat}">${getCatEmoji(cat)} ${cat.length > 12 ? cat.substring(0,12)+'...' : cat}</span></td>
      <td title="${c.topic||''}">${c.topic ? (c.topic.length > 15 ? c.topic.substring(0,15)+'...' : c.topic) : '-'}</td>
      <td><a href="${url}" target="_blank" class="course-link" title="${c.title}">${c.title}</a></td>
      <td><button class="detail-btn" data-id="${c.id}">📋</button></td>
      <td>${rating}</td>
      <td>${enrollments}</td>
      <td>${c.language}</td>
      <td title="${c.subtitles||''}">${subtitlesDisplay}</td>
      <td>${c.difficulty}</td>
      <td title="${c.instructor||''}">${c.instructor ? (c.instructor.length > 20 ? c.instructor.substring(0,20)+'...' : c.instructor) : '-'}</td>
      <td>${c.isNew?'<span class="badge-new">✨NEW</span>':''}</td>
    </tr>`;
  }).join('');

  // 카드 뷰
  $('#view-card').innerHTML = data.map((c,i) => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || 'N/A';
    const color = getCatColor(cat);
    const hasKoreanSub = c.subtitles && (c.subtitles.includes('한국어') || c.subtitles.includes('Korean'));
    
    return `<div class="course-card" style="animation-delay:${i*40}ms;--card-cat-color:${color}">
      <div class="card-cat-stripe"></div>
      <span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)} ${cat}</span>
      <h4>${c.title}</h4>
      <div class="card-meta">${c.instructor?.split(',')[0]?.trim()||''} · ${c.difficulty} · ${c.language}</div>
      <div class="card-tags">
        ${c.isNew?'<span class="badge-new">✨NEW</span>':''}
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

// 대시보드 카드 — 한국어 제거, 자막 추가
function renderDashCards() {
  const total = S.courses.length;
  const newCount = S.courses.filter(c => c.isNew).length;
  const highRated = S.courses.filter(c => c.rating >= 4.5).length;
  const popular = S.courses.filter(c => c.enrollments > 1000).length;
  const withSubtitles = S.courses.filter(c => c.subtitles && c.subtitles !== '없음' && (c.subtitles.includes('한국어') || c.subtitles.includes('Korean'))).length;

  const cards = [
    { icon:'🌟', value: total, label:'전체 별', action: () => { resetAll(); } },
    { icon:'💬', value: withSubtitles, label:'한글자막', action: () => { setMSValues('f-subtitles',['한국어']); applyFilters(); } },
    { icon:'✨', value: newCount, label:'신규 별', action: () => { setMSValues('f-attr',['NEW']); applyFilters(); } },
    { icon:'⭐', value: highRated, label:'고평점 별', action: () => { setMSValues('f-rating',['4.5']); applyFilters(); } },
    { icon:'🔥', value: popular, label:'인기 별', action: () => { $('#sort-select').value='enrollments'; applyFilters(); } },
  ];

  const container = $('#dash-cards');
  container.innerHTML = cards.map((c,i) => `
    <div class="dash-card" data-idx="${i}">
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
