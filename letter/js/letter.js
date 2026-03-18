// ═══════════════════════════════════════════════════════════
// letter.js — 서브도메인 + PDF + 다국어 + 스크롤 애니메이션
// ═══════════════════════════════════════════════════════════
(function() {
  var params = new URLSearchParams(window.location.search);
  var sub = params.get('sub') || '';
  var lang = params.get('lang') || 'ko';
  var baseUrl = sub ? 'https://' + sub + '.udemy.com/course/' : '#';

  // ═══ 다국어 시스템 ═══
  function applyLanguage(targetLang) {
    lang = targetLang;

    // URL 파라미터 업데이트 (히스토리 변경, 새로고침 없이)
    var url = new URL(window.location);
    if (targetLang === 'ko') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', targetLang);
    }
    window.history.replaceState({}, '', url);

    // html lang 속성 변경
    document.documentElement.lang = targetLang;

    // data-ko / data-en 속성이 있는 모든 요소 텍스트 교체
    var elements = document.querySelectorAll('[data-' + targetLang + ']');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var text = el.getAttribute('data-' + targetLang);
      if (text) {
        el.innerHTML = text;
      }
    }

    // 토글 버튼 active 상태 변경
    var langBtns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      langBtns[i].classList.remove('active');
      if (langBtns[i].getAttribute('data-lang') === targetLang) {
        langBtns[i].classList.add('active');
      }
    }

    // 기업명 인사 재적용
    var greeting = document.getElementById('company-greeting');
    if (greeting && sub) {
      if (targetLang === 'en') {
        greeting.textContent = "This month's letter for " + sub.toUpperCase() + ' learners';
      } else {
        greeting.textContent = sub.toUpperCase() + ' 학습자님을 위한 이달의 레터';
      }
    }
  }

  // 언어 토글 버튼 이벤트
  var langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    var langBtns = langToggle.querySelectorAll('.lang-btn');
    for (var i = 0; i < langBtns.length; i++) {
      langBtns[i].addEventListener('click', function() {
        var targetLang = this.getAttribute('data-lang');
        applyLanguage(targetLang);
      });
    }
  }

  // 초기 언어 적용
  applyLanguage(lang);

  // ═══ 기업명 인사 ═══
  var greeting = document.getElementById('company-greeting');
  if (greeting && sub) {
    if (lang === 'en') {
      greeting.textContent = "This month's letter for " + sub.toUpperCase() + ' learners';
    } else {
      greeting.textContent = sub.toUpperCase() + ' 학습자님을 위한 이달의 레터';
    }
  }

  // ═══ 학습장 바로가기 링크 ═══
  var campusLinks = document.querySelectorAll('#btn-campus, #btn-campus-bottom, #btn-campus-mid1, #btn-campus-mid2, #btn-campus-bottom2');
  for (var i = 0; i < campusLinks.length; i++) {
    if (sub) {
      campusLinks[i].href = 'https://' + sub + '.udemy.com';
    } else {
      // sub 없으면 숨기지 않고 기본 udemy.com으로
      campusLinks[i].href = 'https://www.udemy.com';
    }
  }

  // ═══ 모든 강의 링크에 서브도메인 적용 ═══
  var courseLinks = document.querySelectorAll('[data-slug]');
  for (var i = 0; i < courseLinks.length; i++) {
    var el = courseLinks[i];
    // data-ko, data-en 속성이 있는 건 텍스트 요소이므로 href가 있는 것만 처리
    if (el.tagName === 'A' || el.href !== undefined) {
      var slug = el.getAttribute('data-slug');
      if (slug) {
        if (sub) {
          el.href = baseUrl + slug + '/';
          el.target = '_blank';
        } else {
          el.href = '#';
          el.addEventListener('click', function(e) {
            e.preventDefault();
            if (lang === 'en') {
              alert('Learning Hub link is not configured.\nPlease contact your administrator.');
            } else {
              alert('학습장 링크가 설정되지 않았습니다.\n관리자에게 문의해주세요.');
            }
          });
        }
      }
    }
  }

  // ═══ PDF 다운로드 ═══
  function downloadPDF() {
    var element = document.getElementById('letter-content');
    var opt = {
      margin: 0,
      filename: 'Udemy_Letter_2026-03' + (sub ? '_' + sub : '') + (lang !== 'ko' ? '_' + lang : '') + '.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
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
        ? 'Would you like to unsubscribe from Udemy Letter?\nYou will no longer receive the letter.'
        : 'Udemy Letter 수신을 거부하시겠습니까?\n이후 레터를 받지 않게 됩니다.';
      var confirmMsg = lang === 'en'
        ? 'You have been unsubscribed.\nThank you.'
        : '수신거부가 처리되었습니다.\n감사합니다.';
      if (confirm(msg)) {
        alert(confirmMsg);
        // TODO: 실제 수신거부 API 호출
      }
    });
  }

  // ═══ 부드러운 스크롤 (INDEX 카드) ═══
  var indexLinks = document.querySelectorAll('.index-card');
  for (var i = 0; i < indexLinks.length; i++) {
    indexLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // ═══ 스크롤 애니메이션 ═══
  var animateElements = document.querySelectorAll(
    '.content-section, .index-card, .insight-card, .course-mini-card, ' +
    '.new-highlight-card, .curation-rich-item, .closing-section, ' +
    '.cta-banner, .curation-header, .new-summary'
  );
  for (var i = 0; i < animateElements.length; i++) {
    animateElements[i].classList.add('animate-on-scroll');
  }

  // 큐레이션 아이템 시차 애니메이션
  var curationItems = document.querySelectorAll('.curation-rich-item');
  for (var i = 0; i < curationItems.length; i++) {
    curationItems[i].style.transitionDelay = (i * 0.05) + 's';
  }

  var observer = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add('visible');
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  var scrollElements = document.querySelectorAll('.animate-on-scroll');
  for (var i = 0; i < scrollElements.length; i++) {
    observer.observe(scrollElements[i]);
  }

})();
