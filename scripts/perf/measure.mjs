#!/usr/bin/env node
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {parseArgs} from 'node:util';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '/Users/winterholic/Library/Caches/ms-playwright';
}

// Static Kit 성능 기준선 측정 스크립트
// Playwright(Chromium) 기반으로 8개 페이지, 2개 뷰포트(390px, 1280px), 최소 3회 측정

const TARGET_PAGES = [
  {id: 'explore', path: '/explore', label: 'Explore'},
  {id: 'materials', path: '/materials', label: 'Materials'},
  {id: 'color', path: '/materials/color', label: 'Color'},
  {id: 'palettes', path: '/materials/palettes', label: 'Palettes'},
  {id: 'typography', path: '/materials/typography', label: 'Typography'},
  {id: 'components', path: '/components', label: 'Components'},
  {id: 'components-detail', path: '/components/card', label: 'Components 상세'},
  {id: 'studio', path: '/studio', label: 'Studio'},
];

const VIEWPORTS = [
  {id: 'mobile-390', width: 390, height: 844, isMobile: true, label: '390px (Mobile)'},
  {id: 'desktop-1280', width: 1280, height: 800, isMobile: false, label: '1280px (Desktop)'},
];

const DEFAULT_RUNS = 3;

function parseCli() {
  const {values} = parseArgs({
    options: {
      url: {type: 'string', default: 'http://127.0.0.1:4173'},
      env: {type: 'string', default: 'local-prod'},
      out: {type: 'string', default: 'docs/dev/catalog-platform-upgrade/PERFORMANCE-BASELINE.json'},
      runs: {type: 'string', default: String(DEFAULT_RUNS)},
      vercelUrl: {type: 'string', default: 'https://design-system-static-kit.vercel.app'},
      measureVercel: {type: 'boolean', default: false},
      vercelDeploymentId: {type: 'string'},
      vercelCommit: {type: 'string'},
      pages: {type: 'string'},
      viewports: {type: 'string'},
    },
    strict: false,
    allowPositionals: true,
  });
  return {
    baseUrl: values.url.replace(/\/$/, ''),
    envName: values.env,
    outPath: resolve(values.out),
    runs: Math.max(3, parseInt(values.runs, 10) || DEFAULT_RUNS),
    vercelUrl: values.vercelUrl.replace(/\/$/, ''),
    measureVercel: Boolean(values.measureVercel),
    vercelDeploymentId: values.vercelDeploymentId ?? null,
    vercelCommit: values.vercelCommit ?? null,
    pageFilter: values.pages ? values.pages.split(',') : null,
    viewportFilter: values.viewports ? values.viewports.split(',') : null,
  };
}

async function getCompileCounters(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/dev/perf-counters`, {
      headers: {'cache-control': 'no-store'},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.counters ?? null;
  } catch {
    return null;
  }
}

async function resetCompileCounters(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/dev/perf-counters`, {
      method: 'POST',
      headers: {'cache-control': 'no-store'},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.counters ?? null;
  } catch {
    return null;
  }
}

function median(numbers) {
  if (!numbers || !numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

const INIT_SCRIPT = `
window.__perf_metrics = {
  lcp: 0,
  cls: 0,
  longTaskTotal: 0,
  inpApprox: 0,
};

try {
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries[entries.length - 1];
    if (last) {
      window.__perf_metrics.lcp = last.renderTime || last.loadTime || 0;
    }
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
} catch (e) {}

try {
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        window.__perf_metrics.cls += entry.value;
      }
    }
  });
  clsObserver.observe({ type: 'layout-shift', buffered: true });
} catch (e) {}

try {
  const ltObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf_metrics.longTaskTotal += entry.duration;
    }
  });
  ltObserver.observe({ type: 'longtask', buffered: true });
} catch (e) {}

try {
  const evObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > window.__perf_metrics.inpApprox) {
        window.__perf_metrics.inpApprox = entry.duration;
      }
    }
  });
  evObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
} catch (e) {}
`;

// 전송량은 Playwright 가 보고하는 실제 전송 바이트(압축 후 본문 + 헤더)다. 본문을 풀어 센 값이 아니다.
// totalDecoded 는 압축을 푼 본문 크기로, 파싱·메모리 비용 가늠용이다.
async function wireSize(response) {
  try {
    const sizes = await response.request().sizes();
    return sizes.responseBodySize + sizes.responseHeadersSize;
  } catch {
    return 0;
  }
}

const ENABLED = ':not([disabled]):not([aria-disabled="true"])';
const INTERACTION_SELECTOR = [
  'a[role="tab"]', 'button[role="tab"]', 'a[class*="segItem"]', 'a[href*="mode="]', 'a[href*="sample="]', 'a[href*="page="]', 'button[class*="button"]',
].map((sel) => `${sel}${ENABLED}`).join(', ');

async function measureSingleRun(browser, baseUrl, pageSpec, viewport, runIndex) {
  const context = await browser.newContext({
    viewport: {width: viewport.width, height: viewport.height},
    isMobile: viewport.isMobile,
  });

  const page = await context.newPage();
  await page.addInitScript(INIT_SCRIPT);

  const client = await context.newCDPSession(page);
  await client.send('Performance.enable');

  let requestCount = 0;
  let htmlTransfer = 0;
  let rscTransfer = 0;
  let jsTransfer = 0;
  let cssTransfer = 0;
  let totalTransfer = 0;
  let totalDecoded = 0;
  const pending = [];
  // 메인 프레임이 아닌 문서 탐색 = iframe 이 새로 로드된 횟수(제거 후 재진입도 새로 센다).
  let iframeLoads = 0;
  let sweeping = false;
  let sweepIframeLoads = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) return;
    if (frame.url() === 'about:blank') return;
    iframeLoads++;
    if (sweeping) sweepIframeLoads++;
  });

  page.on('response', (response) => {
    requestCount++;
    pending.push((async () => {
      try {
        const headers = response.headers();
        const ctype = headers['content-type'] || '';
        const url = response.url();
        const size = await wireSize(response);
        const body = await response.body().catch(() => null);
        totalDecoded += body ? body.length : 0;
        totalTransfer += size;
        if (ctype.includes('text/html')) {
          htmlTransfer += size;
        } else if (ctype.includes('text/x-component') || url.includes('_rsc=')) {
          rscTransfer += size;
        } else if (url.endsWith('.js') || ctype.includes('javascript')) {
          jsTransfer += size;
        } else if (url.endsWith('.css') || ctype.includes('text/css')) {
          cssTransfer += size;
        }
      } catch {
        // response body reading failed (stream closed etc.)
      }
    })());
  });

  // 카운터 리셋 (서버 지원 시)
  await resetCompileCounters(baseUrl);

  const targetUrl = `${baseUrl}${pageSpec.path}`;
  const startTime = Date.now();
  const response = await page.goto(targetUrl, {waitUntil: 'networkidle', timeout: 30000});
  const loadDuration = Date.now() - startTime;
  const status = response ? response.status() : 0;

  // 브라우저 렌더 안정화 대기
  await page.waitForTimeout(500);
  await Promise.all(pending);

  // Performance Navigation Timing 및 지표 읽기
  const navMetrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
    const pm = window.__perf_metrics || {};
    return {
      ttfb: Math.max(0, ttfb),
      lcp: Math.round(pm.lcp || 0),
      cls: Math.round((pm.cls || 0) * 1000) / 1000,
      longTaskTotal: Math.round(pm.longTaskTotal || 0),
      inpApprox: Math.round(pm.inpApprox || 0),
      domNodes: document.querySelectorAll('*').length,
      activeIframes: document.querySelectorAll('iframe').length,
    };
  });

  // 초기 로드까지의 요청·전송량 스냅샷. 이후 상호작용·스크롤에서 늘어나는 값과 섞지 않는다.
  const loadStats = {requestCount, htmlTransfer, rscTransfer, jsTransfer, cssTransfer, totalTransfer, totalDecoded, iframeLoads};

  // 초기 로드만으로 발생한 서버 컴파일 호출 수(상호작용·스크롤 이전)
  const loadCounters = await getCompileCounters(baseUrl);
  const compileCount = loadCounters ? loadCounters.total : null;

  // CDP 메모리 메트릭
  let jsHeapUsed = 0;
  try {
    const cdpMetrics = await client.send('Performance.getMetrics');
    const heapMetric = cdpMetrics.metrics.find((m) => m.name === 'JSHeapUsedSize');
    if (heapMetric) jsHeapUsed = Math.round(heapMetric.value);
  } catch {}

  // 눈에 보이고 눌 수 있는 첫 탭·분할 버튼·페이지 이동 링크를 누른다. 누르지 못하면 실패로 기록하고 소요 시간은 비운다.
  // tabSwitchDuration: 클릭 시작부터 두 번째 animation frame 까지(UI 반응 시간). 데이터 로딩 완료 시간은 아니다.
  let tabSwitchDuration = null;
  let interactionTarget = null;
  let interactionOk = false;
  let navigated = false;
  try {
    const target = page.locator(INTERACTION_SELECTOR).filter({visible: true}).first();
    if ((await target.count()) > 0) {
      interactionTarget = await target.evaluate((el) => `${el.tagName.toLowerCase()}${el.getAttribute('href') ? `[href=${el.getAttribute('href').slice(0, 60)}]` : ''}${el.textContent ? ` "${el.textContent.trim().slice(0, 20)}"` : ''}`);
      const before = page.url();
      const actStart = performance.now();
      try {
        await target.click({timeout: 2000});
        interactionOk = true;
      } catch {
        interactionOk = false;
      }
      if (interactionOk) {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        tabSwitchDuration = Math.round(performance.now() - actStart);
        await page.waitForTimeout(150);
        navigated = page.url() !== before;
      }
    }
  } catch {}
  const interactionMetrics = await page.evaluate(() => ({inpApprox: Math.round((window.__perf_metrics || {}).inpApprox || 0)})).catch(() => ({inpApprox: navMetrics.inpApprox}));

  // 스크롤 측정
  let scrollDuration = 0;
  try {
    const scrStart = performance.now();
    await page.evaluate(() => {
      window.scrollTo({top: document.body.scrollHeight / 2, behavior: 'instant'});
    });
    await page.waitForTimeout(50);
    await page.evaluate(() => {
      window.scrollTo({top: 0, behavior: 'instant'});
    });
    scrollDuration = Math.round(performance.now() - scrStart);
  } catch {}

  const interactionCounters = await getCompileCounters(baseUrl);
  const compileCountAfterInteraction = interactionCounters ? interactionCounters.total : null;

  // 끝까지 내려갔다 올라오는 스윕: 동시에 살아 있는 iframe 최대 수, 스윕 중 새로 로드된 iframe 수(재진입 포함).
  // 상호작용이 다른 페이지로 이동시켰으면 원래 페이지로 돌아와 같은 조건에서 잰다.
  if (navigated) {
    await page.goto(targetUrl, {waitUntil: 'networkidle', timeout: 30000}).catch(() => {});
  }
  const scrollSweep = {maxConcurrentIframes: 0, iframeLoads: 0, iframesAtEnd: 0, iframesBackAtTop: 0, steps: 0, documentHeight: 0};
  try {
    sweeping = true;
    const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = Math.max(200, Math.round(viewport.height * 0.8));
    const positions = [];
    for (let y = 0; y < docHeight; y += step) positions.push(y);
    positions.push(docHeight);
    const sweepPass = async (list) => {
      for (const y of list) {
        await page.evaluate((top) => window.scrollTo({top, behavior: 'instant'}), y);
        await page.waitForTimeout(80);
        const n = await page.evaluate(() => document.querySelectorAll('iframe').length);
        scrollSweep.maxConcurrentIframes = Math.max(scrollSweep.maxConcurrentIframes, n);
        scrollSweep.steps++;
      }
    };
    await sweepPass(positions);
    await page.waitForTimeout(300);
    scrollSweep.iframesAtEnd = await page.evaluate(() => document.querySelectorAll('iframe').length);
    scrollSweep.iframeLoads = sweepIframeLoads;
    await sweepPass([...positions].reverse());
    await page.waitForTimeout(300);
    scrollSweep.iframesBackAtTop = await page.evaluate(() => document.querySelectorAll('iframe').length);
    scrollSweep.iframeLoadsDownAndUp = sweepIframeLoads;
    scrollSweep.documentHeight = docHeight;
  } catch {} finally {
    sweeping = false;
  }

  // 서버 측 컴파일 호출 수 읽기(스윕 이후 누적)
  const sweepCounters = await getCompileCounters(baseUrl);
  const compileCountAfterSweep = sweepCounters ? sweepCounters.total : null;
  const compileBreakdown = sweepCounters ? {...sweepCounters} : null;
  const loadBreakdown = loadCounters ? {...loadCounters} : null;

  await context.close();

  return {
    run: runIndex + 1,
    status,
    ttfb: navMetrics.ttfb,
    lcp: navMetrics.lcp,
    cls: navMetrics.cls,
    // 이벤트 타이밍 관측값만 쓴다. 상호작용 소요 시간으로 대체·상한 보정하지 않는다(없으면 0).
    inpApprox: Math.max(navMetrics.inpApprox, interactionMetrics.inpApprox),
    requestCount: loadStats.requestCount,
    htmlTransfer: loadStats.htmlTransfer,
    rscTransfer: loadStats.rscTransfer,
    jsTransfer: loadStats.jsTransfer,
    cssTransfer: loadStats.cssTransfer,
    totalTransfer: loadStats.totalTransfer,
    totalDecoded: loadStats.totalDecoded,
    // 스크롤 스윕까지 포함한 한 회차 전체 누적(초기 로드 + 상호작용 + 스윕)
    requestCountWholeRun: requestCount,
    totalTransferWholeRun: totalTransfer,
    domNodes: navMetrics.domNodes,
    activeIframes: navMetrics.activeIframes,
    iframeLoadsAtLoad: loadStats.iframeLoads,
    iframeLoadsWholeRun: iframeLoads,
    longTaskTotal: navMetrics.longTaskTotal,
    jsHeapUsed,
    scrollDuration,
    tabSwitchDuration,
    interactionTarget,
    interactionOk,
    navigated,
    compileCount,
    compileCountAfterInteraction,
    compileCountAfterSweep,
    compileBreakdownAtLoad: loadBreakdown,
    compileBreakdownAfterSweep: compileBreakdown,
    scrollSweep,
    loadDuration,
  };
}

// 본문 첫 청크가 도착할 때까지의 시간(curl 의 time_starttransfer 와 같은 의미). Navigation Timing 의 requestStart→responseStart 는
// 응답 헤더가 먼저 오는 배포 환경(Vercel 스트리밍)에서 서버 처리 시간을 과소 보고하므로 교차 확인용으로 따로 잰다.
async function firstByteMs(url) {
  const start = performance.now();
  try {
    const res = await fetch(url, {headers: {'cache-control': 'no-cache'}});
    const reader = res.body.getReader();
    await reader.read();
    const ms = Math.round(performance.now() - start);
    await reader.cancel().catch(() => {});
    return ms;
  } catch {
    return null;
  }
}

async function measureColdVsWarm(browser, baseUrl) {
  console.log(`\n[콜드/웜 TTFB 측정] 대상: ${baseUrl}/explore`);
  // 서버를 막 띄운 직후라면 첫 요청이 콜드다. 브라우저보다 먼저 보내 콜드 상태를 소모하지 않게 한다.
  const coldFirstByteMs = await firstByteMs(`${baseUrl}/explore`);
  const warmFirstByteMs = await firstByteMs(`${baseUrl}/explore`);
  const context = await browser.newContext();
  const page = await context.newPage();

  // 첫 요청 (Cold Start)
  await page.goto(`${baseUrl}/explore`, {waitUntil: 'domcontentloaded'});
  const coldTtfb = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
  });

  // 두 번째 요청 (Warm)
  await page.goto(`${baseUrl}/explore`, {waitUntil: 'domcontentloaded'});
  const warmTtfb = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
  });

  await context.close();

  console.log(`  콜드 TTFB: ${coldTtfb}ms, 웜 TTFB: ${warmTtfb}ms, 차이: ${coldTtfb - warmTtfb}ms`);
  return {
    coldFirstByteMs,
    warmFirstByteMs,
    firstByteDiffMs: coldFirstByteMs !== null && warmFirstByteMs !== null ? coldFirstByteMs - warmFirstByteMs : null,
    // 아래 세 값은 위 두 요청이 서버를 이미 데운 뒤 브라우저가 잰 값이라 콜드가 아니다. 참고용.
    coldTtfb,
    warmTtfb,
    diffMs: coldTtfb - warmTtfb,
  };
}

async function readGitCommit() {
  try {
    const {execFileSync} = await import('node:child_process');
    return execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  } catch {
    return null;
  }
}

// 응답 헤더로 확인되는 배포 식별 정보. 커밋 SHA 는 헤더에 노출되지 않아 호출자가 알려 준 값(--vercelCommit)만 기록한다.
async function probeIdentity(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/explore`, {method: 'GET', redirect: 'manual'});
    const h = res.headers;
    return {
      status: res.status,
      server: h.get('server'),
      xVercelId: h.get('x-vercel-id'),
      xVercelCache: h.get('x-vercel-cache'),
      xMatchedPath: h.get('x-matched-path'),
      probedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {error: err.message, probedAt: new Date().toISOString()};
  }
}

const num = (rawRuns, key) => median(rawRuns.map((r) => r[key]));

async function measureEnvironment(browser, baseUrl, envName, runs, filters = {}) {
  console.log(`\n======================================================`);
  console.log(`환경 측정 시작: ${envName} (${baseUrl})`);
  console.log(`반복 횟수: ${runs}회`);
  console.log(`======================================================`);

  // 콜드/웜 측정
  const coldWarm = await measureColdVsWarm(browser, baseUrl);

  const results = [];
  const pages = TARGET_PAGES.filter((p) => !filters.pages || filters.pages.includes(p.id));
  const viewports = VIEWPORTS.filter((v) => !filters.viewports || filters.viewports.includes(v.id));

  for (const pageSpec of pages) {
    for (const viewport of viewports) {
      console.log(`\n측정 중: [${pageSpec.label}] @ ${viewport.label}`);
      const rawRuns = [];
      const firstBytes = [];
      for (let i = 0; i < 3; i++) firstBytes.push(await firstByteMs(`${baseUrl}${pageSpec.path}`));

      for (let r = 0; r < runs; r++) {
        process.stdout.write(`  회차 ${r + 1}/${runs} ... `);
        const metrics = await measureSingleRun(browser, baseUrl, pageSpec, viewport, r);
        rawRuns.push(metrics);
        console.log(
          `TTFB: ${metrics.ttfb}ms, LCP: ${metrics.lcp}ms, CLS: ${metrics.cls}, iframe: ${metrics.activeIframes}, DOM: ${metrics.domNodes}, 컴파일: ${metrics.compileCount ?? 'N/A'}`
        );
      }

      const hasCounters = rawRuns[0].compileCount !== null;
      // 중앙값 집계
      const medianResult = {
        ttfb: num(rawRuns, 'ttfb'),
        serverFirstByteMs: median(firstBytes.filter((v) => v !== null)),
        lcp: num(rawRuns, 'lcp'),
        cls: num(rawRuns, 'cls'),
        inpApprox: num(rawRuns, 'inpApprox'),
        requestCount: num(rawRuns, 'requestCount'),
        htmlTransfer: num(rawRuns, 'htmlTransfer'),
        rscTransfer: num(rawRuns, 'rscTransfer'),
        jsTransfer: num(rawRuns, 'jsTransfer'),
        cssTransfer: num(rawRuns, 'cssTransfer'),
        totalTransfer: num(rawRuns, 'totalTransfer'),
        totalDecoded: num(rawRuns, 'totalDecoded'),
        domNodes: num(rawRuns, 'domNodes'),
        activeIframes: num(rawRuns, 'activeIframes'),
        iframeLoadsAtLoad: num(rawRuns, 'iframeLoadsAtLoad'),
        requestCountWholeRun: num(rawRuns, 'requestCountWholeRun'),
        totalTransferWholeRun: num(rawRuns, 'totalTransferWholeRun'),
        longTaskTotal: num(rawRuns, 'longTaskTotal'),
        jsHeapUsed: num(rawRuns, 'jsHeapUsed'),
        scrollDuration: num(rawRuns, 'scrollDuration'),
        // 상호작용에 성공한 회차만 집계한다. 한 번도 성공하지 못하면 null.
        tabSwitchDuration: rawRuns.some((r) => r.interactionOk) ? median(rawRuns.filter((r) => r.interactionOk).map((r) => r.tabSwitchDuration)) : null,
        interactionOkRuns: rawRuns.filter((r) => r.interactionOk).length,
        compileCount: hasCounters ? num(rawRuns, 'compileCount') : null,
        compileCountAfterInteraction: hasCounters ? num(rawRuns, 'compileCountAfterInteraction') : null,
        compileCountAfterSweep: hasCounters ? num(rawRuns, 'compileCountAfterSweep') : null,
        sweepMaxConcurrentIframes: median(rawRuns.map((r) => r.scrollSweep.maxConcurrentIframes)),
        sweepIframeLoads: median(rawRuns.map((r) => r.scrollSweep.iframeLoads)),
        sweepIframeLoadsDownAndUp: median(rawRuns.map((r) => r.scrollSweep.iframeLoadsDownAndUp ?? 0)),
        sweepIframesAtEnd: median(rawRuns.map((r) => r.scrollSweep.iframesAtEnd)),
      };

      results.push({
        pageId: pageSpec.id,
        pageLabel: pageSpec.label,
        path: pageSpec.path,
        viewport: {
          id: viewport.id,
          label: viewport.label,
          width: viewport.width,
          height: viewport.height,
          isMobile: viewport.isMobile,
        },
        // 하위 호환용 평탄 필드(최초 커밋의 소비자가 읽던 이름)
        viewportId: viewport.id,
        viewportLabel: viewport.label,
        width: viewport.width,
        height: viewport.height,
        median: medianResult,
        runs: rawRuns,
      });
    }
  }

  return {
    environment: envName,
    baseUrl,
    measuredAt: new Date().toISOString(),
    runsCount: runs,
    coldWarm,
    pages: results,
  };
}

async function main() {
  const cli = parseCli();

  console.log(`성능 기준선 측정 시작`);
  console.log(`로컬 대상 URL: ${cli.baseUrl}`);
  console.log(`출력 파일: ${cli.outPath}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const filters = {pages: cli.pageFilter, viewports: cli.viewportFilter};

  try {
    // 1. 로컬 운영 빌드 환경 측정
    const localIdentity = {commit: await readGitCommit(), node: process.version, counters: (await getCompileCounters(cli.baseUrl)) !== null};
    const localData = await measureEnvironment(browser, cli.baseUrl, cli.envName, cli.runs, filters);
    localData.identity = localIdentity;

    // 2. Vercel 운영 배포 환경 측정: --measureVercel 을 줄 때만 실행한다.
    let vercelData = null;
    if (cli.measureVercel) {
      try {
        const identity = await probeIdentity(cli.vercelUrl);
        if (identity.status === 200) {
          console.log(`\nVercel 운영 배포 접근 확인 성공: ${cli.vercelUrl}`);
          vercelData = await measureEnvironment(browser, cli.vercelUrl, 'vercel-prod', cli.runs, filters);
          vercelData.identity = {
            ...identity,
            deploymentId: cli.vercelDeploymentId ?? 'unverified',
            deployedCommit: cli.vercelCommit ?? 'unverified',
            vantage: `${process.platform} 로컬 머신에서 공용 인터넷으로 접속(단일 위치, 실사용자 RUM 아님)`,
          };
        } else {
          console.warn(`Vercel 운영 배포 응답 코드: ${identity.status}. 측정 생략.`);
        }
      } catch (err) {
        console.warn(`Vercel 운영 배포 접근 실패: ${err.message}. 측정 생략.`);
      }
    }

    const payload = {
      version: '1.1.0',
      description: 'Static Kit 최적화 전 성능 기준선 (Phase 0/1 Baseline)',
      targets: {
        lcp: '<= 2500ms',
        inp: '<= 200ms',
        cls: '<= 0.1',
        activeIframes: '0개 (일반 카탈로그)',
        dynamicCompiles: '0회 (목록 요청 시)',
        initialCards: '<= 24개',
      },
      notes: [
        '모든 값은 실험실 측정이다. 실사용자(RUM) 데이터가 아니다.',
        'local 은 next build 후 next start 의 운영 빌드이며 Vercel 운영 실측이 아니다. vercel 환경은 실제 배포 URL 응답이지만 단일 위치에서 잰 값이다.',
        'transfer 계열은 압축 후 실제 전송 바이트(본문+헤더)다. totalDecoded 는 압축을 푼 본문 합계다.',
        'inpApprox 는 Event Timing 관측 최댓값이다(16ms 미만 이벤트는 관측되지 않아 0). 상호작용 소요 시간으로 대체하지 않는다.',
        'compileCount 는 초기 로드(상호작용·스크롤 이전)의 서버 계측 호출 수이고, AfterInteraction·AfterSweep 은 누적이다. 호출 1회가 후보 여러 개를 조립할 수 있어 Blueprint 컴파일 수와 같지 않다.',
        'compileCount 는 DSK_PERF_METRICS=1 로 띄운 서버에서만 잡힌다(Vercel 은 null).',
        'ttfb 는 Navigation Timing(requestStart→responseStart, 응답 헤더 도착)이고 serverFirstByteMs 는 본문 첫 청크까지의 시간이다. 스트리밍 배포 환경에서는 둘이 크게 다를 수 있어 서버 지연 판단에는 serverFirstByteMs 를 쓴다.',
        'coldWarm: 서버를 막 띄운 직후의 첫 요청(coldFirstByteMs)과 곧바로 이은 두 번째 요청(warmFirstByteMs)의 차이다. 서버를 새로 띄운 직후에 실행했을 때만 콜드로 읽는다. Vercel 의 cold/warm 은 유휴 후 첫 요청을 보장하지 않으므로 콜드 스타트 측정으로 쓰지 않는다.',
      ],
      summary: {
        timestamp: new Date().toISOString(),
        localEnv: localData.environment,
        vercelEnv: vercelData ? vercelData.environment : 'unverified (미측정 또는 접근 불가)',
      },
      environments: {
        local: localData,
        ...(vercelData ? {vercel: vercelData} : {}),
      },
    };

    await mkdir(dirname(cli.outPath), {recursive: true});
    await writeFile(cli.outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    console.log(`\n성능 기준선 측정 완료! 파일 저장: ${cli.outPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('측정 오류 발생:', err);
  process.exit(1);
});
