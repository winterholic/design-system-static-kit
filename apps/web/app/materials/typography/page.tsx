import Link from 'next/link';
import {redirect} from 'next/navigation';
import type {CSSProperties} from 'react';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {studioForTypeSystem} from '@/features/materials/studio-link';
import {Thumb} from '@/features/explore/Thumb';
import {assembleComponents, materials, probeDesign, typographyControlsRequest, typographySpecimen} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {TypeCompare, TYPE_COMPARE_SCENARIOS, type TypeQuery} from '@/features/platform/TypeCompare';
import {shortId, first} from '@/features/platform/labels';
import {normalizeTypeSelection, typeCatalogFamily, typeCatalogHref, typeCatalogPage, TYPE_CATALOG_PAGE_SIZE} from '@/features/platform/type-catalog-state.mjs';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: '타이포그래피 · Materials', description: '41개 타이포 시스템을 같은 문장으로 찾고, Core Specimen과 네 시스템 비교로 확인합니다.'};
type Search = Record<string, string | string[] | undefined>;
const FAMILIES = [
  ['general-product', '일반 프로덕트'], ['enterprise', '엔터프라이즈'], ['finance', '금융'], ['developer', '개발자'], ['marketing', '마케팅'],
  ['editorial', '에디토리얼'], ['commerce', '커머스'], ['mobile', '모바일'], ['education', '교육'], ['experimental', '실험'],
] as const;
const FAMILY_LABEL = Object.fromEntries(FAMILIES) as Record<string, string>;
const DENSITY_LABEL: Record<string, string> = {compact: '촘촘함', comfortable: '보통', spacious: '여유로움'};
const SAMPLE_TITLE = '디자인 시스템은 읽히는 속도를 설계합니다';
const SAMPLE_BODY = '한글과 English, 2026년 매출 ₩128,000 (4.6%)을 같은 문장에 두어 서체 차이를 비교합니다.';
const ROLE_KEYS = ['display-xl','display-lg','display-md','heading-1','heading-2','heading-3','heading-4','heading-5','heading-6','body-lg','body-md','body-sm','label-lg','label-md','label-sm','caption','overline','button-label','input-value','table-header','table-cell','numeric','kpi','code','quote','navigation','badge'];
const LEGACY_PRESET = {erp: 'tech-erp', document: 'doc-essay', marketing: 'mkt-launch', editorial: 'doc-essay'} as const;
const paramsFrom = (query: Search) => new URLSearchParams(Object.entries(query).flatMap(([key, value]) => Array.isArray(value) ? value.map(item => [key, item]) : value === undefined ? [] : [[key, value]]) as [string, string][]);

export default async function TypographyPage({searchParams}: {searchParams: Promise<Search>}) {
  const search = await searchParams;
  const oldPreset = first(search.preset);
  if (oldPreset && oldPreset in LEGACY_PRESET) redirect(`/materials/typography?system=${LEGACY_PRESET[oldPreset as keyof typeof LEGACY_PRESET]}`);

  const all = materials('type-system');
  const validIds = new Set(all.map(item => shortId(item.id)));
  const params = paramsFrom(search);
  const q = (first(search.q) ?? '').trim();
  const askedFamily = first(search.family) ?? '';
  const family = FAMILIES.some(([id]) => id === askedFamily) ? askedFamily : '';
  const selection = normalizeTypeSelection(params.getAll('with').join(','), validIds);
  const queryText = q.toLocaleLowerCase();
  const filtered = all.filter(item => (!family || typeCatalogFamily(item) === family) && (!queryText || `${item.id} ${item.label} ${(item.tags ?? []).join(' ')} ${(item.contexts ?? []).join(' ')}`.toLocaleLowerCase().includes(queryText)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / TYPE_CATALOG_PAGE_SIZE));
  const page = typeCatalogPage(first(search.page), pageCount);
  const visible = filtered.slice((page - 1) * TYPE_CATALOG_PAGE_SIZE, page * TYPE_CATALOG_PAGE_SIZE);
  const rawQuery = params.toString();
  const askedSystem = first(search.system);
  const selectedId = askedSystem && validIds.has(askedSystem) ? `type-system:${askedSystem}` : null;
  const selected = selectedId ? typographySpecimen(selectedId) : undefined;
  const scenarioAsked = first(search.scenario) || ({doc: 'editorial', dash: 'erp'} as Record<string, string>)[first(search.sample) ?? ''] || 'saas';
  const scenario = scenarioAsked in TYPE_COMPARE_SCENARIOS ? scenarioAsked as TypeQuery['scenario'] : 'saas';
  const width = first(search.width) === '390' ? 390 : 1280;
  const mode = first(search.mode) === 'dark' ? 'dark' : 'light';
  const compareQuery: TypeQuery = {with: selection, scenario, width, mode, rawQuery};

  const selectedContexts = selected?.contexts ?? [];
  const preferredScenario = selectedContexts.includes('dashboard') || selectedContexts.includes('data') ? TYPE_COMPARE_SCENARIOS.erp
    : selectedContexts.includes('commerce') ? TYPE_COMPARE_SCENARIOS.commerce
    : selectedContexts.some((context: string) => ['docs','article','blog'].includes(context)) ? TYPE_COMPARE_SCENARIOS.editorial
    : TYPE_COMPARE_SCENARIOS.saas;
  const controlRequest = selectedId ? typographyControlsRequest(selectedId) : null;
  const controls = controlRequest ? assembleComponents(controlRequest as any) : null;
  const detailRequest = selectedId ? {purpose: preferredScenario.purpose, content: preferredScenario.content, typeSystem: selectedId, mode, candidates: 1} : null;
  const detailProbe = detailRequest ? probeDesign(detailRequest as any) : null;

  return <PageShell eyebrow="Materials · Typography" title="타이포그래피 카탈로그" lead="같은 제목과 본문으로 41개 시스템을 훑고, 한 시스템의 27개 역할과 실제 Core 컴파일 결과를 확인합니다.">
    <MaterialsNav current="typography" />
    <p className={styles.meta}>전체 {all.length}개 시스템 · 첫 화면은 최대 {TYPE_CATALOG_PAGE_SIZE}개 카드만 읽습니다. 타이포 데이터와 상세 Specimen은 카드 목록에서 컴파일하지 않습니다.</p>

    <form method="get" action="/materials/typography" className={styles.materialFilters} aria-label="타이포그래피 검색과 계열 필터">
      <label className={styles.field}>검색
        <input className={styles.typeSearch} type="search" name="q" defaultValue={q} placeholder="시스템명, 맥락, 태그" />
      </label>
      <label className={styles.field}>계열
        <select name="family" defaultValue={family}>
          <option value="">모든 계열</option>{FAMILIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      {selection.map(id => <input key={id} type="hidden" name="with" value={id} />)}
      <input type="hidden" name="scenario" value={scenario} /><input type="hidden" name="width" value={width} /><input type="hidden" name="mode" value={mode} />
      <button className={styles.chipLink} type="submit">필터 적용</button>
    </form>

    <p className={styles.meta} data-testid="type-catalog-count">{filtered.length}개 결과 · {page}/{pageCount}쪽 · 비교 {selection.length}/4</p>
    {visible.length ? <ul className={styles.typeCatalogGrid} data-testid="type-catalog-grid">
      {visible.map(item => {
        const detail = typographySpecimen(item.id);
        const titleRole = detail?.roles?.['display-xl'] ?? {};
        const bodyRole = detail?.roles?.['body-md'] ?? {};
        const active = selection.includes(shortId(item.id));
        const detailHref = typeCatalogHref(rawQuery, {system: shortId(item.id)});
        const styleFor = (role: any): CSSProperties => ({fontFamily: role.fontFamily, fontSize: role.size, fontWeight: role.weight, lineHeight: role.lineHeight, letterSpacing: `${role.trackingEm ?? 0}em`});
        return <li key={item.id} className={styles.typeCatalogCard} data-system={shortId(item.id)}>
          <div className={styles.typeCardHead}><span className={styles.tag}>{FAMILY_LABEL[typeCatalogFamily(item)] ?? '일반 프로덕트'}</span><span className={styles.tag}>{DENSITY_LABEL[detail?.density] ?? '보통'}</span></div>
          <h2><Link href={detailHref}>{item.label}</Link></h2>
          <div className={styles.typeCardSample}>
            <p className={styles.typeCardTitle} style={styleFor(titleRole)}>{SAMPLE_TITLE}</p>
            <p style={styleFor(bodyRole)}>{SAMPLE_BODY}</p>
          </div>
          <dl className={styles.typeFacts}>
            <div><dt>서체 조합</dt><dd>{detail?.facePairing?.label ?? detail?.facePairing?.id}</dd></div>
            <div><dt>사용 맥락</dt><dd>{(item.contexts ?? []).join(' · ')}</dd></div>
            <div><dt>숫자</dt><dd className={styles.typeNumber}>{item.label} · ₩128,000 · 4.6%</dd></div>
            <div><dt>라벨</dt><dd className={styles.typeLabel}>Active · 처리 완료</dd></div>
          </dl>
          <div className={styles.typeCardActions}>
            {active ? <Link className={styles.chipLink} href={typeCatalogHref(rawQuery, {with: selection.filter(id => id !== shortId(item.id)).join(',')})}>비교에서 빼기</Link>
              : selection.length < 4 ? <Link className={styles.chipLink} href={typeCatalogHref(rawQuery, {with: [...selection, shortId(item.id)].join(',')})}>비교에 추가</Link>
                : <button className={styles.chipLink} type="button" disabled aria-label="네 개 선택 한도에 도달해 추가할 수 없음">비교 4/4</button>}
            <Link className={styles.chipLink} href={detailHref}>Specimen 열기</Link>
          </div>
        </li>;
      })}
    </ul> : <p className="note">조건에 맞는 타이포 시스템이 없습니다.</p>}

    {pageCount > 1 ? <nav className={styles.typePagination} aria-label="타이포 카탈로그 페이지">
      {page > 1 ? <Link className={styles.chipLink} href={typeCatalogHref(rawQuery, {page: String(page - 1)})}>이전</Link> : <span aria-disabled="true">이전</span>}
      <span>{page} / {pageCount}</span>
      {page < pageCount ? <Link className={styles.chipLink} href={typeCatalogHref(rawQuery, {page: String(page + 1)})}>다음</Link> : <span aria-disabled="true">다음</span>}
    </nav> : null}

    <TypeCompare query={compareQuery} />

    {selected && selectedId ? <section className={styles.typeSpecimen} data-testid="type-specimen" aria-labelledby="specimen-title">
      <h2 className="section-title" id="specimen-title">{selected.label} · 상세 Specimen</h2>
      <p className={styles.meta}>서체 조합: {selected.facePairing.label} · 역할 체계: {selected.roleScale.label} · 밀도: {DENSITY_LABEL[selected.density] ?? selected.density} · 숫자: {selected.numerals}</p>
      <p><Link className={styles.chipLink} href={studioForTypeSystem(selectedId, preferredScenario.purpose)} prefetch={false}>이 시스템으로 Studio 열기</Link></p>

      <h3 className={styles.typeSectionTitle}>27개 역할</h3>
      <ul className={styles.typeRoleList} data-testid="type-role-list">
        {ROLE_KEYS.map(key => {
          const role = selected.roles[key];
          if (!role) return null;
          const roleStyle: CSSProperties = {fontFamily: role.fontFamily, fontSize: role.size, fontWeight: role.weight, lineHeight: role.lineHeight, letterSpacing: `${role.trackingEm ?? 0}em`};
          return <li key={key} data-role={key}>
            <div><strong>{role.label ?? key}</strong><span>{key} · {role.sizePx?.mobile}→{role.sizePx?.desktop}px · {role.weight} · 행간 {role.lineHeight} · 자간 {role.trackingEm}em</span><small>{role.recommendedPlacement ?? ''}</small></div>
            <p style={roleStyle}>{key.startsWith('display') ? SAMPLE_TITLE : SAMPLE_BODY}</p>
          </li>;
        })}
      </ul>
      <h3 className={styles.typeSectionTitle}>굵기 비교 · 다국어 · 숫자와 금융 · 코드</h3>
      <div className={styles.typeWeightCompare}>{[400, 500, 600, 700].map(weight => <p key={weight} style={{fontFamily: selected.roles['body-md']?.fontFamily, fontWeight: weight}}>굵기 {weight} · 한글 English 日本語 2026年 · ₩128,000 · 4.6%</p>)}</div>
      <p className={styles.typeCode}><code>const revenue = currencyKRW(128000); // 4.6% · npm run build</code></p>

      <h3 className={styles.typeSectionTitle}>버튼·입력·표: Core 조립 및 내보내기 결과</h3>
      {controls?.ok ? <>
        <p className={styles.meta}>2.7.0 Core의 assembleComponents가 만든 button.primary, form.filter, table.business 묶음입니다. 아래 미리보기는 같은 요청의 Core standalone 결과를 표시합니다.</p>
        <Thumb src={renderSrc(controlRequest!, {kind: 'components'})} preview={{kind: 'components', request: controlRequest!}} title={`${selected.label} 버튼·입력·표 Core 컴파일 결과`} width={1280} height={600} />
        <ul className={styles.typeExports} aria-label="Core에서 내보내기">
          {(['standalone', 'html', 'css', 'manifest'] as const).map(part => <li key={part}><a className={styles.chipLink} href={renderSrc(controlRequest!, {kind: 'components', part, download: true})} download data-part={part}>{({standalone: '완성 HTML', html: 'HTML 조각', css: 'CSS', manifest: 'Blueprint와 manifest'} as const)[part]} 다운로드</a></li>)}
        </ul>
      </> : <p role="status" className="note">Core 조립 제한: {controls?.errors?.map((error: any) => error.message).join(' ') ?? 'Core 결과 없음'}</p>}

      <h3 className={styles.typeSectionTitle}>같은 시스템의 반응형 Core Specimen</h3>
      {detailProbe?.ok && detailRequest ? <div className={styles.typeViewportCompare}>
        <figure><figcaption>모바일 · 390px</figcaption><Thumb src={renderSrc(detailRequest as any)} preview={{kind: 'assemble', request: detailRequest}} title={`${selected.label} 모바일 390px Core 컴파일`} width={390} height={844} /></figure>
        <figure><figcaption>데스크톱 · 1280px</figcaption><Thumb src={renderSrc(detailRequest as any)} preview={{kind: 'assemble', request: detailRequest}} title={`${selected.label} 데스크톱 1280px Core 컴파일`} width={1280} height={800} /></figure>
      </div> : <p role="status" className="note">Core 렌더 제한: {detailProbe && !detailProbe.ok ? detailProbe.reason : 'Core 결과 없음'}</p>}
    </section> : null}
  </PageShell>;
}
