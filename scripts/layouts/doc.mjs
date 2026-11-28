/**
 * 레이아웃 24종 문서 생성(docs/platform/layouts.md). 등록된 재료 기록에서만 만든다: 손으로 고치지 않는다.
 *   node scripts/layouts/doc.mjs [--write] [--check]
 * --check는 저장본이 현재 재료와 바이트까지 같은지 본다(다르면 exit 1).
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {createPlatform} from '../../src/platform/index.mjs';
import {LAYOUT_KEYS} from '../../src/platform/data/layouts.mjs';
import {LAYOUT_BANDS, LAYOUT_BAND_NAMES, parseAreas, trackCSS} from '../../src/layout.mjs';

const FILE = new URL('../../docs/platform/layouts.md', import.meta.url);

export function layoutsMarkdown(env = createPlatform()) {
  const layouts = env.registry.list('layout');
  const byReq = LAYOUT_KEYS;
  const order = id => byReq.indexOf(id.slice('layout:'.length));
  const sorted = [...layouts].sort((a, b) => order(a.id) - order(b.id));
  const out = [
    '# 레이아웃 패턴 24종 (layout 재료)', '',
    '> 이 문서는 `scripts/layouts/doc.mjs`가 등록된 재료(`src/platform/data/layouts.mjs`)에서 생성한다. 손으로 고치지 않는다.', '',
    'REQUEST §9.2의 24개 레이아웃을 `layout:*` 재료로 등록했다(플랫폼 계약 0.8.0). 레이아웃은 **슬롯 계약**과 **폭 구간별 배치 표**를 가진다. 좁은 화면에서 전체를 줄이는 것이 아니라 슬롯의 자리를 다시 정한다.', '',
    '## 폭 구간', '',
    '컨테이너 폭(`container-type:inline-size`)으로 구간을 나눈다. 뷰포트가 아니다: 사이드바 안에 들어간 레이아웃도 자기 폭에 맞춘다.', '',
    '| 구간 | 컨테이너 폭 | 뷰포트 예 |', '|---|---|---|',
    ...LAYOUT_BAND_NAMES.map((n, i) => `| ${n} | ${LAYOUT_BANDS[i]}px 이상 | ${[320, 768, 1024, 1440][i]}px |`), '',
    '## 컴파일과 검증', '',
    '- 컴파일: `compileLayout(layout, fills)`(`src/layout.mjs`)는 슬롯 계약을 어기면 거부한다(`L_SLOT_REQUIRED`·`L_SLOT_MIN`·`L_SLOT_MAX`·`L_SLOT_ACCEPTS`·`L_NEST_FORBIDDEN`·`L_NEST_DEPTH`·`L_DENSITY`). 조용히 고쳐 통과시키지 않는다.',
    '- 조립: `assembleLayout(env, {layout, fills})`(`src/platform/layouts.mjs`)가 칸의 내용을 목적 패밀리(`purpose:*`) 렌더로 채우고 관계 그래프(`layout-slot-fit`·`layout-axis`·`forbids`·`avoids`)를 거친다.',
    '- 조회: `listPlatformMaterials({kind: "layout"})`, `getPlatformMaterial({id})`, `recommendMaterials({kind: "layout", selected})`, `checkCompatibility({ids})`와 같은 REST·MCP.',
    '- 실측: `node scripts/layouts/measure.mjs`(Chromium)가 24종 × 320·360·480·640·768·1024·1280·1440px의 가로 스크롤과 슬롯 위치를 기록한다(`docs/dev/catalog-platform-upgrade/screens/layouts/measurements.md`).',
    '- 읽기 순서: DOM 순서는 슬롯 선언 순서다. 폭이 넓어질 때 행 우선 읽기 순서가 달라지는 구간은 `reorders`에 선언한다.', '',
    '## 24종 요약', '',
    '| # | 레이아웃 | 핵심 구간 | 필수 슬롯 | 선택 슬롯 | 적용 목적 | 최소 콘텐츠 폭 | 기본 밀도 |', '|---|---|---|---|---|---|---|---|',
    ...sorted.map((m, i) => `| ${i + 1} | ${m.label} (\`${m.id}\`) | ${m.needsBand} | ${m.slots.filter(s => s.required).map(s => s.name).join(', ')} | ${m.slots.filter(s => !s.required).map(s => s.name).join(', ') || '-'} | ${m.purposes.join(', ')} | ${m.minContent}px | ${m.density.default} |`), '',
  ];
  for (const m of sorted) {
    out.push(`## ${m.label}`, '', `\`${m.id}\` · ${m.pattern}`, '',
      `- 부모 컨테이너: ${m.container.parent}(폭 ${m.container.width}) — ${m.container.note}`,
      `- 최소 콘텐츠 폭 ${m.minContent}px, 칸 최소 폭 ${m.minCol}px, 핵심 배치는 ${m.needsBand} 구간부터`,
      `- 밀도: ${m.density.allowed.join('·')}(기본 ${m.density.default}), 칸 사이 간격 \`${m.density.gap}\`, 항목 사이 간격 \`${m.density.itemGap}\``,
      `- 적용 가능한 페이지 목적: ${m.purposes.join(', ')} / 페이지 유형: ${m.contexts.join(', ')}`,
      `- 중첩: ${m.nesting.allow.length ? m.nesting.allow.join(', ') : '없음'} (깊이 ${m.nesting.maxDepth})`,
      `- 시각 순서가 DOM과 달라지는 구간: ${m.reorders.length ? m.reorders.join(', ') : '없음'}`, '',
      '**슬롯 계약**(순서 = DOM 순서)', '', '| 슬롯 | 필수 | 항목 수 | 허용 콘텐츠 | 태그 | 흐름 | 길이 대응 |', '|---|---|---|---|---|---|---|',
      ...m.slots.map(s => `| ${s.name} (${s.label}) | ${s.required ? '필수' : '선택'} | ${s.min}~${s.max} | ${s.accepts.join(', ')} | ${s.tag} | ${s.flow ? `${s.flow.mode} [${(s.flow.caps ?? []).join(',')}]` : 'stack'}${s.sticky ? ' · sticky' : ''} | ${m.length[s.name] ?? (s.length ?? 'wrap')} |`), '',
      '**폭 구간별 배치**', '', '| 구간 | 트랙 | 영역 표 |', '|---|---|---|',
      ...m.bands.map((b, i) => `| ${LAYOUT_BAND_NAMES[i]} (${LAYOUT_BANDS[i]}px~) | \`${b.columns.map(trackCSS).join(' ')}\` | ${parseAreas(b.areas).map(r => '`' + r.join(' ') + '`').join(' / ')} |`), '',
      '**배치 규칙**', '', ...m.rules.map(r => `- ${r}`), '');
  }
  return out.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const text = layoutsMarkdown();
  if (process.argv.includes('--write')) { writeFileSync(FILE, text); console.log('wrote docs/platform/layouts.md'); }
  else if (process.argv.includes('--check')) {
    let saved = ''; try { saved = readFileSync(FILE, 'utf8'); } catch {}
    if (saved !== text) { console.error('docs/platform/layouts.md가 재료와 다릅니다: node scripts/layouts/doc.mjs --write'); process.exit(1); }
    console.log('layouts.md MATCH');
  } else process.stdout.write(text);
}
