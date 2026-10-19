// 모든 모티프를 한 페이지에 펼쳐 그림 품질을 눈으로 점검한다. 산출물은 .qa/motif-lab (gitignore).
// 사용: node scripts/design-qa/motif-lab.mjs [theme] [mode]   예) node scripts/design-qa/motif-lab.mjs trust light
import {compile} from '../../src/compiler.mjs';
import {createBlueprint, motifs} from '../../src/catalog.mjs';
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [template = 'portfolio-grid', mode = 'light', ratio = '4:3'] = process.argv.slice(2);
const b = createBlueprint(template);
b.mode = mode;
b.pageType = 'general';
const chunk = (a, n) => Array.from({length: Math.ceil(a.length / n)}, (_, i) => a.slice(i * n, i * n + n));
const sections = chunk(motifs, 7).map((group, i) => ({type: 'section', title: `모티프 ${i * 7 + 1}–${i * 7 + group.length}`, children: [{type: 'grid', columns: 'three', children: group.map(m => ({type: 'media', kind: 'photo', ratio, alt: m, caption: m, motif: m}))}]}));
b.tree = {type: 'page', children: [{type: 'page-header', title: '모티프 점검'}, ...sections]};
const html = compile(b).html;
const out = resolve(import.meta.dirname, '../../.qa/motif-lab');
await mkdir(out, {recursive: true});
await writeFile(`${out}/index.html`, html);
const br = await chromium.launch();
const p = await br.newPage({viewport: {width: 1280, height: 900}});
await p.goto(pathToFileURL(`${out}/index.html`).href);
await p.screenshot({path: `${out}/lab-${mode}-${ratio.replace(':', 'x')}.png`, fullPage: true});
await br.close();
console.log('lab', `${out}/lab-${mode}-${ratio.replace(':', 'x')}.png`);
