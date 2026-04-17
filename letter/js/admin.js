(function() {

  var API_BASE = '/api';
  var ADMIN_SECRET = 'gogo1014';
  var WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
  var EMAIL_FONT = "'Noto Sans KR','Apple SD Gothic Neo','Pretendard',-apple-system,'Segoe UI','Malgun Gothic','맑은 고딕',Helvetica,Arial,sans-serif";
  var EMAIL_IMAGE_BASE = 'https://ubcexp.pages.dev/letter/';

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
    return fetch('/api/courses-proxy?action=status')
      .then(function(r) {
        if (!r.ok) throw new Error('status failed');
        return r.json();
      })
      .then(function(s) {
        var tc = s.totalChunks || 0;
        if (tc === 0) throw new Error('no chunks');
        var BATCH = 3;
        var all = [];
        var batchIndex = 0;
        function loadBatch() {
          if (batchIndex >= tc) {
            allCoursesCache = all;
            return Promise.resolve(all);
          }
          var end = Math.min(batchIndex + BATCH, tc);
          var ps = [];
          for (var i = batchIndex; i < end; i++) {
            ps.push(fetch('/api/courses-proxy?chunk=' + i).then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; }));
          }
          return Promise.all(ps).then(function(rs) {
            for (var i = 0; i < rs.length; i++) {
              if (Array.isArray(rs[i])) all = all.concat(rs[i]);
            }
            batchIndex = end;
            var pct = Math.round((end / tc) * 100);
            var statusEls = ['insight-fetch-status', 'new-fetch-status', 'curation-fetch-status'];
            for (var si = 0; si < statusEls.length; si++) {
              var el = document.getElementById(statusEls[si]);
              if (el && !el.textContent.match(/✅|❌/)) {
                el.textContent = '⏳ 강의 데이터 로딩 중... ' + pct + '% (' + all.length + '개)';
              }
            }
            return new Promise(function(resolve) { setTimeout(function() { resolve(loadBatch()); }, 200); });
          });
        }
        return loadBatch();
      })
      .catch(function(e) { toast('강의 데이터 로드 실패: ' + e.message, 'error'); return []; });
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
      if (!c) { html += '<div class="preview-mini-card-with-thumb" style="opacity:0.5">❌ ID ' + id + '</div>'; continue; }
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
      var commentH = '<div class="comment-row"><textarea class="course-comment-input" data-section="' + sec + '" data-id="' + id + '" placeholder="추천 사유를 입력하세요...">' + escHtml(comment) + '</textarea><button class="btn-ai-single" data-section="' + sec + '" data-id="' + id + '" title="AI 코멘트 생성">🤖</button></div>';
      if (layout === 'card') {
        html += '<div class="preview-mini-card-with-thumb">' + thumbH + '<div class="preview-mini-card-body"><div style="display:flex;justify-content:space-between;align-items:start"><div class="preview-mini-card-title">' + escHtml(title.substring(0, 50)) + '</div>' + removeH + '</div><div class="preview-mini-card-meta">' + meta + '</div>' + badgeH + commentH + '</div></div>';
      } else if (layout === 'highlight') {
        html += '<div class="preview-highlight-card"><div style="display:flex;gap:0.8rem">' + thumbH + '<div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:start"><div class="preview-highlight-badge">🆕</div>' + removeH + '</div><div class="preview-highlight-title">' + escHtml(title.substring(0, 60)) + '</div><div class="preview-highlight-meta">' + meta + '</div></div></div>' + badgeH + commentH + '</div>';
      } else {
        html += '<div class="preview-list-item-with-thumb"><div class="preview-list-rank">' + String(i + 1).padStart(2, '0') + '</div>' + thumbH + '<div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:start"><div class="preview-list-title">' + escHtml(title.substring(0, 70)) + '</div>' + removeH + '</div><div class="preview-list-meta">' + meta + '</div>' + badgeH + commentH + '</div></div>';
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
      h += '<span class="badge-opt-wrap"><button class="badge-opt' + sel + '" data-section="' + sec + '" data-id="' + id + '" data-badge="' + b.id + '">' + b.ko + '</button>';
      if (isCustom) h += '<button class="badge-delete-btn" data-badge-id="' + b.id + '" title="뱃지 삭제">✕</button>';
      h += '</span>';
    }
    h += '<div class="custom-badge-row"><input class="custom-badge-input" data-section="' + sec + '" data-id="' + id + '" placeholder="+ 커스텀" /><button class="btn-add-badge" data-section="' + sec + '" data-id="' + id + '">추가</button></div></div>';
    return h;
  }

  function bindPreviewEvents(sec) {
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
    var badgeBtns = $$('#' + sec + '-course-preview .badge-opt');
    for (var i = 0; i < badgeBtns.length; i++) {
      badgeBtns[i].addEventListener('click', function() {
        var s = this.getAttribute('data-section');
        var id = this.getAttribute('data-id');
        var b = this.getAttribute('data-badge');
        if (sectionCourses[s].badges[id] === b) delete sectionCourses[s].badges[id];
        else sectionCourses[s].badges[id] = b;
        renderCoursePreview(s);
      });
    }
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
    var badgeDelBtns = $$('#' + sec + '-course-preview .badge-delete-btn');
    for (var i = 0; i < badgeDelBtns.length; i++) {
      badgeDelBtns[i].addEventListener('click', function(e) {
        e.stopPropagation();
        var badgeId = this.getAttribute('data-badge-id');
        if (!confirm('이 뱃지를 삭제하시겠습니까?')) return;
        for (var j = BADGE_OPTIONS.length - 1; j >= 0; j--) { if (BADGE_OPTIONS[j].id === badgeId) { BADGE_OPTIONS.splice(j, 1); break; } }
        for (var j = customBadges.length - 1; j >= 0; j--) { if (customBadges[j].id === badgeId) { customBadges.splice(j, 1); break; } }
        localStorage.setItem('letter_custom_badges', JSON.stringify(customBadges));
        var allSecs = ['insight', 'new', 'curation'];
        for (var si = 0; si < allSecs.length; si++) {
          for (var cid in sectionCourses[allSecs[si]].badges) { if (sectionCourses[allSecs[si]].badges[cid] === badgeId) delete sectionCourses[allSecs[si]].badges[cid]; }
          renderCoursePreview(allSecs[si]);
        }
        toast('뱃지 삭제됨!', 'success');
      });
    }
    var cInputs = $$('#' + sec + '-course-preview .course-comment-input');
    for (var i = 0; i < cInputs.length; i++) {
      cInputs[i].addEventListener('input', function() {
        sectionCourses[this.getAttribute('data-section')].comments[this.getAttribute('data-id')] = this.value;
      });
    }
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
          courses: [{ id: id, title: c.title || '', rating: c.rating ? String(c.rating) : '', duration: c.contentLength ? formatDuration(c.contentLength) : '', instructor: c.instructor || '', category: c.category || '', difficulty: c.difficulty || '', headline: c.headline || '', description: c.description || '', objectives: c.objectives || '' }]
        }).then(function(res) {
          btn.disabled = false; btn.textContent = '🤖';
          if (res.success && res.comments && res.comments.length > 0) {
            var commentText = res.comments[0].comment_ko || '';
            if (commentText) {
              sectionCourses[s].comments[id] = commentText;
              var ta = document.querySelector('#' + s + '-course-preview .course-comment-input[data-id="' + id + '"]');
              if (ta) ta.value = commentText;
              toast('🤖 AI 코멘트 생성!', 'success');
            } else toast('AI가 빈 응답을 반환했습니다', 'error');
          } else toast('AI 실패: ' + (res.error || 'unknown'), 'error');
        }).catch(function(e) { btn.disabled = false; btn.textContent = '🤖'; toast('AI 실패: ' + e.message, 'error'); });
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
        html += '<div class="letter-card-meta"><span class="status-badge ' + sc + '">' + st + '</span>';
        html += '<span>' + (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '') + '</span></div>';
        if (item.lastEditor) html += '<div class="letter-card-editor">✏️ ' + escHtml(item.lastEditor) + '</div>';
        html += '<div class="letter-card-actions">';
        html += '<button class="letter-card-action" data-month="' + item.month + '" data-action="edit">✏️ 편집</button>';
        html += '<button class="letter-card-action" data-month="' + item.month + '" data-action="email">📧 메일복사</button>';
        html += '</div></div>';
      }
      grid.innerHTML = html;

      var actionBtns = $$('.letter-card-action');
      for (var i = 0; i < actionBtns.length; i++) {
        actionBtns[i].addEventListener('click', function(e) {
          e.stopPropagation();
          var m = this.getAttribute('data-month');
          var action = this.getAttribute('data-action');
          if (action === 'edit') loadLetter(m);
          if (action === 'email') {
            var sub = prompt('[' + m + '호] 메일 발송용 HTML 복사\n\n타겟 기업의 Subdomain을 입력하세요.\n(예: woongjin)', 'woongjin');
            if (sub !== null) generateEmail(m, sub.trim());
          }
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
    $('#btn-copy-email').style.display = 'none';
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
        for (var i = 0; i < d.curation.tags.length; i++) tt.push(d.curation.tags[i].ko || d.curation.tags[i]);
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
      if (d.insight && d.insight.pages && d.insight.pages.length > 0 && editors['insight-0']) editors['insight-0'].root.innerHTML = d.insight.pages[0].html_ko || '';
      if (editors['new'] && d.newContent && d.newContent.editorHtml) editors['new'].root.innerHTML = d.newContent.editorHtml.ko || '';
      if (editors['closing'] && d.closing && d.closing.message) editors['closing'].root.innerHTML = d.closing.message.ko || '';
      if (d.promo && d.promo.pages && d.promo.pages.length > 0 && editors['promo-0']) editors['promo-0'].root.innerHTML = d.promo.pages[0].html_ko || '';

      $('#editor-title').textContent = '✏️ ' + d.month + '호 편집';
      $('#btn-delete').style.display = '';
      $('#btn-copy-email').style.display = '';
      if (d.updatedAt) {
        var info = new Date(d.updatedAt).toLocaleString('ko-KR');
        if (d.lastEditor) info += ' by ' + d.lastEditor;
        $('#last-saved-info').textContent = '💾 ' + info;
      }
      var sectionsToFetch = [];
      if (sectionCourses.insight.ids.length > 0) sectionsToFetch.push('insight');
      if (sectionCourses.new.ids.length > 0) sectionsToFetch.push('new');
      if (sectionCourses.curation.ids.length > 0) sectionsToFetch.push('curation');
      switchPanel('editor');
      addLog('레터 열기', d.month + '호');
      if (sectionsToFetch.length > 0) {
        toast(d.month + '호 로드 중... 강의 데이터 불러오는 중');
        loadCoursesFromWorker().then(function(all) {
          for (var si = 0; si < sectionsToFetch.length; si++) {
            var sec = sectionsToFetch[si];
            var ids = sectionCourses[sec].ids;
            for (var i = 0; i < ids.length; i++) {
              if (!courseCache[ids[i]]) {
                for (var j = 0; j < all.length; j++) {
                  if (String(all[j].id) === String(ids[i])) { courseCache[ids[i]] = all[j]; break; }
                }
              }
            }
            renderCoursePreview(sec);
          }
          toast(d.month + '호 + 강의 데이터 로드 완료!', 'success');
        }).catch(function() { toast(d.month + '호 로드 완료 (강의 데이터 실패)', 'error'); });
      } else toast(d.month + '호를 불러왔습니다');
    });
  }

  // === Save ===
  $('#btn-save').addEventListener('click', function() {
    var month = $('#f-month').value.trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) { toast('YYYY-MM 형식으로!', 'error'); return; }
    var insightPages = [];
    var iw = $$('#insight-editors .editor-wrap');
    for (var i = 0; i < iw.length; i++) { var pg = iw[i].getAttribute('data-page'); var ed = editors['insight-' + pg]; if (ed) insightPages.push({ html_ko: ed.root.innerHTML, html_en: '' }); }
    var promoPages = [];
    var pw = $$('#promo-editors .editor-wrap');
    for (var i = 0; i < pw.length; i++) { var pg = pw[i].getAttribute('data-page'); var ed = editors['promo-' + pg]; if (ed) promoPages.push({ html_ko: ed.root.innerHTML, html_en: '' }); }
    var tagsRaw = $('#f-curation-tags').value.trim();
    var tags = [];
    if (tagsRaw) { var parts = tagsRaw.split(','); for (var i = 0; i < parts.length; i++) { var t = parts[i].trim(); if (t) tags.push({ ko: t, en: '' }); } }
    var body = {
      month: month, title_ko: $('#f-title-ko').value.trim(), subtitle_ko: $('#f-subtitle-ko').value.trim(),
      coverImage: $('#f-cover-image').value.trim(), status: $('#f-status').value, lastEditor: currentUser,
      insight_image: $('#f-insight-image').value.trim(), insight_pages: insightPages,
      insight_courseIds: sectionCourses.insight.ids, insight_courseComments: sectionCourses.insight.comments,
      insight_courseBadges: sectionCourses.insight.badges, insight_layout: sectionCourses.insight.layout,
      newContent_image: $('#f-new-image').value.trim(),
      newContent_editorHtml_ko: editors['new'] ? editors['new'].root.innerHTML : '',
      newContent_summary_ko: $('#f-new-summary-ko').value.trim(),
      newContent_courseIds: sectionCourses.new.ids, newContent_courseComments: sectionCourses.new.comments,
      newContent_courseBadges: sectionCourses.new.badges, newContent_layout: sectionCourses.new.layout,
      curation_image: $('#f-curation-image').value.trim(), curation_intro_ko: $('#f-curation-intro-ko').value.trim(),
      curation_tags: tags, curation_courseIds: sectionCourses.curation.ids,
      curation_courseComments: sectionCourses.curation.comments, curation_courseBadges: sectionCourses.curation.badges,
      curation_layout: sectionCourses.curation.layout,
      closing_image: $('#f-closing-image').value.trim(),
      closing_ko: editors['closing'] ? editors['closing'].root.innerHTML : '',
      promo_pages: promoPages
    };
    showLoading();
    apiCall('/letter-save', 'POST', body).then(function(res) {
      hideLoading();
      if (res.success) {
        currentMonth = month; $('#f-month').disabled = true; $('#btn-delete').style.display = ''; $('#btn-copy-email').style.display = '';
        $('#last-saved-info').textContent = '💾 ' + new Date().toLocaleString('ko-KR') + ' by ' + currentUser;
        addLog('레터 저장', month + '호'); toast(res.message, 'success');
      } else toast('저장 실패: ' + res.error, 'error');
    }).catch(function() { hideLoading(); toast('저장 실패', 'error'); });
  });

  // === Delete ===
  $('#btn-delete').addEventListener('click', function() {
    if (!currentMonth) return;
    if (!confirm(currentMonth + '호를 삭제하시겠습니까?')) return;
    showLoading();
    apiCall('/letter-delete', 'POST', { month: currentMonth }).then(function(res) {
      hideLoading();
      if (res.success) { addLog('레터 삭제', currentMonth + '호'); toast(res.message, 'success'); currentMonth = null; clearEditor(); switchPanel('list'); loadLetterList(); }
      else toast('삭제 실패', 'error');
    });
  });

  // === Email Copy (Editor) ===
  $('#btn-copy-email').addEventListener('click', function() {
    if (!currentMonth) { toast('먼저 레터를 저장해주세요', 'error'); return; }
    var sub = prompt('[' + currentMonth + '호] 메일 발송용 HTML 복사\n\n타겟 기업의 Subdomain을 입력하세요.', 'woongjin');
    if (sub === null) return;
    generateEmail(currentMonth, sub.trim());
  });

  // === Helpers ===
  function switchPanel(name) {
    var panels = $$('.admin-panel');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
    $('#panel-' + name).classList.add('active');
    var nb = $$('.admin-nav-btn[data-panel]');
    for (var i = 0; i < nb.length; i++) nb[i].classList.toggle('active', nb[i].getAttribute('data-panel') === name);
  }

  function clearEditor() {
    $('#f-month').value = ''; $('#f-month').disabled = false; $('#f-status').value = 'draft';
    $('#f-title-ko').value = ''; $('#f-subtitle-ko').value = '';
    $('#f-cover-image').value = DEFAULT_IMAGES.cover; $('#f-insight-image').value = DEFAULT_IMAGES.insight;
    $('#f-new-image').value = DEFAULT_IMAGES.newContent; $('#f-new-summary-ko').value = '';
    $('#f-curation-image').value = DEFAULT_IMAGES.curation; $('#f-curation-intro-ko').value = '';
    $('#f-curation-tags').value = ''; $('#f-curation-ids').value = '';
    $('#f-closing-image').value = DEFAULT_IMAGES.closing;
    $('#btn-copy-email').style.display = 'none';
    if ($('#f-insight-course-ids')) $('#f-insight-course-ids').value = '';
    if ($('#f-new-course-ids')) $('#f-new-course-ids').value = '';
    sectionCourses.insight = { ids: [], comments: {}, badges: {}, layout: 'card' };
    sectionCourses.new = { ids: [], comments: {}, badges: {}, layout: 'highlight' };
    sectionCourses.curation = { ids: [], comments: {}, badges: {}, layout: 'list' };
    $('#insight-course-preview').innerHTML = ''; $('#new-course-preview').innerHTML = ''; $('#curation-course-preview').innerHTML = '';
    $('#insight-fetch-status').textContent = ''; $('#new-fetch-status').textContent = ''; $('#curation-fetch-status').textContent = '';
    for (var key in editors) { if (editors[key] && editors[key].root) editors[key].root.innerHTML = ''; }
  }

  // ==========================================
  // === Email HTML Generation v3 (풀버전) ===
  // ==========================================

  function generateEmail(month, sub) {
    showLoading();
    toast('📧 이메일 HTML 생성 중...');
    apiCall('/letter-get?month=' + month).then(function(res) {
      if (!res.success) { hideLoading(); toast('레터 데이터를 불러오지 못했습니다.', 'error'); return; }
      var letter = res.data;
      var allIds = [];
      if (letter.insight && letter.insight.courseIds) allIds = allIds.concat(letter.insight.courseIds);
      if (letter.newContent && letter.newContent.courseIds) allIds = allIds.concat(letter.newContent.courseIds);
      if (letter.curation && letter.curation.courseIds) allIds = allIds.concat(letter.curation.courseIds);
      if (allIds.length > 0) {
        loadCoursesFromWorker().then(function(allCourses) {
          var cMap = {};
          for (var i = 0; i < allCourses.length; i++) cMap[String(allCourses[i].id)] = allCourses[i];
          doEmailCopy(letter, sub, cMap, month);
        }).catch(function() { doEmailCopy(letter, sub, {}, month); });
      } else doEmailCopy(letter, sub, {}, month);
    }).catch(function(e) { hideLoading(); toast('실패: ' + e.message, 'error'); });
  }

  function doEmailCopy(letter, sub, cMap, month) {
    var html = buildEmailHtml(letter, sub, cMap);
    hideLoading();
    var ta = document.createElement('textarea');
    ta.value = html;
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('📧 이메일 HTML 복사 완료! (' + Math.round(html.length / 1024) + 'KB)', 'success');
    addLog('이메일 HTML 복사', month + '호 / sub=' + sub);
  }

  function emailAbsUrl(url) {
    if (!url) return '';
    if (url.indexOf('http') === 0) return url;
    return EMAIL_IMAGE_BASE + url.replace(/^\//, '');
  }

  function emailCourseUrl(slug, sub) {
    var base = sub ? 'https://' + sub + '.udemy.com' : 'https://www.udemy.com';
    if (!slug) return base;
    if (slug.indexOf('http') === 0) return slug.replace('www.udemy.com', sub ? sub + '.udemy.com' : 'www.udemy.com');
    return base + '/course/' + slug + '/';
  }

  function emailCleanHtml(html) {
    if (!html) return '';
    var F = EMAIL_FONT;
    html = html.replace(/<p><br><\/p>/g, '<br>');
    html = html.replace(/ class="ql-[^"]*"/g, '');
    html = html.replace(/<img(?![^>]*style)/g, '<img style="max-width:100%;height:auto;display:block;margin:8px 0;"');
    html = html.replace(/<a(?![^>]*style)/g, '<a style="color:#7c6cf0;text-decoration:underline;font-family:' + F + ';"');
    html = html.replace(/<p>/g, '<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#4a4a6a;font-family:' + F + ';">');
    html = html.replace(/<strong>/g, '<strong style="color:#1a1a2e;">');
    html = html.replace(/<h2>/g, '<h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#1a1a2e;font-family:' + F + ';">');
    html = html.replace(/<h3>/g, '<h3 style="margin:0 0 10px;font-size:17px;font-weight:700;color:#1a1a2e;font-family:' + F + ';">');
    html = html.replace(/<ul>/g, '<ul style="margin:0 0 12px;padding-left:20px;">');
    html = html.replace(/<ol>/g, '<ol style="margin:0 0 12px;padding-left:20px;">');
    html = html.replace(/<li>/g, '<li style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#4a4a6a;font-family:' + F + ';">');
    html = html.replace(/<blockquote>/g, '<blockquote style="margin:0 0 12px;padding:12px 16px;border-left:4px solid #a78bfa;background:#f5f3ff;font-family:' + F + ';">');
    return html;
  }

  function emailBadge(bid) {
    var map = { 'popular': { t: '🔥 가장 인기', bg: '#fef3c7', c: '#92400e' }, 'shortest': { t: '⚡ 가장 짧은', bg: '#dbeafe', c: '#1e40af' }, 'top-rated': { t: '🏆 평점 최고', bg: '#d1fae5', c: '#065f46' }, 'new': { t: '🆕 신규', bg: '#ede9fe', c: '#5b21b6' }, 'essential': { t: '💼 실무 필수', bg: '#fce7f3', c: '#9d174d' } };
    var b = map[bid];
    if (!b) { var customs = JSON.parse(localStorage.getItem('letter_custom_badges') || '[]'); for (var i = 0; i < customs.length; i++) { if (customs[i].id === bid) { b = { t: customs[i].ko, bg: '#ede9fe', c: '#5b21b6' }; break; } } }
    if (!b) return '';
    return '<span style="display:inline-block;padding:3px 10px;background:' + b.bg + ';color:' + b.c + ';border-radius:8px;font-size:11px;font-weight:700;margin-bottom:6px;">' + b.t + '</span>';
  }

  function emailGetComment(c) { if (!c) return ''; if (typeof c === 'string') return c; return c.ko || ''; }

  function buildEmailHtml(letter, sub, coursesMap) {
    var F = EMAIL_FONT;
    var campusUrl = sub ? 'https://' + sub + '.udemy.com' : 'https://www.udemy.com';
    var greeting = sub ? sub.toUpperCase() + ' 학습자님을 위한 이달의 레터' : '학습자님을 위한 이달의 레터';
    var titleKo = (letter.title && letter.title.ko) ? letter.title.ko : '';
    var subtitleKo = (letter.subtitle && letter.subtitle.ko) ? letter.subtitle.ko : '';
    var h = '';
    h += '<!DOCTYPE html>\n<html lang="ko" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n<head>\n';
    h += '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge">\n';
    h += '<title>Udemy Letter — ' + escHtml(letter.month) + '</title>\n';
    h += '<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->\n';
    h += '<style type="text/css">\n';
    h += '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap");\n';
    h += 'body,table,td,a,p,span,h1,h2,h3,h4,li{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;font-family:' + F + ';}\n';
    h += 'table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}body{margin:0;padding:0;width:100%!important;}\n';
    h += '@media only screen and (max-width:620px){.m-full{width:100%!important;}.m-pad{padding:16px!important;}.m-hide{display:none!important;}.m-stack{display:block!important;width:100%!important;}.m-title{font-size:22px!important;line-height:28px!important;}}\n';
    h += '</style>\n<!--[if mso]><style>body,table,td,p,a,li,span,h1,h2,h3{font-family:"Malgun Gothic",Helvetica,Arial,sans-serif!important;}</style><![endif]-->\n</head>\n';
    h += '<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:' + F + ';">\n';
    h += '<div style="display:none;font-size:1px;color:#f5f3ff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">' + escHtml(titleKo) + ' — ' + escHtml(subtitleKo) + '</div>\n';
    h += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f3ff;"><tr><td align="center" style="padding:20px 10px;">\n';
    h += '<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->\n';
    h += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="m-full" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;">\n';

    // 헤더
    h += '<tr><td style="padding:14px 24px;border-bottom:1px solid #f0eeff;font-family:' + F + ';"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>';
    h += '<td style="font-family:' + F + ';"><img src="https://www.udemy.com/staticx/udemy/images/v7/logo-udemy.svg" alt="Udemy" height="22" style="vertical-align:middle;"> <span style="color:#7c6cf0;font-size:14px;font-weight:700;vertical-align:middle;margin-left:6px;font-family:' + F + ';">Letter</span></td>';
    h += '<td align="right" style="font-size:12px;color:#9090aa;font-family:' + F + ';">' + escHtml(letter.month) + '호</td>';
    h += '</tr></table></td></tr>\n';

    // 표지
    var coverImg = emailAbsUrl(letter.coverImage || 'src/img/Brand_Launch.jpg');
    h += '<tr><td style="background:#7c6cf0;background:linear-gradient(135deg,#7c6cf0 0%,#a78bfa 40%,#ec4899 100%);padding:0;text-align:center;">\n';
    if (coverImg) h += '<img src="' + escHtml(coverImg) + '" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;" class="m-full">\n';
    h += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:30px 32px 36px;text-align:center;font-family:' + F + ';" class="m-pad">';
    h += '<p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.65);letter-spacing:3px;font-family:' + F + ';">' + escHtml(letter.month) + '호</p>';
    h += '<h1 style="margin:0 0 10px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.3;font-family:' + F + ';" class="m-title">' + escHtml(titleKo) + '</h1>';
    h += '<p style="margin:0 0 14px;font-size:15px;color:rgba(255,255,255,0.85);font-weight:300;font-family:' + F + ';">' + escHtml(subtitleKo) + '</p>';
    h += '<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.55);font-family:' + F + ';">' + escHtml(greeting) + '</p>';
    h += '</td></tr></table></td></tr>\n';

    // INDEX
    var secs = [];
    if (letter.insight) secs.push({ n: '01', i: '📊', t: '트렌드 인사이트' });
    if (letter.newContent) secs.push({ n: '02', i: '✨', t: '신규 콘텐츠' });
    if (letter.curation) secs.push({ n: '03', i: '🎯', t: '이달의 큐레이션' });
    if (secs.length > 0) {
      h += '<tr><td style="padding:28px 32px;font-family:' + F + ';" class="m-pad"><p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#7c6cf0;letter-spacing:2px;font-family:' + F + ';">INDEX</p>';
      h += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>';
      for (var si = 0; si < secs.length; si++) {
        var w = Math.floor(100 / secs.length);
        h += '<td width="' + w + '%" valign="top" style="padding:14px 10px;background:#f5f3ff;border-radius:12px;text-align:center;font-family:' + F + ';" class="m-stack">';
        h += '<p style="margin:0 0 2px;font-size:10px;font-weight:700;color:#7c6cf0;font-family:' + F + ';">' + secs[si].n + '</p>';
        h += '<p style="margin:0 0 4px;font-size:22px;line-height:1;">' + secs[si].i + '</p>';
        h += '<p style="margin:0;font-size:13px;font-weight:700;color:#1a1a2e;font-family:' + F + ';">' + escHtml(secs[si].t) + '</p></td>';
        if (si < secs.length - 1) h += '<td width="8" style="font-size:0;">&nbsp;</td>';
      }
      h += '</tr></table></td></tr>\n';
    }

    // 섹션 헬퍼
    function secHead(tag, icon, title) {
      return '<tr><td style="padding:28px 32px 12px;font-family:' + F + ';" class="m-pad"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#7c6cf0;letter-spacing:2px;font-family:' + F + ';">' + escHtml(tag) + '</p><h2 style="margin:0;font-size:22px;font-weight:800;color:#1a1a2e;font-family:' + F + ';">' + icon + ' ' + escHtml(title) + '</h2></td></tr>\n';
    }
    function secImg(url) {
      if (!url) return '';
      return '<tr><td style="padding:0 32px 16px;" class="m-pad"><img src="' + escHtml(emailAbsUrl(url)) + '" alt="" width="536" style="display:block;width:100%;max-width:536px;border-radius:12px;" class="m-full"></td></tr>\n';
    }
    function divider() { return '<tr><td style="padding:0 32px;" class="m-pad"><div style="border-top:1px solid #f0eeff;margin:8px 0;"></div></td></tr>\n'; }

    function courseCards(sData) {
      var ids = sData.courseIds || []; var comments = sData.courseComments || {}; var badges = sData.courseBadges || {}; var out = '';
      for (var ci = 0; ci < ids.length; ci++) {
        var c = coursesMap[String(ids[ci])]; if (!c) continue;
        var curl = emailCourseUrl(c.url || c.slug, sub); var cimg = emailAbsUrl(c.image); var badge = badges[ids[ci]]; var cmt = emailGetComment(comments[ids[ci]]);
        out += '<tr><td style="padding:0 32px 10px;font-family:' + F + ';" class="m-pad"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid #f0eeff;border-radius:12px;overflow:hidden;"><tr>';
        if (cimg) out += '<td width="130" valign="top" class="m-hide"><a href="' + escHtml(curl) + '" target="_blank"><img src="' + escHtml(cimg) + '" alt="" width="130" height="73" style="display:block;width:130px;height:73px;object-fit:cover;"></a></td>';
        out += '<td valign="top" style="padding:14px 16px;font-family:' + F + ';">';
        if (badge) out += emailBadge(badge) + '<br>';
        out += '<a href="' + escHtml(curl) + '" target="_blank" style="font-size:14px;font-weight:700;color:#1a1a2e;text-decoration:none;line-height:1.4;font-family:' + F + ';">' + escHtml((c.title || '').substring(0, 65)) + '</a>';
        var meta = [];
        if (c.rating) meta.push('⭐ ' + Number(c.rating).toFixed(1));
        if (c.contentLength) meta.push('⏱️ ' + formatDuration(c.contentLength));
        if (c.instructor) meta.push('👤 ' + escHtml((c.instructor || '').substring(0, 25)));
        if (c.difficulty) meta.push('📊 ' + mapDifficulty(c.difficulty));
        if (meta.length > 0) out += '<p style="margin:5px 0 0;font-size:11px;color:#9090aa;line-height:1.5;font-family:' + F + ';">' + meta.join(' · ') + '</p>';
        if (cmt) out += '<p style="margin:8px 0 0;font-size:12px;color:#4a4a6a;background:#f5f3ff;padding:8px 10px;border-radius:8px;border-left:3px solid #a78bfa;line-height:1.6;font-family:' + F + ';">💡 ' + escHtml(cmt.substring(0, 120)) + '</p>';
        out += '<a href="' + escHtml(curl) + '" target="_blank" style="display:inline-block;margin-top:8px;font-size:12px;color:#7c6cf0;text-decoration:none;font-weight:600;font-family:' + F + ';">지금 수강하기 →</a>';
        out += '</td></tr></table></td></tr>\n';
      }
      return out;
    }

    function curList(cData) {
      var ids = cData.courseIds || []; var comments = cData.courseComments || {}; var badges = cData.courseBadges || {}; var out = '';
      for (var ci = 0; ci < ids.length; ci++) {
        var c = coursesMap[String(ids[ci])]; if (!c) continue;
        var curl = emailCourseUrl(c.url || c.slug, sub); var badge = badges[ids[ci]]; var cmt = emailGetComment(comments[ids[ci]]);
        out += '<tr><td style="padding:0 32px 6px;font-family:' + F + ';" class="m-pad"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-bottom:1px solid #f0eeff;"><tr>';
        out += '<td width="40" valign="top" style="padding:14px 0;font-family:' + F + ';"><span style="font-size:18px;font-weight:900;color:#7c6cf0;font-family:' + F + ';">' + String(ci + 1).padStart(2, '0') + '</span></td>';
        out += '<td valign="top" style="padding:14px 0 14px 8px;font-family:' + F + ';">';
        if (badge) out += emailBadge(badge) + '<br>';
        out += '<a href="' + escHtml(curl) + '" target="_blank" style="font-size:14px;font-weight:700;color:#1a1a2e;text-decoration:none;line-height:1.4;font-family:' + F + ';">' + escHtml((c.title || '').substring(0, 70)) + '</a>';
        var meta = [];
        if (c.rating) meta.push('⭐ ' + Number(c.rating).toFixed(1));
        if (c.contentLength) meta.push('⏱️ ' + formatDuration(c.contentLength));
        if (c.difficulty) meta.push('📊 ' + mapDifficulty(c.difficulty));
        if (c.instructor) meta.push('👤 ' + escHtml((c.instructor || '').substring(0, 25)));
        if (meta.length > 0) out += '<p style="margin:5px 0 0;font-size:11px;color:#9090aa;line-height:1.5;font-family:' + F + ';">' + meta.join(' · ') + '</p>';
        if (cmt) out += '<p style="margin:8px 0 0;font-size:12px;color:#4a4a6a;background:#f5f3ff;padding:8px 10px;border-radius:8px;border-left:3px solid #a78bfa;line-height:1.6;font-family:' + F + ';">💡 ' + escHtml(cmt.substring(0, 150)) + '</p>';
        out += '<a href="' + escHtml(curl) + '" target="_blank" style="display:inline-block;margin-top:8px;padding:6px 16px;background:#7c6cf0;color:#ffffff;text-decoration:none;border-radius:18px;font-size:12px;font-weight:600;font-family:' + F + ';">지금 바로 시작하기 →</a>';
        out += '</td></tr></table></td></tr>\n';
        if (ci === 2 && ids.length > 4) {
          out += '<tr><td style="padding:12px 32px;font-family:' + F + ';" class="m-pad"><div style="background:#f5f3ff;border:1px solid #f0eeff;border-radius:12px;padding:16px;text-align:center;">';
          out += '<p style="margin:0 0 10px;font-size:13px;color:#4a4a6a;font-family:' + F + ';">💡 지금 바로 학습장에서 무료로 수강하세요!</p>';
          out += '<a href="' + escHtml(campusUrl) + '" target="_blank" style="display:inline-block;padding:10px 24px;background:#7c6cf0;color:#ffffff;text-decoration:none;border-radius:20px;font-size:13px;font-weight:700;font-family:' + F + ';">🚀 학습장 바로가기 →</a></div></td></tr>\n';
        }
      }
      return out;
    }

    // 인사이트
    if (letter.insight) {
      h += secHead('CONTENT 1', '📊', '트렌드 인사이트');
      h += secImg(letter.insight.image);
      if (letter.insight.pages) {
        for (var pi = 0; pi < letter.insight.pages.length; pi++) {
          var ph = emailCleanHtml(letter.insight.pages[pi].html_ko || '');
          if (ph.replace(/<[^>]*>/g, '').trim()) h += '<tr><td style="padding:0 32px 16px;font-family:' + F + ';" class="m-pad"><div style="background:#ffffff;border:1px solid #f0eeff;border-radius:12px;padding:24px;border-top:4px solid #7c6cf0;">' + ph + '</div></td></tr>\n';
        }
      }
      if (letter.insight.courseIds && letter.insight.courseIds.length > 0) h += courseCards(letter.insight);
    }

    // 신규
    if (letter.newContent) {
      h += divider() + secHead('CONTENT 2', '✨', '신규 콘텐츠');
      h += secImg(letter.newContent.image);
      if (letter.newContent.editorHtml && letter.newContent.editorHtml.ko) {
        var nh = emailCleanHtml(letter.newContent.editorHtml.ko);
        if (nh.replace(/<[^>]*>/g, '').trim()) h += '<tr><td style="padding:0 32px 16px;font-family:' + F + ';" class="m-pad"><div style="background:#ffffff;border:1px solid #f0eeff;border-radius:12px;padding:24px;">' + nh + '</div></td></tr>\n';
      }
      if (letter.newContent.courseIds && letter.newContent.courseIds.length > 0) h += courseCards(letter.newContent);
      if (letter.newContent.summary && letter.newContent.summary.ko) h += '<tr><td style="padding:0 32px 16px;font-family:' + F + ';" class="m-pad"><div style="background:#f5f3ff;border-radius:12px;padding:16px;text-align:center;"><p style="margin:0;font-size:14px;color:#4a4a6a;line-height:1.7;font-family:' + F + ';">' + escHtml(letter.newContent.summary.ko) + '</p></div></td></tr>\n';
    }

    // 큐레이션
    if (letter.curation) {
      h += divider() + secHead('CONTENT 3', '🎯', '이달의 큐레이션');
      h += secImg(letter.curation.image);
      if ((letter.curation.intro && letter.curation.intro.ko) || (letter.curation.tags && letter.curation.tags.length > 0)) {
        h += '<tr><td style="padding:0 32px 16px;font-family:' + F + ';" class="m-pad"><div style="background:#ffffff;border:1px solid #f0eeff;border-radius:12px;padding:20px;border-left:4px solid #7c6cf0;">';
        if (letter.curation.intro && letter.curation.intro.ko) h += '<p style="margin:0 0 12px;font-size:14px;color:#4a4a6a;line-height:1.7;font-family:' + F + ';">' + escHtml(letter.curation.intro.ko) + '</p>';
        if (letter.curation.tags && letter.curation.tags.length > 0) {
          h += '<div style="margin-top:8px;">';
          for (var ti = 0; ti < letter.curation.tags.length; ti++) {
            var tagT = typeof letter.curation.tags[ti] === 'string' ? letter.curation.tags[ti] : (letter.curation.tags[ti].ko || '');
            h += '<span style="display:inline-block;padding:5px 14px;background:#7c6cf0;color:#ffffff;border-radius:20px;font-size:12px;font-weight:600;margin:0 6px 6px 0;font-family:' + F + ';">' + escHtml(tagT) + '</span>';
          }
          h += '</div>';
        }
        h += '</div></td></tr>\n';
      }
      if (letter.curation.courseIds && letter.curation.courseIds.length > 0) h += curList(letter.curation);
      h += '<tr><td style="padding:0 32px 8px;text-align:center;font-family:' + F + ';" class="m-pad"><p style="margin:0;font-size:12px;color:#9090aa;background:#f5f3ff;padding:10px;border-radius:8px;font-family:' + F + ';">💡 강의명을 클릭하면 해당 강의 페이지로 연결됩니다.</p></td></tr>\n';
    }

    // 홍보
    if (letter.promo && letter.promo.pages) {
      var hasP = false;
      for (var pi2 = 0; pi2 < letter.promo.pages.length; pi2++) { if (letter.promo.pages[pi2].html_ko && letter.promo.pages[pi2].html_ko.replace(/<[^>]*>/g, '').trim()) hasP = true; }
      if (hasP) {
        h += divider() + secHead('PROMOTION', '📢', '홍보');
        for (var pi3 = 0; pi3 < letter.promo.pages.length; pi3++) {
          var proH = emailCleanHtml(letter.promo.pages[pi3].html_ko || '');
          if (proH.replace(/<[^>]*>/g, '').trim()) h += '<tr><td style="padding:0 32px 16px;font-family:' + F + ';" class="m-pad"><div style="background:#ffffff;border:1px solid #f0eeff;border-radius:12px;padding:24px;">' + proH + '</div></td></tr>\n';
        }
      }
    }

    // CTA
    h += '<tr><td style="padding:24px 32px;font-family:' + F + ';" class="m-pad"><div style="background:#f5f3ff;border:1px solid #f0eeff;border-radius:16px;padding:28px;text-align:center;">';
    h += '<p style="margin:0 0 16px;font-size:15px;color:#4a4a6a;font-family:' + F + ';">이번 달 추천 강의가 마음에 드셨나요?</p>';
    h += '<a href="' + escHtml(campusUrl) + '" target="_blank" style="display:inline-block;padding:14px 32px;background:#7c6cf0;color:#ffffff;text-decoration:none;border-radius:28px;font-size:15px;font-weight:700;font-family:' + F + ';">🚀 학습장 바로가기 →</a></div></td></tr>\n';

    // 마무리
    var closingMsg = (letter.closing && letter.closing.message && letter.closing.message.ko) ? letter.closing.message.ko : '';
    h += '<tr><td style="padding:40px 32px;background:#f5f3ff;border-top:2px solid #7c6cf0;text-align:center;font-family:' + F + ';" class="m-pad">';
    if (letter.closing && letter.closing.image) h += '<img src="' + escHtml(emailAbsUrl(letter.closing.image)) + '" alt="" width="200" style="display:block;max-width:200px;margin:0 auto 20px;border-radius:12px;">';
    h += '<p style="margin:0 0 8px;font-size:28px;line-height:1;">📮</p>';
    h += '<p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#7c6cf0;font-family:' + F + ';">Udemy Letter</p>';
    if (closingMsg) h += '<div style="margin:16px auto;max-width:480px;font-size:13px;color:#9090aa;line-height:1.8;font-family:' + F + ';">' + emailCleanHtml(closingMsg) + '</div>';
    else h += '<p style="margin:16px 0 0;font-size:13px;color:#9090aa;line-height:1.8;font-family:' + F + ';">매월 변화하는 업무 환경과 학습 트렌드에 맞춰,<br>바로 실무에 적용할 수 있는 콘텐츠와 인사이트를 엄선해 소개드립니다.</p>';
    h += '</td></tr>\n';

    // 푸터
    h += '<tr><td style="padding:20px 32px;text-align:center;background:#ffffff;border-top:1px solid #f0eeff;font-family:' + F + ';" class="m-pad">';
    h += '<p style="margin:0 0 8px;font-size:12px;color:#9090aa;font-family:' + F + ';">Udemy Letter | 웅진씽크빅 © 2026</p>';
    h += '<p style="margin:0;"><a href="#unsubscribe" style="font-size:11px;color:#9090aa;text-decoration:underline;font-family:' + F + ';">수신거부</a></p></td></tr>\n';

    // 닫기
    h += '</table>\n<!--[if mso]></td></tr></table><![endif]-->\n</td></tr></table>\n</body>\n</html>';
    return h;
  }

})();
