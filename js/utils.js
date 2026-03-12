// ═══════════════════════════════════════════════════════════
// utils.js — 토스트, CSV, 공유링크, 제외 강의 필터링
// ═══════════════════════════════════════════════════════════

function toast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast ${type==='error'?'error':type==='warning'?'warning':''}`;
  t.textContent = msg;
  $('#toast-container').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function buildCourseUrl(course) {
  return `https://${S.subdomain}.udemy.com/course/${course.url}/`;
}

function parseDuration(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const str = String(value);
  const h = str.match(/(\d+)h/);
  const m = str.match(/(\d+)m/);
  const s = str.match(/(\d+)s/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0) + (s ? Math.round(parseInt(s[1]) / 60) : 0);
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function hasKoreanSub(course) {
  if (!course.subtitles || course.subtitles === '없음') return false;
  const s = course.subtitles.toLowerCase();
  return s.includes('ko') || s.includes('korean') || s.includes('한국어');
}

// ★ 데이터 전처리 + 중복 제거 + 제외 강의 필터링
function processCourses(raw) {
  const seen = new Set();
  const excluded = getExcludedCourses();
  
  const unique = raw.filter(c => {
    if (seen.has(c.id)) return false;
    if (excluded.includes(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return unique.map(c => {
    let subtitles = '없음';
    if (c.subtitles && c.subtitles !== '없음' && c.subtitles !== '') subtitles = c.subtitles;
    else if (c.captions && Array.isArray(c.captions)) { const l = c.captions.map(cap => cap.locale || cap).filter(Boolean); if (l.length > 0) subtitles = l.join(', '); }

    let contentLength = parseDuration(c.contentLength);
    if (contentLength === 0) contentLength = parseDuration(c.duration);

    return {
      ...c,
      language: mapLang(c.language),
      subtitles,
      contentLength,
      isNew: isNew(c.lastUpdated),
      _search: `${c.title} ${c.headline} ${c.description} ${c.objectives} ${c.category} ${c.topic} ${c.instructor} ${subtitles}`.toLowerCase(),
    };
  });
}

function getUnique(field, split=false) {
  const vals = new Set();
  S.courses.forEach(c => {
    if (!c[field] || c[field]==='없음' || c[field]==='N/A') return;
    if (split) c[field].split(',').forEach(v => { const t=v.trim(); if(t) vals.add(t); });
    else vals.add(c[field]);
  });
  const arr = [...vals];
  const pri = ['한국어','English','Korean'];
  return arr.sort((a,b) => {
    const ai=pri.indexOf(a), bi=pri.indexOf(b);
    if(ai!==-1&&bi!==-1) return ai-bi;
    if(ai!==-1) return -1;
    if(bi!==-1) return 1;
    return a.localeCompare(b);
  });
}

function expandKeywordsLocal(keywords) {
  const expanded = [...keywords];
  keywords.forEach(kw => { const mapped = KO_EN_MAP[kw]; if (mapped) expanded.push(...mapped); });
  return [...new Set(expanded)];
}

function scoreKeyword(course, kw) {
  let score = 0;
  const kwl = kw.toLowerCase();
  if (course.title?.toLowerCase().includes(kwl)) score += 40;
  if (course.category?.toLowerCase().includes(kwl)) score += 30;
  if (course.headline?.toLowerCase().includes(kwl)) score += 20;
  if (course.objectives?.toLowerCase().includes(kwl)) score += 15;
  if (course.description?.toLowerCase().includes(kwl)) score += 10;
  if (course.topic?.toLowerCase().includes(kwl)) score += 10;
  if (course.isNew) score += 5;
  if (hasKoreanSub(course)) score += 5;
  return score;
}

function downloadCSV(selectedOnly = false) {
  const data = selectedOnly ? S.courses.filter(c => S.selectedIds.has(c.id)) : S.filtered;
  if(data.length === 0) { toast('다운로드할 별이 없습니다.', 'warning'); return; }

  const searchKeywords = $('#search-input').value.trim();
  const filterInfo = [];
  if (searchKeywords) filterInfo.push(`검색어_${searchKeywords}`);
  const filterSuffix = filterInfo.length > 0 ? `_${filterInfo.join('_')}` : '';

  const headers = ['강의ID','강의명','카테고리','주제','난이도','언어','한국어자막','강사','소개','학습목표','평점','수강신청수','강의시간(분)','추천도점수','업데이트','강의링크'];
  const rows = data.map(c => {
    const url = buildCourseUrl(c);
    return [c.id,`"${(c.title||'').replace(/"/g,'""')}"`,`"${c.category||''}"`,`"${c.topic||''}"`,c.difficulty,c.language,hasKoreanSub(c)?'Y':'N',`"${(c.instructor||'').replace(/"/g,'""')}"`,`"${(c.headline||'').replace(/"/g,'""')}"`,`"${(c.objectives||'').replace(/"/g,'""')}"`,c.rating||0,c.enrollments||0,c.contentLength||0,c._score||0,c.lastUpdated||'',url].join(',');
  });

  const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Mission_Report_${S.subdomain}${filterSuffix}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`📋 ${data.length}개 강의 다운로드 완료`);
}

function shareLink() {
  const params = new URLSearchParams();
  params.set('sub', S.subdomain);
  const q = $('#search-input').value.trim();
  if(q) params.set('q', q);
  params.set('mode', S.searchMode);
  if(S.sensitivity !== 'balanced') params.set('sens', S.sensitivity);
  const cats = getMSValues('f-category');
  if(cats.length) params.set('cat', cats.join(','));
  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  navigator.clipboard.writeText(url).then(() => { toast('🔗 공유 링크 복사 완료!'); }).catch(() => { prompt('링크:', url); });
}

function applyURLParams() {
  const params = new URLSearchParams(window.location.search);
  if(params.has('q')) $('#search-input').value = params.get('q');
  if(params.has('mode')) { S.searchMode = params.get('mode'); $$('.scan-mode-btn[data-mode]').forEach(b=>b.classList.remove('active')); $(`.scan-mode-btn[data-mode="${S.searchMode}"]`)?.classList.add('active'); }
  if(params.has('sens')) { S.sensitivity = params.get('sens'); $$('.sensitivity-btn').forEach(b=>b.classList.remove('active')); $(`.sensitivity-btn[data-sensitivity="${S.sensitivity}"]`)?.classList.add('active'); }
  if(params.has('cat')) setMSValues('f-category', params.get('cat').split(','));
}

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
