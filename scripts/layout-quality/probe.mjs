/** 역할 기반 레이아웃 실측(브라우저 B단계). page.evaluate(layoutProbe, options)로 실행한다.
 *  브라우저 안에서 직렬화되어 실행되므로 외부 import·클로저를 쓰지 않는다(옵션만 인자로 받는다).
 *
 *  글줄 수·칸 폭을 같은 기준으로 모든 글에 대어 보지 않고, 먼저 글의 역할(role)을 정하고 역할마다 다른 규칙을 적용한다.
 *    heading  h1~h6. 짧아야 하고 넓은 칸을 두고 일찍 접히면 안 된다.
 *    lead     제목 바로 아래 한두 문장 요약. 제목처럼 칸을 넉넉히 쓴다.
 *    desc     dd·짧은 항목 설명. 읽는 폭 상한을 일부러 두지 않는 짧은 글.
 *    body     긴 본문. 한 줄 45~80ch(글자 크기 기준 폭)이면 줄바꿈이 많아도 정상이다.
 *    label    eyebrow·캡션·dt 같은 짧은 이름. 한 줄이 원칙이다.
 *    control  버튼·칩·탭·메뉴 항목. 한 줄이 원칙이다.
 *    value    가격·지표 숫자. 쪼개 읽으면 안 된다.
 *    cell     표 칸. 짧은 토큰이 중간에서 끊기면 안 된다.
 *  `data-layout-role="<role>"`로 역할을 직접 정할 수 있고(가장 가까운 조상 값을 상속),
 *  `data-layout-ignore`가 붙은 서브트리는 점검하지 않는다.
 *
 *  진단 코드마다 {code, severity, role, locator, text, evidence, suggestion}을 돌려준다. severity: error | warn | info.
 *  어떤 점검이 몇 개를 훑었는지(scanned)도 함께 준다. 훑은 것이 0이면 "통과"가 아니라 "대상 없음"이다. */
export function layoutProbe(options) {
  const T = options.thresholds, SEL = options.selectors, MAX_PER_CODE = options.maxPerCode ?? 12;
  const findings = [], counts = {}, scanned = {text: 0, wrap: 0, clip: 0, svg: 0, overflow: 0, smallText: 0, svgText: 0, bar: 0}, roles = {};
  const vw = document.documentElement.clientWidth;
  const r1 = n => Math.round(n * 10) / 10;

  const SUGGEST = {
    HEADING_NARROW_BOX: 'max-width를 ch가 아니라 em·% 로 두거나 없애고 text-wrap: balance로 줄 길이를 고르게 한다. 한글은 글자 폭이 숫자 0보다 넓어 ch 상한이 의도보다 훨씬 좁다.',
    HEADING_EARLY_WRAP: '제목 상자의 max-width/width를 풀어 사용 가능한 폭을 쓰게 한다(text-wrap: balance 병행).',
    HEADING_TOO_MANY_LINES: '제목을 줄이거나 폭을 넓힌다. 제목은 3줄 이내가 원칙이다.',
    HEADING_ORPHAN: 'text-wrap: balance를 쓰거나 제목 폭을 조정해 마지막 줄에 한두 글자만 남지 않게 한다.',
    LEAD_NARROW_BOX: '리드의 max-width를 풀거나 em 단위(약 40em 이상)로 바꾼다. 짧은 요약 문장은 칸을 넉넉히 써도 읽기 폭이 무너지지 않는다.',
    LEAD_EARLY_WRAP: '리드의 폭 상한을 풀어 한 줄 또는 더 적은 줄로 들어가게 한다.',
    LEAD_TOO_LONG_MEASURE: '리드의 한 줄 폭을 110ch 이하로 제한한다.',
    LEAD_TOO_MANY_LINES: '리드를 줄이거나 본문(body)으로 옮긴다. 리드는 3줄 이내가 원칙이다.',
    LEAD_ORPHAN: 'text-wrap: pretty를 쓰거나 폭을 조정해 마지막 줄에 한두 단어만 남지 않게 한다.',
    DESC_NARROW_BOX: '설명 칸이나 그것을 감싼 목록의 고정 max-width를 풀어 부모 폭을 쓰게 한다. 짧은 설명은 읽기 폭 상한이 필요 없다.',
    DESC_EARLY_WRAP: '설명 칸의 폭 상한을 풀어 더 적은 줄로 들어가게 한다.',
    SHORT_TEXT_NARROW_BOX: '짧은 문장의 폭 상한이 사용 가능한 폭보다 크게 좁다. max-width를 풀거나 문장을 읽기 폭 안에서 한 문단으로 묶는다.',
    BODY_NARROW_COLUMN: '본문 칸을 넓히거나(열 수를 줄이거나) 글자 크기를 줄인다. 한 줄 28ch 미만의 칸에 3줄 이상 쌓인 본문은 읽기 어렵다.',
    BODY_MEASURE_CAPPED: '본문 폭 상한을 45~80ch 안으로 잡는다.',
    BODY_MEASURE_LONG: '본문 폭 상한을 80ch 안팎으로 줄인다. 한 줄이 너무 길면 줄을 놓치기 쉽다.',
    BODY_ORPHAN: 'text-wrap: pretty를 쓰거나 폭을 조정해 마지막 줄에 한두 단어만 남지 않게 한다.',
    LABEL_WRAP: '라벨이 한 줄로 들어가게 폭을 넓히거나 문구를 줄인다. 필요하면 white-space: nowrap.',
    CONTROL_WRAP: '컨트롤 글자는 한 줄이 원칙이다. 폭을 넓히거나 문구를 줄이고 white-space: nowrap을 둔다.',
    VALUE_WRAP: '값은 한 덩어리로 읽혀야 한다. white-space: nowrap과 칸 최소 폭을 둔다.',
    CELL_TOKEN_BREAK: '표 칸 최소 폭을 주거나 white-space: nowrap을 둔다. 숫자·짧은 토큰은 쪼개지지 않아야 한다.',
    CELL_NARROW: '표 열 폭을 넓히거나 열 수를 줄인다(가로 스크롤 영역으로 감싼다).',
    TEXT_SPILL: '긴 토큰이 칸 밖으로 나간다. overflow-wrap: anywhere 또는 min-width: 0을 둔다.',
    CLIP_TEXT: '글이 잘린다. overflow를 풀거나 칸 높이·폭을 글에 맞춘다(말줄임이 의도면 text-overflow: ellipsis와 title).',
    CLIP_ICON: '아이콘·이미지가 상위 요소의 overflow에 잘린다. 안쪽 여백을 주거나 overflow: visible로 바꾼다.',
    CLIP_SVG: 'SVG 안쪽 그림이 viewBox 밖으로 나가 잘린다. viewBox를 넓히거나 svg에 overflow: visible을 준다.',
    OVERFLOW_X: '문서·요소가 화면 오른쪽 밖으로 나간다. min-width: 0, overflow-wrap, 고정 폭 제거를 확인한다.',
    OVERLAP_SVG_TEXT: 'SVG 차트의 눈금·값 라벨이 서로 겹친다. 범주를 줄이거나 눈금을 건너뛰고(라벨 모드 extremes), 긴 이름은 줄이거나 가로 스크롤(responsive: scroll)을 쓴다.',
    SMALL_TEXT: '글자 크기를 역할별 하한 이상으로 키운다(차트 라벨은 viewBox를 줄이거나 svg를 키운다).',
    TRUNCATED: '말줄임으로 잘린 글이다. 제목·리드라면 폭을 넓혀 전문이 보이게 한다.',
    SCROLL_REGION: '가로로 스크롤되는 영역이다. 의도(코드·표)인지 확인하고, 아니라면 칸 폭을 넓힌다.',
    BAR_MISALIGNED_Y: '상단 바의 항목 세로 중심을 맞춘다(align-items: center, 같은 min-height).',
    BAR_MISALIGNED_X: '상단 바의 좌우 가장자리를 본문 컨테이너와 같은 max-width·padding으로 맞춘다.',
  };

  const locator = el => {
    const parts = [];
    for (let a = el; a && a !== document.documentElement && parts.length < 5; a = a.parentElement) {
      if (a.id) { parts.unshift('#' + CSS.escape(a.id)); break; }
      let s = a.tagName.toLowerCase();
      s += [...a.classList].slice(0, 2).map(c => '.' + CSS.escape(c)).join('');
      const sibs = a.parentElement ? [...a.parentElement.children].filter(x => x.tagName === a.tagName) : [];
      if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(a) + 1})`;
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const textOf = el => el.textContent.replace(/\s+/g, ' ').trim();
  const clip = (s, n = 36) => s.length > n ? s.slice(0, n) + '…' : s;
  const flag = (code, severity, el, role, evidence) => {
    counts[code] = (counts[code] ?? 0) + 1;
    if (counts[code] > MAX_PER_CODE) return;
    // 인라인 면제: data-layout-exempt="CODE[,CODE]: 이유". 이유가 없으면 면제하지 않는다.
    const ex = el.closest('[data-layout-exempt]')?.getAttribute('data-layout-exempt') ?? '';
    const m = ex.match(/^([A-Z_,\s]+):\s*(\S.*)$/);
    const exempt = m && m[1].split(',').map(s => s.trim()).includes(code) ? m[2] : null;
    findings.push({code, severity, role, locator: locator(el), text: clip(textOf(el)), evidence, suggestion: SUGGEST[code] ?? '', ...(exempt ? {exempt} : {})});
  };

  // ---------- 가시성·역할 ----------
  const visible = el => {
    if (el.closest('[hidden],[data-layout-ignore],script,style,noscript,template')) return false;
    const closed = el.closest('details:not([open])'); if (closed && el !== closed && !el.closest('summary')) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      // 스크린리더 전용(1px로 접은 박스) 서브트리
      if (s.overflow === 'hidden' || s.clip !== 'auto') { const ar = a.getBoundingClientRect(); if (ar.width <= 1 && ar.height <= 1) return false; }
    }
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const isTransparent = n => { if (n.nodeType !== 1) return true; const d = getComputedStyle(n).display; return d === 'inline' || d === 'contents'; };
  /** 요소의 글줄 영역들. 인라인으로만 이어진 글자만 센다(블록·inline-block 자식은 자기 줄을 센다). */
  const textNodes = el => {
    const out = [], walk = n => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) { if (c.textContent.trim()) out.push(c); }
        else if (c.nodeType === 1 && !/^(SVG|SCRIPT|STYLE|BR|WBR)$/i.test(c.tagName) && isTransparent(c)) walk(c);
      }
    };
    walk(el); return out;
  };
  const lineBoxes = nodes => {
    const rects = [];
    for (const t of nodes) { const range = document.createRange(); range.selectNodeContents(t); for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 4) rects.push(r); }
    rects.sort((a, b) => a.top - b.top || a.left - b.left);
    const out = [];
    for (const r of rects) {
      const last = out.at(-1);
      if (last && Math.abs(r.top - last.top) < Math.max(4, r.height * 0.45)) { last.left = Math.min(last.left, r.left); last.right = Math.max(last.right, r.right); last.bottom = Math.max(last.bottom, r.bottom); }
      else out.push({top: r.top, left: r.left, right: r.right, bottom: r.bottom, h: r.height});
    }
    return out;
  };
  const lineStats = el => {
    const ls = lineBoxes(textNodes(el));
    return {ls, count: ls.length, widths: ls.map(l => l.right - l.left)};
  };
  const contentWidth = el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return r.width - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - parseFloat(s.borderLeftWidth) - parseFloat(s.borderRightWidth); };
  const SHORT_SENTENCES = s => (s.match(/[.!?。]\s|[.!?。]$|다\.\s|다\.$|요\.\s|요\.$/g) ?? []).length;

  const roleOf = el => {
    const attr = el.closest('[data-layout-role]')?.getAttribute('data-layout-role');
    if (attr) return attr;
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag) || el.getAttribute('role') === 'heading') return 'heading';
    // 컨트롤은 짧은 글자여야 한다. 문장 길이의 목차 링크(nav a)는 컨트롤이 아니라 목록 글이다.
    const ctrlText = textOf(el).length <= T.labelChars || el.matches('button,[role=button],.btn,.kit-button');
    if (el.matches(SEL.control) && getComputedStyle(el).display !== 'inline' && ctrlText) return 'control';
    if (el.closest(SEL.control) && !el.matches('p,li,dd') && ctrlText) return 'control';
    if (tag === 'TD' || tag === 'TH' || /^(cell|gridcell|columnheader|rowheader)$/.test(el.getAttribute('role') ?? '')) return 'cell';
    const text = textOf(el);
    if (el.matches(SEL.value)) return 'value';
    if (el.matches(SEL.lead) || (tag === 'P' && el.previousElementSibling?.tagName === 'H1' && text.length <= T.lead.maxChars)) return 'lead';
    if (el.matches(SEL.label) || tag === 'DT' || tag === 'LEGEND' || tag === 'LABEL' || tag === 'FIGCAPTION' || tag === 'CAPTION' || tag === 'SUMMARY') return 'label';
    if (tag === 'DD') return 'desc';
    if (text.length <= T.labelChars && !el.matches('p,li')) return 'label';
    // 한두 문장짜리 짧은 글은 읽기 폭 규칙의 대상이 아니라 줄 수·여유 규칙의 대상이다.
    if (tag !== 'LI' && text.length <= T.shortChars && SHORT_SENTENCES(text) <= 1) return 'short';
    return 'body';
  };

  /** 글 요소 수집: 인라인으로 이어진 글자를 직접 가진 비인라인 요소 */
  const candidates = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg,pre,code,textarea,script,style,iframe,.visually-hidden')) continue;
    if (isTransparent(el)) continue;
    if (!textNodes(el).length || !visible(el)) continue;
    candidates.push(el);
  }

  // ---------- 폭 계측: 자기·조상의 폭 상한을 풀었을 때의 사용 가능 폭 ----------
  const isPageContainer = a => {
    // 본문 폭 컨테이너: 가운데 정렬(자동 여백)이거나 main/body 바로 아래, 또는 data-layout-page.
    if (a.hasAttribute('data-layout-page') || /^(MAIN|BODY)$/.test(a.parentElement?.tagName ?? '')) return true;
    const s = getComputedStyle(a), p = a.parentElement; if (!p) return true;
    const r = a.getBoundingClientRect(), pr = p.getBoundingClientRect();
    return s.maxWidth !== 'none' && Math.abs((r.left - pr.left) - (pr.right - r.right)) < 1.5 && r.left - pr.left > 4;
  };
  const capActive = a => {
    const s = getComputedStyle(a); if (s.maxWidth === 'none' || a.tagName === 'BODY' || a.tagName === 'HTML') return false;
    const mw = parseFloat(s.maxWidth), r = a.getBoundingClientRect();
    return Number.isFinite(mw) && Math.abs(r.width - mw) < 1.5;
  };
  const withUnbounded = (el, fn) => {
    const chain = [el];
    for (let a = el.parentElement; a && !isPageContainer(a) && a !== document.body; a = a.parentElement) if (capActive(a)) chain.push(a);
    const saved = chain.map(a => [a.style.getPropertyValue('max-width'), a.style.getPropertyPriority('max-width'), a.style.getPropertyValue('width'), a.style.getPropertyPriority('width')]);
    chain.forEach((a, i) => { a.style.setProperty('max-width', 'none', 'important'); if (i === 0 || a.style.width) a.style.setProperty('width', 'auto', 'important'); });
    try { return fn(chain.length - 1); }
    finally { chain.forEach((a, i) => { const [mv, mp, wv, wp] = saved[i]; a.style.removeProperty('max-width'); if (mv) a.style.setProperty('max-width', mv, mp); a.style.removeProperty('width'); if (wv) a.style.setProperty('width', wv, wp); }); }
  };
  const chWidth = el => {
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:100ch;height:0;display:inline-block;pointer-events:none';
    el.appendChild(probe); const w = probe.getBoundingClientRect().width / 100; probe.remove(); return w;
  };
  /** 한 줄로 늘어놓은 글 폭(칸 폭 상한과 무관) */
  const naturalWidth = el => {
    const saved = [el.style.getPropertyValue('white-space'), el.style.getPropertyPriority('white-space')];
    el.style.setProperty('white-space', 'nowrap', 'important');
    const ls = lineBoxes(textNodes(el)), w = ls.length ? Math.max(...ls.map(l => l.right - l.left)) : 0;
    el.style.removeProperty('white-space'); if (saved[0]) el.style.setProperty('white-space', saved[0], saved[1]);
    return w;
  };

  const measureWrapped = (el, st) => {
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
    const W = contentWidth(el), ch = chWidth(el);
    let A = W, Lfree = st.count, lifted = 0;
    withUnbounded(el, n => { lifted = n; A = contentWidth(el); Lfree = lineStats(el).count; });
    const maxLine = Math.max(...st.widths), last = st.widths.at(-1);
    return {fs, W, A, ch, Lfree, lifted, maxLine, last, Tn: naturalWidth(el)};
  };
  const ev = (st, m, extra = {}) => ({lines: st.count, linesIfUnconstrained: m.Lfree, containerWidth: r1(m.W), availableWidth: r1(m.A), chWidth: r1(m.ch), measureCh: r1(m.W / m.ch), availableCh: r1(m.A / m.ch), fontSize: r1(m.fs), boxToAvailable: r1(m.W / m.A) , ...extra});

  // ---------- 역할별 규칙 ----------
  /** 마지막 줄에 놓인 글자들(글자마다 범위를 재서 마지막 줄 띠 안에 있는 것만 모은다). 줄 수가 많은 긴 글에는 쓰지 않는다. */
  const lastLineText = (el, st) => {
    const band = st.ls.at(-1); let out = '';
    for (const t of textNodes(el)) {
      const str = t.textContent;
      for (let i = 0; i < str.length; i++) {
        const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 1);
        const rc = range.getClientRects()[0]; if (rc && rc.top >= band.top - 2 && rc.top < band.top + band.h * 0.6) out += str[i];
      }
    }
    return out.trim();
  };
  /** 끝줄 고아: 마지막 줄이 단어 하나뿐이고, 가장 긴 줄의 1/3보다 짧으며, 글자 크기 4배(한글 4자)보다 짧다. */
  const orphan = (el, st, m, limitEm) => {
    if (st.count < 2 || m.last >= limitEm * m.fs || m.last >= m.maxLine * 0.34) return false;
    return lastLineText(el, st).split(/\s+/).filter(Boolean).length <= 1;
  };

  for (const el of candidates) {
    const role = roleOf(el); roles[role] = (roles[role] ?? 0) + 1; scanned.text++;
    const cs = getComputedStyle(el);
    const st = lineStats(el);
    const fs = parseFloat(cs.fontSize) || 16;

    // 글자 크기 하한(줄이 하나여도 본다)
    scanned.smallText++;
    const minFont = T.minFont[role] ?? T.minFont.body;
    if (fs < minFont) flag('SMALL_TEXT', 'error', el, role, {fontSize: r1(fs), minFontSize: minFont});

    // 글이 자기 칸 밖으로 나감: 한 줄이 칸을 넘는 긴 토큰
    if (st.count >= 1 && cs.overflowX === 'visible' && !['pre', 'pre-wrap'].includes(cs.whiteSpace)) {
      const box = el.getBoundingClientRect(), maxRight = Math.max(...st.ls.map(l => l.right));
      if (maxRight > box.right + 2 && !el.closest(SEL.scroll)) flag('TEXT_SPILL', 'error', el, role, {boxRight: r1(box.right), textRight: r1(maxRight), overflowPx: r1(maxRight - box.right)});
    }
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) flag('TRUNCATED', role === 'heading' || role === 'lead' ? 'error' : 'warn', el, role, {scrollWidth: el.scrollWidth, clientWidth: el.clientWidth});

    // 줄 수 제한(line-clamp)은 일부러 줄이는 것이라 줄 수·잘림 규칙의 대상이 아니다.
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') continue;
    if (role === 'control' || role === 'value') {
      scanned.wrap++;
      if (st.count >= 2) flag(role === 'control' ? 'CONTROL_WRAP' : 'VALUE_WRAP', 'error', el, role, {lines: st.count, containerWidth: r1(contentWidth(el)), fontSize: r1(fs)});
      continue;
    }
    if (role === 'label') {
      if (st.count < 2) continue;
      scanned.wrap++;
      const m = measureWrapped(el, st);
      // 폭 상한 때문에 접혔으면 오류. 칸이 좁아 두 줄이 된 캡션은 정상이고, 세 줄 이상이면 경고.
      if (m.Lfree < st.count) flag('LABEL_WRAP', 'error', el, role, ev(st, m));
      else if (st.count >= 3) flag('LABEL_WRAP', 'warn', el, role, ev(st, m));
      continue;
    }
    if (role === 'cell') {
      scanned.wrap++;
      const text = textOf(el), tokens = text.split(/\s+/);
      const tokenLines = st.count >= 2 && tokens.length === 1 && text.length <= T.cell.shortToken;
      if (tokenLines) flag('CELL_TOKEN_BREAK', 'error', el, role, {lines: st.count, characters: text.length, containerWidth: r1(contentWidth(el)), chWidth: r1(chWidth(el))});
      else if (st.count >= 2) { const w = contentWidth(el), ch = chWidth(el); if (w / ch < T.cell.minMeasureCh && text.length > 8) flag('CELL_NARROW', 'warn', el, role, {lines: st.count, containerWidth: r1(w), chWidth: r1(ch), measureCh: r1(w / ch)}); }
      continue;
    }
    if (st.count < 2) continue;
    scanned.wrap++;
    const m = measureWrapped(el, st), e = ev(st, m);
    const capped = m.W < m.A * 0.97, narrowBy = (limit) => m.W < m.A * limit;
    const roomy = m.A >= T.ampleCh * m.ch, ample = roomy || m.A >= T.ampleEm * m.fs;

    if (role === 'heading') {
      const lim = T.heading;
      if (m.Lfree < st.count) flag('HEADING_EARLY_WRAP', 'error', el, role, e);
      else if (capped && narrowBy(lim.narrowBox) && ample) flag('HEADING_NARROW_BOX', 'error', el, role, e);
      if (st.count > lim.maxLines && (roomy || st.count > lim.maxLines + 2)) flag('HEADING_TOO_MANY_LINES', 'error', el, role, e);
      if (orphan(el, st, m, lim.orphanEm)) flag('HEADING_ORPHAN', 'error', el, role, {...e, lastLineWidth: r1(m.last), lastLineEm: r1(m.last / m.fs)});
    } else if (role === 'lead') {
      const lim = T.lead;
      if (m.Lfree < st.count) flag('LEAD_EARLY_WRAP', 'error', el, role, e);
      else if (capped && narrowBy(lim.narrowBox) && ample) flag('LEAD_NARROW_BOX', 'error', el, role, e);
      if (m.W / m.ch > lim.maxMeasureCh) flag('LEAD_TOO_LONG_MEASURE', 'error', el, role, e);
      if (st.count > lim.maxLines && (roomy || st.count > lim.maxLines + 2)) flag('LEAD_TOO_MANY_LINES', 'error', el, role, e);
      if (orphan(el, st, m, lim.orphanEm)) flag('LEAD_ORPHAN', 'error', el, role, {...e, lastLineWidth: r1(m.last), lastLineEm: r1(m.last / m.fs)});
    } else if (role === 'desc') {
      const lim = T.desc;
      if (m.Lfree < st.count) flag('DESC_EARLY_WRAP', 'error', el, role, e);
      else if (capped && narrowBy(lim.narrowBox) && ample) flag('DESC_NARROW_BOX', 'error', el, role, e);
      if (orphan(el, st, m, lim.orphanEm)) flag('BODY_ORPHAN', 'warn', el, role, {...e, lastLineWidth: r1(m.last), lastLineEm: r1(m.last / m.fs)});
    } else if (role === 'short') {
      const lim = T.short;
      // 한두 문장이 읽는 폭(45~80ch) 안의 칸에서 접히는 것은 본문 단락과 같아 정상이다.
      // 읽는 폭 하한(45ch)보다 좁은 상한 때문에 불필요하게 접히거나 상자만 좁으면 지적한다.
      if (capped && ample && m.W / m.ch < T.measure.min && m.Lfree < st.count) flag('SHORT_TEXT_NARROW_BOX', 'error', el, role, e);
      else if (capped && narrowBy(lim.narrowBox) && ample && m.W / m.ch < T.measure.min) flag('SHORT_TEXT_NARROW_BOX', 'warn', el, role, e);
      if (orphan(el, st, m, lim.orphanEm)) flag('BODY_ORPHAN', 'warn', el, role, {...e, lastLineWidth: r1(m.last), lastLineEm: r1(m.last / m.fs)});
    } else { // body
      const measure = m.W / m.ch, lim = T.body;
      // 45~80ch의 읽는 폭이면 줄이 몇이든 정상이다. 아래 세 가지만 본다.
      if (st.count >= 3 && measure < lim.narrowColumnCh) flag('BODY_NARROW_COLUMN', 'error', el, role, e);
      else if (capped && measure < T.measure.min && m.A / m.ch >= T.measure.min * 1.3) flag('BODY_MEASURE_CAPPED', 'warn', el, role, e);
      if (measure > T.measure.max * 1.15 && st.count >= 2) flag('BODY_MEASURE_LONG', 'warn', el, role, e);
      if (orphan(el, st, m, lim.orphanEm)) flag('BODY_ORPHAN', 'warn', el, role, {...e, lastLineWidth: r1(m.last), lastLineEm: r1(m.last / m.fs)});
    }
  }

  // ---------- SVG·아이콘·이미지 잘림, SVG 글자 크기 ----------
  const clippers = a => { // 자신을 잘라 내는 조상(overflow hidden/clip, 스크롤 아님)
    const out = [];
    for (let p = a.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflowY)) out.push({el: p, x: ['hidden', 'clip'].includes(s.overflowX), y: ['hidden', 'clip'].includes(s.overflowY)});
    }
    return out;
  };
  for (const el of document.body.querySelectorAll('svg, img, canvas, [data-icon]')) {
    if (el.closest('[data-layout-ignore],[hidden]') || (el.tagName !== 'SVG' && el.tagName !== 'svg' && !visible(el))) continue;
    if (el.closest('svg') !== el && el.closest('svg')) continue; // 중첩 svg는 바깥에서 본다
    if (!visible(el) && el.tagName.toLowerCase() === 'svg') continue;
    scanned.clip++;
    const r = el.getBoundingClientRect(), isSvg = el.tagName.toLowerCase() === 'svg';
    if (el.closest(SEL.decor)) continue;
    // 1) 상위 요소의 overflow가 이 아이콘을 자름
    for (const c of clippers(el)) {
      const cr = c.el.getBoundingClientRect(), cs2 = getComputedStyle(c.el);
      const bl = parseFloat(cs2.borderLeftWidth) || 0, br = parseFloat(cs2.borderRightWidth) || 0, bt = parseFloat(cs2.borderTopWidth) || 0, bb = parseFloat(cs2.borderBottomWidth) || 0;
      const cutL = c.x ? Math.max(0, cr.left + bl - r.left) : 0, cutR = c.x ? Math.max(0, r.right - (cr.right - br)) : 0, cutT = c.y ? Math.max(0, cr.top + bt - r.top) : 0, cutB = c.y ? Math.max(0, r.bottom - (cr.bottom - bb)) : 0;
      const cut = Math.max(cutL, cutR, cutT, cutB);
      // 카드 모서리에 일부러 걸친 장식(전체의 1/3 이상이 잘리고 aria-hidden)은 CLIP_ICON이 아니라 장식이다.
      if (cut > 1.5 && r.width > 0 && !(el.getAttribute('aria-hidden') === 'true' && cut > Math.min(r.width, r.height) * 0.34)) {
        flag('CLIP_ICON', 'error', el, 'icon', {element: el.tagName.toLowerCase(), clippedPx: r1(cut), iconSize: `${r1(r.width)}x${r1(r.height)}`, clippedBy: locator(c.el), sides: {left: r1(cutL), right: r1(cutR), top: r1(cutT), bottom: r1(cutB)}});
        break;
      }
    }
    // 2) SVG 안쪽 그림이 자기 viewBox 밖으로 나가 잘림(svg 기본 overflow: hidden)
    if (isSvg) {
      scanned.svg++;
      const ovf = getComputedStyle(el).overflow;
      const vb = el.viewBox?.baseVal;
      if (vb && vb.width > 0 && !['visible', 'auto', 'scroll'].includes(ovf)) {
        let bb; try { bb = el.getBBox(); } catch { bb = null; }
        if (bb && bb.width > 0) {
          const sw = Math.max(0, ...[...el.querySelectorAll('[stroke]')].map(n => parseFloat(n.getAttribute('stroke-width') || '1') / 2));
          const tol = Math.max(1, sw), cutL = vb.x - bb.x, cutR = bb.x + bb.width - (vb.x + vb.width), cutT = vb.y - bb.y, cutB = bb.y + bb.height - (vb.y + vb.height);
          const cut = Math.max(cutL, cutR, cutT, cutB);
          // 바깥으로 나간 그림이 viewBox 면적의 5% 이상이어야 의미 있는 잘림으로 본다.
          if (cut > tol && cut > Math.min(vb.width, vb.height) * 0.03) flag('CLIP_SVG', 'error', el, 'svg', {viewBox: `${r1(vb.x)} ${r1(vb.y)} ${r1(vb.width)} ${r1(vb.height)}`, contentBox: `${r1(bb.x)} ${r1(bb.y)} ${r1(bb.width)} ${r1(bb.height)}`, outsideUnits: r1(cut), renderedSize: `${r1(r.width)}x${r1(r.height)}`});
        }
      }
      // 3) SVG 글자(차트 라벨 등)의 실제 렌더 크기 = font-size × 현재 변환 배율
      const scale = vb && vb.width > 0 ? r.width / vb.width : 1;
      for (const t of el.querySelectorAll('text, tspan')) {
        if (!(t.textContent ?? '').trim()) continue;
        if (t.tagName.toLowerCase() === 'tspan' && t.parentElement?.tagName.toLowerCase() === 'text') continue;
        scanned.smallText++;
        const tfs = parseFloat(getComputedStyle(t).fontSize) || 16, eff = tfs * scale;
        if (eff < T.minFont.svg) flag('SMALL_TEXT', 'error', t, 'svg-label', {fontSize: r1(eff), declaredFontSize: r1(tfs), svgScale: r1(scale), minFontSize: T.minFont.svg});
      }
      // 4) SVG 글자끼리 겹침(차트 눈금·값 라벨). 글상자 면적의 15% 넘게 겹치면 읽을 수 없다.
      const boxes = [...el.querySelectorAll('text')].filter(t => (t.textContent ?? '').trim()).map(t => ({t, r: t.getBoundingClientRect()})).filter(b => b.r.width > 0 && b.r.height > 0);
      scanned.svgText += boxes.length;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r, b = boxes[j].r, ow = Math.min(a.right, b.right) - Math.max(a.left, b.left), oh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ow > 1 && oh > 1 && ow * oh > 0.15 * Math.min(a.width * a.height, b.width * b.height)) flag('OVERLAP_SVG_TEXT', 'error', boxes[i].t, 'svg-label', {other: clip(textOf(boxes[j].t)), overlapPx: `${r1(ow)}x${r1(oh)}`, svgScale: r1(scale)});
      }
    }
  }

  // ---------- 잘리는 글: overflow hidden 칸 안에서 글이 칸 밖에 놓임 ----------
  for (const el of document.body.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (!['hidden', 'clip'].includes(s.overflowX) && !['hidden', 'clip'].includes(s.overflowY)) continue;
    if (el.closest('svg,[data-layout-ignore],[hidden]') || !visible(el) || s.textOverflow === 'ellipsis') continue;
    const nodes = []; const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) if (t.textContent.trim() && !t.parentElement.closest('svg,.visually-hidden,[data-layout-ignore]')) nodes.push(t);
    if (!nodes.length) continue;
    scanned.clip++;
    const box = el.getBoundingClientRect(); let found = null;
    for (const t of nodes) {
      if (t.parentElement.closest('details:not([open])') && !t.parentElement.closest('summary')) continue;
      let scrolled = false, clamped = false;
      for (let a = t.parentElement; a && a !== el.parentElement; a = a.parentElement) { const cs3 = getComputedStyle(a); if (['auto', 'scroll'].includes(cs3.overflowX)) scrolled = true; if (cs3.webkitLineClamp && cs3.webkitLineClamp !== 'none') clamped = true; }
      if (clamped || scrolled) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      for (const r of range.getClientRects()) {
        if (r.width < 1) continue;
        if (['hidden', 'clip'].includes(s.overflowX) && (r.right > box.right + 2 || r.left < box.left - 2)) { found = {axis: 'x', outsidePx: r1(Math.max(r.right - box.right, box.left - r.left))}; break; }
        if (['hidden', 'clip'].includes(s.overflowY) && (r.bottom > box.bottom + 2 || r.top < box.top - 2)) { found = {axis: 'y', outsidePx: r1(Math.max(r.bottom - box.bottom, box.top - r.top))}; break; }
      }
      if (found) break;
    }
    if (found) flag('CLIP_TEXT', 'error', el, 'text', {...found, boxSize: `${r1(box.width)}x${r1(box.height)}`});
  }

  // ---------- 가로 넘침 ----------
  scanned.overflow++;
  const docW = document.documentElement.scrollWidth;
  if (docW > vw + 1) flag('OVERFLOW_X', 'error', document.documentElement, 'page', {documentWidth: docW, viewportWidth: vw, overflowPx: docW - vw});
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg,[aria-hidden="true"],[data-layout-ignore],[hidden],' + SEL.scroll) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && getComputedStyle(el).position !== 'fixed') { scanned.overflow++; flag('OVERFLOW_X', 'error', el, 'element', {elementRight: r1(r.right), viewportWidth: vw, overflowPx: r1(r.right - vw)}); break; }
  }
  // 스크롤 영역이 실제로 넘치는지(코드·표): 정보로만 남긴다.
  for (const el of document.body.querySelectorAll(SEL.scroll)) {
    if (!visible(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1) flag('SCROLL_REGION', 'info', el, 'scroll', {scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, hiddenPx: el.scrollWidth - el.clientWidth});
  }

  // ---------- 상단 바 정렬 ----------
  for (const bar of document.querySelectorAll(SEL.bar)) {
    if (!visible(bar) || bar.closest('[data-layout-ignore]')) continue;
    const items = [...bar.querySelectorAll('a,button,[role=button],img,svg,input,select')].filter(x => visible(x) && !x.closest('[aria-hidden="true"]') && !x.parentElement.closest('a,button,[role=button]'));
    if (items.length < 2) continue;
    scanned.bar++;
    const info = x => {
      const r = x.getBoundingClientRect(), nodes = textNodes(x), ls = lineBoxes(nodes);
      const textCenter = ls.length ? (ls[0].top + ls.at(-1).bottom) / 2 : null;
      return {el: x, box: (r.top + r.bottom) / 2, text: textCenter, left: r.left, right: r.right};
    };
    const infos = items.map(info);
    // 같은 줄(중심 y가 12px 안)끼리 묶는다.
    const rows = [];
    for (const i of infos.sort((a, b) => a.box - b.box)) { const row = rows.find(rw => Math.abs(rw.center - i.box) <= 12); if (row) { row.items.push(i); row.center = row.items.reduce((s, q) => s + q.box, 0) / row.items.length; } else rows.push({center: i.box, items: [i]}); }
    const barBox = bar.getBoundingClientRect();
    for (const row of rows) {
      if (row.items.length < 2) continue;
      const dev = Math.max(...row.items.map(i => Math.abs(i.box - row.center)));
      const textItems = row.items.filter(i => i.text !== null), tcenter = textItems.length ? textItems.reduce((s, q) => s + q.text, 0) / textItems.length : null;
      const tdev = textItems.length > 1 ? Math.max(...textItems.map(i => Math.abs(i.text - tcenter))) : 0;
      if (dev > T.bar.centerTolerance) flag('BAR_MISALIGNED_Y', 'error', bar, 'bar', {rowCenter: r1(row.center), maxDeviationPx: r1(dev), items: row.items.map(i => ({at: locator(i.el), centerY: r1(i.box)})), tolerancePx: T.bar.centerTolerance});
      else if (tdev > T.bar.textTolerance) flag('BAR_MISALIGNED_Y', 'error', bar, 'bar', {kind: 'text', textCenter: r1(tcenter), maxDeviationPx: r1(tdev), items: textItems.map(i => ({at: locator(i.el), textCenterY: r1(i.text)})), tolerancePx: T.bar.textTolerance});
    }
    if (rows.length === 1) {
      // 바의 아래 테두리(1px)를 뺀 안쪽 높이의 중심과 비교한다.
      const bw = parseFloat(getComputedStyle(bar).borderBottomWidth) || 0, inner = (barBox.top + barBox.bottom - bw) / 2;
      if (Math.abs(rows[0].center - inner) > T.bar.centerTolerance + 1) flag('BAR_MISALIGNED_Y', 'error', bar, 'bar', {kind: 'bar-center', rowCenter: r1(rows[0].center), barCenter: r1(inner), offsetPx: r1(Math.abs(rows[0].center - inner))});
    }
    // 좌우 가장자리를 본문 컨테이너와 맞춘다.
    const page = [...document.querySelectorAll(SEL.page)].find(x => x.getBoundingClientRect().width > 1 && !x.contains(bar));
    if (page) {
      const pr = page.getBoundingClientRect(), ps = getComputedStyle(page);
      const pl = pr.left + parseFloat(ps.paddingLeft), prr = pr.right - parseFloat(ps.paddingRight);
      const left = Math.min(...infos.map(i => i.left)), right = Math.max(...infos.map(i => i.right));
      if (bar.getBoundingClientRect().width >= vw - 1 && (Math.abs(left - pl) > T.bar.edgeTolerance || Math.abs(prr - right) > T.bar.edgeTolerance)) {
        flag('BAR_MISALIGNED_X', 'error', bar, 'bar', {barContentLeft: r1(left), pageContentLeft: r1(pl), barContentRight: r1(right), pageContentRight: r1(prr), leftDeltaPx: r1(left - pl), rightDeltaPx: r1(right - prr), tolerancePx: T.bar.edgeTolerance});
      }
    }
  }

  return {findings, scanned, roles, counts, viewportWidth: vw};
}

/** 기본 선택자·임계값. 규칙을 낮춰서 통과시키지 않는다: 바꿀 때는 근거를 docs/layout-quality.md에 적는다. */
export const LAYOUT_OPTIONS = {
  maxPerCode: 12,
  selectors: {
    control: 'button,[role=button],[role=tab],.btn,.kit-button,.kit-chip,.kit-tag,.kit-badge,.kit-tab,.kit-pill,nav a,.kit-nav a,.kit-footer a',
    value: '[data-layout-role=value],.kit-metric-value,.kit-plan-price,.kit-price,.kit-total,.kit-card-price,.kit-menu-price',
    lead: '.page-lead,.lead,[class*="lead" i],.subtitle,.standfirst',
    label: '.eyebrow,.kit-eyebrow,.caption,[class*="_cap"],[class*="_eyebrow"],small',
    scroll: '[data-layout-scroll],.kit-table-scroll,.kit-reel,.kit-tablist,pre,[tabindex="0"]',
    decor: '[data-layout-decor],.kit-art,.kit-art-box,.kit-mock',
    bar: 'header,[role=banner],[data-layout-bar]',
    page: '[data-layout-page],main > .page,main > *',
  },
  thresholds: {
    ampleCh: 45, ampleEm: 16,
    labelChars: 40, shortChars: 120,
    measure: {min: 45, max: 80},
    minFont: {heading: 16, lead: 14, desc: 12, short: 12, body: 12, label: 11, control: 12, value: 12, cell: 11, svg: 10},
    heading: {maxLines: 3, orphanEm: 4, narrowBox: 0.75},
    lead: {maxLines: 3, maxChars: 240, narrowBox: 0.8, maxMeasureCh: 110, orphanEm: 4},
    desc: {narrowBox: 0.7, orphanEm: 4},
    short: {narrowBox: 0.7, orphanEm: 4},
    body: {narrowColumnCh: 28, orphanEm: 4},
    cell: {shortToken: 16, minMeasureCh: 6},
    bar: {centerTolerance: 2, textTolerance: 2.5, edgeTolerance: 1.5},
  },
};
