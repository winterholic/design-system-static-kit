// report-template.md의 {{...}} 자리에 사례 표·집계·실행 결과를 채워 report.md를 만든다.
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {specs} from './specs.mjs';
import {verdicts, CAUSES} from './verdicts.mjs';
const here = p => new URL(p, import.meta.url);
const results = JSON.parse(await readFile(here('./cases/results.json'), 'utf8'));
const neg = JSON.parse(await readFile(here('./negative-probes-results.json'), 'utf8'));
const files = (await readdir(here('./cases/'))).sort();
let tpl = await readFile(here('./report-template.md'), 'utf8');

// 1) 사례 정의
const defs = specs.map(s => `### ${s.id} · ${s.type}\n\n테마 \`${s.theme}\`. ${s.brief}\n\n원하는 요소: ${s.wants.map(([, t]) => t).join(' / ')}`).join('\n\n');
// 2) 실행 결과
const exec = ['| 사례 | validate | compile | build·check | 가로 넘침 1280 / 390 | 문서 높이 1280 / 390 |', '|---|---|---|---|---|---|',
  ...results.map(r => `| ${r.id} | ${r.validate?.startsWith('VALID') ? 'VALID' : r.validate} | ${r.compile} | ${r.check?.startsWith('VERIFIED') ? 'VERIFIED' : r.check} | ${r.overflow[1280]} / ${r.overflow[390]} | ${r.height[1280]} / ${r.height[390]} |`)].join('\n');
// 3) 사례별 판정표
const tally = {'○': 0, '△': 0, '✕': 0}, causeTally = {}, byCase = []; let okA = 0;
const tables = specs.map(s => {
  const v = verdicts[s.id]; const rows = s.wants.map(([id, text]) => {
    const [st, cause, note] = v[id] ?? ['?', '', '판정 없음']; if (!v[id]) throw new Error(`missing verdict ${s.id}/${id}`);
    tally[st]++; if (st === '○' && cause.split('+').includes('A')) okA++; if (st !== '○') for (const c of cause.split('+').filter(Boolean)) causeTally[c] = (causeTally[c] ?? 0) + 1;
    return `| ${text} | ${st} | ${cause || '-'} | ${note} |`;
  });
  const n = s.wants.length, ok = s.wants.filter(([id]) => v[id][0] === '○').length, part = s.wants.filter(([id]) => v[id][0] === '△').length;
  byCase.push(`| ${s.id} | ${n} | ${ok} | ${part} | ${n - ok - part} |`);
  return `### ${s.id} · ${s.type}\n\n캡처: \`cases/${s.id}-1280.jpg\`, \`cases/${s.id}-390.jpg\` · Blueprint: \`cases/${s.id}.json\`\n\n| 원하는 것 | 상태 | 원인 | 근거 |\n|---|---|---|---|\n${rows.join('\n')}`;
}).join('\n\n');
const total = tally['○'] + tally['△'] + tally['✕'];
const summary = `총 ${total}개 항목: ○ ${tally['○']}, △ ${tally['△']}, ✕ ${tally['✕']}.\n\n| 사례 | 항목 | ○ | △ | ✕ |\n|---|---|---|---|---|\n${byCase.join('\n')}`;
const causeTable = ['| 원인 | 뜻 | △·✕ 항목 수(복수 원인은 각각 셈) |', '|---|---|---|', ...Object.entries(CAUSES).map(([k, v]) => `| ${k} | ${v} | ${causeTally[k] ?? 0} |`)].join('\n');
// 4) 부정 탐침
const negTable = ['| 탐침 | 결과 | 오류 코드 |', '|---|---|---|', ...neg.map(n => `| ${n.probe} | ${n.valid ? '통과' : '거부'} | ${n.codes.join(', ') || '-'} |`)].join('\n');
const fileList = files.filter(f => /\.(jpg|json)$/.test(f) && f !== 'results.json').map(f => '`' + f + '`').join(', ');
const caps = files.filter(f => f.endsWith('.jpg')).length;
tpl = tpl.replace('{{DEFS}}', defs).replace('{{EXEC}}', exec).replace('{{TABLES}}', tables).replace('{{SUMMARY}}', summary).replace('{{CAUSES}}', causeTable).replace('{{NEG}}', negTable).replace('{{FILES}}', fileList).replace('{{CAPCOUNT}}', String(caps)).replace('{{OKA}}', String(okA)).replace('{{TOTAL}}', String(total)).replace('{{OK}}', String(tally['○'])).replace('{{PART}}', String(tally['△'])).replace('{{NO}}', String(tally['✕']));
await writeFile(here('./report.md'), tpl);
console.log('report.md', tpl.length, 'bytes;', JSON.stringify(tally), JSON.stringify(causeTally), 'captures', caps);
