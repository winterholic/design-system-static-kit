import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
const root = resolve(import.meta.dirname, '../../..');
const dir = resolve(root, 'docs/evidence/context-rollout');
const out = '/Volumes/Backup/ttakkari-data/outbox/09a10aeb-d987-4e3c-beb2-bd35d8fc7e96';
const notes = readFileSync(resolve(dir, 'visual-reaudit-notes.md'), 'utf8');
const receipt = JSON.parse(readFileSync(resolve(dir, 'visual-reaudit/receipt.json'), 'utf8'));
const rows = notes.split('\n').flatMap(line => {
  const m = line.match(/^(.+?) \| (1440|390) \| (.+?) \| (.+?) \| (상|중|하|-)\s*$/);
  return m ? [{name:m[1], width:Number(m[2]), place:m[3], issue:m[4], severity:m[5]}] : [];
});
const findings = rows.filter(x => x.severity !== '-');
const classify = x => {
  const s = `${x.place} ${x.issue}`;
  if (/목업|사진|이미지|일러스트|지도|다이어그램|문맥|무관|자리표시/.test(s)) return '콘텐츠·시각 자산 적합성';
  if (/폰트|모노스페이스|자간|글씨|타이포|제목|위계|크기|굵기|세리프/.test(s)) return '타이포그래피·위계';
  if (/헤더|푸터|정렬|간격|공백|여백|빔|빈 영역|폭|기둥|패딩|가운데|좌측|우측|중앙|들여/.test(s)) return '공간·정렬·밀도';
  if (/모바일|390|잘림|줄바꿈|가로 스크롤|1열|2열|표|헤더|쌓여|쌓임/.test(s)) return '좁은 화면 반응형';
  if (/중복|반복|카드|차트|표|버튼|링크|타임라인|갤러리|step|구성|레이아웃|목록|순서|탭|컨트롤/.test(s)) return '부품 선택·정보 구성';
  return '부품 선택·정보 구성';
};
const groupPaths = {
  '콘텐츠·시각 자산 적합성':'src/catalog/templates.mjs, src/render/motifs.mjs (추정)',
  '타이포그래피·위계':'src/typography.mjs, src/styles/chunks.mjs (추정)',
  '공간·정렬·밀도':'src/styles/shells.mjs, src/styles/chunks.mjs (추정)',
  '좁은 화면 반응형':'src/styles/chunks.mjs, src/styles/shells.mjs (추정)',
  '부품 선택·정보 구성':'src/catalog/templates.mjs, src/render/ (추정)'
};
const groups = new Map();
for (const f of findings) { const k=classify(f); groups.set(k,(groups.get(k)||0)+1); }
const severity = ['상','중','하'].map(s=>[s,findings.filter(x=>x.severity===s).length]);
const cover = new Map(receipt.views.map(v=>[`${v.width}/${v.name}`,v]));
const worst = [
 ['bank-product','1440','은행 예금 상품에 SaaS 프로젝트 대시보드 목업; 이자 차트는 카드 폭 약 45%에 그치고 라벨이 선과 겹침'],
 ['game-launch','1440','로드맵 타임라인은 좌측 20%만 사용; 680px 정사각 갤러리와 거대 재생 버튼이 화면을 압도'],
 ['campaign-donate','1440','후원 핵심 수치 6,420이 세 곳에 중복; 도넛도 카드 폭 40%만 차지'],
 ['dashboard-analytics','1440','막대 차트가 770px 카드 중 300px만 사용해 넓은 공백 발생'],
 ['hanji-journey','1440','여행 일정 타임라인이 695px 기둥의 좌측 1/3만 사용'],
 ['learning-course','1440','커리큘럼 세로 단계가 좌측 1/3에 몰리고 우측 2/3가 비어 있음'],
 ['blog-index','390','대표 글 이미지가 110×65px로 좌상단에 축소되어 다른 카드의 전폭 이미지 규칙과 충돌'],
 ['docs-reference','390','4열 요청 표가 폭에 눌려 설명이 4~5줄로 쌓이고 값이 읽기 어려움'],
 ['product-landing','1440','램프 사양 옆에 노드·화살표 워크플로 그림이 배치되어 제품 설명 목적과 불일치'],
 ['realty-detail','1440','매물 갤러리 4장 중 평면도는 워크플로 그림, 위치는 지도 자리표시 아이콘']
];
const best = [
 ['changelog','변경 목록을 중심으로 정보가 일관되게 이어지고 육안 메모에 전반 구성 양호로 기록'],
 ['help-center','도움말 탐색 목적에 맞는 구성으로 기록, 뚜렷한 위계·공간 결함 메모 없음'],
 ['stay-detail','갤러리·예약 카드·편의시설·후기 흐름이 목적에 맞고 균형이 양호하다고 기록']
];
const fmtPath=(name,w)=>`visual-reaudit/${w}/${name}.png`;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rowsMd = findings.map((f,i)=>`| ${i+1} | ${f.name} | ${f.width} | ${f.place.replaceAll('|','／')} | ${f.issue.replaceAll('|','／')} | ${f.severity} | ${fmtPath(f.name,f.width)} | ${groupPaths[classify(f)]} |`).join('\n');
const groupMd=[...groups].map(([g,n])=>`| ${g} | ${n} | ${groupPaths[g]} |`).join('\n');
const worstMd=worst.map((x,i)=>`| ${i+1} | ${x[0]} | ${x[1]} | ${x[2]} | ${fmtPath(x[0],x[1])} |`).join('\n');
const bestMd=best.map((x,i)=>`| ${i+1} | ${x[0]} | ${x[1]} | ${fmtPath(x[0],1440)} |`).join('\n');
const md=`# 시각 재감사 — 85개 예시 데스크톱·모바일\n\n기준 시각: ${receipt.at} · 대상: ${receipt.base} · 캡처 엔진: ${receipt.tool}\n\n## 요약\n\n- 전체 페이지 캡처 ${receipt.views.length}/170 (${new Set(receipt.views.map(x=>x.name)).size}개 × 1440px·390px), 응답 오류 ${receipt.views.filter(x=>x.status!==200).length}, 문서 가로 넘침 ${receipt.views.filter(x=>x.scrollWidth>x.innerWidth).length}.\n- 육안 메모에서 분류한 결함 ${findings.length}건: 상 ${severity[0][1]}, 중 ${severity[1][1]}, 하 ${severity[2][1]}. 구성 양호로 적힌 예시는 결함 수에서 제외.\n- 심각도는 화면 완성도·목적 적합성을 기준으로 한 디자이너 판단이다. 자동 가로 넘침 0건은 시각 품질이 양호하다는 뜻이 아니다.\n- 화면을 실제로 본 근거는 아래 전체 캡처와 메모다. 원인 코드 위치는 구조를 대조해 추정했으며, 개별 슬롯 값이 렌더링된 경로까지는 확인하지 않았다.\n\n## 반복 원인 그룹\n\n| 원인 그룹 | 건수 | 우선 확인할 코드 위치(추정) |\n|---|---:|---|\n${groupMd}\n\n그룹은 각 발견을 한 범주에만 넣은 편의 집계다. 서로 겹치는 원인은 있으므로 합계는 전체 발견 건수와 같다. 개별 템플릿 데이터 문제는 공통 규칙 수정과 분리해 판단해야 한다.\n\n## 가장 나쁜 예시 10개\n\n| 순위 | 예시 | 뷰포트 | 주요 근거 | 캡처 |\n|---:|---|---:|---|---|\n${worstMd}\n\n## 가장 좋은 예시 3개\n\n| 예시 | 선정 근거 | 캡처 |\n|---|---|---|\n${bestMd}\n\n선정은 현재 캡처 세트와 기록된 육안 관찰에 한정된다. 사용성 테스트나 실제 서비스 데이터 적합성 평가는 하지 않았다.\n\n## 전체 발견 목록 (${findings.length}건)\n\n| # | 예시 | 뷰포트 | 위치 | 관찰 | 심각도 | 캡처 | 원인 위치(추정) |\n|---:|---|---:|---|---|---|---|---|\n${rowsMd}\n\n## 커버리지와 한계\n\n- 캡처 영수증: [receipt.json](visual-reaudit/receipt.json). 예시별 응답 상태·문서 높이·가로 스크롤 폭이 기록돼 있다.\n- 자동 검사: 브라우저 렌더 폭 초과 0/170. 이 검사는 시각 위계, 과밀·공백, 콘텐츠와 이미지의 문맥 일치, 부품 선택을 판별하지 않는다.\n- 브라우저 재확인: 현재 세션에서 운영 bank-product를 브라우저 도구로 열고 전체 페이지 캡처를 추가 확인했다. 기존 전체 세트는 이전 실행의 영수증과 파일을 재사용했다.\n- 보조 계측 스크립트는 문법 오류를 고쳤고 node --check 통과. 직접 Playwright 실행은 macOS 브라우저 preflight가 blocked(Mach register / LaunchServices Mach lookup denied)로 끝나 이번 세션에서는 미실행했다. 이미 생성된 캡처·영수증의 출처와 현재 재현은 구분한다.\n- 이번 작업은 감사만 수행했다. src, site, tests 수정·커밋·푸시·배포는 하지 않았다.\n`;
writeFileSync(resolve(dir,'visual-reaudit.md'),md);
mkdirSync(out,{recursive:true});
const samples=[...worst.map(x=>[x[0],Number(x[1]),x[2],'상위 문제 예시']),...best.map(x=>[x[0],1440,x[1],'양호 예시'])];
const figs=samples.map(([name,width,caption,label])=>{const path=resolve(dir,`visual-reaudit/${width}/${name}.png`);const b64=readFileSync(path).toString('base64');return `<figure><img loading="lazy" src="data:image/png;base64,${b64}" alt="${name} ${width}px"><figcaption><b>${label} · ${name} · ${width}px</b><br>${caption}</figcaption></figure>`}).join('');
const htmlRows=findings.map((f,i)=>`<tr><td>${i+1}</td><td>${esc(f.name)}</td><td>${f.width}</td><td>${esc(f.place)}</td><td>${esc(f.issue)}</td><td>${f.severity}</td><td>${esc(fmtPath(f.name,f.width))}</td><td>${esc(groupPaths[classify(f)])}</td></tr>`).join('');
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>시각 재감사 — 85개 예시</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#20241f;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}header{background:#202c25;color:#f8f6ee;padding:48px max(24px,calc((100vw - 1100px)/2)) 40px}header p{color:#c3cbbb;margin:8px 0}.wrap{max-width:1100px;margin:auto;padding:28px 24px 60px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.stat,section{background:#fff;border:1px solid #deded5;border-radius:14px;padding:20px}.stat b{display:block;font-size:30px;color:#334e3c}h1{font-size:34px;line-height:1.15;margin:8px 0}h2{font-size:23px;margin:0 0 14px}h3{margin:24px 0 8px}.lede{font-size:18px;max-width:760px}.callout{border-left:4px solid #c58b32;padding:12px 16px;background:#fbf4e7;margin:18px 0 28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0;background:white;border:1px solid #ddd;border-radius:12px;overflow:hidden}img{display:block;width:100%;height:360px;object-fit:contain;background:#e8e7e1}figcaption{padding:13px 15px;font-size:14px}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #e4e3dc;padding:10px;vertical-align:top}th{font-size:13px;color:#656a60;position:sticky;top:0;background:#f7f6f1}.scroll{overflow:auto;max-height:75vh;font-size:13px}.scroll table{min-width:1180px}details{margin-top:24px}summary{cursor:pointer;font-size:20px;font-weight:700}@media(max-width:680px){.stats{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}header{padding:32px 22px}.wrap{padding:20px 16px}h1{font-size:28px}}@media print{body{background:#fff}.grid{grid-template-columns:1fr 1fr}section,.stat,figure{break-inside:avoid}.scroll{max-height:none;overflow:visible}}</style><header><div class="wrap" style="padding:0"><p>VISUAL AUDIT · 2026-11-16</p><h1>85개 예시, 170개 화면</h1><p class="lede">운영 갤러리를 1440px과 390px에서 살펴보고, 자동 넘침 검사로 잡히지 않는 시각·구성 문제를 기록했습니다.</p><p>${receipt.tool} · 캡처 시각 ${receipt.at}</p></div></header><main class="wrap"><div class="stats"><div class="stat"><b>170/170</b>전체 페이지 캡처</div><div class="stat"><b>${findings.length}</b>육안 발견</div><div class="stat"><b>${severity[0][1]}</b>상 심각도</div><div class="stat"><b>0</b>문서 가로 넘침</div></div><div class="callout">가로 넘침이 없다는 결과는 시각 품질과 별도입니다. 심각도는 육안 평가이며, 코드 위치는 추정으로 표시했습니다.</div><section><h2>주요 발견</h2><table><thead><tr><th>그룹</th><th>건수</th><th>추정 코드 위치</th></tr></thead><tbody>${[...groups].map(([g,n])=>`<tr><td>${g}</td><td>${n}</td><td>${groupPaths[g]}</td></tr>`).join('')}</tbody></table><h3>가장 나쁜 10개</h3><ol>${worst.map(x=>`<li><b>${x[0]}</b> (${x[1]}px): ${x[2]}</li>`).join('')}</ol><h3>가장 좋은 3개</h3><p>${best.map(x=>`${x[0]} — ${x[1]}`).join('<br>')}</p></section><h2 style="margin:28px 0 14px">대표 캡처</h2><div class="grid">${figs}</div><details><summary>전체 발견 ${findings.length}건 펼치기</summary><div class="scroll"><table><thead><tr><th>#</th><th>예시</th><th>폭</th><th>위치</th><th>관찰</th><th>심각도</th><th>캡처 경로</th><th>원인 코드 위치(추정)</th></tr></thead><tbody>${htmlRows}</tbody></table></div></details><section style="margin-top:18px"><h2>범위와 한계</h2><p>현재 운영 페이지의 기본 85개 예시를 전수 캡처했습니다. 자동 가로 넘침 검사는 0/170입니다. 콘텐츠와 이미지의 문맥 적합성, 공간 사용, 타이포 위계, 부품 선택은 자동 검사 결과와 별개로 육안 평가했습니다.</p><p>원인 코드는 카탈로그·렌더러 구조에 대조해 추정했습니다. 화면별 최종 원인 슬롯 확인, 사용성 테스트, 실제 서비스 콘텐츠 검증은 포함하지 않았습니다. src/site/tests 변경·커밋·배포는 없습니다.</p></section></main></html>`;
writeFileSync(resolve(out,'2026-11-16-audit-visual-reaudit.html'),html);
console.log(JSON.stringify({findings:findings.length,severity:Object.fromEntries(severity),groups:Object.fromEntries(groups),captures:receipt.views.length,html:resolve(out,'2026-11-16-audit-visual-reaudit.html')},null,2));
