// ═══════════════════════════════════════════════════════════
// data.js — 전역 상태, 상수, 큐레이션 데이터, 매핑 테이블
// ═══════════════════════════════════════════════════════════

const S = {
  subdomain: '',
  selectedFamilies: [],
  courses: [],
  filtered: [],
  page: 1,
  rows: 15,
  searchMode: 'ai',
  sensitivity: 'balanced',
  viewMode: 'table',
  selectedIds: new Set(),
  currentGalaxy: 'development',
  starsMode: 'rating',
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const LANG_MAP = {
  'en':'English','ko':'한국어','ja':'日本語','zh':'中文','es':'Español',
  'fr':'Français','de':'Deutsch','pt':'Português','ru':'Русский',
  'it':'Italiano','tr':'Türkçe','ar':'العربية','id':'Bahasa','hi':'हिन्दी','pl':'Polski'
};
const mapLang = (c) => { if(!c) return 'N/A'; const k=c.toLowerCase().split(/[-_]/)[0]; return LANG_MAP[k]||c; };

const CAT_COLORS = {
  'Development':'#3b82f6','IT & Software':'#6366f1','Business':'#8b5cf6',
  'Marketing':'#f59e0b','Design':'#ec4899','Finance & Accounting':'#10b981',
  'Personal Development':'#f97316','Office Productivity':'#06b6d4',
  'Photography & Video':'#f43f5e','Health & Fitness':'#22c55e',
  'Music':'#a855f7','Teaching & Academics':'#0ea5e9','Lifestyle':'#14b8a6',
  'Data Science':'#06b6d4','Language Learning':'#8b5cf6','Game Development & Design':'#f43f5e'
};
const getCatColor = (cat) => { if(!cat) return 'var(--accent)'; for(const k in CAT_COLORS) { if(cat.includes(k)) return CAT_COLORS[k]; } return 'var(--accent)'; };

const CAT_EMOJIS = {
  'Development':'👨‍💻','IT & Software':'⚙️','Business':'💼','Finance & Accounting':'🧾',
  'Marketing':'📣','Office Productivity':'📊','Personal Development':'🧠','Design':'🎨',
  'Lifestyle':'🧘','Photography & Video':'🎬','Health & Fitness':'💪','Music':'🎧',
  'Teaching & Academics':'📚','Data Science':'📊','Language Learning':'🌐',
  'Game Development & Design':'🎮'
};
const getCatEmoji = (cat) => { if(!cat) return '📁'; for(const k in CAT_EMOJIS) { if(cat.includes(k)) return CAT_EMOJIS[k]; } return '📁'; };

const KO_EN_MAP = {
  '마케팅':['marketing'],'개발':['development','programming'],'디자인':['design'],
  '리더십':['leadership'],'데이터':['data'],'분석':['analysis','analytics'],
  '관리':['management'],'영업':['sales'],'회계':['accounting'],'재무':['finance'],
  '인사':['hr','human resources'],'보안':['security','cybersecurity'],
  '클라우드':['cloud','aws','azure'],'프로젝트':['project'],
  '커뮤니케이션':['communication'],'프레젠테이션':['presentation'],
  '엑셀':['excel'],'파이썬':['python'],'자바':['java'],'파워포인트':['powerpoint'],
  '기획':['planning','strategy'],'협상':['negotiation'],'채용':['recruiting','hiring'],
  '자동화':['automation'],'생산성':['productivity'],'인공지능':['artificial intelligence','ai'],
  '머신러닝':['machine learning'],'딥러닝':['deep learning']
};

const NEW_MONTHS = 3;
const isNew = (d) => { if(!d) return false; const u=new Date(d), t=new Date(); t.setMonth(t.getMonth()-NEW_MONTHS); return u>=t; };

// 감도 설정
const SENSITIVITY_CONFIG = {
  precise: {
    label: '🔬 정밀',
    description: '제목·주제에 키워드가 있는 강의만',
    minScore: 40,
    searchFields: ['title', 'topic', 'category'],
    scoreWeights: { title: 50, category: 30, topic: 25, headline: 0, objectives: 0, description: 0 },
  },
  balanced: {
    label: '📊 보통',
    description: '제목·소개·학습목표에서 검색',
    minScore: 15,
    searchFields: ['title', 'topic', 'category', 'headline', 'objectives'],
    scoreWeights: { title: 40, category: 30, topic: 20, headline: 15, objectives: 10, description: 0 },
  },
  wide: {
    label: '🔭 광역',
    description: '설명 전체에서 검색 (가장 넓음)',
    minScore: 1,
    searchFields: ['title', 'topic', 'category', 'headline', 'objectives', 'description'],
    scoreWeights: { title: 40, category: 30, topic: 20, headline: 15, objectives: 10, description: 5 },
  }
};

const CURATION = {
  product: { name: "제품", emoji: "🚀", color: "#8b5cf6", roles: [
    { id:"pm_po", name:"PM / PO", prompt:"PM PO product management 제품 관리 roadmap 로드맵 backlog 백로그 user story agile scrum kanban", keywords:["Product Mgt","Roadmap","Backlog","Agile"], cats:["Business","IT & Software"] },
    { id:"service_plan", name:"서비스 기획", prompt:"서비스 기획 service planning wireframe 와이어프레임 storyboard UI UX requirements specification", keywords:["기획서","Wireframe","UI/UX"], cats:["Business","Design"] }
  ]},
  development: { name: "IT/개발", emoji: "👨‍💻", color: "#3b82f6", roles: [
    { id:"backend", name:"백엔드 개발", prompt:"backend 백엔드 server java spring python node.js API REST microservice golang", keywords:["Spring","Node.js","Java","Python"], cats:["Development"] },
    { id:"frontend", name:"프론트엔드 개발", prompt:"frontend 프론트엔드 react vue angular typescript javascript CSS HTML next.js", keywords:["React","Vue.js","TypeScript"], cats:["Development"] },
    { id:"fullstack", name:"풀스택 개발", prompt:"fullstack full stack web development MERN MEAN django flask fastapi", keywords:["Full Stack","MERN","Django"], cats:["Development"] },
    { id:"mobile", name:"모바일 개발", prompt:"mobile app development ios android swift kotlin flutter react native", keywords:["iOS","Android","Flutter","React Native"], cats:["Development"] },
    { id:"devops", name:"DevOps / SRE", prompt:"devops CI CD kubernetes docker aws terraform infrastructure monitoring", keywords:["DevOps","CI/CD","K8s","Docker"], cats:["IT & Software","Development"] },
    { id:"qa", name:"QA", prompt:"QA quality assurance test automation selenium cypress jest unit testing", keywords:["QA","Test","Selenium","Cypress"], cats:["IT & Software","Development"] },
    { id:"infra", name:"인프라 / 클라우드", prompt:"infrastructure aws azure gcp cloud network linux server administration", keywords:["AWS","Azure","GCP","Linux"], cats:["IT & Software"] },
    { id:"security", name:"정보 보안", prompt:"security cybersecurity firewall isms penetration hacking ethical hacking", keywords:["보안","Cybersecurity","ISMS"], cats:["IT & Software"] }
  ]},
  data: { name: "데이터", emoji: "📊", color: "#06b6d4", roles: [
    { id:"data_eng", name:"데이터 엔지니어", prompt:"data engineer etl pipeline airflow spark kafka data warehouse snowflake", keywords:["ETL","Airflow","Spark","Snowflake"], cats:["IT & Software","Development"] },
    { id:"data_analyst", name:"데이터 분석가", prompt:"data analyst sql tableau power bi pandas excel analytics visualization", keywords:["SQL","Tableau","Power BI","Pandas"], cats:["IT & Software","Business"] },
    { id:"data_sci", name:"데이터 사이언티스트", prompt:"data scientist machine learning deep learning tensorflow pytorch scikit-learn statistics", keywords:["ML","Deep Learning","TensorFlow","PyTorch"], cats:["IT & Software","Development"] }
  ]},
  ai: { name: "AI/자동화", emoji: "🤖", color: "#6366f1", roles: [
    { id:"ai_eng", name:"AI 엔지니어", prompt:"AI artificial intelligence LLM GPT prompt engineering NLP computer vision generative AI", keywords:["AI","LLM","Prompt Eng","NLP","GenAI"], cats:["IT & Software","Development"] },
    { id:"rpa", name:"RPA / 업무자동화", prompt:"RPA robotic process automation uipath power automate zapier workflow automation", keywords:["RPA","UiPath","Power Automate"], cats:["IT & Software","Business"] }
  ]},
  design: { name: "디자인", emoji: "🎨", color: "#ec4899", roles: [
    { id:"uiux", name:"UI/UX 디자이너", prompt:"ui ux design figma wireframe prototype design system usability user research", keywords:["UI/UX","Figma","프로토타이핑","User Research"], cats:["Design"] },
    { id:"visual", name:"브랜드/비주얼", prompt:"brand visual graphic design photoshop illustrator after effects motion", keywords:["브랜딩","포토샵","일러스트","모션"], cats:["Design"] }
  ]},
  marketing: { name: "마케팅", emoji: "📣", color: "#f59e0b", roles: [
    { id:"perf_mkt", name:"퍼포먼스 마케팅", prompt:"performance marketing google ads facebook ads seo sem analytics ROAS conversion", keywords:["퍼포먼스","GA4","SEO","ROAS"], cats:["Marketing","Business"] },
    { id:"content_mkt", name:"콘텐츠 마케팅", prompt:"content marketing brand copywriting sns social media storytelling", keywords:["콘텐츠","브랜딩","카피라이팅"], cats:["Marketing"] },
    { id:"growth", name:"그로스 마케팅", prompt:"growth marketing funnel conversion CRO AB test retention acquisition", keywords:["Growth","Funnel","CRO","A/B Test"], cats:["Marketing","Business"] }
  ]},
  sales: { name: "영업/CS", emoji: "🤝", color: "#10b981", roles: [
    { id:"b2b", name:"B2B 영업", prompt:"b2b sales negotiation proposal salesforce CRM pipeline closing", keywords:["B2B Sales","협상","CRM","Salesforce"], cats:["Business"] },
    { id:"cs", name:"Customer Success", prompt:"customer success csm onboarding churn retention NPS customer experience", keywords:["CS","온보딩","Churn","NPS"], cats:["Business"] }
  ]},
  management: { name: "경영지원", emoji: "💼", color: "#8b5cf6", roles: [
    { id:"hr", name:"인사 (HRM/HRD)", prompt:"hr hrm hrd recruiting evaluation compensation talent management organizational development", keywords:["HRM","HRD","채용","평가보상","조직개발"], cats:["Business"] },
    { id:"finance", name:"재무/회계", prompt:"finance accounting tax budgeting financial analysis financial modeling valuation", keywords:["재무","회계","세무","재무모델링"], cats:["Finance & Accounting"] },
    { id:"strategy", name:"전략/기획", prompt:"strategy planning market research okr business model competitive analysis", keywords:["전략기획","시장조사","OKR","비즈니스모델"], cats:["Business"] },
    { id:"ga_legal", name:"총무/법무", prompt:"general affairs purchasing legal contract compliance risk management", keywords:["총무","구매","법무","컴플라이언스"], cats:["Business"] }
  ]},
  leadership: { name: "리더십/공통", emoji: "👑", color: "#f97316", roles: [
    { id:"leadership", name:"리더십", prompt:"leadership management coaching team delegation emotional intelligence", keywords:["리더십","매니지먼트","코칭","EQ"], cats:["Business","Personal Development"] },
    { id:"comm", name:"커뮤니케이션", prompt:"communication presentation negotiation writing business english public speaking", keywords:["커뮤니케이션","프레젠테이션","비즈니스영어"], cats:["Business","Personal Development"] },
    { id:"productivity", name:"생산성", prompt:"productivity time management excel powerpoint project management notion", keywords:["생산성","Excel","PPT","프로젝트관리","Notion"], cats:["Office Productivity","Business"] }
  ]}
};

const LAUNCH_STEPS = [
  { emoji: '⛽', message: '연료 주입 중...' },
  { emoji: '🗺️', message: '항로 계산 중...' },
  { emoji: '👋', message: '친구들에게 인사 중...' },
  { emoji: '🔧', message: '엔진 점검 중...' },
  { emoji: '📡', message: '관제탑과 통신 중...' },
  { emoji: '🌌', message: '우주 좌표 설정 중...' },
  { emoji: '🛡️', message: '보호막 활성화 중...' },
  { emoji: '🎵', message: '출발 음악 선곡 중...' },
];
