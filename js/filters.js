// ═══════════════════════════════════════════════════════════
// ai.js — AI 키워드 확장 (각 뱃지별 AND 조건)
// ═══════════════════════════════════════════════════════════
async function handleAIScan() {
  var query = document.getElementById('search-input').value.trim();
  if (!query) { toast('검색어를 먼저 입력해주세요.', 'warning'); return; }
  var btn = document.getElementById('btn-ai-scan');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> AI 내비 계산 중...';
  try {
    var res = await fetch('/api/ai-expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        jobContext: S.selectedFamilies.map(function(f) { return CURATION[f] ? CURATION[f].name : ''; }).join(', ')
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
  var panel = document.getElementById('ai-panel');
  var results = document.getElementById('ai-panel-results');
  function renderGroup(label, keywords) {
    if (!keywords || !keywords.length) return '';
    var tags = '';
    for (var i = 0; i < keywords.length; i++) {
      tags += '<span class="ai-kw-tag selected" data-kw="' + keywords[i] + '">' + keywords[i] + '</span>';
    }
    return '<div class="ai-kw-group"><div class="group-label">' + label + '</div><div class="ai-kw-tags">' + tags + '</div></div>';
  }
  results.innerHTML =
    renderGroup('🌐 영문 항로', data.english_keywords) +
    renderGroup('🇰🇷 한글 항로', data.korean_keywords) +
    renderGroup('📂 세부 항로', data.sub_topics) +
    renderGroup('🔧 도구 항로', data.related_tools) +
    renderGroup('🔍 추천 검색어', data.recommended_queries);
  panel.classList.add('open');
  var allTags = results.querySelectorAll('.ai-kw-tag');
  for (var i = 0; i < allTags.length; i++) {
    (function(tag) {
      tag.addEventListener('click', function() { tag.classList.toggle('selected'); });
    })(allTags[i]);
  }
}

// ★ 불용어 목록
var AI_STOPWORDS = {
  'the':1,'a':1,'an':1,'in':1,'on':1,'at':1,'to':1,'for':1,'of':1,'and':1,'or':1,
  'is':1,'are':1,'was':1,'were':1,'with':1,'by':1,'from':1,'as':1,'it':1,'its':1,
  'this':1,'that':1,'be':1,'been':1,'being':1,'have':1,'has':1,'had':1,'do':1,
  'does':1,'did':1,'will':1,'would':1,'could':1,'should':1,'may':1,'might':1,
  'can':1,'not':1,'no':1,'but':1,'if':1,'then':1,'than':1,'so':1,'very':1,
  'just':1,'about':1,'into':1,'over':1,'such':1,'only':1,'also':1,'how':1,
  'what':1,'when':1,'where':1,'which':1,'who':1,'whom':1,'why':1,'via':1,'etc':1
};

function applyAIKeywords() {
  var selectedTags = document.querySelectorAll('#ai-panel-results .ai-kw-tag.selected');
  var selected = [];
  for (var i = 0; i < selectedTags.length; i++) {
    selected.push(selectedTags[i].dataset.kw);
  }
  if (selected.length === 0) { toast('키워드를 하나 이상 선택해주세요.', 'warning'); return; }

  // ★ 핵심: 각 뱃지(구문)를 쉼표로 연결하여 검색창에 입력
  // "반도체 산업" → filters.js에서 ["반도체", "산업"]으로 분리 → AND 검색
  // "Semiconductor Manufacturing" → ["semiconductor", "manufacturing"] → AND 검색
  // 뱃지 간에는 쉼표로 구분 → OR 관계

  // 불용어 제거된 뱃지 목록 생성
  var cleanedPhrases = [];
  for (var i = 0; i < selected.length; i++) {
    var phrase = selected[i].trim();
    // 각 뱃지 내 단어에서 불용어 제거
    var words = phrase.split(/\s+/);
    var cleaned = [];
    for (var j = 0; j < words.length; j++) {
      var w = words[j].trim();
      if (w.length >= 2 && !AI_STOPWORDS[w.toLowerCase()]) {
        cleaned.push(w);
      }
    }
    if (cleaned.length > 0) {
      cleanedPhrases.push(cleaned.join(' '));
    }
  }

  // 중복 제거
  var seen = {};
  var uniquePhrases = [];
  for (var i = 0; i < cleanedPhrases.length; i++) {
    var key = cleanedPhrases[i].toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      uniquePhrases.push(cleanedPhrases[i]);
    }
  }

  // 너무 많으면 상위 15개
  if (uniquePhrases.length > 15) uniquePhrases = uniquePhrases.slice(0, 15);

  // ★ 쉼표로 연결 → filters.js의 applyFilters()에서 쉼표 기준 분리
  // 각 구문 내 띄어쓰기는 AND로 처리됨
  document.getElementById('search-input').value = uniquePhrases.join(', ');

  // AND 모드로 전환 (각 구문 내 단어들이 AND로 검색됨)
  var modeBtns = document.querySelectorAll('.scan-mode-btn[data-mode]');
  for (var i = 0; i < modeBtns.length; i++) modeBtns[i].classList.remove('active');
  var orBtn = document.querySelector('.scan-mode-btn[data-mode="or"]');
  if (orBtn) orBtn.classList.add('active');
  S.searchMode = 'or';

  document.getElementById('ai-panel').classList.remove('open');
  applyFilters();
  toast('🤖 ' + uniquePhrases.length + '개 항로로 스캔합니다. (각 항로 내 AND 검색)');
}
