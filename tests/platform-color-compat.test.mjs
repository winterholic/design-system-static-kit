import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createPlatform} from '../src/platform/index.mjs';
import {bindColor} from '../src/platform/color.mjs';
import {resolveColorTokens} from '../src/color-tokens.mjs';

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
