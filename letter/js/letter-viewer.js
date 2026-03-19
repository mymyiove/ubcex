(function() {

  var API_BASE = '/api';
  var WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
  var WORKER_SECRET = 'gogo1014';
  var EXPLORER_BASE = 'https://ubcexp.pages.dev';

  var DEFAULT_IMAGES = {
    cover: 'src/img/Brand_Launch.jpg',
    insight: 'src/img/Global_Learning.png',
    newContent: 'src/img/Instructor_Journey.jpg',
    curation: 'src/img/Learning_at_Home.jpg',
    closing: 'src/img/Brand_Launch_2.png'
  };

  var params = new URLSearchParams(window.location.search);
  var sub = params.get('sub') || '';
  var lang = params.get('lang') || 'ko';
  var month = params.get('m') || '';
  var baseUrl = sub ? 'https://' + sub + '.udemy.com/course/' : '#';
  var campusUrl = sub ? 'https://' + sub + '.udemy.com' : 'https://www.udemy.com';
  var explorerUrl = EXPLORER_BASE + (sub ? '?sub=' + sub : '');

  var letterData = null;
  var courseDataMap = {};

  var LOADING_STEPS = [
    { icon: '📬', text: '우편함을 여는 중...' },
    { icon: '✉️', text: '봉투를 뜯는 중...' },
    { icon: '📄', text: '편지지를 꺼내는 중...' },
    { icon: '📖', text: '펼치는 중...' }
  ];

  function showLoadingSequence() {
    var el = document.getElementById('letter-loading');
    el.innerHTML = '<div class="letter-loading">' +
      '<div class="letter-loading-icon" id="loading-icon">📬</div>' +
      '<div class="letter-loading-text" id="loading-text">우편함을 여는 중...</div>' +
      '<div class="letter-loading-bar"><div class="letter-loading-fill" id="loading-fill"></div></div>' +
      '</div>';

    var step = 0;
    var interval = setInterval(function() {
      step++;
      if (step >= LOADING_STEPS.length) { clearInterval(interval); return; }
      var s = LOADING_STEPS[step];
      var icon = document.getElementById('loading-icon');
      var text = document.getElementById('loading-text');
      var fill = document.getElementById('loading-fill');
      if (icon) icon.textContent = s.icon;
      if (text) text.textContent = s.text;
      if (fill) fill.style.width = ((step + 1) / LOADING_STEPS.length * 100) + '%';
    }, 600);
  }

  function showError(msg) {
    document.getElementById('letter-loading').innerHTML =
      '<div class="letter-loading"><div class="letter-loading-icon">😢</div><div class="letter-loading-text">' + msg + '</div></div>';
  }

  // === Load ===
  loadLetter();

  function loadLetter() {
    showLoadingSequence();
    var endpoint = month ? '/letter-get?month=' + month : '/letter-get';
    fetch(API_BASE + endpoint)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.success || !res.data) { showError('레터를 찾을 수 없습니다.'); return; }
        letterData = res.data;
        document.title = 'Udemy Letter \u2014 ' + letterData.month;

        var allIds = [];
        if (letterData.insight && letterData.insight.courseIds) allIds = allIds.concat(letterData.insight.courseIds);
        if (letterData.newContent && letterData.newContent.courseIds) allIds = allIds.concat(letterData.newContent.courseIds);
        if (letterData.curation && letterData.curation.courseIds) allIds = allIds.concat(letterData.curation.courseIds);

        if (allIds.length > 0) {
          loadCourseData(allIds).then(function() { renderLetter(); });
        } else {
          renderLetter();
        }
      })
      .catch(function(e) { showError('로드 실패: ' + e.message); });
  }

  function loadCourseData(ids) {
    return fetch(WORKER_URL + '/status', { headers: { 'Authorization': 'Bearer ' + WORKER_SECRET } })
      .then(function(r) { return r.json(); })
      .then(function(status) {
        var tc = status.totalChunks || 0;
        var promises = [];
        for (var i = 0; i < tc; i++) {
          promises.push(
            fetch(WORKER_URL + '/get-courses?chunk=' + i, { headers: { 'Authorization': 'Bearer ' + WORKER_SECRET } })
              .then(function(r) { return r.ok ? r.json() : []; }).catch(function() { return []; })
          );
        }
        return Promise.all(promises);
      })
      .then(function(results) {
        var all = [];
        for (var i = 0; i < results.length; i++) {
          if (Array.isArray(results[i])) all = all.concat(results[i]);
        }
        for (var i = 0; i < ids.length; i++) {
          for (var j = 0; j < all.length; j++) {
            if (String(all[j].id) === String(ids[i])) {
              courseDataMap[ids[i]] = all[j];
              break;
            }
          }
        }
      }).catch(function() {});
  }

  // === Render ===
  function renderLetter() {
    var d = letterData;
    var L = lang;
    var html = '';

    // Cover
    var coverImg = d.coverImage || DEFAULT_IMAGES.cover;
    html += '<section class="cover-section"><div class="cover-inner">';
    html += '<div class="cover-image"><img src="' + esc(coverImg) + '" alt="Cover" /></div>';
    html += '<div class="cover-badge">' + d.month + (L === 'en' ? ' Issue' : '\ud638') + '</div>';
    html += '<h1 class="cover-title">' + t(d.title) + '</h1>';
    html += '<p class="cover-subtitle">' + t(d.subtitle) + '</p>';
    html += '<p class="cover-company" id="company-greeting">' + getGreeting() + '</p>';
    html += '<p class="cover-reading-time">' + t(d.readingTime) + '</p>';
    html += '</div></section>';

    // Nav items
    var navItems = [];
    if (d.insight) navItems.push({ id: 'section-insight', num: '01', icon: '📊', ko: '트렌드 인사이트', en: 'Trend Insights' });
    if (d.newContent) navItems.push({ id: 'section-new', num: '02', icon: '✨', ko: '신규 콘텐츠', en: 'New Content' });
    if (d.curation) navItems.push({ id: 'section-curation', num: '03', icon: '🎯', ko: '이달의 큐레이션', en: 'Monthly Curation' });
    if (d.promo && d.promo.pages && d.promo.pages.length > 0) {
      var hasPromo = false;
      for (var i = 0; i < d.promo.pages.length; i++) {
        if (d.promo.pages[i].html_ko && d.promo.pages[i].html_ko.replace(/<[^>]*>/g, '').trim()) { hasPromo = true; break; }
      }
      if (hasPromo) navItems.push({ id: 'section-promo', num: String(navItems.length + 1).padStart(2, '0'), icon: '📢', ko: '홍보', en: 'Promotion' });
    }

    // INDEX
    html += '<section class="index-section"><div class="section-label">INDEX</div><div class="index-grid">';
    for (var i = 0; i < navItems.length; i++) {
      var n = navItems[i];
      html += '<a href="#' + n.id + '" class="index-card"><span class="index-num">' + n.num + '</span><span class="index-icon">' + n.icon + '</span><span class="index-title">' + (L === 'en' ? n.en : n.ko) + '</span></a>';
    }
    html += '</div></section>';

    // Insight
    if (d.insight) {
      html += '<section class="content-section" id="section-insight">';
      html += sectionHeader('CONTENT 1', '📊', L === 'en' ? 'Trend Insights' : '트렌드 인사이트');
      var insImg = d.insight.image || DEFAULT_IMAGES.insight;
      if (insImg) html += '<div class="section-illustration"><img src="' + esc(insImg) + '" alt="" /></div>';
      if (d.insight.pages) {
        for (var i = 0; i < d.insight.pages.length; i++) {
          var ph = d.insight.pages[i]['html_' + L] || d.insight.pages[i].html_ko || '';
          if (ph && ph.replace(/<[^>]*>/g, '').trim()) html += '<div class="insight-card">' + ph + '</div>';
        }
      }
      if (d.insight.courseIds && d.insight.courseIds.length > 0) html += renderCourseSection(d.insight);
      html += '</section>';
    }

    // New Content
    if (d.newContent) {
      html += '<section class="content-section" id="section-new">';
      html += sectionHeader('CONTENT 2', '✨', L === 'en' ? 'New Content' : '신규 콘텐츠');
      var newImg = d.newContent.image || DEFAULT_IMAGES.newContent;
      if (newImg) html += '<div class="section-illustration"><img src="' + esc(newImg) + '" alt="" /></div>';
      if (d.newContent.editorHtml) {
        var eh = d.newContent.editorHtml[L] || d.newContent.editorHtml.ko || '';
        if (eh && eh.replace(/<[^>]*>/g, '').trim()) html += '<div class="insight-card">' + eh + '</div>';
      }
      if (d.newContent.courseIds && d.newContent.courseIds.length > 0) html += renderCourseSection(d.newContent);
      if (d.newContent.summary && t(d.newContent.summary)) html += '<div class="new-summary">' + t(d.newContent.summary) + '</div>';
      html += ctaBanner(L === 'en' ? '✨ Curious about new courses?' : '✨ 신규 강의가 궁금하시다면?');
      html += '</section>';
    }

    // Curation
    if (d.curation) {
      html += '<section class="content-section" id="section-curation">';
      html += sectionHeader('CONTENT 3', '🎯', L === 'en' ? 'Monthly Curation' : '이달의 큐레이션');
      var curImg = d.curation.image || DEFAULT_IMAGES.curation;
      if (curImg) html += '<div class="curation-banner-image"><img src="' + esc(curImg) + '" alt="" /></div>';
      if (d.curation.intro || (d.curation.tags && d.curation.tags.length > 0)) {
        html += '<div class="curation-header">';
        if (d.curation.intro) html += '<h3>' + t(d.curation.intro) + '</h3>';
        if (d.curation.tags && d.curation.tags.length > 0) {
          html += '<div class="curation-tags">';
          for (var i = 0; i < d.curation.tags.length; i++) html += '<span class="curation-tag">' + t(d.curation.tags[i]) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }
      if (d.curation.courseIds && d.curation.courseIds.length > 0) {
        html += '<div class="curation-list">' + renderCurationList(d.curation) + '</div>';
      }
      html += '<p class="curation-note">💡 ' + (L === 'en' ? 'Click a course title to visit the course page.' : '강의명을 클릭하면 해당 강의 페이지로 연결됩니다.') + '</p>';
      html += ctaBanner(L === 'en' ? '🎯 Enjoyed this month\'s picks?' : '🎯 이번 달 추천 강의가 마음에 드셨나요?');
      html += '</section>';
    }

    // Promo
    if (d.promo && d.promo.pages && d.promo.pages.length > 0) {
      var hasPromo = false;
      for (var i = 0; i < d.promo.pages.length; i++) {
        if (d.promo.pages[i].html_ko && d.promo.pages[i].html_ko.replace(/<[^>]*>/g, '').trim()) { hasPromo = true; break; }
      }
      if (hasPromo) {
        html += '<section class="content-section" id="section-promo">';
        html += sectionHeader('CONTENT ' + navItems.length, '📢', L === 'en' ? 'Promotion' : '홍보');
        for (var i = 0; i < d.promo.pages.length; i++) {
          var ph = d.promo.pages[i]['html_' + L] || d.promo.pages[i].html_ko || '';
          if (ph && ph.replace(/<[^>]*>/g, '').trim()) html += '<div class="insight-card">' + ph + '</div>';
        }
        html += '</section>';
      }
    }

    // Closing template (always)
    html += '<section class="closing-template">';
    html += '<div class="closing-inner" style="max-width:780px;margin:0 auto;">';
    var closingImg = (d.closing && d.closing.image) || DEFAULT_IMAGES.closing;
    if (closingImg) html += '<div class="closing-illustration"><img src="' + esc(closingImg) + '" alt="" /></div>';
    if (d.closing && d.closing.message) {
      var cm = d.closing.message[L] || d.closing.message.ko || '';
      if (cm && cm.replace(/<[^>]*>/g, '').trim()) html += '<div style="margin-bottom:2rem;">' + cm + '</div>';
    }
    html += '<span class="closing-emoji">📮</span>';
    if (L === 'en') {
      html += '<h2>About Udemy Letter</h2>';
      html += '<p>Every month, we curate the latest learning trends and practical courses<br>to help you grow faster and work smarter.</p>';
      html += '<p>Udemy Letter delivers curated insights and top courses<br>directly to you \u2014 so you never miss what matters.</p>';
      html += '<p style="font-weight:700;font-size:1rem;margin-top:1.5rem;">See you next month! 🚀</p>';
    } else {
      html += '<h2>Udemy Letter\ub294</h2>';
      html += '<p>\ub9e4\uc6d4 \ubcc0\ud654\ud558\ub294 \uc5c5\ubb34 \ud658\uacbd\uacfc \ud559\uc2b5 \ud2b8\ub80c\ub4dc\uc5d0 \ub9de\ucdb0,<br>\ubc14\ub85c \uc2e4\ubb34\uc5d0 \uc801\uc6a9\ud560 \uc218 \uc788\ub294 \ucf58\ud150\uce20\uc640 \uc778\uc0ac\uc774\ud2b8\ub97c \uc5c4\uc120\ud574 \uc18c\uac1c\ub4dc\ub9bd\ub2c8\ub2e4.</p>';
      html += '<p>\uc5ec\ub7ec\ubd84\uc758 \uc131\uc7a5\uacfc \uc131\uacfc\uc5d0 \ub3c4\uc6c0\uc774 \ub418\ub294 \uac15\uc758\ub97c \uc120\ubcc4\ud574<br>\ub354 \ube60\ub974\uace0 \ud6a8\uc728\uc801\uc778 \uc5c5\ubb34 \uc5ed\ub7c9 \ud5a5\uc0c1\uc744 \uc9c0\uc6d0\ud558\uaca0\uc2b5\ub2c8\ub2e4.</p>';
      html += '<p style="font-weight:700;font-size:1rem;margin-top:1.5rem;">\uc55e\uc73c\ub85c\ub3c4 \uc5ec\ub7ec\ubd84\uc758 \uc131\uc7a5\uc744 \ub354 \uc990\uac81\uac8c \ub9cc\ub4dc\ub294<br>Udemy Letter\ub85c \ud568\uaed8\ud558\uaca0\uc2b5\ub2c8\ub2e4. 🚀</p>';
    }
    html += '</div></section>';

    document.getElementById('letter-content').innerHTML = html;
    document.getElementById('letter-footer').style.display = '';

    buildSideNav(navItems);
    initInteractions();
  }

  // === Side Nav ===
  function buildSideNav(navItems) {
    var nav = document.getElementById('side-nav');
    var html = '';
    for (var i = 0; i < navItems.length; i++) {
      var n = navItems[i];
      html += '<a href="#' + n.id + '" class="side-nav-item" data-target="' + n.id + '">';
      html += '<span class="side-nav-icon">' + n.icon + '</span>';
      html += '<span class="side-nav-label">' + (lang === 'en' ? n.en : n.ko) + '</span>';
      html += '</a>';
    }
    nav.innerHTML = html;

    var items = nav.querySelectorAll('.side-nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.getElementById(this.getAttribute('data-target'));
        if (target) {
          var hh = document.querySelector('.letter-header');
          var offset = hh ? hh.offsetHeight + 20 : 80;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    }

    var sections = [];
    for (var i = 0; i < navItems.length; i++) {
      var el = document.getElementById(navItems[i].id);
      if (el) sections.push({ id: navItems[i].id, el: el });
    }

    window.addEventListener('scroll', function() {
      var coverEnd = document.querySelector('.index-section');
      if (coverEnd) nav.classList.toggle('visible', window.scrollY > coverEnd.offsetTop - 100);

      var scrollPos = window.scrollY + 200;
      var activeId = '';
      for (var i = 0; i < sections.length; i++) {
        if (scrollPos >= sections[i].el.offsetTop) activeId = sections[i].id;
      }
      var navItems2 = nav.querySelectorAll('.side-nav-item');
      for (var i = 0; i < navItems2.length; i++) {
        navItems2[i].classList.toggle('active', navItems2[i].getAttribute('data-target') === activeId);
      }
    });
  }

  // === Render Helpers ===
  function sectionHeader(tag, icon, title) {
    return '<div class="section-header"><div class="section-tag">' + tag + '</div><h2>' + icon + ' ' + title + '</h2></div>';
  }

  function renderCourseSection(sData) {
    var ids = sData.courseIds || [];
    var comments = sData.courseComments || {};
    var badges = sData.courseBadges || {};
    var layout = sData.layout || 'card';
    if (ids.length === 0) return '';

    var html = '';
    if (layout === 'card') {
      html += '<div class="course-grid-4">';
      for (var i = 0; i < ids.length; i++) html += renderMiniCard(ids[i], comments[ids[i]], badges[ids[i]]);
      html += '</div>';
    } else if (layout === 'highlight') {
      html += '<div class="new-highlight">';
      for (var i = 0; i < ids.length; i++) html += renderHighlightCard(ids[i], comments[ids[i]], badges[ids[i]]);
      html += '</div>';
    } else {
      for (var i = 0; i < ids.length; i++) html += renderListItem(ids[i], comments[ids[i]], badges[ids[i]], i);
    }
    return html;
  }

  function renderMiniCard(id, comment, badge) {
    var c = courseDataMap[id];
    if (!c) return '';
    var cm = getComment(comment);
    var html = '<div class="course-mini-card">';
    if (c.image) html += '<img src="' + esc(c.image) + '" alt="" />';
    if (badge) html += badgeHtml(badge);
    html += '<h4>' + esc((c.title || '').substring(0, 50)) + '</h4>';
    html += '<div style="font-size:0.72rem;color:#9090aa;margin-bottom:0.4rem;">' + metaLine(c) + '</div>';
    if (cm) html += '<div class="ai-comment">💡 ' + esc(cm) + '</div>';
    html += '<a href="' + courseUrl(c) + '" target="_blank" class="mini-link">' + (lang === 'en' ? 'Start Now \u2192' : '\uc9c0\uae08 \uc218\uac15\ud558\uae30 \u2192') + '</a>';
    html += '</div>';
    return html;
  }

  function renderHighlightCard(id, comment, badge) {
    var c = courseDataMap[id];
    if (!c) return '';
    var cm = getComment(comment);
    var html = '<div class="new-highlight-card">';
    if (badge) html += badgeHtml(badge);
    else html += '<div class="highlight-badge">🆕 NEW</div>';
    if (c.image) html += '<img src="' + esc(c.image) + '" alt="" />';
    html += '<h3>' + esc(c.title || '') + '</h3>';
    html += '<div style="font-size:0.78rem;color:#4a4a6a;margin-bottom:0.5rem;">' + metaLine(c) + '</div>';
    if (cm) html += '<p style="font-size:0.82rem;color:#4a4a6a;margin-bottom:0.8rem;">💡 ' + esc(cm) + '</p>';
    html += '<a href="' + courseUrl(c) + '" target="_blank" class="mini-link">' + (lang === 'en' ? 'Enroll \u2192' : '\uc218\uac15\ud558\uae30 \u2192') + '</a>';
    html += '</div>';
    return html;
  }

  function renderListItem(id, comment, badge, idx) {
    var c = courseDataMap[id];
    if (!c) return '';
    var cm = getComment(comment);
    var html = '<div class="curation-rich-item">';
    html += '<div class="curation-rank">' + String(idx + 1).padStart(2, '0') + '</div>';
    html += '<div class="curation-rich-info">';
    if (badge) html += badgeHtml(badge);
    html += '<a href="' + courseUrl(c) + '" target="_blank" class="curation-rich-title">' + esc(c.title || '') + '</a>';
    html += '<div class="curation-rich-meta">' + metaSpans(c) + '</div>';
    if (cm) html += '<div class="curation-rich-comment">' + esc(cm) + '</div>';
    html += '<a href="' + courseUrl(c) + '" target="_blank" class="curation-rich-cta">' + (lang === 'en' ? 'Start Now \u2192' : '\uc9c0\uae08 \ubc14\ub85c \uc2dc\uc791\ud558\uae30 \u2192') + '</a>';
    html += '</div></div>';
    return html;
  }

  function renderCurationList(cData) {
    var ids = cData.courseIds || [];
    var comments = cData.courseComments || {};
    var badges = cData.courseBadges || {};
    var html = '';
    for (var i = 0; i < ids.length; i++) {
      html += renderListItem(ids[i], comments[ids[i]], badges[ids[i]], i);
      if (i === 2 && ids.length > 4) {
        html += ctaBanner(lang === 'en' ? '💡 Take courses for free!' : '💡 \uc9c0\uae08 \ubc14\ub85c \ud559\uc2b5\uc7a5\uc5d0\uc11c \ubb34\ub8cc\ub85c \uc218\uac15\ud558\uc138\uc694!');
      }
    }
    return html;
  }

  function ctaBanner(text) {
    var L = lang;
    return '<div class="cta-banner"><p>' + text + '</p>' +
      '<div class="cta-buttons-row">' +
      '<a href="' + campusUrl + '" target="_blank" class="cta-primary">🚀 ' + (L === 'en' ? 'Learning Hub' : '\ud559\uc2b5\uc7a5 \ubc14\ub85c\uac00\uae30') + ' <span class="cta-arrow">\u2192</span></a>' +
      '<a href="' + explorerUrl + '" target="_blank" class="btn-explorer">🔭 ' + (L === 'en' ? 'Explore Courses' : '\uac15\uc758 \ud0d0\ud5d8\ud558\uae30') + '</a>' +
      '</div></div>';
  }

  // === Interactions ===
  function initInteractions() {
    var cIds = ['btn-campus', 'btn-campus-bottom'];
    for (var i = 0; i < cIds.length; i++) {
      var el = document.getElementById(cIds[i]);
      if (el) { el.href = campusUrl; el.target = '_blank'; }
    }

    var expBtn = document.getElementById('btn-explorer');
    if (expBtn) { expBtn.href = explorerUrl; expBtn.target = '_blank'; }

    var pdfBtns = document.querySelectorAll('#btn-pdf, #btn-pdf-bottom');
    for (var i = 0; i < pdfBtns.length; i++) {
      pdfBtns[i].addEventListener('click', function() {
        var fn = (sub || 'general') + '_Udemy_Letter_' + (letterData ? letterData.month.replace('-', '') : '') + '.pdf';
        document.title = fn.replace('.pdf', '');
        alert((lang === 'en' ? 'Select "Save as PDF".\nFilename: ' : 'PDF\ub85c \uc800\uc7a5\uc744 \uc120\ud0dd\ud558\uc138\uc694.\n\ud30c\uc77c\uba85: ') + fn);
        window.print();
        setTimeout(function() { document.title = 'Udemy Letter'; }, 1000);
      });
    }

    var unsub = document.getElementById('btn-unsubscribe');
    if (unsub) unsub.addEventListener('click', function(e) {
      e.preventDefault();
      if (confirm(lang === 'en' ? 'Unsubscribe?' : '\uc218\uc2e0\uac70\ubd80 \ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?')) {
        alert(lang === 'en' ? 'Done.' : '\ucc98\ub9ac\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
      }
    });

    var idxCards = document.querySelectorAll('.index-card');
    for (var i = 0; i < idxCards.length; i++) {
      idxCards[i].addEventListener('click', function(e) {
        e.preventDefault();
        var tgt = document.querySelector(this.getAttribute('href'));
        if (tgt) {
          var hh = document.querySelector('.letter-header');
          window.scrollTo({ top: tgt.getBoundingClientRect().top + window.scrollY - (hh ? hh.offsetHeight + 20 : 80), behavior: 'smooth' });
        }
      });
    }

    // Language toggle - Google Translate live translation
    var isTranslated = false;
    var originalTexts = [];

    var lBtns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < lBtns.length; i++) {
      lBtns[i].addEventListener('click', function() {
        var nl = this.getAttribute('data-lang');

        for (var j = 0; j < lBtns.length; j++) lBtns[j].classList.remove('active');
        this.classList.add('active');

        if (nl === 'en' && !isTranslated) {
          translatePageToEnglish();
        } else if (nl === 'ko' && isTranslated) {
          restoreOriginal();
        }
      });
    }

    function translatePageToEnglish() {
      var targets = document.querySelectorAll('#letter-content h1, #letter-content h2, #letter-content h3, #letter-content p, #letter-content span.index-title, #letter-content span.curation-tag, #letter-content .curation-rich-comment, #letter-content .curation-note, #letter-content .ai-comment, #letter-content .cover-subtitle, #letter-content .cover-company, #letter-content .cover-reading-time, #letter-content .cover-badge, #letter-content .new-summary');

      var toTranslate = [];
      originalTexts = [];

      for (var i = 0; i < targets.length; i++) {
        var text = targets[i].textContent.trim();
        if (!text || text.length < 2) continue;
        var koChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
        if (koChars < text.length * 0.2) continue;
        toTranslate.push({ el: targets[i], text: text, origHtml: targets[i].innerHTML });
        originalTexts.push({ el: targets[i], html: targets[i].innerHTML });
      }

      if (toTranslate.length === 0) return;

      var separator = '\n\u00a7\u00a7\u00a7\n';
      var combinedText = '';
      for (var i = 0; i < toTranslate.length; i++) {
        if (i > 0) combinedText += separator;
        combinedText += toTranslate[i].text.substring(0, 1000);
      }

      var chunks = [];
      if (combinedText.length <= 4000) {
        chunks.push({ text: combinedText, items: toTranslate });
      } else {
        var currentChunk = '';
        var currentItems = [];
        for (var i = 0; i < toTranslate.length; i++) {
          var addition = (currentItems.length > 0 ? separator : '') + toTranslate[i].text.substring(0, 1000);
          if (currentChunk.length + addition.length > 4000 && currentItems.length > 0) {
            chunks.push({ text: currentChunk, items: currentItems.slice() });
            currentChunk = toTranslate[i].text.substring(0, 1000);
            currentItems = [toTranslate[i]];
          } else {
            currentChunk += addition;
            currentItems.push(toTranslate[i]);
          }
        }
        if (currentItems.length > 0) chunks.push({ text: currentChunk, items: currentItems });
      }

      var translateChunk = function(chunk) {
        return fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(chunk.text))
          .then(function(res) { return res.json(); })
          .then(function(data) {
            var fullTranslation = '';
            if (data && data[0]) {
              for (var j = 0; j < data[0].length; j++) {
                if (data[0][j] && data[0][j][0]) fullTranslation += data[0][j][0];
              }
            }
            return { items: chunk.items, translation: fullTranslation };
          })
          .catch(function() { return { items: chunk.items, translation: '' }; });
      };

      var promises = [];
      for (var i = 0; i < chunks.length; i++) {
        promises.push(translateChunk(chunks[i]));
      }

      Promise.all(promises).then(function(results) {
        for (var r = 0; r < results.length; r++) {
          var result = results[r];
          if (!result.translation) continue;
          var parts = result.translation.split(/\u00a7\u00a7\u00a7/);
          for (var i = 0; i < Math.min(parts.length, result.items.length); i++) {
            var tr = parts[i].trim();
            if (tr) {
              result.items[i].el.textContent = tr;
            }
          }
        }
        isTranslated = true;
        showToast('🌐 English translation applied!');
      });
    }

    function restoreOriginal() {
      for (var i = 0; i < originalTexts.length; i++) {
        originalTexts[i].el.innerHTML = originalTexts[i].html;
      }
      isTranslated = false;
      originalTexts = [];
      showToast('🇰🇷 한국어로 복원!');
    }

    function showToast(msg) {
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;bottom:2rem;right:2rem;padding:0.8rem 1.5rem;background:#1a1a2e;color:white;border-radius:10px;font-size:0.85rem;z-index:1000;';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 3000);
    }

    var pBar = document.getElementById('scroll-progress');
    var hdr = document.getElementById('letter-header');
    var topBtn = document.getElementById('scroll-to-top');
    if (topBtn) topBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    var tk = false;
    window.addEventListener('scroll', function() {
      if (!tk) {
        requestAnimationFrame(function() {
          var st = window.scrollY;
          var dh = document.documentElement.scrollHeight - window.innerHeight;
          if (pBar && dh > 0) pBar.style.width = Math.min((st / dh) * 100, 100) + '%';
          if (hdr) hdr.classList.toggle('scrolled', st > 50);
          if (topBtn) topBtn.classList.toggle('visible', st > 400);
          tk = false;
        });
        tk = true;
      }
    });

    var aEls = document.querySelectorAll('.content-section, .index-card, .insight-card, .course-mini-card, .new-highlight-card, .curation-rich-item, .closing-template, .cta-banner, .curation-header, .new-summary, .section-illustration, .closing-illustration, .curation-banner-image');
    for (var i = 0; i < aEls.length; i++) aEls[i].classList.add('animate-on-scroll');

    var cItems = document.querySelectorAll('.curation-rich-item');
    for (var i = 0; i < cItems.length; i++) cItems[i].style.transitionDelay = (i * 0.06) + 's';

    var obs = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) entries[i].target.classList.add('visible');
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

    var sEls = document.querySelectorAll('.animate-on-scroll');
    for (var i = 0; i < sEls.length; i++) obs.observe(sEls[i]);
  }

  // === Utils ===
  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.ko || '';
  }

  function getGreeting() {
    if (sub) {
      return lang === 'en'
        ? 'This month\'s letter for ' + sub.toUpperCase() + ' learners'
        : sub.toUpperCase() + ' \ud559\uc2b5\uc790\ub2d8\uc744 \uc704\ud55c \uc774\ub2ec\uc758 \ub808\ud130';
    }
    return lang === 'en' ? 'This month\'s letter for learners' : '\ud559\uc2b5\uc790\ub2d8\uc744 \uc704\ud55c \uc774\ub2ec\uc758 \ub808\ud130';
  }

  function courseUrl(c) {
    if (!sub) return '#';
    var s = c.url || c.slug || '';
    if (s) {
      if (s.indexOf('http') === 0) return s.replace('www.udemy.com', sub + '.udemy.com');
      return baseUrl + s + '/';
    }
    return campusUrl;
  }

  function getComment(c) {
    if (!c) return '';
    if (typeof c === 'string') return c;
    return c[lang] || c.ko || '';
  }

  function metaLine(c) {
    var p = [];
    if (c.rating) p.push('⭐ ' + Number(c.rating).toFixed(1));
    if (c.contentLength) p.push('⏱️ ' + fmtDur(c.contentLength));
    if (c.instructor) p.push('👤 ' + c.instructor);
    if (c.difficulty) p.push('📊 ' + mapD(c.difficulty));
    return p.join(' &nbsp; ');
  }

  function metaSpans(c) {
    var p = [];
    if (c.rating) p.push('<span>⭐ ' + Number(c.rating).toFixed(1) + '</span>');
    if (c.contentLength) p.push('<span>⏱️ ' + fmtDur(c.contentLength) + '</span>');
    if (c.instructor) p.push('<span>👤 ' + esc(c.instructor) + '</span>');
    if (c.difficulty) p.push('<span>📊 ' + mapD(c.difficulty) + '</span>');
    if (c.category) p.push('<span>📂 ' + esc(c.category.split(',')[0].trim()) + '</span>');
    return p.join('');
  }

  function badgeHtml(bid) {
    var B = { 'popular': '🔥 가장 인기', 'shortest': '⚡ 가장 짧은', 'top-rated': '🏆 평점 최고', 'new': '🆕 신규', 'essential': '💼 실무 필수' };
    var cls = { 'popular': 'badge-popular', 'shortest': 'badge-shortest', 'top-rated': 'badge-top-rated', 'new': 'badge-new', 'essential': 'badge-essential' };
    if (B[bid]) return '<span class="course-badge ' + (cls[bid] || 'badge-new') + '">' + B[bid] + '</span>';
    if (bid && bid.indexOf('custom_') === 0) {
      var customs = JSON.parse(localStorage.getItem('letter_custom_badges') || '[]');
      for (var i = 0; i < customs.length; i++) {
        if (customs[i].id === bid) return '<span class="course-badge badge-new">' + esc(customs[i].ko) + '</span>';
      }
    }
    return '';
  }

  function fmtDur(m) {
    if (!m) return '';
    var h = Math.floor(m / 60);
    var mm = m % 60;
    if (h > 0 && mm > 0) return h + 'h ' + mm + 'm';
    if (h > 0) return h + 'h';
    return mm + 'm';
  }

  function mapD(d) {
    if (lang === 'en') return d || '';
    var m = { 'Beginner': '초급', 'BEGINNER': '초급', 'Intermediate': '중급', 'INTERMEDIATE': '중급', 'Expert': '고급', 'EXPERT': '고급', 'All Levels': '모든 수준', 'ALL_LEVELS': '모든 수준' };
    return m[d] || d || '';
  }

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
