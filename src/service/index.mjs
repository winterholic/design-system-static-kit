/**
 * Core 서비스 계층의 유일한 공개 진입점(ADR 0009). Studio(브라우저 미리보기)·REST API v1·MCP·CLI가 같은 함수를 부른다.
 * 채널마다 검증 로직을 따로 두지 않는다.
 *
 * 모든 함수는 던지지 않고 같은 봉투를 돌려준다.
 *   {ok: true,  value, warnings, catalogVersion, contractVersion}
 *   {ok: false, errors, warnings, catalogVersion, contractVersion}   Diagnostic = {code, path, message, hint} + optional rule, fix, severity, contract
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
export {CONTRACT_VERSION} from './envelope.mjs';
export {HINTS, DEFAULT_HINT, hintFor, withHint, diagnostic} from './errors.mjs';
