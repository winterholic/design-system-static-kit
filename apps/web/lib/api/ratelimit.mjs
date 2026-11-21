// 비용 큰 호출(검증·컴파일·설명)의 간단한 호출 제한. 호출자별 고정 창 합계 방식이다.
// 한계: 상태가 인스턴스 메모리에만 있다. 서버리스에서는 인스턴스마다 따로 세고 콜드 스타트마다 초기화되므로
// 전역 제한이 아니다. 실제 방어선은 플랫폼 방화벽(Vercel WAF rate limiting)이다. 이 제한은 한 인스턴스가 폭주하는 것을 막는 최소 장치다.
import {RATE_BUDGET, RATE_MAX_CLIENTS, RATE_WINDOW_MS} from './limits.mjs';

/** @type {Map<string, {start: number, used: number}>} */
const clients = new Map();

/**
 * 호출자 키. 플랫폼이 덮어쓰는 전달 헤더의 첫 값을 쓴다. 헤더가 없으면 한 덩어리('anonymous')로 센다.
 * Vercel 은 x-forwarded-for 를 클라이언트 값으로 덮어쓴다. 자체 호스팅에서 프록시 뒤가 아니면 이 값은 위조될 수 있다.
 */
export function clientKey(request) {
  const h = request.headers;
  const raw = h.get('x-vercel-forwarded-for') ?? h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'anonymous';
  return raw.split(',')[0].trim().slice(0, 64) || 'anonymous';
}

/** @returns {{ok: true} | {ok: false, retryAfterSeconds: number}} */
export function takeRate(key, cost, now = Date.now()) {
  let c = clients.get(key);
  if (!c || now - c.start >= RATE_WINDOW_MS) c = {start: now, used: 0};
  if (c.used + cost > RATE_BUDGET) {
    clients.delete(key); clients.set(key, c); // 최근 사용 순서 유지
    return {ok: false, retryAfterSeconds: Math.max(1, Math.ceil((c.start + RATE_WINDOW_MS - now) / 1000))};
  }
  c.used += cost;
  clients.delete(key); clients.set(key, c);
  while (clients.size > RATE_MAX_CLIENTS) clients.delete(clients.keys().next().value);
  return {ok: true};
}

/** 시험에서 상태를 비운다. */
export function resetRateLimit() { clients.clear(); }
