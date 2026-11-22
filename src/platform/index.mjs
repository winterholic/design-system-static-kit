/**
 * 조립 플랫폼 내부 진입점(ADR 0012). 패키지 공개 경로(./service, ./edit)가 아니다. 공개는 조립 엔진 작업이 서비스 함수로 감싼 뒤에 한다(ADR 0012 §7).
 */
export * from './contract.mjs';
export {createPlatformRegistry, PlatformError} from './registry.mjs';
export {createRelationGraph, defineCheck, edgeApplies} from './relations.mjs';
export {recommend, axisPreference, AXIS_PREFERENCE_WEIGHT} from './recommend.mjs';
export {bindColor, designOf, paletteSubtokenCheck, COLOR_CHECKS, colorMatrix, proposeSubtokenSets, assignSeeds, paletteRamps} from './color.mjs';
export {SUBTOKEN_SET_DESIGNS, DEFAULT_DESIGN} from './data/subtoken-sets.mjs';
export {bindType, TYPE_CHECKS} from './type.mjs';
export {FAMILY_CHECKS, familyMemberCheck, familyShapeVars, renderMember, memberCombinations, memberErrors, contrastPairs, requiredVars} from './family.mjs';
export {assemblePlatform, normalizeRequest, resolveStyleContext, selectMaterials, checkCombination, bindTokens, composeComponents, emit, STAGES, REQUEST_KEYS, COMPONENT_KEYS} from './pipeline.mjs';
export {assemblePage, exploreCandidates, evaluateCombo, assembleCombo, compareCandidates, legacyTokens, summarizePlan, diversify, DIVERSITY_PENALTY, PAGE_STAGES, BEAM} from './page.mjs';
export {normalizePageRequest, planPage, columnsFor, PURPOSES, PURPOSE_IDS, PAGE_REQUEST_KEYS, PAGE_CONTENT_KEYS, PAGE_COMPONENT_KEYS, TABLE_PAGE_ROWS, TABLE_TOOLBAR_ROWS, nodeTypeOfBase, baseIsPlaceable} from './page-content.mjs';
export {buildAxisValues, banPairs, styleForbidRelations, withStyleForbids, axisIds, materialAxisIds} from './axes.mjs';
export {createPlatform, MINIMAL_REQUEST, PLATFORM_CHECKS} from './examples/minimal.mjs';
export {checkStyleMaterials, rankStyleMaterials, assembleStyleMaterials, styleMaterialsCSS, styleMaterialAttrs, surfaceScopeCSS, STYLE_VALIDATORS, STATE_KINDS} from './style-materials.mjs';
export {PURPOSE_FAMILY_IDS, PURPOSE_FAMILIES, PURPOSE_FIELDS, VISUAL_LANGUAGES, VISUAL_KEYS, getPurposeFamily, listPurposeFamilies, validatePurposeFamilies, renderPurposeFamily, assembleFamilies, combinationMatrix, validatePurposeFamily, checkPurposeCombination} from './families/index.mjs';
export {ICON_CSS} from './families/kit.mjs';
export {PURPOSE_CHECKS, purposeFamilyVisualCheck, purposeFamilyBaseCheck} from './examples/minimal.mjs';
