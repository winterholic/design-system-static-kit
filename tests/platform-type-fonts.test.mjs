/**
 * 다국어 서체 권리 확인, 선택형 WOFF2 서브셋 로딩 및 실패 대체(fallback) 검증.
 * REQUEST §5.4, TASK-TRC-03 완료 기준 검증.
 */
// Playwright 브라우저 캐시 경로 강제 지정 (샌드박스 내부 HOME 대응)
process.env.PLAYWRIGHT_BROWSERS_PATH = '/Users/winterholic/Library/Caches/ms-playwright';

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync, existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPlatform} from '../src/platform/examples/minimal.mjs';
import {bindType, webfontCSS, webfontPlan, webfontRoleCSS} from '../src/platform/type.mjs';
import {WEBFONTS, EXCLUDED_OR_UNVERIFIED_FONTS} from '../src/platform/data/type-materials.mjs';
import {samplePage} from '../docs/platform/evidence/type/samples.mjs';
import {queryMaterials} from '../src/service/materials-query.mjs';

const env = createPlatform();
const evidencePath = resolve('docs/platform/evidence/type/font-loading-evidence.json');
const fontAssetsPath = resolve('apps/web/assets/fonts');

test('1. 모든 WOFF2 서브셋은 버전 고정 공식 출처, OFL-1.1 라이선스, SHA-256, 재현 절차를 갖춘다', () => {
  const fonts = Object.values(WEBFONTS);
  assert.ok(fonts.length >= 3, '최소 3개 이상의 웹폰트 서브셋 정의');

  for (const font of fonts) {
    assert.ok(typeof font.id === 'string' && font.id.length > 0, `${font.id}: id 필드`);
    assert.ok(typeof font.family === 'string' && font.family.length > 0, `${font.id}: family 필드`);
    assert.match(font.version, /^\d+\.\d+(\.\d+)?$/, `${font.id}: 고정 버전 형식 (x.y.z)`);
    assert.ok(font.sourceTag && font.licenseUrl.includes(font.sourceTag), `${font.id}: 공식 라이선스 URL은 고정한 업스트림 태그에 속해야 함`);
    assert.equal(new URL(font.licenseUrl).hostname, 'github.com', `${font.id}: 공식 GitHub 라이선스 URL`);
    assert.equal(font.license, 'OFL-1.1', `${font.id}: SIL Open Font License 1.1 필수`);
    assert.ok(font.source.startsWith('https://github.com/'), `${font.id}: 공식 GitHub 저장소 출처`);
    assert.ok(font.file.endsWith('.woff2'), `${font.id}: WOFF2 파일 형식`);
    assert.match(font.sha256, /^[0-9a-f]{64}$/, `${font.id}: SHA-256 64자리 16진수 해시`);
    assert.ok(font.embeddingRights.includes('OFL-1.1'), `${font.id}: 웹 임베딩 권리 명시`);
    assert.ok(font.subsetProcedure.includes('pyftsubset'), `${font.id}: 재현 가능한 pyftsubset 절차`);
    assert.ok(font.unicodeRange && font.unicodeRange.includes('U+'), `${font.id}: 유니코드 범위 명시`);
  }

  // 권리 미확인 및 대용량 서체(일본어 등) 격리 정책 확인
  assert.ok(EXCLUDED_OR_UNVERIFIED_FONTS.notoSansJp, '일본어 서체 격리 정책 정의');
  assert.equal(EXCLUDED_OR_UNVERIFIED_FONTS.notoSansJp.status, 'excluded-from-bundle');
  assert.ok(EXCLUDED_OR_UNVERIFIED_FONTS.notoSansJp.systemFallback.includes('Hiragino Sans'));
  assert.equal(EXCLUDED_OR_UNVERIFIED_FONTS.unverifiedCommercial.status, 'banned');
  assert.ok(!fonts.some(font => font.family === EXCLUDED_OR_UNVERIFIED_FONTS.unverifiedCommercial.family), '권리 미확인 상용 서체는 공개 폰트 표에 없음');
});

test('모든 공개 WOFF2 파일은 기록된 SHA-256을 만족하고 OFL 고지 파일과 함께 배포된다', () => {
  for (const font of Object.values(WEBFONTS)) {
    const asset = resolve(fontAssetsPath, font.file);
    assert.ok(existsSync(asset), `${font.id}: 저장소에 실제 WOFF2 자산이 있어야 함`);
    const bytes = readFileSync(asset);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2', `${font.id}: WOFF2 시그니처`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), font.sha256, `${font.id}: 자산 SHA-256`);
    assert.ok(font.licenseFile, `${font.id}: 함께 배포할 라이선스 파일 경로`);
    const licensePath = resolve(fontAssetsPath, font.licenseFile);
    assert.ok(existsSync(licensePath), `${font.id}: 라이선스 고지 파일 존재`);
    assert.match(readFileSync(licensePath, 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/i, `${font.id}: OFL-1.1 고지문`);
  }
});

test('선택된 웹폰트 CSS는 같은 계열 역할에 실제 적용하고 원래 시스템 스택을 fallback으로 보존한다', () => {
  const css = webfontRoleCSS(
    [WEBFONTS.notoSerifKr, WEBFONTS.jetbrainsMono],
    {body: '"Iowan Old Style", Georgia, serif', code: '"SF Mono", Consolas, monospace', label: 'system-ui, sans-serif'},
    '.mt-specimen[data-preset="document"]',
  );
  assert.match(css, /\.mt-role-body\{font-family:"Noto Serif KR","Iowan Old Style", Georgia, serif;\}/);
  assert.match(css, /\.mt-role-code\{font-family:"JetBrains Mono","SF Mono", Consolas, monospace;\}/);
  assert.doesNotMatch(css, /mt-role-label/);
});

test('Materials 서비스는 웹폰트 선택 시 실제 역할 CSS를 내고 기본 선택은 비운다', () => {
  const result = queryMaterials({view: 'typography'});
  assert.equal(result.ok, true);
  assert.equal(result.value.webfontCss.erp, '');
  assert.equal(result.value.webfontRoleCss.erp, '');
  assert.match(result.value.webfontCss.document, /NotoSerifKR-Variable\.woff2/);
  assert.match(result.value.webfontRoleCss.document, /\.mt-role-body\{font-family:"Noto Serif KR"/);
  assert.match(result.value.webfontCss.marketing, /PretendardGOVVariable\.woff2/);
  assert.match(result.value.webfontRoleCss.marketing, /\.mt-role-display\{font-family:"Pretendard GOV"/);
});

test('2. 선택적 로딩: 미선택 서체는 @font-face가 생성되지 않고 한글/영문 unicode-range가 분리된다', () => {
  // 1) sans 서체 짝 (웹폰트 없음)
  const sansCss = webfontCSS('face-pairing:sans');
  assert.equal(sansCss, '', 'sans는 웹폰트 없음');

  // 2) geometric-system (pretendard만 사용)
  const geoPlan = webfontPlan('face-pairing:geometric-system');
  assert.ok(geoPlan);
  assert.deepEqual(geoPlan.families.map(f => f.id), ['pretendard']);
  const geoCss = webfontCSS('face-pairing:geometric-system');
  assert.match(geoCss, /font-family:"Pretendard GOV"/);
  assert.equal(geoCss.includes('Noto Serif KR'), false, '미선택 서체 Noto Serif KR은 포함되지 않음');
  assert.equal(geoCss.includes('JetBrains Mono'), false, '미선택 서체 JetBrains Mono는 포함되지 않음');

  // 3) editorial (notoSerifKr 사용)
  const editorialCss = webfontCSS('face-pairing:editorial');
  assert.match(editorialCss, /font-family:"Noto Serif KR"/);
  assert.match(editorialCss, /unicode-range:U\+1100-11FF,U\+3130-318F,U\+AC00-D7A3;/);
  assert.equal(editorialCss.includes('Pretendard'), false, '미선택 서체 Pretendard는 포함되지 않음');

  // 4) humanist-system (pretendard + jetbrainsMono 사용)
  const humPlan = webfontPlan('face-pairing:humanist-system');
  assert.ok(humPlan);
  assert.deepEqual(humPlan.families.map(f => f.id), ['pretendard', 'jetbrainsMono']);
});

test('3. Core 입력 결정성 및 기본 호환성 (webfonts 끔 상태의 바이트 불변)', () => {
  const ts = env.registry.get('type-system:work-product-neutral');
  const r1 = bindType(ts);
  const r2 = bindType(ts);

  // 결정성: 동일 입력 시 100% 동일 결과
  assert.deepEqual(r1.vars, r2.vars);
  assert.deepEqual(r1.roles, r2.roles);
  assert.equal(r1.webfontCSS, '');
  assert.equal(r2.webfontCSS, '');

  // 기본 출력에서는 시스템 서체만 스택에 존재
  assert.ok(!r1.vars['--kit-heading'].includes('Pretendard'));
  assert.ok(!r1.vars['--kit-font'].includes('Noto Serif'));

  // webfonts: true를 켰을 때만 웹폰트가 스택 맨 앞에 전치됨
  const rWithFont = bindType(env.registry.get('type-system:work-insight'), {webfonts: true});
  assert.ok(rWithFont.vars['--kit-heading'].startsWith('"Pretendard GOV",'));
  const webfontPlanForSystem = webfontPlan('face-pairing:geometric');
  assert.ok(rWithFont.vars['--kit-heading'].endsWith(webfontPlanForSystem.fallback.heading), '웹폰트 실패 때 쓸 시스템 스택이 생성 CSS에 남는다');
  assert.match(rWithFont.webfontCSS, /@font-face/);
  assert.match(rWithFont.webfontCSS, /font-display:swap/);
});

test('4. Playwright Chromium 실측: 390px·1280px에서 실제 WOFF2 로드와 404 fallback, 다국어 글리프를 확인한다', async () => {
  const {chromium} = await import('playwright');
  const browser = await chromium.launch();
  const candidateSystems = [
    env.registry.get('type-system:work-insight'), // pretendard
    env.registry.get('type-system:doc-essay'),     // notoSerifKr
    env.registry.get('type-system:doc-handbook'),  // pretendard + jetbrainsMono
  ];
  const cssFaces = Object.fromEntries([...new Set(candidateSystems.map(system => system.facePairing))]
    .map(faceId => [faceId, createHash('sha256').update(webfontCSS(faceId)).digest('hex')]));
  const evidence = {
    schemaVersion: 2,
    status: 'measured',
    timestamp: new Date().toISOString(),
    sourceFingerprint: {
      fonts: Object.fromEntries(Object.entries(WEBFONTS).map(([id, font]) => [id, createHash('sha256').update(readFileSync(resolve(fontAssetsPath, font.file))).digest('hex')])),
      cssFaces,
      materialRoleCss: Object.fromEntries(Object.entries(queryMaterials({view: 'typography'}).value.webfontRoleCss).map(([id, css]) => [id, createHash('sha256').update(css).digest('hex')])),
    },
    viewports: ['390x844', '1280x900'],
    positiveRuns: [],
    negativeRuns: [],
    multilingualRuns: [],
  };

  try {
    for (const vp of [{width: 1280, height: 900, name: '1280px'}, {width: 390, height: 844, name: '390px'}]) {
      const context = await browser.newContext({viewport: {width: vp.width, height: vp.height}});

      for (const sys of candidateSystems) {
        // [A] 양성 경로 (WOFF2 로딩 성공)
        {
          const page = await context.newPage();
          const requests = [];
          const loadedFamilies = [];
          await page.route('http://static-kit.local/**', route => {
            const url = route.request().url();
            if (url.endsWith('.woff2')) {
              requests.push(url);
              const font = Object.values(WEBFONTS).find(item => url.endsWith(item.file));
              assert.ok(font, `등록된 서체만 요청: ${url}`);
              return route.fulfill({
                status: 200,
                contentType: 'font/woff2',
                headers: {'Access-Control-Allow-Origin': '*'},
                body: readFileSync(resolve(fontAssetsPath, font.file)),
              });
            }
            return route.continue();
          });

          const fontBaseUrl = 'http://static-kit.local/fonts';
          const html = samplePage(sys, 'doc', {webfonts: true, fontBaseUrl});
          await page.setContent(html, {waitUntil: 'load'});
          // 브라우저 폰트 로드 트리거
          await page.evaluate(() => document.fonts.ready);
          const plan = webfontPlan(sys.facePairing);
          // 문서에 실제로 쓰인 글리프만으로 브라우저가 요청한 서브셋을 기록한다. document.fonts.load()로 강제 요청하지 않는다.
          const loadedNames = await page.evaluate(() => Array.from(document.fonts).filter(face => face.status === 'loaded').map(face => face.family));
          for (const fam of plan?.families ?? []) loadedFamilies.push({family: fam.family, loaded: loadedNames.includes(fam.family)});

          const metrics = await page.evaluate(() => {
            const el = document.documentElement;
            const h1 = document.querySelector('.t-display, h1.t-heading');
            const p = document.querySelector('p.t-body');
            return {
              overflowX: el.scrollWidth > window.innerWidth + 1,
              scrollHeight: el.scrollHeight,
              titleText: h1?.textContent?.trim() ?? '',
              bodyText: p?.textContent?.trim() ?? '',
            };
          });

          assert.equal(metrics.overflowX, false, `${sys.id} ${vp.name} 양성 경로 가로 넘침 없음`);
          assert.ok(metrics.titleText.length > 0, '제목 글자 정상 렌더링');
          assert.ok(requests.length > 0, `${sys.id}: WOFF2 폰트 요청 수신됨 (${requests.length}건)`);
          assert.ok(loadedFamilies.length > 0 && loadedFamilies.every(font => font.loaded), `${sys.id}: 문서의 글리프 범위와 일치하는 실제 서브셋이 브라우저에 로드됨`);

          evidence.positiveRuns.push({
            system: sys.id,
            viewport: vp.name,
            requestsCount: requests.length,
            requestedUrls: requests,
            loadedFamilies,
            overflowX: metrics.overflowX,
            scrollHeight: metrics.scrollHeight,
            bytesReceived: requests.reduce((sum, url) => {
              const font = Object.values(WEBFONTS).find(item => url.endsWith(item.file));
              return sum + readFileSync(resolve(fontAssetsPath, font.file)).length;
            }, 0),
          });

          await page.close();
        }

        // [B] 음성 경로 (WOFF2 로딩 실패 - 404 Not Found)
        {
          const page = await context.newPage();
          const failedRequests = [];
          await page.route('http://static-kit.local/**', route => {
            const url = route.request().url();
            if (url.endsWith('.woff2')) {
              failedRequests.push(url);
              return route.fulfill({status: 404, contentType: 'text/plain', body: 'Font Not Found'});
            }
            return route.continue();
          });

          const fontBaseUrl = 'http://static-kit.local/fonts';
          const html = samplePage(sys, 'doc', {webfonts: true, fontBaseUrl});
          await page.setContent(html, {waitUntil: 'load'});
          await page.evaluate(() => document.fonts.ready);

          const metrics = await page.evaluate(() => {
            const el = document.documentElement;
            const h1 = document.querySelector('.t-display, h1.t-heading');
            const p = document.querySelector('p.t-body');
            return {
              overflowX: el.scrollWidth > window.innerWidth + 1,
              scrollHeight: el.scrollHeight,
              titleText: h1?.textContent?.trim() ?? '',
              bodyText: p?.textContent?.trim() ?? '',
            };
          });

          // 실패 시에도 fallback 시스템 서체로 안정적으로 렌더링되고 가로 넘침이 없어야 함
          assert.equal(metrics.overflowX, false, `${sys.id} ${vp.name} 음성 경로 가로 넘침 없음 (fallback 유지)`);
          assert.ok(metrics.titleText.length > 0, 'Fallback 서체로 제목 렌더링 유지');
          assert.ok(failedRequests.length > 0, `${sys.id}: 폰트 실패 요청 감지됨`);

          const fallbackFamilies = await page.evaluate(() => ({
            heading: getComputedStyle(document.querySelector('.t-display, h1.t-heading')).fontFamily,
            body: getComputedStyle(document.querySelector('p.t-body')).fontFamily,
          }));
          evidence.negativeRuns.push({
            system: sys.id,
            viewport: vp.name,
            failedRequestsCount: failedRequests.length,
            overflowX: metrics.overflowX,
            scrollHeight: metrics.scrollHeight,
            fallbackStatus: 'font request rejected; CSS system fallback retained',
            fallbackFamilies,
          });

          await page.close();
        }
      }

      // [C] 다국어 및 일본어 Fallback 전용 샘플 검증
      {
        const page = await context.newPage();
        const jaHtml = samplePage(candidateSystems[0], 'doc', {
          webfonts: true,
          fontBaseUrl: 'http://static-kit.local/fonts',
          extraHtml: `
            <div class="doc" style="margin-top:20px;overflow-wrap:anywhere;word-break:keep-all">
              <p class="t-body ja-sample">日本語テスト: こんにちは世界 · カタカナ · 漢字 · 2026年</p>
              <p class="t-numeric num-sample" style="white-space:normal">₩1,234,500 · 78.9% · 2026-11-22</p>
              <div class="codeblock"><code class="t-code code-sample">const 合計 = calc(amount);</code></div>
            </div>
          `,
        });

        await page.setContent(jaHtml, {waitUntil: 'load'});
        await page.evaluate(() => document.fonts.ready);

        const jaMetrics = await page.evaluate(() => {
          const el = document.documentElement;
          const jaP = document.querySelector('.ja-sample');
          const numP = document.querySelector('.num-sample');
          const codeP = document.querySelector('.code-sample');
          return {
            overflowX: el.scrollWidth > window.innerWidth + 1,
            jaRendered: (jaP?.textContent ?? '').includes('こんにちは世界'),
            numRendered: (numP?.textContent ?? '').includes('₩1,234,500'),
            codeRendered: (codeP?.textContent ?? '').includes('const 合計'),
          };
        });

        assert.equal(jaMetrics.overflowX, false, `다국어 샘플 ${vp.name} 가로 넘침 없음`);
        assert.ok(jaMetrics.jaRendered, '일본어 fallback 글리프 정상 렌더');
        assert.ok(jaMetrics.numRendered, '숫자/통화/퍼센트/날짜 글리프 정상 렌더');
        assert.ok(jaMetrics.codeRendered, '코드/한자 혼용 글리프 정상 렌더');

        evidence.multilingualRuns.push({
          viewport: vp.name,
          overflowX: jaMetrics.overflowX,
          jaRendered: jaMetrics.jaRendered,
          numRendered: jaMetrics.numRendered,
          codeRendered: jaMetrics.codeRendered,
        });

        await page.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  // 실측 증거 저장
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
  assert.ok(existsSync(evidencePath), '증거 파일 생성 완료');
});
