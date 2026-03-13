/ ═══════════════════════════════════════════════════════════
// ai.js — AI 키워드 확장 (Gemini) + 키워드 분리 개선
// ═══════════════════════════════════════════════════════════
async function handleAIScan() {
  const query = $('#search-input').value.trim();
  if(!query) { toast('검색어를 먼저 입력해주세요.', 'warning'); return; }
  const btn = $('#btn-ai-scan');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> AI 내비 계산 중...';
  try {
    const res = await fetch('/api/ai-expand', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        query,
        jobContext: S.selectedFamilies.map(f => CURATION[f]?.name).join(', ')
      })
    });
    const data = await res.json();
    if(data.success && data.data) {
      renderAIPanel(data.data);
      toast(`🤖 AI 내비가 새로운 항로를 발견했습니다!`);
    } else {
      toast('AI 내비 응답 오류: ' + (data.error || '알 수 없는 오류'), 'error');
    }
  } catch(e) {
    toast('AI 내비 통신 실패: ' + e.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '🤖 AI 내비';
}

function renderAIPanel(data) {
  const panel = $('#ai-panel');
  const results = $('#ai-panel-results');
  const renderGroup = (label, keywords) => {
    if(!keywords?.length) return '';
    return `<div class="ai-kw-group"><div class="group-label">${label}</div>
      <div class="ai-kw-tags">${keywords.map(kw => `<span class="ai-kw-tag selected" data-kw="${kw}">${kw}</span>`).join('')}</div>
    </div>`;
  };
  results.innerHTML =
    renderGroup('🌐 영문 항로', data.english_keywords) +
    renderGroup('🇰🇷 한글 항로', data.korean_keywords) +
    renderGroup('📂 세부 항로', data.sub_topics) +
    renderGroup('🔧 도구 항로', data.related_tools) +
    renderGroup('🔍 추천 검색어', data.recommended_queries);
  panel.classList.add('open');
  results.querySelectorAll('.ai-kw-tag').forEach(tag => {
    tag.addEventListener('click', () => tag.classList.toggle('selected'));
  });
}

// ★ 개선: AI 키워드 적용 시 복합 키워드를 개별 단어로 분리
function applyAIKeywords() {
  const selected = [...$$('#ai-panel-results .ai-kw-tag.selected')].map(t => t.dataset.kw);
  if(selected.length===0) { toast('키워드를 하나 이상 선택해주세요.', 'warning'); return; }
  
  // ★ 핵심 개선: 복합 키워드를 개별 단어로 분리 + 중복 제거
  // "AI Sales" → ["AI", "Sales"]
  // "Machine Learning Sales" → ["Machine", "Learning", "Sales"]
  const allWords = new Set();
  selected.forEach(kw => {
    kw.split(/\s+/).forEach(word => {
      const w = word.trim();
      if (w.length >= 2) allWords.add(w); // 2글자 이상만
    });
  });
  
  // 중복 제거된 개별 단어들을 쉼표로 연결
  const uniqueWords = [...allWords];
  $('#search-input').value = uniqueWords.join(', ');
  
  // ★ OR 모드로 전환 (개별 단어 OR 검색이 가장 효과적)
  $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
  $('.scan-mode-btn[data-mode="or"]')?.classList.add('active');
  S.searchMode = 'or';
  
  $('#ai-panel').classList.remove('open');
  applyFilters();
  toast(`🤖 ${uniqueWords.length}개 키워드로 스캔합니다. (${selected.length}개 항로에서 추출)`);
}
