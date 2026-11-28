import test from 'node:test';
import assert from 'node:assert/strict';
import {getComponentSpec, getMaterial, compileBlueprint} from '@winterholic/design-system-static-kit/service';
import {exportComponentView} from '../../lib/api/preview-recipes.mjs';

test('Code 탭 파일은 같은 선택의 Core Blueprint 내보내기 바이트와 일치한다', () => {
  const spec = getComponentSpec({type: 'button-control', catalogVersion: '2.6.0'});
  const material = getMaterial({id: 'component:button-control'});
  assert.equal(spec.ok, true);
  assert.equal(material.ok, true);
  const view = {type: 'button-control', material: material.value, example: spec.value.example, variantIds: []};
  const selection = {appearance: 'outline', size: 'large'};
  const exported = exportComponentView(view, selection);
  assert.equal(exported.ok, true, exported.reason);
  const blueprint = JSON.parse(exported.files['blueprint.json']);
  const recompilation = compileBlueprint(blueprint, {include: ['files']});
  assert.equal(recompilation.ok, true);
  assert.deepEqual(exported.files, recompilation.value.files);
  for (const name of ['index.html', 'tokens.css', 'tokens.json', 'blueprint.json']) {
    assert.equal(exported.files[name], recompilation.value.files[name], `${name} byte equality`);
  }
});
