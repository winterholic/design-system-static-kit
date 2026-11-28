/**
 * 타이포 시스템(타이포 작업 소유). 타이포 시스템 = 서체 짝(facePairing) × 역할 크기 체계(roleScale) × 숫자 정렬(numerals).
 * 서체 짝과 역할 체계는 src/platform/data/type-materials.mjs의 표에서 id로 읽는다. 값은 src/platform/type.mjs의 bindType이 결합한다.
 *
 * id는 `type-system:<용도>-<이름>`이다. 다른 작업(스타일 맥락 등)이 이 id를 참조해 `prefers` 관계를 건다. 이미 낸 id는 바꾸지 않는다.
 *   work-*    업무·대시보드    doc-*    문서·에디토리얼    mkt-*  마케팅    shop-*  커머스    mobile-*  모바일
 * `contexts`는 이 시스템을 쓸 수 있는 페이지 유형(조립 때 거르는 하드 조건)이다. 쓸 수는 있으나 피할 맥락(밀도·화면 폭 포함)은 TYPE_FIT가 이유와 함께 정한다.
 */
import {definePlatformMaterial} from '../contract.mjs';

const MIN = {status: 'implemented', evidence: []};
const system = (name, label, o) => definePlatformMaterial({
  id: `type-system:${name}`, kind: 'type-system', label, contexts: o.contexts, tags: [o.usage, o.family ?? o.tags?.[0] ?? 'general', ...(o.tags ?? [])].filter(Boolean),
  facePairing: o.face, roleScale: o.scale, numerals: o.numerals, relations: o.relations ?? [], quality: MIN, reuses: o.reuses ?? [],
});
const WORKSPACE = 'style-context:workspace';
const toWorkspace = (priority, context, reason) => ({type: 'prefers', to: WORKSPACE, priority, reason, when: {context}});

export const TYPE_SYSTEMS = Object.freeze([
  // 구형 조합을 그대로 옮긴 기록. W5의 최소 예시와 테스트가 이 id를 쓴다. 구형 서체 짝(type-preset:tech)과 역할형(type-role-preset:erp)을 id로 재사용한다.
  definePlatformMaterial({
    id: 'type-system:tech-erp', kind: 'type-system', label: '테크 서체 × ERP 역할', contexts: ['dashboard', 'data', 'listing', 'settings'], tags: ['work', 'enterprise'],
    facePairing: 'type-preset:tech', roleScale: 'type-role-preset:erp', numerals: 'tabular',
    relations: [toWorkspace(40, ['dashboard', 'data', 'listing', 'settings'], '작업 공간 스타일의 기존 기본 짝: ERP 역할 체계가 표·지표 화면용으로 검증돼 있다')],
    quality: {status: 'implemented', evidence: []}, reuses: ['type-preset:tech', 'type-role-preset:erp'],
  }),

  // 업무·대시보드
  system('work-console', '운영 콘솔', {usage: 'work', family: 'enterprise', contexts: ['dashboard', 'data', 'listing', 'settings', 'form'], face: 'face-pairing:grotesk-system', scale: 'role-scale:work-console', numerals: 'tabular',
    relations: [toWorkspace(30, ['dashboard', 'data', 'listing', 'settings', 'form'], '본문 14px·행간 1.55로 표와 폼을 한 화면에 가장 많이 담는다')]}),
  system('work-insight', '분석 보드', {usage: 'work', family: 'enterprise', contexts: ['dashboard', 'data', 'listing'], face: 'face-pairing:geometric-system', scale: 'role-scale:work-insight', numerals: 'tabular',
    relations: [toWorkspace(25, ['dashboard', 'data'], 'KPI 숫자를 44px까지 키워 지표 화면의 위계 꼭대기에 둔다')]}),

  // 문서·에디토리얼
  system('doc-essay', '에세이', {usage: 'document', family: 'editorial', contexts: ['article', 'blog', 'docs', 'community'], face: 'face-pairing:editorial', scale: 'role-scale:doc-essay', numerals: 'proportional', reuses: ['type-preset:editorial']}),
  system('doc-handbook', '핸드북', {usage: 'document', family: 'education', contexts: ['docs', 'article', 'blog', 'general'], face: 'face-pairing:humanist-system', scale: 'role-scale:doc-handbook', numerals: 'tabular'}),
  system('doc-newsroom', '신문 지면', {usage: 'document', family: 'editorial', contexts: ['article', 'blog', 'listing', 'community'], face: 'face-pairing:newsroom', scale: 'role-scale:doc-newsroom', numerals: 'tabular', reuses: ['type-preset:newsroom']}),

  // 마케팅
  system('mkt-brand', '브랜드 히어로', {usage: 'marketing', family: 'marketing', contexts: ['landing', 'portfolio', 'pricing', 'general'], face: 'face-pairing:geometric', scale: 'role-scale:mkt-brand', numerals: 'proportional', reuses: ['type-preset:geometric']}),
  system('mkt-launch', '제품 출시', {usage: 'marketing', family: 'marketing', contexts: ['landing', 'pricing', 'auth', 'general'], face: 'face-pairing:grotesk', scale: 'role-scale:mkt-launch', numerals: 'tabular', reuses: ['type-preset:grotesk', 'type-preset:swiss']}),
  system('mkt-atelier', '아틀리에', {usage: 'marketing', family: 'marketing', contexts: ['landing', 'portfolio', 'commerce'], face: 'face-pairing:luxe', scale: 'role-scale:mkt-atelier', numerals: 'proportional', reuses: ['type-preset:luxe']}),

  // 커머스
  system('shop-catalog', '쇼핑 카탈로그', {usage: 'commerce', family: 'commerce', contexts: ['commerce', 'listing', 'pricing'], face: 'face-pairing:condensed', scale: 'role-scale:shop-catalog', numerals: 'tabular', reuses: ['type-preset:condensed']}),
  system('shop-boutique', '부티크 스토리', {usage: 'commerce', family: 'commerce', contexts: ['commerce', 'portfolio', 'landing'], face: 'face-pairing:serif', scale: 'role-scale:shop-boutique', numerals: 'proportional', reuses: ['type-preset:serif']}),

  // 모바일(좁은 화면 기준으로 설계. 데스크톱은 확대 폭이 작다)
  system('mobile-app', '모바일 앱', {usage: 'mobile', family: 'mobile', contexts: ['general', 'auth', 'form', 'settings', 'commerce', 'community', 'listing', 'error'], face: 'face-pairing:rounded', scale: 'role-scale:mobile-app', numerals: 'tabular', reuses: ['type-preset:rounded']}),
  system('mobile-reader', '모바일 읽기', {usage: 'mobile', family: 'mobile', contexts: ['article', 'blog', 'docs', 'community'], face: 'face-pairing:bookish', scale: 'role-scale:mobile-reader', numerals: 'proportional', reuses: ['type-preset:bookish']}),
  system('mobile-feed', '모바일 피드', {usage: 'mobile', family: 'mobile', contexts: ['community', 'listing', 'commerce', 'general', 'blog'], face: 'face-pairing:humanist', scale: 'role-scale:mobile-feed', numerals: 'tabular', reuses: ['type-preset:humanist']}),
  // General Product
  system('work-product-neutral', '중립 프로덕트', {usage: 'work', family: 'general-product', contexts: ['dashboard', 'data', 'listing', 'form', 'settings', 'general'], face: 'face-pairing:charter-system', scale: 'role-scale:product-neutral', numerals: 'tabular'}),
  system('work-product-humanist', '인문주의 프로덕트', {usage: 'work', family: 'general-product', contexts: ['general', 'community', 'blog', 'form'], face: 'face-pairing:humanist-geometric', scale: 'role-scale:product-humanist', numerals: 'proportional'}),
  system('work-product-geometric', '기하학 프로덕트', {usage: 'work', family: 'general-product', contexts: ['dashboard', 'listing', 'pricing', 'general'], face: 'face-pairing:geometric-grotesk', scale: 'role-scale:product-geometric', numerals: 'tabular'}),
  system('work-product-soft', '소프트 프로덕트', {usage: 'work', family: 'general-product', contexts: ['general', 'form', 'community', 'settings'], face: 'face-pairing:rounded-system', scale: 'role-scale:product-soft', numerals: 'proportional'}),

  // Enterprise
  system('work-enterprise-formal', '공식 엔터프라이즈', {usage: 'work', family: 'enterprise', contexts: ['dashboard', 'data', 'listing', 'settings', 'form'], face: 'face-pairing:literary', scale: 'role-scale:enterprise-formal', numerals: 'tabular'}),

  // Finance
  system('work-finance-numeric', '금융 숫자 정밀', {usage: 'work', family: 'finance', contexts: ['dashboard', 'data', 'listing'], face: 'face-pairing:condensed-grotesk', scale: 'role-scale:finance-numeric', numerals: 'tabular'}),
  system('work-finance-terminal', '마켓 터미널', {usage: 'work', family: 'finance', contexts: ['dashboard', 'data'], face: 'face-pairing:charter-humanist', scale: 'role-scale:finance-terminal', numerals: 'tabular'}),
  system('work-finance-banking', '리테일 뱅킹', {usage: 'work', family: 'finance', contexts: ['dashboard', 'form', 'listing', 'general'], face: 'face-pairing:georgia-system', scale: 'role-scale:finance-banking', numerals: 'tabular'}),
  system('doc-finance-report', '임원 리포트', {usage: 'document', family: 'finance', contexts: ['article', 'docs', 'dashboard'], face: 'face-pairing:baskerville-charter', scale: 'role-scale:finance-report', numerals: 'tabular'}),

  // Developer
  system('work-dev-console', '코드 콘솔', {usage: 'work', family: 'developer', contexts: ['dashboard', 'data', 'settings'], face: 'face-pairing:slab', scale: 'role-scale:dev-console', numerals: 'tabular'}),
  system('doc-dev-docs', '기술 레퍼런스', {usage: 'document', family: 'developer', contexts: ['docs', 'article', 'general'], face: 'face-pairing:grotesk-humanist', scale: 'role-scale:dev-docs', numerals: 'tabular'}),
  system('work-dev-product', '개발자 제품', {usage: 'work', family: 'developer', contexts: ['dashboard', 'settings', 'form', 'general'], face: 'face-pairing:slab-humanist', scale: 'role-scale:dev-product', numerals: 'tabular'}),
  system('work-dev-monitor', '시스템 모니터', {usage: 'work', family: 'developer', contexts: ['dashboard', 'data', 'settings'], face: 'face-pairing:baskerville-humanist', scale: 'role-scale:dev-monitor', numerals: 'tabular'}),

  // Marketing
  system('mkt-expressive', '표현형 브랜드', {usage: 'marketing', family: 'marketing', contexts: ['landing', 'portfolio'], face: 'face-pairing:poster-grotesk', scale: 'role-scale:mkt-expressive', numerals: 'proportional'}),

  // Editorial
  system('doc-magazine', '매거진 에디토리얼', {usage: 'document', family: 'editorial', contexts: ['article', 'blog', 'portfolio'], face: 'face-pairing:didone-system', scale: 'role-scale:doc-magazine', numerals: 'proportional'}),
  system('doc-modern', '모던 에디토리얼', {usage: 'document', family: 'editorial', contexts: ['article', 'blog', 'community'], face: 'face-pairing:baskerville-system', scale: 'role-scale:doc-modern', numerals: 'proportional'}),

  // Commerce
  system('shop-luxury', '럭셔리 커머스', {usage: 'commerce', family: 'commerce', contexts: ['commerce', 'portfolio', 'landing'], face: 'face-pairing:georgia-charter', scale: 'role-scale:shop-luxury', numerals: 'proportional'}),
  system('shop-promo', '프로모션 커머스', {usage: 'commerce', family: 'commerce', contexts: ['commerce', 'listing', 'pricing'], face: 'face-pairing:poster', scale: 'role-scale:shop-promo', numerals: 'tabular'}),

  // Mobile
  system('mobile-friendly', '친근한 모바일', {usage: 'mobile', family: 'mobile', contexts: ['general', 'community', 'form'], face: 'face-pairing:news-system', scale: 'role-scale:mobile-friendly', numerals: 'tabular'}),
  system('mobile-accessible', '접근성 모바일', {usage: 'mobile', family: 'mobile', contexts: ['general', 'article', 'form', 'settings'], face: 'face-pairing:palatino-system', scale: 'role-scale:mobile-accessible', numerals: 'tabular'}),

  // Education
  system('doc-edu-learning', '학습 플랫폼', {usage: 'document', family: 'education', contexts: ['docs', 'article', 'general'], face: 'face-pairing:iowan-humanist', scale: 'role-scale:edu-learning', numerals: 'tabular'}),
  system('doc-edu-academic', '학술 논문', {usage: 'document', family: 'education', contexts: ['article', 'docs'], face: 'face-pairing:palatino-palatino', scale: 'role-scale:edu-academic', numerals: 'proportional'}),
  system('doc-edu-friendly', '인터랙티브 교육', {usage: 'document', family: 'education', contexts: ['general', 'community', 'docs'], face: 'face-pairing:slab-grotesk', scale: 'role-scale:edu-friendly', numerals: 'tabular'}),

  // Experimental
  system('mkt-exp-retro', '레트로', {usage: 'marketing', family: 'experimental', contexts: ['landing', 'portfolio', 'general'], face: 'face-pairing:condensed-humanist', scale: 'role-scale:exp-retro', numerals: 'tabular'}),
  system('work-exp-brutalist', '브루탈리스트', {usage: 'work', family: 'experimental', contexts: ['portfolio', 'general', 'listing'], face: 'face-pairing:georgia-humanist', scale: 'role-scale:exp-brutalist', numerals: 'tabular'}),
  system('work-exp-industrial', '산업 유틸리티', {usage: 'work', family: 'experimental', contexts: ['dashboard', 'data', 'settings'], face: 'face-pairing:poster-humanist', scale: 'role-scale:exp-industrial', numerals: 'tabular'}),
  system('doc-exp-mixed-serif', '믹스드 세리프', {usage: 'document', family: 'experimental', contexts: ['article', 'portfolio', 'landing'], face: 'face-pairing:didone-charter', scale: 'role-scale:exp-mixed-serif', numerals: 'proportional'}),

]);

/**
 * 시스템과 용도·밀도·화면 폭 맥락의 적합성 관계. 각 항목은 {type, when, priority, reason}이다.
 *   when: {context?: 페이지 유형[], density?: 밀도[], viewport?: ['mobile'|'desktop']}  키끼리 AND, 값 목록은 OR. 맥락에 그 키가 없으면 그 조건은 적용하지 않는다.
 *   priority: 0~100. prefers는 더하고 avoids는 뺀다(src/platform/relations.mjs 점수와 같은 부호 규칙).
 * 계약의 관계(edge)는 도착이 등록된 재료여야 하므로 페이지 유형·밀도·화면 폭을 목적지로 둘 수 없다. 그래서 이 표가 원본이고, typeFit()이 같은 점수 모양으로 읽는다.
 * 스타일 맥락(재료)이 목적지인 관계는 위 기록의 relations에 둔다.
 */
const P = (when, priority, reason) => ({type: 'prefers', when, priority, reason});
const A = (when, priority, reason) => ({type: 'avoids', when, priority, reason});
const MOBILE = {viewport: ['mobile']}, DESKTOP = {viewport: ['desktop']};

export const TYPE_FIT = Object.freeze({
  'type-system:work-product-neutral': [
    P({context: ['dashboard', 'data', 'listing', 'form', 'settings', 'general'], density: ['comfortable', 'compact']}, 35, '균형 잡힌 중립적 본문과 위계로 다양한 업무용 화면에 안정적으로 적용'),
    A({density: ['spacious']}, 15, '중립적 정보 밀도라 극단적으로 넓은 여백에는 다소 촘촘하게 보일 수 있음'),
  ],
  'type-system:work-product-humanist': [
    P({context: ['general', 'community', 'blog', 'form'], density: ['comfortable']}, 35, '따뜻한 인문주의 본문과 기하학 표제가 친근한 서비스 분위기 조성'),
    A({density: ['compact']}, 20, '휴머니스트 리듬은 좁은 표 밀도와 다소 충돌'),
  ],
  'type-system:work-product-geometric': [
    P({context: ['dashboard', 'listing', 'pricing', 'general'], density: ['comfortable', 'compact']}, 35, '현대적인 SaaS와 기술 제품의 기하학적 리듬과 정돈된 위계'),
    A({density: ['spacious']}, 15, '컴팩트 대시보드용으로 최적화되어 넓은 에디토리얼에는 부적합'),
  ],
  'type-system:work-product-soft': [
    P({context: ['general', 'form', 'community', 'settings'], density: ['comfortable']}, 35, '부드러운 라운드 표제와 익숙한 시스템 본문으로 편안한 조작감 제공'),
    A({density: ['compact']}, 20, '소프트 곡선 글자는 고밀도 데이터 표에 어울리지 않음'),
  ],
  'type-system:work-enterprise-formal': [
    P({context: ['dashboard', 'data', 'listing', 'settings', 'form'], density: ['compact', 'comfortable']}, 35, '제도적 신뢰도와 절제된 위계의 대규모 엔터프라이즈 관리 화면'),
    A({density: ['spacious']}, 25, '엔터프라이즈 정형 격자용이라 넓은 여백과 어긋남'),
  ],
  'type-system:work-finance-numeric': [
    P({context: ['dashboard', 'data', 'listing'], density: ['compact']}, 35, '수치와 테이블 중심의 고정밀 금융 거래 및 원장 위계'),
    A({density: ['spacious']}, 30, '고정밀 수치 정렬 중심이라 장문 아티클에 부적합'),
  ],
  'type-system:work-finance-terminal': [
    P({context: ['dashboard', 'data'], density: ['compact']}, 35, '실시간 시세와 다수의 호가를 담는 고밀도 금융 터미널 화면'),
    A({density: ['spacious']}, 35, '터미널용 고밀도 설계라 여백 중심 화면과 맞지 않음'),
  ],
  'type-system:work-finance-banking': [
    P({context: ['dashboard', 'form', 'listing', 'general'], density: ['comfortable']}, 35, '이체 내역과 계좌 정보를 명확히 구분하는 직관적 리테일 뱅킹 위계'),
    A({density: ['compact']}, 15, '은행 계좌 내역 식별을 위한 최소 행간 필요'),
  ],
  'type-system:doc-finance-report': [
    P({context: ['article', 'docs', 'dashboard'], density: ['comfortable', 'spacious']}, 35, '자산 관리 및 투자 제안서의 품격 있는 리포트 위계'),
    A({density: ['compact']}, 25, '품격 있는 보고서용 세리프라 고밀도 입력폼에는 어긋남'),
  ],
  'type-system:work-dev-console': [
    P({context: ['dashboard', 'data', 'settings'], density: ['compact']}, 35, '터미널과 CLI 콘솔의 고정폭 중심 리듬으로 코드 정보 밀도 극대화'),
    A({density: ['spacious']}, 30, '전체 고정폭 리듬은 일반 마케팅에 어울리지 않음'),
  ],
  'type-system:doc-dev-docs': [
    P({context: ['docs', 'article', 'general'], density: ['comfortable', 'compact']}, 35, 'API 명세와 코드 블록이 강조되는 기술 문서 전문 레이아웃'),
    A({density: ['spacious']}, 20, '기술 레퍼런스 특성상 적정 줄 수 유지가 필수'),
  ],
  'type-system:work-dev-product': [
    P({context: ['dashboard', 'settings', 'form', 'general'], density: ['comfortable']}, 35, '클라우드 콘솔 및 협업 도구의 개발자 친화적 위계'),
    A({density: ['spacious']}, 20, '개발 도구의 실용적 밀도 요구'),
  ],
  'type-system:work-dev-monitor': [
    P({context: ['dashboard', 'data', 'settings'], density: ['compact']}, 35, '모니터링 대시보드와 경보 로그를 위한 고밀도 화면'),
    A({density: ['spacious']}, 35, '극단적 정보 밀도로 넓은 여백에서는 답답해 보임'),
  ],
  'type-system:mkt-expressive': [
    P({context: ['landing', 'portfolio'], density: ['spacious']}, 40, '시선을 사로잡는 대담한 포스터 표제와 감각적인 브랜드 메시지'),
    A({density: ['compact']}, 40, '거대한 포스터 표제는 컴팩트 어드민에 절대 부적합'),
  ],
  'type-system:doc-magazine': [
    P({context: ['article', 'blog', 'portfolio'], density: ['spacious', 'comfortable']}, 40, '문화 매거진의 고대비 표제와 넉넉한 본문 호흡'),
    A({density: ['compact']}, 30, '디도네 표제의 섬세한 세리프는 작은 크기에서 뭉개짐'),
  ],
  'type-system:doc-modern': [
    P({context: ['article', 'blog', 'community'], density: ['comfortable', 'spacious']}, 40, '현대적 저널과 칼럼의 유려한 본문 리듬'),
    A({density: ['compact']}, 25, '현대 에디토리얼은 줄 간 여백이 살아나야 읽힘'),
  ],
  'type-system:shop-luxury': [
    P({context: ['commerce', 'portfolio', 'landing'], density: ['spacious', 'comfortable']}, 40, '명품 브랜드의 절제된 가격과 품격 있는 상품 설명'),
    A({density: ['compact']}, 35, '명품 여백감을 위해 컴팩트 밀도는 회피'),
  ],
  'type-system:shop-promo': [
    P({context: ['commerce', 'listing', 'pricing'], density: ['compact', 'comfortable']}, 40, '특가 할인과 긴급 혜택이 돋보이는 프로모션 위계'),
    A({density: ['spacious']}, 25, '프로모션 배너와 가격 비교의 빠른 인지가 핵심'),
  ],
  'type-system:mobile-friendly': [
    P({context: ['general', 'community', 'form'], density: ['comfortable']}, 35, '생활형 모바일 앱의 둥글고 부드러운 터치 위계'),
    A({...DESKTOP}, 20, '모바일 터치 최적화로 데스크톱 정보 밀도는 낮음'),
  ],
  'type-system:mobile-accessible': [
    P({context: ['general', 'article', 'form', 'settings'], density: ['spacious', 'comfortable']}, 40, '큰 터치 영역과 넉넉한 행간의 고가독성 모바일 환경'),
    A({density: ['compact']}, 35, '접근성 보장을 위해 촘촘한 행간은 절대 금지'),
  ],
  'type-system:doc-edu-learning': [
    P({context: ['docs', 'article', 'general'], density: ['comfortable']}, 40, '학습 진도와 개념 이해를 돕는 친근한 교육 위계'),
    A({density: ['compact']}, 20, '학습 집중도를 위해 글자 간격 보장 필요'),
  ],
  'type-system:doc-edu-academic': [
    P({context: ['article', 'docs'], density: ['comfortable', 'spacious']}, 40, '대학 학술지 및 심층 연구 보고서의 정통 세리프 위계'),
    A({density: ['compact']}, 30, '정통 논문 조판을 위한 여백 필수'),
  ],
  'type-system:doc-edu-friendly': [
    P({context: ['general', 'community', 'docs'], density: ['comfortable']}, 35, '퀴즈와 튜토리얼을 위한 시각적 교육 위계'),
    A({density: ['compact']}, 20, '어린이 및 초심자 교육용으로 컴팩트 조판은 부적합'),
  ],
  'type-system:mkt-exp-retro': [
    P({context: ['landing', 'portfolio', 'general'], density: ['comfortable', 'spacious']}, 35, '초기 개인용 컴퓨터의 향수를 담은 헤드라인 위계'),
    A({density: ['compact']}, 25, '레트로 슬랩 서체는 컴팩트 그리드에서 시인성 저하'),
  ],
  'type-system:work-exp-brutalist': [
    P({context: ['portfolio', 'general', 'listing'], density: ['compact', 'comfortable']}, 35, '규격화되지 않은 강한 대비와 압축된 타이포그래피'),
    A({density: ['spacious']}, 25, '브루탈리스트는 긴장감 있는 밀도를 지향'),
  ],
  'type-system:work-exp-industrial': [
    P({context: ['dashboard', 'data', 'settings'], density: ['compact']}, 35, '엔지니어링 장비 매뉴얼과 기술 스펙 시트의 견고한 위계'),
    A({density: ['spacious']}, 30, '산업 기기 모니터링 특성상 높은 정보 밀도 요구'),
  ],
  'type-system:doc-exp-mixed-serif': [
    P({context: ['article', 'portfolio', 'landing'], density: ['spacious']}, 35, '극적 디도네 표제와 고전 세리프 본문의 실험적 결합'),
    A({density: ['compact']}, 35, '실험적 세리프 대비는 넓은 캔버스에서만 온전히 구현'),
  ],

  'type-system:tech-erp': [
    P({context: ['dashboard', 'data', 'listing', 'settings'], density: ['compact']}, 40, 'ERP 역할 체계가 컴팩트 표·지표 화면용으로 검증돼 있다'),
    A({density: ['spacious']}, 20, '컴팩트 리듬이라 넓은 여백과 맞지 않는다'),
  ],
  'type-system:work-console': [
    P({context: ['dashboard', 'data', 'listing', 'settings', 'form'], density: ['compact']}, 50, '본문 14px·행간 1.55로 표 한 화면에 가장 많은 행을 담는다'),
    P({context: ['form', 'settings']}, 15, '라벨 12px·본문 14px 단차가 폼 항목 위계를 분명히 한다'),
    A({density: ['spacious']}, 30, '촘촘한 본문 리듬과 넓은 여백이 어긋난다'),
    A({...MOBILE}, 15, '본문 14px는 손가락 조작·모바일 읽기에 작다'),
  ],
  'type-system:work-insight': [
    P({context: ['dashboard', 'data'], density: ['compact', 'comfortable']}, 50, 'KPI 숫자 44px가 본문 15px의 3배라 지표가 먼저 읽힌다'),
    P({context: ['listing']}, 10, '숫자 열 정렬(tabular)이 목록 비교에 쓸 만하다'),
    A({context: ['listing']}, 15, '제목 24px 상한이라 목록 페이지 제목이 약하다'),
    A({density: ['spacious']}, 20, '지표 카드의 여백이 커지면 숫자와 설명이 떨어져 읽힌다'),
  ],
  'type-system:doc-essay': [
    P({context: ['article', 'blog'], density: ['spacious', 'comfortable']}, 60, '본문 17→19px·행간 1.8 세리프가 긴 글을 읽는 데 맞다'),
    P({context: ['docs', 'community']}, 15, '긴 본문 위주 화면에서 읽기 리듬이 안정적이다'),
    A({density: ['compact']}, 40, '행간 1.8은 컴팩트 밀도의 줄 수 예산을 넘는다'),
    A({...MOBILE}, 10, '본문 19px로 커지는 설계라 좁은 화면 기준 시스템(mobile-reader)이 더 맞다'),
  ],
  'type-system:doc-handbook': [
    P({context: ['docs'], density: ['comfortable']}, 55, '코드(14→15px)가 본문과 어울려 기술 문서의 코드 블록이 읽힌다'),
    P({context: ['article', 'blog', 'general']}, 15, '제목 위계 4단계가 긴 문서의 구조를 드러낸다'),
    A({density: ['compact']}, 20, '행간 1.7 본문은 컴팩트 밀도에서 줄 수를 많이 쓴다'),
  ],
  'type-system:doc-newsroom': [
    P({context: ['article', 'blog'], density: ['comfortable', 'compact']}, 50, '굵은 세리프 표제와 촘촘한 본문(1.6)이 지면을 채우는 읽을거리에 맞다'),
    P({context: ['listing', 'community']}, 20, '표제와 본문의 대비로 기사 목록을 훑기 쉽다'),
    A({density: ['spacious']}, 25, '촘촘한 본문 리듬이 넉넉한 여백에서는 답답하게 남는다'),
    A({...MOBILE}, 10, '표제 48px·세리프 700은 좁은 화면에서 줄바꿈이 잦다'),
  ],
  'type-system:mkt-brand': [
    P({context: ['landing'], density: ['spacious']}, 60, '히어로 표제 36→72px가 본문의 4배라 첫 화면의 인상을 정한다'),
    P({context: ['portfolio', 'pricing', 'general']}, 25, '표제 위계가 3단계로 단순해 한 장짜리 소개에 맞다'),
    A({density: ['compact']}, 45, '큰 표제와 컴팩트 밀도는 한 화면에 들어가는 정보를 해친다'),
    A({context: ['pricing']}, 15, '가격표 숫자 위계는 제품 출시(mkt-launch)가 더 낫다'),
  ],
  'type-system:mkt-launch': [
    P({context: ['landing', 'pricing'], density: ['comfortable']}, 55, '표제 56px·가격 48px·본문 16px 세 단으로 제품 소개와 요금표를 함께 짠다'),
    P({context: ['auth', 'general']}, 10, '소제목 위계가 촘촘해 짧은 안내에도 맞다'),
    A({density: ['compact']}, 25, '가격 숫자 48px는 컴팩트 밀도의 카드에 크다'),
    A({context: ['portfolio']}, 15, '작품 소개에는 표제가 너무 두껍다'),
  ],
  'type-system:mkt-atelier': [
    P({context: ['landing', 'portfolio', 'commerce'], density: ['spacious']}, 45, '굵기 500 표제와 행간 1.8이 절제된 브랜드 인상을 만든다'),
    P({context: ['portfolio']}, 20, '작품·사례 소개에는 가는 표제가 이미지를 가리지 않는다'),
    A({density: ['compact']}, 50, '가는 표제와 넓은 행간은 컴팩트 밀도에서 위계가 흐려진다'),
    A({...MOBILE}, 10, '고대비 세리프 표제는 작은 크기에서 획이 가늘어 보인다'),
  ],
  'type-system:shop-catalog': [
    P({context: ['commerce', 'listing'], density: ['compact', 'comfortable']}, 55, '상품명(sub)과 가격(numeric) 위계가 카드 안 정보 밀도를 맡는다'),
    P({context: ['pricing']}, 15, '가격 숫자 정렬(tabular)이 요금 비교에 쓸 만하다'),
    A({density: ['spacious']}, 20, '좁은 표제(condensed)는 넓은 여백의 브랜드 페이지에서 인상이 약하다'),
  ],
  'type-system:shop-boutique': [
    P({context: ['commerce', 'portfolio', 'landing'], density: ['comfortable', 'spacious']}, 55, '세리프 표제와 행간 1.75 본문이 브랜드 이야기를 담는다'),
    A({density: ['compact']}, 40, '세리프 표제와 1.75 행간은 상품 격자의 밀도를 낮춘다'),
    A({context: ['listing']}, 15, '목록형 화면에는 상품명 위계가 약하다(shop-catalog가 낫다)'),
  ],
  'type-system:mobile-app': [
    P({...MOBILE, context: ['general', 'auth', 'form', 'settings', 'commerce']}, 50, '본문 17px 고정, 보조 글자 15px 이상이라 손가락 조작 화면에 읽힌다'),
    P({density: ['comfortable']}, 15, '터치 목표와 본문 리듬이 같은 단위로 맞는다'),
    A({...DESKTOP}, 20, '데스크톱 확대 폭이 표제 28→36px뿐이라 넓은 화면에서 위계가 약하다'),
    A({density: ['compact']}, 15, '본문 17px는 컴팩트 밀도의 줄 수 예산에 크다'),
  ],
  'type-system:mobile-reader': [
    P({...MOBILE, context: ['article', 'blog', 'docs']}, 55, '본문 18px·행간 1.8로 휴대폰 장문이 한 줄 20자 안팎에 읽힌다'),
    A({density: ['compact']}, 35, '행간 1.8 본문은 컴팩트 밀도와 어긋난다'),
    A({...DESKTOP}, 15, '본문이 18px로 고정이라 넓은 화면에서는 한 줄이 짧게 남는다'),
  ],
  'type-system:mobile-feed': [
    P({...MOBILE, context: ['community', 'listing', 'commerce']}, 50, '본문 15px·행간 1.55로 카드형 피드를 한 화면에 여러 장 담는다'),
    P({density: ['compact']}, 20, '숫자 18→20px 정렬이 좋아요·가격 같은 짧은 수치에 맞다'),
    A({density: ['spacious']}, 25, '촘촘한 본문 리듬과 넓은 여백이 어긋난다'),
    A({...DESKTOP}, 15, '데스크톱에서는 크기 확대가 거의 없어 위계가 평평하다'),
  ],
});
