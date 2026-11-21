import {curatedDesigns, findDesign, renderDesign} from '@/features/explore/designs.server';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return curatedDesigns().map(d => ({designId: d.id}));
}

// 상세 화면의 'Blueprint JSON 보기·복사'가 처음 열 때 가져가는 본문. 들여쓰기 2칸의 JSON 이다.
export async function GET(_req: Request, {params}: {params: Promise<{designId: string}>}) {
  const design = findDesign((await params).designId);
  if (!design) return new Response('디자인을 찾을 수 없습니다.', {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  return new Response(JSON.stringify(renderDesign(design).doc, null, 2) + '\n', {headers: {'content-type': 'application/json; charset=utf-8'}});
}
