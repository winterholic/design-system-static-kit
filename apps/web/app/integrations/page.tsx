import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'Integrations'};

export default function IntegrationsPage() {
  return (
    <PageShell eyebrow="Integrations" title="연동" lead="CLI, REST API, MCP가 같은 카탈로그와 검증·컴파일 서비스를 사용합니다. 필요한 방식의 실행 예제와 입력·오류 규칙을 확인하세요.">
      <ul className="link-list">
        <li><Link href="/integrations/cli">CLI</Link><span>터미널과 CI에서 Blueprint를 검증하고 빌드합니다</span></li>
        <li><Link href="/integrations/rest-api">REST API</Link><span>HTTP로 카탈로그 조회, 검증, 컴파일을 호출합니다</span></li>
        <li><Link href="/integrations/mcp">MCP</Link><span>에이전트가 도구로 디자인을 고르고 편집합니다</span></li>
      </ul>
    </PageShell>
  );
}
