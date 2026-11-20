// 전후 비교 단일 HTML 생성기(2026-11-21 최종 검증). before/와 final/의 스크린샷을 같은 폭끼리 나란히 놓는다. 이미지는 상대 경로다.
// 숫자(문서 높이, 프로브 지적, 바이트 동일 여부)는 측정 JSON과 PNG에서 그 자리에서 계산한다. "본 것/못 본 것" 문구만 손으로 쓴다(NOTES).
// 사용: node scripts/design-qa/final-compare.mjs  → docs/evidence/quality-2026-11-21/compare.html
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const base = resolve(import.meta.dirname, '../../docs/evidence/quality-2026-11-21');
const rd = f => JSON.parse(readFileSync(resolve(base, f), 'utf8'));
const before = rd('measure-before.json'), fin = rd('final/measure-final.json');
const claimsB = rd('claims-before.json'), claimsF = rd('final/claims-final.json');
const samples = Object.fromEntries(rd('samples.json').samples.map(s => [s.key, s]));
const WIDTHS = [320, 390, 768, 1440];
const sha = f => createHash('sha256').update(readFileSync(resolve(base, f))).digest('hex');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/** seen: 내가 직접 열어 본 폭. improved/remaining은 그 폭에서 본 것과 측정에서 나온 것만 적는다. */
const NOTES = {
  S07: {seen: [320, 1440], improved: '320px: 히어로 수치 3개가 2+1에서 한 줄 3칸으로(Q01 통과). 수치와 다음 섹션 사이 간격이 줄었다(Q10 통과, 320px 130px). 문서 높이 4314→4250. 1440px도 수치 아래 간격이 눈에 띄게 줄었다(Q10 208→104px, 이 비교 페이지를 브라우저로 열어 확인).', remaining: '없음(이 표본에서 새로 본 것 없음).'},
  S05: {seen: [1440], improved: '1440px: 텍스트만 있는 split 히어로가 가운데 형태로 바뀌어 오른쪽 절반이 비는 모습은 없어졌다(Q06 0.50→0.29 통과).', remaining: '히어로 제목은 34px 그대로이고 제품 시각 요소도 없다. 첫 화면은 여전히 작은 제목 아래 빈 띠가 크다(보이는 대로). 제목 크기 대 섹션 제목 비(RC02 1.6)는 기본 조립에서 채워지지 않는다. Recipe 조립(`devtool-landing~hero:product`)만 64px·시각 요소를 갖는다.'},
  S06: {seen: [1440], improved: '1440px: 벤토가 촘촘해졌다. 지표 칸 4개 빈 비율 0.69→0.53(Q07 통과). 히어로와 첫 섹션 사이 빈 띠가 줄어 문서 높이 3357→3012.', remaining: '벤토 큰 그림 칸이 362px 높이로 줄면서 램프 그림의 아래쪽(받침 타원)이 잘려 보인다(final에서 직접 확인, before에는 없던 모습). 그림 장면이 다른 장면으로 순환돼 램프 색이 갈색에서 분홍으로 바뀌었다(P01 순환의 결과). 이 잘림은 어떤 검사도 잡지 않는다.'},
  S01: {seen: [1440, 390], improved: '390px: 히어로 목업과 같은 대시보드가 벤토에 또 나오던 중복이 없어졌다(Q13 통과). 1440px: 벤토 지표·진행률이 한 줄, 카드·인용이 한 줄로 묶였다(Q07 0.63→0.52).', remaining: '완성도 높음으로 분류했던 표본이 바이트가 달라졌다. 1440px에서 벤토 첫 칸이 구체적인 제품 화면 대신 글자 없는 범용 흐름도(1016×881px, 약 585px 높이)로 바뀌어 크고 성기다. 중복은 없앴지만 이 칸이 제품을 설명하는 힘은 약해졌다고 본다(내 육안 판단, 사람 레이블 아님). 악화로 볼지는 확인 필요.'},
  S12: {seen: [768], improved: '768px: EMPTY_CELL 지적 해소, 도넛 링이 커짐. 1440px 카드 아래 빈 공간 210→77px(Q04 통과).', remaining: '768px에서 월별 매출 카드는 막대 차트가 작게(축 글자 약 7px) 가운데에 떠 있고 위아래가 크게 빈다(보이는 대로). Q04는 비율 조건(35%<38%)으로 통과한다. 읽기 어려운 작은 글자는 어떤 검사도 잡지 않는다.'},
  S23: {seen: [320], improved: '320px: 메뉴 줄이 가로로 넘치지 않는다(Q02 maxOverflow 36→0). 768px 사진 메뉴 2+1 해소(Q03 통과, 이 폭은 직접 보지 않음).', remaining: '320px에서 같은 목록 안의 가격 위치가 줄마다 다르다(어떤 줄은 이름 옆 점선 뒤, 어떤 줄은 아래 줄 오른쪽). 줄바꿈 결과이고 결함으로 단정하지 않으나 일관성은 떨어진다.'},
  S27: {seen: [320], improved: '320px: 제목이 3줄에서 2줄로(33px→24.9px, Q05 통과).', remaining: '일러스트의 언덕 도형이 사각 상자에서 직선으로 잘리는 모습(진단 C6)은 그대로다. 고치지 않았다.'},
  S11: {seen: [], improved: '4폭 모두 before와 바이트 동일. 렌더는 바뀌지 않았다. 갤러리 기본 추천에서만 빠진다(V03, `recommended:false`).', remaining: 'KPI가 2행이 되는 렌더(Q11 실패)는 그대로 열 수 있다.'},
  S30: {seen: [], improved: '머리말만 가운데인 렌더(Q12 5/5 불일치)는 그대로. 갤러리 기본 추천에서만 빠진다(V04). 4폭 PNG는 S01의 벤토 변경 때문에 바이트가 달라졌다(육안 비교 안 함).', remaining: '렌더를 고치지 않았다.'},
  S02: {seen: [], improved: '히어로 제품 목업이 사라지는 렌더(Q14 실패)는 그대로. 기본 추천에서만 빠진다(V01). PNG는 S01 벤토 변경만큼 달라졌다(육안 비교 안 함).', remaining: '렌더를 고치지 않았다.'},
  S17: {seen: [], improved: '1440px 폼 2열에서 반폭 필드 혼자 한 줄이 없어졌다(Q09 loneHalfRows 1→0). 이 폭 PNG는 before와 바이트가 달라졌고 육안 비교는 하지 않았다.', remaining: '이 표본의 나머지 3폭은 바이트 동일.'},
  S29: {seen: [], improved: '제목 끝줄 고아(ORPHAN_LINE) 3개×3폭이 0(프로브). 육안 비교는 하지 않았다.', remaining: 'Recipe는 이 템플릿을 추천하지 않는다(RC05, 차트 가로 왜곡 2.13배 Q08).'},
  S15: {seen: [], improved: '4폭 중 320·768이 바이트 동일이 아니라 2폭만 동일. 차트 도메인·가로 늘림(Q08 1440 실패)은 그대로.', remaining: '이 단위에서 고치지 않았다(진단 C4).'}
};
const ORDER = ['S07', 'S05', 'S06', 'S27', 'S12', 'S23', 'S17', 'S29', 'S11', 'S30', 'S02', 'S15'];
const GOOD = Object.values(samples).filter(s => s.kind === 'good').map(s => s.key);
const OTHER = Object.keys(samples).filter(k => !ORDER.includes(k) && !GOOD.includes(k));

function claimLines(key) {
  const out = [];
  for (const [q, c] of Object.entries(claimsF.claims)) {
    c.results.forEach((r, i) => {
      if (r.target !== key) return;
      const b = claimsB.claims[q]?.results?.[i];
      out.push(`${q}${r.width ? '@' + r.width : ''} ${b ? (b.pass ? '통과' : '실패') : '?'} → ${r.pass ? '통과' : '실패'}${r.recommended === false ? '(추천 제외 ' + r.rules.join('+') + ')' : ''}`);
    });
  }
  return out;
}

function card(key) {
  const s = samples[key], n = NOTES[key] ?? {seen: [], improved: '', remaining: ''};
  const rows = WIDTHS.map(w => {
    const b = before.samples[key].widths[w], f = fin.samples[key].widths[w];
    const same = sha(b.file) === sha(f.file);
    const codes = x => x.findings.length ? x.findings.map(a => a.code).join(',') : '없음';
    return `<div class="w" data-w="${w}"><div class="meta">${w}px · 문서 높이 ${b.docH}→${f.docH}px · 프로브 지적 ${esc(codes(b))} → ${esc(codes(f))} · ${same ? '<b class="same">PNG 바이트 동일</b>' : '<b class="chg">PNG 달라짐</b>'}${n.seen.includes(w) ? ' · <b class="seen">직접 봄</b>' : ' · 육안 비교 안 함'}</div>
<div class="pair"><figure><figcaption>before (2.3.0, 89573577f)</figcaption><div class="box"><img loading="lazy" src="${b.file}" alt="${key} before ${w}"></div></figure><figure><figcaption>final (2.4.0, d72d78389)</figcaption><div class="box"><img loading="lazy" src="${f.file.replace(/^final\//, 'final/')}" alt="${key} final ${w}"></div></figure></div></div>`;
  }).join('\n');
  const cl = claimLines(key);
  return `<section id="${key}"><h2>${key} · ${esc(s.combo)}${Object.keys(s.view ?? {}).length ? ' · ' + esc(JSON.stringify(s.view)) : ''}</h2>
<p class="kind">분류: ${esc(s.kind)} · ${esc(s.note)}</p>
${cl.length ? `<p class="q">측정 조건(Q) · ${esc(cl.join(' · '))}</p>` : ''}
${n.improved ? `<p class="imp"><b>개선</b> · ${esc(n.improved)}</p>` : ''}
${n.remaining ? `<p class="rem"><b>남은 문제·새로 본 것</b> · ${esc(n.remaining)}</p>` : ''}
<div class="tabs">${WIDTHS.map(w => `<button data-w="${w}">${w}px</button>`).join('')}</div>${rows}</section>`;
}

const goodRows = GOOD.map(k => {
  const cells = WIDTHS.map(w => sha(before.samples[k].widths[w].file) === sha(fin.samples[k].widths[w].file) ? '동일' : '달라짐').join(' / ');
  const dh = WIDTHS.map(w => `${before.samples[k].widths[w].docH}→${fin.samples[k].widths[w].docH}`).join(' / ');
  return `<tr><td>${k}</td><td>${esc(samples[k].combo)}</td><td>${cells}</td><td>${dh}</td></tr>`;
}).join('\n');

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>전후 비교: 카탈로그 2.3.0 → 2.4.0</title>
<style>
body{font:15px/1.55 system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;margin:0;color:#1d2433;background:#f6f7f9}
header,section,.good,details{max-width:1500px;margin:0 auto;padding:16px 20px}
h1{font-size:22px;margin:8px 0}h2{font-size:18px;margin:6px 0;border-top:2px solid #d6dbe4;padding-top:14px}
.note{background:#fff7e0;border:1px solid #e8d59a;padding:10px 14px;border-radius:8px}
.kind,.q{color:#4a5468;margin:4px 0;font-size:13px}.imp{margin:6px 0}.rem{margin:6px 0;color:#7a2d1a}
.tabs{display:flex;gap:6px;margin:10px 0}.tabs button{border:1px solid #b9c1cf;background:#fff;border-radius:6px;padding:6px 12px;font:inherit;cursor:pointer}
.tabs button.on{background:#1d2433;color:#fff}
.w{display:none}.w.on{display:block}.meta{font-size:12.5px;color:#4a5468;margin:6px 0}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
figure{margin:0}figcaption{font-size:12.5px;font-weight:600;margin-bottom:4px}
.box{max-height:760px;overflow:auto;border:1px solid #cdd3de;background:#fff}.box img{display:block;width:100%;height:auto}
.same{color:#1a6b3a}.chg{color:#9a4b00}.seen{color:#0b4fb3}
table{border-collapse:collapse;width:100%;background:#fff;font-size:13px}td,th{border:1px solid #d6dbe4;padding:6px 8px;text-align:left}
nav{display:flex;flex-wrap:wrap;gap:4px 12px}nav a{font-size:13px}.tw{overflow-x:auto}
summary{cursor:pointer;font-weight:600}
@media (max-width:700px){.pair{grid-template-columns:1fr}.box{max-height:520px}}
</style></head><body>
<header><h1>카탈로그 2.3.0 → 2.4.0 전후 비교</h1>
<p class="note">같은 조합 ${Object.keys(samples).length}개를 4개 폭에서 비교한다. 캡처 커밋은 2.3.0 <code>89573577f</code>와 2.4.0 <code>d72d78389</code>다. Chromium과 macOS 폰트를 사용했고, 긴 페이지는 폭별 상한까지 담았다. 직접 판독한 폭에는 «직접 봄»을 표시했다.</p>
<nav>${ORDER.map(k => `<a href="#${k}">${k}</a>`).join('')}<a href="#good">완성도 높음 ${GOOD.length}개</a><a href="#other" onclick="document.getElementById('other').open=true">나머지 ${OTHER.length}개</a></nav></header>
${ORDER.map(card).join('\n')}
<div class="good" id="good"><h2>완성도 높음으로 분류한 표본 7개(회귀 확인)</h2>
<p>폭 순서 320 / 390 / 768 / 1440. 바이트가 달라진 표본은 S01(벤토 변경), S18(푸터 버전 문구), S34(320px 제목 33→32px)다. 개별 판단은 보고서 4절.</p>
<div class="tw"><table><tr><th>키</th><th>조합</th><th>PNG</th><th>문서 높이 before→final</th></tr>${goodRows}</table></div>
${GOOD.map(card).join('\n')}</div>
<details id="other"><summary>나머지 표본 ${OTHER.length}개</summary>
${OTHER.map(card).join('\n')}</details>
<script>
document.querySelectorAll('section').forEach(sec=>{const tabs=[...sec.querySelectorAll('.tabs button')];if(!tabs.length)return;
const show=w=>{tabs.forEach(b=>b.classList.toggle('on',b.dataset.w==w));sec.querySelectorAll('.w').forEach(d=>d.classList.toggle('on',d.dataset.w==w))};
tabs.forEach(b=>b.onclick=()=>show(b.dataset.w));show(innerWidth<700?390:1440)});
</script></body></html>`;
writeFileSync(resolve(base, 'compare.html'), html);
console.log('compare.html', Math.round(html.length / 1024) + 'KB', 'samples', ORDER.length + GOOD.length + OTHER.length);
