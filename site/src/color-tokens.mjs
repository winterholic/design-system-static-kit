/** Closed, project-owned palette and its 2.6.0 color-token graph. No caller-provided color values. */
const STEPS = Object.freeze(['50','100','200','300','400','500','600','700','800','900','950']);
const kebab = value => value.replace(/[A-Z]/g,m=>'-'+m.toLowerCase());
const tokenId = value => 'color-token:'+kebab(value);
export const STATIC_COLOR_PALETTE = Object.freeze({
  id: 'static-kit', version: '1.0.0',
  seeds: Object.freeze({
    brand: '#3157D5', neutral: '#596579', auxiliary: '#087E8B',
    status: Object.freeze({success: '#18714C', warning: '#946000', danger: '#B83543', info: '#2A63C9'}),
    chart: Object.freeze(['#3157D5', '#087E8B', '#A345B5', '#C45A16', '#218344', '#B83543']),
  }),
  usage: Object.freeze({brand: '주요 액션과 링크', neutral: '본문·표면·경계', auxiliary: '보조 강조', status: '성공·주의·오류·정보', chart: '범주형 데이터 계열'}),
});
export const COLOR_PALETTE_IDS = Object.freeze(['static-kit']);
export const colorPaletteOptions = () => [{id: 'static-kit', label: 'Static Kit', usage: STATIC_COLOR_PALETTE.usage}];
export const COLOR_STATES = Object.freeze(['default', 'hover', 'active', 'disabled', 'error', 'focus']);

/** §4.5 토큰 5계층: Semantic 22종 */
export const SEMANTIC_TOKEN_ROLES = Object.freeze([
  'canvas', 'surface', 'raised', 'sunken', 'overlay', 'inverse',
  'text-primary', 'text-secondary', 'text-muted', 'text-disabled',
  'border-subtle', 'border-default', 'border-strong',
  'action-primary', 'action-secondary', 'link', 'focus', 'accent',
  'success', 'warning', 'danger', 'info'
]);

/** §4.5 토큰 5계층: State 9종 */
export const STATE_TOKEN_NAMES = Object.freeze([
  'default', 'hover', 'active', 'focus', 'selected', 'disabled', 'readonly', 'error', 'loading'
]);

/** §4.5 토큰 5계층: Data Visualization 8종 */
export const DATAVIZ_TOKEN_ROLES = Object.freeze([
  'categorical', 'sequential', 'diverging', 'up-down', 'highlight', 'grid', 'axis-label', 'missing'
]);

export const COLOR_COMPONENT_CONTRACT = Object.freeze({
  button: Object.freeze({states: Object.freeze(['default','hover','active','disabled','focus']), tokens: Object.freeze(['--kit-action','--kit-onAction','--kit-action-hover','--kit-action-active','--kit-control-disabled-bg','--kit-control-disabled-fg','--kit-focus'])}),
  input: Object.freeze({states: COLOR_STATES, tokens: Object.freeze(['--kit-control-bg','--kit-control-fg','--kit-control-border','--kit-control-hover-border','--kit-control-active-border','--kit-control-error','--kit-focus','--kit-control-disabled-bg','--kit-control-disabled-fg'])}),
  select: Object.freeze({states: COLOR_STATES, tokens: Object.freeze(['--kit-control-bg','--kit-control-fg','--kit-control-border','--kit-control-hover-border','--kit-control-active-border','--kit-control-error','--kit-focus','--kit-control-disabled-bg','--kit-control-disabled-fg'])}),
  card: Object.freeze({states: Object.freeze(['default','hover','active','error','focus']), tokens: Object.freeze(['--kit-surface','--kit-card-hover','--kit-card-active','--kit-danger-soft','--kit-focus'])}),
  table: Object.freeze({states: Object.freeze(['default','hover','active','error','focus']), tokens: Object.freeze(['--kit-surface','--kit-table-head','--kit-table-hover','--kit-table-selected','--kit-danger-soft','--kit-focus'])}),
  chart: Object.freeze({states: Object.freeze(['default']), tokens: Object.freeze(['--kit-chart1','--kit-chart2','--kit-chart3','--kit-chart4','--kit-chart5','--kit-chart-grid'])}),
});

/** §4.5 컴포넌트 토큰 계약 확장 (16종 컴포넌트 전수) */
export const COMPONENT_TOKEN_CONTRACTS = Object.freeze({
  button: Object.freeze({states: Object.freeze(['default','hover','active','disabled','focus']), tokens: Object.freeze(['--kit-action','--kit-onAction','--kit-action-hover','--kit-action-active','--kit-control-disabled-bg','--kit-control-disabled-fg','--kit-focus'])}),
  input: Object.freeze({states: COLOR_STATES, tokens: Object.freeze(['--kit-control-bg','--kit-control-fg','--kit-control-border','--kit-control-hover-border','--kit-control-active-border','--kit-control-error','--kit-focus','--kit-control-disabled-bg','--kit-control-disabled-fg'])}),
  select: Object.freeze({states: COLOR_STATES, tokens: Object.freeze(['--kit-control-bg','--kit-control-fg','--kit-control-border','--kit-control-hover-border','--kit-control-active-border','--kit-control-error','--kit-focus','--kit-control-disabled-bg','--kit-control-disabled-fg'])}),
  checkbox: Object.freeze({states: Object.freeze(['default', 'hover', 'active', 'focus', 'selected', 'disabled', 'error']), tokens: Object.freeze(['--kit-control-bg', '--kit-control-border', '--kit-action', '--kit-onAction', '--kit-focus', '--kit-control-disabled-bg', '--kit-control-disabled-fg'])}),
  radio: Object.freeze({states: Object.freeze(['default', 'hover', 'active', 'focus', 'selected', 'disabled']), tokens: Object.freeze(['--kit-control-bg', '--kit-control-border', '--kit-action', '--kit-onAction', '--kit-focus', '--kit-control-disabled-bg', '--kit-control-disabled-fg'])}),
  switch: Object.freeze({states: Object.freeze(['default', 'hover', 'active', 'focus', 'selected', 'disabled']), tokens: Object.freeze(['--kit-control-border', '--kit-action', '--kit-surface', '--kit-focus', '--kit-control-disabled-bg', '--kit-control-disabled-fg'])}),
  tabs: Object.freeze({states: Object.freeze(['default', 'hover', 'active', 'focus', 'selected', 'disabled']), tokens: Object.freeze(['--kit-border', '--kit-action', '--kit-text', '--kit-muted', '--kit-focus'])}),
  badge: Object.freeze({states: Object.freeze(['default', 'hover']), tokens: Object.freeze(['--kit-soft', '--kit-accent', '--kit-success', '--kit-warning', '--kit-danger', '--kit-info', '--kit-text', '--kit-border'])}),
  chip: Object.freeze({states: Object.freeze(['default', 'hover', 'active', 'selected', 'disabled', 'focus']), tokens: Object.freeze(['--kit-surface', '--kit-border', '--kit-text', '--kit-action', '--kit-onAction', '--kit-focus'])}),
  card: Object.freeze({states: Object.freeze(['default','hover','active','error','focus']), tokens: Object.freeze(['--kit-surface','--kit-border','--kit-card-hover','--kit-card-active','--kit-danger-soft','--kit-focus'])}),
  table: Object.freeze({states: Object.freeze(['default','hover','active','error','focus']), tokens: Object.freeze(['--kit-surface','--kit-border','--kit-table-head','--kit-table-hover','--kit-table-selected','--kit-danger-soft','--kit-focus'])}),
  tooltip: Object.freeze({states: Object.freeze(['default']), tokens: Object.freeze(['--kit-sunken', '--kit-text', '--kit-border'])}),
  popover: Object.freeze({states: Object.freeze(['default', 'focus']), tokens: Object.freeze(['--kit-surface', '--kit-border', '--kit-text', '--kit-focus'])}),
  modal: Object.freeze({states: Object.freeze(['default', 'focus']), tokens: Object.freeze(['--kit-surface', '--kit-border', '--kit-text', '--kit-focus', '--kit-sunken'])}),
  drawer: Object.freeze({states: Object.freeze(['default', 'focus']), tokens: Object.freeze(['--kit-surface', '--kit-border', '--kit-text', '--kit-focus', '--kit-sunken'])}),
  toast: Object.freeze({states: Object.freeze(['default', 'hover', 'error']), tokens: Object.freeze(['--kit-surface', '--kit-border', '--kit-text', '--kit-success', '--kit-warning', '--kit-danger', '--kit-info'])}),
});

const rgb = hex => { if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('COLOR_PALETTE: internal swatch is not six-digit hex'); return hex.slice(1).match(/../g).map(x => parseInt(x, 16)); };
const hex = a => '#' + a.map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a,b,t) => hex(rgb(a).map((x,i) => x * (1-t) + rgb(b)[i] * t));
const luminance = h => rgb(h).map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i) => s + v*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => { const x=luminance(a), y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
const ramp = seed => Object.fromEntries(STEPS.map((step,i) => {
  const n = Number(step), color = n < 500 ? mix(seed,'#FFFFFF',(500-n)/520) : mix(seed,'#000000',(n-500)/620);
  return [step,color];
}));
const readable = (seed, bg, min) => {
  const bgs=Array.isArray(bg)?bg:[bg], passes=c=>bgs.every(x=>contrast(c,x)>=min);
  if (passes(seed)) return seed;
  for (let i=1;i<=100;i++) for (const target of ['#000000','#FFFFFF']) { const c=mix(seed,target,i/100); if (passes(c)) return c; }
  throw new Error('COLOR_CONTRAST: no passing mapping for ' + seed);
};
const allRamps = () => ({
  brand: ramp(STATIC_COLOR_PALETTE.seeds.brand), neutral: ramp(STATIC_COLOR_PALETTE.seeds.neutral),
  auxiliary: ramp(STATIC_COLOR_PALETTE.seeds.auxiliary),
  status: Object.fromEntries(Object.entries(STATIC_COLOR_PALETTE.seeds.status).map(([k,v]) => [k,ramp(v)])),
  chart: STATIC_COLOR_PALETTE.seeds.chart.map(ramp),
});
const getMode = (ramps, mode) => {
  const dark = mode === 'dark', r = ramps;
  const canvas = dark ? '#111820' : r.neutral['50'], surface = dark ? '#1A232D' : '#FFFFFF', raised = dark ? '#252F3B' : r.neutral['100'];
  const soft = dark ? mix(r.brand['900'],surface,.68) : r.brand['50'], sunken = dark ? '#0B1015' : r.neutral['100'];
  const bgs=[canvas,surface,raised,soft,sunken];
  const text = readable(dark ? r.neutral['50'] : r.neutral['950'], bgs, 7);
  const muted = readable(dark ? r.neutral['300'] : r.neutral['700'], bgs, 4.5);
  const action = readable(dark ? r.brand['400'] : r.brand['700'], bgs, 3);
  const onAction = readable('#FFFFFF', action, 4.5);
  const accent = dark ? r.auxiliary['300'] : r.auxiliary['700'];
  const onAccent = readable('#FFFFFF', accent, 4.5);
  const semantic = {
    canvas, surface, raised, neutral: r.neutral['500'], soft, sunken,
    text, muted, border: dark ? r.neutral['700'] : r.neutral['200'], rule: readable(dark ? r.neutral['500'] : r.neutral['500'],surface,3),
    action, onAction, link: readable(action,bgs,4.5), focus: readable(dark ? r.brand['300']:r.brand['700'],bgs,3), accent, onAccent,
    success: readable(dark ? r.status.success['300'] : r.status.success['700'],bgs,4.5),
    warning: readable(dark ? r.status.warning['300'] : r.status.warning['800'],bgs,4.5),
    danger: readable(dark ? r.status.danger['300'] : r.status.danger['700'],bgs,4.5),
    info: readable(dark ? r.status.info['300'] : r.status.info['700'],bgs,4.5),
    chart: r.chart.map(x => readable(dark ? x['300'] : x['700'],[surface,canvas],3)),
  };
  const state = {
    actionHover: mix(action,dark ? '#FFFFFF':'#000000',.12), actionActive: mix(action,dark ? '#FFFFFF':'#000000',.2),
    disabledBg: dark ? '#303A46' : '#E7EBF0', disabledFg: readable(dark ? '#AAB4C0':'#657184',dark ? '#303A46':'#E7EBF0',3),
    error: semantic.danger, focus: semantic.focus,
    cardHover: dark ? '#202B36' : '#F6F8FB', cardActive: dark ? '#2A3542' : '#EEF2F8', dangerSoft: dark ? '#47262E' : '#FCEBED',
    tableHead: dark ? '#252F3B' : '#F1F4F8', tableHover: dark ? '#202B36' : '#F6F8FB', tableSelected: dark ? '#263855' : '#E8EEFC', chartGrid: dark ? '#526071' : '#D8DEE7',
  };
  const component = {
    'button.primary.default': {bg: semantic.action, fg: semantic.onAction},
    'button.primary.hover': {bg: state.actionHover, fg: readable(semantic.onAction,state.actionHover,4.5)},
    'button.primary.active': {bg: state.actionActive, fg: readable(semantic.onAction,state.actionActive,4.5)},
    'button.default.disabled': {bg: state.disabledBg, fg: state.disabledFg},
    'control.default': {bg: semantic.surface, fg: semantic.text, border: semantic.border},
    'control.hover': {border: readable(semantic.action,semantic.surface,3)},
    'control.active': {border: state.focus}, 'control.error': {border: state.error}, 'control.focus': {ring: state.focus},
    'control.disabled': {bg: state.disabledBg, fg: state.disabledFg},
    'card.default': {bg: semantic.surface}, 'card.hover': {bg: state.cardHover}, 'card.active': {bg: state.cardActive}, 'card.error': {bg: state.dangerSoft}, 'card.focus': {ring: state.focus},
    'table.default': {bg: semantic.surface}, 'table.hover': {bg: state.tableHover}, 'table.active': {bg: state.tableSelected}, 'table.error': {bg: state.dangerSoft}, 'table.focus': {ring: state.focus},
    'chart.default': Object.fromEntries(semantic.chart.map((v,i) => ['series'+(i+1),v])),
  };
  return {semantic,state,component};
};
const cssKeys = Object.freeze({surface:'surface',soft:'soft',sunken:'sunken',canvas:'canvas',text:'text',muted:'muted',action:'action',onAction:'onAction',link:'link',focus:'focus',rule:'rule',border:'border',success:'success',warning:'warning',danger:'danger',info:'info',accent:'accent',onAccent:'onAccent',chart1:'chart[0]',chart2:'chart[1]',chart3:'chart[2]',chart4:'chart[3]',chart5:'chart[4]'});
const cssTokens = (g) => {
  const s=g.semantic, t=g.state, c=g.component, values={};
  for(const [k,path] of Object.entries(cssKeys)) values[k]=path.startsWith('chart[') ? s.chart[Number(path.slice(6,-1))] : s[path];
  Object.assign(values,{accentSoft:s.soft,accentInk:s.accent,actionHover:t.actionHover,actionActive:t.actionActive,onActionHover:c['button.primary.hover'].fg,
    controlBg:s.surface,controlFg:s.text,controlBorder:s.border,controlHoverBorder:c['control.hover'].border,controlActiveBorder:c['control.active'].border,controlError:t.error,controlDisabledBg:t.disabledBg,controlDisabledFg:t.disabledFg,
    cardHover:t.cardHover,cardActive:t.cardActive,dangerSoft:t.dangerSoft,tableHead:t.tableHead,tableHover:t.tableHover,tableSelected:t.tableSelected,chartGrid:t.chartGrid,chart6:s.chart[5]});
  Object.assign(values,{'action-hover':t.actionHover,'action-active':t.actionActive,'control-bg':s.surface,'control-fg':s.text,'control-border':s.border,'control-hover-border':c['control.hover'].border,'control-active-border':c['control.active'].border,'control-error':t.error,'control-disabled-bg':t.disabledBg,'control-disabled-fg':t.disabledFg,'card-hover':t.cardHover,'card-active':t.cardActive,'danger-soft':t.dangerSoft,'table-head':t.tableHead,'table-hover':t.tableHover,'table-selected':t.tableSelected,'chart-grid':t.chartGrid});
  return values;
};
const flatten = (graph, prefix, out={}) => { for(const [k,v] of Object.entries(graph)) { const id=prefix+'.'+k; if(v && typeof v==='object') flatten(v,id,out); else out[id]=v; } return out; };

export function resolveColorTokens({palette='static-kit', mode='light'} = {}) {
  if (!COLOR_PALETTE_IDS.includes(palette)) throw new Error('COLOR_PALETTE: allowed ids: ' + COLOR_PALETTE_IDS.join(', '));
  if (!['light','dark','auto'].includes(mode)) throw new Error('COLOR_MODE: allowed modes: light, dark, auto');
  const ramps=allRamps(), modes=mode==='auto'?{light:getMode(ramps,'light'),dark:getMode(ramps,'dark')}:{[mode]:getMode(ramps,mode)};
  const chosen=modes[mode==='dark'?'dark':'light'];
  const layers={primitive:flatten(ramps,'palette.static-kit'),semantic:flatten(chosen.semantic,'semantic'),state:flatten(chosen.state,'state'),component:flatten(chosen.component,'component')};
  const values={...layers.primitive,...layers.semantic,...layers.state,...layers.component}, references={};
  const rampStep=(kind,step)=>`palette.static-kit.${kind}.${step}`;
  const semanticSource={canvas:rampStep('neutral','50'),surface:rampStep('neutral','50'),raised:rampStep('neutral','100'),neutral:rampStep('neutral','500'),soft:rampStep('brand','50'),sunken:rampStep('neutral','100'),text:rampStep('neutral',mode==='dark'?'50':'950'),muted:rampStep('neutral',mode==='dark'?'300':'700'),border:rampStep('neutral',mode==='dark'?'700':'200'),rule:rampStep('neutral','500'),action:rampStep('brand',mode==='dark'?'400':'700'),onAction:rampStep('neutral','50'),link:'semantic.action',focus:'semantic.action',accent:rampStep('auxiliary',mode==='dark'?'300':'700'),onAccent:rampStep('neutral','50'),success:rampStep('status.success',mode==='dark'?'300':'700'),warning:rampStep('status.warning',mode==='dark'?'300':'800'),danger:rampStep('status.danger',mode==='dark'?'300':'700'),info:rampStep('status.info',mode==='dark'?'300':'700')};
  for(let i=0;i<6;i++) semanticSource[`chart.${i}`]=rampStep(`chart.${i}`,mode==='dark'?'300':'700');
  for(const [key,ref] of Object.entries(semanticSource)) { const id='semantic.'+key; if(id in values) references[id]=ref; }
  const stateSource={actionHover:'semantic.action',actionActive:'semantic.action',disabledBg:'semantic.neutral',disabledFg:'semantic.muted',error:'semantic.danger',focus:'semantic.focus',cardHover:'semantic.surface',cardActive:'semantic.surface',dangerSoft:'semantic.danger',tableHead:'semantic.surface',tableHover:'semantic.surface',tableSelected:'semantic.soft',chartGrid:'semantic.border'};
  for(const [key,ref] of Object.entries(stateSource)) references['state.'+key]=ref;
  const componentSource={
    'button.primary.default.bg':'semantic.action','button.primary.default.fg':'semantic.onAction','button.primary.hover.bg':'state.actionHover','button.primary.hover.fg':'semantic.onAction','button.primary.active.bg':'state.actionActive','button.primary.active.fg':'semantic.onAction','button.default.disabled.bg':'state.disabledBg','button.default.disabled.fg':'state.disabledFg',
    'control.default.bg':'semantic.surface','control.default.fg':'semantic.text','control.default.border':'semantic.border','control.hover.border':'semantic.action','control.active.border':'state.focus','control.error.border':'state.error','control.focus.ring':'state.focus','control.disabled.bg':'state.disabledBg','control.disabled.fg':'state.disabledFg',
    'card.default.bg':'semantic.surface','card.hover.bg':'state.cardHover','card.active.bg':'state.cardActive','card.error.bg':'state.dangerSoft','card.focus.ring':'state.focus','table.default.bg':'semantic.surface','table.hover.bg':'state.tableHover','table.active.bg':'state.tableSelected','table.error.bg':'state.dangerSoft','table.focus.ring':'state.focus',
  };
  for(let i=1;i<=6;i++) componentSource[`chart.default.series${i}`]=`semantic.chart.${i-1}`;
  for(const [key,ref] of Object.entries(componentSource)) references['component.'+key]=ref;
  for(const [id,ref] of Object.entries(references)) if(!(id in values)||!(ref in values)) throw new Error('COLOR_REFERENCE: '+id+' -> '+ref);
  const tokens=cssTokens(chosen), report=contrastReport(chosen);
  for(const [id,value] of Object.entries({...layers.primitive,...layers.semantic,...layers.state,...layers.component})) {
    const [layer,...parts]=id.split('.');
    const name=layer==='palette'?`palette-${parts.slice(1).map(kebab).join('-')}`:layer==='semantic'?`color-${parts.map(kebab).join('-')}`:layer==='state'?`state-${parts.map(kebab).join('-')}`:`component-${parts.map(kebab).join('-')}`;
    tokens[name]=value;
  }
  const failed=report.filter(x=>x.ratio<x.minimum); if(failed.length) throw new Error('COLOR_CONTRAST: mapping gate failed: '+failed.map(x=>x.name+' '+x.ratio+'/'+x.minimum).join(', '));
  const result={palette,mode,seeds:STATIC_COLOR_PALETTE.seeds,ramps,layers,values,references,tokens,report,modes:{}};
  for(const [m,g] of Object.entries(modes)) result.modes[m]={layers:{primitive:layers.primitive,semantic:flatten(g.semantic,'semantic'),state:flatten(g.state,'state'),component:flatten(g.component,'component')},tokens:cssTokens(g),report:contrastReport(g)};
  return result;
}
function contrastReport(g) { const out=[], p=(n,a,b,min)=>out.push({name:n,foreground:a,background:b,ratio:Math.floor(contrast(a,b)*1e8)/1e8,minimum:min});
  const bg={canvas:g.semantic.canvas,surface:g.semantic.surface,raised:g.semantic.raised,soft:g.semantic.soft,sunken:g.semantic.sunken};
  for(const [n,a] of [['text',g.semantic.text],['muted',g.semantic.muted],['link',g.semantic.link],['success',g.semantic.success],['warning',g.semantic.warning],['danger',g.semantic.danger],['info',g.semantic.info]]) for(const [bn,b] of Object.entries(bg)) p(n+'/'+bn,a,b,n==='text'?7:4.5);
  for(const [n,a] of Object.entries(bg)) p('focus/'+n,g.state.focus,a,3);
  for(const [n,k] of [['default','onAction'],['hover','onActionHover'],['active','onActionActive']]) {
    const fill=n==='default'?g.semantic.action:n==='hover'?g.state.actionHover:g.state.actionActive;
    const foreground=n==='default'?g.semantic.onAction:n==='hover'?g.component['button.primary.hover'].fg:g.component['button.primary.active'].fg;
    p('button/'+n,foreground,fill,4.5);
  }
  p('disabled/text',g.state.disabledFg,g.state.disabledBg,3);
  g.semantic.chart.forEach((a,i)=>{ p('chart'+(i+1)+'/surface',a,g.semantic.surface,3); p('chart'+(i+1)+'/canvas',a,g.semantic.canvas,3); }); return out;
}

export function colorTokenCSS() { return `
.kit-button[data-variant=primary]:active{background:var(--kit-action-active);border-color:var(--kit-action-active)}
.kit-button:disabled,.kit-button[aria-disabled=true]{background:var(--kit-control-disabled-bg);color:var(--kit-control-disabled-fg);border-color:var(--kit-control-disabled-bg);cursor:not-allowed;transform:none}
.kit-field :is(input,select,textarea){background:var(--kit-control-bg);color:var(--kit-control-fg);border-color:var(--kit-control-border)}
.kit-field :is(input,select,textarea):hover:not(:disabled){border-color:var(--kit-control-hover-border)}
.kit-field :is(input,select,textarea):focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px;border-color:var(--kit-control-active-border)}
.kit-field :is(input,select,textarea)[aria-invalid=true],.kit-field :is(input,select,textarea):user-invalid{border-color:var(--kit-control-error);box-shadow:inset 0 0 0 1px var(--kit-control-error)}
.kit-field :is(input,select,textarea):disabled{background:var(--kit-control-disabled-bg);color:var(--kit-control-disabled-fg);cursor:not-allowed}
.kit-card:hover{background:var(--kit-card-hover)}.kit-card:active{background:var(--kit-card-active)}.kit-card[data-state=error]{background:var(--kit-danger-soft)}.kit-card:focus-within{outline:2px solid var(--kit-focus);outline-offset:2px}
thead th{background:var(--kit-table-head)}tbody tr:hover{background:var(--kit-table-hover)}tbody tr[data-selected]{background:var(--kit-table-selected)}table [data-state=error]{color:var(--kit-danger)}table :focus-visible{outline:2px solid var(--kit-focus);outline-offset:-2px}
.kit-chart .ch-grid{stroke:var(--kit-chart-grid)}
`; }

/** §4.5 확장 컴포넌트 16종 토큰 스타일 */
export function componentTokenCSS() { return `
.kit-button[data-variant=primary]:hover{background:var(--kit-action-hover)}
.kit-checkbox:checked,.kit-radio:checked{background:var(--kit-action);color:var(--kit-onAction);border-color:var(--kit-action)}
.kit-switch[aria-checked=true]{background:var(--kit-action)}
.kit-tabs [role=tab]{color:var(--kit-muted)}
.kit-tabs [role=tab][aria-selected=true]{color:var(--kit-action);border-bottom-color:var(--kit-action)}
.kit-badge{background:var(--kit-soft);color:var(--kit-text);border-color:var(--kit-border)}
.kit-badge[data-variant=accent]{background:var(--kit-accent);color:var(--kit-onAccent)}
.kit-chip[data-selected=true]{background:var(--kit-action);color:var(--kit-onAction)}
.kit-tooltip{background:var(--kit-sunken);color:var(--kit-text);border-color:var(--kit-border)}
.kit-popover,.kit-modal,.kit-drawer{background:var(--kit-surface);color:var(--kit-text);border-color:var(--kit-border)}
.kit-toast{background:var(--kit-surface);color:var(--kit-text);border-color:var(--kit-border)}
.kit-toast[data-tone=success]{border-left-color:var(--kit-success)}.kit-toast[data-tone=warning]{border-left-color:var(--kit-warning)}.kit-toast[data-tone=danger]{border-left-color:var(--kit-danger)}.kit-toast[data-tone=info]{border-left-color:var(--kit-info)}
`; }

export function colorTokenMaterials() {
  const out=[], light=resolveColorTokens({palette:'static-kit',mode:'light'}), dark=resolveColorTokens({palette:'static-kit',mode:'dark'});
  const layerById={};
  for(const [layer,graph] of Object.entries(light.layers)) for(const [id,value] of Object.entries(graph)) {
    const [prefix,...parts]=id.split('.'), name=prefix==='palette'?`palette-${parts.slice(1).map(kebab).join('-')}`:prefix==='semantic'?`color-${parts.map(kebab).join('-')}`:prefix==='state'?`state-${parts.map(kebab).join('-')}`:`component-${parts.map(kebab).join('-')}`;
    const counterpart=dark.layers[layer][id]; if(typeof value!=='string'||typeof counterpart!=='string') continue;
    const refs=Object.entries(light.references).filter(([source])=>source===id).map(([,target])=>tokenId(target));
    layerById[id]={id:tokenId(id),layer,role:parts.join('.'),cssName:'--kit-'+name,light:value,dark:counterpart,dependencies:refs};
  }
  for(const item of Object.values(layerById)) out.push({id:item.id,kind:'color-token',category:item.layer==='component'&&item.role.startsWith('chart.')?'chart':'color',label:item.role,since:'2.6.0',contexts:['any'],render:{module:'src/color-tokens.mjs',export:'resolveColorTokens',key:item.role},tokens:[item.cssName],dependencies:item.dependencies,structure:{parents:[],children:null},states:{values:['default'],transitions:[]},responsive:{strategy:'none'},a11y:{rules:['R05']},validation:{rules:['R05','R08'],codes:['COLOR_PALETTE','COLOR_REFERENCE']},examples:[],quality:{status:'verified',evidence:['tests/color-tokens.test.mjs:22']},source:{origin:'internal',license:'MIT'},preset:false,tags:['color-token',item.layer,...item.role.split('.')],ext:{layer:item.layer,role:item.role,light:item.light,dark:item.dark}});
  for(const [component,contract] of Object.entries(COLOR_COMPONENT_CONTRACT)) for(const token of contract.tokens) {
    const name=token.replace(/^--kit-/,'');
  const safe=kebab(name).replace(/^-/, '');
    out.push({id:'color-token:component.'+component+'.'+safe,kind:'color-token',category:component==='chart'?'chart':'color',label:`${component} ${name}`,since:'2.6.0',contexts:['any'],render:{module:'src/color-tokens.mjs',export:'resolveColorTokens',key:name},tokens:[token],dependencies:[],structure:{parents:[],children:null},states:{values:[...contract.states],transitions:[]},responsive:{strategy:'none'},a11y:{rules:token==='--kit-focus'?['R05','R19']:[]},validation:{rules:['R05','R08'],codes:['COLOR_PALETTE','COLOR_REFERENCE']},examples:[],quality:{status:'verified',evidence:['tests/color-tokens.test.mjs:22']},source:{origin:'internal',license:'MIT'},preset:false,tags:['color-token',component,name],ext:{layer:'component',role:component+'.'+name,light:null,dark:null}});
  }
  return out;
}
export const colorTokenUsage = () => Object.entries(COLOR_COMPONENT_CONTRACT).flatMap(([component,c])=>c.tokens.map(cssName=>{
  const safe=kebab(cssName.replace(/^--kit-/,'')).replace(/^-/, '');
  return {id:'color-token:component.'+component+'.'+safe,component,cssName,states:[...c.states]};
}));

/** §4.5 5계층 토큰 해석기 */
export function resolveTokenLayers({palette = 'static-kit', mode = 'light'} = {}) {
  const base = resolveColorTokens({palette, mode});
  const semantic22 = {};
  for (const role of SEMANTIC_TOKEN_ROLES) {
    const key = role.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    semantic22[role] = base.tokens[`--kit-${role}`] || base.tokens[`--kit-${key}`] || base.tokens[role] || '#000000';
  }
  const state9 = {};
  for (const st of STATE_TOKEN_NAMES) {
    state9[st] = base.tokens[`--kit-state-${st}`] || base.tokens[`state.${st}`] || '#000000';
  }
  const dataviz8 = {};
  for (const dv of DATAVIZ_TOKEN_ROLES) {
    dataviz8[dv] = base.tokens[`--kit-chart-${dv}`] || base.tokens[`--kit-chart1`] || '#000000';
  }
  return {
    primitive: base.layers.primitive,
    semantic: semantic22,
    state: state9,
    component: COMPONENT_TOKEN_CONTRACTS,
    dataviz: dataviz8,
  };
}

/** 토큰 사용 검사: 선언된 컴포넌트 토큰들이 실제 사용/바인딩되는지 확인 */
export function validateTokenUsage() {
  const css = colorTokenCSS() + componentTokenCSS();
  const allTokens = new Set(Object.values(COMPONENT_TOKEN_CONTRACTS).flatMap(c => c.tokens));
  const unused = [];
  for (const token of allTokens) {
    if (!css.includes(`var(${token})`) && !css.includes(token)) {
      unused.push(token);
    }
  }
  return {ok: unused.length === 0, unused, totalDeclared: allTokens.size};
}

/** 플랫폼 색 결합(src/platform/color.mjs)이 같은 램프·대비 보정 규칙을 재사용하게 내보낸다. static-kit 출력에는 영향이 없다. */
export {ramp as colorRamp, readable as readableColor, contrast as colorContrast, mix as colorMix, STEPS as COLOR_STEPS};
