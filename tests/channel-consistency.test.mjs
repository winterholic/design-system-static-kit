// 네 채널(서비스 직접 호출, CLI, REST, MCP)이 같은 Blueprint 에 같은 답을 내는지 본다.
// 채널마다 검증 로직을 따로 두면 안 된다는 규칙(ADR 0009)의 회귀 시험이다.
// REST·MCP 는 서버를 띄우지 않고 같은 코드 경로(Request → Response)로 부른다. 실제 서버 시험은 apps/web/e2e/api·mcp 에 있다.
import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createBlueprint, templateList, themes, nodeTypes} from '../src/catalog.mjs';
import {validateBlueprint, compileBlueprint, getComponentSpec} from '../src/service/index.mjs';
import {cliChannel, serviceChannel, restChannel, mcpChannel, mcpConnect, rest, workdir, cleanup} from './channel-support.mjs';

let dir, client, channels;
before(async () => {
  dir = workdir();
  client = await mcpConnect('modern');
  channels = [serviceChannel, cliChannel(dir), restChannel, mcpChannel(client)];
});
after(async () => { await client.close(); cleanup(dir); });

const clone = x => structuredClone(x);
const firstOf = pageType => templateList.find(t => t.pageType === pageType).id;
const themeIds = Object.keys(themes);

/** 한 입력에 대해 모든 채널의 검증 결과를 모은다. */
async function validateAll(value, only) {
  const out = {};
  for (const ch of channels) if (!only || only.includes(ch.name)) out[ch.name] = await ch.validate(value);
  return out;
}
const equalAcross = (results, key, label) => {
  const [first, ...rest] = Object.entries(results);
  for (const [name, r] of rest) assert.deepEqual(r[key], first[1][key], `${label}: ${first[0]} 와 ${name} 의 ${key} 가 다르다`);
};

// ---------------------------------------------------------------- 유효한 Blueprint

const validCases = [
  ...[...new Set(templateList.map(t => t.pageType))].slice(0, 8).map(pt => ({label: `${firstOf(pt)} (${pt})`, bp: createBlueprint(firstOf(pt))})),
  ...themeIds.slice(0, 5).map((theme, i) => ({label: `saas-landing × ${theme}`, bp: createBlueprint(templateList[i * 3].id, theme)})),
];

test('유효한 Blueprint: 네 채널이 모두 통과시키고 컴파일 HTML 해시와 manifest 무결성 해시가 같다', async () => {
  assert.ok(validCases.length >= 12);
  for (const {label, bp} of validCases) {
    const v = await validateAll(bp);
    for (const [name, r] of Object.entries(v)) assert.equal(r.ok, true, `${label}: ${name} 검증 실패 ${JSON.stringify(r.errors)}`);
    const c = {};
    for (const ch of channels) c[ch.name] = await ch.compile(bp);
    for (const [name, r] of Object.entries(c)) assert.equal(r.ok, true, `${label}: ${name} 컴파일 실패 ${JSON.stringify(r.errors)}`);
    equalAcross(c, 'htmlSha', label);
    equalAcross(c, 'integrity', label);
    assert.equal(c.service.htmlSha.length, 64);
  }
});

// ---------------------------------------------------------------- 오류 입력

const base = () => createBlueprint('saas-landing');
// 첫 히어로의 주 액션 링크를 바꾼다($.tree.children[1].action.href).
const withLink = href => { const bp = base(); assert.equal(bp.tree.children[1].action.href, '#main'); bp.tree.children[1].action.href = href; return bp; };
const errorCases = [
  {label: '없는 컴포넌트', expectCode: 'NODE_TYPE', bp: (() => { const b = base(); b.tree.children[1].type = 'nonexistent'; return b; })()},
  {label: '금지된 속성 onclick', expectCode: 'UNKNOWN_KEY', bp: (() => { const b = base(); b.tree.children[1].onclick = 'alert(1)'; return b; })()},
  {label: '금지된 속성 style', expectCode: 'UNKNOWN_KEY', bp: (() => { const b = base(); b.tree.children[1].style = 'color:red'; return b; })()},
  {label: '축 금지(AXIS_BAN)·테마 금지', expectCode: null, bp: (() => { const b = createBlueprint('saas-landing', 'civic'); b.elevation = 'glow'; b.mode = 'light'; return b; })()},
  {label: '문서가 선언한 catalogVersion 이 지원 밖', expectCode: 'ENUM', bp: (() => { const b = base(); b.catalogVersion = '9.9.9'; return b; })()},
  {label: 'javascript: URL', expectCode: 'URL', bp: withLink('javascript:alert(1)')},
  {label: 'data: URL', expectCode: 'URL', bp: withLink('data:text/html,<script>alert(1)</script>')},
  {label: '평문 http URL', expectCode: 'URL', bp: withLink('http://example.com/')},
  {label: '객체가 아닌 문서 null', expectCode: 'OBJECT', bp: null},
  {label: '객체가 아닌 문서 배열', expectCode: 'OBJECT', bp: []},
  {label: '문자열 문서', expectCode: 'OBJECT', bp: '<script>alert(1)</script>'},
];

test('오류 입력: 네 채널의 오류 code·path·message 가 같고 모두 실패한다', async () => {
  for (const {label, bp, expectCode} of errorCases) {
    const value = bp;
    const v = await validateAll(value);
    for (const [name, r] of Object.entries(v)) {
      assert.equal(r.ok, false, `${label}: ${name} 가 통과시켰다`);
      assert.ok(r.errors.length > 0, `${label}: ${name} 오류가 비었다`);
    }
    equalAcross(v, 'errors', label);
    if (expectCode) assert.ok(v.service.errors.some(e => e.code === expectCode), `${label}: ${expectCode} 가 없다 ${JSON.stringify(v.service.errors)}`);
    // 컴파일도 같은 오류로 거부하고 내용을 고쳐 성공시키지 않는다.
    const c = {};
    for (const ch of channels) c[ch.name] = await ch.compile(value);
    for (const [name, r] of Object.entries(c)) assert.equal(r.ok, false, `${label}: ${name} 컴파일이 성공했다`);
    equalAcross(c, 'errors', `${label} 컴파일`);
    assert.deepEqual(c.service.errors, v.service.errors, `${label}: 검증과 컴파일의 오류가 다르다`);
  }
});

test('오류 입력: 모든 오류가 비지 않은 hint 를 가진다 (REST·MCP 원문)', async () => {
  const bad = clone(base()); bad.tree.children[1].onclick = 'x';
  const r = await rest('POST', '/api/v1/validate', {body: {blueprint: bad}});
  for (const e of r.json.errors) for (const k of ['code', 'path', 'message', 'hint']) assert.ok(typeof e[k] === 'string' && e[k], `${k}`);
  const m = await client.callTool({name: 'validate_blueprint', arguments: {blueprint: bad}});
  assert.deepEqual(m.structuredContent.errors, r.json.errors);
  assert.equal(m.isError, true);
});

// ---------------------------------------------------------------- 크기 초과

test('크기 초과(검증기 상한 초과, 전송 상한 미만): 서비스·REST·MCP 는 같은 SIZE 오류, CLI 는 같은 code 로 거부한다', async () => {
  const big = base(); big.pad = 'x'.repeat(300_000);
  const v = await validateAll(big, ['service', 'rest', 'mcp']);
  equalAcross(v, 'errors', '크기 초과');
  assert.deepEqual(v.service.errors.map(e => [e.code, e.path]), [['SIZE', '$']]);
  assert.equal(v.rest.status, 422);
  // CLI 는 서비스를 부르기 전에 scripts/output.mjs 의 readBlueprint 가 파일 크기로 먼저 거부한다. code 는 같지만 path 가 $ 가 아니라 파일 경로다.
  // scripts/ 는 이 트랙의 수정 범위 밖이라 차이를 기록만 한다. 고쳐지면 이 단언이 깨져 알려 준다.
  const cli = cliChannel(dir).validate(big);
  assert.equal(cli.ok, false);
  assert.match(cli.raw, /^SIZE: .* exceeds 196608 bytes\n$/);
});

// ---------------------------------------------------------------- catalogVersion 불일치

test('catalogVersion 불일치: 서비스·REST·MCP 가 같은 오류를 낸다 (CLI 에는 해당 옵션이 없다)', async () => {
  const bp = base();
  const restBad = {
    unsupported: await rest('POST', '/api/v1/validate', {body: {blueprint: bp, catalogVersion: '9.9.9'}}),
    mismatch: await rest('POST', '/api/v1/validate', {body: {blueprint: bp, catalogVersion: '2.3.0'}}),
  };
  for (const [key, version, code] of [['unsupported', '9.9.9', 'UNSUPPORTED_VERSION'], ['mismatch', '2.3.0', 'CATALOG_VERSION']]) {
    const svc = validateBlueprint(bp, {catalogVersion: version});
    assert.equal(svc.ok, false); assert.equal(svc.errors[0].code, code);
    assert.deepEqual(restBad[key].json.errors, svc.errors);
    const m = await client.callTool({name: 'validate_blueprint', arguments: {blueprint: bp, catalogVersion: version}});
    assert.deepEqual(m.structuredContent.errors, svc.errors);
    assert.equal(m.isError, true);
  }
  assert.equal(restBad.unsupported.status, 400);
  assert.equal(restBad.mismatch.status, 422);
});

// ---------------------------------------------------------------- 임의 HTML 문자열

test('텍스트 속 <script>·태그 문자열: 통과시키는 채널이 같고 출력에 실행 가능한 형태로 남지 않는다', async () => {
  const bp = base(); bp.name = '<script>alert(1)</script>'; bp.tree.children[0].title = '<img src=x onerror=alert(1)>';
  const v = await validateAll(bp);
  equalAcross(v, 'ok', '텍스트 속 태그'); equalAcross(v, 'errors', '텍스트 속 태그');
  const c = {};
  for (const ch of channels) c[ch.name] = await ch.compile(bp);
  equalAcross(c, 'htmlSha', '텍스트 속 태그');
  const html = compileBlueprint(bp).value.html;
  assert.equal(html.includes('<script>alert(1)'), false);
  assert.equal(html.includes('<img src=x onerror'), false);
});

test('모든 부품 type 이 REST·MCP 부품 명세 조회와 서비스 직접 호출에서 같다', async () => {
  for (const type of nodeTypes.slice(0, 12)) {
    const svc = getComponentSpec({type, fields: ['required', 'children']});
    const r = await rest('GET', `/api/v1/components/${type}?fields=required,children`);
    assert.deepEqual(r.json, JSON.parse(JSON.stringify(svc)), type);
    const m = await client.callTool({name: 'get_component_spec', arguments: {type, fields: ['required', 'children']}});
    assert.deepEqual(m.structuredContent, JSON.parse(JSON.stringify(svc)), type);
  }
});
