import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {platformSection, REPRESENTATIVE} from '../scripts/platform/platform-baseline.mjs';
import {createFixturePlatform} from './platform-pipeline-fixtures.mjs';
import {PURPOSE_IDS, bindColor, bindType, axisIds, materialAxisIds} from '../src/platform/index.mjs';
import {PATTERNS} from '../src/profiles/data.mjs';
import {templates, pageTypes, axes} from '../src/catalog/index.mjs';

const saved = JSON.parse(readFileSync(new URL('../docs/evidence/platform/baseline.json', import.meta.url), 'utf8'));

test('the platform section counts what really assembles, not what is registered', () => {
  const env = createFixturePlatform();
  const r = platformSection({env, only: ['dashboard-grid']});
  const p = r.assemblable.perPattern['dashboard-grid'];
  assert.ok(p.assemblable > 0 && p.verified > 0);
  assert.ok(r.verified.verified <= r.verified.attempted);
  assert.ok(r.verified.verified > 0);
  assert.ok(r.verified.distinctOutputs <= r.verified.verified);
  assert.deepEqual(Object.keys(r.verified.failures).filter(k => k.startsWith('QUALITY')), [], 'everything that assembled also passed the quality checks');
  // a palette no set can render and a Hangul-limit type system never reach the counts
  assert.equal(r.registered.palette, env.registry.list('palette').length);
  assert.ok(r.distinct.colorTokenSets.light < r.registered.palette * r.registered.subtokenSet, 'blocked pairs are not counted');
  assert.ok(r.colorGateFailures.P_COLOR_CONTRAST >= 1 || Object.keys(r.colorGateFailures).length >= 1, 'the failing pair is reported by code');
  // the section is a pure function of the registry: same registry, same numbers
  assert.equal(JSON.stringify(platformSection({env: createFixturePlatform(), only: ['dashboard-grid']})), JSON.stringify(r));
  // a pattern with no purpose-matching material counts zero instead of a product of registered values
  const empty = platformSection({env, only: ['mobile-nope']});
  assert.equal(empty.assemblable.assemblable, 0);
});

/** 기준선과 독립으로 센다: 조합을 하나씩 평가한다(관계 그래프 평가 + 색 결합 + 서체 한도). */
function brute(env, patternId) {
  const p = PATTERNS[patternId], tpl = templates[p.template], pt = pageTypes[tpl.pageType], ctx = tpl.pageType, reg = env.registry;
  const shells = p.shells.filter(x => pt.shells.includes(x)), widths = p.widths.filter(x => !pt.widths || pt.widths.includes(x));
  const open = m => m.contexts.includes('any') || m.contexts.includes(ctx);
  const base = 'base-component:card-surface';
  let n = 0;
  const useFamily = patternId === 'dashboard-grid';
  const fams = useFamily ? reg.list('family').filter(f => open(f) && f.members[base]) : [null];
  for (const mode of ['light', 'dark']) for (const pal of reg.list('palette')) for (const set of reg.list('subtoken-set').filter(open)) {
    if (!bindColor(pal, set, mode).ok) continue;
    for (const ts of reg.list('type-system').filter(open)) {
      if (!bindType(ts).ok) continue;
      for (const f of fams) {
        if (!env.graph.evaluate([pal.id, set.id, ts.id, ...(f ? [f.id, base] : [])], {context: ctx, mode}).ok) continue;
        for (const shell of shells) for (const width of widths) for (const density of axes.density) {
          const ids = [...axisIds({shell, width, density, mode}), ...materialAxisIds(ts), ...(f ? materialAxisIds(f) : [])];
          if (env.graph.evaluate(ids, {context: ctx, mode, density}).ok) n++;
        }
      }
    }
  }
  return n;
}

test('the counted assemblable combinations equal a one-by-one evaluation of every combination', () => {
  const env = createFixturePlatform();
  const counted = platformSection({env, only: ['dashboard-grid']}).assemblable.perPattern['dashboard-grid'].assemblable;
  assert.equal(counted, brute(env, 'dashboard-grid'));
  assert.ok(counted > 0);
});

test('representative content exists for the patterns of every required purpose', () => {
  const purposes = new Set(Object.values(REPRESENTATIVE).map(r => r.purpose));
  assert.deepEqual([...purposes].sort(), [...PURPOSE_IDS].sort());
  for (const [pattern, r] of Object.entries(REPRESENTATIVE)) assert.ok(PATTERNS[pattern], `${pattern} is a registered pattern (${r.purpose})`);
});

test('the committed baseline carries the platform section, and it beats the legacy assembly path on color token sets and face pairs', () => {
  const pf = saved.platform, legacy = saved.combinations;
  assert.equal(typeof pf.contractVersion, 'string');
  for (const k of ['assemblable', 'verified', 'distinct']) assert.ok(pf[k], k);
  assert.ok(pf.assemblable.assemblable > 0 && pf.verified.verified > 0);
  assert.ok(pf.assemblable.assemblable <= pf.assemblable.attempted);
  assert.ok(pf.verified.verified <= pf.verified.attempted);
  assert.equal(legacy.distinctColorTokenSets.light, 1, 'the legacy path has one light token set');
  assert.ok(pf.distinct.colorTokenSets.light > legacy.distinctColorTokenSets.light);
  assert.ok(pf.distinct.colorTokenSets.dark > legacy.distinctColorTokenSets.dark);
  assert.ok(pf.distinct.facePairs > legacy.distinctEffectiveFacePairs, `${pf.distinct.facePairs} face pairs vs ${legacy.distinctEffectiveFacePairs}`);
  assert.ok(pf.distinct.families >= 1);
  // verified outputs are a subset of the pairs the color gate passed (the page pipeline also rejects pairs whose derived tokens miss the floor)
  assert.ok(pf.distinct.verifiedColorTokenSets.light <= pf.distinct.colorTokenSets.light && pf.distinct.verifiedColorTokenSets.light > legacy.distinctColorTokenSets.light);
  assert.ok(pf.distinct.verifiedColorTokenSets.dark <= pf.distinct.colorTokenSets.dark && pf.distinct.verifiedColorTokenSets.dark > legacy.distinctColorTokenSets.dark);
  assert.ok(pf.distinct.verifiedFacePairs <= pf.distinct.facePairs && pf.distinct.verifiedFamilies <= pf.distinct.families);
  assert.ok(Object.values(pf.assemblable.perPattern).every(x => x.verified <= x.assemblable));
});
