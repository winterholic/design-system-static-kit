/**
 * 카탈로그 조회: listCatalog, catalogSnapshot, getSchema, getComponentSpec.
 * 전체 카탈로그(약 780KB)를 항상 돌려주지 않는다. 종류·필터·검색어·필드 선택·쪽 나누기로 필요한 조각만 낸다.
 * 반환값은 모두 JSON으로 직렬화되는 새 객체다(카탈로그 객체는 얼어 있어 그대로 내보내지 않는다).
 */
import {
  CATALOG_VERSION, SUPPORTED_CATALOG_VERSIONS, ACCEPTED_CATALOG_VERSIONS, COMPOSITION_VERSION, compositionRules, pageRules, compositionCoverage, variantContracts, recipes, recipeRules, expressionRules, SINCE_FIELDS,
  themes, palettes, paletteFamilies, themeCategories, layoutOptionsOf, nodeSpecs, nodeTypes, requiredOf, chromeSpec, rules, axes, axisDefs, axisBans, pageTypes,
  templateList, templates, concepts, conceptsOfTemplate, iconNames, icons, blueprintSchema,
} from '../catalog.mjs';
import {recipePicks, recipeOfTemplate} from '../recipes.mjs';
import {opNames} from '../edit/index.mjs';
import {diagnostic} from './errors.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';

const has = (obj, key) => Object.hasOwn(obj, key);
const list = names => names.join(', ');

// ---------------------------------------------------------------- listCatalog

/**
 * 종류별 조회 명세. rows()는 전체 필드를 가진 행을 카탈로그 선언 순서로 만든다.
 * summary는 fields를 주지 않았을 때 나가는 요약 필드, all은 fields로 고를 수 있는 전체 필드다. 식별 필드(id)는 항상 나간다.
 * filters의 각 항목은 (행, 값) → 일치 여부이고, known은 값의 정의역(없으면 어떤 문자열이든 받고 빈 결과를 낸다)이다.
 */
const KINDS = {
  templates: {
    id: 'id', summary: ['id', 'label', 'pageType', 'theme', 'layoutSlotCount', 'recipe'], all: ['id', 'label', 'name', 'pageType', 'theme', 'layoutSlotCount', 'recipe', 'concepts'],
    rows: () => templateList.map(t => ({id: t.id, label: t.label, name: t.name, pageType: t.pageType, theme: t.theme, layoutSlotCount: layoutOptionsOf(t.id).length, recipe: recipeOfTemplate(t.id), concepts: conceptsOfTemplate(t.id)})),
    filters: {
      pageType: (r, v) => r.pageType === v,
      theme: {match: (r, v) => r.theme === v, known: v => has(themes, v), code: 'UNKNOWN_THEME'},
      concept: (r, v) => r.concepts.includes(v),
      recipe: (r, v) => r.recipe === v,
    },
  },
  themes: {
    id: 'id', summary: ['id', 'name', 'category', 'palettes'], all: ['id', 'name', 'category', 'description', 'palettes', 'defaults', 'forbid', 'variants'],
    rows: () => Object.values(themes).map(({id, name, category, description, palettes: p, defaults, forbid, variants}) => ({id, name, category, description, palettes: p, defaults, forbid, variants})),
    filters: {category: (r, v) => r.category === v},
  },
  palettes: {
    id: 'id', summary: ['id', 'name', 'label', 'theme', 'family', 'tone', 'brand'], all: ['id', 'name', 'label', 'theme', 'colors', 'brand', 'likes', 'family', 'tone', 'source'],
    rows: () => Object.values(palettes).map(({id, name, label, theme, colors, brand, likes, family, tone, source}) => ({id, name, label, theme, colors, brand, likes, family, tone, source})),
    filters: {
      family: (r, v) => r.family === v,
      tone: (r, v) => r.tone === v,
      theme: {match: (r, v) => r.theme === v, known: v => has(themes, v), code: 'UNKNOWN_THEME'},
    },
  },
  components: {
    id: 'type', summary: ['type', 'label', 'group'], all: ['type', 'label', 'group', 'required', 'optional', 'childTypes'],
    rows: () => nodeTypes.map(type => ({type, label: nodeSpecs[type].label, group: nodeSpecs[type].group, required: requiredOf(nodeSpecs[type]), optional: nodeSpecs[type].optional ?? [], childTypes: nodeSpecs[type].children ?? []})),
    filters: {group: (r, v) => r.group === v},
  },
  pageTypes: {
    id: 'id', summary: ['id', 'label', 'description', 'shells'], all: ['id', 'label', 'description', 'require', 'forbid', 'allow', 'shells', 'widths', 'maxChildren'],
    rows: () => Object.entries(pageTypes).map(([id, p]) => ({id, label: p.label, description: p.description, require: p.require ?? [], forbid: p.forbid ?? [], allow: p.allow ?? null, shells: p.shells, widths: p.widths ?? null, maxChildren: p.maxChildren ?? null})),
    filters: {shell: (r, v) => r.shells.includes(v)},
  },
  axes: {
    id: 'axis', summary: ['axis', 'label', 'values'], all: ['axis', 'label', 'values', 'descriptions'],
    rows: () => Object.keys(axes).map(axis => ({axis, label: axisDefs[axis].label, values: axes[axis], descriptions: axisDefs[axis].values})),
    filters: {},
  },
  concepts: {
    id: 'id', summary: ['id', 'label', 'description'], all: ['id', 'label', 'description', 'templates', 'looks'],
    rows: () => Object.entries(concepts).map(([id, c]) => ({id, label: c.label, description: c.description, templates: c.templates, looks: c.looks})),
    filters: {template: {match: (r, v) => r.templates.includes(v), known: v => has(templates, v), code: 'UNKNOWN_TEMPLATE'}},
  },
  recipes: {
    id: 'id', summary: ['id', 'label', 'pageTypes', 'templates'], all: ['id', 'label', 'purpose', 'pageTypes', 'templates', 'rules'],
    rows: () => Object.entries(recipes).map(([id, r]) => ({id, label: r.label, purpose: r.purpose, pageTypes: r.pageTypes, templates: r.templates, rules: r.rules})),
    filters: {pageType: (r, v) => r.pageTypes.includes(v), template: {match: (r, v) => r.templates.includes(v), known: v => has(templates, v), code: 'UNKNOWN_TEMPLATE'}},
  },
  icons: {
    id: 'id', summary: ['id'], all: ['id', 'paths'],
    rows: () => iconNames.map(id => ({id, paths: icons[id]})),
    filters: {},
  },
  rules: {
    id: 'id', summary: ['id', 'intent', 'codes'], all: ['id', 'intent', 'codes', 'source'],
    rows: () => rules.map(({id, intent, codes, source}) => ({id, intent, codes, source})),
    filters: {code: (r, v) => r.codes.includes(v)},
  },
  axisBans: {
    id: 'id', summary: ['id', 'uses', 'fix'], all: ['id', 'uses', 'fix', 'why', 'source'],
    rows: () => axisBans.map(({id, uses, fix, why, source}) => ({id, uses, fix, why, source})),
    filters: {axis: {match: (r, v) => r.uses.includes(v), known: v => has(axes, v), code: 'UNKNOWN_AXIS'}},
  },
  layoutSlots: {
    id: 'id', summary: ['id', 'label', 'optionIds'], all: ['id', 'label', 'optionIds', 'options'], needs: 'template',
    rows: filter => layoutOptionsOf(filter.template).map(s => ({id: s.id, label: s.label, optionIds: s.options.map(o => o.id), options: s.options})),
    filters: {template: {match: () => true, known: v => has(templates, v), code: 'UNKNOWN_TEMPLATE'}},
  },
};
export const CATALOG_KINDS = Object.freeze(Object.keys(KINDS));

const LIMIT_DEFAULT = 50, LIMIT_MAX = 200;
const normalizeFilter = f => (typeof f === 'function' ? {match: f} : f);

/**
 * 카탈로그 요약 목록.
 *   q.kind    (필수) CATALOG_KINDS 중 하나
 *   q.filter  {필터이름: 값}. 종류별 허용 이름은 거부될 때 hint로 알려 준다.
 *   q.query   id·이름 부분 일치(공백으로 나눈 단어를 모두 포함, 대소문자 무시)
 *   q.fields  나갈 필드 이름 배열(식별 필드는 항상 나간다). 없으면 종류별 요약 필드
 *   q.limit   1..200, 기본 50
 *   q.cursor  이전 응답의 nextCursor
 * 정렬은 카탈로그 선언 순서다.
 */
export function listCatalog(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', `예: {kind: "templates", filter: {pageType: "landing"}}`)]);
    const badKey = checkKeys(q, ['kind', 'filter', 'query', 'fields', 'limit', 'cursor'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.kind !== 'string' || !has(KINDS, q.kind)) return fail([diagnostic('UNKNOWN_KIND', '$args.kind', `알 수 없는 종류: ${String(q.kind)}`, `kind는 ${list(CATALOG_KINDS)} 중 하나입니다.`)]);
    const spec = KINDS[q.kind];

    const filter = q.filter === undefined ? {} : q.filter;
    if (!isPlain(filter)) return fail([badRequest('$args.filter', 'filter는 {이름: 문자열} 객체여야 합니다.')]);
    const active = [];
    for (const [name, value] of Object.entries(filter)) {
      if (!has(spec.filters, name)) return fail([badRequest(`$args.filter.${name}`, `${q.kind}에서 쓸 수 없는 필터: ${name}`, Object.keys(spec.filters).length ? `허용 필터: ${list(Object.keys(spec.filters))}` : `${q.kind}에는 필터가 없습니다.`)]);
      if (typeof value !== 'string' || !value) return fail([badRequest(`$args.filter.${name}`, '필터 값은 비지 않은 문자열이어야 합니다.')]);
      const f = normalizeFilter(spec.filters[name]);
      if (f.known && !f.known(value)) return fail([diagnostic(f.code, `$args.filter.${name}`, `알 수 없는 값: ${value}`)]);
      active.push(row => f.match(row, value));
    }
    if (spec.needs && !has(filter, spec.needs)) return fail([badRequest(`$args.filter.${spec.needs}`, `${q.kind} 조회에는 filter.${spec.needs}가 필요합니다.`, `예: {kind: "${q.kind}", filter: {${spec.needs}: "saas-landing"}}`)]);

    if (q.query !== undefined && typeof q.query !== 'string') return fail([badRequest('$args.query', 'query는 문자열이어야 합니다.')]);
    const words = (q.query === undefined ? '' : q.query).toLowerCase().split(/\s+/).filter(Boolean);

    let fields = spec.summary;
    if (q.fields !== undefined) {
      if (!Array.isArray(q.fields) || !q.fields.length) return fail([badRequest('$args.fields', 'fields는 비지 않은 문자열 배열이어야 합니다.', `허용 필드: ${list(spec.all)}`)]);
      const bad = q.fields.findIndex(f => typeof f !== 'string' || !spec.all.includes(f));
      if (bad >= 0) return fail([badRequest(`$args.fields[${bad}]`, `${q.kind}에 없는 필드: ${String(q.fields[bad])}`, `허용 필드: ${list(spec.all)}`)]);
      fields = [...new Set([spec.id, ...q.fields])];
    }

    const limit = q.limit === undefined ? LIMIT_DEFAULT : q.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > LIMIT_MAX) return fail([badRequest('$args.limit', `limit은 1~${LIMIT_MAX}의 정수입니다.`)]);
    let offset = 0;
    if (q.cursor !== undefined) {
      const m = typeof q.cursor === 'string' ? /^o(\d{1,9})$/.exec(q.cursor) : null;
      if (!m) return fail([badRequest('$args.cursor', 'cursor는 이전 응답의 nextCursor 값이어야 합니다.')]);
      offset = Number(m[1]);
    }

    const matched = spec.rows(filter).filter(row => active.every(f => f(row))).filter(row => {
      if (!words.length) return true;
      const hay = [row[spec.id], row.label, row.name].filter(x => typeof x === 'string').join(' ').toLowerCase();
      return words.every(w => hay.includes(w));
    });
    const page = matched.slice(offset, offset + limit);
    const next = offset + limit < matched.length ? 'o' + (offset + limit) : null;
    return ok({kind: q.kind, items: jsonClone(page.map(row => Object.fromEntries(fields.map(f => [f, row[f]])))), total: matched.length, nextCursor: next});
  });
}

// ---------------------------------------------------------------- catalogSnapshot

/**
 * `site/v1/catalog.json`과 바이트가 같게 직렬화되는 레거시 투영(scripts/build.mjs에서 옮겼다). 호환 게이트가 이 함수를 통과한다.
 * 크기가 크므로(약 780KB) 채널이 기본으로 부르는 함수가 아니다. 부분 조회는 listCatalog를 쓴다.
 */
export function catalogSnapshot() {
  return jsonClone({
    version: CATALOG_VERSION, supportedCatalogVersions: SUPPORTED_CATALOG_VERSIONS, acceptedCatalogVersions: ACCEPTED_CATALOG_VERSIONS,
    composition: {version: COMPOSITION_VERSION, rules: compositionRules, pageRules, coverage: compositionCoverage},
    variantContracts, recipes, recipeRules, expressionRules, recipePicks: recipePicks(), themeCategories,
    themes: Object.fromEntries(Object.entries(themes).map(([id, {covers, ...theme}]) => [id, theme])),
    palettes, paletteFamilies, axes, axisDefs,
    axisBans: axisBans.map(({id, uses, fix, why, source}) => ({id, uses, fix, why, source})),
    nodeSpecs, pageTypes, rules,
    templates: templateList.map(({id, label, pageType, theme}) => ({id, label, pageType, theme, layoutSlots: layoutOptionsOf(id)})),
    icons: iconNames,
  });
}

// ---------------------------------------------------------------- getSchema

const SCHEMA_TARGETS = ['blueprint', 'component', 'chrome', 'diagnostic', 'edit-ops'];
const DRAFT = 'https://json-schema.org/draft/2020-12/schema';
const str = {type: 'string', minLength: 1};
const DIAGNOSTIC_SCHEMA = {
  $schema: DRAFT, title: 'Static Kit Diagnostic', type: 'object', additionalProperties: false,
  properties: {
    code: {...str, pattern: '^[A-Z][A-Z0-9_]*$', description: '등록된 UPPER_SNAKE 코드'}, path: {...str, pattern: '^\\$', description: '문서 안 위치($.tree.children[1]) 또는 요청 인자($args.kind)'},
    message: {...str, description: '무엇이 틀렸는가'}, hint: {...str, description: '어떻게 고치는가. 비어 있지 않다'},
    rule: {type: 'string', description: '규칙 ID(예 R09, X05)'}, fix: {type: 'object', description: '기계가 읽는 대안 값(예 {elevation: "soft"})'},
    severity: {type: 'string', enum: ['info', 'warning'], description: '직접 적용한 품질 계약의 진단 수준'},
    contract: {...str, pattern: '^V[0-9]{2}$', description: '직접 적용한 변형 결과 계약 ID(예 V03)'},
  },
  required: ['code', 'path', 'message', 'hint'],
};

/** 스키마가 말하지 않는 교차 필드 규칙을 알린다. 스키마만으로 충분하다고 오해하지 않게 응답에 붙인다. */
const runtimeRules = () => [...rules, ...expressionRules].map(r => `${r.id}: ${r.codes.join(', ')}`);

const refsOf = schema => [...JSON.stringify(schema).matchAll(/"\$ref":"#\/\$defs\/([^"]+)"/g)].map(m => m[1]);
/** 남긴 부분이 가리키는 $defs만 남긴다. */
function pruneDefs(schema, defs) {
  const keep = {}, queue = refsOf(schema);
  while (queue.length) { const name = queue.pop(); if (has(keep, name) || !has(defs, name)) continue; keep[name] = defs[name]; queue.push(...refsOf(defs[name])); }
  return keep;
}

function pickFields(schema, fields, path, defs) {
  const names = Object.keys(schema.properties);
  if (fields === undefined) return [schema, null];
  if (!Array.isArray(fields) || !fields.length) return [null, badRequest(path, 'fields는 비지 않은 문자열 배열이어야 합니다.', `허용 필드: ${list(names)}`)];
  const bad = fields.findIndex(f => typeof f !== 'string' || !names.includes(f));
  if (bad >= 0) return [null, badRequest(`${path}[${bad}]`, `스키마에 없는 필드: ${String(fields[bad])}`, `허용 필드: ${list(names)}`)];
  const properties = Object.fromEntries(fields.map(f => [f, schema.properties[f]]));
  const out = {...schema, properties, required: schema.required.filter(r => fields.includes(r))};
  if (defs) { const kept = pruneDefs(properties, defs); if (Object.keys(kept).length) out.$defs = kept; else delete out.$defs; }
  return [out, null];
}

/**
 * JSON Schema(2020-12) 조회.
 *   target 'blueprint' | 'component'(type 필요) | 'chrome' | 'diagnostic' | 'edit-ops'
 *   fields 남길 최상위 속성 이름 배열(blueprint·component·chrome). 가리키지 않는 $defs는 뺀다.
 * blueprint·component·chrome 응답에는 x-runtimeRules를 붙인다. 교차 필드 규칙은 스키마가 아니라 런타임 검증기가 판정한다.
 * component 스키마의 자식 부품은 $ref로만 가리킨다. 자식은 따로 조회한다.
 */
export function getSchema(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', `예: {target: "blueprint"}`)]);
    const badKey = checkKeys(q, ['target', 'type', 'fields'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.target !== 'string' || !SCHEMA_TARGETS.includes(q.target)) return fail([badRequest('$args.target', `알 수 없는 target: ${String(q.target)}`, `허용값: ${list(SCHEMA_TARGETS)}`)]);
    if (q.target !== 'component' && q.type !== undefined) return fail([badRequest('$args.type', 'type은 target이 component일 때만 씁니다.')]);
    if (q.target === 'diagnostic' || q.target === 'edit-ops') if (q.fields !== undefined) return fail([badRequest('$args.fields', `${q.target}에는 fields를 쓸 수 없습니다.`)]);

    if (q.target === 'diagnostic') return ok(jsonClone(DIAGNOSTIC_SCHEMA));
    if (q.target === 'edit-ops') {
      // 연산별 인자 스키마는 편집 계층에 선언되어 있지 않다. 지어내지 않고 연산 이름과 호출 모양만 낸다.
      return ok({$schema: DRAFT, title: 'Static Kit edit steps', type: 'array', items: {type: 'object', additionalProperties: false, properties: {op: {enum: [...opNames]}, args: {type: 'object'}}, required: ['op']}, 'x-note': '연산별 args의 검사는 각 연산이 한다. 실패하면 errors에 코드·경로·hint가 담긴다.'});
    }
    const full = blueprintSchema();
    let schema, defs = null;
    if (q.target === 'blueprint') { schema = full; defs = full.$defs; }
    else if (q.target === 'chrome') schema = {$schema: DRAFT, title: 'Static Kit chrome', ...chromeSpec};
    else {
      if (typeof q.type !== 'string' || !q.type) return fail([badRequest('$args.type', 'component 스키마에는 type이 필요합니다.', 'listCatalog({kind: "components"})로 부품 type을 조회하세요.')]);
      if (!has(full.$defs, q.type)) return fail([diagnostic('UNKNOWN_COMPONENT', '$args.type', `알 수 없는 부품: ${q.type}`)]);
      schema = {$schema: DRAFT, title: 'Static Kit component ' + q.type, ...full.$defs[q.type]};
    }
    const [picked, bad] = pickFields(schema, q.fields, '$args.fields', defs);
    if (bad) return fail([bad]);
    return ok({...jsonClone(picked), 'x-runtimeRules': runtimeRules()});
  });
}

// ---------------------------------------------------------------- getComponentSpec

const SPEC_FIELDS = ['label', 'group', 'fields', 'required', 'optional', 'children', 'example', 'pageTypes', 'rules'];

/** 부품에 걸린다고 규칙 표 자체가 선언한 규칙 ID: 맥락 결정표(C##)의 when.type, 변형 결과 계약(V##)의 check.node. */
const expressionRulesOfComponent = type => [
  ...(SINCE_FIELDS.some(f => f.node === type) ? ['R21'] : []),
  ...(['hero', 'grid', 'section', 'page-header'].includes(type) ? ['R22'] : []),
];
const rulesOfComponent = type => [...compositionRules.filter(r => r.when.type === type).map(r => r.id), ...variantContracts.filter(v => v.check?.node === type).map(v => v.id), ...expressionRulesOfComponent(type)];

/**
 * 부품 명세. q.fields로 가져올 항목을 고른다(type은 항상 나간다). 허용 항목: label, group, fields(필드 스키마), required, optional,
 * children({allowed, min, max} 또는 null), example, pageTypes({requiredBy, forbiddenIn}), rules.
 */
export function getComponentSpec(q) {
  return guard(() => {
    if (!isPlain(q)) return fail([badRequest('$args', '조회 인자는 객체여야 합니다.', `예: {type: "hero"}`)]);
    const badKey = checkKeys(q, ['type', 'fields'], '$args');
    if (badKey) return fail([badKey]);
    if (typeof q.type !== 'string' || !q.type) return fail([badRequest('$args.type', 'type이 필요합니다.', 'listCatalog({kind: "components"})로 부품 type을 조회하세요.')]);
    if (!has(nodeSpecs, q.type)) return fail([diagnostic('UNKNOWN_COMPONENT', '$args.type', `알 수 없는 부품: ${q.type}`)]);
    let want = SPEC_FIELDS;
    if (q.fields !== undefined) {
      if (!Array.isArray(q.fields) || !q.fields.length) return fail([badRequest('$args.fields', 'fields는 비지 않은 문자열 배열이어야 합니다.', `허용 필드: ${list(SPEC_FIELDS)}`)]);
      const bad = q.fields.findIndex(f => typeof f !== 'string' || !SPEC_FIELDS.includes(f));
      if (bad >= 0) return fail([badRequest(`$args.fields[${bad}]`, `부품 명세에 없는 항목: ${String(q.fields[bad])}`, `허용 항목: ${list(SPEC_FIELDS)}`)]);
      want = SPEC_FIELDS.filter(f => q.fields.includes(f));
    }
    const spec = nodeSpecs[q.type], type = q.type;
    const all = {
      label: () => spec.label, group: () => spec.group, fields: () => spec.fields, required: () => requiredOf(spec), optional: () => spec.optional ?? [],
      children: () => (spec.children ? {allowed: spec.children, min: spec.min, max: spec.max} : null),
      example: () => spec.example ?? null,
      pageTypes: () => ({
        requiredBy: Object.entries(pageTypes).filter(([, p]) => (p.require ?? []).flat().includes(type)).map(([id]) => id),
        forbiddenIn: Object.entries(pageTypes).filter(([, p]) => (p.forbid ?? []).includes(type)).map(([id]) => id),
      }),
      rules: () => rulesOfComponent(type),
    };
    return ok(jsonClone({type, ...Object.fromEntries(want.map(f => [f, all[f]()]))}));
  });
}
