export const CATALOG_CATEGORIES = Object.freeze([
  {id: 'all', label: '전체'},
  {id: 'buttons', label: '버튼'},
  {id: 'inputs', label: '입력'},
  {id: 'selection', label: '선택'},
  {id: 'date-time', label: '날짜·시간'},
  {id: 'navigation', label: '내비게이션'},
  {id: 'cards', label: '카드'},
  {id: 'data', label: '데이터'},
  {id: 'charts', label: '차트'},
  {id: 'overlays', label: '오버레이'},
  {id: 'feedback', label: '피드백'},
  {id: 'information', label: '정보 표시'},
  {id: 'media', label: '미디어'},
  {id: 'layouts', label: '레이아웃'},
  {id: 'work-patterns', label: '업무 패턴'},
  {id: 'commerce', label: '커머스'},
  {id: 'mobile', label: '모바일'},
]);

const SECTION_CATEGORY = Object.freeze({A: 'buttons', B: 'inputs', C: 'selection', D: 'date-time', E: 'navigation', F: 'cards', G: 'data', H: 'overlays', I: 'feedback', J: 'information', K: 'media', L: 'layouts', M: 'work-patterns', N: 'commerce', O: 'mobile'});
const NORMALIZED_CATEGORY = Object.freeze({
  button: 'buttons', buttons: 'buttons', action: 'buttons', input: 'inputs', form: 'inputs', inputs: 'inputs',
  select: 'selection', selection: 'selection', date: 'date-time', time: 'date-time', navigation: 'navigation', nav: 'navigation',
  card: 'cards', data: 'data', table: 'data', chart: 'charts', overlay: 'overlays', feedback: 'feedback', state: 'feedback',
  info: 'information', information: 'information', media: 'media', layout: 'layouts', layouts: 'layouts',
  workflow: 'work-patterns', work: 'work-patterns', commerce: 'commerce', mobile: 'mobile',
});
const ALLOWED = new Set(CATALOG_CATEGORIES.map(category => category.id));
const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function classifyCatalogMaterial(material, manifest) {
  const requirementById = new Map((manifest?.requirements ?? []).map(row => [row.id, row]));
  const source = (manifest?.materials ?? []).find(row => row.id === material.id);
  const requirementIds = [...new Set([...(material.requirementIds ?? []), ...(source?.requirementIds ?? [])])];
  const categories = new Set();
  for (const requirementId of requirementIds) {
    const requirement = requirementById.get(requirementId);
    const section = requirement?.section?.match(/§6\.2\s+([A-O])/i)?.[1]?.toUpperCase();
    if (section && SECTION_CATEGORY[section]) categories.add(SECTION_CATEGORY[section]);
  }
  if (!categories.size) {
    for (const value of [material.group, material.category, material.kind]) {
      const key = normalize(value);
      if (NORMALIZED_CATEGORY[key]) categories.add(NORMALIZED_CATEGORY[key]);
    }
  }
  return CATALOG_CATEGORIES.filter(({id}) => id !== 'all' && categories.has(id)).map(({id}) => id);
}

export function filterCatalogMaterials(materials, {category = 'all', q = ''} = {}) {
  const terms = String(q).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return materials.filter(material => {
    if (!terms.length && category !== 'all' && !material.relatedCategories?.includes(category)) return false;
    const text = [material.id, material.label, material.purpose, material.kind, material.contexts?.join(' '), material.tags?.join(' '), material.categories?.join(' ')]
      .filter(Boolean).join(' ').toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  });
}

export function readCatalogQuery(params) {
  const category = params.get('category') ?? 'all';
  const page = Number(params.get('page'));
  return {
    category: ALLOWED.has(category) ? category : 'all',
    q: (params.get('q') ?? '').trim().slice(0, 80),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

export function writeCatalogQuery(query) {
  const params = new URLSearchParams();
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.q) params.set('q', query.q);
  if (query.page > 1) params.set('page', String(query.page));
  return params.toString();
}

export function paginateCatalogMaterials(materials, page, size = 24) {
  const pages = Math.max(1, Math.ceil(materials.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return {items: materials.slice((current - 1) * size, current * size), page: current, pages, total: materials.length};
}
