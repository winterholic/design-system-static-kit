import {CATALOG_VERSION, SUPPORTED_CATALOG_VERSIONS} from '../catalog.mjs';
import {diagnostic} from './errors.mjs';

/**
 * 호출자가 기대하는 catalogVersion을 확인한다. 지원하지 않는 값이면 UNSUPPORTED_VERSION,
 * 문서가 다른 버전을 선언하면 CATALOG_VERSION 오류다. 검증은 문서가 선언한 버전의 규칙으로 하므로 값을 바꾸지 않는다.
 */
export function checkExpectedVersion(expected, blueprint) {
  if (expected === undefined) return null;
  if (typeof expected !== 'string' || !SUPPORTED_CATALOG_VERSIONS.includes(expected)) {
    return diagnostic('UNSUPPORTED_VERSION', '$args.opts.catalogVersion', `지원하지 않는 catalogVersion: ${String(expected)}`, `지원 버전: ${SUPPORTED_CATALOG_VERSIONS.join(', ')} (현재 ${CATALOG_VERSION})`);
  }
  const declared = blueprint !== null && typeof blueprint === 'object' ? blueprint.catalogVersion : undefined;
  if (declared !== undefined && declared !== expected) {
    return diagnostic('CATALOG_VERSION', '$.catalogVersion', `요청한 catalogVersion(${expected})과 문서가 선언한 값(${String(declared)})이 다릅니다.`);
  }
  return null;
}
