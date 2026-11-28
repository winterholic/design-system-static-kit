/**
 * Core 서비스 계층의 유일한 공개 진입점(ADR 0009). Studio(브라우저 미리보기)·REST API v1·MCP·CLI가 같은 함수를 부른다.
 * 채널마다 검증 로직을 따로 두지 않는다.
 *
 * 모든 함수는 던지지 않고 같은 봉투를 돌려준다.
 *   {ok: true,  value, warnings, catalogVersion, contractVersion}
 *   {ok: false, errors, warnings, catalogVersion, contractVersion}   Diagnostic = {code, path, message, hint} + optional rule, fix, severity, contract
 * 플랫폼 조립(assembleDesign)과 플랫폼 재료 질의(listPlatformMaterials, getPlatformMaterial, recommendMaterials, checkCompatibility)도 같은 봉투를 쓴다(ADR 0012 §9.6).
 * 재료 읽기 질의(listMaterials, getMaterial, getColorTokens, getTypePresets)는 같은 봉투를 쓰는 읽기 전용 함수다(materials.mjs).
 * 순수 ES 모듈이다. node:*, DOM, React, Next.js, import.meta를 쓰지 않아 브라우저와 Node에서 같게 동작한다.
 */
export {listCatalog, getSchema, getComponentSpec, catalogSnapshot, CATALOG_KINDS} from './query.mjs';
export {listMaterials, getMaterial, getColorTokens, getTypePresets} from './materials.mjs';
export {validateBlueprint} from './validate.mjs';
export {compileBlueprint} from './compile.mjs';
export {explainDecisions} from './explain.mjs';
export {assembleBlueprint} from './assemble.mjs';
export {queryMaterials, MATERIAL_VIEWS} from './materials-query.mjs';
export {assembleDesign} from './assemble-design.mjs';
export {listEditOps, applyEdit} from './edit.mjs';
export {listPlatformMaterials, getPlatformMaterial, getTypographySpecimen, recommendMaterials, checkCompatibility} from './platform-materials.mjs';
export {proposeSubtokenSets, assembleComponents} from './platform-components.mjs';
export {CONTRACT_VERSION} from './envelope.mjs';
// 미리보기 캐시 키(CONTRACTS §5.2)가 엔진 버전을 "플랫폼 계약/서비스 계약"으로 만들 수 있도록 읽기 전용 상수만 내보낸다.
export {PLATFORM_CONTRACT_VERSION} from '../platform/contract.mjs';
export {HINTS, DEFAULT_HINT, hintFor, withHint, diagnostic} from './errors.mjs';

