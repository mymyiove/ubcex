// ═══════════════════════════════════════════════════════════
// filters.js — 필터 OR/AND 연동 + 기본값 AND + 전체 선택
// ═══════════════════════════════════════════════════════════

function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels','ALL_LEVELS','BEGINNER','INTERMEDIATE','EXPERT']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUniqueSubtitles());
  populateMS('f-duration', [{v:'60',l:'⏱️ 1시간 미만'},{v:'120',l:'⏱️ 1-2시간'},{v:'180',l:'⏱️ 2-3시간'},{v:'240',l:'⏱️ 3-4시간'},{v:'300',l:'⏱️ 4시간 이상'}]);
  populateMS('f-score', [{v:'100',l:'🎯 100점 이상'},{v:'200',l:'🎯 200점 이상'},{v:'300',l:'🎯 300점 이상'}]);
  populateMS('f-attr', [{v:'NEW',l:'✨ 신규 강의'}]);

  var container = $('#active-filters');
  if (container && !container._chipHandlerAttached) {
    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-chip-x');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var fid = btn.getAttribute('data-fid');
      var val = btn.getAttribute('data-val');
      if (fid === 'search') {
        $('#search-input').value = '';
      } else {
        var wrap = document.querySelector('[data-fid="' + fid + '"]');
        if (wrap) {
          wrap.querySelectorAll('.ms-panel input[type="checkbox"]').forEach(function(cb) {
            if (cb.value === val) cb.checked = false;
          });
          syncSelectAll(fid);
          updateMSBtn(fid);
        }
      }
      applyFilters();
    });
    container._chipHandlerAttached = true;
  }
}

function getUniqueSubtitles() {
  var vals = new Set();
  S.courses.forEach(function(c) {
    if (!c.subtitles || c.subtitles === '없음') return;
    c.subtitles.split(',').forEach(function(s) { var t = s.trim(); if (t) vals.add(t); });
  });
  var arr = [...vals];
  var ko = arr.filter(function(a) { return a.toLowerCase().includes('ko'); });
  var en = arr.filter(function(a) { return a.toLowerCase().includes('en') && !a.toLowerCase().includes('ko'); });
  var rest = arr.filter(function(a) { return !a.toLowerCase().includes('ko') && !a.toLowerCase().includes('en'); });
  return [...ko, ...en, ...rest.sort()];
}

function populateMS(fid, items, showEmoji) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var panel = wrap.querySelector('.ms-panel');
  var btn = wrap.querySelector('.ms-btn');
  if (fid === 'f-language') {
    var ko = items.filter(function(i) { return typeof i === 'string' && (i.includes('한국어') || i.toLowerCase().includes('ko')); });
    var en = items.filter(function(i) { return typeof i === 'string' && i.includes('English'); });
    var rest = items.filter(function(i) { return typeof i === 'string' && !ko.includes(i) && !en.includes(i); });
    items = [...ko, ...en, ...rest];
  }

  var selectAllHtml = '<div class="ms-select-all"><label><input type="checkbox" data-select-all="' + fid + '" checked> ✅ 전체 선택</label></div>';
  var itemsHtml = items.map(function(item) {
    var v = typeof item === 'object' ? item.v : item;
    var l = typeof item === 'object' ? item.l : (showEmoji ? getCatEmoji(item) + ' ' + item : item);
    return '<div class="ms-item"><label><input type="checkbox" value="' + v + '"> ' + l + '</label></div>';
  }).join('');

  panel.innerHTML = selectAllHtml + itemsHtml;

  btn.onclick = function(e) {
    e.stopPropagation();
    document.querySelectorAll('.ms-panel').forEach(function(p) { if (p !== panel) p.classList.remove('open'); });
    panel.classList.toggle('open');
  };

  var selectAllCb = panel.querySelector('[data-select-all="' + fid + '"]');
  if (selectAllCb) {
    selectAllCb.addEventListener('change', function() {
      var itemCbs = panel.querySelectorAll('.ms-item input[type="checkbox"]');
      itemCbs.forEach(function(cb) { cb.checked = false; });
      updateMSBtn(fid);
      applyFilters();
    });
  }

  panel.addEventListener('change', function(e) {
    if (e.target.dataset.selectAll) return;
    syncSelectAll(fid);
    updateMSBtn(fid);
    applyFilters();
  });
}

function syncSelectAll(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var selectAllCb = wrap.querySelector('[data-select-all="' + fid + '"]');
  if (!selectAllCb) return;
  var checkedCount = wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked').length;
  selectAllCb.checked = (checkedCount === 0);
}

function updateMSBtn(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var btn = wrap.querySelector('.ms-btn');
  var checked = [...wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked')];
  var defaults = { 'f-category':'모든 카테고리','f-difficulty':'모든 난이도','f-language':'모든 언어','f-subtitles':'모든 자막','f-duration':'모든 시간','f-score':'모든 점수','f-attr':'모든 강의' };
  if (checked.length === 0) btn.textContent = defaults[fid] || '전체';
  else if (checked.length === 1) btn.textContent = checked[0].value;
  else btn.textContent = checked[0].value + ' 외 ' + (checked.length - 1) + '개';
}

function getMSValues(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return [];
  return [...wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked')].map(function(cb) { return cb.value; });
}

function setMSValues(fid, values) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  wrap.querySelectorAll('.ms-item input[type="checkbox"]').forEach(function(cb) { cb.checked = values.includes(cb.value); });
  syncSelectAll(fid);
  updateMSBtn(fid);
}

// ═══════════════════════════════════════════════════════════
// 키워드 번역
// ═══════════════════════════════════════════════════════════
function translateKeywords(keywords) {
  var translated = [];
  keywords.forEach(function(kw) {
    translated.push(kw);
    var mapped = KO_EN_MAP[kw];
    if (mapped) mapped.forEach(function(m) { translated.push(m); });
    Object.entries(KO_EN_MAP).forEach(function(entry) {
      var ko = entry[0], enList = entry[1];
      if (enList.some(function(en) { return en.toLowerCase() === kw.toLowerCase(); })) {
        if (!translated.includes(ko)) translated.push(ko);
      }
    });
  });
  return [...new Set(translated)];
}

// ═══════════════════════════════════════════════════════════
// 스코어링
// ═══════════════════════════════════════════════════════════
function scoreWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  var config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  var totalScore = 0;
  var titleLower = (course.title || '').toLowerCase();
  var catLower = (course.category || '').toLowerCase();
  var topicLower = (course.topic || '').toLowerCase();
  var headlineLower = (course.headline || '').toLowerCase();
  var objectivesLower = (course.objectives || '').toLowerCase();
  var descLower = (course.description || '').toLowerCase();
  var allText = [titleLower, catLower, topicLower, headlineLower, objectivesLower, descLower].join(' ');

  if (originalKeywords && originalKeywords.length > 0) {
    var originalCount = originalKeywords.length;
    var titleMatchCount = 0;
    originalKeywords.forEach(function(kw) {
      var kwTranslated = translateKeywords([kw]);
      if (kwTranslated.some(function(t) { return titleLower.includes(t.toLowerCase()); })) titleMatchCount++;
    });

    if (titleMatchCount >= originalCount && originalCount >= 2) totalScore += 500;
    else if (titleMatchCount >= originalCount) totalScore += 350;
    else if (titleMatchCount > 0) totalScore += titleMatchCount * 100;

    var allTextMatchCount = 0;
    originalKeywords.forEach(function(kw) {
      var kwTranslated = translateKeywords([kw]);
      if (kwTranslated.some(function(t) { return allText.includes(t.toLowerCase()); })) allTextMatchCount++;
    });
    if (allTextMatchCount >= originalCount && titleMatchCount < originalCount) {
      totalScore += (titleMatchCount === 0) ? 120 : 80;
    }

    var translatedOriginals = translateKeywords(originalKeywords);
    translatedOriginals.forEach(function(kw) {
      var kwl = kw.toLowerCase();
      if (catLower.includes(kwl)) totalScore += 40;
      if (topicLower.includes(kwl)) totalScore += 30;
      if (config.scoreWeights.headline > 0 && headlineLower.includes(kwl)) totalScore += 20;
      if (config.scoreWeights.objectives > 0 && objectivesLower.includes(kwl)) totalScore += 10;
    });
  }

  var transOrig = originalKeywords ? translateKeywords(originalKeywords) : [];
  keywords.forEach(function(kw) {
    var kwl = kw.toLowerCase();
    if (transOrig.some(function(ok) { return ok.toLowerCase() === kwl; })) return;
    if (titleLower.includes(kwl)) totalScore += 8;
    if (catLower.includes(kwl)) totalScore += 4;
    if (topicLower.includes(kwl)) totalScore += 3;
  });

  if (course.isNew) totalScore += 3;
  if (hasKoreanSub(course)) totalScore += 3;
  if (course.rating >= 4.5) totalScore += 5;
  if (course.rating >= 4.0 && course.rating < 4.5) totalScore += 2;
  if (course.enrollments >= 10000) totalScore += 3;
  if (course.enrollments >= 1000) totalScore += 1;
  return totalScore;
}

// ═══════════════════════════════════════════════════════════
// ★ 필터링 — 검색 모드(AND/OR)에 따라 + 필터도 동일 모드 적용
// ═══════════════════════════════════════════════════════════
function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  var config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  var filterKws = originalKeywords && originalKeywords.length > 0
    ? translateKeywords(originalKeywords) : keywords;

  var coreText = [course.title || '', course.category || '', course.topic || '', course.headline || ''].join(' ').toLowerCase();
  var searchText = coreText;
  if (sensitivity === 'wide') searchText += ' ' + (course.objectives || '') + ' ' + (course.description || '');
  else if (sensitivity === 'balanced') searchText += ' ' + (course.objectives || '');
  searchText = searchText.toLowerCase();

  if (S.searchMode === 'and') {
    // AND: 모든 원본 키워드가 포함 (번역 포함)
    return originalKeywords.every(function(kw) {
      var kwTranslated = translateKeywords([kw]);
      return kwTranslated.some(function(t) { return searchText.includes(t.toLowerCase()); });
    });
  } else {
    // OR: 하나라도 핵심 필드에 포함
    return filterKws.some(function(kw) { return coreText.includes(kw.toLowerCase()); });
  }
}

// ═══════════════════════════════════════════════════════════
// ★ applyFilters — 필터도 검색 모드(AND/OR)에 따라 적용
// ═══════════════════════════════════════════════════════════
function applyFilters() {
  var cats = getMSValues('f-category');
  var diffs = getMSValues('f-difficulty');
  var langs = getMSValues('f-language');
  var subs = getMSValues('f-subtitles');
  var durations = getMSValues('f-duration');
  var scores = getMSValues('f-score');
  var attrs = getMSValues('f-attr');
  var sort = $('#sort-select').value;
  var searchText = $('#search-input').value.trim();
  var sensitivity = S.sensitivity || 'balanced';
  var filtered = [...S.courses];

  // ★ 필터 적용 — 검색 모드에 따라 OR/AND
  // AND 모드: 모든 필터 조건을 동시에 만족해야 함 (기본)
  // OR 모드: 필터 조건 중 하나라도 만족하면 통과
  if (S.searchMode === 'and' || !S.searchMode) {
    // AND: 각 필터가 독립적으로 AND 적용 (기존 동작)
    if (cats.length > 0) filtered = filtered.filter(function(c) { return cats.some(function(cat) { return c.category && c.category.includes(cat); }); });
    if (diffs.length > 0) filtered = filtered.filter(function(c) { return diffs.some(function(d) { return c.difficulty && c.difficulty.toUpperCase() === d.toUpperCase(); }); });
    if (langs.length > 0) filtered = filtered.filter(function(c) { return langs.includes(c.language); });
    if (subs.length > 0) filtered = filtered.filter(function(c) { if (!c.subtitles || c.subtitles === '없음') return false; return subs.some(function(sub) { return c.subtitles.toLowerCase().includes(sub.toLowerCase()); }); });
    if (attrs.includes('NEW')) filtered = filtered.filter(function(c) { return c.isNew; });
  } else {
    // OR: 선택된 필터 중 하나라도 만족하면 통과
    var hasAnyFilter = cats.length > 0 || diffs.length > 0 || langs.length > 0 || subs.length > 0 || attrs.length > 0;
    if (hasAnyFilter) {
      filtered = filtered.filter(function(c) {
        var matchCat = cats.length === 0 || cats.some(function(cat) { return c.category && c.category.includes(cat); });
        var matchDiff = diffs.length === 0 || diffs.some(function(d) { return c.difficulty && c.difficulty.toUpperCase() === d.toUpperCase(); });
        var matchLang = langs.length === 0 || langs.includes(c.language);
        var matchSub = subs.length === 0 || (c.subtitles && c.subtitles !== '없음' && subs.some(function(sub) { return c.subtitles.toLowerCase().includes(sub.toLowerCase()); }));
        var matchAttr = !attrs.includes('NEW') || c.isNew;
        // OR: 선택된 필터 중 하나라도 true
        return matchCat || matchDiff || matchLang || matchSub || matchAttr;
      });
    }
  }

  // 시간 필터는 항상 AND (시간은 범위 필터라 OR이 의미 없음)
  if (durations.length > 0) {
    filtered = filtered.filter(function(c) {
      var m = c.contentLength || 0;
      return durations.some(function(d) {
        if (d === '60') return m < 60; if (d === '120') return m >= 60 && m < 120;
        if (d === '180') return m >= 120 && m < 180; if (d === '240') return m >= 180 && m < 240;
        if (d === '300') return m >= 240; return false;
      });
    });
  }

  if (searchText) {
    var originalKeywords = searchText.split(/[,\s]+/).map(function(k) { return k.trim().toLowerCase(); }).filter(function(k) { return k.length > 0; });
    var keywords = expandKeywordsLocal(originalKeywords);
    filtered = filtered.filter(function(c) { return filterWithSensitivity(c, keywords, sensitivity, originalKeywords); });
    filtered.forEach(function(c) { c._score = scoreWithSensitivity(c, keywords, sensitivity, originalKeywords); });
    var config = SENSITIVITY_CONFIG[sensitivity];
    if (config.minScore > 0) filtered = filtered.filter(function(c) { return c._score >= config.minScore; });
    if (scores.length > 0) filtered = filtered.filter(function(c) { return scores.some(function(s) { return c._score >= parseInt(s); }); });
  } else {
    filtered.forEach(function(c) { c._score = 0; });
  }

  switch (sort) {
    case 'relevance': filtered.sort(function(a, b) { return (b._score || 0) - (a._score || 0); }); break;
    case 'rating': filtered.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); }); break;
    case 'enrollments': filtered.sort(function(a, b) { return (b.enrollments || 0) - (a.enrollments || 0); }); break;
    case 'latest': filtered.sort(function(a, b) { var da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0); var db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0); return db - da; }); break;
    case 'alpha': filtered.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); }); break;
  }

  S.filtered = filtered;
  S.page = 1;
  renderActiveFilters();
  $('#results-count').innerHTML = '발견된 별: <strong>' + filtered.length.toLocaleString() + '</strong>개';
  var discoveredCard = document.querySelector('.stats-card[data-idx="2"] .stats-value');
  if (discoveredCard) animateCount(discoveredCard, filtered.length, 800);
  renderList();
}

function renderActiveFilters() {
  var container = $('#active-filters');
  var html = '';
  function add(fid, vals, label) {
    vals.forEach(function(v) {
      var safeVal = String(v).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      html += '<span class="filter-chip">' + label + ': ' + v + ' <button class="filter-chip-x" data-fid="' + fid + '" data-val="' + safeVal + '">×</button></span>';
    });
  }
  add('f-category', getMSValues('f-category'), '카테고리');
  add('f-difficulty', getMSValues('f-difficulty'), '난이도');
  add('f-language', getMSValues('f-language'), '언어');
  add('f-subtitles', getMSValues('f-subtitles'), '자막');
  add('f-duration', getMSValues('f-duration'), '시간');
  add('f-score', getMSValues('f-score'), '추천도');
  add('f-attr', getMSValues('f-attr'), '속성');

  // ★ 검색 모드 표시
  html += '<span class="filter-chip" style="background:rgba(124,108,240,0.25);">모드: ' + S.searchMode.toUpperCase() + '</span>';

  var sensitivityLabel = (SENSITIVITY_CONFIG[S.sensitivity || 'balanced'] || {}).label || '📊 보통';
  if (S.sensitivity && S.sensitivity !== 'balanced') html += '<span class="filter-chip">감도: ' + sensitivityLabel + '</span>';
  var q = $('#search-input').value.trim();
  if (q) html += '<span class="filter-chip">검색: ' + (q.length > 30 ? q.substring(0, 30) + '...' : q) + ' <button class="filter-chip-x" data-fid="search">×</button></span>';
  container.innerHTML = html;
}

function resetAll(notify) {
  if (notify === undefined) notify = true;
  $('#search-input').value = '';
  ['f-category','f-difficulty','f-language','f-subtitles','f-duration','f-score','f-attr'].forEach(function(fid) {
    var wrap = document.querySelector('[data-fid="' + fid + '"]');
    if (wrap) {
      wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked').forEach(function(cb) { cb.checked = false; });
      syncSelectAll(fid);
      updateMSBtn(fid);
    }
  });
  $('#sort-select').value = 'relevance';
  // ★ 기본값 AND
  S.searchMode = 'and';
  S.sensitivity = 'balanced';
  $$('.scan-mode-btn[data-mode]').forEach(function(b) { b.classList.remove('active'); });
  var andBtn = $('.scan-mode-btn[data-mode="and"]');
  if (andBtn) andBtn.classList.add('active');
  $$('.sensitivity-btn').forEach(function(b) { b.classList.remove('active'); });
  var balBtn = $('.sensitivity-btn[data-sensitivity="balanced"]');
  if (balBtn) balBtn.classList.add('active');
  var aiPanel = $('#ai-panel'); if (aiPanel) aiPanel.classList.remove('open');
  var filtersGrid = $('#filters-grid'); if (filtersGrid) filtersGrid.classList.remove('open');
  var filterToggle = $('#btn-filter-toggle'); if (filterToggle) filterToggle.classList.remove('active');
  S.selectedIds.clear(); updateFAB();
  if (notify) { applyFilters(); toast('✨ 스캐너 초기화'); }
}
