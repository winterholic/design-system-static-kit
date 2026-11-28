import Link from 'next/link';
import {redirect} from 'next/navigation';
import type {CSSProperties} from 'react';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {typeView} from '@/features/materials/materials.server';
import {studioForTypeSystem} from '@/features/materials/studio-link';
import {Thumb} from '@/features/explore/Thumb';
import {materials, probeDesign, typographyControls, typographySpecimen} from '@/features/platform/platform.server';
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
// 역할마다 그 역할이 실제로 쓰이는 문장을 보인다. 숫자·금융·코드 역할이 한글 문장만 보이면 서체의 숫자 정렬과 고정폭 차이를 알 수 없다.
const ROLE_SAMPLE: Record<string, string> = {
  'heading-1': '2026년 4분기 운영 보고', 'heading-2': '매출과 전환율 Overview', 'heading-3': '고객 문의 처리 현황', 'heading-4': '주문 상태 Order status', 'heading-5': '배송 정보', 'heading-6': '메모 Notes',
  'label-lg': '결제 수단 Payment', 'label-md': '상태 Status · 처리 완료', 'label-sm': '필수 Required', caption: '2026년 11월 28일 갱신 · Updated 3 min ago', overline: 'OVERLINE 개요 Overview',
  'button-label': '저장하고 계속 Save', 'input-value': 'kim.seoyeon@example.com', 'table-header': '주문번호 · 고객 · 금액', 'table-cell': '#10421 · 김서연 · ₩1,280,000',
  numeric: '₩1,280,000.50 · 4.6% · −12.3 · 1,111 / 8,888', kpi: '₩128,400,000', code: 'const total = sum(items); // 128000 · npm run build',
  quote: '“좋은 위계는 읽는 속도를 설계한다.” — Field Notes', navigation: '개요 · 프로젝트 · 일정 · 설정', badge: 'NEW 신규 · BETA',
};
// Core 시험 문구(코퍼스 13개): 줄바꿈이 무너지기 쉬운 한글 무공백·숫자 한 줄 유지·코드 가로 스크롤 정책을 선택한 시스템의 서체로 보인다.
const CORPUS_ROLE: Record<string, string> = {display: 'display-md', heading: 'heading-2', body: 'body-md', label: 'label-lg', caption: 'caption', numeric: 'numeric', code: 'code'};
const CORPUS_ROLE_LABEL: Record<string, string> = {display: '디스플레이', heading: '제목', body: '본문', label: '라벨', caption: '캡션', numeric: '숫자', code: '코드'};
const CORPUS_POLICY_LABEL: Record<string, string> = {wrap: '줄바꿈', nowrap: '한 줄 유지', scroll: '가로 스크롤'};
const NUMERIC_ROLES = new Set(['numeric', 'kpi', 'table-cell', 'input-value']);
const NUMS_FEATURE = {tabular: 'tabular-nums lining-nums', proportional: 'proportional-nums lining-nums'} as const;
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
  const webfontsOn = first(search.webfonts) === '1';
  const selected = selectedId ? typographySpecimen(selectedId, {webfonts: webfontsOn}) : undefined;
  const scenarioAsked = first(search.scenario) || ({doc: 'editorial', dash: 'erp'} as Record<string, string>)[first(search.sample) ?? ''] || 'saas';
  const scenario = scenarioAsked in TYPE_COMPARE_SCENARIOS ? scenarioAsked as TypeQuery['scenario'] : 'saas';
  const width = first(search.width) === '390' ? 390 : 1280;
  const mode = first(search.mode) === 'dark' ? 'dark' : 'light';
  const compareQuery: TypeQuery = {with: selection, scenario, width, mode, rawQuery};

  // 시스템이 허용하는 맥락과 맞는 목적부터 시험하고 Core 가 받는 첫 목적을 쓴다. 어느 목적도 못 받으면 Core 의 이유를 그대로 보인다.
  const selectedContexts: string[] = selected?.contexts ?? [];
  const scenarioOrder = (() => {
    const first = selectedContexts.includes('dashboard') || selectedContexts.includes('data') ? 'erp'
      : selectedContexts.includes('commerce') || selectedContexts.includes('listing') ? 'commerce'
      : selectedContexts.some(context => ['docs', 'article', 'blog'].includes(context)) ? 'editorial' : 'saas';
    return [first, 'saas', 'erp', 'editorial', 'commerce'].filter((id, i, all) => all.indexOf(id) === i) as TypeQuery['scenario'][];
  })();
  let detail: {scenario: typeof TYPE_COMPARE_SCENARIOS[keyof typeof TYPE_COMPARE_SCENARIOS]; request: Record<string, unknown>} | null = null;
  let detailReason = '';
  if (selectedId) for (const id of scenarioOrder) {
    const scenarioItem = TYPE_COMPARE_SCENARIOS[id];
    const request = {purpose: scenarioItem.purpose, content: scenarioItem.content, typeSystem: selectedId, mode, candidates: 1};
    const probe = probeDesign(request as any);
    if (probe.ok) { detail = {scenario: scenarioItem, request}; break; }
    detailReason ||= probe.reason;
  }
  const controls = selectedId ? typographyControls(selectedId, selectedContexts) : [];
  const numeralsFeature = NUMS_FEATURE[selected?.numerals as keyof typeof NUMS_FEATURE] ?? NUMS_FEATURE.proportional;

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
        // 카드 폭(약 280px)에 맞는 heading-1 역할로 같은 제목을 보인다. display-xl 은 데스크톱에서 60~80px 라 한 줄에 일곱 글자씩 여섯 줄로 갈라졌다.
        const titleRole = detail?.roles?.['heading-1'] ?? {};
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
      {selected.webfont.css ? <style>{selected.webfont.css}</style> : null}
      <h2 className="section-title" id="specimen-title">{selected.label} · 상세 Specimen</h2>
      <p className={styles.meta}>서체 조합: {selected.facePairing.label} · 역할 체계: {selected.roleScale.label} · 밀도: {DENSITY_LABEL[selected.density] ?? selected.density} · 숫자: {selected.numerals === 'tabular' ? '고정폭 숫자(tabular)' : '비례폭 숫자(proportional)'}</p>
      <p className={styles.meta} data-testid="type-fontsource">
        서체 소스: {selected.webfont.available
          ? <>
            <Link className={styles.chipLink} href={typeCatalogHref(rawQuery, {webfonts: ''})} aria-current={!webfontsOn ? 'true' : undefined}>시스템 서체</Link>{' '}
            <Link className={styles.chipLink} href={typeCatalogHref(rawQuery, {webfonts: '1'})} aria-current={webfontsOn ? 'true' : undefined}>웹폰트 사용</Link>{' '}
            {webfontsOn ? `불러오는 서체: ${selected.webfont.families.map((f: any) => `${f.family}(${f.license})`).join(', ')}` : `웹폰트 ${selected.webfont.families.map((f: any) => f.family).join(', ')}를 켤 수 있습니다. 끄면 시스템 서체만 씁니다.`}
          </>
          : '이 시스템은 웹폰트 없이 시스템 서체만 씁니다.'}
      </p>
      {detail
        ? <p><Link className={styles.chipLink} href={studioForTypeSystem(selectedId, detail.scenario.purpose)} prefetch={false}>이 시스템으로 Studio 열기</Link></p>
        : <p role="status" className="note" data-testid="type-studio-unavailable">Studio로 열 수 없습니다. Core 이유: {detailReason || 'Core 결과 없음'}</p>}

      <h3 className={styles.typeSectionTitle}>27개 역할</h3>
      <ul className={styles.typeRoleList} data-testid="type-role-list">
        {ROLE_KEYS.map(key => {
          const role = selected.roles[key];
          if (!role) return null;
          const roleStyle: CSSProperties = {fontFamily: role.fontFamily, fontSize: role.size, fontWeight: role.weight, lineHeight: role.lineHeight, letterSpacing: `${role.trackingEm ?? 0}em`, ...(role.case === 'upper' ? {textTransform: 'uppercase'} : {}), ...(NUMERIC_ROLES.has(key) ? {fontVariantNumeric: numeralsFeature} : {})};
          return <li key={key} data-role={key}>
            <div><strong>{role.label ?? key}</strong><span>{key} · {role.sizePx?.mobile}→{role.sizePx?.desktop}px · {role.weight} · 행간 {role.lineHeight} · 자간 {role.trackingEm}em</span><small>{role.recommendedPlacement ?? ''}</small></div>
            <p style={roleStyle}>{key.startsWith('display') ? SAMPLE_TITLE : (ROLE_SAMPLE[key] ?? SAMPLE_BODY)}</p>
          </li>;
        })}
      </ul>

      <h3 className={styles.typeSectionTitle}>굵기 비교</h3>
      <div className={styles.typeWeightCompare} data-testid="type-weights">{[400, 500, 600, 700].flatMap(weight => [
        <p key={`b${weight}`} data-weight={weight} style={{fontFamily: selected.roles['body-md']?.fontFamily, fontWeight: weight}}>본문 굵기 {weight} · 한글 English 日本語 2026年</p>,
        <p key={`h${weight}`} data-weight={weight} style={{fontFamily: selected.roles['display-md']?.fontFamily, fontWeight: weight}}>제목 굵기 {weight} · Display 디자인</p>,
      ])}</div>

      <h3 className={styles.typeSectionTitle}>다국어</h3>
      <div className={styles.typeWeightCompare} data-testid="type-multilingual">{[['한국어', '다람쥐 헌 쳇바퀴에 타고파'], ['English', 'The quick brown fox jumps over the lazy dog'], ['日本語', '素早い狐がのろまな犬を飛び越える'], ['中文', '敏捷的棕色狐狸跳过了懒狗']].map(([lang, text]) =>
        <p key={lang} lang={{한국어: 'ko', English: 'en', 日本語: 'ja', 中文: 'zh'}[lang]} style={{fontFamily: selected.roles['body-lg']?.fontFamily, fontSize: selected.roles['body-lg']?.size, lineHeight: selected.roles['body-lg']?.lineHeight}}><small>{lang}</small><span className={styles.typeLangText}>{text}</span></p>)}</div>

      <h3 className={styles.typeSectionTitle}>시험 문구 (Core 코퍼스)</h3>
      <ul className={styles.typeCorpus} data-testid="type-corpus">{typeView().corpus.map(sample => {
        const role = selected.roles[CORPUS_ROLE[sample.role] ?? 'body-md'];
        return <li key={sample.id} data-sample={sample.id} data-policy={sample.policy}>
          <small>{CORPUS_ROLE_LABEL[sample.role] ?? sample.role} · {CORPUS_POLICY_LABEL[sample.policy] ?? sample.policy}</small>
          <p style={{fontFamily: role?.fontFamily, fontSize: role?.size, fontWeight: role?.weight, lineHeight: role?.lineHeight, fontVariantNumeric: sample.role === 'numeric' ? numeralsFeature : undefined}}>{sample.text}</p>
        </li>;
      })}</ul>

      <h3 className={styles.typeSectionTitle}>숫자와 금융 데이터 · 코드</h3>
      <table className={styles.typeFinance} data-testid="type-finance" style={{fontFamily: selected.roles.numeric?.fontFamily, fontVariantNumeric: numeralsFeature}}>
        <caption>숫자 정렬: {selected.numerals === 'tabular' ? '고정폭(tabular)이라 자릿수가 세로로 맞습니다' : '비례폭(proportional)이라 숫자 폭이 글자마다 다릅니다'}</caption>
        <thead><tr><th scope="col">항목</th><th scope="col">금액(₩)</th><th scope="col">증감</th></tr></thead>
        <tbody>{[['매출', '1,111,111', '+4.6%'], ['비용', '8,888,888', '−12.3%'], ['순이익', '10,000,000', '+0.8%'], ['미수금', '1,000', '0.0%']].map(([name, amount, delta]) => <tr key={name}><th scope="row">{name}</th><td data-amount={amount}>{amount}</td><td>{delta}</td></tr>)}</tbody>
      </table>
      <p className={styles.typeCode} data-testid="type-code"><code style={{fontFamily: selected.roles.code?.fontFamily, fontSize: selected.roles.code?.size}}>const revenue = currencyKRW(128000); // 4.6% · npm run build</code></p>

      <h3 className={styles.typeSectionTitle}>버튼·입력·표: Core 조립 및 내보내기 결과</h3>
      <p className={styles.meta}>각각 Core의 assembleComponents가 이 시스템의 허용 맥락 안에서 조립한 결과입니다. 미리보기와 내려받는 파일은 같은 요청입니다.</p>
      <div data-testid="type-controls">{controls.map(control => <section key={control.key} data-control={control.key} data-request={control.request ? JSON.stringify(control.request) : undefined} aria-label={`${control.label} Core 결과`}>
        <h4>{control.label} <small>{control.purpose}{control.context ? ` · ${control.context} 맥락` : ''}</small></h4>
        {control.request
          ? <>
            <Thumb src={renderSrc(control.request, {kind: 'components'})} preview={{kind: 'components', request: control.request}} title={`${selected.label} ${control.label} Core 컴파일 결과`} width={1280} height={360} />
            <ul className={styles.typeExports} aria-label={`${control.label} Core에서 내보내기`}>
              {(['standalone', 'html', 'css', 'manifest'] as const).map(part => <li key={part}><a className={styles.chipLink} href={renderSrc(control.request!, {kind: 'components', part, download: true})} download data-part={part}>{({standalone: '완성 HTML', html: 'HTML 조각', css: 'CSS', manifest: 'Blueprint와 manifest'} as const)[part]} 다운로드</a></li>)}
            </ul>
          </>
          : <p role="status" className="note" data-testid="type-control-unavailable">Core 조립 제한: {control.reason}</p>}
      </section>)}</div>

      <h3 className={styles.typeSectionTitle}>같은 시스템의 반응형 Core Specimen</h3>
      {detail ? <div className={styles.typeViewportCompare}>
        <figure><figcaption>모바일 · 390px · {detail.scenario.label}</figcaption><Thumb src={renderSrc(detail.request as any)} preview={{kind: 'assemble', request: detail.request}} title={`${selected.label} 모바일 390px Core 컴파일`} width={390} height={844} /></figure>
        <figure><figcaption>데스크톱 · 1280px · {detail.scenario.label}</figcaption><Thumb src={renderSrc(detail.request as any)} preview={{kind: 'assemble', request: detail.request}} title={`${selected.label} 데스크톱 1280px Core 컴파일`} width={1280} height={800} /></figure>
      </div> : <p role="status" className="note" data-testid="type-detail-unavailable">Core 렌더 제한: 네 가지 페이지 목적 모두 이 시스템을 받지 않습니다. {detailReason}</p>}
    </section> : null}
  </PageShell>;
}
