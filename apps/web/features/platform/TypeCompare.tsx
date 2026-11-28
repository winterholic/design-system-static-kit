import Link from 'next/link';
import {Thumb} from '@/features/explore/Thumb';
import {materials, probeDesign} from './platform.server';
import {renderSrc} from './render-url';
import {typeCatalogHref, toggleTypeSelection} from './type-catalog-state.mjs';
import {shortId} from './labels';
import {studioForTypeSystem} from '@/features/materials/studio-link';
import styles from './platform.module.css';

const WIDTHS = [{id: 1280, label: '데스크톱 1280'}, {id: 390, label: '모바일 390'}] as const;
const SCENARIOS = {
  saas: {label: 'SaaS 랜딩', purpose: 'saas-landing', content: {name: 'Morrow', title: '팀의 일을 한곳에서 연결하세요', description: '계획부터 결과까지 한 화면에서 확인합니다. 월 ₩18,000부터 시작하세요.'}},
  erp: {label: 'ERP 대시보드', purpose: 'work-dashboard', content: {name: 'Morrow 운영', title: '운영 현황 Operations', kpis: [{label: '활성 사용자 Active', value: '12,840'}, {label: '전환율 Conversion', value: '4.6%'}], table: {title: '최근 주문', columns: ['주문', '고객', '금액'], rows: [['#10421', '김서연', '₩128,000'], ['#10420', 'Daniel Park', '₩54,900']]}}},
  editorial: {label: '에디토리얼', purpose: 'editorial-docs', content: {name: 'Field Notes', title: '읽히는 속도를 설계하다', lead: '한글과 English, 숫자가 함께 놓인 문장을 비교합니다.', sections: [{title: '좋은 위계', body: '읽는 사람은 형태보다 먼저 리듬과 간격을 느낍니다.'}]}},
  commerce: {label: '커머스', purpose: 'commerce', content: {name: 'Morrow Market', title: '매일 쓰는 물건을 오래 쓰도록', description: '새 시즌 상품과 가격, 재고 정보를 확인하세요.', products: [{name: 'Field Jacket', price: '₩189,000'}, {name: 'Canvas Bag', price: '₩42,000'}]}},
  mobile: {label: '모바일 앱', purpose: 'saas-landing', content: {name: 'Morrow Mobile', title: '오늘의 흐름을 빠르게 확인하세요', description: '손안에서 알림과 작업을 확인합니다. 12,840명이 사용 중입니다.'}},
} as const;
type ScenarioId = keyof typeof SCENARIOS;
export type TypeQuery = {with: string[]; scenario: ScenarioId; width: 390 | 1280; mode: 'light' | 'dark'; rawQuery: string};

/** 선택된 네 시스템만 실제 Core 미리보기로 조립한다. URL은 push 상태라 뒤로 가기로 선택을 복원한다. */
export function TypeCompare({query}: {query: TypeQuery}) {
  const all = materials('type-system');
  const selected = new Set(query.with);
  const scenario = SCENARIOS[query.scenario];
  const width = WIDTHS.find(item => item.id === query.width)!;
  const change = (patch: Record<string, string>) => typeCatalogHref(query.rawQuery, patch);

  return <section id="compare" aria-labelledby="type-compare-title" data-testid="type-compare">
    <h2 className="section-title" id="type-compare-title">같은 콘텐츠로 비교</h2>
    <p className="prose">최대 네 시스템만 렌더링합니다. 선택과 보기 조건은 주소에 저장되어 뒤로 가기와 공유 링크에서 복원됩니다.</p>
    <div className={styles.toolbar}>
      <div className={styles.seg} role="group" aria-label="비교할 콘텐츠">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map(id => <Link key={id} href={change({scenario: id})} className={styles.segItem} aria-current={id === query.scenario ? 'true' : undefined}>{SCENARIOS[id].label}</Link>)}
      </div>
      <div className={styles.seg} role="group" aria-label="비교 화면 폭">
        {WIDTHS.map(item => <Link key={item.id} href={change({width: String(item.id)})} className={styles.segItem} aria-current={item.id === query.width ? 'true' : undefined}>{item.label}</Link>)}
      </div>
    </div>
    <p className={styles.meta} aria-live="polite">현재 {query.with.length}/4개 선택 · {scenario.label} · {width.label}</p>
    <ul className={styles.chips} aria-label="타이포 시스템 선택">
      {all.map(type => {
        const id = shortId(type.id), active = selected.has(id), atLimit = query.with.length >= 4 && !active;
        const next = toggleTypeSelection(query.with, id);
        return <li key={type.id}>{atLimit
          ? <button className={styles.chipsDisabled} type="button" disabled aria-label={`${type.label}, 네 개 선택 한도에 도달해 선택할 수 없음`}>{type.label}</button>
          : <Link href={change({with: next.join(',')})} aria-current={active ? 'true' : undefined} aria-pressed={active}>{active ? '✓ ' : '+ '}{type.label}</Link>}
        </li>;
      })}
    </ul>
    {query.with.length ? <ul className={styles.grid} data-cols={query.with.length > 2 ? '3' : '2'} data-testid="type-grid">
      {query.with.map(id => {
        const type = all.find(item => item.id === `type-system:${id}`);
        if (!type) return null;
        const request = {purpose: scenario.purpose, content: scenario.content, typeSystem: type.id, mode: query.mode, candidates: 1};
        const probe = probeDesign(request);
        return <li key={type.id} className={styles.cell} data-system={id}>
          <h3>{type.label}</h3>
          {probe.ok ? <Thumb src={renderSrc(request)} preview={{kind: 'assemble', request}} title={`${type.label} · ${scenario.label} · ${width.label}`} width={width.id} height={width.id === 390 ? 844 : 800} /> : <p className="note" role="status">Core가 이 조합을 허용하지 않습니다. {probe.reason}</p>}
          <p className={styles.meta}>맥락: {(type.contexts ?? []).join(' · ')}</p>
          <Link className={styles.chipLink} href={studioForTypeSystem(type.id, scenario.purpose)} prefetch={false}>이 시스템으로 Studio 열기</Link>
        </li>;
      })}
    </ul> : <p className="note">위 카탈로그에서 비교할 시스템을 고르세요.</p>}
  </section>;
}

export const TYPE_COMPARE_SCENARIOS = SCENARIOS;
