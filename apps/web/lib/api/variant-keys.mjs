// 재료 변형 축 이름이 Playground 선택 키와 같을 수 있다(select-control 의 mode, data-table 의 density).
// 선택 객체·URL 에서는 겹치는 변형 축만 `variant.` 접두사로 구분한다. 겹치지 않는 축(size, shape 등)은 이름 그대로다.
export const PLAYGROUND_KEYS = Object.freeze(['palette', 'subtokenSet', 'visualFamily', 'typeSystem', 'density', 'mode', 'viewport', 'exampleText', 'tab']);

export const variantKey = name => PLAYGROUND_KEYS.includes(name) ? `variant.${name}` : name;

/** 선택 키가 가리키는 변형 축 이름. 변형 축이 아니면 null. */
export function variantNameOf(key, material) {
  const name = key.startsWith('variant.') ? key.slice('variant.'.length) : key;
  if (!Object.hasOwn(material?.variants ?? {}, name)) return null;
  return variantKey(name) === key ? name : null;
}
