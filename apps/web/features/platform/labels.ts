// 화면 문구. 재료 id 는 접두(`palette:`)를 떼어 읽고, 재료의 이름·이유는 Core 가 준 값을 쓴다. 여기 있는 것은 화면의 이름표뿐이다.
export const shortId = (id: string) => id.slice(id.indexOf(':') + 1);

/** 조립 목적(요청의 닫힌 값). context 는 재료 추천이 쓰는 맥락 이름이다. */
export const PURPOSES = [
  {id: 'saas-landing', label: 'SaaS 랜딩', context: 'landing', blurb: '제품을 소개하고 요금제를 보여 주는 첫 화면'},
  {id: 'work-dashboard', label: '업무 대시보드', context: 'dashboard', blurb: '지표, 차트, 표를 한 화면에 모은 업무 화면'},
  {id: 'editorial-docs', label: '에디토리얼·문서', context: 'docs', blurb: '긴 글과 문서를 읽기 좋게 보여 주는 화면'},
  {id: 'commerce', label: '커머스', context: 'commerce', blurb: '상품 목록과 구매 흐름의 화면'},
] as const;
export type PurposeId = (typeof PURPOSES)[number]['id'];
export const purposeOf = (id: string | null | undefined) => PURPOSES.find(p => p.id === id) ?? null;

export const MODE_LABEL = {light: '라이트', dark: '다크'} as const;
export type Mode = keyof typeof MODE_LABEL;
export const readMode = (v: string | string[] | undefined): Mode => ((Array.isArray(v) ? v[0] : v) === 'dark' ? 'dark' : 'light');
export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export const SEED_ROLES = [['brand', '브랜드'], ['accent', '보조'], ['neutral', '중립'], ['success', '성공'], ['warning', '경고'], ['danger', '위험'], ['info', '정보']] as const;
