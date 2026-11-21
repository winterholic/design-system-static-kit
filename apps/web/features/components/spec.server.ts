import 'server-only';
import {compileBlueprint, getComponentSpec, listCatalog} from '@winterholic/design-system-static-kit/service';
import {insertNode, removeNode, resetDocument, updateNode} from '@winterholic/design-system-static-kit/edit';

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

export type ComponentRow = {type: string; label: string; group: string; childTypes: string[]};
let listCache: ComponentRow[] | null = null;
export function componentRows(): ComponentRow[] {
  return listCache ??= call<{items: ComponentRow[]}>(listCatalog({kind: 'components', fields: ['type', 'label', 'group', 'childTypes'], limit: 200}), 'listCatalog(components)').items;
}

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
  related: {type: string; label: string}[];
};

type RawView = Omit<ComponentView, 'variants'> & {variantIds: string[]};
function rawView(type: string): RawView | null {
  const row = componentRows().find(r => r.type === type);
  if (!row) return null;
  const spec = call<Json>(getComponentSpec({type}), `getComponentSpec(${type})`);
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
  return {
    type, label: row.label, group: row.group, groupLabel: groupLabel(row.group), fields, children, parents,
    pageTypes: {requiredBy: (spec.pageTypes.requiredBy as string[]).map(label), forbiddenIn: (spec.pageTypes.forbiddenIn as string[]).map(label)},
    example: spec.example ?? null,
    variantIds: (spec.fields as Json).variant?.enum ?? [],
    related,
  };
}

const viewCache = new Map<string, ComponentView | null>();
/** 변형은 카탈로그가 선언한 값 전부를 싣고, 예제 데이터로 만들 수 있는지(ok)와 못 만드는 이유를 함께 싣는다. */
export function componentView(type: string): ComponentView | null {
  if (viewCache.has(type)) return viewCache.get(type)!;
  const raw = rawView(type);
  let view: ComponentView | null = null;
  if (raw) {
    const {variantIds, ...rest} = raw;
    view = {...rest, variants: variantIds.map(id => { const r = renderRaw(raw, id); return r.ok ? {id, ok: true} : {id, ok: false, reason: r.reason}; })};
  }
  viewCache.set(type, view);
  return view;
}

// ---------------------------------------------------------------- 렌더

const BASE = {template: 'about-team', theme: 'workspace'};

export type Rendered = {ok: true; html: string; mode: 'isolated' | 'template'; template?: string} | {ok: false; reason: string};

/** 이 부품이 들어 있는 첫 템플릿(카탈로그 순). 예제 노드가 없거나 단독으로 놓을 수 없는 부품의 대체 렌더다. */
function templateUsing(type: string): string | null {
  const templates = call<{items: Row[]}>(listCatalog({kind: 'templates', fields: ['id'], limit: 200}), 'listCatalog(templates)').items;
  const has = (nodes: Json[] | undefined): boolean => !!nodes?.some(n => n.type === type || has(n.children));
  for (const t of templates) {
    const made = resetDocument(null, {template: t.id});
    if (made.ok && has((made.doc as Json).tree.children)) return t.id;
  }
  return null;
}

const compileHtml = (doc: unknown): string | null => {
  const r = compileBlueprint(doc, {include: ['html']}) as {ok: boolean; value?: {html: string}};
  return r.ok ? r.value!.html : null;
};

/** 머리글 + 이 부품 하나로 이루어진 페이지(page 는 children 이 2개 이상이어야 한다). variant 가 있으면 그 변형을 쓴다. */
function isolatedDoc(type: string, example: Json, variant?: string): {doc: unknown} | {error: string} {
  const made = resetDocument(null, BASE);
  if (!made.ok) return {error: made.errors[0].message};
  let doc: any = made.doc;
  const at = type === 'hero' ? 1 : doc.tree.children.length; // 히어로는 머리글 바로 다음에만 올 수 있다
  const inserted = insertNode(doc, {parent: [], node: example, index: at});
  if (!inserted.ok) return {error: inserted.errors[0].message};
  doc = inserted.doc;
  for (let i = doc.tree.children.length - 1; i >= 1; i--) {
    if (i === at) continue;
    const removed = removeNode(doc, {path: [i]});
    if (!removed.ok) return {error: removed.errors[0].message};
    doc = removed.doc;
  }
  if (variant) {
    const target = doc.tree.children.findIndex((n: Json) => n.type === type);
    const set = updateNode(doc, {path: [target], set: {variant}});
    if (!set.ok) return {error: set.errors[0].message};
    doc = set.doc;
  }
  return {doc};
}

function renderRaw(view: RawView, variant?: string): Rendered {
  if (view.example && !(variant && !view.variantIds.includes(variant))) {
    const built = isolatedDoc(view.type, {...view.example, ...(variant ? {variant} : {})});
    if ('doc' in built) { const html = compileHtml(built.doc); if (html) return {ok: true, html, mode: 'isolated'}; }
    else if (variant) return {ok: false, reason: built.error};
  }
  if (variant) return {ok: false, reason: '이 부품은 변형을 단독으로 렌더하지 못합니다.'};
  const template = templateUsing(view.type);
  if (!template) return {ok: false, reason: '이 부품을 쓰는 템플릿이 없습니다.'};
  const made = resetDocument(null, {template});
  const html = made.ok ? compileHtml(made.doc) : null;
  return html ? {ok: true, html, mode: 'template', template} : {ok: false, reason: '렌더하지 못했습니다.'};
}

export function renderComponent(type: string, variant?: string): Rendered {
  const view = rawView(type);
  return view ? renderRaw(view, variant) : {ok: false, reason: '알 수 없는 부품입니다.'};
}

export function templateLabel(id: string): string {
  return call<{items: Row[]}>(listCatalog({kind: 'templates', fields: ['id', 'label'], limit: 200}), 'listCatalog(templates)').items.find(t => t.id === id)?.label ?? id;
}
