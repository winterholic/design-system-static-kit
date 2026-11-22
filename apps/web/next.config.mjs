import {resolve} from 'node:path';
import {DOCS_REDIRECTS} from './lib/docs.mjs';

// Core(src/)는 apps/web 밖에 있으므로 추적·번들 루트를 저장소 루트로 둔다.
const repoRoot = resolve(import.meta.dirname, '../..');

// /combos/의 쿼리를 보존해 내부 QA 경로로 한 번만 이동한다.
const legacyCombos = ['/combos', '/combos/', '/combos/index.html'].map(source => ({source, destination: '/dev/qa/combos', permanent: false}));

// 옛 주소(/integrations/*, /docs/getting-started 등)는 308로 새 /docs 구조에 보존한다. 끝 슬래시 변형도 같이 둔다(skipTrailingSlashRedirect).
const legacyDocs = DOCS_REDIRECTS.flatMap(({from, to}) => [from, `${from}/`].map(source => ({source, destination: to, permanent: true})));

/** @type {import('next').NextConfig} */
export default {
  turbopack: {root: repoRoot},
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  experimental: {caseSensitiveRoutes: true},
  // 옛 정적 호스트와 같게 `/examples/x/`(끝 슬래시)를 리다이렉트 없이 200으로 낸다.
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [...legacyCombos, ...legacyDocs];
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
    // 전 경로 공통. Explore 미리보기·썸네일·Studio 는 같은 출처 iframe(또는 srcDoc)이라 frame-ancestors 'self' 로 충분하다.
    // script-src 를 가진 CSP 는 일부러 두지 않는다: Next 인라인 부트스트랩과 컴파일 결과의 인라인 스크립트가 nonce 없이는 막힌다.
    const secure = [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'"},
      {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
      {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
    ];
    return [
      {source: '/:path*', headers: secure},
      {source: '/test-lab/:path*', headers: noindex},
      {source: '/dev/:path*', headers: noindex},
    ];
  },
};
