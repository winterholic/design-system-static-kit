import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createBlueprint, recipes, templates} from '../src/catalog.mjs';
import {compile} from '../src/compiler.mjs';
import {selectRecipe, recipeBlueprint} from '../src/recipes.mjs';
import {selectionToBlueprint, contentDiff, contentSha} from '../scripts/design-qa/ai-assembly.mjs';

// 조립 방식 비교 실험(docs/ai-assembly-experiment.md)의 렌더 독립 검사. 렌더 결과 해시는 렌더러가 바뀌면 달라지므로 여기서 고정하지 않고
// `node scripts/design-qa/ai-assembly.mjs verify`가 맡는다(이 시험은 다른 작업이 렌더러를 고쳐도 깨지지 않는다).
const base = resolve(import.meta.dirname, '../docs/evidence/ai-assembly');
const read = f => JSON.parse(readFileSync(resolve(base, f), 'utf8'));
const {inputs} = read('inputs.json'), selections = read('ai/selections.json'), log = read('ai/log.json'), key = read('key.json');
const ARMS = ['default', 'recipe', 'ai'];

test('inputs: 3 recipe types × ≥3 inputs, content pinned to catalog templates', () => {
  assert.ok(inputs.length >= 9);
  assert.equal(new Set(inputs.map(i => i.id)).size, inputs.length);
  for (const r of Object.keys(recipes)) assert.ok(inputs.filter(i => i.recipe === r).length >= 3, r);
  for (const i of inputs) {
    assert.ok(recipes[i.recipe].templates.includes(i.templateId), i.id + ' template is covered by its recipe');
    assert.equal(i.content.sha256, contentSha(i.templateId), i.id + ' content hash');
    assert.ok(i.brief.purpose && i.brief.audience && i.brief.tone && i.brief.contentFit, i.id + ' brief');
  }
});

test('arms 1 and 2 are deterministic and never touch content text', () => {
  for (const i of inputs) {
    const a = createBlueprint(i.templateId), pick = selectRecipe({recipe: i.recipe, templateId: i.templateId}), b = recipeBlueprint(pick.templateId, pick.layout, pick.view);
    assert.deepEqual(createBlueprint(i.templateId), a, i.id + ' default is repeatable');
    assert.deepEqual(recipeBlueprint(pick.templateId, pick.layout, pick.view), b, i.id + ' recipe is repeatable');
    assert.equal(compile(a).html, compile(createBlueprint(i.templateId)).html, i.id + ' default html');
    assert.equal(compile(b).html, compile(recipeBlueprint(pick.templateId, pick.layout, pick.view)).html, i.id + ' recipe html');
    assert.deepEqual(contentDiff(i.templateId, a).added, [], i.id + ' default adds no text');
    assert.deepEqual(contentDiff(i.templateId, b).added, [], i.id + ' recipe adds no text');
  }
});

test('arm 3 selections use catalog ids only and keep every content string', () => {
  assert.deepEqual(Object.keys(selections).sort(), inputs.map(i => i.id).sort());
  for (const i of inputs) {
    const {blueprint} = selectionToBlueprint(i.templateId, selections[i.id].selection), d = contentDiff(i.templateId, blueprint);
    assert.deepEqual([d.added, d.removed], [[], []], i.id + ' AI arm neither adds nor drops text');
    assert.equal(compile(blueprint).html, compile(selectionToBlueprint(i.templateId, selections[i.id].selection).blueprint).html, i.id + ' compile is repeatable');
  }
  const t = inputs[0].templateId;
  assert.throws(() => selectionToBlueprint(t, {css: 'color:red'}), /카탈로그 밖/, 'free-form field');
  assert.throws(() => selectionToBlueprint(t, {theme: 'not-a-theme'}), /없는 테마/);
  assert.throws(() => selectionToBlueprint(t, {palette: 'not-a-palette'}), /없는 팔레트/);
  assert.throws(() => selectionToBlueprint(t, {density: 'huge'}), /없는 density/);
  assert.throws(() => selectionToBlueprint(t, {layout: {hero: 'made-up'}}), /없는 구성 변형/);
  assert.throws(() => selectionToBlueprint(t, {layout: {rhythm: 'banded'}}), /없는 구성 변형/, 'slot the template does not have');
});

test('arm 3 log: at most 2 re-selections, each attempt has problems and a reason, final is one of the attempts', () => {
  for (const i of inputs) {
    const l = log[i.id]; assert.ok(l, i.id);
    assert.ok(l.attempts.length >= 1 && l.attempts.length <= 3, i.id + ' attempts');
    l.attempts.forEach((a, n) => {
      assert.equal(a.n, n + 1);
      assert.ok(a.selection && a.seen.includes('직접') && Array.isArray(a.problems) && a.problems.length > 0, i.id + ' attempt ' + a.n);
      assert.ok(n === 0 ? a.choiceReason : true, i.id + ' first attempt states why this choice');
      assert.ok(a.changeReason, i.id + ' attempt ' + a.n + ' states the change or the decision to stop');
    });
    assert.deepEqual(l.final.selection, l.attempts[l.final.attempt - 1].selection, i.id + ' final = chosen attempt');
    assert.deepEqual(selections[i.id].selection, l.final.selection);
    assert.ok(l.improvements.length >= 1 && Array.isArray(l.remaining), i.id + ' improvements noted');
  }
});

test('blind package: A/B/C is a permutation of the three arms per input, the evaluator folder carries no arm hints', () => {
  const nums = Object.keys(key.labels);
  assert.equal(nums.length, inputs.length);
  for (const [n, v] of Object.entries(key.labels)) assert.deepEqual(Object.values(v.arms).sort(), [...ARMS].sort(), n);
  assert.deepEqual(Object.values(key.labels).map(v => v.inputId), inputs.map(i => i.id));
  const files = readdirSync(resolve(base, 'blind')).sort();
  assert.ok(!files.includes('key.json') && existsSync(resolve(base, 'key.json')));
  assert.deepEqual(files.filter(f => f !== 'index.html'), nums.flatMap(n => 'ABC'.split('').flatMap(l => [320, 390, 768, 1440].map(w => `${n}_${l}_${w}.jpg`))).sort());
  const html = readFileSync(resolve(base, 'blind/index.html'), 'utf8');
  assert.ok(html.includes('<meta name="viewport"'));
  for (const hint of ['default', 'recipe', '레시피', '기본 자동', 'selectRecipe', 'key.json', 'AI 선택', 'devtool-landing']) assert.ok(!html.includes(hint), 'index.html hint: ' + hint);
  assert.ok(Object.keys(templates).length > 0);
});
