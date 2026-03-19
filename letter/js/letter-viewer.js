(function() {

  var API_BASE = '/api';
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
  var isArchive = params.get('archive') === 'true';
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

  if (isArchive) {
    loadArchive();
  } else {
    loadLetter();
  }

  function loadArchive() {
    document.getElementById('letter-loading').innerHTML =
      '<div class="letter-loading"><div class="letter-loading-icon">📚</div><div class="letter-loading-text">아카이브를 불러오는 중...</div></div>';

    fetch(API_BASE + '/letter-list')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.success || res.total === 0) {
          showError('아직 발행된 레터가 없습니다.');
          return;
        }

        var html = '<section class="cover-section" style="min-height:280px;padding:3rem 2rem;">';
        html += '<div class="cover-inner">';
        html += '<span style="display:block;font-size:3rem;margin-bottom:1rem;">📚</span>';
        html += '<h1 class="cover-title" style="font-size:2rem;">Udemy Letter Archive</h1>';
        html += '<p class="cover-subtitle archive-subtitle">\uc774\uc804 \ud638 \ubaa8\uc544\ubcf4\uae30</p>';
        html += '</div></section>';

        html += '<section style="max-width:780px;margin:2rem auto;padding:0 2rem;">';
        html += '<div class="archive-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.2rem;">';

        for (var i = 0; i < res.data.length; i++) {
          var item = res.data[i];
          var statusText = item.status === 'published' ? '✅ 발행' : item.status === 'sent' ? '📧 발송' : '📝 초안';
          var link = 'index.html?m=' + item.month + (sub ? '&sub=' + sub : '');
          var dateStr = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '';

          html += '<a href="' + link + '" style="text-decoration:none;color:inherit;">';
          html += '<div class="archive-card" style="background:#fff;border:1px solid rgba(124,108,240,0.12);border-radius:20px;padding:1.8rem;transition:all 0.35s cubic-bezier(0.4,0,0.2,1);cursor:pointer;position:relative;overflow:hidden;">';
          html += '<div style="font-family:Inter,sans-serif;font-size:0.72rem;font-weight:700;color:#7c6cf0;letter-spacing:0.1em;margin-bottom:0.6rem;">' + item.month + '</div>';
          html += '<div class="archive-card-title" style="font-size:1.05rem;font-weight:700;margin-bottom:0.6rem;line-height:1.4;">' + esc(item.title_ko || '\uc81c\ubaa9 \uc5c6\uc74c') + '</div>';
          html += '<div class="archive-card-meta" style="display:flex;gap:0.8rem;font-size:0.75rem;color:#9090aa;align-items:center;">';
          html += '<span class="archive-status">' + statusText + '</span>';
          if (dateStr) html += '<span>' + dateStr + '</span>';
          if (item.lastEditor) html += '<span>✏️ ' + esc(item.lastEditor) + '</span>';
          html += '</div>';
          html += '</div></a>';
        }

        html += '</div></section>';

        document.getElementById('letter-content').innerHTML = html;
        document.getElementById('letter-footer').style.display = '';

        var archiveCards = document.querySelectorAll('.archive-card');
        for (var i = 0; i < archiveCards.length; i++) {
          archiveCards[i].addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 16px 48px rgba(124,108,240,0.16)';
          });
          archiveCards[i].addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
          });
        }

        initInteractions();
      })
      .catch(function(e) { showError('\ub85c\ub4dc \uc2e4\ud328: ' + e.message); });
  }

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
      .catch(function(e) { showError('\ub85c\ub4dc \uc2e4\ud328: ' + e.message); });
  }

  function loadCourseData(ids) {
    var idsParam = ids.join(',');
    return fetch('/api/courses-proxy?ids=' + encodeURIComponent(idsParam))
      .then(function(r) { return r.ok ? r.json() : []; })
      .then(function(courses) {
        if (!Array.isArray(courses)) return;
        for (var i = 0; i < courses.length; i++) {
          courseDataMap[String(courses[i].id)] = courses[i];
        }
      })
      .catch(function() {});
  }

  function renderLetter() {
    var d = letterData;
    var html = '';

    var coverImg = d.coverImage || DEFAULT_IMAGES.cover;
    html += '<section class="cover-section"><div class="cover-inner">';
    html += '<div class="cover-image"><img src="' + esc(coverImg) + '" alt="Cover" /></div>';
    html += '<div class="cover-badge">' + d.month + '\ud638</div>';
    html += '<h1 class="cover-title">' + t(d.title) + '</h1>';
    html += '<p class="cover-subtitle">' + t(d.subtitle) + '</p>';
    html += '<p class="cover-company" id="company-greeting">' + getGreeting() + '</p>';
    html += '<p class="cover-reading-time">' + t(d.readingTime) + '</p>';
    html += '<div class="scroll-indicator" id="scroll-down">👇</div>';
    html += '</div></section>';
    

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

    html += '<section class="index-section"><div class="section-label">INDEX</div><div class="index-grid">';
    for (var i = 0; i < navItems.length; i++) {
      var n = navItems[i];
      html += '<a href="#' + n.id + '" class="index-card"><span class="index-num">' + n.num + '</span><span class="index-icon">' + n.icon + '</span><span class="index-title">' + n.ko + '</span></a>';
    }
    html += '</div></section>';

    if (d.insight) {
      html += '<section class="content-section" id="section-insight">';
      html += sectionHeader('CONTENT 1', '📊', '트렌드 인사이트');
      var insImg = d.insight.image || DEFAULT_IMAGES.insight;
      if (insImg) html += '<div class="section-illustration"><img src="' + esc(insImg) + '" alt="" /></div>';
      if (d.insight.pages) {
        for (var i = 0; i < d.insight.pages.length; i++) {
          var ph = d.insight.pages[i].html_ko || '';
          if (ph && ph.replace(/<[^>]*>/g, '').trim()) html += '<div class="insight-card">' + ph + '</div>';
        }
      }
      if (d.insight.courseIds && d.insight.courseIds.length > 0) html += renderCourseSection(d.insight);
      html += '</section>';
    }

    if (d.newContent) {
      html += '<section class="content-section" id="section-new">';
      html += sectionHeader('CONTENT 2', '✨', '신규 콘텐츠');
      var newImg = d.newContent.image || DEFAULT_IMAGES.newContent;
      if (newImg) html += '<div class="section-illustration"><img src="' + esc(newImg) + '" alt="" /></div>';
      if (d.newContent.editorHtml) {
        var eh = d.newContent.editorHtml.ko || '';
        if (eh && eh.replace(/<[^>]*>/g, '').trim()) html += '<div class="insight-card">' + eh + '</div>';
      }
      if (d.newContent.courseIds && d.newContent.courseIds.length > 0) html += renderCourseSection(d.newContent);
      if (d.newContent.summary && t(d.newContent.summary)) html += '<div class="new-summary">' + t(d.newContent.summary) + '</div>';
      html += ctaBanner('✨ 신규 강의가 궁금하시다면?');
      html += '</section>';
    }

    if (d.curation) {
      html += '<section class="content-section" id="section-curation">';
      html += sectionHeader('CONTENT 3', '🎯', '이달의 큐레이션');
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
      html += '<p class="curation-note">💡 강의명을 클릭하면 해당 강의 페이지로 연결됩니다.</p>';
      html += ctaBanner('🎯 이번 달 추천 강의가 마음에 드셨나요?');
      html += '</section>';
    }

    if (d.promo && d.promo.pages && d.promo.pages.length > 0) {
      var hasPromo = false;
      for (var i = 0; i < d.promo.pages.length; i++) {
        if (d.promo.pages[i].html_ko && d.promo.pages[i].html_ko.replace(/<[^>]*>/g, '').trim()) { hasPromo = true; break; }
      }
      if (hasPromo) {
        html += '<section class="content-section" id="section-promo">';
        html += sectionHeader('CONTENT ' + navItems.length, '📢', '홍보');
        for (var i = 0; i < d.promo.pages.length; i++) {
          var ph = d.promo.pages[i].html_ko || '';
          if (ph && ph.replace(/<[^>]*>/g, '').trim()) html += '<div class="insight-card">' + ph + '</div>';
        }
        html += '</section>';
      }
    }

    html += '<section class="closing-template">';
    html += '<div class="closing-inner" style="max-width:780px;margin:0 auto;">';
    var closingImg = (d.closing && d.closing.image) || DEFAULT_IMAGES.closing;
    if (closingImg) html += '<div class="closing-illustration"><img src="' + esc(closingImg) + '" alt="" /></div>';
    if (d.closing && d.closing.message) {
      var cm = d.closing.message.ko || '';
      if (cm && cm.replace(/<[^>]*>/g, '').trim()) html += '<div style="margin-bottom:2rem;">' + cm + '</div>';
    }
    html += '<span class="closing-emoji">📮</span>';
    html += '<h2>Udemy Letter</h2>';
    html += '<p>\ub9e4\uc6d4 \ubcc0\ud654\ud558\ub294 \uc5c5\ubb34 \ud658\uacbd\uacfc \ud559\uc2b5 \ud2b8\ub80c\ub4dc\uc5d0 \ub9de\ucdb0,<br>\ubc14\ub85c \uc2e4\ubb34\uc5d0 \uc801\uc6a9\ud560 \uc218 \uc788\ub294 \ucf58\ud150\uce20\uc640 \uc778\uc0ac\uc774\ud2b8\ub97c \uc5c4\uc120\ud574 \uc18c\uac1c\ub4dc\ub9bd\ub2c8\ub2e4.</p>';
    html += '<p>\uc5ec\ub7ec\ubd84\uc758 \uc131\uc7a5\uacfc \uc131\uacfc\uc5d0 \ub3c4\uc6c0\uc774 \ub418\ub294 \uac15\uc758\ub97c \uc120\ubcc4\ud574<br>\ub354 \ube60\ub974\uace0 \ud6a8\uc728\uc801\uc778 \uc5c5\ubb34 \uc5ed\ub7c9 \ud5a5\uc0c1\uc744 \uc9c0\uc6d0\ud558\uaca0\uc2b5\ub2c8\ub2e4.</p>';
    html += '<p style="font-weight:700;font-size:1rem;margin-top:1.5rem;">\uc55e\uc73c\ub85c\ub3c4 \uc5ec\ub7ec\ubd84\uc758 \uc131\uc7a5\uc744 \ub354 \uc990\uac81\uac8c \ub9cc\ub4dc\ub294<br>Udemy Letter\ub85c \ud568\uaed8\ud558\uaca0\uc2b5\ub2c8\ub2e4. 🚀</p>';
    html += '</div></section>';

    document.getElementById('letter-content').innerHTML = html;
    document.getElementById('letter-footer').style.display = '';
    buildSideNav(navItems);
    initInteractions();
  }

  function buildSideNav(navItems) {
    var nav = document.getElementById('side-nav');
    var html = '';
    for (var i = 0; i < navItems.length; i++) {
      var n = navItems[i];
      html += '<a href="#' + n.id + '" class="side-nav-item" data-target="' + n.id + '">';
      html += '<span class="side-nav-icon">' + n.icon + '</span>';
      html += '<span class="side-nav-label">' + n.ko + '</span>';
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
    var url = courseUrl(c);
    var html = '<div class="course-mini-card">';
    if (c.image) html += '<a href="' + url + '" target="_blank"><img src="' + esc(c.image) + '" alt="" /></a>';
    if (badge) html += badgeHtml(badge);
    html += '<h4><a href="' + url + '" target="_blank" style="color:inherit;text-decoration:none;">' + esc((c.title || '').substring(0, 50)) + '</a></h4>';
    html += '<div style="font-size:0.72rem;color:#9090aa;margin-bottom:0.4rem;">' + metaLine(c) + '</div>';
    if (cm) html += '<div class="ai-comment">💡 ' + esc(cm) + '</div>';
    html += '<a href="' + url + '" target="_blank" class="mini-link">\uc9c0\uae08 \uc218\uac15\ud558\uae30 \u2192</a>';
    html += '</div>';
    return html;
  }

  function renderHighlightCard(id, comment, badge) {
    var c = courseDataMap[id];
    if (!c) return '';
    var cm = getComment(comment);
    var url = courseUrl(c);
    var html = '<div class="new-highlight-card">';
    if (badge) html += badgeHtml(badge);
    else html += '<div class="highlight-badge">🆕 NEW</div>';
    if (c.image) html += '<a href="' + url + '" target="_blank"><img src="' + esc(c.image) + '" alt="" /></a>';
    html += '<h3><a href="' + url + '" target="_blank" style="color:inherit;text-decoration:none;">' + esc(c.title || '') + '</a></h3>';
    html += '<div style="font-size:0.78rem;color:#4a4a6a;margin-bottom:0.5rem;">' + metaLine(c) + '</div>';
    if (cm) html += '<p style="font-size:0.82rem;color:#4a4a6a;margin-bottom:0.8rem;">💡 ' + esc(cm) + '</p>';
    html += '<a href="' + url + '" target="_blank" class="mini-link">\uc218\uac15\ud558\uae30 \u2192</a>';
    html += '</div>';
    return html;
  }

  function renderListItem(id, comment, badge, idx) {
    var c = courseDataMap[id];
    if (!c) return '';
    var cm = getComment(comment);
    var url = courseUrl(c);
    var html = '<div class="curation-rich-item">';
    html += '<div class="curation-rank">' + String(idx + 1).padStart(2, '0') + '</div>';
    html += '<div class="curation-rich-info">';
    if (badge) html += badgeHtml(badge);
    html += '<a href="' + url + '" target="_blank" class="curation-rich-title">' + esc(c.title || '') + '</a>';
    html += '<div class="curation-rich-meta">' + metaSpans(c) + '</div>';
    if (cm) html += '<div class="curation-rich-comment">' + esc(cm) + '</div>';
    html += '<a href="' + url + '" target="_blank" class="curation-rich-cta">\uc9c0\uae08 \ubc14\ub85c \uc2dc\uc791\ud558\uae30 \u2192</a>';
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
        html += ctaBanner('💡 \uc9c0\uae08 \ubc14\ub85c \ud559\uc2b5\uc7a5\uc5d0\uc11c \ubb34\ub8cc\ub85c \uc218\uac15\ud558\uc138\uc694!');
      }
    }
    return html;
  }

  function ctaBanner(text) {
    return '<div class="cta-banner"><p>' + text + '</p>' +
      '<div class="cta-buttons-row">' +
      '<a href="' + campusUrl + '" target="_blank" class="cta-primary">🚀 \ud559\uc2b5\uc7a5 \ubc14\ub85c\uac00\uae30 <span class="cta-arrow">\u2192</span></a>' +
      '<a href="' + explorerUrl + '" target="_blank" class="btn-explorer">🔭 \uac15\uc758 \ud0d0\ud5d8\ud558\uae30</a>' +
      '</div></div>';
  }

  function initInteractions() {
    var cIds = ['btn-campus', 'btn-campus-bottom'];
    for (var i = 0; i < cIds.length; i++) {
      var el = document.getElementById(cIds[i]);
      if (el) { el.href = campusUrl; el.target = '_blank'; }
    }

    var expBtn = document.getElementById('btn-explorer');
    if (expBtn) { expBtn.href = explorerUrl; expBtn.target = '_blank'; }

    var scrollDown = document.getElementById('scroll-down');
    if (scrollDown) {
      scrollDown.addEventListener('click', function() {
        var idx = document.querySelector('.index-section');
        if (idx) {
          var hh = document.querySelector('.letter-header');
          window.scrollTo({ top: idx.getBoundingClientRect().top + window.scrollY - (hh ? hh.offsetHeight + 20 : 80), behavior: 'smooth' });
        }
      });
    }

    var archiveBtn = document.getElementById('btn-archive');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'index.html?archive=true' + (sub ? '&sub=' + sub : '');
      });
    }

    var copyBtn = document.getElementById('btn-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        var url = window.location.href;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function() {
            showCopyToast('🔗 링크가 복사되었습니다!');
          });
        } else {
          var ta = document.createElement('textarea');
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showCopyToast('🔗 링크가 복사되었습니다!');
        }
      });
    }

    var unsub = document.getElementById('btn-unsubscribe');
    if (unsub) unsub.addEventListener('click', function(e) {
      e.preventDefault();
      if (confirm('\uc218\uc2e0\uac70\ubd80 \ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?')) {
        alert('\ucc98\ub9ac\ub418\uc5c8\uc2b5\ub2c8\ub2e4.');
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

    var isTranslated = false;
    var originalTexts = [];
    var templateOriginals = [];

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
      var targets = document.querySelectorAll(
        '#letter-content .cover-title, #letter-content .cover-subtitle, #letter-content .cover-company, ' +
        '#letter-content .cover-badge, #letter-content .cover-reading-time, ' +
        '#letter-content .section-header h2, #letter-content .section-header p, ' +
        '#letter-content .insight-card h3, #letter-content .insight-card p, #letter-content .insight-subtitle, ' +
        '#letter-content .curation-header h3, #letter-content .curation-tag, ' +
        '#letter-content .curation-rich-comment, #letter-content .curation-rich-meta span, ' +
        '#letter-content .curation-note, #letter-content .ai-comment, #letter-content .new-summary, ' +
        '#letter-content .closing-template h2, #letter-content .closing-template p, ' +
        '#letter-content .cta-banner > p, #letter-content .course-mini-card h4 a, ' +
        '#letter-content .course-mini-card > div, #letter-content .new-highlight-card h3 a, ' +
        '#letter-content .new-highlight-card > div, #letter-content .new-highlight-card > p, ' +
        '#letter-content .course-badge, ' +
        '#letter-content .archive-subtitle, #letter-content .archive-card-title, #letter-content .archive-status'
      );

      var toTranslate = [];
      originalTexts = [];

      for (var i = 0; i < targets.length; i++) {
        var el = targets[i];
        var text = el.textContent.trim();
        if (!text || text.length < 2) continue;
        var koChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
        if (koChars < 2) continue;
        toTranslate.push({ el: el, text: text });
        originalTexts.push({ el: el, html: el.innerHTML });
      }

      if (toTranslate.length === 0) {
        translateTemplateToEnglish();
        isTranslated = true;
        showToast('🌐 English mode!');
        return;
      }

      showToast('🌐 Translating... (' + toTranslate.length + ' items)');

      var separator = '\n\u00a7\u00a7\u00a7\n';
      var chunks = [];
      var currentChunk = '';
      var currentItems = [];

      for (var i = 0; i < toTranslate.length; i++) {
        var addition = (currentItems.length > 0 ? separator : '') + toTranslate[i].text.substring(0, 800);
        if (currentChunk.length + addition.length > 4000 && currentItems.length > 0) {
          chunks.push({ text: currentChunk, items: currentItems.slice() });
          currentChunk = toTranslate[i].text.substring(0, 800);
          currentItems = [toTranslate[i]];
        } else {
          currentChunk += addition;
          currentItems.push(toTranslate[i]);
        }
      }
      if (currentItems.length > 0) chunks.push({ text: currentChunk, items: currentItems });

      var translateChunk = function(chunk) {
        return fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=' + encodeURIComponent(chunk.text))
          .then(function(res) { return res.json(); })
          .then(function(data) {
            var full = '';
            if (data && data[0]) {
              for (var j = 0; j < data[0].length; j++) {
                if (data[0][j] && data[0][j][0]) full += data[0][j][0];
              }
            }
            return { items: chunk.items, translation: full };
          })
          .catch(function() { return { items: chunk.items, translation: '' }; });
      };

      var promises = [];
      for (var i = 0; i < chunks.length; i++) {
        promises.push(translateChunk(chunks[i]));
      }

      Promise.all(promises).then(function(results) {
        var translated = 0;
        for (var r = 0; r < results.length; r++) {
          if (!results[r].translation) continue;
          var parts = results[r].translation.split(/\u00a7\u00a7\u00a7/);
          for (var i = 0; i < Math.min(parts.length, results[r].items.length); i++) {
            var tr = parts[i].trim();
            if (tr) { results[r].items[i].el.textContent = tr; translated++; }
          }
        }
        translateTemplateToEnglish();
        isTranslated = true;
        showToast('🌐 ' + translated + ' items translated!');
      });
    }

    function restoreOriginal() {
      for (var i = 0; i < originalTexts.length; i++) {
        originalTexts[i].el.innerHTML = originalTexts[i].html;
      }
      restoreTemplateToKorean();
      isTranslated = false;
      originalTexts = [];
      showToast('🇰🇷 한국어로 복원!');
    }

    function translateTemplateToEnglish() {
      templateOriginals = [];
      var pairs = [
        ['btn-campus', '🚀 Hub'],
        ['btn-pdf', '📥 PDF'],
        ['btn-archive', '📖 Previous Issues'],
        ['btn-unsubscribe', 'Unsubscribe'],
        ['btn-explorer', '🔭 Explore Courses']
      ];
      for (var i = 0; i < pairs.length; i++) {
        var el = document.getElementById(pairs[i][0]);
        if (el) { templateOriginals.push({ el: el, html: el.innerHTML }); el.innerHTML = pairs[i][1]; }
      }
      var ctaPrimaries = document.querySelectorAll('.cta-primary');
      for (var i = 0; i < ctaPrimaries.length; i++) {
        templateOriginals.push({ el: ctaPrimaries[i], html: ctaPrimaries[i].innerHTML });
        ctaPrimaries[i].innerHTML = '🚀 Go to Learning Hub <span class="cta-arrow">\u2192</span>';
      }
      var ctaExplorers = document.querySelectorAll('.cta-buttons-row .btn-explorer');
      for (var i = 0; i < ctaExplorers.length; i++) {
        templateOriginals.push({ el: ctaExplorers[i], html: ctaExplorers[i].innerHTML });
        ctaExplorers[i].innerHTML = '🔭 Explore Courses';
      }
      var miniLinks = document.querySelectorAll('.mini-link');
      for (var i = 0; i < miniLinks.length; i++) {
        templateOriginals.push({ el: miniLinks[i], html: miniLinks[i].innerHTML });
        miniLinks[i].textContent = 'Start Now \u2192';
      }
      var richCtas = document.querySelectorAll('.curation-rich-cta');
      for (var i = 0; i < richCtas.length; i++) {
        templateOriginals.push({ el: richCtas[i], html: richCtas[i].innerHTML });
        richCtas[i].textContent = 'Start Now \u2192';
      }
      var sideNavLabels = document.querySelectorAll('.side-nav-label');
      var enLabels = ['Trend Insights', 'New Content', 'Monthly Curation', 'Promotion'];
      for (var i = 0; i < sideNavLabels.length; i++) {
        templateOriginals.push({ el: sideNavLabels[i], html: sideNavLabels[i].innerHTML });
        if (enLabels[i]) sideNavLabels[i].textContent = enLabels[i];
      }
      var indexTitles = document.querySelectorAll('.index-title');
      for (var i = 0; i < indexTitles.length; i++) {
        templateOriginals.push({ el: indexTitles[i], html: indexTitles[i].innerHTML });
        if (enLabels[i]) indexTitles[i].textContent = enLabels[i];
      }
      var readingTime = document.querySelector('.cover-reading-time');
      if (readingTime && readingTime.textContent.indexOf('\uc77d') !== -1) {
        templateOriginals.push({ el: readingTime, html: readingTime.innerHTML });
        readingTime.textContent = '📖 Reading time: ~5 min';
      }
      var cNote = document.querySelector('.curation-note');
      if (cNote) {
        templateOriginals.push({ el: cNote, html: cNote.innerHTML });
        cNote.textContent = '💡 Click a course title to visit the course page.';
      }
      var footerCopyright = document.querySelector('.footer-copyright');
      if (footerCopyright) {
        templateOriginals.push({ el: footerCopyright, html: footerCopyright.innerHTML });
        footerCopyright.textContent = 'Udemy Letter | Woongjin ThinkBig \u00a9 2026';
      }
    }

    function restoreTemplateToKorean() {
      for (var i = 0; i < templateOriginals.length; i++) {
        templateOriginals[i].el.innerHTML = templateOriginals[i].html;
      }
      templateOriginals = [];
    }

    function showCopyToast(msg) {
      var existing = document.querySelector('.copy-toast');
      if (existing) existing.remove();
      var el = document.createElement('div');
      el.className = 'copy-toast show';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function() { el.classList.remove('show'); }, 2000);
      setTimeout(function() { el.remove(); }, 2500);
    }

    function showToast(msg) {
      var el = document.createElement('div');
      el.style.cssText = 'position:fixed;bottom:2rem;right:2rem;padding:0.8rem 1.5rem;background:#1a1a2e;color:white;border-radius:10px;font-size:0.85rem;z-index:1000;';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function() { el.remove(); }, 3000);
    }

    if (lang === 'en') {
      setTimeout(function() {
        var enBtn = document.querySelector('.lang-btn[data-lang="en"]');
        if (enBtn) {
          for (var j = 0; j < lBtns.length; j++) lBtns[j].classList.remove('active');
          enBtn.classList.add('active');
          translatePageToEnglish();
        }
      }, 1500);
    }

    var pBar = document.getElementById('scroll-progress');
    var hdr = document.getElementById('letter-header');
    var topBtn = document.getElementById('scroll-to-top');
    var mobileBar = document.getElementById('mobile-bottom-bar');
    var mobileTopBtn = document.getElementById('mobile-top-btn');

    if (topBtn) topBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    if (mobileTopBtn) mobileTopBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    var tk = false;
    window.addEventListener('scroll', function() {
      if (!tk) {
        requestAnimationFrame(function() {
          var st = window.scrollY;
          var dh = document.documentElement.scrollHeight - window.innerHeight;
          if (pBar && dh > 0) pBar.style.width = Math.min((st / dh) * 100, 100) + '%';
          if (hdr) hdr.classList.toggle('scrolled', st > 50);
          if (topBtn) topBtn.classList.toggle('visible', st > 400);
          if (mobileBar) mobileBar.classList.toggle('visible', st > 400);
          tk = false;
        });
        tk = true;
      }
    });

    var aEls = document.querySelectorAll('.content-section, .index-card, .insight-card, .course-mini-card, .new-highlight-card, .curation-rich-item, .closing-template, .cta-banner, .curation-header, .new-summary, .section-illustration, .closing-illustration, .curation-banner-image, .archive-card');
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

  function t(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj.ko || '';
  }

  function getGreeting() {
    if (sub) return sub.toUpperCase() + ' \ud559\uc2b5\uc790\ub2d8\uc744 \uc704\ud55c \uc774\ub2ec\uc758 \ub808\ud130';
    return '\ud559\uc2b5\uc790\ub2d8\uc744 \uc704\ud55c \uc774\ub2ec\uc758 \ub808\ud130';
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
    return c.ko || '';
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
    var m = { 'Beginner': '초급', 'BEGINNER': '초급', 'Intermediate': '중급', 'INTERMEDIATE': '중급', 'Expert': '고급', 'EXPERT': '고급', 'All Levels': '모든 수준', 'ALL_LEVELS': '모든 수준' };
    return m[d] || d || '';
  }

  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

})();
