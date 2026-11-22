import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlatform} from '../src/platform/index.mjs';
import {resolveMember} from '../src/platform/family.mjs';
import {LEGACY_VARIANT_MAP} from '../src/platform/families/legacy-map.mjs';
import {checkPurposeCombination, getPurposeFamily} from '../src/platform/families/index.mjs';
import {nodeSpecs} from '../src/catalog.mjs';

const env = createPlatform();
const families = env.registry.list('family');

test('the legacy variant table covers every value of the legacy card, table, tabs and notice nodes and the chrome shell axis', () => {
  const enumOf = (node, field) => nodeSpecs[node].fields[field].values ?? nodeSpecs[node].fields[field].enum;
  for (const [node, field] of [['card', 'variant'], ['table', 'variant'], ['tabs', 'variant'], ['notice', 'variant'], ['notice', 'tone']]) {
    const values = enumOf(node, field);
    assert.ok(Array.isArray(values) && values.length, `${node}.${field} enum is readable`);
    assert.deepEqual(LEGACY_VARIANT_MAP.filter(r => r.node === node && r.field === field).map(r => r.value).sort(), [...values].sort(), `${node}.${field}`);
  }
  assert.equal(LEGACY_VARIANT_MAP.filter(r => r.node === 'chrome-nav').length, 10, 'all ten shell values appear');
});

test('every mapped row is a real, accepted combination; rows without a target say why', () => {
  for (const r of LEGACY_VARIANT_MAP) {
    assert.ok(r.note && r.note.length >= 4, `${r.node}.${r.value} has a note`);
    if (r.to === null) continue;
    if (r.to.base) {
      const results = families.map(f => resolveMember(env.registry, f, r.to.base, {props: r.to.via === 'visual' ? {} : r.to.props}));
      if (r.to.via === 'visual') {
        // 값은 시각 패밀리의 고정 축 어딘가에 있어야 한다(호출자가 정하지 않는다)
        const owners = families.filter(f => Object.entries(r.to.props).every(([a, v]) => f.members[r.to.base].preset[a] === v));
        assert.ok(owners.length > 0, `${r.node}.${r.value} → ${JSON.stringify(r.to.props)} is fixed by some visual family`);
        for (const f of owners) assert.ok(resolveMember(env.registry, f, r.to.base, {props: {}}).ok);
      } else {
        // 열린 축이면 모든 시각 패밀리에서 호출자가 줄 수 있고, 계약 값이다
        const quiet = families.find(f => f.id === 'family:quiet');
        const impl = env.registry.kind('base-component').implementation(r.to.base);
        for (const [a, v] of Object.entries(r.to.props)) assert.ok(impl.contract.axes[a].includes(v), `${r.node}.${r.value}: ${a}=${v} is a contract value`);
        const ok = resolveMember(env.registry, quiet, r.to.base, {props: r.to.props});
        assert.ok(ok.ok || ok.errors.every(e => e.code === 'P_REL_CONTRACT'), `${r.node}.${r.value}: ${JSON.stringify(ok.errors)}`);
        assert.ok(results.length === families.length);
      }
    } else {
      const f = getPurposeFamily(r.to.purpose);
      assert.ok(f, r.to.purpose);
      const c = checkPurposeCombination(f, {visual: 'family:quiet', variant: r.to.variant, props: r.to.props ?? {}, content: f.example.content});
      assert.ok(c.ok, `${r.node}.${r.value} → ${r.to.purpose}: ${JSON.stringify(c.errors)}`);
    }
  }
  assert.ok(LEGACY_VARIANT_MAP.filter(r => r.to === null).length >= 3);
});

test('vocabulary differences are explicit: legacy boxed tabs map to segmented, which cannot stand vertically', () => {
  const boxed = LEGACY_VARIANT_MAP.find(r => r.node === 'tabs' && r.value === 'boxed');
  assert.equal(boxed.to.props.appearance, 'segmented');
  assert.match(boxed.note, /boxed.*segmented/);
  const striped = LEGACY_VARIANT_MAP.find(r => r.node === 'table' && r.value === 'striped');
  const dense = getPurposeFamily(striped.to.purpose);
  assert.equal(checkPurposeCombination(dense, {visual: 'family:soft', variant: striped.to.variant, props: striped.to.props, content: dense.example.content}).ok, false, 'the note about soft·editorial is true');
});
