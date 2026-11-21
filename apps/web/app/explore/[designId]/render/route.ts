import {curatedDesigns, findDesign, renderDesign} from '@/features/explore/designs.server';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return curatedDesigns().map(d => ({designId: d.id}));
}

// 래퍼 없는 전체 화면 HTML. 상세의 미리보기 iframe, 목록 썸네일, '새 창으로 전체 화면 열기'가 같은 주소를 쓴다.
// 본문은 compileBlueprint(Blueprint) 결과 그대로다(바이트 비교 시험: e2e/explore-fidelity.spec.mjs).
export async function GET(_req: Request, {params}: {params: Promise<{designId: string}>}) {
  const design = findDesign((await params).designId);
  if (!design) return new Response('디자인을 찾을 수 없습니다.', {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  return new Response(renderDesign(design).html, {headers: {'content-type': 'text/html; charset=utf-8'}});
}
