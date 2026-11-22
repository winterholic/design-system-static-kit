/**
 * 페이지 파이프라인 시험용 재료. 막힌 후보와 금지 조합을 결정적으로 시험하려고 일부러 실패하는 기록을 더한다.
 *   palette:pale-test        어떤 서브토큰 세트와도 글자 대비를 맞추지 못하는 옅은 팔레트
 *   type-system:serif-heavy-test  세리프 제목 × 굵은 제목 역할(한글 세리프 굵기 상한 초과)
 *   family:hard-test         모양 elevation=hard(X04: 그라데이션 배경과 금지), family:glow-test elevation=glow(X05: light 모드와 금지)
 * 실제 재료는 W1~W4가 data 파일에 등록한다. 이 파일의 id는 -test로 끝나 실제 재료와 겹치지 않는다.
 */
import {createPlatform, definePlatformMaterial} from '../src/platform/index.mjs';
import {FAMILIES} from '../src/platform/data/families.mjs';

const ALL_PAGE = ['dashboard', 'data', 'listing', 'settings', 'landing', 'article', 'docs', 'commerce'];
const palette = (name, seeds, extra = {}) => definePlatformMaterial({id: `palette:${name}`, kind: 'palette', label: name, tone: 'mid', seeds, ...extra});

const quiet = FAMILIES.find(f => f.id === 'family:quiet');
const shaped = (id, label, shape) => definePlatformMaterial({...structuredClone(quiet), id, label, contexts: ALL_PAGE, shape, relations: [], quality: {status: 'implemented', evidence: []}});

export const FIXTURE_RECORDS = Object.freeze([
  // 브랜드·중립이 거의 같은 명도의 옅은 색: 어떤 세트에서도 글자 대비를 맞추지 못하게 한다(막힌 후보 시험)
  palette('pale-test', {brand: '#E8E8D0', neutral: '#EDEDED', accent: '#F0F0C0', success: '#E0F0E0', warning: '#F0F0C0', danger: '#F0E0E0', info: '#E0E8F0'}),
  // 세리프 제목 × 굵은 제목 역할(750): 한글 세리프 굵기 한도로 거부되는 조합
  definePlatformMaterial({id: 'type-system:serif-heavy-test', kind: 'type-system', label: '세리프 × 마케팅', contexts: ['article', 'landing', 'commerce'], facePairing: 'type-preset:editorial', roleScale: 'type-role-preset:marketing', numerals: 'proportional'}),
  // 모양이 hard(굵은 오프셋 그림자): 배경이 gradient인 스타일과 X04로 충돌한다. glow 변형은 light 모드와 X05로 충돌한다.
  // 구성원은 실제 family:quiet의 것을 그대로 쓴다(컴포넌트 사이 의존 같은 계약이 바뀌어도 시험 재료가 따라가도록).
  shaped('family:hard-test', '굵은 카드', {radius: 'square', elevation: 'hard', motion: 'none'}),
  shaped('family:glow-test', '글로우 카드', {radius: 'round', elevation: 'glow', motion: 'lively'}),
]);

/** 기본 레지스트리에 시험용 재료를 더한 플랫폼. extra로 기록을 더 줄 수 있다. */
export const createFixturePlatform = (extra = []) => createPlatform({records: [...FIXTURE_RECORDS, ...extra]});
