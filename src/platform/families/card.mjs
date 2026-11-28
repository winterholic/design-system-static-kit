/**
 * Card 목적 패밀리 8종(컴포넌트 패밀리 작업 소유): KPI, 상품, 기사, 기능 소개, 사용자 정보, 가격, 상태, 갤러리.
 *
 * 책임 나눔: 셸(`article.kit-ctl-card`의 data 속성·테두리·모서리·호버·선택·오류·로딩·비활성·포커스 CSS와 attachCard)은 기반 컴포넌트 card-surface를 그대로 쓴다.
 * 이 파일은 셸 안쪽 구조(값·가격·바이라인·타일 등)와 그 구조의 배치 CSS만 가진다. 외형·모양은 시각 패밀리의 고정 축이 정하므로 여기서 다시 정하지 않는다.
 * 셸 속성 목록이 renderCard와 어긋나지 않는 것은 tests/platform-family-purpose.test.mjs가 본다.
 */
import {icon} from '../../render/icon.mjs';
import {renderChartPreset} from '../../render/chart-presets.mjs';
import {definePurposeFamily, e} from './kit.mjs';
import {CARD_EXTRA_FAMILIES} from './card-extra.mjs';

const CARD = 'base-component:card-surface', BUTTON = 'base-component:button-control';
const SIZES = ['small', 'medium', 'large'];

/** renderCard의 article 속성 순서와 같다. hit은 behavior가 link·selectable일 때 제목 안에 들어가는 단일 상호작용 대상이다. */
function shell(ctx, p, {inner, mediaMarkup = '', title, href = '#', attrs: extra = ''}) {
  const inert = p.state === 'loading' || p.state === 'disabled';
  const label = e(title);
  const hit = p.behavior === 'link' ? (inert ? `<span class="kit-ctl-card-hit" role="link" aria-disabled="true">${label}</span>` : `<a class="kit-ctl-card-hit" href="${e(href)}">${label}</a>`)
    : p.behavior === 'selectable' ? `<button type="button" class="kit-ctl-card-hit" aria-pressed="${p.state === 'selected'}"${inert ? ' aria-disabled="true" disabled' : ''}>${label}</button>` : label;
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  const skeleton = '<span class="kit-ctl-skel" aria-hidden="true"></span><span class="kit-ctl-skel" data-short aria-hidden="true"></span>';
  const body = p.state === 'loading' ? `${skeleton}<span class="kit-ctl-sr" role="status">불러오는 중입니다.</span>` : inner(hit);
  const check = p.behavior === 'selectable' ? `<span class="kit-ctl-card-check" aria-hidden="true">${icon('check')}</span>` : '';
  return `<article class="kit-ctl-card pf-card" data-ctl="card" id="${e(ctx.id)}" ${attrs}${extra ? ' ' + extra : ''}${p.state === 'loading' ? ' aria-busy="true"' : ''}>${p.state === 'loading' ? '' : mediaMarkup}<div class="kit-ctl-card-body pf-card-body">${body}</div>${check}</article>`;
}
const media = (name, cls = '') => `<div class="pf-media${cls ? ' ' + cls : ''}" aria-hidden="true">${icon(name)}</div>`;
const errorLine = (ctx, p) => (p.state === 'error' ? `<p class="kit-ctl-card-error">${icon('alert-circle')}<span>${e(ctx.content.message ?? '불러오지 못했습니다.')}</span></p>` : '');
const num = v => `<span class="pf-num">${e(v)}</span>`;
const baseProps = (ctx, extra = {}) => ctx.resolve(CARD, {...ctx.props, ...extra});
const COMMON_PARENTS = ['slot:main', 'slot:grid-item', 'slot:aside'];

const ICON_NAME = {type: 'icon-name'};
const MESSAGE = {message: {type: 'string'}};
const CARD_STATES = ['default', 'hover', 'focus', 'active', 'loading', 'error', 'disabled'];

// 카드 공통 CSS(sharedCss: 조립기가 한 번만 낸다): 같은 줄 카드의 높이를 맞추고(height:100%), 하단 요소를 바닥에 붙이며(margin-top:auto), 숫자는 줄바꿈하지 않는다.
const SHARED = `.pf-card{height:100%;container-type:inline-size;font-family:var(--kit-font)}.pf-card-body{align-self:stretch;display:flex;flex-direction:column;gap:var(--pf-gap)}.pf-card .kit-ctl-card-title{font-family:var(--kit-heading);font-weight:var(--pf-title-weight);font-size:max(16px,var(--kit-t-sub));text-wrap:balance}.pf-num{white-space:nowrap;font-variant-numeric:tabular-nums;font-family:var(--kit-font)}.pf-label{margin:0;color:var(--kit-muted);font-size:var(--kit-t-label);text-transform:var(--pf-label-case);letter-spacing:var(--pf-label-track);font-weight:600}.pf-media{display:grid;place-items:center;flex:none;box-sizing:border-box;width:100%;aspect-ratio:4/3;border-radius:calc(var(--kit-radius) * .7);background:var(--kit-soft);color:var(--kit-link)}.pf-media .kit-icon{width:36px;height:36px}.pf-media[data-wide]{aspect-ratio:16/9}.pf-card[data-media=top]{flex-direction:column}.pf-card[data-accent=true]{border-top:var(--pf-accent-bar) solid var(--kit-action)}.pf-foot{margin-top:auto;display:flex;flex-wrap:wrap;gap:var(--kit-sp-near);padding-top:var(--kit-sp-near)}.pf-chip{display:inline-flex;align-items:center;gap:var(--kit-sp-tight);padding:2px var(--kit-sp-near);border:1px solid currentColor;border-radius:999px;font-size:max(12px,var(--kit-t-caption));font-weight:600;white-space:nowrap}.pf-chip .kit-icon{width:14px;height:14px}.pf-card[data-state=error]{background:var(--kit-danger-soft)}.pf-card .kit-ctl-card-title.pf-label{margin:0;font-family:var(--kit-font);font-size:var(--kit-t-label);font-weight:600}`;

/* ---------- KPI ---------- */
const spark = (series, label, unit = '') => {
  const rendered = renderChartPreset('chart-preset:mobile-sparkline', {
    title: `${label} 추세`, caption: `${label} 값 변화`, xLabel: '순서', yLabel: '값', unit,
    labels: 'none', // 카드가 이미 주요 값을 보여 준다. 마지막 값 라벨은 카드 너비에서 8px로 줄어 읽히지 않는다.
    categories: series.map((_, index) => String(index + 1)),
    series: [{name: `${label} 추세`, values: series}],
  });
  if (typeof rendered !== 'string') throw new Error(`KPI sparkline chart preset rejected its data: ${JSON.stringify(rendered.errors)}`);
  return `<div class="pf-spark">${rendered}</div>`;
};
const TREND = {up: ['trending-up', '증가'], down: ['trending-down', '감소'], flat: ['minus', '변동 없음']};

export const cardKpi = definePurposeFamily({
  id: 'purpose:card.kpi', group: 'card', sharedCss: SHARED, label: 'KPI 카드',
  purpose: '핵심 지표 하나를 값·증감·추세로 보여 준다. 대시보드 상단 지표 줄에서 같은 높이로 나란히 놓인다.',
  contexts: ['dashboard', 'data'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardKpi'},
  variants: {layout: ['stacked', 'inline'], trend: ['none', 'spark']}, props: {size: SIZES, behavior: ['static', 'link'], state: ['default', 'loading', 'error', 'disabled']},
  defaults: {layout: 'stacked', trend: 'none', size: 'medium', behavior: 'static', state: 'default'},
  content: {label: {required: true, type: 'string'}, value: {required: true, type: 'string'}, unit: {type: 'string'}, delta: {type: 'string'}, deltaDirection: {type: 'up|down|flat'}, caption: {type: 'string'}, series: {type: 'number[]'}, href: {type: 'url'}, ...MESSAGE},
  forbidden: [
    {id: 'KPI_INLINE_SPARK', when: {layout: 'inline', trend: 'spark'}, why: '가로 배치는 값 옆에 증감 칩을 두는 자리라 추세선을 놓을 폭이 없다'},
  ],
  needs: {}, states: CARD_STATES,
  interactions: [{on: 'link: click·Enter', behavior: '카드 전체가 하나의 링크 대상(늘린 링크)'}, {on: 'hover·focus', behavior: '배경·외곽선 변화(기반 카드)'}, {on: 'loading', behavior: '값 자리에 스켈레톤, aria-busy'}],
  responsive: {strategy: 'container', breakpoints: ['container 220px'], behavior: '값 글자는 컨테이너 너비(cqi)에 맞춰 줄고 줄바꿈하지 않는다. 640px 이하에서 inline 배치는 stacked로 접힌다.'},
  a11y: {role: 'article(+link 시 stretched link)', keyboard: 'link일 때 Tab 한 번, Enter로 이동', conditions: ['증감은 아이콘과 숨은 글(증가·감소)로도 전달한다(색만으로 구분하지 않는다)', '추세선은 role=img와 요약 라벨', '값은 한 줄로 읽히며 단위는 값과 함께 읽힌다']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'KPI label'], ['--kit-muted', '--kit-card-hover', 4.5, 'KPI label on filled'], ['--kit-text', '--kit-surface', 7, 'KPI value'], ['--kit-text', '--kit-card-hover', 7, 'KPI value on filled'], ['--kit-link', '--kit-surface', 4.5, 'KPI sparkline']],
  parents: COMMON_PARENTS, example: {variant: {layout: 'stacked', trend: 'spark'}, props: {size: 'medium'}, content: {label: '이번 달 매출', value: '₩12,480,000', delta: '+12.4%', deltaDirection: 'up', caption: '지난달 대비', series: [4, 6, 5, 8, 7, 11, 12]}},
  render(ctx) { return renderCardKpi(ctx); },
  css: `.pf-kpi-head{display:flex;justify-content:space-between;gap:var(--kit-sp-near);align-items:flex-start}.pf-kpi-value{margin:0;display:flex;align-items:baseline;gap:var(--kit-sp-tight);color:var(--kit-text);font-family:var(--kit-heading);font-size:min(calc(var(--kit-t-stat) * var(--pf-stat-scale)),16cqi);line-height:1.1;font-weight:var(--pf-title-weight)}.pf-kpi-unit{font-size:var(--kit-t-small);color:var(--kit-muted);font-weight:500}.pf-kpi-foot{display:flex;flex-wrap:wrap;align-items:center;gap:var(--kit-sp-near);color:var(--kit-muted);font-size:max(12px,var(--kit-t-caption))}.pf-kpi-delta{color:var(--kit-text)}.pf-kpi-delta[data-dir=up] .kit-icon{color:var(--kit-success)}.pf-kpi-delta[data-dir=down] .kit-icon{color:var(--kit-danger)}.pf-spark{width:100%;min-width:0;margin-top:var(--kit-sp-tight)}.pf-spark .kit-chart{margin:0}.pf-spark figcaption{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.pf-spark summary{display:flex;align-items:center;min-block-size:44px;cursor:pointer}.pf-spark summary:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.pf-card[data-layout=inline] .pf-card-body{flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between}@container(max-width:300px){.pf-card[data-layout=inline] .pf-card-body{flex-direction:column;align-items:flex-start;justify-content:flex-start}}`,
});

export function renderCardKpi(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: 'none'});
  const dir = c.deltaDirection ?? 'flat', [trendIcon, trendText] = TREND[dir] ?? TREND.flat;
  const delta = c.delta ? `<span class="pf-chip pf-kpi-delta" data-dir="${e(dir)}">${icon(trendIcon)}<span class="kit-ctl-sr">${trendText} </span>${num(c.delta)}</span>` : '';
  const html = shell(ctx, props, {title: c.label, href: c.href, attrs: `data-layout="${v.layout}"`, inner: hit => `<p class="kit-ctl-card-title pf-label">${hit}</p><p class="pf-kpi-value">${num(c.value)}${c.unit ? `<span class="pf-kpi-unit">${e(c.unit)}</span>` : ''}</p>${(delta || c.caption) ? `<p class="pf-kpi-foot">${delta}${c.caption ? `<span>${e(c.caption)}</span>` : ''}</p>` : ''}${v.trend === 'spark' && Array.isArray(c.series) && c.series.length > 1 ? spark(c.series, c.label, c.unit ?? '') : ''}${errorLine(ctx, props)}`});
  return html;
}

/* ---------- 상품 ---------- */
export const cardProduct = definePurposeFamily({
  id: 'purpose:card.product', group: 'card', sharedCss: SHARED, label: '상품 카드',
  purpose: '상품 한 개를 이미지 자리·이름·가격·평점·담기 동작으로 보여 준다. 목록 격자에서 이미지 비율과 가격 줄이 맞는다.',
  contexts: ['listing', 'commerce'], bases: [CARD, BUTTON], children: [CARD, BUTTON],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardProduct'},
  variants: {layout: ['vertical', 'horizontal'], cta: ['none', 'button']}, props: {size: SIZES, behavior: ['static', 'link', 'selectable'], state: ['default', 'selected', 'loading', 'error', 'disabled']},
  defaults: {layout: 'vertical', cta: 'none', size: 'medium', behavior: 'link', state: 'default'},
  content: {title: {required: true, type: 'string'}, price: {required: true, type: 'string'}, originalPrice: {type: 'string'}, badge: {type: 'string'}, rating: {type: 'number'}, reviews: {type: 'string'}, mediaIcon: ICON_NAME, ctaLabel: {type: 'string'}, href: {type: 'url'}, ...MESSAGE},
  forbidden: [
    {id: 'PRODUCT_NESTED_CTA', when: {behavior: ['link', 'selectable'], cta: 'button'}, why: '카드 전체가 링크·선택 대상이면 안에 버튼을 두면 상호작용이 중첩된다(CARD_NESTED_INTERACTIVE)'},
    {id: 'PRODUCT_SELECTED_NOT_SELECTABLE', when: {behavior: ['static', 'link'], state: 'selected'}, why: '선택 상태는 selectable 카드에서만 있다'},
    {id: 'PRODUCT_INERT_CTA', when: {cta: 'button', state: ['loading', 'disabled', 'selected']}, why: '담기 버튼이 있는 카드는 로딩·비활성·선택 상태를 가질 수 없다(동작 대상이 둘로 갈린다)'},
    {id: 'PRODUCT_HORIZONTAL_SMALL', when: {layout: 'horizontal', size: 'small'}, why: '가로 배치는 이미지 자리와 글을 나란히 놓을 폭이 필요하다'},
  ],
  needs: {}, states: [...CARD_STATES, 'selected'],
  interactions: [{on: 'link: click·Enter', behavior: '상품 상세로 이동(늘린 링크)'}, {on: 'selectable: Space·Enter', behavior: '선택 토글(aria-pressed), 체크 표시', runtime: 'attachCard'}, {on: 'cta: click', behavior: '담기 버튼(기반 버튼)'}],
  responsive: {strategy: 'viewport+container', breakpoints: ['640px'], behavior: '640px 이하에서 horizontal은 vertical로 쌓인다. 이미지 자리는 4:3 비율을 유지한다.'},
  a11y: {role: 'article', keyboard: 'Tab으로 링크/선택 대상 또는 담기 버튼에 한 번', conditions: ['평점은 숫자 글로도 제공(별 아이콘은 장식)', '원가는 <s>와 숨은 글(정가)로 구분', '가격은 줄바꿈하지 않는다']},
  pairs: [['--kit-muted', '--kit-surface', 4.5, 'product meta'], ['--kit-muted', '--kit-card-hover', 4.5, 'product meta on filled'], ['--kit-text', '--kit-surface', 7, 'price'], ['--kit-link', '--kit-soft', 4.5, 'media icon'], ['--kit-onAccent', '--kit-accent', 4.5, 'badge']],
  parents: COMMON_PARENTS, example: {variant: {layout: 'vertical', cta: 'none'}, props: {behavior: 'link'}, content: {title: '무선 노이즈캔슬링 헤드폰', price: '₩189,000', originalPrice: '₩239,000', badge: '-21%', rating: 4.6, reviews: '1,284', mediaIcon: 'music', href: '#headphone'}},
  render(ctx) { return renderCardProduct(ctx); },
  css: `.pf-card[data-layout=horizontal]{flex-direction:row}.pf-card[data-layout=horizontal] .pf-media{width:36%;aspect-ratio:1/1}.pf-price{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--kit-sp-near);margin:0;font-family:var(--kit-heading)}.pf-price-now{font-size:var(--kit-t-price);font-weight:var(--pf-title-weight);color:var(--kit-text)}.pf-price-was{color:var(--kit-muted);font-size:var(--kit-t-small)}.pf-rating{display:flex;align-items:center;gap:var(--kit-sp-tight);margin:0;color:var(--kit-muted);font-size:max(12px,var(--kit-t-caption))}.pf-rating .kit-icon{width:14px;height:14px;color:var(--kit-warning)}.pf-media{position:relative}.pf-badge{position:absolute;inset:var(--kit-sp-near) auto auto var(--kit-sp-near);padding:2px var(--kit-sp-near);border-radius:calc(var(--kit-radius) * .5);background:var(--kit-accent);color:var(--kit-onAccent);font-size:max(12px,var(--kit-t-caption));font-weight:700;white-space:nowrap}@media(max-width:640px){.pf-card[data-layout=horizontal]{flex-direction:column}.pf-card[data-layout=horizontal] .pf-media{width:100%;aspect-ratio:4/3}}`,
});

export function renderCardProduct(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: v.layout === 'vertical' ? 'top' : 'start'});
  const tile = `<div class="pf-media" aria-hidden="true">${icon(c.mediaIcon ?? 'bag')}${c.badge ? `<span class="pf-badge">${e(c.badge)}</span>` : ''}</div>`;
  const rating = typeof c.rating === 'number' ? `<p class="pf-rating">${icon('star')}<span>${num(c.rating.toFixed(1))}</span>${c.reviews ? `<span>리뷰 ${num(c.reviews)}</span>` : ''}</p>` : '';
  const price = `<p class="pf-price"><span class="pf-price-now">${num(c.price)}</span>${c.originalPrice ? `<s class="pf-price-was">${num(c.originalPrice)}<span class="kit-ctl-sr"> 정가</span></s>` : ''}</p>`;
  const cta = v.cta === 'button' ? `<div class="pf-foot">${ctx.button('primary', {props: {size: props.size === 'large' ? 'medium' : 'small', content: 'icon-start'}, content: {label: c.ctaLabel ?? '담기', icon: 'cart'}})}</div>` : '';
  const html = shell(ctx, props, {title: c.title, href: c.href, mediaMarkup: tile, attrs: `data-layout="${v.layout}"`, inner: hit => `<h3 class="kit-ctl-card-title">${hit}</h3>${rating}${price}${errorLine(ctx, props)}${cta}`});
  return html;
}

/* ---------- 기사 ---------- */
export const cardArticle = definePurposeFamily({
  id: 'purpose:card.article', group: 'card', sharedCss: SHARED, label: '기사 카드',
  purpose: '글 한 편을 분류·제목·요약·작성자·읽는 시간으로 보여 준다. 읽기 목록과 홈 피드에서 제목이 먼저 읽힌다.',
  contexts: ['listing', 'content'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardArticle'},
  variants: {layout: ['stacked', 'split', 'text']}, props: {size: SIZES, behavior: ['link', 'static'], state: ['default', 'loading', 'error', 'disabled']},
  defaults: {layout: 'stacked', size: 'medium', behavior: 'link', state: 'default'},
  content: {eyebrow: {type: 'string'}, title: {required: true, type: 'string'}, excerpt: {type: 'string'}, author: {type: 'string'}, date: {type: 'iso-date'}, readTime: {type: 'string'}, mediaIcon: ICON_NAME, href: {type: 'url'}, ...MESSAGE},
  forbidden: [
    {id: 'ARTICLE_SPLIT_SMALL', when: {layout: 'split', size: 'small'}, why: '좌우 분할은 이미지 자리와 제목을 나란히 둘 폭이 필요해 small에서는 제목이 한 단어씩 끊긴다'},
  ],
  needs: {}, states: CARD_STATES,
  interactions: [{on: 'link: click·Enter', behavior: '기사로 이동(제목이 링크, 카드 전체가 대상)'}, {on: 'hover·focus', behavior: '제목 밑줄과 배경 변화'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '640px 이하에서 split은 stacked로 쌓인다. 제목은 keep-all로 줄바꿈한다.'},
  a11y: {role: 'article', keyboard: 'Tab 한 번(제목 링크), Enter 이동', conditions: ['날짜는 <time datetime>', '이미지 자리는 장식(aria-hidden)', '요약은 3줄로 자르되 전체 글은 DOM에 남긴다(line-clamp)']},
  pairs: [['--kit-link', '--kit-surface', 4.5, 'article title link'], ['--kit-muted', '--kit-surface', 4.5, 'excerpt·byline'], ['--kit-muted', '--kit-card-hover', 4.5, 'excerpt on filled'], ['--kit-link', '--kit-soft', 4.5, 'media icon']],
  parents: COMMON_PARENTS, example: {variant: {layout: 'stacked'}, props: {behavior: 'link'}, content: {eyebrow: '디자인 시스템', title: '재료와 패밀리를 분리하면 무엇이 달라지나', excerpt: '같은 버튼 구현 위에 시각 언어만 바꿔 입히는 방식을 두 달 동안 운영한 기록입니다.', author: '민지', date: '2026-11-22', readTime: '6분', mediaIcon: 'book', href: '#article'}},
  render(ctx) { return renderCardArticle(ctx); },
  css: `.pf-card[data-layout=split]{flex-direction:row}.pf-card[data-layout=split] .pf-media{width:40%;aspect-ratio:1/1}.pf-card[data-layout=text] .pf-media{display:none}.pf-eyebrow{margin:0;color:var(--kit-link);font-size:var(--kit-t-caption);font-weight:700;text-transform:var(--pf-label-case);letter-spacing:var(--pf-label-track)}.pf-excerpt{margin:0;color:var(--kit-muted);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;word-break:keep-all;overflow-wrap:anywhere}.pf-byline{margin:0;margin-top:auto;display:flex;flex-wrap:wrap;gap:var(--kit-sp-near);color:var(--kit-muted);font-size:var(--kit-t-caption)}.pf-byline>*+*::before{content:"·";margin-inline-end:var(--kit-sp-near)}.pf-card[data-layout=text]{border-inline-start:var(--pf-accent-bar) solid var(--kit-action)}@media(max-width:640px){.pf-card[data-layout=split]{flex-direction:column}.pf-card[data-layout=split] .pf-media{width:100%;aspect-ratio:4/3}}`,
});

export function renderCardArticle(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: v.layout === 'stacked' ? 'top' : v.layout === 'split' ? 'start' : 'none'});
  const mediaMarkup = v.layout === 'text' ? '' : media(c.mediaIcon ?? 'image');
  const byline = (c.author || c.date || c.readTime) ? `<p class="pf-byline">${c.author ? `<span>${e(c.author)}</span>` : ''}${c.date ? `<time datetime="${e(c.date)}">${e(c.date)}</time>` : ''}${c.readTime ? `<span>${e(c.readTime)} 읽기</span>` : ''}</p>` : '';
  const html = shell(ctx, props, {title: c.title, href: c.href, mediaMarkup, attrs: `data-layout="${v.layout}"`, inner: hit => `${c.eyebrow ? `<p class="pf-eyebrow">${e(c.eyebrow)}</p>` : ''}<h3 class="kit-ctl-card-title">${hit}</h3>${c.excerpt ? `<p class="pf-excerpt">${e(c.excerpt)}</p>` : ''}${errorLine(ctx, props)}${byline}`});
  return html;
}

/* ---------- 기능 소개 ---------- */
export const cardFeature = definePurposeFamily({
  id: 'purpose:card.feature', group: 'card', sharedCss: SHARED, label: '기능 소개 카드',
  purpose: '제품 기능 하나를 아이콘·제목·설명으로 소개한다. 랜딩 페이지의 3~4열 기능 줄에서 같은 높이로 놓인다.',
  contexts: ['landing', 'marketing'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardFeature'},
  variants: {align: ['start', 'center'], icon: ['badge', 'plain']}, props: {size: SIZES, behavior: ['static', 'link'], state: ['default', 'loading', 'disabled']},
  defaults: {align: 'start', icon: 'badge', size: 'medium', behavior: 'static', state: 'default'},
  content: {icon: {required: true, type: 'icon-name'}, title: {required: true, type: 'string'}, body: {required: true, type: 'string'}, linkLabel: {type: 'string'}, href: {type: 'url'}},
  forbidden: [
    {id: 'FEATURE_CENTER_LINK', when: {align: 'center', behavior: 'link'}, why: '가운데 정렬 카드는 링크 밑줄과 제목 위치가 흔들려 링크 대상으로 읽히지 않는다'},
  ],
  needs: {}, states: ['default', 'hover', 'focus', 'active', 'loading', 'disabled'],
  interactions: [{on: 'link: click·Enter', behavior: '기능 상세로 이동'}, {on: 'hover·focus', behavior: '배경 변화(링크일 때만)'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '격자 열 수는 부모가 정한다. 카드는 한 열에서도 아이콘·제목·설명이 세로로 유지된다.'},
  a11y: {role: 'article', keyboard: 'link일 때 Tab 한 번', conditions: ['아이콘은 장식(aria-hidden)이며 의미는 제목이 전달', '제목은 h3']},
  pairs: [['--kit-link', '--kit-soft', 4.5, 'icon badge'], ['--kit-link', '--kit-surface', 4.5, 'plain icon·link'], ['--kit-muted', '--kit-surface', 4.5, 'feature body'], ['--kit-muted', '--kit-card-hover', 4.5, 'feature body on filled']],
  parents: COMMON_PARENTS, example: {variant: {align: 'start', icon: 'badge'}, props: {}, content: {icon: 'shield', title: '권한을 역할로 묶어 관리', body: '팀과 프로젝트마다 다른 접근 범위를 한 화면에서 정하고, 변경 이력을 남깁니다.'}},
  render(ctx) { return renderCardFeature(ctx); },
  css: `.pf-feature-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:calc(var(--kit-radius) * .8);color:var(--kit-link)}.pf-feature-icon[data-icon=badge]{background:var(--kit-soft)}.pf-feature-icon .kit-icon{width:24px;height:24px}.pf-feature-icon[data-icon=plain]{width:auto;height:auto}.pf-card[data-align=center] .pf-card-body{align-items:center;text-align:center}.pf-feature-link{margin-top:auto;font-weight:600}`,
});

export function renderCardFeature(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: 'none'});
  const html = shell(ctx, props, {title: c.title, href: c.href, attrs: `data-align="${v.align}"`, inner: hit => `<span class="pf-feature-icon" data-icon="${v.icon}" aria-hidden="true">${icon(c.icon)}</span><h3 class="kit-ctl-card-title">${hit}</h3><p class="kit-ctl-card-text">${e(c.body)}</p>${c.linkLabel ? `<span class="pf-feature-link kit-ctl-card-text" aria-hidden="true">${e(c.linkLabel)} ${icon('arrow-right')}</span>` : ''}`});
  return html;
}

/* ---------- 사용자 정보 ---------- */
export const cardProfile = definePurposeFamily({
  id: 'purpose:card.profile', group: 'card', sharedCss: SHARED, label: '사용자 정보 카드',
  purpose: '사람 한 명을 아바타·이름·역할·상태·연락 동작으로 보여 준다. 팀 목록과 상세 사이드 패널에서 쓴다.',
  contexts: ['dashboard', 'listing', 'settings'], bases: [CARD, BUTTON], children: [CARD, BUTTON],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardProfile'},
  variants: {layout: ['stacked', 'row'], actions: ['none', 'buttons']}, props: {size: SIZES, state: ['default', 'loading', 'error', 'disabled']},
  defaults: {layout: 'stacked', actions: 'none', size: 'medium', state: 'default'},
  content: {name: {required: true, type: 'string'}, role: {type: 'string'}, initials: {type: 'string'}, presence: {type: 'online|away|offline'}, email: {type: 'string'}, stats: {type: '{label,value}[]'}, primaryLabel: {type: 'string'}, secondaryLabel: {type: 'string'}, ...MESSAGE},
  forbidden: [
    {id: 'PROFILE_ROW_STATS', when: {layout: 'row', size: 'small', actions: 'buttons'}, why: 'small 한 줄 배치에 버튼까지 두면 이름 자리가 남지 않는다'},
    {id: 'PROFILE_INERT_ACTIONS', when: {actions: 'buttons', state: ['loading', 'disabled']}, why: '로딩·비활성 카드에는 동작 버튼을 둘 수 없다(CARD_INERT_ACTIONS)'},
  ],
  needs: {}, states: ['default', 'loading', 'error', 'disabled'],
  interactions: [{on: 'buttons: click', behavior: '연락·팔로우 같은 동작(기반 버튼)'}, {on: 'presence', behavior: '상태 점과 글자로 온라인·자리비움·오프라인을 함께 표시'}],
  responsive: {strategy: 'container', breakpoints: ['container 260px'], behavior: 'row는 컨테이너가 좁아지면 stacked로 접힌다. 이메일은 말줄임 없이 줄바꿈한다.'},
  a11y: {role: 'article', keyboard: '버튼은 Tab 순서', conditions: ['아바타 이니셜은 aria-hidden, 이름이 접근 가능한 이름', '상태는 색 점만이 아니라 글자로도 전달', '통계는 dl/dt/dd']},
  pairs: [['--kit-link', '--kit-soft', 4.5, 'avatar initials'], ['--kit-muted', '--kit-surface', 4.5, 'role·email'], ['--kit-muted', '--kit-card-hover', 4.5, 'role on filled'], ['--kit-text', '--kit-surface', 7, 'stats value']],
  parents: COMMON_PARENTS, example: {variant: {layout: 'stacked', actions: 'buttons'}, props: {}, content: {name: '김민지', role: '프로덕트 디자이너', initials: '민', presence: 'online', email: 'minji@example.com', stats: [{label: '프로젝트', value: '12'}, {label: '리뷰', value: '48'}], primaryLabel: '메시지', secondaryLabel: '프로필'}},
  render(ctx) { return renderCardProfile(ctx); },
  css: `.pf-avatar{position:relative;display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;background:var(--kit-soft);color:var(--kit-link);font-weight:700;font-family:var(--kit-heading)}.pf-presence{display:inline-flex;align-items:center;gap:var(--kit-sp-tight);color:var(--kit-muted);font-size:var(--kit-t-caption)}.pf-presence::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--kit-muted)}.pf-presence[data-presence=online]::before{background:var(--kit-success)}.pf-presence[data-presence=away]::before{background:var(--kit-warning)}.pf-who{display:grid;gap:2px;min-width:0}.pf-who .kit-ctl-card-title{margin:0}.pf-profile-top{display:flex;align-items:center;gap:var(--kit-sp-item)}.pf-card[data-layout=stacked] .pf-profile-top{flex-direction:column;text-align:center}.pf-stats{display:flex;gap:var(--kit-sp-inset-s,16px);margin:0}.pf-stats div{display:grid;gap:2px}.pf-stats dt{color:var(--kit-muted);font-size:var(--kit-t-caption)}.pf-stats dd{margin:0;color:var(--kit-text);font-weight:700;font-family:var(--kit-heading)}.pf-card[data-layout=stacked] .pf-stats{justify-content:center}.pf-card[data-layout=stacked] .pf-foot{justify-content:center}.pf-mail{margin:0;color:var(--kit-muted);font-size:var(--kit-t-small);overflow-wrap:anywhere}@container(max-width:260px){.pf-card[data-layout=row] .pf-profile-top{flex-direction:column;text-align:center}}`,
});

const PRESENCE = {online: '온라인', away: '자리비움', offline: '오프라인'};
export function renderCardProfile(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: 'none'});
  const stats = Array.isArray(c.stats) && c.stats.length ? `<dl class="pf-stats">${c.stats.map(s => `<div><dt>${e(s.label)}</dt><dd>${num(s.value)}</dd></div>`).join('')}</dl>` : '';
  const actions = v.actions === 'buttons' ? `<div class="pf-foot">${ctx.button('primary', {props: {size: 'small'}, content: {label: c.primaryLabel ?? '메시지'}})}${ctx.button('secondary', {props: {size: 'small'}, content: {label: c.secondaryLabel ?? '프로필'}})}</div>` : '';
  const html = shell(ctx, props, {title: c.name, attrs: `data-layout="${v.layout}"`, inner: () => `<div class="pf-profile-top"><span class="pf-avatar" aria-hidden="true">${e(c.initials ?? c.name.slice(0, 1))}</span><div class="pf-who"><h3 class="kit-ctl-card-title">${e(c.name)}</h3>${c.role ? `<p class="kit-ctl-card-text">${e(c.role)}</p>` : ''}${c.presence ? `<span class="pf-presence" data-presence="${e(c.presence)}">${PRESENCE[c.presence] ?? e(c.presence)}</span>` : ''}</div></div>${c.email ? `<p class="pf-mail">${e(c.email)}</p>` : ''}${stats}${errorLine(ctx, props)}${actions}`});
  return html;
}

/* ---------- 가격 ---------- */
export const cardPricing = definePurposeFamily({
  id: 'purpose:card.pricing', group: 'card', sharedCss: SHARED, label: '가격 카드',
  purpose: '요금제 하나를 이름·가격·기간·포함 기능·신청 버튼으로 보여 준다. 요금제 비교 줄에서 가격과 버튼 위치가 모든 카드에서 같은 줄에 맞는다.',
  contexts: ['landing', 'marketing', 'commerce'], bases: [CARD, BUTTON], children: [CARD, BUTTON],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardPricing'},
  variants: {emphasis: ['standard', 'featured']}, props: {size: ['medium', 'large'], state: ['default', 'selected', 'loading', 'disabled']},
  defaults: {emphasis: 'standard', size: 'medium', state: 'default'},
  content: {plan: {required: true, type: 'string'}, price: {required: true, type: 'string'}, period: {type: 'string'}, description: {type: 'string'}, features: {required: true, type: 'string[]'}, ctaLabel: {required: true, type: 'string'}, badge: {type: 'string'}},
  forbidden: [
    {id: 'PRICING_SELECTED_STATIC', when: {state: 'selected'}, why: '가격 카드는 안에 신청 버튼이 있어 카드 전체를 선택 대상으로 쓸 수 없다(상호작용 중첩). 선택 표현이 필요하면 featured를 쓴다'},
    {id: 'PRICING_INERT_CTA', when: {state: ['loading', 'disabled']}, why: '신청 버튼이 있는 카드는 로딩·비활성 상태를 가질 수 없다(CARD_INERT_ACTIONS). 품절은 버튼을 disabled로 둔다'},
  ],
  needs: {}, states: ['default', 'hover', 'focus', 'loading', 'disabled'],
  interactions: [{on: 'cta: click', behavior: '신청(기반 버튼). featured는 solid, 나머지는 secondary'}, {on: 'features', behavior: '체크 아이콘 목록(정적)'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '부모 격자가 열 수를 정한다. 카드 안에서 가격 줄은 줄바꿈하지 않고 버튼은 바닥에 붙는다.'},
  a11y: {role: 'article + ul', keyboard: 'Tab으로 신청 버튼', conditions: ['기능 목록은 ul/li, 체크 아이콘은 장식', '추천 배지는 글자로 전달', '가격과 기간은 함께 읽힌다(월·연 단위)']},
  pairs: [['--kit-text', '--kit-surface', 7, 'plan price'], ['--kit-text', '--kit-card-hover', 7, 'plan price on filled'], ['--kit-muted', '--kit-surface', 4.5, 'period·description'], ['--kit-muted', '--kit-card-hover', 4.5, 'period on filled'], ['--kit-success', '--kit-surface', 4.5, 'feature check'], ['--kit-onAccent', '--kit-accent', 4.5, 'featured badge']],
  parents: COMMON_PARENTS, example: {variant: {emphasis: 'featured'}, props: {}, content: {plan: '팀', price: '₩29,000', period: '월 / 사용자', description: '10명 이하 팀을 위한 협업 기능', features: ['무제한 프로젝트', '역할 기반 권한', '변경 이력 90일', '우선 지원'], ctaLabel: '무료로 시작', badge: '추천'}},
  render(ctx) { return renderCardPricing(ctx); },
  css: `.pf-plan{display:flex;justify-content:space-between;align-items:center;gap:var(--kit-sp-near);margin:0}.pf-plan .kit-ctl-card-title{margin:0}.pf-plan-badge{padding:2px var(--kit-sp-near);border-radius:999px;background:var(--kit-accent);color:var(--kit-onAccent);font-size:var(--kit-t-caption);font-weight:700;white-space:nowrap}.pf-plan-price{display:flex;align-items:baseline;flex-wrap:nowrap;gap:var(--kit-sp-near);margin:0;color:var(--kit-text);font-family:var(--kit-heading)}.pf-plan-price .pf-num{font-size:min(calc(var(--kit-t-price) * var(--pf-stat-scale)),14cqi);font-weight:var(--pf-title-weight);line-height:1.1}.pf-plan-period{color:var(--kit-muted);font-size:var(--kit-t-small);font-weight:500}.pf-features{list-style:none;margin:0;padding:0;display:grid;gap:var(--kit-sp-near)}.pf-features li{display:flex;gap:var(--kit-sp-near);align-items:flex-start;color:var(--kit-text);font-size:var(--kit-t-small)}.pf-features .kit-icon{flex:none;width:18px;height:18px;margin-top:2px;color:var(--kit-success)}.pf-card[data-emphasis=featured]{border-width:2px;border-style:solid;border-color:var(--kit-action);box-shadow:var(--kit-shadow-hover)}.pf-card[data-emphasis=featured] .pf-foot{padding-top:var(--kit-sp-item)}.pf-foot [class*=kit-ctl-button-host],.pf-foot .kit-ctl-button{width:100%}`,
});

export function renderCardPricing(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: 'none', behavior: 'static'});
  const html = shell(ctx, props, {title: c.plan, attrs: `data-emphasis="${v.emphasis}"`, inner: () => `<div class="pf-plan"><h3 class="kit-ctl-card-title">${e(c.plan)}</h3>${c.badge ? `<span class="pf-plan-badge">${e(c.badge)}</span>` : ''}</div>${c.description ? `<p class="kit-ctl-card-text">${e(c.description)}</p>` : ''}<p class="pf-plan-price">${num(c.price)}${c.period ? `<span class="pf-plan-period">${e(c.period)}</span>` : ''}</p><ul class="pf-features">${c.features.map(f => `<li>${icon('check')}<span>${e(f)}</span></li>`).join('')}</ul><div class="pf-foot">${ctx.button(v.emphasis === 'featured' ? 'primary' : 'secondary', {props: {size: 'medium'}, content: {label: c.ctaLabel}})}</div>`});
  return html;
}

/* ---------- 상태 ---------- */
const STATUS = {success: ['check-circle', '정상'], warning: ['alert-triangle', '주의'], danger: ['x-circle', '장애'], info: ['info', '안내'], neutral: ['clock', '대기']};
export const cardStatus = definePurposeFamily({
  id: 'purpose:card.status', group: 'card', sharedCss: SHARED, label: '상태 카드',
  purpose: '시스템·작업·결제 같은 대상의 상태를 아이콘·상태 글자·세부 내용·시각으로 보여 준다. 상태 대시보드 격자에서 쓴다.',
  contexts: ['dashboard', 'data'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardStatus'},
  variants: {tone: ['success', 'warning', 'danger', 'info', 'neutral'], layout: ['compact', 'detailed']}, props: {size: SIZES, behavior: ['static', 'link'], state: ['default', 'loading', 'error', 'disabled']},
  defaults: {tone: 'success', layout: 'detailed', size: 'medium', behavior: 'static', state: 'default'},
  content: {title: {required: true, type: 'string'}, statusLabel: {type: 'string'}, detail: {type: 'string'}, updated: {type: 'string'}, href: {type: 'url'}, ...MESSAGE},
  forbidden: [
    {id: 'STATUS_COMPACT_DETAIL', when: {layout: 'compact', size: 'small'}, why: 'compact·small은 한 줄이라 세부 내용과 시각을 둘 자리가 없어 의미가 줄어든다(detailed를 쓴다)'},
    {id: 'STATUS_DANGER_DISABLED', when: {tone: 'danger', state: 'disabled'}, why: '장애 상태 카드를 비활성으로 흐리면 가장 중요한 알림이 가장 약해 보인다'},
  ],
  needs: {}, states: CARD_STATES,
  interactions: [{on: 'link: click·Enter', behavior: '상세 로그로 이동'}, {on: 'loading', behavior: '상태 확인 중 스켈레톤(role=status)'}],
  responsive: {strategy: 'container', breakpoints: ['container 240px'], behavior: '컨테이너가 좁아지면 시각 줄이 아래로 내려간다. 상태 글자는 줄바꿈하지 않는다.'},
  a11y: {role: 'article', keyboard: 'link일 때 Tab 한 번', conditions: ['상태는 아이콘 모양과 글자로 전달한다(색만으로 구분하지 않는다)', 'danger는 role=status가 아니라 일반 텍스트(자동 낭독 폭주 방지)', '시각은 <time> 또는 상대 표현과 함께']},
  pairs: [['--kit-success', '--kit-surface', 4.5, 'status success'], ['--kit-warning', '--kit-surface', 4.5, 'status warning'], ['--kit-danger', '--kit-surface', 4.5, 'status danger'], ['--kit-info', '--kit-surface', 4.5, 'status info'], ['--kit-muted', '--kit-surface', 4.5, 'detail'], ['--kit-muted', '--kit-card-hover', 4.5, 'detail on filled'], ['--kit-text', '--kit-card-hover', 7, 'status text on filled']],
  parents: COMMON_PARENTS, example: {variant: {tone: 'warning', layout: 'detailed'}, props: {}, content: {title: '결제 연동', statusLabel: '지연', detail: '승인 응답이 평소보다 느립니다. 재시도는 자동으로 진행됩니다.', updated: '3분 전'}},
  render(ctx) { return renderCardStatus(ctx); },
  css: `.pf-status{display:inline-flex;align-items:center;gap:var(--kit-sp-near);margin:0;font-weight:700;font-size:var(--kit-t-small);white-space:nowrap;color:var(--kit-text)}.pf-status .kit-icon{width:20px;height:20px}.pf-card[data-tone=success] .pf-status .kit-icon{color:var(--kit-success)}.pf-card[data-tone=warning] .pf-status .kit-icon{color:var(--kit-warning)}.pf-card[data-tone=danger] .pf-status .kit-icon{color:var(--kit-danger)}.pf-card[data-tone=info] .pf-status .kit-icon{color:var(--kit-info)}.pf-card[data-tone=neutral] .pf-status .kit-icon{color:var(--kit-muted)}.pf-card[data-tone=danger]{border-color:var(--kit-danger)}.pf-status-row{display:flex;justify-content:space-between;align-items:center;gap:var(--kit-sp-near);flex-wrap:wrap}.pf-updated{margin:0;margin-top:auto;color:var(--kit-muted);font-size:max(12px,var(--kit-t-caption))}.pf-card[data-layout=compact] .pf-card-body{flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap}`,
});

export function renderCardStatus(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: 'none'});
  const [ic, defaultLabel] = STATUS[v.tone];
  const html = shell(ctx, props, {title: c.title, href: c.href, attrs: `data-layout="${v.layout}" data-tone="${v.tone}"`, inner: hit => `<div class="pf-status-row"><h3 class="kit-ctl-card-title">${hit}</h3><p class="pf-status">${icon(ic)}<span>${e(c.statusLabel ?? defaultLabel)}</span></p></div>${v.layout === 'detailed' && c.detail ? `<p class="kit-ctl-card-text">${e(c.detail)}</p>` : ''}${v.layout === 'detailed' && c.updated ? `<p class="pf-updated">${e(c.updated)}</p>` : ''}${errorLine(ctx, props)}`});
  return html;
}

/* ---------- 갤러리 ---------- */
export const cardGallery = definePurposeFamily({
  id: 'purpose:card.gallery', group: 'card', sharedCss: SHARED, label: '갤러리 카드',
  purpose: '이미지 묶음 한 개를 타일 격자와 제목·개수로 보여 준다. 앨범·컬렉션 목록과 이미지 선택 화면에서 쓴다.',
  contexts: ['listing', 'content'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/card.mjs', export: 'renderCardGallery'},
  variants: {layout: ['grid', 'mosaic'], tiles: ['view', 'select']}, props: {size: SIZES, behavior: ['static', 'link'], state: ['default', 'loading', 'error', 'disabled']},
  defaults: {layout: 'grid', tiles: 'view', size: 'medium', behavior: 'static', state: 'default'},
  content: {title: {required: true, type: 'string'}, count: {type: 'string'}, items: {required: true, type: '{label,icon}[] (3~6)'}, href: {type: 'url'}, ...MESSAGE},
  forbidden: [
    {id: 'GALLERY_LINK_SELECT', when: {behavior: 'link', tiles: 'select'}, why: '카드 전체가 링크이면 타일 선택(체크박스)과 상호작용이 중첩된다'},
    {id: 'GALLERY_MOSAIC_SMALL', when: {layout: 'mosaic', size: 'small'}, why: '모자이크는 큰 타일 하나와 작은 타일을 함께 놓을 폭이 필요하다'},
    {id: 'GALLERY_SELECT_LOADING', when: {tiles: 'select', state: ['loading', 'disabled']}, why: '로딩·비활성 카드의 타일은 선택할 수 없다'},
  ],
  needs: {}, states: CARD_STATES,
  interactions: [{on: 'select: Space', behavior: '타일 체크박스 토글(네이티브 input, :checked로 표시)'}, {on: 'link: click·Enter', behavior: '앨범으로 이동'}],
  responsive: {strategy: 'container', breakpoints: ['container 280px'], behavior: '타일 격자는 3열이며 컨테이너가 280px 아래로 줄면 2열이 된다. 타일은 정사각형을 유지한다.'},
  a11y: {role: 'article + group', keyboard: 'select일 때 타일마다 Tab·Space', conditions: ['타일은 이미지 자리이고 각 타일에 이름(label)이 있다', '선택은 체크박스의 checked와 체크 아이콘으로 전달한다', '타일 그룹 role=group + 제목 연결']},
  pairs: [['--kit-link', '--kit-soft', 4.5, 'tile icon'], ['--kit-muted', '--kit-surface', 4.5, 'count'], ['--kit-muted', '--kit-card-hover', 4.5, 'count on filled'], ['--kit-onAction', '--kit-action', 4.5, 'selected tile check']],
  parents: COMMON_PARENTS, example: {variant: {layout: 'grid', tiles: 'view'}, props: {behavior: 'link'}, content: {title: '제주 여행', count: '24장', items: [{label: '해변', icon: 'droplet'}, {label: '카페', icon: 'coffee'}, {label: '숲길', icon: 'leaf'}, {label: '숙소', icon: 'bed'}, {label: '식당', icon: 'utensils'}, {label: '노을', icon: 'sun'}], href: '#jeju'}},
  render(ctx) { return renderCardGallery(ctx); },
  css: `.pf-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--kit-sp-tight);margin:0;padding:0;list-style:none}.pf-tiles[data-layout=mosaic]{grid-template-columns:repeat(4,minmax(0,1fr))}.pf-tiles[data-layout=mosaic] li:first-child{grid-column:span 2;grid-row:span 2}.pf-tile{position:relative;display:grid;place-items:center;aspect-ratio:1/1;border-radius:calc(var(--kit-radius) * .5);background:var(--kit-soft);color:var(--kit-link)}.pf-tile .kit-icon{width:24px;height:24px}.pf-tile-name{position:absolute;inset:auto 0 0;padding:2px 4px;font-size:var(--kit-t-caption);text-align:center;color:var(--kit-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pf-tile input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer}.pf-tile:has(input:checked){outline:3px solid var(--kit-action);outline-offset:-3px;background:var(--kit-card-active)}.pf-tile:has(input:focus-visible){outline:3px solid var(--kit-focus);outline-offset:2px}.pf-tile .pf-tile-check{display:none;position:absolute;inset:4px 4px auto auto;width:20px;height:20px;border-radius:50%;background:var(--kit-action);color:var(--kit-onAction);place-items:center}.pf-tile .pf-tile-check .kit-icon{width:14px;height:14px}.pf-tile:has(input:checked) .pf-tile-check{display:grid}.pf-count{margin:0;color:var(--kit-muted);font-size:var(--kit-t-caption)}@container(max-width:280px){.pf-tiles:not([data-layout=mosaic]){grid-template-columns:repeat(2,minmax(0,1fr))}}`,
});

export function renderCardGallery(ctx) {
  const {content: c, variant: v} = ctx, props = baseProps(ctx, {media: 'none'});
  const items = c.items.slice(0, v.layout === 'mosaic' ? 5 : 6);
  const tile = (it, i) => `<li><label class="pf-tile">${v.tiles === 'select' ? `<input type="checkbox" aria-label="${e(it.label)} 선택"><span class="pf-tile-check" aria-hidden="true">${icon('check')}</span>` : ''}${icon(it.icon ?? 'image')}<span class="pf-tile-name">${e(it.label)}</span></label></li>`;
  const html = shell(ctx, props, {title: c.title, href: c.href, attrs: `data-layout="${v.layout}"`, inner: hit => `<h3 class="kit-ctl-card-title" id="${e(ctx.id)}-t">${hit}</h3><ul class="pf-tiles" data-layout="${v.layout}" role="group" aria-labelledby="${e(ctx.id)}-t">${items.map(tile).join('')}</ul>${c.count ? `<p class="pf-count">${e(c.count)}</p>` : ''}${errorLine(ctx, props)}`});
  return html;
}

export const CARD_FAMILIES = Object.freeze([cardKpi, cardProduct, cardArticle, cardFeature, cardProfile, cardPricing, cardStatus, cardGallery, ...CARD_EXTRA_FAMILIES]);
