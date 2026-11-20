// 조립 방식 비교 실험(기본 자동 조립 / Design Recipe / AI 선택)의 재현 스크립트. 방법과 한계는 docs/ai-assembly-experiment.md.
// 세 팔은 같은 입력(docs/evidence/ai-assembly/inputs.json의 카탈로그 템플릿 콘텐츠)에서 만든다.
//   default = createBlueprint(템플릿 id)            코드로 결정적
//   recipe  = selectRecipe({recipe, templateId})    코드로 결정적
//   ai      = ai/selections.json의 선택 ID를 카탈로그로 푼 Blueprint. 선택은 사람(AI)이 정하지만 저장된 Blueprint는 결정적으로 다시 컴파일된다.
// 사용: node scripts/design-qa/ai-assembly.mjs <명령> [인자]
//   catalog <입력id>              AI 팔이 고를 수 있는 ID 목록(템플릿 구성 변형, 테마·변형·팔레트, 서체, 밀도, 스케일, 모드, 컨셉 look)
//   try <입력id> <선택.json>      AI 팔의 시도 하나: 선택을 카탈로그에 대조해 Blueprint로 만들고 1440·390px로 렌더, 보기용 시트와 프로브 요약을 낸다
//   record <입력id> <로그.json>   AI 팔 시도 로그와 최종 선택 저장(ai/log.json, ai/selections.json)
//   build                         default·recipe Blueprint, ai Blueprint(저장된 선택에서) 생성과 해시 기록(hashes.json)
//   verify                        저장된 해시와 대조: default·recipe를 코드로 다시 만들고, ai는 저장 Blueprint를 다시 컴파일해 HTML 해시가 같은지 확인
//   render [--only I01,I02]       세 팔을 320·390·768·1440px로 렌더해 shots/와 measure.json 저장(실행 시점 origin/main SHA를 기록)
//   results                       measure.json을 같은 표(results.md)로 정리
//   blind [--standalone <출력.html>]  눈가림 패키지 생성. --standalone은 이미지를 줄여 HTML 하나에 넣은 휴대폰 공유용 사본을 따로 만든다
//   blind                         눈가림 패키지: blind/(라벨 A/B/C)와 key.json(별도, blind 밖), blind/index.html
// 산출 위치: docs/evidence/ai-assembly/
import {chromium} from '@playwright/test';
import {mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, readdirSync, rmSync} from 'node:fs';
import {resolve, relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {templates, themes, palettes, concepts, axes, createBlueprint, layoutOptionsOf, repairAxes, CATALOG_VERSION} from '../../src/catalog.mjs';
import {compile, validateBlueprint} from '../../src/compiler.mjs';
import {selectRecipe, recipeBlueprint, recipeCheck} from '../../src/recipes.mjs';
import {recipes, recipeRules} from '../../src/catalog/recipes.mjs';
import {TYPE} from '../../src/typography.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';
import {pageMetrics} from './quality-metrics.mjs';
import {CLAIMS} from './quality-claims.mjs';
import {SEVERE, grade} from './diagnose-meta.mjs';

const root = resolve(import.meta.dirname, '../..');
const base = resolve(root, 'docs/evidence/ai-assembly');
const P = {inputs: resolve(base, 'inputs.json'), selections: resolve(base, 'ai/selections.json'), log: resolve(base, 'ai/log.json'), hashes: resolve(base, 'hashes.json'), measure: resolve(base, 'measure.json'), key: resolve(base, 'key.json'), bp: resolve(base, 'blueprints'), shots: resolve(base, 'shots'), blind: resolve(base, 'blind'), attempts: resolve(base, 'ai/attempts')};
const ARMS = ['default', 'recipe', 'ai'];
const WIDTHS = [320, 390, 768, 1440];
const git = c => execSync('git ' + c, {cwd: root, encoding: 'utf8'}).trim();
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const readJson = f => JSON.parse(readFileSync(f, 'utf8'));
const writeJson = (f, v) => { mkdirSync(resolve(f, '..'), {recursive: true}); writeFileSync(f, JSON.stringify(v, null, 1) + '\n'); };
const inputsDoc = () => readJson(P.inputs);

// ---------- 콘텐츠 고정 ----------
export const contentSha = id => { const t = templates[id]; return sha({name: t.name, pageType: t.pageType, chrome: t.chrome, tree: t.tree}); };
/** 트리의 문자열 리프를 `키=값` 목록으로 만든다. 팔 사이에 달라지면 안 되는 콘텐츠 문구를 대조하는 데 쓴다. */
const leaves = (node, out = []) => {
  if (Array.isArray(node)) node.forEach(n => leaves(n, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) typeof v === 'string' ? out.push(`${k}=${v}`) : leaves(v, out);
  return out;
};
const count = a => a.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
/** 구성 변형이 바꾸는 구조 필드. 이 키의 값 차이는 문구 변경으로 세지 않는다. */
const STRUCTURAL = new Set(['variant', 'align', 'columns', 'visual', 'motif', 'kind', 'surface', 'tone', 'size', 'layout', 'rhythm']);
/**
 * 팔이 만든 Blueprint 트리와 템플릿 트리의 문구 차이. 어느 팔도 문구를 쓰지 않으므로 차이는 카탈로그 구성 변형의 부수 효과뿐이다
 * (예: setHero가 split·product로 바꾸며 히어로 수치 facts를 지운다). 숨기지 않고 removed·added로 기록한다.
 */
export function contentDiff(templateId, blueprint) {
  const t = templates[templateId], a = count(leaves(t.tree)), b = count(leaves(blueprint.tree.children)), removed = [], added = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    if (STRUCTURAL.has(k.split('=')[0])) continue;
    const d = (b.get(k) ?? 0) - (a.get(k) ?? 0);
    if (d < 0) removed.push(k); else if (d > 0) added.push(k);
  }
  const chrome = JSON.stringify(blueprint.chrome) === JSON.stringify(t.chrome) ? null : '내비·chrome이 템플릿과 다름(셸의 항목 수 한도 보정)';
  return {removed, added, chrome};
}

// ---------- 선택 → Blueprint (AI 팔) ----------
/**
 * 선택 스키마(모두 선택, 카탈로그 ID만): {look:{concept,look}, theme, themeVariant, palette, mode, typography, density, scale, layout:{슬롯:옵션}}.
 * look은 컨셉 look(테마+변형+서체 묶음)의 줄임이고 theme·themeVariant·typography가 따로 있으면 그쪽이 우선한다. 자유 CSS·임의 토큰·임의 클래스 필드는 받지 않는다.
 */
const SELECTION_KEYS = new Set(['look', 'theme', 'themeVariant', 'palette', 'mode', 'typography', 'density', 'scale', 'layout']);
export function selectionToBlueprint(templateId, sel) {
  for (const k of Object.keys(sel)) if (!SELECTION_KEYS.has(k)) throw new Error('선택 필드가 카탈로그 밖이다: ' + k);
  const look = sel.look ? concepts[sel.look.concept]?.looks.find(l => l.id === sel.look.look) : null;
  if (sel.look && !look) throw new Error('없는 look: ' + JSON.stringify(sel.look));
  const theme = sel.theme ?? look?.theme, tv = sel.theme ? sel.themeVariant : (sel.themeVariant ?? look?.themeVariant), typography = sel.typography ?? look?.typography;
  if (theme && !themes[theme]) throw new Error('없는 테마: ' + theme);
  if (sel.palette && !palettes[sel.palette]) throw new Error('없는 팔레트: ' + sel.palette);
  for (const [k, v] of [['density', sel.density], ['scale', sel.scale], ['mode', sel.mode]]) if (v && !axes[k].includes(v)) throw new Error(`없는 ${k}: ${v}`);
  const slots = new Map(layoutOptionsOf(templateId).map(s => [s.id, new Set(s.options.map(o => o.id))]));
  for (const [slot, opt] of Object.entries(sel.layout ?? {})) if (!slots.get(slot)?.has(opt)) throw new Error(`${templateId}에 없는 구성 변형: ${slot}:${opt}`);
  const b = createBlueprint(templateId, theme, sel.palette, {themeVariant: tv, layout: sel.layout ?? {}, typography});
  const notes = [];
  if (sel.mode && sel.mode !== b.mode) { if (themes[b.theme].forbid.mode?.includes(sel.mode)) notes.push(`${b.theme} 테마는 ${sel.mode} 모드를 쓰지 않아 ${b.mode}로 남는다`); else b.mode = sel.mode; }
  if (sel.density) b.density = sel.density;
  if (sel.scale) b.scale = sel.scale;
  const asked = {density: sel.density, scale: sel.scale, mode: sel.mode && !notes.length ? sel.mode : undefined, typography};
  repairAxes(b);
  for (const [k, v] of Object.entries(asked)) if (v && b[k] !== v) notes.push(`${k}=${v} 요청이 축 규칙 보정으로 ${b[k]}가 됨`);
  const check = validateBlueprint(b);
  if (!check.valid) throw new Error('Blueprint 검증 실패: ' + check.errors.slice(0, 3).map(e => e.message ?? e.code).join(' / '));
  const rec = layoutOptionsOf(templateId).flatMap(s => s.options.filter(o => sel.layout?.[s.id] === o.id && o.recommended === false).map(o => `${s.id}:${o.id}`));
  return {blueprint: b, notes, notRecommended: rec};
}

// ---------- 팔 만들기 ----------
function recipeOf(input) { const pick = selectRecipe({recipe: input.recipe, templateId: input.templateId}); return {pick, blueprint: recipeBlueprint(pick.templateId, pick.layout, pick.view)}; }
function aiBlueprint(input) {
  const sel = existsSync(P.selections) ? readJson(P.selections)[input.id] : null;
  return sel ? selectionToBlueprint(input.templateId, sel.selection).blueprint : null;
}
const bpFile = (id, arm) => resolve(P.bp, `${id}__${arm}.json`);
const compileHtml = bp => { const c = validateBlueprint(bp); if (!c.valid) throw new Error('검증 실패'); return compile(bp).html; };

// ---------- 측정 ----------
const CLAIM_IDS = {'saas-landing': ['Q01', 'Q06', 'Q07', 'Q10', 'Q13'], 'ops-dashboard': ['Q04', 'Q08', 'Q11'], 'content-page': ['Q12']};
const claimById = Object.fromEntries(CLAIMS.map(c => [c.id, c]));
const claimWidths = c => new Set(c.targets.flatMap(t => t.widths ?? WIDTHS));
const heroRatio = () => {
  const hero = document.querySelector('main .kit-hero'); if (!hero) return null;
  const h = hero.querySelector('h1,h2'), sec = [...document.querySelectorAll('main .kit-section h2')].find(x => !x.closest('.kit-hero') && x.getBoundingClientRect().width > 0);
  const a = h ? parseFloat(getComputedStyle(h).fontSize) : null, b = sec ? parseFloat(getComputedStyle(sec).fontSize) : null;
  return {heroPx: a, sectionPx: b, ratio: a && b ? Math.round(a / b * 100) / 100 : null};
};
const bleed = f => f.code === 'OVERFLOW_X' && /^div\.kit-hero-visual/.test(f.at);

async function measurePage(page, html, recipeId, width) {
  await page.setContent(html, {waitUntil: 'load'});
  const m = await page.evaluate(pageMetrics);
  const found = [...(await page.evaluate(layoutProbe, LAYOUT_OPTIONS)).findings, ...(await page.evaluate(spacingProbe, PROBE_OPTIONS)).findings, ...(await page.evaluate(textProbe, TEXT_PROBE_OPTIONS)).findings].filter(f => !bleed(f));
  const codes = {}; for (const f of found) codes[f.code] = (codes[f.code] ?? 0) + 1;
  const rec = {docH: m.docH, scrollW: m.scrollW, hero: m.hero ? {variant: m.hero.variant, titlePx: m.hero.titlePx, titleLines: m.hero.titleLines, visual: m.hero.visual} : null,
    codes, severe: found.filter(f => SEVERE.has(f.code)).length, severeFindings: found.filter(f => SEVERE.has(f.code)).map(f => ({code: f.code, at: f.at, detail: String(f.detail).slice(0, 140)})), grade: grade(codes), claims: {}};
  rec.heroRatio = await page.evaluate(heroRatio);
  for (const id of CLAIM_IDS[recipeId] ?? []) { const c = claimById[id]; if (!c?.fn || !claimWidths(c).has(width)) continue; const v = await page.evaluate(c.fn); rec.claims[id] = {values: v, pass: c.test(v)}; }
  return rec;
}
const recipeRulesOf = (recipeId, bp) => Object.fromEntries(recipes[recipeId].rules.filter(r => recipeRules.find(x => x.id === r)?.mode === 'select').map(r => [r, recipeCheck(recipeId, r, bp)]));

// ---------- 명령 ----------
const [cmd, ...rest] = process.argv.slice(2);
const opt = (k, d = null) => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : d; };
const findInput = id => { const i = inputsDoc().inputs.find(x => x.id === id); if (!i) throw new Error('없는 입력: ' + id); return i; };

// 다른 파일(tests/ai-assembly.test.mjs)이 가져다 쓸 때는 명령을 실행하지 않는다.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (!isMain) {
} else if (cmd === 'catalog') {
  const input = findInput(rest[0]), t = templates[input.templateId];
  console.log(`# ${input.id} ${input.label} · 템플릿 ${input.templateId}(콘텐츠 고정) · 기본 테마 ${t.theme} · 페이지 유형 ${t.pageType}`);
  console.log('## 구성 변형(슬롯: 옵션, ! = 변형 결과 계약이 추천하지 않음)');
  for (const s of layoutOptionsOf(input.templateId)) console.log(` ${s.id} (${s.label}): ` + s.options.map(o => `${o.id}${o.recommended === false ? '!' : ''}(${o.label})`).join(' · '));
  console.log('## 컨셉 look(theme/themeVariant/typography 묶음)');
  for (const [c, v] of Object.entries(concepts)) console.log(` ${c}: ` + v.looks.map(l => `${l.id}=${l.theme}${l.themeVariant ? '/' + l.themeVariant : ''}/${l.typography}`).join(' · '));
  console.log('## 테마(기본 모드/셸/서체/밀도/스케일/폭, 변형, 팔레트)');
  for (const [id, th] of Object.entries(themes)) { const d = th.defaults; console.log(` ${id}: ${['mode', 'shell', 'typography', 'density', 'scale', 'width'].map(k => d[k]).join('/')} | ${th.variants.map(v => v.id).join(',')} | ${th.palettes.join(',')}`); }
  console.log('## 서체: ' + Object.keys(TYPE).join(' · '));
  console.log('## 밀도: ' + axes.density.join(' · ') + ' | 스케일: ' + axes.scale.join(' · ') + ' | 모드: ' + axes.mode.join(' · '));
} else if (cmd === 'try') {
  const input = findInput(rest[0]), selFile = rest[1], sel = JSON.parse(readFileSync(selFile === '-' ? 0 : resolve(selFile), 'utf8'));
  const attempt = opt('--attempt', 'x'), {blueprint, notes, notRecommended} = selectionToBlueprint(input.templateId, sel), html = compileHtml(blueprint);
  const diff = contentDiff(input.templateId, blueprint);
  const dir = resolve(P.attempts, input.id); mkdirSync(dir, {recursive: true});
  const br = await chromium.launch(), report = {input: input.id, attempt, selection: sel, notes, notRecommended, contentRemoved: diff.removed, contentAdded: diff.added, contentChrome: diff.chrome, axes: Object.fromEntries(['theme', 'palette', 'mode', 'shell', 'typography', 'density', 'scale', 'width'].map(k => [k, blueprint[k]])), widths: {}};
  for (const w of [1440, 390]) {
    const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
    const rec = await measurePage(page, html, input.recipe, w);
    const full = resolve(dir, `a${attempt}__w${w}.png`);
    await page.screenshot({path: full, fullPage: true});
    // 보기용 시트: 긴 페이지를 세로 조각으로 잘라 나란히 놓아 한 장에서 전체를 본다(모바일은 조각 4개, 데스크톱은 0.55배 축소 2조각).
    const seg = w === 1440 ? {n: 2, scale: 0.55} : {n: 4, scale: 1}, pageH = rec.docH, per = Math.ceil(pageH / seg.n);
    const sheet = await br.newContext({viewport: {width: Math.ceil(w * seg.scale) * seg.n + 12 * (seg.n - 1), height: Math.ceil(per * seg.scale)}}), sp = await sheet.newPage();
    const uri = 'data:image/png;base64,' + readFileSync(full).toString('base64');
    await sp.setContent(`<body style="margin:0;background:#888;display:flex;gap:12px">${Array.from({length: seg.n}, (_, i) => `<div style="width:${Math.ceil(w * seg.scale)}px;height:${Math.ceil(per * seg.scale)}px;overflow:hidden;position:relative;background:#fff"><img src="${uri}" style="position:absolute;left:0;top:-${Math.round(i * per * seg.scale)}px;width:${Math.round(w * seg.scale)}px"></div>`).join('')}</body>`);
    await sp.screenshot({path: resolve(dir, `a${attempt}__w${w}__sheet.png`)});
    await sheet.close(); await ctx.close(); rmSync(full);
    report.widths[w] = {docH: rec.docH, grade: rec.grade, severe: rec.severe, severeFindings: rec.severeFindings, codes: rec.codes, hero: rec.hero, heroRatio: rec.heroRatio, claims: Object.fromEntries(Object.entries(rec.claims).map(([k, v]) => [k, v.pass]))};
  }
  await br.close();
  const line = w => { const r = report.widths[w]; return `  ${w}px: 등급 ${r.grade} 심각 ${r.severe} 문서높이 ${r.docH} 히어로 ${r.hero?.variant}/${r.hero?.titlePx}px(${r.hero?.titleLines}줄, 섹션 제목 대비 ${r.heroRatio?.ratio ?? '—'}) 시각요소 ${r.hero?.visual ?? '없음'} Q ${Object.entries(r.claims).map(([k, v]) => k + (v ? '○' : '×')).join(' ')}${r.severeFindings.length ? '\n    ' + r.severeFindings.map(f => `${f.code} ${f.at} ${f.detail}`).join('\n    ') : ''}`; };
  console.log(`${input.id} 시도 ${attempt}: ${JSON.stringify(sel)}\n  축 ${JSON.stringify(report.axes)}\n${line(1440)}\n${line(390)}\n  경고 ${JSON.stringify({notes, notRecommended, 제거된문구: diff.removed, 추가된문구: diff.added, chrome: diff.chrome})}`);
  writeJson(resolve(dir, `a${attempt}__report.json`), report);
  console.log('시트:', relative(root, resolve(dir, `a${attempt}__w1440__sheet.png`)), relative(root, resolve(dir, `a${attempt}__w390__sheet.png`)));
} else if (cmd === 'record') {
  // record <입력id> <로그.json>: AI 팔의 시도 로그를 ai/log.json에, 최종 선택을 ai/selections.json에 합친다. 로그 형식: {attempts:[{n,selection,seen,problems,reason}], final:{attempt,selection}, improvements, remaining}
  const input = findInput(rest[0]), entry = JSON.parse(readFileSync(resolve(rest[1]), 'utf8'));
  selectionToBlueprint(input.templateId, entry.final.selection);
  const log = existsSync(P.log) ? readJson(P.log) : {}, sels = existsSync(P.selections) ? readJson(P.selections) : {};
  log[input.id] = entry; sels[input.id] = {attempt: entry.final.attempt, selection: entry.final.selection};
  writeJson(P.log, Object.fromEntries(Object.entries(log).sort())); writeJson(P.selections, Object.fromEntries(Object.entries(sels).sort()));
  console.log('기록', input.id, '시도', entry.attempts.length, '최종 시도', entry.final.attempt);
} else if (cmd === 'build') {
  mkdirSync(P.bp, {recursive: true});
  const hashes = {meta: {catalogVersion: CATALOG_VERSION, originMain: git('rev-parse origin/main')}, hashes: {}}, recipePicks = {};
  for (const input of inputsDoc().inputs) {
    if (contentSha(input.templateId) !== input.content.sha256) throw new Error(`${input.id}: 콘텐츠 해시가 inputs.json과 다르다`);
    const {pick, blueprint: rb} = recipeOf(input), bps = {default: createBlueprint(input.templateId), recipe: rb, ai: aiBlueprint(input)};
    recipePicks[input.id] = {layout: pick.layout, view: pick.view, satisfied: pick.satisfied, applied: pick.applied.map(a => a.rule), avoided: pick.avoided.map(a => a.rule), unmet: pick.unmet.map(u => u.rule), pageRules: pick.pageRules};
    hashes.hashes[input.id] = {};
    for (const arm of ARMS) {
      const bp = bps[arm]; if (!bp) { console.log(input.id, arm, '— 저장된 선택 없음'); continue; }
      const d = contentDiff(input.templateId, bp);
      writeJson(bpFile(input.id, arm), bp);
      hashes.hashes[input.id][arm] = {blueprintSha256: sha(bp), htmlSha256: sha(compileHtml(bp)), contentRemoved: d.removed, contentAdded: d.added, contentChrome: d.chrome};
    }
  }
  writeJson(P.hashes, hashes); writeJson(resolve(base, 'recipe-picks.json'), recipePicks);
  console.log('build 완료', Object.keys(hashes.hashes).length, '입력, origin/main', hashes.meta.originMain.slice(0, 9));
} else if (cmd === 'verify') {
  const stored = readJson(P.hashes), sels = existsSync(P.selections) ? readJson(P.selections) : {};
  let bad = 0, n = 0;
  const check = (what, ok, extra = '') => { n++; if (!ok) { bad++; console.log('불일치:', what, extra); } };
  check('카탈로그 버전', stored.meta.catalogVersion === CATALOG_VERSION, `${stored.meta.catalogVersion} ≠ ${CATALOG_VERSION}`);
  for (const input of inputsDoc().inputs) {
    check(`${input.id} 콘텐츠 해시`, contentSha(input.templateId) === input.content.sha256);
    const regen = {default: createBlueprint(input.templateId), recipe: recipeOf(input).blueprint};
    if (sels[input.id]) regen.ai = selectionToBlueprint(input.templateId, sels[input.id].selection).blueprint;
    for (const arm of ARMS) {
      const rec = stored.hashes[input.id]?.[arm]; if (!rec) { check(`${input.id}/${arm} 기록`, false, '해시 기록 없음'); continue; }
      const file = readJson(bpFile(input.id, arm));
      check(`${input.id}/${arm} 저장 Blueprint = 코드/선택에서 재생성`, sha(regen[arm]) === sha(file));
      check(`${input.id}/${arm} Blueprint 해시`, sha(file) === rec.blueprintSha256);
      // arm=ai는 저장 Blueprint를 그대로 다시 컴파일한다(선택에서가 아니라 저장본이 정본).
      check(`${input.id}/${arm} HTML 해시`, sha(compileHtml(file)) === rec.htmlSha256);
    }
  }
  console.log(bad ? `verify 실패 ${bad}/${n}` : `verify 통과 ${n}/${n}: default·recipe 재생성과 ai 저장 Blueprint 재컴파일의 HTML 해시가 모두 기록과 같다`);
  process.exitCode = bad ? 1 : 0;
} else if (cmd === 'render') {
  const only = opt('--only')?.split(','), stored = readJson(P.hashes);
  mkdirSync(P.shots, {recursive: true});
  const br = await chromium.launch();
  const out = {meta: {originMain: git('rev-parse origin/main'), catalogVersion: CATALOG_VERSION, widths: WIDTHS, browser: 'chromium ' + br.version(), platform: process.platform, date: new Date().toISOString().slice(0, 10)}, inputs: existsSync(P.measure) && only ? readJson(P.measure).inputs : {}};
  for (const input of inputsDoc().inputs.filter(i => !only || only.includes(i.id))) {
    const rec = out.inputs[input.id] = {recipe: input.recipe, templateId: input.templateId, arms: {}};
    for (const arm of ARMS) {
      const bp = readJson(bpFile(input.id, arm)), html = compileHtml(bp), expect = stored.hashes[input.id][arm].htmlSha256;
      if (sha(html) !== expect) throw new Error(`${input.id}/${arm}: HTML 해시가 hashes.json과 다르다. build를 다시 실행했는지 확인`);
      const layout = arm === 'default' ? {} : arm === 'recipe' ? readJson(resolve(base, 'recipe-picks.json'))[input.id].layout : readJson(P.selections)[input.id].selection.layout ?? {};
      const a = rec.arms[arm] = {htmlSha256: expect, layout, widths: {}, recipeRules: recipeRulesOf(input.recipe, bp), axes: Object.fromEntries(['theme', 'palette', 'mode', 'shell', 'typography', 'density', 'scale', 'width'].map(k => [k, bp[k]]))};
      for (const w of WIDTHS) {
        const ctx = await br.newContext({viewport: {width: w, height: 900}, reducedMotion: 'reduce'}), page = await ctx.newPage();
        const m = await measurePage(page, html, input.recipe, w), file = `${input.id}__${arm}__w${w}.png`;
        await page.screenshot({path: resolve(P.shots, file), fullPage: true});
        a.widths[w] = {...m, file: `shots/${file}`, pngSha256: sha(readFileSync(resolve(P.shots, file)))};
        await ctx.close();
      }
      a.grade = 'ABC'[Math.max(...Object.values(a.widths).map(x => 'ABC'.indexOf(x.grade)))];
      a.severeTotal = Object.values(a.widths).reduce((s, x) => s + x.severe, 0);
      console.log(input.id, arm.padEnd(7), 'grade', a.grade, 'severe', WIDTHS.map(w => a.widths[w].severe).join('/'), 'docH', WIDTHS.map(w => a.widths[w].docH).join('/'));
    }
  }
  await br.close();
  writeJson(P.measure, out);
} else if (cmd === 'results') {
  const m = readJson(P.measure), inputs = inputsDoc().inputs, key = n => ({default: '기본', recipe: 'Recipe', ai: 'AI'}[n]);
  const ver = (v, w) => v === undefined ? '—' : String(v);
  let md = `# 세 팔 측정 결과 (같은 표)\n\n측정 커밋 origin/main \`${m.meta.originMain}\`, 카탈로그 ${m.meta.catalogVersion}, ${m.meta.browser}, ${m.meta.platform}. 사실만 적고 우열은 판정하지 않는다. 눈가림 평가는 별도다.\n\n`;
  md += '- 등급: 4폭(320·390·768·1440) 중 가장 나쁜 구조 등급(A 지적 0, B 경미한 지적만, C 심각한 지적 있음).\n- 심각 프로브 지적: 폭 320/390/768/1440 순서의 건수. 전체 합은 괄호.\n- Q지표: 해당 청구가 의미 있는 폭에서만 잰 통과(○)·실패(×)와 핵심 값. —는 그 화면에 요소가 없음.\n- RC 실패: 이 유형 Recipe의 선택 시 규칙(RC01~RC06 중 해당)을 Blueprint에 대조해 실패한 규칙(없으면 −). AI 팔은 Recipe 규칙을 지킬 의무가 없다.\n\n';
  md += '| 입력 | 팔 | 구성 변형 | 테마/팔레트/서체/밀도/스케일/셸 | 등급 | 심각 프로브 지적 | 히어로 제목·섹션 제목 비(1440/390) | Q지표 | RC 실패 | 문서 높이 |\n|---|---|---|---|---|---|---|---|---|---|\n';
  for (const input of inputs) for (const arm of ARMS) {
    const a = m.inputs[input.id]?.arms[arm]; if (!a) continue;
    const q = []; for (const w of WIDTHS) for (const [id, c] of Object.entries(a.widths[w].claims)) if (c.values !== null) q.push(`${id}@${w}${c.pass ? '○' : '×'}${qval(id, c.values)}`);
    const rc = Object.entries(a.recipeRules).filter(([, v]) => v).map(([k]) => k).join(' ') || '−', hr = w => a.widths[w].heroRatio?.ratio ?? '—';
    md += `| ${input.id} ${input.templateId} | ${key(arm)} | ${Object.entries(a.layout ?? {}).map(([k, v]) => k + ':' + v).join(' ') || '기본'} | ${a.axes.theme}(${a.axes.mode})/${a.axes.palette}/${a.axes.typography}/${a.axes.density}/${a.axes.scale}/${a.axes.shell} | ${a.grade}${minor(a)} | ${WIDTHS.map(w => a.widths[w].severe).join('/')} (${a.severeTotal}) | ${hr(1440)}/${hr(390)} | ${q.join(' ') || '—'} | ${rc} | ${WIDTHS.map(w => a.widths[w].docH).join('/')} |\n`;
  }
  md += '\n## 심각 프로브 지적 상세(0이 아닌 것만)\n\n';
  let any = false;
  for (const input of inputs) for (const arm of ARMS) { const a = m.inputs[input.id]?.arms[arm]; if (!a) continue; for (const w of WIDTHS) for (const f of a.widths[w].severeFindings) { any = true; md += `- ${input.id} ${key(arm)} @${w}: ${f.code} ${f.at} — ${f.detail}\n`; } }
  if (!any) md += '없음.\n';
  md += '\n## 팔 사이 같은 화면(HTML 해시 동일)\n\n';
  for (const input of inputs) { const h = Object.fromEntries(ARMS.map(a => [a, m.inputs[input.id].arms[a].htmlSha256])); const same = [['default', 'recipe'], ['default', 'ai'], ['recipe', 'ai']].filter(([x, y]) => h[x] === h[y]).map(p => p.map(key).join('=')); md += `- ${input.id} ${input.templateId}: ${same.join(', ') || '세 팔 모두 다름'}\n`; }
  writeFileSync(resolve(base, 'results.md'), md);
  console.log(md.split('\n').slice(0, 30).join('\n'));
} else if (cmd === 'blind') {
  if (opt('--standalone')) await standalone(resolve(opt('--standalone'))); else await blindPackage();
} else {
  console.log(readFileSync(import.meta.filename, 'utf8').split('\n').slice(0, 20).filter(l => l.startsWith('//')).join('\n'));
  process.exitCode = cmd ? 1 : 0;
}

/** 경미한 지적 코드(등급 B의 원인)를 폭별로 합쳐 '(코드 폭…)' 형태로. */
function minor(a) {
  const by = {}; for (const w of WIDTHS) for (const [c, n] of Object.entries(a.widths[w].codes)) if (!SEVERE.has(c)) (by[c] ??= []).push(`${w}×${n}`);
  const t = Object.entries(by).map(([c, v]) => `${c} ${v.join(',')}`).join('; ');
  return t ? ` (${t})` : '';
}

function qval(id, v) {
  if (id === 'Q04') return `(빈공간 ${v.worstEmpty}px/${Math.round(v.worstRatio * 100)}%)`;
  if (id === 'Q06') return `(오른쪽 빈 ${Math.round(v.emptyRightRatio * 100)}%${v.visual ? ' 시각요소' : ''})`;
  if (id === 'Q07') return `(낮은 칸 빈 ${Math.round(v.worstEmpty * 100)}%)`;
  if (id === 'Q08') return `(채움 ${Math.round(v.fill * 100)}%, 왜곡 ${v.aspectDistortion}배)`;
  if (id === 'Q10') return `(${v.factsToNextHeading}px)`;
  if (id === 'Q11') return `(${v.items}개 ${v.rows}행)`;
  if (id === 'Q12') return `(불일치 ${v.mismatched}/${v.pairs})`;
  if (id === 'Q13') return `(중복 ${v.duplicateGroups})`;
  if (id === 'Q01') return `(${v.items}개 ${v.cols}열)`;
  return '';
}

/** 눈가림 패키지. 입력마다 세 팔에 무작위 A/B/C를 주고(시드 고정), 폭마다 같은 이름 규칙의 JPEG를 둔다. 라벨 대응은 blind/ 밖의 key.json에만 있다. */
async function blindPackage() {
  const m = readJson(P.measure), inputs = inputsDoc().inputs, seed = 20261121;
  let s = seed >>> 0; const rand = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const shuffle = a => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  rmSync(P.blind, {recursive: true, force: true}); mkdirSync(P.blind, {recursive: true});
  const key = {description: '눈가림 라벨 대응표. 평가가 끝나기 전에는 평가자에게 보이지 않는다(blind/ 밖에 둔다).', seed, originMain: m.meta.originMain, labels: {}};
  const br = await chromium.launch();
  const ctx = await br.newContext(), page = await ctx.newPage();
  for (const [i, input] of inputs.entries()) {
    const order = shuffle(ARMS), num = String(i + 1).padStart(2, '0'); key.labels[num] = {inputId: input.id, templateId: input.templateId, arms: {}};
    for (const [j, arm] of order.entries()) {
      const label = 'ABC'[j]; key.labels[num].arms[label] = arm;
      for (const w of WIDTHS) {
        // 문서 전체를 같은 방식으로 JPEG로 저장한다(원본 PNG는 shots/). 파일명과 EXIF에는 팔 정보가 없다.
        const src = resolve(base, m.inputs[input.id].arms[arm].widths[w].file), dst = resolve(P.blind, `${num}_${label}_${w}.jpg`);
        await page.setContent(`<body style="margin:0"><img id="i" src="data:image/png;base64,${readFileSync(src).toString('base64')}"></body>`);
        const size = await page.evaluate(() => { const i = document.getElementById('i'); return [i.naturalWidth, i.naturalHeight]; });
        await page.setViewportSize({width: size[0], height: Math.min(size[1], 16000)});
        await page.screenshot({path: dst, type: 'jpeg', quality: 82, fullPage: true});
      }
    }
  }
  await br.close();
  writeJson(P.key, key);
  const rows = inputs.map((input, i) => { const num = String(i + 1).padStart(2, '0'); return {num, input}; });
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>눈가림 비교 시트</title>
<style>
body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#f2f2f2;color:#111}
header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #ccc;padding:8px 12px}
header b{font-size:16px}
.tabs{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.tabs button{font:inherit;padding:6px 12px;border:1px solid #888;border-radius:6px;background:#fff}.tabs button[aria-pressed=true]{background:#111;color:#fff}
section{margin:18px 0;padding:0 8px}h2{font-size:16px;margin:0 0 6px}
p.brief{margin:0 0 8px;font-size:13px;color:#444}
.row{display:flex;gap:8px;align-items:flex-start;overflow-x:auto}
figure{margin:0;flex:0 0 auto;width:var(--w)}
figcaption{position:sticky;left:0;font-weight:700;text-align:center;background:#111;color:#fff;padding:2px 0;border-radius:4px 4px 0 0}
img{display:block;width:100%;height:auto;background:#fff;border:1px solid #bbb}
</style></head><body>
<header><b>눈가림 비교 시트</b> · 입력마다 A·B·C는 서로 다른 조립 결과입니다(순서는 무작위, 같은 화면이 둘일 수도 있습니다).
<div class="tabs" id="tabs"></div></header>
<main>${rows.map(({num, input}) => `<section id="s${num}"><h2>${num}. ${input.label}</h2><p class="brief">목적: ${input.brief.purpose}<br>청중: ${input.brief.audience} · 톤: ${input.brief.tone}</p>
${WIDTHS.map(w => `<div class="row" data-w="${w}">${'ABC'.split('').map(l => `<figure style="--w:${w <= 390 ? 'min(31vw,' + w + 'px)' : w === 768 ? '46vw' : '60vw'}"><figcaption>${l}</figcaption><a href="${num}_${l}_${w}.jpg"><img loading="lazy" src="${num}_${l}_${w}.jpg" alt="${num} ${l} ${w}px"></a></figure>`).join('')}</div>`).join('')}</section>`).join('\n')}
</main>
<script>
const widths=${JSON.stringify(WIDTHS)};const tabs=document.getElementById('tabs');let cur=390;
function show(w){cur=w;document.querySelectorAll('.row').forEach(r=>r.style.display=+r.dataset.w===w?'flex':'none');[...tabs.children].forEach(b=>b.setAttribute('aria-pressed',+b.dataset.w===w))}
for(const w of widths){const b=document.createElement('button');b.textContent=w+'px';b.dataset.w=w;b.onclick=()=>show(w);tabs.append(b)}
show(390);
</script></body></html>
`;
  writeFileSync(resolve(P.blind, 'index.html'), html);
  console.log('blind 패키지', inputs.length, '입력 ×', WIDTHS.length, '폭 × 3 라벨 → blind/, key.json은 blind 밖');
}

/** 휴대폰 공유용: blind/index.html의 이미지를 줄여(1440·768은 가로 760px, 나머지는 원래 크기) data URI로 넣은 HTML 한 파일. 내용·순서는 blind/와 같다. */
async function standalone(out) {
  const br = await chromium.launch(), ctx = await br.newContext(), page = await ctx.newPage();
  let html = readFileSync(resolve(P.blind, 'index.html'), 'utf8');
  const files = [...new Set([...html.matchAll(/src="(\d{2}_[ABC]_\d+\.jpg)"/g)].map(m => m[1]))];
  for (const f of files) {
    const w = Number(/_(\d+)\.jpg$/.exec(f)[1]), target = w > 768 ? 760 : w === 768 ? 600 : w;
    await page.setContent(`<body style="margin:0"><img id="i" src="data:image/jpeg;base64,${readFileSync(resolve(P.blind, f)).toString('base64')}" style="width:${target}px;display:block"></body>`);
    await page.waitForFunction(() => document.getElementById('i').complete);
    const h = await page.evaluate(() => document.getElementById('i').getBoundingClientRect().height);
    await page.setViewportSize({width: target, height: Math.ceil(h)});
    const buf = await page.screenshot({type: 'jpeg', quality: 72, fullPage: true});
    html = html.replaceAll(`src="${f}"`, `src="data:image/jpeg;base64,${buf.toString('base64')}"`).replaceAll(`href="${f}"`, 'href="#"');
  }
  await br.close(); writeFileSync(out, html);
  console.log('standalone', files.length, '이미지 →', out, (html.length / 1e6).toFixed(1) + 'MB');
}
