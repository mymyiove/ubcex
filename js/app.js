// ═══════════════════════════════════════════════════════════
// app.js — 파트 1/2
// 고정 헤더 탭 + 스마트 검색 + 필터 토글 + 제외 강의
// 사이드바 번역 + 헤더 클릭 맨위로 + 추천도 정규화
// ═══════════════════════════════════════════════════════════

const ADMIN_CODE = 'jhj11';
const WORKER_URL = 'https://udemy-sync.mymyiove882.workers.dev';
const WORKER_SECRET = 'gogo1014';

// ═══ 유틸 ═══
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function toast(msg, type = 'success') {
  const c = $('#toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function getExcludedCourses() {
  try { return JSON.parse(localStorage.getItem('excluded_courses') || '[]'); } catch { return []; }
}

// ═══ 상태 ═══
const S = {
  subdomain: '',
  courses: [],
  filtered: [],
  selectedFamilies: [],
  selectedIds: new Set(),
  page: 1,
  rows: 15,
  searchMode: 'OR',
  sensitivity: 'normal',
  viewMode: 'table',
  sortField: 'score',
  sortDir: 'desc',
};

// ═══ 감도 설정 ═══
const SENSITIVITY_CONFIG = {
  strict: { label: '🔬 정밀', fields: ['title', 'category'] },
  normal: { label: '📊 보통', fields: ['title', 'category', 'topic', 'headline', 'objectives'] },
  broad:  { label: '🔭 광역', fields: ['title', 'category', 'topic', 'headline', 'objectives', 'description'] },
};

// ═══ 한영 매핑 ═══
const KO_EN_MAP = {
  '파이썬': ['python'], '자바': ['java'], '자바스크립트': ['javascript'],
  '리액트': ['react'], '데이터': ['data'], '머신러닝': ['machine learning'],
  '딥러닝': ['deep learning'], '인공지능': ['artificial intelligence', 'ai'],
  '웹개발': ['web development'], '클라우드': ['cloud'], '보안': ['security', 'cybersecurity'],
  '리더십': ['leadership'], '프로젝트관리': ['project management'],
  '엑셀': ['excel'], '마케팅': ['marketing'], '디자인': ['design'],
  '데이터분석': ['data analysis', 'analytics'], '블록체인': ['blockchain'],
  '쿠버네티스': ['kubernetes'], '도커': ['docker'], '데브옵스': ['devops'],
  '애자일': ['agile'], '스크럼': ['scrum'],
};

// ═══ 큐레이션 직무 ═══
const CURATION = {
  dev: { emoji: '💻', name: '개발자', keywords: ['programming', 'development', 'software', 'coding'] },
  data: { emoji: '📊', name: '데이터', keywords: ['data', 'analytics', 'machine learning', 'ai'] },
  design: { emoji: '🎨', name: '디자인', keywords: ['design', 'ux', 'ui', 'figma'] },
  pm: { emoji: '📋', name: 'PM', keywords: ['project management', 'agile', 'scrum', 'product'] },
  marketing: { emoji: '📢', name: '마케팅', keywords: ['marketing', 'seo', 'digital marketing'] },
  business: { emoji: '💼', name: '비즈니스', keywords: ['business', 'strategy', 'leadership', 'management'] },
  cloud: { emoji: '☁️', name: '클라우드', keywords: ['aws', 'azure', 'cloud', 'devops'] },
  security: { emoji: '🔒', name: '보안', keywords: ['security', 'cybersecurity', 'ethical hacking'] },
  office: { emoji: '📎', name: '오피스', keywords: ['excel', 'powerpoint', 'office', 'productivity'] },
};

// ═══ 로딩 시퀀스 ═══
const LAUNCH_STEPS = [
  { emoji: '⛽', message: '연료 주입 중...' },
  { emoji: '🔧', message: '엔진 점검...' },
  { emoji: '📡', message: '데이터 수신 중...' },
  { emoji: '🛰️', message: '궤도 계산...' },
  { emoji: '🌌', message: '워프 드라이브 충전...' },
];

// ═══ 카테고리 색상 & 이모지 ═══
const CAT_COLORS = {};
const CAT_EMOJIS = {
  'Development': '💻', 'Business': '💼', 'IT & Software': '🖥️',
  'Design': '🎨', 'Marketing': '📢', 'Personal Development': '🧠',
  'Office Productivity': '📎', 'Finance & Accounting': '💰',
  'Photography & Video': '📷', 'Music': '🎵', 'Health & Fitness': '💪',
  'Teaching & Academics': '📚', 'Lifestyle': '🌿',
};
function getCatColor(cat) {
  if (!cat) return 'var(--accent)';
  if (!CAT_COLORS[cat]) {
    const colors = ['#7c6cf0','#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6','#38bdf8','#4ade80','#fb923c'];
    CAT_COLORS[cat] = colors[Object.keys(CAT_COLORS).length % colors.length];
  }
  return CAT_COLORS[cat];
}
function getCatEmoji(cat) {
  if (!cat) return '📁';
  for (const [key, emoji] of Object.entries(CAT_EMOJIS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '📁';
}

// ═══ URL 빌더 ═══
function buildCourseUrl(course) {
  return `https://${S.subdomain}.udemy.com/course/${course.slug || course.id}/`;
}

// ═══ 데이터 처리 ═══
function processCourses(raw) {
  return raw.map(c => ({
    ...c,
    id: String(c.id || ''),
    title: c.title || '',
    category: (c.category || '').split(',')[0]?.trim() || '',
    topic: c.topic || '',
    headline: c.headline || '',
    objectives: Array.isArray(c.objectives) ? c.objectives.join(' ') : (c.objectives || ''),
    description: c.description || '',
    instructor: c.instructor || '',
    rating: parseFloat(c.rating) || 0,
    enrollments: parseInt(c.enrollments) || 0,
    language: c.language || '',
    subtitles: c.subtitles || '',
    level: c.level || '',
    contentLength: parseFloat(c.contentLength) || 0,
    updated: c.updated || '',
    slug: c.slug || '',
    image: c.image || '',
    isNew: isNewCourse(c.updated),
    hasKoreanSub: (c.subtitles || '').toLowerCase().includes('ko'),
    score: 0,
    displayScore: 0,
  }));
}

function isNewCourse(dateStr) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (now - d) < 90 * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

// ═══ DOMContentLoaded ═══
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('kv_subdomain');
  if (saved && saved !== ADMIN_CODE) {
    $('#input-subdomain').value = saved;
    $('#gate-history').innerHTML = `💡 이전 모선: <a id="quick-launch">${saved}</a>`;
    $('#quick-launch')?.addEventListener('click', () => { $('#input-subdomain').value = saved; goStep2(); });
  }

  $('#input-subdomain').addEventListener('input', () => {
    const v = $('#input-subdomain').value.trim();
    if (v === ADMIN_CODE) {
      $('#subdomain-preview').textContent = '🔧 관리자 모드로 진입합니다';
      $('#subdomain-preview').style.color = 'var(--warning)';
    } else {
      $('#subdomain-preview').textContent = v ? `✅ ${v}.udemy.com 연결 확인` : '';
      $('#subdomain-preview').style.color = 'var(--success)';
    }
  });

  $('#btn-step1-next').addEventListener('click', goStep2);
  $('#input-subdomain').addEventListener('keyup', e => { if (e.key === 'Enter') goStep2(); });

  const grid = $('#gate-job-grid');
  Object.entries(CURATION).forEach(([id, data]) => {
    const card = document.createElement('div');
    card.className = 'gate-job-card';
    card.dataset.family = id;
    card.innerHTML = `<span class="emoji">${data.emoji}</span><span class="label">${data.name}</span>`;
    card.addEventListener('click', () => card.classList.toggle('selected'));
    grid.appendChild(card);
  });

  $('#btn-launch').addEventListener('click', launch);
  $('#btn-skip').addEventListener('click', launch);

  window.addEventListener('scroll', () => { $('#scroll-to-top').classList.toggle('visible', window.scrollY > 300); });
  $('#scroll-to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
});

function goStep2() {
  const sub = $('#input-subdomain').value.trim();
  if (!sub) { toast('모선 주소를 입력해주세요.', 'error'); return; }
  if (sub === ADMIN_CODE) { enterAdminMode(); return; }
  S.subdomain = sub;
  localStorage.setItem('kv_subdomain', sub);
  $('#gate-step-1').classList.remove('active');
  $('#gate-step-2').classList.add('active');
}

// ═══ 관리자 모드 (이전과 동일 — 생략 없이 포함) ═══
function enterAdminMode() {
  $('#gate-page').style.display = 'none';
  const ap = document.createElement('div');
  ap.id = 'admin-panel';
  ap.innerHTML = `<div class="admin-container">
    <div class="admin-header">
      <h1>🔧 관리자 콘솔</h1>
      <p class="admin-subtitle">Udemy Business Course Explorer — 시스템 관리</p>
      <button class="admin-exit-btn" id="admin-exit">🚪 나가기</button>
    </div>
    <div class="admin-status-cards">
      <div class="admin-card"><div class="admin-card-icon">📡</div><div class="admin-card-title">동기화</div><div class="admin-card-value" id="sync-status-value">확인 중...</div><div class="admin-card-sub" id="sync-status-sub"></div></div>
      <div class="admin-card"><div class="admin-card-icon">📚</div><div class="admin-card-title">총 강의</div><div class="admin-card-value" id="courses-count-value">-</div><div class="admin-card-sub" id="courses-count-sub"></div></div>
      <div class="admin-card"><div class="admin-card-icon">📦</div><div class="admin-card-title">Chunk</div><div class="admin-card-value" id="chunks-count-value">-</div><div class="admin-card-sub">분할 저장</div></div>
      <div class="admin-card"><div class="admin-card-icon">🔑</div><div class="admin-card-title">API</div><div class="admin-card-value" id="api-status-value">확인 중...</div><div class="admin-card-sub" id="api-status-sub"></div></div>
    </div>
    <div class="admin-sections">
      <div class="admin-section"><h3>📡 강의 동기화</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-sync-continue">▶️ 이어서</button><button class="admin-btn admin-btn-warning" id="btn-sync-reset">🔄 전체 재동기화</button><button class="admin-btn admin-btn-primary" id="btn-sync-auto">🚀 자동 전체</button></div><div class="admin-log" id="sync-log"></div></div>
      <div class="admin-section"><h3>⭐ 큐레이터 PICK</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-manage-picks">⭐ PICK 설정</button><button class="admin-btn" id="btn-view-picks">📋 현재 보기</button></div><div class="admin-log" id="picks-log"></div></div>
      <div class="admin-section"><h3>🚫 제외 강의 관리</h3><p class="admin-desc">웅진데모 전용 강의 등 제외할 강의 ID를 관리합니다.</p><div class="admin-btn-group"><button class="admin-btn admin-btn-danger" id="btn-manage-excluded">🚫 제외 강의 설정</button><button class="admin-btn" id="btn-view-excluded">📋 현재 보기</button></div><div class="admin-log" id="excluded-log"></div></div>
      <div class="admin-section"><h3>🔍 데이터 검증</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-verify-data">📊 현황</button><button class="admin-btn" id="btn-verify-sample">📋 샘플</button></div><div class="admin-log" id="verify-log"></div></div>
      <div class="admin-section"><h3>🔑 API 테스트</h3><div class="admin-btn-group"><button class="admin-btn" id="btn-test-graphql">🔐 GraphQL</button><button class="admin-btn" id="btn-test-gemini">🤖 Gemini</button></div><div class="admin-log" id="api-log"></div></div>
      <div class="admin-section"><h3>📋 로우 데이터</h3><div class="admin-btn-group"><span>Chunk: <input type="number" id="chunk-number" value="0" min="0" style="width:60px;padding:0.3rem;background:var(--bg-card-solid);border:1px solid var(--border);border-radius:4px;color:var(--text-primary);"></span><button class="admin-btn" id="btn-view-chunk">🔍 조회</button></div><div class="admin-log" id="raw-log"></div></div>
    </div>
  </div>`;
  document.body.appendChild(ap);
  $('#admin-exit').addEventListener('click', exitAdminMode);
  $('#btn-sync-continue').addEventListener('click', () => runSync(false));
  $('#btn-sync-reset').addEventListener('click', () => { if(confirm('전체 재동기화?')) runSync(true); });
  $('#btn-sync-auto').addEventListener('click', runAutoSync);
  $('#btn-manage-picks').addEventListener('click', manageCuratorPicksAdmin);
  $('#btn-view-picks').addEventListener('click', viewCurrentPicks);
  $('#btn-manage-excluded').addEventListener('click', manageExcludedCourses);
  $('#btn-view-excluded').addEventListener('click', viewExcludedCourses);
  $('#btn-verify-data').addEventListener('click', verifyData);
  $('#btn-verify-sample').addEventListener('click', verifySample);
  $('#btn-test-graphql').addEventListener('click', testGraphQL);
  $('#btn-test-gemini').addEventListener('click', testGemini);
  $('#btn-view-chunk').addEventListener('click', viewChunk);
  loadAdminStatus();
  toast('🔧 관리자 모드에 진입했습니다.');
}

function exitAdminMode() { const p=$('#admin-panel'); if(p) p.remove(); $('#gate-page').style.display=''; $('#input-subdomain').value=''; }

async function loadAdminStatus() {
  try { const r=await fetch(`${WORKER_URL}/status`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); $('#sync-status-value').textContent=d.isComplete?'✅ 완료':d.synced?'⏳ 진행 중':'❌ 미완료'; $('#sync-status-sub').textContent=d.syncedAt?`마지막: ${new Date(d.syncedAt).toLocaleString('ko-KR')}`:'기록 없음'; $('#courses-count-value').textContent=(d.totalCount||0).toLocaleString(); $('#courses-count-sub').textContent=d.isComplete?'완료':'진행 중'; $('#chunks-count-value').textContent=d.totalChunks||0; } catch(e) { $('#sync-status-value').textContent='❌ 연결 실패'; }
  try { const r=await fetch(`${WORKER_URL}/test-token`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); $('#api-status-value').textContent=d.success?'✅ 정상':'❌ 오류'; $('#api-status-sub').textContent=d.success?'GraphQL OK':'실패'; } catch(e) { $('#api-status-value').textContent='❌'; }
}

async function runSync(isReset) { const l=$('#sync-log'); l.innerHTML=`<div class="log-entry log-info">📡 시작...</div>`; try { const r=await fetch(`${WORKER_URL}/sync${isReset?'?reset=true':''}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); l.innerHTML+=`<div class="log-entry ${d.success?'log-success':'log-error'}">${d.success?'✅':'❌'} ${d.message||d.error}</div>`; } catch(e) { l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`; } loadAdminStatus(); }

async function runAutoSync() { const l=$('#sync-log'); const b=$('#btn-sync-auto'); b.disabled=true; b.textContent='⏳...'; l.innerHTML=`<div class="log-entry log-info">🚀 자동 시작...</div>`; let c=1,go=true; while(go) { l.innerHTML+=`<div class="log-entry log-info">📡 [${c}]...</div>`; l.scrollTop=l.scrollHeight; try { const ep=c===1?`${WORKER_URL}/sync?reset=true`:`${WORKER_URL}/sync`; const r=await fetch(ep,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const d=await r.json(); if(d.error){l.innerHTML+=`<div class="log-entry log-error">❌ ${d.error}</div>`;break;} l.innerHTML+=`<div class="log-entry log-success">✅ ${d.message}</div>`; if(d.stoppedByTimeout){await new Promise(r=>setTimeout(r,2000));c++;}else{l.innerHTML+=`<div class="log-entry log-success">🎉 완료! ${d.totalCount}개</div>`;go=false;} } catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;break;} l.scrollTop=l.scrollHeight; } b.disabled=false; b.textContent='🚀 자동 전체'; loadAdminStatus(); }

function manageCuratorPicksAdmin() { const c=localStorage.getItem('curator_picks'); const ids=c?JSON.parse(c):['8324','1717020','2360128']; const n=prompt('큐레이터 PICK 강의 ID (쉼표 구분):',ids.join(',')); if(n!==null){const i=n.split(',').map(x=>x.trim()).filter(Boolean);localStorage.setItem('curator_picks',JSON.stringify(i));const l=$('#picks-log');if(l)l.innerHTML=`<div class="log-entry log-success">⭐ ${i.length}개 업데이트</div>`;toast(`⭐ ${i.length}개 업데이트`);} }
function viewCurrentPicks() { const c=localStorage.getItem('curator_picks'); const ids=c?JSON.parse(c):['8324','1717020','2360128']; const l=$('#picks-log'); if(l)l.innerHTML=`<div class="log-entry log-info">${ids.map((id,i)=>`${i+1}. ID: ${id}`).join('<br>')}</div>`; }
function manageExcludedCourses() { const c=localStorage.getItem('excluded_courses'); const ids=c?JSON.parse(c):[]; const n=prompt('제외할 강의 ID (쉼표 구분):',ids.join(',')); if(n!==null){const i=n.split(',').map(x=>x.trim()).filter(Boolean);localStorage.setItem('excluded_courses',JSON.stringify(i));const l=$('#excluded-log');if(l)l.innerHTML=`<div class="log-entry log-success">🚫 ${i.length}개 제외 설정</div>`;toast(`🚫 ${i.length}개 제외`);} }
function viewExcludedCourses() { const c=localStorage.getItem('excluded_courses'); const ids=c?JSON.parse(c):[]; const l=$('#excluded-log'); if(l)l.innerHTML=`<div class="log-entry log-info">🚫 제외: ${ids.length}개<br>${ids.length>0?ids.join(', '):'없음'}</div>`; }

async function verifyData() { const l=$('#verify-log'); l.innerHTML=`<div class="log-entry log-info">🔍 검증...</div>`; let ch=0,t=0,s=0,k=0,d=0,r=0,e=0; while(true){try{const res=await fetch(`${WORKER_URL}/get-courses?chunk=${ch}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});if(!res.ok)break;const data=await res.json();if(!data||!Array.isArray(data)||data.length===0)break;t+=data.length;s+=data.filter(c=>c.subtitles&&c.subtitles!=='없음'&&c.subtitles!=='').length;k+=data.filter(c=>c.subtitles&&c.subtitles.toLowerCase().includes('ko')).length;d+=data.filter(c=>c.contentLength&&typeof c.contentLength==='number'&&c.contentLength>0).length;r+=data.filter(c=>c.rating&&c.rating>0).length;e+=data.filter(c=>c.enrollments&&c.enrollments>0).length;ch++;}catch(err){break;}} const p=(n)=>t>0?`${(n/t*100).toFixed(1)}%`:'0%'; l.innerHTML+=`<div class="log-entry log-info">📚 총: ${t.toLocaleString()} (${ch} chunks)<br>💬 자막: ${s.toLocaleString()} (${p(s)})<br>🇰🇷 한국어: ${k.toLocaleString()} (${p(k)})<br>⏱️ 시간: ${d.toLocaleString()} (${p(d)})<br>⭐ 평점: ${r.toLocaleString()} (${p(r)})<br>👥 수강: ${e.toLocaleString()} (${p(e)})</div>`; }

async function verifySample() { const l=$('#verify-log'); l.innerHTML=`<div class="log-entry log-info">📋 로드...</div>`; try{const r=await fetch(`${WORKER_URL}/get-courses?chunk=0`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});const d=await r.json();if(!d||d.length===0){l.innerHTML+=`<div class="log-entry log-error">❌ 없음</div>`;return;}const s=d[0];l.innerHTML+=`<div class="log-entry log-info">필드: ${Object.keys(s).join(', ')}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

async function testGraphQL() { const l=$('#api-log'); l.innerHTML=`<div class="log-entry log-info">🔐 테스트...</div>`; try{const r=await fetch(`${WORKER_URL}/test-token`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});const d=await r.json();l.innerHTML+=`<div class="log-entry ${d.success?'log-success':'log-error'}">${d.success?'✅ 성공':'❌ '+d.error}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

async function testGemini() { const l=$('#api-log'); l.innerHTML=`<div class="log-entry log-info">🤖 테스트...</div>`; try{const r=await fetch('/api/ai-expand',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'python'})});const d=await r.json();l.innerHTML+=`<div class="log-entry ${d.success?'log-success':'log-error'}">${d.success?'✅ 성공':'❌ '+(d.error||'실패')}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

async function viewChunk() { const l=$('#raw-log'); const n=$('#chunk-number').value||'0'; l.innerHTML=`<div class="log-entry log-info">📋 Chunk ${n}...</div>`; try{const r=await fetch(`${WORKER_URL}/get-courses?chunk=${n}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});if(!r.ok){l.innerHTML+=`<div class="log-entry log-error">❌ 없음</div>`;return;}const d=await r.json();l.innerHTML+=`<div class="log-entry log-info">📦 ${d.length}개<br>${d.slice(0,3).map((c,i)=>`${i+1}. ${c.title?.substring(0,40)}`).join('<br>')}</div>`;}catch(e){l.innerHTML+=`<div class="log-entry log-error">❌ ${e.message}</div>`;} }

// ═══════════════════════════════════════════════════════════
// app.js — 파트 2/2
// launch + initApp + 검색/필터/렌더링 + 사이드바 번역
// ═══════════════════════════════════════════════════════════

// ═══ 일반 모드 — 병렬 chunk 로딩 ═══
async function launch() {
  S.selectedFamilies = [...$$('.gate-job-card.selected')].map(c => c.dataset.family);
  const warp = $('#warp-overlay');
  warp.classList.add('active');
  const loadingPromise = playLaunchSequence();

  let dataLoaded = false;
  try {
    let totalChunks = 0;
    try { const r=await fetch(`${WORKER_URL}/status`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}); const s=await r.json(); totalChunks=s.totalChunks||0; } catch(e) {}

    let allCourses = [];
    if (totalChunks > 0) {
      const m=$('#launch-message'); if(m) m.textContent=`병렬 로딩 중... (${totalChunks} chunks)`;
      const promises=[]; for(let i=0;i<totalChunks;i++){promises.push(fetch(`${WORKER_URL}/get-courses?chunk=${i}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}}).then(r=>r.ok?r.json():[]).catch(()=>[]));}
      const results=await Promise.all(promises);
      results.forEach(d=>{if(Array.isArray(d)&&d.length>0) allCourses=allCourses.concat(d);});
      if(m) m.textContent=`${allCourses.length.toLocaleString()}개 로드 완료!`;
    } else {
      let ci=0; while(true){try{const r=await fetch(`${WORKER_URL}/get-courses?chunk=${ci}`,{headers:{'Authorization':`Bearer ${WORKER_SECRET}`}});if(!r.ok)break;const d=await r.json();if(!d||!Array.isArray(d)||d.length===0)break;allCourses=allCourses.concat(d);ci++;if(ci>=50)break;}catch(e){break;}}
    }

    const excluded = getExcludedCourses();
    if (excluded.length > 0) allCourses = allCourses.filter(c => !excluded.includes(String(c.id)));

    if (allCourses.length > 0) { S.courses = processCourses(allCourses); dataLoaded = true; }
  } catch (e) { console.error(e); }

  await loadingPromise;
  if (!dataLoaded) { toast('강의 데이터를 불러올 수 없습니다.', 'error'); warp.classList.remove('active'); return; }

  $('#launch-emoji').textContent = '🌟';
  $('#launch-message').textContent = '워프 점프!';
  $('#progress-fill').style.width = '100%';
  await new Promise(r => setTimeout(r, 600));

  warp.classList.remove('active');
  $('#gate-page').style.display = 'none';
  $('#app-container').style.display = 'block';
  initApp();
  toast(`🌌 ${S.subdomain} 우주에 도착! ${S.courses.length.toLocaleString()}개의 별`);
}

async function playLaunchSequence() {
  for (let i = 0; i < LAUNCH_STEPS.length; i++) {
    const step = LAUNCH_STEPS[i];
    $('#launch-emoji').textContent = step.emoji;
    $('#launch-message').textContent = step.message;
    $('#progress-fill').style.width = `${((i+1)/(LAUNCH_STEPS.length+1))*100}%`;
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
  }
}

// ═══ 앱 초기화 ═══
function initApp() {
  $('#welcome-msg').innerHTML = S.selectedFamilies.length > 0
    ? `${S.selectedFamilies.map(f=>CURATION[f]?.emoji||'').join('')} 탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`
    : `탐험가님, <strong>${S.subdomain}</strong> 우주에 도착했습니다!`;

  renderDashCards();
  initMultiSelects();
  if (typeof initHighlight === 'function') { initHighlight(); setupHoverPause(); }

  // ★ 헤더 제목 클릭 → 맨위로 + 3번 클릭 큐레이터 PICK
  let clickCount = 0;
  const title = $('#header-title');
  if (title) {
    title.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      clickCount++;
      setTimeout(() => { clickCount = 0; }, 1000);
      if (clickCount === 3) {
        if (typeof manageCuratorPicks === 'function') manageCuratorPicks();
        clickCount = 0;
      }
    });
  }

  // 고정 헤더 탭 이벤트
  $$('.header-nav-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.header-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchTab(btn.dataset.tab);
  }));

  // 스마트 검색 제안 + 필터링
  let debounce, suggestionDebounce;
  $('#search-input')?.addEventListener('input', () => {
    clearTimeout(debounce);
    clearTimeout(suggestionDebounce);
    debounce = setTimeout(applyFilters, 300);
    suggestionDebounce = setTimeout(() => showSearchSuggestions($('#search-input').value.trim()), 200);
  });

  $('#search-input')?.addEventListener('focus', () => {
    const val = $('#search-input').value.trim();
    if (val.length >= 2) showSearchSuggestions(val);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.scanner-input-wrap')) {
      $('#search-suggestions')?.classList.remove('open');
    }
  });

  // 검색 모드
  $$('.scan-mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => { $$('.scan-mode-btn[data-mode]').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); S.searchMode=btn.dataset.mode; applyFilters(); });
  });

  // 감도 조절
  $$('.sensitivity-btn').forEach(btn => {
    btn.addEventListener('click', () => { $$('.sensitivity-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); S.sensitivity=btn.dataset.sensitivity; applyFilters(); toast(`🎚️ 감도: ${SENSITIVITY_CONFIG[S.sensitivity]?.label}`); });
  });

  // AI 스캔
  $('#btn-ai-scan')?.addEventListener('click', handleAIScan);
  $('#btn-apply-ai')?.addEventListener('click', applyAIKeywords);
  $('#btn-ai-select-all')?.addEventListener('click', () => $$('#ai-panel-results .ai-kw-tag').forEach(t=>t.classList.add('selected')));
  $('#btn-ai-close')?.addEventListener('click', () => $('#ai-panel').classList.remove('open'));

  // 상세 필터 토글
  $('#btn-filter-toggle')?.addEventListener('click', () => {
    const grid = $('#filters-grid');
    const btn = $('#btn-filter-toggle');
    grid.classList.toggle('open');
    btn.classList.toggle('active');
  });

  // 정렬, 표시
  $('#sort-select')?.addEventListener('change', applyFilters);
  $('#rows-select')?.addEventListener('change', () => { S.rows=parseInt($('#rows-select').value); S.page=1; renderList(); });

  // 기능 버튼
  $('#btn-csv')?.addEventListener('click', () => downloadCSV(false));
  $('#btn-share')?.addEventListener('click', shareLink);
  $('#btn-reset-inline')?.addEventListener('click', () => resetAll(true));

  // 뷰 모드
  $$('.view-btn').forEach(btn => btn.addEventListener('click', () => { $$('.view-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); if(btn.dataset.view) { S.viewMode=btn.dataset.view; renderList(); } }));

  // 전체 선택
  $('#check-all')?.addEventListener('change', (e) => { const ids=getPageData().map(c=>c.id); if(e.target.checked) ids.forEach(id=>S.selectedIds.add(id)); else ids.forEach(id=>S.selectedIds.delete(id)); renderList(); updateFAB(); });

  // FAB
  $('#fab-csv')?.addEventListener('click', () => downloadCSV(true));
  $('#fab-link')?.addEventListener('click', () => { const links=[...S.selectedIds].map(id=>{const c=S.courses.find(x=>x.id===id);return c?buildCourseUrl(c):'';}).filter(Boolean); navigator.clipboard.writeText(links.join('\n')); toast(`🔗 ${links.length}개 복사`); });
  $('#fab-clear')?.addEventListener('click', () => { S.selectedIds.clear(); renderList(); updateFAB(); });

  // 사이드 패널
  $('#side-panel-overlay')?.addEventListener('click', (e) => { if(e.target===$('#side-panel-overlay')) closeSidePanel(); });
  $('#sp-close')?.addEventListener('click', closeSidePanel);

  // 멀티셀렉트 외부 클릭
  window.addEventListener('click', e => { if(!e.target.closest('.ms-wrap')) $$('.ms-panel').forEach(p=>p.classList.remove('open')); });

  // 미션 센터 + TOP
  if (typeof initMissionCenter === 'function') initMissionCenter();
  if (typeof initStars === 'function') initStars();

  // 도움말
  $('#btn-help')?.addEventListener('click', () => { $('#help-overlay')?.classList.add('active'); });
  $('#help-close')?.addEventListener('click', () => { $('#help-overlay')?.classList.remove('active'); });
  $('#help-overlay')?.addEventListener('click', (e) => { if(e.target===$('#help-overlay')) $('#help-overlay').classList.remove('active'); });

  // 키보드 단축키
  document.addEventListener('keydown', (e) => {
    if(e.key==='/'&&!e.target.matches('input,textarea,select')){e.preventDefault();$('#search-input')?.focus();}
    if(e.key==='Escape'){closeSidePanel();$('#help-overlay')?.classList.remove('active');$('#ai-panel')?.classList.remove('open');$('#search-suggestions')?.classList.remove('open');}
    if(!e.target.matches('input,textarea,select')){
      if(e.key==='ArrowLeft'&&S.page>1){S.page--;renderList();}
      if(e.key==='ArrowRight'){const tp=Math.ceil(S.filtered.length/S.rows);if(S.page<tp){S.page++;renderList();}}
    }
  });

  // URL 파라미터
  applyURLParams();

  // 첫 필터링
  applyFilters();
}

// ═══ 탭 전환 ═══
function switchTab(tabId) {
  $$('.tab-panel').forEach(p => p.classList.remove('active'));
  $(`#panel-${tabId}`)?.classList.add('active');
  const listSection = $('#list-section');
  if (listSection) listSection.style.display = tabId === 'stars' ? 'none' : '';
}

// ═══ 스마트 검색 제안 ═══
function showSearchSuggestions(query) {
  const container = $('#search-suggestions');
  if (!container) return;
  if (query.length < 2) { container.classList.remove('open'); return; }

  const queryLower = query.toLowerCase();

  const titleMatches = S.courses
    .filter(c => c.title?.toLowerCase().includes(queryLower))
    .sort((a, b) => (b.enrollments || 0) - (a.enrollments || 0))
    .slice(0, 3);

  const catMatches = [...new Set(S.courses
    .filter(c => c.category?.toLowerCase().includes(queryLower))
    .map(c => c.category?.split(',')[0]?.trim())
  )].filter(Boolean).slice(0, 2);

  const topicMatches = [...new Set(S.courses
    .filter(c => c.topic?.toLowerCase().includes(queryLower))
    .map(c => c.topic)
  )].filter(Boolean).slice(0, 2);

  const koEnSuggestions = [];
  Object.entries(KO_EN_MAP).forEach(([ko, enList]) => {
    if (ko.includes(queryLower) || enList.some(en => en.includes(queryLower))) {
      koEnSuggestions.push({ ko, en: enList[0] });
    }
  });

  let html = '';

  if (titleMatches.length > 0) {
    html += `<div class="suggestion-category">🔥 인기 강의</div>`;
    html += titleMatches.map(c => `
      <div class="suggestion-item" data-course-id="${c.id}">
        <span class="suggestion-icon">📖</span>
        <span class="suggestion-text">${c.title.length > 50 ? c.title.substring(0,50)+'...' : c.title}</span>
        <span class="suggestion-badge">⭐${c.rating?.toFixed(1)||'-'}</span>
      </div>
    `).join('');
  }

  if (catMatches.length > 0) {
    html += `<div class="suggestion-category">🌌 카테고리</div>`;
    html += catMatches.map(cat => `
      <div class="suggestion-item" data-category="${cat}">
        <span class="suggestion-icon">${getCatEmoji(cat)}</span>
        <span class="suggestion-text">${cat}</span>
        <span class="suggestion-badge">카테고리 필터</span>
      </div>
    `).join('');
  }

  if (topicMatches.length > 0) {
    html += `<div class="suggestion-category">💡 주제</div>`;
    html += topicMatches.map(topic => `
      <div class="suggestion-item" data-topic="${topic}">
        <span class="suggestion-icon">🏷️</span>
        <span class="suggestion-text">${topic}</span>
        <span class="suggestion-badge">주제 검색</span>
      </div>
    `).join('');
  }

  if (koEnSuggestions.length > 0) {
    html += `<div class="suggestion-category">🌐 번역 제안</div>`;
    html += koEnSuggestions.slice(0, 2).map(s => `
      <div class="suggestion-item" data-keyword="${s.en}">
        <span class="suggestion-icon">🔄</span>
        <span class="suggestion-text">${s.ko} → ${s.en}</span>
        <span class="suggestion-badge">영어 키워드</span>
      </div>
    `).join('');
  }

  if (html === '') { container.classList.remove('open'); return; }

  container.innerHTML = html;
  container.classList.add('open');

  container.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.courseId) {
        const course = S.courses.find(c => c.id === item.dataset.courseId);
        if (course) openSidePanel(course);
      } else if (item.dataset.category) {
        if (typeof setMSValues === 'function') setMSValues('f-category', [item.dataset.category]);
        applyFilters();
      } else if (item.dataset.topic) {
        $('#search-input').value = item.dataset.topic;
        applyFilters();
      } else if (item.dataset.keyword) {
        const current = $('#search-input').value.trim();
        $('#search-input').value = current ? `${current}, ${item.dataset.keyword}` : item.dataset.keyword;
        applyFilters();
      }
      container.classList.remove('open');
    });
  });
}

// ═══ 사이드 패널 + ★ 번역 기능 ═══
function openSidePanel(course) {
  const panel = $('#side-panel');
  const overlay = $('#side-panel-overlay');
  const content = $('#sp-content');

  const url = buildCourseUrl(course);
  const catColor = getCatColor(course.category);

  content.innerHTML = `
    <h3 class="sp-title">${course.title}</h3>
    ${course.image ? `<div class="sp-thumbnail"><img src="${course.image}" alt="${course.title}"></div>` : ''}
    <a href="${url}" target="_blank" class="sp-cta">🚀 Udemy에서 수강하기</a>
    <button class="sp-translate-btn" id="sp-translate-btn">🌐 한국어로 번역하기</button>
    <div class="sp-meta">
      <span class="sp-meta-tag" style="border-color:${catColor}">${getCatEmoji(course.category)} ${course.category}</span>
      <span class="sp-meta-tag">⭐ ${course.rating?.toFixed(1) || '-'}</span>
      <span class="sp-meta-tag">👥 ▲${(course.enrollments||0).toLocaleString()}</span>
      <span class="sp-meta-tag">🌐 ${course.language}</span>
      ${course.hasKoreanSub ? '<span class="sp-meta-tag" style="border-color:var(--success);color:var(--success)">🇰🇷 한국어자막</span>' : ''}
      <span class="sp-meta-tag">📊 ${course.level || '-'}</span>
      <span class="sp-meta-tag">⏱️ ${course.contentLength ? course.contentLength.toFixed(1)+'h' : '-'}</span>
      ${course.isNew ? '<span class="sp-meta-tag" style="border-color:var(--warning);color:var(--warning)">✨ 신규</span>' : ''}
    </div>
    ${course.instructor ? `<div class="sp-section"><h4>👨‍🏫 강사</h4><p>${course.instructor}</p></div>` : ''}
    ${course.headline ? `<div class="sp-section sp-translatable"><h4>📝 강의 소개</h4><p>${course.headline}</p></div>` : ''}
    ${course.objectives ? `<div class="sp-section sp-translatable"><h4>🎯 학습 목표</h4><ul>${(Array.isArray(course.objectives) ? course.objectives : course.objectives.split(/[,;]/).filter(Boolean)).map(o => `<li>${o.trim()}</li>`).join('')}</ul></div>` : ''}
    ${course.description ? `<div class="sp-section sp-translatable"><h4>📖 상세 설명</h4><div>${course.description}</div></div>` : ''}
    <button class="sp-similar-btn" onclick="findSimilar('${course.id}')">🔍 비슷한 강의 찾기</button>
  `;

  // 번역 버튼 이벤트
  const translateBtn = content.querySelector('#sp-translate-btn');
  if (translateBtn) {
    translateBtn.addEventListener('click', () => translateSidePanel(translateBtn));
  }

  panel.classList.add('open');
  overlay.classList.add('open');
}

function closeSidePanel() {
  $('#side-panel')?.classList.remove('open');
  $('#side-panel-overlay')?.classList.remove('open');
}

// ★ 사이드바 번역 함수
async function translateSidePanel(btn) {
  if (!btn) return;

  // 토글: 이미 번역된 상태면 원문 복원
  if (btn.classList.contains('translated')) {
    $$('#sp-content .translated-text').forEach(el => el.remove());
    $$('#sp-content .sp-original-hidden').forEach(el => {
      el.style.display = '';
      el.classList.remove('sp-original-hidden');
    });
    btn.textContent = '🌐 한국어로 번역하기';
    btn.classList.remove('translated');
    return;
  }

  btn.textContent = '⏳ 번역 중...';
  btn.disabled = true;

  // 번역 대상: .sp-translatable 내부의 p, li, div (강의소개 ~ 하단)
  const targets = $$('#sp-content .sp-translatable p, #sp-content .sp-translatable li, #sp-content .sp-translatable > div:not(h4)');
  let translated = 0;

  for (const el of targets) {
    const text = el.textContent.trim();
    if (!text || text.length < 5) continue;

    // 이미 한국어가 많으면 스킵
    const koChars = (text.match(/[가-힣]/g) || []).length;
    if (koChars > text.length * 0.3) continue;

    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=${encodeURIComponent(text.substring(0, 2000))}`
      );
      const data = await res.json();
      const translatedText = data[0]?.map(s => s[0]).join('') || '';

      if (translatedText && translatedText !== text) {
        const div = document.createElement('div');
        div.className = 'translated-text';
        div.textContent = translatedText;
        el.after(div);
        translated++;
      }
    } catch (e) {
      console.warn('번역 실패:', e);
    }

    // Rate limiting — 요청 간 100ms 대기
    await new Promise(r => setTimeout(r, 100));
  }

  btn.disabled = false;
  if (translated > 0) {
    btn.textContent = '🔄 원문 보기';
    btn.classList.add('translated');
    toast(`🌐 ${translated}개 항목 번역 완료!`);
  } else {
    btn.textContent = '🌐 한국어로 번역하기';
    toast('이미 한국어이거나 번역할 내용이 없습니다.', 'warning');
  }
}

// ═══ 유사 강의 찾기 ═══
function findSimilar(courseId) {
  const course = S.courses.find(c => c.id === courseId);
  if (!course) return;
  closeSidePanel();
  const keywords = course.title.split(/[\s:—\-,]+/).filter(w => w.length > 2).slice(0, 3).join(', ');
  $('#search-input').value = keywords;
  applyFilters();
  toast(`🔍 "${course.title.substring(0, 30)}..." 유사 강의 검색`);
}

// ═══ 대시보드 카드 ═══
function renderDashCards() {
  const total = S.courses.length;
  const kr = S.courses.filter(c => c.hasKoreanSub).length;
  const newC = S.courses.filter(c => c.isNew).length;
  const cats = new Set(S.courses.map(c => c.category).filter(Boolean)).size;

  $('#stat-total-val').textContent = total.toLocaleString();
  $('#stat-kr-val').textContent = kr.toLocaleString();
  $('#stat-new-val').textContent = newC.toLocaleString();
  $('#stat-cat-val').textContent = cats.toLocaleString();
}

// ═══ 멀티셀렉트 초기화 (간소화) ═══
function initMultiSelects() {
  // 카테고리
  const cats = [...new Set(S.courses.map(c => c.category).filter(Boolean))].sort();
  initMS('f-category', cats);

  // 언어
  const langs = [...new Set(S.courses.map(c => c.language).filter(Boolean))].sort();
  initMS('f-lang', langs);

  // 자막
  const allSubs = new Set();
  S.courses.forEach(c => { if(c.subtitles) c.subtitles.split(',').forEach(s => { const t=s.trim(); if(t) allSubs.add(t); }); });
  initMS('f-subtitle', [...allSubs].sort());

  // 난이도
  const levels = [...new Set(S.courses.map(c => c.level).filter(Boolean))].sort();
  const levelSel = $('#f-level');
  if (levelSel) { levels.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; levelSel.appendChild(o); }); }
}

function initMS(id, items) {
  const wrap = $(`#${id}`);
  if (!wrap) return;
  const btn = wrap.querySelector('.ms-btn');
  const panel = wrap.querySelector('.ms-panel');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    $$('.ms-panel').forEach(p => { if(p !== panel) p.classList.remove('open'); });
    panel.classList.toggle('open');
  });

  panel.innerHTML = items.map(item => `
    <div class="ms-item">
      <label><input type="checkbox" value="${item}"> ${item}</label>
    </div>
  `).join('');

  panel.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', () => {
      const selected = [...panel.querySelectorAll('input:checked')].map(i => i.value);
      btn.textContent = selected.length > 0 ? `${selected.length}개 선택` : btn.dataset.default || '전체';
      applyFilters();
    });
  });

  btn.dataset.default = btn.textContent;
}

function getMSValues(id) {
  const wrap = $(`#${id}`);
  if (!wrap) return [];
  return [...wrap.querySelectorAll('.ms-panel input:checked')].map(i => i.value);
}

function setMSValues(id, values) {
  const wrap = $(`#${id}`);
  if (!wrap) return;
  wrap.querySelectorAll('.ms-panel input').forEach(cb => {
    cb.checked = values.includes(cb.value);
  });
  const btn = wrap.querySelector('.ms-btn');
  btn.textContent = values.length > 0 ? `${values.length}개 선택` : btn.dataset.default || '전체';
}

// ═══ 필터 적용 + ★ 추천도 정규화 ═══
function applyFilters() {
  const query = ($('#search-input')?.value || '').trim();
  const keywords = query ? query.split(/[,;]+/).map(k => k.trim().toLowerCase()).filter(Boolean) : [];

  // 한영 매핑 확장
  const expandedKeywords = [...keywords];
  keywords.forEach(kw => {
    Object.entries(KO_EN_MAP).forEach(([ko, enList]) => {
      if (ko.includes(kw)) enList.forEach(en => { if(!expandedKeywords.includes(en)) expandedKeywords.push(en); });
      enList.forEach(en => { if(en.includes(kw) && !expandedKeywords.includes(ko)) expandedKeywords.push(ko); });
    });
  });

  const catFilter = getMSValues('f-category');
  const langFilter = getMSValues('f-lang');
  const subFilter = getMSValues('f-subtitle');
  const levelFilter = $('#f-level')?.value || '';
  const fields = SENSITIVITY_CONFIG[S.sensitivity]?.fields || SENSITIVITY_CONFIG.normal.fields;

  let results = S.courses.filter(course => {
    // 카테고리 필터
    if (catFilter.length > 0 && !catFilter.includes(course.category)) return false;
    // 언어 필터
    if (langFilter.length > 0 && !langFilter.includes(course.language)) return false;
    // 자막 필터
    if (subFilter.length > 0 && !subFilter.some(s => course.subtitles?.includes(s))) return false;
    // 난이도 필터
    if (levelFilter && course.level !== levelFilter) return false;

    // 키워드 검색
    if (expandedKeywords.length === 0) return true;

    const searchText = fields.map(f => (course[f] || '').toLowerCase()).join(' ');

    if (S.searchMode === 'AND') {
      return expandedKeywords.every(kw => searchText.includes(kw));
    } else {
      return expandedKeywords.some(kw => searchText.includes(kw));
    }
  });

  // 스코어링
  if (expandedKeywords.length > 0) {
    const FIELD_WEIGHTS = {
      title: 50, category: 30, topic: 25, headline: 15, objectives: 10, description: 5
    };

    results.forEach(course => {
      let score = 0;
      expandedKeywords.forEach(kw => {
        fields.forEach(field => {
          const text = (course[field] || '').toLowerCase();
          if (text.includes(kw)) {
            score += FIELD_WEIGHTS[field] || 5;
          }
        });
      });

      // 보너스
      if (course.isNew) score += 3;
      if (course.hasKoreanSub) score += 3;
      if (course.rating >= 4.5) score += 5;

      course.score = score;
    });

    // ★ 추천도 정규화 (0~100)
    const maxScore = Math.max(...results.map(c => c.score), 1);
    results.forEach(c => {
      c.displayScore = Math.round((c.score / maxScore) * 100);
    });
  } else {
    results.forEach(c => { c.score = 0; c.displayScore = 0; });
  }

  // 정렬
  const sortField = $('#sort-select')?.value || 'score';
  const sortDir = S.sortDir || 'desc';
  results.sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (sortField === 'title') {
      return sortDir === 'asc' ? (va||'').localeCompare(vb||'') : (vb||'').localeCompare(va||'');
    }
    va = parseFloat(va) || 0;
    vb = parseFloat(vb) || 0;
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  S.filtered = results;
  S.page = 1;
  $('#results-count').textContent = results.length.toLocaleString();
  renderList();
}

// ═══ 페이지 데이터 ═══
function getPageData() {
  const start = (S.page - 1) * S.rows;
  return S.filtered.slice(start, start + S.rows);
}

// ═══ 리스트 렌더링 ═══
function renderList() {
  const data = getPageData();
  const tbody = $('#course-tbody');
  const cardGrid = $('#card-grid');
  const compactList = $('#compact-list');

  // 테이블
  if (tbody) {
    tbody.innerHTML = data.map(c => {
      const catColor = getCatColor(c.category);
      const scoreClass = c.displayScore >= 70 ? 'score-high' : c.displayScore >= 40 ? 'score-mid' : 'score-low';
      return `<tr style="--row-cat-color:${catColor}">
        <td class="col-check"><input type="checkbox" ${S.selectedIds.has(c.id)?'checked':''} onchange="toggleSelect('${c.id}', this.checked)"></td>
        <td class="td-score"><span class="score-badge ${scoreClass}">${c.displayScore || '-'}</span></td>
        <td><span class="cat-badge" style="border-color:${catColor}">${getCatEmoji(c.category)} ${c.category}</span></td>
        <td class="td-title"><a class="course-link" onclick="openSidePanelById('${c.id}')">${c.title}</a> ${c.isNew?'<span class="badge-new">NEW</span>':''}</td>
        <td>⭐ ${c.rating?c.rating.toFixed(1):'-'}</td>
        <td>▲${(c.enrollments||0).toLocaleString()}</td>
        <td>${c.language||'-'}</td>
        <td>${c.hasKoreanSub?'✅':'—'}</td>
        <td>${c.level||'-'}</td>
        <td>${c.contentLength?c.contentLength.toFixed(1)+'h':'-'}</td>
        <td>${c.instructor||'-'}</td>
        <td>${c.updated||'-'}</td>
      </tr>`;
    }).join('');
  }

  // 카드 뷰
  if (cardGrid) {
    cardGrid.innerHTML = data.map((c, i) => {
      const catColor = getCatColor(c.category);
      return `<div class="course-card" style="animation-delay:${i*0.05}s" onclick="openSidePanelById('${c.id}')">
        <div class="card-cat-stripe" style="background:${catColor}"></div>
        <h4>${c.title}</h4>
        <div class="card-meta">${getCatEmoji(c.category)} ${c.category} · ⭐${c.rating?.toFixed(1)||'-'} · 👥▲${(c.enrollments||0).toLocaleString()}</div>
        <div class="card-tags">
          ${c.hasKoreanSub?'<span class="cat-badge" style="border-color:var(--success);color:var(--success)">🇰🇷</span>':''}
          ${c.isNew?'<span class="badge-new">NEW</span>':''}
          <span class="cat-badge">${c.level||'-'}</span>
        </div>
        <a href="${buildCourseUrl(c)}" target="_blank" class="card-cta" onclick="event.stopPropagation()">수강하기 →</a>
      </div>`;
    }).join('');
  }

  // 컴팩트 뷰
  if (compactList) {
    compactList.innerHTML = data.map(c => `
      <div class="compact-item">
        <input type="checkbox" ${S.selectedIds.has(c.id)?'checked':''} onchange="toggleSelect('${c.id}', this.checked)" style="accent-color:var(--accent)">
        <span class="compact-title"><a onclick="openSidePanelById('${c.id}')">${c.title}</a></span>
        <span style="font-size:0.75rem;color:var(--text-muted)">⭐${c.rating?.toFixed(1)||'-'}</span>
      </div>
    `).join('');
  }

  // 뷰 모드 전환
  const tableWrap = $('#table-wrap');
  if (tableWrap) tableWrap.style.display = S.viewMode === 'table' ? '' : 'none';
  if (cardGrid) cardGrid.classList.toggle('active', S.viewMode === 'card');
  if (compactList) compactList.classList.toggle('active', S.viewMode === 'compact');

  // 빈 상태
  if (data.length === 0 && tbody) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><h3>🔭 발견된 별이 없습니다</h3><p>검색 조건을 변경해보세요</p></div></td></tr>`;
  }

  renderPagination();
  updateFAB();
}

// ═══ 페이지네이션 ═══
function renderPagination() {
  const container = $('#pagination');
  if (!container) return;
  const totalPages = Math.ceil(S.filtered.length / S.rows);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button ${S.page<=1?'disabled':''} onclick="goPage(${S.page-1})">◀</button>`;

  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= S.page - range && i <= S.page + range)) {
      html += `<button class="${i===S.page?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i === S.page - range - 1 || i === S.page + range + 1) {
      html += `<button disabled>…</button>`;
    }
  }

  html += `<button ${S.page>=totalPages?'disabled':''} onclick="goPage(${S.page+1})">▶</button>`;
  container.innerHTML = html;
}

function goPage(p) { S.page = p; renderList(); window.scrollTo({ top: $('#list-section')?.offsetTop - 80, behavior: 'smooth' }); }

// ═══ FAB ═══
function updateFAB() {
  const fab = $('#fab');
  const count = S.selectedIds.size;
  if (fab) {
    fab.classList.toggle('visible', count > 0);
    const fc = $('#fab-count');
    if (fc) fc.textContent = count;
  }
}

function toggleSelect(id, checked) {
  if (checked) S.selectedIds.add(id); else S.selectedIds.delete(id);
  updateFAB();
}

// ═══ 사이드패널 by ID ═══
function openSidePanelById(id) {
  const course = S.courses.find(c => c.id === id);
  if (course) openSidePanel(course);
}

// ═══ AI 스캔 (placeholder) ═══
async function handleAIScan() {
  const query = $('#search-input')?.value?.trim();
  if (!query) { toast('검색어를 입력해주세요.', 'warning'); return; }
  toast('🤖 AI 내비게이션 준비 중...');
  // AI 확장 로직은 Gemini API 연동 시 구현
  // 임시로 한영 매핑 기반 확장
  const expanded = [];
  query.split(/[,;]+/).forEach(kw => {
    const k = kw.trim().toLowerCase();
    if (!k) return;
    expanded.push(k);
    Object.entries(KO_EN_MAP).forEach(([ko, enList]) => {
      if (ko.includes(k)) enList.forEach(en => expanded.push(en));
      enList.forEach(en => { if(en.includes(k)) expanded.push(ko); });
    });
  });
  const unique = [...new Set(expanded)];
  const panel = $('#ai-panel');
  const results = $('#ai-panel-results');
  if (panel && results) {
    results.innerHTML = `<div class="ai-kw-group"><div class="group-label">🔍 확장 키워드</div><div class="ai-kw-tags">${unique.map(kw => `<span class="ai-kw-tag selected" data-kw="${kw}">${kw}</span>`).join('')}</div></div>`;
    results.querySelectorAll('.ai-kw-tag').forEach(tag => {
      tag.addEventListener('click', () => tag.classList.toggle('selected'));
    });
    panel.classList.add('open');
  }
}

function applyAIKeywords() {
  const selected = [...$$('#ai-panel-results .ai-kw-tag.selected')].map(t => t.dataset.kw).filter(Boolean);
  if (selected.length === 0) { toast('키워드를 선택해주세요.', 'warning'); return; }
  $('#search-input').value = selected.join(', ');
  $('#ai-panel').classList.remove('open');
  applyFilters();
  toast(`🚀 ${selected.length}개 키워드로 스캔!`);
}

// ═══ 리셋 ═══
function resetAll(showToast) {
  $('#search-input').value = '';
  $('#f-level').value = '';
  $$('.ms-panel input').forEach(cb => cb.checked = false);
  $$('.ms-btn').forEach(btn => btn.textContent = btn.dataset.default || '전체');
  $('#sort-select').value = 'score';
  S.selectedIds.clear();
  S.page = 1;
  applyFilters();
  if (showToast) toast('✨ 초기화 완료!');
}

// ═══ CSV 다운로드 ═══
function downloadCSV(selectedOnly) {
  const data = selectedOnly
    ? S.courses.filter(c => S.selectedIds.has(c.id))
    : S.filtered;

  if (data.length === 0) { toast('다운로드할 데이터가 없습니다.', 'warning'); return; }

  const cols = ['id','title','category','instructor','rating','enrollments','language','subtitles','level','contentLength','updated'];
  const header = cols.join(',');
  const rows = data.map(c => cols.map(col => {
    let val = c[col] || '';
    val = String(val).replace(/"/g, '""');
    if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
    return val;
  }).join(','));

  const csv = '\uFEFF' + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `udemy_courses_${S.subdomain}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`📥 ${data.length}개 강의 CSV 다운로드!`);
}

// ═══ 공유 링크 ═══
function shareLink() {
  const query = $('#search-input')?.value?.trim() || '';
  const url = new URL(window.location.href);
  if (query) url.searchParams.set('q', query);
  url.searchParams.set('sub', S.subdomain);
  navigator.clipboard.writeText(url.toString());
  toast('🔗 공유 링크가 복사되었습니다!');
}

// ═══ URL 파라미터 ═══
function applyURLParams() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    $('#search-input').value = q;
  }
}

// ═══ 하이라이트 (간소화 — 실제 구현은 별도 파일 가능) ═══
function initHighlight() {
  // 트렌딩: 최근 업데이트 + 높은 수강
  const trending = S.courses
    .filter(c => c.isNew || c.enrollments > 1000)
    .sort((a, b) => (b.enrollments || 0) - (a.enrollments || 0))
    .slice(0, 6);

  // 큐레이터 PICK
  const pickIds = JSON.parse(localStorage.getItem('curator_picks') || '["8324","1717020","2360128"]');
  const picks = pickIds.map(id => S.courses.find(c => c.id === id)).filter(Boolean);

  renderHighlightCarousel('trending', trending);
  renderHighlightCarousel('picks', picks);
}

function renderHighlightCarousel(type, courses) {
  const carousel = $(`#${type}-carousel`);
  const indicator = $(`#${type}-indicator`);
  if (!carousel || courses.length === 0) return;

  let idx = 0;
  function render() {
    const c = courses[idx];
    const catColor = getCatColor(c.category);
    carousel.innerHTML = `
      <div class="highlight-card ${type==='picks'?'curator-pick':''}" style="--card-color:${catColor}">
        ${c.image ? `<div class="highlight-thumbnail"><img src="${c.image}" alt=""></div>` : ''}
        <div class="highlight-content">
          <div class="highlight-category" style="color:${catColor}">${getCatEmoji(c.category)} ${c.category}</div>
          <h4 class="highlight-title" onclick="openSidePanelById('${c.id}')">${c.title}</h4>
          <p class="highlight-desc">${c.headline || ''}</p>
          <div class="highlight-meta">
            <span>⭐ ${c.rating?.toFixed(1)||'-'}</span>
            <span>👥 ▲${(c.enrollments||0).toLocaleString()}</span>
            ${c.hasKoreanSub?'<span>🇰🇷</span>':''}
          </div>
          <div class="highlight-actions">
            <a href="${buildCourseUrl(c)}" target="_blank" class="highlight-cta">수강하기</a>
            <button class="highlight-detail-btn" onclick="openSidePanelById('${c.id}')">상세보기</button>
          </div>
        </div>
      </div>
    `;
    if (indicator) indicator.textContent = `${idx+1} / ${courses.length}`;
  }

  render();

  // 이전/다음 버튼
  $$(`.highlight-prev[data-target="${type}"]`).forEach(btn => {
    btn.addEventListener('click', () => { idx = (idx - 1 + courses.length) % courses.length; render(); });
  });
  $$(`.highlight-next[data-target="${type}"]`).forEach(btn => {
    btn.addEventListener('click', () => { idx = (idx + 1) % courses.length; render(); });
  });

  // 자동 슬라이드
  if (type === 'trending') {
    setInterval(() => { idx = (idx + 1) % courses.length; render(); }, 8000);
  }
}

function setupHoverPause() { /* 하이라이트 hover 시 자동 슬라이드 일시정지 — 필요 시 구현 */ }
function manageCuratorPicks() { manageCuratorPicksAdmin(); }

// ═══ 미션 센터 (간소화) ═══
function initMissionCenter() {
  const grid = $('#galaxy-grid');
  if (!grid) return;
  Object.entries(CURATION).forEach(([id, data]) => {
    const card = document.createElement('div');
    card.className = 'galaxy-card';
    card.innerHTML = `<span class="emoji">${data.emoji}</span><span class="label">${data.name}</span>`;
    card.addEventListener('click', () => {
      $$('.galaxy-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      // 해당 직무 키워드로 검색
      switchTab('explore');
      $$('.header-nav-btn').forEach(b => b.classList.remove('active'));
      $$('.header-nav-btn')[0]?.classList.add('active');
      $('#search-input').value = data.keywords.join(', ');
      applyFilters();
    });
    grid.appendChild(card);
  });
}

// ═══ TOP 별 (간소화) ═══
function initStars() {
  const toggle = $('#stars-toggle');
  if (!toggle) return;

  toggle.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderStars(btn.dataset.stars);
    });
  });

  renderStars('rating');
}

function renderStars(mode) {
  const hero = $('#stars-hero');
  const grid = $('#stars-grid');
  if (!hero || !grid) return;

  let courses;
  if (mode === 'korean') {
    courses = S.courses.filter(c => c.hasKoreanSub).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (mode === 'enrollments') {
    courses = [...S.courses].sort((a, b) => (b.enrollments || 0) - (a.enrollments || 0));
  } else {
    courses = S.courses.filter(c => c.enrollments > 100).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const top = courses.slice(0, 1)[0];
  const rest = courses.slice(1, 13);

  if (top) {
    hero.innerHTML = `
      <div class="hero-card">
        <div class="rank">🏆 #1</div>
        <h3><a onclick="openSidePanelById('${top.id}')">${top.title}</a></h3>
        <p>${getCatEmoji(top.category)} ${top.category} · ⭐ ${top.rating?.toFixed(1)||'-'} · 👥 ▲${(top.enrollments||0).toLocaleString()} ${top.hasKoreanSub?'· 🇰🇷':''}</p>
        <a href="${buildCourseUrl(top)}" target="_blank" class="hero-cta">수강하기 →</a>
      </div>
    `;
  }

  grid.innerHTML = rest.map((c, i) => `
    <div class="star-card">
      <div class="rank">#${i+2}</div>
      <h4><a onclick="openSidePanelById('${c.id}')">${c.title}</a></h4>
      <p>⭐ ${c.rating?.toFixed(1)||'-'} · 👥 ▲${(c.enrollments||0).toLocaleString()} ${c.hasKoreanSub?'· 🇰🇷':''}</p>
    </div>
  `).join('');
}

// ═══ 정렬 헤더 클릭 ═══
document.addEventListener('click', (e) => {
  const th = e.target.closest('th.sortable');
  if (!th) return;
  const field = th.dataset.sort;
  if (!field) return;

  if (S.sortField === field) {
    S.sortDir = S.sortDir === 'desc' ? 'asc' : 'desc';
  } else {
    S.sortField = field;
    S.sortDir = 'desc';
  }

  $$('th.sortable').forEach(t => t.classList.remove('sort-asc', 'sort-desc'));
  th.classList.add(S.sortDir === 'desc' ? 'sort-desc' : 'sort-asc');

  $('#sort-select').value = field;
  applyFilters();
});

