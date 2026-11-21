import {componentRows, componentView, renderComponent} from '@/features/components/spec.server';

export const dynamic = 'force-static';

// /components/hero/render 와 /components/hero/render/split. 변형은 카탈로그가 선언한 값만 만든다.
export function generateStaticParams() {
  return componentRows().flatMap(r => {
    const view = componentView(r.type)!;
    const materialVariants = view.variantGroups.flatMap(group => group.availability.filter(v => v.ok && String(v.value) !== String(group.defaultValue)).map(v => ({componentId: r.type, variant: [`${group.name}~${encodeURIComponent(String(v.value))}`]})));
    return [{componentId: r.type, variant: []}, ...view.variants.filter(v => v.ok).map(v => ({componentId: r.type, variant: [v.id]})), ...materialVariants];
  });
}

export async function GET(_req: Request, {params}: {params: Promise<{componentId: string; variant?: string[]}>}) {
  const {componentId, variant} = await params;
  const view = componentView(componentId);
  const materialSelection = view?.material && variant?.length ? Object.fromEntries(variant.map(part => {
    const at = part.indexOf('~');
    if (at < 1) return ['', ''];
    const group = part.slice(0, at), value = decodeURIComponent(part.slice(at + 1));
    const schema = view.variantGroups.find(item => item.name === group);
    const original = schema?.values.find(item => String(item) === value);
    return [group, original ?? value];
  })) : undefined;
  const rendered = renderComponent(componentId, materialSelection ?? variant?.[0]);
  if (!rendered.ok) return new Response(rendered.reason, {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  return new Response(rendered.html, {headers: {'content-type': 'text/html; charset=utf-8'}});
}
