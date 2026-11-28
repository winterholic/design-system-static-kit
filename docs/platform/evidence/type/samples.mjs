/**
 * 타이포 시스템 비교용 표본. 모든 시스템이 같은 한영 혼용 문서와 대시보드를 렌더한다.
 * 색·간격 골격은 고정이고(시스템 밖 변수는 하나도 바꾸지 않는다), 달라지는 것은 bindType이 낸 --kit-* 변수뿐이다.
 * 간격은 체계의 density 메타데이터(compact·comfortable·spacious)에서만 정한다: 밀도는 타이포 리듬의 일부이기 때문이다.
 */
import {bindType} from '../../../../src/platform/type.mjs';
import {ROLE_SCALES} from '../../../../src/platform/data/type-materials.mjs';

const GAP = {compact: {pad: 12, gap: 10, section: 20}, comfortable: {pad: 16, gap: 14, section: 32}, spacious: {pad: 24, gap: 20, section: 48}};

const role = (name, family) => `.t-${name}{font-family:var(${family});font-weight:var(--kit-type-${name}-weight);font-size:var(--kit-type-${name}-size);line-height:var(--kit-type-${name}-leading);letter-spacing:var(--kit-type-${name}-tracking);margin:0}`;

export const BASE_CSS = d => `
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#1b1f24;font-family:var(--kit-font);word-break:keep-all;overflow-wrap:anywhere}
${[['display', '--kit-heading'], ['heading', '--kit-heading'], ['sub', '--kit-heading'], ['body', '--kit-font'], ['small', '--kit-font'], ['label', '--kit-font-ui'], ['caption', '--kit-font-ui'], ['numeric', '--kit-font-num'], ['code', '--kit-mono']].map(([n, f]) => role(n, f)).join('\n')}
.t-label{text-transform:var(--kit-case-label);color:#4a5563}.t-caption,.t-small{color:#5a6472}
.t-numeric,.tn{font-variant-numeric:var(--kit-nums);white-space:nowrap}.tn{font-family:var(--kit-font-num)}
.t-code{font-variant-ligatures:none;white-space:pre-wrap}
.page{padding:${d.section}px ${d.pad + 8}px;max-width:1280px;margin:auto}
.doc{max-width:46em;margin:0 auto}.doc>*+*{margin-top:${d.gap}px}.doc h2{margin-top:${d.section}px}
.doc p{margin:0}.codeblock{background:#f3f5f8;border:1px solid #e1e5ea;border-radius:6px;padding:${d.pad - 4}px ${d.pad}px}
/* 표는 좁은 화면에서 가로로 스크롤한다(실제 데이터 표의 흔한 처리). 전역 overflow-wrap:anywhere가 셀을 글자 단위로 찢지 않게 셀은 normal로 되돌린다. */
.tw{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:520px}th,td{overflow-wrap:normal;word-break:keep-all;text-align:left;padding:${Math.round(d.pad / 2)}px ${d.pad - 4}px;border-bottom:1px solid #e1e5ea;vertical-align:baseline}td.n,th.n{text-align:right}
.dash{display:grid;grid-template-columns:200px 1fr;gap:${d.gap}px}.side{border-right:1px solid #e1e5ea;padding-right:${d.pad}px;display:grid;gap:${Math.round(d.gap / 2)}px;align-content:start}
.side a{color:#1b1f24;text-decoration:none;padding:${Math.round(d.pad / 3)}px 0}.main{min-width:0}.main>*+*{margin-top:${d.gap + 4}px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:${d.gap}px}.kpi{border:1px solid #e1e5ea;border-radius:8px;padding:${d.pad}px}.kpi>*+*{margin-top:${Math.round(d.gap / 3)}px}
.up{color:#17673a}.down{color:#a32a35}.bar{height:8px;background:#dfe5ee;border-radius:4px;overflow:hidden}.bar i{display:block;height:100%;background:#2f5fe0}
.toolbar{display:flex;gap:${Math.round(d.gap / 2)}px;flex-wrap:wrap;align-items:center}.btn{border:1px solid #b9c1cc;border-radius:6px;padding:${Math.round(d.pad / 3)}px ${d.pad - 4}px;background:#fff;color:#1b1f24}.btn.p{background:#2f5fe0;border-color:#2f5fe0;color:#fff}
@media(max-width:720px){.page{padding:${d.section}px ${d.pad}px}.dash{grid-template-columns:1fr}.side{border:0;border-bottom:1px solid #e1e5ea;padding:0 0 ${d.pad}px;display:flex;flex-wrap:wrap}.side a{padding:4px 10px 4px 0}}
`;

export const DOC_HTML = `<div class="page"><article class="doc">
<p class="t-label">디자인 시스템 · Design System Ops</p>
<h1 class="t-display">2026년 4분기 운영 리포트와 Q1 로드맵</h1>
<p class="t-body">이번 분기 Design System 도입 팀은 <b>38개</b>에서 <b>52개</b>로 늘었고, 컴포넌트 재사용률(reuse rate)은 71.4%에서 <b>78.9%</b>로 올랐습니다. NPS는 42.5 → 47.8(+5.3pt)입니다.</p>
<p><span class="t-numeric" style="font-size:var(--kit-type-numeric-size)">78.9%</span> <span class="t-caption">컴포넌트 재사용률 reuse rate · 전 분기 71.4%</span></p>
<p class="t-caption">작성 2026-11-22 · 수정 3회 · 읽는 시간 약 4분 · v2.6.0 기준</p>
<h2 class="t-heading">1. 무엇이 달라졌나 What changed</h2>
<p class="t-body">버튼·입력·표 같은 기본 컴포넌트는 그대로 두고, 토큰(token) 이름을 정리했습니다. 한글 본문 사이에 API 이름 <span class="t-code" style="font-size:var(--kit-type-code-size)">getMaterial()</span> 같은 영문 식별자가 섞여도 줄 높이가 흔들리지 않는지 확인했습니다.</p>
<h3 class="t-sub">1.1 측정 결과 Results</h3>
<p class="t-small">숫자는 같은 폭으로 정렬되어야 비교할 수 있습니다. 아래 표의 금액은 ₩ 단위, 비율은 % 단위입니다.</p>
<div class="tw"><table><thead><tr><th class="t-label">항목 Item</th><th class="t-label n">1분기</th><th class="t-label n">2분기</th><th class="t-label n">증감</th></tr></thead><tbody>
<tr><td class="t-body">구독 수익 Revenue</td><td class="n t-body tn">₩1,234,500</td><td class="n t-body tn">₩1,402,900</td><td class="n t-body tn up">+13.6%</td></tr>
<tr><td class="t-body">이탈률 Churn</td><td class="n t-body tn">3.18%</td><td class="n t-body tn">2.74%</td><td class="n t-body tn up">−0.44%p</td></tr>
<tr><td class="t-body">평균 응답 Latency</td><td class="n t-body tn">184ms</td><td class="n t-body tn">171ms</td><td class="n t-body tn up">−13ms</td></tr></tbody></table></div>
<h3 class="t-sub">1.2 설정 예시 Config</h3>
<div class="codeblock"><div class="t-code">const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);
// 한글 주석도 같은 칸에 맞아야 합니다 — 2026-11-22</div></div>
<p class="t-caption">그림 1. 분기별 재사용률 추이 (출처: 내부 대시보드, 2026-Q4)</p>
<h2 class="t-heading">2. 다음 분기 계획 Next quarter</h2>
<p class="t-body">Q1에는 모바일 앱 화면 <b>24개</b>를 같은 토큰으로 옮기고, 접근성 점수 AA 100%를 목표로 합니다. 담당은 platform@example.com, 일정은 2027-01-15까지입니다.</p>
</article></div>`;

export const DASH_HTML = `<div class="page"><div class="dash"><nav class="side"><b class="t-sub">운영 Ops</b><a class="t-body" href="#">개요 Overview</a><a class="t-body" href="#">주문 Orders</a><a class="t-body" href="#">고객 Customers</a><a class="t-body" href="#">설정 Settings</a></nav>
<div class="main"><div class="toolbar"><h1 class="t-heading" style="margin-right:auto">11월 운영 현황 Dashboard</h1><span class="btn t-label">기간 Last 30 days</span><span class="btn p t-label">내보내기 Export</span></div>
<div class="kpis">
<div class="kpi"><div class="t-label">매출 Revenue</div><div class="t-numeric" style="font-size:var(--kit-type-numeric-size)">₩1.28억</div><div class="t-caption up">▲ 12.4% 전월 대비</div></div>
<div class="kpi"><div class="t-label">주문 Orders</div><div class="t-numeric" style="font-size:var(--kit-type-numeric-size)">3,482건</div><div class="t-caption up">▲ 8.1% 전월 대비</div></div>
<div class="kpi"><div class="t-label">전환율 CVR</div><div class="t-numeric" style="font-size:var(--kit-type-numeric-size)">2.74%</div><div class="t-caption down">▼ 0.31%p 전월 대비</div></div>
<div class="kpi"><div class="t-label">환불 Refunds</div><div class="t-numeric" style="font-size:var(--kit-type-numeric-size)">₩231만</div><div class="t-caption">12건 · 처리 대기 3건</div></div></div>
<div><h2 class="t-sub">최근 주문 Recent orders</h2><p class="t-small" style="margin:4px 0 8px">결제 완료와 배송 준비 중인 주문만 표시합니다. 총 3,482건 중 3건.</p>
<div class="tw"><table><thead><tr><th class="t-label">주문 번호 ID</th><th class="t-label">고객 Customer</th><th class="t-label">상태 Status</th><th class="t-label n">금액 Amount</th></tr></thead><tbody>
<tr><td class="t-body tn">#A-20931</td><td class="t-body">김서연 Seoyeon Kim</td><td class="t-body">결제 완료 Paid</td><td class="n t-body tn">₩184,000</td></tr>
<tr><td class="t-body tn">#A-20930</td><td class="t-body">Daniel Park 박다니엘</td><td class="t-body">배송 준비 Packing</td><td class="n t-body tn">₩72,500</td></tr>
<tr><td class="t-body tn">#A-20929</td><td class="t-body">이하준 Hajun Lee</td><td class="t-body">결제 완료 Paid</td><td class="n t-body tn">₩1,203,000</td></tr></tbody></table></div></div>
<div><div class="t-label" style="margin-bottom:6px">재고 소진율 Stock burn · 78%</div><div class="bar"><i style="width:78%"></i></div><p class="t-caption" style="margin-top:6px">기준 2026-11-22 09:00 KST · 다음 갱신 10:00</p></div>
<div class="codeblock"><span class="t-code">GET /api/v1/orders?status=paid&amp;limit=3 → 200 OK (171ms)</span></div>
</div></div></div>`;

/** 체계 하나의 표본 페이지 HTML. kind: 'doc' | 'dash'. */
const CODE_DEFAULT = {size: '13px', weight: 450, lineHeight: 1.55, trackingEm: 0};
/** 구형 조합(tech-erp)은 --kit-type-* 변수를 내지 않는다. 표본이 같은 변수로 읽도록 역할 객체에서 같은 이름으로 채운다. */
function sampleVars(b) {
  const out = {...b.vars};
  for (const name of Object.keys(ROLE_FONT)) {
    const r = b.roles[name] ?? CODE_DEFAULT;
    out[`--kit-type-${name}-size`] ??= r.size; out[`--kit-type-${name}-weight`] ??= String(r.weight); out[`--kit-type-${name}-leading`] ??= String(r.lineHeight); out[`--kit-type-${name}-tracking`] ??= `${r.trackingEm}em`;
  }
  out['--kit-font-ui'] ??= b.vars['--kit-font']; out['--kit-font-num'] ??= b.vars['--kit-font']; out['--kit-code-size'] ??= CODE_DEFAULT.size;
  out['--kit-case-label'] ??= 'none';
  return out;
}
const ROLE_FONT = {display: 1, heading: 1, sub: 1, body: 1, small: 1, label: 1, caption: 1, numeric: 1, code: 1};
export function samplePage(system, kind, {webfonts = false, fontBaseUrl = '/fonts', extraHtml = ''} = {}) {
  const b = bindType(system, {webfonts, fontBaseUrl}), scale = ROLE_SCALES[system.roleScale], d = GAP[scale?.density ?? 'compact'];
  const vars = Object.entries(sampleVars(b)).map(([k, v]) => `${k}:${v}`).join(';');
  const fontCss = webfonts ? (b.webfontCSS || '') : '';
  let bodyContent = kind === 'doc' ? DOC_HTML : DASH_HTML;
  if (extraHtml) {
    bodyContent = bodyContent.includes('</article></div>')
      ? bodyContent.replace('</article></div>', `${extraHtml}</article></div>`)
      : bodyContent + `<div class="page">${extraHtml}</div>`;
  }
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${system.id} · ${kind}</title><style>:root{${vars}}${BASE_CSS(d)}${fontCss ? `\n${fontCss}` : ''}</style><body>${bodyContent}</body></html>`;
}
