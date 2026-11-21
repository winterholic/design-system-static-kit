// Explore 목록의 URL 쿼리 ↔ 필터 상태, 필터·검색·정렬·쪽 나누기. 서버(렌더)와 클라이언트(입력 UI)가 같은 규칙을 쓰도록 순수 함수로 둔다.

export const PAGE_SIZE = 24;
export const SORTS = [
  {id: 'recommended', label: '추천순'},
  {id: 'name', label: '이름순'},
  {id: 'theme', label: '테마순'},
] as const;
export type SortId = (typeof SORTS)[number]['id'];

export type ExploreQuery = {q: string; type: string; style: string; theme: string; sort: SortId; page: number};
export const EMPTY_QUERY: ExploreQuery = {q: '', type: '', style: '', theme: '', sort: 'recommended', page: 1};

type Params = {get(name: string): string | null};

/** 알 수 없는 값은 버린다(기본값으로 읽는다). 서버와 클라이언트가 같은 값을 읽도록 허용 목록을 받는다. */
export type Allowed = {types: string[]; styles: string[]; themes: string[]};

export function readQuery(params: Params, allowed: Allowed): ExploreQuery {
  const pick = (name: string, ok: string[]) => { const v = params.get(name) ?? ''; return ok.includes(v) ? v : ''; };
  const sort = params.get('sort') as SortId | null;
  const page = Number(params.get('page'));
  return {
    q: (params.get('q') ?? '').trim().slice(0, 80),
    type: pick('type', allowed.types),
    style: pick('style', allowed.styles),
    theme: pick('theme', allowed.themes),
    sort: SORTS.some(s => s.id === sort) ? sort! : 'recommended',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** 기본값과 같은 항목은 쓰지 않는다. 그래서 '초기화'는 빈 쿼리다. */
export function writeQuery(query: ExploreQuery): string {
  const p = new URLSearchParams();
  if (query.q) p.set('q', query.q);
  if (query.type) p.set('type', query.type);
  if (query.style) p.set('style', query.style);
  if (query.theme) p.set('theme', query.theme);
  if (query.sort !== EMPTY_QUERY.sort) p.set('sort', query.sort);
  if (query.page > 1) p.set('page', String(query.page));
  return p.toString();
}

export type Row = {id: string; label: string; pageType: string; pageTypeLabel: string; themeId: string; themeName: string; styleId: string; styleLabel: string; variantLabel: string | null; concept: string | null; curationLabel: string | null};

const haystack = (d: Row) => [d.id, d.label, d.pageTypeLabel, d.themeId, d.themeName, d.styleLabel, d.variantLabel, d.concept, d.curationLabel].filter(Boolean).join(' ').toLowerCase();

export function filterRows<T extends Row>(rows: T[], query: ExploreQuery): T[] {
  const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = rows.filter(d => (
    (!query.type || d.pageType === query.type)
    && (!query.style || d.styleId === query.style)
    && (!query.theme || d.themeId === query.theme)
    && words.every(w => haystack(d).includes(w))
  ));
  // 추천순은 목록 원래 순서(카탈로그 선언 순서, 템플릿 기본이 먼저)다.
  if (query.sort === 'name') return [...out].sort((a, b) => a.label.localeCompare(b.label, 'ko') || a.id.localeCompare(b.id));
  if (query.sort === 'theme') return [...out].sort((a, b) => a.themeName.localeCompare(b.themeName, 'ko') || a.label.localeCompare(b.label, 'ko'));
  return out;
}

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return {items: rows.slice((current - 1) * size, current * size), page: current, pages, total: rows.length};
}
