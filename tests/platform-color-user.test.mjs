import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeSubtokenSets, assignSeeds, bindColor} from '../src/platform/color.mjs';
import {SUBTOKEN_SETS} from '../src/platform/data/subtoken-sets.mjs';
import {createPlatform} from '../src/platform/index.mjs';
import {colorContrast} from '../src/color-tokens.mjs';

const ids = xs => xs.map(x => x.set);

test('user seeds (3 to 6 hex) go through the same binding path and come back as candidates and rejections with reasons', () => {
  const r = proposeSubtokenSets(['#D2501E', '#6F625A', '#0D6E8E']);
  assert.equal(r.ok, true);
  assert.deepEqual([...ids(r.candidates), ...ids(r.rejected)].sort(), SUBTOKEN_SETS.map(s => s.id).sort(), 'every set is either a candidate or rejected');
  for (const c of r.candidates) {
    const live = bindColor(r.palette, SUBTOKEN_SETS.find(s => s.id === c.set), 'light');
    assert.deepEqual(c.modes.light.vars, live.vars, 'the candidate carries the same render tokens as bindColor');
    assert.ok(c.margin >= 1 && c.margin < 20);
    assert.deepEqual(Object.keys(c.modes), ['light', 'dark']);
  }
  const six = proposeSubtokenSets(['#0D6E8E', '#8A8F99', '#E8A100', '#2E8B57', '#C0392B', '#3B6FD6']);
  assert.ok(six.rejected.length >= 3, 'a light neutral seed cannot carry 7:1 text in dark mode for several sets');
  for (const x of six.rejected) for (const reason of x.reasons) { assert.match(reason.code, /^P_COLOR_/); assert.ok(reason.message.includes(x.set) && ['light', 'dark'].includes(reason.mode)); }
  assert.ok(six.rejected.some(x => /동시에 맞출 수 없습니다/.test(x.reasons[0].message)), 'the reason names the role and the backgrounds');
  assert.ok(six.candidates.length >= 1);
});

test('seed assignment is deterministic: lowest chroma becomes neutral, order gives brand then accent, status seeds go to the nearest hue and the rest is derived or ignored', () => {
  const a = assignSeeds(['#d2501e', '#6f625a', '#0d6e8e', '#2f9e44', '#c92a2a']);
  assert.equal(a.ok, true);
  const by = Object.fromEntries(a.assignments.map(x => [x.slot, x]));
  assert.deepEqual([by.brand.seed, by.neutral.seed, by.accent.seed, by.success.seed, by.danger.seed], ['#D2501E', '#6F625A', '#0D6E8E', '#2F9E44', '#C92A2A'], 'hex is normalized to upper case');
  assert.deepEqual([by.warning.source, by.info.source], ['derived', 'derived']);
  assert.deepEqual(a.assignments.map(x => x.slot), ['brand', 'neutral', 'accent', 'success', 'warning', 'danger', 'info']);
  assert.deepEqual(assignSeeds(['#d2501e', '#6f625a', '#0d6e8e', '#2f9e44', '#c92a2a']), a);
  const off = assignSeeds(['#D2501E', '#6F625A', '#0D6E8E', '#8E5BC8']);
  assert.deepEqual(off.ignored, ['#8E5BC8'], 'a violet seed is 75° from the nearest status hue: reported, not forced into a slot');
  const noGray = assignSeeds(['#D2501E', '#0D6E8E', '#7A3FD6']);
  assert.equal(noGray.assignments.find(x => x.slot === 'neutral').source, 'derived', 'all seeds are colorful: the neutral is derived from the brand hue');
  assert.ok(colorContrast(noGray.seeds.neutral, '#FFFFFF') > 3);
  const two = assignSeeds(['#D2501E', '#6F625A', '#B0B0B0']);
  assert.equal(two.assignments.find(x => x.slot === 'accent').source, 'user');
});

test('bad input is refused without throwing: count, format, duplicates', () => {
  for (const [input, code] of [[['#112233', '#223344'], 'P_SEEDS_COUNT'], [Array.from({length: 7}, (_, i) => `#11223${i}`), 'P_SEEDS_COUNT'], [['#112233', 'red', '#223344'], 'P_SEEDS_HEX'],
    [['#112233', '#11223', '#223344'], 'P_SEEDS_HEX'], [['#112233', '#112233', '#223344'], 'P_SEEDS_DUPLICATE'], ['#112233', 'P_SEEDS_COUNT'], [null, 'P_SEEDS_COUNT'], [[1, 2, 3], 'P_SEEDS_HEX']]) {
    const r = proposeSubtokenSets(input);
    assert.deepEqual([r.ok, r.errors[0].code, r.candidates, r.rejected], [false, code, [], []], JSON.stringify(input));
  }
});

test('extreme user seeds are rejected with reasons instead of producing unreadable tokens', () => {
  const nearBlack = proposeSubtokenSets(['#101010', '#181818', '#202020']);
  assert.ok(nearBlack.rejected.length >= 5, `near-black seeds: ${nearBlack.candidates.length} candidates`);
  assert.ok(nearBlack.rejected.every(x => x.reasons.length >= 1 && x.reasons[0].message.length > 20));
  const pale = proposeSubtokenSets(['#F7F0B0', '#F4F4F4', '#E9F5C0']);
  assert.equal(pale.candidates.length, 0);
  assert.ok(pale.rejected.length === SUBTOKEN_SETS.length);
  // 후보로 남은 쌍은 모두 대비 게이트를 통과했다: 보고서의 모든 항목이 하한 이상이다.
  for (const c of proposeSubtokenSets(['#D2501E', '#6F625A', '#0D6E8E']).candidates) for (const mode of ['light', 'dark']) {
    assert.ok(bindColor(proposeSubtokenSets(['#D2501E', '#6F625A', '#0D6E8E']).palette, SUBTOKEN_SETS.find(s => s.id === c.set), mode).report.every(x => x.ratio >= x.minimum));
  }
});

test('nothing is stored or exported: the registry is untouched, the palette record is not registrable, and the module has no write path', () => {
  const before = createPlatform().registry.list('palette').length;
  const r = proposeSubtokenSets(['#D2501E', '#6F625A', '#0D6E8E']);
  assert.equal(createPlatform().registry.list('palette').length, before);
  assert.equal(r.palette.id, 'palette:user-seeds');
  assert.ok(!('source' in r.palette), 'no license is claimed for user-provided colors');
  assert.throws(() => { r.palette.seeds.brand = '#000000'; }, TypeError, 'the returned palette is frozen at the top level');
  const src = readFileSync(new URL('../src/platform/color.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /node:fs|writeFile|fetch\(|localStorage|process\.env/, 'color.mjs has no filesystem, network or storage access');
});
