import {componentRows, componentView, renderComponent} from '@/features/components/spec.server';

export const dynamic = 'force-static';

// /components/hero/render 와 /components/hero/render/split. 변형은 카탈로그가 선언한 값만 만든다.
export function generateStaticParams() {
  return componentRows().flatMap(r => {
    const view = componentView(r.type)!;
    const materialVariants = view.variantGroups.flatMap(group => group.availability.filter(v => v.ok && String(v.value) !== String(group.defaultValue)).map(v => ({componentId: r.type, variant: [`${group.name}~${String(v.value)}`]})));
    return [{componentId: r.type, variant: []}, ...view.variants.filter(v => v.ok).map(v => ({componentId: r.type, variant: [v.id]})), ...materialVariants];
  });
}

const unknownVariant = (reason: string) => new Response(reason, {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});

export async function GET(_req: Request, {params}: {params: Promise<{componentId: string; variant?: string[]}>}) {
  const {componentId, variant} = await params;
  const view = componentView(componentId);
  let selection: string | Record<string, string | number | boolean> | undefined = variant?.[0];
  if (view?.material && variant?.length) {
    const values = new Map<string, string | number | boolean>();
    for (const part of variant) {
      const separator = part.indexOf('~');
      const axis = part.slice(0, separator);
      const group = view.variantGroups.find(item => item.name === axis);
      // Next가 경로 매개 변수를 이미 디코딩한다.
      const value = group?.values.find(item => String(item) === part.slice(separator + 1));
      if (separator < 1 || value === undefined || values.has(axis)) return unknownVariant('등록된 변형 축과 값을 한 번씩 사용하세요.');
      values.set(axis, value);
    }
    selection = Object.fromEntries(values);
  }
  const rendered = renderComponent(componentId, selection);
  if (!rendered.ok) return unknownVariant(rendered.reason);
  return new Response(rendered.html, {headers: {'content-type': 'text/html; charset=utf-8'}});
}
