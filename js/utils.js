// ═══════════════════════════════════════════════════════════
// utils.js — 토스트, CSV, 공유링크, URL 빌더, 유틸리티
// ═══════════════════════════════════════════════════════════

// 토스트 알림
function toast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast ${type==='error'?'error':type==='warning'?'warning':''}`;
  t.textContent = msg;
  $('#toast-container').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

// 강의 URL 빌더
function buildCourseUrl(course) {
  return `https://${S.subdomain}.udemy.com/course/${course.url}/`;
}

// 데이터 전처리
function processCourses(raw) {
  return raw.map(c => ({
    ...c,
    language: mapLang(c.language),
    subtitles: c.subtitles && c.subtitles !== '없음'
      ? c.subtitles.split(',').map(s => mapLang(s.trim())).join(', ')
      : '없음',
    isNew: isNew(c.lastUpdated),
    _search: `${c.title} ${c.headline} ${c.description} ${c.objectives} ${c.category} ${c.topic} ${c.instructor}`.toLowerCase(),
  }));
}

// 고유값 추출 (필터 옵션용)
function getUnique(field, split=false) {
  const vals = new Set();
  S.courses.forEach(c => {
    if (!c[field] || c[field]==='없음' || c[field]==='N/A') return;
    if (split) c[field].split(',').forEach(v => { const t=v.trim(); if(t) vals.add(t); });
    else vals.add(c[field]);
  });
  const arr = [...vals];
  const pri = ['한국어','English'];
  return arr.sort((a,b) => {
    const ai=pri.indexOf(a), bi=pri.indexOf(b);
    if(ai!==-1&&bi!==-1) return ai-bi;
    if(ai!==-1) return -1;
    if(bi!==-1) return 1;
    return a.localeCompare(b);
  });
}

// 한영 키워드 확장 (AI 없이)
function expandKeywordsLocal(keywords) {
  const expanded = [...keywords];
  keywords.forEach(kw => {
    const mapped = KO_EN_MAP[kw];
    if (mapped) expanded.push(...mapped);
  });
  return [...new Set(expanded)];
}

// 큐레이션 스코어링
function scoreKeyword(course, kw) {
  let score = 0;
  const kwl = kw.toLowerCase();
  if (course.title && course.title.toLowerCase().includes(kwl)) score += 40;
  if (course.category && course.category.toLowerCase().includes(kwl)) score += 30;
  if (course.headline && course.headline.toLowerCase().includes(kwl)) score += 20;
  if (course.objectives && course.objectives.toLowerCase().includes(kwl)) score += 15;
  if (course.description && course.description.toLowerCase().includes(kwl)) score += 10;
  if (course.topic && course.topic.toLowerCase().includes(kwl)) score += 10;
  if (course.isNew) score += 5;
  if (course.subtitles && course.subtitles.includes('한국어')) score += 5;
  return score;
}

// CSV 다운로드
function downloadCSV(selectedOnly = false) {
  const data = selectedOnly
    ? S.courses.filter(c => S.selectedIds.has(c.id))
    : S.filtered;

  if(data.length === 0) { toast('다운로드할 별이 없습니다.', 'warning'); return; }

  const headers = ['강의ID','강의명','카테고리','주제','난이도','언어','자막','강사','소개','학습목표','평점','수강신청수','NEW','최종업데이트','강의링크'];
  const rows = data.map(c => {
    const url = buildCourseUrl(c);
    return [
      c.id,
      `"${(c.title||'').replace(/"/g,'""')}"`,
      `"${c.category||''}"`,
      `"${c.topic||''}"`,
      c.difficulty,
      c.language,
      `"${c.subtitles||''}"`,
      `"${(c.instructor||'').replace(/"/g,'""')}"`,
      `"${(c.headline||'').replace(/"/g,'""')}"`,
      `"${(c.objectives||'').replace(/"/g,'""')}"`,
      c.rating||0,
      c.enrollments||0,
      c.isNew?'Yes':'No',
      c.lastUpdated||'',
      url
    ].join(',');
  });

  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Mission_Report_${S.subdomain}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`📋 미션 보고서: ${data.length}개 별의 좌표가 기록되었습니다.`);
}

// 공유 링크 생성
function shareLink() {
  const params = new URLSearchParams();
  params.set('sub', S.subdomain);
  const q = $('#search-input').value.trim();
  if(q) params.set('q', q);
  params.set('mode', S.searchMode);
  const cats = getMSValues('f-category');
  if(cats.length) params.set('cat', cats.join(','));
  const diffs = getMSValues('f-difficulty');
  if(diffs.length) params.set('diff', diffs.join(','));
  const langs = getMSValues('f-language');
  if(langs.length) params.set('lang', langs.join(','));

  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  navigator.clipboard.writeText(url).then(() => {
    toast('🔗 공유 링크가 복사되었습니다! 슬랙이나 이메일에 붙여넣기하세요.');
  }).catch(() => {
    prompt('아래 링크를 복사하세요:', url);
  });
}

// URL 파라미터 적용 (공유 링크로 접속 시)
function applyURLParams() {
  const params = new URLSearchParams(window.location.search);
  if(params.has('q')) $('#search-input').value = params.get('q');
  if(params.has('mode')) {
    S.searchMode = params.get('mode');
    $$('.scan-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
    $(`.scan-mode-btn[data-mode="${S.searchMode}"]`)?.classList.add('active');
  }
  if(params.has('cat')) setMSValues('f-category', params.get('cat').split(','));
  if(params.has('diff')) setMSValues('f-difficulty', params.get('diff').split(','));
  if(params.has('lang')) setMSValues('f-language', params.get('lang').split(','));
}

// 카운트업 애니메이션
function animateCount(el, target, duration) {
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(step);
}
