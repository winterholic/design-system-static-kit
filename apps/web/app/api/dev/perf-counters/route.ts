import {getCompileCounters, resetCompileCounters} from '@/features/perf/counter.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.DSK_PERF_METRICS !== '1') {
    return new Response('Not Found', {status: 404});
  }
  return Response.json(getCompileCounters(), {
    headers: {'cache-control': 'no-store'},
  });
}

export async function POST() {
  if (process.env.DSK_PERF_METRICS !== '1') {
    return new Response('Not Found', {status: 404});
  }
  return Response.json(resetCompileCounters(), {
    headers: {'cache-control': 'no-store'},
  });
}
