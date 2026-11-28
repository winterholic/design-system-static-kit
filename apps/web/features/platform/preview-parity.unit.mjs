// 사전 생성(scripts/build-catalog-index.mjs)이 보내는 사례 요청이 웹 Explore 가 보내는 요청과 같은지 확인한다.
// 같지 않으면 캐시 키가 달라져 목록 카드가 정적 미리보기를 못 찾는다(그 경우 카드는 동적 SVG 로 내려가 "목록 요청 컴파일 0회"가 깨진다).
import assert from 'node:assert/strict';
import test from 'node:test';
import {PLATFORM_CASES} from './cases.ts';
import {readState, requestOf, writeState} from './assemble-state.ts';
import {caseRequest} from '../../../../scripts/lib/preview-requests.mjs';
import {canonicalize} from '../../lib/api/cache.mjs';
import {previewKeyOf} from '../../lib/api/preview-keys.mjs';

test('Explore 사례 카드가 보내는 요청 = 사전 생성이 만든 요청', () => {
  assert.ok(PLATFORM_CASES.length > 0);
  for (const k of PLATFORM_CASES) {
    // apps/web/app/explore/page.tsx 의 PlatformCases 와 같은 경로
    const state = readState(new URLSearchParams(writeState({...k.state, step: 'swap'}).split('?')[1]));
    const web = requestOf(state);
    assert.equal(canonicalize(web), canonicalize(caseRequest(k)), `${k.id}: 요청이 다르다`);
    assert.equal(previewKeyOf({kind: 'assemble', request: web}), previewKeyOf({kind: 'assemble', request: caseRequest(k)}));
  }
});
