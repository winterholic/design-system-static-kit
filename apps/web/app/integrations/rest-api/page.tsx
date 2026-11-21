import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'REST API 연동'};

export default function Page() {
  return (
    <PageShell eyebrow="Integrations" title="REST API" lead="HTTP로 카탈로그 조회, 검증, 컴파일을 호출하는 방법을 설명합니다.">
      <Link href="/integrations" className="btn btn-quiet">연동 목록으로</Link>
    </PageShell>
  );
}
