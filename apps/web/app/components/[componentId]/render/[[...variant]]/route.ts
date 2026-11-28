import {componentView, renderComponent} from '@/features/components/spec.server';
import {playgroundAxes} from '@/features/components/detail-model.mjs';

export const dynamic = 'force-dynamic';

const unknownVariant = (reason: string) => new Response(reason, {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});

export async function GET(req: Request, {params}: {params: Promise<{componentId: string; variant?: string[]}>}) {
  const {componentId, variant} = await params;
  const view = componentView(componentId);
  let selection: string | Record<string, string | number | boolean> | undefined = variant?.[0];
  if (view?.material && variant?.length && variant.every(part => part.includes('~'))) {
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
  if (view && !variant?.length) {
    const params = new URL(req.url).searchParams;
    const values: Record<string, string> = {};
    for (const group of view.variantGroups) {
      const asked = params.get(group.name);
      if (!asked) continue;
      if (!group.values.some(value => String(value) === asked)) return unknownVariant(`카탈로그에 없는 ${group.name} 변형입니다.`);
      values[group.name] = asked;
    }
    const state = params.get('state');
    if (state && !view.variantGroups.some(group => group.name === 'state')) {
      if (!view.material?.states.values.includes(state)) return unknownVariant(`계약에 선언되지 않은 상태입니다: ${state}`);
      values.state = state;
    }
    for (const axis of ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'mode', 'density', 'viewport'] as const) {
      const asked = params.get(axis);
      if (!asked) continue;
      if (!playgroundAxes(view).includes(axis)) return unknownVariant(`이 재료는 ${axis} 축을 받지 않습니다.`);
      if (axis === 'viewport') {
        if (!['390', '1280'].includes(asked)) return unknownVariant('뷰포트는 390 또는 1280입니다.');
      } else {
        const option = view.playground.axes[axis].find(item => item.value === asked);
        if (!option) return unknownVariant(`등록되지 않은 ${axis} 선택입니다.`);
        if (axis === 'visualFamily' && !view.playground.base) return unknownVariant(option.reason ?? '이 컴포넌트에는 시각 패밀리 렌더 계약이 없습니다.');
      }
      values[axis] = asked;
    }
    const exampleText = params.get('exampleText');
    if (exampleText !== null) {
      if (exampleText.length > 200) return unknownVariant('예시 콘텐츠는 200자 이하여야 합니다.');
      values.exampleText = exampleText;
    }
    selection = values;
  }
  const rendered = renderComponent(componentId, selection);
  if (!rendered.ok) return unknownVariant(rendered.reason);
  return new Response(rendered.html, {headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store'}});
}
