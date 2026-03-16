// ═══════════════════════════════════════════════════════════
// highlight.js — 직무 반영 + 자연스러운 조사
// ═══════════════════════════════════════════════════════════
var popularCourses = [];
var curatorPicks = [];
var popularIndex = 0;
var curatorIndex = 0;
var popularInterval = null;
var curatorInterval = null;
var DEFAULT_CURATOR_PICKS = ['8324', '1717020', '2360128'];

function getSelectedJobCats() {
  if (!S.selectedFamilies || S.selectedFamilies.length === 0) return [];
  var cats = new Set();
  S.selectedFamilies.forEach(function(famId) {
    var fam = CURATION[famId];
    if (fam && fam.roles) fam.roles.forEach(function(role) {
      if (role.cats) role.cats.forEach(function(c) { cats.add(c); });
    });
  });
  return [...cats];
}

// ★ 자연스러운 조사 처리 ("~을/를 위한")
function getJobNameWithJosa(familyIds) {
  if (!familyIds || familyIds.length === 0) return '';
  var names = familyIds.map(function(f) { return CURATION[f] ? CURATION[f].name : ''; }).filter(Boolean);
  if (names.length === 0) return '';
  var name = names.join(', ');
  // 마지막 글자의 받침 유무로 을/를 결정
  var lastChar = name.charAt(name.length - 1);
  var code = lastChar.charCodeAt(0);
  // 한글 범위: 0xAC00 ~ 0xD7A3
  if (code >= 0xAC00 && code <= 0xD7A3) {
    var hasBatchim = (code - 0xAC00) % 28 !== 0;
    return name + (hasBatchim ? '을' : '를') + ' 위한';
  }
  // 영어/기타: "를 위한"
  return name + '를 위한';
}

function initHighlight() {
  var jobCats = getSelectedJobCats();
  var candidates = S.courses.filter(function(c) { return hasKoreanSub(c) && c.rating >= 4.5 && c.enrollments >= 1000; });

  if (jobCats.length > 0) {
    var jobFiltered = candidates.filter(function(c) {
      var courseCat = (c.category || '').toLowerCase();
      return jobCats.some(function(jc) { return courseCat.includes(jc.toLowerCase()); });
    });
    if (jobFiltered.length >= 3) candidates = jobFiltered;
  }

  popularCourses = candidates.sort(function(a, b) {
    var da = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
    var db = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
    return db - da;
  }).slice(0, 6);

  var savedPicks = localStorage.getItem('curator_picks');
  var pickIds = savedPicks ? JSON.parse(savedPicks) : DEFAULT_CURATOR_PICKS;
  curatorPicks = pickIds.map(function(id) { return S.courses.find(function(c) { return c.id === id; }); }).filter(Boolean);

  // ★ 헤더 텍스트 — 자연스러운 조사
  var josa = getJobNameWithJosa(S.selectedFamilies);
  var ph = $('#popular-header-text');
  var ch = $('#curator-header-text');
  var jobNames = '';
  if (S.selectedFamilies && S.selectedFamilies.length > 0) {
    var names = [];
    for (var i = 0; i < S.selectedFamilies.length; i++) {
      var fam = CURATION[S.selectedFamilies[i]];
      if (fam) names.push(fam.emoji + fam.name);
    }
    jobNames = names.join(', ');
  }
  if (ph) ph.textContent = jobNames ? '🔥 ' + jobNames + ' 최신 인기 별' : '🔥 최신 인기 별';
  if (ch) ch.textContent = "⭐ 항해사's PICK";
  
    
  renderHighlightCarousels();
  startAutoRotation();

  var pp = $('#popular-prev'); if(pp) pp.addEventListener('click', function() { popularIndex=(popularIndex-1+popularCourses.length)%popularCourses.length; renderPopularCarousel(); });
  var pn = $('#popular-next'); if(pn) pn.addEventListener('click', function() { popularIndex=(popularIndex+1)%popularCourses.length; renderPopularCarousel(); });
  var cp = $('#curator-prev'); if(cp) cp.addEventListener('click', function() { curatorIndex=(curatorIndex-1+curatorPicks.length)%curatorPicks.length; renderCuratorCarousel(); });
  var cn = $('#curator-next'); if(cn) cn.addEventListener('click', function() { curatorIndex=(curatorIndex+1)%curatorPicks.length; renderCuratorCarousel(); });
}

function renderHighlightCarousels() { renderPopularCarousel(); renderCuratorCarousel(); }

function renderPopularCarousel() {
  if (popularCourses.length === 0) { $('#popular-carousel').innerHTML = '<div class="empty-state">한글자막 인기 강의를 불러오는 중...</div>'; return; }
  var course = popularCourses[popularIndex];
  var url = buildCourseUrl(course);
  var cat = course.category ? course.category.split(',')[0].trim() : '-';
  var color = getCatColor(cat);
  var enrollText = course.enrollments > 0 ? (course.enrollments >= 10000 ? Math.round(course.enrollments/1000)+'K▲' : course.enrollments.toLocaleString()+'▲') : '-';
  $('#popular-carousel').innerHTML = '<div class="highlight-card" style="--card-color:'+color+'">'+(course.image?'<div class="highlight-thumbnail"><img src="'+course.image+'" alt="" loading="lazy"></div>':'')+'<div class="highlight-content"><div class="highlight-category" style="color:'+color+'">'+getCatEmoji(cat)+' '+cat+'</div><h4 class="highlight-title" data-course-id="'+course.id+'">'+course.title+'</h4><p class="highlight-desc">'+(course.headline||'이 강의를 확인해보세요!')+'</p><div class="highlight-meta">⭐ '+(course.rating?course.rating.toFixed(1):'-')+' 👥 '+enrollText+' ⏱️ '+(formatDuration(course.contentLength)||'-')+' '+(course.isNew?'✨신규':'')+' 🇰🇷 한글자막</div><div class="highlight-actions"><a href="'+url+'" target="_blank" class="highlight-cta">🚀 학습장으로 워프</a><button class="highlight-detail-btn" data-course-id="'+course.id+'">📋 자세히 보기</button></div></div></div>';
  $('#popular-indicator').textContent = (popularIndex+1)+' / '+popularCourses.length;
  var titleEl = document.querySelector('#popular-carousel .highlight-title[data-course-id="'+course.id+'"]');
  if (titleEl) titleEl.addEventListener('click', function() { openSidePanel(course); });
  var detailBtn = document.querySelector('#popular-carousel .highlight-detail-btn[data-course-id="'+course.id+'"]');
  if (detailBtn) detailBtn.addEventListener('click', function() { openSidePanel(course); });
}

function renderCuratorCarousel() {
  if (curatorPicks.length === 0) { $('#curator-carousel').innerHTML = '<div class="empty-state">항해사\'s PICK을 설정해주세요.<br><small>로고 3번 클릭으로 관리</small></div>'; return; }
  var course = curatorPicks[curatorIndex];
  var url = buildCourseUrl(course);
  var cat = course.category ? course.category.split(',')[0].trim() : '-';
  var color = getCatColor(cat);
  var enrollText = course.enrollments > 0 ? (course.enrollments >= 10000 ? Math.round(course.enrollments/1000)+'K▲' : course.enrollments.toLocaleString()+'▲') : '-';
  $('#curator-carousel').innerHTML = '<div class="highlight-card curator-pick" style="--card-color:'+color+'">'+(course.image?'<div class="highlight-thumbnail"><img src="'+course.image+'" alt="" loading="lazy"></div>':'')+'<div class="highlight-content"><div class="highlight-category" style="color:var(--warning)">⭐ 항해사 추천</div><h4 class="highlight-title" data-course-id="'+course.id+'">'+course.title+'</h4><p class="highlight-desc">'+(course.headline||'항해사가 엄선한 강의입니다!')+'</p><div class="highlight-meta">⭐ '+(course.rating?course.rating.toFixed(1):'-')+' 👥 '+enrollText+' ⏱️ '+(formatDuration(course.contentLength)||'-')+' '+(hasKoreanSub(course)?'🇰🇷 한글자막':'')+'</div><div class="highlight-actions"><a href="'+url+'" target="_blank" class="highlight-cta">🚀 학습장으로 워프</a><button class="highlight-detail-btn" data-course-id="'+course.id+'">📋 자세히 보기</button></div></div></div>';
  $('#curator-indicator').textContent = (curatorIndex+1)+' / '+curatorPicks.length;
  var titleEl = document.querySelector('#curator-carousel .highlight-title[data-course-id="'+course.id+'"]');
  if (titleEl) titleEl.addEventListener('click', function() { openSidePanel(course); });
  var detailBtn = document.querySelector('#curator-carousel .highlight-detail-btn[data-course-id="'+course.id+'"]');
  if (detailBtn) detailBtn.addEventListener('click', function() { openSidePanel(course); });
}

function startAutoRotation() { stopAutoRotation(); popularInterval=setInterval(function(){if(popularCourses.length>0){popularIndex=(popularIndex+1)%popularCourses.length;renderPopularCarousel();}},3000); curatorInterval=setInterval(function(){if(curatorPicks.length>0){curatorIndex=(curatorIndex+1)%curatorPicks.length;renderCuratorCarousel();}},3000); }
function stopAutoRotation() { if(popularInterval)clearInterval(popularInterval); if(curatorInterval)clearInterval(curatorInterval); }
function setupHoverPause() { ['#popular-carousel','#curator-carousel'].forEach(function(sel){var el=$(sel);if(el){el.addEventListener('mouseenter',stopAutoRotation);el.addEventListener('mouseleave',startAutoRotation);}}); }
function manageCuratorPicks() { var currentPicks=localStorage.getItem('curator_picks'); var pickIds=currentPicks?JSON.parse(currentPicks):DEFAULT_CURATOR_PICKS; var newPicks=prompt("항해사's PICK 강의 ID (쉼표 구분):",pickIds.join(',')); if(newPicks!==null){var ids=newPicks.split(',').map(function(id){return id.trim();}).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(ids));curatorPicks=ids.map(function(id){return S.courses.find(function(c){return c.id===id;});}).filter(Boolean);curatorIndex=0;renderCuratorCarousel();toast("⭐ 항해사's PICK "+curatorPicks.length+"개 업데이트");} }
