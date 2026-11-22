import type {Metadata, Viewport} from 'next';
import type {ReactNode} from 'react';
import {SiteFooter} from '@/shell/SiteFooter';
import {SiteHeader} from '@/shell/SiteHeader';
import {SITE_NAME} from '@/lib/nav';
import './globals.css';

export const metadata: Metadata = {
  title: {default: `${SITE_NAME} · 디자인 탐색, 재료 조합, 코드 조립`, template: `%s · ${SITE_NAME}`},
  description: '완성된 디자인을 둘러보고, 색·글자·부품을 바꿔 보고, 접근성 검사를 통과한 HTML·CSS·토큰으로 가져가세요.',
};
export const viewport: Viewport = {width: 'device-width', initialScale: 1};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="ko">
      <body>
        <a href="#main" className="visually-hidden">본문으로 건너뛰기</a>
        <SiteHeader />
        <main id="main" tabIndex={-1}>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
