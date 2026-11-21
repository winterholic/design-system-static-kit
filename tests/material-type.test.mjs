import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRegistry} from '../src/materials/registry.mjs';
import {catalogRegistry} from '../src/materials/index.mjs';
import {STACKS, TYPE_R2, HANGUL} from '../src/typography.mjs';
import {SPACE} from '../src/spacing.mjs';
import {
  MATERIAL_TYPE_PRESETS, MULTILINGUAL_TYPE_CORPUS, registerMaterialType,
  renderMaterialTypeCSS, renderMaterialTypeExample, CONTROL_SIZE_NAMES, FLOOR_ROLES, DENSITY_FACTORS, clampBounds,
  controlViolations, effectiveLeading, maxFontPx,
} from '../src/materials/typography.mjs';

test('role presets define all seven type roles and explicit responsive density behavior', () => {
  assert.deepEqual(Object.keys(MATERIAL_TYPE_PRESETS).sort(), ['dashboard', 'document', 'erp', 'marketing']);
  for (const [id, preset] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    assert.equal(preset.id, id);
    assert.deepEqual(Object.keys(preset.roles).sort(), ['body', 'caption', 'code', 'display', 'heading', 'label', 'numeric']);
    for (const [role, spec] of Object.entries(preset.roles)) {
      assert.ok(spec.fontFamily.includes('sans-serif') || spec.fontFamily.includes('serif') || spec.fontFamily.includes('monospace'), `${id}/${role} fallback`);
      assert.ok(spec.weight >= 400 && spec.weight <= 800, `${id}/${role} weight`);
      assert.ok(spec.lineHeight >= 1 && spec.lineHeight <= 1.8, `${id}/${role} line height`);
      assert.ok(Number.isFinite(spec.trackingEm), `${id}/${role} tracking`);
      assert.match(spec.size, /clamp\(/, `${id}/${role} fluid size`);
    }
    const css = renderMaterialTypeCSS(id);
    for (const role of Object.keys(preset.roles)) {
      assert.match(css, new RegExp(`--mt-${role}:`));
      assert.ok(css.includes(`font-size:calc(var(--mt-${role}) * var(--mt-density-factor) * var(--mt-viewport-factor))`), `${id}/${role} density and viewport relation`);
    }
    assert.match(css, /@media\s*\(max-width:\s*720px\)/);
    assert.match(css, /data-density="compact"/);
    assert.match(css, /--mt-viewport-factor/);
  }
});

test('multilingual corpus covers requested copy and declares expected wrap or overflow behavior', () => {
  const corpus = MULTILINGUAL_TYPE_CORPUS;
  const corpusText = corpus.map(item => item.text).join('\n');
  assert.deepEqual([...new Set(corpus.map(item => item.role))].sort(), ['body', 'caption', 'code', 'display', 'heading', 'label', 'numeric']);
  for (const sample of ['The quick brown fox jumps over the lazy dog.', '다람쥐 헌 쳇바퀴에 타고파.', 'USD 1,234,567.89', '₩1,234,500', '12.75%', '2026-11-22', 'const 합계 = rows.reduce((sum, row) => sum + row.amount, 0);', '한글한국어무공백긴문자열넘침확인용']) {
    assert.ok(corpusText.includes(sample), `corpus sample: ${sample}`);
  }
  assert.ok(corpus.every(item => item.role && ['wrap', 'nowrap', 'scroll'].includes(item.policy)));
  assert.ok(corpus.some(item => item.text.includes('한글') && item.policy === 'wrap'));
  assert.ok(corpus.some(item => item.text.includes('₩') && item.role === 'numeric'));
});

test('role materials register through the contract with actual fonts, render entry points and verified evidence', () => {
  const registry = createRegistry();
  registerMaterialType(registry);
  const materials = registry.byKind('type-role-preset');
  assert.equal(materials.length, 4);
  assert.deepEqual(registry.check(), []);
  for (const material of materials) {
    assert.equal(material.quality.status, 'verified');
    assert.ok(material.quality.evidence.some(ref => ref.startsWith('tests/material-type.test.mjs:')));
    assert.equal(material.preset, true);
    assert.equal(material.render.export, 'renderMaterialTypeCSS');
    assert.ok(material.ext.fonts.length >= 2);
    assert.deepEqual(Object.keys(material.ext.roles).sort(), ['body', 'caption', 'code', 'display', 'heading', 'label', 'numeric']);
  }
});

test('rendered specimen includes the reusable corpus and all four real CSS presets', () => {
  const html = renderMaterialTypeExample();
  for (const id of Object.keys(MATERIAL_TYPE_PRESETS)) assert.match(html, new RegExp(`data-preset="${id}"`));
  for (const {text} of MULTILINGUAL_TYPE_CORPUS) assert.ok(html.includes(text.replaceAll('&', '&amp;')));
  assert.match(html, /overflow-x:auto/);
  assert.match(html, /word-break:keep-all/);
});

test('checked-in browser specimen is rendered from the same reusable module', () => {
  const html = renderMaterialTypeExample();
  assert.equal(readFileSync(new URL('../docs/materials/typography-corpus.html', import.meta.url), 'utf8'), html);
});

const preset = id => MATERIAL_TYPE_PRESETS[id];
const px = n => Math.round(n);

test('role values that the 2.1~2.5 engine also defines come from src/typography.mjs, not from a second copy', () => {
  const source = readFileSync(new URL('../src/materials/typography.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /system-ui|Apple SD Gothic|AppleMyungjo|Georgia|SFMono|Menlo/, 'font stacks live in STACKS only');
  for (const [id, p] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    const e = TYPE_R2[p.engine];
    assert.ok(e, `${id}: engine preset ${p.engine}`);
    assert.equal(p.roles.display.fontFamily, STACKS[e.head]);
    assert.equal(p.roles.heading.fontFamily, STACKS[e.head]);
    assert.equal(p.roles.body.fontFamily, STACKS[e.text]);
    assert.equal(p.roles.code.fontFamily, STACKS.mono);
    for (const [name, spec] of Object.entries(p.roles)) assert.ok(Object.values(STACKS).includes(spec.fontFamily), `${id}/${name} is a named engine stack`);
    assert.equal(p.roles.display.trackingEm, e.track.display);
    assert.equal(p.roles.heading.trackingEm, e.track.heading);
    assert.equal(p.roles.label.trackingEm, e.track.label);
    assert.equal(p.roles.display.lineHeight, e.lh.display);
    assert.equal(p.roles.heading.lineHeight, e.lh.heading);
    assert.equal(p.roles.body.lineHeight, e.lh.body);
    assert.equal(clampBounds(p.roles.body.size).min, e.body, `${id} body floor is the engine body px`);
    assert.equal(clampBounds(p.roles.label.size).min, px(e.body * .8125), `${id} label floor is the engine label px`);
    assert.equal(clampBounds(p.roles.caption.size).min, px(e.body * .75), `${id} caption floor is the engine caption px`);
  }
});

test('role values keep the engine Hangul limits at every density, including the density and viewport factors', () => {
  for (const [id, p] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    const r = p.roles;
    assert.ok(r.display.trackingEm >= HANGUL.track.display && r.heading.trackingEm >= HANGUL.track.heading, `${id} tracking`);
    assert.ok(r.label.trackingEm <= HANGUL.labelMax, `${id} label tracking`);
    assert.ok(clampBounds(r.display.size).max <= HANGUL.caps.display, `${id} display cap`);
    assert.ok(clampBounds(r.heading.size).max <= HANGUL.caps.heading, `${id} heading cap`);
    for (const density of Object.keys(DENSITY_FACTORS)) {
      assert.ok(effectiveLeading('display', r.display, density) >= HANGUL.leading.display, `${id}/${density} display leading`);
      assert.ok(effectiveLeading('heading', r.heading, density) >= HANGUL.leading.heading, `${id}/${density} heading leading`);
      const body = effectiveLeading('body', r.body, density);
      assert.ok(body >= HANGUL.body[0] && body <= HANGUL.body[1], `${id}/${density} body leading ${body}`);
    }
    if (/serif\b/.test(r.display.fontFamily) && !/sans-serif/.test(r.display.fontFamily)) assert.ok(r.display.weight <= HANGUL.serifHangulWeightMax && r.heading.weight <= HANGUL.serifHangulWeightMax, `${id} serif Hangul weight`);
    const css = renderMaterialTypeCSS(id);
    assert.match(css, new RegExp(`\\.mt-role-display\\{[^}]*line-height:max\\(${HANGUL.leading.display},`), `${id} display leading floor in CSS`);
    assert.match(css, new RegExp(`\\.mt-role-body\\{[^}]*line-height:clamp\\(${HANGUL.body[0]},[^}]*,${HANGUL.body[1]}\\)`), `${id} body leading band in CSS`);
    for (const name of FLOOR_ROLES) assert.match(css, new RegExp(`\\.mt-role-${name}\\{[^}]*--mt-density-factor:1;--mt-viewport-factor:1;`), `${id}/${name} is exempt from the factors`);
    assert.doesNotMatch(css, /\.mt-role-(display|heading|numeric|code)\{[^}]*--mt-density-factor:1;/);
  }
});

test('control sizes relate height, side padding, label role and icon for every preset', () => {
  assert.deepEqual(CONTROL_SIZE_NAMES, ['compact', 'small', 'medium', 'large']);
  for (const [id, p] of Object.entries(MATERIAL_TYPE_PRESETS)) {
    assert.deepEqual(controlViolations(p), [], id);
    assert.deepEqual(Object.keys(p.controls), CONTROL_SIZE_NAMES);
    assert.equal(p.controls.medium.height, SPACE[p.space].control, `${id} medium height is the spacing control token`);
    const heights = CONTROL_SIZE_NAMES.map(n => p.controls[n].height);
    assert.deepEqual([...heights].sort((a, b) => a - b), heights, `${id} heights ascend`);
    for (const n of CONTROL_SIZE_NAMES) {
      const c = p.controls[n], spec = p.roles[c.labelRole];
      const lineBox = maxFontPx(c.labelRole, spec, p.density) * effectiveLeading(c.labelRole, spec, p.density);
      assert.ok(lineBox <= c.height, `${id}/${n} line height ${lineBox} fits control height ${c.height}`);
    }
  }
  assert.ok(Object.values(MATERIAL_TYPE_PRESETS).every(p => p.controls.large.height > p.controls.compact.height));
});

test('control relation checks reject each kind of violation (negative controls)', () => {
  const codesOf = (mutate, id = 'erp') => { const p = structuredClone(preset(id)); mutate(p); return controlViolations(p).map(e => e.code); };
  assert.ok(codesOf(p => { p.controls.compact.height = 20; }).includes('CT_LINE_BOX'), 'line box taller than the control');
  assert.ok(codesOf(p => { p.roles.label.lineHeight = 2.6; }).includes('CT_LINE_BOX'), 'label leading too loose for compact');
  assert.ok(codesOf(p => { p.controls.medium.height = 41; }).includes('CT_GRID'));
  assert.ok(codesOf(p => { p.controls.medium.height = 44; }).includes('CT_MEDIUM'), 'medium must be the control token');
  assert.ok(codesOf(p => { p.controls.small.height = p.controls.compact.height; }).includes('CT_ORDER'));
  assert.ok(codesOf(p => { p.controls.large.padX = 4; }).includes('CT_ORDER'));
  assert.ok(codesOf(p => { p.controls.small.padX = 10; }).includes('CT_GRID'));
  assert.ok(codesOf(p => { p.controls.medium.iconPx = 40; }).includes('CT_ICON_RATIO'));
  assert.ok(codesOf(p => { p.controls.compact.iconPx = 14; p.controls.compact.height = 20; }).includes('CT_ICON_FIT'));
  assert.ok(codesOf(p => { p.controls.small.labelRole = 'caption'; }).includes('CT_ROLE'));
  assert.ok(codesOf(p => { delete p.controls.large; }).includes('CT_MISSING'));
  assert.ok(codesOf(p => { p.controls.large.labelRole = 'label'; p.controls.medium.labelRole = 'body'; }, 'document').includes('CT_ORDER'), 'label text may not shrink as the control grows');
});

test('type role materials are found through the shared catalog registry and pass its graph check', () => {
  const registry = catalogRegistry();
  assert.deepEqual(registry.check(), []);
  const found = registry.byKind('type-role-preset');
  assert.deepEqual(found.map(m => m.id).sort(), Object.keys(MATERIAL_TYPE_PRESETS).map(id => `type-role-preset:${id}`).sort());
  assert.ok(registry.get('type-preset:sans'), 'engine presets sit in the same registry');
  for (const m of found) {
    assert.ok(registry.isPreset(m), `${m.id} is a complete preset`);
    assert.ok(registry.get(`type-preset:${m.ext.engine}`), `${m.id} engine preset is registered`);
    assert.deepEqual(Object.keys(m.ext.controls), CONTROL_SIZE_NAMES);
  }
  assert.ok(registry.search('multilingual', {category: 'typography'}).length >= 4);
  assert.deepEqual(registry.filter({context: 'landing', kind: 'type-role-preset'}).map(m => m.id), ['type-role-preset:marketing']);
});
