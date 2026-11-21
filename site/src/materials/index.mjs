/**
 * 재료 계약 공개 진입점(ADR 0011). 후속 재료 작업자는 여기서 가져온다.
 *   contract.mjs  공통 필드·종류·분류·맥락·품질·조합/프리셋 정의
 *   validate.mjs  재료 한 장과 참조 그래프 검사
 *   registry.mjs  등록·조회·검색·필터·수량
 *   adapters.mjs  기존 카탈로그 → 재료
 *   typography.mjs 역할형 타이포그래피 재료(type-role-preset)와 컨트롤 크기 관계
 */
import {createRegistry} from './registry.mjs';
import {catalogMaterialList} from './adapters.mjs';
import {registerMaterialType} from './typography.mjs';
export {chartPresetMaterials} from './chart-presets.mjs';
export {resolveChartPreset} from '../render/chart-presets.mjs';
export * from './contract.mjs';
export {validateMaterial, validateGraph, MATERIAL_VERSIONS} from './validate.mjs';
export {createRegistry, MaterialError} from './registry.mjs';
export * from './adapters.mjs';
export {registerMaterialType, MATERIAL_TYPE_PRESETS, MULTILINGUAL_TYPE_CORPUS, CONTROL_SIZES, controlViolations, renderMaterialTypeCSS, renderMaterialTypeExample} from './typography.mjs';

/** 기존 카탈로그와 역할형 타이포그래피 재료를 모두 등록한 새 레지스트리. 참조가 끊기면 예외다(카탈로그와 재료가 어긋났다는 뜻). */
export function catalogRegistry() {
  const registry = registerMaterialType(createRegistry().registerAll(catalogMaterialList()));
  const broken = registry.check();
  if (broken.length) { const error = new Error('material graph broken:\n' + broken.slice(0, 10).map(e => `${e.path} [${e.code}] ${e.message}`).join('\n')); error.errors = broken; throw error; }
  return registry;
}
