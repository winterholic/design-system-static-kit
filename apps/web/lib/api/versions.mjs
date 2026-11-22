// 클라이언트가 기대하는 catalogVersion 확인. 판정은 서비스가 한다.
// validate·compile 은 서비스 opts.catalogVersion 이 직접 검사한다. 조회·설명처럼 서비스에 그 옵션이 없는 호출은
// 서비스의 같은 검사를 빈 문서로 한 번 불러 UNSUPPORTED_VERSION 판정만 빌려 쓴다(버전 목록을 채널이 따로 갖지 않는다).
import {validateBlueprint} from '@winterholic/design-system-static-kit/service';
import {channelError} from './diagnostics.mjs';

/**
 * @param {unknown} expected 요청이 기대한 catalogVersion(없으면 검사하지 않는다)
 * @returns {null | object} 거부 봉투 또는 null
 */
export function rejectUnexpectedVersion(expected, {kind} = {}) {
  if (expected === undefined) return null;
  const probe = validateBlueprint({}, {catalogVersion: expected});
  const unsupported = probe.errors?.find(e => e.code === 'UNSUPPORTED_VERSION');
  if (unsupported) return {...probe, errors: [{...unsupported, path: '$args.catalogVersion'}], warnings: []};
  // 권리 감사(R1): 외부(Coolors) 팔레트 목록은 서버 기본 카탈로그 버전으로만 낸다. 2.5.0·2.6.0 요청은 팔레트 데이터 없이 거부한다(색은 내부 팔레트로 고른다).
  if (kind === 'palettes' && expected !== probe.catalogVersion) {
    return channelError('CATALOG_VERSION', '$args.catalogVersion', `요청한 catalogVersion(${expected})과 서버가 조회로 제공하는 값(${probe.catalogVersion})이 다릅니다.`, `팔레트 목록은 ${probe.catalogVersion} 만 제공합니다. 그 값으로 요청하거나 catalogVersion 을 빼세요.`);
  }
  // D3(ADR 0012 §8): 서비스가 받는 버전이면 채널이 거부하지 않는다. 버전을 받는 조회는 아래 함수가 서비스 인자로 그대로 넘기고, 버전과 무관한 조회(테마·팔레트 등)는 같은 결과를 낸다.
  return null;
}

/** 부품 목록 조회는 버전에 따라 달라지므로 filter.catalogVersion으로 넘긴다(서비스가 같은 이름의 필터를 받는다). */
export const listArgs = (args, catalogVersion) => (catalogVersion !== undefined && args.kind === 'components' ? {...args, filter: {...(args.filter ?? {}), catalogVersion}} : args);
/** 스키마 조회는 부품 스키마(모든 지원 버전)와 2.7.0 Blueprint 스키마에서 버전을 받는다. 그 밖의 대상은 버전과 무관하다. */
export const schemaArgs = (args, catalogVersion) => (catalogVersion !== undefined && (args.target === 'component' || (args.target === 'blueprint' && catalogVersion === '2.7.0')) ? {...args, catalogVersion} : args);
