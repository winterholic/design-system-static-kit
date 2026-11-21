// REST v1 의 작업 표. 각 작업은 src/service 함수 하나를 부르는 얇은 어댑터이고, 같은 표에서 OpenAPI 문서를 만든다.
// 비즈니스 규칙(허용 필터, 필드 이름, 범위, 오류 문구)은 서비스가 판정한다. 여기서는 URL·JSON 을 서비스 인자로 옮기기만 한다.
import {CATALOG_KINDS, compileBlueprint, explainDecisions, getComponentSpec, getSchema, listCatalog, validateBlueprint} from '@winterholic/design-system-static-kit/service';
import {COST} from './limits.mjs';
import {channelError} from './diagnostics.mjs';
import {sha256} from './hash.mjs';
import {rejectUnexpectedVersion} from './versions.mjs';

const nullProto = () => Object.create(null);
const bad = (path, message, hint) => channelError('BAD_REQUEST', path, message, hint);

/** 쿼리 문자열을 서비스 질의 인자로 옮긴다. 알 수 없는 키는 그대로 넘겨 서비스가 거부하게 한다. */
export function queryToArgs(url) {
  const args = nullProto(), filter = nullProto();
  let hasFilter = false, catalogVersion;
  for (const [key, value] of url.searchParams) {
    const f = /^filter(?:\[([^\]]+)\]|\.(.+))$/.exec(key);
    if (f) { filter[f[1] ?? f[2]] = value; hasFilter = true; continue; }
    if (key === 'catalogVersion') { catalogVersion = value; continue; }
    if (key === 'fields') { args.fields = [...(args.fields ?? []), ...value.split(',').map(s => s.trim()).filter(Boolean)]; if (!args.fields.length) args.fields = ['']; continue; }
    const v = key === 'limit' && /^\d{1,9}$/.test(value) ? Number(value) : value;
    args[key] = Object.hasOwn(args, key) ? [].concat(args[key], v) : v;
  }
  if (hasFilter) args.filter = filter;
  return {args, catalogVersion};
}

const GET_PARAMS = {
  kind: {in: 'query', required: true, schema: {type: 'string', enum: [...CATALOG_KINDS]}, description: '조회할 종류'},
  filter: {in: 'query', style: 'deepObject', explode: true, schema: {type: 'object', additionalProperties: {type: 'string'}}, description: '`filter[pageType]=landing` 꼴. 종류별 허용 필터는 거부될 때 hint 에 나온다.'},
  query: {in: 'query', schema: {type: 'string'}, description: 'id·이름 부분 일치(공백으로 나눈 단어를 모두 포함)'},
  fields: {in: 'query', style: 'form', explode: false, schema: {type: 'array', items: {type: 'string'}}, description: '쉼표로 나눈 필드 이름. 식별 필드는 항상 나간다.'},
  limit: {in: 'query', schema: {type: 'integer', minimum: 1, maximum: 200, default: 50}, description: '쪽 크기'},
  cursor: {in: 'query', schema: {type: 'string'}, description: '이전 응답의 nextCursor'},
  catalogVersion: {in: 'query', schema: {type: 'string'}, description: '기대하는 카탈로그 버전. 지원 범위 밖이거나 서버가 제공하는 값과 다르면 거부한다.'},
};
const pick = (...names) => names.map(name => ({name, ...GET_PARAMS[name]}));
const FIELDS_PARAM = {name: 'fields', ...GET_PARAMS.fields};
const VERSION_PARAM = {name: 'catalogVersion', ...GET_PARAMS.catalogVersion};

/** 고정된 인자를 쿼리로 또 받았을 때의 거부. */
function forbid(args, ...names) {
  for (const n of names) if (Object.hasOwn(args, n)) return bad(`$args.${n}`, `${n} 은(는) 이 경로에서 고정입니다. 쿼리로 보내지 마세요.`);
  return null;
}

const catalogRead = fixedKind => ({
  parse: ({url}) => {
    const {args, catalogVersion} = queryToArgs(url);
    if (fixedKind) { const e = forbid(args, 'kind'); if (e) return {reject: e}; args.kind = fixedKind; }
    return {args, catalogVersion};
  },
  call: args => listCatalog(args),
});

/** @typedef {{id: string, method: 'GET'|'POST', path: string, summary: string, description?: string, parameters?: object[], body?: {required: string[], properties: object, oneOf?: string[][]}, cost?: number, parse: Function, call: Function}} Operation */

/** @type {Operation[]} */
export const OPERATIONS = [
  {
    id: 'getCatalog', method: 'GET', path: '/api/v1/catalog', summary: '카탈로그 부분 조회',
    description: 'kind 로 종류를 고르고 filter·query·fields·limit·cursor 로 필요한 조각만 받습니다. 전체 카탈로그(약 780KB)는 돌려주지 않습니다.',
    parameters: pick('kind', 'filter', 'query', 'fields', 'limit', 'cursor', 'catalogVersion'), ...catalogRead(null),
  },
  {
    id: 'listThemes', method: 'GET', path: '/api/v1/themes', summary: '테마 목록', description: '`/api/v1/catalog?kind=themes` 와 같은 조회. kind 는 고정입니다.',
    parameters: pick('filter', 'query', 'fields', 'limit', 'cursor', 'catalogVersion'), ...catalogRead('themes'),
  },
  {
    id: 'listComponents', method: 'GET', path: '/api/v1/components', summary: '부품 목록', description: '`/api/v1/catalog?kind=components` 와 같은 조회. kind 는 고정입니다.',
    parameters: pick('filter', 'query', 'fields', 'limit', 'cursor', 'catalogVersion'), ...catalogRead('components'),
  },
  {
    id: 'getComponent', method: 'GET', path: '/api/v1/components/{id}', summary: '부품 명세 하나',
    parameters: [{name: 'id', in: 'path', required: true, schema: {type: 'string'}, description: '부품 type(예 hero)'}, FIELDS_PARAM, VERSION_PARAM],
    parse: ({url, params}) => {
      const {args, catalogVersion} = queryToArgs(url);
      const e = forbid(args, 'type'); if (e) return {reject: e};
      args.type = params.id;
      return {args, catalogVersion};
    },
    call: args => getComponentSpec(args),
  },
  {
    id: 'getSchema', method: 'GET', path: '/api/v1/schema', summary: 'JSON Schema 조회',
    description: 'target 은 blueprint, component(type 필요), chrome, diagnostic, edit-ops. 교차 필드 규칙은 스키마가 아니라 검증기가 판정하며 응답의 `x-runtimeRules` 에 목록이 있습니다.',
    parameters: [
      {name: 'target', in: 'query', required: true, schema: {type: 'string', enum: ['blueprint', 'component', 'chrome', 'diagnostic', 'edit-ops']}, description: '조회할 스키마'},
      {name: 'type', in: 'query', schema: {type: 'string'}, description: 'target=component 일 때 부품 type'}, FIELDS_PARAM, VERSION_PARAM,
    ],
    parse: ({url}) => queryToArgs(url),
    call: args => getSchema(args),
  },
  {
    id: 'validateBlueprint', method: 'POST', path: '/api/v1/validate', summary: 'Blueprint 검증', cost: COST.validate,
    description: '규칙을 어기면 422 와 함께 수정 가능한 오류 목록(code, path, message, hint, 가능하면 fix)을 돌려줍니다. 문서를 고치지 않습니다.',
    body: {required: ['blueprint'], properties: {blueprint: {type: 'object', description: 'Blueprint JSON (스키마: GET /api/v1/schema?target=blueprint)'}, catalogVersion: {type: 'string'}}},
    parse: ({body}) => ({args: {blueprint: body.blueprint, opts: body.catalogVersion === undefined ? undefined : {catalogVersion: body.catalogVersion}}}),
    call: ({blueprint, opts}) => validateBlueprint(blueprint, opts),
  },
  {
    id: 'compileBlueprint', method: 'POST', path: '/api/v1/compile', summary: 'Blueprint 컴파일', cost: COST.compile,
    description: '검증을 통과해야 컴파일됩니다. 실패하면 422 와 구조화된 오류만 돌려주고 내용을 고쳐 성공시키지 않습니다.',
    body: {required: ['blueprint'], properties: {
      blueprint: {type: 'object', description: 'Blueprint JSON'},
      include: {type: 'array', items: {type: 'string', enum: ['html', 'css', 'tokens', 'manifest', 'files']}, description: '결과에 넣을 항목(기본 html, css, tokens, manifest)'},
      html: {type: 'string', enum: ['full', 'summary', 'omit'], description: 'HTML 본문 모드(기본 full)'},
      maxBytes: {type: 'integer', minimum: 1, description: '본문 텍스트 하나의 최대 UTF-8 바이트. 넘으면 싣지 않고 경고'},
      catalogVersion: {type: 'string'},
    }},
    parse: ({body}) => {
      const {blueprint, ...rest} = body;
      return {args: {blueprint, opts: {...rest, hash: sha256}}};
    },
    call: ({blueprint, opts}) => compileBlueprint(blueprint, opts),
  },
  {
    id: 'explainDecisions', method: 'POST', path: '/api/v1/explain', summary: '디자인 결정 설명', cost: COST.explain,
    description: 'blueprint 와 manifest 중 정확히 하나를 보냅니다. 컴파일러가 남긴 기록만 근거로 합니다.',
    body: {required: [], oneOf: [['blueprint'], ['manifest']], properties: {
      blueprint: {type: 'object'}, manifest: {type: 'object', description: '컴파일 결과의 manifest'},
      path: {type: 'string', description: '이 경로 아래 노드의 결정만(예 $.tree.children[1])'}, rule: {type: 'string', description: '이 규칙 ID 가 적용된 결정만'},
      level: {type: 'string', enum: ['summary', 'full']}, catalogVersion: {type: 'string'},
    }},
    parse: ({body}) => {
      const {blueprint, manifest, catalogVersion, ...opts} = body;
      const subject = {};
      if (blueprint !== undefined) subject.blueprint = blueprint;
      if (manifest !== undefined) subject.manifest = manifest;
      return {args: {subject, opts}, catalogVersion};
    },
    call: ({subject, opts}) => explainDecisions(subject, opts),
  },
];

/** 요청 본문의 최상위 모양만 본다: 객체인가, 허용 키만 있는가, 필수 키가 있는가. 값의 의미는 서비스가 판정한다. */
export function checkBodyShape(op, body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return bad('$body', '본문은 JSON 객체여야 합니다.');
  const allowed = Object.keys(op.body.properties);
  const extra = Object.keys(body).find(k => !allowed.includes(k));
  if (extra !== undefined) return bad(`$body.${extra}`, `알 수 없는 속성: ${extra}`, `허용 속성: ${allowed.join(', ')}`);
  const missing = op.body.required.find(k => body[k] === undefined);
  if (missing !== undefined) return bad(`$body.${missing}`, `${missing} 가 필요합니다.`);
  return null;
}

export {rejectUnexpectedVersion};
