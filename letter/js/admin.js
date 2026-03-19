(function() {

  var API_BASE = '/api';
  var ADMIN_SECRET = 'gogo1014';
  var WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';

  var ADMINS = {
    'jhj11': '휴',
    'jkl': '제임스',
    'ellie.yang': '엘리',
    'jeongjh': '지니',
    'yjpark': '클레어',
    'min.song': '콜린',
    'wnsghgg123': '가빈'
  };

  var DEFAULT_IMAGES = {
    cover: 'src/img/Brand_Launch.jpg',
    insight: 'src/img/Global_Learning.png',
    newContent: 'src/img/Instructor_Journey.jpg',
    curation: 'src/img/Learning_at_Home.jpg',
    closing: 'src/img/Brand_Launch_2.png'
  };

  var currentUser = '';
  var editors = {};
  var currentMonth = null;
  var insightPageCount = 1;
  var promoPageCount = 1;
  var courseCache = {};
  var allCoursesCache = null;

  var sectionCourses = {
    insight: { ids: [], comments: {}, badges: {}, layout: 'card' },
    new: { ids: [], comments: {}, badges: {}, layout: 'highlight' },
    curation: { ids: [], comments: {}, badges: {}, layout: 'list' }
  };

  var BADGE_OPTIONS = [
    { id: 'popular', ko: '🔥 가장 인기' },
    { id: 'shortest', ko: '⚡ 가장 짧은' },
    { id: 'top-rated', ko: '🏆 평점 최고' },
    { id: 'new', ko: '🆕 신규' },
    { id: 'essential', ko: '💼 실무 필수' }
  ];
  var customBadges = JSON.parse(localStorage.getItem('letter_custom_badges') || '[]');
  for (var i = 0; i < customBadges.length; i++) {
    BADGE_OPTIONS.push(customBadges[i]);
  }

  function $(s) { return document.querySelector(s); }
  function $$(s) { return document.querySelectorAll(s); }

  function escHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, type) {
    var el = $('#admin-toast');
    el.textContent = msg;
    el.className = 'admin-toast show' + (type ? ' ' + type : '');
    setTimeout(function() { el.className = 'admin-toast'; }, 3000);
  }

  function showLoading() { $('#loading').classList.add('show'); }
  function hideLoading() { $('#loading').classList.remove('show'); }

  function apiCall(ep, method, body) {
    var opts = { method: method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST') {
      opts.headers['Authorization'] = 'Bearer ' + ADMIN_SECRET;
      opts.body = JSON.stringify(body);
    }
    return fetch(API_BASE + ep, opts).then(function(r) { return r.json(); });
  }

  function formatDuration(m) {
    if (!m) return '';
    var h = Math.floor(m / 60);
    var mm = m % 60;
    if (h > 0 && mm > 0) return h + 'h ' + mm + 'm';
    if (h > 0) return h + 'h';
    return mm + 'm';
  }

  function mapDifficulty(d) {
    var m = { 'Beginner': '초급', 'BEGINNER': '초급', 'Intermediate': '중급', 'INTERMEDIATE': '중급', 'Expert': '고급', 'EXPERT': '고급', 'All Levels': '모든 수준', 'ALL_LEVELS': '모든 수준' };
    return m[d] || d || '';
  }

  function parseIds(raw) {
    if (!raw) return [];
    return raw.split(/[\s,;\t\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s && /^\d+$/.test(s); });
  }

  function addLog(action, detail) {
    var logs = JSON.parse(localStorage.getItem('letter_logs') || '[]');
    logs.unshift({ time: new Date().toISOString(), user: currentUser, action: action, detail: detail || '' });
    if (logs.length > 200) logs = logs.slice(0, 200);
    localStorage.setItem('letter_logs', JSON.stringify(logs));
  }

  function loadLogs() {
    var logs = JSON.parse(localStorage.getItem('letter_logs') || '[]');
    var el = $('#log-list');
    if (logs.length === 0) {
      el.innerHTML = '<div class="log-empty">아직 로그가 없습니다.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < Math.min(logs.length, 100); i++) {
      var log = logs[i];
      var time = new Date(log.time);
      var timeStr = time.toLocaleDateString('ko-KR') + ' ' + time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      html += '<div class="log-item">';
      html += '<span class="log-time">' + timeStr + '</span>';
      html += '<span class="log-user">' + escHtml(log.user) + '</span>';
      html += '<span class="log-action">' + escHtml(log.action) + (log.detail ? ' — ' + escHtml(log.detail) : '') + '</span>';
      html += '</div>';
    }
    el.innerHTML = html;
  }

  // === Gate ===
  $('#gate-submit').addEventListener('click', function() {
    var code = $('#gate-code').value.trim();
    if (ADMINS[code]) {
      currentUser = ADMINS[code];
      $('#admin-gate').style.display = 'none';
      $('#admin-app').style.display = 'block';
      $('#current-user-display').textContent = '👤 ' + currentUser;
      addLog('로그인', '');
      initAdmin();
    } else {
      toast('코드가 틀렸습니다', 'error');
    }
  });
  $('#gate-code').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') $('#gate-submit').click();
  });

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
      if (panel === 'log') loadLogs();
    });
  }

  $('#admin-brand-home').addEventListener('click', function() {
    for (var j = 0; j < navBtns.length; j++) navBtns[j].classList.remove('active');
    $$('.admin-nav-btn[data-panel="list"]')[0].classList.add('active');
    var panels = $$('.admin-panel');
    for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
    $('#panel-list').classList.add('active');
    loadLetterList();
  });

  $('#btn-preview-nav').addEventListener('click', function() {
    var m = currentMonth || $('#f-month').value.trim() || '';
    var url = 'index.html?sub=woongjindemo';
    if (m) url += '&m=' + m;
    window.open(url, '_blank');
  });

  $('#btn-logout').addEventListener('click', function() {
    addLog('로그아웃', '');
    $('#admin-app').style.display = 'none';
    $('#admin-gate').style.display = '';
    $('#gate-code').value = '';
    currentUser = '';
  });

  var sHeaders = $$('.section-card-header');
  for (var i = 0; i < sHeaders.length; i++) {
    sHeaders[i].addEventListener('click', function() {
      this.parentElement.classList.toggle('collapsed');
    });
  }

  // === Init ===
  function initAdmin() {
    initEditors();
    initLayoutSelectors();
    initFetchButtons();
    initImageTemplates();
    loadLetterList();
  }

  function initImageTemplates() {
    var fields = [
      ['f-cover-image', DEFAULT_IMAGES.cover],
      ['f-insight-image', DEFAULT_IMAGES.insight],
      ['f-new-image', DEFAULT_IMAGES.newContent],
      ['f-curation-image', DEFAULT_IMAGES.curation],
      ['f-closing-image', DEFAULT_IMAGES.closing]
    ];
    for (var i = 0; i < fields.length; i++) {
      var input = $('#' + fields[i][0]);
      if (input && !input.value) input.value = fields[i][1];
    }
  }

  function createQuill(sel, ph) {
    return new Quill(sel, {
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
      placeholder: ph || ''
    });
  }

  function initEditors() {
    editors['insight-0'] = createQuill('#insight-editor-0', '트렌드 인사이트...');
    editors['new'] = createQuill('#new-editor', '신규 콘텐츠...');
    editors['promo-0'] = createQuill('#promo-editor-0', '홍보...');
    editors['closing'] = createQuill('#closing-editor', '마무리...');
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

      editors[section + '-' + idx] = createQuill('#' + section + '-editor-' + idx, '내용...');
      if (section === 'insight') insightPageCount++;
      else promoPageCount++;
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
        var ft = tabsEl.querySelector('.page-tab');
        if (ft) switchPage(section, ft.getAttribute('data-page'));
        return;
      }
      if (e.target.classList.contains('page-tab')) {
        switchPage(section, e.target.getAttribute('data-page'));
      }
    });
  }

  function switchPage(sec, idx) {
    var tabs = $$('#' + sec + '-tabs .page-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-page') === String(idx));
    }
    var wraps = $$('#' + sec + '-editors .editor-wrap');
    for (var i = 0; i < wraps.length; i++) {
      wraps[i].style.display = wraps[i].getAttribute('data-page') === String(idx) ? '' : 'none';
    }
  }

  setupPageTabs('insight');
  setupPageTabs('promo');

  // === Layout Selectors ===
  function initLayoutSelectors() {
    var secs = ['insight', 'new', 'curation'];
    for (var si = 0; si < secs.length; si++) {
      (function(sec) {
        var sel = $('#' + sec + '-layout-selector');
        if (!sel) return;
        var opts = sel.querySelectorAll('.layout-option');
        for (var i = 0; i < opts.length; i++) {
          opts[i].addEventListener('click', function() {
            var siblings = sel.querySelectorAll('.layout-option');
            for (var j = 0; j < siblings.length; j++) siblings[j].classList.remove('active');
            this.classList.add('active');
            sectionCourses[sec].layout = this.getAttribute('data-layout');
            $('#' + sec + '-course-preview').className = 'preview-grid layout-' + sectionCourses[sec].layout;
            renderCoursePreview(sec);
          });
        }
      })(secs[si]);
    }
  }

  // === Fetch Courses ===
  function initFetchButtons() {
    $('#btn-fetch-insight-courses').addEventListener('click', function() { fetchCourses('insight'); });
    $('#btn-fetch-new-courses').addEventListener('click', function() { fetchCourses('new'); });
    $('#btn-fetch-curation-courses').addEventListener('click', function() { fetchCourses('curation'); });
  }

  function fetchCourses(sec) {
    var inputId = sec === 'curation' ? 'f-curation-ids' : 'f-' + sec + '-course-ids';
    var ids = parseIds($('#' + inputId).value);
    if (ids.length === 0) { toast('강의 ID를 입력해주세요', 'error'); return; }
    $('#' + inputId).value = ids.join(', ');
    var statusEl = $('#' + sec + '-fetch-status');
    statusEl.textContent = '⏳ ' + ids.length + '개 불러오는 중...';
    sectionCourses[sec].ids = ids;

    var uncached = ids.filter(function(id) { return !courseCache[id]; });
    if (uncached.length === 0) {
      statusEl.textContent = '✅ ' + ids.length + '개 로드 (캐시)';
      statusEl.className = 'fetch-status success';
      renderCoursePreview(sec);
      return;
    }

    loadCoursesFromWorker().then(function(all) {
      var found = 0;
      for (var i = 0; i < ids.length; i++) {
        if (courseCache[ids[i]]) { found++; continue; }
        for (var j = 0; j < all.length; j++) {
          if (String(all[j].id) === String(ids[i])) {
            courseCache[ids[i]] = all[j];
            found++;
            break;
          }
        }
      }
      var nf = ids.length - found;
      statusEl.textContent = nf > 0 ? '✅ ' + found + '개 / ❌ ' + nf + '개 미발견' : '✅ ' + found + '개 로드!';
      statusEl.className = 'fetch-status' + (nf > 0 ? '' : ' success');
      renderCoursePreview(sec);
    }).catch(function(e) {
      statusEl.textContent = '❌ ' + e.message;
      statusEl.className = 'fetch-status error';
    });
  }

  function loadCoursesFromWorker() {
    if (allCoursesCache) return Promise.resolve(allCoursesCache);
    return fetch(WORKER_URL + '/status', { headers: { 'Authorization': 'Bearer ' + ADMIN_SECRET } })
      .then(function(r) { return r.json(); })
      .then(function(s) {
        var tc = s.totalChunks || 0;
        var ps = [];
        for (var i = 0; i < tc; i++) {
          ps.push(
            fetch(WORKER_URL + '/get-courses?chunk=' + i, { headers: { 'Authorization': 'Bearer ' + ADMIN_SECRET } })
              .then(function(r) { return r.ok ? r.json() : []; })
              .catch(function() { return []; })
          );
        }
        return Promise.all(ps);
      })
      .then(function(rs) {
        var all = [];
        for (var i = 0; i < rs.length; i++) {
          if (Array.isArray(rs[i])) all = all.concat(rs[i]);
        }
        allCoursesCache = all;
        return all;
      });
  }

  // === Render Course Preview ===
  function renderCoursePreview(sec) {
    var container = $('#' + sec + '-course-preview');
    var ids = sectionCourses[sec].ids;
    var layout = sectionCourses[sec].layout;
    if (ids.length === 0) { container.innerHTML = ''; return; }

    var html = '';
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var c = courseCache[id];
      var comment = sectionCourses[sec].comments[id] || '';
      if (typeof comment === 'object') comment = comment.ko || '';
      var badge = sectionCourses[sec].badges[id] || '';

      if (!c) {
        html += '<div class="preview-list-item"><div style="color:var(--danger);font-size:0.8rem;">❌ ID ' + id + '</div></div>';
        continue;
      }

      var title = c.title || '';
      var thumb = c.image || '';
      var metaParts = [];
      if (c.rating) metaParts.push('⭐ ' + Number(c.rating).toFixed(1));
      if (c.contentLength) metaParts.push('⏱️ ' + formatDuration(c.contentLength));
      if (c.instructor) metaParts.push('👤 ' + c.instructor);
      if (c.difficulty) metaParts.push('📊 ' + mapDifficulty(c.difficulty));
      var meta = metaParts.map(function(m) { return '<span>' + m + '</span>'; }).join('');

      var thumbH = thumb ? '<div class="preview-thumb"><img src="' + escHtml(thumb) + '" onerror="this.parentElement.style.display=\'none\'" /></div>' : '';
      var removeH = '<span class="preview-mini-card-remove" data-section="' + sec + '" data-id="' + id + '">✕</span>';
      var badgeH = renderBadgeSelector(id, badge, sec);
      var commentH = '<div class="comment-row">' +
        '<textarea class="course-comment-input" data-section="' + sec + '" data-id="' + id + '" placeholder="추천 사유를 입력하세요...">' + escHtml(comment) + '</textarea>' +
        '<button class="btn-ai-single" data-section="' + sec + '" data-id="' + id + '" title="AI 코멘트 생성">🤖</button>' +
        '</div>';

      if (layout === 'card') {
        html += '<div class="preview-mini-card-with-thumb" data-id="' + id + '">' + thumbH +
          '<div class="preview-mini-card-body">' +
          '<div style="display:flex;justify-content:space-between;">' +
          '<div class="preview-mini-card-title">' + escHtml(title.substring(0, 50)) + '</div>' + removeH +
          '</div>' +
          '<div class="preview-mini-card-meta">' + meta + '</div>' +
          badgeH + commentH +
          '</div></div>';
      } else if (layout === 'highlight') {
        html += '<div class="preview-highlight-card" data-id="' + id + '">' +
          '<div style="display:flex;gap:0.8rem;">' + thumbH +
          '<div style="flex:1;">' +
          '<div style="display:flex;justify-content:space-between;">' +
          '<div class="preview-highlight-badge">🆕</div>' + removeH +
          '</div>' +
          '<div class="preview-highlight-title">' + escHtml(title.substring(0, 60)) + '</div>' +
          '<div class="preview-highlight-meta">' + meta + '</div>' +
          '</div></div>' +
          badgeH + commentH +
          '</div>';
      } else {
        html += '<div class="preview-list-item-with-thumb" data-id="' + id + '">' +
          '<div class="preview-list-rank">' + String(i + 1).padStart(2, '0') + '</div>' + thumbH +
          '<div style="flex:1;">' +
          '<div style="display:flex;justify-content:space-between;">' +
          '<div class="preview-list-title">' + escHtml(title.substring(0, 70)) + '</div>' + removeH +
          '</div>' +
          '<div class="preview-list-meta">' + meta + '</div>' +
          badgeH + commentH +
          '</div></div>';
      }
    }

    container.innerHTML = html;
    bindPreviewEvents(sec);
  }

  function renderBadgeSelector(id, cur, sec) {
    var h = '<div class="badge-selector-inline">';
    for (var i = 0; i < BADGE_OPTIONS.length; i++) {
      var b = BADGE_OPTIONS[i];
      var sel = cur === b.id ? ' selected' : '';
      var isCustom = b.id.indexOf('custom_') === 0;
      h += '<span class="badge-opt-wrap">';
      h += '<button class="badge-opt' + sel + '" data-section="' + sec + '" data-id="' + id + '" data-badge="' + b.id + '">' + b.ko + '</button>';
      if (isCustom) {
        h += '<button class="badge-delete-btn" data-badge-id="' + b.id + '" title="뱃지 삭제">✕</button>';
      }
      h += '</span>';
    }
    h += '<div class="custom-badge-row">' +
      '<input class="custom-badge-input" data-section="' + sec + '" data-id="' + id + '" placeholder="+ 커스텀" />' +
      '<button class="btn-add-badge" data-section="' + sec + '" data-id="' + id + '">추가</button>' +
      '</div></div>';
    return h;
  }

  function bindPreviewEvents(sec) {
    // Remove course
    var removeBtns = $$('#' + sec + '-course-preview .preview-mini-card-remove');
    for (var i = 0; i < removeBtns.length; i++) {
      removeBtns[i].addEventListener('click', function() {
        var s = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        sectionCourses[s].ids = sectionCourses[s].ids.filter(function(x) { return x !== id; });
        delete sectionCourses[s].comments[id];
        delete sectionCourses[s].badges[id];
        var iid = s === 'curation' ? 'f-curation-ids' : 'f-' + s + '-course-ids';
        $('#' + iid).value = sectionCourses[s].ids.join(', ');
        renderCoursePreview(s);
      });
    }

    // Badge select
    var badgeBtns = $$('#' + sec + '-course-preview .badge-opt');
    for (var i = 0; i < badgeBtns.length; i++) {
      badgeBtns[i].addEventListener('click', function() {
        var s = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        var b = this.getAttribute('data-badge');
        if (sectionCourses[s].badges[id] === b) {
          delete sectionCourses[s].badges[id];
        } else {
          sectionCourses[s].badges[id] = b;
        }
        renderCoursePreview(s);
      });
    }

    // Custom badge add
    var addBBtns = $$('#' + sec + '-course-preview .btn-add-badge');
    for (var i = 0; i < addBBtns.length; i++) {
      addBBtns[i].addEventListener('click', function() {
        var s = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        var inp = this.parentElement.querySelector('.custom-badge-input');
        var val = inp.value.trim();
        if (!val) return;
        var nid = 'custom_' + Date.now();
        BADGE_OPTIONS.push({ id: nid, ko: val });
        customBadges.push({ id: nid, ko: val });
        localStorage.setItem('letter_custom_badges', JSON.stringify(customBadges));
        sectionCourses[s].badges[id] = nid;
        toast('뱃지 추가!', 'success');
        renderCoursePreview(s);
      });
    }

    // Badge delete
    var badgeDelBtns = $$('#' + sec + '-course-preview .badge-delete-btn');
    for (var i = 0; i < badgeDelBtns.length; i++) {
      badgeDelBtns[i].addEventListener('click', function(e) {
        e.stopPropagation();
        var badgeId = this.getAttribute('data-badge-id');
        if (!confirm('이 뱃지를 삭제하시겠습니까?')) return;
        for (var j = BADGE_OPTIONS.length - 1; j >= 0; j--) {
          if (BADGE_OPTIONS[j].id === badgeId) { BADGE_OPTIONS.splice(j, 1); break; }
        }
        for (var j = customBadges.length - 1; j >= 0; j--) {
          if (customBadges[j].id === badgeId) { customBadges.splice(j, 1); break; }
        }
        localStorage.setItem('letter_custom_badges', JSON.stringify(customBadges));
        var allSecs = ['insight', 'new', 'curation'];
        for (var si = 0; si < allSecs.length; si++) {
          for (var cid in sectionCourses[allSecs[si]].badges) {
            if (sectionCourses[allSecs[si]].badges[cid] === badgeId) {
              delete sectionCourses[allSecs[si]].badges[cid];
            }
          }
          renderCoursePreview(allSecs[si]);
        }
        toast('뱃지 삭제됨!', 'success');
      });
    }

    // Comment input
    var cInputs = $$('#' + sec + '-course-preview .course-comment-input');
    for (var i = 0; i < cInputs.length; i++) {
      cInputs[i].addEventListener('input', function() {
        sectionCourses[this.getAttribute('data-section')].comments[this.getAttribute('data-id')] = this.value;
      });
    }

    // AI single comment
    var aiSingleBtns = $$('#' + sec + '-course-preview .btn-ai-single');
    for (var i = 0; i < aiSingleBtns.length; i++) {
      aiSingleBtns[i].addEventListener('click', function() {
        var s = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        var c = courseCache[id];
        if (!c) { toast('강의 데이터 없음', 'error'); return; }
        var btn = this;
        btn.disabled = true;
        btn.textContent = '⏳';

        apiCall('/letter-ai-comment', 'POST', {
          courses: [{
            id: id,
            title: c.title || '',
            rating: c.rating ? String(c.rating) : '',
            duration: c.contentLength ? formatDuration(c.contentLength) : '',
            instructor: c.instructor || '',
            category: c.category || '',
            difficulty: c.difficulty || '',
            headline: c.headline || '',
            description: c.description || '',
            objectives: c.objectives || ''
          }]
        }).then(function(res) {
          btn.disabled = false;
          btn.textContent = '🤖';
          if (res.success && res.comments && res.comments.length > 0) {
            var commentText = res.comments[0].comment_ko || '';
            if (commentText) {
              sectionCourses[s].comments[id] = commentText;
              var ta = document.querySelector('#' + s + '-course-preview .course-comment-input[data-id="' + id + '"]');
              if (ta) ta.value = commentText;
              toast('🤖 AI 코멘트 생성!', 'success');
            } else {
              toast('AI가 빈 응답을 반환했습니다', 'error');
            }
          } else {
            toast('AI 실패: ' + (res.error || 'unknown'), 'error');
          }
        }).catch(function(e) {
          btn.disabled = false;
          btn.textContent = '🤖';
          toast('AI 실패: ' + e.message, 'error');
        });
      });
    }
  }

  // === Letter List ===
  function loadLetterList() {
    apiCall('/letter-list').then(function(res) {
      var grid = $('#letter-grid');
      if (!res.success || res.total === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>아직 레터가 없습니다.</p></div>';
        return;
      }
      var html = '';
      for (var i = 0; i < res.data.length; i++) {
        var item = res.data[i];
        var sc = 'status-' + item.status;
        var st = item.status === 'draft' ? '📝 초안' : item.status === 'published' ? '✅ 발행' : '📧 발송';
        html += '<div class="letter-card" data-month="' + item.month + '">';
        html += '<div class="letter-card-month">' + item.month + '</div>';
        html += '<div class="letter-card-title">' + escHtml(item.title_ko || '제목 없음') + '</div>';
        html += '<div class="letter-card-meta">';
        html += '<span class="status-badge ' + sc + '">' + st + '</span>';
        html += '<span>' + (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '') + '</span>';
        html += '</div>';
        if (item.lastEditor) html += '<div class="letter-card-editor">✏️ ' + escHtml(item.lastEditor) + '</div>';
        html += '<div class="letter-card-actions">';
        html += '<button class="letter-card-action" data-month="' + item.month + '" data-action="edit">✏️ 편집</button>';
        html += '<button class="letter-card-action translate-btn" data-month="' + item.month + '" data-action="translate">🌐 영어 번역</button>';
        html += '</div>';
        html += '</div>';
      }
      grid.innerHTML = html;

      var actionBtns = $$('.letter-card-action');
      for (var i = 0; i < actionBtns.length; i++) {
        actionBtns[i].addEventListener('click', function(e) {
          e.stopPropagation();
          var m = this.getAttribute('data-month');
          var action = this.getAttribute('data-action');
          if (action === 'edit') loadLetter(m);
          else if (action === 'translate') translateLetter(m);
        });
      }

      var cards = $$('.letter-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', function(e) {
          if (e.target.closest('.letter-card-action')) return;
          loadLetter(this.getAttribute('data-month'));
        });
      }
    });
  }

  // === New Letter ===
  $('#btn-new-letter').addEventListener('click', function() {
    currentMonth = null;
    clearEditor();
    $('#editor-title').textContent = '✏️ 새 레터';
    $('#btn-delete').style.display = 'none';
    $('#last-saved-info').textContent = '';
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
      $('#f-title-ko').value = (d.title && d.title.ko) ? d.title.ko : '';
      $('#f-subtitle-ko').value = (d.subtitle && d.subtitle.ko) ? d.subtitle.ko : '';
      $('#f-cover-image').value = d.coverImage || DEFAULT_IMAGES.cover;
      $('#f-insight-image').value = (d.insight && d.insight.image) ? d.insight.image : DEFAULT_IMAGES.insight;
      $('#f-new-image').value = (d.newContent && d.newContent.image) ? d.newContent.image : DEFAULT_IMAGES.newContent;
      $('#f-new-summary-ko').value = (d.newContent && d.newContent.summary && d.newContent.summary.ko) ? d.newContent.summary.ko : '';
      $('#f-curation-image').value = (d.curation && d.curation.image) ? d.curation.image : DEFAULT_IMAGES.curation;
      $('#f-curation-intro-ko').value = (d.curation && d.curation.intro && d.curation.intro.ko) ? d.curation.intro.ko : '';
      $('#f-closing-image').value = (d.closing && d.closing.image) ? d.closing.image : DEFAULT_IMAGES.closing;

      if (d.curation && d.curation.tags) {
        var tt = [];
        for (var i = 0; i < d.curation.tags.length; i++) {
          tt.push(d.curation.tags[i].ko || d.curation.tags[i]);
        }
        $('#f-curation-tags').value = tt.join(', ');
      }

      if (d.insight && d.insight.courseIds && d.insight.courseIds.length > 0) {
        $('#f-insight-course-ids').value = d.insight.courseIds.join(', ');
        sectionCourses.insight.ids = d.insight.courseIds;
        sectionCourses.insight.comments = d.insight.courseComments || {};
        sectionCourses.insight.badges = d.insight.courseBadges || {};
        if (d.insight.layout) sectionCourses.insight.layout = d.insight.layout;
      }
      if (d.newContent && d.newContent.courseIds && d.newContent.courseIds.length > 0) {
        $('#f-new-course-ids').value = d.newContent.courseIds.join(', ');
        sectionCourses.new.ids = d.newContent.courseIds;
        sectionCourses.new.comments = d.newContent.courseComments || {};
        sectionCourses.new.badges = d.newContent.courseBadges || {};
        if (d.newContent.layout) sectionCourses.new.layout = d.newContent.layout;
      }
      if (d.curation && d.curation.courseIds && d.curation.courseIds.length > 0) {
        $('#f-curation-ids').value = d.curation.courseIds.join(', ');
        sectionCourses.curation.ids = d.curation.courseIds;
        sectionCourses.curation.comments = d.curation.courseComments || {};
        sectionCourses.curation.badges = d.curation.courseBadges || {};
        if (d.curation.layout) sectionCourses.curation.layout = d.curation.layout;
      }

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
      if (d.updatedAt) {
        var info = new Date(d.updatedAt).toLocaleString('ko-KR');
        if (d.lastEditor) info += ' by ' + d.lastEditor;
        $('#last-saved-info').textContent = '💾 ' + info;
      }
      switchPanel('editor');
      addLog('레터 열기', d.month + '호');
      toast(d.month + '호를 불러왔습니다');
    });
  }

  // === Save ===
  $('#btn-save').addEventListener('click', function() {
    var month = $('#f-month').value.trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      toast('YYYY-MM 형식으로!', 'error');
      return;
    }

    var insightPages = [];
    var iw = $$('#insight-editors .editor-wrap');
    for (var i = 0; i < iw.length; i++) {
      var pg = iw[i].getAttribute('data-page');
      var ed = editors['insight-' + pg];
      if (ed) insightPages.push({ html_ko: ed.root.innerHTML, html_en: '' });
    }

    var promoPages = [];
    var pw = $$('#promo-editors .editor-wrap');
    for (var i = 0; i < pw.length; i++) {
      var pg = pw[i].getAttribute('data-page');
      var ed = editors['promo-' + pg];
      if (ed) promoPages.push({ html_ko: ed.root.innerHTML, html_en: '' });
    }

    var tagsRaw = $('#f-curation-tags').value.trim();
    var tags = [];
    if (tagsRaw) {
      var parts = tagsRaw.split(',');
      for (var i = 0; i < parts.length; i++) {
        var t = parts[i].trim();
        if (t) tags.push({ ko: t, en: '' });
      }
    }

    var body = {
      month: month,
      title_ko: $('#f-title-ko').value.trim(),
      subtitle_ko: $('#f-subtitle-ko').value.trim(),
      coverImage: $('#f-cover-image').value.trim(),
      status: $('#f-status').value,
      lastEditor: currentUser,
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
        $('#last-saved-info').textContent = '💾 ' + new Date().toLocaleString('ko-KR') + ' by ' + currentUser;
        addLog('레터 저장', month + '호');
        toast(res.message, 'success');
      } else {
        toast('저장 실패: ' + res.error, 'error');
      }
    }).catch(function(e) {
      hideLoading();
      toast('저장 실패', 'error');
    });
  });

  // === Delete ===
  $('#btn-delete').addEventListener('click', function() {
    if (!currentMonth) return;
    if (!confirm(currentMonth + '호를 삭제하시겠습니까?')) return;
    showLoading();
    apiCall('/letter-delete', 'POST', { month: currentMonth }).then(function(res) {
      hideLoading();
      if (res.success) {
        addLog('레터 삭제', currentMonth + '호');
        toast(res.message, 'success');
        currentMonth = null;
        clearEditor();
        switchPanel('list');
        loadLetterList();
      } else {
        toast('삭제 실패', 'error');
      }
    });
  });

  // === Translate Letter ===
  function translateLetter(month) {
    if (!confirm(month + '호의 영어 번역본을 생성하시겠습니까?')) return;
    showLoading();
    toast('🌐 번역 시작...');

    apiCall('/letter-get?month=' + month).then(function(res) {
      if (!res.success) {
        hideLoading();
        toast('레터 로드 실패', 'error');
        return;
      }

      var d = res.data;
      var texts = {};

      if (d.title && d.title.ko) texts['title'] = d.title.ko;
      if (d.subtitle && d.subtitle.ko) texts['subtitle'] = d.subtitle.ko;
      if (d.curation && d.curation.intro && d.curation.intro.ko) texts['curation_intro'] = d.curation.intro.ko;
      if (d.newContent && d.newContent.summary && d.newContent.summary.ko) texts['new_summary'] = d.newContent.summary.ko;

      if (d.curation && d.curation.tags) {
        var tagTexts = [];
        for (var i = 0; i < d.curation.tags.length; i++) {
          if (d.curation.tags[i].ko) tagTexts.push(d.curation.tags[i].ko);
        }
        if (tagTexts.length > 0) texts['curation_tags'] = tagTexts.join(', ');
      }

      if (d.insight && d.insight.pages) {
        for (var i = 0; i < d.insight.pages.length; i++) {
          if (d.insight.pages[i].html_ko) texts['insight_page_' + i] = d.insight.pages[i].html_ko;
        }
      }
      if (d.newContent && d.newContent.editorHtml && d.newContent.editorHtml.ko) texts['new_editor'] = d.newContent.editorHtml.ko;
      if (d.closing && d.closing.message && d.closing.message.ko) texts['closing'] = d.closing.message.ko;

      var sectionNames = ['insight', 'newContent', 'curation'];
      for (var s = 0; s < sectionNames.length; s++) {
        var secData = d[sectionNames[s]];
        if (secData && secData.courseComments) {
          for (var cid in secData.courseComments) {
            var cm = secData.courseComments[cid];
            var koText = typeof cm === 'string' ? cm : (cm && cm.ko ? cm.ko : '');
            if (koText) texts['comment_' + sectionNames[s] + '_' + cid] = koText;
          }
        }
      }

      var keys = Object.keys(texts);
      if (keys.length === 0) {
        hideLoading();
        toast('번역할 텍스트 없음', 'error');
        return;
      }

      apiCall('/letter-translate', 'POST', { texts: texts }).then(function(trRes) {
        if (!trRes.success) {
          hideLoading();
          toast('번역 실패: ' + (trRes.error || ''), 'error');
          return;
        }

        var tr = trRes.translations || {};

        if (tr['title'] && d.title) d.title.en = tr['title'];
        if (tr['subtitle'] && d.subtitle) d.subtitle.en = tr['subtitle'];
        if (tr['curation_intro'] && d.curation && d.curation.intro) d.curation.intro.en = tr['curation_intro'];
        if (tr['new_summary'] && d.newContent && d.newContent.summary) d.newContent.summary.en = tr['new_summary'];

        if (tr['curation_tags'] && d.curation && d.curation.tags) {
          var enTags = tr['curation_tags'].split(',');
          for (var i = 0; i < d.curation.tags.length && i < enTags.length; i++) {
            d.curation.tags[i].en = enTags[i].trim();
          }
        }

        if (d.insight && d.insight.pages) {
          for (var i = 0; i < d.insight.pages.length; i++) {
            if (tr['insight_page_' + i]) d.insight.pages[i].html_en = tr['insight_page_' + i];
          }
        }
        if (tr['new_editor'] && d.newContent && d.newContent.editorHtml) d.newContent.editorHtml.en = tr['new_editor'];
        if (tr['closing'] && d.closing && d.closing.message) d.closing.message.en = tr['closing'];

        for (var s = 0; s < sectionNames.length; s++) {
          var secData = d[sectionNames[s]];
          if (secData && secData.courseComments) {
            for (var cid in secData.courseComments) {
              var trKey = 'comment_' + sectionNames[s] + '_' + cid;
              if (tr[trKey]) {
                var existing = secData.courseComments[cid];
                if (typeof existing === 'string') {
                  secData.courseComments[cid] = { ko: existing, en: tr[trKey] };
                } else if (existing) {
                  existing.en = tr[trKey];
                }
              }
            }
          }
        }

        var saveBody = {
          month: d.month,
          title_ko: d.title ? d.title.ko || '' : '',
          title_en: d.title ? d.title.en || '' : '',
          subtitle_ko: d.subtitle ? d.subtitle.ko || '' : '',
          subtitle_en: d.subtitle ? d.subtitle.en || '' : '',
          coverImage: d.coverImage || '',
          status: d.status || 'draft',
          lastEditor: currentUser,
          insight_image: d.insight ? d.insight.image || '' : '',
          insight_pages: d.insight ? d.insight.pages || [] : [],
          insight_courseIds: d.insight ? d.insight.courseIds || [] : [],
          insight_courseComments: d.insight ? d.insight.courseComments || {} : {},
          insight_courseBadges: d.insight ? d.insight.courseBadges || {} : {},
          insight_layout: d.insight ? d.insight.layout || 'card' : 'card',
          newContent_image: d.newContent ? d.newContent.image || '' : '',
          newContent_editorHtml_ko: d.newContent && d.newContent.editorHtml ? d.newContent.editorHtml.ko || '' : '',
          newContent_editorHtml_en: d.newContent && d.newContent.editorHtml ? d.newContent.editorHtml.en || '' : '',
          newContent_summary_ko: d.newContent && d.newContent.summary ? d.newContent.summary.ko || '' : '',
          newContent_summary_en: d.newContent && d.newContent.summary ? d.newContent.summary.en || '' : '',
          newContent_courseIds: d.newContent ? d.newContent.courseIds || [] : [],
          newContent_courseComments: d.newContent ? d.newContent.courseComments || {} : {},
          newContent_courseBadges: d.newContent ? d.newContent.courseBadges || {} : {},
          newContent_layout: d.newContent ? d.newContent.layout || 'highlight' : 'highlight',
          curation_image: d.curation ? d.curation.image || '' : '',
          curation_intro_ko: d.curation && d.curation.intro ? d.curation.intro.ko || '' : '',
          curation_intro_en: d.curation && d.curation.intro ? d.curation.intro.en || '' : '',
          curation_tags: d.curation ? d.curation.tags || [] : [],
          curation_courseIds: d.curation ? d.curation.courseIds || [] : [],
          curation_courseComments: d.curation ? d.curation.courseComments || {} : {},
          curation_courseBadges: d.curation ? d.curation.courseBadges || {} : {},
          curation_layout: d.curation ? d.curation.layout || 'list' : 'list',
          closing_image: d.closing ? d.closing.image || '' : '',
          closing_ko: d.closing && d.closing.message ? d.closing.message.ko || '' : '',
          closing_en: d.closing && d.closing.message ? d.closing.message.en || '' : '',
          promo_pages: d.promo ? d.promo.pages || [] : []
        };

        apiCall('/letter-save', 'POST', saveBody).then(function(saveRes) {
          hideLoading();
          if (saveRes.success) {
            var count = Object.keys(tr).length;
            addLog('영어 번역', month + '호 / ' + count + '개');
            toast('🌐 ' + count + '개 항목 번역 완료!', 'success');
            loadLetterList();
          } else {
            toast('저장 실패', 'error');
          }
        });

      }).catch(function(e) {
        hideLoading();
        toast('번역 실패: ' + e.message, 'error');
      });

    }).catch(function(e) {
      hideLoading();
      toast('로드 실패: ' + e.message, 'error');
    });
  }

  // === Helpers ===
  function switchPanel(name) {
    var panels = $$('.admin-panel');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
    $('#panel-' + name).classList.add('active');
    var nb = $$('.admin-nav-btn[data-panel]');
    for (var i = 0; i < nb.length; i++) {
      nb[i].classList.toggle('active', nb[i].getAttribute('data-panel') === name);
    }
  }

  function clearEditor() {
    $('#f-month').value = '';
    $('#f-month').disabled = false;
    $('#f-status').value = 'draft';
    $('#f-title-ko').value = '';
    $('#f-subtitle-ko').value = '';
    $('#f-cover-image').value = DEFAULT_IMAGES.cover;
    $('#f-insight-image').value = DEFAULT_IMAGES.insight;
    $('#f-new-image').value = DEFAULT_IMAGES.newContent;
    $('#f-new-summary-ko').value = '';
    $('#f-curation-image').value = DEFAULT_IMAGES.curation;
    $('#f-curation-intro-ko').value = '';
    $('#f-curation-tags').value = '';
    $('#f-curation-ids').value = '';
    $('#f-closing-image').value = DEFAULT_IMAGES.closing;
    if ($('#f-insight-course-ids')) $('#f-insight-course-ids').value = '';
    if ($('#f-new-course-ids')) $('#f-new-course-ids').value = '';

    sectionCourses.insight = { ids: [], comments: {}, badges: {}, layout: 'card' };
    sectionCourses.new = { ids: [], comments: {}, badges: {}, layout: 'highlight' };
    sectionCourses.curation = { ids: [], comments: {}, badges: {}, layout: 'list' };

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
