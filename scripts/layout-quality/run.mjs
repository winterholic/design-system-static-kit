/** 레이아웃 검사기 실행기. 열린 페이지(또는 HTML 문자열)를 여러 폭에서 layoutProbe로 재고, 면제를 적용해 요약한다.
 *
 *  라이브러리
 *    checkPage(page, {widths, options, exemptions, label})  이미 연 페이지를 폭마다 잰다.
 *    checkHtml(page, html, opts)                            setContent로 연 HTML(컴파일된 Blueprint 결과 등)을 잰다.
 *    checkUrls(browser, urls, opts)                         여러 URL을 새 페이지로 잰다.
 *    summarize(results), formatReport(results)              통과 판정과 사람이 읽는 표.
 *  CLI
 *    node scripts/layout-quality/run.mjs --base http://127.0.0.1:4310 --paths /,/docs --widths 360,768,1280,1600 [--crawl] [--exemptions file.mjs] [--json out.json] [--fail-on error|warn]
 *    node scripts/layout-quality/run.mjs --file out/my-page/index.html
 */
import {layoutProbe, LAYOUT_OPTIONS} from './probe.mjs';

export const DEFAULT_WIDTHS = [360, 768, 1280, 1600];
const SEVERITY_ORDER = {error: 3, warn: 2, info: 1};

export function mergeOptions(overrides = {}) {
  const o = LAYOUT_OPTIONS, t = o.thresholds, x = overrides.thresholds ?? {};
  const thresholds = {...t};
  for (const k of Object.keys(t)) thresholds[k] = typeof t[k] === 'object' && !Array.isArray(t[k]) ? {...t[k], ...(x[k] ?? {})} : (x[k] ?? t[k]);
  return {...o, ...overrides, selectors: {...o.selectors, ...(overrides.selectors ?? {})}, thresholds};
}

/** 면제 {code, page?, locator?, text?, reason}. reason이 없으면 던진다: 사유 없는 면제는 허용하지 않는다. */
export function applyExemptions(findings, exemptions = [], pageLabel = '') {
  for (const e of exemptions) if (!e.reason || !String(e.reason).trim()) throw new Error(`면제에 reason이 없습니다: ${JSON.stringify(e)}`);
  const re = (v, s) => v instanceof RegExp ? v.test(s) : String(s).includes(v);
  return findings.map(f => {
    if (f.exempt) return {...f, exempted: true};
    const hit = exemptions.find(e => e.code === f.code && (!e.page || re(e.page, pageLabel)) && (!e.locator || re(e.locator, f.locator)) && (!e.text || re(e.text, f.text ?? '')) && (!e.width || e.width === f.width));
    return hit ? {...f, exempt: hit.reason, exempted: true} : f;
  });
}

/** 폭을 바꾼 직후에는 ResizeObserver·상태 갱신으로 레이아웃이 한 번 더 움직일 수 있다(예: 크기에 맞춰 줄이는 미리보기 iframe).
 *  요소 위치 서명이 두 번 연속 같을 때까지 기다린다(최대 maxMs). 고정 대기는 느린 서버에서 이전 폭의 배치를 재게 된다. */
export async function settleLayout(page, {maxMs = 4000, stepMs = 60} = {}) {
  await page.evaluate(async ({maxMs, stepMs}) => {
    await document.fonts?.ready;
    const sig = () => { let h = document.documentElement.scrollWidth * 31 + document.documentElement.scrollHeight; let n = 0; for (const el of document.body.querySelectorAll('*')) { const r = el.getBoundingClientRect(); h = (h * 33 + Math.round(r.right * 2) * 7 + Math.round(r.bottom * 2)) | 0; if (++n >= 2500) break; } return h; };
    let prev = sig(), same = 0; const t0 = performance.now();
    while (same < 2 && performance.now() - t0 < maxMs) { await new Promise(r => setTimeout(r, stepMs)); const s = sig(); same = s === prev ? same + 1 : 0; prev = s; }
  }, {maxMs, stepMs});
}

export async function checkPage(page, {widths = DEFAULT_WIDTHS, options, exemptions = [], label = page.url(), height = 900} = {}) {
  const opts = mergeOptions(options), out = [];
  for (const width of widths) {
    await page.setViewportSize({width, height});
    await settleLayout(page);
    const r = await page.evaluate(layoutProbe, opts);
    const findings = applyExemptions(r.findings.map(f => ({...f, width, page: label})), exemptions, label);
    out.push({page: label, width, findings, scanned: r.scanned, roles: r.roles, counts: r.counts});
  }
  return out;
}

export async function checkHtml(page, html, opts = {}) {
  await page.setContent(html, {waitUntil: 'load'});
  return checkPage(page, {label: opts.label ?? 'inline-html', ...opts});
}

export async function checkUrls(browser, urls, {context, ...opts} = {}) {
  const ctx = context ?? await browser.newContext(), page = await ctx.newPage(), out = [];
  try {
    for (const url of urls) {
      const res = await page.goto(url, {waitUntil: 'load'});
      if (!res || res.status() >= 400) { out.push({page: url, width: 0, findings: [{code: 'PAGE_LOAD', severity: 'error', page: url, width: 0, locator: 'document', text: '', evidence: {status: res?.status() ?? null}, suggestion: '경로가 열리는지 확인한다.'}], scanned: {}, roles: {}, counts: {}}); continue; }
      out.push(...await checkPage(page, {label: url, ...opts}));
    }
  } finally { if (!context) await ctx.close(); }
  return out;
}

/** 시작 경로들의 같은 출처 내부 링크를 따라 공개 페이지 목록을 만든다(깊이 1). 파일·API·내부 도구 경로는 뺀다. */
export async function discoverPaths(page, base, seeds = ['/'], {exclude = /^\/(api|dev|_next|examples|gallery|v1|test-lab|src)(\/|$)|\.(json|png|svg|css|js|txt|xml|ico)$|\/render$/, extra = []} = {}) {
  const found = new Set(seeds);
  for (const seed of seeds) {
    await page.goto(new URL(seed, base).href, {waitUntil: 'load'});
    // 내려받기 링크(download 속성)는 페이지가 아니라 파일이다. 따라가면 goto 가 "Download is starting" 으로 실패한다.
    const hrefs = await page.$$eval('a[href^="/"]:not([download])', as => as.map(a => a.getAttribute('href').split('#')[0]));
    for (const h of hrefs) if (h && !exclude.test(h)) found.add(h);
  }
  for (const e of extra) found.add(e);
  return [...found];
}

export function summarize(results, {failOn = 'error'} = {}) {
  const active = results.flatMap(r => r.findings).filter(f => !f.exempt);
  const exempt = results.flatMap(r => r.findings).filter(f => f.exempt);
  const by = (list, key) => list.reduce((m, f) => (m[f[key]] = (m[f[key]] ?? 0) + 1, m), {});
  const bySeverity = by(active, 'severity'), scanned = {};
  for (const r of results) for (const [k, v] of Object.entries(r.scanned)) scanned[k] = (scanned[k] ?? 0) + v;
  const threshold = SEVERITY_ORDER[failOn] ?? 3;
  const failing = active.filter(f => SEVERITY_ORDER[f.severity] >= threshold);
  return {pass: failing.length === 0, failing: failing.length, bySeverity, byCode: by(active, 'code'), exempt: exempt.length, exemptByCode: by(exempt, 'code'), checked: results.length, scanned};
}

/** 같은 (page, code, locator, text) 발견을 폭별로 묶는다. */
export function groupFindings(results) {
  const map = new Map();
  for (const r of results) for (const f of r.findings) {
    const key = [f.page, f.code, f.locator, f.text].join('\u0000');
    const g = map.get(key) ?? {...f, widths: [], evidenceByWidth: {}};
    g.widths.push(f.width); g.evidenceByWidth[f.width] = f.evidence;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || a.page.localeCompare(b.page) || a.code.localeCompare(b.code));
}

const evText = e => Object.entries(e ?? {}).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `${k}=${v}`).join(' ');
export function formatReport(results, {maxEvidence = 1} = {}) {
  const lines = [], groups = groupFindings(results);
  for (const g of groups) {
    const tag = g.exempt ? `EXEMPT(${g.exempt})` : g.severity.toUpperCase();
    lines.push(`${tag} ${g.code} [${g.role}] ${g.page} @${g.widths.join('/')}px`);
    lines.push(`  at   ${g.locator}${g.text ? `  “${g.text}”` : ''}`);
    for (const w of g.widths.slice(0, maxEvidence)) lines.push(`  evid @${w}px ${evText(g.evidenceByWidth[w])}`);
    if (g.suggestion) lines.push(`  fix  ${g.suggestion}`);
  }
  return lines.join('\n');
}

// ---------- CLI ----------
async function main() {
  const {chromium} = await import('@playwright/test');
  const {writeFile} = await import('node:fs/promises');
  const {pathToFileURL} = await import('node:url');
  const {resolve} = await import('node:path');
  const args = process.argv.slice(2), get = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const widths = (get('--widths') ?? DEFAULT_WIDTHS.join(',')).split(',').map(Number);
  const urls = [];
  if (get('--base')) {
    let paths = (get('--paths') ?? '/').split(',');
    if (args.includes('--crawl')) {
      const b0 = await chromium.launch(), p0 = await b0.newPage();
      try { paths = await discoverPaths(p0, get('--base'), paths); } finally { await b0.close(); }
      // 크롤은 목록 페이지가 거는 링크의 한 단계 아래까지: 상세 페이지의 링크는 따라가지 않는다.
    }
    for (const p of paths) urls.push(new URL(p, get('--base')).href);
  }
  if (get('--file')) urls.push(pathToFileURL(resolve(get('--file'))).href);
  if (!urls.length) { console.error('사용법: --base <url> --paths /,/docs  또는  --file <html>'); process.exit(2); }
  const browser = await chromium.launch();
  try {
    // --exemptions <module.mjs>: EXEMPTIONS 배열을 내보내는 모듈(사유 필수).
    const exemptions = get('--exemptions') ? (await import(pathToFileURL(resolve(get('--exemptions'))).href)).EXEMPTIONS : [];
    const results = await checkUrls(browser, urls, {widths, exemptions});
    const sum = summarize(results, {failOn: get('--fail-on') ?? 'error'});
    console.log(formatReport(results));
    console.log(JSON.stringify(sum));
    if (get('--json')) await writeFile(get('--json'), JSON.stringify({summary: sum, results}, null, 2));
    process.exitCode = sum.pass ? 0 : 1;
  } finally { await browser.close(); }
}
import {fileURLToPath} from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
