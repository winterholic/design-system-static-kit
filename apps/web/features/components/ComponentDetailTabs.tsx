'use client';

import {useEffect, useMemo, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button, ButtonLink} from '@/ui';
import {startUrl} from '@/features/studio/url';
import {PLAYGROUND_KEYS, variantKey} from '@/lib/api/variant-keys.mjs';
import {CopyBlock} from './CopyBlock';
import {buildTabs, exportedSources, playgroundAxes} from './detail-model.mjs';
import type {ComponentView} from './spec.server';
import type {PlaygroundOption} from './playground.server';
import styles from './components.module.css';

type Props = {view: ComponentView; note?: string};
type Selection = Record<string, string | number | boolean>;
const AXIS_LABELS: Record<string, string> = {
  palette: '팔레트', subtokenSet: '서브토큰 세트', visualFamily: '시각 패밀리', typeSystem: '타이포 시스템',
  size: '크기', density: '밀도', appearance: '외형', state: '상태', mode: '라이트·다크', exampleText: '예시 콘텐츠', viewport: '뷰포트',
};
const AXIS_KEYS = ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'size', 'density', 'appearance', 'state', 'mode', 'exampleText', 'viewport'];

function initialSelection(view: ComponentView, params: URLSearchParams): Selection {
  const supportedAxes = playgroundAxes(view);
  const selected: Selection = view.detail
    ? Object.fromEntries(supportedAxes.map((axis: string) => [axis, (view.playground.defaults as Record<string, string>)[axis] ?? '']))
    : {...view.playground.defaults, viewport: params.get('viewport') === '390' ? '390' : '1280'};
  for (const group of view.variantGroups) {
    const value = params.get(variantKey(group.name));
    selected[variantKey(group.name)] = group.values.find(candidate => String(candidate) === value) ?? group.defaultValue;
  }
  // 상태 변형 축이 없는 재료만 재료 계약의 상태 목록을 쓴다. 변형 축이 있으면 그 기본값이 기준이다.
  if (view.material?.states.values.length && !view.variantGroups.some(group => group.name === 'state')) selected.state = params.get('state') && view.material.states.values.includes(params.get('state')!) ? params.get('state')! : view.material.states.values[0];
  for (const axis of ['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode'] as const) {
    const option = view.playground.axes[axis].find(item => item.value === params.get(axis) && item.ok);
    if (option) selected[axis] = option.value;
  }
  if (!view.detail) {
    const groupNames = new Set(view.variantGroups.map(group => group.name));
    const exampleText = Object.entries(view.example ?? {}).find(([key, value]) => !['type', 'id'].includes(key) && typeof value === 'string' && !(groupNames.has(key) && view.variantGroups.find(group => group.name === key)?.values.some(candidate => String(candidate) === value)))?.[1];
    const text = params.get('exampleText');
    selected.exampleText = text && text.length <= 200 ? text : typeof exampleText === 'string' ? exampleText : '';
  }
  return selected;
}

function renderHref(type: string, selection: Selection) {
  if (typeof selection.variant === 'string') return `/components/${type}/render/${encodeURIComponent(selection.variant)}`;
  const query = new URLSearchParams();
  for (const [axis, value] of Object.entries(selection)) if (String(value)) query.set(axis, String(value));
  return `/components/${type}/render${query.size ? `?${query}` : ''}`;
}

function Preview({type, selection, width}: {type: string; selection: Selection; width: number | '100%'}) {
  const src = renderHref(type, selection);
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setReason(null);
    fetch(src).then(async response => {
      if (response.ok) return;
      const message = (await response.text()).trim();
      if (live) setReason(message || `Core가 이 선택을 거부했습니다 (${response.status}).`);
    }).catch(() => { if (live) setReason('Core 선택 검증 결과를 가져오지 못했습니다.'); });
    return () => { live = false; };
  }, [src]);
  return reason
    ? <p className={styles.note} role="status">렌더되지 않았습니다. Core 검증 결과: {reason}</p>
    // key 로 새 iframe 을 만든다. 같은 iframe 의 src 를 바꾸면 부모 세션 히스토리에 항목이 늘어 뒤로 가기가 iframe 만 되돌린다.
    : <iframe key={src} title={`${type} 컴파일 미리보기`} className={styles.frame} src={src} style={{width, maxWidth: '100%', height: 420, marginInline: width === 390 ? 'auto' : undefined}} />;
}

function AxisControl({axis, label = AXIS_LABELS[axis], options, value, disabledReason, onChange}: {axis: string; label?: string; options: (string | number | boolean | PlaygroundOption)[]; value: string; disabledReason?: string; onChange: (value: string) => void}) {
  const normalized = options.map(option => typeof option === 'object' ? option : ({value: String(option), label: String(option), ok: true}));
  const selected = normalized.find(option => option.value === value);
  const reason = disabledReason ?? (selected && !selected.ok ? selected.reason : undefined);
  return <label className={styles.variantField}>
    {label}
    <select aria-label={label} value={value} disabled={Boolean(disabledReason)} title={reason} onChange={event => onChange(event.target.value)}>
      {normalized.length ? normalized.map(option => <option key={option.value} value={option.value} disabled={!option.ok} title={option.reason}>{option.label}{option.ok ? '' : ' · 비호환'}</option>) : <option value="">계약에 없음</option>}
    </select>
    {reason ? <small>{reason}</small> : null}
  </label>;
}

export function ComponentDetailTabs({view, note}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const tabs = useMemo(() => buildTabs(view), [view]);
  // 탭과 선택의 원천은 URL이다. 화면이 URL 반영보다 앞서가면 직후 뒤로 가기가 이전 문서로 빠진다.
  const search = useSearchParams().toString();
  const activeTab = useMemo(() => {
    const tab = new URLSearchParams(search).get('tab') ?? 'overview';
    return tabs.some(item => item.id === tab) ? tab : 'overview';
  }, [tabs, search]);
  const urlSelection = useMemo(() => initialSelection(view, new URLSearchParams(search)), [view, search]);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  useEffect(() => setDraftContent(null), [search]);
  const selection: Selection = draftContent === null ? urlSelection : {...urlSelection, exampleText: draftContent};
  const [axisOptions, setAxisOptions] = useState(view.playground.axes);
  const [variantIndex, setVariantIndex] = useState(0);
  const [exportResult, setExportResult] = useState<{html: string; css: string; tokens: string; blueprint: string} | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const viewport: 390 | 1280 = selection.viewport === '390' ? 390 : 1280;
  const availabilityRequest = JSON.stringify({palette: selection.palette, subtokenSet: selection.subtokenSet, visualFamily: selection.visualFamily, typeSystem: selection.typeSystem, density: selection.density, mode: selection.mode});

  useEffect(() => {
    if (view.detail) return;
    let live = true;
    const query = new URLSearchParams({selection: availabilityRequest});
    fetch(`/components/${view.type}/availability?${query}`, {cache: 'no-store'}).then(async response => {
      if (!response.ok) return;
      const result = await response.json();
      if (live && result.axes) setAxisOptions(result.axes);
    }).catch(() => {});
    return () => { live = false; };
  }, [availabilityRequest, view.type, view.detail]);

  useEffect(() => {
    if (activeTab !== 'code') return;
    const query = new URLSearchParams({selection: JSON.stringify(selection)});
    let live = true;
    setExportResult(null); setExportError(null);
    fetch(`/components/${view.type}/export?${query}`, {cache: 'no-store'}).then(async response => {
      if (!response.ok) throw new Error((await response.text()) || `Core 컴파일 오류 (${response.status})`);
      const payload = await response.json();
      if (live) setExportResult(exportedSources(payload.files));
    }).catch(error => { if (live) setExportError(error instanceof Error ? error.message : '내보내기 결과를 읽지 못했습니다.'); });
    return () => { live = false; };
  }, [activeTab, selection, view.type]);

  const updateUrl = (tab: string, nextSelection = selection, nextViewport = viewport) => {
    const next = new URLSearchParams(window.location.search);
    if (tab === 'overview') next.delete('tab'); else next.set('tab', tab);
    for (const key of [...AXIS_KEYS, ...view.variantGroups.map(group => variantKey(group.name))]) next.delete(key);
    for (const [key, value] of Object.entries(nextSelection)) {
      const group = view.variantGroups.find(item => variantKey(item.name) === key);
      if (!group || String(value) !== String(group.defaultValue)) next.set(key, String(value));
    }
    if (nextViewport !== 1280) next.set('viewport', String(nextViewport));
    else if (next.get('viewport') === '1280') next.delete('viewport');
    const query = next.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, {scroll: false});
  };

  const updateSelection = (axis: string, value: string) => {
    const group = view.variantGroups.find(item => variantKey(item.name) === axis);
    const groupValue = group?.values.find(candidate => String(candidate) === value);
    const registered = (['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode'] as string[]).includes(axis)
      ? axisOptions[axis as keyof typeof axisOptions].find(option => option.value === value && option.ok)?.value
      : undefined;
    const stateValue = axis === 'state' && view.material?.states.values.includes(value) ? value : undefined;
    const option = groupValue ?? registered ?? stateValue;
    if (axis === 'exampleText') {
      if (value.length > 200) return;
      setDraftContent(value); return;
    }
    if (option === undefined) return;
    updateUrl(activeTab, {...selection, [axis]: option});
  };

  // 수동 활성화 탭: 방향키는 포커스만 옮기고 Enter·Space(버튼 기본 동작)가 탭을 연다.
  const moveTabFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[target].focus();
  };

  const stateValues = view.material?.states.values ?? [];
  // Variants 는 외형 축을 우선한다. 외형 축이 없는 재료(select-control 의 mode 등)는 크기·상태가 아닌 첫 변형 축을 비교한다.
  const appearanceGroup = view.variantGroups.find(group => /appearance|style|visual/i.test(group.name)) ?? view.variantGroups.find(group => !/size|state/i.test(group.name));
  const variants = appearanceGroup ? appearanceGroup.values.map(value => ({id: String(value), ok: true})) : view.variants;
  const selectedVariant = variants[Math.min(variantIndex, Math.max(0, variants.length - 1))];
  const variantSelection: Selection = appearanceGroup && selectedVariant
    ? {...selection, [variantKey(appearanceGroup.name)]: selectedVariant.id}
    : selectedVariant ? {variant: selectedVariant.id} : {};
  const sizeGroup = view.variantGroups.find(group => /size/i.test(group.name));
  const stateGroup = view.variantGroups.find(group => /state/i.test(group.name));
  const axisConfig = (axis: string) => {
    const group = PLAYGROUND_KEYS.includes(axis) ? undefined : view.variantGroups.find(item => item.name.toLowerCase() === axis.toLowerCase());
    if (axis === 'viewport') return {options: ['390', '1280'], key: 'viewport', reason: undefined};
    if (group) return {options: group.values, key: variantKey(group.name), reason: undefined};
    if (['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode'].includes(axis)) return {options: axisOptions[axis as keyof typeof axisOptions], key: axis, reason: axis === 'visualFamily' && !view.playground.base ? '이 컴포넌트는 시각 패밀리와 연결된 기반 구성원 계약이 없습니다.' : undefined};
    if (axis === 'state' && stateValues.length) return {options: stateValues.map(value => ({value, label: value, ok: Boolean(view.playground.base), reason: view.playground.base ? undefined : '플랫폼 기반 구성원 렌더 계약이 없어 상태를 컴파일할 수 없습니다.'})), key: 'state', reason: view.playground.base ? undefined : '플랫폼 기반 구성원 렌더 계약이 없어 상태를 컴파일할 수 없습니다.'};
    return {options: [], key: axis, reason: '이 컴포넌트 계약에 이 축의 선택값이 없습니다.'};
  };

  // Playground 11축이 이미 다루는 변형(크기·외형·상태) 밖의 부품 변형 축. 빠지면 shape·mode·search 같은 계약 축을 고를 수 없다.
  const extraGroups = view.variantGroups.filter(group => !['size', 'appearance', 'state'].includes(group.name.toLowerCase()));
  const studioHref = startUrl({catalogVersion: '2.6.0', component: view.type, componentAxes: Object.fromEntries(view.variantGroups.map(group => [group.name, String(selection[variantKey(group.name)] ?? group.defaultValue)]))});
  const renderPreview = (chosen: Selection) => <Preview type={view.type} selection={chosen} width={viewport === 390 ? 390 : '100%'} />;
  const visibleAxes = playgroundAxes(view);

  return <section className={styles.detailTabs} aria-label={`${view.label} 상세`}>
    <div className={styles.detailTabList} role="tablist" aria-label={`${view.label} 상세 탭`} onKeyDown={moveTabFocus}>
      {tabs.map(tab => <button key={tab.id} id={`tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={activeTab === tab.id ? `panel-${tab.id}` : undefined} tabIndex={activeTab === tab.id ? 0 : -1} className={styles.detailTab} onClick={() => updateUrl(tab.id)}>{tab.label}</button>)}
    </div>
    <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className={styles.detailPanel}>
      {activeTab === 'overview' ? <>
        <iframe title={`${view.label} 기본 컴파일 결과`} className={styles.frame} src={`/components/${view.type}/render`} style={{height: 420}} />
        {note ? <p className={styles.note}>{note}</p> : null}
        {view.material ? <><h2 className="section-title">재료 계약</h2><dl className={styles.ctx}>
          <div><dt>종류 · 분류</dt><dd><code>{view.material.kind}</code> · {view.material.category} · {view.groupLabel}</dd></div>
          <div><dt>도입 · 재료 버전</dt><dd>카탈로그 {view.material.since} · 재료 {view.material.version}</dd></div>
          <div><dt>맥락 · 품질</dt><dd>{view.material.contexts.join(', ')} · {view.material.quality.status}{view.material.preset ? ' · 프리셋' : ''}</dd></div>
          {view.material.responsive ? <div><dt>반응형</dt><dd>{view.material.responsive.strategy}{view.material.responsive.note ? ` — ${view.material.responsive.note}` : ''}</dd></div> : null}
          <div><dt>Blueprint 연결</dt><dd><code>{view.material.blueprint?.node ?? `${view.material.blueprint?.field}=${view.material.blueprint?.value ?? ''}`}</code>{view.material.blueprint?.since ? ` · ${view.material.blueprint.since}부터` : ''}</dd></div>
        </dl>
        {view.limitations.length ? <><h3 className="section-title">제약과 미지원</h3><ul className={styles.limits}>{view.material.tags.filter(tag => tag.startsWith('forbidden:') || tag.startsWith('unsupported:')).map(tag => <li key={tag}>{tag.startsWith('forbidden:') ? '조합 제한' : '미지원'} · <code>{tag.replace(/^(?:forbidden|unsupported):/, '')}</code></li>)}</ul></> : null}</> : null}
        <h2 className="section-title">허용 속성</h2>
        {view.fields.length ? <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="허용 속성 표"><table className={styles.table}>
          <thead><tr><th scope="col">이름</th><th scope="col">필수</th><th scope="col">형태</th><th scope="col">허용 값·제약</th></tr></thead>
          <tbody>{view.fields.map(field => <tr key={field.name}><th scope="row"><code>{field.name}</code></th><td>{field.required ? '필수' : '선택'}</td><td><code>{field.kind}</code></td><td><div className={styles.values}>{field.detail.map(detail => <code key={detail}>{detail}</code>)}</div></td></tr>)}</tbody>
        </table></div> : <p>이 부품은 자식만 받고 자체 속성이 없습니다.</p>}
      </> : null}
      {activeTab === 'variants' ? <>
        <h2 className="section-title">Variants</h2>
        {variants.length ? <><p>{selectedVariant?.id ?? '지원 변형 없음'} · {variantIndex + 1}/{variants.length}</p>{selectedVariant ? renderPreview(variantSelection) : null}<div className={styles.pager}>
          <Button variant="secondary" disabled={variantIndex === 0} onClick={() => setVariantIndex(i => Math.max(0, i - 1))}>이전 변형</Button>
          <Button variant="secondary" disabled={variantIndex >= variants.length - 1} onClick={() => setVariantIndex(i => Math.min(variants.length - 1, i + 1))}>다음 변형</Button>
        </div></> : <p>외형 변형이 등록되어 있지 않습니다.</p>}
      </> : null}
      {activeTab === 'states' ? <>
        <h2 className="section-title">States</h2><div className={styles.variantGroups}>{stateValues.map(state => <Button key={state} variant="secondary" aria-pressed={selection.state === state} disabled={stateGroup ? !stateGroup.values.some(value => String(value) === state) : state !== 'default'} title={(stateGroup ? !stateGroup.values.some(value => String(value) === state) : state !== 'default') ? '렌더 변형으로 지원되지 않는 상태입니다.' : undefined} onClick={() => stateGroup && updateSelection(variantKey(stateGroup.name), state)}>{state}</Button>)}</div>
        {stateGroup ? renderPreview({...selection, [variantKey(stateGroup.name)]: selection[variantKey(stateGroup.name)] ?? stateGroup.defaultValue}) : <p className={styles.note}>선언된 상태 전이는 아래 계약을 따릅니다. 이 부품의 렌더 계약에 상태 축이 없어 상태 미리보기는 제한됩니다.</p>}
        <ul className={styles.transitions}>{(view.material?.states.transitions ?? []).map((transition, index) => <li key={index}><code>{transition.from} → {transition.to}</code> · {transition.trigger}</li>)}</ul>
      </> : null}
      {activeTab === 'sizes' ? <>
        <h2 className="section-title">Sizes</h2>
        {sizeGroup ? <><div className={styles.variantGroups}>{sizeGroup.values.map(size => <Button key={String(size)} variant="secondary" aria-pressed={String(selection[variantKey(sizeGroup.name)]) === String(size)} onClick={() => updateSelection(variantKey(sizeGroup.name), String(size))}>{String(size)}</Button>)}</div>{renderPreview({...selection, [variantKey(sizeGroup.name)]: selection[variantKey(sizeGroup.name)] ?? sizeGroup.defaultValue})}</> : <p>크기 축이 등록되어 있지 않습니다.</p>}
      </> : null}
      {activeTab === 'playground' ? <>
        <h2 className="section-title">Playground</h2>
        <div className={styles.variantGroups}>{AXIS_KEYS.filter(axis => visibleAxes.includes(axis)).map(axis => {
          const config = axisConfig(axis);
          const current = axis === 'viewport' ? String(viewport) : String(selection[config.key] ?? config.options[0] ?? '');
          if (axis === 'exampleText') return <label key={axis} className={styles.variantField}>{AXIS_LABELS[axis]}<input aria-label={AXIS_LABELS[axis]} maxLength={200} value={String(selection.exampleText ?? '')} onChange={event => updateSelection('exampleText', event.target.value)} onBlur={() => draftContent !== null && updateUrl(activeTab)} /></label>;
          return <AxisControl key={axis} axis={axis} options={config.options} value={current} disabledReason={config.reason} onChange={value => {
            if (axis === 'viewport') updateUrl(activeTab, {...selection, viewport: value}, Number(value) as 390 | 1280);
            else updateSelection(config.key, value);
          }} />;
        })}</div>
        {extraGroups.length ? <div className={styles.variantGroups} role="group" aria-label="부품 변형 축">{extraGroups.map(group => <AxisControl key={group.name} axis={variantKey(group.name)} label={PLAYGROUND_KEYS.includes(group.name) ? `${group.name} (부품 변형)` : group.name} options={group.values} value={String(selection[variantKey(group.name)] ?? group.defaultValue)} onChange={value => updateSelection(variantKey(group.name), value)} />)}</div> : null}
        {renderPreview(selection)}
        {view.variantGroups.length ? <p className={styles.openStudio}><ButtonLink href={studioHref} variant="secondary">선택한 부품을 Studio에서 열기</ButtonLink></p> : null}
      </> : null}
      {activeTab === 'tokens' ? <><h2 className="section-title">Tokens</h2><ul className={styles.chips}>{(view.material?.tokens ?? []).map(token => <li key={token}><code>{token}</code></li>)}</ul></> : null}
      {activeTab === 'code' ? <><h2 className="section-title">Code</h2>{exportError ? <p className={styles.note} role="status">검증된 선택 결과를 가져오지 못했습니다: {exportError}</p> : null}{exportResult ? <>
        <h3 className="section-title">HTML · index.html</h3><CopyBlock text={exportResult.html} label="컴파일 HTML" />
        <h3 className="section-title">CSS · tokens.css</h3><CopyBlock text={exportResult.css} label="컴파일 CSS" />
        <h3 className="section-title">Tokens · tokens.json</h3><CopyBlock text={exportResult.tokens} label="컴파일 토큰 JSON" />
        <h3 className="section-title">Blueprint · blueprint.json</h3><CopyBlock text={exportResult.blueprint} label="컴파일 Blueprint JSON" />
      </> : <p role="status">선택한 계약을 Core에서 컴파일하고 있습니다.</p>}</> : null}
      {activeTab === 'accessibility' ? <><h2 className="section-title">Accessibility</h2><dl className={styles.ctx}>
        <div><dt>접근성 규칙</dt><dd>{view.material?.a11y?.rules?.length ? view.material.a11y.rules.map((rule: string) => <code key={rule}>{rule} </code>) : '등록된 규칙이 없습니다.'}</dd></div>
        <div><dt>역할</dt><dd>{view.material?.a11y?.role ?? '등록된 역할 설명이 없습니다.'}</dd></div>
        <div><dt>키보드</dt><dd>{view.material?.a11y?.keyboard ?? '등록된 키보드 계약이 없습니다.'}</dd></div>
        <div><dt>필수 속성과 제약</dt><dd>{view.fields.filter(field => field.required || /aria|label/i.test(field.name)).map(field => <code key={field.name}>{field.name}{field.required ? ' (필수)' : ''}</code>)}</dd></div>
      </dl></> : null}
      {activeTab === 'composition' ? <><h2 className="section-title">Composition</h2><dl className={styles.ctx}>
        <div><dt>허용 부모</dt><dd>{view.parents.length ? view.parents.map(type => <code key={type}>{type} </code>) : '없음'}</dd></div>
        {view.pageTypes.requiredBy.length ? <div><dt>반드시 필요한 페이지 유형</dt><dd>{view.pageTypes.requiredBy.join(', ')}</dd></div> : null}
        {view.pageTypes.forbiddenIn.length ? <div><dt>쓸 수 없는 페이지 유형</dt><dd>{view.pageTypes.forbiddenIn.join(', ')}</dd></div> : null}
        <div><dt>허용 자식</dt><dd>{view.children ? <>{view.children.allowed.map((type: string, index: number) => <code key={`${type}-${index}`}>{type} </code>)} · {view.children.min}~{view.children.max}개</> : view.detail?.composition?.children?.length ? view.detail.composition.children.map((type: string, index: number) => <code key={`${type}-${index}`}>{type} </code>) : '자식을 받지 않습니다'}</dd></div>
        <div><dt>필요한 슬롯</dt><dd>{view.material?.purposeContracts.flatMap(contract => Object.keys(contract.needs ?? {})).length ? [...new Set(view.material.purposeContracts.flatMap(contract => Object.keys(contract.needs ?? {})))].map(slot => <code key={slot}>{slot} </code>) : '필요 슬롯 없음'}</dd></div>
        <div><dt>관련 목적 컴포넌트</dt><dd>{view.material?.purposeContracts?.length ? view.material.purposeContracts.map((contract: any) => <code key={contract.id}>{contract.label} </code>) : view.detail?.composition?.related?.length ? view.detail.composition.related.map((item: string, index: number) => <code key={`${item}-${index}`}>{item} </code>) : view.related.map(row => <code key={row.type}>{row.label} </code>)}</dd></div>
        <div><dt>금지 조합</dt><dd>{view.material?.purposeContracts.flatMap(contract => contract.forbidden.map(rule => ({...rule, purpose: contract.label}))).length ? view.material.purposeContracts.flatMap(contract => contract.forbidden.map(rule => <span key={`${contract.id}-${rule.id}`}><code>{rule.id}</code> · {Object.entries((rule as any).when ?? {}).map(([key, value]) => `${key}=${String(value)}`).join(', ')} · {rule.why}; </span>)) : '등록된 금지 조합이 없습니다.'}</dd></div>
      </dl></> : null}
    </div>
  </section>;
}
