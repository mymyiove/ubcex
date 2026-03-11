// ═══════════════════════════════════════════════════════════
// sidepanel.js — 강의 상세 사이드 패널 (AI JSON 파싱 개선)
// ═══════════════════════════════════════════════════════════

function openSidePanel(course) {
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || 'N/A';
  const durationText = formatDuration(course.contentLength);

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
      if (t.includes('it')) return '🇮🇹 이탈리아어';
      return s.trim();
    });
    subtitlesKR = [...new Set(parts)].join(', ');
  }

  const diffKR = {'Beginner':'초급자','BEGINNER':'초급자','Intermediate':'중급자','INTERMEDIATE':'중급자','Expert':'고급자','EXPERT':'고급자','All Levels':'모든 수준','ALL_LEVELS':'모든 수준'}[course.difficulty] || course.difficulty;

  let enrollText = '';
  if (course.enrollments > 0) {
    enrollText = course.enrollments >= 10000 ? `${Math.round(course.enrollments/1000)}K명` : `${course.enrollments.toLocaleString()}명`;
  }

  const content = `
    <h2 class="sp-title">${course.title}</h2>
    
    ${course.image ? `<div class="sp-thumbnail"><img src="${course.image}" alt="${course.title}" onerror="this.style.display='none'" /></div>` : ''}
    
    <a href="${url}" target="_blank" class="sp-cta" title="학습장에서 이 강의를 수강합니다">🚀 학습장으로 워프 →</a>
    
    <div class="sp-meta">
      <span class="sp-meta-tag" title="카테고리">🌌 ${cat}</span>
      <span class="sp-meta-tag" title="난이도">📊 ${diffKR}</span>
      <span class="sp-meta-tag" title="언어">🌐 ${mapLang(course.language)}</span>
      <span class="sp-meta-tag" title="자막">💬 ${subtitlesKR}</span>
      ${course.rating > 0 ? `<span class="sp-meta-tag" title="평점">⭐ ${course.rating.toFixed(1)}점</span>` : ''}
      ${enrollText ? `<span class="sp-meta-tag" title="수강신청 수">👥 ${enrollText}</span>` : ''}
      ${durationText ? `<span class="sp-meta-tag" title="총 강의 시간">⏱️ ${durationText}</span>` : ''}
      ${course.isNew ? '<span class="sp-meta-tag" title="최근 3개월 내 업데이트">✨ 신규</span>' : ''}
    </div>

    ${course.headline ? `<div class="sp-section"><h4>📝 강의 소개</h4><p>${course.headline}</p></div>` : ''}
    ${course.objectives ? `<div class="sp-section"><h4>🎯 학습 목표</h4><ul>${course.objectives.split('|').map(o => o.trim()).filter(Boolean).map(o => `<li>${o}</li>`).join('')}</ul></div>` : ''}
    ${course.instructor ? `<div class="sp-section"><h4>👩‍🏫 강사</h4><p>${course.instructor}</p></div>` : ''}
    ${course.topic ? `<div class="sp-section"><h4>💡 주제</h4><p>${course.topic}</p></div>` : ''}

    <div class="sp-section">
      <h4>🤖 AI 분석</h4>
      <div id="sp-ai" class="ai-loading"><span class="spinner"></span> AI가 분석 중입니다...</div>
    </div>

    <button class="sp-similar-btn" id="sp-similar" data-id="${course.id}" title="비슷한 강의 검색">🔍 비슷한 별 찾기</button>
  `;

  $('#sp-content').innerHTML = content;
  $('#side-panel-overlay').classList.add('open');
  $('#side-panel').classList.add('open');

  // 비슷한 별 찾기
  $('#sp-similar')?.addEventListener('click', () => {
    const keywords = course.title.split(/[\s:—\-,]+/).filter(w => w.length > 2).slice(0, 3);
    if (cat && cat !== 'N/A') keywords.push(cat);
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

  // ★ AI 요약 — JSON 파싱 개선
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
      let html = '';
      
      // 안전한 텍스트 추출 — JSON 잔여물 제거
      const cleanText = (text) => {
        if (!text) return '';
        if (typeof text !== 'string') text = String(text);
        // JSON 관련 잔여물 제거
        return text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .replace(/^\s*\{[\s\S]*\}\s*$/g, '') // 순수 JSON 객체 제거
          .replace(/\\n/g, ' ')
          .replace(/\\"/g, '"')
          .trim();
      };
      
      const summary = cleanText(d.summary);
      if (summary && summary.length > 5) html += `<p><strong>📋 요약:</strong> ${summary}</p>`;
      
      if (d.recommendedFor && Array.isArray(d.recommendedFor) && d.recommendedFor.length > 0) {
        html += `<p><strong>👥 추천 대상:</strong> ${d.recommendedFor.join(', ')}</p>`;
      }
      
      if (d.keyTopics && Array.isArray(d.keyTopics) && d.keyTopics.length > 0) {
        html += `<p><strong>🔑 주요 토픽:</strong> ${d.keyTopics.join(', ')}</p>`;
      }
      
      const practical = cleanText(d.practicalValue);
      if (practical && practical.length > 5) html += `<p><strong>💼 실무 활용:</strong> ${practical}</p>`;
      
      ai.innerHTML = html || '<p style="color:var(--text-muted)">AI 분석 결과를 표시할 수 없습니다.</p>';
      ai.classList.remove('ai-loading');
    } else {
      ai.innerHTML = `<p style="color:var(--text-muted)">AI 분석을 불러올 수 없습니다.</p>`;
      ai.classList.remove('ai-loading');
    }
  }).catch(() => {
    const ai = $('#sp-ai');
    if(ai) { ai.innerHTML = '<p style="color:var(--text-muted)">AI 분석 연결 실패</p>'; ai.classList.remove('ai-loading'); }
  });
}

function closeSidePanel() {
  $('#side-panel').classList.remove('open');
  setTimeout(() => $('#side-panel-overlay').classList.remove('open'), 350);
}
