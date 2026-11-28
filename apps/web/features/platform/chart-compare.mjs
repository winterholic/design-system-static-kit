// 시각화 비교는 같은 데이터 하나를 여러 등록 chart preset 에 넣어 Core 조립(assembleDesign)이 받는지 본다. 받지 못하는 preset 은 Core 의 거부 이유와 함께 막는다.
export const CHART_SAMPLE = Object.freeze({
  title: '월별 매출', caption: '같은 데이터 · 백만 원', unit: '백만 원',
  categories: Object.freeze(['1월', '2월', '3월', '4월']),
  series: Object.freeze([{name: '매출', values: Object.freeze([12, 18, 15, 22])}]),
});

/** 조립 요청에 같은 데이터의 차트 한 개를 얹는다. 다른 필드(재료·콘텐츠)는 그대로 둔다. */
export function withChartPreset(request, presetId) {
  const content = {...(request.content ?? {}), charts: [{preset: presetId, ...structuredClone(CHART_SAMPLE)}]};
  return {...request, content};
}
