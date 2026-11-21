import Link from 'next/link';
import {catalogSnapshot, getComponentSpec, getSchema, listCatalog} from '@winterholic/design-system-static-kit/service';
import type {ReactNode} from 'react';

const hrefFor = (slug: string) => `/docs/${slug}`;
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
    <ul><li><Link href={hrefFor('blueprint')}>Blueprint 구조와 스키마</Link></li><li><Link href={hrefFor('components')}>Core 부품 명세</Link></li><li><Link href={hrefFor('cli')}>CLI 상세</Link></li></ul>
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

function CliGuide() {
  const snapshot = catalogSnapshot();
  const supported = snapshot.supportedCatalogVersions ?? [snapshot.version];
  const supports25 = supported.includes('2.5.0');
  return <div className="prose">
    <p>CLI는 Node.js 22를 우선 지원하며 REST·MCP와 마찬가지로 공개 Core 서비스의 검증·컴파일 로직을 사용합니다.</p>
    <Code>{`npm run kit -- templates
npm run kit -- init saas-landing ./my-blueprint.json
npm run kit -- validate ./my-blueprint.json
npm run kit -- build ./my-blueprint.json --out ./my-build
npm run kit -- check ./my-build`}</Code>
    <ul><li><code>init</code>: Blueprint 파일을 새로 만듭니다. 이미 있는 파일을 덮어쓰지 않습니다.</li><li><code>validate</code>: 구조와 규칙을 검사하고 통과하면 <code>VALID</code>를 출력합니다.</li><li><code>build</code>: 관리 출력 파일을 생성합니다.</li><li><code>check</code>: 수정·누락·추가 파일을 재컴파일 결과와 대조합니다.</li></ul>
    {supports25 ? <><p>새 2.5.0 필드를 사용할 때만 명시적으로 마이그레이션합니다. 기본 <code>init</code>과 기본 <code>migrate</code>는 2.4.0을 유지합니다.</p><Code>{'npm run kit -- migrate ./my-blueprint.json ./my-blueprint-v2.5.json --to 2.5.0'}</Code></> : null}
    <p><Link href="/integrations/cli">CLI 연동 안내</Link>에서 설치와 자동화 환경을 확인하세요.</p>
  </div>;
}

function RestGuide() {
  return <div className="prose">
    <p>REST 어댑터는 Core 공개 서비스 결과를 HTTP 경로로 전달합니다. 구현 후보의 명세는 OpenAPI와 요청·오류 계약을 기준으로 확인합니다.</p>
    <ul><li><code>GET /api/v1/catalog</code>: 카탈로그 일부 조회</li><li><code>GET /api/v1/schema</code>: Blueprint JSON Schema 조회</li><li><code>POST /api/v1/validate</code>: Blueprint 검사</li><li><code>POST /api/v1/compile</code>: Blueprint 컴파일</li></ul>
    <p>REST 요청 예제와 정확한 응답 계약은 담당 <Link href="/integrations/rest-api">REST API 연동 문서</Link>를 확인하세요. 그 문서의 예제 실행은 이 Docs 작업의 CLI 실행 결과와 별도로 판정합니다.</p>
  </div>;
}

function McpGuide() {
  return <div className="prose">
    <p>MCP 서버는 Streamable HTTP 도구로 같은 Core 조회·검증·컴파일 함수를 제공합니다. 클라이언트는 보통 카탈로그 조회, 스키마 조회, 검증, 컴파일 순으로 호출합니다.</p>
    <ul><li><code>list_design_system</code></li><li><code>get_design_schema</code></li><li><code>get_component_spec</code></li><li><code>validate_blueprint</code></li><li><code>compile_design</code></li><li><code>explain_design_decisions</code></li></ul>
    <p>프로토콜 SDK 예제와 전송별 한계는 담당 <Link href="/integrations/mcp">MCP 연동 문서</Link>에서 확인하세요. 후보 구현의 테스트 통과는 최종 통합 서버의 원격 연결 확인과 다릅니다.</p>
  </div>;
}

function Limitations() {
  const snapshot = catalogSnapshot();
  return <div className="prose">
    <ul>
      <li>카탈로그 규칙 밖의 임의 HTML·CSS·스크립트는 Blueprint로 입력하지 않습니다.</li>
      <li>폼은 입력 확인 데모이며 데이터 저장을 제공하지 않습니다.</li>
      <li>검사기는 Blueprint의 규약 준수를 확인하지만 상위 앱이 전역 CSS로 결과를 덮는 일을 막지 못합니다. 독립 HTML 또는 격리된 iframe으로 사용하세요.</li>
      <li>현재 Core 카탈로그 버전은 <code>{snapshot.version}</code>이며 지원 버전은 <code>{(snapshot.supportedCatalogVersions ?? [snapshot.version]).join(', ')}</code>입니다.</li>
      <li>REST 호출 제한과 MCP 접근 제어는 배포 환경 설정의 영향을 받습니다. 상세 내용은 <Link href="/integrations/rest-api">REST</Link> 및 <Link href="/integrations/mcp">MCP</Link> 문서를 확인하세요.</li>
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
  cli: CliGuide,
  rest: RestGuide,
  mcp: McpGuide,
  limitations: Limitations,
};

export function DocContent({slug}: {slug: string}) {
  const Component = content[slug];
  return Component ? <Component /> : null;
}
