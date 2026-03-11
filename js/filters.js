// ═══════════════════════════════════════════════════════════
// filters.js — 멀티셀렉트, 필터링, 활성 필터 태그
// ═══════════════════════════════════════════════════════════

// 멀티셀렉트 초기화
function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUnique('subtitles', true));
  populateMS('f-rating', [{v:'4.5',l:'⭐ 4.5점 이상'},{v:'4.0',l:'⭐ 4.0점 이상'},{v:'3.5',l:'⭐ 3.5점 이상'}]);
  populateMS('f-attr', [{v:'NEW',l:'✨ NEW'}]);
}

function populateMS(fid, items, showEmoji=false) {
  const wrap = $(`[data-fid="${fid}"]`);
  if(!wrap) return;
  const panel = wrap.querySelector('.ms-panel');
  const btn = wrap.querySelector('.ms-btn');

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
    'f-category':'모든 은하','f-difficulty':'모든 등급','f-language':'모든 언어',
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

// 메인 필터링 함수
function applyFilters() {
  const cats = getMSValues('f-category');
  const diffs = getMSValues('f-difficulty');
  const langs = getMSValues('f-language');
  const subs = getMSValues('f-subtitles');
  const ratings = getMSValues('f-rating');
  const attrs = getMSValues('f-attr');
  const sort = $('#sort-select').value;
  const searchText = $('#search-input').value.trim();

  let filtered = [...S.courses];

  // 필터 적용 (필터 간 AND, 필터 내 OR)
  if(cats.length>0) filtered = filtered.filter(c => cats.some(cat => c.category?.includes(cat)));
  if(diffs.length>0) filtered = filtered.filter(c => diffs.includes(c.difficulty));
  if(langs.length>0) filtered = filtered.filter(c => langs.includes(c.language));
  if(subs.length>0) filtered = filtered.filter(c => subs.some(sub => c.subtitles?.includes(sub)));
  if(ratings.length>0) filtered = filtered.filter(c => ratings.some(r => c.rating >= parseFloat(r)));
  if(attrs.includes('NEW')) filtered = filtered.filter(c => c.isNew);

  // 키워드 검색 + 스코어링
  if(searchText) {
    let keywords = searchText.split(/[,\s]+/).map(k => k.trim().toLowerCase()).filter(k => k.length>0);
    keywords = expandKeywordsLocal(keywords);

    if(S.searchMode === 'and') {
      filtered = filtered.filter(c => keywords.every(kw => c._search.includes(kw)));
    } else {
      filtered = filtered.filter(c => keywords.some(kw => c._search.includes(kw)));
    }

    filtered.forEach(c => {
      c._score = 0;
      keywords.forEach(kw => { c._score += scoreKeyword(c, kw); });
    });
  } else {
    filtered.forEach(c => { c._score = 0; });
  }

  // 정렬
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

// 활성 필터 태그
function renderActiveFilters() {
  const container = $('#active-filters');
  let html = '';
  const add = (fid, vals, label) => vals.forEach(v => {
    html += `<span class="filter-chip">${label}: ${v} <button class="filter-chip-x" data-fid="${fid}" data-val="${v}">×</button></span>`;
  });
  add('f-category', getMSValues('f-category'), '은하');
  add('f-difficulty', getMSValues('f-difficulty'), '등급');
  add('f-language', getMSValues('f-language'), '언어');
  add('f-subtitles', getMSValues('f-subtitles'), '자막');
  add('f-rating', getMSValues('f-rating'), '평점');
  add('f-attr', getMSValues('f-attr'), '속성');
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

// 필터 초기화
function resetAll(notify=true) {
  $('#search-input').value = '';
  ['f-category','f-difficulty','f-language','f-subtitles','f-rating','f-attr'].forEach(fid => {
    const wrap = $(`[data-fid="${fid}"]`);
    if(wrap) { wrap.querySelectorAll('input:checked').forEach(cb => cb.checked=false); updateMSBtn(fid); }
  });
  $('#sort-select').value = 'relevance';
  S.searchMode = 'ai';
  $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
  $('.scan-mode-btn[data-mode="ai"]').classList.add('active');
  $('#ai-panel').classList.remove('open');
  S.selectedIds.clear();
  updateFAB();
  if(notify) { applyFilters(); toast('✨ 스캐너를 초기화했습니다. 전체 은하가 보입니다.'); }
}
