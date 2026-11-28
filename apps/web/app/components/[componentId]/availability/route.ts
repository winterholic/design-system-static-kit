import {playgroundAvailability} from '@/features/components/playground.server';
import {componentView} from '@/features/components/spec.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, {params}: {params: Promise<{componentId: string}>}) {
  const {componentId} = await params;
  const view = componentView(componentId);
  if (!view) return new Response('알 수 없는 컴포넌트입니다.', {status: 404});
  const raw = new URL(request.url).searchParams.get('selection') ?? '{}';
  if (raw.length > 2048) return new Response('선택 값이 너무 큽니다.', {status: 400});
  try {
    const selection = JSON.parse(raw);
    if (!selection || typeof selection !== 'object' || Array.isArray(selection)) throw new Error();
    const result = playgroundAvailability(componentId, selection);
    return Response.json(result, {headers: {'cache-control': 'private, no-store'}});
  } catch {
    return new Response('선택 형식이 올바르지 않습니다.', {status: 400});
  }
}
