// REST v1 실행기. 작업 표(operations.mjs)의 한 작업을 Request 에 적용해 Response 를 만든다.
// 순서: 호출 제한(POST) → 본문 읽기(크기·형식) → 버전 확인 → 서비스 호출 → 봉투를 상태 코드와 캐시 헤더로 옮김.
import {OPERATIONS, checkBodyShape, queryToArgs, rejectUnexpectedVersion} from './operations.mjs';
import {envelopeResponse, errorResponse, readJsonBody} from './http.mjs';
import {clientKey, takeRate} from './ratelimit.mjs';

export const operation = id => {
  const op = OPERATIONS.find(o => o.id === id);
  if (!op) throw new Error('알 수 없는 작업: ' + id);
  return op;
};

/**
 * @param {string} id OPERATIONS 의 id
 * @param {Request} request
 * @param {Record<string, string>} [params] 경로 매개변수
 */
export async function runOperation(id, request, params = {}) {
  const op = operation(id);
  try {
    if (request.method !== op.method && !(op.method === 'GET' && request.method === 'HEAD')) return errorResponse('METHOD_NOT_ALLOWED', '$', `${request.method} 는 지원하지 않습니다.`, {allow: op.method});
    let body;
    if (op.method === 'POST') {
      const rate = takeRate(clientKey(request), op.cost ?? 1);
      if (!rate.ok) return errorResponse('RATE_LIMITED', '$', '호출 제한을 넘었습니다.', {'retry-after': String(rate.retryAfterSeconds)});
      const read = await readJsonBody(request);
      if (read.response) return read.response;
      const shape = checkBodyShape(op, read.value);
      if (shape) return envelopeResponse(shape);
      body = read.value;
    }
    const parsed = op.parse({url: new URL(request.url), params, body});
    if (parsed.reject) return envelopeResponse(parsed.reject);
    const versionReject = rejectUnexpectedVersion(parsed.catalogVersion);
    if (versionReject) return envelopeResponse(versionReject);
    return envelopeResponse(op.call(parsed.args), {cache: op.method === 'GET', request});
  } catch {
    // 서비스는 던지지 않는다. 여기에 오는 것은 채널 코드의 예기치 못한 예외이며 내용(스택·경로)은 싣지 않는다.
    return errorResponse('INTERNAL', '$', '내부 오류로 처리하지 못했습니다.');
  }
}

export {OPERATIONS, queryToArgs};
