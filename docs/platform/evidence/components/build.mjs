#!/usr/bin/env node
/**
 * §6.2 분류표 생성기.
 *   node docs/platform/evidence/components/build.mjs          docs/platform/components.md의 분류표 구간을 다시 쓴다
 *   node docs/platform/evidence/components/build.mjs --check  저장본이 현재 분류와 Manifest에서 나온 표와 같은지만 본다(다르면 exit 1)
 *
 * 분류는 src/platform/families/inventory.mjs, 현재 coverage와 상태는 MATERIAL-COVERAGE.json에서 읽는다. 문서 표를 손으로 고치지 않는다.
 * Manifest가 바뀌면 먼저 npm run coverage:materials를 돌린 뒤 이 스크립트를 돌린다.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {COMPONENT_CLASSIFICATION, CLASSIFICATION_LABEL, classificationCounts} from '../../../../src/platform/families/inventory.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const DOC = resolve(ROOT, 'docs/platform/components.md');
export const BEGIN = '<!-- inventory-table:begin -->', END = '<!-- inventory-table:end -->';

export function inventoryMarkdown(manifest) {
  const rows = manifest.requirements.filter(r => r.id.startsWith('req:comp:'));
  const counts = classificationCounts(), missing = rows.filter(r => r.status === 'missing').length;
  const lines = [
    `집계: 독립 재료 ${counts.independent} · 변형 ${counts.variant} · 복합 패턴 ${counts.composite} = ${rows.length}개 요구행. 현재 Manifest missing: ${missing}.`,
    '',
    '| 요구 ID | 이름 | 분류 | 현재 coverage | 상태 | 기존 재료 ID |', '|---|---|---|---|---|---|',
  ];
  for (const r of rows) {
    const key = r.id.slice('req:comp:'.length), cls = COMPONENT_CLASSIFICATION[key];
    if (!cls) throw new Error(`분류표에 없는 요구 항목: ${r.id}`);
    lines.push(`| \`${r.id}\` | ${r.name} | ${CLASSIFICATION_LABEL[cls]} | ${r.coverage} | ${r.status} | ${r.materialIds?.length ? r.materialIds.join(', ') : '—'} |`);
  }
  return lines.join('\n');
}

export function renderDoc(doc, manifest) {
  const a = doc.indexOf(BEGIN), b = doc.indexOf(END);
  if (a < 0 || b < a) throw new Error('components.md에 inventory-table 표지가 없습니다.');
  return doc.slice(0, a + BEGIN.length) + '\n' + inventoryMarkdown(manifest) + '\n' + doc.slice(b);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json'), 'utf8'));
  const current = readFileSync(DOC, 'utf8'), next = renderDoc(current, manifest);
  if (process.argv.includes('--check')) {
    if (current !== next) { console.error('components.md의 분류표가 현재 분류·Manifest와 다릅니다. node docs/platform/evidence/components/build.mjs'); process.exit(1); }
    console.log('components.md 분류표가 최신입니다.');
  } else { writeFileSync(DOC, next); console.log(`components.md 분류표를 썼습니다(${manifest.requirements.filter(r => r.id.startsWith('req:comp:')).length}행).`); }
}
