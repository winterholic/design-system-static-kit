import 'server-only';
import {CONTRACT_VERSION, PLATFORM_CONTRACT_VERSION, getComponentSpec, getMaterial, getPlatformMaterial, listCatalog, listPlatformMaterials} from '@winterholic/design-system-static-kit/service';
import {recordCompile} from '@/features/perf/counter.server';
import {LruCache} from '@/lib/api/cache.mjs';
import {exportComponentView} from '@/lib/api/preview-recipes.mjs';
import {playgroundContract} from './playground.server';

// 부품 화면의 모든 데이터는 getComponentSpec·listCatalog 에서 온다. 카탈로그에 없는 변형·속성·관계는 만들지 않는다.
// 렌더 결과는 Blueprint 를 직접 쓰지 않고 ./edit 연산(resetDocument, insertNode, removeNode, updateNode)으로 만든 문서의 컴파일 결과다.

type Json = Record<string, any>;
type Row = Record<string, any>;

const GROUP_LABEL: Record<string, string> = {
  structure: '페이지 구조', layout: '배치', content: '내용', data: '데이터', form: '입력', feedback: '상태·피드백', media: '미디어', nav: '탐색',
};
export const groupLabel = (id: string) => GROUP_LABEL[id] ?? id;

const call = <T>(r: unknown, what: string): T => {
  const x = r as {ok: boolean; value: T; errors?: {message: string}[]};
  if (!x.ok) throw new Error(`${what}: ${x.errors?.[0]?.message}`);
  return x.value;
};

export type ComponentRow = {type: string; label: string; group: string; childTypes: string[]; since?: string};
let listCache: ComponentRow[] | null = null;
export function componentRows(): ComponentRow[] {
  return listCache ??= call<{items: ComponentRow[]}>(listCatalog({kind: 'components', filter: {catalogVersion: '2.6.0'}, fields: ['type', 'label', 'group', 'childTypes', 'since'], limit: 200}), 'listCatalog(components@2.6.0)').items;
}

type MaterialView = {
  id: string; kind: string; category: string; version: string; since: string; contexts: string[]; quality: {status: string; evidence: string[]}; preset: boolean;
  defaults: Row; variants: Record<string, (string | number | boolean)[]>;
  states: {values: string[]; transitions: Row[]}; responsive: {strategy: string; breakpoints?: string[]; note?: string};
  tokens: string[]; tags: string[]; a11y: Row; structure: Row; validation: Row;
  purposeContracts: {id: string; label: string; forbidden: {id: string; why: string}[]; needs: Row}[];
  blueprint: {node?: string; field?: string; value?: string | null; since: string | null} | null;
};
const purposeContracts = new LruCache(200);
const materialView = (id: string): MaterialView | null => {
  const result = getMaterial({id: `component:${id}`}) as {ok: boolean; value?: MaterialView};
  if (!result.ok) return null;
  if (!purposeContracts.has(id)) {
    const base = getPlatformMaterial({id: `base-component:${id}`}) as {ok: boolean; value?: Row};
    const purposeIds = base.ok ? [...new Set((base.value?.edges?.to ?? []).map((edge: Row) => edge.from).filter((value: string) => value?.startsWith('purpose:')))] : [];
    const purposes = purposeIds.flatMap(purposeId => {
      const detail = getPlatformMaterial({id: purposeId}) as {ok: boolean; value?: Row};
      return detail.ok && detail.value ? [{id: purposeId, label: detail.value.label, forbidden: detail.value.forbidden ?? [], needs: detail.value.needs ?? {}}] : [];
    });
    purposeContracts.set(id, purposes);
  }
  return {...result.value!, purposeContracts: purposeContracts.get(id) ?? []};
};

/** JSON Schema 조각을 사람이 읽는 (형태, 제약) 으로 줄인다. 스키마에 있는 제약만 쓴다. */
export function describeSchema(s: Json): {kind: string; detail: string[]} {
  const detail: string[] = [];
  if (s.enum) return {kind: '선택', detail: s.enum.map(String)};
  if (s.type === 'string') {
    if (s.minLength || s.maxLength) detail.push(`${s.minLength ?? 0}~${s.maxLength}자`);
    if (s.pattern) detail.push(`형식 ${s.pattern}`);
    return {kind: '문자열', detail};
  }
  if (s.type === 'integer' || s.type === 'number') {
    if (s.minimum !== undefined || s.maximum !== undefined) detail.push(`${s.minimum ?? ''}~${s.maximum ?? ''}`);
    return {kind: s.type === 'integer' ? '정수' : '숫자', detail};
  }
  if (s.type === 'boolean') return {kind: '참/거짓', detail};
  if (s.type === 'array') {
    detail.push(`항목 ${s.minItems ?? 0}~${s.maxItems ?? '제한 없음'}개`);
    const inner = s.items ? describeSchema(s.items) : null;
    if (inner) detail.push(inner.kind === '객체' ? `항목: ${inner.detail.join(', ')}` : `항목: ${inner.kind}${inner.detail.length ? ' ' + inner.detail.join(' / ') : ''}`);
    return {kind: '목록', detail};
  }
  if (s.type === 'object') {
    const req = new Set<string>(s.required ?? []);
    return {kind: '객체', detail: Object.keys(s.properties ?? {}).map(k => (req.has(k) ? `${k}*` : k))};
  }
  return {kind: String(s.type ?? '값'), detail};
}

export type Field = {name: string; required: boolean; kind: string; detail: string[]};

export type ComponentView = {
  type: string; label: string; group: string; groupLabel: string;
  fields: Field[];
  children: {allowed: string[]; min: number; max: number} | null;
  parents: string[];
  pageTypes: {requiredBy: string[]; forbiddenIn: string[]};
  example: Json | null;
  variants: {id: string; ok: boolean; reason?: string}[];
  material: MaterialView | null;
  variantGroups: {name: string; values: (string | number | boolean)[]; defaultValue: string | number | boolean; availability: {value: string | number | boolean; ok: boolean; reason?: string}[]}[];
  limitations: string[];
  related: {type: string; label: string}[];
  playground: import('./playground.server').PlaygroundContract;
};

type RawView = Omit<ComponentView, 'variants' | 'limitations' | 'playground'> & {variantIds: string[]};
function rawView(type: string): RawView | null {
  const row = componentRows().find(r => r.type === type);
  if (!row) return null;
  const material = row.since ? materialView(type) : null;
  const spec = call<Json>(getComponentSpec({type, ...(row.since ? {catalogVersion: row.since} : {})}), `getComponentSpec(${type})`);
  const required = new Set<string>(spec.required);
  const fields = Object.entries(spec.fields as Json).map(([name, schema]) => ({name, required: required.has(name), ...describeSchema(schema)}));
  const parents = componentRows().filter(r => r.childTypes.includes(type)).map(r => r.type);
  const pageRows = call<{items: Row[]}>(listCatalog({kind: 'pageTypes', fields: ['id', 'label'], limit: 50}), 'listCatalog(pageTypes)').items;
  const label = (id: string) => pageRows.find(p => p.id === id)?.label ?? id;
  const children = spec.children as ComponentView['children'];
  // 관련 부품: 허용 부모와 자식을 먼저, 모자라면 같은 묶음. 카탈로그가 말하는 관계만 쓴다.
  const kin = [...new Set([...parents, ...(children?.allowed ?? [])])].filter(t => t !== type && t !== 'page');
  const sameGroup = componentRows().filter(r => r.group === row.group && r.type !== type && !kin.includes(r.type)).map(r => r.type);
  const related = [...kin.slice(0, 5), ...sameGroup].slice(0, 6).map(t => ({type: t, label: componentRows().find(r => r.type === t)!.label}));
  const variantGroups = material ? Object.entries(material.variants).map(([name, values]) => ({name, values, defaultValue: material.defaults[name], availability: values.map(value => ({value, ok: true}))})) : [];
  return {
    type, label: row.label, group: row.group, groupLabel: groupLabel(row.group), fields, children, parents,
    pageTypes: {requiredBy: (spec.pageTypes.requiredBy as string[]).map(label), forbiddenIn: (spec.pageTypes.forbiddenIn as string[]).map(label)},
    example: spec.example ?? null,
    variantIds: (spec.fields as Json).variant?.enum ?? [],
    related, material, variantGroups,
  };
}

export type ComponentSummary = {
  type: string;
  label: string;
  group: string;
  groupLabel: string;
  since?: string;
  material: MaterialView | null;
  variantCount: number;
  variantGroupCount: number;
  hasExample: boolean;
};

const summaryCache: any = new LruCache(1000);
const viewCache: any = new LruCache(1000);

export function componentSummary(type: string): ComponentSummary | null {
  if (summaryCache.has(type)) return summaryCache.get(type)!;
  const raw = rawView(type);
  if (!raw) {
    summaryCache.set(type, null);
    return null;
  }
  const row = componentRows().find(r => r.type === type);
  const summary: ComponentSummary = {
    type: raw.type,
    label: raw.label,
    group: raw.group,
    groupLabel: raw.groupLabel,
    since: row?.since,
    material: raw.material,
    variantCount: raw.variantIds.length,
    variantGroupCount: raw.variantGroups.length,
    hasExample: !!raw.example,
  };
  summaryCache.set(type, summary);
  return summary;
}

/** 변형은 카탈로그가 선언한 값 전부를 싣고, 예제 데이터로 만들 수 있는지(ok)와 못 만드는 이유를 함께 싣는다. */
export function componentView(type: string): ComponentView | null {
  if (viewCache.has(type)) return viewCache.get(type)!;
  const raw = rawView(type);
  let view: ComponentView | null = null;
  if (raw) {
    const {variantIds, ...rest} = raw;
    view = {
      ...rest,
      // 옵션의 적합성은 선택된 하나를 Core에 전달해 확인한다. 페이지 진입 때 전체 변형을 컴파일하지 않는다.
      variants: variantIds.map(id => ({id, ok: true})),
      variantGroups: raw.variantGroups,
      playground: playgroundContract(type),
      limitations: raw.material?.tags.filter(tag => tag.startsWith('forbidden:') || tag.startsWith('unsupported:')).map(tag => tag.replace(/^(?:forbidden|unsupported):/, '')) ?? [],
    };
  }
  viewCache.set(type, view);
  return view;
}

// ---------------------------------------------------------------- 렌더

// 렌더 절차는 사전 생성(scripts/build-catalog-index.mjs)과 같은 모듈을 쓴다. 목록 그림과 상세 화면이 어긋나지 않게 하려는 것이다.
export type Rendered = {ok: true; html: string; mode: 'isolated' | 'template' | 'platform'; template?: string} | {ok: false; reason: string};

const compiledCache: any = new LruCache(64);
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const compileKey = (type: string, variant?: string | Row) => `${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}:${type}:${JSON.stringify(canonical(variant ?? null))}`;

export function renderComponent(type: string, variant?: string | Row): Rendered {
  const result = exportComponent(type, variant);
  if (!result.ok) return result;
  return {ok: true, html: result.files['index.html'], mode: result.mode ?? 'isolated'};
}

export function exportComponent(type: string, variant?: string | Row) {
  const key = compileKey(type, variant);
  const hit = compiledCache.get(key);
  if (hit) return hit;
  const view = rawView(type);
  const result = view ? exportComponentView(view, variant, {onCompile: () => recordCompile('compileBlueprint')}) : {ok: false as const, reason: '알 수 없는 부품입니다.'};
  compiledCache.set(key, result);
  return result;
}

export function templateLabel(id: string): string {
  return call<{items: Row[]}>(listCatalog({kind: 'templates', fields: ['id', 'label'], limit: 200}), 'listCatalog(templates)').items.find(t => t.id === id)?.label ?? id;
}
