// 부정 탐침: "원하는 것을 쓰려고 했을 때 검증기가 무엇이라 답하는가". 기존 사례 Blueprint를 한 군데만 바꿔 validate 결과(첫 오류)를 기록한다.
// 목적은 표현력 결함의 원인 구분이다: UNKNOWN_KEY/ENUM/CHILD_TYPE=카탈로그에 수단이 없음, AXIS_BAN/THEME_FORBID/PAGE_*/FEATURED_PLAN=규약이 막음.
import {readFile, writeFile} from 'node:fs/promises';
import {validateBlueprint} from '../../../src/compiler.mjs';
const load = async id => JSON.parse(await readFile(new URL(`./cases/${id}.json`, import.meta.url), 'utf8'));
const find = (n, pred) => { if (pred(n)) return n; for (const c of n.children ?? []) { const r = find(c, pred); if (r) return r; } return null; };
const T = (b, type) => find(b.tree, n => n.type === type);
const probes = [
  ['N01 grid 안에 표를 둔다(차트 둘+표를 한 줄에)', '03-dense-dashboard-landing', b => { const g = T(b, 'grid'); g.children = [g.children[0], g.children[1], {...T(b, 'table')}]; }],
  ['N02 split에 자식 3개(3칸 비대칭)', '02-asym-portfolio', b => { const s = T(b, 'split'); s.children.push({type: 'prose', title: '셋째', body: '셋째 칸'}); }],
  ['N03 카드에 span(2배 폭) 키', '01-magazine', b => { T(b, 'card').span = 'two'; }],
  ['N04 히어로에 ratio(글:사진 40:60) 키', '01-magazine', b => { T(b, 'hero').ratio = '40:60'; }],
  ['N05 cover 히어로에 visual(전폭 사진)', '14-campaign-poster', b => { T(b, 'hero').visual = 'photo'; }],
  ['N06 섹션에 style/density(구역별 밀도) 키', '01-magazine', b => { T(b, 'section').density = 'compact'; }],
  ['N07 인용에 size(대형 풀쿼트) 키', '01-magazine', b => { T(b, 'quote').size = 'xl'; }],
  ['N08 액션에 icon(스토어 버튼) 키', '13-app-landing-dark', b => { T(b, 'hero').action.icon = 'download'; }],
  ['N09 목록 variant ordered(번호 목록)', '12-news-home', b => { T(b, 'list').variant = 'ordered'; }],
  ['N10 요금제 월/연 탭: 두 요금제 모두 추천(탭 안 pricing 둘)', '04-pricing-saas', b => { const p = T(b, 'pricing'); const copy = () => JSON.parse(JSON.stringify(p)); const i = b.tree.children.indexOf(p); b.tree.children[i] = {type: 'tabs', variant: 'pill', children: [{type: 'tab', label: '월 결제', children: [copy()]}, {type: 'tab', label: '연 결제', children: [copy()]}]}; }],
  ['N11 split 안에 split', '02-asym-portfolio', b => { const s = T(b, 'split'); s.children[1] = {type: 'split', children: [{type: 'prose', title: 'a', body: 'a'}, {type: 'prose', title: 'b', body: 'b'}]}; }],
  ['N12 플랜 1개짜리 요금제(단일 제안)', '04-pricing-saas', b => { T(b, 'pricing').children.length = 1; }],
  ['N13 제목 없는 섹션(밴드만)', '01-magazine', b => { delete b.tree.children.find(n => n.type === 'section').title; }],
  ['N14 본문 없는 히어로(문장 하나)', '11-luxe-brand', b => { delete T(b, 'hero').body; }],
  ['N15 제목 없는 본문 문단', '11-luxe-brand', b => { delete T(b, 'prose').title; }],
  ['N16 빈 표 셀', '04-pricing-saas', b => { T(b, 'table').rows[0][1] = ''; }],
  ['N17 카드 본문 없음(이름·가격만)', '11-luxe-brand', b => { b.tree.children.splice(5, 0, {type: 'section', title: 'x', children: [{type: 'grid', columns: 'two', children: [{type: 'card', title: 'a', price: '1'}, {type: 'card', title: 'b', price: '2'}]}]}); }],
  ['N18 minimal 셸 + 1600px 폭(전폭 사진 작가 사이트)', '02-asym-portfolio', b => { b.shell = 'minimal'; b.width = 'full'; }],
  ['N19 terminal 서체 + dramatic(모노 대문자 거대 제목)', '09-brutalist-zine', b => { b.scale = 'dramatic'; }],
  ['N20 브루탈 테마 + flat(테두리 없는 브루탈)', '09-brutalist-zine', b => { b.elevation = 'flat'; }],
  ['N21 럭셔리 테마 + hard 깊이', '11-luxe-brand', b => { b.elevation = 'hard'; }],
  ['N22 스위스 테마 + gradient 배경', '10-swiss-type', b => { b.backdrop = 'gradient'; }],
  ['N23 녹턴 테마 + light 모드', '13-app-landing-dark', b => { b.mode = 'light'; }],
  ['N24 문서 페이지에 히어로', '06-docs-reference', b => { b.tree.children.splice(1, 0, {type: 'hero', variant: 'statement', title: '문서', body: '문서 소개'}); }],
  ['N25 랜딩에 목차(toc)', '15-devtool-terminal', b => { T(b, 'section').children.push({type: 'toc'}); }],
  ['N26 팔레트에 임의 hex(#ff00ff)', '09-brutalist-zine', b => { b.palette = '#ff00ff'; }],
  ['N27 media에 ratio 32:9(전폭 띠)', '02-asym-portfolio', b => { T(b, 'media').ratio = '32:9'; }],
  ['N28 media에 bleed(전폭 돌출) 키', '02-asym-portfolio', b => { T(b, 'media').bleed = 'full'; }],
  ['N29 hero에 title 두 번째 단계(문자 크기 role)', '07-event-conference', b => { T(b, 'hero').titleSize = 'giant'; }],
  ['N30 팀 구성원에 photo 키', '07-event-conference', b => { T(b, 'team').members[0].photo = 'x.jpg'; }],
  ['N31 form 변형 inline 한 줄(필드 1개)은 허용되는가(대조군)', '11-luxe-brand', b => { /* 변경 없음 */ }],
];
const out = [];
for (const [name, id, mutate] of probes) {
  const b = await load(id); mutate(b);
  const v = validateBlueprint(b);
  const first = v.errors[0];
  out.push({probe: name, base: id, valid: v.valid, codes: [...new Set(v.errors.map(e => e.code))], first: first ? `${first.path} ${first.code} ${first.message.slice(0, 70)}` : null});
  console.log(v.valid ? 'OK     ' : 'REJECT ', name, '=>', first ? first.code + ' ' + first.path : '');
}
await writeFile(new URL('./negative-probes-results.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
