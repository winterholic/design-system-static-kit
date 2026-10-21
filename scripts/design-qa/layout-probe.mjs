/** 배치 품질 실측(6차). page.evaluate(layoutProbe, options)로 실행하며 브라우저 안에서 직렬화되므로 외부 import·클로저를 쓰지 않는다.
 *  4차 간격 실측(spacing-probe)과 5차 글줄 실측(text-probe)은 "부분의 일관성"을 잰다. 이 프로브는 "구성의 품질"을 잰다.
 *  EMPTY_CELL   표면 상자(카드·벤토 칸·차트 등)의 한 구간이 비어 있음: 내용 사이·위·아래 빈 공간이 크고 상자 높이의 큰 비율
 *  TIGHT_ROW    낮은 표면 줄(일정·목록 줄)의 글자가 가장자리에 붙음(4차 EDGE는 높이 48px 미만을 건너뛴다)
 *  MEASURE      본문 한 줄 수용 글자 수가 읽기 범위(14~75자)를 벗어남(글자 종류별 평균 폭으로 환산)
 *  BIG_NARROW   큰 글자(≥24px)가 칸 폭 8em 미만에 3줄, 12em 미만에 4줄 이상으로 접힘
 *  HIER_INVERT  머리말 위계가 뒤집힘: 페이지 h1보다 큰 섹션 머리말, 섹션 머리말보다 큰 카드 제목
 *  GRID_ORPHAN  같은 크기 카드의 격자에서 마지막 줄에 한 칸만 남음(3개 이상, 2열 이상)
 *  BAND_ASYM    색 띠(섹션)의 내용이 위·아래 여백이 크게 비대칭이라 한쪽으로 쏠림
 *  EDGE_VIEW    글자가 화면 좌우 가장자리 16px 안에 놓임(가로 스크롤 영역 제외)
 *  각 점검의 훑은 수(scanned)와 정렬선 수(aligns, 측정만)를 함께 돌려준다. */
export function layoutProbe(options) {
  const {emptyMin, emptyRatio, rowEdgeX, rowEdgeY, measureMin, measureMax, narrowEm, bigPx, viewEdge, scroll} = options;
  const vw = document.documentElement.clientWidth;
  const findings = [], scanned = {grid: 0, empty: 0, row: 0, measure: 0, big: 0, hier: 0, band: 0, edge: 0};
  const num = v => parseFloat(v) || 0;
  const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const flag = (code, el, detail) => { if (findings.length < 300) findings.push({code, at: name(el), detail}); };
  const clear = c => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';
  const visible = el => {
    if (el.closest('.kit-sr,[hidden],.kit-skip,script,style')) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) { const ar = a.getBoundingClientRect(); if (ar.width <= 1 && ar.height <= 1 && getComputedStyle(a).overflow === 'hidden') return false; }
    const closed = el.closest('details:not([open])'); if (closed && !el.closest('summary') && el !== closed) return false;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const main = document.querySelector('main') ?? document.body;
  const bgOf = el => getComputedStyle(el).backgroundColor;
  const isSurface = el => {
    if (el === document.body || el.matches('svg,.kit-art-box,.kit-bar,.kit-track,.kit-avatar,.kit-badge,.kit-tag,.kit-chip,.kit-button,.kit-icon,.kit-card-icon,.kit-tablist *,.kit-brand-mark')) return false;
    const s = getComputedStyle(el);
    if (s.display === 'inline') return false;
    const hasBg = !clear(s.backgroundColor) && s.backgroundColor !== bgOf(el.parentElement);
    // 한 변에만 선이 있는 요소(구분선·강조선)는 상자가 아니다. 두 변 이상이거나 배경이 있어야 한다.
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(k => num(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && !clear(s['border' + k + 'Color'])).length;
    return hasBg || sides >= 2;
  };
  const textRects = el => {
    const out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      if (!t.textContent.trim()) continue;
      const p = t.parentElement; if (!p || p.closest('svg,.kit-sr,.kit-art,script,style') || !visible(p)) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 4) out.push(r);
    }
    return out;
  };
  const lineTops = rects => new Set(rects.map(r => Math.round(r.top / Math.max(4, r.height * .45)))).size;
  const hasOwnText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);

  // EMPTY_CELL: 표면 상자 안의 빈 구간. 미디어(이미지·svg·차트)도 내용으로 센다.
  const contentBoxes = el => {
    const out = [];
    for (const c of el.querySelectorAll('*')) {
      if (!visible(c) || c.closest('.kit-sr')) continue;
      const kids = [...c.children].filter(k => visible(k));
      const leaf = hasOwnText(c) || c.matches('svg,img,canvas,input,select,textarea,button,hr,.kit-bar,.kit-track,.kit-art-box,.kit-card-icon,.kit-avatar,table') || (kids.length === 0);
      if (!leaf) continue;
      if (c.parentElement.closest('svg')) continue;
      const r = c.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      out.push(r);
    }
    return out;
  };
  for (const el of main.querySelectorAll('*')) {
    if (!visible(el) || !isSurface(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 160 || r.width < 160 || el.matches('.kit-table-wrap,.kit-calendar,.kit-cal-grid,.kit-kanban,.kit-lane,.kit-md-list,.kit-form,.kit-hero,.kit-section,.kit-cta,.kit-footer,.kit-header,.kit-shell,.kit-body,.kit-main,.kit-nav') || el.closest('.kit-calendar,.kit-art')) continue;
    // 안에 표면 상자를 둔 컨테이너는 그 자식들이 각자 검사받는다.
    if ([...el.children].some(c => visible(c) && isSurface(c) && c.getBoundingClientRect().height > r.height * .6)) continue;
    const boxes = contentBoxes(el).sort((a, b) => a.top - b.top); if (!boxes.length) continue;
    scanned.empty++;
    const s = getComputedStyle(el), padT = num(s.paddingTop), padB = num(s.paddingBottom);
    let cursor = r.top + padT, worst = 0, where = '';
    for (const b of boxes) { const gap = b.top - cursor; if (gap > worst) { worst = gap; where = cursor === r.top + padT ? '위' : '내용 사이'; } cursor = Math.max(cursor, b.bottom); }
    const tail = r.bottom - padB - cursor; if (tail > worst) { worst = tail; where = '아래'; }
    if (worst > emptyMin && worst > r.height * emptyRatio) flag('EMPTY_CELL', el, `${where} 빈 공간 ${Math.round(worst)}px / 상자 ${Math.round(r.height)}px (${Math.round(worst / r.height * 100)}%) 폭 ${Math.round(r.width)}px`);
  }

  // TIGHT_ROW: 낮은 표면 줄 (높이 18~47px, 폭 160px 이상)의 글자가 가장자리에 붙음
  for (const el of main.querySelectorAll('li,tr,div,a,p,dd,dt')) {
    if (!visible(el) || !isSurface(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 18 || r.height >= 48 || r.width < 160 || el.closest('.kit-art,.kit-tablist,.kit-nav,.kit-sr,table,.kit-chart')) continue;
    const tr = textRects(el); if (!tr.length) continue;
    scanned.row++;
    const left = Math.min(...tr.map(x => x.left)) - r.left, right = r.right - Math.max(...tr.map(x => x.right)), top = Math.min(...tr.map(x => x.top)) - r.top, bottom = r.bottom - Math.max(...tr.map(x => x.bottom));
    // 왼쪽 강조선(border-left)은 가장자리가 아니라 장식이므로 선 너비를 뺀 안쪽에서 잰다.
    const bl = num(getComputedStyle(el).borderLeftWidth);
    const bad = [['좌', left - bl, rowEdgeX], ['우', right, rowEdgeX], ['상', top, rowEdgeY], ['하', bottom, rowEdgeY]].filter(([, v, need]) => v < need - .5);
    if (bad.length) flag('TIGHT_ROW', el, bad.map(([k, v, need]) => `${k} ${Math.round(v)}px<${need}`).join(', ') + ` 높이 ${Math.round(r.height)}px`);
  }

  // MEASURE: 한 줄에 들어가는 글자 수(수용량) = 폭 / (글자 크기 × 글자 종류별 평균 폭)
  const avgEm = text => { let w = 0, n = 0; for (const ch of text) { n++; w += /[가-힣ㄱ-ㅎ]/.test(ch) ? 1 : /[A-Z]/.test(ch) ? .66 : /[a-z]/.test(ch) ? .52 : /[0-9]/.test(ch) ? .56 : /\s/.test(ch) ? .28 : .5; } return n ? w / n : 1; };
  for (const el of main.querySelectorAll('p,li,dd,blockquote,figcaption')) {
    if (!visible(el) || el.closest('pre,code,.kit-art,.kit-mock,.kit-table-wrap,.kit-chart,.kit-calendar,.kit-tablist,.kit-nav,.kit-footer,[data-narrow-ok]') || el.querySelector('p,li,div,ul,ol,h1,h2,h3,h4')) continue;
    const text = el.textContent.replace(/\s+/g, ' ').trim(); if (text.length < 40) continue;
    const cs = getComputedStyle(el), fs = num(cs.fontSize) || 16, w = el.getBoundingClientRect().width;
    const cap = w / (fs * avgEm(text)), tr = textRects(el), lines = tr.length ? lineTops(tr) : 1;
    scanned.measure++;
    if (cap > measureMax && lines >= 2) flag('MEASURE', el, `줄당 약 ${Math.round(cap)}자(>${measureMax}) 폭 ${Math.round(w)}px ${fs}px`);
    else if (cap < measureMin && lines >= 3) flag('MEASURE', el, `줄당 약 ${Math.round(cap)}자(<${measureMin}) ${lines}줄 폭 ${Math.round(w)}px`);
  }

  // BIG_NARROW: 큰 글자가 좁은 칸에 3줄 이상으로 접힘
  for (const el of main.querySelectorAll('h1,h2,h3,h4,p,dd,strong,span,div')) {
    if (!hasOwnText(el) || !visible(el)) continue;
    const fs = num(getComputedStyle(el).fontSize); if (fs < bigPx || el.closest('.kit-art,.kit-mock')) continue;
    const tr = textRects(el), lines = lineTops(tr), w = el.getBoundingClientRect().width;
    scanned.big++;
    // 세 줄은 칸이 8em 아래일 때, 네 줄 이상은 12em 아래일 때만 결함이다(긴 제목이 좁은 화면에서 세 줄로 접히는 것은 정상).
    if ((lines >= 3 && w / fs < narrowEm * 2 / 3) || (lines >= 4 && w / fs < narrowEm)) flag('BIG_NARROW', el, `${fs}px ${lines}줄 칸 ${Math.round(w)}px (${(w / fs).toFixed(1)}em) “${el.textContent.trim().slice(0, 14)}”`);
  }

  // HIER_INVERT: 위계 뒤집힘
  {
    const sizeOf = el => num(getComputedStyle(el).fontSize);
    const h1 = [...main.querySelectorAll('h1')].filter(visible), heads = [...main.querySelectorAll('.kit-section-head h2,section>header h2')].filter(visible);
    const h1fs = h1.length ? Math.max(...h1.map(sizeOf)) : 0;
    scanned.hier += heads.length;
    if (h1fs) for (const h of heads) if (sizeOf(h) > h1fs + .5) flag('HIER_INVERT', h, `섹션 머리말 ${sizeOf(h)}px > 페이지 h1 ${h1fs}px`);
    for (const sec of main.querySelectorAll('.kit-section')) {
      const hd = sec.querySelector(':scope > .kit-section-inner > .kit-section-head h2, :scope > .kit-section-head h2'); if (!hd || !visible(hd)) continue;
      const hfs = sizeOf(hd);
      for (const c of sec.querySelectorAll('.kit-card h3,.kit-card h2,.kit-card h4,.kit-plan h3,.kit-plan h2,.kit-list h3,.kit-list h2')) { scanned.hier++; if (visible(c) && sizeOf(c) >= hfs) flag('HIER_INVERT', c, `카드 제목 ${sizeOf(c)}px ≥ 섹션 머리말 ${hfs}px`); }
    }
  }

  // GRID_ORPHAN: 같은 크기 항목이 줄바꿈된 격자의 마지막 줄에 한 칸만 남음(벤토처럼 칸 크기가 다른 격자는 제외)
  for (const g of main.querySelectorAll('*')) {
    const gs = getComputedStyle(g); if (gs.display !== 'grid' || !visible(g) || g.matches('.kit-bento,.kit-cal-grid') || g.closest('.kit-calendar,[data-layout=masonry],[data-layout=showcase]')) continue;
    const kids = [...g.children].filter(k => visible(k) && getComputedStyle(k).position !== 'absolute'); if (kids.length < 3) continue;
    const rects = kids.map(k => k.getBoundingClientRect());
    if (new Set(rects.map(r => Math.round(r.width / 4))).size > 2) continue;
    const rows = new Map(); for (const r of rects) { const key = Math.round(r.top / 6); rows.set(key, (rows.get(key) ?? 0) + 1); }
    const counts = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]); if (counts.length < 2 || !counts.slice(0, -1).every(c => c === counts[0])) continue;
    scanned.grid++;
    // 마지막 칸이 줄 전체를 쓰면 의도한 마무리다.
    if (rects.at(-1).width > rects[0].width * 1.5) continue;
    if (counts.at(-1) === 1 && counts[0] >= 2) flag('GRID_ORPHAN', g, kids.length + '개 ' + counts[0] + '열 마지막 줄 1개 (' + counts.join('+') + ')');
  }

  // BAND_ASYM: 색 띠 안 내용의 위·아래 여백
  for (const sec of main.querySelectorAll('.kit-section,.kit-cta,.kit-hero')) {
    if (!visible(sec)) continue;
    const s = getComputedStyle(sec), r = sec.getBoundingClientRect();
    if (clear(s.backgroundColor) || s.backgroundColor === bgOf(sec.parentElement) || r.height < 120) continue;
    // 상자(카드)의 바깥 가장자리까지가 내용이다: 글자 끝을 재면 카드 안쪽 여백이 띠 여백으로 잡힌다.
    const inner = sec.querySelector(':scope > .kit-section-inner') ?? sec;
    const boxes = [...inner.children].filter(k => visible(k)).map(k => k.getBoundingClientRect()).filter(b => b.height > 2); if (!boxes.length) continue;
    const top = Math.min(...boxes.map(b => b.top)) - r.top, bottom = r.bottom - Math.max(...boxes.map(b => b.bottom));
    scanned.band++;
    if (Math.abs(top - bottom) > 24 && Math.max(top, bottom) > 1.8 * Math.max(Math.min(top, bottom), 8)) flag('BAND_ASYM', sec, `내용↔띠 위 ${Math.round(top)}px / 아래 ${Math.round(bottom)}px`);
  }

  // EDGE_VIEW: 글자가 화면 가장자리에 붙음
  for (const el of main.querySelectorAll('h1,h2,h3,h4,p,li,dd,dt,span,a,strong,label,td,th,figcaption,summary')) {
    if (!hasOwnText(el) || !visible(el) || el.closest(scroll + ',.kit-art,.kit-mock,svg,.kit-hero[data-variant=cover]')) continue;
    for (const r of textRects(el).slice(0, 1)) {
      scanned.edge++;
      if (r.left < viewEdge - .5 || r.right > vw - viewEdge + .5) { flag('EDGE_VIEW', el, `글자 ${Math.round(r.left)}~${Math.round(r.right)}px / 화면 ${vw}px`); break; }
    }
  }

  // 정렬선 수(측정만): 본문 글자 왼쪽 시작선이 몇 종류인가
  const lefts = new Set();
  for (const el of main.querySelectorAll('h1,h2,h3,p,dt,summary')) { if (!visible(el) || el.closest('.kit-art,.kit-mock,table,.kit-nav,[style*=center]') || getComputedStyle(el).textAlign === 'center') continue; const r = el.getBoundingClientRect(); lefts.add(Math.round(r.left / 8) * 8); }
  return {findings, scanned, aligns: lefts.size};
}

export const LAYOUT_OPTIONS = {
  emptyMin: 96, emptyRatio: .38, rowEdgeX: 8, rowEdgeY: 6,
  measureMin: 14, measureMax: 75, narrowEm: 12, bigPx: 24, viewEdge: 16,
  scroll: '.kit-kanban,.kit-table-scroll,.kit-reel,.kit-tablist,.kit-nav,.kit-code,pre,.kit-steps[data-layout=horizontal],.kit-timeline[data-orientation=horizontal]',
};
