import {FLUID_OK, TITLED_PARTS} from '../../src/spacing.mjs';

/** 간격 규칙(docs/spacing.md)을 렌더 결과에서 실측하는 함수. page.evaluate(spacingProbe, options)로 실행한다.
 *  브라우저 안에서 직렬화되어 실행되므로 외부 import·클로저를 쓰지 않는다(필요한 값은 options로 전달).
 *  각 점검은 몇 개를 훑었는지(scanned)를 함께 돌려준다. "찾은 게 없음"은 통과가 아니라 미검사로 표시된다. */
export function spacingProbe(options) {
  const {fluid, fluidTree, titled, minEdge, minEdgeSmall} = options;
  const T = n => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0;
  const tok = {tight: T('--kit-sp-tight'), near: T('--kit-sp-near'), head: T('--kit-sp-head'), gap: T('--kit-gap')};
  const pairMax = tok.near;
  const findings = [], scanned = {head: 0, pair: 0, proximity: 0, edge: 0, scale: 0, orphan: 0, ctrl: 0};
  const num = v => parseFloat(v) || 0;
  const visible = el => {
    if (el.closest('.kit-sr,[hidden],.kit-skip')) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) { const r = a.getBoundingClientRect(); if (r.width <= 1 && r.height <= 1 && getComputedStyle(a).overflow === 'hidden') return false; }
    const closed = el.closest('details:not([open])'); if (closed && !el.closest('summary') && el !== closed) return false;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    // 1×1px로 접어 둔 보조기기용 요소(clip)는 화면에 없는 것으로 본다.
    return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const flag = (code, el, detail) => { if (findings.length < 400) findings.push({code, at: name(el), detail}); };
  const main = document.querySelector('main') ?? document.body;
  const all = [...document.querySelectorAll('body *')].filter(el => !/^(script|style|svg|path|g|circle|rect|defs|lineargradient|stop|use|text|line|polyline|polygon|ellipse|clippath|mask|title|tspan|noscript|option)$/i.test(el.tagName) && !el.closest('svg') && visible(el));
  const isRow = (a, b) => a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const blockKids = el => [...el.children].filter(c => visible(c) && !['absolute', 'fixed'].includes(getComputedStyle(c).position));
  /** 세로로 쌓인 자식들 사이의 간격 목록. 같은 줄에 놓인 자식이 있으면(가로 배치) null. */
  const stackGaps = el => {
    const kids = blockKids(el); if (kids.length < 2) return null;
    const items = kids.map(k => ({k, r: k.getBoundingClientRect()})).sort((a, b) => a.r.top - b.r.top);
    const gaps = [];
    // 카드 푸터는 `margin-top:auto`로 카드 바닥에 고정하는 것이 의도다. 옆 카드와 높이를 맞추느라 생기는 빈 공간은 묶음 간격이 아니다.
    for (let i = 1; i < items.length; i++) { if (isRow(items[i - 1].r, items[i].r)) return null; if (!items[i].k.matches('.kit-card-foot')) gaps.push(items[i].r.top - items[i - 1].r.bottom); }
    return gaps;
  };

  // S02 제목 ↔ 본문: 모든 부품 제목은 같은 규격(headMax 이하)으로 본문에 붙는다. 제목만 있는 머리말(header)은 머리말 전체가 한 덩어리다.
  for (const h of main.querySelectorAll('h1,h2,h3,h4')) {
    if (!visible(h) || h.closest('.kit-art,.kit-empty,.kit-hero,.kit-page-header')) continue;
    let unit = h, soleInHeader = false;
    if (h.parentElement.tagName === 'HEADER' && blockKids(h.parentElement).length === 1) { unit = h.parentElement; soleInHeader = true; }
    const next = unit.nextElementSibling && visible(unit.nextElementSibling) ? unit.nextElementSibling : null, hr = unit.getBoundingClientRect();
    if (!next) { if (!soleInHeader && h.parentElement.matches(titled) && blockKids(h.parentElement).length === 1) { scanned.orphan++; flag('HEAD_ORPHAN', h, '제목만 있고 본문이 없음 (' + name(h.parentElement) + ')'); } continue; }
    const nr = next.getBoundingClientRect(); if (isRow(hr, nr)) continue;
    scanned.head++;
    const gap = Math.round(nr.top - hr.bottom), part = unit.parentElement.className?.toString().split(' ')[0] || unit.parentElement.tagName.toLowerCase();
    const isSectionHead = soleInHeader || unit.matches('.kit-section-head'), nested = isSectionHead && !!unit.closest('.kit-section')?.parentElement?.closest('.kit-section');
    const allowed = isSectionHead ? (nested ? [tok.head] : [tok.gap]) : [tok.head, tok.near, tok.tight];
    if (!allowed.some(a => Math.abs(gap - a) <= 1)) flag('HEAD_GAP', h, `${part}: ${isSectionHead ? '섹션' : '부품'} 제목→${next.tagName.toLowerCase()}${next.className ? '.' + String(next.className).split(' ')[0] : ''} ${gap}px, 허용 ${allowed.join('·')}px (${h.textContent.trim().slice(0, 12)})`);
    if (gap < 0) flag('HEAD_GAP', h, `${part}: 제목과 본문이 겹침 ${gap}px`);
  }

  // S01 라벨 ↔ 값: 붙여 읽는 한 쌍은 pairMax 이하
  for (const sel of ['.kit-metric', '.kit-props dl>div', '.kit-summary dl>div', '.kit-timeline:not([data-variant=release]) li>div', '.kit-timeline[data-variant=log] .kit-rel-body', '.kit-rel-meta', '.kit-md-list li', '.kit-reviews li', '.kit-menu-text', '.kit-list li>div', '.kit-team li>div', '.kit-features li>div']) {
    for (const box of main.querySelectorAll(sel)) {
      if (!visible(box)) continue;
      const gaps = stackGaps(box); if (!gaps) continue;
      scanned.pair++;
      const worst = Math.round(Math.max(...gaps));
      if (worst > pairMax) flag('PAIR_GAP', box, `${sel}: 묶음 안 간격 ${worst}px > ${pairMax}px`);
    }
  }

  // S03 근접: 묶음 안 간격은 그 묶음과 이웃 사이 간격보다 크지 않다. 표면(배경·테두리·큰 안쪽 여백)이 있는 상자는 가장자리가 경계라서 제외한다.
  const surfacedEl = el => { const s = getComputedStyle(el); return (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== getComputedStyle(el.parentElement).backgroundColor) || num(s.borderTopWidth) > 0 || num(s.paddingTop) >= 24; };
  const titleLike = el => /^H[1-6]$/.test(el.tagName) || el.matches('.kit-section-head,.kit-page-header,.kit-eyebrow,.kit-tablist,.kit-profile-banner');
  for (const x of all) {
    if (x.matches('.kit-shell,.kit-body') || !stackGaps(x)) continue;
    const kids = blockKids(x).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    kids.forEach((c, i) => {
      const cg = stackGaps(c); if (!cg || surfacedEl(c) || c.matches('table,tbody,thead,tr,.kit-hero,.kit-hero-copy')) return;
      const cr = c.getBoundingClientRect(), near = [];
      // 제목은 자기 묶음에 붙는 것이 맞으므로 이웃에서 뺀다. 묶음(형제 덩어리) 사이만 비교한다.
      if (i > 0 && !titleLike(kids[i - 1])) near.push(cr.top - kids[i - 1].getBoundingClientRect().bottom);
      if (i < kids.length - 1 && !titleLike(kids[i + 1])) near.push(kids[i + 1].getBoundingClientRect().top - cr.bottom);
      const outer = Math.min(...near.filter(g => g >= 0), 1e9); if (outer === 1e9) return;
      scanned.proximity++;
      const inner = Math.max(...cg);
      if (inner > outer + 2) flag('PROXIMITY', c, `묶음 안 ${Math.round(inner)}px > 이웃과 ${Math.round(outer)}px (${name(x)})`);
    });
  }

  // S04 표면 상자: 글자가 가장자리에 붙지 않는다. 안쪽 여백은 좌우 대칭, 위아래는 큰 차이가 없다.
  const bgOf = el => getComputedStyle(el).backgroundColor, clear = c => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const surfaced = el => {
    if (el === document.body || el.matches('.kit-art-box,.kit-media,.kit-card-media,.kit-bar,.kit-track,.kit-avatar,.kit-thumb,.kit-logo-mark')) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width < 160 || r.height < 48 || s.display === 'inline') return false;
    const hasBg = !clear(s.backgroundColor) && s.backgroundColor !== bgOf(el.parentElement), hasBorder = ['Top', 'Right', 'Bottom', 'Left'].filter(k => num(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && !clear(s['border' + k + 'Color'])).length >= 3;
    return hasBg || hasBorder;
  };
  const owners = new Map();
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement; if (!el || !visible(el) || el.closest('svg,.kit-art,.kit-card-media,.kit-art-box,.kit-sr,.kit-table-scroll,pre')) continue;
    let owner = el; while (owner && owner !== main && !surfaced(owner)) owner = owner.parentElement;
    if (!owner || owner === main) continue;
    const range = document.createRange(); range.selectNodeContents(t);
    for (const rr of range.getClientRects()) { if (rr.width < 1 || rr.height < 1) continue; const o = owners.get(owner) ?? {l: 1e9, r: 1e9, t: 1e9, b: 1e9}; const ob = owner.getBoundingClientRect(); o.l = Math.min(o.l, rr.left - ob.left); o.r = Math.min(o.r, ob.right - rr.right); o.t = Math.min(o.t, rr.top - ob.top); o.b = Math.min(o.b, ob.bottom - rr.bottom); owners.set(owner, o); }
  }
  for (const [owner, m] of owners) {
    scanned.edge++;
    const ob = owner.getBoundingClientRect(), need = ob.height < 80 ? minEdgeSmall : minEdge;
    const sides = Object.entries({좌: m.l, 우: m.r, 상: m.t, 하: m.b}).filter(([, v]) => v < need - 1.5);
    if (sides.length) flag('EDGE', owner, `글자↔가장자리 ${sides.map(([k, v]) => k + ' ' + Math.round(v)).join(', ')}px < ${need}px`);
    const s = getComputedStyle(owner), pt = num(s.paddingTop), pb = num(s.paddingBottom), pl = num(s.paddingLeft), pr = num(s.paddingRight);
    if (Math.abs(pl - pr) > 4) flag('PAD_ASYM', owner, `좌 ${pl} / 우 ${pr}`);
    if (Math.abs(pt - pb) > 8 && Math.min(pt, pb) > 0) flag('PAD_ASYM', owner, `상 ${pt} / 하 ${pb}`);
  }

  // S06 컨트롤: 가로 안쪽 여백 ≥ 세로 × 1.5 (글자 버튼·입력)
  for (const b of main.querySelectorAll('.kit-button,.kit-field input,.kit-field select,.kit-field textarea')) {
    if (!visible(b) || b.matches('[data-variant=ghost]')) continue;
    const s = getComputedStyle(b);
    scanned.ctrl++;
    if (num(s.paddingLeft) > 0 && num(s.paddingLeft) < num(s.paddingTop) * 1.5) flag('CTRL_PAD', b, `가로 ${num(s.paddingLeft)} < 세로 ${num(s.paddingTop)} × 1.5`);
  }

  // S07 격자 밖 값: margin·padding·gap은 4의 배수(또는 1·2px)만. 유동(clamp) 값은 허용 선택자에서만.
  const ok = v => { const a = Math.abs(v); return a === 0 || a === 1 || a === 2 || (Number.isInteger(a) && a % 4 === 0); };
  for (const el of all) {
    if (el.matches(fluid) || el.closest(fluidTree)) continue;
    const s = getComputedStyle(el);
    for (const p of ['marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'rowGap', 'columnGap']) {
      const raw = s[p]; if (raw === 'normal' || raw === 'auto') continue;
      const v = Math.round(num(raw) * 100) / 100;
      // margin: auto 는 flex·grid 안에서 남는 공간의 px로 계산된다. 선언한 값이 아니므로 잰 값에서 뺀다.
      if (p.startsWith('margin') && !ok(v) && /flex|grid/.test(getComputedStyle(el.parentElement).display)) continue;
      scanned.scale++;
      if (!ok(v)) flag('OFF_SCALE', el, `${p}=${v}px`);
    }
  }
  return {findings, scanned};
}

export const PROBE_OPTIONS = {
  // 유동(clamp) 값을 의도적으로 쓰는 요소는 src/spacing.mjs의 FLUID_OK와 같은 목록이다(docs/spacing.md S07).
  fluid: ['.kit-footer', '.kit-header', '.kit-shell', '.kit-main', ...FLUID_OK].join(','),
  fluidTree: ['.kit-footer', '.kit-header', ...FLUID_OK.filter(s => s.startsWith('.'))].join(','),
  titled: TITLED_PARTS.join(','),
  minEdge: 12,
  minEdgeSmall: 8,
};
