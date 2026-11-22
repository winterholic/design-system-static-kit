// 상단 내비게이션의 단일 출처. 만드는 쪽(Explore·Materials·Components·Studio) 넷과 아는 쪽(Docs) 하나다. Docs 는 오른쪽 끝 보조 링크다(web-ia.md 2절). 내부 설계서·진단 문서는 공개 메뉴에 두지 않는다(/dev/qa 에서만 연다).
export const SITE_NAME = 'Static Kit';
export const GITHUB_URL = 'https://github.com/winterholic/design-system-static-kit';

export type NavItem = {href: string; label: string; secondary?: boolean};

export const NAV_ITEMS: readonly NavItem[] = [
  {href: '/explore', label: 'Explore'},
  {href: '/materials', label: 'Materials'},
  {href: '/components', label: 'Components'},
  {href: '/studio', label: 'Studio'},
  {href: '/docs', label: 'Docs', secondary: true},
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}
