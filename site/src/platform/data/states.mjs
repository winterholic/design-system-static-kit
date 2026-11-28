/**
 * 상태 패턴 프리셋(테마·기타 재료 작업 소유). empty·loading·error·success 네 상태마다 모양이 다른 완성 패턴을 2개씩 둔다.
 *
 * - 패턴은 `parts`(아이콘·제목·본문·스켈레톤·스피너·동작·세부·닫기)의 순서와 배치(layout)로 구별된다. 같은 상태의 두 패턴은 배치와 부분 구성이 모두 다르다.
 * - 알림 방식은 상태 성격을 따른다: error는 `role="alert"`(즉시 읽음), 나머지는 `role="status"`(정중하게 읽음). loading은 `aria-busy`와 보이지 않는 안내 글을 둔다.
 * - 움직임은 모션 프리셋이 낸다: 스켈레톤(`data-skeleton`)과 스피너(`data-spinner`)는 `[data-motion]` 안에서만 움직이고, 없거나 줄임 설정이면 멈춘 모양이다.
 * - 안쪽 여백은 간격 계약의 토큰(src/spacing.mjs)만 쓰고, 색은 색 역할 변수만 쓴다. 상태를 색으로만 알리지 않는다: 아이콘과 글이 함께 간다.
 */
import {RADIUS} from '../../styles/base.mjs';
import {SPACE} from '../../spacing.mjs';
import {COLOR_ROLES} from '../contract.mjs';
import {icon as renderIcon} from '../../render/icon.mjs';
import {icons} from '../../catalog/icons.mjs';
import {defineStyleMaterial, verifiedBy, validateStyleMaterialShape, pairErrors} from './surfaces.mjs';

export const STATE_KINDS = Object.freeze(['empty', 'loading', 'error', 'success']);
const PARTS = ['icon', 'title', 'body', 'skeleton', 'spinner', 'action', 'details', 'dismiss'];
const LAYOUTS = ['block', 'inline', 'banner', 'toast'];

const state = (id, label, extra) => defineStyleMaterial({id: `state-pattern:${id}`, kind: 'state-pattern', label, uses: {}, ...extra});

const EVIDENCE = ['tests/platform-style-materials.test.mjs:39'];

export const STATE_PATTERNS = Object.freeze([
  state('empty-illustrated', '일러스트형 빈 화면', {
    contexts: ['any'], tags: ['empty', 'block', 'friendly'], axes: {density: 'spacious'},
    state: 'empty', layout: 'block', role: 'status', live: 'polite', busy: false, icon: 'sparkles', tone: 'link', parts: ['icon', 'title', 'body', 'action'],
    pairs: [['link', 'soft', 3], ['text', 'surface', 4.5], ['muted', 'surface', 4.5], ['onAction', 'action', 4.5]], reuses: ['node:empty-state'],
  }),
  state('empty-inline', '한 줄 빈 안내', {
    contexts: ['dashboard', 'data', 'listing', 'settings', 'docs', 'community', 'general', 'form'], tags: ['empty', 'inline', 'dense'], axes: {density: 'compact'},
    state: 'empty', layout: 'inline', role: 'status', live: 'polite', busy: false, icon: 'info', tone: 'muted', parts: ['icon', 'body', 'action'],
    pairs: [['muted', 'surface', 4.5], ['link', 'surface', 4.5]], reuses: ['node:empty-state'],
  }),
  state('loading-skeleton', '스켈레톤 불러오기', {
    contexts: ['any'], tags: ['loading', 'block', 'layout-stable'], axes: {density: 'comfortable'},
    state: 'loading', layout: 'block', role: 'status', live: 'polite', busy: true, icon: '', tone: 'muted', parts: ['skeleton', 'body'],
    pairs: [['muted', 'surface', 4.5]], reuses: [],
  }),
  state('loading-spinner', '스피너와 진행 문구', {
    contexts: ['any'], tags: ['loading', 'inline', 'short-wait'], axes: {density: 'compact'},
    state: 'loading', layout: 'inline', role: 'status', live: 'polite', busy: true, icon: '', tone: 'muted', parts: ['spinner', 'body'],
    pairs: [['action', 'surface', 3], ['muted', 'surface', 4.5]], reuses: [],
  }),
  state('error-banner', '한 줄 오류 배너', {
    contexts: ['any'], tags: ['error', 'banner', 'recoverable'], axes: {density: 'compact'},
    state: 'error', layout: 'banner', role: 'alert', live: 'assertive', busy: false, icon: 'alert-circle', tone: 'danger', parts: ['icon', 'title', 'body', 'action'],
    pairs: [['danger', 'dangerSoft', 4.5], ['text', 'dangerSoft', 4.5], ['link', 'dangerSoft', 4.5]], reuses: ['node:notice'],
  }),
  state('error-panel', '세부를 펼치는 오류 패널', {
    contexts: ['any'], tags: ['error', 'block', 'diagnosable'], axes: {density: 'comfortable'},
    state: 'error', layout: 'block', role: 'alert', live: 'assertive', busy: false, icon: 'alert-triangle', tone: 'danger', parts: ['icon', 'title', 'body', 'details', 'action'],
    pairs: [['danger', 'surface', 4.5], ['text', 'surface', 4.5], ['muted', 'surface', 4.5], ['onAction', 'action', 4.5]], reuses: ['node:empty-state'],
  }),
  state('success-toast', '닫을 수 있는 성공 토스트', {
    contexts: ['any'], tags: ['success', 'toast', 'transient'], axes: {density: 'compact'},
    state: 'success', layout: 'toast', role: 'status', live: 'polite', busy: false, icon: 'check-circle', tone: 'success', parts: ['icon', 'title', 'body', 'dismiss'],
    pairs: [['success', 'surface', 4.5], ['text', 'surface', 4.5], ['muted', 'surface', 4.5]], reuses: [],
  }),
  state('success-confirmation', '다음 단계를 안내하는 완료 화면', {
    contexts: ['form', 'commerce', 'settings', 'auth', 'landing', 'listing', 'general', 'dashboard'], tags: ['success', 'block', 'next-step'], axes: {density: 'spacious'},
    state: 'success', layout: 'block', role: 'status', live: 'polite', busy: false, icon: 'check-circle', tone: 'success', parts: ['icon', 'title', 'body', 'action'],
    pairs: [['success', 'surface', 4.5], ['text', 'surface', 4.5], ['muted', 'surface', 4.5], ['onAction', 'action', 4.5]], reuses: ['node:empty-state'],
  }),
].map(verifiedBy(EVIDENCE)));

/** 상태 패턴 의미 검사: 상태·배치·부분 이름, 알림 방식이 상태와 맞고, 아이콘 이름이 실제 아이콘이다. */
export function validateStatePattern(m) {
  const out = [...validateStyleMaterialShape(m), ...pairErrors(m)];
  if (out.length) return out;
  const err = (code, path, message) => out.push({code, path, message});
  if (!STATE_KINDS.includes(m.state)) err('P_STATE_KIND', '$.state', `상태는 ${STATE_KINDS.join('·')}입니다`);
  if (!LAYOUTS.includes(m.layout)) err('P_STATE_LAYOUT', '$.layout', `배치는 ${LAYOUTS.join('·')}입니다`);
  for (const p of m.parts) if (!PARTS.includes(p)) err('P_STATE_PART', '$.parts', `모르는 부분: ${p}`);
  if (new Set(m.parts).size !== m.parts.length) err('P_STATE_PART', '$.parts', '부분이 중복됩니다');
  if (m.state === 'error' && m.role !== 'alert') err('P_STATE_ROLE', '$.role', 'error 패턴은 role="alert"입니다');
  if (m.state !== 'error' && m.role !== 'status') err('P_STATE_ROLE', '$.role', `${m.state} 패턴은 role="status"입니다`);
  if ((m.role === 'alert') !== (m.live === 'assertive')) err('P_STATE_LIVE', '$.live', 'alert는 assertive, status는 polite입니다');
  if (m.busy !== (m.state === 'loading')) err('P_STATE_BUSY', '$.busy', 'busy는 loading 패턴만 참입니다');
  if (m.state === 'loading' && !m.parts.some(p => p === 'skeleton' || p === 'spinner')) err('P_STATE_PART', '$.parts', 'loading 패턴에는 스켈레톤 또는 스피너가 필요합니다');
  if (m.parts.includes('icon') && !icons[m.icon]) err('P_STATE_ICON', '$.icon', `없는 아이콘: ${m.icon}`);
  if (m.parts.includes('title') && m.parts.includes('body') === false && m.state !== 'success') err('P_STATE_PART', '$.parts', '제목이 있으면 본문(원인·다음 행동)도 있어야 합니다');
  if (m.state === 'error' && !m.parts.includes('action')) err('P_STATE_ACTION', '$.parts', 'error 패턴에는 회복 동작이 필요합니다(retry)');
  if (!Object.hasOwn(COLOR_ROLES, m.tone)) err('P_STATE_TONE', '$.tone', `모르는 색 역할: ${m.tone}`);
  if (!['compact', 'comfortable', 'spacious'].includes(m.axes.density)) err('P_STATE_AXES', '$.axes.density', '밀도는 compact·comfortable·spacious입니다');
  return out;
}

const name = m => m.id.slice('state-pattern:'.length);
const tone = r => `var(${COLOR_ROLES[r]})`;
const hairline = '1px solid var(--kit-border)';

/** 상태 패턴 CSS. `[data-pattern="<이름>"]`에 범위를 둔다. */
export function stateCSS(m) {
  const sel = `[data-pattern="${name(m)}"]`, r = `${RADIUS.soft}px`;
  const shared = `${sel} :is(p,h3){margin:0}${sel} .kit-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`
    + `${sel} .kit-state-title{font-weight:var(--kit-hw,700);color:${tone('text')}}${sel} .kit-state-body{color:${tone('muted')};font-size:var(--kit-t-small)}${sel} .kit-icon{width:1.25em;height:1.25em;flex:none}${sel} .kit-icon path{fill:none;stroke:currentColor;stroke-width:var(--kit-icon-sw,2);stroke-linecap:round;stroke-linejoin:round}${sel} .kit-icon path.c{fill:none}`
    + `${sel} .kit-state-action{display:inline-flex;align-items:center;justify-content:center;min-height:var(--kit-control);padding:var(--kit-sp-near) var(--kit-sp-inset-s);border:1px solid ${tone('action')};border-radius:${r};background:${tone('action')};color:${tone('onAction')};font:inherit;font-weight:600;text-decoration:none;cursor:pointer}`;
  const box = extra => `${sel}{box-sizing:border-box;${extra}}`;
  const byPattern = {
    'empty-illustrated': box(`display:grid;justify-items:center;text-align:center;gap:var(--kit-sp-head);padding:var(--kit-sp-section-m) var(--kit-inset);background:${tone('surface')};border:1px dashed ${tone('rule')};border-radius:${r}`)
      + `${sel} .kit-state-icon{display:inline-grid;place-items:center;width:48px;height:48px;border-radius:999px;background:${tone('soft')};color:${tone(m.tone)}}${sel} .kit-state-icon .kit-icon{width:24px;height:24px}`,
    'empty-inline': box(`display:flex;align-items:center;flex-wrap:wrap;gap:var(--kit-sp-near);padding:var(--kit-sp-item) var(--kit-sp-inset-s);color:${tone('muted')};border-bottom:${hairline}`)
      + `${sel} .kit-state-action{min-height:0;padding:0;border:0;background:transparent;color:${tone('link')};text-decoration:underline;text-underline-offset:4px;font-weight:600}`,
    'loading-skeleton': box(`display:grid;gap:var(--kit-sp-item);padding:var(--kit-inset);background:${tone('surface')};border:${hairline};border-radius:${r}`)
      + `${sel} [data-skeleton]{display:block;height:16px;border-radius:${RADIUS.subtle}px;background:linear-gradient(90deg,${tone('soft')} 25%,${tone('sunken')} 50%,${tone('soft')} 75%)}${sel} [data-skeleton]:nth-child(2){width:80%}${sel} [data-skeleton]:nth-child(3){width:56%}`,
    'loading-spinner': box(`display:inline-flex;align-items:center;gap:var(--kit-sp-near);padding:var(--kit-sp-near) 0`)
      + `${sel} [data-spinner]{display:inline-block;width:16px;height:16px;border-radius:999px;border:2px solid ${tone('rule')};border-top-color:${tone('action')}}`,
    'error-banner': box(`display:flex;align-items:flex-start;flex-wrap:wrap;gap:var(--kit-sp-item);padding:var(--kit-sp-item) var(--kit-sp-inset-s);background:${tone('dangerSoft')};border:1px solid ${tone(m.tone)};border-radius:${r};color:${tone('text')}`)
      + `${sel} .kit-state-icon{color:${tone(m.tone)};display:inline-flex}${sel} .kit-state-text{display:grid;gap:var(--kit-sp-tight);flex:1 1 240px}${sel} .kit-state-body{color:${tone('text')}}${sel} .kit-state-action{min-height:0;padding:var(--kit-sp-near) var(--kit-sp-inset-s);background:transparent;color:${tone('link')};border-color:${tone('link')}}`,
    'error-panel': box(`display:grid;gap:var(--kit-sp-head);padding:var(--kit-inset);background:${tone('surface')};border:1px solid ${tone(m.tone)};border-radius:${r}`)
      + `${sel} .kit-state-icon{color:${tone(m.tone)};display:inline-flex}${sel} .kit-state-head{display:flex;align-items:center;gap:var(--kit-sp-near)}${sel} details{border-top:${hairline};padding-top:var(--kit-sp-near)}${sel} summary{cursor:pointer;color:${tone('link')};font-weight:600}${sel} code{display:block;margin-top:var(--kit-sp-near);padding:var(--kit-sp-near) var(--kit-sp-item);background:${tone('soft')};border-radius:${RADIUS.subtle}px;font-family:var(--kit-mono,monospace);font-size:var(--kit-t-small);color:${tone('text')};overflow-wrap:anywhere}`,
    'success-toast': box(`display:flex;align-items:flex-start;gap:var(--kit-sp-item);padding:var(--kit-sp-item) var(--kit-sp-inset-s);background:${tone('surface')};border:${hairline};border-left:4px solid ${tone(m.tone)};border-radius:${r};box-shadow:0 2px 4px var(--kit-shade),0 12px 24px -10px var(--kit-shade)`)
      + `${sel} .kit-state-icon{color:${tone(m.tone)};display:inline-flex}${sel} .kit-state-text{display:grid;gap:var(--kit-sp-tight);flex:1}${sel} .kit-state-dismiss{border:0;background:transparent;color:${tone('muted')};min-height:var(--kit-control);min-width:var(--kit-control);font:inherit;cursor:pointer}`,
    'success-confirmation': box(`display:grid;justify-items:center;text-align:center;gap:var(--kit-sp-head);padding:var(--kit-sp-section-m) var(--kit-inset);background:${tone('surface')};border:1px solid ${tone(m.tone)};border-radius:${r}`)
      + `${sel} .kit-state-icon{display:inline-grid;place-items:center;width:48px;height:48px;color:${tone(m.tone)}}${sel} .kit-state-icon .kit-icon{width:40px;height:40px}`,
  };
  const scale = SPACE[m.axes.density];
  const sized = `${byPattern[name(m)]}\n${shared}`.replace(/var\(--kit-sp-(tight|near|item|head|inset-s|section-m)\)|var\(--kit-inset\)/g, token => {
    const key = {'--kit-sp-tight': 'tight', '--kit-sp-near': 'near', '--kit-sp-item': 'item', '--kit-sp-head': 'head', '--kit-sp-inset-s': 'insetS', '--kit-sp-section-m': 'sectionM', '--kit-inset': 'inset'}[token.slice(4, -1)];
    return `${scale[key]}px`;
  });
  return sized;
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SAFE_HREF = /^(#|\/(?!\/)|\.\/|https:\/\/|mailto:)/;
const DEFAULT_TEXT = {
  empty: {title: '아직 표시할 내용이 없습니다', body: '조건을 바꾸거나 새로 만들어 보세요.'},
  loading: {title: '불러오는 중', body: '잠시만 기다려 주세요.'},
  error: {title: '불러오지 못했습니다', body: '네트워크를 확인한 뒤 다시 시도하세요.'},
  success: {title: '저장했습니다', body: '변경 내용이 반영됐습니다.'},
};

/**
 * 상태 패턴 마크업. input: {title?, body?, action?: {label, href?}, details?: 참조 코드 같은 세부 문자열, level?: 제목 수준(block 배치만, 기본 3)}.
 * 모든 글은 이스케이프한다. href는 #, 같은 출처 경로, https:, mailto:만 받는다.
 */
export function renderState(m, {title, body, action, details, level = 3} = {}) {
  const text = DEFAULT_TEXT[m.state], t = escapeHTML(title ?? text.title), b = escapeHTML(body ?? text.body);
  if (action !== undefined && (typeof action?.label !== 'string' || !action.label.trim() || (action.href !== undefined && !SAFE_HREF.test(action.href)))) throw new RangeError('action은 {label, href?}이고 href는 #, 같은 출처 경로, https:, mailto:만 받습니다');
  if (!Number.isInteger(level) || level < 2 || level > 6) throw new RangeError('level은 2~6입니다');
  const heading = m.layout === 'block' ? `<h${level} class="kit-state-title">${t}</h${level}>` : `<p class="kit-state-title">${t}</p>`;
  const actionHTML = action ? (action.href !== undefined ? `<a class="kit-state-action" href="${escapeHTML(action.href)}">${escapeHTML(action.label)}</a>` : `<button type="button" class="kit-state-action">${escapeHTML(action.label)}</button>`) : '';
  const iconHTML = `<span class="kit-state-icon" aria-hidden="true">${m.icon ? renderIcon(m.icon) : ''}</span>`;
  const textBlock = m.layout === 'banner' || m.layout === 'toast';
  const part = {
    icon: iconHTML, title: textBlock ? '' : heading, body: textBlock ? '' : `<p class="kit-state-body">${b}</p>`,
    skeleton: '<span data-skeleton aria-hidden="true"></span><span data-skeleton aria-hidden="true"></span><span data-skeleton aria-hidden="true"></span>',
    spinner: '<span data-spinner aria-hidden="true"></span>',
    action: actionHTML,
    details: details === undefined ? '' : `<details><summary>자세히 보기</summary><code>${escapeHTML(details)}</code></details>`,
    dismiss: '<button type="button" class="kit-state-dismiss" aria-label="닫기">×</button>',
  };
  let inner = m.parts.map(p => part[p]).join('');
  if (textBlock) inner = [part.icon, `<span class="kit-state-text">${m.parts.includes('title') ? heading : ''}${m.parts.includes('body') ? `<span class="kit-state-body">${b}</span>` : ''}${m.parts.includes('action') ? actionHTML : ''}</span>`, m.parts.includes('dismiss') ? part.dismiss : ''].join('');
  else if (m.layout === 'block' && m.state === 'error') inner = `<span class="kit-state-head">${part.icon}${heading}</span>${part.body}${part.details}${part.action}`;
  if (m.busy) inner += `<span class="kit-sr">${t}</span>`;
  return `<section class="kit-state" data-pattern="${name(m)}" data-state="${m.state}" role="${m.role}" aria-live="${m.live}"${m.busy ? ' aria-busy="true"' : ''}>${inner}</section>`;
}
