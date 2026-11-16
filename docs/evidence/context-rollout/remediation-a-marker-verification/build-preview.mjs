import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
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
asideNode.children[1] = {type:'section',title:'지원 정보',children:[asideNode.children[1],{type:'chart',title:'마커 형상 probe',caption:'세 계열 데이터 위치 검증',kind:'line',categories:['하나','둘','셋','넷'],series:[
  {name:'원',values:[12,22,18,28]}, {name:'사각',values:[18,12,28,20]}, {name:'마름모',values:[24,18,12,24]}
]}]};

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

const probe = `<script>(()=>{const rnd=x=>Math.round(x*100)/100;const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2}};const q=new URLSearchParams(location.search),body=document.querySelector(q.get('target')||'.kit-chart-body'),plot=body?.querySelector('.kit-chart-plot');const bw=Number(q.get('bodyWidth')),pw=Number(q.get('plotWidth'));if(body&&bw){body.style.width=bw+'px';body.style.flex='none'}if(plot&&pw){plot.style.flex='0 0 '+pw+'px';plot.style.width=pw+'px'}const data=[...document.querySelectorAll('.kit-chart-plot>svg:not(.ch-donut)')].map(svg=>{const s=rect(svg),b=rect(svg.closest('.kit-chart-body')),p=rect(svg.parentElement),m=svg.getScreenCTM(),markers=[...svg.querySelectorAll('.ch-m')].map(el=>{const r=rect(el);let x,y;if(el.tagName==='circle'){x=+el.getAttribute('cx');y=+el.getAttribute('cy')}else if(el.tagName==='rect'){x=+el.getAttribute('x')+ +el.getAttribute('width')/2;y=+el.getAttribute('y')+ +el.getAttribute('height')/2}else{const z=(el.getAttribute('d').match(/-?\\d+(?:\\.\\d+)?/g)||[]).map(Number);x=(z[0]+z[2]+z[4]+z[6])/4;y=(z[1]+z[3]+z[5]+z[7])/4}const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const expected=pt.matrixTransform(m);return {shape:el.tagName==='circle'?'circle':el.tagName==='rect'?'square':'diamond',bbox:{width:rnd(r.width),height:rnd(r.height)},ratio:rnd(r.width/r.height),center:{x:rnd(r.cx),y:rnd(r.cy)},dataCenter:{x:rnd(expected.x),y:rnd(expected.y)},centerError:rnd(Math.hypot(r.cx-expected.x,r.cy-expected.y))}});const texts=[...svg.querySelectorAll('text')].map(el=>{const r=rect(el),css=getComputedStyle(el);return {text:el.textContent,bbox:{x:rnd(r.x),y:rnd(r.y),width:rnd(r.width),height:rnd(r.height),right:rnd(r.x+r.width),bottom:rnd(r.y+r.height)},transform:css.transform,transformOrigin:css.transformOrigin}});return {chartBodyWidth:rnd(b.width),plotWrapperWidth:rnd(p.width),svgWidth:rnd(s.width),svgHeight:rnd(s.height),plotPathWidth:rnd(svg.querySelector('.ch-line')?.getBoundingClientRect().width||0),labelBoxesOutsideSvg:texts.filter(t=>t.bbox.x<s.x-.5||t.bbox.right>s.x+s.width+.5||t.bbox.y<s.y-.5||t.bbox.bottom>s.y+s.height+.5).length,markers,texts}});const svgs=[...document.querySelectorAll('.kit-chart-body svg')].map(el=>{const r=rect(el);return {class:el.getAttribute('class')||'cartesian',width:rnd(r.width),height:rnd(r.height),maxHeight:getComputedStyle(el).maxHeight,aspect:el.classList.contains('ch-donut')?rnd(r.width/r.height):null}});const asideEl=document.querySelector('.kit-aside-side'),toc=[...(asideEl?.querySelectorAll('.kit-toc a[href]')||[])].map(a=>a.getAttribute('href'));const tables=[...document.querySelectorAll('.kit-chart-data table')].map(t=>({cells:t.querySelectorAll('tbody td').length,values:[...t.querySelectorAll('tbody td')].map(x=>x.textContent.trim())}));const out={input:new URL(location.href).searchParams.get('input'),viewport:{width:innerWidth,height:innerHeight},charts:data,allSvg:svgs,aside:{present:!!asideEl,chartInside:!!asideEl?.querySelector('.kit-chart'),tocCount:toc.length,toc},tables,document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,overflowX:document.documentElement.scrollWidth>innerWidth}};let pre=document.querySelector('#marker-probe');if(!pre){pre=document.createElement('pre');pre.id='marker-probe';pre.style.cssText='white-space:pre-wrap;font:12px/1.4 ui-monospace,monospace;padding:12px;background:#fff;color:#111';document.body.append(pre)}pre.textContent=JSON.stringify(out,null,2)})()</script>`;

const sources = {};
for (const file of ['src/composition.mjs','src/render/chart.mjs','src/render/nodes.mjs','tests/composition.test.mjs']) {
  sources[file] = createHash('sha256').update(await readFile(new URL(`../../../../${file}`, import.meta.url))).digest('hex');
}
const inputs = {};
for (const [id, blueprint] of [['dashboard-analytics',dashboard],['aside-counterexample',aside]]) {
  const result = compile(blueprint);
  inputs[id] = createHash('sha256').update(JSON.stringify(blueprint)).digest('hex');
  const html = result.html.replace('</body>', `${probe}</body>`);
  await writeFile(new URL(`${id}.html`, root), html);
}
await writeFile(new URL('manifest.json', root), JSON.stringify({sources,inputs,previewDirectory:root.pathname},null,2)+'\n');
console.log(JSON.stringify({compiled:2,sources,inputs,previewDirectory:root.pathname},null,2));
