/**
 * 타이포 시스템 표본 렌더(Chromium). 시스템 × {문서, 대시보드} × {데스크톱 1280, 모바일 390} 스크린샷과
 * 측정값(metrics.json)·실제로 쓰인 서체(fonts-macos.json)를 이 폴더에 쓴다.
 *   node docs/platform/evidence/type/render.mjs
 * 시스템 서체만 쓴다(웹폰트 끔). 그래서 이 값은 실행한 OS의 설치 서체에 따른다(macOS에서 측정한 값만 문서에 인용한다).
 */
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createPlatform} from '../../../../src/platform/examples/minimal.mjs';
import {bindType, effectiveFaces, splitStack} from '../../../../src/platform/type.mjs';
import {samplePage} from './samples.mjs';

const out = dirname(fileURLToPath(import.meta.url));
const VIEWPORTS = {desktop: {width: 1280, height: 900}, mobile: {width: 390, height: 844}};
const env = createPlatform();
const systems = env.registry.list('type-system');
const name = s => s.id.slice('type-system:'.length);

const browser = await chromium.launch();
const metrics = {}, fonts = {};
for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext({viewport, deviceScaleFactor: 1});
  for (const system of systems) for (const kind of ['doc', 'dash']) {
    const page = await context.newPage();
    await page.setContent(samplePage(system, kind), {waitUntil: 'load'});
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const lines = el => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
      const q = s => document.querySelector(s);
      return {pageHeight: document.documentElement.scrollHeight, contentHeight: Math.round(q('.page').getBoundingClientRect().height), overflowX: document.documentElement.scrollWidth > innerWidth + 1,
        titleLines: lines(q('.t-display, h1.t-heading')), bodyLines: lines(q('p.t-body')), titlePx: parseFloat(getComputedStyle(q('.t-display, h1.t-heading')).fontSize), bodyPx: parseFloat(getComputedStyle(q('.t-body')).fontSize),
        bodyLinePx: parseFloat(getComputedStyle(q('.t-body')).lineHeight),
        kpiOverflow: [...document.querySelectorAll('.kpi .t-numeric')].filter(e => e.scrollWidth > e.parentElement.clientWidth - 2 * 0).length,
        kpiCols: [...new Set([...document.querySelectorAll('.kpi')].map(e => Math.round(e.getBoundingClientRect().top)))].length};
    });
    (metrics[name(system)] ??= {})[`${kind}-${vpName}`] = m;
    await page.screenshot({path: join(out, `${name(system)}-${kind}-${vpName}.png`), fullPage: true});
    if (kind === 'doc' && vpName === 'desktop') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const {root} = await cdp.send('DOM.getDocument');
      const used = {};
      for (const [role, sel] of Object.entries({display: '.t-display', heading: 'h2.t-heading', body: 'p.t-body', label: '.t-label', numeric: '.doc .t-numeric', code: '.codeblock .t-code'})) {
        const {nodeId} = await cdp.send('DOM.querySelector', {nodeId: root.nodeId, selector: sel});
        const {fonts: f} = await cdp.send('CSS.getPlatformFontsForNode', {nodeId});
        used[role] = f.map(x => ({family: x.familyName, glyphs: x.glyphCount}));
      }
      fonts[name(system)] = used;
      await cdp.detach();
    }
    await page.close();
  }
  await context.close();
}
const version = browser.version();
await browser.close();
writeFileSync(join(out, 'metrics.json'), JSON.stringify(metrics, null, 1) + '\n');
writeFileSync(join(out, 'fonts-macos.json'), JSON.stringify({measuredOn: `${process.platform} · Chromium ${version}`, note: 'CSS.getPlatformFontsForNode, 문서 표본 데스크톱', fonts}, null, 1) + '\n');
console.log('rendered', systems.length * 4, 'screenshots');
