import {themes} from '../../src/catalog.mjs';
import {enumerateCombos, renderCombo} from '../../src/combos.mjs';

/**
 * 전체 조합 × 54개 테마(기본 결과 첫 변형 포함)를 전부 컴파일·검증한다. 약 6분.
 * 갤러리에서 테마를 바꿔 보는 어떤 경우도 "만들지 못함"이 되지 않는지 확인하는 용도라 npm test에는 넣지 않았다
 * (시험은 조합마다 회전하는 테마·팔레트·모드 3개 보기만 돈다).
 * 사용: node scripts/design-qa/combos-sweep.mjs
 */
const t0 = Date.now(); let renders = 0, bad = 0; const sample = [];
for (const combo of enumerateCombos()) for (const theme of Object.values(themes)) for (const variant of [null, theme.variants[0]?.id ?? null]) {
  renders++;
  const r = renderCombo(combo, {theme: theme.id, tv: variant});
  if (!r.ok) { bad++; if (sample.length < 8) sample.push(`${combo.id} ${theme.id}${variant ? '/' + variant : ''}: ${r.error.slice(0, 160)}`); }
}
console.log(`SWEEP: ${enumerateCombos().length} combinations × ${Object.keys(themes).length} themes (with first variant) = ${renders} renders, ${bad} failed, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
for (const line of sample) console.log('  ' + line);
process.exitCode = bad ? 1 : 0;
