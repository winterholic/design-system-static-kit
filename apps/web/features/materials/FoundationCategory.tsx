import Link from 'next/link';
import type {CSSProperties} from 'react';
import {valueFacts} from './FoundationSamples';
import {foundationExhibit} from './materials.server';
import {backgroundDecoration, borderDeclaration, categoryDefinitionCount, FOUNDATION_CATEGORIES, layoutPreviewGrid} from './foundations-exhibit.mjs';
import type {FoundationAxis} from './types';
import styles from './materials.module.css';

type Exhibit = NonNullable<Awaited<ReturnType<typeof foundationExhibit>>>;
type AnyRecord = Record<string, any>;
const SCOPE = {
  '--kit-border': 'var(--color-line)', '--kit-shade': 'rgb(20 22 26 / 0.18)', '--kit-action': 'var(--color-accent)',
  '--kit-text': 'var(--color-fg)', '--kit-canvas': 'var(--color-bg)', '--kit-soft': 'var(--color-surface)',
  '--kit-accentSoft': 'var(--color-surface)', '--kit-surface': 'var(--color-surface)', '--kit-muted': 'var(--color-muted)',
  '--kit-rule': 'var(--color-line)', '--kit-accent': 'var(--color-accent)',
} as CSSProperties;
const contexts = (values: string[]) => values.includes('any') ? '모든 맥락' : values.join(' · ');
const detailHref = (id: string) => `/components/${encodeURIComponent(id)}`;

function Facts({title, children}: {title: string; children: React.ReactNode}) {
  return <div className={styles.exhibitFacts}><strong>{title}</strong><div>{children}</div></div>;
}

function Spacing({data}: {data: Exhibit}) {
  return <>
    <p className={styles.intro}>각 밀도의 Core 간격 표에서 역할이 읽는 토큰을 그대로 표시합니다. 간격 단위는 모두 4px 격자입니다.</p>
    <ul className={styles.exhibitGrid}>
      {data.rows.map((material: AnyRecord) => <li key={material.id} className={styles.exhibitCard}>
        <h3>{material.density} · {material.label}</h3>
        <div className={styles.spacingSample} aria-label={`${material.density} 간격 시각 예시`}>
          {data.roles.map((role: AnyRecord) => {
            const token = material.roles[role.id];
            const px = material.tokens[token];
            return <span key={role.id} style={{'--space-demo': `${px}px`} as CSSProperties}><i aria-hidden="true" /><b>{role.label}</b><code>{token}: {px}px</code></span>;
          })}
        </div>
        <div className={styles.tokenChips}>{Object.entries(material.tokens).map(([key, value]) => <code key={key}>{key} {String(value)}px</code>)}</div>
      </li>)}
    </ul>
    <div className={styles.tableWrap} tabIndex={0} aria-label="간격 역할과 토큰 표"><table className={styles.table}><thead><tr><th>역할</th><th>속성</th><th>Core 토큰</th><th>사용 조건</th></tr></thead><tbody>{data.roles.map((role: AnyRecord) => <tr key={role.id}><th scope="row">{role.label}</th><td>{role.prop}</td><td><code>{role.token}</code></td><td>{role.id === 'icon-text' ? '아이콘과 라벨이 함께 있을 때' : `${role.label}을 조절할 때만`}</td></tr>)}</tbody></table></div>
  </>;
}

function Density({data}: {data: Exhibit}) {
  return <ul className={styles.exhibitGrid}>{data.rows.map((material: AnyRecord) => <li key={material.id} className={styles.exhibitCard}>
    <h3>{material.density === 'compact' ? 'Compact' : material.density === 'comfortable' ? 'Comfortable' : 'Spacious'}</h3>
    <div className={styles.densitySample} aria-label={`${material.density} 밀도 예시`} style={{gap: `${material.tokens.gap}px`, padding: `${material.tokens.inset}px`} as CSSProperties}>
      <span style={{minHeight: `${material.tokens.control}px`, paddingInline: `${material.tokens.insetS / 2}px`} as CSSProperties}>검색 항목</span><span style={{minHeight: `${material.tokens.control}px`, paddingInline: `${material.tokens.insetS / 2}px`} as CSSProperties}>결과 항목</span>
    </div>
    <div className={styles.tokenChips}>{Object.entries(material.tokens).map(([key, value]) => <code key={key}>{key} {String(value)}px</code>)}</div>
    <Facts title="사용 조건"><span>{material.density === 'compact' ? '밀집 표·업무 목록처럼 한 화면에 많은 항목이 필요한 곳' : material.density === 'comfortable' ? '일반적인 업무·제품 화면' : '읽기 중심 콘텐츠와 넉넉한 조작 공간이 필요한 곳'}</span></Facts>
  </li>)}</ul>;
}

function Radius({data}: {data: Exhibit}) {
  const axis = data.radius as FoundationAxis;
  return <ul className={styles.valueList}>{axis.values.map(({id, description}) => <li key={id} className={styles.valueRow}>
    <span className={styles.valueName}><strong>{id}</strong><span>{description}</span></span>
    <span className={styles.radiusSample} style={{borderRadius: `${axis.table && (axis.table as AnyRecord)[id]}px`}} aria-hidden="true" />
    <code>{valueFacts(axis, id)} · axis:radius.{id}</code>
  </li>)}{data.facets.map((facet: AnyRecord) => <li key={facet.id} className={styles.valueRow}>
    <span className={styles.valueName}><strong>{facet.id}</strong><span>표면 패싯이 지정한 반경</span></span>
    <span className={styles.radiusSample} style={{borderRadius: facet.radius}} aria-hidden="true" />
    <code>{facet.radius} · surface-facet:{facet.id}</code>
  </li>)}</ul>;
}

function Facets({data, category}: {data: Exhibit; category: 'border' | 'elevation'}) {
  const rows = data.rows as AnyRecord[];
  const elevationTable = (data.elevation?.table ?? {}) as AnyRecord;
  const facetShadows = data.facetShadows as Record<string, string>;
  return <ul className={styles.exhibitGrid}>{rows.map((facet: AnyRecord) => {
    const lift = elevationTable[facet.elevation];
    const borderValues: Record<string, string> = {none: '0', hairline: borderDeclaration('hairline'), standard: borderDeclaration('standard'), strong: borderDeclaration('strong'), double: borderDeclaration('double')};
    const borderStyle: CSSProperties = category === 'border'
      ? {border: borderValues[facet.border], boxShadow: facetShadows[facet.elevation] ?? lift?.shadow ?? 'none'}
      : {border: lift?.border ?? '1px solid var(--color-line)', boxShadow: facetShadows[facet.elevation] ?? lift?.shadow ?? 'none'};
    return <li key={facet.id} className={styles.exhibitCard}>
      <h3>{facet.id}</h3><div className={styles.facetSample} style={{...SCOPE, ...borderStyle, borderRadius: facet.radius, background: 'var(--color-bg)'}}><span>표면 예시</span></div>
      <Facts title="Core 정의"><code>radius: {facet.radius}</code><code>border: {facet.border}</code><code>elevation: {facet.elevation}</code></Facts>
      <Facts title={category === 'border' ? '테두리 토큰 값' : '깊이 토큰 값'}><code>{category === 'border' ? borderValues[facet.border] : (data.facetShadows[facet.elevation] ?? lift?.shadow ?? lift?.border ?? 'none')}</code></Facts>
      <p className={styles.cardMeta}>{facet.id === 'double-border' ? '폼·가격 맥락에 한해 사용' : category === 'border' ? '경계를 구분하거나 강조할 때 사용' : '표면 레이어의 앞뒤 관계가 필요할 때 사용'}</p>
    </li>;
  })}</ul>;
}

function Surface({data}: {data: Exhibit}) {
  const radiusTable = data.radiusTokens as Record<string, number>;
  const elevationTable = data.elevationTokens as AnyRecord;
  const facetShadows = data.facetShadows as Record<string, string>;
  return <ul className={styles.exhibitGrid}>{data.rows.map((surface: AnyRecord) => <li key={surface.id} className={styles.exhibitCard}>
    <h3>{surface.label}</h3><p className={styles.cardMeta}>{contexts(surface.contexts)}</p>
    <div className={styles.surfaceLevels}>{Object.entries(surface.levels).map(([level, spec]: [string, any]) => {
      const elevation = elevationTable[spec.elevation];
      const fill = spec.fill === 'canvas' ? 'var(--color-bg)' : spec.fill === 'soft' ? 'var(--color-surface)' : 'var(--color-bg)';
      return <div key={level} style={{...SCOPE, borderRadius: `${radiusTable[spec.radius]}px`, border: elevation?.border ?? '1px solid var(--color-line)', boxShadow: facetShadows[spec.elevation] ?? elevation?.shadow ?? 'none', background: fill}}><strong>{level}</strong><code>{spec.radius} {radiusTable[spec.radius]}px · {spec.elevation} · {spec.fill}</code></div>;
    })}</div>
    <Facts title="Core 토큰 값"><code>--kit-radius: {radiusTable[surface.levels.base.radius]}px</code><code>--kit-card-border: {elevationTable[surface.levels.base.elevation]?.border}</code><code>--kit-shadow: {facetShadows[surface.levels.base.elevation] ?? elevationTable[surface.levels.base.elevation]?.shadow}</code><code>fills: {Object.values(surface.levels).map((level: any) => level.fill).join(' · ')}</code></Facts>
    <p className={styles.cardMeta}>사용 조건: {contexts(surface.contexts)}. base는 정착된 표면, raised는 떠 있는 항목, overlay는 모달·팝오버에 씁니다.</p>
  </li>)}</ul>;
}

function Background({data}: {data: Exhibit}) {
  return <ul className={styles.exhibitGrid}>{data.rows.map((item: AnyRecord) => {
    const deco = backgroundDecoration(item.deco.css, item.deco.blur);
    return <li key={item.id} className={styles.exhibitCard}>
      <h3>{item.label}</h3><div className={styles.backgroundSample} style={{...SCOPE, ...data.backgroundTokens, ...deco, background: item.page.background} as CSSProperties}><span>{item.deco.kind === 'none' ? '읽기 바탕' : item.deco.kind}</span></div>
      <Facts title="Core 토큰 값"><code>{item.stops.map((stop: any) => Array.isArray(stop) ? `${stop[0]} ${stop[1]}% ${stop[2]}` : stop).join(' · ')}</code>{Object.entries(data.backgroundTokens).map(([key, value]) => <code key={key}>{key}: {value}</code>)}<code>{item.axes.backdrop} / {item.axes.ornament}</code></Facts>
      <p className={styles.cardMeta}>사용 조건: {contexts(item.contexts)}. 장식은 텍스트 뒤에 두고 대비를 유지합니다.</p>
    </li>;
  })}</ul>;
}

function Motion({data}: {data: Exhibit}) {
  const first = data.rows[0];
  const transition = first?.transitions?.find((item: AnyRecord) => item.state === 'hover');
  const timing = transition ? first.duration[transition.duration] : 0;
  const curve = transition ? first.easing[transition.easing].join(', ') : '0, 0, 1, 1';
  return <>
    <div className={styles.motionDemo} style={{'--motion-duration': `${timing}ms`, '--motion-easing': `cubic-bezier(${curve})`, '--motion-lift': first?.lift ?? '0px'} as CSSProperties}><button type="button">가리키거나 포커스해 전이 보기</button><span>prefers-reduced-motion: reduce에서는 이동·전이를 제거합니다.</span></div>
    <ul className={styles.exhibitGrid}>{data.rows.map((item: AnyRecord) => <li key={item.id} className={styles.exhibitCard}>
      <h3>{item.label}</h3><p className={styles.cardMeta}>duration {Object.entries(item.duration).map(([name, value]) => `${name} ${value}ms`).join(' · ')} · easing {Object.entries(item.easing as Record<string, number[]>).map(([name, value]) => `${name} cubic-bezier(${value.join(', ')})`).join(' · ')}</p>
      <div className={styles.tokenChips}>{item.transitions.map((transition: AnyRecord) => <code key={`${transition.state}-${transition.duration}`}>{transition.state}: {transition.props.join(', ')} · {transition.duration}/{transition.easing}</code>)}</div>
    </li>)}</ul>
    <h3 className={styles.subTitle}>목적별 모션 패턴 {data.patterns.length}개</h3>
    <div className={styles.tableWrap} tabIndex={0} aria-label="모션과 reduced-motion 정책"><table className={styles.table}><thead><tr><th>패턴</th><th>속성</th><th>시간·곡선·지연</th><th>reduced-motion</th></tr></thead><tbody>{data.patterns.map((pattern: AnyRecord) => <tr key={pattern.id}><th scope="row">{pattern.id}</th><td>{pattern.properties.join(', ')}</td><td>{pattern.duration} · {pattern.easing} · {pattern.delay}ms</td><td>{pattern.reducedMotion}</td></tr>)}</tbody></table></div>
  </>;
}

function Icon({data}: {data: Exhibit}) {
  const byId = new Map(data.icons.map((icon: AnyRecord) => [icon.id, icon]));
  return <ul className={styles.exhibitGrid}>{data.rows.map((area: AnyRecord) => <li key={area.id} className={styles.exhibitCard}>
    <h3>{area.area}</h3><p className={styles.cardMeta}>{area.family} · {area.viewBox} · stroke {area.strokeWidth}px · 정렬 {area.alignment} · 최소 {area.minSize}px</p>
    <ul className={styles.iconGrid}>{area.symbols.map((name: string) => {
      const icon = byId.get(name) as AnyRecord | undefined;
      return <li key={name} className={styles.iconCell}>{icon && <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{icon.paths.map((path: string, index: number) => <path key={index} d={path} fill="none" stroke="currentColor" strokeWidth={area.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />)}</svg>}<span>{name}</span></li>;
    })}</ul>
    <Facts title="권리·사용 조건"><span>{area.source.origin} · {area.source.license}</span><span>Core 내부 원본 아이콘. 의미 전달에는 접근 가능한 이름을 제공하고 장식용 SVG는 숨깁니다.</span></Facts>
  </li>)}</ul>;
}

function Layout({data}: {data: Exhibit}) {
  return <ul className={styles.exhibitGrid}>{data.rows.map((item: AnyRecord) => {
    const isPrimitive = item.id?.startsWith('layout-primitive:');
    const slots = item.slots ?? [];
    const preview = isPrimitive ? null : layoutPreviewGrid(item);
    const previewAreas = isPrimitive ? [] : [...new Set(item.bands.at(-1).areas.split(/[|\s]+/).filter((area: string) => area && area !== '_'))];
    const primitiveStyles: Record<string, CSSProperties> = {
      stack: {display: 'flex', flexDirection: 'column'}, cluster: {display: 'flex', flexWrap: 'wrap', alignContent: 'center'},
      flow: {gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}, container: {width: 'min(100%, 24rem)', marginInline: 'auto'},
      split: {gridTemplateColumns: '3fr 2fr'}, bento: {gridTemplateAreas: '"a a b" "c d d"', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'},
    };
    const sampleStyle = isPrimitive ? primitiveStyles[item.id.replace('layout-primitive:', '')] : {gridTemplateColumns: preview!.columns, gridTemplateAreas: preview!.template};
    return <li key={item.id} className={styles.exhibitCard}>
      <h3>{item.label}</h3><p className={styles.cardMeta}>{isPrimitive ? item.css : item.pattern}</p>
      <div className={styles.layoutSample} aria-label={`${item.label} 레이아웃 실제 슬롯 예시`} style={sampleStyle}>
        {(isPrimitive ? ['a', 'b', 'c', 'd'].map((area, index) => ({name: area, label: `${item.id.replace('layout-primitive:', '')} ${index + 1}`})) : slots.filter((slot: AnyRecord) => previewAreas.includes(slot.name))).map((slot: AnyRecord) => <span key={slot.name} style={isPrimitive && item.id.endsWith(':bento') ? {gridArea: slot.name} : preview && !isPrimitive ? {gridArea: slot.name} : undefined}>{slot.label ?? slot.name}</span>)}
      </div>
      <Facts title="사용 조건">{isPrimitive ? <span>배치 원형은 `{item.id}` 계열의 구조 보조 재료입니다.</span> : <><span>컨테이너 {item.container.width} · 최소 콘텐츠 폭 {item.minContent}px</span><span>{item.contexts.join(' · ')}</span><span>밀도: {item.density.allowed.join(' · ')} (기본 {item.density.default})</span></>}</Facts>
      {!isPrimitive && <div className={styles.tokenChips}>{slots.map((slot: AnyRecord) => <code key={slot.name}>{slot.name}: {slot.accepts.slice(0, 3).join(', ')}{slot.accepts.length > 3 ? '…' : ''}</code>)}</div>}
      <Link className={styles.detailLink} href={detailHref(item.id)}>상세 렌더·토큰·구성 보기<span className="visually-hidden">: {item.label}</span></Link>
    </li>;
  })}</ul>;
}

function Chart({data}: {data: Exhibit}) {
  return <><style>{data.chartCss}</style><div className={styles.tokenChips} aria-label="차트 Core 색 토큰">{Object.entries(data.chartTokens).filter(([key]) => /^--kit-chart(?:[1-6]|-grid)$/.test(key)).map(([key, value]) => <code key={key}>{key} {String(value)}</code>)}</div><ul className={styles.exhibitGrid}>{data.rows.map((item: AnyRecord) => <li key={item.id} className={styles.exhibitCard}>
    <h3>{item.label}</h3><div className={styles.chartSample} style={data.chartTokens} dangerouslySetInnerHTML={{__html: item.svg}} />
    <p className={styles.cardMeta}>Core 대표 프리셋: {item.presetLabel}</p>
    <Link className={styles.detailLink} href={detailHref(item.presetId)}>차트 설정·데이터·토큰 상세 보기<span className="visually-hidden">: {item.presetLabel}</span></Link>
  </li>)}</ul></>;
}

export async function FoundationCategory({id}: {id: string}) {
  const category = FOUNDATION_CATEGORIES.find(item => item.id === id) ?? FOUNDATION_CATEGORIES[0];
  const data = await foundationExhibit(category.id);
  if (!data) return null;
  return <section className={styles.exhibitSection} data-category-panel={category.id} aria-labelledby="foundation-category-title">
    <header className={styles.exhibitHeader}><div><p className={styles.cardMeta}>Foundations · {category.label} · 정의 {category.id === 'chart' ? data.chartCount : categoryDefinitionCount(category.id, data)}개</p><h2 id="foundation-category-title">{category.title}</h2><p>{category.summary}</p></div><p className={styles.usage}><strong>사용 조건</strong>{category.usage}</p></header>
    {category.id === 'spacing' && <Spacing data={data} />}
    {category.id === 'density' && <Density data={data} />}
    {category.id === 'radius' && <Radius data={data} />}
    {(category.id === 'border' || category.id === 'elevation') && <Facets data={data} category={category.id} />}
    {category.id === 'surface' && <Surface data={data} />}
    {category.id === 'background' && <Background data={data} />}
    {category.id === 'motion' && <Motion data={data} />}
    {category.id === 'icon' && <Icon data={data} />}
    {category.id === 'layout' && <Layout data={data} />}
    {category.id === 'chart' && <Chart data={data} />}
  </section>;
}
