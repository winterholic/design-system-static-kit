import test from 'node:test';
import assert from 'node:assert/strict';
import {SPACE, SPACE_PX, RELATIONS, TOKEN, TITLED_PARTS, orderViolations, lintSpacing, contractCSS, spacingMarkdown, spaceVars} from '../src/spacing.mjs';
import {chunks} from '../src/styles/chunks.mjs';
import {polish, polishCore} from '../src/styles/polish.mjs';
import {coreCSS, tailCSS, axisVars} from '../src/styles/base.mjs';
import {shellCSS} from '../src/styles/shells.mjs';
import {createBlueprint, templateList, axes} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';

const sources = () => {
  const css = [coreCSS, tailCSS, polishCore, ...Object.values(chunks), ...Object.values(polish)];
  for (const shell of axes.shell) for (const footer of axes.footer) css.push(shellCSS({shell, footer}));
  return css;
};

test('spacing scale keeps proximity order in every density and stays on the 4px grid', () => {
  assert.deepEqual(orderViolations(), []);
  for (const d of ['compact', 'comfortable', 'spacious']) for (const k of Object.keys(SPACE[d])) assert.ok(TOKEN[k], `token for ${k}`);
  // negative control: a tampered scale is reported with the failing pair
  const broken = structuredClone(SPACE); broken.comfortable.head = 28; broken.compact.near = 7;
  const found = orderViolations(broken);
  assert.ok(found.some(x => /head\(28\) <= gap|head\(28\) < gap/.test(x)) && found.some(x => /4px 격자 밖/.test(x)), found.join('\n'));
});

test('every margin/padding/gap in the style sources is a token or on the 4px grid (no 6/10/14px, no .9 multipliers)', () => {
  const seen = new Set(), bad = [];
  for (const css of sources()) for (const v of lintSpacing(css)) { const k = v.selector + v.prop + v.value; if (!seen.has(k)) { seen.add(k); bad.push(`${v.prop}:${v.value} (${v.reason}) in ${v.selector}`); } }
  assert.deepEqual(bad, []);
  assert.ok(sources().join('').length > 100000, 'proof of scan: the style sources are actually read');
});

test('spacing lint rejects off-scale values, odd multipliers, stray clamp (negative controls)', () => {
  const bad = css => lintSpacing(css).map(v => v.reason);
  assert.equal(bad('.a{padding:13px}').length, 1);
  assert.equal(bad('.a{margin-top:6px}').length, 1);
  assert.equal(bad('.a{gap:10px 14px}').length, 2);
  assert.equal(bad('.a{gap:calc(var(--kit-gap) * .9)}').length, 1);
  assert.equal(bad('.a{padding:calc(var(--kit-inset) * 1.3)}').length, 1);
  assert.equal(bad('.a{margin-bottom:calc(var(--kit-gap) + 3px)}').length, 1);
  assert.equal(bad('.a{padding:1em}').length, 1);
  assert.equal(bad('.kit-card{padding:clamp(20px,5vw,72px)}').length, 1, 'fluid padding outside the allow-list');
  // accepted forms
  assert.deepEqual(bad('.a{padding:8px 16px;margin:0 auto;gap:var(--kit-sp-near);margin-top:calc(var(--kit-gap) * .5);padding-block:var(--kit-band)}'), []);
  assert.deepEqual(bad('.kit-hero{padding:clamp(32px,5.6vw,80px) clamp(20px,5vw,72px)}'), []);
  assert.deepEqual(bad('.a{top:7px;width:13px}'), [], 'non-spacing properties are not linted');
});

test('the generated contract layer gives every titled part the same title→content rule', () => {
  const css = contractCSS();
  for (const part of TITLED_PARTS) assert.ok(css.includes(part), part);
  assert.match(css, /margin-block:0 var\(--kit-sp-head\)/);
  for (const t of ['compact', 'comfortable', 'spacious']) {
    const b = createBlueprint('docs-reference'); b.density = t;
    const html = compile(b).html;
    assert.ok(html.includes(contractCSS().trim().split('\n')[0]), 'contract layer is in the page');
    assert.ok(html.includes(spaceVars(t)), `${t} token set is in the page`);
  }
  assert.equal(RELATIONS.length, new Set(RELATIONS.map(r => r.id)).size);
  assert.ok(RELATIONS.every(r => r.rule && r.enforce && r.where && r.tier));
});

test('docs/spacing.md source lists every relation, token and the fluid allow-list', () => {
  const md = spacingMarkdown();
  for (const r of RELATIONS) assert.ok(md.includes(`### ${r.id} ${r.name}`), r.id);
  for (const v of Object.values(TOKEN)) assert.ok(md.includes('`' + v + '`'), v);
  assert.ok(md.includes('lintSpacing') && md.includes('SURFACE_NEST'));
});

test('structure rules S05: surfaced sections do not nest and sections nest at most two deep', () => {
  const sec = (title, surface, children) => ({type: 'section', title, ...(surface ? {surface} : {}), children});
  const prose = {type: 'prose', title: '본문', body: '내용'};
  const make = tree => { const b = createBlueprint('saas-landing'); b.tree = {type: 'page', children: [b.tree.children[0], ...tree]}; b.tree.children = b.tree.children.filter(Boolean); return b; };
  const codes = tree => validateBlueprint(make(tree)).errors.map(e => e.code);
  assert.deepEqual(codes([sec('바깥', 'tint', [sec('안쪽', 'tint', [prose])])]).filter(c => c === 'SURFACE_NEST'), ['SURFACE_NEST']);
  assert.deepEqual(codes([sec('바깥', 'inverse', [sec('안쪽', 'inverse', [prose])])]).filter(c => c === 'SURFACE_NEST'), ['SURFACE_NEST']);
  assert.deepEqual(codes([sec('바깥', 'tint', [sec('안쪽', 'plain', [prose])])]).filter(c => c === 'SURFACE_NEST'), []);
  assert.deepEqual(codes([sec('바깥', 'plain', [sec('안쪽', 'tint', [prose])])]).filter(c => c === 'SURFACE_NEST'), []);
  assert.deepEqual(codes([sec('1', null, [sec('2', null, [sec('3', null, [prose])])])]).filter(c => c === 'SECTION_DEPTH'), ['SECTION_DEPTH']);
  assert.deepEqual(codes([sec('1', null, [sec('2', null, [prose])])]).filter(c => c === 'SECTION_DEPTH'), []);
  for (const t of templateList) assert.ok(validateBlueprint(createBlueprint(t.id)).valid, t.id);
});

test('axisVars emits the full token set for the chosen density only', () => {
  const b = createBlueprint('saas-landing'); b.density = 'spacious';
  const vars = axisVars(b);
  assert.ok(vars.includes('--kit-sp-head:20px') && vars.includes('--kit-gap:32px') && vars.includes('--kit-band:104px'));
  assert.ok(!vars.includes('--kit-gap:24px'));
  assert.ok(SPACE_PX.includes(36) && !SPACE_PX.includes(10));
});
