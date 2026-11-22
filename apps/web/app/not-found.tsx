import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {ButtonLink} from '@/ui';

export const metadata = {title: '페이지를 찾을 수 없음'};

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="이 주소에는 페이지가 없습니다" lead="주소가 바뀌었거나 아직 만들어지지 않은 화면입니다.">
      <div className="btn-row">
        <ButtonLink href="/explore">Explore 열기</ButtonLink>
        <ButtonLink href="/" variant="secondary">처음으로</ButtonLink>
      </div>
    </PageShell>
  );
}
