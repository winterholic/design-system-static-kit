// designId 문법과 Studio 링크 쿼리. 문법의 근거는 docs/dev/platform/06-explore-ids.md 다.
// 이 파일은 순수 함수만 둔다(서버·클라이언트·시험이 같은 구현을 쓴다).

export type DesignRef = {
  template: string;
  theme?: string;
  variant?: string;
  palette?: string;
  mode?: string;
  /** {슬롯: 옵션}. Studio 쿼리의 layout 은 `슬롯:옵션,슬롯:옵션` 이다. */
  layout?: Record<string, string>;
};

const SCALAR_KEYS = ['theme', 'variant', 'palette', 'mode'] as const;
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 정준 형식: 템플릿 id 뒤에 `~키_값`을 theme, variant, palette, mode, 슬롯(주어진 순서) 차례로 잇는다. */
export function formatDesignId(ref: DesignRef, slotOrder: readonly string[] = Object.keys(ref.layout ?? {})): string {
  const parts: string[] = [ref.template];
  for (const key of SCALAR_KEYS) if (ref[key]) parts.push(`${key}_${ref[key]}`);
  for (const slot of slotOrder) if (ref.layout?.[slot]) parts.push(`${slot}_${ref.layout[slot]}`);
  return parts.join('~');
}

/**
 * 문법만 읽는다(카탈로그에 있는 값인지는 보지 않는다). 형식이 어긋나면 null:
 * 알 수 없는 키 대신 슬롯으로 읽히는 조각은 `슬롯_옵션` 꼴이어야 하고, 같은 키가 두 번 나오거나 variant 가 theme 없이 나오면 거부한다.
 */
export function parseDesignId(id: string): DesignRef | null {
  const [template, ...rest] = id.split('~');
  if (!template || !SEGMENT.test(template)) return null;
  const ref: DesignRef = {template};
  const seen = new Set<string>();
  for (const part of rest) {
    const cut = part.indexOf('_');
    if (cut <= 0) return null;
    const key = part.slice(0, cut), value = part.slice(cut + 1);
    if (!SEGMENT.test(key) || !SEGMENT.test(value) || seen.has(key)) return null;
    seen.add(key);
    if ((SCALAR_KEYS as readonly string[]).includes(key)) (ref as Record<string, unknown>)[key] = value;
    else (ref.layout ??= {})[key] = value;
  }
  if (ref.variant && !ref.theme) return null;
  return ref;
}

/** Studio 로 넘기는 주소. 값이 없는 키는 쓰지 않고, 쉼표·콜론은 읽기 좋게 그대로 둔다. */
export function studioHref(ref: DesignRef): string {
  const q = new URLSearchParams({template: ref.template});
  for (const key of SCALAR_KEYS) if (ref[key]) q.set(key, ref[key]!);
  const layout = Object.entries(ref.layout ?? {}).map(([slot, option]) => `${slot}:${option}`).join(',');
  if (layout) q.set('layout', layout);
  return '/studio?' + q.toString().replace(/%3A/g, ':').replace(/%2C/g, ',');
}

/** resetDocument 인자. 모드는 문서를 만든 뒤 setAppearance 로 적용한다(build.server.ts). */
export function resetArgs(ref: DesignRef) {
  return {
    template: ref.template,
    ...(ref.theme ? {theme: ref.theme} : {}),
    ...(ref.palette ? {palette: ref.palette} : {}),
    ...(ref.variant ? {themeVariant: ref.variant} : {}),
    ...(ref.layout && Object.keys(ref.layout).length ? {layout: ref.layout} : {}),
  };
}
