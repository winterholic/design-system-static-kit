import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {FoundationCategory} from '@/features/materials/FoundationCategory';
import {FOUNDATION_CATEGORIES} from '@/features/materials/foundations-exhibit.mjs';
import styles from '@/features/materials/materials.module.css';

export const metadata = {
  title: '기초 재료 · Materials',
  description: 'Spacing, Density, Radius, Border, Elevation, Surface, Background, Motion, Icon, Layout, Chart를 Core 재료 예시와 토큰으로 살펴봅니다.',
};

type Props = {searchParams: Promise<{category?: string | string[]}>};

export default async function FoundationsPage({searchParams}: Props) {
  const params = await searchParams;
  const requested = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = FOUNDATION_CATEGORIES.find(item => item.id === requested) ?? FOUNDATION_CATEGORIES[0];
  return (
    <PageShell eyebrow="Materials · 기초 재료" title="Foundations" lead="Core 정의와 실제 렌더를 범주별로 확인합니다. 선택한 범주만 불러오며 링크와 브라우저 뒤로 가기로 선택을 복원합니다.">
      <MaterialsNav current="foundations" />
      <nav className={styles.foundationNav} aria-label="Foundations 하위 카테고리">
        {FOUNDATION_CATEGORIES.map(item => <Link
          key={item.id}
          href={`/materials/foundations?category=${item.id}`}
          className={styles.foundationTab}
          aria-current={item.id === category.id ? 'page' : undefined}
          data-foundation-category={item.id}
        >{item.label}</Link>)}
      </nav>
      <FoundationCategory id={category.id} />
    </PageShell>
  );
}
