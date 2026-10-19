// 성격이 다른 대표 표본: 대시보드·랜딩·문서·커머스·인증·오류, 라이트/다크, 밀도·라운드 상이.
const ex = id => ({id, path: `site/examples/${id}/index.html`});
export const SAMPLES = [
  'dashboard-overview', 'dashboard-analytics', 'admin-table', 'audit-log', 'project-board', 'team-chat', 'settings',
  'saas-landing', 'app-landing', 'waitlist', 'cafe-home', 'event-landing', 'museum-home', 'agency-home', 'hanji-journey',
  'docs-reference', 'article', 'blog-index',
  'product-listing', 'product-detail', 'checkout', 'pricing-page',
  'login', 'signup', 'not-found', 'server-error', 'status-page',
].map(ex);

/** 축 극단(hard/glow/dramatic/bubble/pill/solid 아이콘 등)을 쓰는 test-lab 사례. `--extra`로 촬영. */
export const EXTRA = ['a-saas-landing--brutalist', 'a-dashboard-overview--neon', 'a-product-detail--retro', 'a-article--magazine', 'a-pricing-page--playful', 'a-login--clinic', 'a-docs-reference--signal', 'a-admin-table--nocturne', 'a-cafe-home--stay', 'a-event-landing--sport',
  'a-dashboard-overview--clarity', 'a-dashboard-overview--insight', 'a-blog-index--signal', 'a-blog-index--studio', 'a-blog-index--beauty', 'a-blog-index--editorial']
  .map(id => ({id: `lab-${id}`, path: `site/test-lab/cases/${id}/index.html`}));
