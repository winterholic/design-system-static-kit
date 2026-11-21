import {UiGallery} from './UiGallery';

export const metadata = {title: 'UI 부품 (내부)', robots: {index: false, follow: false}};

// 공용 UI 부품(apps/web/ui)의 상태를 한 화면에 모은 내부 시험 화면. 공개 메뉴·사이트맵에 없고 noindex 헤더가 붙는다(/dev/*).
export default function UiGalleryPage() {
  return (
    <div className="page">
      <h1 className="page-title">UI 부품</h1>
      <p className="page-lead">Select, Input, Button, Chip의 열림·닫힘·키보드·비활성·오류 상태를 확인하는 내부 화면입니다.</p>
      <UiGallery />
    </div>
  );
}
