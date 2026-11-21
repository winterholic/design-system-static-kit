'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {NAV_ITEMS, SITE_NAME, isActive} from '@/lib/nav';
import styles from './SiteHeader.module.css';

// 720px 미만에서는 메뉴 버튼 뒤에 접는다. CSS 중단점(720px)과 같은 값을 쓴다.
const DESKTOP_QUERY = '(min-width: 720px)';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  // 링크로 이동하면 닫는다. 새 화면의 초점을 빼앗지 않도록 초점은 되돌리지 않는다.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => { if (mq.matches) setOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const links = () => Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href]') ?? []);
    links()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
      if (e.key !== 'Tab') return;
      // 열린 동안 초점은 버튼과 메뉴 링크 안에서만 돈다.
      const ring = [toggleRef.current, ...links()].filter((el): el is HTMLElement => !!el);
      const i = ring.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? ring.length - 1 : i - 1) : (i === ring.length - 1 ? 0 : i + 1);
      e.preventDefault();
      ring[next]?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!navRef.current?.contains(t) && !toggleRef.current?.contains(t)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open, close]);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand}>{SITE_NAME}</Link>
        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen(o => !o)}
        >
          <span className={styles.bars} aria-hidden="true"><i /></span>
          메뉴<span className="visually-hidden">{open ? ' 닫기' : ' 열기'}</span>
        </button>
        <nav id="site-nav" ref={navRef} className={styles.nav} data-open={open} aria-label="주요 메뉴">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={styles.link} aria-current={isActive(pathname, item.href) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
