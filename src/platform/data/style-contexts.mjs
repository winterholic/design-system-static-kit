/**
 * 스타일 맥락(테마·기타 재료 작업 소유). 테마 54개를 "값을 정하는 묶음"에서 "추천 순위를 정하는 맥락"으로 옮긴다(ADR 0012 §3).
 * 테마의 축 기본값은 첫 선호로, 단일 축 금지(forbid)는 그대로 금지로 옮긴다. 테마의 팔레트 목록(Coolors, 권리 미확인)은 옮기지 않는다.
 *
 * 이 파일이 하는 일
 *   1 styleContextFromTheme   테마 한 개 → 스타일 맥락 기록. 계약이 받는 필드(axisPreferences·forbid·mood·tags·relations)만 쓴다
 *   2 STYLE_CONTEXTS          54개 전부. 페이지 유형(contexts)·축 선호·금지·관계를 담는다
 *   3 관계 도출               스타일 맥락 → 팔레트·서브토큰 세트·타이포 시스템·패밀리의 prefers/avoids/forbids. main에 등록된 재료만 대상이다
 *                             (다른 작업이 재료를 더하면 이 파일을 고치지 않아도 같은 규칙으로 관계가 늘어난다)
 *   4 STYLE_CHECKS            계산 관계: 테마가 금지한 모드(예: neon은 light)를 서브토큰 세트와 결합할 때 거부한다
 *   5 STYLE_CONTEXT_DETAILS   계약 필드에 담기지 않는 정보(주요 용도, 금지 조합, 간격·반경·그림자·모션 성향, 미디어·아이콘, 레이아웃·내비). 계약 확장 요청은 docs/platform/style-contexts.md
 *   6 STYLE_MATERIALS         표면·모션·배경·미디어·상태 패턴 프리셋 인덱스, 스타일 맥락별 순위(rankStyleMaterials), 조립(assembleStyleMaterials)
 *   7 recommendWithReason     recommend()가 빈 결과를 낼 때 이유를 붙이는 얇은 감싸개
 */
import {themes, axes, axisBans, axisDefs, navLimits, megaShells, pageTypeIds} from '../../catalog/index.mjs';
import {RADIUS, ELEVATION, MOTION, ICON, WIDTH} from '../../styles/base.mjs';
import {SPACE} from '../../spacing.mjs';
import {definePlatformMaterial} from '../contract.mjs';
import {defineCheck} from '../relations.mjs';
import {recommend} from '../recommend.mjs';
import {PALETTES} from './palettes.mjs';
import {SUBTOKEN_SETS} from './subtoken-sets.mjs';
import {TYPE_SYSTEMS} from './type-systems.mjs';
import {FAMILIES} from './families.mjs';
import {SURFACES, validateSurface, surfaceCSS, renderSurfaceSample} from './surfaces.mjs';
import {MOTIONS, validateMotion, motionCSS, renderMotionSample} from './motion.mjs';
import {BACKGROUNDS, validateBackground, backgroundCSS, renderBackgroundSample} from './backgrounds.mjs';
import {MEDIA, validateMedia, mediaCSS, renderMedia} from './media.mjs';
import {STATE_PATTERNS, STATE_KINDS, validateStatePattern, stateCSS, renderState} from './states.mjs';

/** 54개 전부를 실패시킬 수 있는 테스트 줄: 이행·필드·관계·recommend 결과. */
const EVIDENCE = ['tests/platform-style-contexts.test.mjs:14', 'tests/platform-style-contexts.test.mjs:31', 'tests/platform-style-contexts.test.mjs:52', 'tests/platform-style-contexts.test.mjs:89'];
const SHAPE_AXES = ['radius', 'elevation', 'motion'];
/** 테마 기본값에서 스타일 맥락의 축 선호로 옮기는 축. 앞의 셋은 패밀리 모양과 맞춰 순위를 내고, 나머지는 조립 엔진의 페이지 단계(셸·폭·밀도)와 스타일 재료(아이콘·바탕·장식)가 읽는다. */
const CARRIED_AXES = [...SHAPE_AXES, 'density', 'shell', 'width', 'icon', 'backdrop', 'ornament', 'scale'];
const NEIGHBORS = {
  radius: {square: ['subtle'], subtle: ['soft', 'square'], soft: ['subtle', 'round'], round: ['soft', 'bubble'], bubble: ['round']},
  elevation: {flat: ['outline'], outline: ['flat', 'soft'], soft: ['outline', 'lifted'], lifted: ['soft'], glow: ['lifted'], hard: ['outline']},
  motion: {none: ['subtle'], subtle: ['none', 'lively'], lively: ['subtle']},
};

/** 스타일 맥락의 무드 낱말. 테마 축 기본값에서 계산한다(손으로 적지 않으므로 축과 어긋나지 않는다). */
function moodWords(t) {
  const d = t.defaults, w = new Set();
  w.add({compact: '촘촘함', comfortable: '보통 밀도', spacious: '여유로움'}[d.density]);
  if (['square', 'subtle'].includes(d.radius)) w.add('각진'); if (['round', 'bubble'].includes(d.radius)) w.add('둥근');
  if (d.elevation === 'hard') w.add('굵은 윤곽'); if (d.elevation === 'glow') w.add('글로우'); if (['flat', 'outline'].includes(d.elevation)) w.add('절제된 깊이');
  if (d.motion === 'lively') w.add('활기'); if (d.motion === 'none') w.add('정적');
  if (d.mode === 'dark') w.add('어두운 화면');
  if (d.ornament !== 'none') w.add({geometric: '기하 장식', organic: '유기적 장식', lines: '선 장식', dots: '점 장식'}[d.ornament]);
  if (['dramatic'].includes(d.scale)) w.add('큰 제목');
  return [...w];
}

/**
 * 테마 하나 → 스타일 맥락 기록. contexts는 호출자가 준다(테마에는 페이지 유형 목록이 없다).
 * extraPreferences: 기본값 뒤에 붙일 차선 선호 {축: [값…]}. relations: 이 맥락에서 나가는 관계(선언한 쪽이 소유한다).
 */
export function styleContextFromTheme(themeId, {contexts = ['any'], extraPreferences = {}, relations = []} = {}) {
  const t = themes[themeId];
  if (!t) throw new RangeError(`unknown theme: ${themeId}`);
  const forbid = Object.fromEntries(Object.entries(t.forbid).map(([a, v]) => [a, [...v]]));
  const axisPreferences = Object.fromEntries(CARRIED_AXES.map(a => [a, [...new Set([t.defaults[a], ...(extraPreferences[a] ?? [])])].filter(v => !(forbid[a] ?? []).includes(v) || v === t.defaults[a])]));
  return definePlatformMaterial({
    id: `style-context:${themeId}`, kind: 'style-context', label: t.name, contexts, axisPreferences, forbid, mood: [t.category, ...moodWords(t)],
    tags: [t.category, `shell-${t.defaults.shell}`, `mode-${t.defaults.mode}`], relations,
    quality: {status: 'verified', evidence: EVIDENCE}, reuses: [`theme:${themeId}`],
  });
}

// ---------------------------------------------------------------------------------------------
// 테마별 페이지 유형 맥락과 색감. [페이지 유형[], 이유, 색상각 대역[] | null]. 색감은 테마 설명에 적힌 색 이름에서 읽는다(없으면 null).
// ---------------------------------------------------------------------------------------------
const BLUE = [[200, 250]], GREEN = [[90, 170]], WARM = [[10, 55]], GOLD = [[35, 58]];
const SETUP = {
  workspace: [['dashboard', 'data', 'listing', 'settings'], '빠르게 읽고 판단하는 도구 화면', null],
  ledger: [['dashboard', 'data', 'listing', 'settings', 'form'], '직각 고밀도 표와 입력이 많은 백오피스', null],
  console: [['dashboard', 'data', 'docs', 'settings'], '로그·상태를 읽는 개발·운영 콘솔', null],
  aurora: [['landing', 'pricing', 'dashboard'], '그라데이션 SaaS의 소개·요금·제품 화면', [[250, 300], [170, 200]]],
  trust: [['landing', 'pricing', 'dashboard', 'form'], '핀테크·보험의 신뢰 전달과 가입·신청 동선', BLUE],
  insight: [['dashboard', 'data', 'listing'], '차트·표 중심의 분석 대시보드', null],
  hub: [['community', 'dashboard', 'listing', 'settings'], '협업·커뮤니티 도구의 목록·대화·설정', null],
  precision: [['data', 'docs', 'portfolio', 'dashboard'], '구조를 드러내는 규격·데이터·포트폴리오', null],
  neon: [['landing', 'pricing', 'portfolio'], '어두운 마케팅 화면', [[180, 300]]],
  playful: [['landing', 'commerce', 'blog'], '소비자 캠페인과 상품 소개', null],
  studio: [['portfolio', 'landing', 'blog'], '큰 제목과 한 점 강조의 에이전시·포트폴리오', null],
  gallery: [['portfolio', 'blog', 'listing'], '작품을 늘어놓는 무채색 갤러리', null],
  brutalist: [['landing', 'portfolio', 'blog'], '거칠고 정직한 선언형 화면', null],
  retro: [['landing', 'blog', 'commerce'], '인쇄물 감성의 브랜드 소개와 상점', [[10, 50]]],
  signal: [['landing', 'dashboard', 'pricing'], '캠페인·관제·발표처럼 대비가 필요한 화면', null],
  editorial: [['article', 'blog', 'docs'], '긴 글을 읽는 출판·리서치', null],
  paper: [['docs', 'article', 'listing'], '노트·위키처럼 지면 위에서 읽고 찾는 화면', [[20, 50]]],
  manual: [['docs', 'article'], '목차와 코드 블록이 있는 레퍼런스 문서', null],
  journal: [['blog', 'article'], '블로그·뉴스레터', null],
  magazine: [['blog', 'article', 'portfolio'], '제호형 머리와 극적인 제목의 지면', null],
  botanical: [['commerce', 'landing', 'blog'], '자연·웰니스 상품과 이야기', GREEN],
  cloud: [['landing', 'form', 'dashboard'], '헬스케어의 예약·기록 화면', [[190, 230]]],
  clinic: [['landing', 'form', 'listing'], '병원·의원의 예약 동선', [[160, 200]]],
  dining: [['commerce', 'landing', 'listing'], '메뉴판과 예약', null],
  cafe: [['commerce', 'landing', 'listing'], '카페·베이커리의 메뉴와 매장 소개', [[15, 45]]],
  stay: [['listing', 'commerce', 'landing'], '숙소 사진 카드를 훑고 고르는 화면', null],
  commerce: [['commerce', 'listing', 'form', 'dashboard'], '스토어 운영과 상품 목록·구매', null],
  beauty: [['commerce', 'landing', 'portfolio'], '톤온톤 브랜드 소개와 상품', null],
  realty: [['listing', 'commerce', 'data'], '매물 표와 지표', null],
  atelier: [['community', 'landing', 'listing'], '교육·창작 커뮤니티', null],
  learning: [['dashboard', 'listing', 'form', 'community'], '진행 표시가 있는 학습 서비스', null],
  civic: [['form', 'docs', 'listing', 'auth', 'error'], '큰 터치 영역과 고대비의 공공 서비스', null],
  hanji: [['article', 'portfolio', 'blog'], '문화·전통 콘텐츠 읽기', [[25, 55]]],
  heritage: [['portfolio', 'article', 'landing'], '박물관·재단의 전시와 소개', GOLD],
  clarity: [['listing', 'settings', 'form', 'auth'], '하단 탭바 모바일 앱의 목록·설정·입력', null],
  pocket: [['listing', 'form', 'auth', 'settings'], '큰 터치 타깃의 모바일 우선 화면', [[150, 180]]],
  nocturne: [['listing', 'portfolio', 'landing'], '어두운 면 위의 미디어·음악', null],
  sport: [['dashboard', 'listing', 'commerce'], '피트니스·스포츠의 기록과 상품', null],
  solar: [['landing', 'dashboard', 'pricing'], '에너지 서비스의 소개·요금·현황', [[45, 65], [210, 240]]],
  ocean: [['landing', 'listing', 'commerce'], '여행·해양 상품 소개', [[200, 240]]],
  enterprise: [['dashboard', 'data', 'listing', 'settings', 'docs'], '낮은 채도의 기업 포털·인트라넷', null],
  devtool: [['docs', 'landing', 'dashboard', 'pricing'], '코드가 주인공인 개발자 제품과 API 문서', null],
  luxe: [['landing', 'commerce', 'portfolio'], '여백으로 가치를 말하는 고급 브랜드', GOLD],
  swiss: [['portfolio', 'landing', 'article'], '격자와 큰 타이포의 스위스 스타일', null],
  colorblock: [['landing', 'portfolio', 'pricing'], '큰 색면의 포스터형 캠페인', null],
  newsroom: [['article', 'blog', 'listing'], '촘촘한 머리기사와 구분선 지면', null],
  academic: [['article', 'docs'], '좁은 읽기 폭의 논문·리서치', null],
  wedding: [['landing', 'form', 'portfolio'], '청첩장·행사 초대와 참석 응답', null],
  kids: [['landing', 'commerce', 'listing'], '어린이 서비스', null],
  wine: [['commerce', 'landing', 'listing'], '와인바 메뉴와 예약', [[340, 360], [0, 15], ...GOLD]],
  garden: [['commerce', 'landing', 'blog'], '식물·정원 가게', [[90, 150]]],
  school: [['docs', 'listing', 'form', 'auth'], '학교 안내와 신청', null],
  bank: [['dashboard', 'data', 'form', 'settings'], '숫자가 먼저 읽히는 금융 화면', [[170, 250]]],
  game: [['landing', 'community', 'listing'], '어두운 면 위 빠른 움직임의 게임·e스포츠', null],
};

// ---------------------------------------------------------------------------------------------
// 관계 도출 규칙. 대상은 이 파일이 import한 data 배열(= main에 등록된 재료)뿐이다.
// ---------------------------------------------------------------------------------------------
/** hex → 색상각(0~360). 무채색이면 null. */
export function hueOf(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (d < 0.08) return null;
  const h = (max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return Math.round((h + 360) % 360);
}
const bandDistance = (h, bands) => Math.min(...bands.map(([lo, hi]) => (h >= lo && h <= hi ? 0 : Math.min(Math.abs(h - lo), Math.abs(h - hi), 360 - Math.abs(h - lo), 360 - Math.abs(h - hi)))));

const FACE_GROUP = {sans: 'sans', tech: 'sans', grotesk: 'sans', swiss: 'sans', geometric: 'sans', condensed: 'sans', rounded: 'friendly', humanist: 'friendly', serif: 'serif', editorial: 'serif', literary: 'serif', bookish: 'serif', newsroom: 'serif', luxe: 'serif', mono: 'mono', terminal: 'mono', poster: 'display', slab: 'display'};
const GROUP_NAME = {sans: '산세리프', friendly: '둥근·인문 서체', serif: '세리프', mono: '고정폭', display: '디스플레이'};
/** 테마가 기대하는 역할 크기 체계 순서. 업무 중 밀도가 높은 테마는 erp가 첫째, 읽기는 document, 마케팅·생활은 marketing, 앱·그 밖의 업무는 dashboard. */
function roleOrder(t) {
  const c = t.category;
  if (c === 'work') return t.defaults.density === 'compact' ? ['erp', 'dashboard'] : ['dashboard', 'erp'];
  if (c === 'read') return ['document'];
  if (c === 'brand') return ['marketing'];
  if (c === 'life') return t.defaults.density === 'spacious' ? ['marketing', 'document'] : ['marketing', 'dashboard'];
  if (c === 'app') return ['dashboard', 'marketing'];
  return t.id === 'bank' ? ['dashboard', 'document'] : ['document', 'dashboard'];
}

/** 관계 도출에 쓰는 재료 목록. 기본은 main에 등록된 data 배열이고, 시험에서 가짜 재료를 넣어 규칙을 직접 본다. */
const POOL = Object.freeze({palettes: PALETTES, subtokenSets: SUBTOKEN_SETS, typeSystems: TYPE_SYSTEMS, families: FAMILIES});

/** 테마 한 개의 스타일 맥락 → 재료 관계 [{type, to, priority, reason}]. 같은 입력은 같은 목록이다. */
export function deriveStyleRelations(themeId, contexts, pool = POOL) {
  const t = themes[themeId], d = t.defaults, out = [];
  const add = (type, to, priority, reason) => out.push({type, to, priority, reason});
  const hue = SETUP[themeId][2];

  for (const p of pool.palettes) {
    const h = hueOf(p.seeds.brand);
    if (hue && h !== null) {
      const dist = bandDistance(h, hue);
      if (dist === 0) add('prefers', p.id, 40, `테마 설명의 색감(색상각 ${hue.map(b => b.join('~')).join('·')}°)에 ${p.label}의 브랜드 원색(${h}°)이 들어간다`);
      else if (dist > 60) add('avoids', p.id, 25, `테마 설명의 색감(${hue.map(b => b.join('~')).join('·')}°)에서 ${p.label}의 브랜드 원색(${h}°)이 ${dist}° 벗어난다`);
      else add('prefers', p.id, 10, `${p.label}의 브랜드 원색(${h}°)이 테마 색감(${hue.map(b => b.join('~')).join('·')}°)과 가깝다(${dist}° 차이)`);
    } else if (hue) add('avoids', p.id, 10, `테마는 색감(${hue.map(b => b.join('~')).join('·')}°)을 요구하는데 ${p.label}은 무채색 계열이다`);
    else add('prefers', p.id, 10, `테마가 특정 색감을 요구하지 않아 범용 팔레트(${p.label})가 기본 후보다`);
  }

  for (const s of pool.subtokenSets) {
    const tags = s.tags, brandBackdrop = ['tint', 'gradient'].includes(d.backdrop), before = out.length;
    if (tags.includes('brand-surface')) {
      if (brandBackdrop) add('prefers', s.id, 30, `테마의 바탕(${d.backdrop})이 브랜드 틴트라서 브랜드색 표면 분배가 맞는다`);
      else if (d.density === 'compact') add('avoids', s.id, 15, '밀도가 높은 화면은 표·목록 행 구분이 중립 바탕에서 가장 안정적이다');
    }
    if (tags.includes('neutral-surface')) {
      if (!brandBackdrop) add('prefers', s.id, 30, `테마의 바탕(${d.backdrop})이 단색·격자라서 중립 표면 분배가 맞는다`);
      else add('prefers', s.id, 5, `테마의 바탕(${d.backdrop})은 브랜드 틴트라서 중립 표면 분배는 차선이다`);
    }
    if (tags.includes('dark-surface') && d.mode === 'dark') add('prefers', s.id, 25, '테마 기본 모드가 어두운 화면이다');
    if (tags.includes('high-contrast') && (t.category === 'institution' || ['signal', 'civic', 'school'].includes(themeId))) add('prefers', s.id, 25, '고대비·큰 터치 영역을 요구하는 맥락이다');
    if (out.length === before) add('prefers', s.id, 5, `${s.label}에 맞는 분배 선호가 없는 맥락이라 기본 후보로 둔다`);
  }

  const order = roleOrder(t), group = FACE_GROUP[d.typography];
  for (const ts of pool.typeSystems) {
    const face = ts.facePairing.replace('type-preset:', ''), role = ts.roleScale.replace('type-role-preset:', '');
    if (face === d.typography) add('prefers', ts.id, 40, `테마의 서체 축 기본값(${d.typography})이 이 시스템의 서체 짝이다`);
    else if (FACE_GROUP[face] === group) add('prefers', ts.id, 15, `서체 짝(${face})이 테마 서체(${d.typography})와 같은 ${GROUP_NAME[group]} 계열이다`);
    else if ((group === 'serif' && FACE_GROUP[face] === 'mono') || (group === 'mono' && FACE_GROUP[face] === 'serif')) add('avoids', ts.id, 25, `${GROUP_NAME[group]} 테마에 ${GROUP_NAME[FACE_GROUP[face]]} 서체(${face}) 제목은 어울리지 않는다`);
    else if (group === 'friendly' && FACE_GROUP[face] === 'mono') add('avoids', ts.id, 15, '둥근 서체 테마에 고정폭 제목은 어울리지 않는다');
    const at = order.indexOf(role);
    if (at === 0) add('prefers', ts.id, 25, `${t.category} 맥락은 역할 크기 체계로 ${role}를 가장 먼저 기대한다`);
    else if (at > 0) add('prefers', ts.id, 10, `역할 크기 체계 ${role}는 이 맥락의 차선이다(1순위 ${order[0]})`);
    else add('avoids', ts.id, role === 'erp' ? 20 : 10, `${t.category} 맥락의 역할 크기 체계는 ${order.join('·')}이고 ${role}는 목록에 없다`);
  }

  const first = Object.fromEntries(SHAPE_AXES.map(a => [a, d[a]]));
  for (const f of pool.families) {
    const same = SHAPE_AXES.filter(a => f.shape[a] === first[a]), diff = SHAPE_AXES.filter(a => f.shape[a] !== first[a]);
    if (same.length >= 2) add('prefers', f.id, 10 * same.length, `패밀리 모양이 테마 기본값과 ${same.map(a => `${a}=${f.shape[a]}`).join('·')}에서 같다`);
    else add('avoids', f.id, 10 * diff.length, `패밀리 모양이 테마 기본값과 ${diff.map(a => `${a}(${f.shape[a]}≠${first[a]})`).join('·')}에서 다르다`);
    if (!f.contexts.includes('any') && !contexts.includes('any') && !f.contexts.some(c => contexts.includes(c))) add('avoids', f.id, 20, `패밀리의 페이지 유형(${f.contexts.join('·')})과 이 맥락의 페이지 유형(${contexts.join('·')})이 겹치지 않는다`);
    if (f.density === d.density) add('prefers', f.id, 10, `패밀리가 전제한 밀도(${f.density})가 테마 밀도와 같다`);
    else if ([f.density, d.density].sort().join() === 'compact,spacious') add('avoids', f.id, 10, `패밀리 밀도(${f.density})와 테마 밀도(${d.density})가 정반대다`);
    for (const [axis, banned] of Object.entries(t.forbid)) {
      if (!SHAPE_AXES.includes(axis)) continue;
      if (banned.includes(f.shape[axis])) add('forbids', f.id, 100, `${t.name} 테마는 ${axis}=${f.shape[axis]}를 금지한다(테마 금지)`);
    }
  }
  return out;
}

const nearest = (axis, v, forbid) => (NEIGHBORS[axis]?.[v] ?? []).filter(x => !(forbid[axis] ?? []).includes(x));

/** 54개 전부 styleContextFromTheme으로 만든다. workspace만 최소 예시와 같은 선호(차선 subtle·soft)를 그대로 둔다. */
export const STYLE_CONTEXTS = Object.freeze(Object.keys(themes).map(id => {
  if (!SETUP[id]) throw new Error(`style context setup missing for theme ${id}`);
  const t = themes[id], [contexts] = SETUP[id];
  const extraPreferences = id === 'workspace' ? {radius: ['subtle'], elevation: ['soft']}
    : Object.fromEntries(Object.keys(NEIGHBORS).map(a => [a, nearest(a, t.defaults[a], t.forbid)]));
  return styleContextFromTheme(id, {contexts, extraPreferences, relations: deriveStyleRelations(id, contexts)});
}));
const BY_ID = new Map(STYLE_CONTEXTS.map(s => [s.id, s]));
export const styleContextById = id => BY_ID.get(id) ?? null;

// ---------------------------------------------------------------------------------------------
// 계산 관계
// ---------------------------------------------------------------------------------------------
/** 테마가 금지한 모드를 서브토큰 세트와 결합하지 않는다(테마 forbid.mode, 예: neon·nocturne·game은 light 금지, civic은 auto 금지). 맥락에 mode가 없으면 통과한다. */
export const styleModeCheck = defineCheck({
  id: 'style-mode', kinds: ['style-context', 'subtoken-set'], reason: '스타일 맥락이 금지한 모드가 아니다',
  run(style, set, ctx) {
    const banned = style.forbid.mode ?? [];
    if (ctx.mode && banned.includes(ctx.mode)) return {ok: false, reason: `${style.label} 테마는 ${ctx.mode} 모드를 금지한다(테마 금지 R10: 금지 모드 ${banned.join('·')})`};
    return {ok: true};
  },
});

/** 테마·기타 재료 작업이 소유하는 계산 관계 목록. */
export const STYLE_CHECKS = Object.freeze([styleModeCheck]);

// ---------------------------------------------------------------------------------------------
// 계약 필드에 담기지 않는 정보
// ---------------------------------------------------------------------------------------------
/** 테마 기본값에서 한 축만 바꿔도 걸리는 축 금지 조합(axisBans). 이미 테마가 금지한 값은 뺀다. */
function liveBans(t) {
  const out = [];
  for (const ban of axisBans) {
    const flips = {};
    for (const axis of ban.uses) for (const v of axes[axis] ?? []) {
      if (v === t.defaults[axis] || (t.forbid[axis] ?? []).includes(v)) continue;
      if (ban.bad({...t.defaults, [axis]: v})) (flips[axis] ??= []).push(v);
    }
    if (Object.keys(flips).length) out.push({id: ban.id, flip: flips, why: ban.why});
  }
  return out;
}

export function styleContextDetails(themeId) {
  const t = themes[themeId], d = t.defaults, sp = SPACE[d.density], el = ELEVATION[d.elevation], mo = MOTION[d.motion];
  const [use, ...rest] = t.description.split('. ');
  const control = d.control === 'pill' ? 999 : d.control === 'square' ? 0 : RADIUS[d.radius] / 2;
  return Object.freeze({
    id: `style-context:${themeId}`, theme: themeId, category: t.category,
    use, character: rest.join('. '), pageTypes: [...SETUP[themeId][0]], pageTypeReason: SETUP[themeId][1],
    forbid: {axes: structuredClone(t.forbid), combos: liveBans(t)},
    tendencies: {
      spacing: {density: d.density, gap: sp.gap, section: sp.section, inset: sp.inset, control: sp.control},
      radius: {axis: d.radius, px: RADIUS[d.radius], controlPx: control, control: d.control},
      shadow: {elevation: d.elevation, border: el.border, shadow: el.shadow},
      motion: {axis: d.motion, duration: mo.dur, lift: mo.lift},
    },
    media: {icon: d.icon, iconStroke: ICON[d.icon].sw, ornament: d.ornament, backdrop: d.backdrop},
    layout: {shell: d.shell, shellLabel: axisDefs.shell.values[d.shell], width: d.width, widthPx: WIDTH[d.width], footer: d.footer, navLimit: navLimits[d.shell], megaMenu: megaShells.includes(d.shell), scale: d.scale, weight: d.weight, mode: d.mode},
  });
}
export const STYLE_CONTEXT_DETAILS = Object.freeze(Object.fromEntries(Object.keys(themes).map(id => [id, styleContextDetails(id)])));

// ---------------------------------------------------------------------------------------------
// 스타일 재료(표면·모션·배경·미디어·상태 패턴)
// ---------------------------------------------------------------------------------------------
export const STYLE_MATERIALS = Object.freeze({surface: SURFACES, motion: MOTIONS, background: BACKGROUNDS, media: MEDIA, 'state-pattern': STATE_PATTERNS});
const VALIDATORS = {surface: validateSurface, motion: validateMotion, background: validateBackground, media: validateMedia, 'state-pattern': validateStatePattern};
const MATERIAL_BY_ID = new Map(Object.values(STYLE_MATERIALS).flat().map(m => [m.id, m]));
export const listStyleMaterials = kind => [...(STYLE_MATERIALS[kind] ?? [])];
export const styleMaterialById = id => MATERIAL_BY_ID.get(id) ?? null;

/** 모든 스타일 재료의 종류별 검사와 id 중복. [{code, path, message}]. 빈 배열이면 통과. */
export function checkStyleMaterials() {
  const out = [], seen = new Set();
  for (const [kind, list] of Object.entries(STYLE_MATERIALS)) for (const m of list) {
    if (seen.has(m.id)) out.push({code: 'P_DUPLICATE', path: m.id, message: `이미 있는 id: ${m.id}`}); seen.add(m.id);
    for (const e of VALIDATORS[kind](m)) out.push({...e, path: `${m.id}${e.path.slice(1)}`});
    for (const [i, e] of m.relations.entries()) if (!BY_ID.has(e.to) && !MATERIAL_BY_ID.has(e.to)) out.push({code: 'P_EDGE_DANGLING', path: `${m.id}.relations[${i}].to`, message: `없는 대상: ${e.to}`});
    for (const c of m.contexts) if (c !== 'any' && !pageTypeIds.includes(c)) out.push({code: 'P_CONTEXTS', path: `${m.id}.contexts`, message: `모르는 페이지 유형: ${c}`});
  }
  return out;
}

/** 스타일 맥락의 축 선호와 맞는 정도로 가산하는 가중치. 추천(src/platform/recommend.mjs)의 AXIS_PREFERENCE_WEIGHT와 같은 값이다. */
export const STYLE_AXIS_WEIGHT = 10;
/** 한 재료가 두 축을 구현할 때 더 크게 보이는 축의 배수. 배경은 페이지 바탕(backdrop)이 장식(ornament)보다 먼저 읽힌다. */
const AXIS_MULTIPLIER = {backdrop: 2};

/**
 * 스타일 맥락 하나에 대해 한 종류의 스타일 재료를 순위 매긴다. 결정적이다(동점은 id 순).
 * request: {kind, context?, state?: empty|loading|error|success (state-pattern만)}
 * 반환: {kind, ranked: [{id, score, reasons}], blocked: [{id, blocked: [{code, reason}]}], reasons: [빈 결과의 이유]}
 * 스타일 맥락이 금지한 축 값을 하나라도 쓰는 재료는 순위에서 빼고 blocked에 남긴다(다른 값으로 바꾸지 않는다).
 */
export function rankStyleMaterials(styleContext, {kind, context, state} = {}) {
  const sc = typeof styleContext === 'string' ? BY_ID.get(styleContext) : styleContext;
  if (!sc) throw new RangeError(`unknown style context: ${styleContext}`);
  if (!STYLE_MATERIALS[kind]) throw new RangeError(`unknown style material kind: ${kind}`);
  const pool = STYLE_MATERIALS[kind].filter(m => (!context || m.contexts.includes('any') || m.contexts.includes(context)) && (!state || m.state === state));
  const scored = pool.map(m => {
    let score = 0; const reasons = [], blocked = [];
    for (const [axis, v] of Object.entries(m.axes)) {
      const pref = sc.axisPreferences[axis] ?? [], i = pref.indexOf(v);
      if (i >= 0) { const priority = STYLE_AXIS_WEIGHT * (AXIS_MULTIPLIER[axis] ?? 1) * (pref.length - i); score += priority; reasons.push({from: sc.id, to: m.id, type: 'axis-preference', priority, reason: `${sc.label}는 ${axis}=${v}를 ${i + 1}순위로 선호한다`}); }
    }
    for (const [axis, values] of Object.entries(m.uses)) {
      const hit = values.filter(v => (sc.forbid[axis] ?? []).includes(v));
      if (hit.length) blocked.push({code: 'P_REL_STYLE_FORBID', with: sc.id, reason: `${sc.label}는 ${axis}=${hit.join('·')}를 금지한다(${m.label}가 쓴다)`});
    }
    return {id: m.id, score, reasons, blocked};
  });
  const ranked = scored.filter(s => !s.blocked.length).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map(({id, score, reasons}) => ({id, score, reasons}));
  const blocked = scored.filter(s => s.blocked.length).map(({id, blocked: b}) => ({id, blocked: b}));
  const reasons = [];
  if (!ranked.length) {
    for (const b of blocked) for (const x of b.blocked) reasons.push({code: x.code, id: b.id, reason: x.reason});
    if (!blocked.length) reasons.push({code: 'P_RECOMMEND_NO_CANDIDATE', id: null, reason: `${context ?? '전체'} 맥락${state ? `의 ${state} 상태` : ''}에 등록된 ${kind} 재료가 없습니다`});
  }
  return {kind, ranked, blocked, reasons};
}

const SLOTS = [['surface', 'surface'], ['motion', 'motion'], ['background', 'background'], ['media', 'media']];
const STATE_SLOTS = STATE_KINDS;
const diag = (code, path, message, extra = {}) => ({code, path, severity: 'error', message, ...extra});

/**
 * 스타일 재료 조립. request: {styleContext, context, surface?, motion?, background?, media?, states?: {empty?, loading?, error?, success?}} (값은 재료 id).
 * 요구가 있으면 검사해 그대로 쓰고(없는 id·종류·맥락 불일치·스타일 금지는 거부), 없으면 rankStyleMaterials의 1순위를 쓴다.
 * 반환: {ok, selection, decisions, diagnostics, css}. css는 모션 키프레임 → 표면 → 배경 → 미디어 → 상태 패턴 순서로 한 번씩 붙인다(결정적).
 * opts.registry를 주면 스타일 맥락을 그 레지스트리에서 찾는다(통합 중 재료 시험).
 */
export function assembleStyleMaterials(request, {registry = null} = {}) {
  const diagnostics = [], decisions = [], selection = {surface: null, motion: null, background: null, media: null, states: {}};
  const fail = () => ({ok: false, selection, decisions, diagnostics, css: null});
  if (request === null || typeof request !== 'object' || Array.isArray(request)) return {...fail(), diagnostics: [diag('P_REQUEST', '$', '요청은 객체여야 합니다')]};
  const allowed = ['styleContext', 'context', 'surface', 'motion', 'background', 'media', 'states'];
  for (const k of Object.keys(request)) if (!allowed.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.${k}`, `지원하지 않는 키: ${k}. 임의 CSS 경로는 없습니다`, {alternatives: allowed}));
  const sc = typeof request.styleContext === 'string' ? (registry?.get(request.styleContext) ?? BY_ID.get(request.styleContext)) : null;
  if (!sc || sc.kind !== 'style-context') diagnostics.push(diag('P_ATTR_UNKNOWN', '$.styleContext', `등록되지 않은 스타일 맥락: ${request.styleContext}`, {alternatives: [...BY_ID.keys()]}));
  if (typeof request.context !== 'string') diagnostics.push(diag('P_REQUEST_CONTEXT', '$.context', 'context(페이지 유형)가 필요합니다'));
  if (diagnostics.length) return fail();
  const states = request.states ?? {};
  for (const k of Object.keys(states)) if (!STATE_SLOTS.includes(k)) diagnostics.push(diag('P_REQUEST_KEY', `$.states.${k}`, `상태는 ${STATE_SLOTS.join('·')}입니다`, {alternatives: STATE_SLOTS}));
  if (diagnostics.length) return fail();

  const choose = (slot, kind, path, given, state) => {
    if (given !== undefined && given !== null) {
      const m = MATERIAL_BY_ID.get(given);
      if (!m) { diagnostics.push(diag('P_ATTR_UNKNOWN', path, `등록되지 않은 재료: ${given}`, {alternatives: STYLE_MATERIALS[kind].map(x => x.id)})); return null; }
      if (m.kind !== kind || (state && m.state !== state)) { diagnostics.push(diag('P_ATTR_KIND', path, `${given}는 ${state ? `${state} ` : ''}${kind}가 아니라 ${m.kind}${m.state ? `(${m.state})` : ''}입니다`)); return null; }
      if (!m.contexts.includes('any') && !m.contexts.includes(request.context)) { diagnostics.push(diag('P_ATTR_CONTEXT', path, `${given}는 ${request.context} 맥락용이 아닙니다(${m.contexts.join(', ')})`)); return null; }
      const hit = rankStyleMaterials(sc, {kind, context: request.context, state}).blocked.find(b => b.id === given);
      if (hit) { diagnostics.push(diag('P_REL_STYLE_FORBID', path, `${given}: ${hit.blocked.map(x => x.reason).join('; ')}`)); return null; }
      decisions.push({slot, id: given, source: 'request'});
      return given;
    }
    const rec = rankStyleMaterials(sc, {kind, context: request.context, state});
    if (!rec.ranked.length) { diagnostics.push(diag('P_SELECT_EMPTY', path, `${kind}${state ? `(${state})` : ''} 후보가 없습니다`, {blocked: rec.blocked, reasons: rec.reasons})); return null; }
    decisions.push({slot, id: rec.ranked[0].id, source: 'recommend', score: rec.ranked[0].score, reasons: rec.ranked[0].reasons});
    return rec.ranked[0].id;
  };
  for (const [slot, kind] of SLOTS) selection[slot] = choose(slot, kind, `$.${slot}`, request[slot]);
  for (const st of STATE_SLOTS) selection.states[st] = choose(`state(${st})`, 'state-pattern', `$.states.${st}`, states[st], st);
  if (diagnostics.length) return fail();

  const parts = [];
  const motion = MATERIAL_BY_ID.get(selection.motion);
  parts.push(motionCSS(motion), surfaceCSS(MATERIAL_BY_ID.get(selection.surface)), backgroundCSS(MATERIAL_BY_ID.get(selection.background)), mediaCSS(MATERIAL_BY_ID.get(selection.media)));
  for (const st of STATE_SLOTS) parts.push(stateCSS(MATERIAL_BY_ID.get(selection.states[st])));
  return {ok: true, selection, decisions, diagnostics, css: parts.join('\n')};
}

/** 선택한 스타일 재료의 샘플 마크업(문서·갤러리용). 같은 입력은 같은 바이트다. */
export function renderStyleMaterialSamples(selection) {
  const g = id => MATERIAL_BY_ID.get(id);
  return {
    surface: renderSurfaceSample(g(selection.surface)), motion: renderMotionSample(g(selection.motion)), background: renderBackgroundSample(g(selection.background)),
    media: renderMedia(g(selection.media), {title: '대표 이미지', caption: '이미지 설명'}),
    states: Object.fromEntries(STATE_SLOTS.map(st => [st, renderState(g(selection.states[st]), {action: {label: '다시 시도', href: '#retry'}})])),
  };
}

// ---------------------------------------------------------------------------------------------
// recommend() 보강
// ---------------------------------------------------------------------------------------------
/**
 * recommend()는 맥락에 맞는 후보가 하나도 없으면 ranked·blocked가 모두 비어 이유를 알 수 없다. 이 감싸개는 그 경우에 이유를 붙인다.
 * 반환: recommend 결과 + {ok: ranked가 있는가, reasons: 빈 결과의 이유 [{code, id, with?, reason}]}.
 * recommend 자체는 바꾸지 않는다(조립 엔진 작업의 파일).
 */
export function recommendWithReason(registry, graph, request) {
  const rec = recommend(registry, graph, request), reasons = [];
  if (!rec.ranked.length) {
    for (const b of rec.blocked) for (const x of b.blocked) reasons.push({code: x.code, id: b.id, with: x.with, reason: x.reason});
    if (!rec.blocked.length) {
      const pool = registry.kind(request.kind).list();
      reasons.push({code: 'P_RECOMMEND_NO_CANDIDATE', id: null, with: request.context ?? null, reason: pool.length
        ? `${request.context} 맥락용 ${request.kind} 재료가 없습니다(등록된 ${pool.length}개의 맥락: ${[...new Set(pool.flatMap(m => m.contexts))].sort().join(', ')})`
        : `${request.kind} 재료가 하나도 등록되지 않았습니다`});
    }
  }
  return {...rec, ok: rec.ranked.length > 0, reasons};
}
