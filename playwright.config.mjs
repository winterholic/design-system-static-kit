import {defineConfig} from '@playwright/test';
// 4173을 다른 프로젝트의 서버가 쓰고 있으면 reuseExistingServer가 엉뚱한 저장소를 시험한다. PW_PORT로 포트를 바꿀 수 있다.
const port = process.env.PW_PORT ?? '4173';
export default defineConfig({testDir:'./e2e',timeout:120000,fullyParallel:false,workers:1,retries:0,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:`http://127.0.0.1:${port}`,viewport:{width:1600,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},webServer:{command:'npm run dev',env:{PORT:port},url:`http://127.0.0.1:${port}`,reuseExistingServer:!process.env.CI},projects:[{name:'chromium',use:{browserName:'chromium'}}]});
