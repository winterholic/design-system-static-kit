/**
 * docs/platform/color.md의 팔레트 × 세트 판정표를 계산한다. 문서의 표는 이 출력과 같아야 하고, tests/platform-color-docs.test.mjs가 비교한다.
 * 표를 손으로 고치지 말고 `node docs/platform/evidence/color/build.mjs`로 다시 쓴다.
 */
import {PALETTES} from '../../../../src/platform/data/palettes.mjs';
import {SUBTOKEN_SETS} from '../../../../src/platform/data/subtoken-sets.mjs';
import {colorMatrix, proposeSubtokenSets, bindColor} from '../../../../src/platform/color.mjs';
import {colorContrast} from '../../../../src/color-tokens.mjs';

export const BEGIN = '<!-- color-matrix:begin -->', END = '<!-- color-matrix:end -->';
export const METRICS_BEGIN = '<!-- color-metrics:begin -->', METRICS_END = '<!-- color-metrics:end -->';
export const PREVIEW_PALETTE = 'palette:sunrise-warm', PREVIEW_SETS = ['subtoken-set:editorial-warm', 'subtoken-set:commerce-vivid', 'subtoken-set:premium-dark', 'subtoken-set:high-contrast'];
const short = id => id.slice(id.indexOf(':') + 1);
/** 사용자 팔레트 거부 시연용 시드. 각각 어떤 이유로 세트가 거부되는지 표에 남긴다. */
export const STRESS_SEEDS = Object.freeze([
  ['선명한 3색(주황·청록)', ['#D2501E', '#6F625A', '#0D6E8E']],
  ['밝은 중립 시드를 낀 6색', ['#0D6E8E', '#8A8F99', '#E8A100', '#2E8B57', '#C0392B', '#3B6FD6']],
  ['거의 검정인 3색', ['#101010', '#181818', '#202020']],
  ['연한 파스텔 3색', ['#F7F0B0', '#F4F4F4', '#E9F5C0']],
]);

export function matrixData() {
  const rows = colorMatrix(PALETTES, SUBTOKEN_SETS);
  return {rows, passing: rows.filter(r => r.ok), failing: rows.filter(r => !r.ok)};
}

export function matrixMarkdown() {
  const {rows, passing, failing} = matrixData();
  const cell = (p, s) => (rows.find(r => r.palette === p.id && r.set === s.id).ok ? '통과' : '**실패**');
  const out = [];
  out.push(`팔레트 ${PALETTES.length}개 × 세트 ${SUBTOKEN_SETS.length}개 = ${rows.length}쌍 중 통과 ${passing.length}쌍, 실패 ${failing.length}쌍. 판정은 계산 관계 \`palette-subtoken\`(\`bindColor\`의 라이트·다크 두 모드 모두)이다.`, '');
  out.push(`| 팔레트 \\ 세트 | ${SUBTOKEN_SETS.map(s => short(s.id)).join(' | ')} | 통과한 세트 수 |`, `|---|${SUBTOKEN_SETS.map(() => '---').join('|')}|---|`);
  for (const p of PALETTES) out.push(`| ${short(p.id)} | ${SUBTOKEN_SETS.map(s => cell(p, s)).join(' | ')} | ${passing.filter(r => r.palette === p.id).length} |`);
  out.push(`| **통과한 팔레트 수** | ${SUBTOKEN_SETS.map(s => passing.filter(r => r.set === s.id).length).join(' | ')} | |`, '');
  out.push('### 실패한 쌍과 이유', '');
  if (!failing.length) out.push('없음.');
  else {
    out.push('| 팔레트 | 세트 | 모드 | 이유 |', '|---|---|---|---|');
    for (const f of failing) for (const r of f.reasons) out.push(`| ${short(f.palette)} | ${short(f.set)} | ${r.mode} | \`${r.code}\` ${r.message.replace(/^.*?\): /, '').replace(/^COLOR_CONTRAST: /, '').replace(/\|/g, '\\|')} |`);
  }
  out.push('', '### 사용자 팔레트 시연(`proposeSubtokenSets`)', '', '| 입력 | 후보 | 거부(이유 첫 줄) |', '|---|---|---|');
  for (const [name, seeds] of STRESS_SEEDS) {
    const r = proposeSubtokenSets(seeds);
    const reason = x => `${short(x.set)}: ${x.reasons[0].message.replace(/^.*?\): /, '').replace(/^COLOR_CONTRAST: /, '').replace(/\|/g, '\\|')}`;
    out.push(`| ${name} \`${seeds.join(' ')}\` | ${r.candidates.map(c => short(c.set)).join(', ') || '없음'} | ${r.rejected.slice(0, 3).map(reason).join('<br>') || '없음'}${r.rejected.length > 3 ? `<br>외 ${r.rejected.length - 3}개` : ''} |`);
  }
  return out.join('\n');
}

/** 대표 조합(sunrise-warm × 세트 4개)의 실제 값과 대비. 스크린샷이 칠한 값과 같은 bindColor 출력이다. */
export function previewMetricsMarkdown() {
  const palette = PALETTES.find(p => p.id === PREVIEW_PALETTE);
  const out = ['| 세트 · 모드 | canvas | surface | 주 행동 | 보조 행동 | 글자/surface | 주 행동 글자 | 가장 빠듯한 게이트 |', '|---|---|---|---|---|---|---|---|'];
  for (const id of PREVIEW_SETS) for (const mode of ['light', 'dark']) {
    const r = bindColor(palette, SUBTOKEN_SETS.find(s => s.id === id), mode), c = (a, b) => colorContrast(a, b).toFixed(1);
    const tight = r.report.map(x => ({...x, margin: x.ratio / x.minimum})).sort((a, b) => a.margin - b.margin)[0];
    out.push(`| ${short(id)} · ${mode} | \`${r.roles.canvas}\` | \`${r.roles.surface}\` | \`${r.roles.action}\` | \`${r.roles.accent}\` | ${c(r.roles.text, r.roles.surface)} | ${c(r.roles.onAction, r.roles.action)} | ${tight.role} vs ${tight.against} ${tight.ratio}/${tight.minimum} |`);
  }
  return out.join('\n');
}
