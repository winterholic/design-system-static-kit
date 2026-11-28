/**
 * 아이콘·미디어 처리 프리셋(테마·기타 재료 작업 소유). 아이콘의 선 굵기·끝·채움, 아이콘을 담는 타일, 사진·썸네일의 비율·반경·테두리·스크림·톤, 캡션 자리를 한 묶음으로 둔다.
 *
 * - 아이콘 스타일은 기존 `icon` 축(src/styles/base.mjs ICON, 6종)의 변수 `--kit-icon-*`로 낸다. 아이콘 마크업은 스타일을 모른다(src/render/icon.mjs): 모양은 CSS 변수만 바꾼다.
 * - 사진 자리는 이미지가 없어도 보이게 플레이스홀더(role="img" + 이름)를 낸다. 이미지가 있으면 `<img>`와 대체 텍스트를 필수로 받는다.
 * - 반경은 `RADIUS`의 이름으로만 읽는다. 색은 색 역할 변수만 쓴다.
 */
import {RADIUS, ICON} from '../../styles/base.mjs';
import {COLOR_ROLES} from '../contract.mjs';
import {icon as renderIcon} from '../../render/icon.mjs';
import {defineStyleMaterial, verifiedBy, validateStyleMaterialShape, pairErrors} from './surfaces.mjs';

const photo = (ratio, radius, border, treatment, scrim = 0) => ({ratio, radius, border, treatment, scrim});
const tile = (shape, fill, border = 'none') => ({shape, fill, border});

const EVIDENCE = ['tests/platform-style-materials.test.mjs:39'];

export const MEDIA = Object.freeze([
  defineStyleMaterial({
    id: 'media:line-soft-frame', kind: 'media', label: '선 아이콘과 부드러운 사진틀', contexts: ['any'], tags: ['line', 'soft', 'product'],
    axes: {icon: 'line'}, uses: {icon: ['line'], radius: ['soft']},
    icon: {style: 'line'}, tile: tile('rounded', 'soft'), photo: photo('4 / 3', 'soft', 'hairline', 'natural'), caption: 'below',
    pairs: [['link', 'soft', 3], ['text', 'surface', 4.5]], reuses: ['axis:icon'],
  }),
  defineStyleMaterial({
    id: 'media:solid-cover', kind: 'media', label: '채움 아이콘과 커버 사진', contexts: ['landing', 'commerce', 'listing', 'community', 'blog', 'portfolio', 'pricing', 'dashboard', 'general'], tags: ['solid', 'cover', 'friendly'],
    axes: {icon: 'solid'}, uses: {icon: ['solid'], radius: ['round']},
    icon: {style: 'solid'}, tile: tile('circle', 'action'), photo: photo('16 / 9', 'round', 'none', 'natural', 78), caption: 'overlay',
    pairs: [['onAction', 'action', 4.5], ['canvas', 'text', 4.5]], reuses: ['axis:icon'],
  }),
  defineStyleMaterial({
    id: 'media:fine-editorial', kind: 'media', label: '가는 선 아이콘과 흑백 지면 사진', contexts: ['article', 'blog', 'docs', 'portfolio', 'landing', 'commerce', 'listing'], tags: ['line-fine', 'editorial', 'read'],
    axes: {icon: 'line-fine'}, uses: {icon: ['line-fine'], radius: ['square']},
    icon: {style: 'line-fine'}, tile: tile('none', 'none'), photo: photo('3 / 2', 'square', 'none', 'muted'), caption: 'rule',
    pairs: [['text', 'canvas', 7], ['muted', 'canvas', 4.5]], reuses: ['axis:icon'],
  }),
  defineStyleMaterial({
    id: 'media:bold-poster', kind: 'media', label: '굵은 선 아이콘과 포스터 사진', contexts: ['landing', 'portfolio', 'pricing', 'commerce', 'blog', 'listing', 'general'], tags: ['line-bold', 'poster', 'brand'],
    axes: {icon: 'line-bold'}, uses: {icon: ['line-bold'], radius: ['square']},
    icon: {style: 'line-bold'}, tile: tile('square', 'action', 'hard'), photo: photo('1 / 1', 'square', 'hard', 'tint'), caption: 'below',
    pairs: [['onAction', 'action', 4.5], ['text', 'canvas', 7]], reuses: ['axis:icon'],
  }),
  defineStyleMaterial({
    id: 'media:duotone-round', kind: 'media', label: '이중톤 아이콘과 둥근 사진', contexts: ['landing', 'commerce', 'listing', 'community', 'form', 'dashboard', 'portfolio', 'general'], tags: ['duotone', 'round', 'friendly'],
    axes: {icon: 'duotone'}, uses: {icon: ['duotone'], radius: ['bubble']},
    icon: {style: 'duotone'}, tile: tile('circle', 'soft'), photo: photo('4 / 5', 'bubble', 'none', 'natural'), caption: 'below',
    pairs: [['link', 'soft', 3], ['text', 'surface', 4.5]], reuses: ['axis:icon'],
  }),
  defineStyleMaterial({
    id: 'media:square-tech', kind: 'media', label: '각진 아이콘과 기술 문서 도판', contexts: ['dashboard', 'data', 'docs', 'listing', 'settings', 'landing', 'general'], tags: ['line-square', 'tech', 'work'],
    axes: {icon: 'line-square'}, uses: {icon: ['line-square'], radius: ['subtle']},
    icon: {style: 'line-square'}, tile: tile('square', 'soft', 'hairline'), photo: photo('16 / 10', 'subtle', 'hairline', 'natural'), caption: 'rule',
    pairs: [['link', 'soft', 3], ['text', 'canvas', 7]], reuses: ['axis:icon'],
  }),
].map(verifiedBy(EVIDENCE)));

const RATIO = /^\d+ \/ \d+$/;
const TILE_SHAPES = ['none', 'circle', 'rounded', 'square'], TILE_FILLS = ['none', 'soft', 'action'], BORDERS = ['none', 'hairline', 'hard'];
const TREATMENTS = ['natural', 'muted', 'tint'], CAPTIONS = ['below', 'overlay', 'rule'];

/** 미디어 프리셋 의미 검사: 아이콘 스타일·반경 이름이 값 표에 있고, 타일·사진·캡션 값이 허용 목록 안이다. */
export function validateMedia(m) {
  const out = [...validateStyleMaterialShape(m), ...pairErrors(m)];
  if (out.length) return out;
  const err = (code, path, message) => out.push({code, path, message});
  if (!Object.hasOwn(ICON, m.icon.style)) err('P_MEDIA_ICON', '$.icon.style', `기존 icon 축 값이 아닙니다: ${m.icon.style}`);
  if (m.axes.icon !== m.icon.style) err('P_MEDIA_AXES', '$.axes.icon', 'axes.icon은 icon.style과 같아야 합니다');
  if (!TILE_SHAPES.includes(m.tile.shape) || !TILE_FILLS.includes(m.tile.fill) || !BORDERS.includes(m.tile.border)) err('P_MEDIA_TILE', '$.tile', `타일은 모양 ${TILE_SHAPES.join('·')}, 채움 ${TILE_FILLS.join('·')}, 테두리 ${BORDERS.join('·')}입니다`);
  if ((m.tile.shape === 'none') !== (m.tile.fill === 'none')) err('P_MEDIA_TILE', '$.tile', '타일 없음(shape none)과 채움 없음(fill none)은 함께입니다');
  if (!RATIO.test(m.photo.ratio)) err('P_MEDIA_PHOTO', '$.photo.ratio', '비율은 "가로 / 세로" 형식입니다');
  if (!Object.hasOwn(RADIUS, m.photo.radius)) err('P_MEDIA_PHOTO', '$.photo.radius', `모르는 반경: ${m.photo.radius}`);
  else if (!(m.uses.radius ?? []).includes(m.photo.radius)) err('P_MEDIA_USES', '$.uses.radius', `uses가 사진 반경 ${m.photo.radius}를 덮지 않습니다`);
  if (!BORDERS.includes(m.photo.border) || !TREATMENTS.includes(m.photo.treatment)) err('P_MEDIA_PHOTO', '$.photo', `사진 테두리는 ${BORDERS.join('·')}, 톤은 ${TREATMENTS.join('·')}입니다`);
  if (!Number.isInteger(m.photo.scrim) || m.photo.scrim < 0 || m.photo.scrim > 100) err('P_MEDIA_PHOTO', '$.photo.scrim', '스크림은 0~100 정수(%)입니다');
  if (!CAPTIONS.includes(m.caption)) err('P_MEDIA_CAPTION', '$.caption', `캡션은 ${CAPTIONS.join('·')}입니다`);
  if (m.caption === 'overlay' && m.photo.scrim === 0) err('P_MEDIA_CAPTION', '$.photo.scrim', '사진 위 캡션(overlay)에는 스크림이 필요합니다(글자 대비)');
  return out;
}

const name = m => m.id.slice('media:'.length);
const BORDER_CSS = {none: '0', hairline: '1px solid var(--kit-border)', hard: '2px solid var(--kit-text)'};
const TREATMENT_CSS = {natural: 'none', muted: 'grayscale(.85) contrast(1.05)', tint: 'none'};

/** 미디어 프리셋 CSS. `[data-media="<이름>"]`에 범위를 둔다. 아이콘 변수는 기존 icon 축 표에서 온다. */
export function mediaCSS(m) {
  const sel = `[data-media="${name(m)}"]`, ic = ICON[m.icon.style], t = m.tile, p = m.photo;
  const tileFill = t.fill === 'action' ? `background:var(${COLOR_ROLES.action});color:var(${COLOR_ROLES.onAction})` : t.fill === 'soft' ? `background:var(${COLOR_ROLES.soft});color:var(${COLOR_ROLES.link})` : '';
  const tileRadius = t.shape === 'circle' ? '999px' : t.shape === 'rounded' ? `${RADIUS.soft}px` : '0';
  const rules = [
    `${sel}{--kit-icon-sw:${ic.sw};--kit-icon-cap:${ic.cap};--kit-icon-join:${ic.join};--kit-icon-fill:${ic.fill}}`,
    `${sel} .kit-icon{width:1.25em;height:1.25em;flex:none;vertical-align:-.22em}${sel} .kit-icon path{fill:none;stroke:currentColor;stroke-width:var(--kit-icon-sw);stroke-linecap:var(--kit-icon-cap);stroke-linejoin:var(--kit-icon-join)}${sel} .kit-icon path.c{fill:var(--kit-icon-fill)}`,
    `${sel} .kit-media{margin:0;display:flex;flex-direction:column;gap:var(--kit-sp-near)}`,
    `${sel} .kit-media-photo{position:relative;display:grid;place-items:center;aspect-ratio:${p.ratio};overflow:hidden;border:${BORDER_CSS[p.border]};border-radius:${RADIUS[p.radius]}px;background:linear-gradient(135deg,var(${COLOR_ROLES.soft}),var(${COLOR_ROLES.sunken}))}`,
    `${sel} .kit-media-art{display:grid;place-items:center}`,
    `${sel} .kit-media-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:${TREATMENT_CSS[p.treatment]}}`,
  ];
  if (p.treatment === 'tint') rules.push(`${sel} .kit-media-photo::after{content:'';position:absolute;inset:0;background:color-mix(in srgb,var(${COLOR_ROLES.action}) 18%,transparent);mix-blend-mode:multiply;pointer-events:none}`);
  if (t.shape !== 'none') rules.push(`${sel} .kit-media-tile{position:relative;z-index:1;display:inline-grid;place-items:center;width:48px;height:48px;${tileFill};border:${BORDER_CSS[t.border]};border-radius:${tileRadius}}${sel} .kit-media-tile .kit-icon{width:24px;height:24px}`);
  else rules.push(`${sel} .kit-media-tile{position:relative;z-index:1;display:inline-grid;place-items:center;color:var(${COLOR_ROLES.text})}${sel} .kit-media-tile .kit-icon{width:32px;height:32px}`);
  const cap = `${sel} figcaption{font-size:var(--kit-t-small);color:var(${COLOR_ROLES.muted})}`;
  if (m.caption === 'overlay') rules.push(`${cap}${sel} .kit-media-photo figcaption{position:absolute;inset:auto 0 0 0;z-index:1;padding:var(--kit-sp-item);color:var(${COLOR_ROLES.canvas});background:linear-gradient(0deg,color-mix(in srgb,var(${COLOR_ROLES.text}) ${p.scrim}%,transparent),transparent)}`);
  else if (m.caption === 'rule') rules.push(`${cap}${sel} figcaption{padding-top:var(--kit-sp-near);border-top:1px solid var(${COLOR_ROLES.rule})}`);
  else rules.push(cap);
  return rules.join('\n');
}

const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SAFE_SRC = /^(https:\/\/|\/(?!\/)|\.\/|data:image\/(png|jpeg|webp|avif|gif);)/;

/**
 * 미디어 프리셋 마크업. src가 없으면 플레이스홀더(role="img"와 이름)를, 있으면 `<img>`를 낸다(alt 필수, javascript: 같은 주소 거부).
 * input: {title, caption, icon?: 아이콘 이름(기본 image), src?, alt?}
 */
export function renderMedia(m, {title, caption = '', icon = 'image', src, alt} = {}) {
  if (typeof title !== 'string' || !title.trim()) throw new RangeError('title이 필요합니다');
  if (src !== undefined) {
    if (typeof src !== 'string' || !SAFE_SRC.test(src)) throw new RangeError('src는 https:, 같은 출처 경로, data:image/만 받습니다');
    if (typeof alt !== 'string' || !alt.trim()) throw new RangeError('이미지에는 alt가 필요합니다');
  }
  const art = src === undefined ? `<span class="kit-media-art" role="img" aria-label="${escapeHTML(title)}"><span class="kit-media-tile">${renderIcon(icon)}</span></span>` : `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="lazy">${m.tile.shape === 'none' ? '' : `<span class="kit-media-tile">${renderIcon(icon)}</span>`}`;
  const cap = caption ? `<figcaption>${escapeHTML(caption)}</figcaption>` : '';
  const inPhoto = m.caption === 'overlay' && caption;
  return `<div class="kit-media-demo" data-media="${name(m)}"><figure class="kit-media"><div class="kit-media-photo">${art}${inPhoto ? cap : ''}</div>${inPhoto ? '' : cap}</figure></div>`;
}
