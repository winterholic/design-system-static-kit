/** 페이지 수준 실측(2026-11-21 품질 진단). 기존 세 프로브(간격·글줄·배치)가 "요소 단위 결함"을 재는 것과 달리, 화면 전체의 위계·정렬·리듬을 DOM 값으로 낸다.
 *  page.evaluate(pageMetrics)로 실행하며 브라우저 안에서 직렬화되므로 외부 import·클로저를 쓰지 않는다. 값은 판정이 아니라 측정이다(판정은 docs/quality-diagnosis-2026-11-21.md).
 *  hero            첫 히어로의 높이·h1/h2 글자 크기·뷰포트 대비 높이 비율
 *  h1s / h1Visible 눈에 보이는 h1 수(페이지 머리말이 히어로에 접히면 1개)
 *  sections        최상위 섹션별: 바탕색, 머리말 정렬, 위·아래 안쪽 여백, 높이, 머리말 글자 크기
 *  align           본문 글 요소(h1~h4·p·li·dt·dd)의 text-align 분포. 가운데·시작이 한 화면에 섞인 정도
 *  sizes           main 안 글자 크기 종류 수(px 반올림)와 최소·최대
 *  bandRuns        색 띠가 번갈아 나오는 횟수와 평면(plain)이 이어지는 최대 길이
 *  gaps            이웃한 섹션·블록 사이의 가장 큰 빈 세로 간격
 *  grids           격자(.kit-grid·.kit-bento)별 열 트랙 수·자식 수·마지막 줄 채움
 *  small / touch   12px 미만 글자 수, 768px 이하에서 44px 미만 높이의 상호작용 요소 수
 *  docH / scrollW  문서 높이, 가로 스크롤 폭(clientWidth보다 크면 가로 넘침)
 *  cards           카드 변형 분포(data-variant) */
export function pageMetrics() {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const num = v => parseFloat(v) || 0;
  const main = document.querySelector('main') ?? document.body;
  const visible = el => {
    if (el.closest('.kit-sr,[hidden],.kit-skip,svg,script,style')) return false;
    const closed = el.closest('details:not([open])'); if (closed && !el.closest('summary') && el !== closed) return false;
    for (let a = el; a && a !== document.body; a = a.parentElement) { const ar = a.getBoundingClientRect(); if (ar.width <= 1 && ar.height <= 1 && getComputedStyle(a).overflow === 'hidden') return false; }
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const px = el => Math.round(num(getComputedStyle(el).fontSize) * 10) / 10;
  const rect = el => { const r = el.getBoundingClientRect(); return {top: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), left: Math.round(r.left)}; };
  const out = {vw, docH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth};

  const h1s = [...document.querySelectorAll('h1')];
  out.h1Visible = h1s.filter(visible).length;
  out.h1 = h1s.filter(visible).map(h => ({text: h.textContent.trim().slice(0, 40), px: px(h), align: getComputedStyle(h).textAlign}))[0] ?? null;

  const hero = main.querySelector('.kit-hero');
  if (hero) {
    const r = rect(hero), h2 = hero.querySelector('h1,h2');
    out.hero = {variant: hero.dataset.variant, h: r.h, vhRatio: Math.round(r.h / vh * 100) / 100, titlePx: h2 ? px(h2) : null, titleLines: h2 ? Math.round(h2.getBoundingClientRect().height / (num(getComputedStyle(h2).lineHeight) || px(h2) * 1.2)) : null, visual: hero.dataset.visual ?? null, copyW: Math.round((hero.querySelector('.kit-hero-copy') ?? hero).getBoundingClientRect().width), align: h2 ? getComputedStyle(h2).textAlign : null};
  }

  const sections = [...main.querySelectorAll(':scope > .kit-section, :scope > * > .kit-section')].filter(s => !s.parentElement.closest('.kit-section'));
  const bgOf = el => { for (let a = el; a; a = a.parentElement) { const c = getComputedStyle(a).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'page'; };
  out.sections = sections.filter(visible).map(s => {
    const head = s.querySelector('.kit-section-head h2, .kit-section-head h3, h2, h3'), cs = getComputedStyle(s), r = rect(s);
    const kids = [...s.querySelectorAll('[data-design-kind]')].filter(k => k.closest('.kit-section') === s && visible(k)).map(k => k.dataset.designKind);
    return {id: s.id || null, surface: s.dataset.surface ?? s.getAttribute('data-variant') ?? null, bg: getComputedStyle(s).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'plain' : getComputedStyle(s).backgroundColor, headAlign: head ? getComputedStyle(head).textAlign : null, headPx: head ? px(head) : null, padT: Math.round(num(cs.paddingTop)), padB: Math.round(num(cs.paddingBottom)), h: r.h, top: r.top, parts: [...new Set(kids)].slice(0, 6)};
  });
  const s = out.sections, plainRun = (() => { let best = 0, run = 0; for (const x of s) { run = x.bg === 'plain' ? run + 1 : 0; best = Math.max(best, run); } return best; })();
  out.bandRuns = {sections: s.length, banded: s.filter(x => x.bg !== 'plain').length, maxPlainRun: plainRun, distinctBg: new Set(s.map(x => x.bg)).size};
  out.gaps = (() => { let max = 0, at = null; const rs = [...main.children].filter(visible).map(rect); for (let i = 1; i < rs.length; i++) { const g = rs[i].top - (rs[i - 1].top + rs[i - 1].h); if (g > max) { max = g; at = i; } } return {max, at}; })();

  const texts = [...main.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,blockquote')].filter(el => visible(el) && el.textContent.trim().length > 2 && !el.closest('nav,table,.kit-tablist'));
  const al = {}; for (const t of texts) { const a = getComputedStyle(t).textAlign, k = a === 'start' || a === 'left' ? 'start' : a; al[k] = (al[k] ?? 0) + 1; }
  out.align = al;
  const headAl = {}; for (const t of texts.filter(t => /^H[1-4]$/.test(t.tagName))) { const a = getComputedStyle(t).textAlign, k = a === 'start' || a === 'left' ? 'start' : a; headAl[k] = (headAl[k] ?? 0) + 1; }
  out.headAlign = headAl;

  const sizes = new Map(); for (const t of main.querySelectorAll('*')) { if (!visible(t) || ![...t.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const f = Math.round(num(getComputedStyle(t).fontSize)); sizes.set(f, (sizes.get(f) ?? 0) + 1); }
  const sz = [...sizes.keys()].sort((a, b) => a - b);
  out.sizes = {kinds: sz.length, min: sz[0] ?? null, max: sz.at(-1) ?? null, list: sz};
  out.small = [...sizes.entries()].filter(([f]) => f < 12).reduce((n, [, c]) => n + c, 0);

  out.touch = vw <= 768 ? [...document.querySelectorAll('a,button,input,select,textarea,summary')].filter(el => visible(el) && !el.closest('p,li > p') && !el.classList.contains('kit-skip')).filter(el => el.getBoundingClientRect().height < 44 && !el.closest('nav ul li, .kit-footer, .kit-section-desc, .kit-prose, p')).length : null;

  out.grids = [...main.querySelectorAll('.kit-grid, .kit-bento')].filter(visible).slice(0, 12).map(g => {
    const cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(x => x && x !== 'none').length, n = [...g.children].filter(visible).length;
    return {kind: g.className.split(' ')[0], cols, n, last: cols ? (n % cols || cols) : null, w: Math.round(g.getBoundingClientRect().width)};
  });
  const cards = {}; for (const c of main.querySelectorAll('.kit-card')) { if (!visible(c)) continue; const v = c.dataset.variant ?? 'basic'; cards[v] = (cards[v] ?? 0) + 1; }
  out.cards = cards;
  out.pageEnd = (() => { const f = document.querySelector('.kit-footer'); return f ? rect(f).h : null; })();
  return out;
}
