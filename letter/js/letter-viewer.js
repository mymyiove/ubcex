(function() {

  var API_BASE = '/api';
  var WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
  var WORKER_SECRET = 'gogo1014';

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

  var letterData = null;
  var courseDataMap = {};

  // === Init ===
  loadLetter();

  // === Load Letter Data ===
  function loadLetter() {
    var endpoint = month ? '/letter-get?month=' + month : '/letter-get';
    fetch(API_BASE + endpoint)
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (!res.success || !res.data) {
          showError('레터를 찾을 수 없습니다.');
          return;
        }
        letterData = res.data;
        document.title = 'Udemy Letter \u2014 ' + letterData.month;

        // Collect all course IDs
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
      .catch(function(e) {
        showError('레터 로드 실패: ' + e.message);
      });
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
              .then(function(r) { return r.ok ? r.json() : []; })
              .catch(function() { return []; })
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
      })
      .catch(function() {});
  }

  function showError(msg) {
    document.getElementById('letter-loading').innerHTML =
      '<div style="font-size:2rem;margin-bottom:1rem;">😢</div><div>' + msg + '</div>';
  }

  // === Render Letter ===
  function renderLetter() {
    var d = letterData;
    var L = lang;
    var t = function(obj) {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      return obj[L] || obj.ko || '';
    };

    var html = '';

    // Cover
    var coverImg = d.coverImage || DEFAULT_IMAGES.cover;
    html += '<section class="cover-section"><div class="cover-inner">';
    html += '<div class="cover-image"><img src="' + esc(coverImg) + '" alt="Cover" /></div>';
    html += '<div class="cover-badge">' + d.month + (L === 'en' ? ' Issue' : '호') + '</div>';
    html += '<h1 class="cover-title">' + t(d.title) + '</h1>';
    html += '<p class="cover-subtitle">' + t(d.subtitle) + '</p>';
    html += '<p class="cover-company" id="company-greeting">' + getGreeting() + '</p>';
    html += '<p class="cover-reading-time">' + t(d.readingTime) + '</p>';
    html += '</div></section>';

    // INDEX
    html += renderIndex(d);

    // Insight
    if (d.insight) {
      html += '<section class="content-section" id="section-insight">';
      html += '<div class="section-header"><div class="section-tag">CONTENT 1</div>';
      html += '<h2>📊 ' + (L === 'en' ? 'Trend Insights' : '트렌드 인사이트') + '</h2></div>';

      var insightImg = d.insight.image || DEFAULT_IMAGES.insight;
      if (insightImg) html += '<div class="section-illustration"><img src="' + esc(insightImg) + '" alt="" /></div>';

      if (d.insight.pages) {
        for (var i = 0; i < d.insight.pages.length; i++) {
          var pageHtml = d.insight.pages[i]['html_' + L] || d.insight.pages[i].html_ko || '';
          if (pageHtml) html += '<div class="insight-card">' + pageHtml + '</div>';
        }
      }

      if (d.insight.courseIds && d.insight.courseIds.length > 0) {
        html += renderCourseSection(d.insight, 'insight');
      }
      html += '</section>';
    }

    // New Content
    if (d.newContent) {
      html += '<section class="content-section" id="section-new">';
      html += '<div class="section-header"><div class="section-tag">CONTENT 2</div>';
      html += '<h2>✨ ' + (L === 'en' ? 'New Content' : '신규 콘텐츠') + '</h2></div>';

      var newImg = d.newContent.image || DEFAULT_IMAGES.newContent;
      if (newImg) html += '<div class="section-illustration"><img src="' + esc(newImg) + '" alt="" /></div>';

      if (d.newContent.editorHtml) {
        var edHtml = d.newContent.editorHtml[L] || d.newContent.editorHtml.ko || '';
        if (edHtml) html += '<div class="insight-card">' + edHtml + '</div>';
      }

      if (d.newContent.courseIds && d.newContent.courseIds.length > 0) {
        html += renderCourseSection(d.newContent, 'new');
      }

      if (d.newContent.summary) {
        html += '<div class="new-summary">' + t(d.newContent.summary) + '</div>';
      }

      html += renderCtaBanner(L === 'en' ? '✨ Curious about new courses?' : '✨ 신규 강의가 궁금하시다면?', 'btn-campus-mid1');
      html += '</section>';
    }

    // Curation
    if (d.curation) {
      html += '<section class="content-section" id="section-curation">';
      html += '<div class="section-header"><div class="section-tag">CONTENT 3</div>';
      html += '<h2>🎯 ' + (L === 'en' ? 'Monthly Curation' : '이달의 큐레이션') + '</h2></div>';

      var curImg = d.curation.image || DEFAULT_IMAGES.curation;
      if (curImg) html += '<div class="curation-banner-image"><img src="' + esc(curImg) + '" alt="" /></div>';

      if (d.curation.intro || d.curation.tags) {
        html += '<div class="curation-header">';
        if (d.curation.intro) html += '<h3>' + t(d.curation.intro) + '</h3>';
        if (d.curation.tags && d.curation.tags.length > 0) {
          html += '<div class="curation-tags">';
          for (var i = 0; i < d.curation.tags.length; i++) {
            html += '<span class="curation-tag">' + t(d.curation.tags[i]) + '</span>';
          }
          html += '</div>';
        }
        html += '</div>';
      }

      if (d.curation.courseIds && d.curation.courseIds.length > 0) {
        html += '<div class="curation-list">';
        html += renderCurationList(d.curation);
        html += '</div>';
      }

      html += '<p class="curation-note">💡 ' + (L === 'en' ? 'Click a course title to visit the course page.' : '강의명을 클릭하면 해당 강의 페이지로 연결됩니다.') + '</p>';
      html += renderCtaBanner(L === 'en' ? '🎯 Enjoyed this month\'s picks?' : '🎯 이번 달 추천 강의가 마음에 드셨나요?', 'btn-campus-bottom2');
      html += '</section>';
    }

    // Closing
    html += '<section class="closing-section"><div class="closing-inner">';
    var closingImg = (d.closing && d.closing.image) || DEFAULT_IMAGES.closing;
    if (closingImg) html += '<div class="closing-illustration"><img src="' + esc(closingImg) + '" alt="" /></div>';

    if (d.closing && d.closing.message) {
      var closingHtml = d.closing.message[L] || d.closing.message.ko || '';
      if (closingHtml) {
        html += closingHtml;
      } else {
        html += '<h2>Udemy Letter</h2>';
        html += '<p>' + (L === 'en' ? 'We\'ll continue to make your growth more enjoyable. 🚀' : '앞으로도 여러분의 성장을 더 즐겁게 만드는 Udemy Letter로 함께하겠습니다. 🚀') + '</p>';
      }
    }
    html += '</div></section>';

    document.getElementById('letter-content').innerHTML = html;
    document.getElementById('letter-footer').style.display = '';

    // Post-render
    initInteractions();
  }

  // === Render Helpers ===
  function renderIndex(d) {
    var L = lang;
    var sections = [];
    if (d.insight) sections.push({ id: 'section-insight', num: '01', icon: '📊', title: L === 'en' ? 'Trend Insights' : '트렌드 인사이트' });
    if (d.newContent) sections.push({ id: 'section-new', num: '02', icon: '✨', title: L === 'en' ? 'New Content' : '신규 콘텐츠' });
    if (d.curation) sections.push({ id: 'section-curation', num: '03', icon: '🎯', title: L === 'en' ? 'Monthly Curation' : '이달의 큐레이션' });

    if (sections.length === 0) return '';

    var html = '<section class="index-section"><div class="section-label">INDEX</div><div class="index-grid">';
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      html += '<a href="#' + s.id + '" class="index-card">';
      html += '<span class="index-num">' + s.num + '</span>';
      html += '<span class="index-icon">' + s.icon + '</span>';
      html += '<span class="index-title">' + s.title + '</span>';
      html += '</a>';
    }
    html += '</div></section>';
    return html;
  }

  function renderCourseSection(sectionData, sectionType) {
    var ids = sectionData.courseIds || [];
    var comments = sectionData.courseComments || {};
    var badges = sectionData.courseBadges || {};
    var layout = sectionData.layout || 'card';

    if (ids.length === 0) return '';

    var html = '';
    if (layout === 'card') {
      html += '<div class="course-grid-4">';
      for (var i = 0; i < ids.length; i++) {
        html += renderMiniCard(ids[i], comments[ids[i]], badges[ids[i]]);
      }
      html += '</div>';
    } else {
      for (var i = 0; i < ids.length; i++) {
        html += renderHighlightItem(ids[i], comments[ids[i]], badges[ids[i]], i);
      }
    }
    return html;
  }

  function renderMiniCard(id, comment, badge) {
    var c = courseDataMap[id];
    if (!c) return '';
    var L = lang;
    var commentText = '';
    if (comment) commentText = (typeof comment === 'object') ? (comment[L] || comment.ko || '') : comment;

    var html = '<div class="course-mini-card">';
    if (c.image) html += '<img src="' + esc(c.image) + '" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:0.6rem;" alt="" />';
    html += '<h4>' + esc(c.title || '').substring(0, 50) + '</h4>';
    html += '<div style="font-size:0.72rem;color:#9090aa;margin-bottom:0.4rem;">';
    if (c.rating) html += '⭐ ' + Number(c.rating).toFixed(1) + ' ';
    if (c.contentLength) html += '⏱️ ' + formatDur(c.contentLength) + ' ';
    if (c.instructor) html += '👤 ' + esc(c.instructor);
    html += '</div>';
    if (commentText) html += '<div class="ai-comment" style="font-size:0.75rem;padding:0.4rem 0.6rem;background:#f5f3ff;border-left:3px solid #a78bfa;border-radius:0 6px 6px 0;margin-bottom:0.4rem;">💡 ' + esc(commentText) + '</div>';
    html += '<a href="' + getCourseUrl(c) + '" target="_blank" class="mini-link">' + (L === 'en' ? 'Start Now →' : '지금 수강하기 →') + '</a>';
    html += '</div>';
    return html;
  }

  function renderCurationList(curationData) {
    var ids = curationData.courseIds || [];
    var comments = curationData.courseComments || {};
    var badges = curationData.courseBadges || {};
    var L = lang;
    var html = '';

    for (var i = 0; i < ids.length; i++) {
      var c = courseDataMap[ids[i]];
      if (!c) continue;

      var commentText = '';
      var commentObj = comments[ids[i]];
      if (commentObj) commentText = (typeof commentObj === 'object') ? (commentObj[L] || commentObj.ko || '') : commentObj;

      var badgeId = badges[ids[i]];
      var badgeHtml = '';
      if (badgeId) badgeHtml = renderBadgeHtml(badgeId);

      html += '<div class="curation-rich-item">';
      html += '<div class="curation-rank">' + String(i + 1).padStart(2, '0') + '</div>';
      html += '<div class="curation-rich-info">';
      if (badgeHtml) html += badgeHtml;
      html += '<a href="' + getCourseUrl(c) + '" target="_blank" class="curation-rich-title">' + esc(c.title || '') + '</a>';
      html += '<div class="curation-rich-meta">';
      if (c.rating) html += '<span>⭐ ' + Number(c.rating).toFixed(1) + '</span>';
      if (c.contentLength) html += '<span>⏱️ ' + formatDur(c.contentLength) + '</span>';
      if (c.instructor) html += '<span>👤 ' + esc(c.instructor) + '</span>';
      if (c.difficulty) html += '<span>📊 ' + mapDiff(c.difficulty) + '</span>';
      if (c.category) html += '<span>📂 ' + esc(c.category.split(',')[0].trim()) + '</span>';
      html += '</div>';
      if (commentText) html += '<div class="curation-rich-comment">' + esc(commentText) + '</div>';
      html += '<a href="' + getCourseUrl(c) + '" target="_blank" class="curation-rich-cta">' + (L === 'en' ? 'Start Now →' : '지금 바로 시작하기 →') + '</a>';
      html += '</div></div>';

      // Mid CTA after 3rd item
      if (i === 2 && ids.length > 4) {
        html += renderCtaBanner(L === 'en' ? '💡 Take courses for free!' : '💡 지금 바로 학습장에서 무료로 수강하세요!', 'btn-campus-mid2');
      }
    }
    return html;
  }

  function renderHighlightItem(id, comment, badge, idx) {
    var c = courseDataMap[id];
    if (!c) return '';
    var L = lang;
    var commentText = '';
    if (comment) commentText = (typeof comment === 'object') ? (comment[L] || comment.ko || '') : comment;

    var html = '<div class="new-highlight" style="grid-template-columns:1fr;"><div class="new-highlight-card">';
    if (badge) html += renderBadgeHtml(badge);
    else html += '<div class="highlight-badge">🆕 NEW</div>';
    html += '<h3>' + esc(c.title || '') + '</h3>';
    html += '<div style="font-size:0.78rem;color:#4a4a6a;margin-bottom:0.5rem;">';
    if (c.rating) html += '⭐ ' + Number(c.rating).toFixed(1) + ' ';
    if (c.contentLength) html += '⏱️ ' + formatDur(c.contentLength) + ' ';
    if (c.instructor) html += '👤 ' + esc(c.instructor);
    html += '</div>';
    if (commentText) html += '<p style="font-size:0.82rem;color:#4a4a6a;">' + esc(commentText) + '</p>';
    html += '<a href="' + getCourseUrl(c) + '" target="_blank" class="mini-link">' + (L === 'en' ? 'Enroll →' : '수강하기 →') + '</a>';
    html += '</div></div>';
    return html;
  }

  function renderBadgeHtml(badgeId) {
    var BADGES = {
      'popular': { ko: '🔥 가장 인기', cls: 'badge-popular' },
      'shortest': { ko: '⚡ 가장 짧은', cls: 'badge-shortest' },
      'top-rated': { ko: '🏆 평점 최고', cls: 'badge-top-rated' },
      'new': { ko: '🆕 신규', cls: 'badge-new' },
      'essential': { ko: '💼 실무 필수', cls: 'badge-essential' }
    };
    var b = BADGES[badgeId];
    if (b) return '<span class="course-badge ' + b.cls + '">' + b.ko + '</span>';
    // Custom badge
    if (badgeId && badgeId.indexOf('custom_') === 0) {
      var customs = JSON.parse(localStorage.getItem('letter_custom_badges') || '[]');
      for (var i = 0; i < customs.length; i++) {
        if (customs[i].id === badgeId) return '<span class="course-badge badge-new">' + esc(customs[i].ko) + '</span>';
      }
    }
    return '';
  }

  function renderCtaBanner(text, btnId) {
    var L = lang;
    return '<div class="cta-banner"><p>' + text + '</p>' +
      '<a href="' + campusUrl + '" target="_blank" class="cta-primary" id="' + btnId + '">' +
      '🚀 ' + (L === 'en' ? 'Go to Learning Hub' : '학습장 바로가기') +
      ' <span class="cta-arrow">→</span></a></div>';
  }

  // === Interactions (same as letter.js) ===
  function initInteractions() {
    // Campus links
    var campusIds = ['btn-campus', 'btn-campus-bottom'];
    for (var i = 0; i < campusIds.length; i++) {
      var el = document.getElementById(campusIds[i]);
      if (el) { el.href = campusUrl; el.target = '_blank'; }
    }

    // PDF
    var pdfBtns = document.querySelectorAll('#btn-pdf, #btn-pdf-bottom');
    for (var i = 0; i < pdfBtns.length; i++) {
      pdfBtns[i].addEventListener('click', function() {
        var fn = (sub || 'general') + '_Udemy_Letter_' + (letterData ? letterData.month.replace('-', '') : '') + '.pdf';
        document.title = fn.replace('.pdf', '');
        alert((lang === 'en' ? 'Select "Save as PDF" in print dialog.\nFilename: ' : 'PDF로 저장을 선택하세요.\n파일명: ') + fn);
        window.print();
        setTimeout(function() { document.title = 'Udemy Letter'; }, 1000);
      });
    }

    // Unsubscribe
    var unsub = document.getElementById('btn-unsubscribe');
    if (unsub) {
      unsub.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm(lang === 'en' ? 'Unsubscribe?' : '수신거부 하시겠습니까?')) {
          alert(lang === 'en' ? 'Unsubscribed.' : '수신거부 처리되었습니다.');
        }
      });
    }

    // Archive
    var archive = document.getElementById('btn-archive');
    if (archive) {
      archive.addEventListener('click', function(e) {
        e.preventDefault();
        // TODO: archive page
        toast('아카이브 페이지는 준비 중입니다.');
      });
    }

    // Index smooth scroll
    var indexCards = document.querySelectorAll('.index-card');
    for (var i = 0; i < indexCards.length; i++) {
      indexCards[i].addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          var hh = document.querySelector('.letter-header');
          var offset = hh ? hh.offsetHeight + 20 : 80;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      });
    }

    // Language toggle
    var langBtns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      langBtns[i].addEventListener('click', function() {
        var newLang = this.getAttribute('data-lang');
        var url = new URL(window.location);
        if (newLang === 'ko') url.searchParams.delete('lang');
        else url.searchParams.set('lang', newLang);
        window.location.href = url.toString();
      });
    }

    // Scroll progress + header + top button
    var progressBar = document.getElementById('scroll-progress');
    var header = document.getElementById('letter-header');
    var topBtn = document.getElementById('scroll-to-top');

    if (topBtn) topBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        requestAnimationFrame(function() {
          var st = window.scrollY;
          var dh = document.documentElement.scrollHeight - window.innerHeight;
          if (progressBar && dh > 0) progressBar.style.width = Math.min((st / dh) * 100, 100) + '%';
          if (header) header.classList.toggle('scrolled', st > 50);
          if (topBtn) topBtn.classList.toggle('visible', st > 400);
          ticking = false;
        });
        ticking = true;
      }
    });

    // Scroll animations
    var animEls = document.querySelectorAll('.content-section, .index-card, .insight-card, .course-mini-card, .new-highlight-card, .curation-rich-item, .closing-section, .cta-banner, .curation-header, .new-summary, .section-illustration, .closing-illustration, .curation-banner-image');
    for (var i = 0; i < animEls.length; i++) animEls[i].classList.add('animate-on-scroll');

    var cItems = document.querySelectorAll('.curation-rich-item');
    for (var i = 0; i < cItems.length; i++) cItems[i].style.transitionDelay = (i * 0.06) + 's';

    var observer = new IntersectionObserver(function(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) entries[i].target.classList.add('visible');
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

    var scrollEls = document.querySelectorAll('.animate-on-scroll');
    for (var i = 0; i < scrollEls.length; i++) observer.observe(scrollEls[i]);
  }

  // === Utils ===
  function getGreeting() {
    if (sub) {
      return lang === 'en'
        ? 'This month\'s letter for ' + sub.toUpperCase() + ' learners'
        : sub.toUpperCase() + ' \ud559\uc2b5\uc790\ub2d8\uc744 \uc704\ud55c \uc774\ub2ec\uc758 \ub808\ud130';
    }
    return lang === 'en' ? 'This month\'s letter for learners' : '\ud559\uc2b5\uc790\ub2d8\uc744 \uc704\ud55c \uc774\ub2ec\uc758 \ub808\ud130';
  }

  function getCourseUrl(c) {
    if (!sub) return '#';
    var slug = c.url || c.slug || '';
    if (slug) {
      if (slug.indexOf('http') === 0) return slug.replace('www.udemy.com', sub + '.udemy.com');
      return baseUrl + slug + '/';
    }
    return campusUrl;
  }

  function formatDur(min) {
    if (!min) return '';
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h > 0 && m > 0) return h + 'h ' + m + 'm';
    if (h > 0) return h + 'h';
    return m + 'm';
  }

  function mapDiff(d) {
    var m = { 'Beginner': '초급', 'BEGINNER': '초급', 'Intermediate': '중급', 'INTERMEDIATE': '중급', 'Expert': '고급', 'EXPERT': '고급', 'All Levels': '모든 수준', 'ALL_LEVELS': '모든 수준' };
    return (lang === 'ko' ? m[d] : d) || d || '';
  }

  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function toast(msg) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:2rem;right:2rem;padding:0.8rem 1.5rem;background:#1a1a2e;color:white;border-radius:10px;font-size:0.85rem;z-index:1000;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 3000);
  }

})();
