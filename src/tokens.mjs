import {palettes} from './catalog.mjs';
const rgb=hex=>{if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Expected six digit hex color');return hex.slice(1).match(/../g).map(n=>parseInt(n,16));};
const hex=values=>'#'+values.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('').toUpperCase();
export const mix=(a,b,t)=>hex(rgb(a).map((x,i)=>x*(1-t)+rgb(b)[i]*t));
const luminance=hex=>rgb(hex).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function ensure(seed,bgs,minimum,dark){
  for(let i=0;i<=100;i++) {const color=mix(seed,dark?'#FFFFFF':'#000000',i/100);if(bgs.every(bg=>contrast(color,bg)>=minimum))return color;}
  throw new Error('No contrast-safe token mapping for '+seed);
}
export function resolveTokens(b){
  const p=palettes[b.palette];if(!p)throw new Error('Unknown palette');
  const dark=b.mode==='dark';
  const ordered=[...p.colors].sort((a,b)=>luminance(a)-luminance(b));
  const darkest=ordered[0],lightest=ordered.at(-1),seed=p.colors[p.brand];
  const canvas=dark?mix(darkest,'#11151C',.8):mix(lightest,'#FFFFFF',.87);
  const surface=dark?mix(darkest,'#252B34',.9):'#FFFFFF';
  const soft=dark?mix(seed,surface,.94):mix(seed,'#FFFFFF',.93);
  const backgrounds=[canvas,surface,soft];
  const action=ensure(seed,backgrounds,4.5,dark);
  const actionHover=mix(action,dark?'#FFFFFF':'#000000',.12);
  const onActionHover=contrast('#FFFFFF',actionHover)>=4.5?'#FFFFFF':'#10151C';
  const onAction=contrast('#FFFFFF',action)>=4.5?'#FFFFFF':'#10151C';
  const tokens={actionHover,onActionHover,canvas,surface,soft,text:ensure(dark?'#F3F5F7':'#182029',backgrounds,7,dark),muted:ensure(dark?'#ACB6C3':'#586476',backgrounds,4.5,dark),action,onAction,link:action,focus:ensure(seed,backgrounds,3,dark),rule:ensure(dark?'#788798':'#78818E',[canvas,surface],3,dark),border:dark?'#45505E':'#DDE2E7',success:ensure('#18714C',backgrounds,4.5,dark),warning:ensure('#946000',backgrounds,4.5,dark),danger:ensure('#B83543',backgrounds,4.5,dark)};
  const report=[];
  for(const key of ['text','muted','link','success','warning','danger','focus'])for(const bg of ['canvas','surface','soft'])report.push({name:`${key}/${bg}`,foreground:tokens[key],background:tokens[bg],ratio:contrast(tokens[key],tokens[bg]),minimum:key==='focus'?3:4.5});
  report.push({name:'onActionHover/actionHover',foreground:onActionHover,background:actionHover,ratio:contrast(onActionHover,actionHover),minimum:4.5});
  report.push({name:'onAction/action',foreground:onAction,background:action,ratio:contrast(onAction,action),minimum:4.5});
  for(const bg of ['canvas','surface'])report.push({name:`rule/${bg}`,foreground:tokens.rule,background:tokens[bg],ratio:contrast(tokens.rule,tokens[bg]),minimum:3});
  return {tokens,report,provenance:{source:p.source,original:p.colors,brandSeed:seed,action,adjusted:seed!==action,method:'sRGB mixing toward white (dark mode) or black (light mode) until every used background passes; original swatches preserved'}};
}
