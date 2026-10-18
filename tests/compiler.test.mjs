import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themes, palettes, nodeSpecs, createBlueprint, CATALOG_VERSION} from '../src/catalog.mjs';
import {compile, validateBlueprint, resolveTokens, contrast} from '../src/compiler.mjs';
const base = () => createBlueprint('dashboard');
const clone = x => structuredClone(x);
function reject(mutator, code) {
  const b=base(); mutator(b);
  const result=validateBlueprint(b);
  assert.equal(result.valid,false);
  assert.ok(result.errors.some(e=>e.code===code), JSON.stringify(result.errors));
  assert.throws(()=>compile(b),/Invalid blueprint/);
}
test('catalog has six directions with three distinct sourced palette candidates each',()=>{
  assert.equal(Object.keys(themes).length,6);
  const used=[];
  for(const theme of Object.values(themes)) {
    assert.ok(theme.palettes.length>=3);
    for(const id of theme.palettes) {
      const p=palettes[id]; assert.ok(p); used.push(id);
      assert.match(p.source.url,/^https:\/\/coolors.co\/palette\//);
      assert.equal(p.source.observed,'2026-10-18');
      assert.equal(p.source.url.split('/').at(-1),p.colors.map(c=>c.slice(1).toLowerCase()).join('-'));
    }
  }
  assert.equal(new Set(used).size,18);
});
test('all preset archetypes compile deterministically',()=>{
  for(const preset of ['dashboard','landing','article','settings']) {
    const b=createBlueprint(preset), r=compile(b);
    assert.equal(validateBlueprint(b).valid,true);
    assert.deepEqual(compile(clone(b)),r);
    assert.match(r.html,/<html lang="ko"/); assert.match(r.html,/<h1/);
    assert.match(r.css,/prefers-reduced-motion/);
    assert.equal(r.manifest.catalogVersion,CATALOG_VERSION);
    assert.ok(Object.keys(r.tokens).length>15);
  }
});
test('unknown presets fail clearly',()=>assert.throws(()=>createBlueprint('bogus'),/preset/));
test('contrast reference values',()=>{
  assert.equal(contrast('#000000','#ffffff'),21);
  assert.equal(contrast('#123456','#123456'),1);
  assert.throws(()=>contrast('red','#FFFFFF'),/hex/);
});
test('every palette in light/dark satisfies its declared used pairs',()=>{
  for(const theme of Object.values(themes)) for(const palette of theme.palettes) for(const mode of ['light','dark']) {
    const b=base();Object.assign(b,{theme:theme.id,palette,mode});
    const {report,tokens}=resolveTokens(b);
    assert.ok(report.length>=16);
    for(const p of report) assert.ok(p.ratio>=p.minimum,`${palette}/${mode} ${p.name} ${p.ratio}`);
    assert.notEqual(tokens.canvas.toLowerCase(),'#000000');
    assert.equal(compile(b).manifest.palette,palette);
  }
});
test('all 4x3x3x3 shell/type/density/radius axes are real selectable code variants',()=>{
  for(const shell of ['sidebar','topbar','editorial','split']) for(const typography of ['sans','serif','mono']) for(const density of ['compact','comfortable','spacious']) for(const radius of ['square','soft','round']) {
    const b=base();Object.assign(b,{shell,typography,density,radius});const r=compile(b);
    assert.match(r.html,new RegExp(`data-shell="${shell}"`));
    assert.match(r.css,/--kit-/);
  }
});
test('all leaf types have a documented spec',()=>{
  for(const type of ['page','page-header','section','grid','card','metric','table','list','form','prose','hero','notice','actions']) assert.ok(nodeSpecs[type]);
});
test('reject arbitrary top-level override',()=>reject(b=>b.style={color:'red'},'UNKNOWN_KEY'));
test('reject node CSS and raw HTML',()=>{for(const key of ['style','className','html','onClick']) reject(b=>b.tree.children[1][key]='evil','UNKNOWN_KEY');});
test('reject mismatched theme/palette',()=>reject(b=>b.palette='forest','PALETTE_THEME'));
test('reject unknown enum and locked catalog version',()=>{
  reject(b=>b.density='17px','ENUM'); reject(b=>b.catalogVersion='0.0.0','CATALOG_VERSION'); reject(b=>b.version='2.0','VERSION');
});
test('reject unknown node type and illegal parent-child edges',()=>{
  reject(b=>b.tree.children[1]={type:'script'},'NODE_TYPE');
  reject(b=>b.tree.children[1]={type:'grid',columns:'two',children:[{type:'prose',title:'x',body:'x'},{type:'prose',title:'y',body:'y'}]},'CHILD_TYPE');
});
test('require exactly one page header in first position',()=>{
  reject(b=>b.tree.children.shift(),'PAGE_HEADER');
  reject(b=>b.tree.children.push(clone(b.tree.children[0])),'PAGE_HEADER');
});
test('reject table dimensions with clear pointer',()=>reject(b=>b.tree.children.push({type:'table',title:'표',caption:'내용',columns:['이름','상태'],rows:[['한 칸']]}),'TABLE_WIDTH'));
test('reject unsafe URL schemes and credentials',()=>{
  for(const href of ['javascript:alert(1)','data:text/html,evil','//evil.com','https://a:b@example.com','https://example.com/\nx','#missing']) reject(b=>b.tree.children.push({type:'actions',items:[{label:'링크',href,variant:'primary'}]}),'URL');
});
test('preserve safe text as escaped content, never markup',()=>{
  const b=base();b.name='</title><script>alert(1)</script>';b.tree.children[0].title='<img src=x onerror=alert(1)>';
  const r=compile(b);assert.ok(!r.html.includes('<img src=x'));assert.match(r.html,/&lt;img/);assert.ok(!r.html.includes('</title><script>alert'));
});
test('reject nested page, duplicate form IDs and invalid select contracts',()=>{
  reject(b=>b.tree.children.push({type:'page',children:[]}),'CHILD_TYPE');
  reject(b=>b.tree.children.push({type:'form',title:'연락',submitLabel:'보내기',fields:[{id:'email',label:'이메일',type:'email'},{id:'email',label:'주소',type:'text'}]}),'DUPLICATE_ID');
  reject(b=>b.tree.children.push({type:'form',title:'폼',submitLabel:'보내기',fields:[{id:'kind',label:'종류',type:'select'}]}),'SELECT_OPTIONS');
});
test('state enum is constrained, with loading/empty/error/partial/forbidden output',()=>{
  for(const state of ['loading','empty','error','partial','forbidden']) {
    const b=base();b.tree.children.push({type:'list',title:'목록',state,items:[{title:'항목'}]});
    assert.match(compile(b).html,new RegExp(`data-state="${state}"`));
  }
  reject(b=>b.tree.children.push({type:'list',title:'목록',state:'oops',items:[]}),'ENUM');
});
test('reject excess depth and node count instead of recursion crash',()=>{
  reject(b=>{let n=b.tree;for(let i=0;i<8;i++){const child={type:'section',title:'깊음',children:[]};n.children.push(child);n=child;}n.children.push({type:'prose',title:'끝',body:'본문'});},'DEPTH');
  reject(b=>b.tree.children.push(...Array.from({length:101},()=>({type:'prose',title:'x',body:'y'}))),'NODE_LIMIT');
});
test('reject missing/empty/malformed inputs without crashing',()=>{
  for(const input of [null,[],{},'hi',{tree:null}]) {const r=validateBlueprint(input);assert.equal(r.valid,false);assert.ok(r.errors[0].path.startsWith('$'));}
  reject(b=>b.name='   ','STRING');
});
test('accept https URLs and main fragment',()=>{
  const b=base();b.tree.children.push({type:'actions',items:[{label:'열기',href:'https://example.com/path?q=1&v=2',variant:'primary'},{label:'처음',href:'#main',variant:'secondary'}]});
  assert.match(compile(b).html,/q=1&amp;v=2/);
});
test('only one primary action per group',()=>reject(b=>b.tree.children.push({type:'actions',items:[{label:'A',href:'#main',variant:'primary'},{label:'B',href:'#main',variant:'primary'}]}),'PRIMARY_ACTION'));
test('compiler emits static CSP, skip link, unique labels, form feedback and provenance',()=>{
  const r=compile(createBlueprint('settings'));
  assert.match(r.html,/Content-Security-Policy/);assert.match(r.html,/href="#main"/);
  assert.match(r.html,/<label for=/);assert.match(r.html,/role="status"/);assert.match(r.html,/데모/);
  assert.ok(r.manifest.rules.length>=5);assert.ok(r.manifest.contrast.every(x=>x.ratio>=x.minimum));
});
test('prototype-like theme and palette ids produce diagnostics instead of crashing',()=>{
  for(const id of ['__proto__','constructor','toString']) {reject(b=>b.theme=id,'ENUM');reject(b=>b.palette=id,'ENUM');}
});
test('reject non JSON values and preserve unique page IDs',()=>{
  const b=base();b.tree.children[0].title=undefined;assert.equal(validateBlueprint(b).valid,false);
  const r=compile(createBlueprint('settings'));const ids=[...r.html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
});
