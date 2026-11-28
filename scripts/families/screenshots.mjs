/**
 * 시각 패밀리 12종의 대표 컴포넌트 화면 스크린샷.
 *   node scripts/families/screenshots.mjs [--out docs/dev/catalog-platform-upgrade/screens/families] [--width 1100]
 * 같은 화면(버튼·KPI 카드·검색 입력·탭·상단 내비·표·알림)을 12개 패밀리로 같은 조립 경로(assembleFamilies)에서 그린다.
 * 색 토큰·서체·콘텐츠는 모두 같고, 달라지는 것은 패밀리가 정한 형태 값뿐이다. 유리 질감이 보이도록 모든 화면에 같은 색 띠 배경을 깐다.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {makeEnv, VISUALS} from './pages.mjs';
import {assembleFamilies, getPurposeFamily} from '../../src/platform/families/index.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const OUT = resolve(arg('--out', 'docs/dev/catalog-platform-upgrade/screens/families'));
const WIDTH = Number(arg('--width', 1100));

/** 대표 화면 항목. 항목마다 한 번만 패밀리 예시를 덮어 같은 콘텐츠를 쓴다. */
const ITEMS = [
  {purpose: 'purpose:navigation.topbar'},
  {purpose: 'purpose:navigation.tabs'},
  {purpose: 'purpose:card.kpi', variant: {layout: 'stacked', trend: 'spark'}, content: {label: '월 매출', value: '1,284만', unit: '원', delta: '+12%', deltaDirection: 'up', caption: '전월 대비', series: [4, 6, 5, 8, 7, 10, 12]}},
  {purpose: 'purpose:card.profile'},
  {purpose: 'purpose:button.primary', variant: {layout: 'pair', align: 'start'}, content: {label: '저장', secondaryLabel: '취소'}},
  {purpose: 'purpose:button.secondary', variant: {layout: 'row', tier: 'secondary'}, content: {items: [{label: '내보내기', icon: 'arrow-right'}, {label: '공유'}]}},
  {purpose: 'purpose:form.search'},
  {purpose: 'purpose:form.filter'},
  {purpose: 'purpose:table.business'},
  {purpose: 'purpose:feedback.confirm'},
];

const BACKDROP = 'body{margin:0;min-height:100vh;background:radial-gradient(circle at 12% 18%,color-mix(in srgb,var(--kit-action) 70%,transparent) 0 120px,transparent 260px),radial-gradient(circle at 88% 42%,color-mix(in srgb,var(--kit-link) 60%,transparent) 0 140px,transparent 300px),radial-gradient(circle at 30% 80%,color-mix(in srgb,var(--kit-danger) 50%,transparent) 0 110px,transparent 260px),var(--kit-canvas)}'
  + 'main{max-width:1060px;margin:0 auto;padding:20px}.tag{font:700 13px/1 system-ui,sans-serif;letter-spacing:.04em;color:var(--kit-text);margin:0 0 12px}'
  + '.kit-platform{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:var(--kit-gap)}.pf{padding:0;border:0}.pf-navigation-topbar,.pf-navigation-tabs,.pf-table-business,.pf-feedback-confirm{grid-column:1 / -1}';

export function screenHtml(env, visual) {
  const family = env.registry.get(visual);
  const items = ITEMS.map((it, i) => {
    const f = getPurposeFamily(it.purpose);
    return {id: `${it.purpose.slice('purpose:'.length).replace('.', '-')}-${i}`, purpose: it.purpose, visual, variant: it.variant ?? f.example.variant, props: it.props ?? f.example.props, content: it.content ?? f.example.content};
  });
  const r = assembleFamilies(env, {context: 'dashboard', mode: 'light', items});
  if (!r.ok) throw new Error(`${visual}: ${JSON.stringify(r.diagnostics.slice(0, 2))}`);
  return `<!doctype html><html lang="ko" data-mode="light"><head><meta charset="utf-8"><title>${family.label}</title><style>${r.value.css}\n${BACKDROP}</style></head><body><main><p class="tag">${family.label}</p>${r.value.html}</main></body></html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, {recursive: true});
  const env = makeEnv();
  const browser = await chromium.launch();
  const written = [];
  try {
    for (const visual of VISUALS) {
      const key = visual.slice('family:'.length);
      const page = await browser.newPage({viewport: {width: WIDTH, height: 900}});
      await page.setContent(screenHtml(env, visual), {waitUntil: 'load'});
      const file = resolve(OUT, `${key}.png`);
      await page.screenshot({path: file, fullPage: true});
      written.push(file);
      await page.close();
    }
    // 12장을 한 장에 모은 비교 시트(한눈에 구분되는지 보기 위한 것)
    const sheet = await browser.newPage({viewport: {width: 1800, height: 1200}});
    const cells = VISUALS.map(v => `<figure><img src="file://${resolve(OUT, `${v.slice(7)}.png`)}"><figcaption>${v.slice(7)}</figcaption></figure>`).join('');
    writeFileSync(resolve(OUT, '.overview.html'), `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#fff;font:600 14px system-ui}main{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:10px}figure{margin:0}img{width:100%;border:1px solid #ccc}figcaption{padding:4px 0}</style><main>${cells}</main>`);
    await sheet.goto(`file://${resolve(OUT, '.overview.html')}`, {waitUntil: 'load'});
    await sheet.screenshot({path: resolve(OUT, 'overview.png'), fullPage: true});
    written.push(resolve(OUT, 'overview.png'));
  } finally { await browser.close(); }
  console.log(written.join('\n'));
}
