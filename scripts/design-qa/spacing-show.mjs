// 감사 결과 JSON에서 특정 코드의 사례를 템플릿·폭과 함께 보여 준다. 사용: node scripts/design-qa/spacing-show.mjs <json> <CODE> [at-substring]
import {readFile} from 'node:fs/promises';
const [file, code, at] = process.argv.slice(2);
const rows = JSON.parse(await readFile(file, 'utf8')), seen = new Set();
for (const r of rows) for (const f of r.findings) {
  if (f.code !== code || (at && !f.at.includes(at))) continue;
  const key = `${r.id}|${f.at}|${f.detail}`; if (seen.has(key)) continue; seen.add(key);
  console.log(`${r.id} ${r.density} ${r.width}  ${f.at}  ${f.detail}`);
}
