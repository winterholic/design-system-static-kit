/**
 * §6.2 J(정보 표시) 및 K(미디어·콘텐츠) 목적 패밀리 16종 계약 및 렌더러.
 *
 * 정보 표시(Info):
 *   - Status Badge: 상태 표시 배지
 *   - Avatar: 단일 사용자/엔터티 아바타
 *   - Avatar Group: 아바타 묶음(+N 카운터)
 *   - Accordion: 접이식 섹션 목록
 *   - Collapsible: 단일 영역 접기/펼치기
 *   - Counter: 수치 캡슐/배지 카운트
 *   - Notification Indicator: 알림 인디케이터
 *   - Keyboard Shortcut: 키보드 단축키(kbd)
 *   - Metadata Row: 라벨-값 메타데이터 행
 *   - Stat Comparison: 증감 비교 통계 지표
 *
 * 미디어·콘텐츠(Media):
 *   - Responsive Image: 비율·크기 반응형 이미지
 *   - Carousel: 키보드·인디케이터 지원 슬라이드 캐러셀
 *   - Audio Player UI: 완성형 오디오 플레이어
 *   - File Preview: 파일 정보 및 다운로드 미리보기
 *   - Image Comparison: 전/후 이미지 분할 슬라이더
 *   - Figure and Caption: 설명 캡션이 있는 도판
 */
import {definePurposeFamily, e} from './kit.mjs';

const CARD = 'base-component:card-surface';
const BUTTON = 'base-component:button-control';
const FEEDBACK = 'base-component:feedback-message';

const PARENTS = ['slot:main', 'slot:header', 'slot:footer', 'slot:aside', 'slot:grid-item'];

const SHARED_CSS = `
.pf-info-badge{display:inline-flex;align-items:center;gap:var(--kit-sp-tight);padding:2px var(--kit-sp-near);border-radius:var(--kit-radius);font-family:var(--kit-font);font-size:var(--kit-t-small);line-height:1.4;border:1px solid var(--kit-border);background:var(--kit-surface);color:var(--kit-text)}
.pf-status-dot{inline-size:.5rem;block-size:.5rem;border-radius:50%;background:currentColor;flex:none}
.pf-info-badge[data-tone="success"]{border-color:var(--kit-action);color:var(--kit-action)}
.pf-info-badge[data-tone="danger"]{border-color:var(--kit-danger);color:var(--kit-danger)}
.pf-info-badge[data-tone="warning"]{border-color:var(--kit-border);color:var(--kit-text)}
.pf-info-badge[data-tone="info"]{border-color:var(--kit-action);color:var(--kit-action)}
.pf-info-badge[data-tone="neutral"]{border-color:var(--kit-border);color:var(--kit-muted)}

.pf-avatar{display:inline-flex;align-items:center;justify-content:center;overflow:hidden;background:var(--kit-soft);color:var(--kit-text);font-family:var(--kit-font);font-weight:600;vertical-align:middle;user-select:none;flex:none}
.pf-avatar[data-shape="circle"]{border-radius:50%}
.pf-avatar[data-shape="square"]{border-radius:var(--kit-radius)}
.pf-avatar[data-size="small"]{inline-size:28px;block-size:28px;font-size:var(--kit-t-small)}
.pf-avatar[data-size="medium"]{inline-size:40px;block-size:40px;font-size:var(--kit-t-body)}
.pf-avatar[data-size="large"]{inline-size:56px;block-size:56px;font-size:var(--kit-t-heading)}
.pf-avatar img{inline-size:100%;block-size:100%;object-fit:cover}

.pf-avatar-group{display:inline-flex;align-items:center;font-family:var(--kit-font)}
.pf-avatar-group .pf-avatar{border:2px solid var(--kit-surface)}
.pf-avatar-group[data-spacing="tight"] .pf-avatar:not(:first-child){margin-inline-start:-8px}
.pf-avatar-group[data-spacing="normal"] .pf-avatar:not(:first-child){margin-inline-start:-4px}
.pf-avatar-more{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--kit-soft);color:var(--kit-muted);font-size:var(--kit-t-small);font-weight:600;border:2px solid var(--kit-surface)}
.pf-avatar-group[data-size="small"] .pf-avatar-more{inline-size:28px;block-size:28px}
.pf-avatar-group[data-size="medium"] .pf-avatar-more{inline-size:40px;block-size:40px}
.pf-avatar-group[data-size="large"] .pf-avatar-more{inline-size:56px;block-size:56px}

.pf-accordion{display:grid;gap:var(--kit-sp-tight);font-family:var(--kit-font);inline-size:100%}
.pf-accordion-item{border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);overflow:hidden}
.pf-accordion[data-layout="stack"]{gap:0}
.pf-accordion[data-layout="stack"] .pf-accordion-item:not(:first-child){border-block-start-color:transparent;border-start-start-radius:0;border-start-end-radius:0}
.pf-accordion[data-layout="stack"] .pf-accordion-item:not(:last-child){border-end-start-radius:0;border-end-end-radius:0}
.pf-accordion-trigger{display:flex;align-items:center;justify-content:space-between;inline-size:100%;min-block-size:44px;padding:var(--kit-sp-near) var(--kit-sp-item);background:transparent;color:var(--kit-text);border:0;font:inherit;font-weight:600;text-align:start;cursor:pointer}
.pf-accordion-trigger:hover{background:var(--kit-card-hover)}
.pf-accordion-trigger:focus-visible{outline:2px solid var(--kit-focus);outline-offset:-2px}
.pf-accordion-panel{padding:var(--kit-sp-near) var(--kit-sp-item) var(--kit-sp-item);color:var(--kit-muted);font-size:var(--kit-t-body);border-block-start:1px solid var(--kit-border)}
.pf-accordion-panel[hidden]{display:none}

.pf-collapsible{display:grid;gap:var(--kit-sp-tight);font-family:var(--kit-font)}
.pf-collapsible[data-layout="card"]{padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface)}
.pf-collapsible-trigger{display:inline-flex;align-items:center;gap:var(--kit-sp-near);min-block-size:44px;padding:var(--kit-sp-tight) var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font:inherit;cursor:pointer}
.pf-collapsible-trigger:hover{background:var(--kit-card-hover)}
.pf-collapsible-trigger:focus-visible{outline:2px solid var(--kit-focus);outline-offset:2px}
.pf-collapsible-body{padding:var(--kit-sp-near) 0;color:var(--kit-text)}
.pf-collapsible-body[hidden]{display:none}

.pf-counter{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;font-family:var(--kit-font);font-size:var(--kit-t-small);font-weight:600;line-height:1.2;background:var(--kit-soft);color:var(--kit-text)}
.pf-counter[data-variant="circle"]{inline-size:24px;block-size:24px;padding:0;border-radius:50%}
.pf-counter[data-tone="action"]{background:var(--kit-action);color:var(--kit-surface)}
.pf-counter[data-tone="danger"]{background:var(--kit-danger);color:var(--kit-surface)}
.pf-counter[data-size="small"]{font-size:11px;min-inline-size:18px;min-block-size:18px}
.pf-counter[data-size="large"]{font-size:var(--kit-t-body);min-inline-size:28px;min-block-size:28px;padding:4px 10px}

.pf-notification-indicator{display:inline-flex;align-items:center;justify-content:center;inline-size:12px;block-size:12px}
.pf-indicator-dot{inline-size:8px;block-size:8px;border-radius:50%;background:var(--kit-action)}
.pf-notification-indicator[data-tone="danger"] .pf-indicator-dot{background:var(--kit-danger)}
.pf-notification-indicator[data-tone="warning"] .pf-indicator-dot{background:var(--kit-border)}
.pf-notification-indicator[data-style="pulse"] .pf-indicator-dot{animation:pf-pulse 1.8s infinite}
@keyframes pf-pulse{0%{transform:scale(0.95);box-shadow:0 0 0 0 color-mix(in srgb,currentColor 70%,transparent)}70%{transform:scale(1);box-shadow:0 0 0 6px transparent}100%{transform:scale(0.95);box-shadow:0 0 0 0 transparent}}

.pf-kbd-group{display:inline-flex;align-items:center;gap:4px;font-family:var(--kit-mono, monospace);font-size:var(--kit-t-small)}
.pf-kbd-key{display:inline-flex;align-items:center;justify-content:center;min-inline-size:24px;min-block-size:24px;padding:2px 6px;border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);box-shadow:0 1px 0 var(--kit-border)}
.pf-kbd-group[data-style="solid"] .pf-kbd-key{background:var(--kit-soft);border-color:transparent}

.pf-metadata-row{display:grid;gap:var(--kit-sp-tight);margin:0;padding:0;font-family:var(--kit-font)}
.pf-metadata-row[data-layout="inline"]{display:flex;flex-wrap:wrap;align-items:center;gap:var(--kit-sp-item)}
.pf-meta-item{display:flex;gap:var(--kit-sp-near);align-items:baseline}
.pf-meta-item dt{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small)}
.pf-meta-item dd{margin:0;color:var(--kit-text);font-weight:600;font-size:var(--kit-t-body)}

.pf-stat-comparison{display:grid;gap:4px;font-family:var(--kit-font);padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface)}
.pf-stat-comparison[data-layout="horizontal"]{display:flex;align-items:baseline;justify-content:space-between}
.pf-stat-label{color:var(--kit-muted);font-size:var(--kit-t-small)}
.pf-stat-value{font-size:var(--kit-t-heading);font-weight:700;color:var(--kit-text);line-height:1.2}
.pf-stat-change{font-size:var(--kit-t-small);font-weight:600}
.pf-stat-comparison[data-trend="up"] .pf-stat-change{color:var(--kit-action)}
.pf-stat-comparison[data-trend="down"] .pf-stat-change{color:var(--kit-danger)}
.pf-stat-comparison[data-trend="neutral"] .pf-stat-change{color:var(--kit-muted)}

.pf-responsive-image{display:block;position:relative;overflow:hidden;border-radius:var(--kit-radius);background:var(--kit-soft)}
.pf-responsive-image img{display:block;inline-size:100%;block-size:auto}
.pf-responsive-image[data-ratio="16:9"]{aspect-ratio:16/9}
.pf-responsive-image[data-ratio="4:3"]{aspect-ratio:4/3}
.pf-responsive-image[data-ratio="1:1"]{aspect-ratio:1/1}
.pf-responsive-image[data-ratio="21:9"]{aspect-ratio:21/9}
.pf-responsive-image[data-fit="cover"] img{inline-size:100%;block-size:100%;object-fit:cover}
.pf-responsive-image[data-fit="contain"] img{inline-size:100%;block-size:100%;object-fit:contain}
.pf-image-caption{margin:var(--kit-sp-tight) 0 0;color:var(--kit-muted);font-size:var(--kit-t-small)}

.pf-carousel{position:relative;display:grid;gap:var(--kit-sp-near);font-family:var(--kit-font);inline-size:100%}
.pf-carousel-track{display:grid;grid-auto-flow:column;grid-auto-columns:100%;gap:var(--kit-sp-item);overflow-x:hidden;scroll-snap-type:x mandatory;border-radius:var(--kit-radius)}
.pf-carousel-slide{scroll-snap-align:center;display:grid;gap:var(--kit-sp-near);box-sizing:border-box}
.pf-carousel-slide img{inline-size:100%;max-block-size:400px;object-fit:cover;border-radius:var(--kit-radius)}
.pf-carousel-nav{display:flex;align-items:center;justify-content:space-between;padding:var(--kit-sp-tight) 0}
.pf-carousel-btn{min-inline-size:44px;min-block-size:44px;padding:0 var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font:inherit;font-size:1.25rem;cursor:pointer}
.pf-carousel-btn:hover{background:var(--kit-card-hover)}
.pf-carousel-btn:focus-visible{outline:2px solid var(--kit-focus);outline-offset:2px}
.pf-carousel-counter{color:var(--kit-muted);font-size:var(--kit-t-small)}

.pf-audio-player{display:grid;gap:var(--kit-sp-near);padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font-family:var(--kit-font)}
.pf-audio-player[data-layout="compact"]{display:flex;align-items:center}
.pf-audio-header{display:flex;align-items:center;gap:var(--kit-sp-item)}
.pf-audio-play-btn{min-inline-size:44px;min-block-size:44px;border:1px solid var(--kit-border);border-radius:50%;background:var(--kit-action);color:var(--kit-surface);font:inherit;cursor:pointer;display:inline-grid;place-items:center}
.pf-audio-play-btn:focus-visible{outline:2px solid var(--kit-focus);outline-offset:2px}
.pf-audio-meta{display:grid;min-inline-size:0}
.pf-audio-title{font-weight:600;font-size:var(--kit-t-body);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-audio-artist{color:var(--kit-muted);font-size:var(--kit-t-small)}
.pf-audio-bar-row{display:flex;align-items:center;gap:var(--kit-sp-near)}
.pf-audio-progress{flex:1;inline-size:100%;block-size:6px;border-radius:999px;background:var(--kit-soft);overflow:hidden}
.pf-audio-bar{display:block;block-size:100%;background:var(--kit-action)}
.pf-audio-time{font-size:var(--kit-t-small);color:var(--kit-muted);font-variant-numeric:tabular-nums;flex:none}

.pf-file-preview{display:flex;align-items:center;gap:var(--kit-sp-item);padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);font-family:var(--kit-font)}
.pf-file-preview[data-layout="card"]{flex-direction:column;align-items:flex-start}
.pf-file-badge{display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;border-radius:var(--kit-radius);background:var(--kit-soft);color:var(--kit-text);font-size:11px;font-weight:700}
.pf-file-details{display:grid;gap:2px;flex:1;min-inline-size:0}
.pf-file-name{font-weight:600;font-size:var(--kit-t-body);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pf-file-size{color:var(--kit-muted);font-size:var(--kit-t-small)}
.pf-file-download{display:inline-flex;align-items:center;min-block-size:44px;padding:0 var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface);color:var(--kit-text);text-decoration:none;font-size:var(--kit-t-small)}
.pf-file-download:hover{background:var(--kit-card-hover)}
.pf-file-download:focus-visible{outline:2px solid var(--kit-focus);outline-offset:2px}

.pf-image-comparison{position:relative;display:grid;gap:var(--kit-sp-tight);font-family:var(--kit-font);inline-size:100%}
.pf-comp-stage{position:relative;overflow:hidden;border-radius:var(--kit-radius);background:var(--kit-soft);aspect-ratio:16/9;user-select:none}
.pf-comp-img{position:absolute;inset:0;inline-size:100%;block-size:100%;object-fit:cover}
.pf-comp-clip{position:absolute;inset:0;inline-size:100%;block-size:100%}
.pf-comp-range{position:absolute;inset-block-start:0;inset-inline-start:0;inline-size:100%;block-size:100%;margin:0;opacity:0;cursor:ew-resize}
.pf-comp-legend{display:flex;justify-content:space-between;color:var(--kit-muted);font-size:var(--kit-t-small)}

.pf-figure-caption{margin:0;display:grid;gap:var(--kit-sp-tight);font-family:var(--kit-font)}
.pf-figure-caption img{display:block;inline-size:100%;border-radius:var(--kit-radius);background:var(--kit-soft)}
.pf-figure-caption figcaption{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small)}
.pf-figure-caption[data-align="center"] figcaption{text-align:center}
.pf-credit{display:block;margin-block-start:2px;font-size:11px;opacity:0.8}
`;

/* =========================================================================
 * J. 정보 표시 (10종)
 * ========================================================================= */

// 1. Status Badge
export const infoStatusBadge = definePurposeFamily({
  id: 'purpose:info.status-badge', group: 'info', sharedCss: SHARED_CSS, label: '상태 배지',
  purpose: '엔터티의 현재 상태(활성, 성공, 대기, 실패 등)를 상태 점(dot)과 텍스트 라벨로 명확하게 표시한다.',
  contexts: ['any'], bases: [FEEDBACK], children: [FEEDBACK],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderStatusBadge'},
  variants: {tone: ['neutral', 'info', 'success', 'warning', 'danger']},
  props: {size: ['small', 'medium', 'large']},
  defaults: {tone: 'neutral', size: 'medium'},
  content: {label: {required: true, type: 'string'}, description: {type: 'string'}},
  states: ['default', 'hover'],
  interactions: [{on: 'hover', behavior: '설명이 있는 경우 툴팁 또는 보조 텍스트 표시'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '줄바꿈 시 인라인 흐름 유지'},
  a11y: {role: 'status', keyboard: '포커스를 받지 않는 상태 정보 표시', conditions: ['상태를 색상만이 아니라 텍스트와 함께 전달', 'role=status 제공', '대비 4.5:1 이상']},
  pairs: [['--kit-text', '--kit-surface', 4.5, 'status text'], ['--kit-action', '--kit-surface', 4.5, 'info status'], ['--kit-danger', '--kit-surface', 4.5, 'danger status']],
  parents: PARENTS,
  example: {variant: {tone: 'success'}, props: {size: 'medium'}, content: {label: '정상 작동'}},
  render(ctx) { return renderStatusBadge(ctx); },
  css: '',
});
export function renderStatusBadge(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.label?.trim()) throw new TypeError('Status Badge requires label');
  return `<span class="pf-info-badge" data-tone="${e(v.tone)}" data-size="${e(p.size)}" role="status"><span class="pf-status-dot" aria-hidden="true"></span><span class="pf-status-text">${e(c.label)}</span>${c.description ? `<span class="pf-status-desc"> - ${e(c.description)}</span>` : ''}</span>`;
}

// 2. Avatar
export const infoAvatar = definePurposeFamily({
  id: 'purpose:info.avatar', group: 'info', sharedCss: SHARED_CSS, label: '아바타',
  purpose: '사용자 또는 엔터티를 나타내는 프로필 이미지 또는 이니셜 텍스트를 표시한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderAvatar'},
  variants: {shape: ['circle', 'square']},
  props: {size: ['small', 'medium', 'large']},
  defaults: {shape: 'circle', size: 'medium'},
  content: {name: {required: true, type: 'string'}, src: {type: 'image url'}, initials: {type: 'string'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '이미지 로딩 실패 시 이니셜 fallback 표시'}],
  responsive: {strategy: 'fixed', breakpoints: ['640px'], behavior: '정해진 크기 토큰 유지'},
  a11y: {role: 'img', keyboard: '정적 이미지/표시', conditions: ['aria-label 또는 alt로 이름 제공', '이니셜 표시 시 고대비 유지']},
  pairs: [['--kit-text', '--kit-soft', 4.5, 'avatar initials']],
  parents: PARENTS,
  example: {variant: {shape: 'circle'}, props: {size: 'medium'}, content: {name: '홍길동', initials: '홍'}},
  render(ctx) { return renderAvatar(ctx); },
  css: '',
});
export function renderAvatar(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.name?.trim()) throw new TypeError('Avatar requires name');
  const initials = e(c.initials ?? c.name.slice(0, 2));
  return `<span class="pf-avatar" data-shape="${e(v.shape)}" data-size="${e(p.size)}" role="img" aria-label="${e(c.name)}">${c.src ? `<img src="${e(c.src)}" alt="${e(c.name)}" />` : initials}</span>`;
}

// 3. Avatar Group
export const infoAvatarGroup = definePurposeFamily({
  id: 'purpose:info.avatar-group', group: 'info', sharedCss: SHARED_CSS, label: '아바타 그룹',
  purpose: '협업자 또는 참가자 목록을 겹친 아바타들과 초과 인원 카운터로 표시한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderAvatarGroup'},
  variants: {spacing: ['tight', 'normal']},
  props: {size: ['small', 'medium', 'large']},
  defaults: {spacing: 'tight', size: 'medium'},
  content: {items: {required: true, type: '배열 {name,src?,initials?}, 1~10개'}, max: {type: 'number'}},
  states: ['default'],
  interactions: [{on: 'hover', behavior: '각 아바타 툴팁으로 전체 이름 안내'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '가로 넘침 시 +N으로 축약'},
  a11y: {role: 'group', keyboard: '정적 그룹 표시', conditions: ['그룹 aria-label 제공', '초과 수치 명확히 안내']},
  pairs: [['--kit-muted', '--kit-soft', 4.5, 'more counter']],
  parents: PARENTS,
  example: {variant: {spacing: 'tight'}, props: {size: 'medium'}, content: {items: [{name: '김철수', initials: '김'}, {name: '이영희', initials: '이'}, {name: '박민수', initials: '박'}], max: 2}},
  render(ctx) { return renderAvatarGroup(ctx); },
  css: '',
});
export function renderAvatarGroup(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!Array.isArray(c.items) || !c.items.length) throw new TypeError('Avatar Group requires items array');
  const max = c.max ?? 3;
  const visible = c.items.slice(0, max);
  const remaining = c.items.length - visible.length;
  const avatars = visible.map(it => `<span class="pf-avatar" data-shape="circle" data-size="${e(p.size)}" role="img" aria-label="${e(it.name)}">${it.src ? `<img src="${e(it.src)}" alt="${e(it.name)}" />` : e(it.initials ?? it.name.slice(0, 2))}</span>`).join('');
  const more = remaining > 0 ? `<span class="pf-avatar-more" aria-label="외 ${remaining}명">+${remaining}</span>` : '';
  return `<div class="pf-avatar-group" data-spacing="${e(v.spacing)}" data-size="${e(p.size)}" role="group" aria-label="참여자 목록">${avatars}${more}</div>`;
}

// 4. Accordion
export const infoAccordion = definePurposeFamily({
  id: 'purpose:info.accordion', group: 'info', sharedCss: SHARED_CSS, label: '아코디언',
  purpose: '여러 접이식 섹션을 목록으로 제공하여 연관된 정보를 공간 절약형으로 탐색한다.',
  contexts: ['any'], bases: [CARD, BUTTON], children: [CARD, BUTTON],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderAccordion'},
  variants: {layout: ['stack', 'separated']},
  props: {density: ['compact', 'comfortable', 'spacious']},
  defaults: {layout: 'stack', density: 'comfortable'},
  content: {title: {type: 'string'}, items: {required: true, type: '배열 {title,content,open?}, 2~10개'}},
  states: ['default', 'open', 'closed', 'focus'],
  interactions: [{on: 'click·Enter·Space', behavior: '패널 토글', runtime: 'INFO_MEDIA_RUNTIME'}, {on: 'ArrowDown·ArrowUp·Home·End', behavior: '헤더 간 포커스 이동', runtime: 'INFO_MEDIA_RUNTIME'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '너비 100% 채움'},
  a11y: {role: 'region', keyboard: 'Enter/Space로 토글, ArrowDown/ArrowUp/Home/End로 헤더 순회', conditions: ['버튼에 aria-expanded 및 aria-controls', '패널에 role=region 및 aria-labelledby', '키보드 상호작용 완비']},
  pairs: [['--kit-text', '--kit-surface', 7, 'accordion header'], ['--kit-muted', '--kit-surface', 4.5, 'accordion body']],
  parents: PARENTS,
  example: {variant: {layout: 'stack'}, props: {density: 'comfortable'}, content: {title: '자주 묻는 질문', items: [{title: '이용 요금은 얼마인가요?', content: '기본 기능은 무료로 제공됩니다.', open: true}, {title: '지원하는 브라우저는 무엇인가요?', content: '모든 최신 모던 브라우저를 지원합니다.'}]}},
  render(ctx) { return renderAccordion(ctx); },
  css: '',
});
export function renderAccordion(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!Array.isArray(c.items) || c.items.length < 2) throw new TypeError('Accordion requires at least 2 items');
  const items = c.items.map((it, i) => {
    const tid = ctx.uid(`acc-t-${i}`), pid = ctx.uid(`acc-p-${i}`);
    const open = Boolean(it.open);
    return `<div class="pf-accordion-item"><button type="button" id="${tid}" class="pf-accordion-trigger" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${pid}" data-accordion-trigger><span>${e(it.title)}</span><span class="pf-accordion-chevron" aria-hidden="true">${open ? '−' : '+'}</span></button><div id="${pid}" class="pf-accordion-panel" role="region" aria-labelledby="${tid}"${open ? '' : ' hidden'}>${e(it.content)}</div></div>`;
  }).join('');
  return `<div class="pf-accordion" data-accordion data-layout="${e(v.layout)}" data-density="${e(p.density)}" role="region"${c.title ? ` aria-label="${e(c.title)}"` : ''}>${items}</div>`;
}

// 5. Collapsible
export const infoCollapsible = definePurposeFamily({
  id: 'purpose:info.collapsible', group: 'info', sharedCss: SHARED_CSS, label: '접기/펼치기',
  purpose: '단일 영역의 상세 내용을 버튼으로 접거나 펼쳐서 점진적으로 정보를 노출한다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderCollapsible'},
  variants: {layout: ['inline', 'card']},
  props: {size: ['small', 'medium', 'large']},
  defaults: {layout: 'inline', size: 'medium'},
  content: {triggerLabel: {required: true, type: 'string'}, content: {required: true, type: 'string'}, open: {type: 'boolean'}},
  states: ['default', 'open', 'closed', 'focus'],
  interactions: [{on: 'click·Enter·Space', behavior: '영역 토글', runtime: 'INFO_MEDIA_RUNTIME'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '너비 유연 처리'},
  a11y: {role: 'region', keyboard: 'Enter/Space로 트리거 토글', conditions: ['aria-expanded 동기화', 'aria-controls 연결', 'hidden 속성 동기화']},
  pairs: [['--kit-text', '--kit-surface', 7, 'trigger label']],
  parents: PARENTS,
  example: {variant: {layout: 'inline'}, props: {size: 'medium'}, content: {triggerLabel: '상세 정보 보기', content: '여기에 자세한 내용이 표시됩니다.', open: false}},
  render(ctx) { return renderCollapsible(ctx); },
  css: '',
});
export function renderCollapsible(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.triggerLabel?.trim()) throw new TypeError('Collapsible requires triggerLabel');
  if (c.content === undefined) throw new TypeError('Collapsible requires content');
  const pid = ctx.uid('col-body'), tid = ctx.uid('col-trig');
  const open = Boolean(c.open);
  return `<div class="pf-collapsible" data-collapsible data-layout="${e(v.layout)}" data-size="${e(p.size)}"><button type="button" id="${tid}" class="pf-collapsible-trigger" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${pid}" data-collapsible-trigger><span>${e(c.triggerLabel)}</span><span class="pf-collapsible-arrow" aria-hidden="true">${open ? '▲' : '▼'}</span></button><div id="${pid}" class="pf-collapsible-body" role="region" aria-labelledby="${tid}"${open ? '' : ' hidden'}>${e(c.content)}</div></div>`;
}

// 6. Counter
export const infoCounter = definePurposeFamily({
  id: 'purpose:info.counter', group: 'info', sharedCss: SHARED_CSS, label: '카운터',
  purpose: '알림 수, 장바구니 수량 등 단일 수치를 시각적 캡슐이나 원형으로 표현한다.',
  contexts: ['any'], bases: [FEEDBACK], children: [FEEDBACK],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderCounter'},
  variants: {variant: ['pill', 'circle']},
  props: {size: ['small', 'medium', 'large'], tone: ['neutral', 'action', 'danger']},
  defaults: {variant: 'pill', size: 'medium', tone: 'neutral'},
  content: {count: {required: true, type: 'number'}, max: {type: 'number'}, label: {type: 'string'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '최대치 초과 시 축약 표시'}],
  responsive: {strategy: 'fixed', breakpoints: ['640px'], behavior: '정해진 크기 유지'},
  a11y: {role: 'status', keyboard: '정적 수치 전달', conditions: ['스크린리더용 설명 제공', '대비 4.5:1 이상']},
  pairs: [['--kit-text', '--kit-soft', 4.5, 'counter neutral'], ['--kit-surface', '--kit-action', 4.5, 'counter action']],
  parents: PARENTS,
  example: {variant: {variant: 'pill'}, props: {size: 'medium', tone: 'action'}, content: {count: 5, label: '읽지 않은 알림 5개'}},
  render(ctx) { return renderCounter(ctx); },
  css: '',
});
export function renderCounter(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (typeof c.count !== 'number' || Number.isNaN(c.count)) throw new TypeError('Counter requires count number');
  const max = c.max;
  const display = max !== undefined && c.count > max ? `${max}+` : String(c.count);
  return `<span class="pf-counter" data-variant="${e(v.variant)}" data-size="${e(p.size)}" data-tone="${e(p.tone)}" role="status" aria-label="${e(c.label ?? `${c.count}건`)}">${display}</span>`;
}

// 7. Notification Indicator
export const infoNotificationIndicator = definePurposeFamily({
  id: 'purpose:info.notification-indicator', group: 'info', sharedCss: SHARED_CSS, label: '알림 표시기',
  purpose: '새 소식이나 읽지 않은 알림이 있음을 시각적 점(dot) 또는 펄스 애니메이션으로 알린다.',
  contexts: ['any'], bases: [FEEDBACK], children: [FEEDBACK],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderNotificationIndicator'},
  variants: {style: ['dot', 'pulse']},
  props: {tone: ['danger', 'action', 'warning']},
  defaults: {style: 'dot', tone: 'danger'},
  content: {label: {required: true, type: 'string'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '시각적 알림 표시'}],
  responsive: {strategy: 'fixed', breakpoints: ['640px'], behavior: '크기 고정'},
  a11y: {role: 'status', keyboard: '정적 인디케이터', conditions: ['스크린리더용 레이블 필수', '시각적 점에 aria-hidden']},
  pairs: [['--kit-surface', '--kit-danger', 4.5, 'notification dot']],
  parents: PARENTS,
  example: {variant: {style: 'pulse'}, props: {tone: 'danger'}, content: {label: '새 알림이 있습니다'}},
  render(ctx) { return renderNotificationIndicator(ctx); },
  css: '',
});
export function renderNotificationIndicator(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.label?.trim()) throw new TypeError('Notification Indicator requires label');
  return `<span class="pf-notification-indicator" data-style="${e(v.style)}" data-tone="${e(p.tone)}" role="status" aria-label="${e(c.label)}"><span class="pf-indicator-dot" aria-hidden="true"></span></span>`;
}

// 8. Keyboard Shortcut
export const infoKeyboardShortcut = definePurposeFamily({
  id: 'purpose:info.keyboard-shortcut', group: 'info', sharedCss: SHARED_CSS, label: '키보드 단축키',
  purpose: '명령 메뉴나 단축키 조합을 명확한 kbd 태그 묶음으로 안내한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderKeyboardShortcut'},
  variants: {style: ['outline', 'solid']},
  props: {size: ['small', 'medium']},
  defaults: {style: 'outline', size: 'medium'},
  content: {keys: {required: true, type: 'string[] (1~4개)'}, label: {type: 'string'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '단축키 안내'}],
  responsive: {strategy: 'fixed', breakpoints: ['640px'], behavior: '인라인 유지'},
  a11y: {role: 'group', keyboard: '단축키 시각 안내', conditions: ['kbd 요소 시맨틱 사용', '전체 조합 aria-label 제공']},
  pairs: [['--kit-text', '--kit-surface', 7, 'kbd text']],
  parents: PARENTS,
  example: {variant: {style: 'outline'}, props: {size: 'medium'}, content: {keys: ['Ctrl', 'K'], label: '검색 열기'}},
  render(ctx) { return renderKeyboardShortcut(ctx); },
  css: '',
});
export function renderKeyboardShortcut(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!Array.isArray(c.keys) || !c.keys.length) throw new TypeError('Keyboard Shortcut requires keys array');
  const keys = c.keys.map(k => `<kbd class="pf-kbd-key">${e(k)}</kbd>`).join('');
  return `<kbd class="pf-kbd-group" data-style="${e(v.style)}" data-size="${e(p.size)}" aria-label="${e(c.label ?? c.keys.join(' + '))}">${keys}</kbd>`;
}

// 9. Metadata Row
export const infoMetadataRow = definePurposeFamily({
  id: 'purpose:info.metadata-row', group: 'info', sharedCss: SHARED_CSS, label: '메타데이터 행',
  purpose: '키-값 메타데이터 항목들을 정렬된 행으로 명확하게 전달한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderMetadataRow'},
  variants: {layout: ['inline', 'stacked']},
  props: {density: ['compact', 'comfortable']},
  defaults: {layout: 'inline', density: 'comfortable'},
  content: {items: {required: true, type: '배열 {label,value}, 1~6개'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '항목 목록 나열'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '작은 화면에서 세로 적층'},
  a11y: {role: 'list', keyboard: 'dl 시맨틱 목록', conditions: ['dt/dd 시맨틱 구조 준수', '키-값 일대일 매핑']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'meta label'], ['--kit-text', '--kit-surface', 7, 'meta value']],
  parents: PARENTS,
  example: {variant: {layout: 'inline'}, props: {density: 'comfortable'}, content: {items: [{label: '작성자', value: '관리자'}, {label: '수정일', value: '2026-11-28'}]}},
  render(ctx) { return renderMetadataRow(ctx); },
  css: '',
});
export function renderMetadataRow(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!Array.isArray(c.items) || !c.items.length) throw new TypeError('Metadata Row requires items array');
  const items = c.items.map(it => `<div class="pf-meta-item"><dt>${e(it.label)}</dt><dd>${e(it.value)}</dd></div>`).join('');
  return `<dl class="pf-metadata-row" data-layout="${e(v.layout)}" data-density="${e(p.density)}">${items}</dl>`;
}

// 10. Stat Comparison
export const infoStatComparison = definePurposeFamily({
  id: 'purpose:info.stat-comparison', group: 'info', sharedCss: SHARED_CSS, label: '수치 비교',
  purpose: '현재 수치와 이전 기간 대비 변화율/증감치를 비교하여 시각적 지표를 제공한다.',
  contexts: ['dashboard', 'any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderStatComparison'},
  variants: {layout: ['horizontal', 'vertical']},
  props: {size: ['medium', 'large']},
  defaults: {layout: 'horizontal', size: 'medium'},
  content: {label: {required: true, type: 'string'}, value: {required: true, type: 'string'}, comparison: {required: true, type: 'string'}, trend: {type: 'up|down|neutral'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '통계 지표 전달'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '카드 폭에 맞춰 유연 배치'},
  a11y: {role: 'region', keyboard: '정적 비교 지표', conditions: ['수치와 증감 비교 명시', 'trend 상승/하락 접근 가능한 전달']},
  pairs: [['--kit-text', '--kit-surface', 7, 'stat value'], ['--kit-action', '--kit-surface', 4.5, 'trend up'], ['--kit-danger', '--kit-surface', 4.5, 'trend down']],
  parents: PARENTS,
  example: {variant: {layout: 'horizontal'}, props: {size: 'medium'}, content: {label: '월간 활성 사용자', value: '124,500', comparison: '+12.4% 지난 달 대비', trend: 'up'}},
  render(ctx) { return renderStatComparison(ctx); },
  css: '',
});
export function renderStatComparison(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.label?.trim() || !c.value?.trim() || !c.comparison?.trim()) throw new TypeError('Stat Comparison requires label, value, comparison');
  const trend = c.trend ?? 'neutral';
  return `<div class="pf-stat-comparison" data-layout="${e(v.layout)}" data-size="${e(p.size)}" data-trend="${e(trend)}"><span class="pf-stat-label">${e(c.label)}</span><span class="pf-stat-value">${e(c.value)}</span><span class="pf-stat-change" role="status">${e(c.comparison)}</span></div>`;
}

/* =========================================================================
 * K. 미디어 및 콘텐츠 (6종)
 * ========================================================================= */

// 1. Responsive Image
export const mediaResponsiveImage = definePurposeFamily({
  id: 'purpose:media.responsive-image', group: 'media', sharedCss: SHARED_CSS, label: '반응형 이미지',
  purpose: '지정된 화면 비율과 최적 맞춤(fit)으로 왜곡 없이 반응하는 이미지를 제공한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderResponsiveImage'},
  variants: {aspectRatio: ['16:9', '4:3', '1:1', '21:9']},
  props: {fit: ['cover', 'contain']},
  defaults: {aspectRatio: '16:9', fit: 'cover'},
  content: {src: {required: true, type: 'image url'}, alt: {required: true, type: 'string'}, caption: {type: 'string'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '반응형 이미지 표시'}],
  responsive: {strategy: 'aspect-ratio', breakpoints: ['640px'], behavior: '비율 고정 및 유연 너비'},
  a11y: {role: 'figure', keyboard: '정적 이미지', conditions: ['의미 있는 alt 텍스트 필수', '반응형 가로세로 비율 유지']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'caption text']],
  parents: PARENTS,
  example: {variant: {aspectRatio: '16:9'}, props: {fit: 'cover'}, content: {src: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20640%20360%22%3E%3Crect%20fill=%22%23ddd%22%20width=%22640%22%20height=%22360%22/%3E%3C/svg%3E', alt: '샘플 풍경 사진', caption: '멋진 풍경'}},
  render(ctx) { return renderResponsiveImage(ctx); },
  css: '',
});
export function renderResponsiveImage(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.src?.trim() || !c.alt?.trim()) throw new TypeError('Responsive Image requires src and alt');
  return `<div class="pf-responsive-image" data-ratio="${e(v.aspectRatio)}" data-fit="${e(p.fit)}"><img src="${e(c.src)}" alt="${e(c.alt)}" loading="lazy" />${c.caption ? `<p class="pf-image-caption">${e(c.caption)}</p>` : ''}</div>`;
}

// 2. Carousel
export const mediaCarousel = definePurposeFamily({
  id: 'purpose:media.carousel', group: 'media', sharedCss: SHARED_CSS, label: '캐러셀',
  purpose: '여러 개의 이미지나 콘텐츠 슬라이드를 순회하는 키보드 접근 가능한 캐러셀을 제공한다.',
  contexts: ['landing', 'commerce', 'any'], bases: [CARD, BUTTON], children: [CARD, BUTTON],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderCarousel'},
  variants: {layout: ['single', 'cards']},
  props: {size: ['medium', 'large']},
  defaults: {layout: 'single', size: 'medium'},
  content: {label: {required: true, type: 'string'}, items: {required: true, type: '배열 {title,src,alt,description?}, 2~8개'}},
  states: ['default', 'focus'],
  interactions: [{on: 'click·Enter·Space', behavior: '이전/다음 슬라이드 이동', runtime: 'INFO_MEDIA_RUNTIME'}, {on: 'ArrowLeft·ArrowRight·Home·End', behavior: '슬라이드 순회', runtime: 'INFO_MEDIA_RUNTIME'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '슬라이드 폭 100%'},
  a11y: {role: 'region', keyboard: 'Tab으로 이전/다음 이동, ArrowLeft/ArrowRight로 슬라이드 순회', conditions: ['aria-roledescription="carousel"', '슬라이드에 aria-roledescription="slide" 및 aria-label', '현재 활성 슬라이드 안내']},
  pairs: [['--kit-text', '--kit-surface', 7, 'carousel controls']],
  parents: PARENTS,
  example: {variant: {layout: 'single'}, props: {size: 'medium'}, content: {label: '주요 제품 소개', items: [{title: '제품 1', src: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20600%20300%22%3E%3Crect%20fill=%22%23eee%22%20width=%22600%22%20height=%22300%22/%3E%3C/svg%3E', alt: '첫 번째 제품'}, {title: '제품 2', src: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20600%20300%22%3E%3Crect%20fill=%22%23ccc%22%20width=%22600%22%20height=%22300%22/%3E%3C/svg%3E', alt: '두 번째 제품'}]}},
  render(ctx) { return renderCarousel(ctx); },
  css: '',
});
export function renderCarousel(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.label?.trim()) throw new TypeError('Carousel requires label');
  if (!Array.isArray(c.items) || c.items.length < 2) throw new TypeError('Carousel requires at least 2 items');
  const slides = c.items.map((it, i) => {
    return `<article class="pf-carousel-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${c.items.length}: ${e(it.title)}"><img src="${e(it.src)}" alt="${e(it.alt)}" /><h3>${e(it.title)}</h3>${it.description ? `<p>${e(it.description)}</p>` : ''}</article>`;
  }).join('');
  return `<section class="pf-carousel" role="region" aria-roledescription="carousel" aria-label="${e(c.label)}" data-carousel data-layout="${e(v.layout)}" data-size="${e(p.size)}"><div class="pf-carousel-track" role="group" aria-label="슬라이드 목록">${slides}</div><div class="pf-carousel-nav"><button type="button" class="pf-carousel-btn" data-carousel-prev aria-label="이전 슬라이드">‹</button><span class="pf-carousel-counter" aria-live="polite">1 / ${c.items.length}</span><button type="button" class="pf-carousel-btn" data-carousel-next aria-label="다음 슬라이드">›</button></div></section>`;
}

// 3. Audio Player UI
export const mediaAudioPlayer = definePurposeFamily({
  id: 'purpose:media.audio-player', group: 'media', sharedCss: SHARED_CSS, label: '오디오 플레이어',
  purpose: '재생/일시정지 제어, 진행률 바, 시간 정보를 갖춘 오디오 재생기 UI를 제공한다.',
  contexts: ['any'], bases: [CARD, BUTTON], children: [CARD, BUTTON],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderAudioPlayer'},
  variants: {layout: ['compact', 'full']},
  props: {size: ['small', 'medium']},
  defaults: {layout: 'full', size: 'medium'},
  content: {title: {required: true, type: 'string'}, duration: {required: true, type: 'string'}, artist: {type: 'string'}},
  states: ['default', 'playing', 'paused', 'focus'],
  interactions: [{on: 'click·Enter·Space', behavior: '재생/일시정지 토글', runtime: 'INFO_MEDIA_RUNTIME'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '컨트롤 너비 유연 처리'},
  a11y: {role: 'region', keyboard: 'Tab으로 재생 버튼과 진행 바 이동, Space로 토글', conditions: ['aria-label="오디오 플레이어"', '재생 버튼에 aria-pressed', '진행 바에 role=progressbar']},
  pairs: [['--kit-text', '--kit-surface', 7, 'audio title'], ['--kit-surface', '--kit-action', 4.5, 'play button']],
  parents: PARENTS,
  example: {variant: {layout: 'full'}, props: {size: 'medium'}, content: {title: '에피소드 1: 디자인 시스템의 미래', artist: '스태틱 킷 팟캐스트', duration: '24:15'}},
  render(ctx) { return renderAudioPlayer(ctx); },
  css: '',
});
export function renderAudioPlayer(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.title?.trim() || !c.duration?.trim()) throw new TypeError('Audio Player requires title and duration');
  return `<div class="pf-audio-player" role="region" aria-label="${e(c.title)} 오디오 플레이어" data-audio-player data-layout="${e(v.layout)}" data-size="${e(p.size)}"><div class="pf-audio-header"><button type="button" class="pf-audio-play-btn" aria-label="재생" aria-pressed="false" data-audio-play>▶</button><div class="pf-audio-meta"><span class="pf-audio-title">${e(c.title)}</span>${c.artist ? `<span class="pf-audio-artist">${e(c.artist)}</span>` : ''}</div></div><div class="pf-audio-bar-row"><span role="progressbar" aria-label="재생 진행률" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" class="pf-audio-progress"><span class="pf-audio-bar" style="inline-size:0%"></span></span><span class="pf-audio-time">0:00 / ${e(c.duration)}</span></div></div>`;
}

// 4. File Preview
export const mediaFilePreview = definePurposeFamily({
  id: 'purpose:media.file-preview', group: 'media', sharedCss: SHARED_CSS, label: '파일 미리보기',
  purpose: '첨부 파일의 확장자 배지, 파일명, 용량 및 다운로드 동작을 명확하게 안내한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderFilePreview'},
  variants: {layout: ['card', 'row']},
  props: {size: ['small', 'medium', 'large']},
  defaults: {layout: 'row', size: 'medium'},
  content: {fileName: {required: true, type: 'string'}, fileSize: {required: true, type: 'string'}, fileType: {type: 'string'}, downloadUrl: {type: 'string'}},
  states: ['default', 'hover', 'focus'],
  interactions: [{on: 'click·Enter', behavior: '파일 다운로드/열기'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '카드 또는 행 레이아웃 전환'},
  a11y: {role: 'group', keyboard: 'Tab으로 다운로드 버튼 이동', conditions: ['파일명과 파일 크기 명시', '다운로드 링크에 명확한 aria-label']},
  pairs: [['--kit-text', '--kit-surface', 7, 'file name'], ['--kit-muted', '--kit-surface', 4.5, 'file size']],
  parents: PARENTS,
  example: {variant: {layout: 'row'}, props: {size: 'medium'}, content: {fileName: '2026_디자인_가이드라인.pdf', fileSize: '4.2 MB', fileType: 'pdf', downloadUrl: '#download'}},
  render(ctx) { return renderFilePreview(ctx); },
  css: '',
});
export function renderFilePreview(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.fileName?.trim() || !c.fileSize?.trim()) throw new TypeError('File Preview requires fileName and fileSize');
  const ftype = (c.fileType ?? 'file').toUpperCase();
  const dl = c.downloadUrl ? `<a href="${e(c.downloadUrl)}" class="pf-file-download" download aria-label="${e(c.fileName)} 다운로드">다운로드</a>` : '';
  return `<div class="pf-file-preview" data-layout="${e(v.layout)}" data-size="${e(p.size)}" role="group" aria-label="${e(c.fileName)}"><span class="pf-file-badge">${e(ftype)}</span><div class="pf-file-details"><span class="pf-file-name">${e(c.fileName)}</span><span class="pf-file-size">${e(c.fileSize)}</span></div>${dl}</div>`;
}

// 5. Image Comparison
export const mediaImageComparison = definePurposeFamily({
  id: 'purpose:media.image-comparison', group: 'media', sharedCss: SHARED_CSS, label: '이미지 비교',
  purpose: 'Before/After 두 이미지를 좌우 분할 슬라이더로 실시간 비교한다.',
  contexts: ['any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderImageComparison'},
  variants: {orientation: ['horizontal']},
  props: {size: ['medium', 'large']},
  defaults: {orientation: 'horizontal', size: 'medium'},
  content: {beforeSrc: {required: true, type: 'image url'}, afterSrc: {required: true, type: 'image url'}, beforeLabel: {type: 'string'}, afterLabel: {type: 'string'}},
  states: ['default', 'focus'],
  interactions: [{on: 'input·drag', behavior: '슬라이더 값에 따라 분할선 이동', runtime: 'INFO_MEDIA_RUNTIME'}, {on: 'ArrowLeft·ArrowRight·Home·End', behavior: '키보드로 분할선 조절', runtime: 'INFO_MEDIA_RUNTIME'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '너비 100% 비율 유지'},
  a11y: {role: 'region', keyboard: 'Tab으로 슬라이더 포커스, ArrowLeft/ArrowRight로 분할선 조절', conditions: ['슬라이더에 aria-label 제공', '이미지에 대체 텍스트 제공', '키보드 조작 완비']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'comparison legend']],
  parents: PARENTS,
  example: {variant: {orientation: 'horizontal'}, props: {size: 'medium'}, content: {beforeSrc: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20600%20340%22%3E%3Crect%20fill=%22%23aaa%22%20width=%22600%22%20height=%22340%22/%3E%3C/svg%3E', afterSrc: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20600%20340%22%3E%3Crect%20fill=%22%23444%22%20width=%22600%22%20height=%22340%22/%3E%3C/svg%3E', beforeLabel: '수정 전', afterLabel: '수정 후'}},
  render(ctx) { return renderImageComparison(ctx); },
  css: '',
});
export function renderImageComparison(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.beforeSrc?.trim() || !c.afterSrc?.trim()) throw new TypeError('Image Comparison requires beforeSrc and afterSrc');
  const bLabel = e(c.beforeLabel ?? 'Before');
  const aLabel = e(c.afterLabel ?? 'After');
  return `<div class="pf-image-comparison" data-image-comparison data-orientation="${e(v.orientation)}" data-size="${e(p.size)}" role="region" aria-label="이미지 비교 슬라이더"><div class="pf-comp-stage"><img src="${e(c.beforeSrc)}" alt="${bLabel}" class="pf-comp-img pf-comp-before" /><div class="pf-comp-clip" style="clip-path:inset(0 0 0 50%)" data-comp-clip><img src="${e(c.afterSrc)}" alt="${aLabel}" class="pf-comp-img pf-comp-after" /></div><input type="range" min="0" max="100" value="50" class="pf-comp-range" data-comp-slider aria-label="비교 분할선 위치" /></div><div class="pf-comp-legend"><span class="pf-comp-label">${bLabel}</span><span class="pf-comp-label">${aLabel}</span></div></div>`;
}

// 6. Figure and Caption
export const mediaFigureCaption = definePurposeFamily({
  id: 'purpose:media.figure-caption', group: 'media', sharedCss: SHARED_CSS, label: '그림과 캡션',
  purpose: '시각 이미지와 설명 캡션, 출처 정보를 표준 figure 및 figcaption 구조로 전달한다.',
  contexts: ['article', 'docs', 'any'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/info-media.mjs', export: 'renderFigureCaption'},
  variants: {placement: ['bottom', 'top']},
  props: {align: ['start', 'center']},
  defaults: {placement: 'bottom', align: 'start'},
  content: {src: {required: true, type: 'image url'}, alt: {required: true, type: 'string'}, caption: {required: true, type: 'string'}, credit: {type: 'string'}},
  states: ['default'],
  interactions: [{on: 'display', behavior: '도판 및 설명 표시'}],
  responsive: {strategy: 'fluid', breakpoints: ['640px'], behavior: '너비 유연 처리'},
  a11y: {role: 'figure', keyboard: '정적 figure 구조', conditions: ['figure 및 figcaption 표준 시맨틱 준수', 'alt 텍스트 제공']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'caption text']],
  parents: PARENTS,
  example: {variant: {placement: 'bottom'}, props: {align: 'start'}, content: {src: 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20600%20300%22%3E%3Crect%20fill=%22%23ddd%22%20width=%22600%22%20height=%22300%22/%3E%3C/svg%3E', alt: '도표 예시', caption: '그림 1. 플랫폼 아키텍처 다이어그램', credit: '출처: 자체 제작'}},
  render(ctx) { return renderFigureCaption(ctx); },
  css: '',
});
export function renderFigureCaption(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (!c.src?.trim() || !c.alt?.trim() || !c.caption?.trim()) throw new TypeError('Figure and Caption requires src, alt, caption');
  const cap = `<figcaption class="pf-figcaption"><p class="pf-caption-text">${e(c.caption)}</p>${c.credit ? `<span class="pf-credit">${e(c.credit)}</span>` : ''}</figcaption>`;
  return `<figure class="pf-figure-caption" data-placement="${e(v.placement)}" data-align="${e(p.align)}">${v.placement === 'top' ? cap : ''}<img src="${e(c.src)}" alt="${e(c.alt)}" loading="lazy" />${v.placement === 'bottom' ? cap : ''}</figure>`;
}

/* =========================================================================
 * 묶음 및 런타임
 * ========================================================================= */

export const INFO_FAMILIES = Object.freeze([
  infoStatusBadge,
  infoAvatar,
  infoAvatarGroup,
  infoAccordion,
  infoCollapsible,
  infoCounter,
  infoNotificationIndicator,
  infoKeyboardShortcut,
  infoMetadataRow,
  infoStatComparison,
]);

export const MEDIA_FAMILIES = Object.freeze([
  mediaResponsiveImage,
  mediaCarousel,
  mediaAudioPlayer,
  mediaFilePreview,
  mediaImageComparison,
  mediaFigureCaption,
]);

export const INFO_MEDIA_FAMILIES = Object.freeze([...INFO_FAMILIES, ...MEDIA_FAMILIES]);

/** 런타임이 필요한 J/K 인터랙티브 항목 */
export const INFO_MEDIA_RUNTIME_IDS = Object.freeze([
  'purpose:info.accordion',
  'purpose:info.collapsible',
  'purpose:media.carousel',
  'purpose:media.image-comparison',
]);

export const INFO_MEDIA_RUNTIME = `(function(){
if(window.__kitInfoMedia)return;window.__kitInfoMedia=true;
var q=function(r,s){return Array.prototype.slice.call(r.querySelectorAll(s))};

document.addEventListener('click',function(ev){
  var t=ev.target;
  // Accordion trigger click
  var accTrig=t.closest&&t.closest('[data-accordion-trigger]');
  if(accTrig){
    var open=accTrig.getAttribute('aria-expanded')==='true';
    var pid=accTrig.getAttribute('aria-controls'),panel=pid&&document.getElementById(pid);
    accTrig.setAttribute('aria-expanded',String(!open));
    var ch=accTrig.querySelector('.pf-accordion-chevron');
    if(ch)ch.textContent=!open?'−':'+';
    if(panel)panel.hidden=open;
    return;
  }
  // Collapsible trigger click
  var colTrig=t.closest&&t.closest('[data-collapsible-trigger]');
  if(colTrig){
    var copen=colTrig.getAttribute('aria-expanded')==='true';
    var cpid=colTrig.getAttribute('aria-controls'),cpanel=cpid&&document.getElementById(cpid);
    colTrig.setAttribute('aria-expanded',String(!copen));
    var arr=colTrig.querySelector('.pf-collapsible-arrow');
    if(arr)arr.textContent=!copen?'▲':'▼';
    if(cpanel)cpanel.hidden=copen;
    return;
  }
  // Carousel prev/next click
  var prevBtn=t.closest&&t.closest('[data-carousel-prev]');
  var nextBtn=t.closest&&t.closest('[data-carousel-next]');
  if(prevBtn||nextBtn){
    var car=(prevBtn||nextBtn).closest('[data-carousel]');
    if(!car)return;
    var track=car.querySelector('.pf-carousel-track');
    var slides=q(car,'.pf-carousel-slide');
    var counter=car.querySelector('.pf-carousel-counter');
    if(!slides.length||!track)return;
    var idx=parseInt(car.dataset.currentIndex||'0',10);
    if(prevBtn)idx=(idx-1+slides.length)%slides.length;
    else idx=(idx+1)%slides.length;
    car.dataset.currentIndex=String(idx);
    track.scrollTo({left:slides[idx].offsetLeft,behavior:'smooth'});
    if(counter)counter.textContent=(idx+1)+' / '+slides.length;
    return;
  }
  // Audio Player play/pause click
  var playBtn=t.closest&&t.closest('[data-audio-play]');
  if(playBtn){
    var isPlaying=playBtn.getAttribute('aria-pressed')==='true';
    playBtn.setAttribute('aria-pressed',String(!isPlaying));
    playBtn.textContent=!isPlaying?'❚❚':'▶';
    return;
  }
});

// Image comparison slider input event
document.addEventListener('input',function(ev){
  var slider=ev.target.closest&&ev.target.closest('[data-comp-slider]');
  if(slider){
    var comp=slider.closest('[data-image-comparison]');
    var clip=comp&&comp.querySelector('[data-comp-clip]');
    if(clip){
      var val=slider.value;
      clip.style.clipPath='inset(0 0 0 '+val+'%)';
    }
  }
});

// Keyboard navigation for Accordion and Carousel
document.addEventListener('keydown',function(ev){
  // Accordion Arrow Navigation
  var accTrig=ev.target.closest&&ev.target.closest('[data-accordion-trigger]');
  if(accTrig){
    var acc=accTrig.closest('[data-accordion]');
    if(!acc)return;
    var trigs=q(acc,'[data-accordion-trigger]');
    var i=trigs.indexOf(accTrig);
    if(i<0)return;
    if(ev.key==='ArrowDown'){ev.preventDefault();trigs[(i+1)%trigs.length].focus();}
    else if(ev.key==='ArrowUp'){ev.preventDefault();trigs[(i-1+trigs.length)%trigs.length].focus();}
    else if(ev.key==='Home'){ev.preventDefault();trigs[0].focus();}
    else if(ev.key==='End'){ev.preventDefault();trigs[trigs.length-1].focus();}
    return;
  }
  // Carousel Arrow Navigation
  var car=ev.target.closest&&ev.target.closest('[data-carousel]');
  if(car&&(ev.key==='ArrowLeft'||ev.key==='ArrowRight')){
    var btn=car.querySelector(ev.key==='ArrowLeft'?'[data-carousel-prev]':'[data-carousel-next]');
    if(btn){ev.preventDefault();btn.click();}
  }
});
})();`;
