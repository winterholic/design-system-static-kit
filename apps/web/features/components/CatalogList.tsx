'use client';

import {useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CATALOG_CATEGORIES, classificationLabels, filterCatalogMaterials} from './catalog-model.mjs';
import {CategoryTabs} from './CategoryTabs';
import styles from './components.module.css';

type Material = {
  id: string; kind: string; category: string; label: string; purpose: string; contexts: string[]; tags: string[];
  previewUrl: string | null; previewUrlsByFamily: Record<string, string>; variantsCount: number; statesCount: number;
  qualityStatus: 'implemented' | 'verified'; relatedCategories: string[]; url: string;
};
type Chunk = {category: string; itemCount: number; page: number; pages: number; materials: Material[]};
type Props = {category: string; q: string; page: number; family: string; counts: Record<string, number>; familyOptions: {id: string; label: string}[]};

export function CatalogList({category, q, page, family, counts, familyOptions}: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(q);
  const [error, setError] = useState('');
  const activeFamily = familyOptions.some(option => option.id === family) ? family : 'family:soft';

  useEffect(() => setSearchValue(q), [q]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const categoryPages = Math.max(1, Math.ceil((counts[category] ?? 0) / 24));
    const requestedPage = q ? page : Math.min(page, categoryPages);
    const source = q
      ? fetch('/search-index.json', {signal: controller.signal}).then(r => {
          if (!r.ok) throw new Error('검색 색인을 불러오지 못했습니다.');
          return r.json();
        }).then((materials: Material[]) => {
          const found = filterCatalogMaterials(materials, {category, q});
          const pages = Math.max(1, Math.ceil(found.length / 24));
          return {materials: found, itemCount: found.length, page: Math.min(requestedPage, pages), pages} as Chunk;
        })
      : fetch(`/catalog-chunks/${category}-${requestedPage}.json`, {signal: controller.signal}).then(r => {
          if (!r.ok) throw new Error('카테고리 청크를 불러오지 못했습니다.');
          return r.json() as Promise<Chunk>;
        });
    source.then(chunk => {
      const start = (chunk.page - 1) * 24;
      const materials = q ? chunk.materials.slice(start, start + 24) : chunk.materials;
      setRows(materials);
      setTotal(chunk.itemCount);
      setPages(chunk.pages);
      setLoading(false);
    }).catch(reason => {
      if (reason.name === 'AbortError') return;
      setError(reason.message ?? '카탈로그를 불러오지 못했습니다.');
      setRows([]);
      setLoading(false);
    });
    return () => controller.abort();
  }, [category, q, page, counts]);

  const categoryLabel = CATALOG_CATEGORIES.find(item => item.id === category)?.label ?? '전체';
  const route = (next: {category?: string; q?: string; page?: number; family?: string}) => {
    const params = new URLSearchParams();
    const nextCategory = next.category ?? category;
    const nextQuery = next.q ?? q;
    const nextPage = next.page ?? 1;
    const nextFamily = next.family ?? activeFamily;
    if (nextCategory !== 'all') params.set('category', nextCategory);
    if (nextQuery) params.set('q', nextQuery);
    if (nextPage > 1) params.set('page', String(nextPage));
    if (nextFamily !== 'family:soft') params.set('family', nextFamily);
    const search = params.toString();
    router.push(search ? `/components?${search}` : '/components', {scroll: false});
  };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    route({q: searchValue.trim(), page: 1});
  };
  const changeFamily = (value: string) => route({family: value});

  return (
    <section className={styles.catalog}>
      <form className={styles.catalogToolbar} role="search" aria-label="컴포넌트 전체 검색" onSubmit={submitSearch}>
        <label className={styles.barField}>
          <span>전체 재료 검색</span>
          <input type="search" aria-label="검색" value={searchValue} onChange={event => setSearchValue(event.target.value)} placeholder="이름, 목적, 태그" autoComplete="off" enterKeyHint="search" maxLength={80} />
        </label>
        <button className={styles.searchButton} type="submit">검색</button>
        <label className={styles.barField}>
          <span>시각 패밀리</span>
          <select aria-label="시각 패밀리" value={activeFamily} onChange={event => changeFamily(event.target.value)}>
            {familyOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </form>
      <CategoryTabs selected={category} counts={counts} onSelect={value => route({category: value, q: '', page: 1})} />
      <div id="catalog-panel" role="tabpanel" aria-labelledby={`catalog-tab-${category}`} data-testid="components-list" aria-busy={loading}>
        <div className={styles.catalogHeading}>
          <h2>{q ? '검색 결과' : categoryLabel}</h2>
          <p data-testid="components-count" data-total={total} role="status" aria-live="polite">{loading ? '불러오는 중…' : `${total}개 재료`}</p>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? <div className={styles.empty}>
          <p>{q ? '검색 결과가 없습니다.' : `${categoryLabel} 재료가 아직 없습니다.`}</p>
          {q ? <p>전체 재료 색인에서 이름, 목적, 태그를 검색합니다.</p> : <p>레지스트리에 재료가 등록되면 이 카테고리에 자동으로 표시됩니다.</p>}
        </div> : null}
        <ul className={styles.catalogGrid}>
          {rows.map(material => {
            const hasFamilyPreviews = Object.keys(material.previewUrlsByFamily ?? {}).length > 0;
            const preview = hasFamilyPreviews ? material.previewUrlsByFamily[activeFamily] : material.previewUrl;
            const related = classificationLabels(material);
            return <li className={styles.catalogCard} key={material.id}>
              <Link className={styles.catalogCardLink} href={material.url || '/materials'} prefetch={false}>
                {preview ? <div className={styles.catalogPreview} data-preview="static"><img src={preview} alt={`${material.label} ${activeFamily} 대표 렌더`} loading="lazy" decoding="async" /></div>
                  : <div className={styles.catalogPreviewUnavailable} data-preview="unavailable">{hasFamilyPreviews ? '이 패밀리의 미리보기 없음' : '사전 생성 미리보기 없음'}</div>}
                <div className={styles.catalogCardBody}>
                  <h3>{material.label}</h3>
                  <p className={styles.catalogPurpose}>{material.purpose}</p>
                  <p className={styles.catalogStats}>변형 {material.variantsCount} · 지원 상태 {material.statesCount} · {material.qualityStatus === 'verified' ? '검증됨' : '구현됨'}</p>
                  <p className={styles.catalogRelated} aria-label="관련 카테고리">{related.join(' · ')}</p>
                  <span className={styles.detailLink}>상세 보기 <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            </li>;
          })}
        </ul>
        {pages > 1 ? <nav className={styles.pager} aria-label="쪽 이동">
          <button type="button" onClick={() => route({page: page - 1})} disabled={page <= 1}>이전</button>
          <span>{Math.min(page, pages)} / {pages}</span>
          <button type="button" onClick={() => route({page: page + 1})} disabled={page >= pages}>다음</button>
        </nav> : null}
      </div>
    </section>
  );
}
