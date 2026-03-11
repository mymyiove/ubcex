// ═══════════════════════════════════════════════════════════
// sidepanel.js — AI 요약 제거, 구글 번역기로 대체
// ═══════════════════════════════════════════════════════════

function openSidePanel(course) {
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const durationText = formatDuration(course.contentLength);
  const koSub = hasKoreanSub(course);

  // 자막 한국어화
  let subtitlesKR = '자막 없음';
  if (course.subtitles && course.subtitles !== '없음') {
    const parts = course.subtitles.split(',').map(s => {
      const t = s.trim().toLowerCase();
      if (t.includes('ko')) return '🇰🇷 한국어';
      if (t.includes('en')) return '🇺🇸 영어';
      if (t.includes('ja')) return '🇯🇵 일본어';
      if (t.includes('zh')) return '🇨🇳 중국어';
      if (t.includes('es')) return '🇪🇸 스페인어';
      if (t.includes('fr')) return '🇫🇷 프랑스어';
      if (t.includes('de')) return '🇩🇪 독일어';
      if (t.includes('pt')) return '🇧🇷 포르투갈어';
      if (t.includes('ar')) return '🇸🇦 아랍어';
      if (t.includes('tr')) return '🇹🇷 터키어';
      if (t.includes('ru')) return '🇷🇺 러시아어';
      return s.trim();
    });
    subtitlesKR = [...new Set(parts)].join(', ');
  }

  const diffKR = {'Beginner':'초급자','BEGINNER':'초급자','Intermediate':'중급자','INTERMEDIATE':'중급자','Expert':'고급자','EXPERT':'고급자','All Levels':'모든 수준','ALL_LEVELS':'모든 수준'}[course.difficulty] || course.difficulty;

  let enrollText = '';
  if (course.enrollments > 0) {
    enrollText = course.enrollments >= 10000 ? `${Math.round(course.enrollments/1000)}K명` : `${course.enrollments.toLocaleString()}명`;
  }

  // ★ AI 요약 섹션 제거 — 구글 번역기가 대신함
  const content = `
    <h2 class="sp-title">${course.title}</h2>
    
    ${course.image ? `<div class="sp-thumbnail"><img src="${course.image}" alt="${course.title}" onerror="this.style.display='none'" /></div>` : ''}
    
    <a href="${url}" target="_blank" class="sp-cta" title="학습장에서 이 강의를 수강합니다">🚀 학습장으로 워프 →</a>
    
    <div class="sp-meta">
      <span class="sp-meta-tag">🌌 ${cat}</span>
      <span class="sp-meta-tag">📊 ${diffKR}</span>
      <span class="sp-meta-tag">🌐 ${mapLang(course.language)}</span>
      <span class="sp-meta-tag">💬 ${subtitlesKR}</span>
      ${course.rating > 0 ? `<span class="sp-meta-tag">⭐ ${course.rating.toFixed(1)}점</span>` : ''}
      ${enrollText ? `<span class="sp-meta-tag">👥 ${enrollText}</span>` : ''}
      ${durationText ? `<span class="sp-meta-tag">⏱️ ${durationText}</span>` : ''}
      ${course.isNew ? '<span class="sp-meta-tag">✨ 신규</span>' : ''}
      ${course._score > 0 ? `<span class="sp-meta-tag">🎯 추천도: ${course._score}점</span>` : ''}
    </div>

    ${course.headline ? `<div class="sp-section"><h4>📝 강의 소개</h4><p class="sp-full-text">${course.headline}</p></div>` : ''}
    ${course.objectives ? `<div class="sp-section"><h4>🎯 학습 목표</h4><ul class="sp-full-text">${course.objectives.split('|').map(o => o.trim()).filter(Boolean).map(o => `<li>${o}</li>`).join('')}</ul></div>` : ''}
    ${course.description ? `<div class="sp-section"><h4>📄 상세 설명</h4><div class="sp-full-text sp-description">${course.description.substring(0, 1000)}${course.description.length > 1000 ? '...' : ''}</div></div>` : ''}
    ${course.instructor ? `<div class="sp-section"><h4>👩‍🏫 강사</h4><p>${course.instructor}</p></div>` : ''}
    ${course.topic ? `<div class="sp-section"><h4>💡 주제</h4><p>${course.topic}</p></div>` : ''}

    <p style="font-size:0.75rem;color:var(--text-muted);margin-top:1rem;text-align:center;">💡 페이지 상단의 번역기로 한국어 번역이 가능합니다</p>

    <button class="sp-similar-btn" id="sp-similar" data-id="${course.id}" title="비슷한 강의 검색">🔍 비슷한 별 찾기</button>
  `;

  $('#sp-content').innerHTML = content;
  $('#side-panel-overlay').classList.add('open');
  $('#side-panel').classList.add('open');

  // 비슷한 별 찾기
  $('#sp-similar')?.addEventListener('click', () => {
    const keywords = course.title.split(/[\s:—\-,]+/).filter(w => w.length > 2).slice(0, 3);
    if (cat && cat !== '-') keywords.push(cat);
    $('#search-input').value = keywords.join(', ');
    closeSidePanel();
    switchTab('explore');
    S.sensitivity = 'balanced';
    $$('.sensitivity-btn').forEach(b => b.classList.remove('active'));
    $('.sensitivity-btn[data-sensitivity="balanced"]')?.classList.add('active');
    S.searchMode = 'or';
    $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
    $('.scan-mode-btn[data-mode="or"]')?.classList.add('active');
    applyFilters();
    toast(`🔍 비슷한 별을 스캔합니다.`);
  });
}

function closeSidePanel() {
  $('#side-panel').classList.remove('open');
  setTimeout(() => $('#side-panel-overlay').classList.remove('open'), 350);
}
