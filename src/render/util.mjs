import {icons} from '../catalog.mjs';

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
