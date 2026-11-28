import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {Unavailable} from '@/features/platform/Unavailable';
import {AssembleContentForm, BackButton, SwapSelect} from '@/features/platform/AssembleControls';
import {STEPS, STEP_LABEL, readState, requestOf, writeState, type AssembleState, type Step} from '@/features/platform/assemble-state';
import {assembleDesign, material, materials, platformReady, probeDesign, recommend} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {LAYOUT_PAGE_PATTERN, patternOfLayout} from '@/features/platform/material-library.mjs';
import {PURPOSES, purposeOf, shortId} from '@/features/platform/labels';
import type {AssembleRequest, Candidate, Material} from '@/features/platform/types';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: '조립 | Studio', description: '페이지 유형을 고르고 디자인 방향, 후보, 재료를 바꿔 가며 실행 가능한 코드로 조립합니다.'};
type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};
const text = (r: {reason?: string}[] | undefined) => (r ?? []).map(x => x.reason).filter(Boolean) as string[];
const label = (id: string | null | undefined) => (id ? material(id)?.label ?? shortId(id) : '자동');

function StepBar({state}: {state: AssembleState}) {
  const at = STEPS.indexOf(state.step);
  return (
    <ol className={styles.steps} aria-label="조립 단계" data-testid="step-bar">
      {STEPS.map((s, i) => {
        const reachable = state.purpose || s === 'purpose';
        return (
          <li key={s} aria-current={s === state.step ? 'step' : undefined} data-done={i < at ? 'true' : undefined}>
            {reachable ? <Link href={writeState({...state, step: s, pending: null})}>{i + 1}. {STEP_LABEL[s]}</Link> : <span>{i + 1}. {STEP_LABEL[s]}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/** 새 요청이 거부되면 거부 이유와 함께 가장 바깥의 선택부터 비워(추천에 맡겨) 허용되는 상태를 찾는다. */
function repair(state: AssembleState): {state: AssembleState; dropped: {what: string; reason: string}[]} {
  const dropped: {what: string; reason: string}[] = [];
  let cur = state;
  for (const key of ['type', 'set', 'palette', 'family', 'layout', 'component', 'state', 'surface', 'motion', 'background', 'media', 'style', 'shell', 'width', 'density'] as const) {
    const req = requestOf(cur);
    if (!req) break;
    const p = probeDesign(req);
    if (p.ok) break;
    if (cur[key]) { dropped.push({what: `${key}=${cur[key]}`, reason: p.reason}); cur = {...cur, [key]: null}; }
  }
  return {state: cur, dropped};
}

export default async function AssemblePage({searchParams}: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map(x => [k, x]) : v === undefined ? [] : [[k, v]])) as [string, string][]);
  const state = readState(q);
  if (!platformReady()) return <PageShell eyebrow="Studio" title="조립"><Unavailable what="조립 흐름" /></PageShell>;
  const purpose = purposeOf(state.purpose);
  const step: Step = purpose ? state.step : 'purpose';
  const s = {...state, step};
  const here = (patch: Partial<AssembleState>) => writeState({...s, pending: null, ...patch});
  const req = requestOf(s);
  const edited = Object.keys(s.content).length > 0;

  return (
    <PageShell eyebrow="Studio · 조립" title="디자인을 조립해 코드로 받기" lead="페이지 유형을 고르면 디자인 방향과 후보를 비교하고, 재료를 바꿔 가며 실행 가능한 코드까지 만듭니다. 모든 화면은 Core 가 방금 조립한 결과입니다.">
      <StepBar state={s} />
      <div className={styles.toolbar}>
        <BackButton />
        <span className={styles.meta} data-testid="selection-summary">{purpose ? `${purpose.label}${s.style ? ` · 방향 ${label(`style-context:${s.style}`)}` : ''}${s.palette ? ` · ${label(`palette:${s.palette}`)}` : ''}${s.set ? ` · ${label(`subtoken-set:${s.set}`)}` : ''}${s.type ? ` · ${label(`type-system:${s.type}`)}` : ''}${s.family ? ` · ${label(`family:${s.family}`)}` : ''}` : '페이지 유형을 골라 주세요'}</span>
      </div>
      {step === 'purpose' && <PurposeStep state={s} edited={edited} here={here} />}
      {step === 'direction' && purpose && <DirectionStep state={s} here={here} />}
      {step === 'compare' && purpose && req && <CompareStep state={s} here={here} />}
      {step === 'swap' && purpose && req && <SwapStep state={s} here={here} />}
      {step === 'content' && purpose && req && <ContentStep state={s} />}
      {step === 'export' && purpose && req && <ExportStep state={s} />}
    </PageShell>
  );
}

type StepProps = {state: AssembleState; here: (patch: Partial<AssembleState>) => string};

function PurposeStep({state, edited, here}: StepProps & {edited: boolean}) {
  const pending = state.pending ? purposeOf(state.pending) : null;
  if (pending) {
    // 사용자가 고친 콘텐츠가 있을 때 페이지 유형을 바꾸면 무엇이 바뀌고 내 문구가 남는지를 먼저 보여 준다.
    const fixed = repair({...state, purpose: pending.id, pending: null});
    const next = fixed.state;
    const out = assembleDesign({...requestOf(next)!, candidates: 1});
    const html = out.ok ? out.value.candidates[0].value.html : '';
    const kept = Object.entries(state.content).filter(([, v]) => html.includes(v.replace(/&/g, '&amp;')));
    const lost = Object.entries(state.content).filter(([f]) => !kept.some(([k]) => k === f));
    return (
      <section aria-labelledby="impact-title" data-testid="impact-panel">
        <h2 className="section-title" id="impact-title">{pending.label}로 바꿀까요?</h2>
        <dl className="prose">
          <dt>바뀌는 페이지</dt><dd>{purposeOf(state.purpose)?.label ?? '없음'} → {pending.label}</dd>
          <dt>내가 고친 문구</dt><dd data-testid="impact-kept">{Object.keys(state.content).length}곳 중 {kept.length}곳이 새 페이지에 그대로 들어가고 {lost.length}곳은 들어가지 않습니다{lost.length ? ` (${lost.map(([f]) => f).join(', ')})` : ''}.</dd>
          <dt>맞지 않아 비우는 재료</dt><dd data-testid="impact-dropped">{fixed.dropped.length ? fixed.dropped.map(d => `${d.what}: ${d.reason}`).join(' / ') : '없음 (현재 재료를 그대로 씁니다)'}</dd>
        </dl>
        {!out.ok ? <p role="alert" className="note">이 조합으로는 조립되지 않습니다: {out.errors.map(e => e.message).join(' ')}</p> : null}
        <p className="btn-row">
          <Link href={writeState({...next, step: 'direction', pending: null})} className={styles.chipLink} data-testid="impact-apply">바꾸기</Link>
          <Link href={here({purpose: state.purpose, step: 'purpose'})} className={styles.chipLink}>취소</Link>
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="purpose-title">
      <h2 className="section-title" id="purpose-title">무엇을 만들까요?</h2>
      <ul className={styles.grid} data-cols="3" data-testid="purpose-grid">
        {PURPOSES.map(p => {
          const request: AssembleRequest = {purpose: p.id, candidates: 1};
          const go = edited && state.purpose && state.purpose !== p.id ? here({pending: p.id}) : writeState({...state, purpose: p.id, style: null, step: 'direction', pending: null, ...(state.purpose && state.purpose !== p.id ? {type: null} : {})});
          return (
            <li key={p.id} className={styles.cell} data-purpose={p.id}>
              <Thumb src={renderSrc(request)} title={`${p.label} 예시`} />
              <h3>{p.label}</h3>
              <p className={styles.meta}>{p.blurb}</p>
              <Link href={go} className={styles.chipLink} aria-current={state.purpose === p.id ? 'true' : undefined}>{p.label} 선택</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DirectionStep({state, here}: StepProps) {
  const purpose = purposeOf(state.purpose)!;
  const rec = recommend({kind: 'style-context', context: purpose.context});
  const ranked = rec.ok ? rec.value.ranked.slice(0, 6) : [];
  return (
    <section aria-labelledby="dir-title">
      <h2 className="section-title" id="dir-title">어떤 분위기로 만들까요?</h2>
      <p className="prose">{purpose.label}에 어울리는 스타일 맥락을 추천 순서로 보여 줍니다. 방향을 고르면 모서리, 그림자, 모션, 셸이 함께 정해집니다.</p>
      <ul className={styles.grid} data-cols="3" data-testid="direction-grid">
        {ranked.map(r => {
          const request = {...requestOf({...state, style: shortId(r.id)})!, candidates: 1};
          const probe = probeDesign(request);
          return (
            <li key={r.id} className={styles.cell} data-style={shortId(r.id)}>
              {probe.ok ? <Thumb src={renderSrc(request)} title={`${label(r.id)} 방향`} /> : <p className="note">{probe.reason}</p>}
              <h3>{label(r.id)}</h3>
              <p className={styles.meta}>{((material(r.id)?.mood as string[] | undefined) ?? []).join(' · ')}</p>
              <ul className={styles.reasons}>{(text(r.reasons).length ? text(r.reasons).slice(0, 2) : [`${purpose.label}의 맥락(${purpose.context})에 맞는 스타일입니다.`]).map(t => <li key={t}>{t}</li>)}</ul>
              {probe.ok ? <Link className={styles.chipLink} href={here({style: shortId(r.id), step: 'compare'})}>이 방향으로 계속</Link> : null}
            </li>
          );
        })}
      </ul>
      <p><Link href={here({style: null, step: 'compare'})} className={styles.chipLink}>방향 없이 후보 보기</Link></p>
    </section>
  );
}

function CompareStep({state, here}: StepProps) {
  const request = requestOf(state, 4)!;
  const out = assembleDesign(request);
  if (!out.ok) return <p role="alert" className="note">{out.errors.map(e => `${e.code}: ${e.message}`).join(' / ')}</p>;
  const {candidates, blocked, comparison} = out.value;
  const pick = (c: Candidate) => {
    const sel = c.selection as {palette?: string; subtokenSet?: string; typeSystem?: string; families?: Record<string, string>};
    const fam = sel.families ? Object.values(sel.families)[0] : null;
    return here({palette: sel.palette ? shortId(sel.palette) : null, set: sel.subtokenSet ? shortId(sel.subtokenSet) : null, type: sel.typeSystem ? shortId(sel.typeSystem) : null, family: fam ? shortId(fam) : state.family, step: 'swap'});
  };
  return (
    <section aria-labelledby="cmp-title">
      <h2 className="section-title" id="cmp-title">후보 {candidates.length}개</h2>
      <ul className={styles.grid} data-cols="3" data-testid="candidates">
        {candidates.map((c, i) => (
          <li key={c.id} className={styles.cell} data-rank={c.rank}>
            <Thumb src={renderSrc(request, {index: i})} title={`후보 ${c.rank}`} />
            <h3>후보 {c.rank} <span className={styles.tag} data-tone={c.quality.ok ? 'good' : 'bad'}>{c.quality.ok ? '품질 검사 통과' : '검사 실패'}</span></h3>
            <p className={styles.meta}>{c.decisions.filter(d => d.slot !== 'layout.pattern').map(d => `${shortId(d.id)}(${d.source === 'intent' ? '고름' : '추천'})`).join(' · ')}</p>
            <ul className={styles.reasons}>{c.reasons.slice(0, 3).map(t => <li key={t}>{t}</li>)}</ul>
            <Link href={pick(c)} className={styles.chipLink}>이 후보로 계속</Link>
          </li>
        ))}
      </ul>
      {comparison?.against?.length ? <ul className={styles.reasons} data-testid="comparison">{comparison.against.flatMap(a => a.sentences ?? (a.summary ? [a.summary] : [])).slice(0, 4).map(t => <li key={t}>{t}</li>)}</ul> : null}
      <h2 className="section-title">막힌 후보</h2>
      {blocked.length ? <ul className={styles.rejected} data-testid="blocked">{blocked.slice(0, 8).map((b, i) => <li key={b.id ?? i}><strong>{b.id ? label(b.id) : '조합'}</strong>{b.blocked.slice(0, 2).map(x => <span key={x.reason}>{x.reason}</span>)}</li>)}</ul> : <p className={styles.meta} data-testid="blocked">이 요청에서 막힌 후보는 없습니다.</p>}
    </section>
  );
}

/** 고를 수 없는 이유: 추천이 막은 것 → 맥락 밖 → Core 조립이 이 요청에서 거부한 것 순서로 붙인다. 이유가 없으면 고를 수 있다. */
function options(mats: Material[], ranked: Set<string> | null, blocked: Map<string, string>, probe: (m: Material) => AssembleRequest, tail?: (m: Material) => string | null) {
  return mats.map(m => {
    let reason = blocked.get(m.id) ?? (ranked && !ranked.has(m.id) ? tail?.(m) ?? '어울리는 후보에 들지 않습니다.' : null);
    if (!reason) { const p = probeDesign(probe(m)); if (!p.ok) reason = p.reason; }
    return {value: shortId(m.id), label: m.label, ...(reason ? {disabled: true, reason} : {})};
  });
}

function SwapStep({state, here}: StepProps) {
  const purpose = purposeOf(state.purpose)!;
  const request = requestOf(state)!;
  const out = assembleDesign(request);
  const repaired = out.ok ? {state, dropped: []} : repair(state);
  const anchors = [state.palette ? `palette:${state.palette}` : null, state.set ? `subtoken-set:${state.set}` : null].filter(Boolean) as string[];
  const blockedOf = (kind: string, selected: string[], extra: Record<string, unknown> = {}) => {
    const r = recommend({kind, selected, ...extra});
    return {ranked: r.ok ? new Set(r.value.ranked.map(x => x.id)) : null, blocked: new Map((r.ok ? r.value.blocked : []).map(b => [b.id, b.blocked.map(x => x.reason).join(' ')]))};
  };
  const sets = blockedOf('subtoken-set', state.palette ? [`palette:${state.palette}`] : []);
  const types = blockedOf('type-system', anchors, {context: purpose.context, fit: true});
  const fams = blockedOf('family', anchors);
  const others = Object.fromEntries(['surface', 'motion', 'background', 'media'].map(k => [k, blockedOf(k, anchors, {context: purpose.context})])) as Record<'surface' | 'motion' | 'background' | 'media', ReturnType<typeof blockedOf>>;
  const pals = blockedOf('palette', state.set ? [`subtoken-set:${state.set}`] : []);
  const axisOptions = (axis: 'shell' | 'width' | 'density') => materials('axis-value').filter(m => m.id.startsWith(`axis-value:${axis}.`)).map(m => {
    const value = m.id.slice(`axis-value:${axis}.`.length);
    const p = probeDesign({...request, [axis]: value});
    return {value, label: m.label ?? value, ...(p.ok ? {} : {disabled: true, reason: p.reason})};
  });
  const layoutOptions = materials('layout').map(m => {
    const id = shortId(m.id);
    // pattern 으로 조립되는 layout 은 페이지 패턴 재료(`reuses: pattern:*`)뿐이다. 나머지는 컴포넌트·프리미티브 단위라 요청 필드가 없다.
    if (!(id in LAYOUT_PAGE_PATTERN)) return {value: id, label: m.label, disabled: true, reason: `${m.label}는 페이지 전체 패턴이 아니라 ${(((material(m.id)?.reuses as string[] | undefined) ?? []).join(', ')) || '부분 구성'} 단위라서 조립 요청의 레이아웃(pattern)으로 고를 수 없습니다.`};
    const p = probeDesign({...request, pattern: patternOfLayout(id)});
    return {value: id, label: m.label, ...(p.ok ? {} : {disabled: true, reason: p.reason})};
  });
  const contextOptions = materials('style-context').map(m => {
    const p = probeDesign({...request, styleContext: m.id});
    return {value: shortId(m.id), label: m.label, ...(p.ok ? {} : {disabled: true, reason: p.reason})};
  });
  const componentOptions = materials('base-component').map(m => {
    const p = probeDesign({...request, components: [1, 2, 3].map(n => ({base: m.id, content: {id: `c${n}`, title: `${m.label} ${n}`, body: `${m.label} 예시 ${n}`}}))});
    return {value: shortId(m.id), label: m.label, ...(p.ok ? {} : {disabled: true, reason: p.reason})};
  });
  const stateOptions = materials('state-pattern').map(m => {
    const pattern = shortId(m.id);
    const p = probeDesign({...request, states: {[pattern.split('-')[0]]: m.id}});
    return {value: pattern, label: m.label, ...(p.ok ? {} : {disabled: true, reason: p.reason})};
  });
  const spacingOptions = materials('spacing').map(m => {
    const density = typeof m.density === 'string' ? m.density : shortId(m.id);
    const p = probeDesign({...request, density});
    return {value: density, label: m.label, ...(p.ok ? {} : {disabled: true, reason: p.reason})};
  });
  const iconOptions = materials('icon').map(m => ({value: shortId(m.id), label: m.label, disabled: true, reason: 'Core assembleDesign 요청에는 아이콘 영역 선택 필드가 없어 결과에 반영할 수 없습니다.'}));
  return (
    <section aria-labelledby="swap-title">
      <h2 className="section-title" id="swap-title">재료를 바꿔 보세요</h2>
      <div className={styles.split}>
        <div className={styles.controls} data-testid="swap-controls">
          <SwapSelect id="s-palette" label="팔레트" param="palette" value={state.palette ?? ''} placeholder="추천에 맡김" options={options(materials('palette'), null, pals.blocked, m => ({...request, palette: m.id}))} />
          <SwapSelect id="s-set" label="서브토큰 세트" param="set" value={state.set ?? ''} placeholder="추천에 맡김" options={options(materials('subtoken-set'), null, sets.blocked, m => ({...request, subtokenSet: m.id}))} />
          <SwapSelect id="s-type" label="타이포 시스템" param="type" value={state.type ?? ''} placeholder="추천에 맡김" options={options(materials('type-system'), types.ranked, types.blocked, m => ({...request, typeSystem: m.id}), m => `${m.label}는 ${(m.contexts ?? []).join(', ')} 맥락용입니다.`)} />
          <SwapSelect id="s-family" label="컴포넌트 패밀리" param="family" value={state.family ?? ''} placeholder="추천에 맡김" hint={state.component ? undefined : '배치된 컴포넌트에 입혀지는 재료입니다. 컴포넌트(카드)를 함께 고르면 미리보기에 반영됩니다.'} options={options(materials('family'), null, fams.blocked, m => ({...request, families: [m.id]}))} />
          <SwapSelect id="s-style-context" label="디자인 맥락" param="style" value={state.style ?? ''} placeholder="Core 추천" options={contextOptions} />
          <SwapSelect id="s-layout" label="레이아웃" param="layout" value={state.layout ?? ''} placeholder="Core 추천" options={layoutOptions} />
          <SwapSelect id="s-component" label="컴포넌트" param="component" value={state.component ?? ''} placeholder="Core 추천" options={componentOptions} />
          <SwapSelect id="s-surface" label="표면" param="surface" value={state.surface ?? ''} placeholder="방향에 맡김" options={options(materials('surface'), others.surface.ranked, others.surface.blocked, m => ({...request, surface: m.id}), m => `${m.label}는 ${(m.contexts ?? []).join(', ')} 맥락용입니다.`)} />
          <SwapSelect id="s-motion" label="모션" param="motion" value={state.motion ?? ''} placeholder="방향에 맡김" options={options(materials('motion'), others.motion.ranked, others.motion.blocked, m => ({...request, motion: m.id}), m => `${m.label}는 ${(m.contexts ?? []).join(', ')} 맥락용입니다.`)} />
          <SwapSelect id="s-background" label="배경" param="background" value={state.background ?? ''} placeholder="방향에 맡김" options={options(materials('background'), others.background.ranked, others.background.blocked, m => ({...request, background: m.id}), m => `${m.label}는 ${(m.contexts ?? []).join(', ')} 맥락용입니다.`)} />
          <SwapSelect id="s-media" label="미디어" param="media" value={state.media ?? ''} placeholder="방향에 맡김" options={options(materials('media'), others.media.ranked, others.media.blocked, m => ({...request, media: m.id}), m => `${m.label}는 ${(m.contexts ?? []).join(', ')} 맥락용입니다.`)} />
          <SwapSelect id="s-state-pattern" label="상태 패턴" param="state" value={state.state ?? ''} placeholder="Core 추천" options={stateOptions} />
          <SwapSelect id="s-shell" label="셸" param="shell" value={state.shell ?? ''} placeholder="방향에 맡김" options={axisOptions('shell')} />
          <SwapSelect id="s-width" label="폭" param="width" value={state.width ?? ''} placeholder="방향에 맡김" options={axisOptions('width')} />
          <SwapSelect id="s-density" label="간격 토큰·밀도" param="density" value={state.density ?? ''} placeholder="방향에 맡김" options={spacingOptions} />
          <SwapSelect id="s-icon-area" label="아이콘 영역" param="icon" value="" placeholder="Core 연결 대기" options={iconOptions} />
          <ul className={styles.chips} aria-label="색 모드">{(['light', 'dark'] as const).map(m => <li key={m}><Link href={here({mode: m})} aria-current={(state.mode ?? 'light') === m ? 'true' : undefined}>{m === 'dark' ? '다크' : '라이트'}</Link></li>)}</ul>
        </div>
        <div className={styles.stage}>
          <ul className={styles.chips} aria-label="화면 폭">{([1280, 390] as const).map(d => <li key={d}><Link href={here({device: d})} replace scroll={false} aria-current={state.device === d ? 'true' : undefined}>{d === 1280 ? '데스크톱 1280' : '모바일 390'}</Link></li>)}</ul>
          {out.ok
            ? <div data-testid="swap-preview" data-request={JSON.stringify(request)}><Thumb src={renderSrc(request)} title={`${purpose.label} 미리보기 ${state.device}px`} width={state.device} height={state.device === 390 ? 844 : 800} /></div>
            : <div role="alert" className="note" data-testid="swap-error"><p>{out.errors.map(e => `${e.code}: ${e.message}`).join(' / ')}</p>{repaired.dropped.length ? <p><Link href={here(repaired.state)} className={styles.chipLink} data-testid="swap-repair">충돌하는 선택({repaired.dropped.map(d => d.what).join(', ')}) 풀고 계속</Link></p> : null}</div>}
          {out.ok ? <ul className={styles.reasons} data-testid="decisions">{out.value.decisions.map(d => <li key={d.slot}>{d.slot}: {shortId(String(d.id))} ({d.source === 'intent' ? '내가 고름' : '추천'}){text(d.reasons as {reason?: string}[]).length ? ` — ${text(d.reasons as {reason?: string}[])[0]}` : ''}</li>)}</ul> : null}
          <p><Link href={here({step: 'content'})} className={styles.chipLink}>콘텐츠 수정으로</Link></p>
        </div>
      </div>
    </section>
  );
}

function ContentStep({state}: {state: AssembleState}) {
  const purpose = purposeOf(state.purpose)!;
  const request = requestOf(state)!;
  const out = assembleDesign(request);
  return (
    <section aria-labelledby="content-title">
      <h2 className="section-title" id="content-title">문구를 고쳐 보세요</h2>
      <div className={styles.split}>
        <div className={styles.controls}><AssembleContentForm values={state.content} /></div>
        <div className={styles.stage}>
          {out.ok ? <div data-testid="content-preview" data-request={JSON.stringify(request)}><Thumb src={renderSrc(request)} title={`${purpose.label} 미리보기`} /></div> : <p role="alert" className="note">{out.errors.map(e => e.message).join(' ')}</p>}
          <p><Link href={writeState({...state, step: 'export'})} className={styles.chipLink}>내보내기로</Link></p>
        </div>
      </div>
    </section>
  );
}

function ExportStep({state}: {state: AssembleState}) {
  const request = requestOf(state)!;
  const out = assembleDesign(request);
  if (!out.ok) return <p role="alert" className="note">{out.errors.map(e => e.message).join(' ')}</p>;
  const top = out.value.candidates[0];
  const m = {contrast: (top.quality as {contrast?: {ok?: boolean; roles?: number; failures?: unknown[]}}).contrast};
  return (
    <section aria-labelledby="export-title">
      <h2 className="section-title" id="export-title">코드로 가져가기</h2>
      <p className={styles.meta} data-testid="checks">검사 결과: 품질 검사 {top.quality.ok ? '통과' : '실패'} · 접근성 대비 {m.contrast?.ok ? '통과' : '확인 필요'}({m.contrast?.roles ?? 0}개 역할, 실패 {m.contrast?.failures?.length ?? 0})</p>
      <ul className={styles.chips} aria-label="내려받기" data-testid="downloads">
        {(['standalone', 'html', 'css', 'manifest'] as const).map(part => <li key={part}><a href={renderSrc(request, {part, download: true})} download data-part={part}>{{standalone: '완성 HTML 문서', html: 'HTML 본문', css: 'CSS', manifest: 'manifest(JSON)'}[part]}</a></li>)}
      </ul>
      <details className={styles.code}><summary>HTML 본문 보기 ({top.value.html.length.toLocaleString()}자)</summary><pre tabIndex={0}><code data-testid="export-html">{top.value.html.slice(0, 20000)}</code></pre></details>
      <h2 className="section-title">왜 이렇게 됐나</h2>
      <ul className={styles.recoList} data-testid="why">{out.value.decisions.map(d => <li key={d.slot}><strong>{d.slot}: {label(String(d.id))}</strong><span>{d.source === 'intent' ? '내가 고른 값' : '추천'}{text(d.reasons as {reason?: string}[]).length ? ` · ${text(d.reasons as {reason?: string}[]).join(' · ')}` : ''}</span></li>)}</ul>
      <p><Link href={writeState({...state, step: 'swap'})} className={styles.chipLink}>재료 다시 바꾸기</Link></p>
    </section>
  );
}
