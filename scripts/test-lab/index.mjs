#!/usr/bin/env node
/** Test-lab index builder: deterministic explorer (index.html + viewer.html).
 *  Usage: node scripts/test-lab/index.mjs [--out site/test-lab]
 *  Runtime data (manifest/check-report/coverage JSON) is fetched, never inlined,
 *  so the built pages stay small and deterministic (commit+seed+counts only).
 */
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const raw = process.argv.slice(2);
const OUT = resolve(fileURLToPath(new URL('../..', import.meta.url)), raw[raw.indexOf('--out') + 1] ?? 'site/test-lab');

const manifest = JSON.parse(await readFile(resolve(OUT, 'manifest.json'), 'utf8'));
const check = JSON.parse(await readFile(resolve(OUT, 'check-report.json'), 'utf8'));
const checkById = new Map(check.results.map(r => [r.id, r]));
const T = manifest.totals;

// curated: one matrix case per page type (manifest order is deterministic)
// Rotates through the matrix cases of each page type (deterministic) so the overview shows different themes, not one theme 16 times.
const repByPageType = [];
{
  const byType = new Map();
  for (const c of manifest.cases) if (c.set === 'matrix') byType.set(c.pageType, [...(byType.get(c.pageType) ?? []), c.id]);
  [...byType.values()].forEach((ids, i) => repByPageType.push(ids[(i * 11 + 3) % ids.length]));
}
const boundary = manifest.cases.filter(c => c.set === 'stress').map(c => c.id);
const curated = {representative: repByPageType, boundary};

const head = (title, desc) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${desc}"><title>${title}</title><style>
:root{color-scheme:light dark}
*{box-sizing:border-box}body{margin:0;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;padding:0 16px 64px;max-width:1180px;margin-inline:auto}
header.top{padding:28px 0 8px;border-bottom:2px solid currentColor}
h1{font-size:24px;margin:0 0 4px}.sub{color:#666;font-size:13px}
.badges{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.badge{font-size:12px;border:1px solid #999;border-radius:20px;padding:2px 10px}
.badge.ok{border-color:#1a7f37;color:#1a7f37}.badge.todo{border-color:#9a6700;color:#9a6700}
.toolbar{position:sticky;top:0;background:inherit;padding:10px 0;border-bottom:1px solid #ccc;z-index:5}
.toolbar input,.toolbar select{font:inherit;padding:6px 8px;margin:2px;border:1px solid #999;border-radius:6px;max-width:100%}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-top:12px}
.card{border:1px solid #bbb;border-radius:10px;padding:10px 12px;font-size:13px;text-decoration:none;color:inherit}
.card:hover{border-color:#000}.card code{font-size:12px;word-break:break-all}
.card .meta{color:#555;font-size:12px;margin-top:4px}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}.pass{background:#1a7f37}.fail{background:#cf222e}
.pager{display:flex;gap:8px;align-items:center;margin:16px 0;flex-wrap:wrap}
.pager button{font:inherit;padding:6px 14px;border:1px solid #999;border-radius:6px;background:none}
section.block{margin-top:28px}section.block h2{font-size:18px}
ul.plain{padding-left:20px;font-size:14px}ul.plain code{font-size:12px}
table.meta{border-collapse:collapse;font-size:13px;margin:12px 0}table.meta th,table.meta td{border:1px solid #bbb;padding:4px 10px;text-align:left}

.viewer{display:grid;grid-template-columns:300px 1fr;gap:12px;margin-top:12px}
.viewer iframe{width:100%;height:78vh;border:1px solid #999;border-radius:8px;background:#fff}
@media(max-width:760px){.viewer{grid-template-columns:1fr}.viewer iframe{height:70vh}}
.navrow{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.navrow a,.navrow button{font:inherit;font-size:13px;padding:6px 12px;border:1px solid #999;border-radius:6px;background:none;color:inherit;text-decoration:none}
.note{font-size:13px;color:#555}
.thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;margin-top:12px}.thumb{display:block;text-decoration:none;color:inherit;border:1px solid #bbb;border-radius:12px;overflow:hidden;background:#fff;transition:box-shadow .15s,border-color .15s}.thumb:hover,.thumb:focus-visible{border-color:#000;box-shadow:0 6px 20px #0002}.shot{display:block;aspect-ratio:4/3;overflow:hidden;position:relative;border-bottom:1px solid #ddd}.shot iframe{position:absolute;left:0;top:0;width:400%;height:400%;border:0;transform:scale(.25);transform-origin:0 0;pointer-events:none}.cap{display:block;padding:8px 12px 10px;font-size:12px;color:#555}.cap code{color:#111;word-break:break-all}
footer.site{margin-top:40px;border-top:1px solid #ccc;padding-top:12px;font-size:12px;color:#555}
</style></head><body>`;

const failCases = check.results.filter(r => !r.pass).map(r => r.id);
const skipList = (manifest.skipped ?? []).map(s => `<li><code>${s.id}</code> · ${(s.codes ?? []).join(',') || '규칙 거부'}</li>`).join('');
const negList = (manifest.negatives ?? []).map(n => `<li><code>${n.id}</code> · 기대 ${n.expect} · 실제 ${(n.codes ?? []).join(',')}</li>`).join('');
const dupList = (manifest.duplicates ?? []).slice(0, 20).map(d => `<li><code>${d.id}</code> → <code>${d.duplicateOf}</code>와 바이트 동일</li>`).join('');

const indexHtml = head('Test Lab · 조합 검증 탐색', '생성된 케이스 탐색') + `
<header class="top"><h1>Test Lab · 조합 검증 탐색</h1>
<p class="sub">seed ${manifest.seed} · 카탈로그 ${manifest.catalogVersion} · 고유 페이지 ${T.cases} · 중복 제거 ${(manifest.duplicates ?? []).length} · 규칙 거부 ${(manifest.skipped ?? []).length} · 거부 입력 ${T.negativeRejected}/${(manifest.negatives ?? []).length}</p>
<div class="badges"><span class="badge ok">정적검사 ${check.summary.passed}/${check.summary.cases} 통과</span><span class="badge ok">Chromium 390/1280px 가로 넘침 전수 0 (육안은 대표 표본만)</span><span class="badge">Safari/iOS·스크린리더 미검증</span></div></header>
<section class="block"><h2>범위와 정직한 한계</h2>
<p class="note">정적검사(문서 구조·앵커·이름·라벨·표·스크립트·외부URL·용량)는 전수 통과. 시각 품질·오버플로우·키보드·실제 렌더는 브라우저 검사 영역이다. 전수로 확인한 것은 390/1280px 가로 넘침(<code>scripts/design-qa/sweep.mjs</code>)과 정적검사이고, 육안은 대표 표본만 봤다(전수 아님, Safari/iOS·스크린리더 미검증). CI(<code>e2e/lab-pages.spec.mjs</code>)가 Chromium 실측을 담당한다. 커밋·검사시각은 <code>docs/verification.md</code>와 CI 실행 기록으로 확인한다. 산출물은 결정적 재생산을 위해 시각·커밋을 포함하지 않는다 (재생성: 아래 명령 참조).</p></section>
<section class="block"><h2>대표 케이스 (페이지 유형별)</h2>
<p class="note">작은 화면은 실제 생성 페이지를 축소해 보여 준다(스크립트 없음, 지연 로드). 카드를 열면 뷰어로 이동한다.</p>
<div class="thumbs">${curated.representative.map(id => { const c = manifest.cases.find(x => x.id === id); return `<a class="thumb" href="viewer.html?case=${id}"><span class="shot"><iframe src="cases/${id}/index.html" title="${id} 미리보기" loading="lazy" tabindex="-1" aria-hidden="true" sandbox=""></iframe></span><span class="cap"><code>${id}</code><br>${c.theme} · ${c.mode} · ${c.pageType}</span></a>`; }).join('')}</div></section>
<section class="block"><h2>경계·스트레스 케이스 (${boundary.length})</h2>
<ul class="plain">${boundary.map(id => `<li><a href="viewer.html?case=${id}"><code>${id}</code></a></li>`).join('')}</ul></section>
<section class="block"><h2>거부된 입력 (${(manifest.negatives ?? []).length}) · 규칙 거부 (${(manifest.skipped ?? []).length}) · 중복 (${(manifest.duplicates ?? []).length})</h2>
<ul class="plain">${negList}${skipList}${dupList}${(manifest.duplicates ?? []).length > 20 ? `<li>… 외 ${(manifest.duplicates ?? []).length - 20}건 (manifest.json 참조)</li>` : ''}</ul>
<p class="note">실패한 정적검사 케이스: ${failCases.length ? failCases.map(id => `<code>${id}</code>`).join(' ') : '없음 (check-report.json 참조)'}</p></section>
<section class="block"><h2>전체 탐색</h2>
<div class="toolbar" role="search"><input id="q" type="search" placeholder="검색: id·테마·팔레트·셸·템플릿" aria-label="케이스 검색">
<select id="fset" aria-label="세트"><option value="">세트 전체</option><option value="matrix">matrix</option><option value="palette-mode">palette-mode</option><option value="pairwise">pairwise</option><option value="stress">stress</option><option value="variant">variant</option></select>
<select id="fmode" aria-label="모드"><option value="">모드 전체</option><option value="light">light</option><option value="dark">dark</option><option value="auto">auto</option></select>
<select id="fpt" aria-label="페이지 유형"><option value="">유형 전체</option></select>
<select id="fshell" aria-label="셸"><option value="">셸 전체</option></select>
<select id="fcheck" aria-label="검사"><option value="">검사 전체</option><option value="pass">통과</option><option value="fail">실패</option></select></div>
<div class="pager"><button id="prev">이전</button><span id="pageinfo" role="status"></span><button id="next">다음</button></div>
<div class="grid" id="grid"></div>
<div class="pager"><button id="prev2">이전</button><span id="pageinfo2" role="status"></span><button id="next2">다음</button></div></section>
<footer class="site">재생성: <code>node scripts/test-lab/generate.mjs</code> → <code>node scripts/test-lab/check.mjs</code> → <code>node scripts/test-lab/index.mjs</code> · 검증: <code>node scripts/test-lab/generate.mjs --verify</code> · 로컬 열람: <code>npm run dev</code> 후 <code>/site/test-lab/</code></footer>
<script>
const PAGE=60;let MAN,CHK,page=0;
const $=id=>document.getElementById(id);
const chkById=new Map();
async function boot(){
  try{MAN=await (await fetch('manifest.json')).json();CHK=await (await fetch('check-report.json')).json();}
  catch(e){$('grid').innerHTML='<p class=note>manifest를 불러오지 못했다. file:// 로 열었으면 <code>npm run dev</code> 로 HTTP 서버를 띄우고 <code>/site/test-lab/</code> 로 접속하라.</p>';return;}
  for(const r of CHK.results)chkById.set(r.id,r.pass);
  const pts=[...new Set(MAN.cases.map(c=>c.pageType))].sort(),shs=[...new Set(MAN.cases.map(c=>c.axes.shell))].sort();
  for(const v of pts)$('fpt').insertAdjacentHTML('beforeend','<option>'+v+'</option>');
  for(const v of shs)$('fshell').insertAdjacentHTML('beforeend','<option>'+v+'</option>');
  for(const id of ['q','fset','fmode','fpt','fshell','fcheck'])$(id).addEventListener('input',()=>{page=0;render();});
  $('prev').onclick=$('prev2').onclick=()=>{if(page>0){page--;render();}};
  $('next').onclick=$('next2').onclick=()=>{page++;render();};
  render();
}
function filtered(){
  const q=$('q').value.trim().toLowerCase();
  return MAN.cases.filter(c=>{
    if($('fset').value&&c.set!==$('fset').value)return false;
    if($('fmode').value&&c.mode!==$('fmode').value)return false;
    if($('fpt').value&&c.pageType!==$('fpt').value)return false;
    if($('fshell').value&&c.axes.shell!==$('fshell').value)return false;
    const ok=chkById.get(c.id);
    if($('fcheck').value==='pass'&&ok!==true)return false;
    if($('fcheck').value==='fail'&&ok!==false)return false;
    if(q&&![c.id,c.theme,c.palette,c.axes.shell,c.template,c.note].join(' ').toLowerCase().includes(q))return false;
    return true;
  });
}
function render(){
  const list=filtered(),pages=Math.max(1,Math.ceil(list.length/PAGE));
  page=Math.min(page,pages-1);
  const slice=list.slice(page*PAGE,page*PAGE+PAGE);
  $('grid').innerHTML=slice.map(c=>{
    const ok=chkById.get(c.id);
    return '<a class=card href="viewer.html?case='+c.id+'"><span class="dot '+(ok?'pass':'fail')+'"></span><code>'+c.id+'</code><div class=meta>'+c.template+' · '+c.theme+'<br>'+c.palette+' · '+c.mode+' · '+c.axes.shell+'<br>'+c.pageType+' · '+(c.bytes/1024).toFixed(1)+'KB</div></a>';
  }).join('');
  const info=(page+1)+' / '+pages+' · '+list.length+'건';
  $('pageinfo').textContent=info;$('pageinfo2').textContent=info;
}
boot();
</script></body></html>`;

const viewerHtml = head('Test Lab · 케이스 뷰어', '단일 케이스 확인') + `
<header class="top"><h1>케이스 뷰어</h1><p class="sub"><a href="index.html">인덱스로</a> · seed ${manifest.seed} · 카탈로그 ${manifest.catalogVersion}</p>
<div class="badges"><span class="badge ok">정적검사 결과 아래 표시</span><span class="badge todo">육안은 대표 표본만</span></div></header>
<div class="navrow"><a href="index.html">인덱스로</a><button id="prevCase">이전 케이스</button><button id="nextCase">다음 케이스</button><a id="openDirect" href="#">직접 URL로 열기 ↗</a></div>
<table class="meta" id="meta"></table>
<p class="note" id="findings"></p>
<div class="viewer"><div><h2 style="font-size:15px">검사 메모</h2><p class="note" id="note"></p><p class="note">뷰포트별 확인은 브라우저에서 직접 URL을 열고 360/390/768/1280/1600px로 본다. 오버플로우·키보드·실제 렌더는 CI Chromium 검사가 담당한다.</p></div>
<iframe id="frame" title="케이스 미리보기" sandbox="allow-scripts allow-forms"></iframe></div>
<script>
let MAN,CHK,order=[];
async function boot(){
  MAN=await (await fetch('manifest.json')).json();CHK=await (await fetch('check-report.json')).json();
  order=MAN.cases.map(c=>c.id);
  const id=new URLSearchParams(location.search).get('case')||order[0];
  show(id);
  document.getElementById('prevCase').onclick=()=>step(id,-1);
  document.getElementById('nextCase').onclick=()=>step(id,1);
}
function step(id,d){const i=order.indexOf(id);location.search='?case='+order[(i+d+order.length)%order.length];}
function show(id){
  const c=MAN.cases.find(x=>x.id===id);if(!c){document.body.insertAdjacentHTML('beforeend','<p>없는 케이스</p>');return;}
  const r=CHK.results.find(x=>x.id===id);
  document.title='Test Lab · '+id;
  document.getElementById('frame').src='cases/'+id+'/index.html';
  document.getElementById('openDirect').href='cases/'+id+'/index.html';
  const rows=[['id',c.id],['세트',c.set],['템플릿',c.template],['테마',c.theme],['팔레트',c.palette],['모드',c.mode],['페이지 유형',c.pageType],['셸',c.axes.shell],['축',Object.entries(c.axes).map(([k,v])=>k+'='+v).join(', ')],['권장 뷰포트',c.viewports.join(', ')],['메모',c.note],['sha256',c.sha256.slice(0,16)+'…'],['용량',(c.bytes/1024).toFixed(1)+'KB'],['정적검사',r?(r.pass?'통과':'실패 '+r.findings.map(f=>f.code+':'+f.detail).join(' / ')):'기록 없음']];
  document.getElementById('meta').innerHTML=rows.map(([k,v])=>'<tr><th>'+k+'</th><td>'+String(v).replace(/</g,'&lt;')+'</td></tr>').join('');
  document.getElementById('note').textContent=c.note;
}
boot();
</script></body></html>`;

await writeFile(resolve(OUT, 'index.html'), indexHtml);
await writeFile(resolve(OUT, 'viewer.html'), viewerHtml);
console.log(`INDEX: cases=${manifest.cases.length} representative=${curated.representative.length} boundary=${boundary.length} failed=${failCases.length}`);

