/** Typography system (6차). docs/typography.md is generated from this file.
 *  A typography preset is a whole voice: a face pairing (Latin + Korean fallbacks), a modular scale ratio, heading weight and tracking,
 *  leading per role, and reading measure. Parts never choose a font size: they pick a type role (`--kit-t-*`), and the role's value is computed
 *  from the preset. `lintType` rejects raw sizes in the stylesheet and keeps large roles in the slots that own them.
 *  No webfont is loaded: generated pages carry `default-src 'none'`, so every face here is a system face (see docs/typography.md, "서체 조달"). */

const KO_SANS = '"Apple SD Gothic Neo","Noto Sans KR","Noto Sans CJK KR","Malgun Gothic","Nanum Gothic",sans-serif';
const KO_SERIF = '"AppleMyungjo","Noto Serif KR","Noto Serif CJK KR","Nanum Myeongjo","Batang",serif';
const KO_MONO = '"Apple SD Gothic Neo","Noto Sans Mono CJK KR","D2Coding","Nanum Gothic Coding",monospace';

/** Named stacks. Every stack ends in a Korean fallback of the same colour (sans/serif/mono) so Hangul never falls to a mismatched face. */
export const STACKS = {
  system: `system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",${KO_SANS}`,
  humanist: `"Seravek","Gill Sans","Optima","Candara","Segoe UI",${KO_SANS}`,
  geometric: `"Avenir Next","Avenir","Century Gothic","Futura","Segoe UI",${KO_SANS}`,
  grotesk: `"Helvetica Neue","Arial Nova","Arial",${KO_SANS}`,
  rounded: `ui-rounded,"SF Pro Rounded","Hiragino Maru Gothic ProN","Arial Rounded MT Bold",${KO_SANS}`,
  poster: `"Futura","Avenir Next Condensed","Impact","Arial Narrow",${KO_SANS}`,
  condensed: `"Avenir Next Condensed","Arial Narrow","Roboto Condensed","Helvetica Neue",${KO_SANS}`,
  iowan: `"Iowan Old Style","Palatino","Palatino Linotype","Book Antiqua",Georgia,${KO_SERIF}`,
  georgia: `Georgia,"Times New Roman","Noto Serif",${KO_SERIF}`,
  charter: `"Charter","Bitstream Charter","Sitka Text","Cambria",Georgia,${KO_SERIF}`,
  baskerville: `"Baskerville","Libre Baskerville","Hoefler Text","Palatino",Georgia,${KO_SERIF}`,
  didone: `"Didot","Bodoni 72","Bodoni MT","Playfair Display","Hoefler Text",Georgia,${KO_SERIF}`,
  slab: `"Rockwell","Superclarendon","Roboto Slab","American Typewriter",Georgia,${KO_SERIF}`,
  mono: `"SFMono-Regular","SF Mono","Menlo",Consolas,${KO_MONO}`,
};

/** `body` is the body size in px (16 or 17). `ratio` is the modular scale ratio at the balanced scale axis.
 *  `hw` shifts the heading weight chosen by the weight axis (600/700/800) in steps of 100, clamped to 400..900.
 *  `track` is letter-spacing in em per role (Hangul wants looser tracking than Latin at the same size), `lh` is line height per role. */
const P = (id, label, concept, o) => ({id, label, concept, body: 16, ratio: 1.25, hw: 0, label_case: 'none', nums: 'proportional', ...o});

export const TYPE = Object.fromEntries([
  P('sans', '시스템 산세리프', '중립·제품. 어디에나 놓이는 기본 목소리.', {head: 'system', text: 'system', ratio: 1.25, track: {display: -.035, title: -.035, heading: -.03, sub: -.02, label: .04}, lh: {display: 1.1, title: 1.15, heading: 1.22, sub: 1.3, body: 1.65}}),
  P('serif', '세리프 제목 + 산세리프 본문', '읽을거리가 있는 제품. 제목에만 인쇄 감각을 둔다.', {head: 'iowan', text: 'system', track: {display: -.025, title: -.025, heading: -.02, sub: -.01, label: .05}, lh: {display: 1.15, title: 1.2, heading: 1.25, sub: 1.35, body: 1.7}}),
  P('mono', '모노스페이스 제목', '개발·데이터. 제목이 코드처럼 읽힌다.', {head: 'mono', text: 'system', ratio: 1.2, label_case: 'upper', track: {display: -.02, title: -.02, heading: -.015, sub: 0, label: .06}, lh: {display: 1.2, title: 1.25, heading: 1.3, sub: 1.35, body: 1.65}}),
  P('editorial', '세리프 제목 + 세리프 본문', '긴 글. 제목도 본문도 인쇄 서체, 느슨한 행간.', {head: 'iowan', text: 'iowan', body: 17, hw: -100, track: {display: -.02, title: -.02, heading: -.015, sub: -.005, label: .05}, lh: {display: 1.15, title: 1.2, heading: 1.28, sub: 1.35, body: 1.8}}),
  P('rounded', '둥근 서체', '친근한 소비자 서비스. 모서리가 둥근 글자.', {head: 'rounded', text: 'rounded', track: {display: -.025, title: -.025, heading: -.02, sub: -.01, label: .03}, lh: {display: 1.15, title: 1.2, heading: 1.28, sub: 1.35, body: 1.7}}),
  P('geometric', '기하학적 산세리프', '브랜드·마케팅. 원에 가까운 글자와 굵은 제목.', {head: 'geometric', text: 'geometric', hw: 100, track: {display: -.04, title: -.035, heading: -.03, sub: -.015, label: .06}, lh: {display: 1.08, title: 1.12, heading: 1.2, sub: 1.3, body: 1.65}}),
  P('humanist', '인문주의 산세리프', '따뜻하고 사람 냄새 나는 서비스. 가는 획의 변화.', {head: 'humanist', text: 'humanist', ratio: 1.2, hw: -100, track: {display: -.015, title: -.015, heading: -.01, sub: -.005, label: .04}, lh: {display: 1.2, title: 1.25, heading: 1.3, sub: 1.4, body: 1.75}}),
  P('grotesk', '굵고 좁은 그로테스크', '직설적인 제목. 큰 제목이 한 덩어리로 박힌다.', {head: 'grotesk', text: 'grotesk', ratio: 1.333, hw: 100, track: {display: -.045, title: -.04, heading: -.03, sub: -.015, label: .05}, lh: {display: 1.02, title: 1.08, heading: 1.15, sub: 1.25, body: 1.6}}),
  P('swiss', '스위스 그리드', '격자·정렬·위계가 전부인 인쇄. 큰 대비와 대문자 라벨.', {head: 'grotesk', text: 'grotesk', ratio: 1.414, hw: 100, label_case: 'upper', nums: 'tabular', track: {display: -.05, title: -.045, heading: -.035, sub: -.015, label: .08}, lh: {display: 1, title: 1.05, heading: 1.12, sub: 1.25, body: 1.55}}),
  P('newsroom', '신문 지면', '뉴스·매거진. 굵은 세리프 제목과 촘촘한 본문.', {head: 'georgia', text: 'georgia', ratio: 1.333, hw: 100, nums: 'tabular', track: {display: -.02, title: -.02, heading: -.015, sub: -.005, label: .06}, lh: {display: 1.1, title: 1.15, heading: 1.2, sub: 1.3, body: 1.6}}),
  P('literary', '문학·인문', '책과 기록. 가는 세리프 제목, 넉넉한 행간, 큰 본문.', {head: 'baskerville', text: 'charter', body: 17, ratio: 1.2, hw: -200, track: {display: -.01, title: -.01, heading: -.005, sub: 0, label: .06}, lh: {display: 1.2, title: 1.25, heading: 1.3, sub: 1.4, body: 1.85}}),
  P('luxe', '럭셔리', '브랜드·웨딩·와인. 고대비 디돈 제목과 넓게 벌린 라벨.', {head: 'didone', text: 'humanist', ratio: 1.414, hw: -300, label_case: 'upper', track: {display: 0, title: 0, heading: .005, sub: .01, label: .14}, lh: {display: 1.1, title: 1.15, heading: 1.2, sub: 1.35, body: 1.75}}),
  P('poster', '포스터·캠페인', '캠페인·행사·게임. 아주 굵고 촘촘한 제목, 큰 비율.', {head: 'poster', text: 'system', ratio: 1.5, hw: 200, label_case: 'upper', track: {display: -.04, title: -.035, heading: -.02, sub: -.01, label: .1}, lh: {display: .98, title: 1.02, heading: 1.1, sub: 1.25, body: 1.6}}),
  P('slab', '슬랩·레트로', '인쇄물 감성. 굵은 슬랩 제목, 따뜻한 본문.', {head: 'slab', text: 'system', hw: 0, track: {display: -.015, title: -.015, heading: -.01, sub: 0, label: .06}, lh: {display: 1.12, title: 1.18, heading: 1.25, sub: 1.35, body: 1.7}}),
  P('tech', '테크 문서', '개발자 도구·문서. 촘촘한 비율, 숫자 정렬, 단단한 제목.', {head: 'system', text: 'system', ratio: 1.2, nums: 'tabular', track: {display: -.03, title: -.03, heading: -.025, sub: -.015, label: .05}, lh: {display: 1.12, title: 1.18, heading: 1.25, sub: 1.32, body: 1.6}}),
  P('bookish', '책 본문', '긴 읽기. 한 서체가 제목과 본문을 모두 맡는다.', {head: 'charter', text: 'charter', body: 17, hw: -100, track: {display: -.02, title: -.02, heading: -.015, sub: -.005, label: .05}, lh: {display: 1.15, title: 1.2, heading: 1.28, sub: 1.38, body: 1.8}}),
  P('terminal', '터미널', '콘솔·로그. 제목도 본문도 고정폭.', {head: 'mono', text: 'mono', ratio: 1.2, label_case: 'upper', nums: 'tabular', track: {display: -.01, title: -.01, heading: -.005, sub: 0, label: .06}, lh: {display: 1.2, title: 1.25, heading: 1.3, sub: 1.4, body: 1.65}}),
  P('condensed', '좁은 제목', '스포츠·행사. 좁고 굵은 제목으로 한 줄에 많이 담는다.', {head: 'condensed', text: 'system', ratio: 1.333, hw: 100, label_case: 'upper', track: {display: -.01, title: -.01, heading: 0, sub: 0, label: .08}, lh: {display: 1, title: 1.05, heading: 1.1, sub: 1.2, body: 1.6}}),
].map(p => [p.id, p]));

export const TYPE_IDS = Object.keys(TYPE);

/** scale 축은 비율을 옮긴다: tight 촘촘한 제목 -0.07, balanced, dramatic +0.10. */
export const RATIO_SHIFT = {tight: -.07, balanced: 0, dramatic: .10};

/** 크기 역할. `exp`는 본문 크기에 곱하는 비율의 거듭제곱이고, `fluid`면 화면 폭에 따라 min~max로 변한다. `cap`은 최댓값 상한(px), `slots`는 이 역할을 쓸 수 있는 선택자 조각이다('*'는 어디서나).
 *  24px을 넘는 역할은 반드시 자리를 갖는다: 큰 글자는 정해진 자리에서만 나온다. */
const ANY = ['*'];
export const ROLES = {
  micro: {fixed: b => Math.round(b * .6875), use: '차트 눈금·아바타 이니셜', slots: ANY},
  caption: {fixed: b => Math.round(b * .75), use: '배지·보조 메타·표 머리', slots: ANY},
  label: {fixed: b => Math.round(b * .8125), use: '눈썹글·도움말·푸터 메타', slots: ANY},
  small: {fixed: b => Math.round(b * .875), use: '보조 설명·메타', slots: ANY},
  ui: {fixed: b => Math.round(b * .9375), use: '버튼·요약 줄', slots: ANY},
  body: {fixed: b => b, use: '본문', slots: ANY},
  'body-l': {fixed: b => b + 1, use: '강조 본문·h4·요금제 이름', slots: ANY},
  prose: {fixed: b => b + 2, use: '글 본문(article)·리드 문단', slots: ANY},
  lead: {fluid: b => [b + 2, 1.6, b + 4], use: '머리말 설명·히어로 본문', slots: ANY},
  sub: {exp: 1, cap: 24, use: '부품 제목(h3)·카드 제목', slots: ANY},
  'sub-l': {exp: 1.35, cap: 28, fluid: true, min: .8, use: '큰 카드·타임라인 제목', slots: ANY},
  quote: {exp: 1.5, cap: 28, fluid: true, min: .78, use: '인용문(한 칸 이상)', slots: ['.kit-quote']},
  'quote-s': {exp: .8, cap: 20, use: '좁은 칸의 인용문', slots: ['.kit-quote']},
  'quote-l': {exp: 2.6, cap: 34, fluid: true, min: .72, use: '글 안의 인용문(article)', slots: ['.kit-quote']},
  glyph: {exp: 3.2, cap: 56, use: '따옴표 장식 글자', slots: ['.kit-quote']},
  app: {exp: 2.5, cap: 38, fluid: true, min: .85, minAfter: ['sub', 3], use: '앱 화면의 제목(h1)', slots: ['h1', '.kit-page-header', '.kit-profile-id', '[data-page=']},
  heading: {exp: 3.2, cap: 44, fluid: true, min: .74, minCap: 30, minAfter: ['sub', 3], use: '섹션 머리말(h2)', slots: ['h2', '.kit-section-head', '.kit-empty']},
  'heading-s': {derive: ['heading', .8], minAfter: ['sub', 1], use: '문서·설정의 섹션 머리말', slots: ['.kit-section-head', '[data-page=', '.kit-section']},
  cta: {derive: ['heading', 1.1], use: 'CTA 띠의 제목', slots: ['.kit-cta']},
  stat: {exp: 4.2, cap: 44, fluid: true, min: .7, use: '지표 값', slots: ['.kit-metric']},
  'stat-s': {exp: 2.7, cap: 30, fluid: true, min: .78, use: '프로필 수치·점수', slots: ['.kit-profile-stats', '.kit-score', '.kit-metric']},
  price: {exp: 4, cap: 42, fluid: true, min: .74, use: '가격', slots: ['.kit-price']},
  fact: {exp: 4.5, cap: 46, fluid: true, min: .64, use: '히어로 수치', slots: ['.kit-hero-facts']},
  logo: {exp: .95, cap: 22, fluid: true, min: .85, use: '로고 이름 줄', slots: ['.kit-logos']},
  title: {exp: 5, cap: 72, fluid: true, min: .68, minCap: 38, minAfter: ['heading', 4], use: '페이지 제목(h1)', slots: ['h1', '.kit-page-header', '[data-page=']},
  display: {exp: 6.2, cap: 96, fluid: true, min: .6, minCap: 44, minAfter: ['title', 4], use: '히어로 제목', slots: ['.kit-hero']},
  poster: {derive: ['display', 1.1], use: '커버 히어로 제목', slots: ['.kit-hero[data-variant=cover]']},
  mast: {fixedPx: [28, 6, 56], use: '신문 제호(masthead 브랜드)', slots: ['[data-shell=masthead]']},
  code: {fixedPx: [96, 19, 176], use: '상태 페이지의 큰 코드(404)', slots: ['.kit-empty-code']},
};

const px = n => Math.round(n * 10) / 10;
const clampCss = (lo, slope, hi) => `clamp(${Math.round(lo)}px,${px(slope)}vw,${Math.round(hi)}px)`;

/** 한 블루프린트(타이포그래피 프리셋 + scale 축)의 역할별 크기 값(CSS 문자열). */
export function roleSizes(b) {
  const preset = TYPE[b.typography], bodyPx = preset.body, r = Math.max(1.12, preset.ratio + (RATIO_SHIFT[b.scale] ?? 0));
  const out = {};
  const fixedSize = n => ({css: Math.round(n) + 'px', max: n, min: n, fluid: false});
  const fluidSize = (lo, slope, hi) => ({css: clampCss(lo, slope, hi), max: hi, min: lo, fluid: true});
  const resolve = name => {
    if (out[name]) return out[name];
    const role = ROLES[name];
    let v;
    if (role.derive) {
      const [from, k] = role.derive, base = resolve(from);
      v = base.fluid ? fluidSize(base.min * k, base.max * k / 12.8, base.max * k) : fixedSize(base.max * k);
    } else if (role.fixedPx) { const [lo, slope, hi] = role.fixedPx; v = fluidSize(lo, slope, hi); }
    else if (role.fixed) v = fixedSize(role.fixed(bodyPx));
    else if (typeof role.fluid === 'function') { const [lo, slope, hi] = role.fluid(bodyPx); v = fluidSize(lo, slope, hi); }
    else {
      const max = Math.min(role.cap, bodyPx * Math.pow(r, role.exp));
      v = role.fluid ? fluidSize(Math.min(max, Math.max(bodyPx + 2, max * role.min, 0), role.minCap ?? Infinity), max / 12.8, max) : fixedSize(max);
    }
    // 좁은 화면에서도 위계가 뒤집히지 않게: 이 역할의 최솟값은 아래 단계의 값보다 gap px 크다(6차 진단 HIER_INVERT)
    if (role.minAfter && v.fluid) {
      const [below, gap] = role.minAfter, b = resolve(below);
      v = fluidSize(Math.min(v.max, Math.max(v.min, (b.fluid ? b.min : b.max) + gap)), v.max / 12.8, v.max);
    }
    return out[name] = v;
  };
  for (const name of Object.keys(ROLES)) resolve(name);
  return out;
}

export const roleVar = name => `--kit-t-${name}`;

/** 서체·역할 크기·자간·행간·굵기 선언. axisVars가 :root에 넣는다. */
export function typeVars(b, weightHead) {
  const preset = TYPE[b.typography], sizes = roleSizes(b);
  // 산세리프 제목은 600 아래에서 본문(16px)에 비해 가늘어 보이므로(5차 실측) 바닥을 600으로 두고, 세리프·디돈·슬랩 제목은 400까지 내린다.
  const floor = ['iowan', 'georgia', 'charter', 'baskerville', 'didone', 'slab'].includes(preset.head) ? 400 : 600;
  const hw = Math.min(900, Math.max(floor, weightHead + preset.hw)), t = preset.track, lh = preset.lh;
  const decls = [
    `--kit-heading:${STACKS[preset.head]}`, `--kit-font:${STACKS[preset.text]}`, `--kit-mono:${STACKS.mono}`,
    `--kit-hw:${hw}`, `--kit-line:${lh.body}`,
    ...Object.keys(ROLES).map(name => `${roleVar(name)}:${sizes[name].css}`),
    ...Object.entries(t).map(([k, v]) => `--kit-tr-${k}:${v}em`),
    ...Object.entries(lh).filter(([k]) => k !== 'body').map(([k, v]) => `--kit-lh-${k}:${v}`),
    `--kit-case-label:${preset.label_case === 'upper' ? 'uppercase' : 'none'}`, `--kit-nums:${preset.nums === 'tabular' ? 'tabular-nums' : 'normal'}`,
  ];
  return decls;
}

// ---------- CSS lint ----------
const SIZE_OK = /^(inherit|initial|unset|0|1em|100%)$/;
const ROLE_RE = /^var\(--kit-t-([a-z-]+)\)$/;
/** 칸 폭에 맞춰 줄이는 형태: min(역할, 칸 폭 비례). 칸이 좁을 때 큰 글자가 칸을 넘지 않게 하는 것이 목적이다. */
const FIT_RE = /^min\(var\(--kit-t-([a-z-]+)\),.*cqw.*\)$/;

/** CSS 텍스트에서 font-size·font 선언을 검사한다. [{selector, prop, value, reason}]
 *  RAW: 역할이 아닌 크기(px·rem·em·clamp·calc)  ROLE: 알 수 없는 역할  SLOT: 이 역할이 허용되지 않은 자리  SHORTHAND: font 약식 선언은 크기를 숨기므로 금지 */
export function lintType(css) {
  const out = [];
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = selector.trim().replace(/\s+/g, ' ');
    if (sel.startsWith('@') || sel.startsWith('/*')) continue;
    for (const decl of body.split(/;(?![^(]*\))/)) {
      const i = decl.indexOf(':'); if (i < 0) continue;
      const prop = decl.slice(0, i).trim(), value = decl.slice(i + 1).replace(/!important/, '').trim();
      if (prop === 'font') { if (!/^inherit$/.test(value)) out.push({selector: sel.slice(0, 80), prop, value: value.slice(0, 60), reason: 'SHORTHAND'}); continue; }
      if (prop !== 'font-size') continue;
      if (SIZE_OK.test(value)) continue;
      const m = ROLE_RE.exec(value) ?? FIT_RE.exec(value);
      if (!m) { out.push({selector: sel.slice(0, 80), prop, value: value.slice(0, 60), reason: 'RAW'}); continue; }
      const role = ROLES[m[1]];
      if (!role) { out.push({selector: sel.slice(0, 80), prop, value, reason: 'ROLE'}); continue; }
      if (!role.slots.includes('*') && !role.slots.some(s => sel.includes(s))) out.push({selector: sel.slice(0, 80), prop, value, reason: 'SLOT ' + m[1] + ' ← ' + role.slots.join(' | ')});
    }
  }
  return out;
}

// ---------- docs ----------
const scaleNames = {tight: '촘촘한 제목', balanced: '균형', dramatic: '극적인 제목'};
export function typographyMarkdown() {
  const sample = id => ['tight', 'balanced', 'dramatic'].map(s => { const z = roleSizes({typography: id, scale: s}); return [z.sub.max, z.heading.max, z.title.max, z.display.max].map(x => Math.round(x)).join('/'); });
  const presetRows = TYPE_IDS.map(id => { const p = TYPE[id]; return `| \`${id}\` | ${p.label} | ${p.concept} | ${p.head} / ${p.text} | ${p.body} | ${p.ratio} | ${p.hw >= 0 ? '+' : ''}${p.hw} | ${p.track.display} | ${p.lh.display} / ${p.lh.body} | ${sample(id)[1]} |`; }).join('\n');
  const roleRows = Object.entries(ROLES).map(([name, r]) => `| \`--kit-t-${name}\` | ${r.use} | ${r.slots.includes('*') ? '어디서나' : r.slots.map(s => '`' + s + '`').join(', ')} |`).join('\n');
  const stackRows = Object.entries(STACKS).map(([id, s]) => `| \`${id}\` | ${s.split(',').slice(0, 5).join(', ').replace(/"/g, '')} … |`).join('\n');
  return `# 타이포그래피 시스템

> 이 문서는 \`src/typography.mjs\`에서 생성됩니다(\`npm run docs\`). 손으로 고치지 않습니다.

서체는 컨셉마다 달라야 한다. 그러나 서체만 바꾸면 비례와 자간이 어긋난다. 그래서 **타이포그래피 프리셋** 하나가 서체 조합, 크기 비율, 제목 굵기, 자간, 행간, 본문 크기를 한 벌로 정한다. 부품은 크기를 고르지 않고 **크기 역할**만 쓴다.

## 프리셋 ${TYPE_IDS.length}종

\`scale\` 축(촘촘한 제목·균형·극적인 제목)은 비율을 −0.07 · 0 · +0.10 옮긴다. 마지막 열은 균형 스케일에서 섹션 머리말(h2)의 최대 px다.

| id | 이름 | 컨셉 | 제목/본문 서체 | 본문 px | 비율 | 굵기 이동 | 큰 제목 자간(em) | 큰 제목/본문 행간 | h2 px |
|---|---|---|---|---|---|---|---|---|---|
${presetRows}

크기 단계(sub / heading / title / display, 최대 px)는 본문 크기 × 비율의 거듭제곱이다: sub = r¹ · app = r²·⁵ · heading = r³·² · title = r⁵ · display = r⁶·² (상한 24·38·44·72·96px). 예를 들어 \`sans\`는 ${['tight', 'balanced', 'dramatic'].map((s, i) => `${scaleNames[s]} ${sample('sans')[i]}`).join(' · ')}.

### 규칙

1. **한글 자간.** 한글은 같은 크기의 라틴보다 획이 많아 −0.035em 이하로 조이면 뭉친다. 큰 제목도 −0.05em을 넘기지 않는다(\`swiss\`·\`grotesk\`·\`poster\`만 −0.04em 아래).
2. **행간은 역할이 정한다.** 큰 제목일수록 좁게(0.98~1.2), 본문은 1.55~1.85. 문학·책 계열은 1.8 이상.
3. **굵기.** 제목 굵기는 \`weight\` 축(600·700·800)에 프리셋 이동(−300~+200)을 더해 400~900으로 자른다. 가는 제목(\`luxe\`·\`literary\`)은 400까지 내려간다.
4. **숫자.** \`swiss\`·\`newsroom\`·\`tech\`·\`terminal\`은 지표·표의 숫자를 고정폭(\`tabular-nums\`)으로 맞춘다.
5. **눈썹글·라벨.** 대문자 변환(\`--kit-case-label\`)은 프리셋이 정한다.

## 크기 역할(\`--kit-t-*\`)

| 역할 | 쓰임 | 허용된 자리 |
|---|---|---|
${roleRows}

24px을 넘는 역할은 허용된 자리(선택자)에서만 쓸 수 있다. \`lintType\`이 스타일시트의 모든 \`font-size\`를 검사해 역할이 아닌 값(RAW), 알 수 없는 역할, 허용되지 않은 자리(SLOT), \`font\` 약식 선언을 막는다. 카드 안의 지표 값이 히어로 제목 크기로 자라거나, 본문 칸에 제목 크기가 들어가는 일은 CSS 단계에서 만들 수 없다.

## 서체 스택(시스템 서체)

| 스택 | 앞의 서체 |
|---|---|
${stackRows}

모든 스택은 같은 색의 한글 서체로 끝난다(산세리프 \`Apple SD Gothic Neo\`·\`Noto Sans KR\`·\`Malgun Gothic\`, 세리프 \`AppleMyungjo\`·\`Noto Serif KR\`·\`Batang\`, 고정폭 \`D2Coding\`).

## 서체 조달: 왜 웹폰트를 싣지 않았나

생성되는 페이지는 \`Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:\`이고 외부 요청이 하나도 없는 자기완결 문서다(ADR 0001). \`@font-face\`로 서체를 불러오려면 \`font-src\`를 열어야 하고, 한글 서체는 가장 가벼운 부분 집합도 수백 KB라 페이지마다 안에 넣기에는 무겁다(조합 갤러리는 한 번에 수십 쪽을 연다). 그래서 이 라운드는 **시스템 서체만으로** 컨셉별 목소리를 만들고, 그 차이를 서체 이름 하나가 아니라 비율·굵기·자간·행간·본문 크기 전체에서 낸다.

한계: 시스템 서체는 기기마다 다르다. 이 표의 앞쪽 서체는 macOS·iOS에서 확인했고, Windows·Android·Linux에서는 스택의 다음 서체로 내려간다(제목의 세리프·디돈·슬랩 느낌이 약해진다). 비율·자간·행간은 어디서나 같다.

### 웹폰트를 쓴다면: 후보와 라이선스(확인 필요)

아래는 이 저장소의 제약이 풀렸을 때(예: 서체를 \`site/fonts/\`에 두고 \`font-src 'self'\`를 여는 배포) 쓸 후보다. 라이선스는 각 프로젝트의 공개 문서 기준이며 **재배포 전에 원문 확인이 필요**하다. 이 라운드에서는 어느 것도 저장소에 포함하지 않았다.

| 서체 | 용도 | 라이선스 | 비고 |
|---|---|---|---|
| Pretendard | 한글+라틴 산세리프 | SIL OFL 1.1 | 가변 서체, 동적 부분 집합 배포본이 있다 |
| Noto Sans KR / Noto Serif KR | 한글 산세리프·세리프 | SIL OFL 1.1 | 부분 집합(unicode-range) 분할 배포가 일반적 |
| Nanum Gothic / Myeongjo | 한글 산세리프·명조 | SIL OFL 1.1 | 네이버 배포 |
| IBM Plex Sans KR | 한글 산세리프 | SIL OFL 1.1 | 기술 문서 어조 |
| Gowun Batang / Dodum | 한글 명조·산세리프 | SIL OFL 1.1 | 문학·부드러운 어조 |
| Inter | 라틴 산세리프 | SIL OFL 1.1 | 숫자 정렬 기능 풍부 |

## 강제 지점

| 지점 | 무엇을 막나 | 파일 |
|---|---|---|
| 프리셋 표 | 서체 스택이 한글 대체 서체 없이 끝나는 것, 비율·자간 범위를 벗어난 값 | \`tests/typography.test.mjs\` |
| 역할 불변식 | sub < heading < title < display 순서가 어떤 프리셋·스케일에서도 뒤집힘 | \`tests/typography.test.mjs\` |
| CSS 린트 | 역할이 아닌 크기, 자리 밖의 큰 역할, \`font\` 약식 | \`lintType\`, \`tests/typography.test.mjs\` |
| 렌더 실측 | 실제 화면에서 위계가 뒤집히거나 큰 글자가 좁은 칸에 접히는 곳 | \`layout-probe.mjs\` \`HIER_INVERT\`·\`BIG_NARROW\` |
`;
}
