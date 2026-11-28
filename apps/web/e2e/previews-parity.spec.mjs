// 사전 생성 미리보기가 실제로 서비스되는 화면과 같은 문서에서 나왔는지: 운영 서버가 지금 내는 문서(렌더 라우트)를 SVG 로 직렬화한 것이
// 빌드 시점 정적 파일과 바이트까지 같다. 전체 대상에 대해 확인한다(대표 목록이 작아서 수 초면 끝난다).
import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {toPreviewSvg} from '../lib/api/preview-svg.mjs';
import {allPlatformMaterials, caseRequest, purposeRequest, typeRequest} from '../../../scripts/lib/preview-requests.mjs';
import {getPlatformMaterial} from '../../../src/service/index.mjs';
import {PLATFORM_CASES} from '../features/platform/cases.ts';

const site = join(import.meta.dirname, '../../../site');
const previews = JSON.parse(readFileSync(join(site, 'previews/previews-data.json'), 'utf8'));
const staticSvg = key => readFileSync(join(site, 'previews', `${key}.svg`), 'utf8');
const token = request => Buffer.from(JSON.stringify(request)).toString('base64url');
const entries = kind => Object.entries(previews.items).filter(([, v]) => v.kind === kind);

test('Explore 대표 디자인: /explore/<id>/render 가 낸 문서 = 정적 미리보기의 원본', async ({request}) => {
  const items = entries('explore');
  expect(items.length).toBeGreaterThan(80);
  for (const [key, item] of items) {
    const res = await request.get(`/explore/${item.id}/render`);
    expect(res.status(), item.id).toBe(200);
    expect(toPreviewSvg(await res.text(), {width: item.width, height: item.height, title: item.title}) === staticSvg(key), `${item.id}: 서버 문서와 정적 미리보기가 다르다`).toBe(true);
  }
});

test('부품: /components/<type>/render 가 낸 문서 = 정적 미리보기의 원본', async ({request}) => {
  const items = entries('component');
  expect(items.length).toBeGreaterThan(40);
  for (const [key, item] of items) {
    const res = await request.get(`/components/${item.id}/render`);
    expect(res.status(), item.id).toBe(200);
    expect(toPreviewSvg(await res.text(), {width: item.width, height: item.height, title: item.title}) === staticSvg(key), `${item.id}: 서버 문서와 정적 미리보기가 다르다`).toBe(true);
  }
});

test('사례·목적 패밀리·타이포: /platform/render 가 낸 문서 = 정적 미리보기의 원본', async ({request}) => {
  const check = async (key, url) => {
    const item = previews.items[key];
    expect(item, url).toBeTruthy();
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(toPreviewSvg(await res.text(), {width: item.width, height: item.height, title: item.title}) === staticSvg(key), `${item.kind}:${item.id}`).toBe(true);
  };
  const keyOf = id => entries('platform').concat(entries('purpose-family'), entries('type-system')).find(([, v]) => v.ids.includes(id))?.[0];
  for (const k of PLATFORM_CASES) await check(keyOf(`platform:${k.id}`), `/platform/render?r=${token(caseRequest(k))}`);
  for (const [key, item] of entries('purpose-family')) {
    await check(key, `/platform/render?k=components&r=${token(purposeRequest(getPlatformMaterial({id: item.id}).value))}`);
  }
  for (const [key, item] of entries('type-system')) await check(key, `/platform/render?r=${token(typeRequest(item.id))}`);
  expect(allPlatformMaterials('type-system').length).toBeGreaterThan(entries('type-system').length - 1);
});

test('고정 전시용과 사용자 입력 렌더의 Cache-Control 이 다르다', async ({request}) => {
  const [key] = entries('explore')[0];
  const fixed = await request.head(`/previews/${key}.svg`);
  expect(fixed.headers()['cache-control']).toBe('public, max-age=31536000, immutable');

  const custom = {purpose: 'editorial-docs', typeSystem: 'type-system:doc-essay', mode: 'dark', candidates: 1, content: {name: '개인 문서', title: '사용자가 입력한 제목 ' + Date.now()}};
  const url = `/platform/render?r=${token(custom)}`;
  const first = await request.get(url);
  expect(first.status()).toBe(200);
  const cc = first.headers()['cache-control'];
  expect(cc).toBe('private, no-cache');
  expect(cc).not.toMatch(/public|immutable|s-maxage/);
  const etag = first.headers().etag;
  expect(etag).toMatch(/^"[0-9a-f]{32}-standalone-0-1280x800"$/);
  // 같은 입력의 재요청은 304: 다시 컴파일하지 않는다
  const again = await request.get(url, {headers: {'if-none-match': etag}});
  expect(again.status()).toBe(304);
  // 입력이 달라지면 검증값도 달라진다
  const other = await request.get(`/platform/render?r=${token({...custom, content: {...custom.content, title: '다른 제목'}})}`);
  expect(other.headers().etag).not.toBe(etag);
  // 잘못된 part 는 거부한다
  expect((await request.get(`${url}&part=nope`)).status()).toBe(400);
});
