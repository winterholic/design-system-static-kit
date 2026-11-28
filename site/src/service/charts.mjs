/**
 * Core 서비스 계층의 차트 프리셋 렌더 서비스 함수.
 * Core 내부 renderChartPreset를 감싸 표준 결과 봉투와 진단을 제공한다.
 */
import {chartPresetMaterials} from '../materials/chart-presets.mjs';
import {renderChartPreset as coreRenderChartPreset} from '../render/chart-presets.mjs';
import {ok, fail, guard, isPlain, jsonClone, checkKeys, badRequest} from './envelope.mjs';
import {diagnostic} from './errors.mjs';

const byId = new Map(chartPresetMaterials.map(m => [m.id, m]));

export function renderChartPreset(id, data = {}, options = {}) {
  return guard(() => {
    if (typeof id !== 'string' || !id) {
      return fail([badRequest('$args.id', '차트 프리셋 id가 필요합니다.', 'chartPresetMaterials 목록을 확인하세요.')]);
    }
    if (data !== undefined && data !== null && !isPlain(data)) {
      return fail([badRequest('$args.data', '차트 데이터는 객체여야 합니다.')]);
    }
    if (options !== undefined && !isPlain(options)) {
      return fail([badRequest('$args.options', 'options는 객체여야 합니다.')]);
    }
    const opts = options === undefined ? {} : options;
    const badKey = checkKeys(opts, ['colorRoles'], '$args.options');
    if (badKey) return fail([badKey]);
    if (opts.colorRoles !== undefined && typeof opts.colorRoles !== 'boolean') {
      return fail([badRequest('$args.options.colorRoles', 'colorRoles는 불리언이어야 합니다.')]);
    }

    const material = byId.get(id);
    if (!material) {
      return fail([diagnostic('UNKNOWN_CHART_PRESET', '$args.id', `등록되지 않은 차트 프리셋: ${id}`, 'listMaterials({kind: "chart-preset"})로 id를 조회하세요.')]);
    }

    const rendered = coreRenderChartPreset(id, data ?? {}, opts);
    if (typeof rendered !== 'string') {
      const errors = (rendered?.errors ?? []).map(e => diagnostic(e.code ?? 'CHART_DATA_INVALID', `$args.data${e.path ? `.${e.path}` : ''}`, e.message ?? '차트 렌더링에 실패했습니다.'));
      return fail(errors.length ? errors : [diagnostic('CHART_RENDER_FAILED', '$args', '차트 렌더링에 실패했습니다.')]);
    }

    return ok(jsonClone({html: rendered}));
  });
}
