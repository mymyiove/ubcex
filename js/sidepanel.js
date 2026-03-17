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
  
  // 토글: 이미 번역된 상태면 원문 복원
  if (btn.classList.contains('translated')) {
    var translatedEls = document.querySelectorAll('#sp-content .translated-text');
    for (var i = 0; i < translatedEls.length; i++) translatedEls[i].remove();
    btn.textContent = '🌐 한국어로 번역하기';
    btn.classList.remove('translated');
    return;
  }
  
  btn.textContent = '⏳ 번역 중...';
  btn.disabled = true;
  
  // ★ 번역 대상 수집
  var targets = document.querySelectorAll('#sp-content .sp-translatable p, #sp-content .sp-translatable div:not(h4)');
  var toTranslate = [];
  
  for (var i = 0; i < targets.length; i++) {
    var text = targets[i].textContent.trim();
    if (!text || text.length < 5) continue;
    // 이미 한국어가 많으면 스킵
    var koChars = (text.match(/[가-힣]/g) || []).length;
    if (koChars > text.length * 0.3) continue;
    toTranslate.push({ el: targets[i], text: text });
  }
  
  if (toTranslate.length === 0) {
    btn.disabled = false;
    btn.textContent = '🌐 한국어로 번역하기';
    toast('이미 한국어이거나 번역할 내용이 없습니다.', 'warning');
    return;
  }
  
  // ★ 핵심: 모든 텍스트를 하나로 합쳐서 한 번에 번역
  var separator = '\n§§§\n';  // 구분자
  var combinedText = '';
  for (var i = 0; i < toTranslate.length; i++) {
    if (i > 0) combinedText += separator;
    combinedText += toTranslate[i].text.substring(0, 1500);  // 각 문단 1500자 제한
  }
  
  // 전체 텍스트가 5000자 이하면 한 번에, 아니면 청크로 분할
  var chunks = [];
  if (combinedText.length <= 5000) {
    chunks.push({ text: combinedText, items: toTranslate });
  } else {
    // 5000자씩 분할
    var currentChunk = '';
    var currentItems = [];
    for (var i = 0; i < toTranslate.length; i++) {
      var addition = (currentItems.length > 0 ? separator : '') + toTranslate[i].text.substring(0, 1500);
      if (currentChunk.length + addition.length > 5000 && currentItems.length > 0) {
        chunks.push({ text: currentChunk, items: currentItems.slice() });
        currentChunk = toTranslate[i].text.substring(0, 1500);
        currentItems = [toTranslate[i]];
      } else {
        currentChunk += addition;
        currentItems.push(toTranslate[i]);
      }
    }
    if (currentItems.length > 0) chunks.push({ text: currentChunk, items: currentItems });
  }
  
  // ★ 핵심: 모든 청크를 병렬로 번역
  var translateChunk = function(chunk) {
    return fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=' + encodeURIComponent(chunk.text))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        var fullTranslation = '';
        if (data && data[0]) {
          for (var j = 0; j < data[0].length; j++) {
            if (data[0][j] && data[0][j][0]) fullTranslation += data[0][j][0];
          }
        }
        return { items: chunk.items, translation: fullTranslation };
      })
      .catch(function() { return { items: chunk.items, translation: '' }; });
  };
  
  // 병렬 실행
  var promises = [];
  for (var i = 0; i < chunks.length; i++) {
    promises.push(translateChunk(chunks[i]));
  }
  
  var results = await Promise.all(promises);
  
  // ★ 핵심: 번역 결과를 한번에 DOM에 적용
  var translated = 0;
  for (var r = 0; r < results.length; r++) {
    var result = results[r];
    if (!result.translation) continue;
    
    // 구분자로 분리
    var parts = result.translation.split(/§§§/);
    
    for (var i = 0; i < Math.min(parts.length, result.items.length); i++) {
      var tr = parts[i].trim();
      if (tr && tr !== result.items[i].text) {
        var div = document.createElement('div');
        div.className = 'translated-text';
        div.textContent = tr;
        result.items[i].el.after(div);
        translated++;
      }
    }
  }
  
  btn.disabled = false;
  if (translated > 0) {
    btn.textContent = '🔄 원문 보기';
    btn.classList.add('translated');
    toast('🌐 ' + translated + '개 항목 번역 완료!');
  } else {
    btn.textContent = '🌐 한국어로 번역하기';
    toast('번역할 내용이 없습니다.', 'warning');
  }
}
