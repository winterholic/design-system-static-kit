import 'server-only';
import {listCatalog} from '@winterholic/design-system-static-kit/service';
import {curatedDesigns, findDesign, type Design} from '@/features/explore/designs.server';

// 홈에 보이는 화면은 모두 Core가 컴파일한 결과다(/explore/<id>/render). 화면 목록과 숫자를 코드에 적어 두지 않고 Core 질의에서 읽는다.
// 대표로 올리는 디자인 id 몇 개는 편집 판단이라 고정하되, Explore 목록에 없으면 빌드가 실패해 조용히 비지 않는다.
const HERO = 'saas-landing';
const GALLERY = ['dashboard-overview', 'cafe-home', 'luxury-brand', 'article', 'api-reference', 'agency-home'];
/** "같은 페이지, 다른 재료"에 쓸 템플릿. 같은 템플릿의 테마·팔레트·모드 조합 3개 이상이 Explore 목록에 있어야 한다. */
const SAME_PAGE = 'saas-landing';

function must(id: string): Design {
  const design = findDesign(id);
  if (!design) throw new Error(`홈의 대표 디자인 ${id} 가 Explore 목록에 없습니다.`);
  return design;
}

const total = (kind: string) => {
  const r = listCatalog({kind, limit: 1} as never) as {ok: boolean; value: {total: number}};
  if (!r.ok) throw new Error(`listCatalog(${kind}) 실패`);
  return r.value.total;
};

export type HomeData = {
  hero: Design;
  gallery: Design[];
  samePage: Design[];
  styles: {id: string; label: string; count: number}[];
  counts: {designs: number; themes: number; components: number; pageTypes: number};
};

export function homeData(): HomeData {
  const all = curatedDesigns();
  const samePage = all.filter(d => d.template === SAME_PAGE).slice(0, 4);
  if (samePage.length < 3) throw new Error(`홈의 "같은 페이지, 다른 재료"에 쓸 ${SAME_PAGE} 조합이 ${samePage.length}개뿐입니다.`);
  const byStyle = new Map<string, {id: string; label: string; count: number}>();
  for (const d of all) {
    const row = byStyle.get(d.styleId) ?? {id: d.styleId, label: d.styleLabel, count: 0};
    row.count++;
    byStyle.set(d.styleId, row);
  }
  return {
    hero: must(HERO),
    gallery: GALLERY.map(must),
    samePage,
    styles: [...byStyle.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    counts: {designs: all.length, themes: total('themes'), components: total('components'), pageTypes: new Set(all.map(d => d.pageType)).size},
  };
}
