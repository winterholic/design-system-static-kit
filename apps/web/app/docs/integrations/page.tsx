import Link from 'next/link';
import {catalogSnapshot} from '@winterholic/design-system-static-kit/service';
import {PageShell} from '@/shell/PageShell';
import {INTEGRATION_PAGES} from '@/lib/docs.mjs';

export const metadata = {title: 'Docs · 연동'};

export default function IntegrationsPage() {
  const snapshot = catalogSnapshot();
  const supported = snapshot.supportedCatalogVersions ?? [snapshot.version];
  return (
    <PageShell eyebrow="Docs · 연동" title="연동" lead="CLI, REST API, MCP가 같은 카탈로그와 검증·컴파일 서비스를 사용합니다. 필요한 방식의 실행 예제와 입력·오류 규칙을 확인하세요.">
      <ul className="link-list">
        {INTEGRATION_PAGES.map(page => <li key={page.href}><Link href={page.href}>{page.title}</Link><span>{page.description}</span></li>)}
      </ul>
      <h2 className="section-title">지원하는 카탈로그 버전</h2>
      <p className="prose">Core가 검증·컴파일하는 버전은 <code>{supported.join(', ')}</code>이고 조회 기본값은 <code>{snapshot.version}</code>입니다. REST와 MCP의 조회 계열(카탈로그, 부품 명세)은 현재 <code>{snapshot.version}</code>만 돌려주므로 2.6.0 재료 부품은 조회 채널에서 찾을 수 없습니다. 검증·컴파일은 2.6.0 문서도 처리합니다. 이 한계는 Core 작업이 닫히기 전까지 유지됩니다.</p>
    </PageShell>
  );
}
