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

      {rendered?.ok ? <ComponentPreview type={view.type} label={view.label} variants={rendered.mode === 'isolated' ? view.variants : []} note={note} /> : (
        <p className="note">{view.type === 'page' ? '페이지는 모든 부품의 뿌리라서 단독 렌더가 없습니다. 아래 허용 자식이 페이지 바로 아래에 놓을 수 있는 부품입니다.' : rendered?.reason}</p>
      )}

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
