#!/usr/bin/env node
/**
 * 팔레트 × 서브토큰 세트 25종 × Light/Dark 전수 결합 평가 스크립트 (TASK-TRB-04).
 * 등록된 팔레트 전체(동적 배열)와 25종 서브토큰 세트의 호환성, 대비 게이트, 적합도 점수를 산출하여
 * docs/platform/evidence/color/subtoken-matrix-summary.json 에 요약 산출물을 기록한다.
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PALETTES} from '../../src/platform/data/palettes.mjs';
import {SUBTOKEN_SETS} from '../../src/platform/data/subtoken-sets.mjs';
import {evaluatePaletteSubtokens, bindColor} from '../../src/platform/color.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
console.log(`Evaluating Color Matrix: ${PALETTES.length} palettes × ${SUBTOKEN_SETS.length} subtoken sets...`);

const modes = ['light', 'dark'];
let totalCombinations = 0;
let passingCombinations = 0;
let failingCombinations = 0;

const paletteSummaries = [];
const setSummaries = new Map();
const failureReasons = new Map();

for (const s of SUBTOKEN_SETS) {
  setSummaries.set(s.id, {
    id: s.id,
    label: s.label,
    tags: s.tags,
    weights: s.weights,
    passCount: 0,
    failCount: 0,
    totalEvaluated: 0,
    scores: [],
    margins: [],
    adjustmentsCount: 0,
  });
}

for (const p of PALETTES) {
  const pEval = evaluatePaletteSubtokens(p);
  const pSummary = {
    paletteId: p.id,
    family: p.family ?? p.id.split(':')[1]?.split('-')[0],
    passingSets: [],
    failingSets: [],
    topRanked: pEval.ranked[0]?.id ?? null,
  };

  for (const item of pEval) {
    const sStat = setSummaries.get(item.id);
    sStat.totalEvaluated++;
    sStat.adjustmentsCount += item.adjustments.length;

    if (item.applicable) {
      pSummary.passingSets.push({
        id: item.id,
        rank: item.rank,
        score: item.score,
        margin: item.margin,
      });
      sStat.passCount++;
      sStat.scores.push(item.score);
      sStat.margins.push(item.margin);
    } else {
      pSummary.failingSets.push({
        id: item.id,
        reasons: item.blockedReasons,
      });
      sStat.failCount++;
      for (const b of item.blockedReasons) {
        const code = b.code || 'UNKNOWN';
        failureReasons.set(code, (failureReasons.get(code) || 0) + 1);
      }
    }

    // 모드별 세부 카운트
    for (const m of modes) {
      totalCombinations++;
      const r = bindColor(p, SUBTOKEN_SETS.find(s => s.id === item.id), m);
      if (r.ok) {
        passingCombinations++;
      } else {
        failingCombinations++;
      }
    }
  }

  paletteSummaries.push(pSummary);
}

const setSummaryArray = Array.from(setSummaries.values()).map(s => {
  const avgScore = s.scores.length ? Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) / 10 : 0;
  const avgMargin = s.margins.length ? Math.round((s.margins.reduce((a, b) => a + b, 0) / s.margins.length) * 100) / 100 : 0;
  return {
    id: s.id,
    label: s.label,
    tags: s.tags,
    weights: s.weights,
    passCount: s.passCount,
    failCount: s.failCount,
    passRate: `${Math.round((s.passCount / s.totalEvaluated) * 100)}%`,
    avgScore,
    avgMargin,
    adjustmentsCount: s.adjustmentsCount,
  };
});

const summary = {
  metadata: {
    paletteCount: PALETTES.length,
    paletteSources: PALETTES.map(p => ({id: p.id, origin: p.source?.origin ?? null, license: p.source?.license ?? null})),
    subtokenSetCount: SUBTOKEN_SETS.length,
    modes,
    totalPairs: PALETTES.length * SUBTOKEN_SETS.length,
    totalCombinationsWithModes: totalCombinations,
  },
  overall: {
    passingCombinations,
    failingCombinations,
    passRate: `${((passingCombinations / totalCombinations) * 100).toFixed(2)}%`,
    distinctSetsUsed: SUBTOKEN_SETS.length,
  },
  failureReasonDistribution: Object.fromEntries(failureReasons.entries()),
  setSummaries: setSummaryArray,
  paletteSummaries,
};

const outputDir = resolve(ROOT, 'docs/platform/evidence/color');
mkdirSync(outputDir, {recursive: true});
const outputPath = resolve(outputDir, 'subtoken-matrix-summary.json');
writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(`Summary written to: ${outputPath}`);
