// 기존 등급 증거(docs/evidence/diagnosis-round6.json, 압축형)와 새 진단(diagnose.mjs의 전체 JSON)을 조합 id 단위로 비교한다.
// 사용: node scripts/design-qa/grades-diff.mjs <new.json> [--old docs/evidence/diagnosis-round6.json] [--json out.json]
// 상승(등급이 좋아짐), 하락(나빠짐), 같은 등급 안에서 지적 코드가 늘거나(신규 결함) 줄어든 조합을 낸다.
import {readFileSync, writeFileSync} from 'node:fs';
import {SEVERE} from './diagnose-meta.mjs';

const [newFile, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf(k); return i > -1 ? rest[i + 1] : null; };
const root = new URL('../../', import.meta.url).pathname;
const oldDoc = JSON.parse(readFileSync(opt('--old') ?? root + 'docs/evidence/diagnosis-round6.json', 'utf8'));
const newDoc = JSON.parse(readFileSync(newFile, 'utf8'));
const norm = e => e === 'A' ? {g: 'A', c: {}} : e.g ? {g: e.g, c: e.c} : {g: e.grade, c: e.codes};
const rank = {A: 0, B: 1, C: 2};
const oldC = Object.fromEntries(Object.entries(oldDoc.combos).map(([k, v]) => [k, norm(v)]));
const newC = Object.fromEntries(Object.entries(newDoc.combos).map(([k, v]) => [k, norm(v)]));
const ids = [...new Set([...Object.keys(oldC), ...Object.keys(newC)])].sort();
const rows = {up: [], down: [], codesAdded: [], codesRemoved: [], countOnly: [], onlyOld: [], onlyNew: []};
const codeTotals = {old: {}, new: {}};
for (const [side, m] of [['old', oldC], ['new', newC]]) for (const e of Object.values(m)) for (const c of Object.keys(e.c)) codeTotals[side][c] = (codeTotals[side][c] ?? 0) + 1;
for (const id of ids) {
  const o = oldC[id], n = newC[id];
  if (!o) { rows.onlyNew.push(id); continue; }
  if (!n) { rows.onlyOld.push(id); continue; }
  const added = Object.keys(n.c).filter(c => !(c in o.c)), removed = Object.keys(o.c).filter(c => !(c in n.c));
  const entry = {id, from: o.g, to: n.g, old: o.c, new: n.c, added, removed};
  if (rank[n.g] < rank[o.g]) rows.up.push(entry);
  else if (rank[n.g] > rank[o.g]) rows.down.push(entry);
  else if (added.length) rows.codesAdded.push(entry);
  else if (removed.length) rows.codesRemoved.push(entry);
  else if (JSON.stringify(o.c) !== JSON.stringify(n.c)) rows.countOnly.push(entry);
}
const dist = m => { const d = {A: 0, B: 0, C: 0}; for (const e of Object.values(m)) d[e.g]++; return d; };
const out = {oldDate: oldDoc.meta?.date, newDate: newDoc.meta?.date, oldDist: dist(oldC), newDist: dist(newC), codeTotals, severe: [...SEVERE], counts: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])), rows};
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({oldDist: out.oldDist, newDist: out.newDist, counts: out.counts}));
