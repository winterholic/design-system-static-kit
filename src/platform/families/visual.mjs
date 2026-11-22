/**
 * 시각 언어 측정값(컴포넌트 패밀리 작업 소유). 목적 패밀리(구조)와 시각 패밀리(`family:*`)는 독립 축이다.
 * 플랫폼 `family` 재료는 모양(shape)과 구성원 고정 축만 소유하므로(contract.mjs KIND_SPECS), 목적 패밀리가 읽는 나머지 시각 값은 여기에 둔다.
 * 계약에 필드를 더하기 전까지의 확장 자리다(보고서의 요청 항목). 색과 서체는 소유하지 않는다: 값은 모두 var(--kit-*) 참조다.
 *
 *   metrics  숫자로 비교하는 값. 목적 패밀리의 `needs.visual`이 이 값을 읽어 조합을 거부한다.
 *   vars     `[data-family="<key>"]` 범위에 놓이는 CSS 변수(--pf-*). 목적 패밀리 CSS가 읽는다.
 *   recipe   목적 패밀리가 기반 컴포넌트의 열린 축을 고르는 값(강조 단계별 버튼 외형 등).
 */

export const VISUAL_LANGUAGES = Object.freeze({
  'family:quiet': Object.freeze({
    key: 'quiet', summary: '외곽선과 여백으로 구획한다. 장식이 적고 정보 밀도가 높은 업무 화면용.',
    metrics: Object.freeze({cellPadY: 8, borderW: 1, opaqueSurface: true, labelCase: 'none'}),
    vars: Object.freeze({'--pf-pad': 'var(--kit-sp-item)', '--pf-gap': 'var(--kit-sp-near)', '--pf-border': '1px solid var(--kit-border)', '--pf-surface': 'var(--kit-surface)', '--pf-title-weight': '650', '--pf-label-case': 'none', '--pf-label-track': '0', '--pf-stat-scale': '1', '--pf-cell-pad': 'var(--kit-sp-near)', '--pf-rule': '1px solid var(--kit-border)', '--pf-accent-bar': '0px'}),
    recipe: Object.freeze({primary: 'solid', secondary: 'outline', emphasis: 'solid', tertiary: 'ghost'}),
  }),
  'family:soft': Object.freeze({
    key: 'soft', summary: '채운 면과 큰 모서리로 구획한다. 선이 거의 없어 부드럽고 친근한 화면용.',
    metrics: Object.freeze({cellPadY: 12, borderW: 0, opaqueSurface: true, labelCase: 'none'}),
    vars: Object.freeze({'--pf-pad': 'var(--kit-sp-inset-s)', '--pf-gap': 'var(--kit-sp-item)', '--pf-border': '0 solid transparent', '--pf-surface': 'var(--kit-card-hover)', '--pf-title-weight': '700', '--pf-label-case': 'none', '--pf-label-track': '0', '--pf-stat-scale': '1.1', '--pf-cell-pad': 'var(--kit-sp-item)', '--pf-rule': '0 solid transparent', '--pf-accent-bar': '0px'}),
    recipe: Object.freeze({primary: 'solid', secondary: 'soft', emphasis: 'solid', tertiary: 'ghost'}),
  }),
  'family:bold': Object.freeze({
    key: 'bold', summary: '굵은 선과 각진 모서리, 딱딱한 그림자로 구획한다. 강한 대비와 큰 숫자가 필요한 화면용.',
    metrics: Object.freeze({cellPadY: 8, borderW: 2, opaqueSurface: true, labelCase: 'uppercase'}),
    vars: Object.freeze({'--pf-pad': 'var(--kit-sp-item)', '--pf-gap': 'var(--kit-sp-near)', '--pf-border': '2px solid var(--kit-text)', '--pf-surface': 'var(--kit-surface)', '--pf-title-weight': '800', '--pf-label-case': 'uppercase', '--pf-label-track': '.06em', '--pf-stat-scale': '1.25', '--pf-cell-pad': 'var(--kit-sp-near)', '--pf-rule': '2px solid var(--kit-text)', '--pf-accent-bar': '6px'}),
    recipe: Object.freeze({primary: 'solid', secondary: 'outline', emphasis: 'solid', tertiary: 'ghost'}),
  }),
  'family:editorial': Object.freeze({
    key: 'editorial', summary: '상자 대신 가는 선과 넓은 여백으로 구획한다. 읽기 중심 화면과 큰 제목용.',
    metrics: Object.freeze({cellPadY: 12, borderW: 0, opaqueSurface: false, labelCase: 'uppercase'}),
    vars: Object.freeze({'--pf-pad': 'var(--kit-sp-inset-s)', '--pf-gap': 'var(--kit-sp-item)', '--pf-border': '0 solid transparent', '--pf-surface': 'transparent', '--pf-title-weight': '700', '--pf-label-case': 'uppercase', '--pf-label-track': '.08em', '--pf-stat-scale': '1.2', '--pf-cell-pad': 'var(--kit-sp-item)', '--pf-rule': '1px solid var(--kit-text)', '--pf-accent-bar': '0px'}),
    recipe: Object.freeze({primary: 'solid', secondary: 'outline', emphasis: 'solid', tertiary: 'link'}),
  }),
});

export const VISUAL_KEYS = Object.freeze(Object.values(VISUAL_LANGUAGES).map(v => v.key));
export const visualOf = familyId => VISUAL_LANGUAGES[familyId] ?? null;
/** 목적 패밀리가 요구하는 시각 값(needs.visual)과 시각 언어 측정값을 견준다. 어긋나면 이유를 돌려준다. */
export function visualMismatch(needs = {}, language) {
  const out = [];
  const m = language.metrics;
  if (needs.maxCellPadY !== undefined && m.cellPadY > needs.maxCellPadY) out.push(`셀 상하 패딩 ${m.cellPadY}px가 이 패밀리의 상한 ${needs.maxCellPadY}px를 넘는다`);
  if (needs.opaqueSurface && !m.opaqueSurface) out.push('면이 투명하다(본문 위에 겹쳐 고정되는 요소는 불투명한 면이 필요하다)');
  if (needs.minBorderW !== undefined && m.borderW < needs.minBorderW) out.push(`테두리 ${m.borderW}px가 이 패밀리의 하한 ${needs.minBorderW}px에 못 미친다`);
  return out;
}
