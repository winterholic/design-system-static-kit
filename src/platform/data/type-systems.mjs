/** 타이포 시스템(타이포 작업 소유). 기존 서체 프리셋(서체 짝)과 역할형 프리셋(역할 크기)을 id로 묶는다. 값은 src/platform/type.mjs가 기존 표에서 읽는다. */
import {definePlatformMaterial} from '../contract.mjs';

export const TYPE_SYSTEMS = Object.freeze([
  definePlatformMaterial({
    id: 'type-system:tech-erp', kind: 'type-system', label: '테크 서체 × ERP 역할', contexts: ['dashboard', 'data', 'listing', 'settings'],
    facePairing: 'type-preset:tech', roleScale: 'type-role-preset:erp', numerals: 'tabular',
    quality: {status: 'implemented', evidence: []}, reuses: ['type-preset:tech', 'type-role-preset:erp'],
  }),
]);
