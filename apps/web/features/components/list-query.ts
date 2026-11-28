// Components 목록의 URL 쿼리 ↔ 필터 상태, 검색·분류·쪽 나누기. 서버 렌더와 시험이 같은 규칙을 쓰도록 순수 함수로 둔다.
// 카드는 쪽 단위로만 DOM 에 만든다(REQUEST §3.4). 검색과 분류는 숨은 카드까지 포함한 전체 목록에서 걸러 낸 뒤 쪽을 자른다.

export const PAGE_SIZE = 24;

export type ListKind = 'purpose' | 'part';

/** 목록의 한 카드. kind 와 group 이 분류(`<kind>:<group>`)를 이룬다. words 는 검색 대상 문자열이다. */
export type ListItem = {kind: ListKind; group: string; id: string; words: string};

export type ComponentsQuery = {q: string; group: string; page: number};
export const EMPTY_QUERY: ComponentsQuery = {q: '', group: '', page: 1};

type Params = {get(name: string): string | null};

export const groupKey = (kind: ListKind, group: string) => `${kind}:${group}`;

/** 알 수 없는 분류는 버린다(전체로 읽는다). 서버가 아는 분류 목록을 허용 목록으로 받는다. */
export function readQuery(params: Params, allowedGroups: string[]): ComponentsQuery {
  const group = params.get('group') ?? '';
  const page = Number(params.get('page'));
  return {
    q: (params.get('q') ?? '').trim().slice(0, 80),
    group: allowedGroups.includes(group) ? group : '',
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** 기본값과 같은 항목은 쓰지 않는다. 그래서 '초기화'는 빈 쿼리다. */
export function writeQuery(query: ComponentsQuery): string {
  const p = new URLSearchParams();
  if (query.q) p.set('q', query.q);
  if (query.group) p.set('group', query.group);
  if (query.page > 1) p.set('page', String(query.page));
  return p.toString();
}

/** 모든 낱말(공백 구분)이 검색 대상 문자열에 들어 있어야 한다. 대소문자는 구분하지 않는다. */
export function filterItems<T extends ListItem>(items: T[], query: ComponentsQuery): T[] {
  const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => (
    (!query.group || groupKey(item.kind, item.group) === query.group)
    && words.every(w => item.words.toLowerCase().includes(w))
  ));
}

export function paginate<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  return {items: rows.slice((current - 1) * size, current * size), page: current, pages, total: rows.length, from: rows.length ? (current - 1) * size + 1 : 0, to: Math.min(rows.length, current * size)};
}

/** 같은 kind·group 이 이어지는 구간으로 묶는다. 쪽 안에서 분류 제목을 한 번씩만 그리기 위해서다. */
export function runsOf<T extends ListItem>(items: T[]): {kind: ListKind; group: string; items: T[]}[] {
  const runs: {kind: ListKind; group: string; items: T[]}[] = [];
  for (const item of items) {
    const last = runs.at(-1);
    if (last && last.kind === item.kind && last.group === item.group) last.items.push(item);
    else runs.push({kind: item.kind, group: item.group, items: [item]});
  }
  return runs;
}
