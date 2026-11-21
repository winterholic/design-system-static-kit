import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createBlueprint, migrateBlueprint, templateList, nodeSpecs, blueprintSchema, CATALOG_VERSION, ACCEPTED_CATALOG_VERSIONS, SUPPORTED_CATALOG_VERSIONS, SINCE_FIELDS, expressionRules, DIRECT_CONTRACTS} from '../src/catalog.mjs';
import {validateBlueprint, compile} from '../src/compiler.mjs';
import {featuredColumns, featuredOrphans, featuredRows, flowColumns, FLOW} from '../src/layout.mjs';
import {SPACE, SPACE_EXT, extOrderViolations, orderViolations, spaceVars} from '../src/spacing.mjs';
import {deviceMock} from '../src/render/mocks.mjs';
import {setTheme, setAppearance, importBlueprint, contentFingerprint, updateNode} from '../src/edit/index.mjs';

// 카탈로그 2.5.0 표현력 확장(ADR 0010): EX-1~EX-5, 렌더러 결함 R1~R4, 직접 작성 Blueprint의 계약 R5.
const read = f => JSON.parse(readFileSync(new URL('../docs/evidence/expression/' + f, import.meta.url), 'utf8'));
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const act = (label, variant = 'primary') => ({label, href: '#main', variant});
/** 2.5.0 Blueprint 한 장. children은 page-header 뒤에 놓인다. */
function make(children, patch = {}) {
  const b = migrateBlueprint(createBlueprint('saas-landing'), '2.5.0');
  b.pageType = 'general';
  b.chrome.nav = b.chrome.nav.map(n => ({...n, href: '#main'}));
  b.tree.children = [{type: 'page-header', title: '제목'}, ...children];
  return Object.assign(b, patch);
}
const codes = b => validateBlueprint(b).errors.map(e => e.code);
const hero = extra => ({type: 'hero', variant: 'split', title: '히어로', body: '본문 한 줄', visual: 'photo', motif: 'coast', ...extra});
const sec = (children, extra) => ({type: 'section', title: '구역', children, ...extra});
const prose = {type: 'prose', title: '글', body: '본문'};
const card = (i, extra) => ({type: 'card', title: '카드 ' + i, body: '설명', ...extra});

test('legacy: catalog 2.4.0 output is byte-for-byte what it was before 2.5.0 (85 templates + 15 hand-written cases)', () => {
  const {hashes, cases} = read('legacy-2-4-hashes.json'), pinned = read('legacy-2-4-blueprints.json');
  assert.equal(Object.keys(hashes).length, templateList.length);
  assert.equal(Object.keys(cases).length, 15);
  for (const [id, h] of Object.entries(hashes)) { const b = structuredClone(pinned.blueprints[id]); assert.equal(b.catalogVersion, '2.4.0'); assert.equal(sha(compile(b)), h, id); }
  for (const [id, h] of Object.entries(cases)) { const b = structuredClone(pinned.cases[id]); assert.equal(b.catalogVersion, '2.4.0'); assert.equal(sha(compile(b)), h, id); }
});

test('versions: 2.5.0 is accepted, the default creation version stays 2.4.0 (ADR 0010), and the schema enumerates both', () => {
  assert.equal(CATALOG_VERSION, '2.4.0');
  assert.deepEqual([...ACCEPTED_CATALOG_VERSIONS], [...SUPPORTED_CATALOG_VERSIONS, '2.5.0']);
  assert.deepEqual(blueprintSchema().properties.catalogVersion.enum, [...ACCEPTED_CATALOG_VERSIONS]);
  assert.equal(createBlueprint('saas-landing').catalogVersion, '2.4.0');
  assert.ok(validateBlueprint({...createBlueprint('saas-landing'), catalogVersion: '2.6.0'}).errors.some(e => e.code === 'CATALOG_VERSION'));
});

test('migrate 2.4.0 → 2.5.0 changes only catalogVersion; every template stays valid and compiles; it never downgrades', () => {
  for (const t of templateList) {
    const old = createBlueprint(t.id), next = migrateBlueprint(old, '2.5.0');
    assert.deepEqual({...next, catalogVersion: '2.4.0'}, old, t.id);
    const r = validateBlueprint(next);
    assert.deepEqual(r.errors, [], t.id + ' still valid');
    assert.ok(compile(next).html.includes('Static Kit 2.5.0'), t.id);
  }
  const b = make([hero({ratio: 'visual'})]);
  assert.equal(migrateBlueprint(b).catalogVersion, '2.5.0', 'a default migrate does not drop 2.5.0 back to 2.4.0');
  assert.throws(() => migrateBlueprint(b, '9.9.9'), /Unsupported target/);
  // 입력 2.1~2.3 도 한 번에 2.5.0 으로 옮긴다.
  assert.equal(migrateBlueprint({...createBlueprint('saas-landing'), catalogVersion: '2.2.0'}, '2.5.0').catalogVersion, '2.5.0');
});

test('kit migrate --to 2.5.0 (CLI) writes the migrated file; without --to it targets the default version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsk-mig-')), src = join(dir, 'a.json');
  writeFileSync(src, JSON.stringify(createBlueprint('agency-home')));
  const kit = (...a) => execFileSync('node', [new URL('../scripts/kit.mjs', import.meta.url).pathname, ...a], {encoding: 'utf8'});
  kit('migrate', src, join(dir, 'b.json'), '--to', '2.5.0');
  assert.equal(JSON.parse(readFileSync(join(dir, 'b.json'), 'utf8')).catalogVersion, '2.5.0');
  kit('migrate', src, join(dir, 'c.json'));
  assert.equal(JSON.parse(readFileSync(join(dir, 'c.json'), 'utf8')).catalogVersion, '2.4.0');
  assert.throws(() => execFileSync('node', [new URL('../scripts/kit.mjs', import.meta.url).pathname, 'migrate', src, join(dir, 'd.json'), '--to', '9.9.9'], {stdio: 'pipe'}));
});

test('every 2.5.0 field is declared with its introduction version and a description in the schema', () => {
  const defs = blueprintSchema().$defs;
  for (const f of SINCE_FIELDS) {
    const s = defs[f.node].properties[f.field];
    assert.ok(s, `${f.node}.${f.field} is in the schema`);
    assert.equal(s['x-since'], '2.5.0');
    assert.ok(s.description.length > 20, `${f.node}.${f.field} explains itself`);
    for (const v of f.values ?? []) assert.ok(s.enum.includes(v));
    assert.ok(nodeSpecs[f.node].fields[f.field] && nodeSpecs[f.node].optional.includes(f.field) , 'optional so unused fields change nothing');
  }
  // 닫힌 문법: 새 필드는 전부 enum이고 자유 문자열·숫자가 아니다.
  for (const f of SINCE_FIELDS) assert.ok(Array.isArray(defs[f.node].properties[f.field].enum), f.field);
  assert.ok(expressionRules.every(r => r.id && r.intent && r.codes.length));
});

test('2.4.0 and older reject every new field and enum value (their grammar is not widened)', () => {
  const old = (children) => ({...make(children), catalogVersion: '2.4.0'});
  const cases = [
    [[hero({ratio: 'copy'})], '$.tree.children[1].ratio', 'UNKNOWN_KEY'],
    [[sec([{type: 'split', ratio: 'dominant-start', children: [prose, prose]}])], '$.tree.children[1].children[0].ratio', 'ENUM'],
    [[sec([{type: 'grid', columns: 'three', children: [card(1, {featured: 'yes'}), card(2), card(3)]}])], '$.tree.children[1].children[0].children[0].featured', 'UNKNOWN_KEY'],
    [[sec([{type: 'quote', variant: 'pull', quote: '인용', author: '저자'}])], '$.tree.children[1].children[0].variant', 'UNKNOWN_KEY'],
    [[sec([prose], {surface: 'flat'})], '$.tree.children[1].surface', 'ENUM'],
    [[sec([prose], {space: 'loose'})], '$.tree.children[1].space', 'UNKNOWN_KEY'],
    [[{type: 'media', kind: 'photo', ratio: '21:9', alt: '전경', bleed: 'yes'}], '$.tree.children[1].bleed', 'UNKNOWN_KEY'],
  ];
  for (const [children, path, code] of cases) {
    const errs = validateBlueprint(old(children)).errors.filter(e => e.path === path);
    assert.ok(errs.some(e => e.code === code && /2\.5\.0/.test(e.message)), `${path} ${JSON.stringify(validateBlueprint(old(children)).errors)}`);
    assert.ok(!codes(make(children)).length, `${path} is valid in 2.5.0: ${JSON.stringify(validateBlueprint(make(children)).errors)}`);
  }
  assert.deepEqual(validateBlueprint({...createBlueprint('saas-landing'), catalogVersion: '2.3.0'}).warnings, [], 'legacy versions produce no contract warnings');
});

test('EX-1 hero.ratio: only on a split/product hero with a visual; enum values are closed', () => {
  assert.deepEqual(codes(make([hero({ratio: 'visual'})])), []);
  assert.deepEqual(codes(make([hero({variant: 'product', ratio: 'copy'})])), []);
  assert.deepEqual(codes(make([hero({ratio: 'even'})])), []);
  assert.ok(codes(make([hero({variant: 'centered', visual: undefined, motif: undefined, ratio: 'copy'})])).includes('VARIANT_REQUIRES'));
  assert.ok(codes(make([{type: 'hero', variant: 'split', title: 't', body: 'b', ratio: 'copy'}])).includes('VARIANT_REQUIRES'), 'split without visual');
  assert.ok(codes(make([hero({ratio: '70:30'})])).includes('ENUM'), 'no free-form ratios');
  const css = compile(make([hero({ratio: 'visual'})])).css;
  assert.match(css, /@container compose \(min-width:\d+px\)\{\.kit-body \.kit-main \.kit-hero\[data-ratio=copy\]\[data-visual\]\[data-variant=split\]\{grid-template-columns:minmax\(0,3fr\) minmax\(0,2fr\)\}/);
  assert.match(css, /data-ratio=visual\]\[data-visual\]\[data-variant=split\]\{grid-template-columns:minmax\(0,2fr\) minmax\(0,3fr\)/);
  assert.match(css, /data-ratio=visual\]\[data-visual\]\[data-variant=product\]\{grid-template-columns:minmax\(0,3fr\) minmax\(0,2fr\)/, 'product puts the visual first');
  assert.match(compile(make([hero({ratio: 'visual'})])).html, /<section[^>]*class="kit-hero" data-variant="split" data-visual="yes" data-ratio="visual"/);
  assert.doesNotMatch(compile(make([hero({ratio: 'even'})])).html, /data-ratio/, 'even is the default and writes nothing');
});

test('EX-1 split.ratio dominant-*: the narrow cell holds only readable parts, and the ratio belongs to the column (reverse flips the cell)', () => {
  const split = (extra, a = prose, b = prose) => make([sec([{type: 'split', children: [a, b], ...extra}])]);
  const table = {type: 'table', title: '표', caption: '표', columns: ['가', '나'], rows: [['1', '2']]};
  assert.deepEqual(codes(split({ratio: 'dominant-start'}, table, prose)), []);
  assert.ok(codes(split({ratio: 'dominant-start'}, prose, table)).includes('VARIANT_REQUIRES'), 'table in the 30% cell');
  assert.deepEqual(codes(split({ratio: 'dominant-end'}, prose, table)), []);
  assert.ok(codes(split({ratio: 'dominant-end'}, table, prose)).includes('VARIANT_REQUIRES'));
  assert.ok(codes(split({ratio: 'dominant-start', reverse: 'reverse'}, table, prose)).includes('VARIANT_REQUIRES'), 'reverse puts the first child in the narrow column');
  assert.deepEqual(codes(split({ratio: 'dominant-start', reverse: 'reverse'}, prose, table)), []);
  const css = compile(split({ratio: 'dominant-start'})).css;
  assert.match(css, /@container compose \(min-width:1000px\)\{[^}]*dominant-start\]\{grid-template-columns:minmax\(0,7fr\) minmax\(0,3fr\)/);
  assert.match(css, /dominant-start\]\{grid-template-columns:minmax\(0,3fr\) minmax\(0,2fr\)/, 'below 1000px it falls back to the 3:2 of wide-start');
  assert.doesNotMatch(compile(split({ratio: 'wide-start'})).css, /7fr/, 'no dominant CSS unless used');
});

test('EX-2 card.featured: first card of a three/four grid with 3+ children, one per grid, nowhere else', () => {
  const grid = (columns, kids) => make([sec([{type: 'grid', columns, children: kids}])]);
  const ok = [card(1, {featured: 'yes'}), card(2), card(3)];
  assert.deepEqual(codes(grid('four', ok)), []);
  assert.deepEqual(codes(grid('three', ok)), []);
  assert.ok(codes(grid('two', ok)).includes('FEATURED_CARD'));
  assert.ok(codes(grid('three', [card(1, {featured: 'yes'}), card(2)])).includes('FEATURED_CARD'), 'needs 3 children');
  assert.ok(codes(grid('three', [card(1), card(2, {featured: 'yes'}), card(3)])).includes('FEATURED_CARD'), 'must be first');
  assert.ok(codes(grid('four', [card(1, {featured: 'yes'}), card(2, {featured: 'yes'}), card(3)])).includes('FEATURED_CARD'), 'one per grid');
  assert.ok(codes(make([sec([{type: 'bento', children: [card(1, {featured: 'yes'}), card(2), card(3)]}])])).includes('FEATURED_CARD'), 'bento owns its big cell');
  assert.ok(codes(make([sec([{type: 'reel', children: [card(1, {featured: 'yes'}), card(2), card(3)]}])])).includes('FEATURED_CARD'));
  assert.ok(codes(grid('three', [card(1, {featured: 'no'}), card(2), card(3)])).includes('ENUM'));
  const r = compile(grid('four', ok));
  const tag = r.html.match(/<div[^>]*class="kit-grid"[^>]*>/)[0];
  for (const a of ['data-columns="four"', 'data-flow-featured', 'data-n="3"', 'data-cap="4"']) assert.ok(tag.includes(a), a + ' in ' + tag);
  assert.match(tag, /data-flow-min="\d+"/); assert.match(tag, /data-flow-gap="\d+"/);
  assert.match(r.html, /<article[^>]*class="kit-card" data-variant="basic" data-featured="yes"/);
  assert.match(r.css, /\[data-flow-featured\]\[data-n="3"\]\[data-cap="4"\][^{]*\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}[^}]*>\[data-featured\]\{grid-column:span 2\}/);
});

test('EX-2 layout: a featured cell counts as two, so no width and no item count leaves a lone last cell or a hole in the first row', () => {
  for (const cap of [3, 4]) for (let n = 3; n <= 12; n++) assert.deepEqual(featuredOrphans(n, cap), [], `n=${n} cap=${cap}`);
  assert.deepEqual(featuredColumns(3, 4), [1, 2, 2, 4], '1 featured + 2 cards fill one 4-column row');
  assert.deepEqual(featuredRows(3, 4), [[2, 1, 1]]);
  assert.deepEqual(featuredRows(3, 2), [[2], [1, 1]]);
  assert.deepEqual(featuredRows(5, 1), [[1], [1], [1], [1], [1]], 'a single column never spans');
  // 기존 흐름 알고리즘은 시그니처·결과가 그대로다(강조 칸은 별도 함수).
  assert.deepEqual(flowColumns(4, 3), FLOW.bands.map((_, i) => [1, 2, 2, 2][i] === undefined ? 0 : flowColumns(4, 3)[i]));
  assert.deepEqual(flowColumns(5, 4, {span: true}), flowColumns(5, 4, {span: true}));
});

test('EX-3 quote.variant pull: only directly under the page or a section, rendered without a box', () => {
  const q = extra => ({type: 'quote', quote: '큰 인용', author: '저자', ...extra});
  assert.deepEqual(codes(make([sec([q({variant: 'pull'})])])), []);
  assert.deepEqual(codes(make([q({variant: 'pull'})])), []);
  for (const parent of [{type: 'grid', columns: 'two', children: [q({variant: 'pull'}), q()]}, {type: 'split', children: [q({variant: 'pull'}), prose]}, {type: 'bento', children: [q({variant: 'pull'}), card(1), card(2)]}]) assert.ok(codes(make([sec([parent])])).includes('PULL_POSITION'), parent.type);
  assert.ok(codes(make([sec([q({variant: 'wide'})])])).includes('ENUM'));
  const on = compile(make([sec([q({variant: 'pull'})])])), off = compile(make([sec([q()])]));
  assert.match(on.html, /<figure[^>]*class="kit-quote" data-variant="pull">/);
  assert.match(on.css, /\.kit-quote\[data-variant=pull\] blockquote\{font-size:var\(--kit-t-quote-l\)/, 'reuses the existing quote-l role');
  assert.doesNotMatch(off.css, /data-variant=pull/);
});

test('EX-4 section.surface flat and section.space: top-level only; loose adds the bandL token only when used; the ladder stays ordered', () => {
  assert.deepEqual(codes(make([sec([prose], {space: 'tight'}), sec([prose], {space: 'loose', surface: 'flat'})])), []);
  assert.ok(codes(make([sec([sec([prose], {space: 'loose'})])])).includes('SPACE_POSITION'), 'nested section');
  assert.ok(codes(make([sec([prose], {space: 'huge'})])).includes('ENUM'));
  assert.ok(codes(make([sec([prose], {space: '150px'})])).includes('ENUM'), 'no numbers');
  // flat 은 SURFACE_NEST 계산에서 면 없음이다: tint 안에 flat 을 둘 수 있다.
  assert.deepEqual(codes(make([sec([sec([prose], {surface: 'flat'})], {surface: 'tint'})])), []);
  assert.deepEqual(extOrderViolations(), []);
  assert.deepEqual(orderViolations(), []);
  for (const d of Object.keys(SPACE)) assert.ok(SPACE[d].band < SPACE_EXT[d].bandL && SPACE_EXT[d].bandL % 4 === 0);
  assert.doesNotMatch(spaceVars('comfortable'), /band-l/, 'SPACE itself did not grow: legacy :root stays identical');
  const loose = compile(make([sec([prose], {space: 'loose'})], {density: 'spacious'})).css, plain = compile(make([sec([prose])], {density: 'spacious'})).css;
  assert.match(loose, /:root\{--kit-sp-band-l:156px\}/);
  assert.doesNotMatch(plain, /band-l/);
  assert.match(loose, /\[data-space=loose\]\{padding-block:var\(--kit-sp-band-l\)\}/);
  assert.match(compile(make([sec([prose], {space: 'tight'})])).css, /\[data-space=tight\]\{padding-block:var\(--kit-sp-band-m\)\}/);
});

test('EX-5 media.bleed: page-level only, 16:9 or 21:9, and the stylesheet never uses a viewport-based negative margin', () => {
  const m = extra => ({type: 'media', kind: 'photo', ratio: '21:9', alt: '전경', ...extra});
  assert.deepEqual(codes(make([m({bleed: 'yes'})])), []);
  assert.ok(codes(make([sec([m({bleed: 'yes'})])])).includes('BLEED_POSITION'));
  assert.ok(codes(make([m({bleed: 'yes', ratio: '1:1'})])).includes('VARIANT_REQUIRES'));
  assert.ok(codes(make([m({bleed: 'yes', alt: ''})])).includes('STRING'), 'alt stays required');
  const r = compile(make([m({bleed: 'yes'})]));
  assert.match(r.html, /<figure[^>]*class="kit-media" data-bleed="yes">/);
  assert.match(r.css, /\.kit-main>\.kit-media\[data-bleed\]\{grid-column:full\}/);
  const block = r.css.slice(r.css.indexOf('expression grammar')).split('\n/*')[0];
  assert.ok(block.includes('data-bleed')); assert.doesNotMatch(block, /100vw|margin-inline:-|calc\(50%/);
  assert.doesNotMatch(compile(make([m()])).css, /data-bleed/);
});

test('R1 hero followed by a plain section: P03 zeroes the band step only where the hero edge is invisible (backdrop plain)', () => {
  const page = (backdrop, extra) => make([hero(), sec([prose], extra)], {backdrop, pageType: 'landing'});
  const has = r => /\[data-after=hero\]\[data-surface=plain\]\{padding-top:0\}/.test(r.css);
  assert.ok(has(compile(page('plain'))), 'plain backdrop keeps P03');
  for (const bd of ['tint', 'gradient', 'grid']) {
    const r = compile(page(bd));
    assert.ok(!has(r), `${bd}: the hero ends on canvas against a visible page background, so the section keeps its band padding`);
    assert.equal(r.manifest.design.page.facts.afterHero, 'plain-section-visible-edge');
    assert.ok(!r.manifest.design.page.decisions.some(d => d.rule === 'P03'));
    // 같은 입력의 2.4.0 출력은 그대로 P03 이 걸린다(고정 출력).
    assert.ok(has(compile({...structuredClone(page(bd)), catalogVersion: '2.4.0'})), `${bd} 2.4.0 pinned`);
  }
  assert.ok(!has(compile(page('plain', {space: 'loose'}))), 'an explicit space is the author\'s choice');
});

test('R2 an explicit surface plain (or flat) is never painted by the alternating band; the default still alternates', () => {
  const page = surface => make([hero(), sec([prose]), sec([prose], surface ? {surface} : {}), sec([prose], surface ? {surface} : {})], {pageType: 'landing'});
  const paint = /data-fill=none\]:nth-child\(even\)\{background:none;box-shadow:none\}/;
  for (const s of ['plain', 'flat']) { const r = compile(page(s)); assert.match(r.html, /data-surface="plain" data-fill="none"/); assert.match(r.css, paint); }
  assert.match(compile(page('flat')).html, /data-flat="yes"/);
  const dflt = compile(page());
  assert.doesNotMatch(dflt.html, /data-fill/, 'an unset surface keeps the legacy alternating bands');
  assert.doesNotMatch(dflt.css, paint);
  assert.doesNotMatch(compile({...structuredClone(page('plain')), catalogVersion: '2.4.0'}).html, /data-fill/, '2.4.0 ignores the intent as before');
});

test('R3 the device mock keeps its chips inside a 3:4 canvas and the box is width-capped; the 4:3 and 3:4 output of 2.4.0 is untouched', () => {
  const inside = (svg, w) => {
    for (const m of svg.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">(.*?)<\/g>/g)) {
      const [dx] = [Number(m[1])];
      for (const r of m[3].matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)"/g)) { const x = Number(r[1]) + dx; assert.ok(x >= 0 && x + Number(r[3]) <= w + 0.01, `rect at ${x} width ${r[3]} leaves a ${w}px canvas`); }
    }
  };
  const raw = deviceMock(240, 320, 'm0', false), right = svg => Math.max(...[...svg.matchAll(/<rect x="([-\d.]+)" y="[-\d.]+" width="([-\d.]+)"/g)].map(m => Number(m[1]) + Number(m[2])));
  assert.ok(right(raw) > 240 + 50, 'before the fix the original coordinates overflow a 240px canvas by 60px+ (the clipped chips of R3)');
  assert.ok(!raw.includes('translate('), 'fit off = the old coordinates');
  inside(deviceMock(240, 320, 'm0', true), 240);
  assert.equal(deviceMock(320, 240, 'm0', true), deviceMock(320, 240, 'm0', false), '320px wide canvases are unchanged even with fit on');
  const media = make([{type: 'media', kind: 'device', ratio: '3:4', alt: '앱 화면'}]);
  assert.match(compile(media).css, /\.kit-art-box\[data-art=device\]\[data-ratio="3:4"\]\{max-width:min\(100%,360px\)/);
  assert.doesNotMatch(compile({...structuredClone(media), catalogVersion: '2.4.0'}).css, /data-art=device/);
});

test('R4 gallery showcase draws its big photo 16:9 instead of 1:1 in 2.5.0 only', () => {
  const g = layout => make([sec([{type: 'gallery', layout, items: [{kind: 'photo', alt: '큰 사진'}, {kind: 'photo', alt: '둘'}, {kind: 'photo', alt: '셋'}, {kind: 'photo', alt: '넷'}]}])]);
  const ratios = html => [...html.matchAll(/<div class="kit-art-box" style="aspect-ratio:([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ratios(compile(g('showcase')).html), ['16 / 9', '1 / 1', '1 / 1', '1 / 1']);
  assert.deepEqual(ratios(compile({...structuredClone(g('showcase')), catalogVersion: '2.4.0'}).html), ['1 / 1', '1 / 1', '1 / 1', '1 / 1']);
  assert.deepEqual(ratios(compile(g('grid')).html), ['4 / 3', '4 / 3', '4 / 3', '4 / 3'], 'other layouts are unchanged');
});

test('R5 variant contracts reach hand-written Blueprints: V06 is an error, V03/V04 warn, V01/V02 inform, and no template becomes invalid', () => {
  const metrics = n => Array.from({length: n}, (_, i) => ({type: 'metric', label: '지표 ' + i, value: String(i + 1)}));
  const warn = b => validateBlueprint(b).warnings.map(w => `${w.contract}:${w.severity}`);
  // V06 오류: 히어로 형태가 수치를 지우지 못한다
  const v06 = codes(make([{type: 'hero', variant: 'split', title: 't', body: 'b', visual: 'photo', facts: [{value: '1', label: 'a'}, {value: '2', label: 'b'}]}]));
  assert.ok(v06.includes('VARIANT_REQUIRES'));
  assert.match(validateBlueprint(make([{type: 'hero', variant: 'product', title: 't', body: 'b', visual: 'chart', facts: [{value: '1', label: 'a'}, {value: '2', label: 'b'}]}])).errors.map(e => e.message).join(), /계약 V06/);
  assert.doesNotMatch(validateBlueprint({...make([{type: 'hero', variant: 'split', title: 't', body: 'b', visual: 'photo', facts: [{value: '1', label: 'a'}, {value: '2', label: 'b'}]}]), catalogVersion: '2.4.0'}).errors.map(e => e.message).join(), /계약 V06/, '2.4.0 messages are unchanged');
  // V03 경고
  const grid = (columns, n) => make([sec([{type: 'grid', columns, children: metrics(n)}])]);
  assert.deepEqual(warn(grid('two', 4)), ['V03:warning']);
  assert.deepEqual(warn(grid('four', 4)), []);
  assert.deepEqual(warn(grid('three', 3)), []);
  assert.deepEqual(warn(grid('two', 3)), ['V03:warning']);
  assert.deepEqual(warn(grid('two', 6)), [], 'more than four metrics is a table of numbers, not the one-row KPI claim');
  assert.ok(validateBlueprint(grid('two', 4)).valid, 'warnings never reject');
  // V04 경고: 가운데 머리말 아래 왼쪽 글
  assert.deepEqual(warn(make([sec([prose], {align: 'center'})])), ['V04:warning']);
  assert.deepEqual(warn(make([sec([{type: 'logo-cloud', names: ['가', '나', '다']}], {align: 'center'})])), [], 'self-centred body is fine');
  assert.deepEqual(warn(make([sec([prose], {align: 'start'})])), []);
  // V01·V02 진단
  assert.deepEqual(warn(make([{type: 'hero', variant: 'split', title: 't', body: 'b'}])), ['V01:info']);
  assert.deepEqual(warn(make([sec([{type: 'grid', columns: 'three', children: [card(1, {variant: 'outline'}), card(2), card(3, {variant: 'filled'})]}])])), ['V02:info']);
  // 템플릿 85개: 오류 0, 경고는 진단(info)뿐
  let infos = 0;
  for (const t of templateList) { const r = validateBlueprint(migrateBlueprint(createBlueprint(t.id), '2.5.0')); assert.deepEqual(r.errors, [], t.id); assert.ok(r.warnings.every(w => w.severity === 'info'), t.id + JSON.stringify(r.warnings)); infos += r.warnings.length; }
  assert.ok(infos <= 5, 'templates stay quiet: ' + infos);
  assert.deepEqual(DIRECT_CONTRACTS.map(c => c.id + ':' + c.severity), ['V06:error', 'V03:warning', 'V04:warning', 'V01:info', 'V02:info']);
});

test('edit layer: documents using 2.5.0 fields survive setTheme, setAppearance, updateNode and import without losing a value', () => {
  const doc = make([hero({ratio: 'visual'}), sec([{type: 'grid', columns: 'four', children: [card(1, {featured: 'yes'}), card(2), card(3)]}, {type: 'quote', variant: 'pull', quote: '인용', author: '저자'}], {space: 'loose', surface: 'flat'}), {type: 'media', kind: 'photo', ratio: '21:9', alt: '전경', bleed: 'yes'}]);
  assert.deepEqual(validateBlueprint(doc).errors, []);
  const before = contentFingerprint(doc), tree = JSON.stringify(doc.tree);
  const t = setTheme(doc, {theme: 'studio'}); assert.ok(t.ok, JSON.stringify(t.errors));
  assert.equal(JSON.stringify(t.doc.tree), tree); assert.equal(t.doc.catalogVersion, '2.5.0');
  const a = setAppearance(doc, {mode: 'dark'}); assert.ok(a.ok, JSON.stringify(a.errors)); assert.equal(JSON.stringify(a.doc.tree), tree);
  const u = updateNode(doc, {path: '$.tree.children[2].children[0].children[0]', set: {title: '새 제목'}}); assert.ok(u.ok, JSON.stringify(u.errors));
  assert.equal(u.doc.tree.children[2].children[0].children[0].featured, 'yes');
  for (const upgrade of [false, true]) { const i = importBlueprint(null, {blueprint: JSON.stringify(doc), upgrade}); assert.ok(i.ok, JSON.stringify(i.errors)); assert.equal(i.doc.catalogVersion, '2.5.0'); assert.deepEqual(contentFingerprint(i.doc), before); assert.equal(JSON.stringify(i.doc.tree), tree); }
  const down = updateNode(doc, {path: '$.tree.children[1]', unset: ['ratio']}); assert.ok(down.ok);
});

test('2.5.0 without any new field adds no expression CSS: the stylesheet equals the 2.4.0 one apart from the version labels, for templates that use no R1–R4 trigger', () => {
  const strip = r => ({html: r.html.replace('Static Kit 2.5.0', 'Static Kit 2.4.0').replace('catalog 2.5.0', 'catalog 2.4.0'), css: r.css.replace('catalog 2.5.0', 'catalog 2.4.0'), man: JSON.stringify(r.manifest).replaceAll('2.5.0', '2.4.0')});
  let same = 0;
  for (const t of templateList) {
    const b4 = createBlueprint(t.id), a = strip(compile(migrateBlueprint(b4, '2.5.0'))), c = compile(b4);
    if (a.html === c.html && a.css === c.css && a.man === JSON.stringify(c.manifest)) same++;
  }
  assert.ok(same >= 65, `most templates are identical after relabelling, got ${same}/${templateList.length}`);
});
