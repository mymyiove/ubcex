// ═══════════════════════════════════════════════════════════
// stars.js — TOP 6 (한글자막 강의만)
// ═══════════════════════════════════════════════════════════

function initStars() {
  $$('.scan-mode-btn[data-stars]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.scan-mode-btn[data-stars]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.starsMode = btn.dataset.stars;
      renderStars();
    });
  });
  renderStars();
}

function renderStars() {
  let courses = [];
  
  // ★ 모든 모드에서 한글자막 있는 강의만 필터링
  const koreanSubCourses = S.courses.filter(c => hasKoreanSub(c));
  
  if (S.starsMode === 'rating') {
    courses = koreanSubCourses.filter(c => c.rating > 0).sort((a,b) => b.rating - a.rating).slice(0, 6);
  } else if (S.starsMode === 'popular') {
    courses = koreanSubCourses.filter(c => c.enrollments > 0).sort((a,b) => b.enrollments - a.enrollments).slice(0, 6);
  } else if (S.starsMode === 'korean') {
    courses = koreanSubCourses.filter(c => c.language === '한국어').sort((a,b) => (b.rating||0) - (a.rating||0)).slice(0, 6);
  }

  const container = $('#stars-content');
  if(courses.length === 0) { 
    container.innerHTML = '<p style="color:var(--text-muted);padding:2rem;">한글자막이 있는 해당 조건의 별이 없습니다.</p>'; 
    return; 
  }

  const hero = courses[0];
  const heroUrl = buildCourseUrl(hero);
  const rest = courses.slice(1);

  container.innerHTML = `
    <div class="hero-card">
      <span class="rank">🏆 가장 밝은 별 #1 (🇰🇷 한글자막)</span>
      <h3><a href="${heroUrl}" target="_blank">${hero.title}</a></h3>
      <p>${hero.headline || '이 별을 탐험해보세요!'}</p>
      <div style="margin:0.5rem 0;font-size:0.8rem;color:var(--text-secondary);">
        ⭐ ${hero.rating?.toFixed(1) || 'N/A'} | 👥 ${hero.enrollments?.toLocaleString() || 'N/A'}명 | 💬 한글자막
      </div>
      <a href="${heroUrl}" target="_blank" class="hero-cta">🚀 워프 점프 →</a>
    </div>
    <div class="stars-grid">
      ${rest.map((c, i) => {
        const url = buildCourseUrl(c);
        return `<div class="star-card">
          <span class="rank">⭐ #${i+2}</span>
          <h4><a href="${url}" target="_blank">${c.title}</a></h4>
          <p>${c.headline || ''}</p>
          <div style="margin-top:0.5rem;font-size:0.75rem;color:var(--text-muted);">
            ⭐ ${c.rating?.toFixed(1) || 'N/A'} | 👥 ${c.enrollments?.toLocaleString() || 'N/A'}명 | 🇰🇷 한글자막
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}
