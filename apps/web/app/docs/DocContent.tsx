import Link from 'next/link';
import {catalogSnapshot, getComponentSpec, getSchema, listCatalog} from '@winterholic/design-system-static-kit/service';
import type {ReactNode} from 'react';
import {DOCS_PAGES} from '@/lib/docs.mjs';
import styles from './docs.module.css';

const hrefFor = (slug: string) => DOCS_PAGES.find(page => page.slug === slug)?.href ?? '/docs';
const Code = ({children}: {children: ReactNode}) => <pre tabIndex={0}><code>{children}</code></pre>;
const Note = ({children}: {children: ReactNode}) => <p className="note">{children}</p>;

function GettingStarted() {
  return <div className="prose">
    <h2 className="section-title">5분 안에 첫 결과 만들기</h2>
    <p>저장소 루트에서 Node.js 22를 사용합니다. 먼저 사용 가능한 템플릿을 확인하고, 예제 프로젝트를 만들어 검사한 뒤 관리되는 HTML을 빌드합니다.</p>
    <Code>{`npm run kit -- templates
npm run kit -- init saas-landing ./my-blueprint.json
npm run kit -- validate ./my-blueprint.json
npm run kit -- build ./my-blueprint.json --out ./my-build
npm run kit -- check ./my-build`}</Code>
    <p><code>init</code>은 기본 카탈로그 2.4.0을 사용합니다. 출력 폴더는 도구가 소유해야 하며, <code>check</code>는 현재 카탈로그로 다시 컴파일해 파일을 대조합니다.</p>
    <p>실제 생성 예제도 열어볼 수 있습니다: <Link href="/examples/saas-landing/">SaaS 랜딩 예제</Link>.</p>
    <h2 className="section-title">다음 단계</h2>
    <ul><li><Link href={hrefFor('blueprint')}>Blueprint 구조와 스키마</Link></li><li><Link href={hrefFor('components')}>Core 부품 명세</Link></li><li><Link href={hrefFor('principles')}>규약과 검증</Link></li><li><Link href="/docs/integrations/cli">CLI 상세</Link></li></ul>
  </div>;
}

function BlueprintGuide() {
  const result = getSchema({target: 'blueprint'});
  const schema = result.ok ? result.value : null;
  const required = Array.isArray(schema?.required) ? schema.required.join(', ') : 'Core 스키마를 확인하세요';
  return <div className="prose">
    <h2 className="section-title">문서의 모양</h2>
    <p>Blueprint는 페이지 축, 카탈로그 버전, 테마 선택, 콘텐츠 트리를 담는 JSON입니다. 필드와 enum은 공개 Core 서비스가 내는 JSON Schema를 따르며, 축 조합과 페이지 규칙은 별도 런타임 검증기가 판정합니다.</p>
    <p>현재 Core 카탈로그는 <code>{catalogSnapshot().version}</code>이고 Blueprint 최상위 필수 필드는 <code>{required}</code>입니다.</p>
    <Code>{`{
  "catalogVersion": "2.4.0",
  "template": "saas-landing",
  "tree": { "type": "page", "children": [] }
}`}</Code>
    <Note>위 JSON은 문법 모양을 설명하는 축약 예시입니다. 실제로 실행할 Blueprint는 CLI의 <code>init</code>으로 생성하고 검증하세요.</Note>
    <p>새 필드·enum을 명시하는 Blueprint는 해당 카탈로그 버전으로 올린 뒤 검사해야 합니다. 2.4.0 기본 동작은 유지되고 2.5.0은 Core가 지원한다고 응답할 때만 opt-in 대상으로 안내합니다.</p>
    <p><Link href={hrefFor('components')}>부품 필드 확인</Link> · <Link href={hrefFor('composition')}>조합 규칙 확인</Link></p>
  </div>;
}

function ComponentsGuide() {
  const result = listCatalog({kind: 'components', limit: 200});
  const items: Array<{type: string; label: string; group: string}> = result.ok ? result.value.items : [];
  const selected = items;
  const sample = getComponentSpec({type: 'page-header'});
  const spec = sample.ok ? sample.value : null;
  return <div className="prose">
    <p>아래 목록과 예시는 빌드 시 고정한 문서가 아니라 현재 실행 중인 Core의 <code>listCatalog</code>와 <code>getComponentSpec</code> 결과입니다. 전체 부품은 <Link href="/components">Components 카탈로그</Link>에서 찾아보세요.</p>
    <p>카탈로그 <code>{result.catalogVersion}</code> · 부품 {result.ok ? result.value.total : 0}종</p>
    <ul>{selected.map(item => <li key={item.type}><code>{item.type}</code> — {item.label} ({item.group})</li>)}</ul>
    <h2 className="section-title">명세 예시: page-header</h2>
    {spec ? <><p>필수 필드: <code>{spec.fields?.required?.join(', ') || 'Core 명세 참조'}</code></p><p>허용 자식: <code>{spec.children?.allowed?.join(', ') || '없음'}</code></p></> : <Note>현재 Core가 page-header 명세를 반환하지 않았습니다.</Note>}
    <p>스키마와 교차 필드 규칙을 함께 사용하세요. JSON Schema만으로 카탈로그 버전·페이지 구성 규칙을 모두 판정할 수는 없습니다.</p>
  </div>;
}

function CompositionGuide() {
  const rules = listCatalog({kind: 'rules', limit: 200});
  const bans = listCatalog({kind: 'axisBans', limit: 200});
  const templates = listCatalog({kind: 'templates', limit: 1});
  const template = templates.ok ? templates.value.items[0]?.id : undefined;
  const slots = template ? listCatalog({kind: 'layoutSlots', filter: {template}, limit: 200}) : null;
  const ruleItems: Array<{id: string; intent: string}> = rules.ok ? rules.value.items : [];
  const banItems: Array<{id: string; why: string; fix: Record<string, string>}> = bans.ok ? bans.value.items : [];
  const slotItems: Array<{id: string; label: string; optionIds: string[]}> = slots?.ok ? slots.value.items : [];
  return <div className="prose">
    <p>페이지는 정해진 루트와 자식 규약을 따릅니다. 레이아웃이 허용하는 부품과 템플릿 슬롯은 Core에서 조회하고, 서비스 검증은 경로·규칙 코드·수정 힌트를 반환합니다.</p>
    <p>현재 Core에서 읽은 조합 규칙 {ruleItems.length}개, 축 금지 조합 {banItems.length}개입니다.</p>
    <h2 className="section-title">규칙 예시</h2>
    <ul>{ruleItems.map(item => <li key={item.id}><code>{item.id}</code> — {item.intent}</li>)}</ul>
    <h2 className="section-title">축 조합 제한</h2>
    <ul>{banItems.map(item => <li key={item.id}><code>{item.id}</code> — {item.why} 대안: <code>{JSON.stringify(item.fix)}</code></li>)}</ul>
    <h2 className="section-title">템플릿 슬롯 예시</h2>
    <p><code>{template ?? '템플릿 없음'}</code> 템플릿 슬롯을 현재 Core에서 조회했습니다.</p>
    <ul>{slotItems.map(slot => <li key={slot.id}><strong>{slot.label}</strong> <code>{slot.id}</code>: {slot.optionIds.join(', ')}</li>)}</ul>
    <p>막히면 <code>validate</code> 결과의 첫 <code>path</code>, <code>code</code>, <code>hint</code>를 보고 JSON의 해당 위치를 고친 다음 다시 검사합니다. 입력을 자동 보정하지 않습니다.</p>
  </div>;
}

function TokensGuide() {
  const result = listCatalog({kind: 'themes', limit: 200, fields: ['id', 'name', 'category', 'description', 'palettes']});
  const paletteResult = listCatalog({kind: 'palettes', limit: 24, fields: ['id', 'name', 'theme', 'family', 'tone']});
  const themes: Array<{id: string; name: string; category: string; description: string; palettes: string[]}> = result.ok ? result.value.items : [];
  const palettes: Array<{id: string; name: string; theme: string; family: string; tone: string}> = paletteResult.ok ? paletteResult.value.items : [];
  const snapshot = catalogSnapshot();
  const supported = snapshot.supportedCatalogVersions ?? [snapshot.version];
  const has25 = supported.includes('2.5.0');
  return <div className="prose">
    <p>테마와 팔레트는 공개 Core 카탈로그에서 가져옵니다. 현재 카탈로그 <code>{snapshot.version}</code> · 테마 {themes.length}개입니다.</p>
    <ul>{themes.map(theme => <li key={theme.id}><strong>{theme.name}</strong> <code>{theme.id}</code> — {theme.description} 팔레트: {theme.palettes?.join(', ')}</li>)}</ul>
    <h2 className="section-title">팔레트 카탈로그</h2>
    <p>전체 {paletteResult.ok ? paletteResult.value.total : 0}개 중 첫 {palettes.length}개를 표시합니다.</p>
    <ul>{palettes.map(palette => <li key={palette.id}><code>{palette.id}</code> — {palette.name} · 테마 {palette.theme} · {palette.family}/{palette.tone}</li>)}</ul>
    <h2 className="section-title">버전 선택</h2>
    <p>2.4.0은 새 문서와 템플릿 생성의 기본입니다. 사용하지 않은 새 필드만으로 기존 출력 계약을 바꾸지 않습니다.</p>
    {has25
      ? <><Note>이 Core는 2.5.0을 지원합니다. 기존 2.4.0 Blueprint는 <code>kit migrate --to 2.5.0</code>으로 명시적으로 올려야 새 표현력 필드를 쓸 수 있습니다. 기본 생성은 계속 2.4.0입니다.</Note><Code>{'npm run kit -- migrate ./my-blueprint.json ./my-blueprint-v2.5.json --to 2.5.0\nnpm run kit -- validate ./my-blueprint-v2.5.json\nnpm run kit -- build ./my-blueprint-v2.5.json --out ./my-output-v2.5'}</Code></>
      : <Note>현재 Core가 보고한 지원 버전: {supported.join(', ')}. 2.5.0은 Core가 지원 목록에 포함한 뒤 명시 선택할 수 있으며, 기본 생성 버전으로 승격되지 않습니다.</Note>}
    <p>지원 버전: <code>{supported.join(', ')}</code></p>
  </div>;
}

function Principles() {
  return <>
    <div className="prose"><p>이 도구는 설명이 아니라 코드로 결과를 지킵니다. 메인 화면에서는 보이지 않지만, 아래 네 가지가 모든 결과의 바탕입니다.</p></div>
    <dl className={styles.rules}>
      <div><dt>허용된 값만</dt><dd>알 수 없는 속성, <code>style</code>·<code>className</code>, 임의 토큰 값, 잘못된 부모-자식 조합, 금지된 축 조합은 조용히 버려지지 않고 오류로 거부됩니다.</dd></div>
      <div><dt>대비 검사</dt><dd>컴파일할 때 색 조합의 대비를 모두 계산하고, 기준에 못 미치면 결과를 만들지 않습니다.</dd></div>
      <div><dt>맥락 규칙</dt><dd>페이지 유형이 필수·금지 부품을 정하고, 부품의 배치와 크기는 규칙표가 정합니다. 어떤 규칙이 이겼는지는 결과의 기록에 남습니다.</dd></div>
      <div><dt>같은 입력, 같은 출력</dt><dd>시간·난수·환경에 기대지 않아 결과를 바이트 단위로 다시 만들고 비교할 수 있습니다.</dd></div>
    </dl>
    <div className="prose">
      <h2 className="section-title">같은 검증을 어느 길로든</h2>
      <p>CLI, REST API, MCP는 같은 검증·컴파일 함수를 부릅니다. 어느 길로 들어와도 같은 오류와 같은 결과를 받습니다.</p>
      <Code>{`npm run kit -- init saas-landing my.json trust
npm run kit -- validate my.json
npm run kit -- build my.json --out out/my-page`}</Code>
      <p><Link href="/docs/integrations">연동 안내 보기</Link> · <Link href={hrefFor('composition')}>조합 규칙 보기</Link> · <Link href={hrefFor('limitations')}>한계</Link></p>
    </div>
  </>;
}

function Limitations() {
  const snapshot = catalogSnapshot();
  return <div className="prose">
    <ul>
      <li>카탈로그 규칙 밖의 임의 HTML·CSS·스크립트는 Blueprint로 입력하지 않습니다.</li>
      <li>폼은 입력 확인 데모이며 데이터 저장을 제공하지 않습니다.</li>
      <li>검사기는 Blueprint의 규약 준수를 확인하지만 상위 앱이 전역 CSS로 결과를 덮는 일을 막지 못합니다. 독립 HTML 또는 격리된 iframe으로 사용하세요.</li>
      <li>현재 Core 카탈로그 버전은 <code>{snapshot.version}</code>이며 지원 버전은 <code>{(snapshot.supportedCatalogVersions ?? [snapshot.version]).join(', ')}</code>입니다.</li>
      <li>REST 호출 제한과 MCP 접근 제어는 배포 환경 설정의 영향을 받습니다. 상세 내용은 <Link href="/docs/integrations/rest-api">REST</Link> 및 <Link href="/docs/integrations/mcp">MCP</Link> 문서를 확인하세요.</li>
    </ul>
    <p>개발 전용 실험·진단 경로는 공개 문서에 포함하지 않습니다.</p>
  </div>;
}

const content: Record<string, () => ReactNode> = {
  'getting-started': GettingStarted,
  blueprint: BlueprintGuide,
  components: ComponentsGuide,
  composition: CompositionGuide,
  'tokens-themes': TokensGuide,
  principles: Principles,
  limitations: Limitations,
};

export function DocContent({slug}: {slug: string}) {
  const Component = content[slug];
  return Component ? <Component /> : null;
}
