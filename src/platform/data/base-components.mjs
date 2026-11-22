/** 기반 컴포넌트(컴포넌트 패밀리 작업 소유). 기존 2.6.0 컨트롤 재료의 계약·렌더러·CSS를 그대로 붙인다. 구현을 복사하지 않는다. */
import {cardContract, renderCard, cardStyles} from '../../materials/card.mjs';
import {definePlatformMaterial} from '../contract.mjs';

export const BASE_COMPONENTS = Object.freeze([
  definePlatformMaterial({
    id: 'base-component:card-surface', kind: 'base-component', label: 'Card', contract: cardContract.id,
    render: {module: 'src/materials/card.mjs', export: 'renderCard'}, styles: {module: 'src/materials/card.mjs', export: 'cardStyles'}, dependencies: ['component:button-control'],
    quality: {status: 'implemented', evidence: []}, reuses: [cardContract.id],
  }),
]);

/** id → 실제 구현. registry.kind('base-component').implement(id, impl)로 붙인다. */
export const BASE_IMPLEMENTATIONS = Object.freeze({
  'base-component:card-surface': Object.freeze({contract: cardContract, render: renderCard, styles: cardStyles}),
});
