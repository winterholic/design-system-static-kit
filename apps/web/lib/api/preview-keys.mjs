// 사전 생성 미리보기의 캐시 키(CONTRACTS §5.2). 빌드 시점 생성기와 웹 화면이 같은 함수로 키를 만든다.
// 화면은 자기가 그릴 요청의 키를 만들어 사전 생성 목록에 있으면 정적 파일을 쓰고, 없으면 사전 생성물을 쓰지 않는다.
// 그래서 요청이 조금이라도 다르면(샘플·모드·콘텐츠) 다른 요청의 그림이 대신 나오는 일이 구조적으로 없다.
import {CONTRACT_VERSION, PLATFORM_CONTRACT_VERSION, catalogSnapshot, getPlatformMaterial} from '@winterholic/design-system-static-kit/service';
import {LruCache, computePreviewCacheKey} from './cache.mjs';

export const ENGINE_VERSION = `${PLATFORM_CONTRACT_VERSION}/${CONTRACT_VERSION}`;
export const CATALOG_VERSION = catalogSnapshot().version;

// 요청 안의 임의 문자열도 조회 대상이 되므로(REST·렌더 주소) 메모에도 상한을 둔다.
const versionMemo = new LruCache(1000);
const platformVersion = id => {
  let version = versionMemo.get(id);
  if (version === undefined) {
    const r = getPlatformMaterial({id});
    version = r.ok ? r.value.version ?? CATALOG_VERSION : 'unregistered';
    versionMemo.set(id, version);
  }
  return version;
};
const ID = /^[a-z][a-z0-9-]*:[A-Za-z0-9._-]+$/;

/** 요청이 고른 재료 id("kind:name")를 모은다. 사용자 콘텐츠(content, items[].content, props)는 재료 선택이 아니므로 읽지 않는다. */
export function platformMaterialIds(request) {
  const found = new Set();
  const walk = (value, key) => {
    if (key === 'content' || key === 'props') return;
    if (typeof value === 'string') { if (ID.test(value)) found.add(`${value}@${platformVersion(value)}`); return; }
    if (Array.isArray(value)) value.forEach(v => walk(v, key));
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  walk(request, '');
  return [...found];
}

/** Explore 대표 디자인(템플릿 + 테마·변형·팔레트·모드·슬롯)이 고른 재료. Blueprint 재료의 버전은 카탈로그 버전이다. */
export function designMaterialIds(ref) {
  return [
    `template:${ref.template}@${CATALOG_VERSION}`,
    ...(ref.theme ? [`theme:${ref.theme}@${CATALOG_VERSION}`] : []),
    ...(ref.variant ? [`theme-variant:${ref.theme}/${ref.variant}@${CATALOG_VERSION}`] : []),
    ...(ref.palette ? [`palette:${ref.palette}@${CATALOG_VERSION}`] : []),
    ...Object.entries(ref.layout ?? {}).map(([slot, option]) => `layout:${slot}/${option}@${CATALOG_VERSION}`),
  ];
}

const key = (materialIds, request, mode, viewportWidth) =>
  computePreviewCacheKey({engineVersion: ENGINE_VERSION, catalogVersion: CATALOG_VERSION, materialIds, request, mode, viewportWidth});

/**
 * 사전 생성 대상 하나의 캐시 키.
 *  - {kind: 'design', ref, width}        Explore 대표 디자인
 *  - {kind: 'component', type, version, width}  부품 상세의 기본 렌더(version 은 재료 버전)
 *  - {kind: 'assemble', request, width}  assembleDesign 의 첫 후보
 *  - {kind: 'components', request, width}  assembleComponents
 *  - {kind: 'material', id, version, width}  카탈로그 목록 카드의 재료 하나(차트 프리셋·레이아웃·상태 패턴·미디어 등)
 */
export function previewKeyOf(target) {
  // width 를 생략하면 데스크톱 기본(1280). null 이면 화면 크기와 무관한 서버 캐시 키("default")다.
  const width = target.width === undefined ? 1280 : target.width;
  switch (target.kind) {
    case 'design': return key(designMaterialIds(target.ref), {kind: 'design', ref: target.ref}, target.ref.mode ?? 'default', width);
    case 'component': return key([`component:${target.type}@${target.version ?? CATALOG_VERSION}`], {kind: 'component', type: target.type}, 'default', width);
    case 'assemble': return key(platformMaterialIds(target.request), {kind: 'assemble', request: target.request}, target.request.mode ?? 'light', width);
    case 'components': return key(platformMaterialIds(target.request), {kind: 'components', request: target.request}, target.request.mode ?? 'light', width);
    // 카탈로그 목록 카드: 재료 하나의 대표 렌더(차트 프리셋·레이아웃·상태 패턴 등). 재료 id와 버전이 키를 정한다.
    case 'material': return key([`${target.id}@${target.version ?? CATALOG_VERSION}`], {kind: 'material', id: target.id}, 'light', width);
    default: throw new Error(`previewKeyOf: 알 수 없는 kind ${target.kind}`);
  }
}
