import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBlueprint} from '../../src/catalog.mjs';
import {compile} from '../../src/compiler.mjs';
import {chartPresetMaterials} from '../../src/materials/chart-presets.mjs';
import {renderChartPreset} from '../../src/render/chart-presets.mjs';

/**
 * 모든 차트 프리셋의 증거 페이지. 카탈로그 2.6.0 Blueprint 하나를 컴파일하므로 결정적이다(같은 입력은 같은 바이트).
 * 도메인(ERP·금융·분석·마케팅·모바일)별 구역에 프리셋 예시를 순서대로 둔다.
 *   node scripts/materials/chart-presets-evidence.mjs          다시 쓴다
 *   node scripts/materials/chart-presets-evidence.mjs --check  파일이 재생성 결과와 같은지만 확인한다(다르면 종료 코드 1)
 * 브라우저 검사: node scripts/layout-quality/run.mjs --file docs/evidence/materials/chart-presets.html --widths 360,1280
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const EVIDENCE_PATH = resolve(root, 'docs/evidence/materials/chart-presets.html');
const DOMAINS = [['erp', 'ERP·운영'], ['finance', '금융'], ['analytics', '분석'], ['marketing', '마케팅'], ['mobile', '모바일']];

export function renderChartEvidence() {
  const blueprint = createBlueprint('dashboard-overview');
  blueprint.catalogVersion = '2.6.0';
  blueprint.shell = 'minimal';
  blueprint.pageType = 'general';
  blueprint.chrome.nav = blueprint.chrome.nav.slice(0, 2);
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: '차트 프리셋', description: '각 도형은 등록된 chart-preset SVG 렌더러가 데이터와 접근성 표를 함께 출력합니다.'}, {type: 'chart', title: '스타일 추출용 기준 차트', caption: '생성된 카탈로그 CSS', kind: 'bar', grid: 'horizontal', unit: '건', categories: ['A', 'B'], series: [{name: '표본', values: [2, 3]}]}]};
  const css = compile(blueprint).css;
  const sections = DOMAINS.map(([domain, title]) => {
    const presets = chartPresetMaterials.filter(material => material.ext.domain === domain);
    return `<section><h2>${title} · ${presets.length}개</h2><p>${presets.map(material => material.id.replace('chart-preset:', '')).join(' · ')}</p><div class="preset-grid">${presets.map(material => renderChartPreset(material.id)).join('\n')}</div></section>`;
  }).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>차트 프리셋 렌더 증거</title><style>${css}\nbody{margin:0;padding:24px;background:#f7f8fa;color:#18202b;font-family:system-ui,sans-serif}main{max-width:1280px;margin:auto}section{margin:32px 0}h1,h2{line-height:1.3}.preset-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}.kit-chart{min-width:0}</style></head><body><main><h1>차트 프리셋 ${chartPresetMaterials.length}개 · 고유 유형 ${new Set(chartPresetMaterials.map(material => material.ext.chartKind)).size}종</h1>${sections}</main></body></html>\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const html = renderChartEvidence();
  if (process.argv.includes('--check')) {
    const same = existsSync(EVIDENCE_PATH) && readFileSync(EVIDENCE_PATH, 'utf8') === html;
    console.log(same ? `chart-presets evidence is up to date (${chartPresetMaterials.length} presets)` : 'chart-presets evidence is stale: run node scripts/materials/chart-presets-evidence.mjs');
    process.exit(same ? 0 : 1);
  }
  mkdirSync(dirname(EVIDENCE_PATH), {recursive: true});
  writeFileSync(EVIDENCE_PATH, html);
  console.log(`Rendered ${chartPresetMaterials.length} chart presets → ${EVIDENCE_PATH}`);
}
