import Link from 'next/link';
import {Suspense} from 'react';
import {PageShell} from '@/shell/PageShell';
import {ExploreControls, type Options} from '@/features/explore/ExploreControls';
import {Thumb} from '@/features/explore/Thumb';
import {curatedDesigns} from '@/features/explore/designs.server';
import {filterRows, paginate, readQuery, writeQuery} from '@/features/explore/list-query';
import styles from '@/features/explore/list.module.css';
import {ButtonLink} from '@/ui';

export const metadata = {title: 'Explore'};

type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export default async function ExplorePage({searchParams}: Props) {
  const sp = await searchParams;
  const designs = curatedDesigns();

  // 클라이언트로 보내는 것은 필터 선택지뿐이다(디자인 목록과 카탈로그는 서버에만 있다).
  const options: Options = {
    types: [...new Map(designs.map(d => [d.pageType, d.pageTypeLabel])).entries()].map(([id, label]) => ({id, label})),
    styles: [...new Map(designs.map(d => [d.styleId, d.styleLabel])).entries()].map(([id, label]) => ({id, label})),
    themes: [...new Map(designs.map(d => [d.themeId, {id: d.themeId, name: d.themeName, styleId: d.styleId}])).values()].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  };
  const query = readQuery({get: name => first(sp[name])}, {types: options.types.map(t => t.id), styles: options.styles.map(s => s.id), themes: options.themes.map(t => t.id)});
  const found = filterRows(designs, query);
  const view = paginate(found, query.page);
  const href = (page: number) => { const qs = writeQuery({...query, page}); return qs ? `/explore?${qs}` : '/explore'; };

  return (
    <PageShell eyebrow="Explore" title="컴파일된 디자인 둘러보기" lead="템플릿 기본 디자인과 어울리는 테마 조합을 골랐습니다. 열면 구성과 Blueprint를 보고 Studio에서 이어 편집할 수 있습니다.">
      <Suspense fallback={<div aria-label="검색 조건 준비 중" />}>
        <ExploreControls options={options} total={found.length} />
      </Suspense>
      {view.items.length ? (
        <ul className={styles.grid}>
          {view.items.map(d => (
            <li key={d.id} className={styles.card}>
              <Link href={`/explore/${d.id}`} className={styles.link}>
                <Thumb src={`/explore/${d.id}/render`} title={`${d.label} (${d.themeName}) 미리보기`} />
                <h2 className={styles.title}>{d.label}</h2>
                <p className={styles.meta}>{d.pageTypeLabel} · {d.themeName}{d.variantLabel ? ` · ${d.variantLabel}` : ''}</p>
                {d.curationLabel ? <p className={styles.meta}>{d.curationLabel} · 팔레트 {d.paletteId} · 모드 {d.resolvedMode} · {Object.entries(d.layout ?? {}).map(([slot, option]) => `${slot}:${option}`).join(', ')}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>조건에 맞는 디자인이 없습니다.</p>
          <ButtonLink href="/explore" variant="secondary">필터 초기화</ButtonLink>
        </div>
      )}
      {view.pages > 1 ? (
        <nav className={styles.pager} aria-label="쪽 이동">
          <Link href={href(view.page - 1)} aria-disabled={view.page === 1} tabIndex={view.page === 1 ? -1 : undefined} rel="prev">이전</Link>
          <span>{view.page} / {view.pages}</span>
          <Link href={href(view.page + 1)} aria-disabled={view.page === view.pages} tabIndex={view.page === view.pages ? -1 : undefined} rel="next">다음</Link>
        </nav>
      ) : null}
      <p className={styles.aside}>
        컴파일러가 들어 있는 단일 파일을 내려받아 오프라인에서 쓰려면 <a href="/gallery/index.html">오프라인 갤러리</a>를 여세요.
      </p>
    </PageShell>
  );
}
