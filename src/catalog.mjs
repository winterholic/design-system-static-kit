/** Catalog 1.0: the compiler, UI, schema, and CLI all consume this one contract. */
export const CATALOG_VERSION = '1.0.0';
export const BLUEPRINT_VERSION = '1.0';
export const limits = Object.freeze({bytes:131072,nodes:100,depth:6});
const freeze = value => { if(value && typeof value==='object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const paletteRows = [
  ['ocean','오션 블루','03045e-023e8a-0077b6-0096c7-00b4d8-48cae4-90e0ef-ade8f4-caf0f8',2,'업무 도구의 명확한 파란 행동색'],
  ['pearl','오션 펄','006d77-83c5be-edf6f9-ffddd2-e29578',0,'차분한 청록과 따뜻한 보조색'],
  ['deep-sea','딥 시','0d1b2a-1b263b-415a77-778da9-e0e1dd',2,'낮은 채도의 전문 도구'],
  ['lavender','라벤더 잉크','22223b-4a4e69-9a8c98-c9ada7-f2e9e4',1,'긴 글을 받치는 보랏빛 잉크'],
  ['earth','어스 페이퍼','0a0908-22333b-eae0d5-c6ac8f-5e503f',4,'문서와 기록을 위한 담백한 종이'],
  ['harvest','하베스트','6f1d1b-bb9457-432818-99582a-ffe6a7',0,'문화·출판을 위한 짙은 적갈색'],
  ['forest','포레스트','dad7cd-a3b18a-588157-3a5a40-344e41',3,'웰니스와 자연 소재'],
  ['verdigris','버디그리스','cad2c5-84a98c-52796f-354f52-2f3e46',2,'지식·아카이브의 녹청색'],
  ['olive','올리브 가든','606c38-283618-fefae0-dda15e-bc6c25',0,'유기적 제품과 생활 서비스'],
  ['fiery','파이어리 오션','780000-c1121f-fdf0d5-003049-669bbc',1,'또렷한 편집·캠페인'],
  ['coastal','코스털 레드','2b2d42-8d99ae-edf2f4-ef233c-d90429',4,'정확한 경고와 결단'],
  ['twilight','골든 트와일라잇','000814-001d3d-003566-ffc300-ffd60a',3,'산업·관제의 강한 신호색'],
  ['pastel','파스텔 드림','cdb4db-ffc8dd-ffafcc-bde0fe-a2d2ff',0,'창작·커뮤니티의 부드러운 색면'],
  ['peach','피치 딜라이트','d8e2dc-ffe5d9-ffcad4-f4acb7-9d8189',4,'생활·창작의 절제된 분홍'],
  ['sorbet','워터멜론 소르베','ef476f-ffd166-06d6a0-118ab2-073b4c',0,'친근한 교육·행사의 리듬'],
  ['steel','라이트 스틸','f8f9fa-e9ecef-dee2e6-ced4da-adb5bd-6c757d-495057-343a40-212529',6,'수치·규격 중심의 중립 표면'],
  ['rustic','러스틱 그래파이트','fffcf2-ccc5b9-403d39-252422-eb5e28',4,'제품·포트폴리오의 한 점 강조'],
  ['gold','블랙 앤 골드','000000-14213d-fca311-e5e5e5-ffffff',2,'전시·브랜드의 절제된 대비'],
];
export const palettes=freeze(Object.fromEntries(paletteRows.map(([id,name,slug,brand,reason])=>[id,{id,name,colors:slug.split('-').map(x=>'#'+x.toUpperCase()),brand,reason,source:{url:'https://coolors.co/palette/'+slug,discovery:'https://coolors.co/palettes/trending',observed:'2026-10-18',method:'configured browser, rendered trending palette swatches',evidence:'docs/evidence/coolors-palettes.json'}}])));
export const themes=freeze(Object.fromEntries([
  ['workspace','워크스페이스','업무·개발·운영. 빠르게 읽고 판단하는 도구.',['ocean','pearl','deep-sea'],{shell:'sidebar',typography:'sans',density:'comfortable',radius:'soft'}],
  ['editorial','에디토리얼','출판·리서치·기록. 긴 문장의 읽기 리듬.',['lavender','earth','harvest'],{shell:'editorial',typography:'serif',density:'spacious',radius:'square'}],
  ['botanical','보태니컬','자연·생활·웰니스. 차분한 정보와 재료감.',['forest','verdigris','olive'],{shell:'topbar',typography:'sans',density:'comfortable',radius:'soft'}],
  ['signal','시그널','캠페인·관제·발표. 높은 대비와 분명한 액션.',['fiery','coastal','twilight'],{shell:'split',typography:'sans',density:'compact',radius:'square'}],
  ['atelier','아틀리에','교육·창작·커뮤니티. 친근한 색면과 여유.',['pastel','peach','sorbet'],{shell:'topbar',typography:'sans',density:'spacious',radius:'round'}],
  ['precision','프리시전','데이터·규격·포트폴리오. 구조를 드러내는 절제.',['steel','rustic','gold'],{shell:'sidebar',typography:'mono',density:'compact',radius:'square'}],
].map(([id,name,description,palettes,defaults])=>[id,{id,name,description,palettes,defaults}])));
export const axes=freeze({shell:['sidebar','topbar','editorial','split'],typography:['sans','serif','mono'],density:['compact','comfortable','spacious'],radius:['square','soft','round'],mode:['light','dark']});
export const rules=freeze([
  {id:'R01',intent:'허용된 속성·variant만. 알 수 없는 키는 실패.',source:'ADR 0001'},
  {id:'R02',intent:'허용 간선·자식 수·깊이·노드 수로 위계 유지.',source:'frontend-design / spacing-layout'},
  {id:'R03',intent:'페이지 첫 위치에 h1 하나, 이후 단계적 제목.',source:'winterholic-base/docs/12-page-patterns.md'},
  {id:'R04',intent:'한 액션 그룹에 주 액션 하나.',source:'frontend-design'},
  {id:'R05',intent:'본문·보조·링크·버튼 4.5:1, 구조선·포커스 3:1.',source:'WCAG 2.2 SC 1.4.3, 1.4.11'},
  {id:'R06',intent:'데이터 부품에 로딩·빈·오류·부분 성공·권한 없음 상태.',source:'ttakkari/docs/10-states-feedback.md (state philosophy)'},
  {id:'R07',intent:'텍스트 이스케이프·HTTPS 링크·고정 런타임, 임의 HTML/CSS 불가.',source:'compiler input boundary'},
  {id:'R08',intent:'입력·카탈로그·산출물 일치 검사, 버전 불일치 거부.',source:'winterholic-design-system token source governance'},
]);
const str=(max=160)=>({type:'string',minLength:1,maxLength:max});
const en=(...values)=>({type:'string',enum:values});
const arr=(items,min=1,max=8)=>({type:'array',items,minItems:min,maxItems:max});
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const action=obj({label:str(40),href:str(2048),variant:en('primary','secondary')});
const item=obj({title:str(120),description:str(300),status:en('진행','완료','대기')},['title']);
const field=obj({id:{...str(40),pattern:'^[a-z][a-z0-9-]*$'},label:str(80),type:en('text','email','textarea','select'),placeholder:str(120),options:arr(str(60),2,12)},['id','label','type']);
const state=en('ready','loading','empty','error','partial','forbidden');
const blocks=['section','grid','card','table','list','form','prose','hero','notice','actions'];
export const nodeSpecs=freeze({
  page:{label:'페이지',fields:{},children:['page-header',...blocks],min:2,max:12},
  'page-header':{label:'페이지 제목',fields:{title:str(160),description:str(500)},required:['title']},
  section:{label:'섹션',fields:{title:str(100)},children:blocks.filter(x=>x!=='hero'),min:1,max:8},
  grid:{label:'그리드',fields:{columns:en('two','three')},children:['card','metric','list','notice'],min:2,max:6},
  card:{label:'카드',fields:{title:str(100),body:str(500),meta:str(80),action},required:['title','body']},
  metric:{label:'지표',fields:{label:str(80),value:str(40),detail:str(160)},required:['label','value']},
  table:{label:'표',fields:{title:str(100),caption:str(160),columns:arr(str(60),2,6),rows:arr(arr(str(200),2,6),0,30),state},required:['title','caption','columns','rows']},
  list:{label:'목록',fields:{title:str(100),items:arr(item,0,12),state},required:['title','items']},
  form:{label:'폼',fields:{title:str(100),fields:arr(field,1,8),submitLabel:str(40)}},
  prose:{label:'본문',fields:{title:str(160),body:str(6000)}},
  hero:{label:'히어로',fields:{title:str(160),body:str(700),action,variant:en('statement','split')},required:['title','body','variant']},
  notice:{label:'알림',fields:{title:str(120),body:str(500),tone:en('info','success','warning','danger')}},
  actions:{label:'액션 그룹',fields:{items:arr(action,1,3)}},
});
export function blueprintSchema(){
  const defs={};
  for(const [type,spec] of Object.entries(nodeSpecs)) {
    const properties={type:{const:type},...spec.fields};
    const required=['type',...(spec.required??Object.keys(spec.fields))];
    if(spec.children){ properties.children={type:'array',minItems:spec.min,maxItems:spec.max,items:{oneOf:spec.children.map(x=>({$ref:'#/$defs/'+x}))}};required.push('children'); }
    defs[type]=obj(properties,required);
  }
  return {$schema:'https://json-schema.org/draft/2020-12/schema',title:'Static Kit Blueprint 1.0',...obj({version:{const:BLUEPRINT_VERSION},catalogVersion:{const:CATALOG_VERSION},name:str(80),theme:en(...Object.keys(themes)),palette:en(...Object.keys(palettes)),...Object.fromEntries(Object.entries(axes).map(([k,v])=>[k,en(...v)])),tree:{$ref:'#/$defs/page'}}),$defs:defs};
}
export const presets=freeze({dashboard:'프로젝트 현황',landing:'서비스 소개',article:'읽는 문서',settings:'설정과 입력'});
export function createBlueprint(preset='dashboard') {
  if(!Object.hasOwn(presets,preset)) throw new Error('Unknown preset: '+preset);
  const head=(title,description)=>({type:'page-header',title,description});
  const card=(title,body,meta)=>({type:'card',title,body,meta});
  const notice=(tone,title,body)=>({type:'notice',tone,title,body});
  const trees={
    dashboard:[head('다음 결정을 위한 한눈.','오늘의 흐름을 읽고, 중요한 일에 집중하세요.'),{type:'grid',columns:'three',children:[{type:'metric',label:'진행 중 프로젝트',value:'12',detail:'이번 주 시작한 프로젝트 3개'},{type:'metric',label:'완료한 작업',value:'84',detail:'지난주보다 12개 더 완료'},{type:'metric',label:'다음 마일스톤',value:'10. 24.',detail:'디자인 리뷰 · 오후 2시'}]},{type:'section',title:'지금 집중할 일',children:[{type:'grid',columns:'two',children:[card('브랜드의 새로운 언어','제품의 성격을 살리는 표현과 규칙을 함께 정리합니다.','디자인 · 진행 중'),card('작은 개선의 기록','사용자가 망설이는 순간을 찾아 하나씩 다듬습니다.','리서치 · 이번 주')]}]},{type:'table',title:'최근 작업',caption:'프로젝트별 최근 변경과 담당 현황',columns:['작업','담당','상태'],rows:[['조립 규약 정리','김다선','완료'],['팔레트 후보 검토','디자인팀','진행'],['다음 릴리스 준비','개발팀','대기']],state:'ready'}],
    landing:[head('좋은 도구는, 생각할 틈을 만듭니다.','복잡한 일상에서 중요한 것에 집중할 수 있도록.'),{type:'hero',variant:'split',title:'작은 선택이 모여\n당신다운 작업으로.',body:'검토한 재료를 조립해 나만의 흐름을 만드세요. 시작은 가볍게, 쌓이는 가치는 오래도록.',action:{label:'자세히 알아보기',href:'#main',variant:'primary'}},{type:'grid',columns:'three',children:[card('시작은 명확하게','흩어진 정보를 한곳에 모아 방향을 정합니다.','01 · 정리'),card('과정은 유연하게','상황에 맞는 방식을 골라 작업을 이어갑니다.','02 · 연결'),card('결과는 오래도록','다음 작업에서도 쓸 수 있게 남깁니다.','03 · 축적')]},notice('info','당신의 방식으로 시작하세요.','완성된 틀 안에서도 다양한 선택이 가능합니다.')],
    article:[head('일관성은 같은 모양을 뜻하지 않습니다.','디자인 노트 · 2026년 10월 18일'),{type:'prose',title:'선택을 위한 규칙',body:'규칙은 결정을 대신하는 것이 아니라, 결정에 필요한 맥락을 보존합니다.\n\n모든 화면을 하나의 정답으로 맞추기보다, 서로 다른 목적을 가진 화면이 같은 언어로 이야기하게 합니다.'},{type:'section',title:'조립하는 세 가지 층위',children:[{type:'prose',title:'재료와 역할',body:'색과 간격은 의미를 가진 토큰으로 연결합니다. 읽는 순서와 관계는 부품의 구조로 표현합니다.'},{type:'list',title:'다음에 확인할 것',items:[{title:'목적에 맞는 위계',description:'가장 중요한 정보가 먼저 읽히는가?'},{title:'관련된 것 사이의 거리',description:'한 그룹의 내부 간격이 그룹 사이보다 작은가?'},{title:'실패했을 때의 경험',description:'현재 상황과 다음 행동을 설명하는가?'}],state:'ready'}]},notice('warning','규칙도 틀릴 수 있습니다.','재현 가능한 반례와 근거를 남겨 카탈로그를 개정하세요.')],
    settings:[head('작업 환경을 나답게.','설정은 언제든 바꿀 수 있습니다.'),{type:'form',title:'프로필 설정',fields:[{id:'name',label:'이름',type:'text',placeholder:'이름을 입력하세요'},{id:'email',label:'이메일',type:'email',placeholder:'name@example.com'},{id:'role',label:'주로 하는 일',type:'select',options:['디자인','개발','기획']},{id:'intro',label:'소개',type:'textarea',placeholder:'어떤 일을 하고 있나요?'}],submitLabel:'입력 확인'},notice('info','이 화면은 데모입니다.','입력 형식만 브라우저에서 확인하며 서버에 저장하지 않습니다.')],
  };
  const theme=preset==='article'?'editorial':preset==='landing'?'botanical':'workspace';
  return {version:BLUEPRINT_VERSION,catalogVersion:CATALOG_VERSION,name:presets[preset],theme,palette:themes[theme].palettes[0],mode:'light',...themes[theme].defaults,tree:{type:'page',children:structuredClone(trees[preset])}};
}
