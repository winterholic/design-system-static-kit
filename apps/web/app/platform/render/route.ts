import {assembleComponents, assembleDesign} from '@/features/platform/platform.server';
import {MAX_REQUEST_TOKEN, decodeRequest} from '@/features/platform/render-url';
import type {AssembleRequest} from '@/features/platform/types';

// 미리보기 iframe 이 읽는 문서. 요청을 Core 서비스에 그대로 넘기고 value.standalone 을 바이트 그대로 돌려준다(웹이 CSS·HTML 을 만들지 않는다).
export const dynamic = 'force-dynamic';
const HEADERS = {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'};
type Parts = {css: string; html: string; standalone: string; manifest: unknown};
/** part 로 같은 서비스 결과의 한 부분을 그대로 낸다(내려받기). 기본은 미리보기용 standalone 문서다. */
const PART = {
  standalone: (v: Parts) => [v.standalone, 'text/html; charset=utf-8', 'index.html'],
  html: (v: Parts) => [v.html, 'text/html; charset=utf-8', 'fragment.html'],
  css: (v: Parts) => [v.css, 'text/css; charset=utf-8', 'styles.css'],
  manifest: (v: Parts) => [JSON.stringify(v.manifest, null, 2) + '\n', 'application/json; charset=utf-8', 'manifest.json'],
} as const;
function respond(v: Parts, q: URLSearchParams) {
  const part = (q.get('part') ?? 'standalone') as keyof typeof PART;
  if (!(part in PART)) return page(400, '알 수 없는 부분입니다', `part 는 ${Object.keys(PART).join(', ')} 중 하나입니다.`);
  const [body, type, name] = PART[part](v);
  return new Response(body, {headers: {...HEADERS, 'content-type': type, ...(q.get('download') ? {'content-disposition': `attachment; filename="${name}"`} : {})}});
}
const page = (status: number, title: string, text: string) => new Response(`<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:14px/1.6 system-ui;padding:24px;color:#14161a"><h1 style="font-size:16px">${title}</h1><p>${text.replace(/[<>&]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'})[c]!)}</p>`, {status, headers: HEADERS});

export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const token = q.get('r');
  if (!token || token.length > MAX_REQUEST_TOKEN) return page(400, '요청을 읽을 수 없습니다', '요청이 없거나 너무 깁니다.');
  let body: unknown;
  try { body = decodeRequest(token); } catch { return page(400, '요청을 읽을 수 없습니다', '요청 형식이 올바르지 않습니다.'); }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return page(400, '요청을 읽을 수 없습니다', '요청은 객체여야 합니다.');
  if (q.get('k') === 'components') {
    const r = assembleComponents(body as Record<string, unknown>);
    return r.ok ? respond(r.value, q) : page(422, '이 조합은 만들 수 없습니다', r.errors.map(e => `${e.code}: ${e.message}`).join(' / '));
  }
  const r = assembleDesign(body as AssembleRequest);
  if (!r.ok) return page(422, '이 조합은 만들 수 없습니다', r.errors.map(e => `${e.code}: ${e.message}`).join(' / '));
  const index = Math.max(0, Number(q.get('i') ?? 0) || 0);
  const candidate = r.value.candidates[index];
  return candidate ? respond(candidate.value as unknown as Parts, q) : page(404, '후보가 없습니다', `${index}번째 후보가 없습니다.`);
}
