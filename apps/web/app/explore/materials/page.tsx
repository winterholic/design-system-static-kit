import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {readState, requestOf, withMaterialChoice, writeState} from '@/features/platform/assemble-state';
import {materials, probeDesign} from '@/features/platform/platform.server';
import {chartPresetChoices} from '@/features/platform/chart-compare.server';
import {renderSrc} from '@/features/platform/render-url';
import {PURPOSES, shortId} from '@/features/platform/labels';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: 'Explore 재료 비교', description: '플랫폼 레지스트리 재료를 골라 Core 조립 결과를 비교합니다.'};
type Search = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value ?? '';
const AXES = [
  {key: 'style', label: '디자인 맥락', kind: 'style-context'}, {key: 'palette', label: '팔레트 계열', kind: 'palette'}, {key: 'set', label: '서브토큰 세트', kind: 'subtoken-set'},
  {key: 'type', label: '타이포 시스템', kind: 'type-system'}, {key: 'family', label: '시각 패밀리', kind: 'family'},
  {key: 'layout', label: '레이아웃', kind: 'layout'}, {key: 'component', label: '컴포넌트', kind: 'base-component'},
  {key: 'surface', label: '표면', kind: 'surface'}, {key: 'motion', label: '모션', kind: 'motion'}, {key: 'spacing', label: '간격 토큰', kind: 'spacing'},
  {key: 'background', label: '배경', kind: 'background'}, {key: 'media', label: '미디어', kind: 'media'},
  {key: 'state', label: '상태 패턴', kind: 'state-pattern'}, {key: 'density', label: '밀도', kind: 'axis-value', prefix: 'axis-value:density.'},
  {key: 'shell', label: '셸', kind: 'axis-value', prefix: 'axis-value:shell.'}, {key: 'width', label: '폭', kind: 'axis-value', prefix: 'axis-value:width.'},
  {key: 'chart', label: '시각화', kind: 'chart-preset'}, {key: 'mode', label: '색 모드', kind: 'mode'},
] as const;
type Axis = (typeof AXES)[number];
const PREFIX: Record<string, string> = {style: 'style-context:', palette: 'palette:', set: 'subtoken-set:', type: 'type-system:', family: 'family:', layout: 'layout:', component: 'base-component:', surface: 'surface:', motion: 'motion:', spacing: 'spacing:', background: 'background:', media: 'media:', state: 'state-pattern:', chart: 'chart-preset:'};

function choices(axis: Axis): {value: string; label: string}[] {
  if (axis.kind === 'mode') return [{value: 'light', label: '라이트'}, {value: 'dark', label: '다크'}];
  if (axis.kind === 'chart-preset') return chartPresetChoices().map(item => ({value: item.id, label: item.label}));
  const values = materials(axis.kind);
  if ('prefix' in axis) return values.filter(m => m.id.startsWith(axis.prefix)).map(m => ({value: m.id, label: m.label}));
  return values.map(m => ({value: shortId(m.id), label: m.label}));
}

function Field({name, label, value, options, includeAuto = false}: {name: string; label: string; value: string; options: {value: string; label: string}[]; includeAuto?: boolean}) {
  return <label className={styles.field}>{label}<select name={name} defaultValue={value}>
    {includeAuto ? <option value="">Core 추천</option> : null}
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select></label>;
}

export default async function ExploreMaterialsPage({searchParams}: {searchParams: Promise<Search>}) {
  const query = await searchParams;
  const params = new URLSearchParams(Object.entries(query).flatMap(([key, value]) => Array.isArray(value) ? value.map(item => [key, item]) : value === undefined ? [] : [[key, value]]) as [string, string][]);
  const state = readState(params);
  const axes = AXES as readonly Axis[];
  const selectedAxis = axes.find(axis => axis.key === first(query.compare));
  const leftId = first(query.left), rightId = first(query.right);
  const selectedChoices = selectedAxis ? choices(selectedAxis) : [];
  const baseValue = selectedAxis ? (selectedAxis.key === 'spacing' ? state.density : state[selectedAxis.key as keyof typeof state]) as string | null : null;
  const defaultLeft = selectedAxis ? ('prefix' in selectedAxis ? selectedChoices.find(x => x.value.endsWith(`.${baseValue}`))?.value : selectedChoices.find(x => x.value === baseValue)?.value) : undefined;
  const leftValue = leftId || defaultLeft || selectedChoices[0]?.value || '';
  const rightValue = rightId || selectedChoices.find(x => x.value !== leftValue)?.value || '';
  const leftOption = selectedChoices.find(option => option.value === leftValue);
  const rightOption = selectedChoices.find(option => option.value === rightValue);
  const materialId = (axis: Axis, value: string) => axis.key === 'mode' || ('prefix' in axis && value.startsWith(axis.prefix)) ? value : `${PREFIX[axis.key] ?? ''}${value}`;
  const chartCompare = selectedAxis?.key === 'chart';
  const leftState = selectedAxis && leftOption && !chartCompare ? withMaterialChoice(state, selectedAxis.key, materialId(selectedAxis, leftOption.value)) : null;
  const rightState = selectedAxis && rightOption && !chartCompare ? withMaterialChoice(state, selectedAxis.key, materialId(selectedAxis, rightOption.value)) : null;
  const leftRequest = leftState ? requestOf(leftState) : null;
  const rightRequest = rightState ? requestOf(rightState) : null;
  const leftProbe = leftRequest ? probeDesign(leftRequest) : null;
  const rightProbe = rightRequest ? probeDesign(rightRequest) : null;
  return <PageShell eyebrow="Explore · Materials" title="재료 조합 비교" lead="등록된 재료를 골라 같은 페이지 목적에 적용합니다. 비교 결과는 Core 조립·검증을 거친 선택 두 개만 보여 줍니다.">
    <p><Link href="/explore">완성 디자인 목록으로 돌아가기</Link></p>
    <form method="get" action="/explore/materials" className={styles.materialFilters} aria-label="재료 필터와 비교 조건">
      <Field name="purpose" label="페이지 목적" value={state.purpose ?? 'saas-landing'} options={PURPOSES.map(p => ({value: p.id, label: p.label}))} />
      {axes.filter(axis => axis.key !== 'mode' && axis.key !== 'chart').map(axis => <Field key={axis.key} name={axis.key} label={axis.label} value={state[axis.key as keyof typeof state] as string ?? ''} options={choices(axis)} includeAuto />)}
      <Field name="mode" label="색 모드" value={state.mode ?? ''} options={choices(axes.find(axis => axis.key === 'mode')!)} includeAuto />
      <Field name="compare" label="비교할 축" value={selectedAxis?.key ?? 'palette'} options={axes.map(axis => ({value: axis.key, label: axis.label}))} />
      <Field name="left" label="왼쪽 재료" value={leftValue} options={selectedChoices} />
      <Field name="right" label="오른쪽 재료" value={rightValue} options={selectedChoices} />
      <button className={styles.chipLink} type="submit">조건 적용하고 비교</button>
    </form>
    <p className={styles.meta}>필터 값은 주소에 기록되어 새로고침·공유 링크에서도 복원됩니다. 현재 선택: {state.purpose ? PURPOSES.find(p => p.id === state.purpose)?.label : '페이지 목적을 고르세요'}.</p>
    {selectedAxis && leftOption && rightOption && (chartCompare || leftRequest && rightRequest) ? <section aria-labelledby="compare-results" className={styles.materialResults}>
      <h2 className="section-title" id="compare-results">{selectedAxis.label} 비교</h2>
      <p className={styles.meta}>같은 목적·나머지 재료를 유지하고 {selectedAxis.label}만 바꿨습니다.</p>
      <div className={styles.materialPair}>
        {[[leftOption, leftRequest, leftProbe], [rightOption, rightRequest, rightProbe]].map(([option, request, probe], index) => {
          const choice = option as {label: string; value: string};
          const req = request as NonNullable<typeof leftRequest> | null;
          const checked = probe as ReturnType<typeof probeDesign> | null;
          const comparisonState = chartCompare ? null : withMaterialChoice(state, selectedAxis.key, materialId(selectedAxis, choice.value));
          return <article className={styles.materialResult} key={`${index}-${choice.value}`}>
            <h3>{index === 0 ? '기준' : '비교'} · {choice.label}</h3>
            {chartCompare ? <iframe className={styles.materialChartFrame} src={`/explore/chart-preview/${encodeURIComponent(shortId(choice.value))}`} title={`${choice.label} 같은 데이터 차트 미리보기`} sandbox="" loading="lazy" /> : checked?.ok && req ? <Thumb src={renderSrc(req)} title={`${choice.label} Core 조립 미리보기`} width={390} height={720} /> : <p role="status" className="note">이 조합은 선택할 수 없습니다. 이유: {checked && !checked.ok ? checked.reason : 'Core 검증 결과가 없습니다.'}</p>}
            {!chartCompare && checked?.ok && comparisonState ? <Link className={styles.chipLink} href={writeState({...comparisonState, step: 'swap'})}>이 조합을 Studio에서 편집</Link> : null}
          </article>;
        })}
      </div>
    </section> : <p className={styles.meta}>비교 축과 양쪽 재료를 고른 뒤 비교를 시작하세요.</p>}
  </PageShell>;
}
