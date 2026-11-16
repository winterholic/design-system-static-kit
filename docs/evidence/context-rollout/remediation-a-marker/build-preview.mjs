import {mkdir, writeFile} from 'node:fs/promises';
import {compile} from '../../../../src/compiler.mjs';
import * as catalog from '../../../../src/catalog.mjs';

const root = new URL('./preview/', import.meta.url);
await mkdir(root, {recursive:true});
const aside = catalog.createBlueprint('docs-reference');
const findAside = n => {
  if (!n || typeof n !== 'object') return null;
  if (Array.isArray(n)) return n.map(findAside).find(Boolean) ?? null;
  if (n.type === 'aside') return n;
  return Object.values(n).map(findAside).find(Boolean) ?? null;
};
const asideNode = findAside(aside.tree);
if (!asideNode) throw new Error('docs-reference has no aside');
asideNode.children[0].children.push({type:'chart',title:'마커 형상 probe',caption:'세 계열 데이터 위치 검증',kind:'line',categories:['하나','둘','셋','넷'],series:[
  {name:'원',values:[12,22,18,28]}, {name:'사각',values:[18,12,28,20]}, {name:'마름모',values:[24,18,12,24]}
]});

const dashboard = catalog.createBlueprint('dashboard-analytics');
const findChart = n => {
  if (!n || typeof n !== 'object') return null;
  if (Array.isArray(n)) return n.map(findChart).find(Boolean) ?? null;
  if (n.type === 'chart' && n.kind === 'line') return n;
  return Object.values(n).map(findChart).find(Boolean) ?? null;
};
const lineChart = findChart(dashboard.tree);
if (!lineChart) throw new Error('dashboard has no line chart');
lineChart.series.push(
  {name:'사각 marker probe',values:lineChart.categories.map((_,i)=>[18,12,28,20,24,16,22][i%7])},
  {name:'마름모 marker probe',values:lineChart.categories.map((_,i)=>[24,18,12,24,16,28,14][i%7])}
);

const probe = `<script>(()=>{const rnd=x=>Math.round(x*100)/100;const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}};const forcedWidth=new URLSearchParams(location.search).get('bodyWidth');if(forcedWidth){const plot=document.querySelector('.kit-chart-plot');plot.style.flex='none';plot.style.width=forcedWidth+'px'}const data=[...document.querySelectorAll('.kit-chart-plot>svg:not(.ch-donut),.kit-chart-body>svg:not(.ch-donut)')].map(svg=>{const s=rect(svg),body=rect(svg.closest('.kit-chart-body')),plot=rect(svg.parentElement),m=svg.getScreenCTM(),markers=[...svg.querySelectorAll('.ch-m')].map(el=>{const b=rect(el);let x,y;if(el.tagName==='circle'){x=+el.getAttribute('cx');y=+el.getAttribute('cy')}else if(el.tagName==='rect'){x=+el.getAttribute('x')+ +el.getAttribute('width')/2;y=+el.getAttribute('y')+ +el.getAttribute('height')/2}else{const nums=(el.getAttribute('d').match(/-?\\d+(?:\\.\\d+)?/g)||[]).map(Number);x=(nums[0]+nums[2]+nums[4]+nums[6])/4;y=(nums[1]+nums[3]+nums[5]+nums[7])/4}const p=svg.createSVGPoint();p.x=x;p.y=y;const expected=p.matrixTransform(m);return {shape:el.tagName==='circle'?'circle':el.tagName==='rect'?'square':'diamond',box:{width:rnd(b.width),height:rnd(b.height)},ratio:rnd(b.width/b.height),center:{x:rnd(b.cx),y:rnd(b.cy)},expected:{x:rnd(expected.x),y:rnd(expected.y)},centerError:rnd(Math.hypot(b.cx-expected.x,b.cy-expected.y))}});const labelBoxes=[...svg.querySelectorAll('text')].map(rect);const clipped=labelBoxes.filter(b=>b.x<s.x-.5||b.x+b.width>s.x+s.width+.5||b.y<s.y-.5||b.y+b.height>s.y+s.height+.5).length;return {body:{width:rnd(body.width),height:rnd(body.height)},plot:{width:rnd(plot.width),height:rnd(plot.height)},svg:{width:rnd(s.width),height:rnd(s.height)},plotWidth:rnd((svg.querySelector('.ch-line')?.getBoundingClientRect().width)||0),labelClipped:clipped,markers}});const allSvg=[...document.querySelectorAll('.kit-chart-body svg')].map(svg=>({class:svg.getAttribute('class')||'cartesian',width:rnd(svg.getBoundingClientRect().width),height:rnd(svg.getBoundingClientRect().height),maxHeight:getComputedStyle(svg).maxHeight,aspect:svg.classList.contains('ch-donut')?rnd(svg.getBoundingClientRect().width/svg.getBoundingClientRect().height):null}));const out={viewport:{width:innerWidth,height:innerHeight},charts:data,allSvg,document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflowX:document.documentElement.scrollWidth>innerWidth}};let pre=document.querySelector('#marker-probe');if(!pre){pre=document.createElement('pre');pre.id='marker-probe';pre.style.cssText='white-space:pre-wrap;font:12px/1.4 ui-monospace,monospace;padding:12px;background:#fff;color:#111';document.body.append(pre)}pre.textContent=JSON.stringify(out,null,2)})()</script>`;

for (const [id, blueprint] of [['dashboard-analytics',dashboard],['aside-counterexample',aside]]) {
  let html = compile(blueprint).html;
  if (id === 'aside-counterexample') {
    const chart = html.match(/<figure\b[^>]*class="kit-chart"[^>]*>[\s\S]*?<\/figure>/)?.[0];
    const asideEnd = html.lastIndexOf('</aside>');
    if (!chart || asideEnd < 0) throw new Error('compiled aside chart fixture missing');
    html = html.replace(chart, '').slice(0, asideEnd - chart.length) + chart + html.slice(asideEnd - chart.length);
  }
  await writeFile(new URL(`${id}.html`, root), html.replace('</body>', `${probe}</body>`));
  const redRoot = new URL('./preview-red/', import.meta.url);
  await mkdir(redRoot, {recursive:true});
  const red = html.replace(/@container chart-svg \(min-width:510px\)\{\[data-design-kind=chart\] \.kit-chart-plot>svg:not\(\.ch-donut\) \.ch-m\{[^}]*\}\}/, '');
  await writeFile(new URL(`${id}.html`, redRoot), red.replace('</body>', `${probe}</body>`));
}
console.log(`compiled=2 marker-series=3 red-preview=preview-red directory=${root.pathname}`);
