// REST v1 계약 시험: 서비스의 얇은 어댑터인지, 오류·크기·캐시·호출 제한·OpenAPI 요구사항을 지키는지.
// 서버 없이 같은 실행기(runOperation)를 부른다. 실제 서버(next start)에서의 같은 계약은 apps/web/e2e/api.spec.mjs 가 본다.
import {test, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {createBlueprint} from '../src/catalog.mjs';
import {listCatalog, getSchema, getComponentSpec, validateBlueprint, compileBlueprint, explainDecisions, CATALOG_KINDS} from '../src/service/index.mjs';
import {OPERATIONS, rest, root, resetRateLimit} from './channel-support.mjs';
import {buildOpenApi} from '../apps/web/lib/api/openapi.mjs';
import {runOperation} from '../apps/web/lib/api/rest.mjs';
import {MAX_BODY_BYTES, RATE_BUDGET, COST} from '../apps/web/lib/api/limits.mjs';

beforeEach(() => resetRateLimit());
const json = x => JSON.parse(JSON.stringify(x));
const bp = () => createBlueprint('dashboard-overview');

test('GET 조회는 서비스 함수의 결과를 그대로 낸다 (catalog·themes·components·components/{id}·schema)', async () => {
  const cat = await rest('GET', '/api/v1/catalog?kind=templates&filter[pageType]=landing&fields=id,theme&limit=3');
  assert.equal(cat.status, 200);
  assert.deepEqual(cat.json, json(listCatalog({kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 3})));
  const next = await rest('GET', `/api/v1/catalog?kind=templates&filter.pageType=landing&fields=id,theme&limit=3&cursor=${cat.json.value.nextCursor}`);
  assert.deepEqual(next.json, json(listCatalog({kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 3, cursor: cat.json.value.nextCursor})));
  assert.notDeepEqual(next.json.value.items, cat.json.value.items);
  assert.deepEqual((await rest('GET', '/api/v1/themes?limit=2&query=work')).json, json(listCatalog({kind: 'themes', limit: 2, query: 'work'})));
  assert.deepEqual((await rest('GET', '/api/v1/components?filter[group]=content')).json, json(listCatalog({kind: 'components', filter: {group: 'content'}})));
  assert.deepEqual((await rest('GET', '/api/v1/components/hero?fields=required,children')).json, json(getComponentSpec({type: 'hero', fields: ['required', 'children']})));
  assert.deepEqual((await rest('GET', '/api/v1/schema?target=component&type=hero')).json, json(getSchema({target: 'component', type: 'hero'})));
  const part = await rest('GET', '/api/v1/schema?target=blueprint&fields=tree');
  assert.deepEqual(part.json, json(getSchema({target: 'blueprint', fields: ['tree']})));
  const full = JSON.stringify(getSchema({target: 'blueprint'}));
  assert.ok(part.text.length < full.length * 0.9, `부분 조회가 전체보다 작아야 한다: ${part.text.length} / ${full.length}`);
  assert.ok((await rest('GET', '/api/v1/schema?target=component&type=hero')).text.length < 6_000);
  for (const kind of CATALOG_KINDS.filter(k => k !== 'layoutSlots')) assert.equal((await rest('GET', `/api/v1/catalog?kind=${kind}&limit=1`)).status, 200, kind);
});

test('POST 는 서비스 함수의 결과를 그대로 낸다 (validate·compile·explain)', async () => {
  const b = bp();
  const v = await rest('POST', '/api/v1/validate', {body: {blueprint: b}});
  assert.equal(v.status, 200); assert.deepEqual(v.json, json(validateBlueprint(b)));
  const c = await rest('POST', '/api/v1/compile', {body: {blueprint: b, include: ['html', 'css'], html: 'full'}});
  const direct = compileBlueprint(b, {include: ['html', 'css']});
  assert.equal(c.status, 200); assert.equal(c.json.value.html, direct.value.html); assert.deepEqual(c.json.value.sizes, direct.value.sizes);
  assert.equal(c.json.catalogVersion, direct.catalogVersion); assert.equal(c.json.contractVersion, direct.contractVersion);
  const summary = await rest('POST', '/api/v1/compile', {body: {blueprint: b, include: ['html'], html: 'summary'}});
  assert.equal(summary.json.value.html, undefined); assert.ok(summary.json.value.htmlSummary);
  const e = await rest('POST', '/api/v1/explain', {body: {blueprint: b, level: 'summary'}});
  assert.deepEqual(e.json, json(explainDecisions({blueprint: b}, {level: 'summary'})));
  // manifest 로도 설명할 수 있다
  const manifest = compileBlueprint(b, {include: ['manifest']}).value.manifest;
  assert.deepEqual((await rest('POST', '/api/v1/explain', {body: {manifest}})).json, json(explainDecisions({manifest})));
});

test('모든 응답에 catalogVersion·contractVersion 이 있다 (성공·실패 모두)', async () => {
  const responses = [
    await rest('GET', '/api/v1/catalog?kind=themes&limit=1'), await rest('GET', '/api/v1/catalog?kind=zzz'), await rest('GET', '/api/v1/components/nope'),
    await rest('POST', '/api/v1/validate', {body: {blueprint: {}}}), await rest('POST', '/api/v1/validate', {raw: '{', }), await rest('POST', '/api/v1/validate', {body: {blueprint: bp()}, headers: {'content-type': 'text/plain'}}),
    await rest('GET', '/api/v1/validate'),
  ];
  for (const r of responses) {
    assert.match(r.json.catalogVersion, /^\d+\.\d+\.\d+$/, r.text); assert.match(r.json.contractVersion, /^\d+\.\d+\.\d+$/);
    if (!r.json.ok) for (const e of r.json.errors) for (const k of ['code', 'path', 'message', 'hint']) assert.ok(typeof e[k] === 'string' && e[k].length > 0, `${k} in ${r.text}`);
  }
});

test('상태 코드 매핑: 400 형식 오류, 404 없는 부품, 405 메서드, 413 크기, 415 형식, 422 규칙 위반', async () => {
  const cases = [
    [await rest('GET', '/api/v1/catalog'), 400, 'UNKNOWN_KIND'],
    [await rest('GET', '/api/v1/catalog?kind=themes&feilds=id'), 400, 'BAD_REQUEST'],
    [await rest('GET', '/api/v1/catalog?kind=themes&limit=abc'), 400, 'BAD_REQUEST'],
    [await rest('GET', '/api/v1/catalog?kind=themes&limit=999'), 400, 'BAD_REQUEST'],
    [await rest('GET', '/api/v1/themes?kind=templates'), 400, 'BAD_REQUEST'],
    [await rest('GET', '/api/v1/catalog?kind=templates&filter[theme]=nope'), 400, 'UNKNOWN_THEME'],
    [await rest('GET', '/api/v1/components/nope'), 404, 'UNKNOWN_COMPONENT'],
    [await rest('GET', '/api/v1/schema?target=zzz'), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/validate', {raw: '{nope'}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/validate', {raw: '[]'}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/validate', {body: {}}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/validate', {body: {blueprint: {}, extra: 1}}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/compile', {body: {blueprint: bp(), hash: 'x'}}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/compile', {body: {blueprint: bp(), html: 'nope'}}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/explain', {body: {}}), 400, 'BAD_REQUEST'],
    [await rest('POST', '/api/v1/validate', {body: {blueprint: bp()}, headers: {'content-type': 'text/plain'}}), 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [await rest('PUT', '/api/v1/validate', {body: {blueprint: bp()}}), 405, 'METHOD_NOT_ALLOWED'],
    [await rest('POST', '/api/v1/catalog', {body: {}}), 405, 'METHOD_NOT_ALLOWED'],
    [await rest('POST', '/api/v1/validate', {body: {blueprint: {}}}), 422, 'REQUIRED'],
    [await rest('POST', '/api/v1/compile', {body: {blueprint: {}}}), 422, 'REQUIRED'],
    [await rest('POST', '/api/v1/validate', {body: {blueprint: bp(), catalogVersion: '9.9.9'}}), 400, 'UNSUPPORTED_VERSION'],
    [await rest('POST', '/api/v1/validate', {body: {blueprint: bp(), catalogVersion: '2.3.0'}}), 422, 'CATALOG_VERSION'],
  ];
  for (const [r, status, code] of cases) { assert.equal(r.status, status, r.text.slice(0, 300)); assert.equal(r.json.errors[0].code, code, r.text.slice(0, 300)); assert.equal(r.headers.get('cache-control'), 'no-store'); }
  assert.equal((await rest('PUT', '/api/v1/validate', {body: {}})).headers.get('allow'), 'POST');
});

test('요청 크기 제한: Content-Length 와 실제 스트림 모두 413, 상한과 검증기 상한 사이는 검증기가 SIZE 로 판정한다', async () => {
  const big = '{"blueprint":{"pad":"' + 'x'.repeat(MAX_BODY_BYTES) + '"}}';
  const declared = await rest('POST', '/api/v1/validate', {raw: big});
  assert.equal(declared.status, 413); assert.equal(declared.json.errors[0].code, 'PAYLOAD_TOO_LARGE');
  // Content-Length 없이(청크) 보내도 읽는 동안 센다.
  const chunks = [new TextEncoder().encode(big.slice(0, 1000)), new TextEncoder().encode(big.slice(1000))];
  const stream = new ReadableStream({start(c) { for (const k of chunks) c.enqueue(k); c.close(); }});
  const res = await runOperation('validateBlueprint', new Request('http://t/api/v1/validate', {method: 'POST', headers: {'content-type': 'application/json', 'x-forwarded-for': '10.7.7.7'}, body: stream, duplex: 'half'}));
  assert.equal(res.status, 413);
  // 거짓 Content-Length(작게 신고)는 스트림을 세므로 걸러진다.
  const lie = await rest('POST', '/api/v1/validate', {raw: big, headers: {'content-length': '10'}});
  assert.ok([413, 400].includes(lie.status), String(lie.status));
  const mid = bp(); mid.pad = 'x'.repeat(250_000);
  const m = await rest('POST', '/api/v1/validate', {body: {blueprint: mid}});
  assert.equal(m.status, 422); assert.deepEqual(m.json.errors.map(e => [e.code, e.path]), [['SIZE', '$']]);
});

test('GET 캐시: ETag·Cache-Control, If-None-Match 로 304, 실패 응답은 캐시하지 않는다', async () => {
  const a = await rest('GET', '/api/v1/catalog?kind=themes&limit=2');
  assert.match(a.headers.get('etag'), /^"[\w-]+"$/);
  assert.match(a.headers.get('cache-control'), /public.*max-age=\d+.*s-maxage=\d+/);
  const b = await rest('GET', '/api/v1/catalog?kind=themes&limit=2', {headers: {'if-none-match': a.headers.get('etag')}});
  assert.equal(b.status, 304); assert.equal(b.text, ''); assert.equal(b.headers.get('etag'), a.headers.get('etag'));
  assert.equal((await rest('GET', '/api/v1/catalog?kind=themes&limit=2', {headers: {'if-none-match': '"other"'}})).status, 200);
  assert.notEqual((await rest('GET', '/api/v1/catalog?kind=themes&limit=3')).headers.get('etag'), a.headers.get('etag'));
  assert.equal((await rest('GET', '/api/v1/catalog?kind=zzz')).headers.get('cache-control'), 'no-store');
  assert.equal((await rest('POST', '/api/v1/validate', {body: {blueprint: bp()}})).headers.get('cache-control'), 'no-store');
  assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
});

test('호출 제한: 같은 호출자가 예산을 넘기면 429 와 Retry-After, 다른 호출자는 영향받지 않는다', async () => {
  const headers = {'x-forwarded-for': '203.0.113.9'};
  const calls = Math.ceil(RATE_BUDGET / COST.compile);
  let ok = 0;
  for (let i = 0; i < calls; i++) { const r = await rest('POST', '/api/v1/compile', {body: {blueprint: bp(), include: [], html: 'omit'}, headers}); assert.equal(r.status, 200); ok++; }
  const limited = await rest('POST', '/api/v1/compile', {body: {blueprint: bp(), include: [], html: 'omit'}, headers});
  assert.equal(limited.status, 429); assert.equal(limited.json.errors[0].code, 'RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.equal(ok, calls);
  assert.equal((await rest('POST', '/api/v1/compile', {body: {blueprint: bp(), include: [], html: 'omit'}, headers: {'x-forwarded-for': '203.0.113.10'}})).status, 200);
  assert.equal((await rest('GET', '/api/v1/catalog?kind=themes&limit=1', {headers})).status, 200, '조회는 제한하지 않는다');
});

test('내부 오류는 일반 문장만 내고 경로·스택을 싣지 않는다', async () => {
  const op = OPERATIONS.find(o => o.id === 'listThemes'), original = op.call;
  op.call = () => { throw new Error('boom at /Users/someone/secret/path/file.mjs:12:3\n    at stack'); };
  try {
    const r = await rest('GET', '/api/v1/themes');
    assert.equal(r.status, 500); assert.equal(r.json.errors[0].code, 'INTERNAL');
    assert.doesNotMatch(r.text, /\/Users|secret|file\.mjs|stack|node_modules/);
  } finally { op.call = original; }
  // 실제 응답 전체에도 서버 내부 경로 흔적이 없다.
  for (const r of [await rest('POST', '/api/v1/compile', {body: {blueprint: bp()}}), await rest('POST', '/api/v1/validate', {body: {blueprint: {}}})]) {
    assert.doesNotMatch(r.text, /\/Users\/|node_modules|\.mjs:|\n\s+at /);
  }
});

test('컴파일 실패는 내용을 고쳐 성공시키지 않는다: value 가 없고 errors 만 있다', async () => {
  const bad = bp(); bad.tree.children[1].onclick = 'x';
  const r = await rest('POST', '/api/v1/compile', {body: {blueprint: bad, include: ['html']}});
  assert.equal(r.status, 422); assert.equal(r.json.ok, false); assert.equal(r.json.value, undefined);
  assert.equal(r.json.errors[0].code, 'UNKNOWN_KEY'); assert.equal(r.json.errors[0].path, '$.tree.children[1].onclick');
  assert.equal(JSON.stringify(bad).includes('onclick'), true, '입력 객체를 바꾸지 않는다');
});

// ---------------------------------------------------------------- OpenAPI

test('OpenAPI: 코드에서 생성되고 작업 표·라우트 파일·서비스 스키마와 일치한다', () => {
  const doc = buildOpenApi();
  assert.equal(doc.openapi, '3.1.0');
  assert.deepEqual(buildOpenApi(), doc, '결정적이다');
  const documented = Object.entries(doc.paths).flatMap(([p, ops]) => Object.keys(ops).map(m => `${m.toUpperCase()} ${p}`)).sort();
  const expected = [...OPERATIONS.map(o => `${o.method} ${o.path}`), 'GET /api/v1/openapi.json'].sort();
  assert.deepEqual(documented, expected);
  // app/api/v1 아래 route.ts 한 개가 문서의 경로 한 개에 대응한다.
  const base = join(root, 'apps/web/app');
  const routes = [];
  (function walk(dir) { for (const e of readdirSync(dir)) { const f = join(dir, e); if (statSync(f).isDirectory()) walk(f); else if (e === 'route.ts' && relative(base, f).startsWith('api/v1')) routes.push('/' + relative(base, join(f, '..')).replace(/\[(\w+)\]/g, '{$1}')); } })(join(base, 'api/v1'));
  assert.deepEqual(routes.sort(), Object.keys(doc.paths).sort());
  assert.deepEqual(doc.components.schemas.Diagnostic.required, ['code', 'path', 'message', 'hint']);
  const catalogKind = doc.paths['/api/v1/catalog'].get.parameters.find(p => p.name === 'kind');
  assert.deepEqual(catalogKind.schema.enum, [...CATALOG_KINDS]);
  for (const status of ['400', '413', '415', '422', '429', '500']) assert.ok(doc.paths['/api/v1/compile'].post.responses[status], status);
  // route.ts 는 작업 id 만 알고 서비스를 직접 import 하지 않는다.
  for (const f of routes) {
    const dir = join(base, f.replace(/\{(\w+)\}/g, '[$1]'), 'route.ts');
    const src = readFileSync(dir, 'utf8');
    assert.doesNotMatch(src, /design-system-static-kit|\.\.\/\.\.\/src/, `${f} 가 서비스를 직접 부른다`);
  }
});

// ---------------------------------------------------------------- 외부 네트워크 없음

test('REST·MCP 어댑터는 외부 네트워크를 쓰지 않는다: 정적 검사와 실행 중 fetch 차단', async () => {
  const dirs = [join(root, 'apps/web/lib/api'), join(root, 'apps/web/app/api')];
  const files = [];
  (function walk(dir) { for (const e of readdirSync(dir)) { const f = join(dir, e); if (statSync(f).isDirectory()) walk(f); else files.push(f); } })(dirs[0]);
  (function walk(dir) { for (const e of readdirSync(dir)) { const f = join(dir, e); if (statSync(f).isDirectory()) walk(f); else files.push(f); } })(dirs[1]);
  assert.ok(files.length >= 15);
  for (const f of files) {
    const src = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /\bfetch\s*\(|node:(http|https|net|tls|dns|dgram)|XMLHttpRequest|WebSocket|EventSource|child_process/, relative(root, f));
    assert.doesNotMatch(src, /https?:\/\/(?!json-schema\.org)/, `${relative(root, f)} 에 URL 이 있다`);
  }
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('외부 네트워크 호출'); };
  try {
    assert.equal((await rest('GET', '/api/v1/catalog?kind=themes&limit=1')).status, 200);
    assert.equal((await rest('POST', '/api/v1/compile', {body: {blueprint: bp(), include: ['html']}})).status, 200);
  } finally { globalThis.fetch = original; }
});
