import {themes,palettes,nodeSpecs,createBlueprint,presets,CATALOG_VERSION,limits} from './catalog.mjs';
import {compile,validateBlueprint} from './compiler.mjs';
import {escapeHTML as e} from './render.mjs';
const $=id=>document.getElementById(id);
const pretty=x=>JSON.stringify(x,null,2);
const storageKey='winterholic-static-kit.blueprint.v1';
let blueprint=createBlueprint(),compiled,selected=[],valid=true;
const getNode=(b,path)=>path.reduce((n,index)=>n?.children?.[index],b.tree);
const nodeName=n=>n?.title??n?.label??nodeSpecs[n?.type]?.label??'노드';
const swatches=p=>`<span class="swatches" aria-label="${p.colors.join(', ')}">${p.colors.map(c=>`<i style="background:${c}" aria-hidden="true"></i>`).join('')}</span>`;
const download=(filename,text,type)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('save-status').textContent=filename+' 다운로드를 요청했습니다.';};
function showError(error){
  valid=false;$('errors').hidden=false;
  $('errors').textContent=error.errors?.map(x=>`${x.path}\n[${x.code}] ${x.message}`).join('\n\n')??error.message;
  $('valid-status').textContent='검증 오류 · 마지막 유효 결과를 표시합니다.';
  $('valid-status').style.color='var(--app-danger)';
  $('download-html').disabled=true;$('download-json').disabled=true;
}
function save(){try{localStorage.setItem(storageKey,pretty(blueprint));$('save-status').textContent='이 브라우저에 유효한 설계를 저장했습니다.';}catch{$('save-status').textContent='브라우저 저장을 사용할 수 없습니다. JSON으로 내려받으세요.';}}
function renderChoices(){
  $('theme-options').innerHTML=Object.values(themes).map(t=>`<label class="theme-option" title="${e(t.description)}"><input type="radio" name="theme" value="${t.id}" ${t.id===blueprint.theme?'checked':''}><span class="theme-dot" style="background:${palettes[t.palettes[0]].colors[palettes[t.palettes[0]].brand]}"></span>${t.name}</label>`).join('');
  const t=themes[blueprint.theme];
  $('palette-count').textContent=t.palettes.length+' CANDIDATES';
  $('palette-options').innerHTML=t.palettes.map(id=>{const p=palettes[id],checked=id===blueprint.palette;return `<label class="palette-option"><input type="radio" name="palette" value="${id}" ${checked?'checked':''}><span class="palette-label"><span>${p.name}</span>${checked?'<span class="palette-check" aria-hidden="true">✓</span>':''}</span>${swatches(p)}</label>`;}).join('');
  for(const key of ['shell','typography','density','radius'])$(key).value=blueprint[key];
  $('project-name').value=blueprint.name;
  $('mode').setAttribute('aria-pressed',String(blueprint.mode==='dark'));
  $('mode').textContent=blueprint.mode==='dark'?'라이트':'다크';
  $('selection-summary').textContent=t.name+' / '+palettes[blueprint.palette].name;
}
function renderTree(){
  if(!getNode(blueprint,selected))selected=[];
  const isSelected=path=>JSON.stringify(path)===JSON.stringify(selected);
  function node(n,path){return `<li><button type="button" data-path="${path.join(',')}" class="${isSelected(path)?'selected':''}" aria-pressed="${isSelected(path)}"><span>${n.children?'▱':'◇'}</span><span>${e(nodeSpecs[n.type].label)}${n.type!=='page'?' · '+e(nodeName(n)).slice(0,40):''}</span></button>${n.children?`<ul>${n.children.map((c,i)=>node(c,[...path,i])).join('')}</ul>`:''}</li>`;}
  $('tree').innerHTML='<ul>'+node(blueprint.tree,[])+'</ul>';
  renderNodeEditor();
}
function renderNodeEditor(){
  const n=getNode(blueprint,selected),root=selected.length===0,header=n.type==='page-header';
  $('selected-node').textContent=nodeSpecs[n.type].label;
  $('node-editor').value=pretty(n);
  $('remove-node').disabled=root||header;
  const siblings=root?[]:getNode(blueprint,selected.slice(0,-1)).children,index=selected.at(-1);
  $('move-up').disabled=root||header||index===0||(selected.length===1&&index===1);
  $('move-down').disabled=root||header||index===siblings.length-1;
  const parent=nodeSpecs[n.type].children?n:root?n:getNode(blueprint,selected.slice(0,-1));
  const allowed=nodeSpecs[parent.type].children?.filter(type=>type!=='page-header')??[];
  $('add-node').innerHTML=allowed.map(type=>`<option value="${type}">${nodeSpecs[type].label}</option>`).join('');
  $('add').disabled=!allowed.length;
}
function renderTokens(){
  const p=palettes[blueprint.palette],prov=compiled.manifest.paletteProvenance;
  $('palette-reason').textContent=p.reason;
  $('palette-source').href=p.source.url;
  $('palette-adjustment').textContent=`원색 ${prov.brandSeed} → 행동색 ${prov.action}. ${prov.adjusted?'실제 배경과의 대비를 위해 보정했습니다.':'원색을 그대로 사용합니다.'} 전체 ${compiled.manifest.contrast.length}쌍 검사.`;
  $('tokens').innerHTML=Object.entries(compiled.tokens).map(([key,color])=>`<div class="token-row"><i style="background:${color}"></i><span>${key}</span><span>${color}</span></div>`).join('');
  const min=Math.min(...compiled.manifest.contrast.filter(x=>x.minimum===4.5).map(x=>x.ratio));
  $('contrast-status').textContent=`본문 대비 ≥ ${min.toFixed(2)}:1`;
}
function commit(next,{persist=true}={}){
  try{
    const focused=document.activeElement;const radioFocus=focused?.matches('input[type=radio]')?{name:focused.name,value:focused.value}:null;
    const result=compile(next);blueprint=structuredClone(next);compiled=result;valid=true;
    $('errors').hidden=true;$('download-html').disabled=false;$('download-json').disabled=false;
    $('valid-status').style.color='';$('valid-status').textContent='● 트리 검증 통과';
    $('preview-frame').srcdoc=compiled.html;
    renderChoices();renderTree();renderTokens();
    if(radioFocus)document.querySelector(`input[name="${radioFocus.name}"][value="${radioFocus.value}"]`)?.focus({preventScroll:true});$('blueprint-editor').value=pretty(blueprint);
    if(persist)save();return true;
  }catch(error){showError(error);return false;}
}
function mutate(fn){const next=structuredClone(blueprint);fn(next);return commit(next);}
function parse(text){if(new TextEncoder().encode(text).length>limits.bytes)throw new Error('SIZE: 설계는 128KiB 이하입니다.');return JSON.parse(text);}
const card=()=>({type:'card',title:'새로운 카드',body:'이 카드가 전달할 핵심 내용을 적으세요.'});
function makeNode(type){
  const templates={section:{type,title:'새로운 섹션',children:[card()]},grid:{type,columns:'two',children:[card(),card()]},card:card(),metric:{type,label:'새로운 지표',value:'24',detail:'지표의 맥락'},table:{type,title:'새로운 표',caption:'표가 설명하는 내용',columns:['이름','상태'],rows:[['새 항목','진행']],state:'ready'},list:{type,title:'새로운 목록',items:[{title:'새 항목',description:'관련 설명을 적으세요.'}],state:'ready'},form:{type,title:'입력 폼',fields:[{id:'input-'+Math.random().toString(36).slice(2,8),label:'이름',type:'text'}],submitLabel:'입력 확인'},prose:{type,title:'새로운 이야기',body:'여기에 본문을 적으세요.'},hero:{type,variant:'statement',title:'하나의 명확한 메시지.',body:'메시지를 뒷받침하는 설명을 적으세요.'},notice:{type,tone:'info',title:'알려드립니다.',body:'현재 상황과 다음 행동을 설명하세요.'},actions:{type,items:[{label:'자세히 보기',href:'#main',variant:'primary'}]}};
  return structuredClone(templates[type]);
}
function catalog(){
  $('catalog-grid').innerHTML=Object.values(themes).map(t=>`<article class="catalog-card"><h3>${t.name}</h3><p>${t.description}</p>${t.palettes.map(id=>{const p=palettes[id];return `${swatches(p)}<div class="palette-caption"><span>${p.name}</span><a href="${p.source.url}" target="_blank" rel="noopener">Coolors ↗</a></div>`;}).join('')}<button class="button secondary" data-choose-theme="${t.id}">이 테마로 조립하기 →</button></article>`).join('');
}
function showPage(which){$('workspace').hidden=which!=='builder';$('catalog').hidden=which!=='catalog';for(const id of ['builder','catalog']){$(id+'-tab').classList.toggle('active',which===id);$(id+'-tab').setAttribute('aria-pressed',String(which===id));}}
function bind(){
  $('theme-options').addEventListener('change',event=>{if(event.target.name==='theme')mutate(b=>{b.theme=event.target.value;b.palette=themes[b.theme].palettes[0];});});
  $('palette-options').addEventListener('change',event=>{if(event.target.name==='palette')mutate(b=>b.palette=event.target.value);});
  for(const key of ['shell','typography','density','radius'])$(key).addEventListener('change',event=>mutate(b=>b[key]=event.target.value));
  $('project-name').addEventListener('change',event=>mutate(b=>b.name=event.target.value));
  $('preset').addEventListener('change',event=>{selected=[];commit(createBlueprint(event.target.value));});
  $('mode').addEventListener('click',()=>mutate(b=>b.mode=b.mode==='light'?'dark':'light'));
  $('viewport').addEventListener('click',()=>{const mobile=$('preview-frame').classList.toggle('mobile-preview');$('viewport').setAttribute('aria-pressed',String(mobile));$('viewport').textContent=mobile?'너비 맞춤':'390px 보기';});
  $('reset').addEventListener('click',()=>{selected=[];$('preset').value='dashboard';commit(createBlueprint());});
  $('tree').addEventListener('click',event=>{const button=event.target.closest('button[data-path]');if(!button)return;selected=button.dataset.path?button.dataset.path.split(',').map(Number):[];renderTree();});
  $('apply-node').addEventListener('click',()=>{try{const node=parse($('node-editor').value);mutate(b=>{if(!selected.length)b.tree=node;else getNode(b,selected.slice(0,-1)).children[selected.at(-1)]=node;});}catch(error){showError(error);}});
  $('apply-blueprint').addEventListener('click',()=>{try{const next=parse($('blueprint-editor').value);if(commit(next))selected=[];}catch(error){showError(error);}});
  $('add').addEventListener('click',()=>{const n=getNode(blueprint,selected);mutate(b=>{const path=nodeSpecs[n.type].children?selected:selected.slice(0,-1),parent=getNode(b,path);parent.children.push(makeNode($('add-node').value));selected=[...path,parent.children.length-1];});});
  $('remove-node').addEventListener('click',()=>{const path=[...selected];if(!path.length||getNode(blueprint,path).type==='page-header')return;mutate(b=>getNode(b,path.slice(0,-1)).children.splice(path.at(-1),1));selected=path.slice(0,-1);renderTree();});
  for(const [id,delta] of [['move-up',-1],['move-down',1]])$(id).addEventListener('click',()=>{if($(id).disabled)return;const index=selected.at(-1);mutate(b=>{const items=getNode(b,selected.slice(0,-1)).children;[items[index],items[index+delta]]=[items[index+delta],items[index]];selected=[...selected.slice(0,-1),index+delta];});});
  $('download-json').addEventListener('click',()=>{if(valid)download('blueprint.json',pretty(blueprint)+'\n','application/json');});
  $('download-html').addEventListener('click',()=>{if(valid)download('static-kit-page.html',compiled.html,'text/html');});
  for(const tab of document.querySelectorAll('.mobile-tabs button'))tab.addEventListener('click',()=>{document.querySelector('.workbench').dataset.panel=tab.dataset.panel;for(const button of document.querySelectorAll('.mobile-tabs button'))button.setAttribute('aria-pressed',String(tab===button));});
  $('builder-tab').addEventListener('click',()=>showPage('builder'));$('catalog-tab').addEventListener('click',()=>showPage('catalog'));
  $('catalog-grid').addEventListener('click',event=>{const button=event.target.closest('[data-choose-theme]');if(!button)return;const theme=button.dataset.chooseTheme;mutate(b=>{b.theme=theme;b.palette=themes[theme].palettes[0];Object.assign(b,themes[theme].defaults);});showPage('builder');$('workspace').scrollIntoView({block:'start'});});
}
try{
  let note='';try{const stored=localStorage.getItem(storageKey);if(stored){const parsed=parse(stored);if(validateBlueprint(parsed).valid)blueprint=parsed;else note='저장된 설계가 현재 계약과 맞지 않아 기본 설계를 열었습니다. 저장값은 적용하지 않았습니다.';}}catch{note='저장된 설계를 읽지 못해 기본 설계를 열었습니다.';}
  catalog();bind();commit(blueprint,{persist:false});$('boot-error').hidden=true;$('workspace').hidden=false;if(note)$('save-status').textContent=note;
}catch(error){$('boot-error').textContent='조립기를 시작하지 못했습니다: '+error.message;}
