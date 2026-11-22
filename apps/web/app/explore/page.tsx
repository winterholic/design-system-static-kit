import Link from 'next/link';
import {Suspense} from 'react';
import {PageShell} from '@/shell/PageShell';
import {ExploreControls, type Options} from '@/features/explore/ExploreControls';
import {Thumb} from '@/features/explore/Thumb';
import {curatedDesigns, type Design} from '@/features/explore/designs.server';
import {filterRows, paginate, readQuery, writeQuery} from '@/features/explore/list-query';
import styles from '@/features/explore/list.module.css';
import {ButtonLink} from '@/ui';
import {PLATFORM_CASES} from '@/features/platform/cases';
import {assembleDesign, material, platformReady} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {readState, requestOf, writeState, type AssembleState} from '@/features/platform/assemble-state';
import {purposeOf, shortId} from '@/features/platform/labels';

export const metadata = {title: 'Explore'};

/** 맨 위 "같은 페이지, 다른 재료" 사례에 쓰는 템플릿. 같은 템플릿의 조합이 여러 개 있는 것을 고른다. */
const FEATURED_TEMPLATE = 'saas-landing';

/** 카드의 조립 요약. 사람이 읽는 말(테마, 팔레트 이름, 모드)만 쓰고 내부 값은 상세의 "구성"에 둔다. */
function Recipe({d, modeLabel}: {d: Design; modeLabel: (mode: string) => string}) {
  return (
    <p className={styles.recipe}>
      <span className={styles.swatches} aria-hidden="true">{d.paletteColors.slice(0, 5).map(c => <i key={c} style={{background: c}} />)}</span>
      <span>{`테마 ${d.themeName}${d.variantLabel ? ` · ${d.variantLabel}` : ''} · ${d.paletteName} · ${modeLabel(d.resolvedMode)} 모드`}</span>
    </p>
  );
}

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

  const unfiltered = !query.q && !query.type && !query.style && !query.theme && query.page === 1;
  const featured = unfiltered ? designs.filter(d => d.template === FEATURED_TEMPLATE).slice(0, 4) : [];
  const modeLabel = (mode: string) => (mode === 'dark' ? '다크' : mode === 'light' ? '라이트' : '자동');

  return (
    <PageShell eyebrow="Explore" title="완성된 디자인 둘러보기" lead={`페이지 유형, 테마, 팔레트, 모드를 조립해 Core가 컴파일한 완성 화면 ${designs.length}개입니다. 마음에 드는 화면을 열어 구성을 보고 Studio에서 이어 편집하세요.`}>
      {unfiltered && platformReady() ? <PlatformCases /> : null}
      {featured.length ? (
        <section aria-labelledby="explore-featured" className={styles.featured}>
          <h2 className="section-title" id="explore-featured">같은 페이지, 다른 재료로 조립한 사례</h2>
          <p className={styles.featuredLead}>{featured[0].label} 하나에 테마·팔레트·모드를 바꿔 끼운 결과입니다. 글과 구조는 같고 분위기만 다릅니다.</p>
          <ul className={styles.grid}>
            {featured.map(d => (
              <li key={d.id} className={styles.card}>
                <Link href={`/explore/${d.id}`} className={styles.link}>
                  <Thumb src={`/explore/${d.id}/render`} title={`${d.label} (${d.themeName}) 미리보기`} />
                  <h3 className={styles.title}>{d.themeName}{d.variantLabel ? ` · ${d.variantLabel}` : ''}</h3>
                  <Recipe d={d} modeLabel={modeLabel} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <h2 className="section-title" id="explore-all">모든 완성 디자인</h2>
      <Suspense fallback={<div aria-label="검색 조건 준비 중" />}>
        <ExploreControls options={options} total={found.length} />
      </Suspense>
      {view.items.length ? (
        <ul className={styles.grid} aria-labelledby="explore-all">
          {view.items.map(d => (
            <li key={d.id} className={styles.card}>
              <Link href={`/explore/${d.id}`} className={styles.link}>
                <Thumb src={`/explore/${d.id}/render`} title={`${d.label} (${d.themeName}) 미리보기`} />
                <h3 className={styles.title}>{d.label}</h3>
                <p className={styles.meta}>{d.pageTypeLabel} · {d.styleLabel}</p>
                <Recipe d={d} modeLabel={modeLabel} />
                {d.curationLabel ? <p className={styles.badge}>여러 재료를 함께 바꾼 사례</p> : null}
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

/** 조립 플랫폼으로 만든 사례. 페이지 유형마다 서로 다른 팔레트·세트·서체(·패밀리)를 고른 요청을 Core 가 조립한 결과다. */
function PlatformCases() {
  return (
    <section aria-labelledby="explore-platform" className={styles.featured} data-testid="platform-cases">
      <h2 className="section-title" id="explore-platform">조립 플랫폼으로 만든 사례</h2>
      <p className={styles.featuredLead}>SaaS 랜딩, 업무 대시보드, 에디토리얼, 커머스를 서로 다른 팔레트·서브토큰 세트·서체로 조립했습니다. 열어서 재료를 바꿔 볼 수 있습니다.</p>
      <ul className={styles.grid}>
        {PLATFORM_CASES.map(k => {
          const state: AssembleState = readState(new URLSearchParams(writeState({...k.state, step: 'swap'}).split('?')[1]));
          const request = requestOf(state);
          if (!request || !assembleDesign({...request, candidates: 1}).ok) return null;
          const names = [k.state.palette && `palette:${k.state.palette}`, k.state.set && `subtoken-set:${k.state.set}`, k.state.type && `type-system:${k.state.type}`, k.state.family && `family:${k.state.family}`].filter(Boolean) as string[];
          return (
            <li key={k.id} className={styles.card} data-case={k.id}>
              <Link href={writeState({...k.state, step: 'swap'})} className={styles.link}>
                <Thumb src={renderSrc(request)} title={`${k.title} 미리보기`} />
                <h3 className={styles.title}>{k.title}</h3>
                <p className={styles.meta}>{purposeOf(k.state.purpose)?.label} · {names.map(id => material(id)?.label ?? shortId(id)).join(' · ')}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
