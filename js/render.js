// ═══════════════════════════════════════════════════════════
// render.js — 가로형 통계 카드 + 업데이트 컬럼 + 수강생 ▲
// ═══════════════════════════════════════════════════════════

let currentSortColumn = null;
let currentSortDirection = 'desc';
let csvDownloadType = 'all';

function getPageData() { return S.filtered.slice((S.page-1)*S.rows, S.page*S.rows); }

function sortByColumn(column) {
  if (currentSortColumn === column) currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
  else { currentSortColumn = column; currentSortDirection = 'desc'; }
  const dir = currentSortDirection === 'desc' ? -1 : 1;
  S.filtered.sort((a, b) => {
    switch (column) {
      case 'score': return dir * ((a._score||0) - (b._score||0));
      case 'category': return dir * (a.category||'').localeCompare(b.category||'');
      case 'title': return dir * (a.title||'').localeCompare(b.title||'');
      case 'rating': return dir * ((a.rating||0) - (b.rating||0));
      case 'enrollments': return dir * ((a.enrollments||0) - (b.enrollments||0));
      case 'language': return dir * (a.language||'').localeCompare(b.language||'');
      case 'korean_sub': return dir * ((hasKoreanSub(a)?1:0) - (hasKoreanSub(b)?1:0));
      case 'difficulty': return dir * (a.difficulty||'').localeCompare(b.difficulty||'');
      case 'duration': return dir * ((a.contentLength||0) - (b.contentLength||0));
      case 'instructor': return dir * (a.instructor||'').localeCompare(b.instructor||'');
      case 'updated': return dir * ((a.lastUpdated?new Date(a.lastUpdated):new Date(0)) - (b.lastUpdated?new Date(b.lastUpdated):new Date(0)));
      default: return 0;
    }
  });
  S.page = 1;
  $$('th.sortable').forEach(th => { th.classList.remove('sort-asc','sort-desc'); if(th.dataset.sort===column) th.classList.add(currentSortDirection==='desc'?'sort-desc':'sort-asc'); });
  renderList();
}

function renderList() {
  const data = getPageData();
  $('#view-table').style.display = S.viewMode==='table' ? '' : 'none';
  $('#view-card').className = `card-grid ${S.viewMode==='card'?'active':''}`;
  $('#view-compact').className = `compact-list ${S.viewMode==='compact'?'active':''}`;

  if(data.length === 0) {
    const empty = `<div class="empty-state"><h3>😅 발견된 별이 없습니다</h3><p>감도를 🔭 광역으로 조절하거나 검색어를 변경해보세요.</p></div>`;
    $('#table-body').innerHTML = `<tr><td colspan="12">${empty}</td></tr>`;
    $('#view-card').innerHTML = empty;
    $('#view-compact').innerHTML = empty;
    $('#pagination').innerHTML = '';
    return;
  }

  const tip = '추천도: 제목+40~50, 카테고리+30, 주제+20~25, 소개+15, 학습목표+10, 설명+5(광역), 신규+3, 한국어자막+3, 고평점+5';

  $('#table-body').innerHTML = data.map(c => {
    const cat = c.category?.split(',')[0]?.trim() || '-';
    const color = getCatColor(cat);
    const checked = S.selectedIds.has(c.id) ? 'checked' : '';
    const rating = c.rating > 0 ? c.rating.toFixed(1) : '-';
    let enroll = '-';
    if (c.enrollments > 0) { enroll = c.enrollments >= 10000 ? `${Math.round(c.enrollments/1000)}K▲` : c.enrollments < 10 ? `${c.enrollments}▲` : `${c.enrollments.toLocaleString()}▲`; }
    const dur = formatDuration(c.contentLength);
    const diff = {'Beginner':'초급','BEGINNER':'초급','Intermediate':'중급','INTERMEDIATE':'중급','Expert':'고급','EXPERT':'고급','All Levels':'전체','ALL_LEVELS':'전체'}[c.difficulty] || c.difficulty;
    const koSub = hasKoreanSub(c);
    const inst = c.instructor ? (c.instructor.length > 20 ? c.instructor.substring(0,20)+'...' : c.instructor) : '-';
    const upd = formatUpdateDate(c.lastUpdated);
    let score = '';
    if (c._score > 0) { const cls = c._score >= 80 ? 'score-high' : c._score >= 40 ? 'score-mid' : 'score-low'; score = `<span class="score-badge ${cls}" title="${tip}">${c._score}</span>`; }

    return `<tr style="--row-cat-color:${color}">
      <td class="col-check"><input type="checkbox" data-id="${c.id}" ${checked} /></td>
      <td class="td-score">${score}</td>
      <td title="${cat}"><span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)}</span></td>
      <td class="td-title"><a href="#" class="course-link" data-id="${c.id}" title="${c.title}">${c.title}</a></td>
      <td>${rating}</td>
      <td title="추정치">${enroll}</td>
      <td>${c.language}</td>
      <td style="text-align:center">${koSub ? '🇰🇷' : '-'}</td>
      <td>${diff}</td>
      <td title="${dur}">${dur || '-'}</td>
      <td title="${c.instructor||''}">${inst}</td>
      <td title="${c.lastUpdated||''}">${upd}</td>
    </tr>`;
  }).join('');

  $('#view-card').innerHTML = data.map((c, i) => {
    const url = buildCourseUrl(c);
    const cat = c.category?.split(',')[0]?.trim() || '-';
    const color = getCatColor(cat);
    const enroll = c.enrollments > 0 ? (c.enrollments >= 10000 ? `${Math.round(c.enrollments/1000)}K▲` : `${c.enrollments}▲`) : '-';
    return `<div class="course-card" style="animation-delay:${i*40}ms;--card-cat-color:${color}">
      <div class="card-cat-stripe"></div>
      <span class="cat-badge" style="border-color:${color}33;color:${color}">${getCatEmoji(cat)} ${cat}</span>
      ${c._score > 0 ? `<span class="score-badge score-${c._score>=80?'high':c._score>=40?'mid':'low'}" style="float:right">${c._score}점</span>` : ''}
      <h4>${c.title}</h4>
      <div class="card-meta">${c.instructor?.split(',')[0]?.trim()||''} · ${c.difficulty} · ${c.language}</div>
      <div class="card-tags">
        ${c.isNew?'<span class="badge-new">✨신규</span>':''}
        ${c.rating>0?`<span class="cat-badge">⭐ ${c.rating.toFixed(1)}</span>`:''}
        ${c.enrollments>0?`<span class="cat-badge">👥 ${enroll}</span>`:''}
        ${hasKoreanSub(c)?`<span class="cat-badge">🇰🇷</span>`:''}
        <span class="cat-badge">📅 ${formatUpdateDate(c.lastUpdated)}</span>
      </div>
      <a href="${url}" target="_blank" class="card-cta">🚀 워프 점프 →</a>
    </div>`;
  }).join('');

  $('#view-compact').innerHTML = data.map(c => `<div class="compact-item">
    <input type="checkbox" data-id="${c.id}" ${S.selectedIds.has(c.id)?'checked':''} style="accent-color:var(--accent)" />
    ${c._score>0?`<span class="score-badge score-${c._score>=80?'high':c._score>=40?'mid':'low'}" style="font-size:0.7rem">${c._score}</span>`:''}
    <span class="compact-title"><a href="#" class="course-link" data-id="${c.id}">${c.title}</a></span>
    <span style="font-size:0.75rem;color:var(--text-muted)">${c.language}</span>
    ${hasKoreanSub(c)?'<span>🇰🇷</span>':''}
  </div>`).join('');

  document.querySelectorAll('.course-link[data-id]').forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); const course = S.courses.find(c => c.id === link.dataset.id); if(course) openSidePanel(course); }); });
  document.querySelectorAll('#table-body input[type="checkbox"], #view-compact input[type="checkbox"]').forEach(cb => { cb.addEventListener('change', () => { if(cb.checked) S.selectedIds.add(cb.dataset.id); else S.selectedIds.delete(cb.dataset.id); updateFAB(); }); });
  document.querySelectorAll('th.sortable').forEach(th => { th.style.cursor='pointer'; th.onclick=()=>sortByColumn(th.dataset.sort); });

  renderPagination();
  updateFAB();
}

function renderPagination() {
  const container = $('#pagination');
  const tp = Math.ceil(S.filtered.length / S.rows);
  if(tp <= 1) { container.innerHTML = ''; return; }
  let html = `<button ${S.page===1?'disabled':''} data-p="${S.page-1}">◀</button>`;
  const max=7; let start=Math.max(1,S.page-Math.floor(max/2)); let end=Math.min(tp,start+max-1); if(end-start<max-1) start=Math.max(1,end-max+1);
  if(start>1){html+=`<button data-p="1">1</button>`;if(start>2)html+=`<button disabled>…</button>`;}
  for(let i=start;i<=end;i++) html+=`<button class="${i===S.page?'active':''}" data-p="${i}">${i}</button>`;
  if(end<tp){if(end<tp-1)html+=`<button disabled>…</button>`;html+=`<button data-p="${tp}">${tp}</button>`;}
  html+=`<button ${S.page===tp?'disabled':''} data-p="${S.page+1}">▶</button>`;
  container.innerHTML = html;
  container.querySelectorAll('button:not([disabled])').forEach(btn => { btn.addEventListener('click', () => { S.page=parseInt(btn.dataset.p); renderList(); $('#list-section')?.scrollIntoView({behavior:'smooth'}); }); });
}

function updateFAB() {
  const fab = $('#fab');
  if(S.selectedIds.size > 0) { fab.classList.add('visible'); $('#fab-count').textContent = `🛸 ${S.selectedIds.size}개 선택`; }
  else { fab.classList.remove('visible'); }
}

// ★ 가로형 통계 카드 렌더링
function renderDashCards() {
  const total = S.courses.length;
  const newCount = S.courses.filter(c => c.isNew).length;
  const filteredCount = S.filtered.length;

  const cards = [
    { icon:'🌟', value:total, label:'전체 별', action:()=>{resetAll();}, download:'all' },
    { icon:'✨', value:newCount, label:'신규 별 (1개월)', action:()=>{setMSValues('f-attr',['NEW']);applyFilters();}, download:'new' },
    { icon:'🔍', value:filteredCount, label:'발견된 별', action:null, download:null },
  ];

  const container = $('#dash-cards');
  container.innerHTML = cards.map((c,i) => `
    <div class="stats-card ${c.action?'clickable':''}" data-idx="${i}">
      <span class="stats-icon">${c.icon}</span>
      <div class="stats-info">
        <span class="stats-value" data-target="${c.value}">0</span>
        <span class="stats-label">${c.label}</span>
      </div>
      ${c.download ? `<button class="stats-download-btn" data-type="${c.download}">📥 다운받기</button>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.stats-card').forEach((card, i) => {
    const target = parseInt(card.querySelector('.stats-value').dataset.target);
    animateCount(card.querySelector('.stats-value'), target, 1200);
    if (cards[i].action) {
      card.addEventListener('click', (e) => { if(!e.target.classList.contains('stats-download-btn')) cards[i].action(); });
      card.style.cursor = 'pointer';
    }
  });

  container.querySelectorAll('.stats-download-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); csvDownloadType=btn.dataset.type; $('#csv-modal-overlay')?.classList.add('active'); });
  });

  $('#csv-modal-close')?.addEventListener('click', () => $('#csv-modal-overlay').classList.remove('active'));
  $('#csv-download-confirm')?.addEventListener('click', downloadWithSelectedColumns);
  $('#csv-select-all')?.addEventListener('click', () => { $$('#csv-modal-overlay input[type="checkbox"]').forEach(cb=>cb.checked=true); });
  $('#csv-select-basic')?.addEventListener('click', () => { $$('#csv-modal-overlay input[type="checkbox"]').forEach(cb=>cb.checked=false); ['csv-col-id','csv-col-title','csv-col-category','csv-col-rating','csv-col-url'].forEach(id=>{const cb=$(`#${id}`);if(cb)cb.checked=true;}); });
}

function downloadWithSelectedColumns() {
  const data = csvDownloadType==='all' ? S.courses : csvDownloadType==='new' ? S.courses.filter(c=>c.isNew) : S.filtered;
  if(data.length===0){toast('데이터 없음','warning');return;}
  const colMap = {'csv-col-id':{key:'id',h:'강의ID'},'csv-col-title':{key:'title',h:'강의명'},'csv-col-category':{key:'category',h:'카테고리'},'csv-col-instructor':{key:'instructor',h:'강사'},'csv-col-rating':{key:'rating',h:'평점'},'csv-col-enrollments':{key:'enrollments',h:'수강신청수'},'csv-col-language':{key:'language',h:'언어'},'csv-col-subtitles':{key:'subtitles',h:'자막'},'csv-col-difficulty':{key:'difficulty',h:'난이도'},'csv-col-duration':{key:'contentLength',h:'강의시간(분)'},'csv-col-updated':{key:'lastUpdated',h:'업데이트'},'csv-col-url':{key:'url',h:'강의링크'}};
  const cols=[]; Object.entries(colMap).forEach(([id,col])=>{const cb=$(`#${id}`);if(cb&&cb.checked)cols.push(col);});
  if(cols.length===0){toast('최소 1개 선택','warning');return;}
  const headers=cols.map(c=>c.h);
  const rows=data.map(c=>cols.map(col=>{let v=c[col.key]||'';if(col.key==='url')v=buildCourseUrl(c);else if(['title','category','instructor'].includes(col.key))v=`"${String(v).replace(/"/g,'""')}"`;else if(col.key==='subtitles')v=hasKoreanSub(c)?'Y':'N';return v;}).join(','));
  const label=csvDownloadType==='all'?'전체':csvDownloadType==='new'?'신규':'필터링';
  const csv='\uFEFF'+headers.join(',')+'\n'+rows.join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${label}_Courses_${S.subdomain}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
  $('#csv-modal-overlay').classList.remove('active');
  toast(`📥 ${label} ${data.length}개 다운로드 완료`);
}
