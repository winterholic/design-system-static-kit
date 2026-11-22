// MCP(Streamable HTTP) 시험: 실제 공식 SDK 클라이언트로 두 프로토콜 시대(2026-07-28 server/discover, 2025 initialize)에서
// 연결하고, 도구 목록·스키마·각 도구 호출·제한을 확인한다. 서버를 띄우지 않고 같은 핸들러를 fetch 로 부른다.
// 실제 서버(next start) 위의 같은 시험은 apps/web/e2e/mcp.spec.mjs 가 한다.
import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint} from '../src/catalog.mjs';
import {compileBlueprint, listCatalog, catalogSnapshot} from '../src/service/index.mjs';
import {mcpConnect, mcpFetch, resetRateLimit, sha256} from './channel-support.mjs';
import {TOOLS, executeTool} from '../apps/web/lib/api/mcp.mjs';
import {COST, MAX_BODY_BYTES, RATE_BUDGET, TOOL_TIMEOUT_MS} from '../apps/web/lib/api/limits.mjs';

const CORE_NAMES = ['list_design_system', 'get_design_schema', 'get_component_spec', 'validate_blueprint', 'compile_design', 'explain_design_decisions'];
// W5-b: 조립·재료·추천·호환성·편집 도구가 같은 서비스 함수를 부른다(tests/platform-service-channels.test.mjs가 서비스·REST·MCP 일치를 본다).
const NAMES = [...CORE_NAMES, 'assemble_design', 'assemble_blueprint', 'list_materials', 'get_material', 'list_platform_materials', 'get_platform_material', 'recommend_materials', 'check_compatibility', 'list_edit_ops', 'apply_edit'];
const bp = () => createBlueprint('dashboard-overview');
const call = (client, name, args) => client.callTool({name, arguments: args});

for (const era of ['modern', 'legacy']) {
  test(`[${era}] 연결하고 도구 열여섯 개(핵심 여섯 + 조립·재료·편집 열)를 입력·출력 스키마와 함께 낸다`, async () => {
    const client = await mcpConnect(era);
    try {
      assert.equal(client.getServerVersion().name, 'static-kit');
      assert.equal(Boolean(client.getDiscoverResult()), era === 'modern', '시대가 의도한 대로 협상됐다');
      assert.ok(client.getServerCapabilities().tools);
      assert.match(client.getInstructions(), /validate_blueprint/);
      const {tools} = await client.listTools();
      assert.deepEqual(tools.map(t => t.name), NAMES);
      for (const t of tools) {
        assert.match(t.name, /^[A-Za-z0-9_.-]{1,128}$/, '사양의 도구 이름 규칙');
        assert.equal(t.inputSchema.type, 'object', t.name);
        assert.equal(t.outputSchema.type, 'object', t.name);
        assert.ok(t.description.length > 40, t.name);
        assert.equal(t.annotations.readOnlyHint, true); assert.equal(t.annotations.openWorldHint, false);
        assert.ok(Object.keys(t.inputSchema.properties).length >= 1);
      }
      const required = Object.fromEntries(tools.map(t => [t.name, t.inputSchema.required ?? []]));
      assert.deepEqual(required.list_design_system, ['kind']); assert.deepEqual(required.get_component_spec, ['type']);
    } finally { await client.close(); }
  });

  test(`[${era}] 각 도구를 호출한다: 구조화된 결과가 서비스 함수와 같다`, async () => {
    const client = await mcpConnect(era);
    try {
      const list = await call(client, 'list_design_system', {kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 3});
      assert.equal(list.isError, false);
      assert.deepEqual(list.structuredContent, JSON.parse(JSON.stringify(listCatalog({kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 3}))));
      assert.deepEqual(JSON.parse(list.content[0].text), list.structuredContent, '텍스트 블록은 같은 JSON');
      const schema = await call(client, 'get_design_schema', {target: 'component', type: 'hero'});
      assert.equal(schema.isError, false); assert.ok(schema.structuredContent.value['x-runtimeRules'].length > 5);
      const spec = await call(client, 'get_component_spec', {type: 'hero', fields: ['required', 'children']});
      assert.deepEqual(spec.structuredContent.value, {type: 'hero', required: ['type', 'variant', 'title', 'body'], children: null});
      const v = await call(client, 'validate_blueprint', {blueprint: bp()});
      assert.equal(v.isError, false); assert.deepEqual(v.structuredContent.value, {valid: true});
      const c = await call(client, 'compile_design', {blueprint: bp()});
      assert.equal(c.isError, false); assert.ok(c.structuredContent.value.manifest);
      const e = await call(client, 'explain_design_decisions', {blueprint: bp(), level: 'summary'});
      assert.equal(e.isError, false); assert.ok(e.structuredContent.value.decisions.length > 0); assert.ok(e.structuredContent.value.axes.length > 0);
      const ex = await call(client, 'explain_design_decisions', {manifest: c.structuredContent.value.manifest});
      assert.deepEqual(ex.structuredContent.value.axes, e.structuredContent.value.axes);
    } finally { await client.close(); }
  });
}

test('compile_design 는 기본으로 HTML 본문 대신 요약·크기·manifest 를 낸다. 본문은 옵션으로만', async () => {
  const client = await mcpConnect();
  try {
    const direct = compileBlueprint(bp());
    const lean = await call(client, 'compile_design', {blueprint: bp()});
    const v = lean.structuredContent.value;
    assert.equal(v.html, undefined); assert.equal(v.css, undefined); assert.equal(v.tokens, undefined);
    assert.equal(v.sizes.html, direct.value.sizes.html);
    assert.deepEqual(Object.keys(v.htmlSummary).sort(), ['bytes', 'nodeCount', 'title']);
    assert.equal(v.manifest.integrity.algorithm, 'sha256');
    assert.ok(lean.content[0].text.length < direct.value.html.length / 2, `기본 응답이 HTML 본문보다 훨씬 작아야 한다: ${lean.content[0].text.length}`);
    assert.doesNotMatch(lean.content[0].text, /<!doctype|<html/i);
    const full = await call(client, 'compile_design', {blueprint: bp(), html: 'full', include: ['html']});
    assert.equal(full.structuredContent.value.html, direct.value.html);
    assert.equal(sha256(full.structuredContent.value.html), v.manifest.integrity.files['index.html'], 'manifest 해시가 본문과 맞다');
    const omit = await call(client, 'compile_design', {blueprint: bp(), html: 'omit', include: ['html']});
    assert.equal(omit.structuredContent.value.html, undefined); assert.equal(omit.structuredContent.value.htmlSummary, undefined);
    const capped = await call(client, 'compile_design', {blueprint: bp(), html: 'full', include: ['html'], maxBytes: 1000});
    assert.equal(capped.structuredContent.value.html, undefined);
    assert.equal(capped.structuredContent.warnings[0].code, 'OUTPUT_OMITTED');
  } finally { await client.close(); }
});

test('부분 조회가 토큰을 아낀다: 목록·스키마 기본 응답이 전체 카탈로그보다 훨씬 작다', async () => {
  const client = await mcpConnect();
  try {
    const snapshot = JSON.stringify(catalogSnapshot()).length;
    const themes = await call(client, 'list_design_system', {kind: 'themes', limit: 5, fields: ['id']});
    assert.ok(themes.content[0].text.length < 1000);
    const one = await call(client, 'get_design_schema', {target: 'component', type: 'hero'});
    assert.ok(one.content[0].text.length < snapshot / 50, `${one.content[0].text.length} vs 전체 ${snapshot}`);
    const spec = await call(client, 'get_component_spec', {type: 'hero', fields: ['required']});
    assert.ok(spec.content[0].text.length < 600);
  } finally { await client.close(); }
});

test('validate_blueprint 는 수정 가능한 구조화 오류를 준다: path·hint·fix 로 해당 부분만 고치면 통과한다', async () => {
  const client = await mcpConnect();
  try {
    const doc = createBlueprint('saas-landing', 'civic'); doc.elevation = 'glow'; doc.tree.children[1].onclick = 'x';
    const r = await call(client, 'validate_blueprint', {blueprint: doc});
    assert.equal(r.isError, true); assert.equal(r.structuredContent.ok, false);
    const errors = r.structuredContent.errors;
    for (const e of errors) { assert.ok(e.path.startsWith('$')); assert.ok(e.hint.length > 5); }
    const unknown = errors.find(e => e.code === 'UNKNOWN_KEY'); assert.equal(unknown.path, '$.tree.children[1].onclick');
    const ban = errors.find(e => e.fix); assert.ok(ban, 'fix 가 있는 오류가 있다'); assert.ok(Object.keys(ban.fix).length >= 1);
    // path 기반 수정: 전체 문서를 다시 만들지 않고 지적된 위치만 고친다.
    delete doc.tree.children[1].onclick;
    for (const e of errors.filter(x => x.fix)) doc[e.path.slice(2)] = Object.values(e.fix)[0];
    const again = await call(client, 'validate_blueprint', {blueprint: doc});
    assert.deepEqual(again.structuredContent.value ?? again.structuredContent.errors, {valid: true});
  } finally { await client.close(); }
});

test('잘못된 인자: 오타·없는 종류·없는 부품은 path·hint 가 있는 구조화 오류다', async () => {
  const client = await mcpConnect();
  try {
    const typo = await call(client, 'list_design_system', {kind: 'themes', feilds: ['id']});
    assert.equal(typo.isError, true); assert.deepEqual([typo.structuredContent.errors[0].code, typo.structuredContent.errors[0].path], ['BAD_REQUEST', '$args.feilds']);
    assert.match(typo.structuredContent.errors[0].hint, /허용 인자/);
    const kind = await call(client, 'list_design_system', {kind: 'nope'});
    assert.equal(kind.structuredContent.errors[0].code, 'UNKNOWN_KIND'); assert.match(kind.structuredContent.errors[0].hint, /templates/);
    const comp = await call(client, 'get_component_spec', {type: 'nope'});
    assert.equal(comp.structuredContent.errors[0].code, 'UNKNOWN_COMPONENT');
    const missing = await call(client, 'validate_blueprint', {});
    assert.equal(missing.isError, true); assert.equal(missing.structuredContent.errors[0].path, '$args.blueprint');
    const ver = await call(client, 'list_design_system', {kind: 'themes', catalogVersion: '9.9.9'});
    assert.deepEqual([ver.structuredContent.errors[0].code, ver.structuredContent.errors[0].path], ['UNSUPPORTED_VERSION', '$args.catalogVersion']);
    // D3(ADR 0012 §8): 서비스가 받는 버전은 채널이 거부하지 않는다. 버전과 무관한 대상(chrome)은 같은 결과를 낸다.
    const older = await call(client, 'get_design_schema', {target: 'chrome', catalogVersion: '2.3.0'});
    assert.equal(older.isError, false);
    assert.deepEqual(older.structuredContent, (await call(client, 'get_design_schema', {target: 'chrome'})).structuredContent);
    const ok = await call(client, 'list_design_system', {kind: 'themes', limit: 1, catalogVersion: ver.structuredContent.catalogVersion});
    assert.equal(ok.isError, false);
  } finally { await client.close(); }
});

test('입력 크기 제한: 전송 상한 초과는 413, 검증기 상한 초과는 SIZE 도구 오류', async () => {
  const big = JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/call', params: {name: 'validate_blueprint', arguments: {blueprint: {pad: 'x'.repeat(MAX_BODY_BYTES)}}}});
  const headers = {'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-forwarded-for': '10.1.1.1'};
  const res = await mcpFetch('http://channel.test/api/mcp', {method: 'POST', headers, body: big});
  assert.equal(res.status, 413);
  const body = await res.json(); assert.equal(body.error.data.code, 'PAYLOAD_TOO_LARGE'); assert.ok(body.error.data.hint);
  const client = await mcpConnect();
  try {
    const mid = bp(); mid.pad = 'x'.repeat(250_000);
    const r = await call(client, 'validate_blueprint', {blueprint: mid});
    assert.equal(r.isError, true); assert.deepEqual(r.structuredContent.errors.map(e => [e.code, e.path]), [['SIZE', '$']]);
  } finally { await client.close(); }
});

test('실행 시간 상한: 시간을 넘긴 결과는 TIMEOUT 오류로 바뀐다', () => {
  const tool = TOOLS.find(t => t.name === 'list_design_system');
  const now = mock.method(Date, 'now', (() => { let t = 0; return () => (t += TOOL_TIMEOUT_MS + 1); })());
  try {
    const r = executeTool(tool, {kind: 'themes', limit: 1});
    assert.equal(r.isError, true); assert.equal(r.structuredContent.errors[0].code, 'TIMEOUT');
  } finally { now.mock.restore(); }
  assert.equal(executeTool(tool, {kind: 'themes', limit: 1}).isError, false);
});

test('호출 제한: 같은 호출자의 비싼 도구 호출이 예산을 넘으면 RATE_LIMITED 도구 오류, 조회는 제한하지 않는다', async () => {
  resetRateLimit();
  const client = await mcpConnect('modern', {ip: '198.51.100.5'});
  try {
    let limited = null, n = 0;
    for (; n < Math.ceil(RATE_BUDGET / COST.compile) + 2; n++) {
      const r = await call(client, 'compile_design', {blueprint: bp(), include: [], html: 'omit'});
      if (r.isError) { limited = r; break; }
    }
    assert.ok(limited, '제한에 걸렸어야 한다');
    assert.equal(n, Math.ceil(RATE_BUDGET / COST.compile));
    assert.equal(limited.structuredContent.errors[0].code, 'RATE_LIMITED'); assert.match(limited.structuredContent.errors[0].hint, /인스턴스/);
    assert.equal((await call(client, 'list_design_system', {kind: 'themes', limit: 1})).isError, false);
  } finally { await client.close(); resetRateLimit(); }
});

test('Origin 검증: 낯선 Origin 은 403, 같은 호스트·Origin 없음은 통과, GET·DELETE 는 405', async () => {
  const body = JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list', params: {}});
  const h = extra => ({'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-forwarded-for': '10.2.2.2', ...extra});
  assert.equal((await mcpFetch('http://channel.test/api/mcp', {method: 'POST', headers: h({origin: 'https://evil.example'}), body})).status, 403);
  assert.equal((await mcpFetch('http://channel.test/api/mcp', {method: 'POST', headers: h({origin: 'null'}), body})).status, 403);
  assert.notEqual((await mcpFetch('http://channel.test/api/mcp', {method: 'POST', headers: h({origin: 'http://channel.test'}), body})).status, 403);
  assert.notEqual((await mcpFetch('http://channel.test/api/mcp', {method: 'POST', headers: h({}), body})).status, 403);
  assert.equal((await mcpFetch('http://channel.test/api/mcp', {method: 'GET', headers: h({})})).status, 405);
  assert.equal((await mcpFetch('http://channel.test/api/mcp', {method: 'DELETE', headers: h({})})).status, 405);
});

test('외부 네트워크 없이 동작한다: fetch 를 막아도 모든 도구가 답한다', async () => {
  const client = await mcpConnect();
  const original = globalThis.fetch;
  try {
    globalThis.fetch = () => { throw new Error('외부 네트워크 호출'); };
    for (const [name, args] of [['list_design_system', {kind: 'themes', limit: 1}], ['get_design_schema', {target: 'chrome'}], ['get_component_spec', {type: 'hero'}], ['validate_blueprint', {blueprint: bp()}], ['compile_design', {blueprint: bp()}], ['explain_design_decisions', {blueprint: bp()}]]) {
      assert.equal((await call(client, name, args)).isError, false, name);
    }
  } finally { globalThis.fetch = original; await client.close(); }
});

// ---------------------------------------------------------------- 에이전트 흐름 시나리오

for (const era of ['modern', 'legacy']) {
  test(`[${era}] 에이전트 흐름: 탐색 → 스키마 → Blueprint 작성 → 검증 실패 → path 기반 수정 → 검증 통과 → 컴파일 → 설명`, async () => {
    const client = await mcpConnect(era);
    try {
      // 1. 탐색: 필요한 조각만
      const found = await call(client, 'list_design_system', {kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 1});
      const templateId = found.structuredContent.value.items[0].id;
      const themes = await call(client, 'list_design_system', {kind: 'themes', fields: ['id', 'palettes'], limit: 3});
      const theme = themes.structuredContent.value.items[0];
      // 2. 스키마·부품 명세: 일부만
      const schema = await call(client, 'get_design_schema', {target: 'blueprint', fields: ['name', 'theme', 'palette', 'mode']});
      assert.deepEqual(Object.keys(schema.structuredContent.value.properties), ['name', 'theme', 'palette', 'mode']);
      const hero = await call(client, 'get_component_spec', {type: 'hero', fields: ['required', 'example']});
      assert.ok(hero.structuredContent.value.required.includes('title'));
      // 3. Blueprint 작성(에이전트가 만든다고 가정): 의도적 오류 둘, 허용 안 되는 속성과 없는 테마
      const draft = createBlueprint(templateId); draft.name = '에이전트 시안'; draft.tree.children[1].style = 'color:red'; draft.theme = 'no-such-theme';
      // 4. 검증 실패: path 가 고칠 위치를 가리킨다
      const bad = await call(client, 'validate_blueprint', {blueprint: draft});
      assert.equal(bad.isError, true);
      const paths = bad.structuredContent.errors.map(e => e.path);
      assert.ok(paths.includes('$.tree.children[1].style')); assert.ok(paths.some(p => p === '$.theme' || p === '$.palette'));
      // 컴파일도 같은 이유로 거부하고 고쳐서 성공시키지 않는다
      const refused = await call(client, 'compile_design', {blueprint: draft});
      assert.equal(refused.isError, true); assert.equal(refused.structuredContent.value, undefined);
      // 5. path 기반 수정: 지적된 위치만 고친다(문서 전체를 다시 만들지 않는다)
      delete draft.tree.children[1].style;
      draft.theme = theme.id; draft.palette = theme.palettes[0];
      const fixed = await call(client, 'validate_blueprint', {blueprint: draft});
      assert.equal(fixed.isError, false, JSON.stringify(fixed.structuredContent.errors));
      // 6. 컴파일: 기본은 요약
      const built = await call(client, 'compile_design', {blueprint: draft});
      assert.equal(built.isError, false); assert.equal(built.structuredContent.value.html, undefined); assert.ok(built.structuredContent.value.sizes.html > 10_000);
      // 7. 설명: 컴파일러가 남긴 기록
      const why = await call(client, 'explain_design_decisions', {manifest: built.structuredContent.value.manifest, level: 'summary'});
      assert.equal(why.isError, false); assert.ok(why.structuredContent.value.contrast.pairs > 0);
      // 8. 본문은 필요할 때만 받고 해시가 manifest 와 맞는다
      const html = await call(client, 'compile_design', {blueprint: draft, html: 'full', include: ['html']});
      assert.equal(sha256(html.structuredContent.value.html), built.structuredContent.value.manifest.integrity.files['index.html']);
    } finally { await client.close(); }
  });
}
