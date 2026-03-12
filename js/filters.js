// ═══════════════════════════════════════════════════════════
// filters.js — 추천도 대수술 + 필터 칩 수정 + 체크 해제 수정
// ═══════════════════════════════════════════════════════════

function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels','ALL_LEVELS','BEGINNER','INTERMEDIATE','EXPERT']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUniqueSubtitles());
  populateMS('f-duration', [{v:'60',l:'⏱️ 1시간 미만'},{v:'120',l:'⏱️ 1-2시간'},{v:'180',l:'⏱️ 2-3시간'},{v:'240',l:'⏱️ 3-4시간'},{v:'300',l:'⏱️ 4시간 이상'}]);
  populateMS('f-score', [{v:'100',l:'🎯 100점 이상'},{v:'200',l:'🎯 200점 이상'},{v:'300',l:'🎯 300점 이상'}]);
  populateMS('f-attr', [{v:'NEW',l:'✨ 신규 강의'}]);
}

function getUniqueSubtitles() {
  const vals = new Set();
  S.courses.forEach(c => { if(!c.subtitles||c.subtitles==='없음') return; c.subtitles.split(',').forEach(s=>{const t=s.trim();if(t)vals.add(t);}); });
  const arr=[...vals];
  const ko=arr.filter(a=>a.toLowerCase().includes('ko'));
  const en=arr.filter(a=>a.toLowerCase().includes('en')&&!a.toLowerCase().includes('ko'));
  const rest=arr.filter(a=>!a.toLowerCase().includes('ko')&&!a.toLowerCase().includes('en'));
  return [...ko,...en,...rest.sort()];
}

function populateMS(fid, items, showEmoji=false) {
  const wrap=$(`[data-fid="${fid}"]`); if(!wrap) return;
  const panel=wrap.querySelector('.ms-panel'); const btn=wrap.querySelector('.ms-btn');
  if(fid==='f-language'){const ko=items.filter(i=>typeof i==='string'&&(i.includes('한국어')||i.toLowerCase().includes('ko')));const en=items.filter(i=>typeof i==='string'&&i.includes('English'));const rest=items.filter(i=>typeof i==='string'&&!ko.includes(i)&&!en.includes(i));items=[...ko,...en,...rest];}
  panel.innerHTML=items.map(item=>{const v=typeof item==='object'?item.v:item;const l=typeof item==='object'?item.l:(showEmoji?`${getCatEmoji(item)} ${item}`:item);return `<div class="ms-item"><label><input type="checkbox" value="${v}"> ${l}</label></div>`;}).join('');
  btn.onclick=e=>{e.stopPropagation();$$('.ms-panel').forEach(p=>{if(p!==panel)p.classList.remove('open');});panel.classList.toggle('open');};
  // ★ 수정 #2: change 이벤트에서 확실하게 updateMSBtn 호출
  panel.addEventListener('change',()=>{
    updateMSBtn(fid);
    applyFilters();
  });
}

// ★ 수정 #2: 체크 해제 시 기본 텍스트로 확실히 복원
function updateMSBtn(fid) {
  const wrap=$(`[data-fid="${fid}"]`); if(!wrap) return;
  const btn=wrap.querySelector('.ms-btn');
  const checked=[...wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked')];
  const defaults={
    'f-category':'모든 카테고리','f-difficulty':'모든 난이도','f-language':'모든 언어',
    'f-subtitles':'모든 자막','f-duration':'모든 시간','f-score':'모든 점수','f-attr':'모든 강의'
  };
  if(checked.length===0) {
    btn.textContent=defaults[fid]||'선택';
  } else if(checked.length===1) {
    btn.textContent=checked[0].value;
  } else {
    btn.textContent=`${checked[0].value} 외 ${checked.length-1}개`;
  }
}

function getMSValues(fid) {
  const wrap=$(`[data-fid="${fid}"]`); if(!wrap) return [];
  return [...wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked')].map(cb=>cb.value);
}

function setMSValues(fid, values) {
  const wrap=$(`[data-fid="${fid}"]`); if(!wrap) return;
  wrap.querySelectorAll('.ms-panel input[type="checkbox"]').forEach(cb=>{cb.checked=values.includes(cb.value);});
  updateMSBtn(fid);
}

// ═══════════════════════════════════════════════════════════
// ★ 추천도 대수술 — 원본 키워드 우선 + 복합 매칭 보너스
// ═══════════════════════════════════════════════════════════

function scoreWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  let totalScore = 0;
  
  // ★ 핵심 1: 원본 키워드 전체가 제목에 포함되면 대폭 보너스
  if (originalKeywords && originalKeywords.length > 0) {
    const titleLower = (course.title || '').toLowerCase();
    const allOriginalInTitle = originalKeywords.every(kw => titleLower.includes(kw.toLowerCase()));
    const someOriginalInTitle = originalKeywords.some(kw => titleLower.includes(kw.toLowerCase()));
    
    if (allOriginalInTitle) {
      totalScore += 200; // 원본 키워드 전부 제목에 있으면 +200
    } else if (someOriginalInTitle) {
      const matchCount = originalKeywords.filter(kw => titleLower.includes(kw.toLowerCase())).length;
      totalScore += matchCount * 80; // 일부만 있으면 개당 +80
    }
    
    // ★ 핵심 2: 원본 키워드가 카테고리/주제에 있으면 보너스
    const catLower = (course.category || '').toLowerCase();
    const topicLower = (course.topic || '').toLowerCase();
    const headlineLower = (course.headline || '').toLowerCase();
    
    originalKeywords.forEach(kw => {
      const kwl = kw.toLowerCase();
      if (catLower.includes(kwl)) totalScore += 50;
      if (topicLower.includes(kwl)) totalScore += 40;
      if (headlineLower.includes(kwl)) totalScore += 30;
    });
  }
  
  // ★ 핵심 3: 확장 키워드는 낮은 가중치로 보너스만
  keywords.forEach(kw => {
    const kwl = kw.toLowerCase();
    const isOriginal = originalKeywords ? originalKeywords.some(ok => ok.toLowerCase() === kwl) : true;
    
    // 원본 키워드는 위에서 이미 처리했으므로 스킵
    if (isOriginal) return;
    
    // 확장 키워드: 제목 매칭만 소폭 보너스
    const titleLower = (course.title || '').toLowerCase();
    const hasSpaces = kw.includes(' ');
    
    if (hasSpaces) {
      if (titleLower.includes(kwl)) totalScore += Math.round(config.scoreWeights.title * 0.3);
    } else {
      const wordRegex = new RegExp(`\\b${kwl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordRegex.test(course.title || '')) totalScore += Math.round(config.scoreWeights.title * 0.3);
      else if (titleLower.includes(kwl)) totalScore += Math.round(config.scoreWeights.title * 0.15);
    }
    
    // 확장 키워드: 카테고리/주제는 아주 소폭
    if (config.scoreWeights.category > 0 && (course.category||'').toLowerCase().includes(kwl)) 
      totalScore += Math.round(config.scoreWeights.category * 0.2);
    if (config.scoreWeights.topic > 0 && (course.topic||'').toLowerCase().includes(kwl)) 
      totalScore += Math.round(config.scoreWeights.topic * 0.2);
    // headline, objectives, description은 확장 키워드로는 점수 안 줌
  });
  
  // 품질 보너스
  if (course.isNew) totalScore += 3;
  if (hasKoreanSub(course)) totalScore += 3;
  if (course.rating >= 4.5) totalScore += 5;
  if (course.rating >= 4.0 && course.rating < 4.5) totalScore += 2;
  if (course.enrollments >= 10000) totalScore += 3;
  if (course.enrollments >= 1000) totalScore += 1;
  
  return totalScore;
}

// ★ 필터링: 원본 키워드 기준으로 필터 (확장은 스코어링에만 사용)
function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  
  // ★ 핵심: 원본 키워드 기준으로 필터링
  const filterKws = originalKeywords && originalKeywords.length > 0 ? originalKeywords : keywords;
  
  let searchText = '';
  config.searchFields.forEach(field => { if(course[field]) searchText += ' ' + course[field]; });
  searchText = searchText.toLowerCase();
  
  if (S.searchMode === 'and') {
    return filterKws.every(kw => searchText.includes(kw.toLowerCase()));
  } else {
    // OR/AI 모드: 원본 키워드 중 하나라도 포함
    return filterKws.some(kw => searchText.includes(kw.toLowerCase()));
  }
}

// ★ applyFilters — 원본 키워드 별도 보관
function applyFilters() {
  const cats=getMSValues('f-category'); const diffs=getMSValues('f-difficulty'); const langs=getMSValues('f-language');
  const subs=getMSValues('f-subtitles'); const durations=getMSValues('f-duration'); const scores=getMSValues('f-score');
  const attrs=getMSValues('f-attr'); const sort=$('#sort-select').value; const searchText=$('#search-input').value.trim();
  const sensitivity = S.sensitivity || 'balanced';
  let filtered = [...S.courses];
  
  if(cats.length>0) filtered=filtered.filter(c=>cats.some(cat=>c.category?.includes(cat)));
  if(diffs.length>0) filtered=filtered.filter(c=>diffs.some(d=>c.difficulty?.toUpperCase()===d.toUpperCase()));
  if(langs.length>0) filtered=filtered.filter(c=>langs.includes(c.language));
  if(subs.length>0) filtered=filtered.filter(c=>{if(!c.subtitles||c.subtitles==='없음')return false;return subs.some(sub=>c.subtitles.toLowerCase().includes(sub.toLowerCase()));});
  if(attrs.includes('NEW')) filtered=filtered.filter(c=>c.isNew);
  if(durations.length>0) {
    filtered=filtered.filter(c=>{const m=c.contentLength||0;return durations.some(d=>{const t=parseInt(d);if(d==='60')return m<60;if(d==='120')return m>=60&&m<120;if(d==='180')return m>=120&&m<180;if(d==='240')return m>=180&&m<240;if(d==='300')return m>=240;return false;});});
  }
  
  if(searchText) {
    // ★ 원본 키워드 추출 (쉼표 구분)
    let originalKeywords = searchText.split(/,/).map(k=>k.trim().toLowerCase()).filter(k=>k.length>0);
    // 확장 키워드
    let keywords = expandKeywordsLocal(originalKeywords);
    
    // ★ 필터링: 원본 키워드 기준
    filtered = filtered.filter(c => filterWithSensitivity(c, keywords, sensitivity, originalKeywords));
    // ★ 스코어링: 원본 우선 + 확장 보너스
    filtered.forEach(c => { c._score = scoreWithSensitivity(c, keywords, sensitivity, originalKeywords); });
    
    const config = SENSITIVITY_CONFIG[sensitivity];
    if(config.minScore > 0) filtered = filtered.filter(c => c._score >= config.minScore);
    if(scores.length>0) filtered=filtered.filter(c=>scores.some(s=>c._score>=parseInt(s)));
  } else {
    filtered.forEach(c=>{c._score=0;});
  }
  
  switch(sort) {
    case 'relevance': filtered.sort((a,b)=>(b._score||0)-(a._score||0)); break;
    case 'rating': filtered.sort((a,b)=>(b.rating||0)-(a.rating||0)); break;
    case 'enrollments': filtered.sort((a,b)=>(b.enrollments||0)-(a.enrollments||0)); break;
    case 'latest': filtered.sort((a,b)=>{const da=a.lastUpdated?new Date(a.lastUpdated):new Date(0);const db=b.lastUpdated?new Date(b.lastUpdated):new Date(0);return db-da;}); break;
    case 'alpha': filtered.sort((a,b)=>(a.title||'').localeCompare(b.title||'')); break;
  }
  
  S.filtered = filtered;
  S.page = 1;
  renderActiveFilters();
  $('#results-count').innerHTML = `발견된 별: <strong>${filtered.length.toLocaleString()}</strong>개`;
  
  const discoveredCard = document.querySelector('.stats-card[data-idx="2"] .stats-value');
  if (discoveredCard) animateCount(discoveredCard, filtered.length, 800);
  
  renderList();
}

// ★ 수정 #1: 필터 칩 X — 이벤트 위임 방식으로 변경
function renderActiveFilters() {
  const container=$('#active-filters'); 
  let html='';
  
  const add=(fid,vals,label)=>vals.forEach(v=>{
    // ★ data 속성에 안전하게 값 저장
    const safeVal = v.replace(/"/g, '&quot;');
    html+=`<span class="filter-chip">${label}: ${v} <button class="filter-chip-x" data-fid="${fid}" data-val="${safeVal}">×</button></span>`;
  });
  
  add('f-category',getMSValues('f-category'),'카테고리');
  add('f-difficulty',getMSValues('f-difficulty'),'난이도');
  add('f-language',getMSValues('f-language'),'언어');
  add('f-subtitles',getMSValues('f-subtitles'),'자막');
  add('f-duration',getMSValues('f-duration'),'시간');
  add('f-score',getMSValues('f-score'),'추천도');
  add('f-attr',getMSValues('f-attr'),'속성');
  
  const sensitivityLabel=SENSITIVITY_CONFIG[S.sensitivity||'balanced']?.label||'📊 보통';
  if(S.sensitivity&&S.sensitivity!=='balanced') html+=`<span class="filter-chip">감도: ${sensitivityLabel}</span>`;
  
  const q=$('#search-input').value.trim();
  if(q) html+=`<span class="filter-chip">검색: ${q.length > 30 ? q.substring(0,30)+'...' : q} (${S.searchMode.toUpperCase()}) <button class="filter-chip-x" data-fid="search">×</button></span>`;
  
  container.innerHTML=html;
  
  // ★ 수정 #1: 이벤트 위임 — container에 한 번만 바인딩
  container.onclick = function(e) {
    const btn = e.target.closest('.filter-chip-x');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    
    const fid = btn.dataset.fid;
    const val = btn.dataset.val;
    
    if (fid === 'search') {
      $('#search-input').value = '';
    } else {
      const wrap = $(`[data-fid="${fid}"]`);
      if (wrap) {
        // ★ 수정: 정확한 값으로 체크박스 찾기
        const checkboxes = wrap.querySelectorAll('.ms-panel input[type="checkbox"]');
        checkboxes.forEach(cb => {
          if (cb.value === val) cb.checked = false;
        });
        updateMSBtn(fid);
      }
    }
    applyFilters();
  };
}

function resetAll(notify=true) {
  $('#search-input').value='';
  ['f-category','f-difficulty','f-language','f-subtitles','f-duration','f-score','f-attr'].forEach(fid=>{
    const wrap=$(`[data-fid="${fid}"]`);
    if(wrap){
      wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked').forEach(cb=>cb.checked=false);
      updateMSBtn(fid);
    }
  });
  $('#sort-select').value='relevance';
  S.searchMode='ai'; S.sensitivity='balanced';
  $$('.scan-mode-btn[data-mode]').forEach(b=>b.classList.remove('active'));
  $('.scan-mode-btn[data-mode="ai"]')?.classList.add('active');
  $$('.sensitivity-btn').forEach(b=>b.classList.remove('active'));
  $('.sensitivity-btn[data-sensitivity="balanced"]')?.classList.add('active');
  $('#ai-panel')?.classList.remove('open');
  $('#filters-grid')?.classList.remove('open');
  $('#btn-filter-toggle')?.classList.remove('active');
  S.selectedIds.clear(); updateFAB();
  if(notify){applyFilters();toast('✨ 스캐너 초기화');}
}
