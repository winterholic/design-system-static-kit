// 진단 결과(diagnose.mjs의 JSON)에서 (1) src/combo-grades.mjs(실험 조합 목록)와 (2) docs/diagnosis-round6.md(등급 분포·템플릿·구성 변형 표)를 만든다.
// 사용: node scripts/design-qa/grades.mjs <after.json> [--before before.json] [--write]
// --write가 없으면 결과를 표준 출력에만 낸다. 증거 JSON은 docs/evidence/에 둔다(전체 조합 등급과 코드 수만 담은 작은 파일).
import {readFileSync, writeFileSync} from 'node:fs';
import {SEVERE} from './diagnose-meta.mjs';

const [afterFile, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : null; };
const after = JSON.parse(readFileSync(afterFile, 'utf8')), before = opt('--before') ? JSON.parse(readFileSync(opt('--before'), 'utf8')) : null;
const root = new URL('../../', import.meta.url).pathname;

const dist = d => { const out = {A: 0, B: 0, C: 0}; for (const e of Object.values(d.combos)) out[e.grade]++; return out; };
const pct = (n, total) => (total ? (n / total * 100).toFixed(1) : '0.0') + '%';
const codesOf = d => { const out = {}; for (const e of Object.values(d.combos)) for (const c of Object.keys(e.codes)) out[c] = (out[c] ?? 0) + 1; return out; };
const parts = id => id.split('~').slice(1);

// ---- 템플릿 표: 기본 구성의 등급, 그 템플릿 조합 중 C 비율
function templateRows(d) {
  const by = new Map();
  for (const [id, e] of Object.entries(d.combos)) {
    const t = by.get(e.tpl) ?? {tpl: e.tpl, n: 0, A: 0, B: 0, C: 0, base: null, codes: {}};
    t.n++; t[e.grade]++;
    if (!id.includes('~')) t.base = e.grade;
    for (const [c, k] of Object.entries(e.codes)) t.codes[c] = (t.codes[c] ?? 0) + k;
    by.set(e.tpl, t);
  }
  return by;
}
// ---- 구성 변형 옵션 표: 옵션이 든 조합의 C 비율 (같은 템플릿 기본 구성 C 비율과 비교)
function optionRows(d) {
  const by = new Map();
  for (const [id, e] of Object.entries(d.combos)) for (const p of parts(id)) { const o = by.get(p) ?? {opt: p, n: 0, A: 0, B: 0, C: 0, codes: {}}; o.n++; o[e.grade]++; for (const c of Object.keys(e.codes)) o.codes[c] = (o.codes[c] ?? 0) + 1; by.set(p, o); }
  return by;
}

const dA = dist(after), nA = Object.keys(after.combos).length;
const dB = before ? dist(before) : null, nB = before ? Object.keys(before.combos).length : 0;
const cA = codesOf(after), cB = before ? codesOf(before) : {};
const tA = templateRows(after), tB = before ? templateRows(before) : new Map();
const oA = optionRows(after), oB = before ? optionRows(before) : new Map();

const topCodes = codes => Object.entries(codes).filter(([c]) => SEVERE.has(c)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, k]) => c + ' ' + k).join(', ') || '—';
const gradeWord = {A: 'A 그대로', B: 'B 손질', C: 'C 재설계'};

let md = `# 6차 전수 진단: 레이아웃·간격·타이포 품질

> 이 문서는 \`node scripts/design-qa/grades.mjs\`가 진단 결과(\`docs/evidence/diagnosis-round6.json\`)에서 만든다. 손으로 고치지 않는다.

## 방법

- **대상.** 템플릿 × 구성 변형 조합 전부(고유 화면만, 같은 화면은 한 번). 조합마다 **기본 테마 + 돌려 쓰는 테마 ${after.meta.extraThemes}개**를 **데스크톱 1440 · 모바일 390**에서 렌더한다(${nA.toLocaleString('en-US')}개 조합, ${after.meta.views.toLocaleString('en-US')}회 렌더).${before ? ` 같은 도구로 6차 이전 코드(${before.meta.label ?? '3c07dbad'})도 쟀다(${nB.toLocaleString('en-US')}개 조합, ${before.meta.views.toLocaleString('en-US')}회 렌더).` : ''}
- **측정.** 세 프로브를 한 렌더에 모두 돌린다: 4차 간격(\`spacing-probe\`), 5차 글줄(\`text-probe\`), 6차 배치(\`layout-probe\`: EMPTY_CELL 빈 칸, TIGHT_ROW 낮은 줄의 안쪽 여백, MEASURE 한 줄 길이, BIG_NARROW 좁은 칸의 큰 글자, HIER_INVERT 위계 뒤집힘, GRID_ORPHAN 마지막 줄 한 칸, BAND_ASYM 띠 여백 비대칭, EDGE_VIEW 화면 가장자리 글자).
- **등급.** A 그대로(지적 0) · B 손질(경미한 지적만: MEASURE·BAND_ASYM·OFF_SCALE·CTRL_PAD·ORPHAN_LINE 등) · C 재설계(심각한 지적이 한 번이라도: ${[...SEVERE].join(', ')}).
- **한계.** 이 등급은 측정 가능한 결함의 유무이지 미감의 보증이 아니다. 대표 화면은 따로 눈으로 확인했고(전후 스크린샷), 4,000여 조합 전수를 사람이 보지는 않았다. macOS 폰트로 쟀으며 Linux CI와 달라질 수 있다.

## 등급 분포

| | 조합 수 | A 그대로 | B 손질 | C 재설계 |
|---|---|---|---|---|
${before ? `| 6차 이전 | ${nB.toLocaleString('en-US')} | ${dB.A} (${pct(dB.A, nB)}) | ${dB.B} (${pct(dB.B, nB)}) | ${dB.C} (${pct(dB.C, nB)}) |\n` : ''}| **6차 이후** | ${nA.toLocaleString('en-US')} | ${dA.A} (${pct(dA.A, nA)}) | ${dA.B} (${pct(dA.B, nA)}) | ${dA.C} (${pct(dA.C, nA)}) |

C 등급 조합은 갤러리에서 **실험**으로 표시하고 기본으로 숨긴다(\`src/combo-grades.mjs\`). ${dA.C ? `현재 ${dA.C}개.` : '현재 C 등급은 0개라 숨긴 조합이 없다. 숨기는 쪽이 아니라 원인(벤토·격자·구성 변형의 적용 조건·위계)을 고쳐서 없앴다. 표시·숨김 장치는 합성 데이터로 시험한다(tests/combos.test.mjs).'}

## 지적 코드별 영향 조합 수

| 코드 | 심각도 | 6차 이전 | 6차 이후 |
|---|---|---|---|
${[...new Set([...Object.keys(cB), ...Object.keys(cA)])].sort((a, b) => (cB[b] ?? 0) - (cB[a] ?? 0) || (cA[b] ?? 0) - (cA[a] ?? 0)).map(c => `| ${c} | ${SEVERE.has(c) ? '심각' : '경미'} | ${cB[c] ?? 0} | ${cA[c] ?? 0} |`).join('\n')}

## 템플릿별 등급(${tA.size}개)

기본 구성의 등급과, 그 템플릿의 모든 조합 중 A/B/C 수다. 전/후는 6차 이전/이후.

| 템플릿 | 기본 구성 전 | 기본 구성 후 | 조합 전 A/B/C | 조합 후 A/B/C | 남은 심각 지적 |
|---|---|---|---|---|---|
${[...tA.values()].sort((a, b) => a.tpl.localeCompare(b.tpl)).map(t => { const b = tB.get(t.tpl); return `| ${t.tpl} | ${b?.base ?? '—'} | ${t.base ?? '—'} | ${b ? `${b.A}/${b.B}/${b.C}` : '—'} | ${t.A}/${t.B}/${t.C} | ${topCodes(t.codes)} |`; }).join('\n')}

## 구성 변형 옵션별(슬롯:옵션)

옵션이 든 조합 중 C 등급 비율. 6차 이전과 이후를 비교한다(조합 수가 줄어든 옵션은 적용 조건이 좁아진 것이다).

| 옵션 | 조합 전 | C 전 | 조합 후 | C 후 |
|---|---|---|---|---|
${[...new Set([...oA.keys(), ...oB.keys()])].sort().map(k => { const a = oA.get(k), b = oB.get(k); return `| ${k} | ${b?.n ?? 0} | ${b ? pct(b.C, b.n) : '—'} | ${a?.n ?? 0} | ${a ? pct(a.C, a.n) : '—'} |`; }).join('\n')}
`;

const experimental = Object.fromEntries(Object.entries(after.combos).filter(([, e]) => e.grade === 'C').map(([id, e]) => [id, 'C ' + Object.keys(e.codes).filter(c => SEVERE.has(c)).join('+')]).sort(([a], [b]) => a.localeCompare(b)));
const gradesFile = `/** 전수 진단(scripts/design-qa/diagnose.mjs)에서 C 등급이었던 조합: {조합 id: 등급과 심각한 지적 코드}. 생성 파일이므로 손으로 고치지 않는다(node scripts/design-qa/grades.mjs). */
export const EXPERIMENTAL = ${JSON.stringify(experimental, null, 1).replace(/\n\s*/g, '\n ').replace(/^\{\n /, '{\n ')};
export const GRADES_META = ${JSON.stringify({date: after.meta.date, combos: nA, summary: dA})};
`;
const compact = {meta: after.meta, combos: Object.fromEntries(Object.entries(after.combos).map(([id, e]) => [id, e.grade === 'A' ? 'A' : {g: e.grade, c: e.codes}]))};
const compactBefore = before ? {meta: before.meta, combos: Object.fromEntries(Object.entries(before.combos).map(([id, e]) => [id, e.grade === 'A' ? 'A' : {g: e.grade, c: e.codes}]))} : null;

if (rest.includes('--write')) {
  writeFileSync(root + 'docs/diagnosis-round6.md', md);
  writeFileSync(root + 'src/combo-grades.mjs', gradesFile);
  writeFileSync(root + 'docs/evidence/diagnosis-round6.json', JSON.stringify(compact));
  if (compactBefore) writeFileSync(root + 'docs/evidence/diagnosis-round6-before.json', JSON.stringify(compactBefore));
  console.log('written', Object.keys(experimental).length, 'experimental combos', JSON.stringify(dA));
} else console.log(md.slice(0, 3000));
