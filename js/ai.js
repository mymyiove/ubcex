// ═══════════════════════════════════════════════════════════
// ai.js — AI 키워드 확장 (Gemini) + 키워드 분리 개선
// ═══════════════════════════════════════════════════════════
async function handleAIScan() {
  var query = $('#search-input').value.trim();
  if (!query) { toast('검색어를 먼저 입력해주세요.', 'warning'); return; }
  var btn = $('#btn-ai-scan');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> AI 내비 계산 중...';
  try {
    var res = await fetch('/api/ai-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        jobContext: S.selectedFamilies.map(function(f) { return CURATION[f]?.name; }).join(', ')
      })
    });
    var data = await res.json();
    if (data.success && data.data) {
      renderAIPanel(data.data);
      toast('🤖 AI 내비가 새로운 항로를 발견했습니다!');
    } else {
      toast('AI 내비 응답 오류: ' + (data.error || '알 수 없는 오류'), 'error');
    }
  } catch (e) {
    toast('AI 내비 통신 실패: ' + e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '🤖 AI 내비';
}

function renderAIPanel(data) {
  var panel = $('#ai-panel');
  var results = $('#ai-panel-results');
  function renderGroup(label, keywords) {
    if (!keywords || !keywords.length) return '';
    return '<div class="ai-kw-group"><div class="group-label">' + label + '</div>' +
      '<div class="ai-kw-tags">' + keywords.map(function(kw) {
        return '<span class="ai-kw-tag selected" data-kw="' + kw + '">' + kw + '</span>';
      }).join('') + '</div></div>';
  }
  results.innerHTML =
    renderGroup('🌐 영문 항로', data.english_keywords) +
    renderGroup('🇰🇷 한글 항로', data.korean_keywords) +
    renderGroup('📂 세부 항로', data.sub_topics) +
    renderGroup('🔧 도구 항로', data.related_tools) +
    renderGroup('🔍 추천 검색어', data.recommended_queries);
  panel.classList.add('open');
  results.querySelectorAll('.ai-kw-tag').forEach(function(tag) {
    tag.addEventListener('click', function() { tag.classList.toggle('selected'); });
  });
}

function applyAIKeywords() {
  var selectedTags = $$('#ai-panel-results .ai-kw-tag.selected');
  var selected = [];
  for (var i = 0; i < selectedTags.length; i++) {
    selected.push(selectedTags[i].dataset.kw);
  }
  if (selected.length === 0) { toast('키워드를 하나 이상 선택해주세요.', 'warning'); return; }

  // ★ 복합 키워드를 개별 단어로 분리 + 중복 제거
  var allWords = new Set();
  selected.forEach(function(kw) {
    kw.split(/\s+/).forEach(function(word) {
      var w = word.trim();
      if (w.length >= 2) allWords.add(w);
    });
  });

  var uniqueWords = [...allWords];
  $('#search-input').value = uniqueWords.join(', ');

  // OR 모드로 전환
  $$('.scan-mode-btn[data-mode]').forEach(function(b) { b.classList.remove('active'); });
  var orBtn = $('.scan-mode-btn[data-mode="or"]');
  if (orBtn) orBtn.classList.add('active');
  S.searchMode = 'or';

  $('#ai-panel').classList.remove('open');
  applyFilters();
  toast('🤖 ' + uniqueWords.length + '개 키워드로 스캔합니다. (' + selected.length + '개 항로에서 추출)');
}
