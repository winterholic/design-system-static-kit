/**
 * docs/platform/families.md의 생성 구간을 다시 쓴다(컴포넌트 패밀리 작업 소유). 표의 숫자는 코드와 측정 결과에서 읽는다.
 *   node scripts/families/doc-tables.mjs [--check]
 * 구간 표시: <!-- generated:이름 --> … <!-- /generated:이름 -->. 구간 밖(정성 평가 등)은 사람이 쓴다. --check는 파일이 최신이 아니면 실패한다.
 */
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createPlatform, memberCombinations} from '../../src/platform/index.mjs';
import {PURPOSE_FAMILIES, combinationMatrix, checkPurposeCombination, VISUAL_LANGUAGES} from '../../src/platform/families/index.mjs';
import {LEGACY_VARIANT_MAP} from '../../src/platform/families/legacy-map.mjs';

const DOC = resolve(import.meta.dirname, '../../docs/platform/families.md');
const MEASURE = resolve(import.meta.dirname, '../../docs/platform/evidence/families/measurements.json');
const env = createPlatform();
const visuals = env.registry.list('family'), bases = env.registry.list('base-component');
const cell = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');
const short = id => id.replace(/^[a-z-]+:/, '');
const cartesian = axes => Object.entries(axes).reduce((acc, [k, vs]) => acc.flatMap(a => vs.map(v => ({...a, [k]: v}))), [{}]);

const blocks = {};

blocks.base = table(['기반 컴포넌트', '계약(defineContract)', '축 수', '허용 조합 / 전체', '의존', '출처'], bases.map(b => {
  const impl = env.registry.kind('base-component').implementation(b.id), c = impl.contract;
  const total = Object.values(c.axes).reduce((n, v) => n * v.length, 1);
  const legal = [...cartesian(c.axes)].filter(p => !c.forbidden.some(r => Object.entries(r.when).every(([a, v]) => [v].flat().includes(p[a])))).length;
  return [b.id, c.id, Object.keys(c.axes).length, `${legal} / ${total}`, b.dependencies.join(', ') || '없음', `src/materials/${b.render.module.split('/').pop()}`];
}));

blocks.visual = table(['시각 패밀리', '한 줄 설명', '모양(radius·elevation·motion)', '전제 밀도', '덮는 기반 컴포넌트', '고정 축 예(Card·Button·Navigation)'], visuals.map(f => {
  const m = f.members, p = id => JSON.stringify(m[`base-component:${id}`].preset);
  return [f.id, VISUAL_LANGUAGES[f.id].summary, `${f.shape.radius}·${f.shape.elevation}·${f.shape.motion}`, f.density, `${Object.keys(m).length}/10`, `card ${p('card-surface')}; button ${p('button-control')}; nav ${p('navigation-menu')}`];
}));

blocks.openAxes = table(['시각 패밀리', ...bases.map(b => short(b.id))], visuals.map(f => [f.id, ...bases.map(b => {
  const impl = env.registry.kind('base-component').implementation(b.id), c = memberCombinations(impl.contract, f.members[b.id]);
  return `${c.legal}/${c.total}`;
})]));

const variantCombos = f => cartesian({...f.variants, ...f.props});
blocks.purpose = table(['목적 패밀리', '목적·맥락', '기반 컴포넌트', '변형 축', '열린 기반 축', '기본값', '거부 규칙'], PURPOSE_FAMILIES.map(f => [
  f.id, f.purpose, f.children.map(short).join(', '), Object.entries(f.variants).map(([k, v]) => `${k}: ${v.join('·')}`).join('; '), Object.entries(f.props).map(([k, v]) => `${k}: ${v.join('·')}`).join('; '),
  JSON.stringify(f.defaults), [...f.forbidden.map(r => r.id), ...(f.needs.visual ? [`needs.visual ${JSON.stringify(f.needs.visual)}`] : [])].join(', ') || '없음',
]));

blocks.fields = table(['목적 패밀리', '상태', '실제 상호작용', '반응형', '접근성 조건(요약)', '허용 부모', '렌더 진입점'], PURPOSE_FAMILIES.map(f => [
  f.id, f.states.join(', '), f.interactions.map(i => `${i.on} → ${i.behavior}${i.runtime ? ` [${i.runtime}]` : ''}`).join(' / '), `${f.responsive.strategy} ${f.responsive.breakpoints.join(',') || '-'}: ${f.responsive.behavior}`,
  `${f.a11y.role}; ${f.a11y.conditions.join('; ')}`, f.parents.join(', '), `${f.entry.module}#${f.entry.export}`,
]));

const counts = PURPOSE_FAMILIES.map(f => {
  const all = variantCombos(f); let ok = 0;
  for (const v of visuals) for (const combo of all) {
    const variant = Object.fromEntries(Object.keys(f.variants).map(k => [k, combo[k]])), props = Object.fromEntries(Object.keys(f.props).map(k => [k, combo[k]]));
    if (checkPurposeCombination(f, {visual: v.id, variant, props, content: f.example.content}).ok) ok++;
  }
  return {f, perVisual: all.length, total: all.length * visuals.length, ok};
});
blocks.combos = [table(['목적 패밀리', '변형×열린 축 조합(시각 패밀리당)', '× 시각 패밀리 전체', '허용', '거부(패밀리 단위)'], counts.map(c => [c.f.id, c.perVisual, c.total, c.ok, c.total - c.ok])),
  '', `합계: 전체 ${counts.reduce((n, c) => n + c.total, 0)}개 중 허용 ${counts.reduce((n, c) => n + c.ok, 0)}개, 거부 ${counts.reduce((n, c) => n + c.total - c.ok, 0)}개. 허용은 패밀리 계약(변형·열린 기반 축 값, 금지 조합, 시각 패밀리 요구)과 기반 컴포넌트 계약(\`resolveMember\`)을 모두 통과한다고 보장하는 수가 아니라, 패밀리 계약만 통과한 수다. 기반 계약 위반은 렌더 때 \`P_REL_CONTRACT\`로 거부된다.`].join('\n');

const matrix = combinationMatrix(env);
blocks.matrix = table(['목적 패밀리', ...visuals.map(v => short(v.id))], matrix.map(r => [r.purpose, ...visuals.map(v => r.cells[v.id].ok ? '허용' : `거부: ${r.cells[v.id].reasons.map(x => x.message).join(' ')}`)]));

blocks.legacy = table(['구형 노드', '필드', '값', '대응(패밀리 preset)', '비고'], LEGACY_VARIANT_MAP.map(r => [r.node, r.field, r.value,
  r.to === null ? '대응 없음' : r.to.base ? `${short(r.to.base)} ${JSON.stringify(r.to.props)}${r.to.via === 'visual' ? ' (시각 패밀리가 고정)' : ' (열린 축)'}` : `${r.to.purpose} ${JSON.stringify(r.to.variant)}${r.to.props ? ' ' + JSON.stringify(r.to.props) : ''}`, r.note]));

if (existsSync(MEASURE)) {
  const {summary: s, results} = JSON.parse(readFileSync(MEASURE, 'utf8'));
  const by = g => results.filter(r => r.viewport && r.group === g);
  blocks.measure = [
    table(['측정', '대상 수', '결과'], [
      ['페이지(묶음 × 시각 4 × 모드 2 × 뷰포트 2)', s.pages, `실패 ${s.failed}, 건너뜀 ${s.skipped}`],
      ['layout-quality 오류(layoutProbe error)', s.pages, `${s.probeErrors}건`],
      ['카드 높이 불균형(같은 줄 카드의 최대 높이 차)', `카드 ${s.cards.checked}장, 비교한 줄 ${s.cards.rowsCompared}`, `최대 ${s.cards.maxHeightSpread}px`],
      ['제목-본문 패딩(상·좌 여백 일치와 8px 이상, 제목-본문 간격 2~32px)', `카드 ${s.padding.checked}장`, `위반 ${s.padding.issues}건`],
      ['숫자 줄바꿈(.pf-num이 한 줄)', `숫자 ${s.numbers.checked}개`, `줄바꿈 ${s.numbers.wrapped}건`],
      ['버튼 크기 불일치(같은 묶음 높이 차 1px 초과)', `버튼 ${s.buttons.checked}개, 비교한 묶음 ${s.buttons.groupsCompared}`, `불일치 ${s.buttons.mismatched}건`],
      ['컨트롤 겹침(버튼끼리, 버튼과 입력·선택 칸)', `컨트롤 ${s.overlap.checked}개`, `겹침 ${s.overlap.found}건`],
      ['가로 넘침(문서가 뷰포트보다 넓음)', `페이지 ${s.pages}`, `${s.overflowPages}쪽`],
    ]), '',
    table(['묶음', '페이지 수', '실패', 'layoutProbe가 훑은 글 수(합)', '훑은 가로 넘침 대상(합)'], ['card', 'button', 'navigation', 'form', 'table', 'feedback'].map(g => [g, by(g).length, by(g).filter(r => !r.ok).length, by(g).reduce((n, r) => n + (r.scanned.text ?? 0), 0), by(g).reduce((n, r) => n + (r.scanned.overflow ?? 0), 0)])),
  ].join('\n');
} else blocks.measure = '_측정 결과 파일이 없습니다: `node scripts/families/measure.mjs --shots`_';

let doc = readFileSync(DOC, 'utf8');
for (const [name, body] of Object.entries(blocks)) {
  const re = new RegExp(`(<!-- generated:${name} -->)[\\s\\S]*?(<!-- /generated:${name} -->)`);
  if (!re.test(doc)) throw new Error(`families.md에 생성 구간 ${name}이 없습니다`);
  doc = doc.replace(re, `$1\n${body}\n$2`);
}
if (process.argv.includes('--check')) {
  if (readFileSync(DOC, 'utf8') !== doc) { console.error('docs/platform/families.md의 생성 구간이 최신이 아닙니다: node scripts/families/doc-tables.mjs'); process.exit(1); }
  console.log('families.md generated blocks are current');
} else { writeFileSync(DOC, doc); console.log('families.md updated'); }
