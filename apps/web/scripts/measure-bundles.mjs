// S3·S5 측정 (03-interfaces.md 3.2절). `npm run build` 뒤에 실행한다.
//  S3: 서버 번들에 UI 모듈(조립기·조합 갤러리)이 들어가지 않았는가
//  S5: 라우트별 초기 JS 크기와 카탈로그 포함 여부
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {join, relative, resolve} from 'node:path';

const web = resolve(import.meta.dirname, '..');
const next = join(web, '.next');
const walk = d => readdirSync(d, {withFileTypes: true}).flatMap(e => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));

// UI 모듈에만 있는 문자열: src/workbench.mjs 의 저장 키, src/combos/app.mjs 의 저장 키·쿼리 키.
const UI_MARKERS = ['winterholic-static-kit.blueprint.v3', 'winterholic-static-kit.combo-flags', 'winterholic-static-kit.combos.device', 'winterholic-static-kit.device'];
const CATALOG_MARKER = 'AXIS_BAN';

const serverFiles = walk(join(next, 'server')).filter(f => /\.(js|mjs|html|rsc|body)$/.test(f));
const s3 = UI_MARKERS.map(m => ({marker: m, files: serverFiles.filter(f => readFileSync(f, 'utf8').includes(m)).map(f => relative(next, f))}));
const compilerInServer = serverFiles.filter(f => readFileSync(f, 'utf8').includes(CATALOG_MARKER)).map(f => relative(next, f));

const routes = walk(join(next, 'server/app')).filter(f => f.endsWith('.html') && !f.includes('_not-found'));
const jsOf = html => [...new Set([...html.matchAll(/\/_next\/static\/[^"' )]+\.js/g)].map(m => m[0]))];
const s5 = routes.map(f => {
  const files = jsOf(readFileSync(f, 'utf8')).map(u => join(next, u.replace('/_next/', '')));
  const bytes = files.reduce((n, p) => n + statSync(p).size, 0);
  const gz = files.reduce((n, p) => n + gzipSync(readFileSync(p)).length, 0);
  const withCatalog = files.filter(p => readFileSync(p, 'utf8').includes(CATALOG_MARKER)).length;
  return {route: '/' + relative(join(next, 'server/app'), f).replace(/\.html$/, '').replace(/^index$/, ''), jsFiles: files.length, bytes, gzip: gz, chunksWithCatalog: withCatalog};
}).sort((a, b) => a.route.localeCompare(b.route));

const lazy = walk(join(next, 'static/chunks')).filter(f => f.endsWith('.js') && readFileSync(f, 'utf8').includes(CATALOG_MARKER))
  .map(f => ({file: relative(next, f), bytes: statSync(f).size, gzip: gzipSync(readFileSync(f)).length}));
const catalogJson = statSync(resolve(web, '../../site/v1/catalog.json')).size;

console.log(JSON.stringify({s3: {uiMarkersInServerBundle: s3, serverFilesContainingCatalogMarker: compilerInServer}, s5: {catalogProjectionBytes: catalogJson, routes: s5, catalogChunks: lazy}}, null, 2));
