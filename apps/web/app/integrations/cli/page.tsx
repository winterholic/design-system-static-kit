import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {ButtonLink} from '@/ui';

export const metadata = {title: 'CLI 연동'};

export default function Page() {
  return (
    <PageShell eyebrow="Integrations" title="CLI" lead="저장소에서 템플릿을 고르고 Blueprint JSON을 검증한 뒤, 같은 Core 컴파일러로 파일을 만듭니다.">
      <article className="prose">
        <h2 className="section-title">시작하기</h2>
        <p>저장소 루트에서 카탈로그를 살펴보고, 선택한 템플릿으로 입력 파일을 만듭니다.</p>
        <pre tabIndex={0}><code>{`npm run kit -- templates
npm run kit -- themes
npm run kit -- init saas-landing my-blueprint.json civic`}</code></pre>
        <p>유효성을 확인한 다음 관리 디렉터리에 빌드합니다. 검증 오류가 있으면 경로와 규칙 코드, 수정 안내가 출력되며 파일은 생성되지 않습니다.</p>
        <pre tabIndex={0}><code>{`npm run kit -- validate my-blueprint.json
npm run kit -- build my-blueprint.json --out ./dist/my-site
npm run kit -- check ./dist/my-site`}</code></pre>
        <h2 className="section-title">결과와 오류</h2>
        <p><code>build</code> 출력은 <code>index.html</code>, <code>tokens.css</code>, <code>tokens.json</code>, <code>blueprint.json</code>, <code>manifest.json</code>입니다. 다른 채널과 마찬가지로 검증 코드와 입력 경로를 보존합니다. 사람이 읽는 CLI 오류는 표준 오류로, 자동화 결과는 종료 코드로 판별하세요.</p>
        <p><Link href="/integrations/rest-api">HTTP 자동화에는 REST API</Link>, 에이전트 도구 연결에는 <Link href="/integrations/mcp">MCP</Link>를 사용하세요.</p>
      </article>
      <p><ButtonLink href="/integrations" variant="quiet">연동 목록으로</ButtonLink></p>
    </PageShell>
  );
}
