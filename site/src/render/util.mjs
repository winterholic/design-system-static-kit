import {icons} from '../catalog.mjs';
import {FLOW} from '../layout.mjs';

export const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const e = escapeHTML;

/** Icon markup is style-agnostic; the `icon` axis only changes CSS variables (stroke width, caps, fill). */
export function icon(name, extra = '') {
  const shapes = icons[name];
  if (!shapes) throw new Error('Unknown icon: ' + name);
  return `<svg class="kit-icon${extra ? ' ' + extra : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${shapes.map(d => `<path${d.endsWith('Z') ? ' class="c"' : ''} d="${d}"/>`).join('')}</svg>`;
}

/** Author anchors (`#features`) point at section ids (`s-features`); `#main` and https links pass through. */
export const href = h => e(/^#[a-z]/.test(h) && h !== '#main' ? '#s-' + h.slice(1) : h);
export const button = a => `<a class="kit-button" data-variant="${a.variant}" href="${href(a.href)}"${a.href.startsWith('https:') ? ' rel="noreferrer noopener"' : ''}>${e(a.label)}</a>`;
export const initials = name => [...name.trim()][0] ?? '?';
export const num = (n, digits = 2) => String(Math.round(n * 10 ** digits) / 10 ** digits);

/** Status words → dot tone. Text color never changes (stays on the audited text tokens); only a 7px dot carries the tone. */
const DOT_WORDS = [['danger', /취소|실패|오류|거절|반려|중단|지연|차단|환불/], ['success', /완료|성공|승인|정상|활성|도착|결제 ?완료/], ['warning', /대기|검토|예정|보류|확인 ?중|준비/], ['info', /진행|배송 ?중|처리 ?중|발송|운영/]];
export const statusDot = text => DOT_WORDS.find(([, re]) => re.test(text))?.[0] ?? null;
export const STATUS_HEADER = /^(상태|status|진행 ?상태|결과)$/i;

export const stateMessages = {
  loading: ['불러오는 중입니다.', '잠시만 기다려 주세요.'],
  empty: ['아직 항목이 없습니다.', '새 항목을 추가하면 여기에 표시됩니다.'],
  error: ['불러오지 못했습니다.', '연결 상태를 확인한 후 다시 시도해 주세요.'],
  partial: ['일부 항목만 표시합니다.', '나머지 데이터는 현재 사용할 수 없습니다.'],
  forbidden: ['접근 권한이 없습니다.', '워크스페이스 관리자에게 권한을 요청하세요.'],
};
export function stateMarkup(state) {
  const m = stateMessages[state];
  return m ? `<div class="kit-state" data-state="${state}" role="${state === 'error' ? 'alert' : 'status'}"${state === 'loading' ? ' aria-busy="true"' : ''}><strong>${m[0]}</strong><p>${m[1]}</p></div>` : '';
}

/**
 * 제목이 들어갈 칸에 맞는 글자 크기를 정하기 위한 "한 줄 글자 수" 구간.
 * 한글·한자는 한 글자가 1em에 가깝고 영문·숫자는 절반 남짓이라, 길이를 글자 수가 아니라 폭 가중치로 센다.
 * 줄바꿈(\n)이 있으면 가장 긴 줄이 한 줄에 들어가야 하고, 없으면 두 줄로 균형 있게 나뉜다고 보고 절반(여유 12%)을 기준으로 한다.
 */
export const CPL_BUCKETS = [5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 23, 26, 30];
const weightOf = ch => /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\u4e00-\u9fff\u3040-\u30ff]/.test(ch) ? 1 : /[A-Z]/.test(ch) ? .72 : /[a-z]/.test(ch) ? .58 : /\d/.test(ch) ? .6 : /\s/.test(ch) ? .28 : .35;
export function cplOf(title) {
  const lines = String(title).split('\n').map(l => [...l].reduce((sum, ch) => sum + weightOf(ch), 0));
  const need = lines.length > 1 ? Math.max(...lines) : Math.ceil(lines[0] / 2 * 1.12);
  return CPL_BUCKETS.find(b => b >= need) ?? CPL_BUCKETS.at(-1);
}

/** 한 줄에 들어가야 하는 짧은 값(지표 숫자·가격)의 폭 구간. 구간별 글자 크기 상한은 CSS(--kit-vfit)가 칸 폭에서 계산한다. */
export const VL_BUCKETS = [4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20, 24];
export function vlOf(text) {
  const need = [...String(text)].reduce((sum, ch) => sum + (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\u4e00-\u9fff]/.test(ch) ? 1 : /[A-Z]/.test(ch) ? .72 : /[a-z]/.test(ch) ? .58 : /\d/.test(ch) ? .68 : /\s/.test(ch) ? .3 : .38), 0);
  return VL_BUCKETS.find(b => b >= need) ?? VL_BUCKETS.at(-1);
}

/** 격자 흐름 표지(src/layout.mjs): 열 수는 컨테이너 폭과 항목 수로 CSS가 정한다.
 *  kind: 'plain' | 'span'(2열 홀수 마지막 칸이 한 줄을 씀) | 'dense'(좁은 폭에서도 2열). 항목이 하나이거나 너무 많으면 표지를 달지 않는다. */
export const flowAttrs = (n, cap = 3, kind = 'plain') => n >= 2 && n <= FLOW.maxItems ? ' data-flow data-n="' + n + '" data-cap="' + Math.min(cap ?? 3, 4) + '"' + (kind === 'dense' ? ' data-dense' : kind === 'span' ? ' data-span' : '') : '';
