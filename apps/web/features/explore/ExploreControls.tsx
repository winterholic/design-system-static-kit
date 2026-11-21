'use client';

import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {EMPTY_QUERY, SORTS, readQuery, writeQuery, type ExploreQuery} from './list-query';
import styles from './controls.module.css';

export type Options = {
  types: {id: string; label: string}[];
  styles: {id: string; label: string}[];
  themes: {id: string; name: string; styleId: string}[];
};

/*
 * 필터·검색·정렬은 URL 쿼리에만 둔다(새로고침·뒤로 가기·공유 링크가 같은 화면으로 돌아온다).
 * history 정책: 입력과 선택이 바뀔 때마다 replace 한다. 한 번의 탐색 동안 목록 항목이 하나만 남아 뒤로 가기가
 * 필터를 한 단계씩 되감지 않고 이전 화면으로 간다. 쪽 이동은 서버가 만든 링크(push)라서 뒤로 가기가 이전 쪽으로 간다.
 */
export function ExploreControls({options, total}: {options: Options; total: number}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const allowed = {types: options.types.map(t => t.id), styles: options.styles.map(s => s.id), themes: options.themes.map(t => t.id)};
  const query = readQuery(params, allowed);

  const [text, setText] = useState(query.q);
  const sent = useRef(query.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 뒤로 가기·초기화처럼 URL 이 바깥에서 바뀌면 입력칸도 따라간다. 내가 보낸 값이면 건드리지 않는다.
  useEffect(() => { if (query.q !== sent.current) { sent.current = query.q; setText(query.q); } }, [query.q]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (next: ExploreQuery) => {
    const qs = writeQuery(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
  };
  const change = (patch: Partial<ExploreQuery>) => go({...query, ...patch, page: 1});

  const onText = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { sent.current = value.trim(); change({q: value.trim()}); }, 250);
  };
  const themes = options.themes.filter(t => !query.style || t.styleId === query.style);
  const currentThemeStyle = options.themes.find(t => t.id === query.theme)?.styleId;
  const active = query.q || query.type || query.style || query.theme || query.sort !== EMPTY_QUERY.sort;

  return (
    <form className={styles.bar} role="search" aria-label="디자인 찾기" onSubmit={e => { e.preventDefault(); clearTimeout(timer.current); sent.current = text.trim(); change({q: text.trim()}); }}>
      <label className={`${styles.field} ${styles.search}`}>
        <span>검색</span>
        <input type="search" name="q" value={text} onChange={e => onText(e.target.value)} placeholder="이름, 테마, 페이지 유형" autoComplete="off" enterKeyHint="search" />
      </label>
      <label className={styles.field}>
        <span>페이지 유형</span>
        <select value={query.type} onChange={e => change({type: e.target.value})}>
          <option value="">전체</option>
          {options.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>스타일</span>
        <select value={query.style} onChange={e => change({style: e.target.value, theme: !e.target.value || currentThemeStyle === e.target.value ? query.theme : ''})}>
          <option value="">전체</option>
          {options.styles.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>테마</span>
        <select value={query.theme} onChange={e => change({theme: e.target.value})}>
          <option value="">전체</option>
          {themes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>정렬</span>
        <select value={query.sort} onChange={e => change({sort: e.target.value as ExploreQuery['sort']})}>
          {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <button type="button" className={styles.reset} onClick={() => { clearTimeout(timer.current); sent.current = ''; setText(''); router.replace(pathname, {scroll: false}); }} disabled={!active && !text}>초기화</button>
      <p className={styles.count} role="status" aria-live="polite">{total}개</p>
    </form>
  );
}
