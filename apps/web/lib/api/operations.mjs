// REST v1 의 작업 표. 각 작업은 src/service 함수 하나를 부르는 얇은 어댑터이고, 같은 표에서 OpenAPI 문서를 만든다.
// 비즈니스 규칙(허용 필터, 필드 이름, 범위, 오류 문구)은 서비스가 판정한다. 여기서는 URL·JSON 을 서비스 인자로 옮기기만 한다.
import {
  CATALOG_KINDS, compileBlueprint, explainDecisions, getComponentSpec, getSchema, listCatalog, validateBlueprint, assembleBlueprint, assembleDesign, listMaterials, getMaterial,
  listPlatformMaterials, getPlatformMaterial, recommendMaterials, checkCompatibility, proposeSubtokenSets, assembleComponents, listEditOps, applyEdit,
} from '@winterholic/design-system-static-kit/service';
import {COST} from './limits.mjs';
import {channelError} from './diagnostics.mjs';
import {sha256} from './hash.mjs';
import {rejectUnexpectedVersion, listArgs, schemaArgs} from './versions.mjs';

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
    return {args: listArgs(args, catalogVersion), catalogVersion};
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
      if (catalogVersion !== undefined) args.catalogVersion = catalogVersion;
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
    parse: ({url}) => { const {args, catalogVersion} = queryToArgs(url); return {args: schemaArgs(args, catalogVersion), catalogVersion}; },
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
  {
    id: 'assembleDesign', method: 'POST', path: '/api/v1/assemble', summary: '디자인 조립(플랫폼): 목적·콘텐츠 → 복수 후보', cost: COST.assemble,
    description: '목적(purpose)과 콘텐츠로 페이지를 조립해 후보를 최대 8개까지 돌려줍니다. 후보마다 호환 검사, 품질 검사, 추천 이유(decisions[].reasons), value(html·css·tokens·manifest·blueprint)가 있고, 막힌 재료와 조합은 blocked에 이유와 함께 나옵니다. value.blueprint는 Blueprint 2.7.0이라 POST /api/v1/compile로 같은 출력을 다시 만들 수 있습니다. AI가 HTML·CSS를 만들지 않습니다: 모든 출력은 등록된 재료의 구현에서 나옵니다.',
    body: {passthrough: true, required: ['purpose'], properties: {
      purpose: {type: 'string', enum: ['saas-landing', 'work-dashboard', 'editorial-docs', 'commerce'], description: '페이지 목적'},
      pattern: {type: 'string', description: '레이아웃 패턴(목적이 허용하는 것). 없으면 콘텐츠 양이 고른다'},
      content: {type: 'object', description: '콘텐츠 구조: title, description, kpis, table, charts, list, hero, features, faq, cta, sections, products, status 등'},
      components: {type: 'array', items: {type: 'object'}, description: '[{base, family?, props?, content, slot?}] 기반 컴포넌트를 슬롯에 놓는다'},
      shell: {type: 'string'}, width: {type: 'string'}, density: {type: 'string'}, mode: {type: 'string', enum: ['light', 'dark']},
      styleContext: {type: 'string'}, palette: {type: 'string'}, subtokenSet: {type: 'string'}, typeSystem: {type: 'string'},
      families: {type: 'array', items: {type: 'string'}}, surface: {type: 'string'}, motion: {type: 'string'}, background: {type: 'string'}, media: {type: 'string'},
      states: {type: 'object', description: '{empty?, loading?, error?, success?: 상태 패턴 id}'},
      candidates: {type: 'integer', minimum: 1, maximum: 8, description: '후보 수(기본 3)'},
      include: {type: 'array', items: {type: 'string', enum: ['html', 'css', 'tokens', 'manifest', 'blueprint', 'script', 'standalone']}, description: '후보마다 value에 넣을 항목(기본 html, css, tokens, manifest, blueprint)'},
    }},
    parse: ({body}) => { const {include, ...request} = body; return {args: {request, opts: include === undefined ? undefined : {include}}}; },
    call: ({request, opts}) => assembleDesign(request, opts),
  },
  {
    id: 'assembleBlueprint', method: 'POST', path: '/api/v1/assemble-blueprint', summary: '프로파일 조립(2.6.0 Blueprint)', cost: COST.assemble,
    description: '디자인 프로파일로 2.6.0 Blueprint를 조립합니다. 지원하지 않는 요구는 다른 값으로 바꾸지 않고 ASSEMBLE_* 진단과 대안으로 돌려줍니다.',
    body: {passthrough: true, required: ['profile'], properties: {profile: {type: 'string'}, intent: {type: 'object'}, content: {type: 'object'}}},
    parse: ({body}) => ({args: body}),
    call: args => assembleBlueprint(args),
  },
  {
    id: 'listMaterials', method: 'GET', path: '/api/v1/materials', summary: '재료 목록(2.6.0 카탈로그 재료)',
    description: 'kind·category·context·minQuality·tag·preset·since·query로 거르고 fields·limit·cursor로 필요한 조각만 받습니다.',
    parameters: [...['kind', 'category', 'context', 'minQuality', 'tag', 'since', 'query'].map(name => ({name, in: 'query', schema: {type: 'string'}})), {name: 'preset', in: 'query', schema: {type: 'boolean'}, description: 'true면 완성 프리셋만'}, ...pick('fields', 'limit', 'cursor')],
    parse: ({url}) => { const {args} = queryToArgs(url); if (args.preset === 'true' || args.preset === 'false') args.preset = args.preset === 'true'; return {args}; },
    call: args => listMaterials(args),
  },
  {
    id: 'getMaterial', method: 'GET', path: '/api/v1/materials/{id}', summary: '재료 한 장(2.6.0 카탈로그 재료)',
    parameters: [{name: 'id', in: 'path', required: true, schema: {type: 'string'}, description: '재료 id(예 component:select-control)'}],
    parse: ({url, params}) => { const {args} = queryToArgs(url); const e = forbid(args, 'id'); if (e) return {reject: e}; args.id = params.id; return {args}; },
    call: args => getMaterial(args),
  },
  {
    id: 'listPlatformMaterials', method: 'GET', path: '/api/v1/platform/materials', summary: '플랫폼 재료 목록(팔레트·세트·서체·패밀리·스타일 재료·레이아웃)',
    description: '조립 플랫폼이 쓰는 재료입니다. kind는 style-context, palette, subtoken-set, type-system, base-component, family(시각), purpose-family(목적), axis-value, surface, motion, background, media, state-pattern, layout(레이아웃 패턴 24종: 슬롯 계약과 폭 구간별 배치).',
    parameters: [...['kind', 'context', 'tag', 'query'].map(name => ({name, in: 'query', schema: {type: 'string'}})), ...pick('fields', 'limit', 'cursor')],
    parse: ({url}) => ({args: queryToArgs(url).args}),
    call: args => listPlatformMaterials(args),
  },
  {
    id: 'getPlatformMaterial', method: 'GET', path: '/api/v1/platform/materials/{id}', summary: '플랫폼 재료 한 장과 관계',
    parameters: [{name: 'id', in: 'path', required: true, schema: {type: 'string'}, description: '재료 id(예 palette:static-kit)'}],
    parse: ({url, params}) => { const {args} = queryToArgs(url); const e = forbid(args, 'id'); if (e) return {reject: e}; args.id = params.id; return {args}; },
    call: args => getPlatformMaterial(args),
  },
  {
    id: 'proposeSubtokenSets', method: 'POST', path: '/api/v1/platform/propose-subtoken-sets', summary: '사용자 색 시드로 서브토큰 세트 제안', cost: COST.validate,
    description: 'hex 시드 3~6개를 요청 안에서만 평가합니다. 등록하거나 저장하지 않으며 통과·거부 세트와 모드별 토큰 미리보기를 돌려줍니다.',
    body: {passthrough: true, required: ['seeds'], properties: {seeds: {type: 'array', minItems: 3, maxItems: 6, items: {type: 'string', pattern: '^#[0-9A-Fa-f]{6}$'}}}},
    parse: ({body}) => ({args: body}), call: args => proposeSubtokenSets(args),
  },
  {
    id: 'assembleComponents', method: 'POST', path: '/api/v1/platform/assemble-components', summary: '목적 패밀리 조립·독립 시연', cost: COST.assemble,
    description: '등록된 목적 패밀리와 선택한 액션 컴포넌트를 Core 조립기로 렌더해 html·css·script·manifest·standalone을 돌려줍니다. seeds를 주면 해당 요청에서만 사용자 팔레트를 평가합니다.',
    body: {passthrough: true, required: ['context', 'items'], properties: {context: {type: 'string'}, mode: {type: 'string', enum: ['light', 'dark']}, density: {type: 'string', enum: ['compact', 'comfortable', 'spacious']}, styleContext: {type: 'string'}, palette: {type: 'string'}, subtokenSet: {type: 'string'}, typeSystem: {type: 'string'}, seeds: {type: 'array', minItems: 3, maxItems: 6, items: {type: 'string'}}, actions: {type: 'array', maxItems: 12, items: {type: 'object', required: ['component'], properties: {component: {type: 'string', enum: ['component:button', 'component:icon-button', 'component:link-button', 'component:toggle-button', 'component:split-button', 'component:menu-button', 'component:floating-action-button', 'component:button-group', 'component:segmented-control', 'component:copy-button', 'component:close-button', 'component:loading-action-button']}, props: {type: 'object'}}}}, items: {type: 'array', minItems: 1, maxItems: 8, items: {type: 'object', required: ['purpose', 'visual'], properties: {purpose: {type: 'string'}, visual: {type: 'string'}, variant: {type: 'object'}, props: {type: 'object'}, content: {type: 'object'}, id: {type: 'string'}}}}}},
    parse: ({body}) => ({args: body}), call: args => assembleComponents(args),
  },
  {
    id: 'recommendMaterials', method: 'POST', path: '/api/v1/recommend', summary: '재료 추천', cost: COST.validate,
    description: '한 종류의 재료를 맥락·이미 고른 재료에 비춰 점수 순으로 돌려줍니다. 막힌 후보는 blocked에 코드와 이유가 있습니다.',
    body: {passthrough: true, required: ['kind'], properties: {kind: {type: 'string'}, context: {type: 'string'}, mode: {type: 'string', enum: ['light', 'dark']}, density: {type: 'string'}, styleContext: {type: 'string'}, selected: {type: 'array', items: {type: 'string'}}, fit: {type: 'boolean'}}},
    parse: ({body}) => ({args: body}),
    call: args => recommendMaterials(args),
  },
  {
    id: 'checkCompatibility', method: 'POST', path: '/api/v1/compatibility', summary: '재료 묶음 호환성', cost: COST.validate,
    description: '재료 id 둘 이상이 함께 쓸 수 있는지 판정합니다. 위반은 code·reason과 함께, 적용된 관계와 계산 관계 결과를 함께 돌려줍니다.',
    body: {passthrough: true, required: ['ids'], properties: {ids: {type: 'array', items: {type: 'string'}}, context: {type: 'string'}, mode: {type: 'string', enum: ['light', 'dark']}, density: {type: 'string'}}},
    parse: ({body}) => ({args: body}),
    call: args => checkCompatibility(args),
  },
  {
    id: 'listEditOps', method: 'GET', path: '/api/v1/edit/ops', summary: '편집 연산 목록',
    parse: () => ({args: undefined}), call: () => listEditOps(),
  },
  {
    id: 'applyEdit', method: 'POST', path: '/api/v1/edit', summary: 'Blueprint 편집 연산 적용', cost: COST.validate,
    description: 'steps의 연산을 차례로 적용합니다. 하나라도 실패하면 아무것도 적용하지 않습니다. 결과 문서는 검증하지 않으므로 POST /api/v1/validate로 확인하세요.',
    body: {passthrough: true, required: ['blueprint', 'steps'], properties: {blueprint: {type: 'object'}, steps: {type: 'array', items: {type: 'object'}, description: '[{op, args?}] 최대 50개'}}},
    parse: ({body}) => ({args: body}),
    call: args => applyEdit(args),
  },
];

/** 요청 본문의 최상위 모양만 본다: 객체인가, 허용 키만 있는가, 필수 키가 있는가. 값의 의미는 서비스가 판정한다. */
export function checkBodyShape(op, body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return bad('$body', '본문은 JSON 객체여야 합니다.');
  const allowed = Object.keys(op.body.properties);
  // passthrough 작업은 모르는 키와 빠진 필수 키를 서비스로 넘겨 서비스의 진단(path·hint·대안)을 그대로 받는다(채널이 같은 거부 문장을 내게 한다).
  const extra = op.body.passthrough ? undefined : Object.keys(body).find(k => !allowed.includes(k));
  if (extra !== undefined) return bad(`$body.${extra}`, `알 수 없는 속성: ${extra}`, `허용 속성: ${allowed.join(', ')}`);
  const missing = op.body.passthrough ? undefined : op.body.required.find(k => body[k] === undefined);
  if (missing !== undefined) return bad(`$body.${missing}`, `${missing} 가 필요합니다.`);
  return null;
}

export {rejectUnexpectedVersion};
