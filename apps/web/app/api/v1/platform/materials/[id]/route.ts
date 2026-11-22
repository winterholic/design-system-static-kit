import {runOperation} from '@/lib/api/rest.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const handler = async (request: Request, ctx: {params: Promise<{id: string}>}) => runOperation('getPlatformMaterial', request, await ctx.params);

// 모든 메서드를 같은 실행기로 보내 지원하지 않는 메서드를 구조화된 405(Allow 헤더 포함)로 낸다.
export {handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE};
