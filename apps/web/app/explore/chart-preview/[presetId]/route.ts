import {chartPresetPreview} from '@/features/platform/chart-compare.server';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params: Promise<{presetId: string}>}) {
  const {presetId} = await params;
  const result = chartPresetPreview(`chart-preset:${presetId}`);
  if (!result.ok) return new Response(result.reason, {status: 404, headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'}});
  return new Response(result.html, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=0, must-revalidate', 'X-Content-Type-Options': 'nosniff'}});
}
