import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ComponentPreview} from '@/features/components/ComponentPreview';
import {CopyBlock} from '@/features/components/CopyBlock';
import {componentRows, componentView, renderComponent, templateLabel} from '@/features/components/spec.server';
import styles from '@/features/components/components.module.css';

type Props = {params: Promise<{componentId: string}>};

export function generateStaticParams() {
  return componentRows().map(r => ({componentId: r.type}));
}

export async function generateMetadata({params}: Props) {
  const view = componentView((await params).componentId);
  return {title: view ? `${view.label} 부품` : '부품을 찾을 수 없음'};
}

const labelOf = (type: string) => componentRows().find(r => r.type === type)?.label ?? type;

function TypeLinks({types}: {types: string[]}) {
  return <ul className={styles.chips}>{types.map(t => <li key={t}>{t === 'page' ? '페이지 바로 아래' : <Link href={`/components/${t}`}>{labelOf(t)}</Link>}</li>)}</ul>;
}

export default async function ComponentPage({params}: Props) {
  const {componentId} = await params;
  const view = componentView(componentId);
  if (!view) notFound();
  const rendered = view.type === 'page' ? null : renderComponent(view.type);
  const note = rendered?.ok && rendered.mode === 'template'
    ? `이 부품은 단독 예제가 없어 ${templateLabel(rendered.template!)} 템플릿의 기본 출력으로 보여 줍니다.`
    : undefined;

  return (
    <div className="page">
      <p className={styles.crumb}><Link href="/components">Components</Link> / {view.groupLabel}</p>
      <div className={styles.head}>
        <h1 className="page-title">{view.label}</h1>
        <p className={styles.sub}><code>{view.type}</code></p>
      </div>

      {rendered?.ok ? <ComponentPreview type={view.type} label={view.label} variants={rendered.mode === 'isolated' ? view.variants : []} variantGroups={view.material ? view.variantGroups : []} note={note} /> : (
        <p className="note">{view.type === 'page' ? '페이지는 모든 부품의 뿌리라서 단독 렌더가 없습니다. 아래 허용 자식이 페이지 바로 아래에 놓을 수 있는 부품입니다.' : rendered?.reason}</p>
      )}

      {view.material ? (
        <>
          <h2 className="section-title">재료 계약</h2>
          <dl className={styles.ctx}>
            <div><dt>종류 · 분류</dt><dd><code>{view.material.kind}</code> · {view.material.category} · {view.groupLabel}</dd></div>
            <div><dt>도입 · 재료 버전</dt><dd>카탈로그 {view.material.since} · 재료 {view.material.version}</dd></div>
            <div><dt>맥락 · 품질</dt><dd>{view.material.contexts.join(', ')} · {view.material.quality.status}{view.material.preset ? ' · 프리셋' : ''}</dd></div>
            <div><dt>상호작용 상태</dt><dd><div className={styles.values}>{view.material.states.values.map(value => <code key={value}>{value}</code>)}</div></dd></div>
            {view.material.states.transitions.length ? <div><dt>상태 전이</dt><dd><ul className={styles.transitions}>{view.material.states.transitions.map((transition, index) => <li key={`${transition.from}-${transition.to}-${index}`}><code>{transition.from} → {transition.to}</code> · {transition.trigger}</li>)}</ul></dd></div> : null}
            <div><dt>반응형</dt><dd>{view.material.responsive.strategy} · {view.material.responsive.breakpoints.join(', ')} — {view.material.responsive.note}</dd></div>
            <div><dt>Blueprint 연결</dt><dd><code>{view.material.blueprint?.node ?? `${view.material.blueprint?.field}=${view.material.blueprint?.value ?? ''}`}</code>{view.material.blueprint?.since ? ` · ${view.material.blueprint.since}부터` : ''}</dd></div>
          </dl>

          <h3 className="section-title">변형과 기본값</h3>
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="재료 변형 표">
            <table className={styles.table}>
              <thead><tr><th scope="col">축</th><th scope="col">값</th><th scope="col">기본값</th><th scope="col">구현</th></tr></thead>
              <tbody>{view.variantGroups.flatMap(group => group.values.map(value => {
                const availability = group.availability.find(option => String(option.value) === String(value));
                return <tr key={`${group.name}-${value}`}><th scope="row"><code>{group.name}</code></th><td><code>{String(value)}</code></td><td>{String(value) === String(group.defaultValue) ? '기본' : ''}</td><td>{availability?.ok ? '구현됨' : availability?.reason ?? '제한됨'}</td></tr>;
              }))}</tbody>
            </table>
          </div>

          <h3 className="section-title">적용 토큰</h3>
          <ul className={styles.chips}>{view.material.tokens.map(token => <li key={token}><code>{token}</code></li>)}</ul>
          {view.limitations.length ? <><h3 className="section-title">제약과 미지원</h3><ul className={styles.limits}>{view.material.tags.filter(tag => tag.startsWith('forbidden:') || tag.startsWith('unsupported:')).map(tag => <li key={tag}>{tag.startsWith('forbidden:') ? '조합 제한' : '미지원'} · <code>{tag.replace(/^(?:forbidden|unsupported):/, '')}</code></li>)}</ul></> : null}
        </>
      ) : null}

      <h2 className="section-title">허용 속성</h2>
      {view.fields.length ? (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="허용 속성 표">
          <table className={styles.table}>
            <thead><tr><th scope="col">이름</th><th scope="col">필수</th><th scope="col">형태</th><th scope="col">허용 값·제약</th></tr></thead>
            <tbody>
              {view.fields.map(f => (
                <tr key={f.name}>
                  <th scope="row"><code>{f.name}</code></th>
                  <td>{f.required ? '필수' : '선택'}</td>
                  <td>{f.kind}</td>
                  <td><div className={styles.values}>{f.detail.map(d => <code key={d}>{d}</code>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>이 부품은 자식만 받고 자체 속성이 없습니다.</p>}

      <h2 className="section-title">놓을 수 있는 자리</h2>
      <dl className={styles.ctx}>
        <div><dt>허용 부모</dt><dd>{view.parents.length ? <TypeLinks types={view.parents} /> : '없음'}</dd></div>
        <div>
          <dt>허용 자식{view.children ? ` (${view.children.min}~${view.children.max}개)` : ''}</dt>
          <dd>{view.children ? <TypeLinks types={view.children.allowed} /> : '자식을 받지 않습니다'}</dd>
        </div>
        {view.pageTypes.requiredBy.length ? <div><dt>반드시 필요한 페이지 유형</dt><dd>{view.pageTypes.requiredBy.join(', ')}</dd></div> : null}
        {view.pageTypes.forbiddenIn.length ? <div><dt>쓸 수 없는 페이지 유형</dt><dd>{view.pageTypes.forbiddenIn.join(', ')}</dd></div> : null}
      </dl>

      {view.example ? (
        <>
          <h2 className="section-title">Blueprint 예제</h2>
          <CopyBlock text={JSON.stringify(view.example, null, 2)} label={`${view.label} Blueprint 예제`} />
        </>
      ) : null}

      {view.related.length ? (
        <>
          <h2 className="section-title">관련 부품</h2>
          <ul className={styles.chips}>{view.related.map(r => <li key={r.type}><Link href={`/components/${r.type}`}>{r.label}</Link></li>)}</ul>
        </>
      ) : null}
    </div>
  );
}
