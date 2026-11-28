// 웹 화면과 빌드 시점 사전 생성(scripts/build-catalog-index.mjs)이 같은 방법으로 Core 문서를 만들도록 한 곳에 둔 조립 절차.
// 화면용 코드와 사전 생성 코드가 따로 있으면 목록 그림과 상세 화면이 어긋난다(REQUEST §3.2: 수작업 구현으로 실제 컴파일 결과와 달라지지 않게 한다).
// 여기에는 Core 서비스·edit 연산을 부르는 절차만 있다. HTML·CSS 를 직접 만들지 않는다.
import {assembleComponentContext, compileBlueprint, listCatalog} from '@winterholic/design-system-static-kit/service';
import {variantKey, variantNameOf} from './variant-keys.mjs';
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

function materialSelection(view, selection) {
  const material = view.material;
  const variantSelection = Object.fromEntries(Object.entries(selection).flatMap(([key, value]) => {
    const name = variantNameOf(key, material);
    return name ? [[name, value]] : [];
  }));
  const styleSelection = Object.fromEntries(Object.entries(selection).filter(([key]) => ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode', 'viewport', 'exampleText'].includes(key)));
  for (const [key, value] of Object.entries(variantSelection)) {
    if (!material.variants[key]?.some(option => String(option) === String(value))) return {error: `카탈로그에 없는 ${key} 변형입니다.`};
  }
  const values = {...material.defaults, ...variantSelection};
  const made = resetDocument(null, COMPONENT_BASE);
  if (!made.ok) return {error: made.errors[0]?.message ?? '기본 Blueprint를 만들지 못했습니다.'};
  // importBlueprint는 엔진이 만든 페이지를 받아 카탈로그 버전을 올리고 정상 문서로 검증한다.
  const upgraded = importBlueprint(null, {blueprint: {...made.doc, catalogVersion: material.since}});
  if (!upgraded.ok) return {error: upgraded.errors[0]?.message ?? '2.6.0 Blueprint로 올리지 못했습니다.'};
  const node = {...view.example, ...values};
  if (typeof styleSelection.exampleText === 'string') {
    const texts = exampleContent(view);
    const field = Object.keys(texts).find(key => key !== 'id' && typeof texts[key] === 'string');
    if (field) node[field] = styleSelection.exampleText;
  }
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
  if (Object.keys(styleSelection).length) {
    const context = importBlueprint(null, {blueprint: {...doc, catalogVersion: '2.7.0'}});
    if (!context.ok) return {error: context.errors[0]?.message ?? '플랫폼 스타일 맥락으로 승격하지 못했습니다.'};
    doc = context.doc;
    const {palette, subtokenSet, typeSystem, mode = 'light', density = 'comfortable', visualFamily} = styleSelection;
    if (!palette || !subtokenSet || !typeSystem) return {error: 'Core 재료 선택에 팔레트·서브토큰 세트·타이포 시스템이 모두 필요합니다.'};
    doc = {...doc, mode, density, materials: {palette, subtokenSet, typeSystem, ...(view.playground?.base && visualFamily ? {families: {[view.playground.base]: visualFamily}} : {})}};
  }
  return {doc};
}

/** 예제에서 변형 값이 아닌 필드(id, 문구, 옵션 등). 변형 축과 이름이 같아도 값이 그 축의 값이 아니면 문구 필드다(tooltip 의 content). */
function exampleContent(view) {
  const groups = new Map(Object.entries(view.material?.variants ?? {}).map(([name, values]) => [name, {name, values}]));
  return Object.fromEntries(Object.entries(view.example ?? {}).filter(([key, value]) => {
    if (value === undefined || key === 'type' || key === 'variant') return false;
    const group = groups.get(key);
    return !group || !group.values.some(candidate => String(candidate) === String(value));
  }));
}

function platformComponent(view, selection) {
  const contract = view.playground;
  if (!contract?.base || !selection?.palette || !selection?.subtokenSet || !selection?.typeSystem || !selection?.visualFamily) return null;
  // 기본값과 같은 변형은 보내지 않는다. 시각 패밀리가 고정하는 속성(shape, appearance 등)을 기본값이 덮어쓰면 기본 선택부터 거부된다.
  // 사용자가 기본값과 다르게 고른 변형만 Core 검증에 맡기고, 거부 사유는 그대로 보인다.
  const props = {};
  for (const group of view.variantGroups) {
    const chosen = selection[variantKey(group.name)];
    if (chosen !== undefined && String(chosen) !== String(group.defaultValue)) props[group.name] = group.values.find(value => String(value) === String(chosen)) ?? chosen;
  }
  const defaultState = view.variantGroups.find(group => group.name === 'state')?.defaultValue ?? view.material?.states?.values?.[0];
  if (typeof selection.state === 'string' && !view.variantGroups.some(group => group.name === 'state') && selection.state !== defaultState) props.state = selection.state;
  const content = exampleContent(view);
  const textField = Object.keys(content).find(key => key !== 'id' && typeof content[key] === 'string');
  if (textField && typeof selection.exampleText === 'string') content[textField] = selection.exampleText;
  const assembled = assembleComponentContext({
    context: 'general', base: contract.base, family: selection.visualFamily,
    palette: selection.palette, subtokenSet: selection.subtokenSet, typeSystem: selection.typeSystem,
    mode: selection.mode ?? contract.defaults.mode, density: selection.density ?? contract.defaults.density,
    viewport: selection.viewport === '390' || selection.viewport === 390 ? 390 : 1280,
    props, content,
  });
  return assembled.ok ? {ok: true, files: assembled.value.files, manifest: assembled.value.manifest, mode: 'platform'}
    : {ok: false, reason: assembled.errors.map(error => error.message).join(' ')};
}

/**
 * 부품 하나의 렌더. view 는 {type, material, example, variantIds}. variant 는 레거시 변형 id(문자열) 또는 재료 변형 선택(객체).
 * @param {{type: string, material: any, example: any, variantIds: string[]}} view
 * @param {string | Record<string, unknown> | undefined} variant
 * @param {{onCompile?: () => void}} [hooks] 컴파일 횟수 계측용
 * @returns {{ok: true, html: string, mode: 'isolated' | 'template', template?: string} | {ok: false, reason: string}}
 */
function componentDocument(view, variant) {
  if (view.material && view.example) {
    const selection = typeof variant === 'object' ? variant : {};
    if (view.playground?.base && selection.palette) return {platform: platformComponent(view, selection)};
    const built = materialSelection(view, selection);
    return 'doc' in built ? {doc: built.doc, mode: 'isolated'} : {error: built.error};
  }
  const legacyVariant = typeof variant === 'string' ? variant : undefined;
  if (view.example && !(legacyVariant && !view.variantIds.includes(legacyVariant))) {
    const built = isolatedDoc(view.type, {...view.example, ...(legacyVariant ? {variant: legacyVariant} : {})});
    if ('doc' in built) return {doc: built.doc, mode: 'isolated'};
    else if (legacyVariant) return {error: built.error};
  }
  if (legacyVariant) return {error: '이 부품은 변형을 단독으로 렌더하지 못합니다.'};
  const template = templateUsing(view.type);
  if (!template) return {error: '이 부품을 쓰는 템플릿이 없습니다.'};
  const made = resetDocument(null, {template});
  return made.ok ? {doc: made.doc, mode: 'template', template} : {error: '렌더하지 못했습니다.'};
}

/** 같은 검증된 Blueprint 컴파일러가 만든 내보내기 파일을 그대로 돌려준다. */
export function exportComponentView(view, variant, {onCompile} = {}) {
  const built = componentDocument(view, variant);
  if ('platform' in built) {
    if (!built.platform?.ok) return {ok: false, reason: built.platform?.reason ?? 'Core 플랫폼 렌더를 구성하지 못했습니다.'};
    onCompile?.();
    return {ok: true, files: built.platform.files, manifest: built.platform.manifest, mode: 'platform'};
  }
  if (!built.doc) return {ok: false, reason: built.error};
  onCompile?.();
  const result = compileBlueprint(built.doc, {include: ['files']});
  if (!result.ok) return {ok: false, reason: result.errors?.[0]?.message ?? 'Core가 컴파일하지 못했습니다.'};
  return {ok: true, files: result.value.files, manifest: result.value.manifest, mode: built.mode, template: built.template};
}

/** 부품 하나를 한 번만 동적으로 컴파일한다. 모든 변형을 만들지 않고 요청된 선택만 처리한다. */
export function renderComponentView(view, variant, {onCompile} = {}) {
  const exported = exportComponentView(view, variant, {onCompile});
  if (!exported.ok) return exported;
  return {ok: true, html: exported.files['index.html'], mode: exported.mode};
}
