// Portable browser regression harness for environments where a configured browser owns Chromium.
// Generates no production runtime. Open /artifacts/context-regression.html with the configured browser.
import {writeFile, mkdir} from 'node:fs/promises';
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Context regression</title><h1>Context regression</h1><pre id="result">RUNNING</pre><div id="frames"></div><script type="module">
import {enumerateCombos,renderCombo,shuffled} from '/src/combos.mjs';
import {themes,createBlueprint,repairAxes} from '/src/catalog.mjs';
import {compile} from '/src/compiler.mjs';
import {layoutProbe,LAYOUT_OPTIONS} from '/scripts/design-qa/layout-probe.mjs';
import {spacingProbe,PROBE_OPTIONS} from '/scripts/design-qa/spacing-probe.mjs';
import {textProbe,TEXT_PROBE_OPTIONS} from '/scripts/design-qa/text-probe.mjs';
import {contextProbe} from '/scripts/design-qa/context-probe.mjs';
import {TYPE_IDS} from '/src/typography.mjs';
import {contextSamples} from '/scripts/design-qa/context-samples.mjs';
const all=enumerateCombos().filter(c=>!c.sameAs&&!c.experimental),sample=[...all.filter(c=>!c.changed),...shuffled(all.filter(c=>c.changed),20261021).slice(0,160)],ids=Object.keys(themes);
const severe=new Set(['EMPTY_CELL','BIG_NARROW','HIER_INVERT','TIGHT_ROW','GRID_ORPHAN','EDGE_VIEW','OVERFLOW_X','CLIP_TEXT','CTRL_WRAP','VALUE_WRAP','HEAD_GAP','PROXIMITY','EDGE','PAD_ASYM','PAIR_GAP','HEAD_ORPHAN','NARROW_COL']);
const result={scope:'245 stable combinations × default/rotating theme × 1440/390; 6 page types × 18 typography presets × 3 densities × 1440/390; 10 contexts × 320',seed:20261021,views:0,failures:[],findings:{},scanned:{},records:[],environment:{ua:navigator.userAgent,dpr:devicePixelRatio}};
async function check(id,html,width,scope){
const frame=document.createElement('iframe');frame.style.cssText='border:0;display:block';frame.width=width;frame.height=900;frame.title=id;const loaded=new Promise((ok,fail)=>{frame.onload=ok;frame.onerror=fail});frame.srcdoc=html;document.querySelector('#frames').append(frame);await loaded;await frame.contentDocument.fonts.ready;await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
const script=frame.contentDocument.createElement('script');script.textContent='window.__probe={layout:('+layoutProbe+')('+JSON.stringify(LAYOUT_OPTIONS)+'),spacing:('+spacingProbe+')('+JSON.stringify(PROBE_OPTIONS)+'),text:('+textProbe+')('+JSON.stringify(TEXT_PROBE_OPTIONS)+'),context:('+contextProbe+')()};window.__probe.overflow=document.documentElement.scrollWidth>innerWidth+1;window.__probe.h1=document.querySelectorAll("h1").length;';frame.contentDocument.body.append(script);
const p=frame.contentWindow.__probe;if(!p)throw new Error('Missing probe '+id);const findings=[];for(const kind of ['layout','spacing','text','context']){for(const [key,n] of Object.entries(p[kind].scanned))result.scanned[kind+'.'+key]=(result.scanned[kind+'.'+key]??0)+n;for(const f of p[kind].findings){result.findings[f.code]=(result.findings[f.code]??0)+1;if(severe.has(f.code)||kind==='context')findings.push({kind,...f})}}
if(p.overflow)findings.push({code:'OVERFLOW_X'});if(p.h1!==1)findings.push({code:'H1_COUNT',count:p.h1});
result.views++;result.records.push({id,width,scope,failures:findings.length});if(findings.length)result.failures.push({id,width,scope,findings});frame.remove();document.querySelector('#result').textContent=JSON.stringify({status:'RUNNING',views:result.views,failures:result.failures.length});}
try{
for(const [i,c] of sample.entries())for(const theme of [null,ids[(i*7+3)%ids.length]]){const r=renderCombo(c,theme?{theme}:undefined);if(!r.ok)throw new Error('Compile '+c.id+': '+r.error);for(const width of [1440,390])await check(c.id+'@'+(theme??'default'),r.html,width,'stable-combo')}
for(const id of ['saas-landing','admin-table','dashboard-overview','product-listing','article','signup'])for(const typography of TYPE_IDS)for(const density of ['compact','comfortable','spacious']){const b=repairAxes({...createBlueprint(id),typography,density});const html=compile(b).html;for(const width of [1440,390])await check(id+'@'+typography+'@'+density,html,width,'type-density')}
for(const {id,blueprint} of contextSamples())await check(id,compile(blueprint).html,320,'narrow-frontier');
result.status=result.failures.length?'FAIL':'PASS';document.title=result.status+' '+result.views+' views';document.querySelector('#result').textContent=JSON.stringify(result);
}catch(e){result.status='ERROR';result.error=e.stack;document.title='ERROR';document.querySelector('#result').textContent=JSON.stringify(result)}
</script></html>`;
await mkdir(new URL('../../artifacts/',import.meta.url),{recursive:true});
await writeFile(new URL('../../artifacts/context-regression.html',import.meta.url),html);
console.log('Generated /artifacts/context-regression.html (expected 1638 rendered views)');
