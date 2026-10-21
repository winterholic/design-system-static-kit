import test from 'node:test';
import assert from 'node:assert/strict';
import {concepts, conceptIds, conceptsOfTemplate, templates, templateList, themes, axes, createBlueprint, layoutOptionsOf} from '../src/catalog.mjs';
import {compile, validateBlueprint} from '../src/compiler.mjs';

test('concepts: 17 subjects, each with several templates and several looks', () => {
  assert.ok(conceptIds.length >= 17, 'concepts: ' + conceptIds.length);
  for (const [id, c] of Object.entries(concepts)) {
    assert.ok(c.templates.length >= 7, `${id}: ${c.templates.length} templates`);
    assert.ok(c.looks.length >= 3, `${id}: ${c.looks.length} looks`);
    assert.equal(new Set(c.templates).size, c.templates.length, `${id}: duplicate templates`);
    assert.equal(new Set(c.looks.map(l => l.id)).size, c.looks.length, `${id}: duplicate look ids`);
    for (const t of c.templates) assert.ok(templates[t], `${id}: unknown template ${t}`);
    for (const l of c.looks) {
      assert.ok(themes[l.theme], `${id}/${l.id}: unknown theme ${l.theme}`);
      assert.ok(axes.typography.includes(l.typography), `${id}/${l.id}: unknown typography ${l.typography}`);
      if (l.themeVariant) assert.ok(themes[l.theme].variants.some(v => v.id === l.themeVariant), `${id}/${l.id}: unknown theme variant`);
    }
    // 한 컨셉의 look들은 서로 다른 목소리여야 한다(같은 테마·서체를 이름만 바꿔 늘리지 않는다)
    const voices = new Set(c.looks.map(l => l.theme + '/' + l.typography + '/' + (l.themeVariant ?? '')));
    assert.equal(voices.size, c.looks.length, `${id}: looks must differ`);
  }
});

test('concepts end the one-theme-one-template shape: every template is reachable from at least two concepts or is a domain template with its own theme', () => {
  const orphan = templateList.filter(t => conceptsOfTemplate(t.id).length === 0).map(t => t.id);
  assert.deepEqual(orphan, [], 'templates in no concept: ' + orphan);
  // 템플릿마다 시각 언어 선택지: 자기 테마 + 컨셉의 look 수
  for (const t of templateList) {
    const looks = conceptsOfTemplate(t.id).flatMap(id => concepts[id].looks);
    assert.ok(new Set(looks.map(l => l.theme + l.typography)).size >= 3, `${t.id}: fewer than 3 looks across its concepts`);
  }
  const themesUsed = new Set(conceptIds.flatMap(id => concepts[id].looks.map(l => l.theme)));
  assert.ok(themesUsed.size >= 40, 'looks use ' + themesUsed.size + ' of ' + Object.keys(themes).length + ' themes');
});

test('every concept × template × look compiles and validates (typography override included)', () => {
  let n = 0;
  for (const [cid, c] of Object.entries(concepts)) for (const tid of c.templates) for (const l of c.looks) {
    const b = createBlueprint(tid, l.theme, undefined, {themeVariant: l.themeVariant, typography: l.typography});
    const check = validateBlueprint(b);
    assert.ok(check.valid, `${cid}/${tid}/${l.id}: ${check.errors?.[0]?.code} ${check.errors?.[0]?.message}`);
    assert.ok(b.typography === l.typography || (['mono', 'terminal'].includes(l.typography)), `${cid}/${tid}/${l.id}: typography ${b.typography}`);
    compile(b); n++;
  }
  assert.ok(n >= 500, 'checked ' + n);
});

test('typography is independent of the theme: any preset can be applied to any theme', () => {
  for (const id of axes.typography) {
    const b = createBlueprint('article', 'editorial', undefined, {typography: id});
    assert.equal(validateBlueprint(b).valid, true, id);
  }
  assert.throws(() => createBlueprint('article', 'editorial', undefined, {typography: 'nope'}), /Unknown typography/);
});

test('themes now carry typography variants next to their layout variants', () => {
  let n = 0;
  for (const th of Object.values(themes)) { const tv = th.variants.filter(v => v.id.startsWith('type-')); n += tv.length; for (const v of tv) assert.deepEqual(Object.keys(v.set), ['typography']); }
  assert.ok(n >= 70, 'type variants: ' + n);
  assert.ok(layoutOptionsOf('saas-landing').length > 0);
});
