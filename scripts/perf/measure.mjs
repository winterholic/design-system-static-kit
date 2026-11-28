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

  page.on('response', async (response) => {
    requestCount++;
    try {
      const headers = response.headers();
      const ctype = headers['content-type'] || '';
      const url = response.url();
      let size = 0;
      const clen = headers['content-length'];
      if (clen) {
        size = parseInt(clen, 10) || 0;
      } else {
        const body = await response.body().catch(() => null);
        size = body ? body.length : 0;
      }

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
  });

  // 카운터 리셋 (서버 지원 시)
  await resetCompileCounters(baseUrl);

  const targetUrl = `${baseUrl}${pageSpec.path}`;
  const startTime = Date.now();
  const response = await page.goto(targetUrl, {waitUntil: 'networkidle', timeout: 30000});
  const loadDuration = Date.now() - startTime;

  // 브라우저 렌더 안정화 대기
  await page.waitForTimeout(500);

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

  // CDP 메모리 메트릭
  let jsHeapUsed = 0;
  try {
    const cdpMetrics = await client.send('Performance.getMetrics');
    const heapMetric = cdpMetrics.metrics.find((m) => m.name === 'JSHeapUsedSize');
    if (heapMetric) jsHeapUsed = Math.round(heapMetric.value);
  } catch {}

  // 상호작용 지연 (INP 근사) 및 탭 전환 시간 측정
  let tabSwitchDuration = 0;
  try {
    const interactiveTarget = await page.$(
      'a[role="tab"], button[role="tab"], a[class*="segItem"], a[href*="mode="], a[href*="sample="], a[href*="page="], button[class*="button"]'
    );
    if (interactiveTarget) {
      const actStart = performance.now();
      await interactiveTarget.click({timeout: 2000}).catch(() => {});
      await page.waitForTimeout(100);
      tabSwitchDuration = Math.round(performance.now() - actStart);
    }
  } catch {}

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

  // 서버 측 컴파일 호출 수 읽기
  const compileCounters = await getCompileCounters(baseUrl);
  const compileCount = compileCounters ? compileCounters.total : null;

  await context.close();

  return {
    run: runIndex + 1,
    ttfb: navMetrics.ttfb,
    lcp: navMetrics.lcp,
    cls: navMetrics.cls,
    inpApprox: Math.max(navMetrics.inpApprox, tabSwitchDuration > 0 ? Math.min(tabSwitchDuration, 250) : 0),
    requestCount,
    htmlTransfer,
    rscTransfer,
    jsTransfer,
    cssTransfer,
    totalTransfer,
    domNodes: navMetrics.domNodes,
    activeIframes: navMetrics.activeIframes,
    longTaskTotal: navMetrics.longTaskTotal,
    jsHeapUsed,
    scrollDuration,
    tabSwitchDuration,
    compileCount,
    loadDuration,
  };
}

async function measureColdVsWarm(browser, baseUrl) {
  console.log(`\n[콜드/웜 TTFB 측정] 대상: ${baseUrl}/explore`);
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
    coldTtfb,
    warmTtfb,
    diffMs: coldTtfb - warmTtfb,
  };
}

async function measureEnvironment(browser, baseUrl, envName, runs) {
  console.log(`\n======================================================`);
  console.log(`환경 측정 시작: ${envName} (${baseUrl})`);
  console.log(`반복 횟수: ${runs}회`);
  console.log(`======================================================`);

  // 콜드/웜 측정
  const coldWarm = await measureColdVsWarm(browser, baseUrl);

  const results = [];

  for (const pageSpec of TARGET_PAGES) {
    for (const viewport of VIEWPORTS) {
      console.log(`\n측정 중: [${pageSpec.label}] @ ${viewport.label}`);
      const rawRuns = [];

      for (let r = 0; r < runs; r++) {
        process.stdout.write(`  회차 ${r + 1}/${runs} ... `);
        const metrics = await measureSingleRun(browser, baseUrl, pageSpec, viewport, r);
        rawRuns.push(metrics);
        console.log(
          `TTFB: ${metrics.ttfb}ms, LCP: ${metrics.lcp}ms, CLS: ${metrics.cls}, iframe: ${metrics.activeIframes}, DOM: ${metrics.domNodes}, 컴파일: ${metrics.compileCount ?? 'N/A'}`
        );
      }

      // 중앙값 집계
      const medianResult = {
        ttfb: median(rawRuns.map((r) => r.ttfb)),
        lcp: median(rawRuns.map((r) => r.lcp)),
        cls: median(rawRuns.map((r) => r.cls)),
        inpApprox: median(rawRuns.map((r) => r.inpApprox)),
        requestCount: median(rawRuns.map((r) => r.requestCount)),
        htmlTransfer: median(rawRuns.map((r) => r.htmlTransfer)),
        rscTransfer: median(rawRuns.map((r) => r.rscTransfer)),
        jsTransfer: median(rawRuns.map((r) => r.jsTransfer)),
        cssTransfer: median(rawRuns.map((r) => r.cssTransfer)),
        totalTransfer: median(rawRuns.map((r) => r.totalTransfer)),
        domNodes: median(rawRuns.map((r) => r.domNodes)),
        activeIframes: median(rawRuns.map((r) => r.activeIframes)),
        longTaskTotal: median(rawRuns.map((r) => r.longTaskTotal)),
        jsHeapUsed: median(rawRuns.map((r) => r.jsHeapUsed)),
        scrollDuration: median(rawRuns.map((r) => r.scrollDuration)),
        tabSwitchDuration: median(rawRuns.map((r) => r.tabSwitchDuration)),
        compileCount: rawRuns[0].compileCount !== null ? median(rawRuns.map((r) => r.compileCount)) : null,
      };

      results.push({
        pageId: pageSpec.id,
        pageLabel: pageSpec.label,
        path: pageSpec.path,
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

  try {
    // 1. 로컬 운영 빌드 환경 측정
    const localData = await measureEnvironment(browser, cli.baseUrl, cli.envName, cli.runs);

    // 2. Vercel 운영 배포 환경 측정 (가능 시)
    let vercelData = null;
    if (cli.measureVercel || cli.vercelUrl) {
      try {
        const probe = await fetch(cli.vercelUrl, {method: 'HEAD'});
        if (probe.ok) {
          console.log(`\nVercel 운영 배포 접근 확인 성공: ${cli.vercelUrl}`);
          vercelData = await measureEnvironment(browser, cli.vercelUrl, 'vercel-prod', cli.runs);
        } else {
          console.warn(`Vercel 운영 배포 응답 코드: ${probe.status}. 측정 생략.`);
        }
      } catch (err) {
        console.warn(`Vercel 운영 배포 접근 실패: ${err.message}. 측정 생략.`);
      }
    }

    const payload = {
      version: '1.0.0',
      description: 'Static Kit 최적화 전 성능 기준선 (Phase 0/1 Baseline)',
      targets: {
        lcp: '<= 2500ms',
        inp: '<= 200ms',
        cls: '<= 0.1',
        activeIframes: '0개 (일반 카탈로그)',
        dynamicCompiles: '0회 (목록 요청 시)',
        initialCards: '<= 24개',
      },
      summary: {
        timestamp: new Date().toISOString(),
        localEnv: localData.environment,
        vercelEnv: vercelData ? vercelData.environment : 'unverified (접근 불가 또는 미측정)',
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
