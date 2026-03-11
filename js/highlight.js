// ═══════════════════════════════════════════════════════════
// highlight.js — 하이라이트 강의 캐러셀 + 사이드바 연동
// ═══════════════════════════════════════════════════════════

let popularCourses = [];
let curatorPicks = [];
let popularIndex = 0;
let curatorIndex = 0;
let popularInterval = null;
let curatorInterval = null;

const DEFAULT_CURATOR_PICKS = ['8324', '1717020', '2360128'];

function initHighlight() {
  // ★ 최신 인기 과정 — 한글자막 + 평점 4.5+ + 수강 1000+ + 최신순
  popularCourses = S.courses
    .filter(c => hasKoreanSub(c) && c.rating >= 4.5 && c.enrollments >= 1000)
    .sort((a, b) => {
      const da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
      const db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
      return db - da;
    })
    .slice(0, 6);

  const savedPicks = localStorage.getItem('curator_picks');
  const pickIds = savedPicks ? JSON.parse(savedPicks) : DEFAULT_CURATOR_PICKS;
  curatorPicks = pickIds.map(id => S.courses.find(c => c.id === id)).filter(Boolean);

  renderHighlightCarousels();
  startAutoRotation();

  $('#popular-prev').addEventListener('click', () => { popularIndex = (popularIndex - 1 + popularCourses.length) % popularCourses.length; renderPopularCarousel(); });
  $('#popular-next').addEventListener('click', () => { popularIndex = (popularIndex + 1) % popularCourses.length; renderPopularCarousel(); });
  $('#curator-prev').addEventListener('click', () => { curatorIndex = (curatorIndex - 1 + curatorPicks.length) % curatorPicks.length; renderCuratorCarousel(); });
  $('#curator-next').addEventListener('click', () => { curatorIndex = (curatorIndex + 1) % curatorPicks.length; renderCuratorCarousel(); });
}

function renderHighlightCarousels() {
  renderPopularCarousel();
  renderCuratorCarousel();
}

function renderPopularCarousel() {
  if (popularCourses.length === 0) {
    $('#popular-carousel').innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">한글자막 인기 강의를 불러오는 중...</p>';
    return;
  }

  const course = popularCourses[popularIndex];
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const color = getCatColor(cat);
  const enrollText = course.enrollments > 0 ? (course.enrollments >= 10000 ? `${Math.round(course.enrollments/1000)}K▲` : `${course.enrollments.toLocaleString()}▲`) : '-';

  $('#popular-carousel').innerHTML = `
    <div class="highlight-card" style="--card-color:${color}">
      ${course.image ? `<div class="highlight-thumbnail"><img src="${course.image}" alt="${course.title}" /></div>` : ''}
      <div class="highlight-content">
        <span class="highlight-category" style="color:${color}">${getCatEmoji(cat)} ${cat}</span>
        <h4 class="highlight-title" data-course-id="${course.id}" style="cursor:pointer;" title="클릭하면 상세 정보를 볼 수 있습니다">${course.title}</h4>
        <p class="highlight-desc">${course.headline || '이 강의를 확인해보세요!'}</p>
        <div class="highlight-meta">
          <span>⭐ ${course.rating?.toFixed(1) || '-'}</span>
          <span>👥 ${enrollText}</span>
          <span>⏱️ ${formatDuration(course.contentLength) || '-'}</span>
          ${course.isNew ? '<span class="badge-new">✨신규</span>' : ''}
          <span>🇰🇷 한글자막</span>
        </div>
        <div class="highlight-actions">
          <a href="${url}" target="_blank" class="highlight-cta">🚀 학습장으로 워프</a>
          <button class="highlight-detail-btn" data-course-id="${course.id}" title="강의 상세 정보">📋 자세히 보기</button>
        </div>
      </div>
    </div>
  `;

  $('#popular-indicator').textContent = `${popularIndex + 1} / ${popularCourses.length}`;

  // ★ 제목 클릭 → 사이드바
  const titleEl = document.querySelector(`#popular-carousel .highlight-title[data-course-id="${course.id}"]`);
  if (titleEl) {
    titleEl.addEventListener('click', () => openSidePanel(course));
  }

  // ★ 자세히 보기 버튼 → 사이드바
  const detailBtn = document.querySelector(`#popular-carousel .highlight-detail-btn[data-course-id="${course.id}"]`);
  if (detailBtn) {
    detailBtn.addEventListener('click', () => openSidePanel(course));
  }
}

function renderCuratorCarousel() {
  if (curatorPicks.length === 0) {
    $('#curator-carousel').innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">큐레이터 PICK을 설정해주세요.<br><small>로고 3번 클릭으로 관리</small></p>';
    return;
  }

  const course = curatorPicks[curatorIndex];
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const color = getCatColor(cat);
  const enrollText = course.enrollments > 0 ? (course.enrollments >= 10000 ? `${Math.round(course.enrollments/1000)}K▲` : `${course.enrollments.toLocaleString()}▲`) : '-';

  $('#curator-carousel').innerHTML = `
    <div class="highlight-card curator-pick" style="--card-color:${color}">
      ${course.image ? `<div class="highlight-thumbnail"><img src="${course.image}" alt="${course.title}" /></div>` : ''}
      <div class="highlight-content">
        <span class="highlight-category" style="color:var(--warning)">⭐ 큐레이터 추천</span>
        <h4 class="highlight-title" data-course-id="${course.id}" style="cursor:pointer;" title="클릭하면 상세 정보를 볼 수 있습니다">${course.title}</h4>
        <p class="highlight-desc">${course.headline || '큐레이터가 엄선한 강의입니다!'}</p>
        <div class="highlight-meta">
          <span>⭐ ${course.rating?.toFixed(1) || '-'}</span>
          <span>👥 ${enrollText}</span>
          <span>⏱️ ${formatDuration(course.contentLength) || '-'}</span>
          ${hasKoreanSub(course) ? '<span>🇰🇷 한글자막</span>' : ''}
        </div>
        <div class="highlight-actions">
          <a href="${url}" target="_blank" class="highlight-cta">🚀 학습장으로 워프</a>
          <button class="highlight-detail-btn" data-course-id="${course.id}" title="강의 상세 정보">📋 자세히 보기</button>
        </div>
      </div>
    </div>
  `;

  $('#curator-indicator').textContent = `${curatorIndex + 1} / ${curatorPicks.length}`;

  // ★ 제목 클릭 → 사이드바
  const titleEl = document.querySelector(`#curator-carousel .highlight-title[data-course-id="${course.id}"]`);
  if (titleEl) {
    titleEl.addEventListener('click', () => openSidePanel(course));
  }

  // ★ 자세히 보기 버튼 → 사이드바
  const detailBtn = document.querySelector(`#curator-carousel .highlight-detail-btn[data-course-id="${course.id}"]`);
  if (detailBtn) {
    detailBtn.addEventListener('click', () => openSidePanel(course));
  }
}

function startAutoRotation() {
  popularInterval = setInterval(() => {
    if (popularCourses.length > 0) {
      popularIndex = (popularIndex + 1) % popularCourses.length;
      renderPopularCarousel();
    }
  }, 3000);

  curatorInterval = setInterval(() => {
    if (curatorPicks.length > 0) {
      curatorIndex = (curatorIndex + 1) % curatorPicks.length;
      renderCuratorCarousel();
    }
  }, 3000);
}

function stopAutoRotation() {
  if (popularInterval) clearInterval(popularInterval);
  if (curatorInterval) clearInterval(curatorInterval);
}

function setupHoverPause() {
  ['#popular-carousel', '#curator-carousel'].forEach(sel => {
    const el = $(sel);
    if (el) {
      el.addEventListener('mouseenter', stopAutoRotation);
      el.addEventListener('mouseleave', startAutoRotation);
    }
  });
}

function manageCuratorPicks() {
  const currentPicks = localStorage.getItem('curator_picks');
  const pickIds = currentPicks ? JSON.parse(currentPicks) : DEFAULT_CURATOR_PICKS;
  
  const newPicks = prompt(
    '큐레이터 PICK 강의 ID를 입력하세요 (쉼표로 구분):\n\n예: 8324,1717020,2360128\n\n현재 설정:',
    pickIds.join(',')
  );
  
  if (newPicks !== null) {
    const ids = newPicks.split(',').map(id => id.trim()).filter(Boolean);
    localStorage.setItem('curator_picks', JSON.stringify(ids));
    
    curatorPicks = ids.map(id => S.courses.find(c => c.id === id)).filter(Boolean);
    curatorIndex = 0;
    renderCuratorCarousel();
    
    toast(`⭐ 큐레이터 PICK이 ${curatorPicks.length}개로 업데이트되었습니다.`);
  }
}
