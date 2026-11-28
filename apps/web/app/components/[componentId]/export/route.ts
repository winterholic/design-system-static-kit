import {exportComponent} from '@/features/components/spec.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, {params}: {params: Promise<{componentId: string}>}) {
  const {componentId} = await params;
  const raw = new URL(request.url).searchParams.get('selection') ?? '{}';
  if (raw.length > 2048) return new Response('선택 값이 너무 큽니다.', {status: 400});
  let selection: Record<string, string>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object expected');
    selection = parsed;
  } catch {
    return new Response('선택 형식이 올바르지 않습니다.', {status: 400});
  }
  const result = exportComponent(componentId, selection);
  if (!result.ok) return new Response(result.reason, {status: 422, headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'private, no-store'}});
  return Response.json({files: result.files}, {headers: {'cache-control': 'private, no-store'}});
}
