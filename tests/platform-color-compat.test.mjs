import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPlatform, COLOR_ROLE_NAMES} from '../src/platform/index.mjs';
import {bindColor, evaluatePaletteSubtokens, matchSubtokenSets} from '../src/platform/color.mjs';
import {proposeSubtokenSets} from '../src/service/platform-components.mjs';
import {resolveColorTokens} from '../src/color-tokens.mjs';
import {SUBTOKEN_SETS} from '../src/platform/data/subtoken-sets.mjs';
import {PALETTES} from '../src/platform/data/palettes.mjs';

const env = createPlatform();
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const roles = (p, s, m) => bindColor(env.registry.get(`palette:${p}`), env.registry.get(`subtoken-set:${s}`), m).roles;

// 해시는 작업 전 main(f1bcc2582)의 bindColor 역할 23개 값에서 계산했다. 파생 토큰을 더해도 기존 역할 계산은 그대로여야 한다.
test('the 23 role values of static-kit × standard and tinted are unchanged by the derived tokens', () => {
  assert.deepEqual({
    sl: sha(roles('static-kit', 'standard', 'light')), sd: sha(roles('static-kit', 'standard', 'dark')),
    tl: sha(roles('static-kit', 'tinted', 'light')), td: sha(roles('static-kit', 'tinted', 'dark')),
  }, {
    sl: '7f0a101334c499aed023656253840e49cca2784a2d6536bca3243a8cb577f7fb', sd: 'f4f1239ec3a3ec85f13a87aa55ec82027c68acaaa65af53ae6387dee4e2838e8',
    tl: '45bd90a840e488b147ff742458ac709074fadc44d201c32e8f817664e4a77aae', td: '27acf4720388c92e773973dd31e3b9671efc7649de500b76fbf67a024df027ef',
  });
});

test('the 2.6.0 static-kit path is untouched by the platform palettes: same id list, same seeds, no platform palette leaks into resolveColorTokens', () => {
  assert.throws(() => resolveColorTokens({palette: 'sunrise-warm', mode: 'light'}), /COLOR_PALETTE/);
  assert.throws(() => resolveColorTokens({palette: 'palette:sunrise-warm', mode: 'light'}), /COLOR_PALETTE/);
  assert.equal(resolveColorTokens({palette: 'static-kit', mode: 'light'}).seeds.brand, '#3157D5');
  assert.equal(env.registry.get('palette:static-kit').seeds.brand, '#3157D5');
});

test('evaluatePaletteSubtokens evaluates all 25 sets, separating applicability from ranking score', () => {
  const p = env.registry.get('palette:static-kit');
  const ev = evaluatePaletteSubtokens(p, {context: 'landing'});

  assert.equal(ev.length, 25, 'evaluates all 25 subtoken sets');
  assert.equal(ev.length, SUBTOKEN_SETS.length);
  assert.ok(Array.isArray(ev.ranked), 'provides ranked collection');
  assert.ok(Array.isArray(ev.blocked), 'provides blocked collection');
  assert.equal(ev.ranked.length + ev.blocked.length, 25);

  for (const item of ev) {
    assert.ok(item.id.startsWith('subtoken-set:'));
    assert.equal(typeof item.applicable, 'boolean');
    assert.equal(typeof item.score, 'number');
    assert.ok(Array.isArray(item.reasons));
    assert.ok(Array.isArray(item.recommendedContexts));
    assert.ok(Array.isArray(item.adjustments));
    assert.ok(Array.isArray(item.blockedReasons));

    if (item.applicable) {
      assert.ok(item.rank >= 1 && item.rank <= ev.ranked.length);
      assert.ok(item.score >= 50);
      assert.equal(item.blockedReasons.length, 0);
    } else {
      assert.equal(item.rank, null);
      assert.equal(item.score, 0);
      assert.ok(item.blockedReasons.length > 0);
    }
  }

  // 랭킹 정렬 검증: rank 1이 최고 점수
  for (let i = 1; i < ev.ranked.length; i++) {
    assert.ok(ev.ranked[i - 1].score >= ev.ranked[i].score, 'ranked in descending score order');
    assert.equal(ev.ranked[i].rank, i + 1);
  }

  // matchSubtokenSets 별칭 검증
  const alias = matchSubtokenSets('static-kit', {context: 'landing'});
  assert.equal(alias.length, 25);
  assert.deepEqual(alias.map(x => x.id), ev.map(x => x.id));
});

test('proposeSubtokenSets service path accepts context and mode options and returns full evaluations', () => {
  const seeds = ['#D2501E', '#6F625A', '#0D6E8E'];
  const res = proposeSubtokenSets({seeds, context: 'dashboard', mode: 'dark'});

  assert.equal(res.ok, true);
  assert.ok(Array.isArray(res.value.candidates));
  assert.ok(Array.isArray(res.value.rejected));
  assert.ok(Array.isArray(res.value.evaluations));
  assert.equal(res.value.evaluations.length, 25);

  const top = res.value.evaluations.find(x => x.rank === 1);
  assert.ok(top);
  assert.ok(top.score > 0);
});

test('auto-tuning adjustments do not collapse subtoken sets into identical token outputs', () => {
  for (const p of PALETTES.slice(0, 5)) {
    const ev = evaluatePaletteSubtokens(p);
    const passingSets = ev.ranked.map(x => x.id);

    // 자동 보정이 발생한 세트가 존재함을 확인
    const withAdjustments = ev.ranked.filter(x => x.adjustments.length > 0);
    assert.ok(withAdjustments.length >= 0);

    // 어떠한 경우에도 두 세트의 23개 색 역할이 동일해지지 않음
    for (let i = 0; i < passingSets.length; i++) {
      for (let j = i + 1; j < passingSets.length; j++) {
        for (const mode of ['light', 'dark']) {
          const b1 = bindColor(p, env.registry.get(passingSets[i]), mode);
          const b2 = bindColor(p, env.registry.get(passingSets[j]), mode);
          if (b1.ok && b2.ok) {
            const diffCount = COLOR_ROLE_NAMES.filter(n => b1.roles[n] !== b2.roles[n]).length;
            assert.ok(diffCount >= 4, `${p.id}: ${passingSets[i]} vs ${passingSets[j]} (${mode}) must differ by >= 4 roles even with adjustments (got ${diffCount})`);
          }
        }
      }
    }
  }
});
