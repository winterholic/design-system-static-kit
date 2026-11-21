import {createRouteHandler} from '@/lib/api/mcp.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const handler = createRouteHandler();

// 2026-07-28 사양은 POST 하나만 쓴다. GET·DELETE 는 핸들러가 405 로 답한다(2025년판 세션 연산).
export {handler as GET, handler as POST, handler as DELETE};
