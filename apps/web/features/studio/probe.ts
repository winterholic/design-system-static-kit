// 성능 측정 스크립트(scripts/perf/measure.mjs)가 Studio 내부 상태와 컴파일 횟수를 읽는 훅(window.__studio_api, window.__studio_compile_count)을 켜는 스위치다.
// 빌드 시점에 DSK_STUDIO_PROBE=1 로 만든 번들에만 들어간다(next.config.mjs 가 값을 박는다). 운영 빌드는 '0' 이라 훅 코드가 번들에서 사라진다(e2e/studio-probe.spec.mjs 가 확인).
// 훅은 편집 상태와 Core 에 닿는 읽기·쓰기 전부를 내보내므로 운영 페이지에서 켜지 않는다.
export const STUDIO_PROBE = process.env.DSK_STUDIO_PROBE === '1';
