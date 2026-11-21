'use client';

import {useRouter} from 'next/navigation';
import {useEffect} from 'react';

// 옛 조립기 주소 `/#catalog`는 해시가 서버에 전달되지 않으므로 클라이언트에서 /explore 로 replace 한다(WB-07).
export function HashRedirect() {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hash === '#catalog') router.replace('/explore');
  }, [router]);
  return null;
}
