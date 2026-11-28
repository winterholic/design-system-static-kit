import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {readState, requestOf, withMaterialChoice, writeState, type AssembleState} from '@/features/platform/assemble-state';
import {material, materials, probeDesign} from '@/features/platform/platform.server';
import {chartPresetChoices} from '@/features/platform/chart-compare.server';
import {withChartPreset} from '@/features/platform/chart-compare.mjs';
import {LAYOUT_PAGE_PATTERN} from '@/features/platform/material-library.mjs';
import {renderSrc} from '@/features/platform/render-url';
import {PURPOSES, shortId} from '@/features/platform/labels';
import type {AssembleRequest} from '@/features/platform/types';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: 'Explore 재료 비교', description: '플랫폼 레지스트리 재료를 골라 Core 조립 결과를 비교합니다.'};
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value ?? '';

// key 는 비교 축 이름, param 은 조립 상태(주소)의 키다. 밀도는 하나의 상태(density)라서 축도 하나다.
const AXES = [
  {key: 'style', label: '디자인 맥락', kind: 'style-context'}, {key: 'palette', label: '팔레트 계열', kind: 'palette'}, {key: 'set', label: '서브토큰 세트', kind: 'subtoken-set'},
  {key: 'type', label: '타이포 시스템', kind: 'type-system'}, {key: 'family', label: '시각 패밀리', kind: 'family'},
  {key: 'layout', label: '레이아웃', kind: 'layout'}, {key: 'component', label: '컴포넌트', kind: 'base-component'},
  {key: 'surface', label: '표면', kind: 'surface'}, {key: 'motion', label: '모션', kind: 'motion'}, {key: 'spacing', label: '밀도·간격 토큰', kind: 'spacing', param: 'density'},
  {key: 'background', label: '배경', kind: 'background'}, {key: 'media', label: '미디어', kind: 'media'},
  {key: 'state', label: '상태 패턴', kind: 'state-pattern'},
  {key: 'shell', label: '셸', kind: 'axis-value', prefix: 'axis-value:shell.'}, {key: 'width', label: '폭', kind: 'axis-value', prefix: 'axis-value:width.'},
  {key: 'chart', label: '시각화', kind: 'chart-preset'}, {key: 'mode', label: '색 모드', kind: 'mode'},
] as const;
type Axis = (typeof AXES)[number];
type Option = {value: string; label: string; reason?: string};
const FAMILY_HOST = 'card-surface';
const paramOf = (axis: Axis) => ('param' in axis ? axis.param : axis.key);
const PREFIX: Record<string, string> = {style: 'style-context:', palette: 'palette:', set: 'subtoken-set:', type: 'type-system:', family: 'family:', layout: 'layout:', component: 'base-component:', surface: 'surface:', motion: 'motion:', spacing: 'spacing:', background: 'background:', media: 'media:', state: 'state-pattern:', chart: 'chart-preset:'};
const idOf = (axis: Axis, value: string) => axis.key === 'mode' ? value : 'prefix' in axis ? `${axis.prefix}${value}` : `${PREFIX[axis.key]}${value}`;

/** 짧은 값(주소·select 값)으로 통일한다. 접두가 붙은 전체 id 도 받아 준다(공유 링크 호환). */
function choices(axis: Axis): Option[] {
  if (axis.kind === 'mode') return [{value: 'light', label: '라이트'}, {value: 'dark', label: '다크'}];
  if (axis.kind === 'chart-preset') return chartPresetChoices().map(item => ({value: shortId(item.id), label: item.label}));
  if ('prefix' in axis) return materials(axis.kind).filter(m => m.id.startsWith(axis.prefix)).map(m => ({value: m.id.slice(axis.prefix.length), label: m.label}));
  if (axis.kind === 'spacing') return materials(axis.kind).map(m => ({value: typeof m.density === 'string' ? m.density : shortId(m.id), label: m.label}));
  return materials(axis.kind).map(m => ({value: shortId(m.id), label: m.label}));
}
const normalize = (axis: Axis, raw: string, options: Option[]) => options.find(o => o.value === raw || idOf(axis, o.value) === raw)?.value ?? '';

function Field({name, label, value, options, includeAuto = false}: {name: string; label: string; value: string; options: Option[]; includeAuto?: boolean}) {
  return <label className={styles.field}>{label}<select name={name} defaultValue={value}>
    {includeAuto ? <option value="">Core 추천</option> : null}
    {options.map(option => <option key={option.value} value={option.value} disabled={Boolean(option.reason)} title={option.reason}>{option.label}{option.reason ? ' (쓸 수 없음)' : ''}</option>)}
  </select></label>;
}

/** 이 축을 option 값으로 바꾼 조립 요청. 나머지 필터는 그대로다. 요청을 만들 수 없으면 null. */
function requestFor(state: AssembleState, axis: Axis, value: string): AssembleRequest | null {
  if (axis.kind === 'chart-preset') {
    const base = requestOf(state);
    return base ? withChartPreset(base as Record<string, unknown>, idOf(axis, value)) as AssembleRequest : null;
  }
  return requestOf(withMaterialChoice(state, axis.key, idOf(axis, value)));
}
const stateFor = (state: AssembleState, axis: Axis, value: string) => axis.kind === 'chart-preset' ? state : withMaterialChoice(state, axis.key, idOf(axis, value));

/** Core 가 이 선택을 받는지 시험해 못 받으면 이유를 붙인다. layout 은 페이지 패턴이 있는 재료만 조립 요청으로 고를 수 있다. */
function withReasons(state: AssembleState, axis: Axis, options: Option[]): Option[] {
  return options.map(option => {
    if (axis.kind === 'layout' && !(option.value in LAYOUT_PAGE_PATTERN)) {
      const reuses = (material(idOf(axis, option.value))?.reuses as string[] | undefined) ?? [];
      return {...option, reason: `${option.label}는 페이지 전체 패턴이 아니라 ${reuses.length ? reuses.join(', ') : '부분 구성'} 단위라서 조립 요청의 레이아웃(pattern)으로 고를 수 없습니다.`};
    }
    const request = requestFor(state, axis, option.value);
    if (!request) return {...option, reason: '페이지 목적을 먼저 고르세요.'};
    const probe = probeDesign(request);
    return probe.ok ? option : {...option, reason: probe.reason};
  });
}

export default async function ExploreMaterialsPage({searchParams}: {searchParams: Promise<Search>}) {
  const query = await searchParams;
  const params = new URLSearchParams(Object.entries(query).flatMap(([key, value]) => Array.isArray(value) ? value.map(item => [key, item]) : value === undefined ? [] : [[key, value]]) as [string, string][]);
  const read = readState(params);
  const requested: AssembleState = {...read, purpose: read.purpose ?? 'saas-landing'};
  const axes = AXES as readonly Axis[];
  const compareKey = first(query.compare) === 'density' ? 'spacing' : first(query.compare);
  const selectedAxis = axes.find(axis => axis.key === compareKey) ?? axes.find(axis => axis.key === 'palette')!;
  // 시각 패밀리는 배치된 컴포넌트에 입혀지는 재료라 컴포넌트가 없으면 두 결과가 같다. 카드 컴포넌트를 양쪽에 똑같이 놓고 비교한다(Core 가 받을 때만).
  const familyHost = selectedAxis.key === 'family' && !requested.component && ((candidate: AssembleState) => { const r = requestOf(candidate); return r && probeDesign(r).ok; })({...requested, component: FAMILY_HOST});
  const state: AssembleState = familyHost ? {...requested, component: FAMILY_HOST} : requested;
  const options = withReasons(state, selectedAxis, choices(selectedAxis));
  const usable = options.filter(option => !option.reason);
  const baseValue = selectedAxis.kind === 'chart-preset' ? '' : (state[paramOf(selectedAxis) as keyof AssembleState] as string | null) ?? '';
  // 주소의 left·right 가 이 축에 없으면(축을 바꿔 다시 보낸 경우) 이 축의 쓸 수 있는 선택으로 채운다.
  const leftValue = normalize(selectedAxis, first(query.left), options) || (usable.find(o => o.value === baseValue) ?? usable[0] ?? options[0])?.value || '';
  const rightValue = normalize(selectedAxis, first(query.right), options) || (usable.find(o => o.value !== leftValue) ?? options.find(o => o.value !== leftValue))?.value || '';
  const sides = [leftValue, rightValue].map(value => {
    const option = options.find(o => o.value === value);
    if (!option) return null;
    const request = requestFor(state, selectedAxis, value);
    const probe = request ? probeDesign(request) : null;
    return {option, request, probe, studio: probe?.ok && selectedAxis.kind !== 'chart-preset' ? writeState({...stateFor(state, selectedAxis, value), step: 'swap'}) : null};
  });
  return <PageShell eyebrow="Explore · Materials" title="재료 조합 비교" lead="등록된 재료를 골라 같은 페이지 목적에 적용합니다. 비교 결과는 Core 조립·검증을 거친 선택 두 개만 보여 줍니다.">
    <p><Link href="/explore">완성 디자인 목록으로 돌아가기</Link></p>
    <form method="get" action="/explore/materials" className={styles.materialFilters} aria-label="재료 필터와 비교 조건">
      <Field name="purpose" label="페이지 목적" value={state.purpose ?? 'saas-landing'} options={PURPOSES.map(p => ({value: p.id, label: p.label}))} />
      {axes.filter(axis => axis.key !== 'mode' && axis.key !== 'chart').map(axis => <Field key={axis.key} name={paramOf(axis)} label={axis.label} value={state[paramOf(axis) as keyof AssembleState] as string ?? ''} options={choices(axis)} includeAuto />)}
      <Field name="mode" label="라이트·다크" value={state.mode ?? ''} options={choices(axes.find(axis => axis.key === 'mode')!)} includeAuto />
      <Field name="compare" label="비교할 축" value={selectedAxis.key} options={axes.map(axis => ({value: axis.key, label: axis.label}))} />
      <Field name="left" label="왼쪽 재료" value={leftValue} options={options} />
      <Field name="right" label="오른쪽 재료" value={rightValue} options={options} />
      <button className={styles.chipLink} type="submit">조건 적용하고 비교</button>
    </form>
    <p className={styles.meta}>필터 값은 주소에 기록되어 새로고침·공유 링크에서도 복원됩니다. 비교 축은 같은 이름의 필터보다 우선합니다. 현재 목적: {PURPOSES.find(p => p.id === state.purpose)?.label}. 비교할 수 없는 재료는 선택 목록에서 비활성이며 이유가 붙습니다.</p>
    <section aria-labelledby="compare-results" className={styles.materialResults} data-testid="compare-results" data-axis={selectedAxis.key}>
      <h2 className="section-title" id="compare-results">{selectedAxis.label} 비교</h2>
      {selectedAxis.key === 'family' && state.component ? <p className={styles.meta} data-testid="family-host">시각 패밀리는 컴포넌트에 입히는 재료라서 두 결과에 같은 컴포넌트({materials('base-component').find(m => shortId(m.id) === state.component)?.label ?? state.component}) 3개를 놓았습니다.</p> : null}
      <p className={styles.meta}>{selectedAxis.kind === 'chart-preset' ? '같은 월별 매출 데이터를 두 시각화에 넣었고 나머지 조건은 같습니다.' : `같은 목적·나머지 재료를 유지하고 ${selectedAxis.label}만 바꿨습니다.`}</p>
      <div className={styles.materialPair}>
        {sides.map((side, index) => side ? <article className={styles.materialResult} key={`${index}-${side.option.value}`} data-testid="compare-result" data-side={index === 0 ? 'left' : 'right'} data-value={side.option.value} data-request={side.request ? JSON.stringify(side.request) : undefined}>
          <h3>{index === 0 ? '기준' : '비교'} · {side.option.label}</h3>
          {side.request && side.probe?.ok
            ? <Thumb src={renderSrc(side.request)} title={`${side.option.label} Core 조립 미리보기`} width={390} height={720} />
            : <p role="status" className="note" data-testid="compare-unavailable">이 조합은 선택할 수 없습니다. 이유: {side.option.reason ?? (side.probe && !side.probe.ok ? side.probe.reason : 'Core 검증 결과가 없습니다.')}</p>}
          {side.studio ? <Link className={styles.chipLink} href={side.studio}>이 조합을 Studio에서 편집</Link> : null}
        </article> : <p key={index} className={styles.meta}>이 축에 비교할 재료가 부족합니다.</p>)}
      </div>
    </section>
  </PageShell>;
}
