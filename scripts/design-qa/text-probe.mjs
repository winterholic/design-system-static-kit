/** 글줄·넘침 실측: 줄바꿈이 어색한 곳을 렌더 결과에서 잰다. page.evaluate(textProbe, options)로 실행한다.
 *  브라우저 안에서 직렬화되어 실행되므로 외부 import·클로저를 쓰지 않는다.
 *  ORPHAN_LINE  여러 줄 본문의 마지막 줄이 한두 글자뿐
 *  ORPHAN_HEADING 여러 줄 제목(h1~h5, 22px 이상)의 마지막 줄이 세 글자 이하
 *  CTRL_WRAP    버튼·칩·태그·탭·내비 항목의 글자가 두 줄 이상
 *  NARROW_COL   글이 들어간 칸이 너무 좁아 한 줄에 몇 글자씩만 들어감
 *  OVERFLOW_X   요소가 화면 오른쪽 밖으로 나가거나 문서가 가로로 넘침(가로 스크롤 영역 제외)
 *  CLIP_TEXT    overflow:hidden 칸 안에서 글이 잘림(의도한 말줄임은 제외)
 *  VALUE_WRAP   지표 값·가격처럼 한 덩어리로 읽어야 하는 값이 줄바꿈됨
 *  각 점검은 몇 개를 훑었는지(scanned)를 함께 돌려준다. */
export function textProbe(options) {
  const {ctrl, value, scroll, minCol} = options;
  const findings = [], scanned = {orphan: 0, ctrl: 0, narrow: 0, overflow: 0, clip: 0, value: 0};
  const vw = document.documentElement.clientWidth;
  const name = el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const flag = (code, el, detail) => { if (findings.length < 300) findings.push({code, at: name(el), detail}); };
  const visible = el => {
    if (el.closest('.kit-sr,[hidden],.kit-skip,svg,script,style')) return false;
    const closed = el.closest('details:not([open])'); if (closed && !el.closest('summary') && el !== closed) return false;
    // 1px로 접어 둔 시각 숨김 부모(스크린리더용 머리말) 안의 요소는 화면에 없다.
    for (let a = el; a && a !== document.body; a = a.parentElement) { const ar = a.getBoundingClientRect(); if (ar.width <= 1 && ar.height <= 1 && getComputedStyle(a).overflow === 'hidden') return false; }
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const main = document.querySelector('body');
  /** 요소 안 글자의 줄 목록: [{top, left, right}] (같은 top 조각은 한 줄로 합침) */
  const isInline = n => { if (n.nodeType !== 1) return true; const d = getComputedStyle(n).display; return d === 'inline' || d === 'contents' || d.startsWith('inline'); };
  /** 글을 담은 요소가 자식 블록(세로로 쌓인 다른 글 덩어리)을 갖지 않는지: 갖고 있으면 줄 계산은 그 자식이 한다. */
  const flowsInline = el => [...el.children].every(c => isInline(c) && !c.querySelector('p,li,div,h1,h2,h3,h4,ul,ol,dl'));
  const lines = (el, own = false) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const p = t.parentElement; if (!p || p.closest('svg,.kit-sr')) continue;
      if (own === 'direct' && p !== el) continue;
      if (own === true) { let a = p, blocked = false; while (a && a !== el) { if (!isInline(a)) { blocked = true; break; } a = a.parentElement; } if (blocked) continue; }
      const range = document.createRange(); range.selectNodeContents(t);
      for (const r of range.getClientRects()) if (r.width > 0.5 && r.height > 4) rects.push(r);
    }
    rects.sort((a, b) => a.top - b.top || a.left - b.left);
    const out = [];
    for (const r of rects) {
      const last = out.at(-1);
      if (last && Math.abs(r.top - last.top) < Math.max(4, r.height * 0.45)) { last.left = Math.min(last.left, r.left); last.right = Math.max(last.right, r.right); last.bottom = Math.max(last.bottom, r.bottom); }
      else out.push({top: r.top, left: r.left, right: r.right, bottom: r.bottom, h: r.height});
    }
    return out;
  };
  const textOf = el => el.textContent.replace(/\s+/g, ' ').trim();

  // ORPHAN_LINE: 직접 글자를 가진 블록 요소
  const blocks = [...document.querySelectorAll('h1,h2,h3,h4,h5,p,li,dd,dt,summary,blockquote,figcaption,label,td,th,span,a,strong,div')]
    .filter(el => { if (!visible(el) || el.matches('.kit-sr')) return false; if (/^(span|a|strong|div)$/i.test(el.tagName)) { const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!hasText) return false; } return !el.closest('pre,code,.kit-art,.kit-mock,.kit-code'); });
  for (const el of blocks) {
    const s = getComputedStyle(el); if (s.display === 'inline' || el.matches('.kit-price')) continue;
    if (!flowsInline(el)) continue;
    const ls = lines(el); if (ls.length < 2) continue;
    // 자식 블록이 따로 있으면 그 자식이 자기 줄을 센다: 한 줄 높이로 환산한 줄 수가 실제 줄 수와 다르면 건너뜀
    scanned.orphan++;
    const fs = parseFloat(s.fontSize) || 16, last = ls.at(-1), lastW = last.right - last.left, maxW = Math.max(...ls.map(l => l.right - l.left));
    const heading = /^H[1-5]$/.test(el.tagName) || fs >= 22;
    const limit = heading ? 3.2 : 2.2;
    if (lastW < limit * fs && lastW < maxW * 0.34) flag(heading ? 'ORPHAN_HEADING' : 'ORPHAN_LINE', el, `${ls.length}줄, 끝줄 ${Math.round(lastW)}px (${(lastW / fs).toFixed(1)}em) “${textOf(el).slice(-12)}”`);
  }

  // MEASURE_SHORT: 글줄 폭 제한(max-width)이 한글 기준으로 너무 좁아 이르게 줄바꿈되는 본문. 부모에 여유가 있는데도 한 줄이 짧다.
  for (const el of document.querySelectorAll('p,li,dd,blockquote,figcaption')) {
    if (!visible(el) || el.closest('pre,code,.kit-art,.kit-mock,[data-narrow-ok]') || !flowsInline(el)) continue;
    const ls = lines(el); if (ls.length < 2) continue;
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 16, w = el.getBoundingClientRect().width, parent = el.parentElement, pw = parent.getBoundingClientRect().width - parseFloat(getComputedStyle(parent).paddingLeft) - parseFloat(getComputedStyle(parent).paddingRight);
    if (cs.textAlign === 'center' || cs.maxWidth === 'none') continue;
    scanned.measure = (scanned.measure ?? 0) + 1;
    const maxW = Math.max(...ls.map(l => l.right - l.left));
    if (w / fs < 27 && pw > w + 48 && ls.length >= 2 && maxW < w * 0.98) flag('MEASURE_SHORT', el, `${ls.length}줄 폭 ${Math.round(w)}px (${(w / fs).toFixed(0)}em) < 부모 ${Math.round(pw)}px, max-width ${cs.maxWidth} “${textOf(el).slice(0, 14)}”`);
  }

  // CTRL_WRAP: 컨트롤 글자는 한 줄이 원칙
  for (const el of document.querySelectorAll(ctrl)) {
    if (!visible(el)) continue;
    scanned.ctrl++;
    const ls = lines(el);
    if (ls.length >= 2) flag('CTRL_WRAP', el, `${ls.length}줄 “${textOf(el).slice(0, 30)}” 폭 ${Math.round(el.getBoundingClientRect().width)}px`);
  }

  // VALUE_WRAP
  for (const el of document.querySelectorAll(value)) {
    if (!visible(el)) continue;
    scanned.value++;
    const ls = lines(el, 'direct');
    if (ls.length >= 2) flag('VALUE_WRAP', el, `${ls.length}줄 “${textOf(el).slice(0, 30)}” 폭 ${Math.round(el.getBoundingClientRect().width)}px`);
  }

  // NARROW_COL: 글줄 하나가 너무 짧게 접힌 칸(글자 크기 대비 칸 폭)
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,dd,blockquote,figcaption')) {
    if (!visible(el) || el.closest('pre,code,.kit-art,.kit-mock,.kit-tree,[data-narrow-ok]')) continue;
    const ls = lines(el); if (ls.length < 3) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize) || 16, w = el.getBoundingClientRect().width;
    scanned.narrow++;
    if (w < minCol * fs) flag('NARROW_COL', el, `${ls.length}줄 칸 폭 ${Math.round(w)}px (${(w / fs).toFixed(1)}em) “${textOf(el).slice(0, 16)}”`);
  }

  // OVERFLOW_X
  const docW = document.documentElement.scrollWidth;
  scanned.overflow++;
  if (docW > vw + 1) flag('OVERFLOW_X', document.documentElement, `문서 가로 ${docW}px > 화면 ${vw}px`);
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.closest(scroll)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !el.closest('[aria-hidden=true],.kit-art-box')) { scanned.overflow++; flag('OVERFLOW_X', el, `오른쪽 ${Math.round(r.right)}px > 화면 ${vw}px`); break; }
  }

  // CLIP_TEXT: overflow hidden + 말줄임 없이 글이 잘림
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (s.overflowX !== 'hidden' && s.overflowY !== 'hidden') continue;
    if (!/[가-힣A-Za-z0-9]/.test(el.textContent) || el.closest('.kit-art,.kit-art-box,.kit-mock,svg,.kit-sr')) continue;
    if (s.textOverflow === 'ellipsis') continue;
    scanned.clip++;
    // 장식(그라데이션 덩어리)이 칸 밖으로 나가는 것은 의도다. 글자 자체가 칸 밖에 놓였는지를 잰다.
    const box = el.getBoundingClientRect(), walker2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let clipped = null;
    for (let t = walker2.nextNode(); t && !clipped; t = walker2.nextNode()) {
      if (!t.textContent.trim() || t.parentElement.closest('svg,.kit-sr,.kit-art')) continue;
      // 닫힌 details 본문, 가로로 스크롤되는 칸 안의 글, 줄 수 제한(line-clamp)은 잘린 것이 아니라 의도한 처리다.
      const closedDetails = t.parentElement.closest('details:not([open])'); if (closedDetails && !t.parentElement.closest('summary')) continue;
      let scrolled = false, clamped = false; for (let a = t.parentElement; a && a !== el.parentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (['auto', 'scroll'].includes(cs.overflowX)) scrolled = true; if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') clamped = true; }
      if (clamped) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      for (const r of range.getClientRects()) {
        if (r.width < 1) continue;
        if (!scrolled && s.overflowX === 'hidden' && (r.right > box.right + 2 || r.left < box.left - 2)) { clipped = '가로 ' + Math.round(r.right - box.right) + 'px 밖'; break; }
        if (s.overflowY === 'hidden' && (r.bottom > box.bottom + 2 || r.top < box.top - 2)) { clipped = '세로 ' + Math.round(r.bottom - box.bottom) + 'px 밖'; break; }
      }
    }
    if (clipped) flag('CLIP_TEXT', el, clipped + ' “' + textOf(el).slice(0, 20) + '”');
  }
  return {findings, scanned};
}

export const TEXT_PROBE_OPTIONS = {
  ctrl: '.kit-button,.kit-chip,.kit-tag,.kit-badge,.kit-tab,[role=tab],.kit-nav a,.kit-nav button,.kit-nav summary,.kit-footer a,.kit-crumbs a,.kit-pager a,.kit-pager button,.kit-filter button,.kit-select,.kit-pill',
  value: '.kit-metric>dd:nth-of-type(1),.kit-metric-value,.kit-plan-price,.kit-price,.kit-stat strong,.kit-total,.kit-card-price,.kit-menu-price',
  scroll: '.kit-table-scroll,.kit-reel,.kit-tablist,[tabindex="0"],.kit-code,pre,.kit-nav ul,.kit-nav,.kit-stepper ol,.kit-filter-chips',
  minCol: 5.5,
};
