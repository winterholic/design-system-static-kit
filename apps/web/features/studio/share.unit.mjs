import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {decodeShare, encodeShare, MAX_TOKEN, shareHash, shareToken} from './share.ts';

const payload = (doc = {name: '문서', tree: {type: 'page', children: []}}) => ({v: 1, doc, origin: {template: 'saas-landing', layout: {hero: 'split'}, themeVariant: null, palette: null}, picked: {radius: 'round'}, modified: true});

test('작업을 주소 토큰으로 압축했다가 같은 값으로 풀어낸다', async () => {
  const p = payload();
  const enc = await encodeShare(p);
  assert.equal(enc.ok, true);
  assert.match(enc.token, /^z\.[A-Za-z0-9_-]+$/);
  const dec = await decodeShare(enc.token);
  assert.deepEqual(dec, {ok: true, payload: p});
});

test('주소 해시에서 d 값만 꺼내고 다른 인자는 무시한다', () => {
  assert.equal(shareToken('#d=z.abc'), 'z.abc');
  assert.equal(shareToken('#x=1&d=j.abc'), 'j.abc');
  assert.equal(shareToken(''), null);
  assert.equal(shareToken('#catalog'), null);
  assert.equal(shareHash('z.abc'), '#d=z.abc');
  assert.equal(shareHash(null), '');
});

test('손상되거나 알 수 없는 토큰은 이유와 함께 거부한다', async () => {
  for (const bad of ['', 'zz', 'z.', 'q.abc', 'z.!!!', 'z.AAAA', 'j.' + Buffer.from('not json').toString('base64url'), 'j.' + Buffer.from(JSON.stringify({v: 2, doc: {}})).toString('base64url'), 'j.' + Buffer.from(JSON.stringify({v: 1})).toString('base64url')]) {
    const dec = await decodeShare(bad);
    assert.equal(dec.ok, false, bad);
    assert.ok(dec.reason.length > 5, bad);
  }
});

test('너무 큰 문서는 주소에 담지 않고 이유를 알린다', async () => {
  // 압축이 안 되는 난수 문자열로 상한을 넘긴다.
  const noise = randomBytes(90_000).toString('base64');
  const enc = await encodeShare(payload({name: 'big', note: noise, tree: {type: 'page', children: []}}));
  assert.equal(enc.ok, false);
  assert.match(enc.reason, /JSON 내보내기/);
  const huge = await decodeShare('j.' + 'A'.repeat(MAX_TOKEN + 1));
  assert.equal(huge.ok, false);
});

test('압축 해제 결과가 상한을 넘으면 거부한다(작은 토큰이 크게 풀리는 경우)', async () => {
  const bomb = Buffer.from(await new Response(new Blob(['a'.repeat(3_000_000)]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()).toString('base64url');
  assert.ok(bomb.length < MAX_TOKEN);
  const dec = await decodeShare('z.' + bomb);
  assert.equal(dec.ok, false);
  assert.match(dec.reason, /너무 큽니다/);
});
