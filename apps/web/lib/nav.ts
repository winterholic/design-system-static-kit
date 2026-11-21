// 상단 내비게이션의 단일 출처. 내부 설계서·진단 문서는 공개 메뉴에 두지 않는다(/dev/qa 에서만 연다).
export const SITE_NAME = 'Static Kit';
export const GITHUB_URL = 'https://github.com/winterholic/design-system-static-kit';

export const NAV_ITEMS = [
  {href: '/explore', label: 'Explore'},
  {href: '/components', label: 'Components'},
  {href: '/docs', label: 'Docs'},
  {href: '/integrations', label: 'Integrations'},
  {href: '/studio', label: 'Studio'},
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
