import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';
import {Thumb} from '@/features/explore/Thumb';
import {Unavailable} from '@/features/platform/Unavailable';
import {ContentForm, QuerySelect} from '@/features/platform/QueryControls';
import {adjust, contextOf, cqHref, probe, readCQ, requestFor, VISUALS} from '@/features/platform/component-view.server';
import {assembleComponents, assembleDesign, materials, platformReady, purposeFamilies, recommend} from '@/features/platform/platform.server';
import {renderSrc} from '@/features/platform/render-url';
import {writeState} from '@/features/platform/assemble-state';
import {shortId} from '@/features/platform/labels';
import styles from '@/features/platform/platform.module.css';

type Props = {params: Promise<{group: string; name: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>};
const AXIS_LABEL: Record<string, string> = {layout: '배치', trend: '추세', emphasis: '강조', size: '크기', behavior: '동작', state: '상태', media: '미디어', tone: '톤', density: '밀도'};
const VISUAL_LABEL: Record<string, string> = {quiet: '조용한', soft: '부드러운', bold: '굵은 대비', editorial: '에디토리얼'};

export default async function PurposeFamilyPage({params, searchParams}: Props) {
  const {group, name} = await params;
  const sp = await searchParams;
  if (!platformReady()) return <PageShell eyebrow="Components" title="컴포넌트"><Unavailable what="컴포넌트 비교" /></PageShell>;
  const list = purposeFamilies();
  if (!list.ok) return <PageShell eyebrow="Components" title="컴포넌트"><Unavailable what="목적 패밀리" requires={'listPlatformMaterials({kind: "family"}) 목적 패밀리 기록'} /></PageShell>;
  const fam = list.value.items.find(f => f.id === `purpose:${group}.${name}`);
  if (!fam) notFound();
  const base = `/components/purpose/${group}/${name}`;
  const asked = readCQ(await Promise.resolve(sp), fam);
  const {cq, notes} = adjust(fam, asked);
  const here = (patch = {}) => cqHref(base, fam, cq, patch);

  // 선택지 판정: 값 하나씩 바꿔 서비스에 시험 렌더하고, 거부되면 비활성과 이유를 보인다(조합이 금지된 값도 여기서 걸린다).
  const visualOk = Object.fromEntries(VISUALS.map(v => [v, probe(fam, cq, {visual: v})]));
  const variantOk = (axis: string, value: string) => probe(fam, cq, c => ({...c, variant: {...c.variant, [axis]: value}}));
  const propOk = (axis: string, value: string) => probe(fam, cq, c => ({...c, props: {...c.props, [axis]: value}}));
  const palettes = materials('palette'), sets = materials('subtoken-set'), types = materials('type-system');
  const setFit = recommend({kind: 'subtoken-set', selected: cq.palette ? [`palette:${cq.palette}`] : []});
  const setBlocked = new Map((setFit.ok ? setFit.value.blocked : []).map(b => [b.id, b.blocked.map(x => x.reason).join(' ')]));
  const typeProbe = (id: string) => probe(fam, cq, {type: shortId(id)});

  const main = requestFor(fam, cq);
  const mainOut = assembleComponents(main);
  const chip = (label: string, href: string, current: boolean, p: {ok: boolean; reason?: string}) => (
    <li key={label}>
      <Link href={href} replace scroll={false} aria-current={current ? 'true' : undefined} aria-disabled={!p.ok || undefined} title={p.ok ? undefined : p.reason} data-reason={p.ok ? undefined : p.reason} style={p.ok ? undefined : {opacity: 0.45, pointerEvents: 'none'}} tabIndex={p.ok ? undefined : -1}>{label}{p.ok ? '' : ' (쓸 수 없음)'}</Link>
    </li>
  );
  const stringFields = Object.entries(fam.content).filter(([, s]) => s.type === 'string' || s.type === 'string[]').map(([field, s]) => {
    const v = cq.content[field] ?? (s.type === 'string[]' ? ((fam.example.content[field] as string[]) ?? []).join(' | ') : String(fam.example.content[field] ?? ''));
    return {name: field, label: `${field}${s.required ? ' (필수)' : ''}`, value: v, hint: s.type === 'string[]' ? '항목을 | 로 구분합니다' : undefined};
  });
  // 페이지 조립 진입: 기반 컴포넌트와 시각 패밀리를 슬롯에 3개 놓는 요청이 서비스에서 받아들여질 때만 연다.
  const baseId = fam.children.find(c => c.endsWith('card-surface')) ?? null;
  const handoff = baseId ? assembleDesign({purpose: 'saas-landing', candidates: 1, components: [1, 2, 3].map(n => ({base: baseId, family: `family:${cq.visual}`, content: {id: `c${n}`, title: `${fam.label} ${n}`, body: '내용'}}))}) : null;
  const handoffHref = baseId ? writeState({purpose: 'saas-landing', component: shortId(baseId), cvisual: cq.visual, ctitle: fam.label, palette: cq.palette, set: cq.set, type: cq.type, mode: cq.mode, step: 'compare'}) : null;

  return (
    <PageShell eyebrow={`Components · ${group}`} title={fam.label} lead={fam.purpose.split(/(?<=[.다])\s/)[0]}>
      <p className={styles.meta}>{fam.purpose.split(/(?<=[.다])\s/).slice(1).join(' ')}</p>
      <p className={styles.meta}><Link href="/components">컴포넌트 목록</Link> · 맥락 {fam.contexts.join(', ')} · 기반 {fam.children.map(shortId).join(', ')}</p>
      {notes.length ? <div className="note" role="status" data-testid="auto-adjusted">{notes.map(n => <p key={n}>{n}</p>)}</div> : null}

      <div className={styles.split}>
        <div className={styles.controls} data-testid="controls">
          <section aria-labelledby="c-visual"><h2 id="c-visual" className={styles.ctlTitle}>시각 패밀리</h2>
            <ul className={styles.chips}>{VISUALS.map(v => chip(VISUAL_LABEL[v], here({visual: v}), cq.visual === v, visualOk[v]))}</ul></section>
          {Object.entries(fam.variants).map(([axis, values]) => (
            <section key={axis} aria-label={`변형 ${axis}`}><h2 className={styles.ctlTitle}>{AXIS_LABEL[axis] ?? axis}</h2>
              <ul className={styles.chips} data-axis={`v_${axis}`}>{values.map(v => chip(v, here({variant: {...cq.variant, [axis]: v}}), cq.variant[axis] === v, variantOk(axis, v)))}</ul></section>
          ))}
          {Object.entries(fam.props).map(([axis, values]) => (
            <section key={axis} aria-label={`속성 ${axis}`}><h2 className={styles.ctlTitle}>{AXIS_LABEL[axis] ?? axis}</h2>
              <ul className={styles.chips} data-axis={`p_${axis}`}>{values.map(v => chip(v, here({props: {...cq.props, [axis]: v}}), cq.props[axis] === v, propOk(axis, v)))}</ul></section>
          ))}
          <section aria-labelledby="c-materials"><h2 id="c-materials" className={styles.ctlTitle}>색과 서체</h2>
            <QuerySelect id="q-palette" label="팔레트" param="palette" value={cq.palette ?? ''} placeholder="맥락 기본" resets={['set']} options={palettes.map(p => ({value: shortId(p.id), label: p.label}))} />
            <QuerySelect id="q-set" label="서브토큰 세트" param="set" value={cq.set ?? ''} placeholder="맥락 기본" options={sets.map(s => ({value: shortId(s.id), label: s.label, ...(setBlocked.get(s.id) ? {disabled: true, reason: setBlocked.get(s.id)} : {})}))} />
            <QuerySelect id="q-type" label="타이포 시스템" param="type" value={cq.type ?? ''} placeholder="맥락 기본" options={types.map(t => { const p = typeProbe(t.id); return {value: shortId(t.id), label: t.label, ...(p.ok ? {} : {disabled: true, reason: p.reason})}; })} />
            <ul className={styles.chips} aria-label="색 모드">{(['light', 'dark'] as const).map(m => chip(m === 'dark' ? '다크' : '라이트', here({mode: m}), cq.mode === m, {ok: true}))}</ul>
          </section>
          <section aria-labelledby="c-content"><h2 id="c-content" className={styles.ctlTitle}>콘텐츠</h2><ContentForm key={JSON.stringify(cq.content)} fields={stringFields} /></section>
        </div>

        <div className={styles.stage}>
          <div className={styles.toolbar}>
            <ul className={styles.chips} aria-label="화면 폭">{([1280, 390] as const).map(d => chip(d === 1280 ? '데스크톱 1280' : '모바일 390', here({device: d}), cq.device === d, {ok: true}))}</ul>
          </div>
          {mainOut.ok
            ? <div data-testid="main-preview"><Thumb interactive src={renderSrc(main, {kind: 'components'})} title={`${fam.label} ${cq.visual} 패밀리 ${cq.device}px`} width={cq.device} height={cq.device === 390 ? 640 : 520} /></div>
            : <p className="note" role="alert">{mainOut.errors.map(e => e.message).join(' ')}</p>}
          <p className={styles.meta}>{fam.responsive.behavior}</p>
        </div>
      </div>

      <h2 className="section-title">시각 패밀리 비교</h2>
      <ul className={styles.grid} data-cols="3" data-testid="visual-compare">
        {VISUALS.map(v => {
          const ok = visualOk[v];
          return (
            <li key={v} className={styles.cell} data-visual={v}>
              <h3>{VISUAL_LABEL[v]}</h3>
              {ok.ok ? <Thumb src={renderSrc(requestFor(fam, cq, v), {kind: 'components'})} title={`${fam.label} ${v}`} width={cq.device} height={cq.device === 390 ? 640 : 520} /> : <p className="note" role="status">{ok.reason}</p>}
            </li>
          );
        })}
      </ul>

      <h2 className="section-title">코드로 가져가기</h2>
      {mainOut.ok ? (
        <>
          <ul className={styles.chips} aria-label="내려받기">
            {(['standalone', 'html', 'css', 'manifest'] as const).map(part => <li key={part}><a href={renderSrc(main, {kind: 'components', part, download: true})} download>{{standalone: '완성 HTML 문서', html: 'HTML 조각', css: 'CSS', manifest: 'manifest(JSON)'}[part]}</a></li>)}
          </ul>
          <details className={styles.code}><summary>HTML 조각 보기</summary><pre tabIndex={0}><code data-testid="code-html">{mainOut.value.html}</code></pre></details>
        </>
      ) : null}

      <h2 className="section-title">이 컴포넌트로 페이지 조립</h2>
      {handoffHref && handoff?.ok
        ? <p><Link href={handoffHref} className={styles.chipLink} data-testid="to-assemble">Studio에서 페이지로 조립하기</Link> <span className={styles.meta}>선택한 시각 패밀리({VISUAL_LABEL[cq.visual]})의 카드 3개로 SaaS 랜딩을 조립합니다.</span></p>
        : <p className="note" data-testid="assemble-pending">{handoff && !handoff.ok ? handoff.errors.map(e => e.message).join(' ') : '이 목적 패밀리를 페이지 슬롯에 놓는 조립은 조립 서비스가 목적 패밀리를 읽게 되면 연결됩니다(서비스 대기).'}</p>}
      <p className={styles.meta}>선택한 목적 패밀리({fam.id})를 페이지 슬롯에 놓는 조립은 서비스 대기이며, 지금은 기반 컴포넌트(카드)와 시각 패밀리만 넘깁니다.</p>
      <p className={styles.meta}>맥락 {contextOf(fam)} 기준으로 판정했습니다.</p>
    </PageShell>
  );
}
