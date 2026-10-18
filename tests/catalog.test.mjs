import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {themes, themeCategories, palettes, axes, axisDefs, styleAxes, axisBans, nodeSpecs, nodeTypes, templateList, templates, pageTypes, icons, iconNames, rules, createBlueprint, blueprintSchema, repairAxes, migrateV1, CATALOG_VERSION} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';
import {DENSITY, RADIUS, WIDTH, SCALE, WEIGHT, ICON, ELEVATION, MOTION, BACKDROP, TYPO} from '../src/styles/base.mjs';
import {shellCSS} from '../src/styles/shells.mjs';
import {chunks} from '../src/styles/chunks.mjs';
import {navLimits} from '../src/catalog.mjs';

const peer = JSON.parse(readFileSync(new URL('../docs/evidence/peer-axes.json', import.meta.url), 'utf8'));
const evidence = JSON.parse(readFileSync(new URL('../docs/evidence/coolors-palettes.json', import.meta.url), 'utf8'));

test('catalog scale: at least the peer repository on themes, layouts, page structures and icons', () => {
  assert.equal(CATALOG_VERSION, '2.0.0');
  assert.ok(Object.keys(themes).length >= peer.counts.systems, 'themes >= peer systems');
  assert.ok(templateList.length >= peer.counts.pages * 5, 'templates well above peer content structures');
  assert.ok(iconNames.length >= peer.counts.icons);
  // layout concepts = shells + layout nodes + templates; peer has 38 layout patterns
  const layoutNodes = nodeTypes.filter(t => ['layout'].includes(nodeSpecs[t].group)).length;
  assert.ok(axes.shell.length + layoutNodes + templateList.length >= peer.counts.layouts * 2);
  assert.ok(nodeTypes.length >= 30);
  assert.ok(Object.keys(palettes).length >= Object.keys(themes).length * 3);
});

test('every theme has 3+ distinct, sourced Coolors palette candidates', () => {
  const observed = new Set(evidence.palettes.map(p => p.colors.join('-')));
  const seen = new Set();
  for (const theme of Object.values(themes)) {
    assert.ok(theme.palettes.length >= 3, theme.id);
    assert.ok(themeCategories[theme.category], theme.id);
    for (const id of theme.palettes) {
      const p = palettes[id]; assert.ok(p, id); assert.ok(!seen.has(id)); seen.add(id);
      assert.equal(p.theme, theme.id);
      assert.match(p.source.url, /^https:\/\/coolors\.co\/palette\//);
      assert.equal(p.source.observed, '2026-10-18');
      assert.equal(p.source.url.split('/').at(-1), p.colors.map(c => c.slice(1).toLowerCase()).join('-'));
      assert.ok(p.brand >= 0 && p.brand < p.colors.length);
      assert.ok(p.colors.every(c => /^#[0-9A-F]{6}$/.test(c)));
      assert.ok(observed.has(p.colors.join('-')), 'in rendered evidence: ' + id);
    }
  }
  assert.equal(seen.size, Object.keys(palettes).length);
});

test('every one of the peer repository\'s system archetypes is covered by a named theme', () => {
  const covered = new Set(Object.values(themes).flatMap(t => t.covers));
  for (const s of peer.systems) assert.ok(covered.has(s.id), 'uncovered peer system ' + s.id);
  for (const id of covered) assert.ok(peer.systems.some(s => s.id === id), 'unknown peer id ' + id);
});

test('every value of every axis is implemented in CSS/render tables', () => {
  const tables = {density: DENSITY, radius: RADIUS, width: WIDTH, scale: SCALE, weight: WEIGHT, icon: ICON, elevation: ELEVATION, motion: MOTION, backdrop: BACKDROP, typography: TYPO};
  for (const [axis, table] of Object.entries(tables)) assert.deepEqual(Object.keys(table).sort(), [...axes[axis]].sort(), axis);
  for (const shell of axes.shell) { assert.ok(shellCSS({shell, footer: 'simple'}).includes(`[data-shell=${shell}]`), shell); assert.ok(navLimits[shell] > 0); }
  for (const f of axes.footer) assert.ok(shellCSS({shell: 'topbar', footer: f}).includes('.kit-footer'));
  for (const axis of styleAxes) assert.ok(axisDefs[axis] && Object.keys(axisDefs[axis].values).length === axes[axis].length, axis);
  // control, ornament and footer are exercised through real compiles
  for (const control of axes.control) assert.match(compile({...createBlueprint('about-team'), control}).css, control === 'pill' ? /--kit-r-control:999px/ : control === 'square' ? /--kit-r-control:0px/ : /--kit-r-control:/);
  for (const ornament of axes.ornament) { const b = createBlueprint('solar-landing'); b.ornament = ornament; const html = compile(b).html; assert.equal(html.includes('class="kit-hero-visual"'), ornament !== 'none'); }
});

test('node specs are internally consistent', () => {
  for (const type of nodeTypes) {
    const s = nodeSpecs[type];
    assert.ok(s.label && s.group, type);
    for (const k of s.optional ?? []) assert.ok(Object.hasOwn(s.fields, k), `${type}.${k} optional but undefined`);
    for (const c of s.children ?? []) assert.ok(nodeSpecs[c], `${type} child ${c}`);
    if (s.children) assert.ok(s.max >= s.min);
    if (chunks[type] === undefined) assert.fail('CSS chunk missing for ' + type);
  }
  assert.ok(nodeSpecs.page.children.includes('hero') && !nodeSpecs.section.children.includes('hero'));
});

test('every node example validates inside a page and compiles', () => {
  const base = createBlueprint('about-team'); base.pageType = 'general';
  const filler = {type: 'prose', title: '본문', body: '내용'};
  let n = 0;
  for (const type of nodeTypes) {
    const ex = nodeSpecs[type].example; if (ex === null) continue;
    const b = structuredClone(base);
    b.tree = {type: 'page', children: type === 'page-header' ? [structuredClone(ex), filler] : [{type: 'page-header', title: 'x'}, structuredClone(ex)]};
    if (type === 'toc') b.tree.children.push({type: 'section', title: 'A', anchor: 'a', children: [filler]}, {type: 'section', title: 'B', anchor: 'b', children: [filler]});
    const r = validateBlueprint(b); assert.ok(r.valid, type + JSON.stringify(r.errors));
    const html = compile(b).html; assert.ok(html.includes('<main'), type); n++;
  }
  assert.ok(n >= 45);
});

test('all templates are valid on their own theme and carry accessible navigation', () => {
  const ids = new Set();
  for (const t of templateList) {
    assert.ok(!ids.has(t.id)); ids.add(t.id);
    assert.ok(pageTypes[t.pageType] && themes[t.theme], t.id);
    const b = createBlueprint(t.id), r = validateBlueprint(b); assert.ok(r.valid, t.id + JSON.stringify(r.errors));
    assert.ok(b.chrome.nav.every(n => n.icon), t.id + ' nav icons');
    assert.ok(compile(b).html.includes('<h1'), t.id);
  }
  for (const id of Object.keys(pageTypes)) assert.ok(templateList.some(t => t.pageType === id), 'page type without template: ' + id);
  const covered = new Set(templateList.map(t => t.theme)); assert.ok(covered.size >= 25, 'templates exercise many themes');
});

test('each template compiles under every theme with that theme\'s defaults', () => {
  for (const t of templateList) for (const theme of Object.values(themes)) { const b = createBlueprint(t.id, theme.id), r = validateBlueprint(b); assert.ok(r.valid, `${t.id}×${theme.id} ` + JSON.stringify(r.errors[0])); }
});

test('theme defaults satisfy every ban and forbid, and forbid values exist', () => {
  for (const theme of Object.values(themes)) {
    const a = theme.defaults;
    for (const k of ['mode', ...styleAxes]) assert.ok(axes[k].includes(a[k]), `${theme.id}.${k}`);
    for (const ban of axisBans) assert.equal(ban.bad(a), false, `${theme.id} default violates ${ban.id}`);
    for (const [k, vals] of Object.entries(theme.forbid)) { assert.ok(axes[k], k); vals.forEach(v => assert.ok(axes[k].includes(v))); assert.ok(!vals.includes(a[k]), `${theme.id} forbids own default ${k}`); }
  }
});

test('themes differ: no two themes share the same default axis profile', () => {
  const sig = new Set(Object.values(themes).map(t => JSON.stringify(t.defaults)));
  assert.equal(sig.size, Object.keys(themes).length);
});

test('every icon referenced by nodes and templates exists and is drawn', () => {
  const found = new Set();
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { if (k === 'icon' && typeof x === 'string') found.add(x); else walk(x); } } };
  walk(templateList); walk(Object.values(nodeSpecs).map(s => s.example));
  for (const i of found) assert.ok(icons[i], 'missing icon ' + i);
  for (const [name, shapes] of Object.entries(icons)) assert.ok(shapes.length >= 1 && shapes.every(d => /^M/.test(d)), name);
  assert.ok(nodeSpecs.card.fields.icon.enum.length === iconNames.length);
});

test('schema is generated from the catalog and covers all nodes, axes and palettes', () => {
  const s = blueprintSchema();
  assert.equal(Object.keys(s.$defs).length, nodeTypes.length);
  for (const k of styleAxes) assert.deepEqual(s.properties[k].enum, axes[k]);
  assert.equal(s.properties.palette.enum.length, Object.keys(palettes).length);
  assert.equal(s.properties.theme.enum.length, Object.keys(themes).length);
});

test('every rule has an id, intent and enforcement codes; bans carry sources and fixes', () => {
  assert.equal(new Set(rules.map(r => r.id)).size, rules.length);
  for (const r of rules) assert.ok(r.intent && r.codes.length && r.source);
  for (const b of axisBans) assert.ok(b.id && b.why && b.source && Object.keys(b.fix).length);
});

test('migrateV1 upgrades a catalog-1.0 blueprint and refuses unknown themes', () => {
  const v1 = {version: '1.0', catalogVersion: '1.0.0', name: '예전 화면', theme: 'workspace', palette: 'ocean', mode: 'light', shell: 'sidebar', typography: 'sans', density: 'comfortable', radius: 'soft',
    tree: {type: 'page', children: [{type: 'page-header', title: '제목'}, {type: 'grid', columns: 'two', children: [{type: 'metric', label: 'a', value: '1'}, {type: 'metric', label: 'b', value: '2'}]}]}};
  const b = migrateV1(v1); assert.equal(b.version, '2.0'); assert.ok(validateBlueprint(b).valid);
  assert.throws(() => migrateV1({...v1, theme: 'bogus'}), /Unknown theme/);
});

test('repairAxes resolves bans without leaving the catalog', () => {
  const b = createBlueprint('about-team'); Object.assign(b, {shell: 'dock', density: 'compact', width: 'narrow'});
  repairAxes(b); assert.equal(axisBans.some(x => x.bad(b)), false);
});

test('layout, content-structure and icon coverage maps reference real catalog parts and cover every peer entry', async () => {
  const {layoutCoverage, contentCoverage, iconAliases} = await import('../src/catalog.mjs');
  assert.deepEqual(Object.keys(layoutCoverage).sort(), [...peer.layouts].sort());
  for (const [name, c] of Object.entries(layoutCoverage)) {
    assert.ok(c.refs.length && ['full', 'partial'].includes(c.status), name);
    for (const ref of c.refs) { const [kind, id] = ref.split(':'); const ok = kind === 'shell' ? axes.shell.includes(id) : kind === 'node' ? nodeSpecs[id] : kind === 'template' ? templates[id] : kind === 'axis' ? axes[id] : false; assert.ok(ok, `${name} → ${ref}`); }
  }
  assert.deepEqual(Object.keys(contentCoverage).sort(), peer.pages.map(p => p.id).sort());
  for (const c of Object.values(contentCoverage)) assert.ok(templates[c.template]);
  for (const name of peer.icons) assert.ok(icons[name] || icons[iconAliases[name]], 'peer icon without equivalent: ' + name);
  assert.ok(Object.values(layoutCoverage).filter(c => c.status === 'full').length >= 33);
});

test('mega menus and media overlays are validated and rendered', () => {
  const b = createBlueprint('product-listing'); const html = compile(b).html;
  assert.match(html, /<details class="kit-mega">/); assert.match(html, /data-mega/);
  const side = createBlueprint('product-listing'); side.shell = 'sidebar'; assert.ok(validateBlueprint(side).errors.some(e => e.code === 'NAV_MEGA'));
  const three = createBlueprint('product-listing'); three.chrome.nav.forEach(n => { n.mega = [{label: 'a', href: '#main'}, {label: 'b', href: '#main'}]; }); assert.ok(validateBlueprint(three).errors.some(e => e.code === 'NAV_MEGA'));
  assert.match(compile(createBlueprint('case-study')).html, /<span class="kit-overlay">8주 프로젝트<\/span>/);
});
