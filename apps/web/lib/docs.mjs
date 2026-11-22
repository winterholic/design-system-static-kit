// Docs 영역의 단일 출처. 가이드(guide)·Core 레퍼런스(core)·연동(integrations) 세 갈래이고, 모두 /docs 아래에 둔다(docs/platform/web-ia.md 3.6).
// 메인 화면에서 뺀 내부 규약·CLI·진단 코드는 여기로 모인다. 옛 주소는 DOCS_REDIRECTS 로 보존한다(next.config.mjs 가 읽는다).

export const DOCS_SECTIONS = Object.freeze([
  {id: 'guide', title: '가이드', description: '처음 쓰는 순서와 결과를 믿을 수 있는 이유를 설명합니다.'},
  {id: 'core', title: 'Core 레퍼런스', description: 'Blueprint, 부품, 조합 규칙, 테마를 현재 Core에서 읽어 보여 줍니다.'},
  {id: 'integrations', title: '연동', description: 'CLI, REST API, MCP로 같은 검증·컴파일 결과를 받습니다.'},
].map(section => Object.freeze({...section, href: section.id === 'integrations' ? '/docs/integrations' : `/docs#${section.id}`})));

const PAGES = [
  {section: 'guide', slug: 'getting-started', title: '시작하기', description: '예제를 실행하고 Blueprint를 검증·빌드해 보세요.'},
  {section: 'guide', slug: 'principles', title: '규약과 검증', description: '허용된 값만, 대비 검사, 맥락 규칙, 같은 입력 같은 출력이 어떻게 지켜지는지 설명합니다.'},
  {section: 'core', slug: 'blueprint', title: 'Blueprint', description: '허용된 JSON 트리로 페이지 구조와 디자인 선택을 표현합니다.'},
  {section: 'core', slug: 'components', title: 'Components', description: '부품 스키마와 자식 규약을 Core에서 조회합니다.'},
  {section: 'core', slug: 'composition', title: 'Composition', description: '페이지 구조, 슬롯, 조합 규칙과 제한을 확인합니다.'},
  {section: 'core', slug: 'tokens-themes', title: 'Tokens & Themes', description: '테마와 팔레트 목록은 현재 Core 카탈로그에서 가져옵니다.'},
  {section: 'core', slug: 'limitations', title: 'Limitations', description: '현재 규약과 공개 채널의 한계를 확인합니다.'},
];

export const DOCS_PAGES = Object.freeze(PAGES.map(page => Object.freeze({...page, href: `/docs/${page.section}/${page.slug}`})));

export const INTEGRATION_PAGES = Object.freeze([
  {slug: 'cli', title: 'CLI', description: '터미널과 CI에서 Blueprint를 검증하고 빌드합니다.'},
  {slug: 'rest-api', title: 'REST API', description: 'HTTP로 카탈로그 조회, 검증, 컴파일을 호출합니다.'},
  {slug: 'mcp', title: 'MCP', description: '에이전트가 도구로 디자인을 고르고 편집합니다.'},
].map(page => Object.freeze({...page, href: `/docs/integrations/${page.slug}`})));

/** 옛 주소 → 새 주소. 308(permanent)로 보존한다. 쿼리는 Next 가 그대로 넘긴다. */
export const DOCS_REDIRECTS = Object.freeze([
  ['/integrations', '/docs/integrations'],
  ['/integrations/cli', '/docs/integrations/cli'],
  ['/integrations/rest-api', '/docs/integrations/rest-api'],
  ['/integrations/mcp', '/docs/integrations/mcp'],
  ['/docs/getting-started', '/docs/guide/getting-started'],
  ['/docs/blueprint', '/docs/core/blueprint'],
  ['/docs/components', '/docs/core/components'],
  ['/docs/composition', '/docs/core/composition'],
  ['/docs/tokens-themes', '/docs/core/tokens-themes'],
  ['/docs/limitations', '/docs/core/limitations'],
  ['/docs/cli', '/docs/integrations/cli'],
  ['/docs/rest', '/docs/integrations/rest-api'],
  ['/docs/mcp', '/docs/integrations/mcp'],
].map(([from, to]) => Object.freeze({from, to})));

const routes = new Set([
  '/', '/docs', '/docs/integrations', ...DOCS_PAGES.map(page => page.href), ...INTEGRATION_PAGES.map(page => page.href),
  '/components', '/explore', '/studio', '/materials', '/examples/saas-landing/',
]);

export function resolveDocPage(section, slug) {
  return DOCS_PAGES.find(page => page.section === section && page.slug === slug) ?? null;
}

export function validateDocsLinks() {
  const invalid = [];
  for (const page of DOCS_PAGES) {
    for (const href of docLinks(page.slug)) {
      if (href.startsWith('/') && !routes.has(href)) invalid.push(`${page.href} → ${href}`);
    }
  }
  for (const {from, to} of DOCS_REDIRECTS) if (!routes.has(to)) invalid.push(`redirect ${from} → ${to}`);
  return invalid;
}

export function docLinks(slug) {
  const common = ['/docs'];
  const links = {
    'getting-started': [...common, '/docs/core/blueprint', '/docs/guide/principles', '/docs/integrations/cli', '/examples/saas-landing/'],
    principles: [...common, '/docs/core/composition', '/docs/core/limitations', '/docs/integrations'],
    blueprint: [...common, '/docs/core/components', '/docs/core/composition'],
    components: [...common, '/components'],
    composition: [...common, '/docs/core/blueprint', '/docs/core/limitations'],
    'tokens-themes': [...common],
    limitations: [...common, '/docs/core/blueprint', '/docs/integrations/rest-api', '/docs/integrations/mcp'],
  };
  return links[slug] ?? [];
}
