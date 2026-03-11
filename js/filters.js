// ═══════════════════════════════════════════════════════════
// filters.js — 멀티셀렉트, 감도 기반 필터링, 활성 필터 태그
// ═══════════════════════════════════════════════════════════

function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels','ALL_LEVELS','BEGINNER','INTERMEDIATE','EXPERT']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUniqueSubtitles());
  populateMS('f-rating', [{v:'4.5',l:'⭐ 4.5점 이상'},{v:'4.0',l:'⭐ 4.0점 이상'},{v:'3.5',l:'⭐ 3.5점 이상'}]);
  populateMS('f-attr', [{v:'NEW',l:'✨ 신규 강의'}]);
}

// 자막 고유값 추출 — 한국어 최상단
function getUniqueSubtitles() {
  const vals = new Set();
  S.courses.forEach(c => {
    if (!c.subtitles || c.subtitles === '없음') return;
    c.subtitles.split(',').forEach(s => {
      const t = s.trim();
      if (t) vals.add(t);
    });
  });
  const arr = [...vals];
  // 한국어 관련 항목 최상단
  const koItems = arr.filter(a => a.toLowerCase().includes('ko'));
  const enItems = arr.filter(a => a.toLowerCase().includes('en') && !a.toLowerCase().includes('ko'));
  const rest = arr.filter(a => !a.toLowerCase().includes('ko') && !a.toLowerCase().includes('en'));
  return [...koItems, ...enItems, ...rest.sort()];
}

function populateMS(fid, items, showEmoji=false) {
  const wrap = $(`[data-fid="${fid}"]`);
  if(!wrap) return;
  const panel = wrap.querySelector('.ms-panel');
  const btn = wrap.querySelector('.ms-btn');

  // 언어/자막 필터에서 한국어 최상단 정렬
  if (fid === 'f-language') {
    const koItems = items.filter(i => typeof i === 'string' && (i.includes('한국어') || i.toLowerCase().includes('ko')));
    const enItems = items.filter(i => typeof i === 'string' && (i.includes('English') || i === 'English'));
    const rest = items.filter(i => typeof i === 'string' && !koItems.includes(i) && !enItems.includes(i));
    items = [...koItems, ...enItems, ...rest];
  }

  panel.innerHTML = items.map(item => {
    const v = typeof item==='object' ? item.v : item;
    const l = typeof item==='object' ? item.l : (showEmoji ? `${getCatEmoji(item)} ${item}` : item);
    return `<div class="ms-item"><label><input type="checkbox" value="${v}"><span>${l}</span></label></div>`;
  }).join('');

  btn.onclick = e => { 
    e.stopPropagation(); 
    $$('.ms-panel').forEach(p => { if(p!==panel) p.classList.remove('open'); }); 
    panel.classList.toggle('open'); 
  };
  panel.addEventListener('change', () => { updateMSBtn(fid); applyFilters(); });
}

function updateMSBtn(fid) {
  const wrap = $(`[data-fid="${fid}"]`);
  if(!wrap) return;
  const btn = wrap.querySelector('.ms-btn');
  const checked = wrap.querySelectorAll('input:checked');
  const defaults = {
    'f-category':'모든 카테고리','f-difficulty':'모든 난이도','f-language':'모든 언어',
    'f-subtitles':'모든 자막','f-rating':'모든 평점','f-attr':'모든 강의'
  };
  if(checked.length===0) btn.textContent = defaults[fid]||'선택';
  else if(checked.length===1) btn.textContent = checked[0].value;
  else btn.textContent = `${checked[0].value} 외 ${checked.length-1}개`;
}

function getMSValues(fid) {
  const wrap = $(`[data-fid="${fid}"]`);
  if(!wrap) return [];
  return [...wrap.querySelectorAll('input:checked')].map(cb => cb.value);
}

function setMSValues(fid, values) {
  const wrap = $(`[data-fid="${fid}"]`);
  if(!wrap) return;
  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = values.includes(cb.value); });
  updateMSBtn(fid);
}

// ═══════════════════════════════════════════════════════════
// 감도 기반 스코어링
// ═══════════════════════════════════════════════════════════
function scoreWithSensitivity(course, keywords, sensitivity) {
  const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  let totalScore = 0;

  keywords.forEach(kw => {
    const kwl = kw.toLowerCase();
    if (config.scoreWeights.title > 0 && course.title?.toLowerCase().includes(kwl)) totalScore += config.scoreWeights.title;
    if (config.scoreWeights.category > 0 && course.category?.toLowerCase().includes(kwl)) totalScore += config.scoreWeights.category;
    if (config.scoreWeights.topic > 0 && course.topic?.toLowerCase().includes(kwl)) totalScore += config.scoreWeights.topic;
    if (config.scoreWeights.headline > 0 && course.headline?.toLowerCase().includes(kwl)) totalScore += config.scoreWeights.headline;
    if (config.scoreWeights.objectives > 0 && course.objectives?.toLowerCase().includes(kwl)) totalScore += config.scoreWeights.objectives;
    if (config.scoreWeights.description > 0 && course.description?.toLowerCase().includes(kwl)) totalScore += config.scoreWeights.description;
  });

  if (course.isNew) totalScore += 3;
  if (course.subtitles && (course.subtitles.toLowerCase().includes('ko') || course.subtitles.includes('한국어'))) totalScore += 3;
  if (course.rating >= 4.5) totalScore += 5;

  return totalScore;
}

function filterWithSensitivity(course, keywords, sensitivity) {
  const config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  let searchText = '';
  config.searchFields.forEach(field => {
    if (course[field]) searchText += ' ' + course[field];
  });
  searchText = searchText.toLowerCase();

  if (S.searchMode === 'and') {
    return keywords.every(kw => searchText.includes(kw.toLowerCase()));
  } else {
    return keywords.some(kw => searchText.includes(kw.toLowerCase()));
  }
}

// ═══════════════════════════════════════════════════════════
// 메인 필터링 함수
// ═══════════════════════════════════════════════════════════
function applyFilters() {
  const cats = getMSValues('f-category');
  const diffs = getMSValues('f-difficulty');
  const langs = getMSValues('f-language');
  const subs = getMSValues('f-subtitles');
  const ratings = getMSValues('f-rating');
  const attrs = getMSValues('f-attr');
  const sort = $('#sort-select').value;
  const searchText = $('#search-input').value.trim();
  const sensitivity = S.sensitivity || 'balanced';

  let filtered = [...S.courses];

  if(cats.length>0) filtered = filtered.filter(c => cats.some(cat => c.category?.includes(cat)));
  if(diffs.length>0) filtered = filtered.filter(c => diffs.some(d => c.difficulty?.toUpperCase() === d.toUpperCase()));
  if(langs.length>0) filtered = filtered.filter(c => langs.includes(c.language));
  if(subs.length>0) filtered = filtered.filter(c => {
    if (!c.subtitles || c.subtitles === '없음') return false;
    return subs.some(sub => c.subtitles.toLowerCase().includes(sub.toLowerCase()));
  });
  if(ratings.length>0) filtered = filtered.filter(c => ratings.some(r => c.rating >= parseFloat(r)));
  if(attrs.includes('NEW')) filtered = filtered.filter(c => c.isNew);

  if(searchText) {
    let keywords = searchText.split(/[,\s]+/).map(k => k.trim().toLowerCase()).filter(k => k.length>0);
    keywords = expandKeywordsLocal(keywords);

    filtered = filtered.filter(c => filterWithSensitivity(c, keywords, sensitivity));

    filtered.forEach(c => {
      c._score = scoreWithSensitivity(c, keywords, sensitivity);
    });

    const config = SENSITIVITY_CONFIG[sensitivity];
    if (config.minScore > 0) {
      filtered = filtered.filter(c => c._score >= config.minScore);
    }
  } else {
    filtered.forEach(c => { c._score = 0; });
  }

  switch(sort) {
    case 'relevance': filtered.sort((a,b) => (b._score||0) - (a._score||0)); break;
    case 'rating': filtered.sort((a,b) => (b.rating||0) - (a.rating||0)); break;
    case 'enrollments': filtered.sort((a,b) => (b.enrollments||0) - (a.enrollments||0)); break;
    case 'latest': filtered.sort((a,b) => {
      const da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
      const db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
      return db - da;
    }); break;
    case 'alpha': filtered.sort((a,b) => (a.title||'').localeCompare(b.title||'')); break;
  }

  S.filtered = filtered;
  S.page = 1;

  renderActiveFilters();
  $('#results-count').innerHTML = `발견된 별: <strong>${filtered.length.toLocaleString()}</strong>개`;
  renderList();
}

function renderActiveFilters() {
  const container = $('#active-filters');
  let html = '';
  const add = (fid, vals, label) => vals.forEach(v => {
    html += `<span class="filter-chip">${label}: ${v} <button class="filter-chip-x" data-fid="${fid}" data-val="${v}">×</button></span>`;
  });
  add('f-category', getMSValues('f-category'), '카테고리');
  add('f-difficulty', getMSValues('f-difficulty'), '난이도');
  add('f-language', getMSValues('f-language'), '언어');
  add('f-subtitles', getMSValues('f-subtitles'), '자막');
  add('f-rating', getMSValues('f-rating'), '평점');
  add('f-attr', getMSValues('f-attr'), '속성');
  
  const sensitivityLabel = SENSITIVITY_CONFIG[S.sensitivity || 'balanced']?.label || '📊 보통';
  if (S.sensitivity && S.sensitivity !== 'balanced') {
    html += `<span class="filter-chip">감도: ${sensitivityLabel}</span>`;
  }
  
  const q = $('#search-input').value.trim();
  if(q) html += `<span class="filter-chip">검색: ${q} (${S.searchMode.toUpperCase()}) <button class="filter-chip-x" data-fid="search" data-val="">×</button></span>`;
  container.innerHTML = html;

  container.querySelectorAll('.filter-chip-x').forEach(btn => {
    btn.addEventListener('click', () => {
      if(btn.dataset.fid==='search') { $('#search-input').value=''; }
      else {
        const wrap = $(`[data-fid="${btn.dataset.fid}"]`);
        if(wrap) { const cb = wrap.querySelector(`input[value="${btn.dataset.val}"]`); if(cb) cb.checked=false; updateMSBtn(btn.dataset.fid); }
      }
      applyFilters();
    });
  });
}

function resetAll(notify=true) {
  $('#search-input').value = '';
  ['f-category','f-difficulty','f-language','f-subtitles','f-rating','f-attr'].forEach(fid => {
    const wrap = $(`[data-fid="${fid}"]`);
    if(wrap) { wrap.querySelectorAll('input:checked').forEach(cb => cb.checked=false); updateMSBtn(fid); }
  });
  $('#sort-select').value = 'relevance';
  S.searchMode = 'ai';
  S.sensitivity = 'balanced';
  $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
  $('.scan-mode-btn[data-mode="ai"]')?.classList.add('active');
  $$('.sensitivity-btn').forEach(b => b.classList.remove('active'));
  $('.sensitivity-btn[data-sensitivity="balanced"]')?.classList.add('active');
  $('#ai-panel').classList.remove('open');
  S.selectedIds.clear();
  updateFAB();
  if(notify) { applyFilters(); toast('✨ 스캐너를 초기화했습니다.'); }
}
