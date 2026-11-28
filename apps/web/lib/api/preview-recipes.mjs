// 웹 화면과 빌드 시점 사전 생성(scripts/build-catalog-index.mjs)이 같은 방법으로 Core 문서를 만들도록 한 곳에 둔 조립 절차.
// 화면용 코드와 사전 생성 코드가 따로 있으면 목록 그림과 상세 화면이 어긋난다(REQUEST §3.2: 수작업 구현으로 실제 컴파일 결과와 달라지지 않게 한다).
// 여기에는 Core 서비스·edit 연산을 부르는 절차만 있다. HTML·CSS 를 직접 만들지 않는다.
import {compileBlueprint, listCatalog} from '@winterholic/design-system-static-kit/service';
import {importBlueprint, insertNode, removeNode, resetDocument, setAppearance, updateNode} from '@winterholic/design-system-static-kit/edit';

const call = (r, what) => {
  if (!r.ok) throw new Error(`${what}: ${r.errors?.[0]?.message}`);
  return r.value;
};

/** listCatalog 는 한 번에 200개까지라서 cursor 를 따라 이어 받는다. */
export function catalogRows(kind, fields, extra = {}) {
  const out = [];
  for (let cursor; ;) {
    const page = call(listCatalog({kind, fields, ...extra, limit: 200, ...(cursor ? {cursor} : {})}), `listCatalog(${kind})`);
    out.push(...page.items);
    if (!page.nextCursor) return out;
    cursor = page.nextCursor;
  }
}

/** 템플릿마다 기본 디자인 하나에, 컨셉 look 에서 고른 테마 조합을 최대 이만큼 더한다. */
export const THEMED_PER_TEMPLATE = 2;

/**
 * Explore 의 대표 디자인 요청 목록(카탈로그 선언 순서). 전체 조합이 아니라 템플릿 기본 + 컨셉이 권하는 look 의 테마 조합이다.
 * 같은 템플릿에서 같은 (테마, 변형)은 한 번만 쓰고, 템플릿 기본과 같은 조합은 넣지 않는다.
 * @returns {{ref: {template: string, theme?: string, variant?: string, palette?: string, mode?: string, layout?: Record<string,string>}, concept: string | null, curationLabel: string | null}[]}
 */
export function curatedDesignRefs() {
  const templates = catalogRows('templates', ['id', 'label', 'pageType', 'theme']);
  const concepts = catalogRows('concepts', ['id', 'label', 'templates', 'looks']);
  const refs = [];
  for (const t of templates) {
    refs.push({ref: {template: t.id}, concept: null, curationLabel: null});
    const mine = concepts.filter(c => c.templates.includes(t.id));
    const taken = new Set([`${t.theme}|`]);
    let added = 0;
    // 컨셉을 돌아가며 한 look 씩 고른다. 한 컨셉만 쓰면 비슷한 테마가 몰린다.
    for (let round = 0; added < THEMED_PER_TEMPLATE; round++) {
      let progressed = false;
      for (const c of mine) {
        const look = c.looks[round];
        if (!look) continue;
        progressed = true;
        const key = `${look.theme}|${look.themeVariant ?? ''}`;
        if (taken.has(key) || added >= THEMED_PER_TEMPLATE) continue;
        taken.add(key); added++;
        refs.push({ref: {template: t.id, theme: look.theme, ...(look.themeVariant ? {variant: look.themeVariant} : {})}, concept: c.label, curationLabel: null});
      }
      if (!progressed) break;
    }
    if (t.id === 'saas-landing') {
      // 전체 조합을 전개하지 않는다. Studio 왕복에서 지원 슬롯·다른 팔레트·모드가 함께 보이는 한 건만 고정한다.
      refs.push({ref: {template: 'saas-landing', palette: 'pearl', mode: 'dark', layout: {hero: 'product'}}, concept: null, curationLabel: '복합 대표 디자인'});
    }
  }
  return refs;
}

/** resetDocument(+setAppearance)로 만든 문서. resetArgs 는 웹의 designId 문법(features/explore/id.ts)이 정한다. */
export function buildDesignDocument(ref, resetArgs) {
  const made = resetDocument(null, resetArgs(ref));
  if (!made.ok) return {ok: false, errors: made.errors};
  if (!ref.mode) return {ok: true, doc: made.doc};
  const moded = setAppearance(made.doc, {mode: ref.mode});
  return moded.ok ? {ok: true, doc: moded.doc} : {ok: false, errors: moded.errors};
}

// ---------------------------------------------------------------- 컴포넌트 렌더

export const COMPONENT_BASE = {template: 'about-team', theme: 'workspace'};

/** 이 부품이 들어 있는 첫 템플릿(카탈로그 순). 예제 노드가 없거나 단독으로 놓을 수 없는 부품의 대체 렌더다. */
function templateUsing(type) {
  const has = nodes => !!nodes?.some(n => n.type === type || has(n.children));
  for (const t of catalogRows('templates', ['id'])) {
    const made = resetDocument(null, {template: t.id});
    if (made.ok && has(made.doc.tree.children)) return t.id;
  }
  return null;
}

/** 머리글 + 이 부품 하나로 이루어진 페이지(page 는 children 이 2개 이상이어야 한다). variant 가 있으면 그 변형을 쓴다. */
export function isolatedDoc(type, example, variant) {
  const made = resetDocument(null, COMPONENT_BASE);
  if (!made.ok) return {error: made.errors[0].message};
  let doc = made.doc;
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
    const target = doc.tree.children.findIndex(n => n.type === type);
    const set = updateNode(doc, {path: [target], set: {variant}});
    if (!set.ok) return {error: set.errors[0].message};
    doc = set.doc;
  }
  return {doc};
}

function materialSelection(view, selection, compile) {
  const material = view.material;
  for (const [key, value] of Object.entries(selection)) {
    if (!material.variants[key]?.some(option => String(option) === String(value))) return {error: `카탈로그에 없는 ${key} 변형입니다.`};
  }
  const values = {...material.defaults, ...selection};
  const made = resetDocument(null, COMPONENT_BASE);
  if (!made.ok) return {error: made.errors[0]?.message ?? '기본 Blueprint를 만들지 못했습니다.'};
  // importBlueprint는 엔진이 만든 페이지를 받아 카탈로그 버전을 올리고 정상 문서로 검증한다.
  const upgraded = importBlueprint(null, {blueprint: {...made.doc, catalogVersion: material.since}});
  if (!upgraded.ok) return {error: upgraded.errors[0]?.message ?? '2.6.0 Blueprint로 올리지 못했습니다.'};
  const node = {...view.example, ...values};
  for (const key of ['sortable', 'selectable']) if (typeof node[key] === 'boolean') node[key] = node[key] ? 'yes' : 'no';
  // Core 계약상 내용이 없는 상태는 행도 비어 있어야 한다.
  if (view.type === 'data-table' && !['ready', 'partial'].includes(node.state)) node.rows = [];
  const at = upgraded.doc.tree.children.length;
  const inserted = insertNode(upgraded.doc, {parent: [], node, index: at});
  if (!inserted.ok) return {error: inserted.errors[0]?.message ?? '재료를 Blueprint에 넣지 못했습니다.'};
  let doc = inserted.doc;
  for (let i = doc.tree.children.length - 1; i >= 1; i--) {
    if (i === at) continue;
    const removed = removeNode(doc, {path: [i]});
    if (!removed.ok) return {error: removed.errors[0]?.message ?? '미리보기에서 불필요한 부품을 지우지 못했습니다.'};
    doc = removed.doc;
  }
  const compiled = compile(doc);
  return compiled.html === undefined ? {error: compiled.error ?? 'Core가 이 변형을 컴파일하지 못했습니다.'} : {html: compiled.html};
}

/**
 * 부품 하나의 렌더. view 는 {type, material, example, variantIds}. variant 는 레거시 변형 id(문자열) 또는 재료 변형 선택(객체).
 * @param {{type: string, material: any, example: any, variantIds: string[]}} view
 * @param {string | Record<string, unknown> | undefined} variant
 * @param {{onCompile?: () => void}} [hooks] 컴파일 횟수 계측용
 * @returns {{ok: true, html: string, mode: 'isolated' | 'template', template?: string} | {ok: false, reason: string}}
 */
export function renderComponentView(view, variant, {onCompile} = {}) {
  const compile = doc => {
    onCompile?.();
    const r = compileBlueprint(doc, {include: ['html']});
    return r.ok ? {html: r.value.html} : {error: r.errors?.[0]?.message};
  };
  if (view.material && view.example) {
    const built = materialSelection(view, typeof variant === 'object' ? variant : {}, compile);
    return 'html' in built ? {ok: true, html: built.html, mode: 'isolated'} : {ok: false, reason: built.error};
  }
  const legacyVariant = typeof variant === 'string' ? variant : undefined;
  if (view.example && !(legacyVariant && !view.variantIds.includes(legacyVariant))) {
    const built = isolatedDoc(view.type, {...view.example, ...(legacyVariant ? {variant: legacyVariant} : {})});
    if ('doc' in built) { const {html} = compile(built.doc); if (html) return {ok: true, html, mode: 'isolated'}; }
    else if (legacyVariant) return {ok: false, reason: built.error};
  }
  if (legacyVariant) return {ok: false, reason: '이 부품은 변형을 단독으로 렌더하지 못합니다.'};
  const template = templateUsing(view.type);
  if (!template) return {ok: false, reason: '이 부품을 쓰는 템플릿이 없습니다.'};
  const made = resetDocument(null, {template});
  const html = made.ok ? compile(made.doc).html : null;
  return html ? {ok: true, html, mode: 'template', template} : {ok: false, reason: '렌더하지 못했습니다.'};
}
