// REST·MCP 채널이 함께 쓰는 한도. 값을 바꾸면 docs/dev/platform/07-api-mcp.md 의 표도 바꾼다.

/** POST 본문 상한(바이트). 검증기의 문서 상한(limits.bytes 196608)보다 커야 검증기가 SIZE 로 판정한다. 이 값을 넘으면 413. */
export const MAX_BODY_BYTES = 512 * 1024;

/** 호출 제한. 인스턴스 메모리 안의 창 하나라서 서버리스에서는 인스턴스마다 따로 센다(07-api-mcp.md 의 한계 절). */
export const RATE_WINDOW_MS = 60_000;
export const RATE_BUDGET = Number(process.env.API_RATE_BUDGET ?? 120);
/** 호출 한 번의 비용. 컴파일이 가장 비싸다(약 10~100ms). */
export const COST = Object.freeze({validate: 1, explain: 2, compile: 3, assemble: 6});
/** 한 인스턴스가 추적하는 호출자 수 상한. 넘으면 가장 오래된 호출자부터 잊는다(메모리 상한). */
export const RATE_MAX_CLIENTS = 2000;

/** MCP 도구 한 번의 실행 시간 상한(밀리초). 서비스 함수는 동기라 중간에 끊지 못하고, 끝난 뒤 초과를 알린다. */
export const TOOL_TIMEOUT_MS = 10_000;
/** 라우트 최대 실행 시간(초). Vercel 함수가 이 값에서 끊는다. */
export const MAX_DURATION_S = 30;

/** 읽기 응답 캐시. 카탈로그는 배포 단위로만 바뀌므로 CDN 은 길게, 브라우저는 짧게. */
export const GET_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
