/** §6.2 F 카드 중 기존 목적 패밀리로 표현되지 않던 8개 항목. */
import {definePurposeFamily, e} from './kit.mjs';

const CARD = 'base-component:card-surface';
const PARENTS = ['slot:main', 'slot:grid-item', 'slot:aside'];
const TEXT_PAIRS = [['--kit-text', '--kit-surface', 7, 'card content'], ['--kit-muted', '--kit-surface', 4.5, 'card secondary text'], ['--kit-danger', '--kit-danger-soft', 4.5, 'card error']];
const CSS = `.pf-card-extra{min-width:0;overflow-wrap:anywhere;color:var(--kit-text)}.pf-card-extra h3,.pf-card-extra p,.pf-card-extra ul{margin:0}.pf-card-extra h3{font-family:var(--kit-heading);font-size:var(--kit-t-sub);font-weight:var(--pf-title-weight);line-height:1.25;overflow-wrap:anywhere}.pf-card-extra .pf-muted{color:var(--kit-muted)}.pf-card-extra .pf-num{font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.pf-card-extra .pf-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--kit-sp-near)}.pf-card-extra .pf-card-row{display:flex;justify-content:space-between;gap:var(--kit-sp-item);padding-block:var(--kit-sp-near);border-block-end:1px solid var(--kit-border)}.pf-card-extra .pf-card-state{display:inline-flex;align-items:center;gap:var(--kit-sp-tight);font-size:var(--kit-t-small)}.pf-card-extra [data-state=loading] .pf-card-body{min-height:5rem}.pf-card-extra .pf-card-hit{display:block;width:100%;min-height:44px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:start;cursor:pointer}.pf-card-extra .pf-card-hit:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}.pf-card-extra [aria-pressed=true]{box-shadow:inset 0 0 0 2px var(--kit-action)}.pf-card-widget-value{font-size:clamp(1.2rem,14cqi,2rem)}@media(max-width:640px){.pf-card-extra .pf-card-grid{grid-template-columns:minmax(0,1fr)}.pf-card-extra .pf-card-row{flex-wrap:wrap}}`;
const MESSAGE = {message: {type: 'string'}, emptyMessage: {type: 'string'}};

function frame(ctx, {title, content, behavior = 'static', state, href = '#', extra = ''}) {
  const resolvedState = state ?? ctx.props.state ?? 'default';
  const baseState = resolvedState === 'empty' ? 'default' : resolvedState;
  const p = ctx.resolve(CARD, {...ctx.props, behavior, state: baseState, media: 'none'});
  const inert = resolvedState === 'loading' || resolvedState === 'disabled';
  let heading = `<h3 class="kit-ctl-card-title">${e(title)}</h3>`;
  if (behavior === 'selectable') heading = `<button type="button" class="kit-ctl-card-hit pf-card-hit" aria-pressed="${resolvedState === 'selected'}"${inert ? ' aria-disabled="true" disabled' : ''}>${e(title)}</button>`;
  else if (behavior === 'link') heading = inert ? `<span class="kit-ctl-card-hit" role="link" aria-disabled="true">${e(title)}</span>` : `<h3 class="kit-ctl-card-title"><a class="kit-ctl-card-hit" href="${e(href)}">${e(title)}</a></h3>`;
  const attrs = Object.entries(p).filter(([key]) => key !== 'state').map(([key, value]) => `data-${e(key)}="${e(value)}"`).join(' ');
  const body = resolvedState === 'loading'
    ? '<span class="kit-ctl-skel" aria-hidden="true"></span><span class="kit-ctl-skel" data-short aria-hidden="true"></span><span class="kit-ctl-sr" role="status">불러오는 중입니다.</span>'
    : resolvedState === 'empty' ? `${heading}<p role="status">${e(ctx.content.emptyMessage ?? '표시할 데이터가 없습니다.')}</p>`
      : resolvedState === 'error' ? `${heading}<p class="kit-ctl-card-error" role="alert">${e(ctx.content.message ?? '불러오지 못했습니다.')}</p>`
        : `${heading}${content}`;
  return `<article class="kit-ctl-card pf-card pf-card-extra" data-ctl="card" id="${e(ctx.id)}" ${attrs} data-state="${e(resolvedState)}"${extra ? ` ${extra}` : ''}${resolvedState === 'loading' ? ' aria-busy="true"' : ''}><div class="kit-ctl-card-body pf-card-body">${body}</div></article>`;
}

const base = (id, _requirementId, label, purpose, content, example, render, options = {}) => definePurposeFamily({
  id, group: 'card', sharedCss: CSS, label, purpose,
  contexts: ['dashboard', 'data', 'listing', 'commerce'], bases: [CARD], children: [CARD],
  entry: {module: 'src/platform/families/card-extra.mjs', export: options.exportName ?? 'renderCardExtra'},
  variants: {}, props: {size: ['small', 'medium', 'large'], behavior: options.behavior ?? ['static'], state: options.states ?? ['default', 'loading', 'empty', 'error', 'disabled']},
  defaults: {size: 'medium', behavior: options.defaultBehavior ?? 'static', state: 'default'},
  content: {...MESSAGE, ...content}, forbidden: [], needs: options.needs ?? {}, states: options.states ?? ['default', 'hover', 'focus', 'active', 'loading', 'empty', 'error', 'disabled'],
  interactions: [{on: 'loading', behavior: '내용을 스켈레톤으로 바꾸고 aria-busy와 status 문구를 렌더한다', runtime: 'base-component:card-surface'}, {on: 'error', behavior: '오류를 role=alert로 표시한다'}],
  responsive: {strategy: 'container and viewport', breakpoints: ['container 280px', '640px'], behavior: '긴 텍스트와 숫자는 줄바꿈하고 내부 열은 640px 이하에서 한 열로 재배치한다.'},
  a11y: {role: 'article', keyboard: '링크·선택 동작만 Tab 정지점이 되며 기본 상태는 정적이다', conditions: ['all user text is escaped', 'loading and error state is rendered', 'responsive card content wraps']},
  pairs: TEXT_PAIRS, parents: PARENTS, example, render, css: options.css ?? '',
});

export const cardComparison = base('purpose:card.comparison', 'req:comp:f-07-product-comparison-card', '상품 비교 카드', '두 개 이상의 상품을 같은 필드 순서로 비교하고 차이를 행 단위로 읽게 한다.',
  {title: {required: true, type: 'string'}, items: {required: true, type: 'array<{name, price, summary}>', min: 2, max: 3}},
  {variant: {}, props: {}, content: {title: '요금제 비교', items: [{name: '기본', price: '₩9,000', summary: '프로젝트 3개 · 기본 지원'}, {name: '팀', price: '₩29,000', summary: '무제한 프로젝트 · 우선 지원'}] }},
  ctx => { const c = ctx.content; if (!Array.isArray(c.items) || c.items.length < 2 || c.items.length > 3) throw new TypeError('비교 항목은 2~3개여야 합니다'); const grid = `<div class="pf-card-grid" role="group" aria-label="${e(c.title)}">${c.items.map(item => `<section><h4>${e(item.name)}</h4><p class="pf-num">${e(item.price)}</p><p>${e(item.summary)}</p></section>`).join('')}</div>`; return frame(ctx, {title: c.title, content: grid}); }, {exportName: 'renderCardComparison', css: `.pf-card-extra .pf-card-grid section{min-width:0;padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius)}`});

export const cardNotification = base('purpose:card.notification', 'req:comp:f-14-notification-card', '알림 카드', '알림 한 건의 제목·본문·시각과 읽음 상태를 전달한다.',
  {title: {required: true, type: 'string'}, message: {required: true, type: 'string'}, time: {type: 'string'}, unread: {type: 'boolean'}},
  {variant: {}, props: {}, content: {title: '새 댓글', message: '결제 화면 검토에 댓글이 추가됐습니다.', time: '방금 전', unread: true}},
  ctx => { const c = ctx.content; return frame(ctx, {title: c.title, content: `<p>${e(c.message)}</p><p class="pf-muted">${e(c.time ?? '')}</p><span class="pf-card-state" role="status">${c.unread ? '읽지 않음' : '읽음'}</span>`, extra: `data-unread="${c.unread === true}"`}); }, {exportName: 'renderCardNotification'});

export const cardActivity = base('purpose:card.activity', 'req:comp:f-15-activity-card', '활동 카드', '최근 작업 활동을 행위자·행동·시각 순으로 보여 준다.',
  {title: {required: true, type: 'string'}, items: {required: true, type: 'array<{actor, action, time}>', min: 1, max: 8}},
  {variant: {}, props: {}, content: {title: '최근 활동', items: [{actor: '민지', action: '접근 권한을 변경했습니다.', time: '10분 전'}, {actor: '도윤', action: '새 항목을 만들었습니다.', time: '1시간 전'}]}},
  ctx => { const c = ctx.content; return frame(ctx, {title: c.title, content: `<ol>${(c.items ?? []).slice(0, 8).map(x => `<li class="pf-card-row"><span><strong>${e(x.actor)}</strong> ${e(x.action)}</span><time>${e(x.time)}</time></li>`).join('')}</ol>`}); }, {exportName: 'renderCardActivity'});

export const cardIntegration = base('purpose:card.integration', 'req:comp:f-17-integration-card', '연동 카드', '외부 서비스 연동의 이름·연결 상태·설명을 보여 준다.',
  {title: {required: true, type: 'string'}, provider: {required: true, type: 'string'}, statusLabel: {required: true, type: 'string'}, detail: {type: 'string'}},
  {variant: {}, props: {}, content: {title: 'Slack', provider: '워크스페이스', statusLabel: '연결됨', detail: '알림 채널 #product로 전달합니다.'}},
  ctx => { const c = ctx.content; return frame(ctx, {title: c.title, content: `<p class="pf-muted">${e(c.provider)}</p><p class="pf-card-state" role="status">${e(c.statusLabel)}</p><p>${e(c.detail ?? '')}</p>`}); }, {exportName: 'renderCardIntegration'});

export const cardReview = base('purpose:card.review', 'req:comp:f-18-review-card', '후기 카드', '평점·후기·작성자를 함께 보여 주며 별점은 숫자로도 읽힌다.',
  {quote: {required: true, type: 'string'}, author: {required: true, type: 'string'}, rating: {required: true, type: 'number(0..5)'}, date: {type: 'string'}},
  {variant: {}, props: {}, content: {quote: '설치가 간단했고 팀이 바로 사용할 수 있었습니다.', author: '김민지', rating: 4.5, date: '2026-11-20'}},
  ctx => { const c = ctx.content; const rating = Math.max(0, Math.min(5, Number(c.rating) || 0)); return frame(ctx, {title: '사용자 후기', content: `<p class="pf-card-state" aria-label="별점 ${e(rating)}점 / 5점">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}<span>${e(rating)} / 5</span></p><blockquote>${e(c.quote)}</blockquote><p class="pf-muted">${e(c.author)} · ${e(c.date ?? '')}</p>`}); }, {exportName: 'renderCardReview'});

export const cardSelection = base('purpose:card.selection', 'req:comp:f-20-interactive-selection-card', '선택 카드', '선택 목록에서 한 항목을 키보드와 포인터로 선택한다.',
  {title: {required: true, type: 'string'}, description: {type: 'string'}, selectedLabel: {type: 'string'}},
  {variant: {}, props: {behavior: 'selectable'}, content: {title: '월간 결제', description: '매월 결제되며 언제든 변경할 수 있습니다.', selectedLabel: '선택됨'}},
  ctx => { const c = ctx.content, p = ctx.props; return frame(ctx, {title: c.title, behavior: 'selectable', state: p.state, extra: `data-selected="${p.state === 'selected'}"`, content: `<p>${e(c.description ?? '')}</p><span class="pf-card-state" aria-hidden="true">${e(c.selectedLabel ?? '선택됨')}</span>`}); },
  {exportName: 'renderCardSelection', behavior: ['selectable'], defaultBehavior: 'selectable', states: ['default', 'selected', 'loading', 'empty', 'error', 'disabled'], needs: {visual: {minBorderW: 1}}, css: `.pf-card-extra:has([aria-pressed=true]){box-shadow:inset 0 0 0 2px var(--kit-action)}`});

export const cardDashboardWidget = base('purpose:card.dashboard-widget', 'req:comp:f-21-dashboard-widget-card', '대시보드 위젯 카드', '제목·주요 수치·보조 지표를 조합해 대시보드의 한 업무 지표를 요약한다.',
  {title: {required: true, type: 'string'}, value: {required: true, type: 'string'}, unit: {type: 'string'}, details: {type: 'array<{label,value}>'}, message: {type: 'string'}},
  {variant: {}, props: {}, content: {title: '처리 대기', value: '1,284', unit: '건', details: [{label: '오늘 증가', value: '+84'}, {label: 'SLA 이내', value: '96.8%'}]}},
  ctx => { const c = ctx.content; return frame(ctx, {title: c.title, content: `<p class="pf-num pf-card-widget-value">${e(c.value)}${c.unit ? ` <span class="pf-muted">${e(c.unit)}</span>` : ''}</p><dl>${(c.details ?? []).map(x => `<div class="pf-card-row"><dt class="pf-muted">${e(x.label)}</dt><dd class="pf-num">${e(x.value)}</dd></div>`).join('')}</dl>`}); }, {exportName: 'renderCardDashboardWidget'});

export const cardFinancialAsset = base('purpose:card.financial-asset', 'req:comp:f-22-financial-asset-card', '금융 자산 카드', '자산 이름·현재 값·변동을 숫자와 방향 문구로 함께 전달한다.',
  {name: {required: true, type: 'string'}, symbol: {required: true, type: 'string'}, value: {required: true, type: 'string'}, change: {required: true, type: 'string'}, direction: {required: true, type: 'up|down|flat'}, currency: {type: 'string'}},
  {variant: {}, props: {}, content: {name: '삼성전자', symbol: '005930', value: '₩72,400', change: '+1.4%', direction: 'up', currency: 'KRW'}},
  ctx => { const c = ctx.content, words = {up: '상승', down: '하락', flat: '변동 없음'}; if (!Object.hasOwn(words, c.direction)) throw new TypeError('direction은 up·down·flat 중 하나여야 합니다'); return frame(ctx, {title: c.name, content: `<p class="pf-muted">${e(c.symbol)} · ${e(c.currency ?? '')}</p><p class="pf-num">${e(c.value)}</p><p class="pf-card-state" data-direction="${e(c.direction)}"><span class="kit-ctl-sr">${words[c.direction]} </span>${e(c.change)}</p>`}); }, {exportName: 'renderCardFinancialAsset'});

export const CARD_EXTRA_FAMILIES = Object.freeze([cardComparison, cardNotification, cardActivity, cardIntegration, cardReview, cardSelection, cardDashboardWidget, cardFinancialAsset]);

export const CARD_SELECTION_RUNTIME = `(function(){if(window.__kitCardSelection)return;window.__kitCardSelection=true;document.addEventListener('click',function(e){var button=e.target.closest('.pf-card-selection .pf-card-hit[aria-pressed]');if(!button||button.disabled)return;var selected=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(selected));var card=button.closest('.pf-card-selection'),article=button.closest('[data-ctl=card]');if(card)card.setAttribute('data-selected',String(selected));if(article)article.setAttribute('data-selected',String(selected));});})();`;
export const cardSelectionRuntimeFor = ids => ids.includes('purpose:card.selection') ? CARD_SELECTION_RUNTIME : '';

export const renderCardComparison = ctx => cardComparison.render(ctx);
export const renderCardNotification = ctx => cardNotification.render(ctx);
export const renderCardActivity = ctx => cardActivity.render(ctx);
export const renderCardIntegration = ctx => cardIntegration.render(ctx);
export const renderCardReview = ctx => cardReview.render(ctx);
export const renderCardSelection = ctx => cardSelection.render(ctx);
export const renderCardDashboardWidget = ctx => cardDashboardWidget.render(ctx);
export const renderCardFinancialAsset = ctx => cardFinancialAsset.render(ctx);
