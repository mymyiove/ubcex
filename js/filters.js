// ═══════════════════════════════════════════════════════════
// filters.js — 완전 재작성: 필터 + 칩 X + 전체 선택 + AND/OR
// ═══════════════════════════════════════════════════════════

function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels','ALL_LEVELS','BEGINNER','INTERMEDIATE','EXPERT']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUniqueSubtitles());
  populateMS('f-duration', [{v:'60',l:'⏱️ 1시간 미만'},{v:'120',l:'⏱️ 1-2시간'},{v:'180',l:'⏱️ 2-3시간'},{v:'240',l:'⏱️ 3-4시간'},{v:'300',l:'⏱️ 4시간 이상'}]);
  populateMS('f-score', [{v:'100',l:'🎯 100점 이상'},{v:'200',l:'🎯 200점 이상'},{v:'300',l:'🎯 300점 이상'}]);
  populateMS('f-attr', [{v:'NEW',l:'✨ 신규 강의'}]);
  initChipHandler();
}

// ★ 필터 칩 X 이벤트 — 최초 1회만 등록
function initChipHandler() {
  var container = document.getElementById('active-filters');
  if (!container || container._bound) return;
  container._bound = true;
  container.addEventListener('click', function(e) {
    var x = e.target;
    // 버튼 자체 또는 부모가 .filter-chip-x인지 확인
    while (x && x !== container) {
      if (x.classList && x.classList.contains('filter-chip-x')) {
        e.preventDefault();
        e.stopPropagation();
        var fid = x.getAttribute('data-fid');
        var val = x.getAttribute('data-val');
        if (fid === 'search') {
          document.getElementById('search-input').value = '';
        } else if (fid && val) {
          uncheckFilterValue(fid, val);
        }
        applyFilters();
        return;
      }
      x = x.parentNode;
    }
  });
}

// ★ 특정 필터의 특정 값만 체크 해제
function uncheckFilterValue(fid, val) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var cbs = wrap.querySelectorAll('.ms-item input[type="checkbox"]');
  for (var i = 0; i < cbs.length; i++) {
    if (cbs[i].value === val) {
      cbs[i].checked = false;
      break;
    }
  }
  syncSelectAll(fid);
  updateMSBtn(fid);
}

function getUniqueSubtitles() {
  var vals = new Set();
  S.courses.forEach(function(c) {
    if (!c.subtitles || c.subtitles === '없음') return;
    c.subtitles.split(',').forEach(function(s) { var t = s.trim(); if (t) vals.add(t); });
  });
  var arr = Array.from(vals);
  var ko = arr.filter(function(a) { return a.toLowerCase().includes('ko'); });
  var en = arr.filter(function(a) { return a.toLowerCase().includes('en') && !a.toLowerCase().includes('ko'); });
  var rest = arr.filter(function(a) { return !a.toLowerCase().includes('ko') && !a.toLowerCase().includes('en'); });
  return ko.concat(en).concat(rest.sort());
}

function populateMS(fid, items, showEmoji) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var panel = wrap.querySelector('.ms-panel');
  var btn = wrap.querySelector('.ms-btn');

  if (fid === 'f-language') {
    var ko = items.filter(function(i) { return typeof i === 'string' && (i.includes('한국어') || i.toLowerCase().includes('ko')); });
    var en = items.filter(function(i) { return typeof i === 'string' && i.includes('English'); });
    var rest = items.filter(function(i) { return typeof i === 'string' && ko.indexOf(i) === -1 && en.indexOf(i) === -1; });
    items = ko.concat(en).concat(rest);
  }

  var html = '<div class="ms-select-all"><label><input type="checkbox" data-select-all="' + fid + '" checked> ✅ 전체</label></div>';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var v = typeof item === 'object' ? item.v : item;
    var l = typeof item === 'object' ? item.l : (showEmoji ? getCatEmoji(item) + ' ' + item : item);
    html += '<div class="ms-item"><label><input type="checkbox" value="' + v + '"> ' + l + '</label></div>';
  }
  panel.innerHTML = html;

  // 버튼 클릭 → 패널 토글
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    // 다른 패널 닫기
    document.querySelectorAll('.ms-panel.open').forEach(function(p) {
      if (p !== panel) p.classList.remove('open');
    });
    panel.classList.toggle('open');
  });

  // 전체 선택 체크박스
  var selectAllCb = panel.querySelector('[data-select-all="' + fid + '"]');
  if (selectAllCb) {
    selectAllCb.addEventListener('click', function(e) {
      e.stopPropagation();
      var itemCbs = panel.querySelectorAll('.ms-item input[type="checkbox"]');
      if (selectAllCb.checked) {
        // 전체 선택 → 개별 전부 해제 (필터 없음 = 전체)
        for (var j = 0; j < itemCbs.length; j++) itemCbs[j].checked = false;
      } else {
        // 전체 해제 → 개별도 전부 해제
        for (var j = 0; j < itemCbs.length; j++) itemCbs[j].checked = false;
      }
      updateMSBtn(fid);
      applyFilters();
    });
  }

  // 개별 체크박스 변경
  var msItems = panel.querySelectorAll('.ms-item input[type="checkbox"]');
  for (var j = 0; j < msItems.length; j++) {
    msItems[j].addEventListener('click', function(e) {
      e.stopPropagation(); // 패널 닫힘 방지
      syncSelectAll(fid);
      updateMSBtn(fid);
      applyFilters();
    });
  }
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
  var checked = wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked');
  var arr = [];
  for (var i = 0; i < checked.length; i++) arr.push(checked[i].value);

  var defaults = {
    'f-category':'모든 카테고리', 'f-difficulty':'모든 난이도', 'f-language':'모든 언어',
    'f-subtitles':'모든 자막', 'f-duration':'모든 시간', 'f-score':'모든 점수', 'f-attr':'모든 강의'
  };

  if (arr.length === 0) {
    btn.textContent = defaults[fid] || '전체';
  } else if (arr.length === 1) {
    btn.textContent = arr[0];
  } else {
    btn.textContent = arr[0] + ' 외 ' + (arr.length - 1) + '개';
  }
}

function getMSValues(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return [];
  var checked = wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked');
  var arr = [];
  for (var i = 0; i < checked.length; i++) arr.push(checked[i].value);
  return arr;
}

function setMSValues(fid, values) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var cbs = wrap.querySelectorAll('.ms-item input[type="checkbox"]');
  for (var i = 0; i < cbs.length; i++) {
    cbs[i].checked = (values.indexOf(cbs[i].value) !== -1);
  }
  syncSelectAll(fid);
  updateMSBtn(fid);
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
    if (mapped) { for (var j = 0; j < mapped.length; j++) translated.push(mapped[j]); }
    var entries = Object.entries(KO_EN_MAP);
    for (var j = 0; j < entries.length; j++) {
      var ko = entries[j][0], enList = entries[j][1];
      for (var k = 0; k < enList.length; k++) {
        if (enList[k].toLowerCase() === kw.toLowerCase() && translated.indexOf(ko) === -1) {
          translated.push(ko);
        }
      }
    }
  }
  return Array.from(new Set(translated));
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
  }

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
  return totalScore;
}

// ═══════════════════════════════════════════════════════════
// 필터링
// ═══════════════════════════════════════════════════════════
function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  var config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  var filterKws = (originalKeywords && originalKeywords.length > 0) ? translateKeywords(originalKeywords) : keywords;
  var coreText = ((course.title || '') + ' ' + (course.category || '') + ' ' + (course.topic || '') + ' ' + (course.headline || '')).toLowerCase();
  var searchText = coreText;
  if (sensitivity === 'wide') searchText += ' ' + (course.objectives || '') + ' ' + (course.description || '');
  else if (sensitivity === 'balanced') searchText += ' ' + (course.objectives || '');
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
// applyFilters
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

  // ★ 필터 적용 — 빈 배열 = 전체 선택 = 필터 안 걸림
  if (S.searchMode === 'and' || !S.searchMode) {
    if (cats.length > 0) filtered = filtered.filter(function(c) { for (var i=0;i<cats.length;i++) { if (c.category && c.category.indexOf(cats[i]) !== -1) return true; } return false; });
    if (diffs.length > 0) filtered = filtered.filter(function(c) { for (var i=0;i<diffs.length;i++) { if (c.difficulty && c.difficulty.toUpperCase() === diffs[i].toUpperCase()) return true; } return false; });
    if (langs.length > 0) filtered = filtered.filter(function(c) { return langs.indexOf(c.language) !== -1; });
    if (subs.length > 0) filtered = filtered.filter(function(c) { if (!c.subtitles || c.subtitles === '없음') return false; for (var i=0;i<subs.length;i++) { if (c.subtitles.toLowerCase().indexOf(subs[i].toLowerCase()) !== -1) return true; } return false; });
    if (attrs.indexOf('NEW') !== -1) filtered = filtered.filter(function(c) { return c.isNew; });
  } else {
    var hasFilter = cats.length > 0 || diffs.length > 0 || langs.length > 0 || subs.length > 0 || attrs.length > 0;
    if (hasFilter) {
      filtered = filtered.filter(function(c) {
        if (cats.length > 0) { for (var i=0;i<cats.length;i++) { if (c.category && c.category.indexOf(cats[i]) !== -1) return true; } }
        if (diffs.length > 0) { for (var i=0;i<diffs.length;i++) { if (c.difficulty && c.difficulty.toUpperCase() === diffs[i].toUpperCase()) return true; } }
        if (langs.length > 0 && langs.indexOf(c.language) !== -1) return true;
        if (subs.length > 0 && c.subtitles && c.subtitles !== '없음') { for (var i=0;i<subs.length;i++) { if (c.subtitles.toLowerCase().indexOf(subs[i].toLowerCase()) !== -1) return true; } }
        if (attrs.indexOf('NEW') !== -1 && c.isNew) return true;
        return false;
      });
    }
  }

  if (durations.length > 0) {
    filtered = filtered.filter(function(c) {
      var m = c.contentLength || 0;
      for (var i=0;i<durations.length;i++) {
        var d = durations[i];
        if (d==='60' && m<60) return true;
        if (d==='120' && m>=60 && m<120) return true;
        if (d==='180' && m>=120 && m<180) return true;
        if (d==='240' && m>=180 && m<240) return true;
        if (d==='300' && m>=240) return true;
      }
      return false;
    });
  }

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
    if (scores.length > 0) filtered = filtered.filter(function(c) { for (var i=0;i<scores.length;i++) { if (c._score >= parseInt(scores[i])) return true; } return false; });
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
// 필터 칩 렌더링
// ═══════════════════════════════════════════════════════════
function renderActiveFilters() {
  var container = document.getElementById('active-filters');
  if (!container) return;
  var html = '';

  function addChips(fid, vals, label) {
    for (var i = 0; i < vals.length; i++) {
      var v = vals[i];
      var safe = v.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      html += '<span class="filter-chip">' + label + ': ' + v + ' <button class="filter-chip-x" data-fid="' + fid + '" data-val="' + safe + '">×</button></span>';
    }
  }

  addChips('f-category', getMSValues('f-category'), '카테고리');
  addChips('f-difficulty', getMSValues('f-difficulty'), '난이도');
  addChips('f-language', getMSValues('f-language'), '언어');
  addChips('f-subtitles', getMSValues('f-subtitles'), '자막');
  addChips('f-duration', getMSValues('f-duration'), '시간');
  addChips('f-score', getMSValues('f-score'), '추천도');
  addChips('f-attr', getMSValues('f-attr'), '속성');

  html += '<span class="filter-chip" style="background:rgba(124,108,240,0.25);">모드: ' + (S.searchMode || 'and').toUpperCase() + '</span>';

  var sl = SENSITIVITY_CONFIG[S.sensitivity || 'balanced'];
  if (S.sensitivity && S.sensitivity !== 'balanced' && sl) {
    html += '<span class="filter-chip">감도: ' + sl.label + '</span>';
  }

  var q = document.getElementById('search-input').value.trim();
  if (q) {
    html += '<span class="filter-chip">검색: ' + (q.length > 30 ? q.substring(0,30) + '...' : q) + ' <button class="filter-chip-x" data-fid="search" data-val="">×</button></span>';
  }

  container.innerHTML = html;
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
    var cbs = wrap.querySelectorAll('.ms-item input[type="checkbox"]:checked');
    for (var j = 0; j < cbs.length; j++) cbs[j].checked = false;
    var sa = wrap.querySelector('[data-select-all="' + fids[i] + '"]');
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
  S.selectedIds.clear();
  updateFAB();
  if (notify) { applyFilters(); toast('✨ 스캐너 초기화'); }
}
