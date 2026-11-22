/**
 * 배경·장식 프리셋(테마·기타 재료 작업 소유). 페이지 바탕(backdrop)과 그 위의 장식(ornament)을 한 묶음으로 둔다.
 *
 * - 바탕과 장식은 색 역할 변수와 `color-mix`만 쓴다. 팔레트 원색이나 hex를 직접 적지 않는다.
 * - 장식은 `.kit-deco` 한 요소에 그린다: 콘텐츠 뒤(z-index:-1), 포인터를 받지 않고(pointer-events:none), 읽는 도구에는 숨긴다(aria-hidden).
 *   그래서 장식은 의미를 담지 못하고, 글자 대비는 바탕이 낼 수 있는 가장 어두운·밝은 지점(stops)으로 잰다.
 * - 기존 축 `backdrop`(plain·tint·gradient·grid)과 `ornament`(none·geometric·organic·lines·dots)의 값을 `axes`로 구현한다.
 *   기존 BACKDROP 표의 gradient는 플랫폼 색 역할에 없는 `--kit-accentSoft`를 읽는다. 여기서는 `accent`를 `color-mix`로 옅게 만들어 쓴다.
 */
import {axes} from '../../catalog/axes.mjs';
import {COLOR_ROLES} from '../contract.mjs';
import {defineStyleMaterial, verifiedBy, validateStyleMaterialShape, pairErrors} from './surfaces.mjs';

const mix = (role, pct, base = 'transparent') => `color-mix(in srgb,var(${COLOR_ROLES[role]}) ${pct}%,${base === 'transparent' ? 'transparent' : `var(${COLOR_ROLES[base]})`})`;

const EVIDENCE = ['tests/platform-style-materials.test.mjs:36', 'tests/platform-style-materials.test.mjs:53', 'tests/platform-style-materials.test.mjs:86'];

export const BACKGROUNDS = Object.freeze([
  defineStyleMaterial({
    id: 'background:plain-canvas', kind: 'background', label: '단색 바탕', contexts: ['any'], tags: ['plain', 'work', 'read'],
    axes: {backdrop: 'plain', ornament: 'none'}, uses: {backdrop: ['plain'], ornament: ['none']},
    page: {background: `var(${COLOR_ROLES.canvas})`}, deco: {kind: 'none', css: ''}, stops: ['canvas'],
    pairs: [['text', 'canvas', 7], ['muted', 'canvas', 4.5]], reuses: ['axis:backdrop', 'axis:ornament'],
  }),
  defineStyleMaterial({
    id: 'background:brand-tint-dots', kind: 'background', label: '브랜드 틴트와 점 무늬', contexts: ['landing', 'commerce', 'blog', 'community', 'listing', 'portfolio', 'pricing', 'form', 'general'], tags: ['tint', 'dots', 'friendly'],
    axes: {backdrop: 'tint', ornament: 'dots'}, uses: {backdrop: ['tint'], ornament: ['dots']},
    page: {background: `var(${COLOR_ROLES.soft})`},
    deco: {kind: 'dots', css: `background:radial-gradient(circle,${mix('action', 12)} 2px,transparent 2.1px) 0 0/24px 24px;-webkit-mask-image:linear-gradient(180deg,black 0%,transparent 60%);mask-image:linear-gradient(180deg,black 0%,transparent 60%)`},
    stops: ['soft', ['action', 12, 'soft']],
    pairs: [['text', 'soft', 7], ['muted', 'soft', 4.5]], reuses: ['axis:backdrop', 'axis:ornament'],
  }),
  defineStyleMaterial({
    id: 'background:soft-gradient-organic', kind: 'background', label: '부드러운 그라데이션과 유기적 형태', contexts: ['landing', 'pricing', 'commerce', 'portfolio', 'blog', 'form', 'general', 'listing'], tags: ['gradient', 'organic', 'soft'],
    axes: {backdrop: 'gradient', ornament: 'organic'}, uses: {backdrop: ['gradient'], ornament: ['organic']},
    page: {background: `linear-gradient(180deg,var(${COLOR_ROLES.canvas}) 0%,var(${COLOR_ROLES.soft}) 60%,${mix('accent', 14, 'canvas')} 100%)`},
    deco: {kind: 'blobs', css: `background:radial-gradient(60% 50% at 15% 20%,${mix('accent', 18)},transparent 70%),radial-gradient(50% 40% at 85% 75%,${mix('action', 14)},transparent 70%)`},
    stops: ['canvas', 'soft', ['accent', 14, 'canvas'], ['accent', 18, 'canvas']],
    pairs: [['text', 'canvas', 7], ['text', 'soft', 7]], reuses: ['axis:backdrop', 'axis:ornament'],
  }),
  defineStyleMaterial({
    id: 'background:blueprint-grid-lines', kind: 'background', label: '격자와 선 패턴', contexts: ['dashboard', 'data', 'docs', 'portfolio', 'landing', 'general'], tags: ['grid', 'lines', 'structure'],
    axes: {backdrop: 'grid', ornament: 'lines'}, uses: {backdrop: ['grid'], ornament: ['lines']},
    page: {background: `linear-gradient(${mix('border', 45)} 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,${mix('border', 45)} 1px,transparent 1px) 0 0/32px 32px,var(${COLOR_ROLES.canvas})`},
    deco: {kind: 'lines', css: `background:repeating-linear-gradient(0deg,${mix('rule', 24)} 0 1px,transparent 1px 12px);-webkit-mask-image:linear-gradient(0deg,black 0%,transparent 40%);mask-image:linear-gradient(0deg,black 0%,transparent 40%)`},
    stops: ['canvas', ['border', 45, 'canvas'], ['rule', 24, 'canvas']],
    pairs: [['text', 'canvas', 7], ['muted', 'canvas', 4.5]], reuses: ['axis:backdrop', 'axis:ornament'],
  }),
  defineStyleMaterial({
    id: 'background:aurora-glow-geometric', kind: 'background', label: '오로라 글로우와 기하 도형', contexts: ['landing', 'pricing', 'portfolio', 'dashboard', 'community', 'listing', 'general'], tags: ['gradient', 'glow', 'geometric', 'dark'],
    axes: {backdrop: 'gradient', ornament: 'geometric'}, uses: {backdrop: ['gradient'], ornament: ['geometric']},
    page: {background: `radial-gradient(80% 60% at 20% 0%,${mix('action', 20)},transparent 70%),radial-gradient(60% 50% at 90% 10%,${mix('accent', 16)},transparent 70%),var(${COLOR_ROLES.canvas})`},
    deco: {kind: 'rings', css: `background:repeating-radial-gradient(circle at 85% 12%,transparent 0 56px,${mix('action', 30)} 56px 57px);-webkit-mask-image:radial-gradient(circle at 85% 12%,black 0%,transparent 55%);mask-image:radial-gradient(circle at 85% 12%,black 0%,transparent 55%)`},
    stops: ['canvas', ['action', 20, 'canvas'], ['accent', 16, 'canvas']],
    pairs: [['text', 'canvas', 7], ['muted', 'canvas', 4.5]], reuses: ['axis:backdrop', 'axis:ornament'],
  }),
].map(verifiedBy(EVIDENCE)));

/** 배경 프리셋 의미 검사: 축 값이 기존 축 안이고, 장식 종류와 ornament 축이 맞고, stops가 역할 이름이거나 {mix}다. */
export function validateBackground(m) {
  const out = [...validateStyleMaterialShape(m), ...pairErrors(m)];
  if (out.length) return out;
  const err = (code, path, message) => out.push({code, path, message});
  if (!axes.backdrop.includes(m.axes.backdrop)) err('P_BG_AXIS', '$.axes.backdrop', `기존 backdrop 축 값이 아닙니다: ${m.axes.backdrop}`);
  if (!axes.ornament.includes(m.axes.ornament)) err('P_BG_AXIS', '$.axes.ornament', `기존 ornament 축 값이 아닙니다: ${m.axes.ornament}`);
  if ((m.axes.ornament === 'none') !== (m.deco.kind === 'none')) err('P_BG_DECO', '$.deco.kind', 'ornament none과 장식 없음(deco.kind none)은 함께여야 합니다');
  if (typeof m.page.background !== 'string' || !m.page.background) err('P_BG_PAGE', '$.page.background', '바탕 CSS가 필요합니다');
  if (/#[0-9a-f]{3,8}\b/i.test(m.page.background + m.deco.css)) err('P_BG_HEX', '$.page', 'hex 색을 직접 쓰지 않습니다(색 역할 변수와 color-mix만)');
  m.stops.forEach((s, i) => {
    const ok = typeof s === 'string' ? Object.hasOwn(COLOR_ROLES, s) : Array.isArray(s) && s.length === 3 && Object.hasOwn(COLOR_ROLES, s[0]) && typeof s[1] === 'number' && Object.hasOwn(COLOR_ROLES, s[2]);
    if (!ok) err('P_BG_STOP', `$.stops[${i}]`, 'stop은 역할 이름이거나 [역할, 퍼센트, 바탕 역할]입니다');
  });
  return out;
}

const name = m => m.id.slice('background:'.length);

/** stops 하나를 결합된 색 역할 값(roles: {역할: '#RRGGBB'})으로 계산한다. `color-mix(in srgb)`와 같게 채널별 선형 섞기. */
export function stopColor(stop, roles) {
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [role, pct, baseRole] = typeof stop === 'string' ? [stop, 100, stop] : stop;
  const a = rgb(roles[role]), b = rgb(roles[baseRole]);
  return '#' + a.map((v, i) => Math.round(v * pct / 100 + b[i] * (1 - pct / 100)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** 배경 프리셋 CSS. 바탕은 `[data-bg]` 요소에, 장식은 그 안의 `.kit-deco`에 둔다. */
export function backgroundCSS(m) {
  const sel = `[data-bg="${name(m)}"]`;
  const rules = [`${sel}{background:${m.page.background};position:relative;isolation:isolate}`];
  if (m.deco.kind !== 'none') rules.push(`${sel}>.kit-deco{position:absolute;inset:0;z-index:-1;pointer-events:none;${m.deco.css}}`);
  rules.push(`${sel}>.kit-bg-content{padding:var(--kit-sp-inset-l)}${sel}>.kit-bg-content :is(h3,p){margin:0}${sel}>.kit-bg-content h3+p{margin-top:var(--kit-sp-near)}`);
  return rules.join('\n');
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** 배경 프리셋 마크업. 장식 요소는 aria-hidden이고 내용은 장식 위에 놓인다. */
export function renderBackgroundSample(m, {title = '배경', body = '바탕과 장식은 글자 대비를 해치지 않습니다.'} = {}) {
  return `<div class="kit-bg-demo" data-bg="${name(m)}">${m.deco.kind === 'none' ? '' : '<span class="kit-deco" aria-hidden="true"></span>'}<div class="kit-bg-content"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(body)}</p></div></div>`;
}
