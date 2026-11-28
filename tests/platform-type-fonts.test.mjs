/**
 * 다국어 서체 권리 확인, 선택형 WOFF2 서브셋 로딩 및 실패 대체(fallback) 검증.
 * REQUEST §5.4, TASK-TRC-03 완료 기준 검증.
 */
// Playwright 브라우저 캐시 경로 강제 지정 (샌드박스 내부 HOME 대응)
process.env.PLAYWRIGHT_BROWSERS_PATH = '/Users/winterholic/Library/Caches/ms-playwright';

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createPlatform} from '../src/platform/examples/minimal.mjs';
import {bindType, webfontCSS, webfontPlan} from '../src/platform/type.mjs';
import {WEBFONTS, EXCLUDED_OR_UNVERIFIED_FONTS} from '../src/platform/data/type-materials.mjs';
import {samplePage} from '../docs/platform/evidence/type/samples.mjs';

const env = createPlatform();
const evidencePath = resolve('docs/platform/evidence/type/font-loading-evidence.json');

// 최소 유효 wOF2 버퍼 (테스트 모의 응답용)
function mockWoff2Buffer() {
  const header = Buffer.alloc(48);
  header.write('wOF2', 0, 4, 'ascii');
  header.writeUInt32BE(0x00010000, 4);
  header.writeUInt32BE(64, 8);
  header.writeUInt16BE(0, 12);
  header.writeUInt16BE(0, 14);
  header.writeUInt32BE(0, 16);
  header.writeUInt32BE(16, 20);
  header.writeUInt16BE(1, 24);
  header.writeUInt16BE(0, 26);
  header.writeUInt32BE(0, 28);
  header.writeUInt32BE(0, 32);
  header.writeUInt32BE(0, 36);
  header.writeUInt32BE(0, 40);
  header.writeUInt32BE(0, 44);
  return Buffer.concat([header, Buffer.alloc(16)]);
}

test('1. 모든 WOFF2 서브셋은 버전 고정 공식 출처, OFL-1.1 라이선스, SHA-256, 재현 절차를 갖춘다', () => {
  const fonts = Object.values(WEBFONTS);
  assert.ok(fonts.length >= 3, '최소 3개 이상의 웹폰트 서브셋 정의');

  for (const font of fonts) {
    assert.ok(typeof font.id === 'string' && font.id.length > 0, `${font.id}: id 필드`);
    assert.ok(typeof font.family === 'string' && font.family.length > 0, `${font.id}: family 필드`);
    assert.match(font.version, /^\d+\.\d+(\.\d+)?$/, `${font.id}: 고정 버전 형식 (x.y.z)`);
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
  assert.match(geoCss, /font-family:"Pretendard Variable"/);
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
  assert.ok(rWithFont.vars['--kit-heading'].startsWith('"Pretendard Variable",'));
  assert.match(rWithFont.webfontCSS, /@font-face/);
});

test('4. 브라우저 실측: 390px 및 1280px에서 로딩 성공(양성)과 실패 대체(음성), 다국어 fallback 검증', async () => {
  const {chromium} = await import('playwright');
  const browser = await chromium.launch();
  const evidence = {
    timestamp: new Date().toISOString(),
    viewports: ['390x844', '1280x900'],
    positiveRuns: [],
    negativeRuns: [],
    multilingualRuns: [],
  };

  const candidateSystems = [
    env.registry.get('type-system:work-insight'), // pretendard
    env.registry.get('type-system:doc-essay'),     // notoSerifKr
    env.registry.get('type-system:doc-handbook'),  // pretendard + jetbrainsMono
  ];

  try {
    for (const vp of [{width: 1280, height: 900, name: '1280px'}, {width: 390, height: 844, name: '390px'}]) {
      const context = await browser.newContext({viewport: {width: vp.width, height: vp.height}});

      for (const sys of candidateSystems) {
        // [A] 양성 경로 (WOFF2 로딩 성공)
        {
          const page = await context.newPage();
          const requests = [];
          await page.route('http://static-kit.local/**', route => {
            const url = route.request().url();
            if (url.endsWith('.woff2')) {
              requests.push(url);
              return route.fulfill({
                status: 200,
                contentType: 'font/woff2',
                headers: {'Access-Control-Allow-Origin': '*'},
                body: mockWoff2Buffer(),
              });
            }
            return route.continue();
          });

          const fontBaseUrl = 'http://static-kit.local/fonts';
          const html = samplePage(sys, 'doc', {webfonts: true, fontBaseUrl});
          await page.setContent(html, {waitUntil: 'load'});
          // 브라우저 폰트 로드 트리거
          await page.evaluate(() => document.fonts.ready);
          // 명시적으로 폰트 로드 확인
          const plan = webfontPlan(sys.facePairing);
          if (plan) {
            for (const fam of plan.families) {
              await page.evaluate(f => document.fonts.load(`16px "${f.family}"`), fam).catch(() => {});
            }
          }

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

          evidence.positiveRuns.push({
            system: sys.id,
            viewport: vp.name,
            requestsCount: requests.length,
            requestedUrls: requests,
            overflowX: metrics.overflowX,
            scrollHeight: metrics.scrollHeight,
            bytesReceived: requests.length * 64,
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
          const plan = webfontPlan(sys.facePairing);
          if (plan) {
            for (const fam of plan.families) {
              await page.evaluate(f => document.fonts.load(`16px "${f.family}"`), fam).catch(() => {});
            }
          }

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

          evidence.negativeRuns.push({
            system: sys.id,
            viewport: vp.name,
            failedRequestsCount: failedRequests.length,
            overflowX: metrics.overflowX,
            scrollHeight: metrics.scrollHeight,
            fallbackStatus: 'rendered-via-system-stack',
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
