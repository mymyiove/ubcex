// ═══════════════════════════════════════════════════════════
// sidepanel.js — 강의 상세 사이드 패널 (썸네일, 한국어화 포함)
// ═══════════════════════════════════════════════════════════

function openSidePanel(course) {
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || 'N/A';
  
  // 강의 시간 계산 (분 → 시간)
  let durationText = '';
  if (course.contentLength && course.contentLength > 0) {
    const hours = Math.floor(course.contentLength / 60);
    const minutes = course.contentLength % 60;
    if (hours > 0) {
      durationText = minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
    } else {
      durationText = `${minutes}분`;
    }
  }

  // 자막 한국어화
  let subtitlesKR = '자막 없음';
  if (course.subtitles && course.subtitles !== '없음') {
    const subText = course.subtitles.toLowerCase();
    if (subText.includes('korean') || subText.includes('한국어')) {
      subtitlesKR = '🇰🇷 한국어 자막';
    } else if (subText.includes('english')) {
      subtitlesKR = '🇺🇸 영어 자막';
    } else {
      subtitlesKR = course.subtitles;
    }
  }

  // 난이도 한국어화
  const difficultyKR = {
    'Beginner': '초급자',
    'Intermediate': '중급자', 
    'Expert': '고급자',
    'All Levels': '모든 수준'
  }[course.difficulty] || course.difficulty;

  // 언어 한국어화
  const languageKR = {
    'English': '영어',
    'Korean': '한국어',
    'Spanish': '스페인어',
    'French': '프랑스어',
    'German': '독일어',
    'Japanese': '일본어',
    'Chinese': '중국어'
  }[course.language] || course.language;

  const content = `
    <h2 class="sp-title">${course.title}</h2>
    
    ${course.image ? `
      <div class="sp-thumbnail">
        <img src="${course.image}" alt="${course.title}" />
      </div>
    ` : ''}
    
    <a href="${url}" target="_blank" class="sp-cta">🚀 학습장으로 워프 →</a>
    
    <div class="sp-meta">
      <span class="sp-meta-tag">🌌 ${cat}</span>
      <span class="sp-meta-tag">📊 ${difficultyKR}</span>
      <span class="sp-meta-tag">🌐 ${languageKR}</span>
      <span class="sp-meta-tag">💬 ${subtitlesKR}</span>
      ${course.rating > 0 ? `<span class="sp-meta-tag">⭐ ${course.rating.toFixed(1)}점</span>` : ''}
      ${course.enrollments > 0 ? `<span class="sp-meta-tag">👥 ${course.enrollments.toLocaleString()}명</span>` : ''}
      ${durationText ? `<span class="sp-meta-tag">⏱️ ${durationText}</span>` : ''}
      ${course.isNew ? '<span class="sp-meta-tag">✨ 신규</span>' : ''}
      ${course._score > 0 ? `<span class="sp-meta-tag">🎯 관련도: ${course._score}점</span>` : ''}
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
        <ul>${course.objectives.split('|').map(o => `<li>${o.trim()}</li>`).join('')}</ul>
      </div>
    ` : ''}

    ${course.instructor ? `
      <div class="sp-section">
        <h4>👩‍🏫 강사 정보</h4>
        <p>${course.instructor}</p>
      </div>
    ` : ''}

    <div class="sp-section">
      <h4>🤖 AI 분석</h4>
      <div id="sp-ai" class="ai-loading"><span class="spinner"></span> AI가 분석 중입니다...</div>
    </div>

    <button class="sp-similar-btn" id="sp-similar" data-id="${course.id}">🔍 비슷한 별 찾기</button>
  `;

  $('#sp-content').innerHTML = content;
  $('#side-panel-overlay').classList.add('open');
  $('#side-panel').classList.add('open');

  // 비슷한 별 찾기
  $('#sp-similar').addEventListener('click', () => {
    const keywords = [course.title.split(/[\s:—-]+/).slice(0,3).join(' '), cat].filter(Boolean);
    $('#search-input').value = keywords.join(', ');
    closeSidePanel();
    switchTab('explore');
    applyFilters();
    toast(`🔍 "${course.title.substring(0,30)}..."와 비슷한 별을 스캔합니다.`);
  });

  // AI 요약 (비동기)
  fetch('/api/ai-summarize', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ 
      title: course.title, 
      headline: course.headline, 
      description: course.description?.substring(0,2000), 
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
      ai.innerHTML = '<p style="color:var(--text-muted)">AI 분석을 불러올 수 없습니다.</p>';
      ai.classList.remove('ai-loading');
    }
  }).catch(() => {
    const ai = $('#sp-ai');
    if(ai) { ai.innerHTML = '<p style="color:var(--text-muted)">AI 분석 실패</p>'; ai.classList.remove('ai-loading'); }
  });
}

function closeSidePanel() {
  $('#side-panel').classList.remove('open');
  setTimeout(() => $('#side-panel-overlay').classList.remove('open'), 350);
}
