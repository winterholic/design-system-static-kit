import {nodeSpecs, nodeTypes, str, en, arr, num, obj, iconEnum} from './nodes.mjs';
import {atLeast} from './expression.mjs';
import {CHART_FORM_KINDS, CHART_DATA_TYPES, CHART_GRIDS, CHART_LABELS, CHART_LEGENDS, CHART_DENSITIES, CHART_RESPONSIVE} from './chart-rules.mjs';
import {buttonContract} from '../materials/button.mjs';
import {inputContract} from '../materials/input.mjs';
import {cardContract} from '../materials/card.mjs';
import {navigationContract} from '../materials/navigation.mjs';
import {modalContract} from '../materials/modal.mjs';
import {tabsContract} from '../materials/tabs.mjs';
import {tooltipContract} from '../materials/tooltip.mjs';
import {feedbackContract} from '../materials/feedback.mjs';

/**
 * 버전별 노드 명세 확장 표. `nodeSpecs`(src/catalog/nodes.mjs)는 2.1.0~2.5.0이 받아들이는 문법이고 snapshot 바이트
 * (site/v1/catalog.json)의 일부라서 여기서 넓히지 않는다. 아직 열리지 않은 카탈로그 버전의 문법은 이 표에만 둔다.
 * 항목의 필드는 같은 이름의 기본 필드를 덮어쓰고, `optional`은 기본 목록을 대체한다.
 * 켜짐 여부는 2.6.0 opt-in 게이트와 같은 `atLeast(catalogVersion, since)`(src/catalog/expression.mjs의 `VERSION_ORDER`)로 판단한다.
 *
 * 기본 명세에 없는 type(`select-control`, `data-table`)은 `label`을 가진 항목으로 이 표에 노드째 둔다. 이런 노드는 `placeLike`가 가리키는 부품을 받는 모든 부모
 * (`table`을 받는 부모는 `data-table`도 받는다)에 들어갈 수 있고, 그 자리는 같은 버전 게이트 뒤에서만 열린다.
 * 열거값은 재료 계약(src/materials/select.mjs, table.mjs)과 같아야 한다. 이 파일은 컴파일 경로 안이라 재료 모듈을 읽지 않으므로 tests/wire-260.test.mjs가 두 곳이 같음을 확인한다.
 */
const N = num(-1000000, 1000000);
export const CHART_BASE_KINDS = Object.freeze([...nodeSpecs.chart.fields.kind.enum]);
export const CHART_EXTENDED_KINDS = Object.freeze(['stacked-bar', 'scatter', 'heatmap', 'sparkline', ...CHART_FORM_KINDS]);

const idField = {...str(40), pattern: '^[a-z][a-z0-9-]*$'};
const yesNo = en('yes', 'no');
const selectOption = obj({value: str(80), label: str(80), group: str(40), disabled: en('yes')}, ['value', 'label']);
/** 표 셀은 문자열·숫자·불리언·null이다(재료 renderDataTable의 행 계약). 열 id가 키이므로 키 집합은 검증기가 열과 맞춘다(TABLE_ROWS). */
const tableCell = {oneOf: [str(200, 0), N, {type: 'boolean'}, {type: 'null'}]};
const tableRow = {type: 'object', properties: {id: idField}, required: [], additionalProperties: tableCell};
const tableColumn = obj({id: idField, label: str(60), sortable: yesNo, hideBelow: en('640px', '800px', '900px')}, ['id', 'label']);
const safeId = idField;
const bool = {type: 'boolean'};
const iconName = iconEnum;
const hrefField = str(2048, 1);
const labelOnlyAction = obj({label: str(80)}, ['label']);
const component = (contract, group, fields, required, example, placeLike) => ({
  label: contract.label, group, placeLike,
  fields: {...Object.fromEntries(Object.entries(contract.axes).map(([key, values]) => [key, en(...values)])), ...fields},
  defaults: contract.defaults,
  optional: Object.keys(contract.axes).filter(key => !required.includes(key)).concat(Object.keys(fields).filter(key => !required.includes(key))),
  required, example, forbidden: contract.forbidden,
  coverage: {mode: 'inherited', contracts: [], reason: `${contract.label}의 간격·크기·상태 계약은 등록 재료에서 그대로 가져옵니다.`},
});

const navLeaf = obj({label: str(80), href: hrefField, icon: iconName, current: bool, disabled: bool}, ['label', 'href']);
const navItem = obj({label: str(80), href: hrefField, icon: iconName, current: bool, disabled: bool, children: arr(navLeaf, 1, 8)}, ['label']);
const modalBodyItem = {oneOf: [
  {type: 'object', properties: {slot: {const: 'text'}, text: str(500)}, required: ['slot', 'text']},
  {type: 'object', properties: {slot: {const: 'input'}, id: idField, label: str(80), hint: str(160), placeholder: str(120), required: bool}, required: ['slot', 'id', 'label']},
]};
const tabItem = obj({id: idField, label: str(60), content: str(500), icon: iconName, disabled: bool}, ['id', 'label', 'content']);

const COMPONENT_EXTENSIONS = {
  'button-control': component(buttonContract, 'form', {label: str(80), id: idField, icon: iconName, ariaLabel: str(80), describedBy: str(240), labelledBy: str(240)}, ['label'], {type: 'button-control', id: 'save', label: '저장'}, 'form'),
  'input-control': component(inputContract, 'form', {id: idField, label: str(80), hint: str(160), message: str(160), placeholder: str(120), value: str(500), required: bool, name: str(80), icon: iconName}, ['id', 'label'], {type: 'input-control', id: 'name', label: '이름', placeholder: '프로젝트 이름', hint: '프로젝트 이름을 입력하세요.'}, 'form'),
  'card-surface': component(cardContract, 'content', {id: idField, title: str(100), body: str(500), meta: str(100), href: hrefField, mediaIcon: iconName, actions: arr(labelOnlyAction, 1, 2), message: str(160)}, ['id', 'title'], {type: 'card-surface', id: 'project', title: '프로젝트 개요', body: '진행 중인 작업을 한곳에서 확인합니다.'}, 'card'),
  'navigation-menu': component(navigationContract, 'nav', {id: idField, label: str(80), items: arr(navItem, 2, 8)}, ['id', 'label', 'items'], {type: 'navigation-menu', id: 'primary-nav', label: '주요 메뉴', items: [{label: '개요', href: '#main', current: true}, {label: '문서', href: 'https://example.com/docs'}]}, 'breadcrumb'),
  'modal-dialog': component(modalContract, 'feedback', {id: idField, title: str(100), description: str(200), body: arr(modalBodyItem, 0, 8), actions: arr(obj({label: str(80), role: en('cancel', 'confirm')}, ['label', 'role']), 0, 2), triggerLabel: str(80), message: str(160)}, ['id', 'title'], {type: 'modal-dialog', id: 'create-project', title: '새 프로젝트', description: '프로젝트 이름을 정합니다.', triggerLabel: '프로젝트 만들기', body: [{slot: 'input', id: 'project-name', label: '프로젝트 이름', placeholder: '예: 가을 캠페인'}], actions: [{label: '취소', role: 'cancel'}, {label: '만들기', role: 'confirm'}]}, 'notice'),
  'tabs-control': component(tabsContract, 'layout', {id: idField, label: str(80), tabs: arr(tabItem, 2, 6), selected: idField}, ['id', 'label', 'tabs'], {type: 'tabs-control', id: 'project-tabs', label: '프로젝트 보기', selected: 'overview', tabs: [{id: 'overview', label: '개요', content: '목표와 현재 상태를 요약합니다.'}, {id: 'tasks', label: '작업', content: '이번 주 작업을 확인합니다.'}]}, 'tabs'),
  tooltip: component(tooltipContract, 'feedback', {id: idField, triggerLabel: str(80), content: str(240), icon: iconName}, ['id', 'triggerLabel', 'content'], {type: 'tooltip', id: 'save-help', triggerLabel: '저장 위치', content: '내 문서 폴더에 저장됩니다.'}, 'notice'),
  'feedback-message': component(feedbackContract, 'feedback', {id: idField, message: str(240), title: str(100), actionLabel: str(80), dismissLabel: str(40)}, ['id', 'message'], {type: 'feedback-message', id: 'saved', message: '변경 사항을 저장했습니다.', tone: 'success'}, 'notice'),
};

const SELECT_FIELDS = {
  id: idField, label: str(80), options: arr(selectOption, 2, 50),
  mode: en('single', 'multiple'), search: en('none', 'local', 'async'), size: en('sm', 'md', 'lg'), shape: en('soft', 'square', 'pill'),
  state: en('ready', 'loading', 'error', 'disabled'), maxMenuHeight: {type: 'integer', enum: [192, 240, 288, 360]},
  value: str(80), values: arr(str(80), 1, 50), placeholder: str(60), requirement: en('required', 'optional'), message: str(160),
};
const TABLE_FIELDS = {
  id: idField, title: str(100), columns: arr(tableColumn, 2, 8), rows: arr(tableRow, 0, 40),
  density: en('compact', 'comfortable', 'spacious'), responsive: en('scroll', 'priority'), state: en('ready', 'empty', 'loading', 'error', 'partial'),
  sortable: yesNo, selectable: yesNo, message: str(160),
};

const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };

export const NODE_SPEC_EXTENSIONS = deepFreeze({
  '2.6.0': {
    chart: {
      fields: {
        kind: en(...CHART_BASE_KINDS, ...CHART_EXTENDED_KINDS),
        unit: str(20), xLabel: str(60), yLabel: str(60),
        axis: obj({min: N, max: N, xMin: N, xMax: N, yMin: N, yMax: N, showX: en('yes', 'no'), showY: en('yes', 'no')}, []),
        categories: arr(str(64), 2, 12),
        series: arr(obj({
          name: str(40), values: arr(N, 2, 12), points: arr(obj({x: N, y: N}), 2, 12),
          candles: arr(obj({open: N, high: N, low: N, close: N}), 2, 12), roles: arr(en('delta', 'total'), 2, 12), samples: arr(N, 5, 200),
        }, ['name']), 1, 8),
        dataType: en(...CHART_DATA_TYPES), grid: en(...CHART_GRIDS), labels: en(...CHART_LABELS), legend: en(...CHART_LEGENDS),
        density: en(...CHART_DENSITIES), responsive: en(...CHART_RESPONSIVE), bins: num(3, 12),
      },
      optional: ['unit', 'xLabel', 'yLabel', 'axis', 'categories', 'series', 'dataType', 'grid', 'labels', 'legend', 'density', 'responsive', 'bins'],
    },
    'select-control': {
      label: '선택 상자', group: 'form', placeLike: 'form', fields: SELECT_FIELDS,
      coverage: {mode: 'inherited', contracts: [], reason: 'Select는 재료가 간격·글자 크기·컨트롤 높이를 이미 --kit-* 토큰 계약으로 가진다(docs/materials/select-table.md). 맥락 결정표를 더하지 않는다.'},
      optional: ['mode', 'search', 'size', 'shape', 'state', 'maxMenuHeight', 'value', 'values', 'placeholder', 'requirement', 'message'],
      example: {type: 'select-control', id: 'region', label: '지역', options: [{value: 'kr', label: '한국'}, {value: 'jp', label: '일본'}]},
    },
    'data-table': {
      label: '데이터 표', group: 'data', placeLike: 'table', fields: TABLE_FIELDS,
      coverage: {mode: 'inherited', contracts: [], reason: '열 폭·정렬·줄바꿈은 재료가 기존 deriveTableDesign 정책을 직접 호출한다(docs/materials/select-table.md). 맥락 결정표를 더하지 않는다.'},
      optional: ['density', 'responsive', 'state', 'sortable', 'selectable', 'message'],
      example: {type: 'data-table', id: 'projects', title: '프로젝트', columns: [{id: 'name', label: '프로젝트'}, {id: 'status', label: '상태'}], rows: [{name: '재료 플랫폼', status: '진행'}, {name: '차트 확장', status: '완료'}]},
    },
    ...COMPONENT_EXTENSIONS,
  },
});

/** 확장 노드의 구성 적용 범위 선언. `compositionCoverage`는 2.4.0 snapshot의 일부라 넓히지 않고 여기서 따로 낸다. */
export const extensionCoverage = type => Object.values(NODE_SPEC_EXTENSIONS).map(table => table[type]?.coverage).find(Boolean) ?? null;

const extensionsFor = version => Object.entries(NODE_SPEC_EXTENSIONS).filter(([since]) => atLeast(version, since)).sort(([x], [y]) => (atLeast(x, y) ? 1 : -1)).map(([, table]) => table);
/** 그 카탈로그 버전에서 `type` 노드의 확장이 켜지는가. 2.5.0 이하는 항상 false다. 확장 표가 새로 만든 노드도 켜지면 true다. */
export const nodeExtended = (type, version) => extensionsFor(version).some(table => Object.hasOwn(table, type));

/** 확장 표가 새로 만든 노드(기본 명세에 없는 type)의 도입 버전. 기본 부품이거나 모르는 type이면 null. */
export function nodeSince(type) {
  if (Object.hasOwn(nodeSpecs, type)) return null;
  const hit = Object.entries(NODE_SPEC_EXTENSIONS).find(([, table]) => Object.hasOwn(table, type) && table[type].label);
  return hit ? hit[0] : null;
}
/** 그 카탈로그 버전이 받아들이는 노드 type인가. 기본 부품은 모든 버전에서, 확장 노드는 도입 버전부터 true다. */
export const nodeTypeKnown = (type, version) => typeof type === 'string' && (Object.hasOwn(nodeSpecs, type) || extensionsFor(version).some(table => Object.hasOwn(table, type) && table[type].label));
/** 그 카탈로그 버전의 부품 type 목록. 기본 부품 순서 뒤에 확장 노드가 도입 순서로 붙는다. */
export const nodeTypesAt = version => [...nodeTypes, ...extensionsFor(version).flatMap(table => Object.entries(table).filter(([, spec]) => spec.label).map(([type]) => type))];

const cache = new Map();
/** 카탈로그 버전이 받아들이는 노드 명세. 확장이 없으면 `nodeSpecs[type]` 그 객체를 그대로 돌려준다. 그 버전에 없는 type이면 undefined. */
export function nodeSpecAt(type, version) {
  const base = nodeSpecs[type];
  const tables = extensionsFor(version);
  const own = tables.filter(table => Object.hasOwn(table, type));
  const introduced = tables.flatMap(table => Object.entries(table).filter(([, spec]) => spec.label && spec.placeLike));
  // 확장 노드를 새로 받을 수 있는 부모는 children 목록이 늘어난다(placeLike가 가리키는 부품을 받는 부모).
  const gained = base?.children ? introduced.filter(([, spec]) => base.children.includes(spec.placeLike)).map(([name]) => name) : [];
  if (!base) {
    const added = own.find(table => table[type].label);
    if (!added) return undefined;
    const key = `${type}@new`;
    if (!cache.has(key)) cache.set(key, Object.freeze({...added[type]}));
    return cache.get(key);
  }
  if (!own.length && !gained.length) return base;
  const key = `${type}@${own.length}+${gained.join(',')}`;
  if (!cache.has(key)) {
    const merged = own.reduce((spec, table) => ({...spec, fields: {...spec.fields, ...table[type].fields}, optional: table[type].optional ?? spec.optional}), base);
    cache.set(key, Object.freeze(gained.length ? {...merged, children: [...base.children, ...gained]} : merged));
  }
  return cache.get(key);
}
