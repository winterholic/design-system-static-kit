import {paletteRows} from './palette-rows.mjs';

/** 색 계열: 조립기에서 팔레트를 거를 때 쓰는 분류. 팔레트 색에서 계산하므로 손으로 붙인 이름과 어긋나지 않는다. */
export const paletteFamilies = {
  neutral: {label: '뉴트럴', swatch: '#8A939C'}, earth: {label: '어스·베이지', swatch: '#A98467'},
  red: {label: '레드', swatch: '#C8323C'}, orange: {label: '오렌지', swatch: '#E8782A'}, yellow: {label: '옐로', swatch: '#E9B824'},
  green: {label: '그린', swatch: '#4C9A5B'}, teal: {label: '틸·민트', swatch: '#1F9E96'}, blue: {label: '블루', swatch: '#2F6FB5'},
  purple: {label: '퍼플', swatch: '#7A55B8'}, pink: {label: '핑크', swatch: '#D96A94'}, multi: {label: '멀티', swatch: 'conic-gradient(#e63946,#f4a261,#e9c46a,#2a9d8f,#457b9d,#e63946)'},
};

const rgb = hex => hex.slice(1).match(/../g).map(n => parseInt(n, 16) / 255);
export function hsl(hex) {
  const [r, g, b] = rgb(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (!d) return {h: 0, s: 0, l};
  const s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return {h: h * 60, s, l};
}
const hueGap = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 360 - d); };

/** 브랜드 스워치의 색상·채도·명도와 스워치 전체의 퍼짐으로 계열을 정한다. */
export function familyOf(colors, brand) {
  const c = hsl(colors[brand]);
  const vivid = colors.map(hsl).filter(x => x.s > .45 && x.l > .2 && x.l < .85);
  if (vivid.length >= 4) {
    const hues = vivid.map(x => x.h);
    let spread = 0; for (const a of hues) for (const b of hues) spread = Math.max(spread, hueGap(a, b));
    if (spread > 150) return 'multi';
  }
  const meanS = colors.map(x => hsl(x).s).reduce((a, b) => a + b, 0) / colors.length;
  if (c.s < .14 || c.l > .93 || c.l < .08 || meanS < .17) {
    // 무채색에 가까운 브랜드색이어도 스워치 대부분이 따뜻한 갈색·베이지면 어스로 본다.
    const warm = colors.map(hsl).filter(x => x.s > .12 && x.h >= 10 && x.h <= 55).length;
    return warm >= Math.ceil(colors.length / 2) ? 'earth' : 'neutral';
  }
  const h = c.h;
  if ((h >= 12 && h < 55) && (c.s < .55 || c.l < .42 || c.l > .8)) return 'earth';
  if (h >= 345 || h < 15) return c.l > .72 && c.s > .5 ? 'pink' : 'red';
  if (h < 40) return 'orange';
  if (h < 68) return 'yellow';
  if (h < 165) return 'green';
  if (h < 200) return 'teal';
  if (h < 250) return 'blue';
  if (h < 295) return 'purple';
  return 'pink';
}
/** 스워치 평균 명도로 밝은·중간·어두운 팔레트를 나눈다. */
export function toneOf(colors) {
  const mean = colors.map(c => hsl(c).l).reduce((a, b) => a + b, 0) / colors.length;
  return mean > .64 ? 'light' : mean < .38 ? 'dark' : 'mid';
}

export const palettes = Object.fromEntries(paletteRows.map(([theme, id, name, slug, brand, label, likes = null]) => {
  const colors = slug.split('-').map(x => '#' + x.toUpperCase());
  return [id, {
    id, name, label, theme, colors, brand, likes,
    family: familyOf(colors, brand), tone: toneOf(colors),
    source: theme === 'library' ? {
      url: 'https://coolors.co/palette/' + slug.toLowerCase(),
      discovery: 'https://coolors.co/palettes/popular',
      observed: '2026-10-20',
      method: 'rendered Coolors popular listing with like counts (Playwright Chromium, 73 tag pages, infinite-scroll steps), swatches and likes read from page text',
      evidence: 'docs/evidence/coolors-popular-2026-10-20.json',
    } : {
      url: 'https://coolors.co/palette/' + slug.toLowerCase(),
      discovery: 'https://coolors.co/palettes/popular',
      observed: '2026-10-18',
      method: 'rendered Coolors palette listing (Playwright Chromium / ttakkari_browser), swatches read from page text',
      evidence: 'docs/evidence/coolors-palettes.json',
    },
  }];
}));
