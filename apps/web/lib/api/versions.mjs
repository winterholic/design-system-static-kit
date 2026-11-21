// 클라이언트가 기대하는 catalogVersion 확인. 판정은 서비스가 한다.
// validate·compile 은 서비스 opts.catalogVersion 이 직접 검사한다. 조회·설명처럼 서비스에 그 옵션이 없는 호출은
// 서비스의 같은 검사를 빈 문서로 한 번 불러 UNSUPPORTED_VERSION 판정만 빌려 쓴다(버전 목록을 채널이 따로 갖지 않는다).
import {validateBlueprint} from '@winterholic/design-system-static-kit/service';
import {channelError} from './diagnostics.mjs';

/**
 * @param {unknown} expected 요청이 기대한 catalogVersion(없으면 검사하지 않는다)
 * @returns {null | object} 거부 봉투 또는 null
 */
export function rejectUnexpectedVersion(expected) {
  if (expected === undefined) return null;
  const probe = validateBlueprint({}, {catalogVersion: expected});
  const unsupported = probe.errors?.find(e => e.code === 'UNSUPPORTED_VERSION');
  if (unsupported) return {...probe, errors: [{...unsupported, path: '$args.catalogVersion'}], warnings: []};
  if (expected !== probe.catalogVersion) {
    return channelError('CATALOG_VERSION', '$args.catalogVersion', `요청한 catalogVersion(${expected})과 서버가 조회로 제공하는 값(${probe.catalogVersion})이 다릅니다.`, `이 서버의 조회는 ${probe.catalogVersion} 만 제공합니다. 그 값으로 요청하거나 catalogVersion 을 빼세요.`);
  }
  return null;
}
