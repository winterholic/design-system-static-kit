'use client';
import {useEffect, useState} from 'react';

/** 좁은 화면(편집·미리보기를 한 번에 하나만 보이는 폭). CSS의 900px 중단점과 같은 값이다. */
export const NARROW_QUERY = '(max-width: 899px)';
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}
