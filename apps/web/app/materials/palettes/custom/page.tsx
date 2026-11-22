import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {SeedForm} from '@/features/platform/SeedForm';
import {Unavailable} from '@/features/platform/Unavailable';
import {platformReady, proposeSets} from '@/features/platform/platform.server';
import {first, shortId} from '@/features/platform/labels';
import styles from '@/features/platform/platform.module.css';

export const metadata = {title: '내 색으로 시험하기 | Materials'};
type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};
const HEX = /^#?[0-9a-fA-F]{6}$/;

export default async function CustomPalettePage({searchParams}: Props) {
  const raw = first((await searchParams).seeds) ?? '';
  const seeds = raw.split(/[\s,]+/).filter(Boolean).slice(0, 8).map(s => (s.startsWith('#') ? s : `#${s}`));
  const bad = seeds.filter(s => !HEX.test(s));
  const run = platformReady() && seeds.length >= 3 && !bad.length;
  const result = run ? proposeSets(seeds) : null;
  return (
    <PageShell eyebrow="Materials · 팔레트" title="내 색으로 시험하기" lead="입력한 색에서 쓸 수 있는 서브토큰 세트와, 쓸 수 없는 세트의 이유를 보여 줍니다. 입력한 색은 저장하지 않습니다.">
      <MaterialsNav current="palettes" />
      {!platformReady() ? <Unavailable what="시드 시험" /> : (
        <>
          <SeedForm initial={raw} />
          {seeds.length ? <p className={styles.swatches} aria-label="입력한 색">{seeds.map(s => <i key={s} style={{background: HEX.test(s) ? s : '#fff', width: 28, height: 28}} />)}</p> : null}
          {bad.length ? <p role="alert" className="note">hex 로 읽을 수 없는 값이 있습니다: {bad.join(', ')}</p> : null}
          {seeds.length && seeds.length < 3 ? <p role="alert" className="note">색을 3개 이상 넣어 주세요.</p> : null}
          {result && !result.ok ? <p role="alert" className="note" data-testid="seed-error">{result.errors.map(e => e.message).join(' / ')}</p> : null}
          {result?.ok ? (
            <div data-testid="seed-result">
              <p className={styles.meta} data-testid="seed-assignments">역할 배정: {result.value.assignments.map(a => `${a.slot} ${a.seed}${a.source === 'derived' ? '(자동 보정)' : ''}`).join(' · ')}</p>
              <h2 className="section-title">쓸 수 있는 세트 ({result.value.candidates.length})</h2>
              {result.value.candidates.length ? (
                <ul className={styles.recoList}>
                  {result.value.candidates.map(c => (
                    <li key={c.set} data-set={shortId(c.set)}>
                      <strong>{c.label}</strong>
                      <span>{Object.keys(c.modes).map(m => m === 'dark' ? '다크' : '라이트').join(' · ')} 모드 모두 대비 검사 통과</span>
                      <span className={styles.swatches} aria-hidden="true">{Object.values(c.modes).flatMap(m => ['--kit-canvas', '--kit-surface', '--kit-action', '--kit-accent', '--kit-text'].map(v => m.vars[v])).filter(Boolean).slice(0, 10).map((hex, i) => <i key={i} style={{background: hex}} />)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="note">이 색으로는 쓸 수 있는 세트가 없습니다. 아래 이유를 보고 색을 조정해 보세요.</p>}
              <h2 className="section-title">쓸 수 없는 세트 ({result.value.rejected.length})</h2>
              <ul className={styles.rejected} data-testid="seed-rejected">
                {result.value.rejected.map(r => <li key={r.set} data-set={shortId(r.set)}><strong>{r.label}</strong>{r.reasons.slice(0, 3).map(x => <span key={`${x.mode}${x.message}`}>{x.mode ? `${x.mode === 'dark' ? '다크' : '라이트'}: ` : ''}{x.message}</span>)}{r.reasons.length > 3 ? <span>외 {r.reasons.length - 3}개</span> : null}</li>)}
              </ul>
            </div>
          ) : null}
          <p className={styles.meta} style={{marginTop: 'var(--space-6)'}}><Link href="/materials/palettes">팔레트 목록으로</Link></p>
        </>
      )}
    </PageShell>
  );
}
