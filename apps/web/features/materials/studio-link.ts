import {startUrl} from '../studio/url';
import {writeState} from '../platform/assemble-state';

// 재료에서 Studio로 넘기는 링크의 단일 출처. 값 검증과 선택 가능성 판정은 Studio와 Core가 하고, 여기서는 시작 상태 요청만 만든다.

/** Static Kit 색 토큰(static-kit)을 켠 문서로 시작한다. */
export const studioForColor = (mode?: 'light' | 'dark') => startUrl({catalogVersion: '2.6.0', colorPalette: 'static-kit', ...(mode ? {mode} : {})});

/** 스타일 축 값 하나를 적용한 문서로 시작한다. mode 축은 문서 색 모드다. */
export const studioForAxis = (axis: string, value: string) => (axis === 'mode' ? startUrl({catalogVersion: '2.6.0', mode: value}) : startUrl({catalogVersion: '2.6.0', axes: {[axis]: value}}));

/** 타이포그래피 프리셋의 서체 엔진을 서체 조합 축으로 적용하고, 프리셋이 어울리는 첫 템플릿에서 시작한다. */
export const studioForPreset = (preset: string, template: string | null) => startUrl({catalogVersion: '2.6.0', ...(template ? {template} : {}), typeRoles: preset});

/** 신규 플랫폼 타이포 시스템을 2.7.0 조립 흐름에서 선택한 상태로 연다. */
export const studioForTypeSystem = (id: string, purpose = 'saas-landing') => {
  const type = id.replace(/^type-system:/, '');
  if (!/^[a-z0-9-]{1,64}$/.test(type)) return writeState({step: 'purpose'});
  return writeState({purpose, type, step: 'swap'});
};
