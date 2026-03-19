(function() {

  var API_BASE = '/api';
  var ADMIN_SECRET = 'gogo1014';
  var ADMIN_CODE = 'jhj11';
  var WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';

  var editors = {};
  var currentMonth = null;
  var insightPageCount = 1;
  var promoPageCount = 1;

  // Course data cache
  var courseCache = {};
  // Section course data
  var sectionCourses = {
    insight: { ids: [], data: {}, comments: {}, badges: {}, layout: 'card' },
    new: { ids: [], data: {}, comments: {}, badges: {}, layout: 'highlight' },
    curation: { ids: [], data: {}, comments: {}, badges: {}, layout: 'list' }
  };

  var BADGE_OPTIONS = [
    { id: 'popular', ko: '🔥 가장 인기', cls: 'badge-popular' },
    { id: 'shortest', ko: '⚡ 가장 짧은', cls: 'badge-shortest' },
    { id: 'top-rated', ko: '🏆 평점 최고', cls: 'badge-top-rated' },
    { id: 'new', ko: '🆕 신규', cls: 'badge-new' },
    { id: 'essential', ko: '💼 실무 필수', cls: 'badge-essential' }
  ];

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function toast(msg, type) {
    var el = $('#admin-toast');
    el.textContent = msg;
    el.className = 'admin-toast show' + (type ? ' ' + type : '');
    setTimeout(function() { el.className = 'admin-toast'; }, 3000);
  }

  function showLoading() { $('#loading').classList.add('show'); }
  function hideLoading() { $('#loading').classList.remove('show'); }

  function apiCall(endpoint, method, body) {
    var opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST') {
      opts.headers['Authorization'] = 'Bearer ' + ADMIN_SECRET;
      opts.body = JSON.stringify(body);
    }
    return fetch(API_BASE + endpoint, opts).then(function(r) { return r.json(); });
  }

  // === Gate ===
  $('#gate-submit').addEventListener('click', function() {
    if ($('#gate-code').value.trim() === ADMIN_CODE) {
      $('#admin-gate').style.display = 'none';
      $('#admin-app').style.display = 'block';
      initAdmin();
    } else { toast('코드가 틀렸습니다', 'error'); }
  });
  $('#gate-code').addEventListener('keyup', function(e) { if (e.key === 'Enter') $('#gate-submit').click(); });

  // === Nav ===
  var navBtns = $$('.admin-nav-btn[data-panel]');
  for (var i = 0; i < navBtns.length; i++) {
    navBtns[i].addEventListener('click', function() {
      var panel = this.getAttribute('data-panel');
      for (var j = 0; j < navBtns.length; j++) navBtns[j].classList.remove('active');
      this.classList.add('active');
      var panels = $$('.admin-panel');
      for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
      $('#panel-' + panel).classList.add('active');
      if (panel === 'list') loadLetterList();
    });
  }
  $('#btn-logout').addEventListener('click', function() {
    $('#admin-app').style.display = 'none';
    $('#admin-gate').style.display = '';
    $('#gate-code').value = '';
  });

  // === Section Toggle ===
  var sectionHeaders = $$('.section-card-header');
  for (var i = 0; i < sectionHeaders.length; i++) {
    sectionHeaders[i].addEventListener('click', function() {
      this.parentElement.classList.toggle('collapsed');
    });
  }

  // === Init ===
  function initAdmin() {
    initEditors();
    initLayoutSelectors();
    initFetchButtons();
    loadLetterList();
  }

  // === Quill ===
  function createQuill(selector, placeholder) {
    return new Quill(selector, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      },
      placeholder: placeholder || ''
    });
  }

  function initEditors() {
    editors['insight-0'] = createQuill('#insight-editor-0', '트렌드 인사이트 내용...');
    editors['new'] = createQuill('#new-editor', '신규 콘텐츠 내용...');
    editors['promo-0'] = createQuill('#promo-editor-0', '홍보 내용...');
    editors['closing'] = createQuill('#closing-editor', '마무리 메시지...');
  }

  // === Multi-page ===
  function setupPageTabs(section) {
    var tabsEl = $('#' + section + '-tabs');
    var editorsEl = $('#' + section + '-editors');
    var addBtn = $('#' + section + '-add-page');

    addBtn.addEventListener('click', function() {
      var idx = section === 'insight' ? insightPageCount : promoPageCount;
      var tab = document.createElement('button');
      tab.className = 'page-tab';
      tab.setAttribute('data-page', idx);
      tab.innerHTML = '페이지 ' + (idx + 1) + '<span class="page-tab-delete" data-page="' + idx + '"> ✕</span>';
      tabsEl.insertBefore(tab, addBtn);

      var wrap = document.createElement('div');
      wrap.className = 'editor-wrap';
      wrap.setAttribute('data-page', idx);
      wrap.style.display = 'none';
      wrap.innerHTML = '<div id="' + section + '-editor-' + idx + '"></div>';
      editorsEl.appendChild(wrap);

      editors[section + '-' + idx] = createQuill('#' + section + '-editor-' + idx, '내용을 입력하세요...');
      if (section === 'insight') insightPageCount++; else promoPageCount++;
      switchPage(section, idx);
    });

    tabsEl.addEventListener('click', function(e) {
      if (e.target.classList.contains('page-tab-delete')) {
        e.stopPropagation();
        var pg = e.target.getAttribute('data-page');
        var tab = tabsEl.querySelector('.page-tab[data-page="' + pg + '"]');
        var wrap = editorsEl.querySelector('.editor-wrap[data-page="' + pg + '"]');
        if (tab) tab.remove();
        if (wrap) wrap.remove();
        delete editors[section + '-' + pg];
        var firstTab = tabsEl.querySelector('.page-tab');
        if (firstTab) switchPage(section, firstTab.getAttribute('data-page'));
        return;
      }
      if (e.target.classList.contains('page-tab')) {
        switchPage(section, e.target.getAttribute('data-page'));
      }
    });
  }

  function switchPage(section, pageIdx) {
    var tabs = $$('#' + section + '-tabs .page-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-page') === String(pageIdx));
    var wraps = $$('#' + section + '-editors .editor-wrap');
    for (var i = 0; i < wraps.length; i++) wraps[i].style.display = wraps[i].getAttribute('data-page') === String(pageIdx) ? '' : 'none';
  }

  setupPageTabs('insight');
  setupPageTabs('promo');

  // === Layout Selectors ===
  function initLayoutSelectors() {
    var sections = ['insight', 'new', 'curation'];
    for (var s = 0; s < sections.length; s++) {
      (function(sec) {
        var selector = $('#' + sec + '-layout-selector');
        if (!selector) return;
        var opts = selector.querySelectorAll('.layout-option');
        for (var i = 0; i < opts.length; i++) {
          opts[i].addEventListener('click', function() {
            for (var j = 0; j < opts.length; j++) opts[j].classList.remove('active');
            this.classList.add('active');
            sectionCourses[sec].layout = this.getAttribute('data-layout');
            var preview = $('#' + sec + '-course-preview');
            preview.className = 'preview-grid layout-' + sectionCourses[sec].layout;
            renderCoursePreview(sec);
          });
        }
      })(sections[s]);
    }
  }

  // === Fetch Courses ===
  function initFetchButtons() {
    $('#btn-fetch-insight-courses').addEventListener('click', function() { fetchCourses('insight'); });
    $('#btn-fetch-new-courses').addEventListener('click', function() { fetchCourses('new'); });
    $('#btn-fetch-curation-courses').addEventListener('click', function() { fetchCourses('curation'); });
  }

  function fetchCourses(section) {
    var inputId = section === 'curation' ? 'f-curation-ids' : 'f-' + section + '-course-ids';
    var raw = $('#' + inputId).value.trim();
    if (!raw) { toast('강의 ID를 입력해주세요', 'error'); return; }

    var ids = raw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    if (ids.length === 0) { toast('유효한 ID가 없습니다', 'error'); return; }

    var statusEl = $('#' + section + '-fetch-status');
    statusEl.textContent = '⏳ ' + ids.length + '개 강불러오는 중...';
    statusEl.className = 'fetch-status';

    sectionCourses[section].ids = ids;

    // Fetch from Explorer Worker
    var uncached = [];
    for (var i = 0; i < ids.length; i++) {
      if (!courseCache[ids[i]]) uncached.push(ids[i]);
    }

    if (uncached.length === 0) {
      statusEl.textContent = '✅ ' + ids.length + '개 강의 로드 완료 (캐시)';
      statusEl.className = 'fetch-status success';
      renderCoursePreview(section);
      return;
    }

    // Load all chunks and find courses
    loadCoursesFromWorker().then(function(allCourses) {
      var found = 0;
      for (var i = 0; i < ids.length; i++) {
        if (courseCache[ids[i]]) { found++; continue; }
        for (var j = 0; j < allCourses.length; j++) {
          if (String(allCourses[j].id) === String(ids[i])) {
            courseCache[ids[i]] = allCourses[j];
            found++;
            break;
          }
        }
      }

      var notFound = ids.length - found;
      if (notFound > 0) {
        statusEl.textContent = '✅ ' + found + '개 로드 / ❌ ' + notFound + '개 미발견';
        statusEl.className = 'fetch-status';
      } else {
        statusEl.textContent = '✅ ' + found + '개 강의 로드 완료!';
        statusEl.className = 'fetch-status success';
      }
      renderCoursePreview(section);
    }).catch(function(e) {
      statusEl.textContent = '❌ 로드 실패: ' + e.message;
      statusEl.className = 'fetch-status error';
    });
  }

  var allCoursesCache = null;
  function loadCoursesFromWorker() {
    if (allCoursesCache) return Promise.resolve(allCoursesCache);

    return fetch(WORKER_URL + '/status', {
      headers: { 'Authorization': 'Bearer ' + ADMIN_SECRET }
    }).then(function(r) { return r.json(); }).then(function(status) {
      var totalChunks = status.totalChunks || 0;
      if (totalChunks === 0) throw new Error('No chunks');

      var promises = [];
      for (var i = 0; i < totalChunks; i++) {
        promises.push(
          fetch(WORKER_URL + '/get-courses?chunk=' + i, {
            headers: { 'Authorization': 'Bearer ' + ADMIN_SECRET }
          }).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; })
        );
      }
      return Promise.all(promises);
    }).then(function(results) {
      var all = [];
      for (var i = 0; i < results.length; i++) {
        if (Array.isArray(results[i])) all = all.concat(results[i]);
      }
      allCoursesCache = all;
      return all;
    });
  }

  // === Render Course Preview ===
  function renderCoursePreview(section) {
    var container = $('#' + section + '-course-preview');
    var ids = sectionCourses[section].ids;
    var layout = sectionCourses[section].layout;

    if (ids.length === 0) { container.innerHTML = ''; return; }

    var html = '';
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var c = courseCache[id];
      var comment = sectionCourses[section].comments[id] || '';
      var badge = sectionCourses[section].badges[id] || '';

      if (!c) {
        html += '<div class="preview-list-item"><div style="color:var(--danger);font-size:0.8rem;">❌ ID ' + id + ' - 강의를 찾을 수 없습니다</div></div>';
        continue;
      }

      var title = c.title || '';
      var rating = c.rating ? '⭐ ' + Number(c.rating).toFixed(1) : '';
      var duration = c.contentLength ? '⏱️ ' + formatDuration(c.contentLength) : '';
      var instructor = c.instructor ? '👤 ' + c.instructor : '';
      var difficulty = c.difficulty ? '📊 ' + mapDifficulty(c.difficulty) : '';
      var category = c.category ? '📂 ' + c.category.split(',')[0].trim() : '';

      if (layout === 'card') {
        html += renderCardPreview(id, title, rating, duration, instructor, difficulty, comment, badge, section, i);
      } else if (layout === 'highlight') {
        html += renderHighlightPreview(id, title, rating, duration, instructor, category, comment, badge, section, i);
      } else {
        html += renderListPreview(id, title, rating, duration, instructor, difficulty, category, comment, badge, section, i);
      }
    }

    container.innerHTML = html;
    bindPreviewEvents(section);
  }

  function renderCardPreview(id, title, rating, duration, instructor, difficulty, comment, badge, section, idx) {
    return '<div class="preview-mini-card" data-id="' + id + '">' +
      '<div class="preview-mini-card-header">' +
        '<div class="preview-mini-card-title">' + escHtml(title.substring(0, 50)) + '</div>' +
        '<span class="preview-mini-card-remove" data-section="' + section + '" data-id="' + id + '">✕</span>' +
      '</div>' +
      '<div class="preview-mini-card-meta">' +
        (rating ? '<span>' + rating + '</span>' : '') +
        (duration ? '<span>' + duration + '</span>' : '') +
        (instructor ? '<span>' + instructor + '</span>' : '') +
        (difficulty ? '<span>' + difficulty + '</span>' : '') +
      '</div>' +
      renderBadgeSelector(id, badge, section) +
      '<textarea class="course-comment-input" data-section="' + section + '" data-id="' + id + '" placeholder="추천 사유를 입력하세요...">' + escHtml(comment) + '</textarea>' +
    '</div>';
  }

  function renderHighlightPreview(id, title, rating, duration, instructor, category, comment, badge, section, idx) {
    return '<div class="preview-highlight-card" data-id="' + id + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div class="preview-highlight-badge">🆕 NEW</div>' +
        '<span class="preview-mini-card-remove" data-section="' + section + '" data-id="' + id + '">✕</span>' +
      '</div>' +
      '<div class="preview-highlight-title">' + escHtml(title.substring(0, 60)) + '</div>' +
      '<div class="preview-highlight-meta">' +
        (rating ? '<span>' + rating + '</span>' : '') +
        (duration ? '<span>' + duration + '</span>' : '') +
        (instructor ? '<span>' + instructor + '</span>' : '') +
        (category ? '<span>' + category + '</span>' : '') +
      '</div>' +
      renderBadgeSelector(id, badge, section) +
      '<textarea class="course-comment-input" data-section="' + section + '" data-id="' + id + '" placeholder="추천 사유를 입력하세요...">' + escHtml(comment) + '</textarea>' +
    '</div>';
  }

  function renderListPreview(id, title, rating, duration, instructor, difficulty, category, comment, badge, section, idx) {
    return '<div class="preview-list-item" data-id="' + id + '">' +
      '<div class="preview-list-rank">' + String(idx + 1).padStart(2, '0') + '</div>' +
      '<div class="preview-list-info">' +
        '<div style="display:flex;justify-content:space-between;">' +
          '<div class="preview-list-title">' + escHtml(title.substring(0, 70)) + '</div>' +
          '<span class="preview-mini-card-remove" data-section="' + section + '" data-id="' + id + '">✕</span>' +
        '</div>' +
        '<div class="preview-list-meta">' +
          (rating ? '<span>' + rating + '</span>' : '') +
          (duration ? '<span>' + duration + '</span>' : '') +
          (instructor ? '<span>' + instructor + '</span>' : '') +
          (difficulty ? '<span>' + difficulty + '</span>' : '') +
          (category ? '<span>' + category + '</span>' : '') +
        '</div>' +
        renderBadgeSelector(id, badge, section) +
        '<textarea class="course-comment-input" data-section="' + section + '" data-id="' + id + '" placeholder="추천 사유를 입력하세요...">' + escHtml(comment) + '</textarea>' +
      '</div>' +
    '</div>';
  }

  function renderBadgeSelector(id, currentBadge, section) {
    var html = '<div class="badge-selector-inline">';
    for (var i = 0; i < BADGE_OPTIONS.length; i++) {
      var b = BADGE_OPTIONS[i];
      var sel = currentBadge === b.id ? ' selected' : '';
      html += '<button class="badge-opt' + sel + '" data-section="' + section + '" data-id="' + id + '" data-badge="' + b.id + '">' + b.ko + '</button>';
    }
    html += '</div>';
    return html;
  }

  function bindPreviewEvents(section) {
    // Remove buttons
    var removeBtns = $$('#' + section + '-course-preview .preview-mini-card-remove');
    for (var i = 0; i < removeBtns.length; i++) {
      removeBtns[i].addEventListener('click', function() {
        var sec = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        sectionCourses[sec].ids = sectionCourses[sec].ids.filter(function(x) { return x !== id; });
        delete sectionCourses[sec].comments[id];
        delete sectionCourses[sec].badges[id];
        // Update input
        var inputId = sec === 'curation' ? 'f-curation-ids' : 'f-' + sec + '-course-ids';
        $('#' + inputId).value = sectionCourses[sec].ids.join(', ');
        renderCoursePreview(sec);
      });
    }

    // Badge buttons
    var badgeBtns = $$('#' + section + '-course-preview .badge-opt');
    for (var i = 0; i < badgeBtns.length; i++) {
      badgeBtns[i].addEventListener('click', function() {
        var sec = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        var badge = this.getAttribute('data-badge');
        if (sectionCourses[sec].badges[id] === badge) {
          delete sectionCourses[sec].badges[id];
        } else {
          sectionCourses[sec].badges[id] = badge;
        }
        renderCoursePreview(sec);
      });
    }

    // Comment inputs
    var commentInputs = $$('#' + section + '-course-preview .course-comment-input');
    for (var i = 0; i < commentInputs.length; i++) {
      commentInputs[i].addEventListener('input', function() {
        var sec = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        sectionCourses[sec].comments[id] = this.value;
      });
    }
  }

  // === Helpers ===
  function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    if (h > 0 && m > 0) return h + 'h ' + m + 'm';
    if (h > 0) return h + 'h';
    return m + 'm';
  }

  function mapDifficulty(d) {
    var map = {
      'Beginner': '초급', 'BEGINNER': '초급',
      'Intermediate': '중급', 'INTERMEDIATE': '중급',
      'Expert': '고급', 'EXPERT': '고급',
      'All Levels': '모든 수준', 'ALL_LEVELS': '모든 수준'
    };
    return map[d] || d;
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // === Letter List ===
  function loadLetterList() {
    apiCall('/letter-list').then(function(res) {
      var grid = $('#letter-grid');
      if (!res.success || res.total === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>아직 레터가 없습니다.<br>새 레터를 만들어보세요!</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < res.data.length; i++) {
        var item = res.data[i];
        var sc = 'status-' + item.status;
        var st = item.status === 'draft' ? '📝 초안' : item.status === 'published' ? '✅ 발행' : '📧 발송';
        html += '<div class="letter-card" data-month="' + item.month + '">' +
          '<div class="letter-card-month">' + item.month + '</div>' +
          '<div class="letter-card-title">' + (item.title_ko || '제목 없음') + '</div>' +
          '<div class="letter-card-meta"><span class="status-badge ' + sc + '">' + st + '</span>' +
          '<span>' + (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '') + '</span></div></div>';
      }
      grid.innerHTML = html;
      var cards = $$('.letter-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', function() { loadLetter(this.getAttribute('data-month')); });
      }
    });
  }

  // === New Letter ===
  $('#btn-new-letter').addEventListener('click', function() {
    currentMonth = null;
    clearEditor();
    $('#editor-title').textContent = '✏️ 새 레터 만들기';
    $('#btn-delete').style.display = 'none';
    switchPanel('editor');
  });

  // === Load Letter ===
  function loadLetter(month) {
    showLoading();
    apiCall('/letter-get?month=' + month).then(function(res) {
      hideLoading();
      if (!res.success) { toast('불러오기 실패', 'error'); return; }
      var d = res.data;
      currentMonth = d.month;
      $('#f-month').value = d.month;
      $('#f-month').disabled = true;
      $('#f-status').value = d.status || 'draft';
      $('#f-title-ko').value = d.title ? d.title.ko : '';
      $('#f-subtitle-ko').value = d.subtitle ? d.subtitle.ko : '';
      $('#f-cover-image').value = d.coverImage || '';
      $('#f-insight-image').value = d.insight ? d.insight.image : '';
      $('#f-new-image').value = d.newContent ? d.newContent.image : '';
      $('#f-new-summary-ko').value = d.newContent && d.newContent.summary ? d.newContent.summary.ko : '';
      $('#f-curation-image').value = d.curation ? d.curation.image : '';
      $('#f-curation-intro-ko').value = d.curation && d.curation.intro ? d.curation.intro.ko : '';
      $('#f-closing-image').value = d.closing ? d.closing.image : '';

      if (d.curation && d.curation.tags) {
        var tt = [];
        for (var i = 0; i < d.curation.tags.length; i++) tt.push(d.curation.tags[i].ko || d.curation.tags[i]);
        $('#f-curation-tags').value = tt.join(', ');
      }

      // Load course IDs
      if (d.insight && d.insight.courseIds) {
        $('#f-insight-course-ids').value = d.insight.courseIds.join(', ');
        sectionCourses.insight.ids = d.insight.courseIds;
        sectionCourses.insight.comments = d.insight.courseComments || {};
        sectionCourses.insight.badges = d.insight.courseBadges || {};
      }
      if (d.newContent && d.newContent.courseIds) {
        $('#f-new-course-ids').value = d.newContent.courseIds.join(', ');
        sectionCourses.new.ids = d.newContent.courseIds;
        sectionCourses.new.comments = d.newContent.courseComments || {};
        sectionCourses.new.badges = d.newContent.courseBadges || {};
      }
      if (d.curation && d.curation.courseIds) {
        $('#f-curation-ids').value = d.curation.courseIds.join(', ');
        sectionCourses.curation.ids = d.curation.courseIds;
        sectionCourses.curation.comments = d.curation.courseComments || {};
        sectionCourses.curation.badges = d.curation.courseBadges || {};
      }

      // Load editors
      if (d.insight && d.insight.pages && d.insight.pages.length > 0 && editors['insight-0']) {
        editors['insight-0'].root.innerHTML = d.insight.pages[0].html_ko || '';
      }
      if (editors['new'] && d.newContent && d.newContent.editorHtml) {
        editors['new'].root.innerHTML = d.newContent.editorHtml.ko || '';
      }
      if (editors['closing'] && d.closing && d.closing.message) {
        editors['closing'].root.innerHTML = d.closing.message.ko || '';
      }

      $('#editor-title').textContent = '✏️ ' + d.month + '호 편집';
      $('#btn-delete').style.display = '';
      switchPanel('editor');
      toast(d.month + '호를 불러왔습니다');
    });
  }

  // === Save ===
  $('#btn-save').addEventListener('click', function() {
    var month = $('#f-month').value.trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      toast('호수를 YYYY-MM 형식으로 입력해주세요', 'error');
      return;
    }

    var insightPages = [];
    var insightWraps = $$('#insight-editors .editor-wrap');
    for (var i = 0; i < insightWraps.length; i++) {
      var pg = insightWraps[i].getAttribute('data-page');
      var ed = editors['insight-' + pg];
      if (ed) insightPages.push({ html_ko: ed.root.innerHTML, html_en: '' });
    }

    var promoPages = [];
    var promoWraps = $$('#promo-editors .editor-wrap');
    for (var i = 0; i < promoWraps.length; i++) {
      var pg = promoWraps[i].getAttribute('data-page');
      var ed = editors['promo-' + pg];
      if (ed) promoPages.push({ html_ko: ed.root.innerHTML, html_en: '' });
    }

    var tagsRaw = $('#f-curation-tags').value.trim();
    var tags = [];
    if (tagsRaw) {
      var parts = tagsRaw.split(',');
      for (var i = 0; i < parts.length; i++) { var t = parts[i].trim(); if (t) tags.push({ ko: t, en: '' }); }
    }

    var body = {
      month: month,
      title_ko: $('#f-title-ko').value.trim(),
      subtitle_ko: $('#f-subtitle-ko').value.trim(),
      coverImage: $('#f-cover-image').value.trim(),
      status: $('#f-status').value,

      insight_image: $('#f-insight-image').value.trim(),
      insight_pages: insightPages,
      insight_courseIds: sectionCourses.insight.ids,
      insight_courseComments: sectionCourses.insight.comments,
      insight_courseBadges: sectionCourses.insight.badges,
      insight_layout: sectionCourses.insight.layout,

      newContent_image: $('#f-new-image').value.trim(),
      newContent_editorHtml_ko: editors['new'] ? editors['new'].root.innerHTML : '',
      newContent_summary_ko: $('#f-new-summary-ko').value.trim(),
      newContent_courseIds: sectionCourses.new.ids,
      newContent_courseComments: sectionCourses.new.comments,
      newContent_courseBadges: sectionCourses.new.badges,
      newContent_layout: sectionCourses.new.layout,

      curation_image: $('#f-curation-image').value.trim(),
      curation_intro_ko: $('#f-curation-intro-ko').value.trim(),
      curation_tags: tags,
      curation_courseIds: sectionCourses.curation.ids,
      curation_courseComments: sectionCourses.curation.comments,
      curation_courseBadges: sectionCourses.curation.badges,
      curation_layout: sectionCourses.curation.layout,

      closing_image: $('#f-closing-image').value.trim(),
      closing_ko: editors['closing'] ? editors['closing'].root.innerHTML : '',
      promo_pages: promoPages
    };

    showLoading();
    apiCall('/letter-save', 'POST', body).then(function(res) {
      hideLoading();
      if (res.success) {
        currentMonth = month;
        $('#f-month').disabled = true;
        $('#btn-delete').style.display = '';
        toast(res.message, 'success');
      } else { toast('저장 실패: ' + res.error, 'error'); }
    }).catch(function(e) { hideLoading(); toast('저장 실패: ' + e.message, 'error'); });
  });

  // === Delete ===
  $('#btn-delete').addEventListener('click', function() {
    if (!currentMonth) return;
    if (!confirm(currentMonth + '호를 삭제하시겠습니까?')) return;
    showLoading();
    apiCall('/letter-delete', 'POST', { month: currentMonth }).then(function(res) {
      hideLoading();
      if (res.success) { toast(res.message, 'success'); currentMonth = null; clearEditor(); switchPanel('list'); loadLetterList(); }
      else { toast('삭제 실패', 'error'); }
    });
  });

  // === Preview ===
  $('#btn-preview').addEventListener('click', function() {
    window.open('index.html?preview=true', '_blank');
  });

  // === Back ===
  $('#btn-back-list').addEventListener('click', function() { switchPanel('list'); loadLetterList(); });

  // === Helpers ===
  function switchPanel(name) {
    var panels = $$('.admin-panel');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
    $('#panel-' + name).classList.add('active');
    var nb = $$('.admin-nav-btn[data-panel]');
    for (var i = 0; i < nb.length; i++) nb[i].classList.toggle('active', nb[i].getAttribute('data-panel') === name);
  }

  function clearEditor() {
    $('#f-month').value = ''; $('#f-month').disabled = false;
    $('#f-status').value = 'draft';
    $('#f-title-ko').value = ''; $('#f-subtitle-ko').value = '';
    $('#f-cover-image').value = ''; $('#f-insight-image').value = '';
    $('#f-new-image').value = ''; $('#f-new-summary-ko').value = '';
    $('#f-curation-image').value = ''; $('#f-curation-intro-ko').value = '';
    $('#f-curation-tags').value = ''; $('#f-curation-ids').value = '';
    $('#f-closing-image').value = '';
    if ($('#f-insight-course-ids')) $('#f-insight-course-ids').value = '';
    if ($('#f-new-course-ids')) $('#f-new-course-ids').value = '';

    sectionCourses.insight = { ids: [], data: {}, comments: {}, badges: {}, layout: 'card' };
    sectionCourses.new = { ids: [], data: {}, comments: {}, badges: {}, layout: 'highlight' };
    sectionCourses.curation = { ids: [], data: {}, comments: {}, badges: {}, layout: 'list' };

    $('#insight-course-preview').innerHTML = '';
    $('#new-course-preview').innerHTML = '';
    $('#curation-course-preview').innerHTML = '';
    $('#insight-fetch-status').textContent = '';
    $('#new-fetch-status').textContent = '';
    $('#curation-fetch-status').textContent = '';

    for (var key in editors) {
      if (editors[key] && editors[key].root) editors[key].root.innerHTML = '';
    }
  }

})();
