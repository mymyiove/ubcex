// ═══════════════════════════════════════════════════════════
// letter.js — 서브도메인 변환 + PDF 다운로드 + 링크 처리
// ═══════════════════════════════════════════════════════════

(function() {
  // URL 파라미터에서 서브도메인 가져오기
  var params = new URLSearchParams(window.location.search);
  var sub = params.get('sub') || '';
  var baseUrl = sub ? 'https://' + sub + '.udemy.com/course/' : '#';

  // 기업명 인사 (서브도메인 기반)
  var greeting = document.getElementById('company-greeting');
  if (greeting && sub) {
    greeting.textContent = sub.toUpperCase() + ' 학습자님을 위한 이달의 레터';
  }

  // 학습장 바로가기 링크
  var campusLinks = document.querySelectorAll('#btn-campus, #btn-campus-bottom');
  for (var i = 0; i < campusLinks.length; i++) {
    if (sub) campusLinks[i].href = 'https://' + sub + '.udemy.com';
    else campusLinks[i].style.display = 'none';
  }

  // 모든 강의 링크에 서브도메인 적용
  var courseLinks = document.querySelectorAll('[data-slug]');
  for (var i = 0; i < courseLinks.length; i++) {
    var slug = courseLinks[i].getAttribute('data-slug');
    if (sub && slug) {
      courseLinks[i].href = baseUrl + slug + '/';
      courseLinks[i].target = '_blank';
    } else {
      courseLinks[i].href = '#';
      courseLinks[i].addEventListener('click', function(e) {
        e.preventDefault();
        alert('학습장 링크가 설정되지 않았습니다.\n관리자에게 문의해주세요.');
      });
    }
  }

  // PDF 다운로드
  function downloadPDF() {
    var element = document.getElementById('letter-content');
    var opt = {
      margin: 0,
      filename: 'Udemy_Letter_2026-03' + (sub ? '_' + sub : '') + '.pdf',
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

  // 수신거부
  var unsubBtn = document.getElementById('btn-unsubscribe');
  if (unsubBtn) {
    unsubBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (confirm('Udemy Letter 수신을 거부하시겠습니까?\n이후 레터를 받지 않게 됩니다.')) {
        alert('수신거부가 처리되었습니다.\n감사합니다.');
        // TODO: 실제 수신거부 API 호출
      }
    });
  }

  // 부드러운 스크롤
  var indexLinks = document.querySelectorAll('.index-card');
  for (var i = 0; i < indexLinks.length; i++) {
    indexLinks[i].addEventListener('click', function(e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
})();

// ★ 스크롤 애니메이션
  var animateElements = document.querySelectorAll('.content-section, .index-card, .insight-card, .course-mini-card, .new-highlight-card, .curation-item, .closing-section');
  for (var i = 0; i < animateElements.length; i++) {
    animateElements[i].classList.add('animate-on-scroll');
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
