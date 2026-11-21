import {PageShell} from '@/shell/PageShell';

export const metadata = {title: 'Studio'};

export default function StudioPage() {
  return (
    <PageShell eyebrow="Studio" title="Studio" lead="디자인을 고르고, 고친 내용이 규칙을 통과하는지 바로 확인하며 내려받습니다.">
      <p className="note">새 Studio를 준비 중입니다.</p>
    </PageShell>
  );
}
