// ═══════════════════════════════════════════════════════════
// filters.js — 완전 재설계: 직접 바인딩 방식
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
  var vals = new Set();
  S.courses.forEach(function(c) {
    if (!c.subtitles || c.subtitles === '없음') return;
    c.subtitles.split(',').forEach(function(s) { var t = s.trim(); if (t) vals.add(t); });
  });
  var arr = Array.from(vals);
  var ko = arr.filter(function(a) { return a.toLowerCase().indexOf('ko') !== -1; });
  var en = arr.filter(function(a) { return a.toLowerCase().indexOf('en') !== -1 && a.toLowerCase().indexOf('ko') === -1; });
  var rest = arr.filter(function(a) { return a.toLowerCase().indexOf('ko') === -1 && a.toLowerCase().indexOf('en') === -1; });
  return ko.concat(en).concat(rest.sort());
}

function populateMS(fid, items, showEmoji) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var panel = wrap.querySelector('.ms-panel');
  var btn = wrap.querySelector('.ms-btn');

  if (fid === 'f-language') {
    var ko = items.filter(function(i) { return typeof i === 'string' && (i.indexOf('한국어') !== -1 || i.toLowerCase().indexOf('ko') !== -1); });
    var en = items.filter(function(i) { return typeof i === 'string' && i.indexOf('English') !== -1; });
    var rest = items.filter(function(i) { return typeof i === 'string' && ko.indexOf(i) === -1 && en.indexOf(i) === -1; });
    items = ko.concat(en).concat(rest);
  }

  // HTML 생성
  var html = '<div class="ms-select-all"><label><input type="checkbox" data-sa="' + fid + '" checked> ✅ 전체</label></div>';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var v = typeof item === 'object' ? item.v : item;
    var l = typeof item === 'object' ? item.l : (showEmoji ? getCatEmoji(item) + ' ' + item : item);
    html += '<div class="ms-item"><label><input type="checkbox" data-fid="' + fid + '" value="' + v + '"> ' + l + '</label></div>';
  }
  panel.innerHTML = html;

  // 버튼 클릭 → 패널 토글
  btn.onclick = function(e) {
    e.stopPropagation();
    // 다른 패널 닫기
    var allPanels = document.querySelectorAll('.ms-panel');
    for (var j = 0; j < allPanels.length; j++) {
      if (allPanels[j] !== panel) allPanels[j].classList.remove('open');
    }
    panel.classList.toggle('open');
  };

  // 전체 선택 체크박스
  var saCheckbox = panel.querySelector('[data-sa="' + fid + '"]');
  if (saCheckbox) {
    saCheckbox.onclick = function(e) {
      e.stopPropagation();
      // 전체 선택 → 개별 전부 해제
      var itemCbs = panel.querySelectorAll('input[data-fid="' + fid + '"]');
      for (var j = 0; j < itemCbs.length; j++) itemCbs[j].checked = false;
      saCheckbox.checked = true;
      updateMSBtn(fid);
      applyFilters();
    };
  }

  // 개별 체크박스
  var itemCbs = panel.querySelectorAll('input[data-fid="' + fid + '"]');
  for (var j = 0; j < itemCbs.length; j++) {
    (function(cb) {
      cb.onclick = function(e) {
        e.stopPropagation();
        // 개별 항목 변경 → 전체 선택 동기화
        var checked = panel.querySelectorAll('input[data-fid="' + fid + '"]:checked');
        if (saCheckbox) saCheckbox.checked = (checked.length === 0);
        updateMSBtn(fid);
        applyFilters();
      };
    })(itemCbs[j]);
  }
}

function updateMSBtn(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var btn = wrap.querySelector('.ms-btn');
  var checked = wrap.querySelectorAll('input[data-fid="' + fid + '"]:checked');
  var arr = [];
  for (var i = 0; i < checked.length; i++) arr.push(checked[i].value);

  var defaults = {
    'f-category':'모든 카테고리', 'f-difficulty':'모든 난이도', 'f-language':'모든 언어',
    'f-subtitles':'모든 자막', 'f-duration':'모든 시간', 'f-score':'모든 점수', 'f-attr':'모든 강의'
  };

  if (arr.length === 0) btn.textContent = defaults[fid] || '전체';
  else if (arr.length === 1) btn.textContent = arr[0];
  else btn.textContent = arr[0] + ' 외 ' + (arr.length - 1) + '개';
}

function getMSValues(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return [];
  var checked = wrap.querySelectorAll('input[data-fid="' + fid + '"]:checked');
  var arr = [];
  for (var i = 0; i < checked.length; i++) arr.push(checked[i].value);
  return arr;
}

function setMSValues(fid, values) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var cbs = wrap.querySelectorAll('input[data-fid="' + fid + '"]');
  for (var i = 0; i < cbs.length; i++) cbs[i].checked = (values.indexOf(cbs[i].value) !== -1);
  var saCheckbox = wrap.querySelector('[data-sa="' + fid + '"]');
  if (saCheckbox) saCheckbox.checked = (values.length === 0);
  updateMSBtn(fid);
}

// ★ 특정 필터의 특정 값 해제
function removeFilterValue(fid, val) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var cbs = wrap.querySelectorAll('input[data-fid="' + fid + '"]');
  for (var i = 0; i < cbs.length; i++) {
    if (cbs[i].value === val) { cbs[i].checked = false; break; }
  }
  var saCheckbox = wrap.querySelector('[data-sa="' + fid + '"]');
  var checked = wrap.querySelectorAll('input[data-fid="' + fid + '"]:checked');
  if (saCheckbox) saCheckbox.checked = (checked.length === 0);
  updateMSBtn(fid);
  applyFilters();
}

// ═══════════════════════════════════════════════════════════
// 키워드 번역
// ═══════════════════════════════════════════════════════════
function translateKeywords(keywords) {
  var translated = [];
  for (var i = 0; i < keywords.length; i++) {
    var kw = keywords[i];
    translated.push(kw);
    var mapped = KO_EN_MAP[kw];
    if (mapped) for (var j = 0; j < mapped.length; j++) translated.push(mapped[j]);
    var entries = Object.entries(KO_EN_MAP);
    for (var j = 0; j < entries.length; j++) {
      for (var k = 0; k < entries[j][1].length; k++) {
        if (entries[j][1][k].toLowerCase() === kw.toLowerCase() && translated.indexOf(entries[j][0]) === -1) translated.push(entries[j][0]);
      }
    }
  }
  return Array.from(new Set(translated));
}

// ═══════════════════════════════════════════════════════════
// 스코어링 — 한국어 키워드 보너스 추가
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
  var allText = titleLower + ' ' + catLower + ' ' + topicLower + ' ' + headlineLower + ' ' + objectivesLower + ' ' + descLower;

  if (originalKeywords && originalKeywords.length > 0) {
    var originalCount = originalKeywords.length;
    var titleMatchCount = 0;
    for (var i = 0; i < originalKeywords.length; i++) {
      var kwTranslated = translateKeywords([originalKeywords[i]]);
      for (var j = 0; j < kwTranslated.length; j++) {
        if (titleLower.indexOf(kwTranslated[j].toLowerCase()) !== -1) { titleMatchCount++; break; }
      }
    }

    if (titleMatchCount >= originalCount && originalCount >= 2) totalScore += 500;
    else if (titleMatchCount >= originalCount) totalScore += 350;
    else if (titleMatchCount > 0) totalScore += titleMatchCount * 100;

    var allTextMatchCount = 0;
    for (var i = 0; i < originalKeywords.length; i++) {
      var kwTranslated = translateKeywords([originalKeywords[i]]);
      for (var j = 0; j < kwTranslated.length; j++) {
        if (allText.indexOf(kwTranslated[j].toLowerCase()) !== -1) { allTextMatchCount++; break; }
      }
    }
    if (allTextMatchCount >= originalCount && titleMatchCount < originalCount) {
      totalScore += (titleMatchCount === 0) ? 120 : 80;
    }

    var translatedOriginals = translateKeywords(originalKeywords);
    for (var i = 0; i < translatedOriginals.length; i++) {
      var kwl = translatedOriginals[i].toLowerCase();
      if (catLower.indexOf(kwl) !== -1) totalScore += 40;
      if (topicLower.indexOf(kwl) !== -1) totalScore += 30;
      if (config.scoreWeights.headline > 0 && headlineLower.indexOf(kwl) !== -1) totalScore += 20;
      if (config.scoreWeights.objectives > 0 && objectivesLower.indexOf(kwl) !== -1) totalScore += 10;
    }

    // ★ #4: 한국어 키워드 원본이 직접 매칭되면 추가 보너스
    for (var i = 0; i < originalKeywords.length; i++) {
      var origKw = originalKeywords[i].toLowerCase();
      // 한국어인지 체크
      if (/[가-힣]/.test(origKw)) {
        if (titleLower.indexOf(origKw) !== -1) totalScore += 50; // 한국어 제목 매칭 보너스
        if (headlineLower.indexOf(origKw) !== -1) totalScore += 20;
      }
    }
  }

  // 확장 키워드 보너스
  var transOrig = originalKeywords ? translateKeywords(originalKeywords) : [];
  for (var i = 0; i < keywords.length; i++) {
    var kwl = keywords[i].toLowerCase();
    var isOrig = false;
    for (var j = 0; j < transOrig.length; j++) { if (transOrig[j].toLowerCase() === kwl) { isOrig = true; break; } }
    if (isOrig) continue;
    if (titleLower.indexOf(kwl) !== -1) totalScore += 8;
    if (catLower.indexOf(kwl) !== -1) totalScore += 4;
    if (topicLower.indexOf(kwl) !== -1) totalScore += 3;
  }

  if (course.isNew) totalScore += 3;
  if (hasKoreanSub(course)) totalScore += 3;
  if (course.rating >= 4.5) totalScore += 5;
  else if (course.rating >= 4.0) totalScore += 2;
  if (course.enrollments >= 10000) totalScore += 3;
  else if (course.enrollments >= 1000) totalScore += 1;

  // ★ #4: 한국어 자막 있으면 한국어 검색 시 보너스
  if (originalKeywords) {
    var hasKoreanQuery = false;
    for (var i = 0; i < originalKeywords.length; i++) {
      if (/[가-힣]/.test(originalKeywords[i])) { hasKoreanQuery = true; break; }
    }
    if (hasKoreanQuery && hasKoreanSub(course)) totalScore += 10;
  }

  return totalScore;
}

// ═══════════════════════════════════════════════════════════
// 필터링
// ═══════════════════════════════════════════════════════════
function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  var config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  var filterKws = (originalKeywords && originalKeywords.length > 0) ? translateKeywords(originalKeywords) : keywords;
  var coreText = ((course.title||'') + ' ' + (course.category||'') + ' ' + (course.topic||'') + ' ' + (course.headline||'')).toLowerCase();
  var searchText = coreText;
  if (sensitivity === 'wide') searchText += ' ' + (course.objectives||'') + ' ' + (course.description||'');
  else if (sensitivity === 'balanced') searchText += ' ' + (course.objectives||'');
  searchText = searchText.toLowerCase();

  if (S.searchMode === 'and') {
    for (var i = 0; i < originalKeywords.length; i++) {
      var kwTranslated = translateKeywords([originalKeywords[i]]);
      var found = false;
      for (var j = 0; j < kwTranslated.length; j++) {
        if (searchText.indexOf(kwTranslated[j].toLowerCase()) !== -1) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  } else {
    for (var i = 0; i < filterKws.length; i++) {
      if (coreText.indexOf(filterKws[i].toLowerCase()) !== -1) return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// applyFilters — 모든 필터 동시 적용
// ═══════════════════════════════════════════════════════════
function applyFilters() {
  var cats = getMSValues('f-category');
  var diffs = getMSValues('f-difficulty');
  var langs = getMSValues('f-language');
  var subs = getMSValues('f-subtitles');
  var durations = getMSValues('f-duration');
  var scores = getMSValues('f-score');
  var attrs = getMSValues('f-attr');
  var sort = document.getElementById('sort-select').value;
  var searchText = document.getElementById('search-input').value.trim();
  var sensitivity = S.sensitivity || 'balanced';
  var filtered = S.courses.slice();

  // ★ 모든 필터를 AND로 적용 (각 필터 내부는 OR)
  // 빈 배열 = 전체 선택 = 필터 안 걸림
  if (cats.length > 0) {
    filtered = filtered.filter(function(c) {
      for (var i = 0; i < cats.length; i++) { if (c.category && c.category.indexOf(cats[i]) !== -1) return true; }
      return false;
    });
  }
  if (diffs.length > 0) {
    filtered = filtered.filter(function(c) {
      for (var i = 0; i < diffs.length; i++) { if (c.difficulty && c.difficulty.toUpperCase() === diffs[i].toUpperCase()) return true; }
      return false;
    });
  }
  if (langs.length > 0) {
    filtered = filtered.filter(function(c) { return langs.indexOf(c.language) !== -1; });
  }
  if (subs.length > 0) {
    filtered = filtered.filter(function(c) {
      if (!c.subtitles || c.subtitles === '없음') return false;
      for (var i = 0; i < subs.length; i++) { if (c.subtitles.toLowerCase().indexOf(subs[i].toLowerCase()) !== -1) return true; }
      return false;
    });
  }
  if (attrs.indexOf('NEW') !== -1) {
    filtered = filtered.filter(function(c) { return c.isNew; });
  }
  if (durations.length > 0) {
    filtered = filtered.filter(function(c) {
      var m = c.contentLength || 0;
      for (var i = 0; i < durations.length; i++) {
        var d = durations[i];
        if (d === '60' && m < 60) return true;
        if (d === '120' && m >= 60 && m < 120) return true;
        if (d === '180' && m >= 120 && m < 180) return true;
        if (d === '240' && m >= 180 && m < 240) return true;
        if (d === '300' && m >= 240) return true;
      }
      return false;
    });
  }

  // 키워드 검색
  if (searchText) {
    var originalKeywords = [];
    var parts = searchText.split(/[,\s]+/);
    for (var i = 0; i < parts.length; i++) {
      var k = parts[i].trim().toLowerCase();
      if (k.length > 0) originalKeywords.push(k);
    }
    var keywords = expandKeywordsLocal(originalKeywords);
    filtered = filtered.filter(function(c) { return filterWithSensitivity(c, keywords, sensitivity, originalKeywords); });
    for (var i = 0; i < filtered.length; i++) {
      filtered[i]._score = scoreWithSensitivity(filtered[i], keywords, sensitivity, originalKeywords);
    }
    var config = SENSITIVITY_CONFIG[sensitivity];
    if (config.minScore > 0) filtered = filtered.filter(function(c) { return c._score >= config.minScore; });
    if (scores.length > 0) filtered = filtered.filter(function(c) {
      for (var i = 0; i < scores.length; i++) { if (c._score >= parseInt(scores[i])) return true; }
      return false;
    });
  } else {
    for (var i = 0; i < filtered.length; i++) filtered[i]._score = 0;
  }

  switch (sort) {
    case 'relevance': filtered.sort(function(a,b) { return (b._score||0)-(a._score||0); }); break;
    case 'rating': filtered.sort(function(a,b) { return (b.rating||0)-(a.rating||0); }); break;
    case 'enrollments': filtered.sort(function(a,b) { return (b.enrollments||0)-(a.enrollments||0); }); break;
    case 'latest': filtered.sort(function(a,b) { return (b.lastUpdated?new Date(b.lastUpdated):new Date(0))-(a.lastUpdated?new Date(a.lastUpdated):new Date(0)); }); break;
    case 'alpha': filtered.sort(function(a,b) { return (a.title||'').localeCompare(b.title||''); }); break;
  }

  S.filtered = filtered;
  S.page = 1;
  renderActiveFilters();
  document.getElementById('results-count').innerHTML = '발견된 별: <strong>' + filtered.length.toLocaleString() + '</strong>개';
  var dc = document.querySelector('.stats-card[data-idx="2"] .stats-value');
  if (dc) animateCount(dc, filtered.length, 800);
  renderList();
}

// ═══════════════════════════════════════════════════════════
// ★ 필터 칩 — 직접 onclick 바인딩 (이벤트 위임 X)
// ═══════════════════════════════════════════════════════════
function renderActiveFilters() {
  var container = document.getElementById('active-filters');
  if (!container) return;

  // 빈 div로 초기화
  while (container.firstChild) container.removeChild(container.firstChild);

  function addChip(fid, val, label) {
    var span = document.createElement('span');
    span.className = 'filter-chip';
    span.textContent = label + ': ' + val + ' ';
    var xBtn = document.createElement('button');
    xBtn.className = 'filter-chip-x';
    xBtn.textContent = '×';
    xBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      removeFilterValue(fid, val);
    };
    span.appendChild(xBtn);
    container.appendChild(span);
  }

  var fids = [
    { fid: 'f-category', label: '카테고리' },
    { fid: 'f-difficulty', label: '난이도' },
    { fid: 'f-language', label: '언어' },
    { fid: 'f-subtitles', label: '자막' },
    { fid: 'f-duration', label: '시간' },
    { fid: 'f-score', label: '추천도' },
    { fid: 'f-attr', label: '속성' }
  ];

  for (var i = 0; i < fids.length; i++) {
    var vals = getMSValues(fids[i].fid);
    for (var j = 0; j < vals.length; j++) {
      addChip(fids[i].fid, vals[j], fids[i].label);
    }
  }

  // 모드 칩
  var modeChip = document.createElement('span');
  modeChip.className = 'filter-chip';
  modeChip.style.background = 'rgba(124,108,240,0.25)';
  modeChip.textContent = '모드: ' + (S.searchMode || 'and').toUpperCase();
  container.appendChild(modeChip);

  // 감도 칩
  var sl = SENSITIVITY_CONFIG[S.sensitivity || 'balanced'];
  if (S.sensitivity && S.sensitivity !== 'balanced' && sl) {
    var sensChip = document.createElement('span');
    sensChip.className = 'filter-chip';
    sensChip.textContent = '감도: ' + sl.label;
    container.appendChild(sensChip);
  }

  // 검색어 칩
  var q = document.getElementById('search-input').value.trim();
  if (q) {
    var searchChip = document.createElement('span');
    searchChip.className = 'filter-chip';
    searchChip.textContent = '검색: ' + (q.length > 30 ? q.substring(0, 30) + '...' : q) + ' ';
    var searchX = document.createElement('button');
    searchX.className = 'filter-chip-x';
    searchX.textContent = '×';
    searchX.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('search-input').value = '';
      applyFilters();
    };
    searchChip.appendChild(searchX);
    container.appendChild(searchChip);
  }
}

// ═══════════════════════════════════════════════════════════
// 리셋
// ═══════════════════════════════════════════════════════════
function resetAll(notify) {
  if (notify === undefined) notify = true;
  document.getElementById('search-input').value = '';
  var fids = ['f-category','f-difficulty','f-language','f-subtitles','f-duration','f-score','f-attr'];
  for (var i = 0; i < fids.length; i++) {
    var wrap = document.querySelector('[data-fid="' + fids[i] + '"]');
    if (!wrap) continue;
    var cbs = wrap.querySelectorAll('input[data-fid="' + fids[i] + '"]:checked');
    for (var j = 0; j < cbs.length; j++) cbs[j].checked = false;
    var sa = wrap.querySelector('[data-sa="' + fids[i] + '"]');
    if (sa) sa.checked = true;
    updateMSBtn(fids[i]);
  }
  document.getElementById('sort-select').value = 'relevance';
  S.searchMode = 'and';
  S.sensitivity = 'balanced';
  var modes = document.querySelectorAll('.scan-mode-btn[data-mode]');
  for (var i = 0; i < modes.length; i++) {
    modes[i].classList.remove('active');
    if (modes[i].getAttribute('data-mode') === 'and') modes[i].classList.add('active');
  }
  var sensBtns = document.querySelectorAll('.sensitivity-btn');
  for (var i = 0; i < sensBtns.length; i++) {
    sensBtns[i].classList.remove('active');
    if (sensBtns[i].getAttribute('data-sensitivity') === 'balanced') sensBtns[i].classList.add('active');
  }
  var ap = document.getElementById('ai-panel'); if (ap) ap.classList.remove('open');
  var fg = document.getElementById('filters-grid'); if (fg) fg.classList.remove('open');
  var ft = document.getElementById('btn-filter-toggle'); if (ft) ft.classList.remove('active');
  S.selectedIds.clear(); updateFAB();
  if (notify) { applyFilters(); toast('✨ 스캐너 초기화'); }
}
