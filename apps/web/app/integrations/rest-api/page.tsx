import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {ButtonLink} from '@/ui';

export const metadata = {title: 'REST API 연동'};

export default function Page() {
  return (
    <PageShell eyebrow="Integrations" title="REST API v1" lead="JSON HTTP API로 카탈로그 일부를 읽고 Blueprint를 검증·컴파일합니다. API 정의는 실행 코드와 서비스 스키마에서 생성됩니다.">
      <article className="prose">
        <h2 className="section-title">카탈로그 탐색</h2>
        <p>한 종류씩 요청하고 필터, 필드, 페이지 크기로 응답을 좁힙니다. 다음 페이지가 있으면 <code>nextCursor</code>를 그대로 전달합니다.</p>
        <pre tabIndex={0}><code>{`curl 'http://localhost:3000/api/v1/catalog?kind=templates&filter.pageType=landing&fields=id,theme&limit=3'
curl 'http://localhost:3000/api/v1/schema?target=blueprint&fields=tree'
curl 'http://localhost:3000/api/v1/components/hero?fields=required,children'`}</code></pre>
        <h2 className="section-title">검증과 컴파일</h2>
        <p>검증과 컴파일은 Blueprint 전체를 JSON으로 보냅니다. 컴파일 응답의 <code>include</code>와 <code>html</code> 옵션으로 큰 본문을 생략하거나 필요한 부분만 선택하세요.</p>
        <pre tabIndex={0}><code>{`node -e "const fs=require('node:fs'); const blueprint=JSON.parse(fs.readFileSync('site/examples/saas-landing/blueprint.json')); fs.writeFileSync('request.json', JSON.stringify({blueprint}));"
curl -X POST 'http://localhost:3000/api/v1/validate' \\
  -H 'content-type: application/json' \\
  --data-binary @request.json

node -e "const fs=require('node:fs'); const blueprint=JSON.parse(fs.readFileSync('site/examples/saas-landing/blueprint.json')); fs.writeFileSync('compile-request.json', JSON.stringify({blueprint, include:['html','manifest'], html:'summary'}));"
curl -X POST 'http://localhost:3000/api/v1/compile' \\
  -H 'content-type: application/json' \\
  --data-binary @compile-request.json`}</code></pre>
        <p>오류 응답도 <code>catalogVersion</code>과 <code>contractVersion</code>을 포함합니다. 입력 형식 오류는 400, 규칙 위반은 422, 없는 부품 명세는 404, 크기 제한은 413, 요청 제한은 429입니다. 각 오류는 <code>code</code>, <code>path</code>, <code>message</code>, <code>hint</code>를 갖습니다.</p>
        <h2 className="section-title">API 명세</h2>
        <p><a href="/api/v1/openapi.json">OpenAPI 3.1 JSON</a>은 작업 목록과 서비스 JSON Schema에서 요청마다 결정적으로 생성됩니다. GET 성공 응답은 ETag와 캐시 지시자를 보내며, POST 응답과 실패 응답은 캐시하지 않습니다.</p>
        <p><Link href="/integrations/mcp">MCP</Link>는 같은 서비스 계약을 에이전트 도구로 제공합니다.</p>
      </article>
      <p><ButtonLink href="/integrations" variant="quiet">연동 목록으로</ButtonLink></p>
    </PageShell>
  );
}
