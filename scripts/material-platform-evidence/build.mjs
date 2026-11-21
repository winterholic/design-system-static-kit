import {createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assembleBlueprint, compileBlueprint} from '../../src/service/index.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = 'docs/evidence/material-platform';
const CASES = [
  {id: 'erp', label: 'ERP 주문·재고 운영', profile: 'erp', intent: {pattern: 'erp-workspace', theme: 'ledger'}},
  {id: 'commerce', label: '커머스 상품 목록', profile: 'commerce', intent: {pattern: 'commerce-listing', theme: 'commerce'}},
  {id: 'saas', label: 'SaaS 제품 소개·가입', profile: 'saas-landing', intent: {pattern: 'marketing-landing'}},
  {id: 'analytics', label: '데이터 분석·재무 대시보드', profile: 'finance', intent: {pattern: 'dashboard-grid', chartPresets: ['finance-monthly-close']}},
];

const sha256 = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';

/** 네 대표 맥락을 공개 서비스 API로 조립·컴파일하고 바이트 해시와 재료 선택을 돌려준다. */
export function buildEvidenceCases() {
  return CASES.map(spec => {
    const assembled = assembleBlueprint({profile: spec.profile, intent: spec.intent, content: {name: spec.label}});
    if (!assembled.ok) throw new Error(`${spec.id} 조립 실패: ${JSON.stringify(assembled.errors)}`);
    const compiled = compileBlueprint(assembled.value.blueprint, {include: ['html', 'css', 'manifest']});
    if (!compiled.ok) throw new Error(`${spec.id} 컴파일 실패: ${JSON.stringify(compiled.errors)}`);
    const {blueprint, decisions, materials} = assembled.value;
    const {html, css, manifest} = compiled.value;
    return {
      ...spec, blueprint, decisions, materials, html, css, manifest,
      hashes: {blueprint: sha256(JSON.stringify(blueprint)), html: sha256(html), css: sha256(css)},
      bytes: {blueprint: Buffer.byteLength(JSON.stringify(blueprint)), html: Buffer.byteLength(html), css: Buffer.byteLength(css)},
    };
  });
}

export async function writeEvidence(root = ROOT) {
  const cases = buildEvidenceCases();
  const summary = [];
  for (const item of cases) {
    const dir = resolve(root, OUT, 'assembled', item.id);
    await mkdir(dir, {recursive: true});
    await Promise.all([
      writeFile(resolve(dir, 'blueprint.json'), json(item.blueprint)),
      writeFile(resolve(dir, 'index.html'), item.html),
      writeFile(resolve(dir, 'styles.css'), item.css),
      writeFile(resolve(dir, 'manifest.json'), json(item.manifest)),
    ]);
    summary.push({
      id: item.id, label: item.label, profile: item.profile, intent: item.intent,
      materials: item.materials, decisions: item.decisions, hashes: item.hashes, bytes: item.bytes,
      paths: {blueprint: `${OUT}/assembled/${item.id}/blueprint.json`, html: `${OUT}/assembled/${item.id}/index.html`, css: `${OUT}/assembled/${item.id}/styles.css`},
    });
  }
  const target = resolve(root, OUT, 'assembly.json');
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, json({source: 'public assembleBlueprint + compileBlueprint', cases: summary}));
  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const rows = await writeEvidence();
  console.log(`ASSEMBLED ${rows.length} contexts`);
  for (const row of rows) console.log(`${row.id} profile=${row.profile} blueprint=${row.hashes.blueprint} html=${row.hashes.html} css=${row.hashes.css}`);
}
