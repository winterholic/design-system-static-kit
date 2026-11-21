import {renderCombo} from '@/features/explore/qa/combos.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('c') ?? '';
  const result = renderCombo(id, {
    concept: url.searchParams.get('concept'), look: url.searchParams.get('look'), theme: url.searchParams.get('theme'),
    tv: url.searchParams.get('tv'), pal: url.searchParams.get('pal'), type: url.searchParams.get('type'),
    mode: url.searchParams.get('mode') as 'light' | 'dark' | null,
  });
  if (!result.ok) return new Response(result.error, {status: 404, headers: {'content-type': 'text/plain; charset=utf-8'}});
  return new Response(result.html, {headers: {'content-type': 'text/html; charset=utf-8'}});
}
