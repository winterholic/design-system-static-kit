// Generate immutable inputs and compiled pages. Browser measurement is run through the configured browser MCP.
// node scripts/design-qa/context-capture.mjs before|after [outbox]
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {compile} from '../../src/compiler.mjs';
import {contextSamples} from './context-samples.mjs';
import {layoutProbe, LAYOUT_OPTIONS} from './layout-probe.mjs';
import {spacingProbe, PROBE_OPTIONS} from './spacing-probe.mjs';
import {textProbe, TEXT_PROBE_OPTIONS} from './text-probe.mjs';
import {contextProbe} from './context-probe.mjs';

const phase = process.argv[2];
const measureOnly = process.argv.includes('--measure-only');
if (!['before', 'after'].includes(phase)) throw new Error('Expected before|after');
const root = resolve(import.meta.dirname, '../..'), directory = resolve(root, 'artifacts/context-' + phase);
await mkdir(directory, {recursive: true});
const evidence = resolve(root, 'docs/evidence/context');
await mkdir(evidence, {recursive: true});
const inputsPath = resolve(evidence, 'inputs.json');
const samples = phase === 'before' && !measureOnly ? contextSamples().map(s => ({...s, blueprint: {...s.blueprint, catalogVersion: '2.1.0'}})) : JSON.parse(await readFile(inputsPath, 'utf8'));
if (phase === 'before' && !measureOnly) await writeFile(inputsPath, JSON.stringify(samples, null, 2) + '\n', {flag: 'wx'});
for (const {id, blueprint} of measureOnly ? [] : samples) {
  // The after snapshot intentionally upgrades only the catalog version; input content and all chosen axes stay fixed.
  const b = structuredClone(blueprint);
  if (phase === 'after') { const {CATALOG_VERSION} = await import('../../src/catalog.mjs'); b.catalogVersion = CATALOG_VERSION; }
  const result = compile(b);
  await writeFile(resolve(directory, id + '.html'), result.html);
  if (process.argv[3]) {
    const out = resolve(process.argv[3], 'context-' + phase); await mkdir(out, {recursive: true});
    await writeFile(resolve(out, id + '.html'), result.html);
  }
}
const funcs = `window.__qa={layout:(${layoutProbe.toString()})(${JSON.stringify(LAYOUT_OPTIONS)}),spacing:(${spacingProbe.toString()})(${JSON.stringify(PROBE_OPTIONS)}),text:(${textProbe.toString()})(${JSON.stringify(TEXT_PROBE_OPTIONS)}),context:(${contextProbe.toString()})()};`;
const metrics = `function metrics(){const q=s=>[...document.querySelectorAll(s)];const css=e=>getComputedStyle(e),box=e=>{const r=e.getBoundingClientRect();return {width:Math.round(r.width),height:Math.round(r.height),font:parseFloat(css(e).fontSize)}};return {overflow:document.documentElement.scrollWidth>innerWidth+1,metrics:q('.kit-metric').map(e=>({label:e.querySelector('dt').textContent,...box(e),value:box(e.querySelector('dd')),padding:css(e).padding,columns:css(e.parentElement).gridTemplateColumns})),forms:q('.kit-form-fields').map(e=>({...box(e),columns:css(e).gridTemplateColumns,minField:Math.min(...q('.kit-field input:not([type=checkbox]):not([type=radio])').map(e=>e.getBoundingClientRect().width))})),splits:q('.kit-split').map(e=>({...box(e),columns:css(e).gridTemplateColumns})),headings:q('.kit-section-head').map(e=>({text:e.innerText,...box(e.querySelector('h2,h3,h4'))}))}}window.__qa.geometry=metrics();`;
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>Context ${phase} measurement</title><style>body{font:14px system-ui}iframe{display:block;border:0}pre{white-space:pre-wrap}</style><h1>Context ${phase} measurement</h1><pre id="result">RUNNING</pre><div id="frames"></div><script>
const phase=${JSON.stringify(phase)},samples=${JSON.stringify(samples.map(s => s.id))},results=[];
(async()=>{for(const id of samples)for(const width of [1440,390]){const f=document.createElement('iframe');f.width=width;f.height=900;f.title=id+' '+width;const loaded=new Promise((ok,fail)=>{f.onload=ok;f.onerror=fail});f.src=id+'.html';document.querySelector('#frames').append(f);await loaded;await f.contentDocument.fonts.ready;await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));const s=f.contentDocument.createElement('script');s.textContent=${JSON.stringify(funcs + metrics)};f.contentDocument.body.append(s);const result=f.contentWindow.__qa;if(!result)throw new Error('Measurement missing: '+id);results.push({id,width,...result});f.remove()}document.querySelector('#result').textContent=JSON.stringify({phase,views:results.length,results});document.title='DONE '+results.length+' views'} )().catch(e=>{document.title='FAILED';document.querySelector('#result').textContent=e.stack});
</script></html>`;
await writeFile(resolve(directory, 'measure.html'), html);
console.log(`Generated ${samples.length} ${phase} snapshots and measurement harness: /artifacts/context-${phase}/measure.html`);
