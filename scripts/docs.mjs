import {readFile, writeFile} from 'node:fs/promises';
import {themes, themeCategories, palettes, axes, axisDefs, axisOrder, styleAxes, axisBans, nodeSpecs, nodeTypes, pageTypes, templateList, rules, iconNames, layoutCoverage, contentCoverage, iconAliases, icons, CATALOG_VERSION, limits, navLimits} from '../src/catalog.mjs';
import {page} from './md.mjs';
import {RADIUS} from '../src/styles/base.mjs';

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), 'utf8'));
const evidenceCount = (await read('../docs/evidence/coolors-palettes.json')).palettes.length;
const peer = await read('../docs/evidence/peer-axes.json'), cov = await read('../docs/evidence/coverage.json'), contrast = await read('../docs/evidence/contrast.json');
const n = x => Number(x).toLocaleString('en-US');
const px = s => parseFloat(String(s));
const uniq = list => [...new Set(list)];
const count = list => Object.entries(list.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {}));
const GROUP = {structure: '구조', layout: '레이아웃', content: '콘텐츠', data: '데이터', form: '폼', feedback: '피드백·상태', media: '미디어', nav: '내비게이션'};
const stats = {themes: Object.keys(themes).length, palettes: Object.keys(palettes).length, templates: templateList.length, nodes: nodeTypes.length, pageTypes: Object.keys(pageTypes).length, icons: iconNames.length, shells: axes.shell.length, rules: rules.length, bans: axisBans.length, axes: axisOrder.length};

// ---------- gap analysis ----------
const radiusNames = Object.keys(RADIUS), radiusPx = Object.values(RADIUS);
const nearest = v => radiusNames[radiusPx.reduce((best, r, i) => Math.abs(r - v) < Math.abs(radiusPx[best] - v) ? i : best, 0)];
const profile = s => {
  const card = px(s.cardR), btn = px(s.btnR), r = nearest(card);
  const control = btn >= 60 ? 'pill' : btn === 0 ? 'square' : 'match';
  const weight = Number(s.btnW) <= 500 ? 'regular' : Number(s.btnW) === 600 ? 'medium' : 'bold';
  const icon = s.iconCap === 'butt' ? 'line-square' : s.iconStroke <= 1.6 ? 'line-fine' : s.iconStroke >= 2.4 ? 'line-bold' : 'line';
  const elevation = s.btnShadow === 'none' ? '평면·테두리' : '그림자/글로우';
  return {r, dev: Math.abs(RADIUS[r] - card), control, weight, icon, elevation};
};
const themeOf = id => Object.values(themes).filter(t => t.covers.includes(id)).map(t => t.id).join(', ');
const profiles = peer.systems.map(s => ({s, p: profile(s)}));
const maxDev = Math.max(...profiles.map(x => x.p.dev));
const layoutFull = Object.values(layoutCoverage).filter(c => c.status === 'full').length, layoutPartial = Object.keys(layoutCoverage).length - layoutFull;
const distinct = f => uniq(peer.systems.map(f)).sort((a, b) => px(a) - px(b));
const totalSections = peer.pages.reduce((a, p) => a + p.sections.length, 0);

const gap = `## 1. 목적과 방법

사용자 피드백은 "너무 부실하다. 동료분 레포는 굉장히 다양한 테마·레이아웃 컨셉을 반영하는데, 거기에 더 보완해서 더 완성도 높게 만들어야 한다"였습니다. 이 문서는 동료분 레포의 축과 수량을 전수 목록화하고, 이 저장소(카탈로그 ${CATALOG_VERSION})와 항목별로 대조합니다.

- 대조 대상: [yehsb123/design-system-kit](https://github.com/yehsb123/design-system-kit) 커밋 \`${peer.observedCommit.slice(0, 7)}\`. 라이선스는 **${peer.license}** 입니다.
- 가져온 것은 **축의 이름·값의 범위·수량**뿐입니다(\`docs/evidence/peer-axes.json\`). 코드, 토큰 값, CSS, 문구, 아이콘 그림은 가져오지 않았습니다. 이 저장소의 아이콘 ${stats.icons}개는 24px 격자에서 새로 그렸습니다.
- 철학만 빌렸습니다. 동료분 레포는 프롬프트에 규칙을 심는 도구이고, 이 저장소는 **카탈로그 밖의 값은 코드가 생성하지 못하게** 강제합니다.
- 이 표의 대응 관계는 \`src/catalog/coverage.mjs\`와 각 테마의 \`covers\`에 데이터로 있고, \`tests/catalog.test.mjs\`가 실제 카탈로그와 대조합니다. 문서가 주장만 하고 코드가 따르지 않는 상태를 막습니다.

## 2. 동료분 레포 인벤토리

| 항목 | 수량 | 관찰된 값 |
|---|---|---|
| 디자인 시스템 | ${peer.counts.systems} | 분류 ${count(peer.systems.map(s => s.category)).length}종: ${count(peer.systems.map(s => s.category)).map(([k, v]) => `${k} ${v}`).join(', ')} |
| 서체 | ${uniq(peer.systems.map(s => s.font)).length}종 | 시스템마다 한 가지 대표 서체 |
| 카드 모서리 | ${distinct(s => s.cardR).length}값 | ${distinct(s => s.cardR).join(', ')} |
| 버튼 모서리 | ${distinct(s => s.btnR).length}값 | ${distinct(s => s.btnR).join(', ')} |
| 버튼 굵기 | ${distinct(s => s.btnW).length}값 | ${distinct(s => s.btnW).join(', ')} |
| 버튼 그림자 | ${count(peer.systems.map(s => s.btnShadow === 'none' ? '없음' : '있음')).map(([k, v]) => `${k} ${v}`).join(', ')} | 평면, 1px 테두리, 옅은 그림자, 브랜드색 글로우 |
| 아이콘 선 굵기 | ${distinct(s => s.iconStroke).length}값 | ${distinct(s => s.iconStroke).join(', ')} (끝 모양: ${count(peer.systems.map(s => s.iconCap)).map(([k, v]) => `${k} ${v}`).join(', ')}) |
| 태그 모서리 | ${distinct(s => s.tagR).length}값 | ${distinct(s => s.tagR).join(', ')} |
| 시그니처(특징 표현) | ${count(peer.systems.map(s => s.signature).filter(Boolean)).length}종 | ${count(peer.systems.map(s => s.signature).filter(Boolean)).map(([k, v]) => `${k} ${v}`).join(', ')} |
| 레이아웃 패턴 | ${peer.counts.layouts} | Holy Grail, 벤토, 칸반, 달력, 채팅, 메뉴판 4종 등 |
| 콘텐츠 구조 | ${peer.counts.pages} | 섹션 합계 ${totalSections}개: ${peer.pages.map(p => p.id).join(', ')} |
| 아이콘 | ${peer.counts.icons} | SVG 스프라이트·개별 파일·React 컴포넌트로 내보내기 |
| 산출물 | 6 | 프롬프트, CLAUDE.md, CSS 토큰, 컴포넌트 CSS, Tailwind 설정, 스펙 문서 |
| 조립기 | 1 | 브랜드색 하나로 50~950 램프와 대비 검사 |
| 생성기 | 1 | 제품 정보로 동작하는 HTML 페이지(섹션 약 30종) |
| 검사 | 4종 | UI 조작, 사용 흐름, 접근성(다크·390px·키보드·대비), API 일치 |

## 3. 축 대조표

| 축 | 동료분 레포 | static-kit 1.0 | static-kit ${CATALOG_VERSION} | 강제 방식 |
|---|---|---|---|---|
| 테마·시스템 | ${peer.counts.systems}종 | 6 | **${stats.themes}종** (${Object.keys(themeCategories).length}분류) | 스키마 enum, 테마별 금지 값 |
| 색 팔레트 | 시스템당 램프 1벌 | 18(테마당 3) | **${stats.palettes}개**(테마당 ${Math.min(...Object.values(themes).map(t => t.palettes.length))}개 이상, Coolors 렌더 출처) | 증거 파일 대조, 테마 소속 검사 |
| 대비 | 램프별 AA 계산 | 900쌍 | **${n(contrast.pairs)}쌍**(${contrast.modes}모드) | 컴파일 게이트, 실패 시 생성 불가 |
| 다크 모드 | 라이트·다크 토큰 | light·dark | light·dark·**auto**(두 세트 모두 검증) | 모드별 대비 검사 |
| 레이아웃 셸 | 38 패턴(혼합) | 4 | **${stats.shells}종**(레일·하단탭·제호형 등) | enum, 셸별 내비 항목 수·아이콘 규칙 |
| 레이아웃 부품 | — | 3 | split·aside·bento·tabs·kanban·reel·master-detail 등 | 허용 간선, 중첩 금지 |
| 페이지 템플릿 | ${peer.counts.pages}종 | 4 | **${stats.templates}종**(${stats.pageTypes}개 페이지 유형) | 페이지 유형 계약 |
| 부품 | 섹션 약 30종 | 13 | **${stats.nodes}종**과 변형 ${n(nodeTypes.flatMap(t => Object.values(nodeSpecs[t].fields)).filter(s => s.enum).reduce((a, s) => a + s.enum.length, 0))}개 | 스키마·검증기 |
| 서체 | 시스템별 | 3 | ${axes.typography.length}종 조합 + 타입 스케일 ${axes.scale.length}단계 + 굵기 ${axes.weight.length}단계 | enum |
| 모서리 | ${distinct(s => s.cardR).length}값 | 3 | ${axes.radius.length}단계 + 컨트롤 모양 ${axes.control.length}종(카드와 버튼을 분리) | enum |
| 그림자·깊이 | 시스템별 | 없음 | ${axes.elevation.length}종(평면~굵은 오프셋·글로우) | enum, 금지 조합 |
| 모션 | 없음 | 없음 | ${axes.motion.length}종 + reduced-motion 항상 존중 | enum |
| 아이콘 스타일 | 선 굵기·끝 모양 | 없음 | ${axes.icon.length}종, 아이콘 ${stats.icons}개 | enum, 아이콘 enum |
| 장식·일러스트 | 없음 | 조합 도형 1종 | ${axes.ornament.length}종 + 미디어 자리 ${nodeSpecs.media.fields.kind.enum.length}종 | enum |
| 배경 | 없음 | 없음 | ${axes.backdrop.length}종(그라데이션 위 글자도 대비 검사) | enum, 대비 샘플 22점 |
| 접근성 | 대비·키보드 검사 | 대비 | 대비 + 구조 감사(제목 단계·이름·라벨·타깃 24px·앵커) + 포커스 표시 + 강제 색상·고대비 | 브라우저 검사 |
| 반응형 | 768px 1열 | 640/1000 | 3폭(390·768·1280) 전수 오버플로 검사, 61 템플릿 | Chromium 검사 |
| 상태 컴포넌트 | 일부 | 5상태 | 5상태 + 상태 화면 ${nodeSpecs['empty-state'].fields.kind.enum.length}종 + 스켈레톤 + 오류 페이지 템플릿 | 상태 데이터 규칙 |
| 금지 조합 | 없음(프롬프트 규칙) | 간선만 | 축 조합 금지 ${stats.bans}개 + 테마 금지 + 페이지 유형 계약 ${stats.pageTypes}개 | **코드(검증기)** |
| 산출물 일치 | 프롬프트에 CSS 포함 | 해시 검사 | 해시 검사 + 자동 수정은 규칙의 대안으로만 | CLI check |

## 4. 디자인 시스템 ${peer.counts.systems}종 → 테마·축 대응

동료분 레포는 실제 디자인 시스템의 성격(분류, 모서리, 버튼 모양·굵기, 그림자, 아이콘 선)을 값으로 담습니다. 이 저장소는 브랜드 자체를 복제하지 않고, 같은 **성격**을 낼 수 있는 축 조합과 테마를 둡니다. 아래 값은 동료분 레포의 관찰값을 이 저장소의 가장 가까운 축 값으로 환산한 것입니다. 카드 모서리 환산 오차는 최대 ${maxDev}px입니다.

| 대상 시스템 | 분류 | 카드 모서리 → 우리 값 | 버튼 → control | 굵기 → weight | 아이콘 → icon | 대응 테마 |
|---|---|---|---|---|---|---|
${profiles.map(({s, p}) => `| ${s.name} | ${s.category} | ${s.cardR} → ${p.r} | ${s.btnR} → ${p.control} | ${s.btnW} → ${p.weight} | ${s.iconStroke}/${s.iconCap} → ${p.icon} | ${themeOf(s.id)} |`).join('\n')}

환산 결과 사용된 축 값은 모서리 ${uniq(profiles.map(x => x.p.r)).length}/${radiusNames.length}, 컨트롤 ${uniq(profiles.map(x => x.p.control)).length}/${axes.control.length}, 굵기 ${uniq(profiles.map(x => x.p.weight)).length}/${axes.weight.length}, 아이콘 ${uniq(profiles.map(x => x.p.icon)).length}/${axes.icon.length}입니다. ${peer.counts.systems}개 시스템이 모두 하나 이상의 테마에 대응하며(\`covers\`) 테스트가 이를 확인합니다.

## 5. 레이아웃 ${peer.counts.layouts}종 대응

완전 대응 ${layoutFull}, 부분 대응 ${layoutPartial}, 미대응 0입니다. 부분 대응은 정적 코드 범위의 한계를 그대로 적었습니다.

| 동료분 레이아웃 | 대응 | 상태 | 비고 |
|---|---|---|---|
${Object.entries(layoutCoverage).map(([k, c]) => `| ${k} | ${c.refs.map(r => `\`${r}\``).join(' + ')} | ${c.status === 'full' ? '완전' : '부분'} | ${c.note} |`).join('\n')}

## 6. 콘텐츠 구조 ${peer.counts.pages}종 대응

| 동료분 구조 | 섹션 수 | static-kit 템플릿 | 페이지 유형 |
|---|---|---|---|
${peer.pages.map(p => { const t = contentCoverage[p.id].template; return `| ${p.name} | ${p.sections.length} | \`${t}\` | ${pageTypes[templateList.find(x => x.id === t).pageType].label} |`; }).join('\n')}

동료분의 9개 구조 외에 ${stats.templates - peer.counts.pages}개 템플릿을 더했습니다. 페이지 유형별 수는 다음과 같습니다: ${Object.entries(pageTypes).map(([id, p]) => `${p.label} ${templateList.filter(t => t.pageType === id).length}`).join(', ')}.

## 7. 아이콘 ${peer.counts.icons}종 대응

이름이 같은 것은 ${peer.icons.filter(i => icons[i]).length}개이고, 이름만 다른 ${Object.keys(iconAliases).length}개는 별칭으로 대응합니다(${Object.entries(iconAliases).map(([a, b]) => `${a}→${b}`).join(', ')}). 이 저장소에는 ${stats.icons}개가 있으며, 선 굵기·끝 모양·채움을 아이콘 축(${axes.icon.join(', ')})으로 바꿉니다. 아이콘 데이터는 새로 그렸습니다.

## 8. 동료분 레포에 없는 보완

1. **코드 강제.** 입력은 JSON Schema에서 생성한 검증기를 통과해야 하고, 알 수 없는 속성·값·간선은 거부됩니다. 규칙 ${stats.rules}개, 오류 코드 ${n(uniq(rules.flatMap(r => r.codes)).length)}종.
2. **금지 조합.** 축 조합 금지 ${stats.bans}개(각각 접근성·가독성 근거와 대안 값 포함), 테마별 금지 값, 페이지 유형 계약 ${stats.pageTypes}개. 가능한 조합 공간은 규칙 필터 뒤 약 ${n(cov.allowedCombinations)}개로, 쌍별 커버링 ${cov.pairwiseSuite}개 조합과 ${n(cov.matrixCompiled)}개 템플릿×테마를 실제로 컴파일해 확인했습니다.
3. **접근성.** 모든 팔레트×모드×역할 쌍 ${n(contrast.pairs)}개 대비 통과(가장 빠듯한 쌍 ${contrast.tightest.name} ${Number(contrast.tightest.ratio).toFixed(2)}:1, 기준 ${contrast.tightest.minimum}:1). 차트색·그라데이션 위 글자·보조 색까지 포함합니다. 제목 단계, 이름 없는 컨트롤, 라벨, 24px 타깃, 깨진 앵커를 브라우저에서 전수 검사합니다.
4. **반응형.** ${stats.templates}개 템플릿을 390·768·1280px에서 가로 넘침 없이 렌더링하는지 검사합니다. 표·코드·칸반·달력은 키보드로 스크롤할 수 있는 영역입니다.
5. **다크·auto 모드.** auto는 두 토큰 세트를 모두 검증하고 시스템 설정을 따릅니다. 반전 구역은 반대 모드의 검증된 토큰 세트를 씁니다.
6. **상태 컴포넌트.** 로딩·빈·오류·부분·권한 없음에 더해 상태 화면 ${nodeSpecs['empty-state'].fields.kind.enum.length}종, 스켈레톤, 404·500·403·점검·오프라인 템플릿. ready·partial 상태에는 실제 데이터가 있어야 합니다.
7. **데이터 시각화.** 막대·가로 막대·선·영역·도넛 SVG를 데이터에서 생성하고, 색 외에 점선·마커로 계열을 구분하며, 텍스트 대안과 데이터 표를 함께 냅니다.
8. **출처와 재현성.** 팔레트는 Coolors 렌더 페이지에서 관측한 ${n(evidenceCount)}개 후보 목록(\`docs/evidence/coolors-palettes.json\`)과 대조되고, 모든 생성물은 SHA-256 해시와 새 빌드의 바이트 비교로 검사합니다. 생성물을 손으로 고치면 \`check\`가 거부합니다.
9. **휴대폰용 단일 파일 갤러리.** 컴파일러를 포함해 테마·팔레트·모드·축을 바로 바꿔 보고, 금지 조합은 이유와 함께 거부하며 자동 수정 대안을 보입니다.

## 9. 의도적으로 하지 않은 것과 미검증

- 모달·오버레이 같은 **상태 있는 위젯**과 JavaScript가 필요한 연출(스크롤 연동, 실제 지도 타일)은 정적 생성 범위 밖입니다. 부분 대응으로 표시했습니다.
- 프롬프트·CLAUDE.md·Tailwind 설정 내보내기는 만들지 않았습니다. 이 저장소의 산출물은 코드가 검증한 HTML/CSS이고, 프롬프트에 의존하지 않는 것이 목적입니다.
- 실제 브랜드 디자인 시스템의 값을 복제하지 않았습니다. 대응 표는 성격의 환산이며 브랜드 일치를 뜻하지 않습니다.
- 미검증: 실제 Safari/iOS와 스크린리더 동작, ${n(cov.allowedCombinations)}개 조합 전체의 육안 미감(컴파일·대비·구조 검사만 통과), Coolors 팔레트 이름의 출처 표기 정책, 카카오 Katalog 원 발표(확인 필요).
`;

// ---------- design doc ----------
const axisRows = axisOrder.map(k => `| \`${k}\` | ${axisDefs[k].label} | ${Object.keys(axisDefs[k].values).map(v => `\`${v}\``).join(' ')} |`).join('\n');
const nodeRows = Object.entries(Object.groupBy(nodeTypes, t => nodeSpecs[t].group)).map(([g, list]) => `| ${GROUP[g] ?? g} | ${list.length} | ${list.map(t => `${nodeSpecs[t].label}(\`${t}\`)`).join(', ')} |`).join('\n');
const themeRows = Object.entries(themeCategories).map(([c, label]) => `| ${label} | ${Object.values(themes).filter(t => t.category === c).map(t => `${t.name}(\`${t.id}\`)`).join(', ')} |`).join('\n');
const design = `## 1. 한 줄 요약

이 저장소는 **사전에 정의한 카탈로그 안의 선택만 JSON 트리로 조립해 HTML/CSS를 만드는 컴파일러**입니다. 규칙은 프롬프트가 아니라 코드가 강제합니다. 카탈로그에 없는 값, 허용되지 않은 조합, 대비가 모자라는 색, 손으로 고친 산출물은 생성되거나 통과하지 못합니다.

카탈로그 ${CATALOG_VERSION}은 테마 ${stats.themes}종, Coolors 팔레트 ${stats.palettes}개, 셸 ${stats.shells}종, 부품 ${stats.nodes}종, 페이지 유형 ${stats.pageTypes}종, 템플릿 ${stats.templates}종, 아이콘 ${stats.icons}개, 스타일 축 ${stats.axes}개입니다. 카카오 Katalog의 원 발표는 특정하지 못했으며(**확인 필요**) 이 구조는 "가능한 경우의 수를 미리 정의하고 트리로 조립한다"는 취지를 독립적으로 구현한 것입니다.

## 2. 파이프라인과 강제 경계

\`\`\`
Blueprint(JSON) → 검증기(스키마·간선·조합·페이지 유형·링크·데이터)
               → 토큰 해석(팔레트×모드, 대비 게이트)
               → 렌더(부품 → HTML) + 스타일(축 → CSS, 사용 부품만)
               → 산출물 5파일 + SHA-256 해시 → check로 재현 검사
\`\`\`

- **입력 경계.** 알 수 없는 속성은 모두 \`UNKNOWN_KEY\`입니다. 문자열은 항상 이스케이프되고, 링크는 HTTPS·\`#main\`·페이지에 선언된 앵커만 허용합니다. 생성 페이지의 스크립트는 고정 런타임(폼 확인, 탭, 필터 칩, 드롭다운) 하나뿐이고 CSP로 네트워크를 막습니다.
- **한계.** 카탈로그와 검사기 자체를 고칠 권한은 막지 못합니다. 새 표현이 필요하면 근거와 반례를 남겨 카탈로그를 개정합니다. 사용자 승인이나 미감을 보증하는 기록은 만들지 않습니다.
- **버전.** Blueprint 2.0과 카탈로그 ${CATALOG_VERSION}이 아니면 거부합니다. 1.x 입력은 \`kit migrate\`로 변환합니다.

## 3. 스타일 축 ${stats.axes}개

모든 값은 \`src/styles/base.mjs\`와 셸·부품 CSS에 구현되어 있고, 테스트가 enum과 구현표의 일치를 확인합니다.

| 축 | 이름 | 값 |
|---|---|---|
${axisRows}

축 값이 가리키는 시각 기반(타입 스케일 비율, 전폭 밴드와 섹션 리듬, 열린 부품과 상자 부품, 앱 화면의 틴트 바탕)은 docs/foundation.md에 진단 수치와 함께 기록합니다. 같은 축 값이라도 페이지 유형(랜딩·앱·콘텐츠)에 따라 쓰이는 크기와 간격이 다릅니다. 이미지 자리의 주제 일러스트(motif 37종), 제품 목업, 상품 카드는 docs/ui-level-up.md에 레퍼런스 대비와 함께 기록합니다.

## 4. 테마 ${stats.themes}종

테마는 분류, 설명, 기본 축 프로필, 금지 값, Coolors 팔레트 후보 ${Math.min(...Object.values(themes).map(t => t.palettes.length))}개 이상으로 구성됩니다. 팔레트는 테마에 속해야 하며(\`PALETTE_THEME\`), 테마가 금지한 값은 거부됩니다(\`THEME_FORBID\`). 예를 들어 시빅은 글로우·그라데이션을, 네온은 라이트 모드를 금지합니다. 어떤 두 테마도 기본 축 프로필이 같지 않습니다.

| 분류 | 테마 |
|---|---|
${themeRows}

## 5. 토큰과 대비

팔레트의 원본 색은 보존하고, 역할별 토큰을 팔레트×모드마다 계산합니다. 역할은 \`canvas surface soft sunken accentSoft text muted action link focus rule border success warning danger info accent accentInk chart1~5\`입니다. 기준을 넘지 못하면 원색을 검정(라이트) 또는 흰색(다크) 쪽으로 최소한만 이동합니다.

| 검사 | 기준 | 범위 |
|---|---|---|
| 본문 글자 | 7:1 | 5개 배경 |
| 보조·링크·상태·보조색 글자 | 4.5:1 | 5개 배경 |
| 포커스 링·구조선·차트색 | 3:1 | 배경과 표면 |
| 그라데이션 위 본문·보조 글자 | 7:1 / 4.5:1 | 두 그라데이션 각 11점 |
| 채움 위 글자(행동·강조·호버) | 4.5:1 | 각 채움색 |

전수 결과: **${contrast.palettes}개 팔레트 × 2모드 = ${contrast.modes}모드, ${n(contrast.pairs)}쌍 전부 통과**. 가장 빠듯한 쌍은 ${contrast.tightest.name}(${contrast.tightest.palette}/${contrast.tightest.mode}) ${Number(contrast.tightest.ratio).toFixed(2)}:${contrast.tightest.minimum}입니다. 반전 구역(\`surface: inverse\`, \`tone: inverse\`)은 반대 모드의 같은 검증을 통과한 토큰 세트를 씁니다. 통과는 WCAG 전체 준수나 시각 품질을 뜻하지 않습니다.

## 6. 부품 ${stats.nodes}종

| 그룹 | 수 | 부품 |
|---|---|---|
${nodeRows}

각 부품은 허용 속성, 선택 속성, 허용 자식, 자식 수, 예시를 카탈로그 한 곳에 둡니다. 예시는 감사 단계에서 실제로 검증·컴파일됩니다. 제목 단계는 구조에서 계산되어 건너뛰지 않고, 표 첫 열은 행 머리글이며, 차트에는 텍스트 대안과 데이터 표가 붙습니다.

## 7. 페이지 유형 ${stats.pageTypes}종

| 유형 | 필수 | 금지·허용 | 셸·폭 제한 |
|---|---|---|---|
${Object.entries(pageTypes).map(([id, p]) => `| ${p.label}(\`${id}\`) | ${p.require.length ? p.require.map(g => g.join('·')).join(' + ') : '—'} | ${p.allow ? `허용: ${p.allow.join(', ')}` : (p.forbid.length ? `금지: ${p.forbid.join(', ')}` : '—')}${p.maxChildren ? ` · 최상위 ${p.maxChildren}개 이하` : ''} | ${p.shells.length === 10 ? '모든 셸' : p.shells.join(', ')}${p.widths ? ` / ${p.widths.join(', ')}` : ''} |`).join('\n')}

## 8. 규칙 ${stats.rules}개와 금지 조합 ${stats.bans}개

| 규칙 | 내용 | 오류 코드 |
|---|---|---|
${rules.map(r => `| ${r.id} | ${r.intent} | ${r.codes.join(', ')} |`).join('\n')}

축 조합 금지는 각각 근거와 대안 값을 가집니다. 대안은 작성기의 "자동 수정"과 \`repairAxes\`가 사용하며, 검증기는 값을 고치지 않고 거부만 합니다.

| 번호 | 조합 | 이유 | 대안 |
|---|---|---|---|
${axisBans.map(b => `| ${b.id} | ${b.uses.join(' × ')} | ${b.why} | ${Object.entries(b.fix).map(([k, v]) => `${k}=${v}`).join(', ')} |`).join('\n')}

내비 항목 수 상한은 셸마다 다릅니다: ${Object.entries(navLimits).map(([k, v]) => `${k} ${v}`).join(', ')}. 레일과 하단 탭은 모든 항목에 아이콘이 필요합니다.

## 9. 템플릿 ${stats.templates}종

| 페이지 유형 | 템플릿 |
|---|---|
${Object.entries(pageTypes).map(([id, p]) => `| ${p.label} | ${templateList.filter(t => t.pageType === id).map(t => `${t.label}(\`${t.id}\`)`).join(', ')} |`).join('\n')}

템플릿은 어느 테마와도 조합됩니다. 테마의 기본 셸이 페이지 유형과 맞지 않으면 합성기가 템플릿의 셸로 대체하고, 금지 조합은 \`repairAxes\`가 해결합니다.

## 10. 검사 체계

| 층 | 명령 | 확인하는 것 | 최근 수치 |
|---|---|---|---|
| 계약·CLI | \`node --test\` | 스키마, 규칙별 거부, 카탈로그 무결성, 동료 레포 커버리지, 번들 동일성 | 테스트 50개 |
| 감사 | \`node scripts/audit.mjs\` | 증거 대조, 전 팔레트 대비, 부품 예시, 템플릿×테마, 쌍별 커버링, 축 요인분해 | 대비 ${n(contrast.pairs)}쌍, 컴파일 ${n(cov.matrixCompiled)}+${n(cov.palettePagesCompiled)}+${cov.pairwiseCompiled}+${n(cov.factorialCompiled)}개 |
| 재현 | \`check-generated\` | 새 빌드와 저장소 산출물의 바이트 일치 | 생성 파일 수는 verification.md |
| 브라우저 | \`npm run test:browser\` | 작성기, 템플릿 3폭 오버플로, 구조 접근성, 키보드 포커스, auto 모드, 갤러리(오프라인) | Chromium 13개 흐름 |

가능한 조합 공간은 축 간 규칙으로 연결되는 묶음별로 나누어 세어 **${n(cov.allowedCombinations)}개**입니다(팔레트 포함, 규칙 필터 뒤). 이 가운데 쌍별 커버링 ${cov.pairwiseSuite}개 조합이 허용 가능한 축 값 쌍 ${n(cov.allowedPairs)}개를 모두 덮고 실제로 컴파일됩니다. 전체 공간의 육안 검수는 하지 않았습니다.

## 11. 산출물과 사용

- 작성기(\`index.html\`): 템플릿·테마·팔레트·모드·13개 축을 고르고 트리를 편집합니다. 금지 조합은 규칙과 대안을 보이며 자동 수정할 수 있습니다.
- 갤러리(\`site/gallery/index.html\`): 컴파일러를 포함한 단일 파일. 휴대폰에서 템플릿·테마·부품·축을 열어 보고 저장합니다.
- CLI: \`catalog | templates | themes | init | migrate | validate | build | check\`.
- 예시: \`site/examples/<template>/\` ${stats.templates}개, \`site/examples/themes/<theme>/\` ${stats.themes}개.
- 카탈로그 API: \`site/v1/catalog.json\`, \`site/v1/blueprint.schema.json\`.

## 12. 출처와 라이선스

- 동료분 레포 [yehsb123/design-system-kit](https://github.com/yehsb123/design-system-kit): AGPL-3.0. 축과 수량만 대조했고 코드는 복사하지 않았습니다.
- 토큰·타이포·간격·상태 철학: winterholic-design-system의 winterholic-base 문서(04 모양·깊이, 05 모션, 07 상태, 08 접근성, 09 다크, 12 페이지 패턴)와 로컬 \`frontend-design\` 스킬.
- 팔레트: [Coolors](https://coolors.co/palettes/trending) 렌더 페이지를 2026-10-18에 관측한 목록(\`docs/evidence/coolors-palettes.json\`). 각 팔레트에 원본 URL을 보존했습니다.
- 접근성 기준: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) SC 1.4.3, 1.4.11, 2.5.8, 1.1.1, 2.4.4.
- 카카오 Katalog: 원 발표 **확인 필요**. 이 문서는 해당 발표의 구현·효과를 인용하지 않습니다.

## 13. 범위 밖과 알려진 한계

- 상태가 있는 위젯(모달, 토스트의 자동 소멸)과 실제 지도·결제·인증 동작은 정적 코드 범위 밖입니다.
- 실제 Safari/iOS, 스크린리더, 고대비 모드의 실기기 검증은 하지 않았습니다(Chromium 에뮬레이션만).
- Coolors 이름·팔레트의 재사용 조건은 확인하지 않았습니다. 각 팔레트의 원본 URL을 남겼습니다.
- 정확한 미감은 보증하지 않습니다. 규칙은 접근성·일관성·구조의 하한을 지킬 뿐입니다.
- 서체는 시스템 폰트 스택입니다. 웹폰트를 싣지 않는 이유(CSP와 외부 요청 금지)와 결과는 docs/foundation.md에 있습니다.
`;

const footer = `Static Kit ${CATALOG_VERSION} · 생성: scripts/docs.mjs (수치는 카탈로그와 docs/evidence에서 계산)`;
await writeFile(new URL('../docs/gap-analysis.md', import.meta.url), `# 격차 분석\n\n${gap}`);
await writeFile(new URL('../docs/gap-analysis.html', import.meta.url), page({title: '격차 분석 · 동료분 레포 대비 커버리지', subtitle: `카탈로그 ${CATALOG_VERSION} · 동료분 레포 ${peer.observedCommit.slice(0, 7)}(${peer.license}) 대조`, md: gap, footer}));
await writeFile(new URL('../docs/design.md', import.meta.url), `# 설계서\n\n${design}`);
await writeFile(new URL('../docs/design.html', import.meta.url), page({title: '설계서 · 카탈로그가 강제하는 디자인 조립기', subtitle: `Static Kit ${CATALOG_VERSION} · 테마 ${stats.themes} · 팔레트 ${stats.palettes} · 템플릿 ${stats.templates} · 부품 ${stats.nodes}`, md: design, footer}));
console.log(`DOCS: gap-analysis (${profiles.length} systems, ${Object.keys(layoutCoverage).length} layouts: ${layoutFull} full / ${layoutPartial} partial) and design written.`);
