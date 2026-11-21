// 채널(REST·MCP) 계층의 오류. 서비스가 내는 Diagnostic({code,path,message,hint})을 그대로 쓰고,
// 서비스가 알 수 없는 전송 수준 문제(크기·호출 제한·없는 경로)만 같은 모양으로 여기서 만든다.
// 서비스 계층의 code → hint 표는 src/service/errors.mjs 가 소유한다(수정 금지 범위). 아래 코드는 그 표에 없다.
import {hintFor, listCatalog} from '@winterholic/design-system-static-kit/service';

/** 전송 수준 코드와 hint. */
const TRANSPORT = {
  PAYLOAD_TOO_LARGE: {status: 413, hint: '본문을 줄여 다시 보내세요. 문서 자체의 상한은 검증기의 limits.bytes 이고, 그보다 큰 요청은 검증 전에 거부됩니다.'},
  RATE_LIMITED: {status: 429, hint: 'Retry-After 초 뒤에 다시 시도하세요. 호출 제한은 서버 인스턴스 단위입니다.'},
  NOT_FOUND: {status: 404, hint: '/api/v1/openapi.json 에서 제공하는 경로 목록을 확인하세요.'},
  METHOD_NOT_ALLOWED: {status: 405, hint: 'Allow 헤더에 적힌 메서드를 쓰세요.'},
  UNSUPPORTED_MEDIA_TYPE: {status: 415, hint: 'Content-Type: application/json 으로 보내세요.'},
  TIMEOUT: {status: 504, hint: '요청이 시간 안에 끝나지 않았습니다. 입력을 줄여 다시 시도하세요.'},
};

/** 서비스 코드 → HTTP 상태. 여기에 없는 코드(검증기 코드 전부 포함)는 입력은 읽었으나 규칙을 어긴 것이므로 422. */
const STATUS = {
  BAD_REQUEST: 400, UNKNOWN_KIND: 400, UNKNOWN_TEMPLATE: 400, UNKNOWN_THEME: 400, UNKNOWN_PALETTE: 400, UNKNOWN_AXIS: 400, UNSUPPORTED_VERSION: 400,
  UNKNOWN_COMPONENT: 404, INTERNAL: 500,
  ...Object.fromEntries(Object.entries(TRANSPORT).map(([code, v]) => [code, v.status])),
};

export const statusOfCode = code => (Object.hasOwn(STATUS, code) ? STATUS[code] : 422);
/** 첫 오류가 대표다. 서비스는 요청 형식 오류를 문서 규칙 오류보다 먼저 내고, 한 응답에 두 종류를 섞지 않는다. */
export const statusOfErrors = errors => statusOfCode(errors[0]?.code);

// 버전 값은 서비스 봉투에서 읽는다(채널이 카탈로그 버전을 따로 알지 않는다). 한 번만 읽는다.
let cached;
const versions = () => (cached ??= (r => ({catalogVersion: r.catalogVersion, contractVersion: r.contractVersion}))(listCatalog({kind: 'axes', limit: 1})));

/** 서비스 봉투와 같은 모양의 채널 오류 봉투. */
export function channelError(code, path, message, hint = TRANSPORT[code]?.hint ?? hintFor(code)) {
  return {ok: false, errors: [{code, path, message, hint}], warnings: [], ...versions()};
}

export const transportStatus = code => TRANSPORT[code]?.status ?? statusOfCode(code);
