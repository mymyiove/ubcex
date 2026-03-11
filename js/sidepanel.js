// ═══════════════════════════════════════════════════════════
// sidepanel.js — 강의 상세 사이드 패널
// ═══════════════════════════════════════════════════════════

function openSidePanel(course) {
  const url = buildCourseUrl(course);
  $('#sp-title').textContent = course.title;

  const cat = course.category?.split(',')[0]?.trim() || 'N/A';
  $('#sp-meta').innerHTML = `
    <span class="sp-meta-tag">🌌 ${cat}</span>
    <span class="sp-meta-tag">📊 ${course.difficulty}</span>
    <span class="sp-meta-tag">🌐 ${course.language}</span>
    <span class="sp-meta-tag">💬 ${course.subtitles}</span>
    ${course.rating > 0 ? `<span class="sp-meta-tag">⭐ ${course.rating.toFixed(1)}</span>` : ''}
    ${course.enrollments > 0 ? `<span class="sp-meta-tag">👥 ${course.enrollments.toLocaleString()}명</span>` : ''}
    ${course.contentLength ? `<span class="sp-meta-tag">⏱️ ${Math.round(course.contentLength/60)}시간</span>` : ''}
    ${course.isNew ? '<span class="sp-meta-tag">✨ NEW</span>' : ''}
    ${course._score > 0 ? `<span class="sp-meta-tag">🎯 관련도: ${course._score}점</span>` : ''}
  `;

  let bodyHtml = '';
  if(course.headline) bodyHtml += `<div class="sp-section"><h4>📝 소개</h4><p>${course.headline}</p></div>`;
  if(course.objectives) bodyHtml += `<div class="sp-section"><h4>🎯 학습 목표</h4><ul>${course.objectives.split('|').map(o => `<li>${o.trim()}</li>`).join('')}</ul></div>`;
  if(course.instructor) bodyHtml += `<div class="sp-section"><h4>👩‍🏫 강사</h4><p>${course.instructor}</p></div>`;

  bodyHtml += `<div class="sp-section"><h4>🤖 AI 분석</h4><div id="sp-ai" class="ai-loading"><span class="spinner"></span> AI가 분석 중입니다...</div></div>`;
  bodyHtml += `<a href="${url}" target="_blank" class="sp-cta">🚀 학습장으로 워프 →</a>`;
  bodyHtml += `<button class="sp-similar-btn" id="sp-similar" data-id="${course.id}">🔍 비슷한 별 찾기</button>`;

  $('#sp-body').innerHTML = bodyHtml;
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
        ${d.summary ? `<p>${d.summary}</p>` : ''}
        ${d.recommendedFor?.length ? `<p><strong>추천 대상:</strong> ${d.recommendedFor.join(', ')}</p>` : ''}
        ${d.keyTopics?.length ? `<p><strong>주요 토픽:</strong> ${d.keyTopics.join(', ')}</p>` : ''}
        ${d.practicalValue ? `<p><strong>실무 활용:</strong> ${d.practicalValue}</p>` : ''}
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
