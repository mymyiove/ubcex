// ═══════════════════════════════════════════════════════════
// render.js — 통계 카드 + 테이블/카드/컴팩트 렌더링
// 발견된 별 다운로드 + 수강자 K표시 + 스마트 결과 제한
// ═══════════════════════════════════════════════════════════
var currentSortColumn = null;
var currentSortDirection = 'desc';
var csvDownloadType = 'all';

function formatEnrollments(n) {
  if (!n || n <= 0) return '100▼';
  if (n < 100) return '100▼';
  if (n >= 1000) {
    var rounded = Math.round(n / 100) * 100;
    var k = (rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1);
    return k + 'K▲';
  }
  var rounded = Math.round(n / 100) * 100;
  return rounded.toLocaleString() + '▲';
}

function getPageData() { return S.filtered.slice((S.page - 1) * S.rows, S.page * S.rows); }

function sortByColumn(column) {
  if (currentSortColumn === column) currentSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
  else { currentSortColumn = column; currentSortDirection = 'desc'; }
  var dir = currentSortDirection === 'desc' ? -1 : 1;
  S.filtered.sort(function(a, b) {
    switch (column) {
      case 'score': return dir * ((a._score || 0) - (b._score || 0));
      case 'category': return dir * (a.category || '').localeCompare(b.category || '');
      case 'title': return dir * (a.title || '').localeCompare(b.title || '');
      case 'rating': return dir * ((a.rating || 0) - (b.rating || 0));
      case 'enrollments': return dir * ((a.enrollments || 0) - (b.enrollments || 0));
      case 'language': return dir * (a.language || '').localeCompare(b.language || '');
      case 'korean_sub': return dir * ((hasKoreanSub(a) ? 1 : 0) - (hasKoreanSub(b) ? 1 : 0));
      case 'difficulty': return dir * (a.difficulty || '').localeCompare(b.difficulty || '');
      case 'duration': return dir * ((a.contentLength || 0) - (b.contentLength || 0));
      case 'instructor': return dir * (a.instructor || '').localeCompare(b.instructor || '');
      case 'updated': return dir * ((a.lastUpdated ? new Date(a.lastUpdated) : new Date(0)) - (b.lastUpdated ? new Date(b.lastUpdated) : new Date(0)));
      default: return 0;
    }
  });
  S.page = 1;
  var ths = document.querySelectorAll('th.sortable');
  for (var i = 0; i < ths.length; i++) {
    ths[i].classList.remove('sort-asc', 'sort-desc');
    if (ths[i].dataset.sort === column) ths[i].classList.add(currentSortDirection === 'desc' ? 'sort-desc' : 'sort-asc');
  }
  renderList();
}

function renderList() {
  var data = getPageData();
  document.getElementById('view-table').style.display = S.viewMode === 'table' ? '' : 'none';
  document.getElementById('view-card').className = 'card-grid ' + (S.viewMode === 'card' ? 'active' : '');
  document.getElementById('view-compact').className = 'compact-list ' + (S.viewMode === 'compact' ? 'active' : '');

  if (data.length === 0) {
    var empty = '<div class="empty-state">' +
      '<h3>😅 발견된 별이 없습니다</h3>' +
      '<p>검색 모드를 <strong>AND에서 OR로 변경</strong>하시거나,<br>' +
      '<strong>🤖 AI 내비</strong> 기능으로 검색어를 확장해보세요!</p>' +
      '<p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem;">' +
      '💡 감도를 🔭 광역으로 조절하면 더 많은 결과를 볼 수 있습니다.</p></div>';
    document.getElementById('table-body').innerHTML = '<tr><td colspan="12">' + empty + '</td></tr>';
    document.getElementById('view-card').innerHTML = empty;
    document.getElementById('view-compact').innerHTML = empty;
    document.getElementById('pagination').innerHTML = '';
    var tb = document.getElementById('truncation-banner');
    if (tb) tb.style.display = 'none';
    return;
  }

  // ═══ 테이블 뷰 ═══
  var tableHtml = '';
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    var cat = c.category ? c.category.split(',')[0].trim() : '-';
    var color = getCatColor(cat);
    var checked = S.selectedIds.has(c.id) ? 'checked' : '';
    var rating = c.rating > 0 ? c.rating.toFixed(1) : '-';
    var enroll = formatEnrollments(c.enrollments);
    var dur = formatDuration(c.contentLength);
    var diff = { 'Beginner': '초급', 'BEGINNER': '초급', 'Intermediate': '중급', 'INTERMEDIATE': '중급', 'Expert': '고급', 'EXPERT': '고급', 'All Levels': '전체', 'ALL_LEVELS': '전체' }[c.difficulty] || c.difficulty;
    var koSub = hasKoreanSub(c);
    var inst = c.instructor ? (c.instructor.length > 20 ? c.instructor.substring(0, 20) + '...' : c.instructor) : '-';
    var upd = formatUpdateDate(c.lastUpdated);
    var score = '';
    if (c._score > 0) {
      var cls = c._score >= 80 ? 'score-high' : c._score >= 40 ? 'score-mid' : 'score-low';
      score = '<span class="score-badge ' + cls + '">' + c._score + '</span>';
    }
    tableHtml += '<tr style="--row-cat-color:' + color + '">' +
      '<td class="col-check"><input type="checkbox" data-id="' + c.id + '" ' + checked + '></td>' +
      '<td class="td-score">' + score + '</td>' +
      '<td><span class="cat-badge" style="border-color:' + color + '">' + getCatEmoji(cat) + '</span></td>' +
      '<td class="td-title"><a class="course-link" data-id="' + c.id + '">' + c.title + '</a></td>' +
      '<td>' + rating + '</td>' +
      '<td>' + enroll + '</td>' +
      '<td>' + c.language + '</td>' +
      '<td>' + (koSub ? '🇰🇷' : '-') + '</td>' +
      '<td>' + diff + '</td>' +
      '<td>' + (dur || '-') + '</td>' +
      '<td>' + inst + '</td>' +
      '<td>' + upd + '</td>' +
      '</tr>';
  }
  document.getElementById('table-body').innerHTML = tableHtml;

  // ═══ 카드 뷰 ═══
  var cardHtml = '';
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    var url = buildCourseUrl(c);
    var cat = c.category ? c.category.split(',')[0].trim() : '-';
    var color = getCatColor(cat);
    var enroll = formatEnrollments(c.enrollments);
    cardHtml += '<div class="course-card" style="animation-delay:' + (i * 0.05) + 's">' +
      '<div class="card-cat-stripe" style="background:' + color + '"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span class="cat-badge" style="border-color:' + color + '">' + getCatEmoji(cat) + ' ' + cat + '</span>' +
      (c._score > 0 ? '<span class="score-badge score-high">' + c._score + '점</span>' : '') +
      '</div>' +
      '<h4><a class="course-link" data-id="' + c.id + '">' + c.title + '</a></h4>' +
      '<div class="card-meta">' + (c.instructor ? c.instructor.split(',')[0].trim() : '') + ' · ' + c.difficulty + ' · ' + c.language + '</div>' +
      '<div class="card-tags">' +
      (c.isNew ? '<span class="badge-new">✨신규</span>' : '') +
      (c.rating > 0 ? '<span class="cat-badge">⭐ ' + c.rating.toFixed(1) + '</span>' : '') +
      (c.enrollments > 0 ? '<span class="cat-badge">👥 ' + enroll + '</span>' : '') +
      (hasKoreanSub(c) ? '<span class="cat-badge" style="border-color:var(--success);color:var(--success)">🇰🇷</span>' : '') +
      '<span class="cat-badge">📅 ' + formatUpdateDate(c.lastUpdated) + '</span>' +
      '</div>' +
      '<a href="' + url + '" target="_blank" class="card-cta">🚀 워프 점프 →</a>' +
      '</div>';
  }
  document.getElementById('view-card').innerHTML = cardHtml;

  // ═══ 컴팩트 뷰 ═══
  var compactHtml = '';
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    compactHtml += '<div class="compact-item">' +
      '<input type="checkbox" data-id="' + c.id + '" ' + (S.selectedIds.has(c.id) ? 'checked' : '') + '>' +
      (c._score > 0 ? '<span class="score-badge score-low">' + c._score + '</span>' : '') +
      '<span class="compact-title"><a class="course-link" data-id="' + c.id + '">' + c.title + '</a></span>' +
      '<span style="font-size:0.75rem;color:var(--text-muted)">' + c.language + '</span>' +
      (hasKoreanSub(c) ? '<span>🇰🇷</span>' : '') +
      '</div>';
  }
  document.getElementById('view-compact').innerHTML = compactHtml;

  // ═══ 이벤트 바인딩 ═══
  var courseLinks = document.querySelectorAll('.course-link[data-id]');
  for (var i = 0; i < courseLinks.length; i++) {
    (function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var course = S.courses.find(function(c) { return c.id === link.dataset.id; });
        if (course) openSidePanel(course);
      });
    })(courseLinks[i]);
  }

  var checkboxes = document.querySelectorAll('#table-body input[type="checkbox"], #view-compact input[type="checkbox"]');
  for (var i = 0; i < checkboxes.length; i++) {
    (function(cb) {
      cb.addEventListener('change', function() {
        if (cb.checked) S.selectedIds.add(cb.dataset.id);
        else S.selectedIds.delete(cb.dataset.id);
        updateFAB();
      });
    })(checkboxes[i]);
  }

  var sortHeaders = document.querySelectorAll('th.sortable');
  for (var i = 0; i < sortHeaders.length; i++) {
    sortHeaders[i].style.cursor = 'pointer';
    (function(th) {
      th.onclick = function() { sortByColumn(th.dataset.sort); };
    })(sortHeaders[i]);
  }

  // ★ 스마트 결과 제한 배너
  var truncBanner = document.getElementById('truncation-banner');
  if (!truncBanner) {
    truncBanner = document.createElement('div');
    truncBanner.id = 'truncation-banner';
    truncBanner.style.cssText = 'text-align:center;padding:1rem;background:rgba(124,108,240,0.08);border:1px solid var(--border-accent);border-radius:var(--radius-sm);margin:1rem 0;display:none;';
    var pagination = document.getElementById('pagination');
    if (pagination) pagination.parentNode.insertBefore(truncBanner, pagination);
  }
  var hasSearch = document.getElementById('search-input').value.trim().length > 0;
  if (S._isTruncated && hasSearch) {
    truncBanner.style.display = 'block';
    truncBanner.innerHTML = '<p style="color:var(--accent-light);font-size:0.9rem;margin-bottom:0.5rem;">🎯 추천도 상위 100개를 보여드립니다.</p>' +
      '<p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.8rem;">전체 ' + S._fullCount.toLocaleString() + '개 중 가장 적합한 강의만 선별했어요.</p>' +
      '<button id="btn-show-all" style="padding:0.5rem 1.2rem;background:var(--accent-gradient);color:white;border:none;border-radius:var(--radius-xs);cursor:pointer;font-size:0.85rem;font-weight:600;">🔍 전체 ' + S._fullCount.toLocaleString() + '개 보기</button>';
    var showAllBtn = document.getElementById('btn-show-all');
    if (showAllBtn) {
      showAllBtn.onclick = function() {
        S.showAllResults = true;
        S.filtered = S._fullFiltered;
        S._isTruncated = false;
        S.page = 1;
        renderList();
        document.getElementById('results-count').innerHTML = '발견된 별: <strong>' + S.filtered.length.toLocaleString() + '</strong>개';
        toast('🔍 전체 ' + S.filtered.length.toLocaleString() + '개 결과를 표시합니다.');
      };
    }
  } else {
    truncBanner.style.display = 'none';
  }

  renderPagination();
  updateFAB();
}

function renderPagination() {
  var container = document.getElementById('pagination');
  var tp = Math.ceil(S.filtered.length / S.rows);
  if (tp <= 1) { container.innerHTML = ''; return; }
  var html = '<button ' + (S.page <= 1 ? 'disabled' : '') + ' data-p="' + (S.page - 1) + '">◀</button>';
  var max = 7;
  var start = Math.max(1, S.page - Math.floor(max / 2));
  var end = Math.min(tp, start + max - 1);
  if (end - start < max - 1) start = Math.max(1, end - max + 1);
  if (start > 1) { html += '<button data-p="1">1</button>'; if (start > 2) html += '<button disabled>…</button>'; }
  for (var i = start; i <= end; i++) html += '<button class="' + (i === S.page ? 'active' : '') + '" data-p="' + i + '">' + i + '</button>';
  if (end < tp) { if (end < tp - 1) html += '<button disabled>…</button>'; html += '<button data-p="' + tp + '">' + tp + '</button>'; }
  html += '<button ' + (S.page >= tp ? 'disabled' : '') + ' data-p="' + (S.page + 1) + '">▶</button>';
  container.innerHTML = html;
  var btns = container.querySelectorAll('button:not([disabled])');
  for (var i = 0; i < btns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        S.page = parseInt(btn.dataset.p);
        renderList();
        var ls = document.getElementById('list-section');
        if (ls) ls.scrollIntoView({ behavior: 'smooth' });
      });
    })(btns[i]);
  }
}

function updateFAB() {
  var fab = document.getElementById('fab');
  if (S.selectedIds.size > 0) {
    fab.classList.add('visible');
    document.getElementById('fab-count').textContent = '🛸 ' + S.selectedIds.size + '개 선택';
  } else {
    fab.classList.remove('visible');
  }
}

// ═══ 가로형 통계 카드 — 발견된 별에도 다운로드 ═══
function renderDashCards() {
  var total = S.courses.length;
  var newCount = S.courses.filter(function(c) { return c.isNew; }).length;
  var filteredCount = S.filtered.length;
  var cards = [
    { icon: '🌟', value: total, label: '전체 별', action: function() { resetAll(); }, download: 'all' },
    { icon: '✨', value: newCount, label: '신규 별 (1개월)', action: function() { setMSValues('f-updated', ['1m']); applyFilters(); }, download: 'new' },
    { icon: '🔍', value: filteredCount, label: '발견된 별', action: null, download: 'filtered' },
  ];
  var container = document.getElementById('dash-cards');
  var html = '';
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    html += '<div class="stats-card' + (c.action ? ' clickable' : '') + '" data-idx="' + i + '">' +
      '<div class="stats-icon">' + c.icon + '</div>' +
      '<div class="stats-info">' +
      '<div class="stats-value" data-target="' + c.value + '">0</div>' +
      '<div class="stats-label">' + c.label + '</div>' +
      '</div>' +
      (c.download ? '<button class="stats-download-btn" data-type="' + c.download + '" title="' + c.label + ' CSV 다운로드">📥 다운받기</button>' : '') +
      '</div>';
  }
  container.innerHTML = html;

  var statCards = container.querySelectorAll('.stats-card');
  for (var i = 0; i < statCards.length; i++) {
    var target = parseInt(statCards[i].querySelector('.stats-value').dataset.target);
    animateCount(statCards[i].querySelector('.stats-value'), target, 1200);
    if (cards[i].action) {
      (function(action) {
        statCards[i].addEventListener('click', function(e) {
          if (!e.target.classList.contains('stats-download-btn')) action();
        });
      })(cards[i].action);
      statCards[i].style.cursor = 'pointer';
    }
  }

  var dlBtns = container.querySelectorAll('.stats-download-btn');
  for (var i = 0; i < dlBtns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        csvDownloadType = btn.dataset.type;
        var modal = document.getElementById('csv-modal-overlay');
        if (modal) modal.classList.add('active');
      });
    })(dlBtns[i]);
  }

  var csvClose = document.getElementById('csv-modal-close');
  if (csvClose) csvClose.addEventListener('click', function() { document.getElementById('csv-modal-overlay').classList.remove('active'); });
  var csvConfirm = document.getElementById('csv-download-confirm');
  if (csvConfirm) csvConfirm.addEventListener('click', downloadWithSelectedColumns);
  var csvAll = document.getElementById('csv-select-all');
  if (csvAll) csvAll.addEventListener('click', function() {
    var cbs = document.querySelectorAll('#csv-modal-overlay input[type="checkbox"]');
    for (var i = 0; i < cbs.length; i++) cbs[i].checked = true;
  });
  var csvBasic = document.getElementById('csv-select-basic');
  if (csvBasic) csvBasic.addEventListener('click', function() {
    var cbs = document.querySelectorAll('#csv-modal-overlay input[type="checkbox"]');
    for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
    var basics = ['csv-col-id', 'csv-col-title', 'csv-col-category', 'csv-col-rating', 'csv-col-url'];
    for (var i = 0; i < basics.length; i++) {
      var cb = document.getElementById(basics[i]);
      if (cb) cb.checked = true;
    }
  });
}

// ★ CSV 다운로드 — filtered 타입 추가
function downloadWithSelectedColumns() {
  var data;
  if (csvDownloadType === 'all') data = S.courses;
  else if (csvDownloadType === 'new') data = S.courses.filter(function(c) { return c.isNew; });
  else if (csvDownloadType === 'filtered') data = S._fullFiltered || S.filtered; // ★ 전체 필터링 결과
  else data = S.filtered;

  if (data.length === 0) { toast('데이터 없음', 'warning'); return; }

  var colMap = {
    'csv-col-id': { key: 'id', h: '강의ID' },
    'csv-col-title': { key: 'title', h: '강의명' },
    'csv-col-category': { key: 'category', h: '카테고리' },
    'csv-col-instructor': { key: 'instructor', h: '강사' },
    'csv-col-rating': { key: 'rating', h: '평점' },
    'csv-col-enrollments': { key: 'enrollments', h: '수강신청수' },
    'csv-col-language': { key: 'language', h: '언어' },
    'csv-col-subtitles': { key: 'subtitles', h: '자막' },
    'csv-col-difficulty': { key: 'difficulty', h: '난이도' },
    'csv-col-duration': { key: 'contentLength', h: '강의시간(분)' },
    'csv-col-updated': { key: 'lastUpdated', h: '업데이트' },
    'csv-col-url': { key: 'url', h: '강의링크' }
  };

  var cols = [];
  var entries = Object.entries(colMap);
  for (var i = 0; i < entries.length; i++) {
    var cb = document.getElementById(entries[i][0]);
    if (cb && cb.checked) cols.push(entries[i][1]);
  }
  if (cols.length === 0) { toast('최소 1개 선택', 'warning'); return; }

  var headers = [];
  for (var i = 0; i < cols.length; i++) headers.push(cols[i].h);

  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var c = data[i];
    var row = [];
    for (var j = 0; j < cols.length; j++) {
      var col = cols[j];
      var v = c[col.key] || '';
      if (col.key === 'url') v = buildCourseUrl(c);
      else if (col.key === 'enrollments') v = formatEnrollments(c.enrollments);
      else if (col.key === 'subtitles') v = hasKoreanSub(c) ? 'Y' : 'N';
      else if (['title', 'category', 'instructor'].indexOf(col.key) !== -1) v = '"' + String(v).replace(/"/g, '""') + '"';
      row.push(v);
    }
    rows.push(row.join(','));
  }

  var label = csvDownloadType === 'all' ? '전체' : csvDownloadType === 'new' ? '신규' : '필터링';
  
  // ★ 파일명에 검색어 + 필터 정보 추가
  var filenameParts = [label];
  var searchQuery = document.getElementById('search-input').value.trim();
  if (searchQuery) {
    // 파일명에 사용 불가한 문자 제거 + 30자 제한
    var safeQuery = searchQuery.replace(/[\\/:*?"<>|,]/g, '_').substring(0, 30);
    filenameParts.push(safeQuery);
  }
  var activeCats = getMSValues('f-category');
  if (activeCats.length > 0 && activeCats.length <= 3) {
    filenameParts.push(activeCats.join('_').substring(0, 30));
  }
  var activeLangs = getMSValues('f-language');
  if (activeLangs.length > 0 && activeLangs.length <= 2) {
    filenameParts.push(activeLangs.join('_'));
  }
  var activeUpdated = getMSValues('f-updated');
  if (activeUpdated.length > 0) {
    filenameParts.push(activeUpdated[0]);
  }
  
  var filename = filenameParts.join('_') + '_' + S.subdomain + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  // 파일명 총 길이 제한 (100자)
  if (filename.length > 100) filename = filename.substring(0, 96) + '.csv';
  
  var csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  
  a.click();
  URL.revokeObjectURL(a.href);
  document.getElementById('csv-modal-overlay').classList.remove('active');
  toast('📥 ' + label + ' ' + data.length + '개 다운로드 완료');
}
