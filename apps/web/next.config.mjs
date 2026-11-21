import {resolve} from 'node:path';

// Core(src/)는 apps/web 밖에 있으므로 추적·번들 루트를 저장소 루트로 둔다.
const repoRoot = resolve(import.meta.dirname, '../..');

// 옛 /combos/ 쿼리 계약(00-baseline.md 6.1절)은 Next가 리다이렉트에서 쿼리를 그대로 넘겨 준다.
const legacyCombos = ['/combos', '/combos/index.html'].map(source => ({source, destination: '/explore/combos', permanent: true}));

/** @type {import('next').NextConfig} */
export default {
  turbopack: {root: repoRoot},
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  // 옛 정적 호스트와 같게 `/examples/x/`(끝 슬래시)를 리다이렉트 없이 200으로 낸다.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return legacyCombos;
  },
  async rewrites() {
    // 디렉터리 URL(`/examples/x/`)은 파일 시스템에 없을 때만 index.html로 잇는다. 실제 파일(`*.html`, `*.json`)이 먼저다.
    return {
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
