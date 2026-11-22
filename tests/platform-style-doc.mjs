/**
 * docs/platform/style-contexts.md의 생성 블록을 만든다. 표는 data/style-contexts.mjs·data/charts.mjs의 값에서 계산한다(손으로 옮겨 적지 않는다).
 *   node tests/platform-style-doc.mjs --write   문서의 생성 블록을 다시 쓴다
 * tests/platform-style-doc.test.mjs가 문서의 생성 블록과 이 출력이 같은지 본다(표가 데이터와 어긋나면 실패).
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {themes, themeCategories} from '../src/catalog/index.mjs';
import {createPlatform, recommend} from '../src/platform/index.mjs';
import {assemble} from '../src/profiles/assemble.mjs';
import {PROFILES} from '../src/profiles/data.mjs';
import {STYLE_CONTEXTS, STYLE_CONTEXT_DETAILS, STYLE_MATERIALS, rankStyleMaterials} from '../src/platform/data/style-contexts.mjs';
import {CHART_PRESET_RELATIONS, FORM_CONTEXTS, CHART_FORM_GROUPS, chartContextVerdict, PROFILE_LISTED_PRESETS, profileChartVerdict} from '../src/platform/data/charts.mjs';
import {pageTypeIds} from '../src/catalog/index.mjs';
import {STATE_KINDS} from '../src/platform/data/states.mjs';

const cell = s => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
const row = cells => `| ${cells.map(cell).join(' | ')} |`;
const table = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const short = id => id.slice(id.indexOf(':') + 1);

/** 스타일 맥락의 관계를 대상 종류별로 모은다: 대상별 순합(prefers − avoids)과 금지. */
function relationSummary(sc, env, kind) {
  const net = new Map(), banned = new Set();
  for (const e of sc.relations) {
    if (env.registry.get(e.to).kind !== kind) continue;
    if (e.type === 'forbids') banned.add(e.to);
    else net.set(e.to, (net.get(e.to) ?? 0) + (e.type === 'prefers' ? e.priority : -e.priority));
  }
  const parts = [...net].map(([id, n]) => `${short(id)} ${n > 0 ? '+' : ''}${n}`);
  for (const id of banned) parts.push(`${short(id)} 금지`);
  return parts.join(', ') || '—';
}


/**
 * 54개 스타일 맥락의 시각 패밀리 1·2순위. 첫 페이지 유형과 테마 기본 모드로 recommend()를 부른다(재료 검증 S1과 같은 방법).
 * 반환: [{theme, category, context, mode, first, second, reason}]. reason은 1순위 패밀리로 향한 가장 강한 prefers 관계의 이유다.
 */
export function familyRanking(env = createPlatform()) {
  return STYLE_CONTEXTS.map(sc => {
    const theme = short(sc.id), mode = themes[theme].defaults.mode ?? 'light', context = sc.contexts[0];
    const ranked = recommend(env.registry, env.graph, {kind: 'family', context, mode, styleContext: sc.id}).ranked;
    const first = ranked[0]?.id ?? null;
    const reason = sc.relations.filter(e => e.to === first && e.type === 'prefers').sort((a, b) => b.priority - a.priority)[0]?.reason ?? '';
    return {theme, category: themes[theme].category, context, mode, first, second: ranked[1]?.id ?? null, reason};
  });
}

/** 시각 패밀리별 1순위 횟수. [{family, count, share, themes}] 많은 순, 동수는 id 순. */
export function familyDistribution(rows) {
  const by = new Map();
  for (const r of rows) (by.get(r.first) ?? by.set(r.first, []).get(r.first)).push(r.theme);
  return [...by].map(([family, list]) => ({family, count: list.length, share: list.length / rows.length, themes: list}))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));
}

export function generateBlocks() {
  const env = createPlatform();
  const ids = Object.keys(themes);
  const blocks = {};

  blocks.counts = [
    `- 스타일 맥락: ${STYLE_CONTEXTS.length}개(테마 ${ids.length}개 전부, \`styleContextFromTheme\`으로 등록)`,
    `- 선언 관계(스타일 맥락 → 팔레트·서브토큰 세트·타이포 시스템·패밀리): ${STYLE_CONTEXTS.reduce((n, s) => n + s.relations.length, 0)}개. prefers ${STYLE_CONTEXTS.reduce((n, s) => n + s.relations.filter(e => e.type === 'prefers').length, 0)}, avoids ${STYLE_CONTEXTS.reduce((n, s) => n + s.relations.filter(e => e.type === 'avoids').length, 0)}, forbids ${STYLE_CONTEXTS.reduce((n, s) => n + s.relations.filter(e => e.type === 'forbids').length, 0)}`,
    `- 관계 대상(main에 등록된 재료): 팔레트 ${env.registry.list('palette').length} · 서브토큰 세트 ${env.registry.list('subtoken-set').length} · 타이포 시스템 ${env.registry.list('type-system').length} · 패밀리 ${env.registry.list('family').length}`,
    `- 스타일 재료 프리셋: ${Object.entries(STYLE_MATERIALS).map(([k, l]) => `${k} ${l.length}`).join(' · ')}`,
    `- 차트 프리셋 관계: ${CHART_PRESET_RELATIONS.length}개, 형태 ${Object.keys(FORM_CONTEXTS).length}종 × 페이지 유형 ${pageTypeIds.length}종`,
  ].join('\n');

  blocks['contexts-a'] = table(['테마', '이름', '분류', '주요 용도', '페이지 유형 맥락', '간격(밀도 · gap/section/inset px)', '반경(px)', '깊이(그림자)', '모션'],
    ids.map(id => { const d = STYLE_CONTEXT_DETAILS[id], t = d.tendencies; return [
      `\`${id}\``, themes[id].name, themeCategories[themes[id].category], d.use, `${d.pageTypes.join(', ')} — ${d.pageTypeReason}`,
      `${t.spacing.density} · ${t.spacing.gap}/${t.spacing.section}/${t.spacing.inset}`, `${t.radius.axis} ${t.radius.px}`, t.shadow.elevation, `${t.motion.axis} ${t.motion.duration}`]; }));

  blocks['contexts-b'] = table(['테마', '금지(축 값)', '금지 조합(한 축만 바꿔도 걸림)', '아이콘', '바탕 · 장식', '셸(내비)', '폭 · 푸터', '내비 한도'],
    ids.map(id => { const d = STYLE_CONTEXT_DETAILS[id];
      const axes = Object.entries(d.forbid.axes).map(([a, v]) => `${a}: ${v.join('·')}`).join('; ') || '—';
      const combos = d.forbid.combos.map(c => `${c.id}(${Object.entries(c.flip).map(([a, v]) => `${a}→${v.join('·')}`).join(', ')})`).join(' ') || '—';
      return [`\`${id}\``, axes, combos, `${d.media.icon} (선 ${d.media.iconStroke})`, `${d.media.backdrop} · ${d.media.ornament}`, `${d.layout.shell}: ${d.layout.shellLabel}${d.layout.megaMenu ? ' (메가 메뉴 가능)' : ''}`, `${d.layout.width} ${d.layout.widthPx}px · ${d.layout.footer}`, d.layout.navLimit]; }));

  blocks['contexts-c'] = table(['테마', '기본 모드', '팔레트(순합)', '서브토큰 세트', '타이포 시스템', '패밀리', '표면(선택지 수)', '모션', '배경', '미디어'],
    STYLE_CONTEXTS.map(sc => {
      const top = kind => { const r = rankStyleMaterials(sc, {kind}); return r.ranked.length ? `${short(r.ranked[0].id)} (${r.ranked.length}/${r.ranked.length + r.blocked.length})` : '막힘'; };
      return [`\`${short(sc.id)}\``, STYLE_CONTEXT_DETAILS[short(sc.id)].layout.mode, relationSummary(sc, env, 'palette'), relationSummary(sc, env, 'subtoken-set'), relationSummary(sc, env, 'type-system'), relationSummary(sc, env, 'family'),
        top('surface'), top('motion'), top('background'), top('media')]; }));

  const familyRows = familyRanking(env);
  blocks['family-distribution'] = table(['시각 패밀리', '1순위 횟수', '비율', '테마'],
    [...familyDistribution(familyRows).map(d => [`\`${short(d.family)}\``, `${d.count}/${familyRows.length}`, `${(d.share * 100).toFixed(1)}%`, d.themes.map(t => `\`${t}\``).join(' ')]),
      ['editorial·soft 합', `${familyRows.filter(r => ['family:editorial', 'family:soft'].includes(r.first)).length}/${familyRows.length}`, `${(familyRows.filter(r => ['family:editorial', 'family:soft'].includes(r.first)).length / familyRows.length * 100).toFixed(1)}%`, '재료 검증 S1 기준 43/54(79.6%)']]);
  blocks['family-picks'] = table(['테마', '분류', '첫 페이지 유형 · 모드', '1순위', '2순위', '선택 이유(관계 reason)'],
    familyRows.map(r => [`\`${r.theme}\``, themeCategories[r.category], `${r.context} · ${r.mode}`, `\`${short(r.first)}\``, r.second ? `\`${short(r.second)}\`` : '—', r.reason.replace(/^.*?시각 패밀리 \w+: /, '')]));

  const withStates = Object.entries(STYLE_MATERIALS).map(([kind, list]) => [kind, list]);
  blocks.materials = withStates.map(([kind, list]) => {
    const head = kind === 'state-pattern' ? ['id', '이름', '상태', '배치', '알림', '부분', '쓰는 페이지 유형'] : kind === 'surface' ? ['id', '이름', '단계(반경·깊이·채움)', '쓰는 페이지 유형']
      : kind === 'motion' ? ['id', '이름', 'duration(fast/base/slow ms)', 'easing(enter)', 'lift', '쓰는 페이지 유형'] : kind === 'background' ? ['id', '이름', '바탕 · 장식', '장식 종류', '쓰는 페이지 유형']
      : ['id', '이름', '아이콘', '타일', '사진(비율 · 반경 · 테두리 · 톤)', '캡션', '쓰는 페이지 유형'];
    const rows = list.map(m => {
      const ctx = m.contexts.join(', ');
      if (kind === 'surface') return [`\`${m.id}\``, m.label, Object.entries(m.levels).map(([k, l]) => `${k}: ${l.radius}·${l.elevation}·${l.fill}`).join(' / '), ctx];
      if (kind === 'motion') return [`\`${m.id}\``, m.label, `${m.duration.fast}/${m.duration.base}/${m.duration.slow}`, `(${m.easing.enter.join(', ')})`, m.lift, ctx];
      if (kind === 'background') return [`\`${m.id}\``, m.label, `${m.axes.backdrop} · ${m.axes.ornament}`, m.deco.kind, ctx];
      if (kind === 'media') return [`\`${m.id}\``, m.label, m.icon.style, `${m.tile.shape}/${m.tile.fill}`, `${m.photo.ratio} · ${m.photo.radius} · ${m.photo.border} · ${m.photo.treatment}${m.photo.scrim ? ` · 스크림 ${m.photo.scrim}%` : ''}`, m.caption, ctx];
      return [`\`${m.id}\``, m.label, m.state, m.layout, `${m.role}`, m.parts.join('·'), ctx];
    });
    return `**${kind}** (${list.length}개)\n\n${table(head, rows)}`;
  }).join('\n\n');

  blocks['chart-presets'] = table(['프리셋', '형태(군)', '데이터 유형', '도메인', '기본 페이지 유형', '허용 페이지 유형(수)', '옵션(격자·라벨·범례·밀도·반응형)', '같은 데이터의 다른 형태(대안)'],
    CHART_PRESET_RELATIONS.map(r => [`\`${short(r.id)}\``, `${r.form} (${r.group})`, r.dataType, r.domain, r.primaryContexts.join(', '), `${r.allowedContexts.length}`,
      `${r.options.grid}·${r.options.labels}·${r.options.legend}·${r.options.density}·${r.options.responsive}`, r.alternatives.slice(0, 3).map(short).join(', ') || '—']));

  blocks['chart-matrix'] = table(['형태', ...pageTypeIds],
    Object.keys(FORM_CONTEXTS).map(form => [form, ...pageTypeIds.map(c => (chartContextVerdict(form, c).ok ? 'O' : '·'))]));

  const listed = Object.entries(PROFILE_LISTED_PRESETS).flatMap(([profile, list]) => list.map(id => ({profile, id})));
  blocks['chart-profile'] = table(['프로필', '프리셋', '형태', '구형 경로(assemble)', '플랫폼: 페이지 유형 규칙만', '플랫폼: 프로필 형태 제한까지', '대안(프로필 형태 안)'],
    listed.map(({profile, id}) => {
      const v = profileChartVerdict(profile, id);
      const legacy = PROFILES[profile].patterns.some(p => assemble(profile, {pattern: p, chartPresets: [id]}).ok) ? '조립됨' : '조립 안 됨';
      const fmt = by => Object.entries(by).map(([c, r]) => `${c}: ${r.ok ? '조립' : r.code === 'P_CHART_PROFILE_KIND' ? '거부(형태)' : '거부(유형)'}`).join(', ');
      return [profile, `\`${short(id)}\``, v.form, legacy, fmt(v.byContext), fmt(v.byProfile), v.alternatives.slice(0, 3).map(short).join(', ') || '—'];
    }));

  blocks['form-groups'] = Object.entries(CHART_FORM_GROUPS).map(([g, forms]) => `- ${g}: ${forms.join(', ')}`).join('\n');
  blocks['state-kinds'] = STATE_KINDS.map(s => `- ${s}: ${STYLE_MATERIALS['state-pattern'].filter(m => m.state === s).map(m => `\`${short(m.id)}\``).join(', ')}`).join('\n');
  return blocks;
}

const DOC = new URL('../docs/platform/style-contexts.md', import.meta.url);
const marker = name => [`<!-- generated:${name} -->`, `<!-- /generated:${name} -->`];

/** 문서에서 생성 블록 하나의 현재 내용. */
export function blockOf(doc, name) {
  const [a, b] = marker(name), i = doc.indexOf(a), j = doc.indexOf(b);
  return i < 0 || j < 0 ? null : doc.slice(i + a.length + 1, j - 1);
}

export function writeDoc() {
  let doc = readFileSync(DOC, 'utf8');
  for (const [name, text] of Object.entries(generateBlocks())) {
    const [a, b] = marker(name), i = doc.indexOf(a), j = doc.indexOf(b);
    if (i < 0 || j < 0) throw new Error(`marker missing in docs/platform/style-contexts.md: ${name}`);
    doc = doc.slice(0, i + a.length) + '\n' + text + '\n' + doc.slice(j);
  }
  writeFileSync(DOC, doc);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href && process.argv.includes('--write')) writeDoc();
