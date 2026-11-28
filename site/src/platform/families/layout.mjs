/**
 * §6.2 L(레이아웃) 부품 5종이 함께 쓰는 마크업 조각, 런타임, CSS.
 *
 * Responsive Grid, Center, Sticky Region, Scroll Area, Resizable Panel의 단독 렌더러와
 * Resizable Panel의 키보드(방향키·Home·End) 및 크기 제약 런타임을 제공한다.
 */
import {escapeHTML} from '../../escape-html.mjs';
import {COMPONENT_CLASSIFICATION} from './inventory.mjs';

const e = escapeHTML;

export const LAYOUT_RUNTIME = `(function(){
if(window.__kitLayout)return;window.__kitLayout=true;
document.addEventListener('keydown',function(ev){
  var handle=ev.target.closest&&ev.target.closest('[data-resizable-handle]');
  if(!handle)return;
  var host=handle.closest('[data-component="component:resizable-panel"]');
  if(!host)return;
  var min=Number(handle.getAttribute('aria-valuemin')||15);
  var max=Number(handle.getAttribute('aria-valuemax')||85);
  var current=Number(handle.getAttribute('aria-valuenow')||50);
  var step=5;
  var next=current;
  var orientation=handle.getAttribute('aria-orientation')||'vertical';
  var decKey=orientation==='horizontal'?'ArrowUp':'ArrowLeft';
  var incKey=orientation==='horizontal'?'ArrowDown':'ArrowRight';
  if(ev.key===decKey)next=Math.max(min,current-step);
  else if(ev.key===incKey)next=Math.min(max,current+step);
  else if(ev.key==='Home')next=min;
  else if(ev.key==='End')next=max;
  else return;
  ev.preventDefault();
  apply(handle,host,next);
});
function apply(handle,host,next){
  var min=Number(handle.getAttribute('aria-valuemin')||15);
  var max=Number(handle.getAttribute('aria-valuemax')||85);
  next=Math.max(min,Math.min(max,Math.round(next)));
  handle.setAttribute('aria-valuenow',String(next));
  var first=host.querySelector('.kit-panel-first');
  var second=host.querySelector('.kit-panel-second');
  if(first)first.style.flex='0 0 '+next+'%';
  if(second)second.style.flex='0 0 '+(100-next)+'%';
  handle.dispatchEvent(new CustomEvent('kit-panel-resize',{bubbles:true,detail:{value:next}}));
}
var drag=null;
document.addEventListener('pointerdown',function(ev){
  if(ev.button!==undefined&&ev.button!==0)return;
  var handle=ev.target.closest&&ev.target.closest('[data-resizable-handle]');
  if(!handle)return;
  var host=handle.closest('[data-component="component:resizable-panel"]');
  if(!host)return;
  drag={handle:handle,host:host,pointerId:ev.pointerId};
  if(ev.preventDefault)ev.preventDefault();
});
document.addEventListener('pointermove',function(ev){
  if(!drag||(drag.pointerId!==undefined&&ev.pointerId!==undefined&&drag.pointerId!==ev.pointerId))return;
  var rect=drag.host.getBoundingClientRect();
  var verticalSeparator=(drag.handle.getAttribute('aria-orientation')||'vertical')==='vertical';
  var start=verticalSeparator?rect.left:rect.top;
  var extent=verticalSeparator?rect.width:rect.height;
  if(!extent)return;
  var point=verticalSeparator?ev.clientX:ev.clientY;
  apply(drag.handle,drag.host,((point-start)/extent)*100);
  if(ev.preventDefault)ev.preventDefault();
});
function stopDrag(ev){
  if(drag&&(!drag.pointerId||ev.pointerId===undefined||drag.pointerId===ev.pointerId))drag=null;
}
document.addEventListener('pointerup',stopDrag);
document.addEventListener('pointercancel',stopDrag);
})();`;

export const LAYOUT_CSS = `
.kit-layout-stack{display:flex;flex-direction:column;gap:var(--kit-sp-item);inline-size:100%;box-sizing:border-box}
.kit-layout-stack[data-gap="tight"]{gap:var(--kit-sp-tight)}.kit-layout-stack[data-gap="near"]{gap:var(--kit-sp-near)}.kit-layout-stack[data-gap="item"]{gap:var(--kit-sp-item)}.kit-layout-stack[data-gap="gap"]{gap:var(--kit-sp-gap)}
.kit-layout-stack[data-align="start"]{align-items:flex-start}.kit-layout-stack[data-align="center"]{align-items:center}.kit-layout-stack[data-align="stretch"]{align-items:stretch}
.kit-layout-container{inline-size:100%;margin-inline:auto;padding-inline:var(--kit-sp-item);box-sizing:border-box}
.kit-layout-container[data-width="narrow"]{max-inline-size:40rem}.kit-layout-container[data-width="standard"]{max-inline-size:64rem}.kit-layout-container[data-width="wide"]{max-inline-size:80rem}.kit-layout-container[data-width="full"]{max-inline-size:none}
.kit-layout-responsive-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:var(--kit-sp-item);inline-size:100%;box-sizing:border-box}
.kit-layout-center{display:flex;flex-direction:column;align-items:center;justify-content:center;min-block-size:160px;inline-size:100%;text-align:center;box-sizing:border-box;padding:var(--kit-sp-item)}
.kit-layout-sticky-region{position:sticky;inset-block-start:0;z-index:10;inline-size:100%;background:var(--kit-surface);color:var(--kit-text);box-sizing:border-box;padding:var(--kit-sp-item);border-block-end:1px solid var(--kit-border)}
.kit-layout-scroll-area{overflow-y:auto;max-block-size:400px;inline-size:100%;box-sizing:border-box;padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius)}
.kit-layout-resizable{display:flex;inline-size:100%;min-block-size:200px;box-sizing:border-box;border:1px solid var(--kit-border);border-radius:var(--kit-radius);overflow:hidden}
.kit-layout-resizable[data-direction="vertical"]{flex-direction:column}
.kit-panel-first,.kit-panel-second{overflow:auto;box-sizing:border-box;padding:var(--kit-sp-item);min-inline-size:0;min-block-size:0}
.kit-split-handle{flex:0 0 8px;background:var(--kit-border);cursor:col-resize;user-select:none;touch-action:none;outline:none;transition:background 0.15s ease}
.kit-layout-resizable[data-direction="vertical"]>.kit-split-handle{flex:0 0 8px;cursor:row-resize}
.kit-split-handle:hover,.kit-split-handle:focus-visible{background:var(--kit-focus)}
.kit-split-handle:focus-visible{outline:2px solid var(--kit-focus);outline-offset:1px}
`;

const NODE = (type, axes = {}) => ({field: 'tree', node: type, axes});

export const LAYOUT_SPECS = [
  ['component:stack', 'Stack', 'l-01-stack', 'stack', 'component:stack', {field: 'layouts', component: 'component:stack'}],
  ['component:responsive-grid', 'Responsive Grid', 'l-04-responsive-grid', 'responsive-grid', 'layout:equal-grid', NODE('grid')],
  ['component:container', 'Container', 'l-07-container', 'container', 'component:container', {field: 'layouts', component: 'component:container'}],
  ['component:center', 'Center', 'l-09-center', 'center', 'layout:centered-hero', NODE('hero', {variant: 'centered'})],
  ['component:sticky-region', 'Sticky Region', 'l-12-sticky-region', 'sticky-region', 'layout:sticky-action-layout', NODE('actions')],
  ['component:scroll-area', 'Scroll Area', 'l-13-scroll-area', 'scroll-area', 'layout:master-detail', NODE('master-detail')],
  ['component:resizable-panel', 'Resizable Panel', 'l-14-resizable-panel', 'resizable-panel', 'component:resizable-panel', {field: 'layouts', component: 'component:resizable-panel'}],
];

const LAYER_OF = Object.freeze({independent: 'Base', variant: 'Purpose', composite: 'Composite'});

function renderByKind(id, p = {}) {
  const idAttr = p.id ? `id="${e(p.id)}" ` : '';
  switch (id) {
    case 'component:responsive-grid': {
      const items = Array.isArray(p.items) && p.items.length ? p.items : [{content: 'Grid item 1'}, {content: 'Grid item 2'}];
      const htmlItems = items.map((it, i) => `<div class="kit-layout-grid-cell" data-cell="${i}">${typeof it === 'string' ? e(it) : e(it.content ?? `항목 ${i + 1}`)}</div>`).join('');
      return `<div ${idAttr}class="kit-layout-responsive-grid" data-component="${id}">${htmlItems}</div>`;
    }
    case 'component:stack': {
      const gap = p.gap ?? 'item', align = p.align ?? 'stretch';
      if (!['tight', 'near', 'item', 'gap'].includes(gap)) throw new TypeError('Stack gap must be tight, near, item or gap');
      if (!['start', 'center', 'stretch'].includes(align)) throw new TypeError('Stack align must be start, center or stretch');
      const items = Array.isArray(p.items) && p.items.length ? p.items : ['첫 번째 항목', '두 번째 항목'];
      const htmlItems = items.map((item, i) => `<div class="kit-layout-stack-item" data-item="${i}">${e(typeof item === 'string' ? item : item?.content ?? `항목 ${i + 1}`)}</div>`).join('');
      return `<div ${idAttr}class="kit-layout-stack" data-component="${id}" data-gap="${gap}" data-align="${align}">${htmlItems}</div>`;
    }
    case 'component:container': {
      const width = p.width ?? 'standard';
      if (!['narrow', 'standard', 'wide', 'full'].includes(width)) throw new TypeError('Container width must be narrow, standard, wide or full');
      const content = p.content ?? p.label ?? '컨테이너 콘텐츠';
      return `<div ${idAttr}class="kit-layout-container" data-component="${id}" data-width="${width}">${e(content)}</div>`;
    }
    case 'component:center': {
      const content = p.content ?? p.label ?? '가운데 정렬 콘텐츠';
      return `<div ${idAttr}class="kit-layout-center" data-component="${id}"><div class="kit-layout-center-inner">${e(content)}</div></div>`;
    }
    case 'component:sticky-region': {
      const content = p.content ?? p.label ?? '고정 영역';
      return `<div ${idAttr}class="kit-layout-sticky-region" data-component="${id}"><div class="kit-layout-sticky-inner">${e(content)}</div></div>`;
    }
    case 'component:scroll-area': {
      const content = p.content ?? p.label ?? '스크롤 영역 내용';
      return `<div ${idAttr}class="kit-layout-scroll-area" data-component="${id}"><div class="kit-layout-scroll-inner">${e(content)}</div></div>`;
    }
    case 'component:resizable-panel': {
      if (p.direction !== undefined && !['horizontal', 'vertical'].includes(p.direction)) throw new TypeError('Resizable Panel direction must be horizontal or vertical');
      const dir = p.direction ?? 'horizontal';
      const value = p.value ?? 50;
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Resizable Panel value must be a finite number');
      const initial = Math.max(15, Math.min(85, value));
      const first = e(p.first ?? p.left ?? '패널 1');
      const second = e(p.second ?? p.right ?? '패널 2');
      const label = e(p.label ?? '패널 크기 조절');
      const orientation = dir === 'vertical' ? 'horizontal' : 'vertical';
      return `<div ${idAttr}class="kit-layout-resizable" data-component="${id}" data-direction="${dir}">` +
        `<div class="kit-panel-first" style="flex:0 0 ${initial}%">${first}</div>` +
        `<div class="kit-split-handle" role="separator" tabindex="0" aria-valuenow="${initial}" aria-valuemin="15" aria-valuemax="85" aria-orientation="${orientation}" data-resizable-handle aria-label="${label}"></div>` +
        `<div class="kit-panel-second" style="flex:0 0 ${100 - initial}%">${second}</div>` +
        `</div>`;
    }
    default:
      throw new TypeError(`Unknown layout component: ${id}`);
  }
}

export const LAYOUT_COMPONENTS = Object.freeze(LAYOUT_SPECS.map(([id, label, key, componentType, materialId, blueprint]) => {
  const classification = COMPONENT_CLASSIFICATION[key];
  if (!classification) throw new Error(`분류표에 없는 요구 항목: ${key}`);
  return Object.freeze({
    id, label, requirementId: `req:comp:${key}`, classification, componentType, materialId, blueprint, layer: LAYER_OF[classification],
    version: '1.0.0', render: props => renderByKind(id, props ?? {}),
  });
}));

export const LAYOUT_COMPONENT_BY_ID = new Map(LAYOUT_COMPONENTS.map(item => [item.id, item]));

export function renderLayoutComponent(id, props = {}) {
  const item = LAYOUT_COMPONENT_BY_ID.get(id);
  if (!item) throw new TypeError(`Unknown layout component: ${id}`);
  return item.render(props);
}

export const layoutRuntimeFor = ids => ([...ids].includes('component:resizable-panel') ? LAYOUT_RUNTIME : '');
