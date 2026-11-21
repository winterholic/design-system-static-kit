import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {
  CATEGORIES, catalogRegistry, allCombinations, violations,
  buttonContract, inputContract, cardContract, navigationContract,
  modalContract, tabsContract, tooltipContract, feedbackContract,
} from '../../src/materials/index.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const evidencePath = 'docs/evidence/material-platform/layout/report.json';
const browserRunPath = 'docs/evidence/material-platform/layout/run.json';
const contracts = [buttonContract, inputContract, cardContract, navigationContract, modalContract, tabsContract, tooltipContract, feedbackContract];
const registry = catalogRegistry();
const materials = registry.list();
const counts = registry.counts();

const categoryRows = CATEGORIES.map(id => {
  const members = materials.filter(material => material.category === id);
  const qualityCounts = Object.fromEntries(['missing', 'enum-only', 'implemented', 'verified'].map(status => [
    status, members.filter(material => material.quality.status === status).length,
  ]));
  const membersById = new Map(members.map(material => [material.id, material]));
  const verification = {testedContracts: 0, allowedCombinations: null, rejectedCombinations: null, evidence: []};
  for (const contract of contracts) {
    const material = registry.get(contract.id);
    if (!material || !membersById.has(material.id)) continue;
    let allowed = 0, rejected = 0;
    for (const combination of allCombinations(contract)) {
      if (violations(contract, combination).length) rejected++;
      else allowed++;
    }
    verification.testedContracts++;
    verification.allowedCombinations = (verification.allowedCombinations ?? 0) + allowed;
    verification.rejectedCombinations = (verification.rejectedCombinations ?? 0) + rejected;
    verification.evidence.push('tests/material-components.test.mjs:51');
  }
  verification.evidence = [...new Set(verification.evidence)].sort();
  const hasVariantAxis = material => Object.keys(material.variants ?? {}).length > 0;
  const stateful = material => (material.states?.values?.length ?? 0) > 0;
  return {
    id,
    materials: members.length,
    attributeCombinations: members.reduce((sum, material) => sum + registry.combinations(material), 0),
    completePresets: members.filter(material => registry.isPreset(material)).length,
    qualityCounts,
    variantCoverage: {
      materialsWithVariants: members.filter(hasVariantAxis).length,
      variantAxes: members.reduce((sum, material) => sum + Object.keys(material.variants ?? {}).length, 0),
      variantValues: members.reduce((sum, material) => sum + Object.values(material.variants ?? {}).reduce((n, values) => n + values.length, 0), 0),
    },
    stateCoverage: {
      materialsWithStates: members.filter(stateful).length,
      stateValues: members.reduce((sum, material) => sum + (material.states?.values?.length ?? 0), 0),
      transitions: members.reduce((sum, material) => sum + (material.states?.transitions?.length ?? 0), 0),
    },
    verifiedCombinationCoverage: verification,
    qualityInspection: {
      passRate: null,
      status: 'unconfirmed',
      evidence: ['A/B 단계 결과를 재료 범주에 대응시키는 분모가 없어 범주별 비율을 산출하지 않음.'],
    },
  };
});

const representative = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(root, evidencePath), 'utf8'));
const browserRun = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(root, browserRunPath), 'utf8'));
const representativeCases = representative.results.filter(result => !result.page.startsWith('legacy-'));
const cleanRepresentativeCases = representativeCases.filter(result => !(result.findings ?? []).some(finding => ['error', 'warn'].includes(finding.severity)));
const findingCounts = Object.fromEntries(['error', 'warn', 'info'].map(severity => [
  severity, representativeCases.reduce((sum, result) => sum + (result.findings ?? []).filter(finding => finding.severity === severity).length, 0),
]));
const report = {
  schemaVersion: 1,
  source: {registry: 'src/materials/index.mjs:catalogRegistry', contract: 'src/materials/contract.mjs'},
  countingRules: {
    attributeCombinations: '재료별 variants 값 개수의 곱을 합산한다. 재료 간 곱도, 완성 프리셋 수도 아니다.',
    completePresets: 'isCompletePreset 기준으로 실제 등록된 프리셋만 센다.',
    stateAndVariantCoverage: '등록 재료에 선언된 variants와 states만 센다. 미선언 구현은 추정하지 않는다.',
    verifiedCombinations: '전수 계약 테스트가 순회하는 컨트롤의 허용·거부 조합만 집계한다.',
    qualityPassRate: 'A/B 실행 결과가 범주별 분모를 제공할 때만 산출한다. 현재 범주별 값은 미확인이다.',
  },
  totals: {
    materials: counts.materials,
    attributeCombinations: counts.attributeCombinations,
    completePresets: counts.completePresets,
  },
  qualityEvidence: {
    static: {status: 'unconfirmed', passRate: null, evidence: ['scripts/audit.mjs (npm run verify에서 실행; 범주별 검사 분모 없음)']},
    browser: {
      status: 'measured',
      cases: representativeCases.length,
      passingCases: cleanRepresentativeCases.length,
      passRate: representativeCases.length ? cleanRepresentativeCases.length / representativeCases.length : null,
      findingsBySeverity: findingCounts,
      evidence: [evidencePath, browserRunPath],
      sourceRevision: browserRun.source_revision,
      scope: 'ERP·커머스·SaaS·분석 대표 화면 4종 × 390/1280px; legacy 대조군은 제외.',
    },
    human: {status: 'not-evaluated', passRate: null, evidence: ['docs/evidence/material-platform/layout/findings.md']},
  },
  categories: categoryRows,
};

const json = `${JSON.stringify(report, null, 2)}\n`;
const fmt = value => Number(value).toLocaleString('en-US');
const percent = value => value === null ? '미확인' : `${(value * 100).toFixed(1)}%`;
const rows = categoryRows.map(category => `| ${category.id} | ${fmt(category.materials)} | ${fmt(category.attributeCombinations)} | ${fmt(category.completePresets)} | ${fmt(category.variantCoverage.materialsWithVariants)}/${fmt(category.materials)} (축 ${fmt(category.variantCoverage.variantAxes)}, 값 ${fmt(category.variantCoverage.variantValues)}) | ${fmt(category.stateCoverage.materialsWithStates)}/${fmt(category.materials)} (값 ${fmt(category.stateCoverage.stateValues)}, 전이 ${fmt(category.stateCoverage.transitions)}) | ${category.verifiedCombinationCoverage.allowedCombinations === null ? '미확인' : `${fmt(category.verifiedCombinationCoverage.allowedCombinations)} 허용 / ${fmt(category.verifiedCombinationCoverage.rejectedCombinations)} 거부`} | ${percent(category.qualityInspection.passRate)} |`).join('\n');
const markdown = `# 재료 범주별 커버리지\n\n` +
  `기준은 현재 체크아웃의 \`catalogRegistry()\`다. 재료 수, 속성 조합 수, 실제 완성 프리셋 수는 별도 열이며 서로 대체하지 않는다. 속성 조합은 각 재료의 속성 값 곱을 재료별로 합산한다.\n\n` +
  `| 범주 | 재료 | 속성 조합 | 완성 프리셋 | 변형 커버리지 | 상태 커버리지 | 검증 조합 | A/B 품질 통과율 |\n|---|---:|---:|---:|---|---|---:|---:|\n${rows}\n` +
  `| **합계** | **${fmt(counts.materials)}** | **${fmt(counts.attributeCombinations)}** | **${fmt(counts.completePresets)}** | — | — | — | — |\n\n` +
  `## 검증 결과와 범위\n\n` +
  `- 컨트롤 허용·금지 조합은 \`tests/material-components.test.mjs:51\`의 전수 순회 대상만 범주별로 집계한다. 컴포넌트 간 조합으로 곱하지 않는다.\n` +
  `- 차트 프리셋은 \`tests/chart-presets.test.mjs:63\`에서 프리셋 예시를 검증한다. 예시 수는 속성 조합 수로 합산하지 않는다.\n` +
  `- B단계 대표 화면: ${representativeCases.length}건 중 ${cleanRepresentativeCases.length}건에서 error/warn 발견이 없어 ${percent(report.qualityEvidence.browser.passRate)} 통과다. info ${findingCounts.info}건은 의도된 스크롤 영역이다. 근거: \`${evidencePath}\`, 실행 정보: \`${browserRunPath}\` (소스 revision \`${browserRun.source_revision}\`). 범주별 재료 분모가 없어 이 결과를 범주별 비율로 나누지 않는다.\n` +
  `- A단계는 \`npm run verify\`의 정적 검사, C단계 사람 평가는 미평가다. 각 범주에 대응하는 A단계 분모가 없어 범주별 품질 통과율은 **미확인**이다.\n` +
  `- 상태·변형 커버리지는 재료 계약에 선언된 값과 전이만 센다. 실제 구현이 계약에 빠진 경우는 이 수치에 드러나지 않으므로 후속 과제에서 계약과 코드를 대조한다.\n\n` +
  `기계용 전체 값과 근거 경로: [coverage.json](../evidence/materials/coverage.json). 집계 규칙: \`src/materials/contract.mjs\`, \`src/materials/registry.mjs\`.\n`;

mkdirSync(path.join(root, 'docs/evidence/materials'), {recursive: true});
mkdirSync(path.join(root, 'docs/materials'), {recursive: true});
writeFileSync(path.join(root, 'docs/evidence/materials/coverage.json'), json);
writeFileSync(path.join(root, 'docs/materials/coverage.md'), markdown);
process.stdout.write(json);
