/**
 * 디자인 프로파일 공개 진입점(카탈로그 2.6.0).
 *   data.mjs      프로파일 7개·레이아웃 패턴 11개·좁은 화면 전략·규칙(PF01~PF13). 데이터만
 *   check.mjs     Blueprint 정적 검사(checkProfile). 검증기가 profile이 있는 2.6.0 Blueprint에 부른다
 *   registry.mjs  재료 등록(profile·pattern 종류)과 참조·프로파일 무결성(designRegistry)
 *   assemble.mjs  결정적 조립(assemble)
 */
export {PROFILES, PROFILE_IDS, PATTERNS, PATTERN_IDS, PROFILE_RULES, PROFILE_AXES, NARROW_STRATEGIES, INFO_DENSITY, PROFILE_SINCE, defaultPattern} from './data.mjs';
export {checkProfile, profileErrors} from './check.mjs';
export {PROFILE_KIND, patternMaterials, profileMaterial, profileIntegrity, designRegistry, sharedDesignRegistry, pendingMaterials} from './registry.mjs';
export {assemble, INTENT_KEYS, CONTENT_KEYS} from './assemble.mjs';
