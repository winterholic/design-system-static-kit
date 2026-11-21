import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'MCP 연동'};

export default function Page() {
  return (
    <PageShell eyebrow="Integrations" title="MCP · Streamable HTTP" lead="MCP 클라이언트에서 엔드포인트를 등록하고, 목록과 스키마를 살펴본 뒤 검증·컴파일 도구를 호출합니다.">
      <article className="prose">
        <h2 className="section-title">연결</h2>
        <p>엔드포인트는 <code>http://localhost:3000/api/mcp</code>입니다. 클라이언트가 원격 Streamable HTTP 연결을 지원하면 이 URL을 서버 주소로 등록합니다. 클라이언트별 설정 파일 형식은 제품마다 다르므로 그 클라이언트의 HTTP MCP 설정란에 URL을 입력하세요.</p>
        <p>Node.js 22에서 공식 TypeScript 클라이언트를 실행하는 예입니다. 별도 프로젝트에서는 <code>npm install @modelcontextprotocol/client@2.4.0</code> 후 아래 코드를 <code>mcp-example.mjs</code>로 저장해 <code>node mcp-example.mjs</code>로 실행하세요. 이 저장소에서는 같은 패키지가 이미 설치되어 있습니다.</p>
        <pre tabIndex={0}><code>{`import {Client, StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

const client = new Client({name: 'static-kit-example', version: '1.0.0'});
await client.connect(
  new StreamableHTTPClientTransport(new URL('http://localhost:3000/api/mcp')),
);
try {
  const {tools} = await client.listTools();
  console.log(tools.map(({name}) => name));
  const result = await client.callTool({
    name: 'list_design_system',
    arguments: {kind: 'templates', filter: {pageType: 'landing'}, fields: ['id', 'theme'], limit: 5},
  });
  if (result.isError) console.error(result.structuredContent?.errors);
  else console.log(result.structuredContent?.value);
} finally {
  await client.close();
}`}</code></pre>
        <h2 className="section-title">권장 흐름</h2>
        <ol>
          <li><code>list_design_system</code>으로 필요한 종류만 필터링하고 <code>limit</code>과 <code>cursor</code>로 나눠 읽습니다.</li>
          <li><code>get_design_schema</code> 또는 <code>get_component_spec</code>으로 작성할 Blueprint의 필드와 규칙을 확인합니다.</li>
          <li><code>validate_blueprint</code>가 실패하면 오류의 <code>path</code>, <code>hint</code>, 선택적인 <code>fix</code>를 보고 입력만 고친 뒤 다시 검증합니다.</li>
          <li><code>compile_design</code>은 기본 요약을 사용하고, HTML 본문이 필요할 때 <code>html: "full"</code>과 필요한 <code>include</code>를 지정합니다.</li>
          <li><code>explain_design_decisions</code>는 컴파일 manifest 또는 Blueprint의 결정 근거를 읽습니다.</li>
        </ol>
        <p>도구는 여섯 개이며 모두 공통 서비스 계층의 함수 하나에 연결됩니다. 실패도 JSON 봉투로 반환하고 프로토콜의 도구 결과에서 <code>isError</code>가 참입니다. 알 수 없는 인자는 <code>BAD_REQUEST</code>로 거부합니다. HTML·CSS·스크립트·임의 URL 실행 기능은 제공하지 않습니다.</p>
        <p>Streamable HTTP 서버는 상태 없는 단일 Next Route Handler입니다. MCP의 2026-07-28 stateless 흐름과 2025-era Streamable HTTP 클라이언트를 같은 엔드포인트가 받습니다. 배포 함수의 상한은 30초이며 도구 호출은 결과 반환 후 10초 상한을 확인합니다.</p>
        <p><Link href="/integrations/rest-api">REST API</Link>에는 같은 카탈로그와 OpenAPI 명세가 있습니다.</p>
      </article>
      <p><Link href="/integrations" className="btn btn-quiet">연동 목록으로</Link></p>
    </PageShell>
  );
}
