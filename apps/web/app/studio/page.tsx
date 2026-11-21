import type {Metadata} from 'next';
import {StudioApp} from '@/features/studio/StudioApp';

export const metadata: Metadata = {title: 'Studio', description: '디자인을 고르고, 고친 내용이 규칙을 통과하는지 바로 확인하며 내려받습니다.'};

// Studio는 브라우저에서 문서를 편집하고 컴파일하는 화면이다. 서버는 껍데기와 제목만 낸다.
export default function StudioPage() {
  return (
    <>
      <h1 className="visually-hidden">Studio</h1>
      <noscript><p className="note">Studio는 JavaScript가 필요합니다.</p></noscript>
      <StudioApp />
    </>
  );
}
