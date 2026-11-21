export const DOCS_PAGES = Object.freeze([
  {slug: 'getting-started', title: '시작하기', description: '예제를 실행하고 Blueprint를 검증·빌드해 보세요.', group: '시작'},
  {slug: 'blueprint', title: 'Blueprint', description: '허용된 JSON 트리로 페이지 구조와 디자인 선택을 표현합니다.', group: 'Core'},
  {slug: 'components', title: 'Components', description: '부품 스키마와 자식 규약을 Core에서 조회합니다.', group: 'Core'},
  {slug: 'composition', title: 'Composition', description: '페이지 구조, 슬롯, 조합 규칙과 제한을 확인합니다.', group: 'Core'},
  {slug: 'tokens-themes', title: 'Tokens & Themes', description: '테마와 팔레트 목록은 현재 Core 카탈로그에서 가져옵니다.', group: 'Core'},
  {slug: 'cli', title: 'CLI', description: 'Node.js 22에서 템플릿을 만들고 검사하는 순서입니다.', group: '연동'},
  {slug: 'rest', title: 'REST API', description: '공개 서비스와 REST 경로의 역할 및 상세 요청 예제를 안내합니다.', group: '연동'},
  {slug: 'mcp', title: 'MCP', description: '에이전트 도구 연결과 검증 순서를 안내합니다.', group: '연동'},
  {slug: 'limitations', title: 'Limitations', description: '현재 규약과 공개 채널의 한계를 확인합니다.', group: '참고'},
].map(page => Object.freeze({...page, href: `/docs/${page.slug}`})));

const routes = new Set([
  '/', '/docs', ...DOCS_PAGES.map(page => page.href),
  '/integrations', '/integrations/cli', '/integrations/rest-api', '/integrations/mcp',
  '/components', '/explore', '/studio', '/examples/saas-landing/',
]);

export function resolveDocPage(slug) {
  if (!Array.isArray(slug) || slug.length !== 1) return null;
  return DOCS_PAGES.find(page => page.slug === slug[0]) ?? null;
}

export function validateDocsLinks() {
  const invalid = [];
  for (const page of DOCS_PAGES) {
    for (const href of docLinks(page.slug)) {
      if (href.startsWith('/') && !routes.has(href)) invalid.push(`${page.href} → ${href}`);
    }
  }
  return invalid;
}

export function docLinks(slug) {
  const common = ['/docs'];
  const links = {
    'getting-started': [...common, '/docs/blueprint', '/docs/cli', '/examples/saas-landing/'],
    blueprint: [...common, '/docs/components', '/docs/composition'],
    components: [...common, '/components'],
    composition: [...common, '/docs/blueprint', '/docs/limitations'],
    'tokens-themes': [...common],
    cli: [...common, '/integrations/cli'],
    rest: [...common, '/integrations/rest-api'],
    mcp: [...common, '/integrations/mcp'],
    limitations: [...common, '/docs/blueprint', '/integrations/rest-api', '/integrations/mcp'],
  };
  return links[slug] ?? [];
}
