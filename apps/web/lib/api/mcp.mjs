// MCP(Streamable HTTP) 서버. 도구 여섯 개가 src/service 함수를 한 번씩만 부르고 결과 봉투를 그대로 낸다.
// 사양 2026-07-28(무상태, server/discover)을 mcp-handler 2.x 가 제공하고, 2025년판 클라이언트는 같은 핸들러가 무상태로 받는다.
import {createMcpHandler} from 'mcp-handler';
import {originValidationResponse, localhostAllowedOrigins} from '@modelcontextprotocol/server';
import {z} from 'zod';
import {CATALOG_KINDS, compileBlueprint, explainDecisions, getComponentSpec, getSchema, listCatalog, validateBlueprint} from '@winterholic/design-system-static-kit/service';
import {COST, MAX_BODY_BYTES, TOOL_TIMEOUT_MS} from './limits.mjs';
import {channelError} from './diagnostics.mjs';
import {sha256} from './hash.mjs';
import {clientKey, takeRate} from './ratelimit.mjs';
import {readTextLimited} from './http.mjs';
import {rejectUnexpectedVersion} from './versions.mjs';

// ---------------------------------------------------------------- 스키마

const catalogVersion = z.string().optional().describe('기대하는 catalogVersion. 지원 범위 밖이거나 서버가 쓰는 값과 다르면 구조화된 오류로 거부한다.');
const loose = shape => z.looseObject(shape); // 알 수 없는 인자는 서비스가 path·hint 가 있는 BAD_REQUEST 로 거부하게 통과시킨다.

const diagnostic = z.looseObject({code: z.string(), path: z.string(), message: z.string(), hint: z.string(), rule: z.string().optional(), fix: z.record(z.string(), z.unknown()).optional()});
/** 서비스 봉투 그대로. 성공이면 value, 실패면 errors. */
const envelopeOf = value => z.looseObject({ok: z.boolean(), value: value.optional(), errors: z.array(diagnostic).optional(), warnings: z.array(diagnostic), catalogVersion: z.string(), contractVersion: z.string()});
const anyObject = z.record(z.string(), z.unknown());

const kindList = CATALOG_KINDS.join(', ');

export const TOOLS = [
  {
    name: 'list_design_system', title: '디자인 시스템 목록 조회', run: 'list',
    description: `카탈로그의 한 종류(${kindList})를 요약 목록으로 조회한다. 전체를 받지 말고 filter·query·fields·limit·cursor 로 필요한 조각만 받아라. 예: {kind:"templates", filter:{pageType:"landing"}, fields:["id","theme"], limit:10}. 필터 이름이 틀리면 오류 hint 가 허용 목록을 알려 준다.`,
    input: loose({kind: z.string().describe(`종류: ${kindList}`), filter: z.record(z.string(), z.string()).optional().describe('{필터이름: 값}'), query: z.string().optional().describe('id·이름 부분 일치(공백 단어 AND)'), fields: z.array(z.string()).optional().describe('나갈 필드(식별 필드는 항상 나감)'), limit: z.number().optional().describe('1~200, 기본 50'), cursor: z.string().optional().describe('이전 응답의 nextCursor'), catalogVersion}),
    output: envelopeOf(z.looseObject({kind: z.string(), items: z.array(anyObject), total: z.number(), nextCursor: z.string().nullable()})),
    cost: 0,
  },
  {
    name: 'get_design_schema', title: 'JSON Schema 조회', run: 'schema',
    description: 'Blueprint·부품·chrome·진단·편집 연산의 JSON Schema(2020-12)를 조회한다. target=blueprint 는 약 56KB 이므로 fields:["tree"] 처럼 최상위 속성 일부만 받아라. 부품 하나는 target:"component", type:"hero". 교차 필드 규칙은 스키마가 아니라 검증기가 판정하며 응답의 x-runtimeRules 에 목록이 있다.',
    input: loose({target: z.string().describe('blueprint | component | chrome | diagnostic | edit-ops'), type: z.string().optional().describe('target=component 일 때 부품 type'), fields: z.array(z.string()).optional().describe('남길 최상위 속성 이름'), catalogVersion}),
    output: envelopeOf(anyObject), cost: 0,
  },
  {
    name: 'get_component_spec', title: '부품 명세 조회', run: 'spec',
    description: '부품 하나의 명세(필수·선택 필드, 허용 자식, 예시, 관련 규칙 ID)를 조회한다. fields 로 label, group, fields, required, optional, children, example, pageTypes, rules 중 일부만 받을 수 있다. 부품 이름은 list_design_system {kind:"components"} 로 찾는다.',
    input: loose({type: z.string().describe('부품 type (예 hero)'), fields: z.array(z.string()).optional(), catalogVersion}),
    output: envelopeOf(anyObject), cost: 0,
  },
  {
    name: 'validate_blueprint', title: 'Blueprint 검증', run: 'validate',
    description: 'Blueprint JSON 이 카탈로그 규칙을 지키는지 검증한다. 실패하면 isError 와 함께 수정 가능한 오류 목록을 준다: 각 오류의 path($.tree.children[2].variant)가 고칠 위치, hint 가 고치는 방법, 가능하면 fix 가 대안 값이다. 전체 문서를 다시 만들지 말고 해당 path 만 고쳐 다시 검증하라. 문서를 자동으로 고치지 않는다.',
    // 선택으로 선언해야 입력 누락도 서비스 경계까지 도달해 공통 BAD_REQUEST 봉투를 받는다.
    input: loose({blueprint: z.unknown().optional().describe('Blueprint JSON 객체 (스키마: get_design_schema)'), catalogVersion}),
    output: envelopeOf(z.looseObject({valid: z.boolean()})), cost: COST.validate,
  },
  {
    name: 'compile_design', title: 'Blueprint 컴파일', run: 'compile',
    description: 'Blueprint 를 컴파일한다. 기본 응답은 HTML 본문 없이 sizes(바이트)·htmlSummary·manifest(적용 규칙·대비·무결성 해시)다. 본문이 필요할 때만 html:"full" 을, CSS·토큰은 include 로 요청하라(응답이 커진다). 검증에 실패하면 validate_blueprint 와 같은 오류를 주며 내용을 고쳐 성공시키지 않는다.',
    input: loose({blueprint: z.unknown().optional().describe('Blueprint JSON 객체'), include: z.array(z.string()).optional().describe('html, css, tokens, manifest, files 중. 기본 ["html","manifest"]'), html: z.string().optional().describe('summary(기본) | full | omit'), maxBytes: z.number().optional().describe('본문 하나의 최대 UTF-8 바이트. 넘으면 싣지 않고 경고'), catalogVersion}),
    output: envelopeOf(z.looseObject({sizes: z.looseObject({html: z.number(), css: z.number()}), html: z.string().optional(), htmlSummary: anyObject.optional(), css: z.string().optional(), tokens: anyObject.optional(), manifest: anyObject.optional(), files: anyObject.optional()})),
    cost: COST.compile,
  },
  {
    name: 'explain_design_decisions', title: '디자인 결정 설명', run: 'explain',
    description: '컴파일러가 남긴 기록만 근거로 어떤 규칙이 어떤 값을 정했는지(결정·페이지 규칙·축·대비)를 설명한다. blueprint 나 manifest 중 정확히 하나를 준다. path 나 rule 로 범위를 좁혀라.',
    input: loose({blueprint: z.unknown().optional().describe('Blueprint JSON (컴파일 가능해야 함)'), manifest: anyObject.optional().describe('compile_design 이 준 manifest'), path: z.string().optional().describe('이 경로 아래 노드만 (예 $.tree.children[1])'), rule: z.string().optional().describe('이 규칙 ID 가 적용된 결정만 (예 C02)'), level: z.string().optional().describe('summary(기본) | full'), catalogVersion}),
    output: envelopeOf(z.looseObject({decisions: z.array(anyObject), page: anyObject.nullable(), axes: z.array(anyObject), contrast: anyObject})), cost: COST.explain,
  },
];

// ---------------------------------------------------------------- 도구 실행(서비스 호출만)

const notFound = (path, message) => channelError('BAD_REQUEST', path, message);
const withoutVersion = ({catalogVersion: _v, ...rest}) => rest;

/** 도구 이름 → 서비스 호출. 서비스 봉투를 그대로 돌려준다. */
const RUN = {
  list: a => listCatalog(withoutVersion(a)),
  schema: a => getSchema(withoutVersion(a)),
  spec: a => getComponentSpec(withoutVersion(a)),
  validate: a => (a.blueprint === undefined ? notFound('$args.blueprint', 'blueprint 가 필요합니다.') : validateBlueprint(a.blueprint, a.catalogVersion === undefined ? undefined : {catalogVersion: a.catalogVersion})),
  compile: ({blueprint, catalogVersion: v, include, html, ...rest}) => {
    if (blueprint === undefined) return notFound('$args.blueprint', 'blueprint 가 필요합니다.');
    // 토큰을 아끼려고 기본은 HTML 본문 없이 요약·크기·manifest 만 낸다. 본문은 html:"full" 일 때만.
    const opts = {...rest, include: include ?? ['html', 'manifest'], html: html ?? 'summary', hash: sha256};
    if (v !== undefined) opts.catalogVersion = v;
    return compileBlueprint(blueprint, opts);
  },
  explain: ({catalogVersion: _v, blueprint, manifest, ...opts}) => {
    const subject = {};
    if (blueprint !== undefined) subject.blueprint = blueprint;
    if (manifest !== undefined) subject.manifest = manifest;
    return explainDecisions(subject, opts);
  },
};

/** 서비스 봉투를 MCP 도구 결과로. 구조화 본문과 같은 JSON 문자열을 함께 낸다(사양: structuredContent 를 쓰면 TextContent 에도 직렬화). */
export function toolResult(env) {
  return {content: [{type: 'text', text: JSON.stringify(env)}], structuredContent: env, isError: !env.ok};
}

/** 한 번의 도구 실행. 호출 제한 → 버전 확인 → 서비스 호출 → 시간 상한 확인. 던지지 않는다. */
export function executeTool(tool, args, request) {
  try {
    if (tool.cost > 0 && request) {
      const rate = takeRate(clientKey(request), tool.cost);
      if (!rate.ok) return toolResult(channelError('RATE_LIMITED', '$', `호출 제한을 넘었습니다. ${rate.retryAfterSeconds}초 뒤에 다시 시도하세요.`));
    }
    // 서비스가 catalogVersion 을 직접 검사하는 도구(validate·compile)는 거기에 맡긴다.
    if (tool.run !== 'validate' && tool.run !== 'compile') {
      const reject = rejectUnexpectedVersion(args.catalogVersion);
      if (reject) return toolResult(reject);
    }
    const started = Date.now();
    const env = RUN[tool.run](args);
    // 서비스 함수는 동기라 도중에 끊을 수 없다. 상한을 넘기면 결과를 버리고 알린다(입력 크기 상한이 시간을 제한한다).
    if (Date.now() - started > TOOL_TIMEOUT_MS) return toolResult(channelError('TIMEOUT', '$', `처리가 ${TOOL_TIMEOUT_MS}ms 를 넘었습니다.`));
    return toolResult(env);
  } catch {
    return toolResult(channelError('INTERNAL', '$', '내부 오류로 처리하지 못했습니다.'));
  }
}

const INSTRUCTIONS = [
  'Static Kit 디자인 시스템: 카탈로그가 허용한 값만 조합해 접근성 게이트를 통과한 HTML 을 만든다.',
  '권장 흐름: list_design_system(필요한 종류만, fields·limit 로 좁혀서) → get_design_schema(blueprint 는 fields 로 일부만) 또는 get_component_spec → Blueprint JSON 작성 →',
  'validate_blueprint(오류의 path·hint·fix 로 해당 부분만 수정) → compile_design(기본은 HTML 본문 없이 요약) → 필요하면 explain_design_decisions.',
  '임의 HTML·CSS·스크립트·URL 은 받지 않는다. 오류는 {code, path, message, hint} 로 돌아온다.',
].join('\n');

function register(server) {
  for (const tool of TOOLS) {
    server.registerTool(tool.name, {
      title: tool.title, description: tool.description, inputSchema: tool.input, outputSchema: tool.output,
      annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
    }, (args, ctx) => executeTool(tool, args ?? {}, ctx?.http?.req));
  }
}

// ---------------------------------------------------------------- HTTP 진입점

const jsonRpcError = (status, code, message, diag) => new Response(JSON.stringify({jsonrpc: '2.0', id: null, error: {code, message, data: diag}}), {status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff'}});

/** 허용할 Origin 호스트: 요청 호스트 자신, 로컬 개발 도구, 환경 변수 MCP_ALLOWED_ORIGINS(쉼표로 나눈 호스트 이름). Origin 이 없는 비브라우저 클라이언트는 통과한다. */
export function allowedOriginHosts(request) {
  const extra = (process.env.MCP_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return [new URL(request.url).hostname, ...localhostAllowedOrigins(), ...extra];
}

export function createRouteHandler() {
  const handler = createMcpHandler(register, {serverInfo: {name: 'static-kit', version: '1.0.0'}, instructions: INSTRUCTIONS});
  return async function mcpRoute(request) {
    const rejected = originValidationResponse(request, allowedOriginHosts(request));
    if (rejected) return rejected;
    if (request.method === 'POST') {
      const tooLarge = () => jsonRpcError(413, -32600, `본문이 ${MAX_BODY_BYTES}바이트를 넘습니다.`, {code: 'PAYLOAD_TOO_LARGE', path: '$body', message: `본문이 ${MAX_BODY_BYTES}바이트를 넘습니다.`, hint: channelError('PAYLOAD_TOO_LARGE', '$body', '').errors[0].hint});
      const declared = request.headers.get('content-length');
      if (declared !== null && Number(declared) > MAX_BODY_BYTES) return tooLarge();
      const text = await readTextLimited(request, MAX_BODY_BYTES);
      if (text === null) return tooLarge();
      request = new Request(request.url, {method: 'POST', headers: request.headers, body: text});
    }
    return handler(request);
  };
}
