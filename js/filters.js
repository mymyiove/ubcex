// ═══════════════════════════════════════════════════════════
// filters.js — AI 필터 업그레이드 + 띄어쓰기=쉼표 + AND 우선
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
  panel.innerHTML = items.map(function(item) {
    var v = typeof item === 'object' ? item.v : item;
    var l = typeof item === 'object' ? item.l : (showEmoji ? getCatEmoji(item) + ' ' + item : item);
    return '<div class="ms-item"><label><input type="checkbox" value="' + v + '"> ' + l + '</label></div>';
  }).join('');
  btn.onclick = function(e) {
    e.stopPropagation();
    document.querySelectorAll('.ms-panel').forEach(function(p) { if (p !== panel) p.classList.remove('open'); });
    panel.classList.toggle('open');
  };
  panel.addEventListener('change', function() { updateMSBtn(fid); applyFilters(); });
}

function updateMSBtn(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  var btn = wrap.querySelector('.ms-btn');
  var checked = [...wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked')];
  var defaults = { 'f-category':'모든 카테고리','f-difficulty':'모든 난이도','f-language':'모든 언어','f-subtitles':'모든 자막','f-duration':'모든 시간','f-score':'모든 점수','f-attr':'모든 강의' };
  if (checked.length === 0) btn.textContent = defaults[fid] || '선택';
  else if (checked.length === 1) btn.textContent = checked[0].value;
  else btn.textContent = checked[0].value + ' 외 ' + (checked.length - 1) + '개';
}

function getMSValues(fid) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return [];
  return [...wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked')].map(function(cb) { return cb.value; });
}

function setMSValues(fid, values) {
  var wrap = document.querySelector('[data-fid="' + fid + '"]');
  if (!wrap) return;
  wrap.querySelectorAll('.ms-panel input[type="checkbox"]').forEach(function(cb) { cb.checked = values.includes(cb.value); });
  updateMSBtn(fid);
}

// ═══════════════════════════════════════════════════════════
// 키워드 번역 (한↔영 양방향)
// ═══════════════════════════════════════════════════════════
function translateKeywords(keywords) {
  var translated = [];
  keywords.forEach(function(kw) {
    translated.push(kw);
    // 한→영
    var mapped = KO_EN_MAP[kw];
    if (mapped) mapped.forEach(function(m) { translated.push(m); });
    // 영→한
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
// ★ 스코어링 — 제목 ALL 매칭 최우선 + AND 보너스
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

    // ★ 각 원본 키워드별 제목 매칭 체크 (번역 포함)
    var titleMatchCount = 0;
    originalKeywords.forEach(function(kw) {
      var kwTranslated = translateKeywords([kw]);
      var matched = kwTranslated.some(function(t) { return titleLower.includes(t.toLowerCase()); });
      if (matched) titleMatchCount++;
    });

    // ★ 핵심 1: 원본 키워드 ALL 제목 매칭 → 최고점
    if (titleMatchCount >= originalCount && originalCount >= 2) {
      totalScore += 500;
    } else if (titleMatchCount >= originalCount) {
      totalScore += 350;
    } else if (titleMatchCount > 0) {
      totalScore += titleMatchCount * 100;
    }

    // ★ 핵심 2: 전체 텍스트 ALL 매칭 보너스
    var allTextMatchCount = 0;
    originalKeywords.forEach(function(kw) {
      var kwTranslated = translateKeywords([kw]);
      var matched = kwTranslated.some(function(t) { return allText.includes(t.toLowerCase()); });
      if (matched) allTextMatchCount++;
    });

    if (allTextMatchCount >= originalCount && titleMatchCount < originalCount) {
      if (titleMatchCount === 0) totalScore += 120;
      else totalScore += 80;
    }

    // ★ 핵심 3: 개별 원본 키워드 위치별 점수
    var translatedOriginals = translateKeywords(originalKeywords);
    translatedOriginals.forEach(function(kw) {
      var kwl = kw.toLowerCase();
      if (catLower.includes(kwl)) totalScore += 40;
      if (topicLower.includes(kwl)) totalScore += 30;
      if (config.scoreWeights.headline > 0 && headlineLower.includes(kwl)) totalScore += 20;
      if (config.scoreWeights.objectives > 0 && objectivesLower.includes(kwl)) totalScore += 10;
    });
  }

  // ★ 핵심 4: 확장 키워드 — 매우 낮은 보너스
  var transOrig = originalKeywords ? translateKeywords(originalKeywords) : [];
  keywords.forEach(function(kw) {
    var kwl = kw.toLowerCase();
    if (transOrig.some(function(ok) { return ok.toLowerCase() === kwl; })) return;
    if (titleLower.includes(kwl)) totalScore += 8;
    if (catLower.includes(kwl)) totalScore += 4;
    if (topicLower.includes(kwl)) totalScore += 3;
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

// ═══════════════════════════════════════════════════════════
// ★ 필터링 — 핵심 필드에서만 매칭 (description 남발 방지)
// ═══════════════════════════════════════════════════════════
function filterWithSensitivity(course, keywords, sensitivity, originalKeywords) {
  var config = SENSITIVITY_CONFIG[sensitivity] || SENSITIVITY_CONFIG.balanced;
  var filterKws = originalKeywords && originalKeywords.length > 0
    ? translateKeywords(originalKeywords)
    : keywords;

  // ★ 핵심 필드 = 제목 + 카테고리 + 주제 + 소개
  var coreText = [
    course.title || '',
    course.category || '',
    course.topic || '',
    course.headline || ''
  ].join(' ').toLowerCase();

  // 감도별 검색 범위
  var searchText = coreText;
  if (sensitivity === 'wide') {
    searchText += ' ' + (course.objectives || '') + ' ' + (course.description || '');
    searchText = searchText.toLowerCase();
  } else if (sensitivity === 'balanced') {
    searchText += ' ' + (course.objectives || '');
    searchText = searchText.toLowerCase();
  }

  if (S.searchMode === 'and') {
    // AND: 원본 키워드 전부 포함 (번역 포함)
    return originalKeywords.every(function(kw) {
      var kwTranslated = translateKeywords([kw]);
      return kwTranslated.some(function(t) { return searchText.includes(t.toLowerCase()); });
    });
  } else {
    // OR/AI: 핵심 필드에서 매칭
    return filterKws.some(function(kw) { return coreText.includes(kw.toLowerCase()); });
  }
}

// ═══════════════════════════════════════════════════════════
// ★ applyFilters — 띄어쓰기 = 쉼표 처리
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

  if (cats.length > 0) filtered = filtered.filter(function(c) { return cats.some(function(cat) { return c.category && c.category.includes(cat); }); });
  if (diffs.length > 0) filtered = filtered.filter(function(c) { return diffs.some(function(d) { return c.difficulty && c.difficulty.toUpperCase() === d.toUpperCase(); }); });
  if (langs.length > 0) filtered = filtered.filter(function(c) { return langs.includes(c.language); });
  if (subs.length > 0) filtered = filtered.filter(function(c) { if (!c.subtitles || c.subtitles === '없음') return false; return subs.some(function(sub) { return c.subtitles.toLowerCase().includes(sub.toLowerCase()); }); });
  if (attrs.includes('NEW')) filtered = filtered.filter(function(c) { return c.isNew; });
  if (durations.length > 0) {
    filtered = filtered.filter(function(c) {
      var m = c.contentLength || 0;
      return durations.some(function(d) {
        if (d === '60') return m < 60;
        if (d === '120') return m >= 60 && m < 120;
        if (d === '180') return m >= 120 && m < 180;
        if (d === '240') return m >= 180 && m < 240;
        if (d === '300') return m >= 240;
        return false;
      });
    });
  }

  if (searchText) {
    // ★ 띄어쓰기 = 쉼표 처리: "AI 영업" → ["ai", "영업"]
    var originalKeywords = searchText.split(/[,\s]+/).map(function(k) {
      return k.trim().toLowerCase();
    }).filter(function(k) {
      return k.length > 0;
    });

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

// ═══════════════════════════════════════════════════════════
// 필터 칩 렌더링
// ═══════════════════════════════════════════════════════════
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
  var sensitivityLabel = (SENSITIVITY_CONFIG[S.sensitivity || 'balanced'] || {}).label || '📊 보통';
  if (S.sensitivity && S.sensitivity !== 'balanced') html += '<span class="filter-chip">감도: ' + sensitivityLabel + '</span>';
  var q = $('#search-input').value.trim();
  if (q) html += '<span class="filter-chip">검색: ' + (q.length > 30 ? q.substring(0, 30) + '...' : q) + ' (' + S.searchMode.toUpperCase() + ') <button class="filter-chip-x" data-fid="search">×</button></span>';
  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
// 리셋
// ═══════════════════════════════════════════════════════════
function resetAll(notify) {
  if (notify === undefined) notify = true;
  $('#search-input').value = '';
  ['f-category','f-difficulty','f-language','f-subtitles','f-duration','f-score','f-attr'].forEach(function(fid) {
    var wrap = document.querySelector('[data-fid="' + fid + '"]');
    if (wrap) {
      wrap.querySelectorAll('.ms-panel input[type="checkbox"]:checked').forEach(function(cb) { cb.checked = false; });
      updateMSBtn(fid);
    }
  });
  $('#sort-select').value = 'relevance';
  S.searchMode = 'ai';
  S.sensitivity = 'balanced';
  $$('.scan-mode-btn[data-mode]').forEach(function(b) { b.classList.remove('active'); });
  var aiBtn = $('.scan-mode-btn[data-mode="ai"]');
  if (aiBtn) aiBtn.classList.add('active');
  $$('.sensitivity-btn').forEach(function(b) { b.classList.remove('active'); });
  var balBtn = $('.sensitivity-btn[data-sensitivity="balanced"]');
  if (balBtn) balBtn.classList.add('active');
  var aiPanel = $('#ai-panel');
  if (aiPanel) aiPanel.classList.remove('open');
  var filtersGrid = $('#filters-grid');
  if (filtersGrid) filtersGrid.classList.remove('open');
  var filterToggle = $('#btn-filter-toggle');
  if (filterToggle) filterToggle.classList.remove('active');
  S.selectedIds.clear();
  updateFAB();
  if (notify) { applyFilters(); toast('✨ 스캐너 초기화'); }
}
