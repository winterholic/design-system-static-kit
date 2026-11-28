import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {familyShapeVars} from '../src/platform/family.mjs';
import {VISUAL_LANGUAGES, VISUAL_KEYS} from '../src/platform/families/visual.mjs';
import {renderPurposeFamily} from '../src/platform/families/index.mjs';

const EXPECTED_FAMILIES = [
  {id: 'family:quiet', name: 'Minimal Flat', key: 'quiet'},
  {id: 'family:soft', name: 'Soft Rounded', key: 'soft'},
  {id: 'family:outline-precise', name: 'Outline Precise', key: 'outline-precise'},
  {id: 'family:corporate-formal', name: 'Corporate Formal', key: 'corporate-formal'},
  {id: 'family:dense-enterprise', name: 'Dense Enterprise', key: 'dense-enterprise'},
  {id: 'family:elevated-material', name: 'Elevated Material', key: 'elevated-material'},
  {id: 'family:tonal-layered', name: 'Tonal Layered', key: 'tonal-layered'},
  {id: 'family:editorial', name: 'Editorial', key: 'editorial'},
  {id: 'family:glass', name: 'Glass', key: 'glass'},
  {id: 'family:bold', name: 'Brutalist', key: 'bold'},
  {id: 'family:luxury', name: 'Luxury', key: 'luxury'},
  {id: 'family:expressive', name: 'Expressive', key: 'expressive'},
];

const REQUIRED_TRAIT_KEYS = [
  'corner', 'border', 'shadow', 'surface', 'controlHeight',
  'padding', 'icon', 'buttonEmphasis', 'state', 'cardStructure',
  'navExpression', 'motion',
];

test('TASK-TRE-01 Criterion 1: exactly 12 visual families registered, legacy 4 mapped and expanded without new IDs', () => {
  const env = createPlatform();
  const registered = env.registry.list('family');
  assert.equal(registered.length, 12, `Must register exactly 12 families, got ${registered.length}`);

  const registeredIds = new Set(registered.map(f => f.id));
  for (const exp of EXPECTED_FAMILIES) {
    assert.ok(registeredIds.has(exp.id), `Family ${exp.id} (${exp.name}) must be registered`);
  }

  // 기존 4개 패밀리가 새 ID 없이 유지되는지 확인
  assert.ok(registeredIds.has('family:quiet'), 'Minimal Flat maps to legacy family:quiet');
  assert.ok(registeredIds.has('family:soft'), 'Soft Rounded maps to legacy family:soft');
  assert.ok(registeredIds.has('family:bold'), 'Brutalist maps to legacy family:bold');
  assert.ok(registeredIds.has('family:editorial'), 'Editorial maps to legacy family:editorial');

  assert.equal(VISUAL_KEYS.length, 12, 'VISUAL_KEYS must contain 12 keys');
});

test('TASK-TRE-01 Criterion 2: all 12 families carry 12 structured trait dimensions and renderers consume them', () => {
  const env = createPlatform();
  const registered = env.registry.list('family');

  for (const f of registered) {
    const lang = VISUAL_LANGUAGES[f.id];
    assert.ok(lang, `${f.id} must have VISUAL_LANGUAGES entry`);
    assert.ok(lang.traits, `${f.id} must have structured traits`);

    for (const key of REQUIRED_TRAIT_KEYS) {
      assert.ok(lang.traits[key] !== undefined, `${f.id} traits must include ${key}`);
    }

    // familyShapeVars가 컨트롤 높이, 반경, 그림자, 패딩 등을 올바르게 내보내는지 확인
    const vars = familyShapeVars(f);
    assert.ok(vars['--kit-radius'], `${f.id} must emit --kit-radius`);
    assert.ok(vars['--kit-shadow'], `${f.id} must emit --kit-shadow`);
    assert.ok(vars['--kit-dur'], `${f.id} must emit --kit-dur`);
    assert.ok(vars['--pf-control-h'], `${f.id} must emit --pf-control-h`);
    assert.ok(vars['--pf-pad'], `${f.id} must emit --pf-pad`);
    assert.ok(vars['--pf-border'], `${f.id} must emit --pf-border`);
    assert.ok(vars['--pf-surface'], `${f.id} must emit --pf-surface`);
  }
});

test('TASK-TRE-01 Criterion 3: pairwise differentiation across all 12 family pairs (66 pairs) in CSS shape/space/surface/emphasis', () => {
  const env = createPlatform();
  const families = env.registry.list('family');
  assert.equal(families.length, 12);

  let pairCount = 0;
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      const a = families[i], b = families[j];
      const varsA = familyShapeVars(a);
      const varsB = familyShapeVars(b);

      const diffs = [];
      // 1. 형태 (Shape: radius, border)
      if (varsA['--kit-radius'] !== varsB['--kit-radius']) diffs.push('radius');
      if (varsA['--pf-border'] !== varsB['--pf-border']) diffs.push('border');

      // 2. 간격 (Space: pad, gap, controlHeight, cellPad)
      if (varsA['--pf-pad'] !== varsB['--pf-pad']) diffs.push('pad');
      if (varsA['--pf-gap'] !== varsB['--pf-gap']) diffs.push('gap');
      if (varsA['--kit-control'] !== varsB['--kit-control']) diffs.push('controlHeight');

      // 3. 표면 (Surface: shadow, surface)
      if (varsA['--kit-shadow'] !== varsB['--kit-shadow']) diffs.push('shadow');
      if (varsA['--pf-surface'] !== varsB['--pf-surface']) diffs.push('surface');

      // 4. 강조 (Emphasis: recipe, titleWeight, motion)
      const langA = VISUAL_LANGUAGES[a.id];
      const langB = VISUAL_LANGUAGES[b.id];
      if (JSON.stringify(langA.recipe) !== JSON.stringify(langB.recipe)) diffs.push('recipe');
      if (varsA['--pf-title-weight'] !== varsB['--pf-title-weight']) diffs.push('titleWeight');
      if (varsA['--kit-dur'] !== varsB['--kit-dur'] || varsA['--kit-lift'] !== varsB['--kit-lift']) diffs.push('motion');

      assert.ok(diffs.length >= 1, `Pair ${a.id} vs ${b.id} must differ in CSS, but found 0 differences!`);
      pairCount++;
    }
  }
  assert.equal(pairCount, 66, 'Must test all 66 pairs (12 choose 2)');
});

test('TASK-TRE-01 Criterion 4: relation graph compatibility, distinction between avoids and forbids with reasons', () => {
  const env = createPlatform();
  const registered = env.registry.list('family');

  for (const f of registered) {
    for (const rel of f.relations) {
      assert.ok(['prefers', 'avoids', 'forbids', 'requires', 'compatible'].includes(rel.type), `Valid relation type: ${rel.type}`);
      assert.ok(rel.reason && rel.reason.length >= 5, `Relation from ${f.id} to ${rel.to} must have meaningful reason`);
      if (rel.type === 'forbids') {
        assert.ok(rel.reason.includes('금지') || rel.reason.includes('불가') || rel.reason.includes('충돌') || rel.reason.includes('방지') || rel.reason.includes('위험'),
          `Forbid reason for ${f.id} -> ${rel.to} must be objective: ${rel.reason}`);
      }
    }
  }
});

test('TASK-TRE-01 Criterion 5: all 12 families render purpose components and assemble into actual output', () => {
  const env = createPlatform();
  const registered = env.registry.list('family');

  for (const f of registered) {
    const res = renderPurposeFamily(env, 'purpose:card.kpi', {
      visual: f.id,
      variant: {layout: 'stacked', trend: 'spark'},
      props: {size: 'medium'},
      content: {label: '매출', value: '1,000,000', unit: '원', delta: '+12%', deltaDirection: 'up'},
    });
    assert.ok(res.ok, `${f.id} must successfully render KPI card: ${JSON.stringify(res.errors)}`);
    assert.ok(res.html.includes('data-ctl="card"'), `${f.id} markup must include card base component`);
  }
});
