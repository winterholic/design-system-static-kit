// OpenAPI 3.1 문서를 작업 표(operations.mjs)와 서비스 스키마에서 만든다. 손으로 쓴 문서와 라우트가 갈라지지 않게 한다.
import {getSchema, listCatalog} from '@winterholic/design-system-static-kit/service';
import {OPERATIONS} from './operations.mjs';
import {MAX_BODY_BYTES, RATE_BUDGET, RATE_WINDOW_MS} from './limits.mjs';

const envelope = (valueSchema, extra = {}) => ({
  type: 'object',
  required: ['ok', 'warnings', 'catalogVersion', 'contractVersion'],
  properties: {
    ok: {type: 'boolean'},
    value: valueSchema,
    errors: {type: 'array', items: {$ref: '#/components/schemas/Diagnostic'}},
    warnings: {type: 'array', items: {$ref: '#/components/schemas/Diagnostic'}},
    catalogVersion: {type: 'string', description: '서버가 응답에 쓴 카탈로그 버전'},
    contractVersion: {type: 'string', description: '결과 봉투·Diagnostic 모양의 버전'},
  },
  ...extra,
});

const errorResponse = (description, extraHeaders) => ({description, ...(extraHeaders ? {headers: extraHeaders} : {}), content: {'application/json': {schema: {$ref: '#/components/schemas/ErrorEnvelope'}}}});
const COMMON_ERRORS = {
  400: errorResponse('요청 형식 오류(BAD_REQUEST, UNKNOWN_KIND 등) 또는 지원하지 않는 catalogVersion(UNSUPPORTED_VERSION)'),
  422: errorResponse('입력은 읽었으나 카탈로그 규칙을 어김(검증기 코드, CONTRAST_GATE, CATALOG_VERSION)'),
  500: errorResponse('INTERNAL. 내부 경로·스택은 싣지 않는다'),
};
const POST_ERRORS = {
  413: errorResponse(`본문이 ${MAX_BODY_BYTES}바이트 초과(PAYLOAD_TOO_LARGE)`),
  415: errorResponse('Content-Type 이 application/json 이 아님(UNSUPPORTED_MEDIA_TYPE)'),
  429: errorResponse(`호출 제한 초과(RATE_LIMITED). 인스턴스 단위 ${RATE_WINDOW_MS / 1000}초 창, 비용 ${RATE_BUDGET}`, {'Retry-After': {schema: {type: 'integer'}, description: '다시 시도할 때까지 초'}}),
};

const VALUE_SCHEMAS = {
  getCatalog: {type: 'object', properties: {kind: {type: 'string'}, items: {type: 'array', items: {type: 'object'}}, total: {type: 'integer'}, nextCursor: {type: ['string', 'null']}}},
  getSchema: {type: 'object', description: 'JSON Schema 2020-12 (+ x-runtimeRules)'},
  getComponent: {type: 'object', description: '부품 명세. type 은 항상 포함'},
  validateBlueprint: {type: 'object', properties: {valid: {const: true}}},
  compileBlueprint: {type: 'object', properties: {sizes: {type: 'object', properties: {html: {type: 'integer'}, css: {type: 'integer'}}}, html: {type: 'string'}, htmlSummary: {type: 'object'}, css: {type: 'string'}, tokens: {type: 'object'}, manifest: {type: 'object'}, files: {type: 'object'}}},
  explainDecisions: {type: 'object', properties: {decisions: {type: 'array', items: {type: 'object'}}, page: {type: ['object', 'null']}, axes: {type: 'array', items: {type: 'object'}}, contrast: {type: 'object'}}},
};
Object.assign(VALUE_SCHEMAS, {
  assembleDesign: {type: 'object', properties: {selected: {type: 'string'}, candidates: {type: 'array', items: {type: 'object', description: '{id, rank, score, selection, decisions[{slot, id, source, score, reasons}], relations, quality, warnings, reasons, fingerprint, value{sizes, html, css, tokens, manifest, blueprint}}'}}, blocked: {type: 'array', items: {type: 'object'}}, comparison: {type: 'object'}, plan: {type: 'object'}, decisions: {type: 'array', items: {type: 'object'}}}},
  assembleBlueprint: {type: 'object', properties: {blueprint: {type: 'object'}, decisions: {type: 'array', items: {type: 'object'}}, materials: {type: 'object'}}},
  listMaterials: {type: 'object', properties: {items: {type: 'array', items: {type: 'object'}}, total: {type: 'integer'}, nextCursor: {type: ['string', 'null']}, byKind: {type: 'object'}}},
  getMaterial: {type: 'object', description: '재료 한 장의 전체 기록'},
  listPlatformMaterials: {type: 'object', properties: {items: {type: 'array', items: {type: 'object'}}, total: {type: 'integer'}, nextCursor: {type: ['string', 'null']}, byKind: {type: 'object'}}},
  getPlatformMaterial: {type: 'object', description: '재료 기록과 edges{from, to}'},
  recommendMaterials: {type: 'object', properties: {kind: {type: 'string'}, ranked: {type: 'array', items: {type: 'object'}}, blocked: {type: 'array', items: {type: 'object'}}}},
  checkCompatibility: {type: 'object', properties: {ok: {type: 'boolean'}, violations: {type: 'array', items: {type: 'object'}}, applied: {type: 'array', items: {type: 'object'}}, checks: {type: 'array', items: {type: 'object'}}}},
  listEditOps: {type: 'object', properties: {ops: {type: 'array', items: {type: 'string'}}}},
  applyEdit: {type: 'object', properties: {blueprint: {type: 'object'}, changes: {type: 'array', items: {}}, steps: {type: 'integer'}}},
});
VALUE_SCHEMAS.listThemes = VALUE_SCHEMAS.getCatalog;
VALUE_SCHEMAS.listComponents = VALUE_SCHEMAS.getCatalog;

const PLATFORM_OPS = new Set(['assembleDesign', 'assembleBlueprint', 'listPlatformMaterials', 'getPlatformMaterial', 'recommendMaterials', 'checkCompatibility']);
const tagOf = op => (op.path.startsWith('/api/v1/components') ? 'components' : op.path.startsWith('/api/v1/edit') ? 'edit' : op.path.startsWith('/api/v1/materials') ? 'materials' : PLATFORM_OPS.has(op.id) ? 'assemble' : op.method === 'GET' ? 'read' : 'blueprint');

function operationObject(op) {
  const get = op.method === 'GET';
  const out = {
    operationId: op.id, summary: op.summary, tags: [tagOf(op)],
    ...(op.description ? {description: op.description} : {}),
    ...(op.parameters ? {parameters: op.parameters} : {}),
  };
  if (!get) {
    out.requestBody = {required: true, content: {'application/json': {schema: {type: 'object', additionalProperties: false, required: op.body.required, properties: op.body.properties, ...(op.body.oneOf ? {oneOf: op.body.oneOf.map(r => ({required: r}))} : {})}}}};
  }
  out.responses = {
    200: {
      description: '성공(경고가 있을 수 있다)',
      ...(get ? {headers: {ETag: {schema: {type: 'string'}}, 'Cache-Control': {schema: {type: 'string'}}}} : {}),
      content: {'application/json': {schema: envelope(VALUE_SCHEMAS[op.id])}},
    },
    ...(get ? {304: {description: 'If-None-Match 가 ETag 와 같음'}} : {}),
    ...COMMON_ERRORS, ...(get ? {} : POST_ERRORS),
    ...(op.id === 'getComponent' ? {404: errorResponse('알 수 없는 부품(UNKNOWN_COMPONENT)')} : {}),
  };
  return out;
}

export function buildOpenApi() {
  const {catalogVersion, contractVersion} = listCatalog({kind: 'axes', limit: 1});
  const diagnostic = getSchema({target: 'diagnostic'}).value;
  const {$schema: _s, title: _t, ...diagnosticSchema} = diagnostic;
  const paths = {};
  for (const op of OPERATIONS) (paths[op.path] ??= {})[op.method.toLowerCase()] = operationObject(op);
  paths['/api/v1/openapi.json'] = {get: {operationId: 'getOpenApi', summary: '이 문서', tags: ['read'], responses: {200: {description: 'OpenAPI 3.1 문서', content: {'application/json': {schema: {type: 'object'}}}}}}};
  return {
    openapi: '3.1.0',
    info: {
      title: 'Static Kit REST API', version: contractVersion,
      description: `src/service 의 함수를 HTTP 로 낸 얇은 어댑터입니다(조회·검증·컴파일·설명·조립·재료·추천·호환성·편집). MCP(/api/mcp)와 CLI 가 같은 서비스를 씁니다. 카탈로그 버전 ${catalogVersion}.\n\n호출 제한은 서버 인스턴스 단위(${RATE_WINDOW_MS / 1000}초 창)이며 서버리스에서는 전역 제한이 아닙니다.`,
    },
    'x-catalogVersion': catalogVersion,
    servers: [{url: '/'}],
    tags: [{name: 'read', description: '카탈로그·스키마 조회(캐시 가능)'}, {name: 'components'}, {name: 'blueprint', description: 'Blueprint 검증·컴파일·설명'}, {name: 'assemble', description: '플랫폼 조립(복수 후보)과 플랫폼 재료 조회·추천·호환성'}, {name: 'materials', description: '2.6.0 카탈로그 재료 조회'}, {name: 'edit', description: 'Blueprint 편집 연산'}],
    paths,
    components: {schemas: {
      Diagnostic: diagnosticSchema,
      ErrorEnvelope: envelope(undefined, {required: ['ok', 'errors', 'warnings', 'catalogVersion', 'contractVersion']}),
    }},
  };
}
