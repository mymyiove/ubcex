// ═══════════════════════════════════════════════════════════
// highlight.js — 하이라이트 강의 캐러셀 (최신 인기 + 큐레이터 PICK)
// ═══════════════════════════════════════════════════════════

let popularCourses = [];
let curatorPicks = [];
let popularIndex = 0;
let curatorIndex = 0;
let popularInterval = null;
let curatorInterval = null;

// 큐레이터 PICK 기본값 (관리자 모드에서 수정 가능)
const DEFAULT_CURATOR_PICKS = [
  '8324',    // Javascript for Beginners
  '1717020', // 이탈리아어 강의
  '2360128'  // 프로크라스티네이션
];

function initHighlight() {
  // 최신 인기 과정 TOP 6 (평점 4.5+ & 수강 1000+ & 최신순)
  popularCourses = S.courses
    .filter(c => c.rating >= 4.5 && c.enrollments >= 1000)
    .sort((a, b) => {
      const da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
      const db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
      return db - da;
    })
    .slice(0, 6);

  // 큐레이터 PICK (localStorage에서 불러오거나 기본값)
  const savedPicks = localStorage.getItem('curator_picks');
  const pickIds = savedPicks ? JSON.parse(savedPicks) : DEFAULT_CURATOR_PICKS;
  curatorPicks = pickIds.map(id => S.courses.find(c => c.id === id)).filter(Boolean);

  renderHighlightCarousels();
  startAutoRotation();

  // 컨트롤 버튼 이벤트
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
    $('#popular-carousel').innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">인기 강의를 불러오는 중...</p>';
    return;
  }

  const course = popularCourses[popularIndex];
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const color = getCatColor(cat);

  $('#popular-carousel').innerHTML = `
    <div class="highlight-card" style="--card-color:${color}">
      ${course.image ? `<div class="highlight-thumbnail"><img src="${course.image}" alt="${course.title}" /></div>` : ''}
      <div class="highlight-content">
        <span class="highlight-category" style="color:${color}">${getCatEmoji(cat)} ${cat}</span>
        <h4 class="highlight-title">${course.title}</h4>
        <p class="highlight-desc">${course.headline || '이 강의를 확인해보세요!'}</p>
        <div class="highlight-meta">
          <span>⭐ ${course.rating?.toFixed(1) || '-'}</span>
          <span>👥 ${course.enrollments >= 10000 ? Math.round(course.enrollments/1000)+'K' : course.enrollments?.toLocaleString() || '-'}명</span>
          <span>⏱️ ${formatDuration(course.contentLength) || '-'}</span>
          ${course.isNew ? '<span class="badge-new">✨신규</span>' : ''}
        </div>
        <a href="${url}" target="_blank" class="highlight-cta">🚀 학습장으로 워프 →</a>
      </div>
    </div>
  `;

  $('#popular-indicator').textContent = `${popularIndex + 1} / ${popularCourses.length}`;
}

function renderCuratorCarousel() {
  if (curatorPicks.length === 0) {
    $('#curator-carousel').innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">큐레이터 PICK을 설정해주세요.</p>';
    return;
  }

  const course = curatorPicks[curatorIndex];
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const color = getCatColor(cat);

  $('#curator-carousel').innerHTML = `
    <div class="highlight-card curator-pick" style="--card-color:${color}">
      ${course.image ? `<div class="highlight-thumbnail"><img src="${course.image}" alt="${course.title}" /></div>` : ''}
      <div class="highlight-content">
        <span class="highlight-category" style="color:${color}">⭐ 큐레이터 추천</span>
        <h4 class="highlight-title">${course.title}</h4>
        <p class="highlight-desc">${course.headline || '큐레이터가 엄선한 강의입니다!'}</p>
        <div class="highlight-meta">
          <span>⭐ ${course.rating?.toFixed(1) || '-'}</span>
          <span>👥 ${course.enrollments >= 10000 ? Math.round(course.enrollments/1000)+'K' : course.enrollments?.toLocaleString() || '-'}명</span>
          <span>⏱️ ${formatDuration(course.contentLength) || '-'}</span>
        </div>
        <a href="${url}" target="_blank" class="highlight-cta">🚀 학습장으로 워프 →</a>
      </div>
    </div>
  `;

  $('#curator-indicator').textContent = `${curatorIndex + 1} / ${curatorPicks.length}`;
}

function startAutoRotation() {
  // 3초마다 자동 롤링
  popularInterval = setInterval(() => {
    popularIndex = (popularIndex + 1) % popularCourses.length;
    renderPopularCarousel();
  }, 3000);

  curatorInterval = setInterval(() => {
    curatorIndex = (curatorIndex + 1) % curatorPicks.length;
    renderCuratorCarousel();
  }, 3000);
}

function stopAutoRotation() {
  if (popularInterval) clearInterval(popularInterval);
  if (curatorInterval) clearInterval(curatorInterval);
}

// 마우스 호버 시 자동 롤링 일시 정지
function setupHoverPause() {
  ['#popular-carousel', '#curator-carousel'].forEach(sel => {
    $(sel)?.addEventListener('mouseenter', stopAutoRotation);
    $(sel)?.addEventListener('mouseleave', startAutoRotation);
  });
}

// 큐레이터 PICK 관리 (관리자 모드에서 호출)
function manageCuratorPicks() {
  const currentPicks = localStorage.getItem('curator_picks');
  const pickIds = currentPicks ? JSON.parse(currentPicks) : DEFAULT_CURATOR_PICKS;
  
  const newPicks = prompt(
    '큐레이터 PICK 강의 ID를 입력하세요 (쉼표로 구분):\n\n예: 8324,1717020,2360128',
    pickIds.join(',')
  );
  
  if (newPicks !== null) {
    const ids = newPicks.split(',').map(id => id.trim()).filter(Boolean);
    localStorage.setItem('curator_picks', JSON.stringify(ids));
    
    // 새로운 PICK으로 업데이트
    curatorPicks = ids.map(id => S.courses.find(c => c.id === id)).filter(Boolean);
    curatorIndex = 0;
    renderCuratorCarousel();
    
    toast(`⭐ 큐레이터 PICK이 ${curatorPicks.length}개로 업데이트되었습니다.`);
  }
}
