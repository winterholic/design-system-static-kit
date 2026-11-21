import {resolve} from 'node:path';

// Core(src/)는 apps/web 밖에 있으므로 추적·번들 루트를 저장소 루트로 둔다.
const repoRoot = resolve(import.meta.dirname, '../..');

// 컷오버 전에는 캐시되지 않는 307로 옛 URL을 새 화면에 잇는다. 컷오버 뒤 permanent:true(308)로 바꾼다.
const legacyCombos = ['/combos', '/combos/index.html'].map(source => ({source, destination: '/explore/combos', permanent: false}));

/** @type {import('next').NextConfig} */
export default {
  turbopack: {root: repoRoot},
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  experimental: {caseSensitiveRoutes: true},
  // 옛 정적 호스트와 같게 `/examples/x/`(끝 슬래시)를 리다이렉트 없이 200으로 낸다.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return legacyCombos;
  },
  async rewrites() {
    // 오프라인 갤러리와 디렉터리 URL은 리다이렉트 없이 정적 index.html을 낸다.
    return {
      beforeFiles: [
        {source: '/gallery', destination: '/gallery/index.html'},
        {source: '/gallery/', destination: '/gallery/index.html'},
      ],
      fallback: ['/examples', '/test-lab'].map(base => ({source: `${base}/:path*`, destination: `${base}/:path*/index.html`})),
    };
  },
  async headers() {
    const noindex = [{key: 'X-Robots-Tag', value: 'noindex, nofollow'}];
    return [
      {source: '/test-lab/:path*', headers: noindex},
      {source: '/dev/:path*', headers: noindex},
    ];
  },
};
