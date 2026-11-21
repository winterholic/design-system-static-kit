'use client';
import {useMemo, useState} from 'react';
import {Button, Chip, ChipGroup, Input, Segmented, Select} from '@/ui';
import {CopyButton} from './CopyButton';
import type {ColorFamily, ColorLayer, ColorRow} from './types';
import styles from './materials.module.css';

const PAGE = 48;
type View = 'both' | 'light' | 'dark';
type Format = 'css' | 'json';

const VIEW_OPTIONS = [{value: 'both', label: '라이트·다크 비교'}, {value: 'light', label: '라이트'}, {value: 'dark', label: '다크'}];
const FORMAT_OPTIONS = [{value: 'css', label: 'CSS 변수'}, {value: 'json', label: 'JSON'}];
const SCOPE_OPTIONS = [{value: 'filtered', label: '현재 검색 결과'}, {value: 'all', label: '토큰 전체'}];

/** 전체 토큰을 검색·필터하고 복사·내보내기를 한다. 값은 서버가 Core에서 읽어 넘긴 것을 그대로 쓴다. */
export function ColorExplorer({rows, families, layers}: {rows: ColorRow[]; families: ColorFamily[]; layers: {id: ColorLayer; label: string; count: number}[]}) {
  const [q, setQ] = useState('');
  const [layer, setLayer] = useState<ColorLayer | ''>('');
  const [family, setFamily] = useState('');
  const [view, setView] = useState<View>('both');
  const [shown, setShown] = useState(PAGE);
  const [format, setFormat] = useState<Format>('css');
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');

  const found = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter(r => (!layer || r.layer === layer) && (!family || r.family === family)
      && words.every(w => `${r.name} ${r.cssName} ${r.id} ${r.light ?? ''} ${r.dark ?? ''} ${r.family}`.toLowerCase().includes(w)));
  }, [rows, q, layer, family]);
  const familyOptions = [{value: '', label: '전체'}, ...families.filter(f => !layer || f.layer === layer).map(f => ({value: f.id, label: f.label}))];
  const reset = () => { setQ(''); setLayer(''); setFamily(''); setShown(PAGE); };
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(PAGE); };

  const exported = useMemo(() => buildExport(format, scope === 'all' ? rows : found), [format, scope, rows, found]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([exported.text], {type: exported.mime}));
    const a = document.createElement('a');
    a.href = url; a.download = `static-kit-color-tokens.${format}`;
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <form className={styles.filters} role="search" aria-label="색 토큰 찾기" onSubmit={e => e.preventDefault()}>
        <Input className={styles.filterSearch} type="search" label="토큰 검색" value={q} onChange={e => touch(setQ)(e.target.value)} placeholder="이름, CSS 변수, 색 값" autoComplete="off" enterKeyHint="search" />
        <Select label="묶음" value={family} options={familyOptions} onChange={touch(setFamily)} />
        <Segmented label="보기" value={view} options={VIEW_OPTIONS} onChange={v => setView(v as View)} className={styles.viewSeg} />
      </form>
      <ChipGroup label="토큰 층" className={styles.layerChips}>
        <Chip pressed={layer === ''} onClick={() => { setLayer(''); setFamily(''); setShown(PAGE); }}>전체 {rows.length}</Chip>
        {layers.map(l => <Chip key={l.id} pressed={layer === l.id} onClick={() => { setLayer(l.id); setFamily(''); setShown(PAGE); }}>{l.label} {l.count}</Chip>)}
      </ChipGroup>
      <p className={styles.count} role="status" aria-live="polite">{found.length}개 토큰{found.length > shown ? ` 중 ${shown}개 표시` : ''}</p>

      {found.length ? (
        <ul className={styles.tokenList} data-testid="token-list">
          {found.slice(0, shown).map(r => <TokenRow key={r.id} row={r} view={view} />)}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>조건에 맞는 토큰이 없습니다.</p>
          <Button onClick={reset}>검색 조건 지우기</Button>
        </div>
      )}
      {found.length > shown ? <div className={styles.more}><Button onClick={() => setShown(n => n + PAGE)}>{Math.min(PAGE, found.length - shown)}개 더 보기</Button></div> : null}

      <section className={styles.export} aria-labelledby="export-title">
        <h3 id="export-title" className={styles.subTitle}>내보내기</h3>
        <p className={styles.muted}>{scope === 'all' ? '토큰 전체' : '현재 검색 결과'} {exported.count}개를 {format === 'css' ? 'CSS 변수로' : 'JSON으로'} 내보냅니다. 다크 값은 라이트와 다를 때만 담습니다.</p>
        <div className={styles.exportBar}>
          <Segmented label="내보내기 형식" value={format} options={FORMAT_OPTIONS} onChange={v => setFormat(v as Format)} />
          <Segmented label="내보낼 범위" value={scope} options={SCOPE_OPTIONS} onChange={v => setScope(v as 'filtered' | 'all')} />
        </div>
        <pre tabIndex={0} aria-label={`${format === 'css' ? 'CSS' : 'JSON'} 내보내기 미리보기`} className={styles.exportPre} data-testid="export-preview">{exported.text || '내보낼 토큰이 없습니다.'}</pre>
        <div className={styles.exportActions}>
          <CopyButton variant="secondary" text={exported.text} label="복사" what={`${format === 'css' ? 'CSS' : 'JSON'} 내보내기 내용을`} />
          <Button size="sm" onClick={download} disabled={!exported.count}>{format === 'css' ? '.css' : '.json'} 내려받기</Button>
        </div>
      </section>
    </div>
  );
}

function Swatch({hex, mode}: {hex: string | null; mode: 'light' | 'dark'}) {
  return (
    <span className={styles.pairCell}>
      <span className={styles.swatch} style={hex ? {background: hex} : undefined} data-empty={hex ? undefined : ''} aria-hidden="true" />
      <span className={styles.pairText}><span className={styles.pairMode}>{mode === 'light' ? '라이트' : '다크'}</span><code className={styles.hex}>{hex ?? '없음'}</code></span>
    </span>
  );
}

function TokenRow({row, view}: {row: ColorRow; view: View}) {
  const same = row.light === row.dark;
  return (
    <li className={styles.token} data-token={row.id} data-layer={row.layer}>
      <details className={styles.tokenDetails}>
        <summary className={styles.tokenSummary}>
          <span className={styles.tokenName}>
            <span className={styles.tokenTitle}>{row.name}</span>
            <code className={styles.tokenCss}>{row.cssName}</code>
          </span>
          <span className={styles.pair}>
            {view !== 'dark' ? <Swatch hex={row.light} mode="light" /> : null}
            {view !== 'light' ? <Swatch hex={row.dark} mode="dark" /> : null}
          </span>
        </summary>
        <dl className={styles.tokenFacts}>
          <div><dt>층</dt><dd>{layerName(row.layer)}{row.kind === 'usage' ? ' · 부품이 읽는 CSS 변수' : ''}</dd></div>
          <div><dt>라이트·다크</dt><dd>{same ? '두 모드에서 같은 값' : '모드마다 다른 값'}</dd></div>
          {row.refs.length ? <div><dt>참조</dt><dd>{row.refs.map(r => r.label).join(', ')}</dd></div> : null}
          {row.usedBy.length ? <div><dt>쓰이는 곳</dt><dd>{row.usedBy.map(u => `${u.component}(${u.states.join('·')})`).join(', ')}</dd></div> : null}
        </dl>
        <div className={styles.tokenCopy}>
          <CopyButton text={row.cssName} label="변수 이름" what={`${row.cssName}를`} />
          <CopyButton text={`var(${row.cssName})`} label="var()" what={`var(${row.cssName})를`} />
          {row.light ? <CopyButton text={row.light} label="라이트 값" what={`${row.light}를`} /> : null}
          {row.dark && row.dark !== row.light ? <CopyButton text={row.dark} label="다크 값" what={`${row.dark}를`} /> : null}
        </div>
      </details>
    </li>
  );
}

const layerName = (l: ColorLayer) => ({primitive: '기본 색(램프)', semantic: '역할 색', state: '상태 색', component: '부품 색'})[l];

/**
 * 보이는 행을 내보낸다. 값은 행(=Core 계산 결과)의 것이고 여기서는 문자열로 옮길 뿐이다.
 * 같은 CSS 변수 이름이 둘 이상이면(부품 사용처 행과 그래프 행) 먼저 나온 것만 담는다.
 */
function buildExport(format: Format, rows: ColorRow[]): {text: string; mime: string; count: number} {
  const seen = new Set<string>();
  const list = rows.filter(r => r.light && !seen.has(r.cssName) && !!seen.add(r.cssName));
  if (format === 'json') {
    const body = {palette: 'static-kit', tokens: list.map(r => ({id: r.id, layer: r.layer, cssName: r.cssName, light: r.light, dark: r.dark}))};
    return {text: list.length ? JSON.stringify(body, null, 2) : '', mime: 'application/json', count: list.length};
  }
  if (!list.length) return {text: '', mime: 'text/css', count: 0};
  const decl = (key: 'light' | 'dark', only?: (r: ColorRow) => boolean) => list.filter(r => r[key] && (!only || only(r))).map(r => `  ${r.cssName}: ${r[key]};`).join('\n');
  const differs = (r: ColorRow) => r.dark !== r.light;
  const dark = decl('dark', differs);
  const css = [`/* Static Kit 색 토큰 (static-kit) */`, `:root {\n${decl('light')}\n}`,
    ...(dark ? [`@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${dark.replace(/^/gm, '  ')}\n  }\n}`, `:root[data-theme="dark"] {\n${dark}\n}`] : [])].join('\n\n');
  return {text: css + '\n', mime: 'text/css', count: list.length};
}
