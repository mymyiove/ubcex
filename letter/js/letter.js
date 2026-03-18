// ═══════════════════════════════════════════════════════════
// letter.js v3 — 서브도메인 + PDF(print) + 다국어 + 스크롤
//                 프로그레스 바 + 맨 위로 + 헤더 스크롤 효과
// ═══════════════════════════════════════════════════════════
(function() {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var sub = params.get('sub') || '';
  var lang = params.get('lang') || 'ko';
  var baseUrl = sub ? 'https://' + sub + '.udemy.com/course/' : '#';

  // ═══ 다국어 시스템 ═══
  function applyLanguage(targetLang) {
    lang = targetLang;

    // URL 파라미터 업데이트 (새로고침 없이)
    var url = new URL(window.location);
    if (targetLang === 'ko') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', targetLang);
    }
    window.history.replaceState({}, '', url);

    // html lang 속성
    document.documentElement.lang = targetLang;

    // data-ko / data-en 속성 텍스트 교체
    var elements = document.querySelectorAll('[data-' + targetLang + ']');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var text = el.getAttribute('data-' + targetLang);
      if (text) {
        el.innerHTML = text;
      }
    }

    // 토글 버튼 active 상태
    var langBtns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      langBtns[i].classList.remove('active');
      if (langBtns[i].getAttribute('data-lang') === targetLang) {
        langBtns[i].classList.add('active');
      }
    }

    // 기업명 인사 재적용
    updateGreeting();
  }

  function updateGreeting() {
    var greeting = document.getElementById('company-greeting');
    if (!greeting) return;
    if (sub) {
      if (lang === 'en') {
        greeting.textContent = "This month's letter for " + sub.toUpperCase() + ' learners';
      } else {
        greeting.textContent = sub.toUpperCase() + ' 학습자님을 위한 이달의 레터';
      }
    }
  }

  // 언어 토글 이벤트
  var langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    var langBtns = langToggle.querySelectorAll('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      langBtns[i].addEventListener('click', function() {
        applyLanguage(this.getAttribute('data-lang'));
      });
    }
  }

  // 초기 언어 적용
  applyLanguage(lang);

  // ═══ 학습장 링크 ═══
  var campusIds = ['btn-campus', 'btn-campus-bottom', 'btn-campus-mid1', 'btn-campus-mid2', 'btn-campus-bottom2'];
  for (var i = 0; i < campusIds.length; i++) {
    var el = document.getElementById(campusIds[i]);
    if (el) {
      el.href = sub ? 'https://' + sub + '.udemy.com' : 'https://www.udemy.com';
      el.target = '_blank';
    }
  }

  // ═══ 강의 링크 서브도메인 적용 ═══
  var courseLinks = document.querySelectorAll('a[data-slug]');
  for (var i = 0; i < courseLinks.length; i++) {
    var el = courseLinks[i];
    var slug = el.getAttribute('data-slug');
    if (slug) {
      if (sub) {
        el.href = baseUrl + slug + '/';
        el.target = '_blank';
      } else {
        el.href = '#';
        (function(element) {
          element.addEventListener('click', function(e) {
            e.preventDefault();
            var msg = lang === 'en'
              ? 'Learning Hub link is not configured.\nPlease contact your administrator.'
              : '학습장 링크가 설정되지 않았습니다.\n관리자에게 문의해주세요.';
            alert(msg);
          });
        })(el);
      }
    }
  }

  // ═══ PDF 다운로드 (브라우저 인쇄) ═══
  function downloadPDF() {
    // 파일명 안내
    var filename = (sub || 'general') + '_Udemy_Letter_20260320.pdf';
    var msg = lang === 'en'
      ? 'In the print dialog, select "Save as PDF".\nRecommended filename: ' + filename
      : '인쇄 대화상자에서 "PDF로 저장"을 선택해주세요.\n권장 파일명: ' + filename;

    // 제목 임시 변경 (PDF 파일명에 반영)
    var originalTitle = document.title;
    document.title = filename.replace('.pdf', '');

    alert(msg);
    window.print();

    // 제목 복원
    setTimeout(function() {
      document.title = originalTitle;
    }, 1000);
  }

  var pdfBtns = document.querySelectorAll('#btn-pdf, #btn-pdf-bottom');
  for (var i = 0; i < pdfBtns.length; i++) {
    pdfBtns[i].addEventListener('click', downloadPDF);
  }

  // ═══ 수신거부 ═══
  var unsubBtn = document.getElementById('btn-unsubscribe');
  if (unsubBtn) {
    unsubBtn.addEventListener('click', function(e) {
      e.preventDefault();
      var msg = lang === 'en'
        ? 'Would you like to unsubscribe from Udemy Letter?'
        : 'Udemy Letter 수신을 거부하시겠습니까?\n이후 레터를 받지 않게 됩니다.';
      var confirmMsg = lang === 'en'
        ? 'You have been unsubscribed. Thank you.'
        : '수신거부가 처리되었습니다. 감사합니다.';
      if (confirm(msg)) {
        alert(confirmMsg);
        // TODO: 실제 수신거부 API 호출
      }
    });
  }

  // ═══ INDEX 부드러운 스크롤 ═══
  var indexLinks = document.querySelectorAll('.index-card');
  for (var i = 0; i < indexLinks.length; i++) {
    indexLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        var headerHeight = document.querySelector('.letter-header').offsetHeight || 60;
        var targetPos = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      }
    });
  }

  // ═══ 스크롤 프로그레스 바 ═══
  var progressBar = document.getElementById('scroll-progress');

  function updateProgress() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      var progress = (scrollTop / docHeight) * 100;
      progressBar.style.width = Math.min(progress, 100) + '%';
    }
  }

  // ═══ 헤더 스크롤 효과 ═══
  var header = document.getElementById('letter-header');

  function updateHeader() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  // ═══ 맨 위로 버튼 ═══
  var scrollTopBtn = document.getElementById('scroll-to-top');

  function updateScrollTopBtn() {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ═══ 스크롤 이벤트 통합 (성능 최적화) ═══
  var ticking = false;

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        updateProgress();
        updateHeader();
        updateScrollTopBtn();
        ticking = false;
      });
      ticking = true;
    }
  });

  // ═══ 스크롤 애니메이션 (IntersectionObserver) ═══
  var animateSelectors = [
    '.content-section',
    '.index-card',
    '.insight-card',
    '.course-mini-card',
    '.new-highlight-card',
    '.curation-rich-item',
    '.closing-section',
    '.cta-banner',
    '.curation-header',
    '.new-summary',
    '.stat-item'
    '.section-illustration',      // ★ 추가
    '.closing-illustration',      // ★ 추가
    '.curation-banner-image'      // ★ 추가    
  ];

  var animateElements = document.querySelectorAll(animateSelectors.join(', '));
  for (var i = 0; i < animateElements.length; i++) {
    animateElements[i].classList.add('animate-on-scroll');
  }

  // 큐레이션 아이템 시차
  var curationItems = document.querySelectorAll('.curation-rich-item');
  for (var i = 0; i < curationItems.length; i++) {
    curationItems[i].style.transitionDelay = (i * 0.06) + 's';
  }

  // 인덱스 카드 시차
  var indexCards = document.querySelectorAll('.index-card');
  for (var i = 0; i < indexCards.length; i++) {
    indexCards[i].style.transitionDelay = (i * 0.1) + 's';
  }

  // 미니 카드 시차
  var miniCards = document.querySelectorAll('.course-mini-card');
  for (var i = 0; i < miniCards.length; i++) {
    miniCards[i].style.transitionDelay = (i * 0.08) + 's';
  }

  // 통계 아이템 시차
  var statItems = document.querySelectorAll('.stat-item');
  for (var i = 0; i < statItems.length; i++) {
    statItems[i].style.transitionDelay = (i * 0.12) + 's';
  }

  var observer = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add('visible');
      }
    }
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -60px 0px'
  });

  var scrollElements = document.querySelectorAll('.animate-on-scroll');
  for (var i = 0; i < scrollElements.length; i++) {
    observer.observe(scrollElements[i]);
  }

  // ═══ CTA 버튼 리플 효과 ═══
  var ctaButtons = document.querySelectorAll('.cta-primary, .curation-rich-cta');
  for (var i = 0; i < ctaButtons.length; i++) {
    ctaButtons[i].addEventListener('mouseenter', function(e) {
      var rect = this.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      this.style.setProperty('--ripple-x', x + 'px');
      this.style.setProperty('--ripple-y', y + 'px');
    });
  }

  // ═══ 초기 로드 애니메이션 ═══
  document.body.classList.add('loaded');

})();
