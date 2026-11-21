/**
 * 서비스 함수 여섯 개가 함께 쓰는 결과 봉투. 채널(Studio·REST·MCP·CLI)마다 모양이 달라지지 않게 한 곳에서 만든다.
 *
 *   성공  {ok: true,  value, warnings, catalogVersion, contractVersion}
 *   실패  {ok: false, errors, warnings, catalogVersion, contractVersion}
 * Diagnostic 필수 필드는 code·path·message·hint이며, rule·fix·severity·contract는 진단 종류에 따라 선택이다.
 *
 * 서비스 함수는 던지지 않는다. 예상하지 못한 예외는 INTERNAL 오류로 감싸고 스택은 싣지 않는다.
 * 브라우저와 Node에서 같게 동작한다.
 */
import {CATALOG_VERSION} from '../catalog.mjs';
import {diagnostic} from './errors.mjs';

/** 서비스 계약 버전. 결과 봉투나 Diagnostic 모양이 바뀔 때 올린다(카탈로그 버전과 따로 움직인다). */
export const CONTRACT_VERSION = '1.1.0';

const versions = () => ({catalogVersion: CATALOG_VERSION, contractVersion: CONTRACT_VERSION});
export const ok = (value, warnings = []) => ({ok: true, value, warnings, ...versions()});
export const fail = (errors, warnings = []) => ({ok: false, errors, warnings, ...versions()});

export const isPlain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && [Object.prototype, null].includes(Object.getPrototypeOf(x));
/** 반환값을 JSON으로 직렬화되는 새 객체로 만든다. 카탈로그 객체는 얼어 있어 그대로 돌려주면 호출자가 수정하다 예외를 만난다. */
export const jsonClone = x => JSON.parse(JSON.stringify(x));
export const pretty = x => JSON.stringify(x, null, 2) + '\n';
export const utf8Bytes = text => new TextEncoder().encode(text).length;

export const badRequest = (path, message, hint) => diagnostic('BAD_REQUEST', path, message, hint);
const internal = e => diagnostic('INTERNAL', '$', '내부 오류로 처리하지 못했습니다: ' + String(e?.message ?? e).split('\n')[0].slice(0, 200));

/** 함수 본문을 실행하고 던져진 예외를 INTERNAL 결과로 바꾼다. */
export function guard(run) {
  try { return run(); } catch (e) { return fail([internal(e)]); }
}

/** 질의 객체의 알려진 키만 허용한다. 오타가 조용히 무시되어 전체 카탈로그가 나가는 일을 막는다. */
export function checkKeys(obj, allowed, path) {
  const bad = Object.keys(obj).find(k => !allowed.includes(k));
  return bad === undefined ? null : badRequest(`${path}.${bad}`, `알 수 없는 인자: ${bad}`, `허용 인자: ${allowed.join(', ')}`);
}
