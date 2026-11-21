import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'CLI 연동'};

export default function Page() {
  return (
    <PageShell eyebrow="Integrations" title="CLI" lead="터미널과 CI에서 Blueprint를 검증하고 빌드하는 방법을 설명합니다.">
      <Link href="/integrations" className="btn btn-quiet">연동 목록으로</Link>
    </PageShell>
  );
}
