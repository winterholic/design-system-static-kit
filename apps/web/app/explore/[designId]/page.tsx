import Link from 'next/link';
import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {PageShell} from '@/shell/PageShell';
import {CopyJson} from '@/features/explore/CopyJson';
import {PreviewFrame} from '@/features/explore/PreviewFrame';
import {curatedDesigns, findDesign} from '@/features/explore/designs.server';
import {studioHref} from '@/features/explore/id';
import styles from '@/features/explore/detail.module.css';

type Props = {params: Promise<{designId: string}>};

export function generateStaticParams() {
  return curatedDesigns().map(d => ({designId: d.id}));
}

export async function generateMetadata({params}: Props) {
  const design = findDesign((await params).designId);
  return {title: design ? `${design.label} · ${design.themeName}` : '디자인을 찾을 수 없음'};
}

const MODE_LABEL: Record<string, string> = {light: '라이트', dark: '다크', auto: '시스템 설정 따름'};

export default async function DesignPage({params}: Props) {
  const {designId} = await params;
  const design = findDesign(designId);
  if (!design) notFound();

  const render = `/explore/${design.id}/render`;
  const siblings = curatedDesigns().filter(d => d.template === design.template && d.id !== design.id);
  const layout = Object.entries(design.layout ?? {});

  return (
    <div className="page">
      <p className={styles.crumb}><Link href="/explore">Explore</Link> / {design.pageTypeLabel}</p>
      <div className={styles.head}>
        <div>
          <h1 className="page-title">{design.label}</h1>
          <p className={styles.sub}>{design.themeName}{design.variantLabel ? ` · ${design.variantLabel}` : ''} · {design.pageTypeLabel}</p>
        </div>
        <div className={styles.actions}>
          <a href={render} target="_blank" rel="noopener" className="btn btn-quiet">새 창으로 전체 화면<span className="visually-hidden"> (새 창)</span></a>
          <Link href={studioHref(design)} className="btn">Studio에서 열기</Link>
        </div>
      </div>

      <Suspense fallback={<div className={styles.previewFallback} aria-label="미리보기 준비 중" />}>
        <PreviewFrame src={render} title={`${design.label} (${design.themeName}) 컴파일 결과`} />
      </Suspense>

      <h2 className="section-title">구성</h2>
      <dl className={styles.facts}>
        <div><dt>템플릿</dt><dd>{design.label} <small>{design.template}</small></dd></div>
        <div><dt>테마</dt><dd>{design.themeName} <small>{design.themeId} · {design.styleLabel}</small></dd></div>
        <div><dt>변형</dt><dd>{design.variantLabel ? <>{design.variantLabel} <small>{design.variant}</small></> : '테마 기본'}</dd></div>
        <div>
          <dt>팔레트</dt>
          <dd>
            {design.paletteName} <small>{design.paletteId}</small>
            <div className={styles.swatches} aria-hidden="true">{design.paletteColors.map(c => <span key={c} className={styles.swatch} style={{background: c}} />)}</div>
          </dd>
        </div>
        <div><dt>모드</dt><dd>{MODE_LABEL[design.resolvedMode] ?? design.resolvedMode}</dd></div>
        {layout.length ? <div><dt>구성 변형</dt><dd>{layout.map(([slot, option]) => `${slot}:${option}`).join(', ')}</dd></div> : null}
      </dl>

      <CopyJson src={`/explore/${design.id}/blueprint.json`} label="Blueprint JSON" />

      {siblings.length ? (
        <div className={styles.related}>
          같은 템플릿의 다른 테마
          <ul>{siblings.map(s => <li key={s.id}><Link href={`/explore/${s.id}`}>{s.themeName}{s.variantLabel ? ` · ${s.variantLabel}` : ''}</Link></li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}
