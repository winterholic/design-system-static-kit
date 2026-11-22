/**
 * 조립 플랫폼 내부 진입점(ADR 0012). 패키지 공개 경로(./service, ./edit)가 아니다. 공개는 조립 엔진 작업이 서비스 함수로 감싼 뒤에 한다(ADR 0012 §7).
 */
export * from './contract.mjs';
export {createPlatformRegistry, PlatformError} from './registry.mjs';
export {createRelationGraph, defineCheck, edgeApplies} from './relations.mjs';
export {recommend, AXIS_PREFERENCE_WEIGHT} from './recommend.mjs';
export {bindColor, paletteSubtokenCheck, COLOR_CHECKS} from './color.mjs';
export {bindType, TYPE_CHECKS} from './type.mjs';
export {FAMILY_CHECKS, familyMemberCheck, familyShapeVars, renderMember, memberCombinations, memberErrors, contrastPairs, requiredVars} from './family.mjs';
export {assemblePlatform, normalizeRequest, resolveStyleContext, selectMaterials, checkCombination, bindTokens, composeComponents, emit, STAGES, REQUEST_KEYS, COMPONENT_KEYS} from './pipeline.mjs';
export {createPlatform, MINIMAL_REQUEST, PLATFORM_CHECKS} from './examples/minimal.mjs';
