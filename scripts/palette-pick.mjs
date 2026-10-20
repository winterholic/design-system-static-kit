#!/usr/bin/env node
/**
 * 팔레트 라이브러리 선정 도구(5차). 입력은 렌더된 Coolors 목록 관측(docs/evidence/*.json)이고,
 * 출력은 src/catalog/palette-rows.mjs(후보 전체)와 src/catalog/theme-palettes.mjs(테마별 추천 순서)다.
 *
 * 방법: 좋아요 수가 있는 인기 팔레트를 계열별 할당량 안에서 높은 순으로 채택한다. 보라-파랑 계열이 한 팔레트의 대부분을
 * 차지하는 경우(이른바 기본 인디고·바이올렛 그라데이션)와 네온 무지개는 상한을 둬 목록이 그 색으로 쏠리지 않게 한다.
 * 이 선정은 취향의 근사이며 미감을 보증하지 않는다. 대비(WCAG AA)는 선정 기준이 아니라 토큰 해석(tokens.mjs)이 모든 팔레트에서 보장한다.
 * 사용: node scripts/palette-pick.mjs [--dry]
 */
import {readFile, writeFile} from 'node:fs/promises';
import {hsl, familyOf, toneOf} from '../src/catalog/palettes.mjs';
import {paletteRows as all} from '../src/catalog/palette-rows.mjs';
// 선정 도구는 몇 번을 돌려도 같은 결과여야 하므로 이전 실행이 만든 library 행은 입력에서 뺀다(처음 160개만 기준).
const existing = all.filter(r => r[0] !== 'library');

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const popular = await read('../docs/evidence/coolors-popular-2026-10-20.json');
const key = colors => colors.map(c => c.replace('#', '').toUpperCase()).join('-');

// ---- 1. 후보 풀: 새 관측(좋아요 수 있음) + 이전 관측 ----
const pool = new Map();
for (const p of popular.palettes) { const k = key(p.colors); const prev = pool.get(k); if (!prev || (p.likes ?? 0) > (prev.likes ?? 0)) pool.set(k, {slug: k, colors: p.colors.map(c => c.toUpperCase()), label: p.page_label, likes: p.likes, tags: new Set([...(prev?.tags ?? []), p.source_tag])}); else prev.tags.add(p.source_tag); }
// 이전 관측(docs/evidence/coolors-palettes.json)은 좋아요 수가 문자열이고 일부 항목의 스워치가 이웃 팔레트와 붙어 있어 후보 풀에는 쓰지 않는다. 기존 160개의 근거로만 남는다.
const known = new Set(existing.map(r => r[3].toUpperCase()));

// ---- 2. 브랜드 스워치와 품질 신호 ----
function brandIndex(colors) {
  const h = colors.map(hsl);
  let best = -1, score = -1;
  h.forEach((x, i) => { const s = x.s * (1 - Math.abs(x.l - .45) * 1.25); if (x.s > .15 && x.l > .12 && x.l < .88 && s > score) { score = s; best = i; } });
  if (best >= 0) return best;
  // 무채색 팔레트: 너무 어둡지 않은 가장 어두운 색(글자·행동색으로 쓰기 좋다)
  const order = h.map((x, i) => [x.l, i]).filter(([l]) => l > .14 && l < .6).sort((a, b) => a[0] - b[0]);
  return order[0]?.[1] ?? h.map((x, i) => [Math.abs(x.l - .35), i]).sort((a, b) => a[0] - b[0])[0][1];
}
const violetBlue = colors => colors.map(hsl).filter(x => x.s > .3 && x.h >= 225 && x.h <= 300 && x.l > .15 && x.l < .9).length;
const neonish = colors => { const h = colors.map(hsl); return h.filter(x => x.s > .9 && x.l > .42 && x.l < .68).length >= 3; };
const SEASONAL = /christmas|halloween|valentine|easter|santa|spooky|pumpkin|ghost|witch|candy cane/i;

const quota = {neutral: 40, earth: 44, red: 22, orange: 22, yellow: 16, green: 44, teal: 46, blue: 64, purple: 6, pink: 22, multi: 8};
const candidates = [...pool.values()].filter(p => p.colors.length >= 4 && p.colors.length <= 7 && typeof p.likes === 'number' && !known.has(p.slug) && !SEASONAL.test(p.label)).map(p => {
  const brand = brandIndex(p.colors), family = familyOf(p.colors, brand);
  return {...p, brand, family, tone: toneOf(p.colors), vb: violetBlue(p.colors), neon: neonish(p.colors)};
}).filter(p => new Set(p.colors).size >= 4 && Math.max(...p.colors.map(c => hsl(c).l)) - Math.min(...p.colors.map(c => hsl(c).l)) > .12)
  .filter(p => (p.family !== 'purple' ? p.vb < 3 : true)).filter(p => !(p.neon && p.family !== 'multi'));
candidates.sort((a, b) => (b.likes ?? -1) - (a.likes ?? -1) || (a.label ?? "").localeCompare(b.label ?? ""));

const picked = [], used = Object.fromEntries(Object.keys(quota).map(f => [f, 0])), seenNames = new Set(existing.map(r => r[5]));
for (const p of candidates) {
  if (used[p.family] >= quota[p.family]) continue;
  // 같은 이름이 이미 있으면 번호를 붙인다(Coolors에는 같은 제목의 다른 팔레트가 많다).
  used[p.family]++; picked.push(p);
}

// ---- 3. 행 만들기 ----
const slugify = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ids = new Set(existing.map(r => r[1])), likesOf = new Map([...pool.values()].map(p => [p.slug, p.likes]));
const rows = existing.map(r => [r[0], r[1], r[2], r[3], r[4], r[5], likesOf.get(r[3].toUpperCase()) ?? null]);
for (const p of picked) {
  let id = slugify(p.label) || 'palette', n = 2; const base = id;
  while (ids.has(id)) id = base + '-' + n++;
  ids.add(id);
  rows.push(['library', id, p.label || id, p.slug, p.brand, p.label, p.likes]);
}

// ---- 4. 테마별 추천: 계열·명도 선호 + 좋아요 + 기존 배정 ----
const PREF = {
  workspace: [['blue', 'teal', 'neutral'], ['light', 'mid']], ledger: [['neutral', 'blue', 'teal'], ['light', 'mid']], console: [['neutral', 'teal', 'blue', 'green'], ['dark']],
  aurora: [['teal', 'green', 'blue', 'pink'], ['mid', 'dark']], trust: [['blue', 'teal', 'green'], ['light', 'mid']], insight: [['blue', 'teal', 'orange', 'green'], ['light', 'mid']],
  hub: [['orange', 'teal', 'pink', 'green', 'yellow'], ['light', 'mid']], precision: [['neutral', 'blue', 'teal'], ['light', 'mid']], neon: [['multi', 'teal', 'pink', 'green'], ['dark', 'mid']],
  playful: [['multi', 'pink', 'yellow', 'orange', 'teal'], ['light', 'mid']], studio: [['neutral', 'earth'], ['light', 'dark']], gallery: [['neutral', 'earth'], ['light', 'mid']],
  brutalist: [['multi', 'red', 'yellow', 'neutral', 'orange'], ['light', 'mid']], retro: [['earth', 'orange', 'red', 'yellow'], ['light', 'mid']], signal: [['red', 'orange', 'yellow', 'blue'], ['mid', 'light']],
  editorial: [['neutral', 'earth', 'red'], ['light', 'mid']], paper: [['earth', 'neutral', 'yellow'], ['light']], manual: [['blue', 'teal', 'green', 'neutral'], ['light', 'mid']],
  journal: [['earth', 'pink', 'neutral', 'green'], ['light', 'mid']], magazine: [['red', 'neutral', 'earth'], ['mid', 'dark']], botanical: [['green', 'earth', 'teal'], ['mid', 'light']],
  cloud: [['blue', 'pink', 'teal'], ['light']], clinic: [['teal', 'blue', 'green'], ['light', 'mid']], dining: [['red', 'earth', 'orange'], ['dark', 'mid']],
  cafe: [['earth', 'orange'], ['mid', 'light']], stay: [['teal', 'orange', 'blue'], ['mid', 'light']], commerce: [['orange', 'earth', 'blue', 'neutral'], ['light', 'mid']],
  beauty: [['pink', 'earth', 'red'], ['light', 'mid']], realty: [['blue', 'teal', 'neutral'], ['mid', 'dark']], atelier: [['pink', 'orange', 'yellow', 'green', 'teal'], ['light', 'mid']],
  learning: [['blue', 'orange', 'yellow', 'green'], ['light', 'mid']], civic: [['blue', 'neutral', 'teal'], ['light', 'mid']], hanji: [['earth', 'red', 'neutral'], ['light', 'mid']],
  heritage: [['yellow', 'earth', 'red'], ['mid', 'light']], clarity: [['blue', 'teal', 'neutral'], ['light', 'mid']], pocket: [['green', 'teal', 'pink'], ['light', 'mid']],
  nocturne: [['neutral', 'blue', 'teal', 'red'], ['dark']], sport: [['orange', 'red', 'yellow', 'neutral'], ['mid', 'dark']], solar: [['yellow', 'orange', 'blue'], ['light', 'mid']],
  ocean: [['blue', 'teal'], ['mid', 'dark', 'light']], enterprise: [['blue', 'neutral', 'teal'], ['light', 'mid']], devtool: [['neutral', 'teal', 'green', 'blue'], ['dark', 'mid']],
  luxe: [['neutral', 'earth', 'yellow'], ['dark']], swiss: [['neutral', 'red'], ['light', 'mid']], colorblock: [['multi', 'red', 'blue', 'yellow', 'orange'], ['light', 'mid']],
  newsroom: [['neutral', 'red', 'blue'], ['light', 'mid']], academic: [['neutral', 'blue', 'earth'], ['light']], wedding: [['pink', 'earth', 'green'], ['light']],
  kids: [['multi', 'yellow', 'orange', 'pink', 'teal'], ['light', 'mid']], wine: [['red', 'earth'], ['dark', 'mid']], school: [['blue', 'green', 'yellow', 'teal'], ['light', 'mid']],
  bank: [['teal', 'blue', 'green'], ['light', 'mid']], garden: [['green', 'earth', 'teal'], ['light', 'mid']], game: [['orange', 'teal', 'red', 'multi', 'green'], ['dark', 'mid']],
};
const PURPLE_OK = new Set(['hub', 'atelier', 'playful', 'neon', 'kids', 'colorblock', 'nocturne', 'game', 'wedding']);
const meta = rows.map(r => { const colors = r[3].split('-').map(x => '#' + x.toUpperCase()); return {row: r, id: r[1], home: r[0], colors, family: familyOf(colors, r[4]), tone: toneOf(colors), likes: r[6] ?? 0, vb: violetBlue(colors), neon: neonish(colors)}; });
const RECOMMENDED = 8;
const themeRecs = {}, usage = new Map(), asDefault = new Set();
// 선호가 좁은 테마부터 고른다. 이미 다른 테마의 추천·기본값으로 쓰인 팔레트는 감점해 테마마다 다른 얼굴이 나오게 한다.
const order = Object.keys(PREF).sort((x, y) => PREF[x][0].length - PREF[y][0].length || x.localeCompare(y));
for (const themeId of order) {
  const [fams, tones] = PREF[themeId];
  const scored = meta.map(m => {
    let s = 0; const fi = fams.indexOf(m.family);
    if (fi >= 0) s += [6, 4.5, 3.5, 3, 2.5][Math.min(fi, 4)]; else s -= 3;
    const ti = tones.indexOf(m.tone); s += ti === 0 ? 2.5 : ti > 0 ? 1.2 : -2;
    s += Math.log10(1 + m.likes) * 0.9;
    if (m.home === themeId) s += 3;
    if (m.vb >= 3 && !PURPLE_OK.has(themeId)) s -= 8;
    if (m.neon && !['neon', 'playful', 'brutalist', 'kids', 'game', 'colorblock'].includes(themeId)) s -= 6;
    s -= 0.7 * (usage.get(m.id) ?? 0);
    return [s, m];
  }).sort((a, b) => b[0] - a[0] || a[1].id.localeCompare(b[1].id));
  // 기본값(첫째)은 다른 테마의 기본값과 겹치지 않게 한다.
  const list = scored.map(([, m]) => m.id), first = list.find(id => !asDefault.has(id));
  const rest = list.filter(id => id !== first).slice(0, RECOMMENDED - 1);
  themeRecs[themeId] = [first, ...rest]; asDefault.add(first);
  for (const id of themeRecs[themeId]) usage.set(id, (usage.get(id) ?? 0) + 1);
}
// 점수만으로는 테마의 성격과 어긋나는 기본값이 나온다(분석 대시보드에 파스텔 핑크, 학교에 분홍·시안 등). 사람이 화면으로 읽고 고른 기본값은 여기에 둔다.
const DEFAULTS = {aurora: 'turquoise-harmony', insight: 'deep-blue-sea', neon: 'neon-glow-party', brutalist: 'sunset-glow', manual: 'moonlit-mist', cloud: 'soft-pastel-shades', clinic: 'refreshing-aqua-tones', luxe: 'gold', swiss: 'coastal', colorblock: 'contrast-pop', newsroom: 'summer-ocean-breeze', academic: 'deep-sea-2', ledger: 'dark-slate-whisper', kids: 'bright-bold-colors', school: 'azure-skies', civic: 'deep-blue-sea-2', game: 'midnight-fire', stay: 'summer-sunset', playful: 'bright-contrasts'};
for (const [themeId, id] of Object.entries(DEFAULTS)) {
  if (!ids.has(id)) throw new Error('Unknown default palette ' + id + ' for ' + themeId);
  themeRecs[themeId] = [id, ...themeRecs[themeId].filter(x => x !== id)].slice(0, RECOMMENDED);
}

const q = v => JSON.stringify(v);
const header = `// Row: [home theme or 'library', paletteId, display name, coolors slug (hex-hex-...), brand swatch index, Coolors page label, likes on 2026-10-20 (null = not seen in the popularity listing)]\n// 후보 전체. scripts/palette-pick.mjs가 렌더된 Coolors 관측(docs/evidence)에서 만든다. 손으로 고치지 말고 선정 도구를 다시 돌린다.\nexport const paletteRows = [\n`;
const out = header + rows.map(r => '  ' + q(r)).join(',\n') + '\n];\n';
const recs = '// 테마별 추천 팔레트(순서가 곧 우선순위, 첫째가 기본값). scripts/palette-pick.mjs가 만든다.\nexport const themePalettes = {\n' + Object.entries(themeRecs).map(([t, list]) => '  ' + q(t) + ': ' + q(list)).join(',\n') + '\n};\n';
if (process.argv.includes('--dry')) {
  console.log('pool', pool.size, 'candidates', candidates.length, 'picked', picked.length, 'rows', rows.length);
  console.log('quota used', JSON.stringify(used));
  for (const [t, ids2] of Object.entries(themeRecs)) console.log(t.padEnd(11), ids2.join(' '));
} else {
  await writeFile(new URL('../src/catalog/palette-rows.mjs', import.meta.url), out);
  await writeFile(new URL('../src/catalog/theme-palettes.mjs', import.meta.url), recs);
  console.log('wrote', rows.length, 'palette rows and', Object.keys(themeRecs).length, 'theme recommendations');
}
