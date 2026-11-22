import {CHART_W_SCROLL, CHART_FONT} from '../catalog/chart-rules.mjs';

/**
 * 카탈로그 2.6.0 차트(`data-chart="2.6"`) 전용 CSS. 2.4.0·2.5.0 출력은 이 파일을 지나지 않아 바이트가 같다.
 * SVG 글자는 viewBox 단위라서 .kit-chart svg의 최소 폭(280px)에서 0.78배로 줄어든다. 13px로 두면 10.1px로 보여 SMALL_TEXT 하한(10px)을 지킨다.
 */
export const chartExtensionCSS = () => `.kit-chart[data-chart] :is(.ch-t,.ch-v,.ch-vh){font-size:${CHART_FONT}px}
.kit-chart[data-chart] .ch-vh{fill:var(--kit-text);font-weight:600;paint-order:stroke;stroke:var(--kit-surface);stroke-width:3px;stroke-linejoin:round}
.kit-chart[data-chart] .ch-axis{stroke:var(--kit-muted);stroke-width:1.25;fill:none}
.kit-chart[data-chart] .ch-conn{stroke:var(--kit-muted);stroke-width:1;stroke-dasharray:3 3;fill:none}
.kit-chart[data-chart] .ch-flow{opacity:.14}
.kit-chart[data-chart] .ch-wick{stroke-width:2;fill:none;stroke-linecap:round}
.kit-chart[data-chart] .ch-body{stroke-width:2}
.kit-chart[data-chart] .ch-ohlc{stroke-width:2.25;fill:none;stroke-linecap:round}
.kit-chart[data-legend=right] .kit-legend{flex-direction:column;flex:0 1 150px}
.kit-chart-scroll{flex:1 1 280px;min-width:0;overflow-x:auto;overscroll-behavior-x:contain}
.kit-chart-scroll:focus-visible{outline:2px solid var(--kit-link);outline-offset:2px}
.kit-chart .kit-chart-scroll svg{width:${CHART_W_SCROLL}px;min-width:${CHART_W_SCROLL}px;max-width:none;max-height:none;flex:none}
`;
