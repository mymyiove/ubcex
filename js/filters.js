// ═══════════════════════════════════════════════════════════
// filters.js — 필터 칩 근본 수정 + 추천도 고도화
// ═══════════════════════════════════════════════════════════

function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels','ALL_LEVELS','BEGINNER','INTERMEDIATE','EXPERT']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUniqueSubtitles());
  populateMS('f-duration', [{v:'60',l:'⏱️ 1시간 미만'},{v:'120',l:'⏱️ 1-2시간'},{v:'180',l:'⏱️ 2-3시간'},{v:'240',l:'⏱️ 3-4시간'},{v:'300',l:'⏱️ 4시간 이상'}]);
  populateMS('f-score', [{v:'100',l:'🎯 100점 이상'},{v:'200',l:'🎯 200점 이상'},{v:'300',l:'🎯 300점 이상'}]);
  populateMS('f-attr', [{v:'NEW',l:'✨ 신규 강의'}]);
  
  // ★ 필터 칩 컨테이너에 이벤트 위임 한 번만 등록
  const container = $('#active-filters');
  if (container && !container._chipHandlerAttached) {
    container.addEventListener('click', function(e) {
      const btn = e.target.closest('.filter-chip-x');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      
      const fid = btn.getAttribute('data-fid');
      const val = btn.getAttribute('data-val');
      
      if (fid === 'search') {
        $('#search-input').value = '';
      } else {
        const wrap = document.querySelector('[data-fid="' + fid + '"]');
        if (wrap) {
          const checkboxes = wrap.querySelectorAll('.ms-panel input[type="checkbox"]');
          checkboxes.forEach(cb => {
            if (cb.value === val) cb.checked = false;
          });
          updateMSBtn(fid);
        }
      }
      applyFilters();
    });
    container._chipHandlerAttached = true;
  }
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
  const wrap=document.querySelector('[data-fid="'+fid+'"]'); if(!wrap) return;
  const panel=wrap.querySelector('.ms-panel'); const btn=wrap.querySelector('.ms-btn');
  if(fid==='f-language'){const ko=items.filter(i=>typeof i==='string'&&(i.includes('한국어')||i.toLowerCase().includes('ko')));const en=items.filter(i=>typeof i==='string'&&i.includes('English'));const rest=items.filter(i=>typeof i==='string'&&!ko.includes(i)&&!en.includes(i));items=[...ko,...en,...rest];}
  panel.innerHTML=items.map(item=>{const v=typeof item==='object'?item.v:item;const l=typeof item==='object'?item.l:(showEmoji?`${getCatEmoji(item)} ${item}`:item);return `<div class="ms-item"><label><input type="checkbox" value="${v}"> ${l}</label></div>`;}).join('');
  btn.onclick=e=>{e.stopPropagation();document.querySelectorAll('.ms-panel').forEach(p=>{if(p!==panel)p.classList.remove('open');});panel.classList.toggle('open');};
  // ★ 수정: change 이벤트 — 체크/해제 모두 처리
  panel.addEventListener('change', function() {
    updateMSBtn(fid);
    applyFilters();
  });
}

function updateMSBtn(fid) {
  const wrap=document.querySelector('[data-fid="'+fid+'"]'); if(!wrap) return;
  const btn=wrap.querySelector('.ms-btn');
  const checked=[...wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked')];
  const defaults={
    'f-category':'모든 카테고리','f-difficulty':'모든 난이도','f-language':'모든 언어',
    'f-subtitles':'모든 자막','f-duration':'모든 시간','f-score':'모든 점수','f-attr':'모든 강의'
  };
  if(checked.length===0) {
    btn.textContent = defaults[fid] || '선택';
  } else if(checked.length===1) {
    btn.textContent = checked[0].value;
  } else {
    btn.textContent = checked[0].value + ' 외 ' + (checked.length-1) + '개';
  }
}

function getMSValues(fid) {
  const wrap=document.querySelector('[data-fid="'+fid+'"]'); if(!wrap) return [];
  return [...wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked')].map(cb=>cb.value);
}

function setMSValues(fid, values) {
  const wrap=document.querySelector('[data-fid="'+fid+'"]'); if(!wrap) return;
  wrap.querySelectorAll('.ms-panel input[type="checkbox"]').forEach(cb=>{cb.checked=values.includes(cb.value);});
  updateMSBtn(fid);
}

// ═══════════════════════════════════════════════════════════
// ★ 추천도 대수술 — 입력 키워드 번역 후 제목 매칭 최우선
// ═══════════════════════════════════════════════════════════

// ★ 핵심: 입력 키워드를 영어로 번역
function translateKeywords(keywords) {
  const translated = [];
  keywords.forEach(kw => {
    translated.push(kw); // 원본 유지
    // 한영 매핑
    const mapped = KO_EN_MAP[kw];
    if (mapped) translated.push(...mapped);
    // 역방향: 영어 → 한국어 (이미 영어면 한국어 매핑 추가)
    Object.entries(KO_EN_MAP).forEach(([ko, enList]) => {
      if (enList.some(en => en.toLowerCase() === kw.toLowerCase())) {
        if (!translated.includes(ko)) translated.push(ko);
      }
    });
  });
  return [...new Set(translated)];
}

function scoreWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  let totalScore = 0;
  const titleLower = (course.title || '').toLowerCase();
  const catLower = (course.category || '').toLowerCase();
  const topicLower = (course.topic || '').toLowerCase();
  const headlineLower = (course.headline || '').toLowerCase();
  const objectivesLower = (course.objectives || '').toLowerCase();
  const descLower = (course.description || '').toLowerCase();
  
  if (originalKeywords && originalKeywords.length > 0) {
    // ★ 핵심 1: 원본 키워드를 번역한 버전도 포함
    const translatedOriginals = translateKeywords(originalKeywords);
    
    // ★ 핵심 2: 번역된 원본 키워드가 제목에 몇 개 매칭되는지
    const titleMatches = translatedOriginals.filter(kw => titleLower.includes(kw.toLowerCase()));
    const originalCount = originalKeywords.length;
    
    if (titleMatches.length >= originalCount * 2) {
      // 원본 키워드의 한/영 버전이 모두 제목에 있으면 최고점
      totalScore += 300;
    } else if (titleMatches.length >= originalCount) {
      // 원본 키워드 수만큼 제목에 매칭
      totalScore += 200;
    } else if (titleMatches.length > 0) {
      // 일부만 매칭
      totalScore += titleMatches.length * 70;
    }
    
    // ★ 핵심 3: 카테고리/주제/소개 매칭 (번역된 원본 기준)
    translatedOriginals.forEach(kw => {
      const kwl = kw.toLowerCase();
      if (catLower.includes(kwl)) totalScore += 40;
      if (topicLower.includes(kwl)) totalScore += 30;
      if (config.scoreWeights.headline > 0 && headlineLower.includes(kwl)) totalScore += 20;
      if (config.scoreWeights.objectives > 0 && objectivesLower.includes(kwl)) totalScore += 10;
    });
  }
  
  // ★ 확장 키워드 (AI가 추가한 것들) — 매우 낮은 가중치
  keywords.forEach(kw => {
    const kwl = kw.toLowerCase();
    // 원본이나 번역된 원본이면 스킵 (위에서 처리)
    const translatedOriginals = originalKeywords ? translateKeywords(originalKeywords) : [];
    if (translatedOriginals.some(ok => ok.toLowerCase() === kwl)) return;
    
    // 확장 키워드: 제목에 있으면 소폭 보너스
    if (titleLower.includes(kwl)) totalScore += 12;
    if (catLower.includes(kwl)) totalScore += 6;
    if (topicLower.includes(kwl)) totalScore += 4;
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

function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  
  // ★ 원본 키워드를 번역한 버전으로 필터링
  const filterKws = originalKeywords && originalKeywords.length > 0 
    ? translateKeywords(originalKeywords) 
    : keywords;
  
  let searchText = '';
  config.searchFields.forEach(field => { if(course[field]) searchText += ' ' + course[field]; });
  searchText = searchText.toLowerCase();
  
  if (S.searchMode === 'and') return filterKws.every(kw => searchText.includes(kw.toLowerCase()));
  // OR 모드: 번역된 원본 중 하나라도 포함
  return filterKws.some(kw => searchText.includes(kw.toLowerCase()));
}

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
    filtered=filtered.filter(c=>{const m=c.contentLength||0;return durations.some(d=>{if(d==='60')return m<60;if(d==='120')return m>=60&&m<120;if(d==='180')return m>=120&&m<180;if(d==='240')return m>=180&&m<240;if(d==='300')return m>=240;return false;});});
  }
  
  if(searchText) {
    let originalKeywords = searchText.split(/,/).map(k=>k.trim().toLowerCase()).filter(k=>k.length>0);
    let keywords = expandKeywordsLocal(originalKeywords);
    
    filtered = filtered.filter(c => filterWithSensitivity(c, keywords, sensitivity, originalKeywords));
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

// ★ 필터 칩 렌더링 — 이벤트는 initMultiSelects에서 위임으로 처리
function renderActiveFilters() {
  const container=$('#active-filters');
  let html='';
  
  const add=(fid,vals,label)=>vals.forEach(v=>{
    const safeVal = String(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    html+='<span class="filter-chip">'+label+': '+v+' <button class="filter-chip-x" data-fid="'+fid+'" data-val="'+safeVal+'">×</button></span>';
  });
  
  add('f-category',getMSValues('f-category'),'카테고리');
  add('f-difficulty',getMSValues('f-difficulty'),'난이도');
  add('f-language',getMSValues('f-language'),'언어');
  add('f-subtitles',getMSValues('f-subtitles'),'자막');
  add('f-duration',getMSValues('f-duration'),'시간');
  add('f-score',getMSValues('f-score'),'추천도');
  add('f-attr',getMSValues('f-attr'),'속성');
  
  const sensitivityLabel=SENSITIVITY_CONFIG[S.sensitivity||'balanced']?.label||'📊 보통';
  if(S.sensitivity&&S.sensitivity!=='balanced') html+='<span class="filter-chip">감도: '+sensitivityLabel+'</span>';
  
  const q=$('#search-input').value.trim();
  if(q) html+='<span class="filter-chip">검색: '+(q.length>30?q.substring(0,30)+'...':q)+' ('+S.searchMode.toUpperCase()+') <button class="filter-chip-x" data-fid="search">×</button></span>';
  
  container.innerHTML=html;
}

function resetAll(notify=true) {
  $('#search-input').value='';
  ['f-category','f-difficulty','f-language','f-subtitles','f-duration','f-score','f-attr'].forEach(fid=>{
    const wrap=document.querySelector('[data-fid="'+fid+'"]');
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
