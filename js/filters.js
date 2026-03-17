// ═══════════════════════════════════════════════════════════
// filters.js — 스코어링 대수술: 제목 ALL 매칭 압도적 1등
// ═══════════════════════════════════════════════════════════

function initMultiSelects() {
  populateMS('f-category', getUnique('category', true), true);
  populateMS('f-difficulty', ['Beginner','Intermediate','Expert','All Levels','ALL_LEVELS','BEGINNER','INTERMEDIATE','EXPERT']);
  populateMS('f-language', getUnique('language'));
  populateMS('f-subtitles', getUniqueSubtitles());
  populateMS('f-duration', [{v:'60',l:'⏱️ 1시간 미만'},{v:'120',l:'⏱️ 1-2시간'},{v:'180',l:'⏱️ 2-3시간'},{v:'240',l:'⏱️ 3-4시간'},{v:'300',l:'⏱️ 4시간 이상'}]);
  populateMS('f-score', [{v:'100',l:'🎯 100점 이상'},{v:'200',l:'🎯 200점 이상'},{v:'300',l:'🎯 300점 이상'}]);
  populateMS('f-updated', [{v:'1m',l:'📅 1개월 이내'},{v:'3m',l:'📅 3개월 이내'},{v:'1y',l:'📅 1년 이내'},{v:'2y',l:'📅 2년 이내'},{v:'3y',l:'📅 3년 이내'}]);
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
  var html = '<div class="ms-select-all"><label><input type="checkbox" data-sa="' + fid + '" checked> ✅ 전체</label></div>';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var v = typeof item === 'object' ? item.v : item;
    var l = typeof item === 'object' ? item.l : (showEmoji ? getCatEmoji(item) + ' ' + item : item);
    html += '<div class="ms-item"><label><input type="checkbox" data-fid="' + fid + '" value="' + v + '"> ' + l + '</label></div>';
  }
  panel.innerHTML = html;
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    var allPanels = document.querySelectorAll('.ms-panel');
    for (var j = 0; j < allPanels.length; j++) { if (allPanels[j] !== panel) allPanels[j].classList.remove('open'); }
    panel.classList.toggle('open');
  });
  var saCheckbox = panel.querySelector('[data-sa="' + fid + '"]');
  if (saCheckbox) {
    saCheckbox.addEventListener('click', function(e) {
      e.stopPropagation();
      var itemCbs = panel.querySelectorAll('input[data-fid="' + fid + '"]');
      for (var j = 0; j < itemCbs.length; j++) itemCbs[j].checked = false;
      saCheckbox.checked = true;
      updateMSBtn(fid);
      applyFilters();
    });
  }
  var itemCbs = panel.querySelectorAll('input[data-fid="' + fid + '"]');
  for (var j = 0; j < itemCbs.length; j++) {
    (function(cb) {
      cb.addEventListener('click', function(e) {
        e.stopPropagation();
        var checked = panel.querySelectorAll('input[data-fid="' + fid + '"]:checked');
        if (saCheckbox) saCheckbox.checked = (checked.length === 0);
        updateMSBtn(fid);
        applyFilters();
      });
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
  var defaults = { 'f-category':'모든 카테고리','f-difficulty':'모든 난이도','f-language':'모든 언어','f-subtitles':'모든 자막','f-duration':'모든 시간','f-score':'모든 점수','f-updated':'모든 기간' };
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
  var checked = wrap.querySelectorAll('input[data-fid="' + fid + '"]:checked');
  if (saCheckbox) saCheckbox.checked = (checked.length === 0);
  updateMSBtn(fid);
}

function removeFilterValue(fid, val) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var cbs = wrap.querySelectorAll('input[data-fid="' + fid + '"]');
  for (var i = 0; i < cbs.length; i++) { if (cbs[i].value === val) { cbs[i].checked = false; break; } }
  var saCheckbox = wrap.querySelector('[data-sa="' + fid + '"]');
  var checked = wrap.querySelectorAll('input[data-fid="' + fid + '"]:checked');
  if (saCheckbox) saCheckbox.checked = (checked.length === 0);
  updateMSBtn(fid);
  applyFilters();
}

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

function phraseMatchesText(phrase, text) {
  var words = phrase.trim().split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    var word = words[i].toLowerCase();
    if (word.length < 1) continue;
    var translated = translateKeywords([word]);
    var found = false;
    for (var j = 0; j < translated.length; j++) {
      if (text.indexOf(translated[j].toLowerCase()) !== -1) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

function getUpdateCutoffDate(filterValue) {
  var now = new Date();
  switch (filterValue) {
    case '1m': now.setMonth(now.getMonth() - 1); return now;
    case '3m': now.setMonth(now.getMonth() - 3); return now;
    case '1y': now.setFullYear(now.getFullYear() - 1); return now;
    case '2y': now.setFullYear(now.getFullYear() - 2); return now;
    case '3y': now.setFullYear(now.getFullYear() - 3); return now;
    default: return null;
  }
}

function getKeywordWeights(originalKeywords) {
  if (!originalKeywords || originalKeywords.length === 0) return {};
  if (originalKeywords.length === 1) { var w = {}; w[originalKeywords[0]] = 1.0; return w; }
  var weights = {};
  var total = originalKeywords.length;
  for (var i = 0; i < total; i++) { weights[originalKeywords[i]] = 0.5 + (0.5 * (i + 1) / total); }
  return weights;
}

// ★ 제목에서 키워드 간 근접도 계산
function calcProximity(titleLower, originalKeywords) {
  if (!originalKeywords || originalKeywords.length < 2) return 0;
  var allTrans = [];
  for (var i = 0; i < originalKeywords.length; i++) {
    allTrans.push(translateKeywords([originalKeywords[i]]));
  }
  var positions = [];
  for (var i = 0; i < allTrans.length; i++) {
    var bestPos = -1;
    for (var j = 0; j < allTrans[i].length; j++) {
      var pos = titleLower.indexOf(allTrans[i][j].toLowerCase());
      if (pos !== -1 && (bestPos === -1 || pos < bestPos)) bestPos = pos;
    }
    if (bestPos !== -1) positions.push(bestPos);
  }
  if (positions.length < 2) return 0;
  positions.sort(function(a, b) { return a - b; });
  var maxGap = positions[positions.length - 1] - positions[0];
  if (maxGap <= 15) return 150;
  if (maxGap <= 30) return 80;
  if (maxGap <= 50) return 40;
  return 0;
}

// ★ 특정 필드에서 키워드 매칭 수 계산
function countFieldMatches(text, originalKeywords) {
  var count = 0;
  for (var i = 0; i < originalKeywords.length; i++) {
    if (phraseMatchesText(originalKeywords[i], text)) count++;
  }
  return count;
}

// ═══════════════════════════════════════════════════════════
// ★★★ 스코어링 대수술 — 누가봐도 합리적인 순위 ★★★
//
// 점수 체계 (높은 순):
// 1. 제목에 모든 키워드 있음 (3개+): +1500
// 2. 제목에 모든 키워드 있음 (2개):  +1000
// 3. 제목에 모든 키워드 있음 (1개):  +350
// 4. 소개/학습목표에 모든 키워드 있음: +200
// 5. 제목에 일부 키워드만 있음:       키워드당 +80
// 6. 근접도 보너스 (키워드 가까이):    +40~150
// 7. 언어 보너스/페널티:              +15(한국어) ~ -30(비주류)
// 8. 시간 감쇠:                      ×0.8 ~ ×1.3
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

  if (originalKeywords && originalKeywords.length > 0) {
    var originalCount = originalKeywords.length;

    // ═══ TIER 1: 제목 매칭 (가장 중요) ═══
    var titleMatchCount = countFieldMatches(titleLower, originalKeywords);

    if (titleMatchCount >= originalCount) {
      // 모든 키워드가 제목에 있음 → 압도적 최고점
      if (originalCount >= 3) totalScore += 1500;
      else if (originalCount >= 2) totalScore += 1000;
      else totalScore += 350;

      // 근접도 보너스 (키워드가 가까이 있으면 추가)
      totalScore += calcProximity(titleLower, originalKeywords);

    } else if (titleMatchCount > 0) {
      // ═══ TIER 3: 제목에 일부만 있음 ═══
      var kwWeights = getKeywordWeights(originalKeywords);
      for (var i = 0; i < originalKeywords.length; i++) {
        if (phraseMatchesText(originalKeywords[i], titleLower)) {
          totalScore += Math.round(80 * (kwWeights[originalKeywords[i]] || 1.0));
        }
      }
    }

    // ═══ TIER 2: 소개/학습목표에 모든 키워드 있음 ═══
    if (titleMatchCount < originalCount) {
      var headlineMatchCount = countFieldMatches(headlineLower, originalKeywords);
      var objectivesMatchCount = countFieldMatches(objectivesLower, originalKeywords);

      if (headlineMatchCount >= originalCount) {
        totalScore += 200; // 소개에 전부 있음
      } else if (objectivesMatchCount >= originalCount) {
        totalScore += 150; // 학습목표에 전부 있음
      } else {
        // 전체 텍스트에 전부 있음
        var allText = titleLower + ' ' + catLower + ' ' + topicLower + ' ' + headlineLower + ' ' + objectivesLower + ' ' + descLower;
        var allTextMatchCount = countFieldMatches(allText, originalKeywords);
        if (allTextMatchCount >= originalCount) {
          totalScore += 100;
        }
      }
    }

    // ═══ 개별 필드 보너스 (가중치 반영) ═══
    var kwWeights = getKeywordWeights(originalKeywords);
    for (var i = 0; i < originalKeywords.length; i++) {
      var kw = originalKeywords[i];
      var weight = kwWeights[kw] || 1.0;
      var translated = translateKeywords([kw]);
      for (var j = 0; j < translated.length; j++) {
        var kwl = translated[j].toLowerCase();
        if (catLower.indexOf(kwl) !== -1) totalScore += Math.round(30 * weight);
        if (topicLower.indexOf(kwl) !== -1) totalScore += Math.round(20 * weight);
        if (config.scoreWeights.headline > 0 && headlineLower.indexOf(kwl) !== -1) totalScore += Math.round(15 * weight);
        if (config.scoreWeights.objectives > 0 && objectivesLower.indexOf(kwl) !== -1) totalScore += Math.round(8 * weight);
      }
    }

    // ═══ 한국어 키워드 직접 매칭 보너스 ═══
    for (var i = 0; i < originalKeywords.length; i++) {
      var origWords = originalKeywords[i].split(/\s+/);
      for (var w = 0; w < origWords.length; w++) {
        if (/[가-힣]/.test(origWords[w])) {
          if (titleLower.indexOf(origWords[w].toLowerCase()) !== -1) totalScore += 50;
          if (headlineLower.indexOf(origWords[w].toLowerCase()) !== -1) totalScore += 20;
        }
      }
    }
  }

  // ═══ 확장 키워드 보너스 (매우 낮음) ═══
  var transOrig = originalKeywords ? translateKeywords(originalKeywords) : [];
  for (var i = 0; i < keywords.length; i++) {
    var kwl = keywords[i].toLowerCase();
    var isOrig = false;
    for (var j = 0; j < transOrig.length; j++) { if (transOrig[j].toLowerCase() === kwl) { isOrig = true; break; } }
    if (isOrig) continue;
    if (titleLower.indexOf(kwl) !== -1) totalScore += 5;
    if (catLower.indexOf(kwl) !== -1) totalScore += 3;
  }

  // ═══ 품질 보너스 ═══
  if (course.isNew) totalScore += 3;
  if (hasKoreanSub(course)) totalScore += 3;
  if (course.rating >= 4.5) totalScore += 5;
  else if (course.rating >= 4.0) totalScore += 2;
  if (course.enrollments >= 10000) totalScore += 3;
  else if (course.enrollments >= 1000) totalScore += 1;

  // ═══ 한국어 검색 + 한국어 자막 보너스 ═══
  if (originalKeywords) {
    var hasKoreanQuery = false;
    for (var i = 0; i < originalKeywords.length; i++) {
      if (/[가-힣]/.test(originalKeywords[i])) { hasKoreanQuery = true; break; }
    }
    if (hasKoreanQuery && hasKoreanSub(course)) totalScore += 10;
  }

  // ═══ 언어 보너스/페널티 ═══
  if (course.language) {
    var lang = course.language.toLowerCase();
    if (lang === '한국어' || lang === 'ko') totalScore += 15;
    else if (lang === 'english' || lang === 'en') totalScore += 5;
    else totalScore -= 30; // 힌디어, 스페인어 등 비주류 언어 페널티
  }

  // ═══ 시간 감쇠 ═══
  if (course.lastUpdated) {
    var monthsAgo = (Date.now() - new Date(course.lastUpdated).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 1) totalScore = Math.round(totalScore * 1.3);
    else if (monthsAgo <= 3) totalScore = Math.round(totalScore * 1.2);
    else if (monthsAgo <= 12) totalScore = Math.round(totalScore * 1.1);
    else if (monthsAgo > 36) totalScore = Math.round(totalScore * 0.8);
  }

  return totalScore;
}

// ═══════════════════════════════════════════════════════════
// 필터링 — 구문별 AND
// ═══════════════════════════════════════════════════════════
function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  var config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  var coreText = ((course.title || '') + ' ' + (course.category || '') + ' ' + (course.topic || '') + ' ' + (course.headline || '')).toLowerCase();
  var searchText = coreText;
  if (sensitivity === 'wide') searchText += ' ' + (course.objectives || '') + ' ' + (course.description || '');
  else if (sensitivity === 'balanced') searchText += ' ' + (course.objectives || '');
  searchText = searchText.toLowerCase();

  if (S.searchMode === 'and') {
    for (var i = 0; i < originalKeywords.length; i++) {
      if (!phraseMatchesText(originalKeywords[i], searchText)) return false;
    }
    return true;
  } else {
    for (var i = 0; i < originalKeywords.length; i++) {
      if (phraseMatchesText(originalKeywords[i], coreText)) return true;
    }
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// applyFilters — 로딩 + 스마트 결과 제한
// ═══════════════════════════════════════════════════════════
function applyFilters() {
  var overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('active');
  setTimeout(function() { _doApplyFilters(); if (overlay) overlay.classList.remove('active'); }, 50);
}

function _doApplyFilters() {
  var cats = getMSValues('f-category');
  var diffs = getMSValues('f-difficulty');
  var langs = getMSValues('f-language');
  var subs = getMSValues('f-subtitles');
  var durations = getMSValues('f-duration');
  var scores = getMSValues('f-score');
  var updatedFilters = getMSValues('f-updated');
  var sort = document.getElementById('sort-select').value;
  var searchText = document.getElementById('search-input').value.trim();
  var sensitivity = S.sensitivity || 'balanced';
  var filtered = S.courses.slice();

  if (cats.length > 0) { filtered = filtered.filter(function(c) { for (var i = 0; i < cats.length; i++) { if (c.category && c.category.indexOf(cats[i]) !== -1) return true; } return false; }); }
  if (diffs.length > 0) { filtered = filtered.filter(function(c) { for (var i = 0; i < diffs.length; i++) { if (c.difficulty && c.difficulty.toUpperCase() === diffs[i].toUpperCase()) return true; } return false; }); }
  if (langs.length > 0) { filtered = filtered.filter(function(c) { return langs.indexOf(c.language) !== -1; }); }
  if (subs.length > 0) { filtered = filtered.filter(function(c) { if (!c.subtitles || c.subtitles === '없음') return false; for (var i = 0; i < subs.length; i++) { if (c.subtitles.toLowerCase().indexOf(subs[i].toLowerCase()) !== -1) return true; } return false; }); }
  if (durations.length > 0) { filtered = filtered.filter(function(c) { var m = c.contentLength || 0; for (var i = 0; i < durations.length; i++) { var d = durations[i]; if (d === '60' && m < 60) return true; if (d === '120' && m >= 60 && m < 120) return true; if (d === '180' && m >= 120 && m < 180) return true; if (d === '240' && m >= 180 && m < 240) return true; if (d === '300' && m >= 240) return true; } return false; }); }
  if (updatedFilters.length > 0) { var earliestCutoff = null; for (var i = 0; i < updatedFilters.length; i++) { var cutoff = getUpdateCutoffDate(updatedFilters[i]); if (cutoff && (!earliestCutoff || cutoff < earliestCutoff)) earliestCutoff = cutoff; } if (earliestCutoff) { filtered = filtered.filter(function(c) { if (!c.lastUpdated) return false; return new Date(c.lastUpdated) >= earliestCutoff; }); } }

  if (searchText) {
    var originalKeywords = [];
    if (searchText.indexOf(',') !== -1) {
      var commaParts = searchText.split(',');
      for (var i = 0; i < commaParts.length; i++) { var k = commaParts[i].trim().toLowerCase(); if (k.length > 0) originalKeywords.push(k); }
    } else {
      var spaceParts = searchText.split(/\s+/);
      for (var i = 0; i < spaceParts.length; i++) { var k = spaceParts[i].trim().toLowerCase(); if (k.length > 0) originalKeywords.push(k); }
    }
    var keywords = expandKeywordsLocal(originalKeywords);
    filtered = filtered.filter(function(c) { return filterWithSensitivity(c, keywords, sensitivity, originalKeywords); });
    for (var i = 0; i < filtered.length; i++) { filtered[i]._score = scoreWithSensitivity(filtered[i], keywords, sensitivity, originalKeywords); }
    var config = SENSITIVITY_CONFIG[sensitivity];
    if (config.minScore > 0) filtered = filtered.filter(function(c) { return c._score >= config.minScore; });
    if (scores.length > 0) filtered = filtered.filter(function(c) { for (var i = 0; i < scores.length; i++) { if (c._score >= parseInt(scores[i])) return true; } return false; });
  } else {
    for (var i = 0; i < filtered.length; i++) filtered[i]._score = 0;
    filtered.sort(function(a, b) { return (b.enrollments || 0) - (a.enrollments || 0); });
  }

  switch (sort) {
    case 'relevance': filtered.sort(function(a, b) { return (b._score || 0) - (a._score || 0); }); break;
    case 'rating': filtered.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); }); break;
    case 'enrollments': filtered.sort(function(a, b) { return (b.enrollments || 0) - (a.enrollments || 0); }); break;
    case 'latest': filtered.sort(function(a, b) { return (b.lastUpdated ? new Date(b.lastUpdated) : new Date(0)) - (a.lastUpdated ? new Date(a.lastUpdated) : new Date(0)); }); break;
    case 'alpha': filtered.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); }); break;
  }

  S._fullFiltered = filtered;
  if (searchText && filtered.length > 10000 && !S.showAllResults) {
    S.filtered = filtered.slice(0, 100);
    S._isTruncated = true;
    S._fullCount = filtered.length;
  } else {
    S.filtered = filtered;
    S._isTruncated = false;
  }
  S.page = 1;

  renderActiveFilters();
  var countText = S._isTruncated
    ? '🎯 상위 100개 표시 (전체 ' + S._fullCount.toLocaleString() + '개)'
    : '발견된 별: <strong>' + S.filtered.length.toLocaleString() + '</strong>개';
  document.getElementById('results-count').innerHTML = countText;
  var dc = document.querySelector('.stats-card[data-idx="2"] .stats-value');
  if (dc) animateCount(dc, S._isTruncated ? S._fullCount : S.filtered.length, 800);
  renderList();
}

// ═══════════════════════════════════════════════════════════
// 필터 칩
// ═══════════════════════════════════════════════════════════
function renderActiveFilters() {
  var container = document.getElementById('active-filters');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);
  function addChip(fid, val, label) {
    var span = document.createElement('span');
    span.className = 'filter-chip';
    span.textContent = label + ': ' + val + ' ';
    var xBtn = document.createElement('button');
    xBtn.className = 'filter-chip-x';
    xBtn.textContent = '×';
    xBtn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); removeFilterValue(fid, val); };
    span.appendChild(xBtn);
    container.appendChild(span);
  }
  var fids = [
    { fid: 'f-category', label: '카테고리' }, { fid: 'f-difficulty', label: '난이도' },
    { fid: 'f-language', label: '언어' }, { fid: 'f-subtitles', label: '자막' },
    { fid: 'f-duration', label: '시간' }, { fid: 'f-score', label: '추천도' },
    { fid: 'f-updated', label: '업데이트' }
  ];
  for (var i = 0; i < fids.length; i++) {
    var vals = getMSValues(fids[i].fid);
    for (var j = 0; j < vals.length; j++) addChip(fids[i].fid, vals[j], fids[i].label);
  }
  var modeChip = document.createElement('span');
  modeChip.className = 'filter-chip';
  modeChip.style.background = 'rgba(124,108,240,0.25)';
  modeChip.textContent = '모드: ' + (S.searchMode || 'and').toUpperCase();
  container.appendChild(modeChip);
  var sl = SENSITIVITY_CONFIG[S.sensitivity || 'balanced'];
  if (S.sensitivity && S.sensitivity !== 'balanced' && sl) {
    var sensChip = document.createElement('span');
    sensChip.className = 'filter-chip';
    sensChip.textContent = '감도: ' + sl.label;
    container.appendChild(sensChip);
  }
  var q = document.getElementById('search-input').value.trim();
  if (q) {
    var searchChip = document.createElement('span');
    searchChip.className = 'filter-chip';
    searchChip.textContent = '검색: ' + (q.length > 30 ? q.substring(0, 30) + '...' : q) + ' ';
    var searchX = document.createElement('button');
    searchX.className = 'filter-chip-x';
    searchX.textContent = '×';
    searchX.onclick = function(e) { e.preventDefault(); e.stopPropagation(); document.getElementById('search-input').value = ''; applyFilters(); };
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
  var fids = ['f-category', 'f-difficulty', 'f-language', 'f-subtitles', 'f-duration', 'f-score', 'f-updated'];
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
  S.showAllResults = false;
  var modes = document.querySelectorAll('.scan-mode-btn[data-mode]');
  for (var i = 0; i < modes.length; i++) { modes[i].classList.remove('active'); if (modes[i].getAttribute('data-mode') === 'and') modes[i].classList.add('active'); }
  var sensBtns = document.querySelectorAll('.sensitivity-btn');
  for (var i = 0; i < sensBtns.length; i++) { sensBtns[i].classList.remove('active'); if (sensBtns[i].getAttribute('data-sensitivity') === 'balanced') sensBtns[i].classList.add('active'); }
  var ap = document.getElementById('ai-panel'); if (ap) ap.classList.remove('open');
  var fg = document.getElementById('filters-grid'); if (fg) fg.classList.remove('open');
  var ft = document.getElementById('btn-filter-toggle'); if (ft) ft.classList.remove('active');
  S.selectedIds.clear(); updateFAB();
  if (notify) { applyFilters(); toast('✨ 스캐너 초기화'); }
}
