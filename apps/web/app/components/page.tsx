import {PageShell} from '@/shell/PageShell';
import {CatalogList} from '@/features/components/CatalogList';
import {readCatalogIndex} from '@/features/components/catalog-index.server';
import {readCatalogQuery} from '@/features/components/catalog-model.mjs';

export const metadata = {title: 'Components'};

type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

export default async function ComponentsPage({searchParams}: Props) {
  const params = await searchParams;
  const catalogIndex = readCatalogIndex();
  const query = readCatalogQuery({get: (name: string) => first(params[name])});
  const family = first(params.family) ?? 'family:soft';
  const familyOptions = catalogIndex.materials
    .filter(material => material.kind === 'family')
    .map(material => ({id: material.id, label: material.label}));
  return (
    <PageShell eyebrow="Components" title="컴포넌트 카탈로그" lead="목적과 사용 맥락에 맞는 재료를 찾고, 실제로 사전 생성한 렌더를 시각 패밀리별로 비교합니다.">
      <CatalogList category={query.category} q={query.q} page={query.page} family={family}
        counts={Object.fromEntries(catalogIndex.categories.map(item => [item.id, item.itemCount]))} familyOptions={familyOptions} />
    </PageShell>
  );
}
