// ═══════════════════════════════════════════════════════════
// sidepanel.js — 사이드패널 + 번역 기능
// ═══════════════════════════════════════════════════════════
function openSidePanel(course) {
  const url = buildCourseUrl(course);
  const cat = course.category?.split(',')[0]?.trim() || '-';
  const durationText = formatDuration(course.contentLength);
  const koSub = hasKoreanSub(course);
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

  const content = `
    <h3 class="sp-title">${course.title}</h3>
    
    ${course.image ? `<div class="sp-thumbnail"><img src="${course.image}" alt="${course.title}" loading="lazy"></div>` : ''}
    
    <a href="${url}" target="_blank" class="sp-cta">🚀 학습장으로 워프 →</a>
    
    <button class="sp-translate-btn" id="sp-translate-btn">🌐 한국어로 번역하기</button>
    
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

    ${course.headline ? `<div class="sp-section sp-translatable"><h4>📝 강의 소개</h4><p>${course.headline}</p></div>` : ''}
    ${course.objectives ? `<div class="sp-section sp-translatable"><h4>🎯 학습 목표</h4>${course.objectives.split('|').map(o => o.trim()).filter(Boolean).map(o => `<div>${o}</div>`).join('')}</div>` : ''}
    ${course.description ? '<div class="sp-section sp-translatable"><h4>📄 상세 설명</h4><div>' + course.description + '</div></div>' : ''}
    ${course.instructor ? `<div class="sp-section"><h4>👩‍🏫 강사</h4><p>${course.instructor}</p></div>` : ''}
    ${course.topic ? `<div class="sp-section"><h4>💡 주제</h4><p>${course.topic}</p></div>` : ''}
    
    <p style="font-size:0.75rem;color:var(--text-muted);text-align:center;margin:0.5rem 0;">💡 페이지 상단의 번역기로도 한국어 번역이 가능합니다</p>

    <button class="sp-similar-btn" id="sp-similar">🔍 비슷한 별 찾기</button>
  `;
  
  $('#sp-content').innerHTML = content;
  $('#side-panel-overlay').classList.add('open');
  $('#side-panel').classList.add('open');
  
  // 번역 버튼 이벤트
  $('#sp-translate-btn')?.addEventListener('click', function() { translateSidePanel(this); });
  
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

// ★ 번역 기능
async function translateSidePanel(btn) {
  if (!btn) return;
  if (btn.classList.contains('translated')) {
    [...document.querySelectorAll('#sp-content .translated-text')].forEach(el => el.remove());
    btn.textContent = '🌐 한국어로 번역하기';
    btn.classList.remove('translated');
    return;
  }
  btn.textContent = '⏳ 번역 중...';
  btn.disabled = true;
  const targets = [...document.querySelectorAll('#sp-content .sp-translatable p, #sp-content .sp-translatable div:not(h4)')];
  let translated = 0;
  for (const el of targets) {
    const text = el.textContent.trim();
    if (!text || text.length < 5) continue;
    if ((text.match(/[가-힣]/g) || []).length > text.length * 0.3) continue;
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text.substring(0, 2000))}`);
      const data = await res.json();
      const tr = data[0]?.map(s => s[0]).join('') || '';
      if (tr && tr !== text) {
        const div = document.createElement('div');
        div.className = 'translated-text';
        div.textContent = tr;
        el.after(div);
        translated++;
      }
    } catch (e) { console.warn('번역 실패:', e); }
    await new Promise(r => setTimeout(r, 100));
  }
  btn.disabled = false;
  if (translated > 0) { btn.textContent = '🔄 원문 보기'; btn.classList.add('translated'); toast(`🌐 ${translated}개 번역 완료!`); }
  else { btn.textContent = '🌐 한국어로 번역하기'; toast('이미 한국어이거나 번역할 내용이 없습니다.', 'warning'); }
}
