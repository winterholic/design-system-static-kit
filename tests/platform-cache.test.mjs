import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {CONTRACT_VERSION, PLATFORM_CONTRACT_VERSION} from '../src/service/index.mjs';
import {computePreviewCacheKey, canonicalize, LruCache} from '../apps/web/lib/api/cache.mjs';
import {CATALOG_VERSION, ENGINE_VERSION, previewKeyOf, platformMaterialIds} from '../apps/web/lib/api/preview-keys.mjs';

const base = {engineVersion: '0.7.0/1.3.0', catalogVersion: '2.4.0', materialIds: ['palette:b@1', 'palette:a@2'], request: {z: 1, a: {y: 'x', b: [3, 1]}}, mode: 'light', viewportWidth: 1280};

test('canonicalize 는 키를 재귀 정렬하고 문자열은 trim 하지 않는다(CONTRACTS §5.2)', () => {
  assert.equal(canonicalize({z: ' bar ', a: 1, nested: {b: 2, a: ' foo '}}), '{"a":1,"nested":{"a":" foo ","b":2},"z":" bar "}');
  assert.equal(canonicalize({a: 1, skip: undefined}), '{"a":1}');
  assert.equal(canonicalize({list: [{b: 1, a: 2}]}), '{"list":[{"a":2,"b":1}]}', '배열 순서는 보존하고 안의 객체 키만 정렬한다');
  assert.notEqual(canonicalize({content: 'a '}), canonicalize({content: 'a'}), '콘텐츠 공백이 다르면 다른 입력이다');
});

test('캐시 키는 §5.2 의 식을 그대로 따른다', () => {
  // 문서의 식을 이 테스트 안에서 독립적으로 다시 쓴 값과 비교한다.
  const raw = '0.7.0/1.3.0:2.4.0:palette:a@2,palette:b@1:{"a":{"b":[3,1],"y":"x"},"z":1}:light:1280';
  assert.equal(computePreviewCacheKey(base), createHash('sha256').update(raw).digest('hex').slice(0, 32));
  const noViewport = {...base, viewportWidth: undefined};
  assert.equal(computePreviewCacheKey(noViewport), createHash('sha256').update(raw.replace(/1280$/, 'default')).digest('hex').slice(0, 32));
});

test('키는 버전·재료·요청·모드·폭이 하나라도 다르면 달라지고, 객체 키 순서와 재료 나열 순서에는 영향받지 않는다', () => {
  const key = computePreviewCacheKey(base);
  assert.match(key, /^[0-9a-f]{32}$/);
  assert.equal(computePreviewCacheKey({...base, request: {a: {b: [3, 1], y: 'x'}, z: 1}, materialIds: ['palette:a@2', 'palette:b@1']}), key);
  for (const change of [
    {engineVersion: '0.7.1/1.3.0'}, {engineVersion: '0.7.0/1.3.1'}, {catalogVersion: '2.6.0'}, {materialIds: ['palette:a@3', 'palette:b@1']},
    {request: {...base.request, z: 2}}, {mode: 'dark'}, {viewportWidth: 390}, {viewportWidth: null},
  ]) assert.notEqual(computePreviewCacheKey({...base, ...change}), key, JSON.stringify(change));
  assert.notEqual(computePreviewCacheKey({...base, request: {content: 'a '}}), computePreviewCacheKey({...base, request: {content: 'a'}}));
});

test('버전이 없으면 키를 만들지 않는다(예전 코드의 하드코딩 기본값 2.0.0/2.6.0 으로 조용히 만들지 않는다)', () => {
  assert.throws(() => computePreviewCacheKey({request: {}}), /engineVersion/);
  assert.throws(() => computePreviewCacheKey({engineVersion: 'x'}), /catalogVersion/);
});

test('엔진 버전은 코드의 상수에서 온다: PLATFORM_CONTRACT_VERSION/CONTRACT_VERSION', () => {
  assert.equal(ENGINE_VERSION, `${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}`);
  const request = {purpose: 'saas-landing', palette: 'palette:ocean-cool', content: {title: 'palette:fake'}};
  const key = previewKeyOf({kind: 'assemble', request, width: null});
  assert.equal(key, computePreviewCacheKey({engineVersion: ENGINE_VERSION, catalogVersion: CATALOG_VERSION, materialIds: platformMaterialIds(request), request: {kind: 'assemble', request}, mode: 'light', viewportWidth: null}));
  // 재료 id 는 요청이 고른 것만이다. 사용자 콘텐츠 안의 문자열은 재료가 아니다.
  assert.deepEqual(platformMaterialIds(request).map(s => s.split('@')[0]), ['palette:ocean-cool']);
  assert.match(platformMaterialIds(request)[0], /^palette:ocean-cool@\d+\.\d+\.\d+$/, '재료 버전이 id@version 으로 들어간다');
});

test('LruCache: 개수 상한, 바이트 상한, 최근 사용 보존, 상한보다 큰 항목은 담지 않는다', () => {
  const cache = new LruCache(3);
  cache.set('a', 1); cache.set('b', 2); cache.set('c', 3);
  assert.equal(cache.get('a'), 1); // b 가 가장 오래됐다
  cache.set('d', 4);
  assert.deepEqual([cache.has('a'), cache.has('b'), cache.has('c'), cache.has('d')], [true, false, true, true]);
  assert.equal(cache.size, 3);

  const bytes = new LruCache(100, {maxBytes: 100, sizeOf: v => v.length});
  bytes.set('x', 'a'.repeat(60)); bytes.set('y', 'b'.repeat(30));
  bytes.set('z', 'c'.repeat(30)); // 합계 120 > 100: 가장 오래된 x 가 나간다
  assert.deepEqual([bytes.has('x'), bytes.has('y'), bytes.has('z')], [false, true, true]);
  assert.equal(bytes.bytes, 60);
  bytes.set('huge', 'h'.repeat(101));
  assert.equal(bytes.has('huge'), false, '상한보다 큰 항목은 캐시하지 않는다');
  assert.equal(bytes.has('y'), true, '큰 항목 하나가 기존 항목을 밀어내지 않는다');
  bytes.set('y', 'b'.repeat(10)); // 같은 키 갱신은 바이트를 다시 센다
  assert.equal(bytes.bytes, 40);
  bytes.delete('y'); assert.equal(bytes.bytes, 30);
});

// 서버 프로세스 안에 상한 없는 Map 캐시를 두지 않는다(REQUEST §3.3). 파일 맨 앞 줄에서 빈 Map 으로 만든 것은 모듈 수명 동안 쌓이는 캐시다.
// features/studio 는 브라우저에서 도는 코드(카탈로그 항목 수만큼만 차는 조회 메모)라 서버 캐시가 아니므로 제외한다.
const web = resolve(import.meta.dirname, '../apps/web');
const walk = dir => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  if (['node_modules', '.next', 'public', 'e2e', 'test-results'].includes(f)) return [];
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const SERVER_FILES = walk(web).filter(f => /\.(?:mjs|ts|tsx)$/.test(f) && !/\.(?:unit|test|d)\.(?:mjs|ts)$|\.d\.mts$/.test(f) && !f.includes('/features/studio/'));
// 상한이 따로 있는 것만 예외: ratelimit(RATE_MAX_CLIENTS 초과분을 지운다)
const BOUNDED = new Set(['lib/api/ratelimit.mjs']);

test('apps/web 서버 코드에 모듈 수준의 무제한 Map 이 없다', () => {
  const offenders = SERVER_FILES.filter(f => !BOUNDED.has(relative(web, f)))
    .flatMap(f => readFileSync(f, 'utf8').split('\n').map((line, i) => ({f, i, line})).filter(({line}) => /^(?:export )?(?:const|let) \w+(?:: [^=]+)? = new (?:Map|WeakMap|Set)(?:<[^>]*>)?\(\)/.test(line)).map(({f, i}) => `${relative(web, f)}:${i + 1}`));
  assert.deepEqual(offenders, []);
});

test('예외로 둔 ratelimit 은 실제로 상한을 두고 있다', () => {
  const src = readFileSync(join(web, 'lib/api/ratelimit.mjs'), 'utf8');
  assert.match(src, /while \(clients\.size > RATE_MAX_CLIENTS\)/);
});
