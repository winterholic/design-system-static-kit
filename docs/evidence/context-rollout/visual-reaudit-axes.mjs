// Lists the axes each default example uses, to attribute shared visual defects to shared axis values.
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root = resolve(import.meta.dirname, '../../..');
const names = readdirSync(resolve(root, 'site/examples')).filter(n => n !== 'themes').sort();
const rows = names.map(n => {const m = JSON.parse(readFileSync(resolve(root, 'site/examples', n, 'manifest.json'), 'utf8')); return {n, theme: m.theme, page: m.pageType, ...m.axes};});
writeFileSync(resolve(import.meta.dirname, 'visual-reaudit/axes.json'), JSON.stringify(rows, null, 1));
const by = k => rows.reduce((o, r) => ((o[r[k]] ??= []).push(r.n), o), {});
console.log('WIDTH', JSON.stringify(by('width')));
console.log('SHELL', Object.entries(by('shell')).map(([k, v]) => k + ':' + v.length).join(' '));
console.log('TERMINAL', JSON.stringify(by('typography').terminal), 'MONO', JSON.stringify(by('typography').mono));
