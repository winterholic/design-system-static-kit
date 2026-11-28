// 호환 정적 산출물(03-interfaces.md 5.2절)을 커밋된 site/에서 public/으로 복사한다.
// 바이트를 만들지 않고 복사만 한다. site/는 루트 verify(check-generated)가 새 빌드와 바이트 동일함을 보증한다.
import {cp, mkdir, rm, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';

const web = resolve(import.meta.dirname, '..');
const site = resolve(web, '../../site');
const out = join(web, 'public');

// /combos/render.html은 ../src/combos/render.mjs를 불러 쓰므로 /src/**를 함께 둔다(옛 앱 제거 때 같이 내린다).
const trees = ['examples', 'v1', 'gallery', 'test-lab', 'src', 'previews', 'catalog-chunks'];
const fontAssets = join(web, 'assets/fonts');

await rm(out, {recursive: true, force: true});
await mkdir(join(out, 'docs'), {recursive: true});
await mkdir(join(out, 'combos'), {recursive: true});
// site/ 의 생성물이 없으면 조용히 넘기지 않는다. 미리보기가 빠진 채 배포되면 목록 카드가 모두 빈 자리가 된다(npm run build 를 먼저 실행한다).
for (const t of trees) await cp(join(site, t), join(out, t), {recursive: true});
for (const f of (await readdir(join(site, 'docs'))).filter(f => f.endsWith('.html'))) await cp(join(site, 'docs', f), join(out, 'docs', f));
await cp(join(site, 'combos/render.html'), join(out, 'combos/render.html'));
for (const single of ['catalog-index.json', 'search-index.json']) await cp(join(site, single), join(out, single));
await cp(fontAssets, join(out, 'fonts'), {recursive: true});
console.log(`SYNCED ${trees.join(', ')}, docs/*.html, combos/render.html, catalog-index.json, fonts → apps/web/public`);
