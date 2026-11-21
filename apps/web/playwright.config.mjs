import {defineConfig} from '@playwright/test';

// 4310 은 루트 e2e(4173)와 겹치지 않는 포트다. 다른 프로젝트 서버를 재사용해 엉뚱한 앱을 시험하지 않도록
// 기본은 재사용하지 않는다(이미 쓰는 포트면 실패). 직접 띄운 서버를 쓰려면 WEB_REUSE=1.
// 서버는 `next start`이므로 먼저 `npm run build`가 필요하다.
const port = process.env.WEB_PORT ?? '4310';
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {baseURL: `http://127.0.0.1:${port}`, viewport: {width: 1280, height: 800}, trace: 'retain-on-failure'},
  webServer: {command: `npm run start -- -p ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: process.env.WEB_REUSE === '1'},
  projects: [{name: 'chromium', use: {browserName: 'chromium'}}],
});
