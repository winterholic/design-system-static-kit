/**
 * 목적 패밀리 증거 페이지 생성(컴포넌트 패밀리 작업 소유). 묶음(group) × 시각 패밀리 × 모드마다 한 페이지를 조립 경로(assembleFamilies)로 만든다.
 * 측정(measure.mjs)과 스크린샷이 같은 HTML을 쓴다. 페이지 CSS는 조립 결과(value.css)에 격자 배치 한 줄만 더한다.
 */
import {createPlatform} from '../../src/platform/index.mjs';
import {PURPOSE_FAMILIES, assembleFamilies, PURPOSE_GROUPS, checkPurposeCombination, getPurposeFamily} from '../../src/platform/families/index.mjs';
import {buttonRuntime} from '../../src/materials/button.mjs';
import {inputRuntime} from '../../src/materials/input.mjs';
import {cardRuntime} from '../../src/materials/card.mjs';
import {navigationRuntime} from '../../src/materials/navigation.mjs';
import {tabsRuntime} from '../../src/materials/tabs.mjs';
import {modalRuntime} from '../../src/materials/modal.mjs';
import {feedbackRuntime} from '../../src/materials/feedback.mjs';
import {tableRuntime} from '../../src/materials/table.mjs';
import {selectRuntime} from '../../src/materials/select.mjs';

export const VISUALS = ['family:quiet', 'family:soft', 'family:bold', 'family:editorial'];
export const GROUPS = PURPOSE_GROUPS;

/** 높이·숫자·크기 불균형이 생기기 쉬운 입력을 더한다(짧은 값, 아주 긴 값, 가로 배치). 패밀리 예시 외의 추가 항목이다. */
const STRESS = {
  card: [
    {purpose: 'purpose:card.kpi', variant: {layout: 'stacked', trend: 'none'}, content: {label: '신규 가입', value: '3', caption: '오늘'}},
    {purpose: 'purpose:card.kpi', variant: {layout: 'stacked', trend: 'none'}, content: {label: '누적 결제액', value: '1,284,330,000', unit: '원', delta: '-2.1%', deltaDirection: 'down', caption: '전주 대비'}},
    {purpose: 'purpose:card.kpi', variant: {layout: 'inline', trend: 'none'}, content: {label: '가동률', value: '99.98%', delta: '+0.02%p', deltaDirection: 'up'}},
    {purpose: 'purpose:card.product', variant: {layout: 'horizontal', cta: 'none'}, props: {behavior: 'link'}, content: {title: '아주 긴 이름을 가진 상품 이름이 두 줄 이상으로 이어지는 경우의 카드', price: '₩1,289,000', mediaIcon: 'bag', href: '#p2'}},
    {purpose: 'purpose:card.product', variant: {layout: 'vertical', cta: 'button'}, props: {behavior: 'static'}, content: {title: '텀블러', price: '₩24,000', mediaIcon: 'coffee', ctaLabel: '담기'}},
    {purpose: 'purpose:card.pricing', variant: {emphasis: 'standard'}, content: {plan: '개인', price: '₩9,000', period: '월', description: '혼자 쓰는 작은 프로젝트', features: ['프로젝트 3개', '변경 이력 7일'], ctaLabel: '시작하기'}},
    {purpose: 'purpose:card.pricing', variant: {emphasis: 'standard'}, content: {plan: '엔터프라이즈', price: '문의', description: '조직 전체를 위한 맞춤 구성과 전담 지원', features: ['무제한 프로젝트', '역할 기반 권한', '감사 로그 1년', '전담 지원', 'SSO'], ctaLabel: '영업팀 문의'}},
  ],
  button: [
    {purpose: 'purpose:button.primary', variant: {layout: 'stack', align: 'start'}, props: {size: 'large'}, content: {label: '다음 단계로', secondaryLabel: '이전'}},
    {purpose: 'purpose:button.secondary', variant: {layout: 'row', tier: 'tertiary'}, content: {items: [{label: '초기화', icon: 'refresh'}, {label: '자세히', icon: 'arrow-right'}]}},
    {purpose: 'purpose:button.primary', variant: {layout: 'pair', align: 'start'}, props: {size: 'small'}, content: {label: '적용', secondaryLabel: '취소'}},
  ],
};

/** 기반 컴포넌트가 문자열로 직렬화해 두는 attach* 런타임을 그대로 붙인다(새 스크립트를 만들지 않는다). 상호작용 시험용이다. */
export const RUNTIME_SCRIPT = `<script>${[buttonRuntime, inputRuntime, cardRuntime, navigationRuntime, tabsRuntime, modalRuntime, feedbackRuntime, tableRuntime, selectRuntime].join(';')};
const wire = (sel, fn) => document.querySelectorAll(sel).forEach(el => { try { fn(el); } catch (e) { el.dataset.wireError = e.message; } });
wire('[data-ctl=button]', attachButton); wire('[data-ctl=input]', attachInput); wire('[data-ctl=card]', attachCard); wire('[data-ctl=navigation]', attachNavigation);
wire('[data-ctl=tabs]', attachTabs); wire('[data-ctl=modal]', attachModal); wire('[data-ctl=feedback]', attachFeedback); wire('.kit-data-table', attachTable); wire('.kit-select', attachSelect);
</script>`;

export function groupItems(group) {
  const base = PURPOSE_FAMILIES.filter(f => f.group === group).map(f => ({purpose: f.id, variant: f.example.variant, props: f.example.props, content: f.example.content}));
  return [...base, ...(STRESS[group] ?? [])];
}

const LAYOUT = {
  card: '.kit-platform{grid-template-columns:repeat(auto-fill,minmax(min(100%,17.5rem),1fr));align-items:stretch}',
  button: '.kit-platform{grid-template-columns:repeat(auto-fill,minmax(min(100%,16rem),1fr));align-items:stretch}.pf{padding:var(--kit-sp-item);border:1px dashed var(--kit-border)}',
  navigation: '.kit-platform{grid-template-columns:minmax(0,1fr)}.pf{padding:var(--kit-sp-near);border:1px dashed var(--kit-border)}',
  form: '.kit-platform{grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr));align-items:start}.pf{padding:var(--kit-sp-near);border:1px dashed var(--kit-border)}',
  table: '.kit-platform{grid-template-columns:minmax(0,1fr)}.pf{padding:var(--kit-sp-near);border:1px dashed var(--kit-border)}',
  feedback: '.kit-platform{grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr));align-items:start}.pf{padding:var(--kit-sp-near);border:1px dashed var(--kit-border)}',
};

/** 한 페이지. 반환 {ok, html, diagnostics, manifest}. 실패하면 html은 null. */
export function buildPage(env, group, visual, {mode = 'light', runtime = false, items: given = null} = {}) {
  // 패밀리 단위로 거부되는 조합(예: 고밀도 표 × soft)은 그 시각 패밀리의 페이지에서 뺀다. 빠진 목록은 excluded로 돌려준다.
  const wanted = given ?? groupItems(group);
  const excluded = wanted.filter(it => !checkPurposeCombination(getPurposeFamily(it.purpose), {visual, variant: it.variant, props: it.props, content: it.content}).ok).map(it => it.purpose);
  const items = wanted.filter(it => !excluded.includes(it.purpose)).map((it, i) => ({id: `${it.purpose.slice('purpose:'.length).replace('.', '-')}-${i}`, ...it, visual}));
  const r = assembleFamilies(env, {context: 'dashboard', mode, density: 'comfortable', items});
  if (!r.ok) return {ok: false, html: null, diagnostics: r.diagnostics, items};
  const css = `${r.value.css}\n${LAYOUT[group]}\nbody{margin:0}main{max-width:1280px;margin:0 auto}@media(max-width:640px){.pf{padding:var(--kit-sp-tight)}}`;
  const html = `<!doctype html><html lang="ko" data-mode="${mode}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${group} · ${visual}</title><style>${css}</style></head><body><main>${r.value.html}</main>${runtime ? RUNTIME_SCRIPT : ''}</body></html>`;
  return {ok: true, html, diagnostics: [], manifest: r.value.manifest, items, excluded};
}

export const makeEnv = () => createPlatform();
