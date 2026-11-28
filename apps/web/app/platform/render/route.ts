import {assembleComponents, assembleDesign} from '@/features/platform/platform.server';
import {MAX_REQUEST_TOKEN, decodeRequest} from '@/features/platform/render-url';
import type {AssembleRequest} from '@/features/platform/types';
import {previewKeyOf} from '@/lib/api/preview-keys.mjs';
import {toPreviewSvg} from '@/lib/api/preview-svg.mjs';

// 요청(JSON)을 Core 서비스에 그대로 넘기고 value.standalone 을 바이트 그대로 돌려준다(웹이 CSS·HTML 을 만들지 않는다).
// 이 경로는 사용자가 고른 조합·입력한 콘텐츠를 컴파일한다. 그래서 공개 CDN 캐시를 허용하지 않는다(CONTRACTS §5.3, REQUEST §3.3):
//  - Cache-Control: private, no-cache + ETag(엔진·카탈로그 버전, 고른 재료, 정규화한 요청에서 만든 캐시 키). 같은 입력을 다시 물으면 304 로 끝나 컴파일하지 않는다.
//  - 컴파일 결과는 서버 메모리의 상한 있는 LRU(platform.server)에 둔다.
// 고정 전시용 대표 미리보기는 이 경로가 아니라 빌드 시점에 만든 /previews/<캐시키>.svg 정적 파일이고, 그쪽만 immutable 이다.
export const dynamic = 'force-dynamic';

type Parts = {css: string; html: string; standalone: string; manifest: unknown};
type Size = {width: number; height: number; title: string};

/** part 로 같은 서비스 결과의 한 부분을 그대로 낸다(내려받기). 기본은 미리보기용 standalone 문서다. */
const PART = {
  standalone: (v: Parts) => [v.standalone, 'text/html; charset=utf-8', 'index.html'],
  html: (v: Parts) => [v.html, 'text/html; charset=utf-8', 'fragment.html'],
  css: (v: Parts) => [v.css, 'text/css; charset=utf-8', 'styles.css'],
  manifest: (v: Parts) => [JSON.stringify(v.manifest, null, 2) + '\n', 'application/json; charset=utf-8', 'manifest.json'],
} as const;
const PARTS = [...Object.keys(PART), 'svg'];

/** 같은 입력이면 같은 문자열. 요청 하나가 어느 부분(part), 몇 번째 후보(i), 어떤 화면 폭으로 나오는지까지 담는다. */
function etagOf(kind: 'assemble' | 'components', body: Record<string, unknown>, q: URLSearchParams, size: Size) {
  const key = previewKeyOf({kind, request: body, width: null});
  return `"${key}-${q.get('part') ?? 'standalone'}-${Number(q.get('i') ?? 0) || 0}-${size.width}x${size.height}"`;
}

function respond(v: Parts, q: URLSearchParams, etag: string, size: Size) {
  const part = q.get('part') ?? 'standalone';
  const [body, type, name] = part === 'svg'
    ? [toPreviewSvg(v.standalone, size), 'image/svg+xml; charset=utf-8', 'preview.svg']
    : PART[part as keyof typeof PART](v);
  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'private, no-cache',
      etag,
      ...(q.get('download') ? {'content-disposition': `attachment; filename="${name}"`} : {}),
    },
  });
}

const page = (status: number, title: string, text: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:14px/1.6 system-ui;padding:24px;color:#14161a"><h1 style="font-size:16px">${title}</h1><p>${text.replace(/[<>&]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'})[c]!)}</p>`,
    {status, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}}
  );

const clamp = (raw: string | null, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 200 && n <= 2000 ? Math.round(n) : fallback;
};

export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const token = q.get('r');
  if (!token || token.length > MAX_REQUEST_TOKEN) return page(400, '요청을 읽을 수 없습니다', '요청이 없거나 너무 깁니다.');
  let body: unknown;
  try {
    body = decodeRequest(token);
  } catch {
    return page(400, '요청을 읽을 수 없습니다', '요청 형식이 올바르지 않습니다.');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return page(400, '요청을 읽을 수 없습니다', '요청은 객체여야 합니다.');
  const part = q.get('part') ?? 'standalone';
  if (!PARTS.includes(part)) return page(400, '알 수 없는 부분입니다', `part 는 ${PARTS.join(', ')} 중 하나입니다.`);

  const size: Size = {width: clamp(q.get('w'), 1280), height: clamp(q.get('h'), 800), title: '미리보기'};
  const kind = q.get('k') === 'components' ? 'components' : 'assemble';
  const etag = etagOf(kind, body as Record<string, unknown>, q, size);
  // 같은 입력을 이미 받은 브라우저는 컴파일 없이 304 를 받는다.
  if (request.headers.get('if-none-match') === etag) return new Response(null, {status: 304, headers: {etag, 'cache-control': 'private, no-cache'}});

  if (kind === 'components') {
    const r = assembleComponents(body as Record<string, unknown>);
    return r.ok ? respond(r.value, q, etag, size) : page(422, '이 조합은 만들 수 없습니다', r.errors.map(e => `${e.code}: ${e.message}`).join(' / '));
  }
  const r = assembleDesign(body as AssembleRequest);
  if (!r.ok) return page(422, '이 조합은 만들 수 없습니다', r.errors.map(e => `${e.code}: ${e.message}`).join(' / '));
  const index = Math.max(0, Number(q.get('i') ?? 0) || 0);
  const candidate = r.value.candidates[index];
  return candidate ? respond(candidate.value as unknown as Parts, q, etag, size) : page(404, '후보가 없습니다', `${index}번째 후보가 없습니다.`);
}
