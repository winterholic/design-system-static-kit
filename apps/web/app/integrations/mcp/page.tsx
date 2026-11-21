import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'MCP 연동'};

export default function Page() {
  return (
    <PageShell eyebrow="Integrations" title="MCP" lead="에이전트가 MCP 도구로 디자인을 고르고 편집하는 방법을 설명합니다.">
      <Link href="/integrations" className="btn btn-quiet">연동 목록으로</Link>
    </PageShell>
  );
}
