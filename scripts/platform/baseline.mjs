#!/usr/bin/env node
/**
 * 플랫폼 기준선(docs/platform/audit-2026-11.md §3). 등록량과 실제로 쓸 수 있는 자산을 따로 센다.
 *
 *   node scripts/platform/baseline.mjs            결과를 docs/evidence/platform/baseline.json에 쓰고 요약을 출력한다
 *   node scripts/platform/baseline.mjs --check    파일을 쓰지 않고 저장된 결과와 바이트가 같은지만 본다(다르면 exit 1)
 *
 * 결과는 결정적이다. 시각·난수·git revision을 담지 않는다. Coolors 팔레트 색은 결과에 싣지 않고 개수와 해시만 센다.
 */
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {catalogRegistry, qualityRank} from '../../src/materials/index.mjs';
import {designRegistry} from '../../src/profiles/registry.mjs';
import {assemble} from '../../src/profiles/assemble.mjs';
import {PROFILES, PATTERNS} from '../../src/profiles/data.mjs';
import {compile} from '../../src/compiler.mjs';
import {templates, pageTypes, themes} from '../../src/catalog/index.mjs';
import {resolveTokens} from '../../src/tokens.mjs';
import {platformSection} from './platform-baseline.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(ROOT, 'docs/evidence/platform/baseline.json');
const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const sortObj = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const tally = (xs, key) => sortObj(xs.reduce((m, x) => ({...m, [key(x)]: (m[key(x)] ?? 0) + 1}), {}));

/**
 * 등록 종류별 판정. 등록 기록 하나가 독립적으로 고를 수 있는 구현 단위인지를 정한다.
 *   implemented  자기 몫의 코드·CSS·데이터가 있고 렌더 진입점이 실제 함수로 해석된다
 *   derived      한 팔레트·한 함수가 계산한 값 하나를 재료로 센 것. 독립 구현이 아니다
 *   rights       권리 미확인 외부 자료(source.license === 'unverified'). 신규 노출·내보내기를 하지 않는다
 */
const DERIVED_KINDS = Object.freeze({'color-token': 'static-kit 팔레트 하나를 resolveColorTokens 한 함수가 펼친 값이다'});

async function renderResolves(m, cache) {
  if (!m.render) return false;
  const key = m.render.module + '#' + m.render.export;
  if (!cache.has(key)) {
    let ok = false;
    try { const mod = await import(pathToFileURL(resolve(ROOT, m.render.module)).href); ok = typeof mod[m.render.export] === 'function'; } catch { ok = false; }
    cache.set(key, ok);
  }
  return cache.get(key);
}

/** 이름·라벨만 다른 프리셋을 같게 본다. 출력에 닿는 값(defaults·variants·ext)만 남긴다. */
const LABEL_KEYS = new Set(['id', 'label', 'name', 'concept', 'covers', 'description', 'usage']);
const stripLabels = v => Array.isArray(v) ? v.map(stripLabels) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([k]) => !LABEL_KEYS.has(k)).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, stripLabels(x)])) : v;
// 템플릿 재료의 ext는 트리를 싣지 않으므로 카탈로그 원본(트리·축·chrome)으로 비교한다.
const presetSignature = m => hash(stripLabels(m.kind === 'template' ? templates[m.id.slice('template:'.length)] : {defaults: m.defaults, variants: m.variants, ext: m.ext}));

async function materialsSection() {
  const cat = catalogRegistry(), des = designRegistry(), cache = new Map();
  const rows = [];
  for (const m of des.list()) {
    const resolves = await renderResolves(m, cache);
    const verdict = m.source?.license === 'unverified' ? 'rights' : DERIVED_KINDS[m.kind] ? 'derived'
      : resolves && qualityRank(m.quality.status) >= qualityRank('implemented') ? 'implemented' : 'metadata';
    rows.push({id: m.id, kind: m.kind, verdict, inCatalogRegistry: cat.has(m.id), preset: des.isPreset(m), sig: des.isPreset(m) ? presetSignature(m) : null, entry: m.render ? m.render.module + '#' + m.render.export : null});
  }
  const byKind = {};
  for (const r of rows) {
    const k = byKind[r.kind] ??= {registered: 0, implemented: 0, derived: 0, rights: 0, metadata: 0, completePresets: 0, uniquePresets: new Set(), entries: new Set()};
    k.registered++; k[r.verdict]++;
    if (r.preset) { k.completePresets++; k.uniquePresets.add(r.sig); }
    if (r.entry) k.entries.add(r.entry);
  }
  const kinds = sortObj(Object.fromEntries(Object.entries(byKind).map(([kind, k]) => [kind, {
    registered: k.registered, implemented: k.implemented, derived: k.derived, rights: k.rights, metadata: k.metadata,
    completePresets: k.completePresets, uniqueCompletePresets: k.uniquePresets.size, renderEntries: [...k.entries].sort(),
  }])));
  const catRows = rows.filter(r => r.inCatalogRegistry);
  const sum = (xs, f) => xs.reduce((n, x) => n + f(x), 0);
  const uniq = xs => new Set(xs.filter(r => r.preset).map(r => r.kind + ':' + r.sig)).size;
  return {
    catalogRegistry: {
      registered: cat.counts().materials, attributeCombinations: cat.counts().attributeCombinations, completePresets: cat.counts().completePresets,
      implemented: catRows.filter(r => r.verdict === 'implemented').length, derived: catRows.filter(r => r.verdict === 'derived').length,
      rights: catRows.filter(r => r.verdict === 'rights').length, metadata: catRows.filter(r => r.verdict === 'metadata').length,
      uniqueCompletePresets: uniq(catRows),
    },
    designRegistry: {
      registered: des.counts().materials, completePresets: des.counts().completePresets,
      implemented: sum(rows, r => r.verdict === 'implemented'), derived: sum(rows, r => r.verdict === 'derived'), rights: sum(rows, r => r.verdict === 'rights'), metadata: sum(rows, r => r.verdict === 'metadata'),
      uniqueCompletePresets: uniq(rows),
    },
    renderEntryPoints: [...cache].filter(([, ok]) => ok).length, unresolvedRenderEntries: [...cache].filter(([, ok]) => !ok).map(([k]) => k).sort(),
    byKind: kinds,
  };
}

/** 최신 조립 경로(src/profiles/assemble.mjs)가 닿는 자산. 프로파일 데이터와 패턴 뼈대 트리에서 센다. */
function reachSection() {
  const ps = Object.values(PROFILES);
  const union = f => [...new Set(ps.flatMap(f))].sort();
  const usedPatterns = union(p => p.patterns.map(x => x.slice('pattern:'.length)));
  const skeletonTypes = new Set();
  const walk = n => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { if (n.type) skeletonTypes.add(n.type); walk(n.children ?? []); } };
  usedPatterns.forEach(id => walk(templates[PATTERNS[id].template].tree));
  const slotTypes = union(p => p.patterns.flatMap(pid => PATTERNS[pid.slice(8)].slots.flatMap(s => s.accepts.filter(t => p.components.includes(t)))));
  return {
    themes: {catalog: Object.keys(themes).length, reachable: union(p => p.themes).length, ids: union(p => p.themes)},
    palettes: {catalogLegacy: 427, reachableLegacy: 0, internal: union(p => p.color.palettes)},
    typePresets: {catalog: 18, reachableAxisValues: union(p => p.type.typography).length, rolePresets: union(p => [p.type.rolePreset]).length},
    templates: {catalog: Object.keys(templates).length, reachableAsSkeleton: new Set(usedPatterns.map(id => PATTERNS[id].template)).size},
    components: {skeletonNodeTypes: [...skeletonTypes].sort().length, slotTopLevelTypes: slotTypes.length, profileAllowed: union(p => p.components).length},
    chartPresets: {listedInProfiles: union(p => p.charts.presets).length},
    patternFieldsNotApplied: {recipe: usedPatterns.filter(id => PATTERNS[id].recipe).length, primitives: union(() => usedPatterns.flatMap(id => PATTERNS[id].primitives)).length,
      note: 'PATTERNS[].recipe·primitives는 designRegistry 의존성으로만 등록되고 assemble()은 읽지 않는다'},
  };
}

/** assemble()의 스칼라 intent 축을 프로파일 허용값 전체로 펼쳐 실제로 조립·컴파일되는 조합을 센다. */
function combosSection() {
  let attempted = 0, assembled = 0, compiled = 0;
  const failures = {}, bpHashes = new Set(), outHashes = new Set(), tokenSets = {light: new Set(), dark: new Set()}, facePairs = new Set(), perProfile = {};
  const lastDecl = (css, name) => { const all = [...css.matchAll(new RegExp(`--kit-${name}:([^;}]+)`, 'g'))]; return all.length ? all.at(-1)[1] : null; };
  for (const [profile, p] of Object.entries(PROFILES)) {
    const pp = perProfile[profile] = {attempted: 0, assembled: 0, compiled: 0, distinctOutputs: 0};
    const outs = new Set();
    for (const pid of p.patterns) {
      const pattern = PATTERNS[pid.slice(8)], pageType = pageTypes[templates[pattern.template].pageType];
      const shells = pattern.shells.filter(s => p.chrome.shells.includes(s));
      const widths = pattern.widths.filter(w => p.axes.width.includes(w) && (!pageType.widths || pageType.widths.includes(w)));
      for (const theme of p.themes) for (const density of p.density.allowed) for (const mode of p.color.modes) for (const typography of p.type.typography)
        for (const controlSize of p.controlSize.allowed) for (const shell of shells) for (const width of widths) {
          attempted++; pp.attempted++;
          const r = assemble(profile, {pattern: pid, theme, density, mode, typography, controlSize, shell, width});
          if (!r.ok) { const code = r.diagnostics.find(d => d.severity === 'error')?.code ?? 'UNKNOWN'; failures[code] = (failures[code] ?? 0) + 1; continue; }
          assembled++; pp.assembled++;
          const bh = hash(r.blueprint);
          if (bpHashes.has(bh)) continue;
          bpHashes.add(bh);
          let out;
          try { out = compile(r.blueprint); } catch (e) { const code = 'COMPILE:' + (e.errors?.[0]?.code ?? e.message.split('\n')[0].slice(0, 40)); failures[code] = (failures[code] ?? 0) + 1; continue; }
          compiled++; pp.compiled++;
          const oh = hash(out.html + out.css);
          outHashes.add(oh); outs.add(oh);
          for (const m of ['light', 'dark']) if (out.tokens[m]) tokenSets[m].add(hash(out.tokens[m]));
          facePairs.add(hash([lastDecl(out.css, 'heading'), lastDecl(out.css, 'font')]));
        }
    }
    pp.distinctOutputs = outs.size;
  }
  return {
    attempted, assembled, uniqueBlueprints: bpHashes.size, compiled, distinctCompiledOutputs: outHashes.size,
    distinctColorTokenSets: {light: tokenSets.light.size, dark: tokenSets.dark.size}, distinctEffectiveFacePairs: facePairs.size,
    failures: sortObj(failures), perProfile,
    axes: 'pattern × theme × density × mode × typography × controlSize × shell × width (프로파일·패턴 허용값). components·chartPresets·content는 펼치지 않는다',
  };
}

/** 비교 기준: 구형 경로(createBlueprint의 테마 기본 팔레트)가 내는 색 토큰 집합 수. 팔레트 색 자체는 싣지 않는다. */
function legacyDiversity() {
  const light = new Set();
  for (const t of Object.values(themes)) light.add(hash(resolveTokens({palette: t.palettes[0], mode: 'light'}).tokens));
  return {themeDefaultPaletteTokenSetsLight: light.size, note: 'Coolors 팔레트(권리 미확인)를 쓰므로 신규 경로의 기준이 아니라 축소 폭 비교용이다'};
}

const t0 = Date.now();
const result = {
  schema: 'platform-baseline/1', generator: 'scripts/platform/baseline.mjs',
  materials: await materialsSection(), reach: reachSection(), combinations: combosSection(), legacyComparison: legacyDiversity(),
  platform: platformSection(),
};
const text = JSON.stringify(result, null, 2) + '\n';
const m = result.materials, c = result.combinations, pf = result.platform;
const summary = [
  `registered materials        ${m.catalogRegistry.registered} (catalogRegistry), ${m.designRegistry.registered} (designRegistry)`,
  `attribute combinations      ${m.catalogRegistry.attributeCombinations} (registry claim, not assemblable)`,
  `implemented materials       ${m.designRegistry.implemented} (derived ${m.designRegistry.derived}, rights-unverified ${m.designRegistry.rights}, metadata ${m.designRegistry.metadata})`,
  `render entry points         ${m.renderEntryPoints}`,
  `complete presets            ${m.designRegistry.completePresets} registered, ${m.designRegistry.uniqueCompletePresets} unique`,
  `assemblable combinations    ${c.assembled}/${c.attempted} assembled, ${c.uniqueBlueprints} unique blueprints`,
  `verified combinations       ${c.compiled} compiled, ${c.distinctCompiledOutputs} distinct outputs`,
  `color token sets (assemble) light ${c.distinctColorTokenSets.light}, dark ${c.distinctColorTokenSets.dark}; legacy themes light ${result.legacyComparison.themeDefaultPaletteTokenSetsLight}`,
  `effective face pairs        ${c.distinctEffectiveFacePairs}`,
  `platform assemblable        ${pf.assemblable.assemblable} (of ${pf.assemblable.attempted} tried)`,
  `platform verified           ${pf.verified.verified} assembled+checked, ${pf.verified.distinctOutputs} distinct outputs (${pf.verified.attempted} tried)`,
  `platform color token sets   light ${pf.distinct.colorTokenSets.light}, dark ${pf.distinct.colorTokenSets.dark}; face pairs ${pf.distinct.facePairs}; families ${pf.distinct.families}`,
];
if (process.argv.includes('--check')) {
  const saved = readFileSync(OUT, 'utf8');
  if (saved !== text) { console.error('BASELINE DRIFT: docs/evidence/platform/baseline.json differs; rerun without --check'); process.exit(1); }
  console.log('BASELINE MATCH ' + OUT.slice(ROOT.length + 1));
} else {
  mkdirSync(dirname(OUT), {recursive: true});
  writeFileSync(OUT, text);
  console.log('WROTE ' + OUT.slice(ROOT.length + 1));
}
console.log(summary.join('\n'));
console.error(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
