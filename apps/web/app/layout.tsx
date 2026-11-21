import type {Metadata, Viewport} from 'next';
import type {ReactNode} from 'react';
import {SiteFooter} from '@/shell/SiteFooter';
import {SiteHeader} from '@/shell/SiteHeader';
import {SITE_NAME} from '@/lib/nav';
import './globals.css';

export const metadata: Metadata = {
  title: {default: `${SITE_NAME} · 디자인 컴파일러`, template: `%s · ${SITE_NAME}`},
  description: '카탈로그가 허용한 값만 조합해 접근성 게이트를 통과한 HTML·CSS·토큰을 만드는 디자인 컴파일러.',
};
export const viewport: Viewport = {width: 'device-width', initialScale: 1};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="ko">
      <body>
        <a href="#main" className="visually-hidden">본문으로 건너뛰기</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
