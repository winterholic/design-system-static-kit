/**
 * 프로파일 정적 검사(품질 검사 A 수준). Blueprint 하나를 받아 프로파일이 허용하지 않는 재료·프리셋·밀도 조합을 진단으로 돌려준다.
 * 값을 고치지 않는다. 진단마다 코드·경로·심각도·근거(reason)·대안(fix, alternatives)이 있다.
 *
 * 검증기(src/validate.mjs)가 `profile`이 있는 2.6.0 Blueprint에 이 함수를 부른다. 그래서 재료 레지스트리를 import하지 않는다
 * (컴파일 경로는 src/materials/를 읽지 않는다, ADR 0011). 브라우저 레이아웃 검사(B 수준)는 scripts/layout-quality가 맡는다.
 */
import {PROFILES, PROFILE_RULES, PROFILE_AXES} from './data.mjs';

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const ruleOf = code => PROFILE_RULES.find(r => r.code === code).id;

/** 진단 하나. severity는 지금 모두 error다(프로파일 위반은 Blueprint를 거부한다). */
function diag(code, path, message, reason, fix = null, alternatives = []) {
  return {code, path, severity: 'error', message, reason, fix, alternatives: [...alternatives], rule: ruleOf(code)};
}

/** 트리의 모든 노드를 [노드, 경로]로 펼친다. 모양이 틀린 노드는 건너뛴다(검증기가 따로 거부한다). */
function walk(tree) {
  const out = [];
  (function visit(n, path) {
    if (!plain(n)) return;
    out.push([n, path]);
    if (Array.isArray(n.children)) n.children.forEach((c, i) => visit(c, `${path}.children[${i}]`));
  })(tree, '$.tree');
  return out;
}

/**
 * profileId를 생략하면 b.profile을 쓴다. 알 수 없는 프로파일이면 빈 배열이다(스키마 enum이 ENUM으로 거부한다).
 * 반환: [{code, path, severity, message, reason, fix, alternatives, rule}]
 */
export function checkProfile(b, profileId = b?.profile) {
  if (!plain(b) || typeof profileId !== 'string' || !Object.hasOwn(PROFILES, profileId)) return [];
  const p = PROFILES[profileId], out = [], name = `${p.label}(${profileId})`;
  const notIn = (value, allowed) => !allowed.includes(value);

  if (notIn(b.pageType, p.contexts)) out.push(diag('PROFILE_PAGE_TYPE', '$.pageType', `${name}는 페이지 유형 ${b.pageType}을 다루지 않습니다.`, `프로파일의 패턴·밀도·부품 규칙은 ${p.contexts.join(', ')} 화면을 기준으로 정했습니다.`, {pageType: p.contexts[0]}, p.contexts));
  if (notIn(b.theme, p.themes)) out.push(diag('PROFILE_THEME', '$.theme', `${name}는 테마 ${b.theme}을 허용하지 않습니다.`, `허용 테마는 프로파일의 축 제한(${PROFILE_AXES.join('·')})과 기본값이 충돌하지 않는 프리셋입니다.`, {theme: p.themes[0]}, p.themes));
  if (notIn(b.density, p.density.allowed)) out.push(diag('PROFILE_DENSITY', '$.density', `${name}에서 density=${b.density}는 쓸 수 없습니다.`, `정보 밀도 ${p.density.info}: 허용 density는 ${p.density.allowed.join(', ')}입니다.`, {density: p.density.default}, p.density.allowed));
  if (notIn(b.typography, p.type.typography)) out.push(diag('PROFILE_TYPOGRAPHY', '$.typography', `${name}에서 서체 프리셋 ${b.typography}는 쓸 수 없습니다.`, `역할형 타이포 ${p.type.rolePreset}와 같은 계열의 서체 프리셋만 고릅니다.`, {typography: p.type.default}, p.type.typography));
  if (notIn(b.shell, p.chrome.shells)) out.push(diag('PROFILE_SHELL', '$.shell', `${name}에서 셸 ${b.shell}은 쓸 수 없습니다.`, `머리 구조 ${p.chrome.header}, 사이드바 ${p.chrome.sidebar}에 맞는 셸만 허용합니다.`, {shell: p.chrome.shells[0]}, p.chrome.shells));
  if (notIn(b.footer, p.chrome.footer)) out.push(diag('PROFILE_AXIS', '$.footer', `${name}에서 footer=${b.footer}는 쓸 수 없습니다.`, `프로파일의 푸터 허용값은 ${p.chrome.footer.join(', ')}입니다.`, {footer: p.chrome.footer[0]}, p.chrome.footer));
  for (const axis of PROFILE_AXES) {
    const allowed = p.axes[axis];
    if (allowed && notIn(b[axis], allowed)) out.push(diag('PROFILE_AXIS', '$.' + axis, `${name}에서 ${axis}=${b[axis]}는 쓸 수 없습니다.`, `프로파일의 ${axis} 허용값은 ${allowed.join(', ')}입니다.`, {[axis]: allowed[0]}, allowed));
  }
  if (notIn(b.mode, p.color.modes)) out.push(diag('PROFILE_MODE', '$.mode', `${name}에서 mode=${b.mode}는 쓸 수 없습니다.`, `프로파일의 색 모드는 ${p.color.modes.join(', ')}입니다.`, {mode: p.color.modes[0]}, p.color.modes));
  if (notIn(b.colorPalette, p.color.palettes)) out.push(diag('PROFILE_COLOR', '$.colorPalette', b.colorPalette === undefined ? `${name}는 colorPalette가 필요합니다.` : `${name}에서 colorPalette=${b.colorPalette}는 쓸 수 없습니다.`, '프로파일은 2.6.0 4계층 색 토큰으로만 칠합니다. 레거시 팔레트 단독 출력은 허용하지 않습니다.', {colorPalette: p.color.palettes[0]}, p.color.palettes));

  const nodes = walk(b.tree);
  const tables = nodes.filter(([n]) => n.type === 'table'), charts = nodes.filter(([n]) => n.type === 'chart');
  for (const [n, path] of nodes) {
    if (typeof n.type !== 'string' || p.components.includes(n.type)) continue;
    const sub = p.substitutes[n.type];
    out.push(diag('PROFILE_COMPONENT', path + '.type', `${name}는 부품 ${n.type}을 허용하지 않습니다.`, `허용 부품 목록 밖입니다. 프로파일은 ${p.contexts.join(', ')} 화면에 맞는 부품만 조립합니다.`, sub ? {type: sub} : null, sub ? [sub] : []));
  }
  if (tables.length && p.tableRows.maxColumns > 0 && notIn(b.density, p.tableRows.density)) out.push(diag('PROFILE_TABLE', '$.density', `${name}에서 표가 있는 화면은 density=${b.density}를 쓸 수 없습니다.`, `표 행 밀도는 ${p.tableRows.density.join(', ')}만 허용합니다.`, {density: p.tableRows.density[0]}, p.tableRows.density));
  for (const [n, path] of tables) {
    if (!p.components.includes('table')) continue;
    if (n.variant !== undefined && notIn(n.variant, p.tableRows.variants)) out.push(diag('PROFILE_TABLE', path + '.variant', `${name}에서 표 변형 ${n.variant}는 쓸 수 없습니다.`, `표 변형 허용값은 ${p.tableRows.variants.join(', ')}입니다.`, {variant: p.tableRows.variants[0]}, p.tableRows.variants));
    if (Array.isArray(n.columns) && n.columns.length > p.tableRows.maxColumns) out.push(diag('PROFILE_TABLE', path + '.columns', `${name}에서 표는 열 ${p.tableRows.maxColumns}개까지입니다(${n.columns.length}개).`, '프로파일 폭과 행 밀도에서 열이 더 많으면 좁은 화면 대체(가로 스크롤)에 기대게 됩니다.', null, []));
  }
  for (const [n, path] of charts) {
    if (!p.components.includes('chart')) continue;
    if (notIn(n.kind, p.charts.kinds)) out.push(diag('PROFILE_CHART', path + '.kind', `${name}에서 차트 형태 ${n.kind}는 쓸 수 없습니다.`, `프로파일의 차트 형태는 ${p.charts.kinds.join(', ')}입니다.`, p.charts.kinds.length ? {kind: p.charts.kinds[0]} : null, p.charts.kinds));
  }
  if (p.components.includes('chart') && charts.length > p.charts.max) out.push(diag('PROFILE_CHART', '$.tree', `${name}에서 차트는 페이지당 ${p.charts.max}개까지입니다(${charts.length}개).`, '차트가 많으면 판단할 지표가 흐려집니다. 나머지는 표나 지표로 옮기세요.', null, []));
  for (const [n, path] of nodes) {
    for (const [key, allowed] of Object.entries(p.fields)) {
      const [type, field] = key.split('.');
      if (n.type === type && Object.hasOwn(n, field) && notIn(n[field], allowed)) out.push(diag('PROFILE_FIELD', `${path}.${field}`, `${name}에서 ${type}.${field}=${n[field]}는 쓸 수 없습니다.`, `프로파일의 ${type}.${field} 허용값은 ${allowed.join(', ')}입니다.`, {[field]: allowed[0]}, allowed));
    }
  }
  const top = plain(b.tree) && Array.isArray(b.tree.children) ? b.tree.children.length : 0;
  if (top > p.quality.maxTopLevel) out.push(diag('PROFILE_QUALITY', '$.tree.children', `${name}에서 최상위 구역은 ${p.quality.maxTopLevel}개까지입니다(${top}개).`, '품질 기준: 한 화면의 최상위 구역 수 상한.', null, []));
  const nav = Array.isArray(b.chrome?.nav) ? b.chrome.nav.length : 0;
  if (nav > p.quality.maxNav) out.push(diag('PROFILE_QUALITY', '$.chrome.nav', `${name}에서 내비 항목은 ${p.quality.maxNav}개까지입니다(${nav}개).`, '품질 기준: 프로파일의 내비 항목 수 상한(셸 상한보다 좁을 수 있다).', null, []));
  return out;
}

/** 검증기용: 서비스 Diagnostic 모양(code, path, message, rule, fix)으로 줄인다. 근거는 message 뒤에 붙인다. */
export const profileErrors = b => checkProfile(b).map(d => ({path: d.path, code: d.code, message: `${d.message} 근거: ${d.reason}${d.alternatives.length ? ` 대안: ${d.alternatives.join(', ')}` : ''}`, rule: d.rule, ...(d.fix ? {fix: d.fix} : {})}));
