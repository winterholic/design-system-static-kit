import {BLUEPRINT_VERSION,CATALOG_VERSION,themes,palettes,axes,nodeSpecs,limits,blueprintSchema} from './catalog.mjs';

/** Strict, bounded validator. Deliberately no coercion, defaulting, or unknown-key stripping. */
export function validateBlueprint(input) {
  const errors=[];
  const error=(path,code,message)=>{if(errors.length<80) errors.push({path,code,message});};
  const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
  let bytes;
  try {bytes=new TextEncoder().encode(JSON.stringify(input)).length;} catch {error('$','JSON','순환 참조 또는 JSON으로 표현할 수 없는 입력');return {valid:false,errors};}
  if(bytes>limits.bytes){error('$','SIZE',`JSON은 ${limits.bytes}바이트 이하입니다.`);return {valid:false,errors};}
  function value(v,s,path) {
    if(s.const!==undefined) {if(v!==s.const) error(path,'CONST','고정된 값: '+s.const);return;}
    if(s.type==='object') {
      if(!plain(v)){error(path,'OBJECT','객체가 필요합니다.');return;}
      for(const k of Object.keys(v))if(!Object.hasOwn(s.properties,k))error(path+'.'+k,'UNKNOWN_KEY','허용되지 않은 속성: '+k);
      for(const k of s.required??[])if(!Object.hasOwn(v,k))error(path+'.'+k,'REQUIRED','필수 속성입니다.');
      for(const [k,sub] of Object.entries(s.properties))if(Object.hasOwn(v,k))value(v[k],sub,path+'.'+k);
      return;
    }
    if(s.type==='array') {
      if(!Array.isArray(v)){error(path,'ARRAY','배열이 필요합니다.');return;}
      if(v.length<s.minItems||v.length>s.maxItems)error(path,'ARRAY_LENGTH',`항목은 ${s.minItems}~${s.maxItems}개입니다.`);
      v.slice(0,Math.max(s.maxItems,32)).forEach((x,i)=>value(x,s.items,`${path}[${i}]`));return;
    }
    if(s.enum){if(!s.enum.includes(v))error(path,'ENUM','허용값: '+s.enum.join(', '));return;}
    if(s.type==='string'){
      if(typeof v!=='string'||v.trim().length<(s.minLength??0)||v.length>s.maxLength||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))error(path,'STRING',`텍스트 ${s.minLength}~${s.maxLength}자가 필요합니다.`);
      else if(s.pattern&&!new RegExp(s.pattern).test(v))error(path,'PATTERN','형식에 맞지 않습니다.');
    }
  }
  if(!plain(input)){error('$','OBJECT','Blueprint 객체가 필요합니다.');return {valid:false,errors};}
  const top=blueprintSchema();
  // Tree is traversed separately; cross-field invariants do not belong in a permissive schema walker.
  const props={...top.properties};delete props.tree;
  value(Object.fromEntries(Object.entries(input).filter(([k])=>k!=='tree')),{type:'object',properties:props,required:top.required.filter(k=>k!=='tree')},'$');
  if(input.version!==BLUEPRINT_VERSION)error('$.version','VERSION','지원 Blueprint 버전: '+BLUEPRINT_VERSION);
  if(input.catalogVersion!==CATALOG_VERSION)error('$.catalogVersion','CATALOG_VERSION','카탈로그를 명시적으로 업그레이드하세요: '+CATALOG_VERSION);
  if(Object.hasOwn(themes,input.theme)&&!themes[input.theme].palettes.includes(input.palette))error('$.palette','PALETTE_THEME','선택한 테마에 속하지 않는 팔레트입니다.');
  let count=0;const fieldIds=new Set();
  const safeUrl=href=>{
    if(typeof href!=='string'||/[\s\\]/.test(href))return false;
    if(href==='#main')return true;
    try{const url=new URL(href);return url.protocol==='https:'&&!url.username&&!url.password&&!!url.hostname;}catch{return false;}
  };
  function actions(items,path){
    if(items.filter(x=>x?.variant==='primary').length>1)error(path,'PRIMARY_ACTION','주 액션은 그룹당 하나입니다.');
    items.forEach((a,i)=>{if(a&&Object.hasOwn(a,'href')&&!safeUrl(a.href))error(`${path}[${i}].href`,'URL','HTTPS(자격 증명 없음) 또는 #main만 허용합니다.');});
  }
  function node(n,path,parent,depth){
    count++;if(count>limits.nodes){if(count===limits.nodes+1)error(path,'NODE_LIMIT',`최대 ${limits.nodes}노드입니다.`);return;}
    if(depth>limits.depth){error(path,'DEPTH',`최대 깊이는 ${limits.depth}입니다.`);return;}
    if(!plain(n)){error(path,'OBJECT','노드 객체가 필요합니다.');return;}
    if(typeof n.type!=='string'||!Object.hasOwn(nodeSpecs,n.type)){error(path+'.type','NODE_TYPE','알 수 없는 부품입니다.');return;}
    if(parent&&!nodeSpecs[parent].children?.includes(n.type))error(path+'.type','CHILD_TYPE',`${parent} 안에 ${n.type}을 넣을 수 없습니다.`);
    const spec=nodeSpecs[n.type];
    const properties={type:{const:n.type},...spec.fields};
    if(spec.children)properties.children={type:'array',items:{},minItems:spec.min,maxItems:spec.max};
    value(n,{type:'object',properties,required:['type',...(spec.required??Object.keys(spec.fields)),...(spec.children?['children']:[])]},path);
    if(n.action)actions([n.action],path+'.action');
    if(n.type==='actions'&&Array.isArray(n.items))actions(n.items,path+'.items');
    if(n.type==='table'&&Array.isArray(n.rows)&&Array.isArray(n.columns))n.rows.forEach((row,i)=>{if(Array.isArray(row)&&row.length!==n.columns.length)error(`${path}.rows[${i}]`,'TABLE_WIDTH','표의 열과 셀 개수가 다릅니다.');});
    if(n.type==='form'&&Array.isArray(n.fields)) n.fields.forEach((f,i)=>{
      if(!plain(f))return;
      if(fieldIds.has(f.id))error(`${path}.fields[${i}].id`,'DUPLICATE_ID','페이지의 필드 id는 중복될 수 없습니다.');
      fieldIds.add(f.id);
      if(f.type==='select'&&(!Array.isArray(f.options)||f.options.length<2))error(`${path}.fields[${i}].options`,'SELECT_OPTIONS','select는 선택지 2개 이상이 필요합니다.');
      if(f.type!=='select'&&Object.hasOwn(f,'options'))error(`${path}.fields[${i}].options`,'SELECT_OPTIONS','options는 select 전용입니다.');
    });
    if(spec.children&&Array.isArray(n.children)) for(let i=0;i<n.children.length&&count<=limits.nodes;i++)node(n.children[i],`${path}.children[${i}]`,n.type,depth+1);
  }
  if(input.tree?.type!=='page')error('$.tree.type','ROOT','루트는 page여야 합니다.');
  node(input.tree,'$.tree',null,1);
  if(Array.isArray(input.tree?.children)) {
    const c=input.tree.children;
    if(c[0]?.type!=='page-header'||c.filter(n=>n?.type==='page-header').length!==1)error('$.tree.children','PAGE_HEADER','첫 노드는 page-header이며 페이지에 하나만 있어야 합니다.');
  }
  return {valid:errors.length===0,errors};
}
