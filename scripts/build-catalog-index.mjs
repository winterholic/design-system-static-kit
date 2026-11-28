#!/usr/bin/env node
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {
  listCatalog,
  getComponentSpec,
  getMaterial,
  listPlatformMaterials,
  getPlatformMaterial,
  assembleDesign,
  assembleComponents,
  compileBlueprint,
} from '../src/service/index.mjs';
import {createBlueprint, templateList} from '../src/catalog.mjs';
import {resetDocument, insertNode} from '../src/edit/index.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? join(root, 'site'));

const FIXED_DATE = '2026-11-28T00:00:00.000Z';
const COMPILER_VERSION = '2.0.0';
const CATALOG_VERSION = '2.6.0';

function escapeXml(str) {
  return String(str).replace(/[<>&"]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'}[c] || c));
}

function toSvg({html, css, width = 1280, height = 800, title = 'preview'}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(title)}">
  <foreignObject width="${width}" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;min-height:${height}px;margin:0;padding:0;overflow:hidden;box-sizing:border-box;">
      <style>${css ?? ''}</style>
      ${html}
    </div>
  </foreignObject>
</svg>`;
}

const sha256 = text => createHash('sha256').update(text).digest('hex');

// 1. Directories
const previewsDir = join(out, 'previews');
const explorePreviewsDir = join(previewsDir, 'explore');
const compPreviewsDir = join(previewsDir, 'components');
const platformPreviewsDir = join(previewsDir, 'platform');
const purposePreviewsDir = join(previewsDir, 'purpose');
const typePreviewsDir = join(previewsDir, 'typography');
const chunksDir = join(out, 'catalog-chunks');

await mkdir(explorePreviewsDir, {recursive: true});
await mkdir(compPreviewsDir, {recursive: true});
await mkdir(platformPreviewsDir, {recursive: true});
await mkdir(purposePreviewsDir, {recursive: true});
await mkdir(typePreviewsDir, {recursive: true});
await mkdir(chunksDir, {recursive: true});

const previewItems = {};

// 2. Explore Previews
console.log('Generating Explore representative previews...');
for (const t of templateList) {
  const made = resetDocument(null, {template: t.id});
  if (!made.ok) continue;
  const compiled = compileBlueprint(made.doc, {include: ['html', 'css']});
  if (!compiled.ok) continue;

  const html = compiled.value.html;
  const css = compiled.value.css;
  const svg = toSvg({html, css, width: 1280, height: 800, title: `${t.label} 미리보기`});

  await writeFile(join(explorePreviewsDir, `${t.id}.html`), html);
  await writeFile(join(explorePreviewsDir, `${t.id}.svg`), svg);

  previewItems[`explore:${t.id}`] = {
    id: t.id,
    kind: 'explore',
    path: `/previews/explore/${t.id}.svg`,
    htmlPath: `/previews/explore/${t.id}.html`,
    title: `${t.label} 미리보기`,
    width: 1280,
    height: 800,
    hash: sha256(html).slice(0, 32),
    ok: true,
  };
}

// 3. Components Previews
console.log('Generating Components representative previews...');
const compRowsRes = listCatalog({kind: 'components', filter: {catalogVersion: CATALOG_VERSION}, limit: 200});
const compRows = compRowsRes.ok ? compRowsRes.value.items : [];

const BASE = {template: 'about-team', theme: 'workspace'};
function isolatedDoc(type, example) {
  const made = resetDocument(null, BASE);
  if (!made.ok) return null;
  let doc = made.doc;
  const at = type === 'hero' ? 1 : doc.tree.children.length;
  const ins = insertNode(doc, {parent: [], node: example, index: at});
  return ins.ok ? ins.doc : null;
}

for (const r of compRows) {
  if (r.type === 'page') continue;
  const specRes = getComponentSpec({type: r.type, ...(r.since ? {catalogVersion: r.since} : {})});
  if (!specRes.ok) continue;
  const spec = specRes.value;
  if (!spec.example) continue;

  const doc = isolatedDoc(r.type, spec.example);
  if (!doc) continue;

  const compiled = compileBlueprint(doc, {include: ['html', 'css', 'standalone']});
  if (!compiled.ok) continue;

  const html = compiled.value.html;
  const css = compiled.value.css;
  const svg = toSvg({html, css, width: 1280, height: 800, title: `${r.label} 렌더 결과`});

  await writeFile(join(compPreviewsDir, `${r.type}.html`), html);
  await writeFile(join(compPreviewsDir, `${r.type}.svg`), svg);

  previewItems[`component:${r.type}`] = {
    id: r.type,
    kind: 'component',
    path: `/previews/components/${r.type}.svg`,
    htmlPath: `/previews/components/${r.type}.html`,
    title: `${r.label} 렌더 결과`,
    width: 1280,
    height: 800,
    hash: sha256(html).slice(0, 32),
    ok: true,
  };
}

// 4. Platform Cases Previews
console.log('Generating Platform Cases previews...');
const PLATFORM_CASES = [
  {id: 'saas-ocean', title: '차분한 SaaS 소개', purpose: 'saas-landing', palette: 'ocean-cool', set: 'standard', type: 'mkt-launch', family: 'soft'},
  {id: 'saas-dusk', title: '어두운 프리미엄 SaaS', purpose: 'saas-landing', palette: 'dusk-violet', set: 'premium-dark', type: 'mkt-brand', family: null},
  {id: 'dash-forest', title: '데이터 밀도가 높은 운영 화면', purpose: 'work-dashboard', palette: 'forest-green', set: 'data-dense', type: 'work-console', family: null},
  {id: 'dash-slate', title: '고대비 업무 화면', purpose: 'work-dashboard', palette: 'slate-neutral', set: 'high-contrast', type: 'tech-erp', family: null},
  {id: 'editorial-clay', title: '따뜻한 에디토리얼', purpose: 'editorial-docs', palette: 'clay-earth', set: 'editorial-warm', type: 'doc-essay', family: null},
  {id: 'commerce-vivid', title: '선명한 커머스', purpose: 'commerce', palette: 'magenta-vivid', set: 'commerce-vivid', type: 'shop-catalog', family: 'bold'},
];

for (const k of PLATFORM_CASES) {
  const req = {
    purpose: k.purpose,
    palette: `palette:${k.palette}`,
    subtokenSet: `subtoken-set:${k.set}`,
    typeSystem: `type-system:${k.type}`,
    ...(k.family ? {families: [`family:${k.family}`]} : {}),
    candidates: 1,
  };
  const res = assembleDesign(req, {include: ['html', 'css', 'standalone']});
  if (!res.ok || !res.value.candidates[0]) continue;

  const candidate = res.value.candidates[0].value;
  const html = candidate.html;
  const css = candidate.css;
  const svg = toSvg({html, css, width: 1280, height: 800, title: `${k.title} 미리보기`});

  await writeFile(join(platformPreviewsDir, `${k.id}.html`), candidate.standalone ?? html);
  await writeFile(join(platformPreviewsDir, `${k.id}.svg`), svg);

  previewItems[`platform:${k.id}`] = {
    id: k.id,
    kind: 'platform',
    path: `/previews/platform/${k.id}.svg`,
    htmlPath: `/previews/platform/${k.id}.html`,
    title: `${k.title} 미리보기`,
    width: 1280,
    height: 800,
    hash: sha256(html).slice(0, 32),
    ok: true,
  };
}

// 5. Purpose Families Previews
console.log('Generating Purpose Families previews...');
const purposeListRes = listPlatformMaterials({kind: 'purpose-family', limit: 200});
const purposeRows = purposeListRes.ok ? purposeListRes.value.items : [];

for (const row of purposeRows) {
  const detailRes = getPlatformMaterial({id: row.id});
  if (!detailRes.ok) continue;
  const f = detailRes.value;
  const req = {
    context: f.contexts[0] === 'any' ? 'general' : f.contexts[0],
    mode: 'light',
    items: [{purpose: f.id, visual: 'family:soft', variant: f.example.variant, props: f.example.props, content: f.example.content}],
  };
  const res = assembleComponents(req);
  if (!res.ok) continue;

  const html = res.value.html;
  const css = res.value.css;
  const shortId = f.id.replace('purpose-family:', '').replace(/\./g, '-');
  const svg = toSvg({html, css, width: 480, height: 360, title: `${f.label} 미리보기`});

  await writeFile(join(purposePreviewsDir, `${shortId}.html`), res.value.standalone ?? html);
  await writeFile(join(purposePreviewsDir, `${shortId}.svg`), svg);

  previewItems[`purpose:${f.id}`] = {
    id: f.id,
    kind: 'purpose-family',
    path: `/previews/purpose/${shortId}.svg`,
    htmlPath: `/previews/purpose/${shortId}.html`,
    title: `${f.label} 미리보기`,
    width: 480,
    height: 360,
    hash: sha256(html).slice(0, 32),
    ok: true,
  };
}

// 6. Typography Comparisons Previews
console.log('Generating Typography previews...');
const typeRes = listPlatformMaterials({kind: 'type-system', limit: 200});
const typeRows = typeRes.ok ? typeRes.value.items : [];
const DOC_SAMPLE = {
  name: 'Static Kit Docs',
  title: '시작하기 Getting Started',
  lead: '한글과 English가 섞인 문장에서 숫자 1,234.56과 코드 npm run kit 이 어떻게 읽히는지 확인합니다.',
  sections: [
    {title: '설치 Install', body: '저장소를 내려받고 npm ci 를 실행합니다. 버전은 v2.6.0 이상이어야 하며, 설정 파일은 kit.config.json 입니다.'},
    {title: '첫 화면 만들기', body: 'Blueprint 를 검증한 뒤 build 하면 index.html 과 tokens.css 가 만들어집니다.'},
    {title: '다음 단계 Next steps', body: '팔레트와 타이포 시스템을 바꿔 보고, 마음에 드는 조합을 코드로 내려받으세요.'},
  ],
};

for (const t of typeRows) {
  const req = {purpose: 'editorial-docs', content: DOC_SAMPLE, typeSystem: t.id, mode: 'light', candidates: 1};
  const res = assembleDesign(req, {include: ['html', 'css', 'standalone']});
  if (!res.ok || !res.value.candidates[0]) continue;

  const candidate = res.value.candidates[0].value;
  const html = candidate.html;
  const css = candidate.css;
  const shortId = t.id.replace('type-system:', '');
  const svg = toSvg({html, css, width: 1280, height: 800, title: `${t.label} 문서 샘플 데스크톱`});

  await writeFile(join(typePreviewsDir, `${shortId}.html`), candidate.standalone ?? html);
  await writeFile(join(typePreviewsDir, `${shortId}.svg`), svg);

  previewItems[`type:${shortId}`] = {
    id: t.id,
    kind: 'type-system',
    path: `/previews/typography/${shortId}.svg`,
    htmlPath: `/previews/typography/${shortId}.html`,
    title: `${t.label} 문서 샘플`,
    width: 1280,
    height: 800,
    hash: sha256(html).slice(0, 32),
    ok: true,
  };
}

// Write previews-data.json
await writeFile(
  join(previewsDir, 'previews-data.json'),
  JSON.stringify({
    generatedAt: FIXED_DATE,
    compilerVersion: COMPILER_VERSION,
    catalogVersion: CATALOG_VERSION,
    totalPreviews: Object.keys(previewItems).length,
    items: previewItems,
  }, null, 2) + '\n'
);

// 7. Light Catalog Index & Chunks
console.log('Generating LightCatalogIndex and category chunks...');
const GROUP_LABEL = {
  structure: '페이지 구조',
  layout: '배치',
  content: '내용',
  data: '데이터',
  form: '입력',
  feedback: '상태·피드백',
  media: '미디어',
  nav: '탐색',
  palette: '팔레트',
  'subtoken-set': '서브토큰 세트',
  'type-system': '타이포 시스템',
  family: '시각 패밀리',
  'purpose-family': '목적 패밀리',
};

const lightMaterials = [];
const categoriesMap = new Map();

for (const r of compRows) {
  if (r.type === 'page') continue;
  const cat = r.group;
  categoriesMap.set(cat, (categoriesMap.get(cat) ?? 0) + 1);

  const matRes = getMaterial({id: `component:${r.type}`});
  const mat = matRes.ok ? matRes.value : null;

  lightMaterials.push({
    id: `component:${r.type}`,
    kind: 'component',
    category: cat,
    label: r.label,
    contexts: mat?.contexts ?? ['general'],
    tags: mat?.tags ?? [],
    previewUrl: `/previews/components/${r.type}.svg`,
    variantsCount: mat?.variants ? Object.keys(mat.variants).length : 0,
    statesCount: mat?.states?.values ? mat.states.values.length : 0,
    qualityStatus: mat?.quality?.status === 'verified' ? 'verified' : 'implemented',
    license: 'internal',
  });
}

// Also add platform materials to catalog index
for (const p of purposeRows) {
  const cat = 'purpose-family';
  categoriesMap.set(cat, (categoriesMap.get(cat) ?? 0) + 1);
  const shortId = p.id.replace('purpose-family:', '').replace(/\./g, '-');
  lightMaterials.push({
    id: p.id,
    kind: 'purpose-family',
    category: cat,
    label: p.label,
    contexts: ['components'],
    tags: ['platform', 'purpose'],
    previewUrl: `/previews/purpose/${shortId}.svg`,
    variantsCount: 1,
    statesCount: 0,
    qualityStatus: 'implemented',
    license: 'internal',
  });
}

const categories = Array.from(categoriesMap.entries()).map(([id, itemCount]) => ({
  id,
  label: GROUP_LABEL[id] ?? id,
  itemCount,
}));

const catalogIndex = {
  schemaVersion: 'catalog-index/1.0',
  catalogVersion: CATALOG_VERSION,
  generatedAt: FIXED_DATE,
  categories,
  materials: lightMaterials,
};

await writeFile(join(out, 'catalog-index.json'), JSON.stringify(catalogIndex, null, 2) + '\n');

// Category chunks
for (const cat of categories) {
  const chunk = {
    schemaVersion: 'catalog-index/1.0',
    category: cat.id,
    label: cat.label,
    itemCount: cat.itemCount,
    materials: lightMaterials.filter(m => m.category === cat.id),
  };
  await writeFile(join(chunksDir, `${cat.id}.json`), JSON.stringify(chunk, null, 2) + '\n');
}

// Search index
const searchIndex = lightMaterials.map(m => ({
  id: m.id,
  label: m.label,
  kind: m.kind,
  category: m.category,
  tags: m.tags,
  previewUrl: m.previewUrl,
  url: m.kind === 'component' ? `/components/${m.id.replace('component:', '')}` : `/components`,
}));
await writeFile(join(out, 'search-index.json'), JSON.stringify(searchIndex, null, 2) + '\n');

console.log(`Generated ${Object.keys(previewItems).length} previews, catalog-index.json (${lightMaterials.length} materials) → ${out}`);
