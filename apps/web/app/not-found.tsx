import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';

export const metadata = {title: '페이지를 찾을 수 없음'};

export default function NotFound() {
  return (
    <PageShell eyebrow="404" title="이 주소에는 페이지가 없습니다" lead="주소가 바뀌었거나 아직 만들어지지 않은 화면입니다.">
      <div className="btn-row">
        <Link href="/explore" className="btn">Explore 열기</Link>
        <Link href="/" className="btn btn-quiet">처음으로</Link>
      </div>
    </PageShell>
  );
}
