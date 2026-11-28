// 환경 변수 DSK_PERF_METRICS가 '1'일 때만 활성화되는 서버 컴파일 계측 카운터.
// 기본 상태(미지정)에서는 어떤 오버헤드나 동작 변경도 발생하지 않는다.
// 세는 단위는 "Core 서비스 호출 1회"다. assembleDesign 은 한 번에 후보 여러 개를 조립할 수 있어 Blueprint 컴파일 수와 같지 않다.
// 세는 곳: platform.server(assembleDesign, assembleComponents), explore/designs.server(renderDesign), components/spec.server(compileHtml),
// explore/qa/combos.server(renderCombo). 세지 않는 곳: REST·MCP 공개 API(lib/api), 브라우저 안의 Studio 컴파일.

const enabled = process.env.DSK_PERF_METRICS === '1';

export interface PerfCounters {
  compileBlueprint: number;
  assembleDesign: number;
  assembleComponents: number;
  total: number;
}

const getGlobalCounters = (): PerfCounters => {
  const g = globalThis as unknown as {__DSK_PERF_COUNTERS__?: PerfCounters};
  if (!g.__DSK_PERF_COUNTERS__) {
    g.__DSK_PERF_COUNTERS__ = {
      compileBlueprint: 0,
      assembleDesign: 0,
      assembleComponents: 0,
      total: 0,
    };
  }
  return g.__DSK_PERF_COUNTERS__;
};

export function recordCompile(kind: 'compileBlueprint' | 'assembleDesign' | 'assembleComponents'): void {
  if (!enabled) return;
  const c = getGlobalCounters();
  c[kind] = (c[kind] ?? 0) + 1;
  c.total = (c.total ?? 0) + 1;
}

export function getCompileCounters(): {enabled: boolean; counters: PerfCounters} {
  return {
    enabled,
    counters: {...getGlobalCounters()},
  };
}

export function resetCompileCounters(): {enabled: boolean; counters: PerfCounters} {
  const c = getGlobalCounters();
  c.compileBlueprint = 0;
  c.assembleDesign = 0;
  c.assembleComponents = 0;
  c.total = 0;
  return {
    enabled,
    counters: {...c},
  };
}
