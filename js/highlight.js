// ═══════════════════════════════════════════════════════════
// highlight.js — 직무 선택 반영 + 항해사's PICK
// ═══════════════════════════════════════════════════════════
let popularCourses = [];
let curatorPicks = [];
let popularIndex = 0;
let curatorIndex = 0;
let popularInterval = null;
let curatorInterval = null;
const DEFAULT_CURATOR_PICKS = ['8324', '1717020', '2360128'];

// ★ 선택된 직무의 카테고리 목록 추출
function getSelectedJobCats() {
  if (!S.selectedFamilies || S.selectedFamilies.length === 0) return [];
  const cats = new Set();
  S.selectedFamilies.forEach(famId => {
    const fam = CURATION[famId];
    if (fam && fam.roles) {
      fam.roles.forEach(role => {
        if (role.cats) role.cats.forEach(c => cats.add(c));
      });
    }
  });
  return [...cats];
}

// ★ 선택된 직무 이름 텍스트
function getSelectedJobNames() {
  if (!S.selectedFamilies || S.selectedFamilies.length === 0) return '';
  return S.selectedFamilies.map(f => CURATION[f]?.name || '').filter(Boolean).join(', ');
}

function initHighlight() {
  const jobCats = getSelectedJobCats();
  
  // ★ 최신 인기 별 — 직무 카테고리 매칭
  let candidates = S.courses.filter(c => hasKoreanSub(c) && c.rating >= 4.5 && c.enrollments >= 1000);
  
  if (jobCats.length > 0) {
    const jobFiltered = candidates.filter(c => {
      const courseCat = (c.category || '').toLowerCase();
      return jobCats.some(jc => courseCat.includes(jc.toLowerCase()));
    });
    // 직무 관련 강의가 3개 이상이면 그걸 사용
    if (jobFiltered.length >= 3) candidates = jobFiltered;
  }
  
  popularCourses = candidates
    .sort((a, b) => {
      const da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
      const db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
      return db - da;
    })
    .slice(0, 6);

  // 항해사's PICK
  const savedPicks = localStorage.getItem('curator_picks');
  const pickIds = savedPicks ? JSON.parse(savedPicks) : DEFAULT_CURATOR_PICKS;
  curatorPicks = pickIds.map(id => S.courses.find(c => c.id === id)).filter(Boolean);

  // ★ 헤더 텍스트 업데이트
  const jobNames = getSelectedJobNames();
  const popularHeader = $('#popular-header-text');
  const curatorHeader = $('#curator-header-text');
  if (popularHeader) popularHeader.textContent = jobNames ? `🔥 ${jobNames}를 위한 최신 인기 별` : '🔥 최신 인기 별';
  if (curatorHeader) curatorHeader.textContent = jobNames ? `⭐ ${jobNames}를 위한 항해사's PICK` : "⭐ 항해사's PICK";

  renderHighlightCarousels();
  startAutoRotation();
  
  $('#popular-prev')?.addEventListener('click', () => { popularIndex = (popularIndex - 1 + popularCourses.length) % popularCourses.length; renderPopularCarousel(); });
  $('#popular-next')?.addEventListener('click', () => { popularIndex = (popularIndex + 1) % popularCourses.length; renderPopularCarousel(); });
  $('#curator-prev')?.addEventListener('click', () => { curatorIndex = (curatorIndex - 1 + curatorPicks.length) % curatorPicks.length; renderCuratorCarousel(); });
  $('#curator-next')?.addEventListener('click', () => { curatorIndex = (curatorIndex + 1) % curatorPicks.length; renderCuratorCarousel(); });
}

function renderHighlightCarousels() { renderPopularCarousel(); renderCuratorCarousel(); }

function renderPopularCarousel() {
  if (popularCourses.length === 0) {
    $('#popular-carousel').innerHTML = '<div class="empty-state">한글자막 인기 강의를 불러오는 중...</div>';
    return;
  }
  const course = popularCourses[popularIndex];
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const color = getCatColor(cat);
  const enrollText = course.enrollments > 0 ? (course.enrollments >= 10000 ? `${Math.round(course.enrollments/1000)}K▲` : `${course.enrollments.toLocaleString()}▲`) : '-';
  
  $('#popular-carousel').innerHTML = `
    <div class="highlight-card" style="--card-color:${color}">
      ${course.image ? `<div class="highlight-thumbnail"><img src="${course.image}" alt="" loading="lazy"></div>` : ''}
      <div class="highlight-content">
        <div class="highlight-category" style="color:${color}">${getCatEmoji(cat)} ${cat}</div>
        <h4 class="highlight-title" data-course-id="${course.id}">${course.title}</h4>
        <p class="highlight-desc">${course.headline || '이 강의를 확인해보세요!'}</p>
        <div class="highlight-meta">⭐ ${course.rating?.toFixed(1)||'-'} 👥 ${enrollText} ⏱️ ${formatDuration(course.contentLength)||'-'} ${course.isNew?'✨신규':''} 🇰🇷 한글자막</div>
        <div class="highlight-actions">
          <a href="${url}" target="_blank" class="highlight-cta">🚀 학습장으로 워프</a>
          <button class="highlight-detail-btn" data-course-id="${course.id}">📋 자세히 보기</button>
        </div>
      </div>
    </div>`;
  $('#popular-indicator').textContent = `${popularIndex + 1} / ${popularCourses.length}`;
  document.querySelector(`#popular-carousel .highlight-title[data-course-id="${course.id}"]`)?.addEventListener('click', () => openSidePanel(course));
  document.querySelector(`#popular-carousel .highlight-detail-btn[data-course-id="${course.id}"]`)?.addEventListener('click', () => openSidePanel(course));
}

function renderCuratorCarousel() {
  if (curatorPicks.length === 0) {
    $('#curator-carousel').innerHTML = '<div class="empty-state">항해사\'s PICK을 설정해주세요.<br><small>로고 3번 클릭으로 관리</small></div>';
    return;
  }
  const course = curatorPicks[curatorIndex];
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const color = getCatColor(cat);
  const enrollText = course.enrollments > 0 ? (course.enrollments >= 10000 ? `${Math.round(course.enrollments/1000)}K▲` : `${course.enrollments.toLocaleString()}▲`) : '-';
  
  $('#curator-carousel').innerHTML = `
    <div class="highlight-card curator-pick" style="--card-color:${color}">
      ${course.image ? `<div class="highlight-thumbnail"><img src="${course.image}" alt="" loading="lazy"></div>` : ''}
      <div class="highlight-content">
        <div class="highlight-category" style="color:var(--warning)">⭐ 항해사 추천</div>
        <h4 class="highlight-title" data-course-id="${course.id}">${course.title}</h4>
        <p class="highlight-desc">${course.headline || '항해사가 엄선한 강의입니다!'}</p>
        <div class="highlight-meta">⭐ ${course.rating?.toFixed(1)||'-'} 👥 ${enrollText} ⏱️ ${formatDuration(course.contentLength)||'-'} ${hasKoreanSub(course)?'🇰🇷 한글자막':''}</div>
        <div class="highlight-actions">
          <a href="${url}" target="_blank" class="highlight-cta">🚀 학습장으로 워프</a>
          <button class="highlight-detail-btn" data-course-id="${course.id}">📋 자세히 보기</button>
        </div>
      </div>
    </div>`;
  $('#curator-indicator').textContent = `${curatorIndex + 1} / ${curatorPicks.length}`;
  document.querySelector(`#curator-carousel .highlight-title[data-course-id="${course.id}"]`)?.addEventListener('click', () => openSidePanel(course));
  document.querySelector(`#curator-carousel .highlight-detail-btn[data-course-id="${course.id}"]`)?.addEventListener('click', () => openSidePanel(course));
}

function startAutoRotation() {
  stopAutoRotation();
  popularInterval = setInterval(() => { if(popularCourses.length>0){popularIndex=(popularIndex+1)%popularCourses.length;renderPopularCarousel();} }, 3000);
  curatorInterval = setInterval(() => { if(curatorPicks.length>0){curatorIndex=(curatorIndex+1)%curatorPicks.length;renderCuratorCarousel();} }, 3000);
}
function stopAutoRotation() { if(popularInterval)clearInterval(popularInterval); if(curatorInterval)clearInterval(curatorInterval); }
function setupHoverPause() {
  ['#popular-carousel','#curator-carousel'].forEach(sel => { const el=$(sel); if(el){el.addEventListener('mouseenter',stopAutoRotation);el.addEventListener('mouseleave',startAutoRotation);} });
}
function manageCuratorPicks() {
  const currentPicks=localStorage.getItem('curator_picks'); const pickIds=currentPicks?JSON.parse(currentPicks):DEFAULT_CURATOR_PICKS;
  const newPicks=prompt("항해사's PICK 강의 ID를 입력하세요 (쉼표로 구분):\n\n예: 8324,1717020,2360128\n\n현재 설정:",pickIds.join(','));
  if(newPicks!==null){const ids=newPicks.split(',').map(id=>id.trim()).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(ids));curatorPicks=ids.map(id=>S.courses.find(c=>c.id===id)).filter(Boolean);curatorIndex=0;renderCuratorCarousel();toast(`⭐ 항해사's PICK이 ${curatorPicks.length}개로 업데이트되었습니다.`);}
}
