(function() {

  var API_BASE = '/api';
  var ADMIN_SECRET = 'gogo1014';
  var ADMIN_CODE = 'jhj11';

  var editors = {};
  var currentMonth = null;
  var insightPageCount = 1;
  var promoPageCount = 1;

  // === Helpers ===
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
    var opts = {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    if (method === 'POST') {
      opts.headers['Authorization'] = 'Bearer ' + ADMIN_SECRET;
      opts.body = JSON.stringify(body);
    }
    return fetch(API_BASE + endpoint, opts).then(function(r) { return r.json(); });
  }

  // === Gate ===
  $('#gate-submit').addEventListener('click', function() {
    var code = $('#gate-code').value.trim();
    if (code === ADMIN_CODE) {
      $('#admin-gate').style.display = 'none';
      $('#admin-app').style.display = 'block';
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
    });
  }

  $('#btn-logout').addEventListener('click', function() {
    $('#admin-app').style.display = 'none';
    $('#admin-gate').style.display = '';
    $('#gate-code').value = '';
  });

  // === Section Card Toggle ===
  var sectionHeaders = $$('.section-card-header');
  for (var i = 0; i < sectionHeaders.length; i++) {
    sectionHeaders[i].addEventListener('click', function() {
      this.parentElement.classList.toggle('collapsed');
    });
  }

  // === Init ===
  function initAdmin() {
    initEditors();
    loadLetterList();
  }

  // === Quill Editors ===
  function initEditors() {
    var toolbarOptions = [
      [{ header: [2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ];

    editors['insight-0'] = new Quill('#insight-editor-0', {
      theme: 'snow',
      modules: { toolbar: toolbarOptions },
      placeholder: '트렌드 인사이트 내용을 입력하세요...'
    });

    editors['new'] = new Quill('#new-editor', {
      theme: 'snow',
      modules: { toolbar: toolbarOptions },
      placeholder: '신규 콘텐츠 내용을 입력하세요...'
    });

    editors['promo-0'] = new Quill('#promo-editor-0', {
      theme: 'snow',
      modules: { toolbar: toolbarOptions },
      placeholder: '홍보 내용을 입력하세요...'
    });

    editors['closing'] = new Quill('#closing-editor', {
      theme: 'snow',
      modules: { toolbar: toolbarOptions },
      placeholder: '마무리 메시지를 입력하세요...'
    });
  }

  // === Multi-page Editor ===
  function setupPageTabs(section) {
    var tabsEl = $('#' + section + '-tabs');
    var editorsEl = $('#' + section + '-editors');
    var addBtn = $('#' + section + '-add-page');
    var count = section === 'insight' ? insightPageCount : promoPageCount;

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

      var toolbarOptions = [
        [{ header: [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean']
      ];
      editors[section + '-' + idx] = new Quill('#' + section + '-editor-' + idx, {
        theme: 'snow',
        modules: { toolbar: toolbarOptions },
        placeholder: '내용을 입력하세요...'
      });

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
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-page') === String(pageIdx));
    }
    var wraps = $$('#' + section + '-editors .editor-wrap');
    for (var i = 0; i < wraps.length; i++) {
      wraps[i].style.display = wraps[i].getAttribute('data-page') === String(pageIdx) ? '' : 'none';
    }
  }

  setupPageTabs('insight');
  setupPageTabs('promo');

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
        var statusClass = 'status-' + item.status;
        var statusText = item.status === 'draft' ? '📝 초안' : item.status === 'published' ? '✅ 발행' : '📧 발송';
        html += '<div class="letter-card" data-month="' + item.month + '">';
        html += '<div class="letter-card-month">' + item.month + '</div>';
        html += '<div class="letter-card-title">' + (item.title_ko || '제목 없음') + '</div>';
        html += '<div class="letter-card-meta">';
        html += '<span class="status-badge ' + statusClass + '">' + statusText + '</span>';
        html += '<span>' + (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '') + '</span>';
        html += '</div></div>';
      }
      grid.innerHTML = html;

      var cards = $$('.letter-card');
      for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', function() {
          loadLetter(this.getAttribute('data-month'));
        });
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
      if (!res.success) { toast('레터를 불러올 수 없습니다', 'error'); return; }
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
        var tagTexts = [];
        for (var i = 0; i < d.curation.tags.length; i++) {
          tagTexts.push(d.curation.tags[i].ko || d.curation.tags[i]);
        }
        $('#f-curation-tags').value = tagTexts.join(', ');
      }

      if (d.curation && d.curation.courseIds) {
        $('#f-curation-ids').value = d.curation.courseIds.join(', ');
      }

      // Load editors
      if (d.insight && d.insight.pages && d.insight.pages.length > 0) {
        if (editors['insight-0']) {
          editors['insight-0'].root.innerHTML = d.insight.pages[0].html_ko || '';
        }
      }
      if (d.newContent && d.newContent.highlights && editors['new']) {
        var highlightHtml = '';
        for (var i = 0; i < d.newContent.highlights.length; i++) {
          highlightHtml += d.newContent.highlights[i].html_ko || '';
        }
        editors['new'].root.innerHTML = highlightHtml;
      }
      if (d.closing && d.closing.message && editors['closing']) {
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

    // Collect insight pages
    var insightPages = [];
    var insightWraps = $$('#insight-editors .editor-wrap');
    for (var i = 0; i < insightWraps.length; i++) {
      var pg = insightWraps[i].getAttribute('data-page');
      var ed = editors['insight-' + pg];
      if (ed) {
        insightPages.push({ html_ko: ed.root.innerHTML, html_en: '' });
      }
    }

    // Collect promo pages
    var promoPages = [];
    var promoWraps = $$('#promo-editors .editor-wrap');
    for (var i = 0; i < promoWraps.length; i++) {
      var pg = promoWraps[i].getAttribute('data-page');
      var ed = editors['promo-' + pg];
      if (ed) {
        promoPages.push({ html_ko: ed.root.innerHTML, html_en: '' });
      }
    }

    // Collect curation tags
    var tagsRaw = $('#f-curation-tags').value.trim();
    var tags = [];
    if (tagsRaw) {
      var parts = tagsRaw.split(',');
      for (var i = 0; i < parts.length; i++) {
        var t = parts[i].trim();
        if (t) tags.push({ ko: t, en: '' });
      }
    }

    // Collect curation course IDs
    var idsRaw = $('#f-curation-ids').value.trim();
    var courseIds = [];
    if (idsRaw) {
      var parts = idsRaw.split(',');
      for (var i = 0; i < parts.length; i++) {
        var id = parts[i].trim();
        if (id) courseIds.push(id);
      }
    }

    var body = {
      month: month,
      title_ko: $('#f-title-ko').value.trim(),
      subtitle_ko: $('#f-subtitle-ko').value.trim(),
      coverImage: $('#f-cover-image').value.trim(),
      status: $('#f-status').value,
      insight_image: $('#f-insight-image').value.trim(),
      insight_pages: insightPages,
      newContent_image: $('#f-new-image').value.trim(),
      newContent_summary_ko: $('#f-new-summary-ko').value.trim(),
      newContent_highlights: [{ html_ko: editors['new'] ? editors['new'].root.innerHTML : '', html_en: '' }],
      curation_image: $('#f-curation-image').value.trim(),
      curation_intro_ko: $('#f-curation-intro-ko').value.trim(),
      curation_tags: tags,
      curation_courseIds: courseIds,
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
      } else {
        toast('저장 실패: ' + res.error, 'error');
      }
    }).catch(function(e) {
      hideLoading();
      toast('저장 실패: ' + e.message, 'error');
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
        toast(res.message, 'success');
        currentMonth = null;
        clearEditor();
        switchPanel('list');
        loadLetterList();
      } else {
        toast('삭제 실패: ' + res.error, 'error');
      }
    });
  });

  // === Preview ===
  $('#btn-preview').addEventListener('click', function() {
    var month = $('#f-month').value.trim() || '2026-03';
    window.open('index.html?preview=true', '_blank');
  });

  // === Back to List ===
  $('#btn-back-list').addEventListener('click', function() {
    switchPanel('list');
    loadLetterList();
  });

  // === Helpers ===
  function switchPanel(name) {
    var panels = $$('.admin-panel');
    for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');
    $('#panel-' + name).classList.add('active');
    var navBtns = $$('.admin-nav-btn[data-panel]');
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].classList.toggle('active', navBtns[i].getAttribute('data-panel') === name);
    }
  }

  function clearEditor() {
    $('#f-month').value = '';
    $('#f-month').disabled = false;
    $('#f-status').value = 'draft';
    $('#f-title-ko').value = '';
    $('#f-subtitle-ko').value = '';
    $('#f-cover-image').value = '';
    $('#f-insight-image').value = '';
    $('#f-new-image').value = '';
    $('#f-new-summary-ko').value = '';
    $('#f-curation-image').value = '';
    $('#f-curation-intro-ko').value = '';
    $('#f-curation-tags').value = '';
    $('#f-curation-ids').value = '';
    $('#f-closing-image').value = '';
    $('#curation-preview').innerHTML = '';
    $('#curation-comments').innerHTML = '';

    for (var key in editors) {
      if (editors[key] && editors[key].root) {
        editors[key].root.innerHTML = '';
      }
    }
  }

})();
