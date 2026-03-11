// ═══════════════════════════════════════════════════════════
// sidepanel.js — 강의 상세 사이드 패널 (썸네일, 한국어화, 시간 표시 개선)
// ═══════════════════════════════════════════════════════════

function openSidePanel(course) {
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || 'N/A';
  
  // 강의 시간 표시
  const durationText = formatDuration(course.contentLength);

  // 자막 한국어화
  let subtitlesKR = '자막 없음';
  if (course.subtitles && course.subtitles !== '없음') {
    const subText = course.subtitles.toLowerCase();
    const subParts = [];
    if (subText.includes('ko') || subText.includes('korean') || subText.includes('한국어')) subParts.push('🇰🇷 한국어');
    if (subText.includes('en') || subText.includes('english')) subParts.push('🇺🇸 영어');
    if (subText.includes('ja') || subText.includes('japanese')) subParts.push('🇯🇵 일본어');
    if (subText.includes('zh') || subText.includes('chinese')) subParts.push('🇨🇳 중국어');
    if (subText.includes('es') || subText.includes('spanish')) subParts.push('🇪🇸 스페인어');
    if (subText.includes('fr') || subText.includes('french')) subParts.push('🇫🇷 프랑스어');
    if (subText.includes('de') || subText.includes('german')) subParts.push('🇩🇪 독일어');
    if (subText.includes('pt') || subText.includes('portuguese')) subParts.push('🇧🇷 포르투갈어');
    if (subText.includes('ar') || subText.includes('arabic')) subParts.push('🇸🇦 아랍어');
    if (subText.includes('tr') || subText.includes('turkish')) subParts.push('🇹🇷 터키어');
    if (subText.includes('id') || subText.includes('indonesian')) subParts.push('🇮🇩 인도네시아어');
    if (subText.includes('hi') || subText.includes('hindi')) subParts.push('🇮🇳 힌디어');
    if (subText.includes('pl') || subText.includes('polish')) subParts.push('🇵🇱 폴란드어');
    if (subText.includes('ru') || subText.includes('russian')) subParts.push('🇷🇺 러시아어');
    if (subText.includes('it') || subText.includes('italian')) subParts.push('🇮🇹 이탈리아어');
    
    subtitlesKR = subParts.length > 0 ? subParts.join(', ') : course.subtitles;
  }

  // 난이도 한국어화
  const difficultyKR = {
    'Beginner': '초급자',
    'BEGINNER': '초급자',
    'Intermediate': '중급자',
    'INTERMEDIATE': '중급자',
    'Expert': '고급자',
    'EXPERT': '고급자',
    'All Levels': '모든 수준',
    'ALL_LEVELS': '모든 수준'
  }[course.difficulty] || course.difficulty;

  // 언어 한국어화
  const languageKR = {
    'English': '영어', 'Korean': '한국어', 'Spanish': '스페인어',
    'French': '프랑스어', 'German': '독일어', 'Japanese': '일본어',
    'Chinese': '중국어', 'Portuguese': '포르투갈어', 'Russian': '러시아어',
    'Italian': '이탈리아어', 'Turkish': '터키어', 'Arabic': '아랍어',
    'Hindi': '힌디어', 'Indonesian': '인도네시아어', 'Polish': '폴란드어'
  }[course.language] || course.language;

  // 수강신청 수 표시
  let enrollText = '';
  if (course.enrollments > 0) {
    if (course.enrollments >= 10000) {
      enrollText = `${Math.round(course.enrollments / 1000)}K명`;
    } else {
      enrollText = `${course.enrollments.toLocaleString()}명`;
    }
  }

  const content = `
    <h2 class="sp-title">${course.title}</h2>
    
    ${course.image ? `
      <div class="sp-thumbnail">
        <img src="${course.image}" alt="${course.title}" onerror="this.style.display='none'" />
      </div>
    ` : ''}
    
    <a href="${url}" target="_blank" class="sp-cta" title="학습장에서 이 강의를 수강합니다">🚀 학습장으로 워프 →</a>
    
    <div class="sp-meta">
      <span class="sp-meta-tag" title="강의 카테고리">🌌 ${cat}</span>
      <span class="sp-meta-tag" title="강의 난이도">📊 ${difficultyKR}</span>
      <span class="sp-meta-tag" title="강의 언어">🌐 ${languageKR}</span>
      <span class="sp-meta-tag" title="자막 언어">💬 ${subtitlesKR}</span>
      ${course.rating > 0 ? `<span class="sp-meta-tag" title="강의 평점">⭐ ${course.rating.toFixed(1)}점</span>` : ''}
      ${enrollText ? `<span class="sp-meta-tag" title="수강신청 수">👥 ${enrollText}</span>` : ''}
      ${durationText ? `<span class="sp-meta-tag" title="총 강의 시간">⏱️ ${durationText}</span>` : ''}
      ${course.isNew ? '<span class="sp-meta-tag" title="최근 3개월 내 업데이트">✨ 신규</span>' : ''}
      ${course._score > 0 ? `<span class="sp-meta-tag" title="검색 관련도 점수">🎯 관련도: ${course._score}점</span>` : ''}
    </div>

    ${course.headline ? `
      <div class="sp-section">
        <h4>📝 강의 소개</h4>
        <p>${course.headline}</p>
      </div>
    ` : ''}

    ${course.objectives ? `
      <div class="sp-section">
        <h4>🎯 학습 목표</h4>
        <ul>${course.objectives.split('|').map(o => o.trim()).filter(Boolean).map(o => `<li>${o}</li>`).join('')}</ul>
      </div>
    ` : ''}

    ${course.instructor ? `
      <div class="sp-section">
        <h4>👩‍🏫 강사 정보</h4>
        <p>${course.instructor}</p>
      </div>
    ` : ''}

    ${course.topic ? `
      <div class="sp-section">
        <h4>💡 관련 주제</h4>
        <p>${course.topic}</p>
      </div>
    ` : ''}

    <div class="sp-section">
      <h4>🤖 AI 분석</h4>
      <div id="sp-ai" class="ai-loading"><span class="spinner"></span> AI가 분석 중입니다...</div>
    </div>

    <button class="sp-similar-btn" id="sp-similar" data-id="${course.id}" title="이 강의와 비슷한 강의를 검색합니다">🔍 비슷한 별 찾기</button>
  `;

  $('#sp-content').innerHTML = content;
  $('#side-panel-overlay').classList.add('open');
  $('#side-panel').classList.add('open');

  // 비슷한 별 찾기
  const similarBtn = $('#sp-similar');
  if (similarBtn) {
    similarBtn.addEventListener('click', () => {
      const keywords = [];
      // 제목에서 핵심 단어 추출 (3단어)
      const titleWords = course.title.split(/[\s:—\-,]+/).filter(w => w.length > 2).slice(0, 3);
      keywords.push(...titleWords);
      if (cat && cat !== 'N/A') keywords.push(cat);
      
      $('#search-input').value = keywords.join(', ');
      closeSidePanel();
      switchTab('explore');
      
      // 감도를 보통으로 설정
      S.sensitivity = 'balanced';
      $$('.sensitivity-btn').forEach(b => b.classList.remove('active'));
      $('.sensitivity-btn[data-sensitivity="balanced"]')?.classList.add('active');
      
      S.searchMode = 'or';
      $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
      $('.scan-mode-btn[data-mode="or"]')?.classList.add('active');
      
      applyFilters();
      toast(`🔍 "${course.title.substring(0,30)}..."와 비슷한 별을 스캔합니다.`);
    });
  }

  // AI 요약 (비동기)
  fetch('/api/ai-summarize', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ 
      title: course.title, 
      headline: course.headline, 
      description: course.description?.substring(0, 2000), 
      objectives: course.objectives 
    })
  }).then(r => r.json()).then(data => {
    const ai = $('#sp-ai');
    if (!ai) return;
    if (data.success && data.data) {
      const d = data.data;
      ai.innerHTML = `
        ${d.summary ? `<p><strong>📋 요약:</strong> ${d.summary}</p>` : ''}
        ${d.recommendedFor?.length ? `<p><strong>👥 추천 대상:</strong> ${d.recommendedFor.join(', ')}</p>` : ''}
        ${d.keyTopics?.length ? `<p><strong>🔑 주요 토픽:</strong> ${d.keyTopics.join(', ')}</p>` : ''}
        ${d.practicalValue ? `<p><strong>💼 실무 활용:</strong> ${d.practicalValue}</p>` : ''}
      `;
      ai.classList.remove('ai-loading');
    } else {
      ai.innerHTML = `<p style="color:var(--text-muted)">AI 분석을 불러올 수 없습니다. ${data.error ? '(' + data.error.substring(0,50) + ')' : ''}</p>`;
      ai.classList.remove('ai-loading');
    }
  }).catch(err => {
    const ai = $('#sp-ai');
    if(ai) { 
      ai.innerHTML = `<p style="color:var(--text-muted)">AI 분석 연결 실패</p>`; 
      ai.classList.remove('ai-loading'); 
    }
  });
}

function closeSidePanel() {
  $('#side-panel').classList.remove('open');
  setTimeout(() => $('#side-panel-overlay').classList.remove('open'), 350);
}
