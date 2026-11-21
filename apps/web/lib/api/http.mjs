// REST·MCP 가 함께 쓰는 HTTP 도구: JSON 응답, 안전한 헤더, 본문 읽기(크기 제한), ETag.
import {createHash} from 'node:crypto';
import {GET_CACHE_CONTROL, MAX_BODY_BYTES} from './limits.mjs';
import {channelError, statusOfErrors, transportStatus} from './diagnostics.mjs';

const BASE_HEADERS = {'x-content-type-options': 'nosniff'};

export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {status, headers: {...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', ...headers}});
}

/** 서비스·채널 봉투를 응답으로. 실패는 상태 표(statusOfErrors)로 옮기고 캐시하지 않는다. */
export function envelopeResponse(env, {cache = false, request, headers = {}} = {}) {
  if (!env.ok) return jsonResponse(env, statusOfErrors(env.errors), {'cache-control': 'no-store', ...headers});
  if (cache) return cachedJsonResponse(env, request, headers);
  return jsonResponse(env, 200, {'cache-control': 'no-store', ...headers});
}

/** GET 성공 응답. 같은 입력은 같은 출력(서비스 계약)이므로 본문 해시가 ETag 로 충분하다. */
export function cachedJsonResponse(body, request, headers = {}) {
  const text = JSON.stringify(body);
  const etag = '"' + createHash('sha256').update(text).digest('base64url').slice(0, 27) + '"';
  const cacheHeaders = {etag, 'cache-control': GET_CACHE_CONTROL, vary: 'Accept-Encoding', ...headers};
  if (request && matchesEtag(request.headers.get('if-none-match'), etag)) return new Response(null, {status: 304, headers: {...BASE_HEADERS, ...cacheHeaders}});
  return new Response(text, {status: 200, headers: {...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8', ...cacheHeaders}});
}

function matchesEtag(header, etag) {
  if (!header) return false;
  return header.split(',').map(s => s.trim().replace(/^W\//, '')).some(t => t === etag || t === '*');
}

export function errorResponse(code, path, message, headers = {}) {
  return jsonResponse(channelError(code, path, message), transportStatus(code), {'cache-control': 'no-store', ...headers});
}

/**
 * 요청 본문을 JSON 으로 읽는다. 크기는 Content-Length 로 먼저 보고, 스트림을 읽을 때도 센다(거짓 Content-Length 대비).
 * @returns {Promise<{value: unknown} | {response: Response}>}
 */
export async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const type = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return {response: errorResponse('UNSUPPORTED_MEDIA_TYPE', '$body', `Content-Type 이 application/json 이 아닙니다: ${type || '(없음)'}`)};
  const declared = request.headers.get('content-length');
  const tooLarge = () => ({response: errorResponse('PAYLOAD_TOO_LARGE', '$body', `본문이 ${maxBytes}바이트를 넘습니다.`)});
  if (declared !== null && Number(declared) > maxBytes) return tooLarge();
  const text = await readTextLimited(request, maxBytes);
  if (text === null) return tooLarge();
  try { return {value: JSON.parse(text)}; } catch { return {response: errorResponse('BAD_REQUEST', '$body', '본문이 올바른 JSON 이 아닙니다.')}; }
}

/** 최대 maxBytes 까지만 읽는다. 넘으면 null. */
export async function readTextLimited(request, maxBytes) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
