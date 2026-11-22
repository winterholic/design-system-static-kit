import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBlueprint} from '../../src/catalog.mjs';
import {compile} from '../../src/compiler.mjs';
import {chartPresetMaterials} from '../../src/materials/chart-presets.mjs';

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
  const sections = DOMAINS.map(([domain, title]) => {
    const presets = chartPresetMaterials.filter(material => material.ext.domain === domain);
    return {type: 'section', title: `${title} 차트 프리셋 ${presets.length}개`, description: presets.map(material => material.id.replace('chart-preset:', '')).join(' · '),
      children: [{type: 'grid', columns: 'two', children: presets.map(material => structuredClone(material.examples[0]))}]};
  });
  blueprint.tree = {type: 'page', children: [{type: 'page-header', title: `차트 프리셋 ${chartPresetMaterials.length}개`, description: '형태·축·격자·값 라벨·범례·밀도·반응형이 서로 다른 검증된 프리셋의 예시입니다.'}, ...sections]};
  return compile(blueprint).html.trimEnd() + '\n';
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
