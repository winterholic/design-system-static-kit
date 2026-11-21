import {componentRows, componentView, renderComponent} from '@/features/components/spec.server';

export const dynamic = 'force-static';

// /components/hero/render 와 /components/hero/render/split. 변형은 카탈로그가 선언한 값만 만든다.
export function generateStaticParams() {
  return componentRows().flatMap(r => {
    const view = componentView(r.type)!;
    return [{componentId: r.type, variant: []}, ...view.variants.filter(v => v.ok).map(v => ({componentId: r.type, variant: [v.id]}))];
  });
}

export async function GET(_req: Request, {params}: {params: Promise<{componentId: string; variant?: string[]}>}) {
  const {componentId, variant} = await params;
  const rendered = renderComponent(componentId, variant?.[0]);
  if (!rendered.ok) return new Response(rendered.reason, {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  return new Response(rendered.html, {headers: {'content-type': 'text/html; charset=utf-8'}});
}
