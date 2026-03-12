// ═══════════════════════════════════════════════════════════
// data.js — 전역 상태, NCS 기반 직무 확장, 제외 강의
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
// ★ 수정: NodeList → Array 변환하여 항상 forEach 등 배열 메서드 사용 가능
const $$ = s => [...document.querySelectorAll(s)];

const LANG_MAP = {
  'en':'English','ko':'한국어','ja':'日本語','zh':'中文','es':'Español',
  'fr':'Français','de':'Deutsch','pt':'Português','ru':'Русский',
  'it':'Italiano','tr':'Türkçe','ar':'العربية','id':'Bahasa','hi':'हिन्दी','pl':'Polski'
};
const mapLang = (c) => { if(!c) return 'N/A'; const k=c.toLowerCase().split(/[-_]/)[0]; return LANG_MAP[k]||c; };
const CAT_EMOJIS = {
  'Development':'💻','IT & Software':'⚙️','Business':'💼','Finance & Accounting':'💰',
  'Marketing':'📢','Office Productivity':'📊','Personal Development':'🧠','Design':'🎨',
  'Lifestyle':'🌱','Photography & Video':'📹','Health & Fitness':'💪','Music':'🎵',
  'Teaching & Academics':'📚','Data Science':'📈','Language Learning':'🗣️',
  'Game Development & Design':'🎮','Web Development':'🌐','Mobile Development':'📱',
  'Programming Languages':'⌨️','Database Design & Development':'🗄️',
  'Software Testing':'🧪','Software Engineering':'🔧','Network & Security':'🔒',
  'Hardware':'🔌','Operating Systems':'💿','Other':'📁'
};
const getCatEmoji = (cat) => { if(!cat) return '📁'; if(CAT_EMOJIS[cat]) return CAT_EMOJIS[cat]; for(const k in CAT_EMOJIS) { if(cat.includes(k)) return CAT_EMOJIS[k]; } return '📁'; };
const CAT_COLORS = {
  'Development':'#3b82f6','IT & Software':'#6366f1','Business':'#8b5cf6',
  'Marketing':'#f59e0b','Design':'#ec4899','Finance & Accounting':'#10b981',
  'Personal Development':'#f97316','Office Productivity':'#06b6d4',
  'Photography & Video':'#f43f5e','Health & Fitness':'#22c55e',
  'Music':'#a855f7','Teaching & Academics':'#0ea5e9','Lifestyle':'#14b8a6',
  'Data Science':'#06b6d4','Language Learning':'#8b5cf6','Game Development & Design':'#f43f5e'
};
const getCatColor = (cat) => { if(!cat) return 'var(--accent)'; for(const k in CAT_COLORS) { if(cat.includes(k)) return CAT_COLORS[k]; } return 'var(--accent)'; };
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
const NEW_MONTHS = 1;
const isNew = (d) => { if(!d) return false; const u=new Date(d), t=new Date(); t.setMonth(t.getMonth()-NEW_MONTHS); return u>=t; };
const formatUpdateDate = (dateStr) => {
  if (!dateStr) return '-';
  try { const date = new Date(dateStr); return `${date.getFullYear().toString().slice(-2)}.${(date.getMonth()+1).toString().padStart(2,'0')}`; }
  catch { return '-'; }
};

// ★ minScore 적절하게 조정
const SENSITIVITY_CONFIG = {
  precise: { label: '🔬 정밀', minScore: 50, searchFields: ['title','topic','category'], scoreWeights: { title:50, category:30, topic:25, headline:0, objectives:0, description:0 } },
  balanced: { label: '📊 보통', minScore: 10, searchFields: ['title','topic','category','headline','objectives'], scoreWeights: { title:40, category:30, topic:20, headline:15, objectives:10, description:0 } },
  wide: { label: '🔭 광역', minScore: 1, searchFields: ['title','topic','category','headline','objectives','description'], scoreWeights: { title:40, category:30, topic:20, headline:15, objectives:10, description:5 } }
};

function getExcludedCourses() {
  try { return JSON.parse(localStorage.getItem('excluded_courses') || '[]'); } catch { return []; }
}

const CURATION = {
  product: { name: "제품/기획", emoji: "🚀", color: "#8b5cf6", roles: [
    { id:"pm_po", name:"PM / PO (제품관리)", prompt:"PM PO product management 제품 관리 roadmap 로드맵 backlog 백로그 user story agile scrum kanban product strategy", keywords:["Product Mgt","Roadmap","Backlog","Agile","Scrum"], cats:["Business","IT & Software"] },
    { id:"service_plan", name:"서비스 기획", prompt:"서비스 기획 service planning wireframe 와이어프레임 storyboard UI UX requirements specification user flow", keywords:["기획서","Wireframe","UI/UX","User Flow"], cats:["Business","Design"] },
    { id:"biz_analyst", name:"비즈니스 분석가", prompt:"business analyst 비즈니스 분석 requirements analysis stakeholder management process improvement BPM", keywords:["BA","요구분석","프로세스개선","BPM"], cats:["Business"] }
  ]},
  development: { name: "IT/개발", emoji: "💻", color: "#3b82f6", roles: [
    { id:"backend", name:"백엔드 개발", prompt:"backend 백엔드 server java spring boot python django flask node.js express API REST GraphQL microservice golang rust", keywords:["Spring Boot","Node.js","Java","Python","Django","API"], cats:["Development"] },
    { id:"frontend", name:"프론트엔드 개발", prompt:"frontend 프론트엔드 react vue.js angular next.js typescript javascript CSS HTML responsive web development SPA", keywords:["React","Vue.js","TypeScript","Next.js","Angular"], cats:["Development"] },
    { id:"fullstack", name:"풀스택 개발", prompt:"fullstack full stack web development MERN MEAN django flask fastapi full-stack developer", keywords:["Full Stack","MERN","Django","FastAPI"], cats:["Development"] },
    { id:"mobile", name:"모바일 개발", prompt:"mobile app development ios android swift kotlin flutter react native cross-platform mobile UI", keywords:["iOS","Android","Flutter","React Native","Swift","Kotlin"], cats:["Development"] },
    { id:"devops", name:"DevOps / SRE", prompt:"devops CI CD kubernetes docker aws terraform infrastructure monitoring observability site reliability engineering", keywords:["DevOps","CI/CD","K8s","Docker","Terraform"], cats:["IT & Software","Development"] },
    { id:"qa", name:"QA / 테스트", prompt:"QA quality assurance test automation selenium cypress jest unit testing integration testing performance testing", keywords:["QA","Test","Selenium","Cypress","Jest"], cats:["IT & Software","Development"] },
    { id:"infra", name:"인프라 / 클라우드", prompt:"infrastructure aws azure gcp cloud network linux server administration cloud architecture serverless", keywords:["AWS","Azure","GCP","Linux","Cloud"], cats:["IT & Software"] },
    { id:"security", name:"정보 보안", prompt:"security cybersecurity firewall isms penetration testing ethical hacking network security compliance SOC", keywords:["보안","Cybersecurity","ISMS","Penetration Testing"], cats:["IT & Software"] },
    { id:"dba", name:"DBA / 데이터베이스", prompt:"database DBA SQL MySQL PostgreSQL MongoDB Oracle database administration performance tuning", keywords:["DBA","SQL","MySQL","PostgreSQL","MongoDB"], cats:["IT & Software","Development"] }
  ]},
  data: { name: "데이터/AI", emoji: "📊", color: "#06b6d4", roles: [
    { id:"data_eng", name:"데이터 엔지니어", prompt:"data engineer etl data pipeline airflow spark kafka data warehouse snowflake databricks big data", keywords:["ETL","Airflow","Spark","Snowflake","Kafka"], cats:["IT & Software","Development"] },
    { id:"data_analyst", name:"데이터 분석가", prompt:"data analyst sql tableau power bi pandas excel analytics visualization statistics business intelligence", keywords:["SQL","Tableau","Power BI","Pandas","Excel"], cats:["IT & Software","Business"] },
    { id:"data_sci", name:"데이터 사이언티스트", prompt:"data scientist machine learning deep learning tensorflow pytorch scikit-learn statistics regression classification NLP", keywords:["ML","Deep Learning","TensorFlow","PyTorch","NLP"], cats:["IT & Software","Development"] },
    { id:"ai_eng", name:"AI 엔지니어", prompt:"AI artificial intelligence LLM GPT prompt engineering NLP computer vision generative AI RAG fine-tuning", keywords:["AI","LLM","Prompt Eng","NLP","GenAI","RAG"], cats:["IT & Software","Development"] },
    { id:"rpa", name:"RPA / 업무자동화", prompt:"RPA robotic process automation uipath power automate zapier workflow automation no-code low-code", keywords:["RPA","UiPath","Power Automate","No-Code"], cats:["IT & Software","Business"] }
  ]},
  design: { name: "디자인", emoji: "🎨", color: "#ec4899", roles: [
    { id:"uiux", name:"UI/UX 디자이너", prompt:"ui ux design figma wireframe prototype design system usability user research interaction design", keywords:["UI/UX","Figma","프로토타이핑","User Research"], cats:["Design"] },
    { id:"visual", name:"브랜드/비주얼 디자인", prompt:"brand visual graphic design photoshop illustrator after effects motion graphics logo branding identity", keywords:["브랜딩","포토샵","일러스트","모션그래픽"], cats:["Design"] },
    { id:"video", name:"영상/콘텐츠 제작", prompt:"video editing premiere pro after effects youtube content creation video production animation", keywords:["영상편집","Premiere","After Effects","YouTube"], cats:["Design","Photography & Video"] }
  ]},
  marketing: { name: "마케팅", emoji: "📢", color: "#f59e0b", roles: [
    { id:"perf_mkt", name:"퍼포먼스 마케팅", prompt:"performance marketing google ads facebook ads meta ads seo sem analytics ROAS conversion optimization paid media", keywords:["퍼포먼스","GA4","SEO","ROAS","Google Ads"], cats:["Marketing","Business"] },
    { id:"content_mkt", name:"콘텐츠 마케팅", prompt:"content marketing brand copywriting sns social media storytelling blog newsletter email marketing", keywords:["콘텐츠","브랜딩","카피라이팅","이메일마케팅"], cats:["Marketing"] },
    { id:"growth", name:"그로스 마케팅", prompt:"growth marketing funnel conversion CRO AB test retention acquisition product-led growth viral loop", keywords:["Growth","Funnel","CRO","A/B Test","PLG"], cats:["Marketing","Business"] },
    { id:"crm_mkt", name:"CRM 마케팅", prompt:"CRM customer relationship management salesforce hubspot marketing automation customer journey lifecycle", keywords:["CRM","Salesforce","HubSpot","마케팅자동화"], cats:["Marketing","Business"] }
  ]},
  sales: { name: "영업/CS", emoji: "🤝", color: "#10b981", roles: [
    { id:"b2b", name:"B2B 영업", prompt:"b2b sales negotiation proposal salesforce CRM pipeline closing enterprise sales account management", keywords:["B2B Sales","협상","CRM","Salesforce","Account Mgt"], cats:["Business"] },
    { id:"b2c", name:"B2C 영업/리테일", prompt:"b2c sales retail customer service selling techniques persuasion consumer behavior", keywords:["B2C","리테일","고객서비스","세일즈기법"], cats:["Business"] },
    { id:"cs", name:"Customer Success", prompt:"customer success csm onboarding churn retention NPS customer experience customer journey", keywords:["CS","온보딩","Churn","NPS","CX"], cats:["Business"] }
  ]},
  management: { name: "경영지원", emoji: "💼", color: "#8b5cf6", roles: [
    { id:"hr", name:"인사 (HRM/HRD)", prompt:"hr hrm hrd recruiting evaluation compensation talent management organizational development employee engagement", keywords:["HRM","HRD","채용","평가보상","조직개발"], cats:["Business"] },
    { id:"od", name:"조직문화/OD", prompt:"organizational development culture engagement diversity inclusion change management team building", keywords:["조직문화","OD","다양성","변화관리"], cats:["Business","Personal Development"] },
    { id:"finance", name:"재무/회계", prompt:"finance accounting tax budgeting financial analysis financial modeling valuation corporate finance", keywords:["재무","회계","세무","재무모델링","기업재무"], cats:["Finance & Accounting"] },
    { id:"strategy", name:"전략/기획", prompt:"strategy planning market research okr business model competitive analysis strategic thinking business planning", keywords:["전략기획","시장조사","OKR","비즈니스모델"], cats:["Business"] },
    { id:"ga_legal", name:"총무/법무", prompt:"general affairs purchasing legal contract compliance risk management procurement vendor management", keywords:["총무","구매","법무","컴플라이언스","리스크관리"], cats:["Business"] },
    { id:"scm", name:"SCM/물류", prompt:"supply chain management logistics procurement inventory management warehouse operations lean six sigma", keywords:["SCM","물류","재고관리","린식스시그마"], cats:["Business"] }
  ]},
  leadership: { name: "리더십/공통", emoji: "👑", color: "#f97316", roles: [
    { id:"leadership", name:"리더십/매니지먼트", prompt:"leadership management coaching team delegation emotional intelligence servant leadership situational leadership", keywords:["리더십","매니지먼트","코칭","EQ","위임"], cats:["Business","Personal Development"] },
    { id:"comm", name:"커뮤니케이션", prompt:"communication presentation negotiation writing business english public speaking storytelling facilitation", keywords:["커뮤니케이션","프레젠테이션","비즈니스영어","퍼실리테이션"], cats:["Business","Personal Development"] },
    { id:"productivity", name:"생산성/업무스킬", prompt:"productivity time management excel powerpoint project management notion obsidian task management GTD", keywords:["생산성","Excel","PPT","프로젝트관리","Notion"], cats:["Office Productivity","Business"] },
    { id:"career", name:"커리어 개발", prompt:"career development personal branding resume interview skills networking mentoring career planning", keywords:["커리어","이력서","면접","네트워킹","멘토링"], cats:["Personal Development","Business"] },
    { id:"mindset", name:"마인드셋/자기계발", prompt:"mindset growth mindset resilience stress management work-life balance meditation mindfulness habits", keywords:["마인드셋","스트레스관리","워라밸","명상","습관"], cats:["Personal Development"] }
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
