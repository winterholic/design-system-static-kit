import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createBlueprint, templateList} from '../../../src/catalog.mjs';
import {compile} from '../../../src/compiler.mjs';

const ids = templateList.map(t=>t.id);
const root = new URL('./remediation-c/', import.meta.url);
await mkdir(new URL('after/', root), {recursive:true});
await mkdir(new URL('before/', root), {recursive:true});
const baseline = '61d2e5e5c51a58aeb6a7f4ecc2fc6a7337bd6864';
const hashes = [];
for (const id of ids) {
  const b = createBlueprint(id), r = compile(b);
  await writeFile(new URL(`after/${id}.html`, root), r.html);
  await writeFile(new URL(`before/${id}.html`, root), execFileSync('git',['show',`${baseline}:site/examples/${id}/index.html`]));
  hashes.push({id, input:createHash('sha256').update(JSON.stringify(b)).digest('hex'), output:createHash('sha256').update(r.html).digest('hex')});
}
await writeFile(new URL('hashes.json', root), JSON.stringify(hashes,null,2)+'\n');
await writeFile(new URL('probe.html', root), `<!doctype html><meta charset="utf-8"><title>Common layout measurements</title><style>body{margin:0}iframe{border:0;display:block}pre{white-space:pre-wrap;font:12px monospace}</style><pre id="report">measuring</pre><iframe id="frame"></iframe><script>
const ids=${JSON.stringify(ids)}, p=new URLSearchParams(location.search), mode=p.get('mode')||'before';
const f=document.querySelector('iframe'), out=document.querySelector('pre');
const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
const results=[];
(async()=>{for(const id of (p.get('id')?[p.get('id')]:ids))for(const width of (p.get('width')?[+p.get('width')]:[390,1440])){
f.style.width=width+'px';f.style.height='960px';
await new Promise((ok,fail)=>{f.onload=ok;f.onerror=fail;f.src=mode+'/'+id+'.html'});
await f.contentDocument.fonts.ready;await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
const d=f.contentDocument,s=e=>f.contentWindow.getComputedStyle(e),h=d.querySelector('.kit-header'),b=d.querySelector('.kit-brand'),a=d.querySelector('.kit-header-action'),n=d.querySelector('.kit-nav');
const amount=[...d.querySelectorAll('td,tbody th')].filter(e=>/^\\d+\\.\\d+억$/.test(e.textContent)).map(e=>({text:e.textContent,align:s(e).textAlign}));
results.push({id,width,mode,documentWidth:d.documentElement.scrollWidth,header:{box:rect(h),brand:rect(b),action:rect(a),nav:rect(n),layout:s(h).display},sequences:[...d.querySelectorAll('.kit-steps,.kit-timeline')].map(e=>({title:e.querySelector('h2,h3')?.textContent,box:rect(e),list:rect(e.querySelector('ol')),listStyle:s(e.querySelector('ol')).display,items:[...e.querySelectorAll(':scope>ol>li')].map(li=>({box:rect(li),content:rect(li.querySelector('div')||li.querySelector('strong')),template:s(li).gridTemplateColumns}))})),amount});
}out.textContent=JSON.stringify({status:'done',results});})().catch(e=>out.textContent=JSON.stringify({error:String(e)}));
</script>`);
console.log(`Preview outputs: ${ids.length}`);
