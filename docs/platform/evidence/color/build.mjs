#!/usr/bin/env node
/**
 * W1 색 증거 생성기.
 *   node docs/platform/evidence/color/build.mjs            판정표를 docs/platform/color.md에 쓰고, 미리보기 HTML과 스크린샷을 만든다
 *   node docs/platform/evidence/color/build.mjs --no-shot  HTML과 표만 쓴다(브라우저 없이)
 *
 * 미리보기는 대표 조합 하나(팔레트 sunrise-warm)를 세트 4개(editorial-warm, commerce-vivid, premium-dark, high-contrast)에 같은 카드·버튼으로 칠한다.
 * 색은 bindColor가 낸 렌더 변수 그대로이고, 카드와 버튼은 기존 2.6.0 컨트롤(src/materials/card.mjs, button.mjs)의 렌더러와 CSS를 쓴다.
 * 보조 버튼(.pv-secondary)과 차트 띠(.pv-strip)만 미리보기용 마크업이다: 보조 액션·차트 색 역할을 읽는 부품이 아직 없기 때문이다.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {dirname, resolve} from 'node:path';
import {createPlatform} from '../../../../src/platform/index.mjs';
import {bindColor} from '../../../../src/platform/color.mjs';
import {bindType} from '../../../../src/platform/type.mjs';
import {spaceVars} from '../../../../src/spacing.mjs';
import {renderCard, cardStyles} from '../../../../src/materials/card.mjs';
import {renderButton, buttonStyles} from '../../../../src/materials/button.mjs';
import {matrixMarkdown, previewMetricsMarkdown, BEGIN, END, METRICS_BEGIN, METRICS_END} from './matrix.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '../../../..');
export const PREVIEW = {palette: 'palette:sunrise-warm', sets: ['subtoken-set:editorial-warm', 'subtoken-set:commerce-vivid', 'subtoken-set:premium-dark', 'subtoken-set:high-contrast']};

const env = createPlatform();
const type = bindType(env.registry.get('type-system:tech-erp'));
const spacing = Object.fromEntries(spaceVars('comfortable').split(';').map(d => d.split(':')));
const decl = vars => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
const short = id => id.slice(id.indexOf(':') + 1);

const strip = (vars, prefix, n) => `<div class="pv-strip">${Array.from({length: n}, (_, i) => `<i style="background:var(${prefix}${i + 1})"></i>`).join('')}</div>`;
function panel(setId, mode) {
  const palette = env.registry.get(PREVIEW.palette), set = env.registry.get(setId), color = bindColor(palette, set, mode);
  if (!color.ok) throw new Error(color.error.message);
  const key = `${short(setId)}-${mode}`;
  const btn = (label, extra = {}) => renderButton({label, size: 'medium', ...extra});
  const html = `<section class="pv" data-pv="${key}" data-mode="${mode}">
  <header class="pv-head"><b>${set.label}</b><span>${short(setId)} · ${mode}</span></header>
  ${renderCard({id: `card-${key}`, title: '분기 보고서', meta: '2026-11 · 재무팀', body: '지난달보다 12% 늘었습니다. 검토 대기 3건이 남았습니다.', mediaIcon: 'book'})}
  <div class="pv-row">${btn('저장')}${btn('hover', {force: 'hover'})}${btn('active', {force: 'active'})}${btn('focus', {force: 'focus'})}${btn('비활성', {state: 'disabled'})}</div>
  <div class="pv-row"><button class="pv-secondary" type="button">보조 동작</button>${btn('취소', {appearance: 'outline', tone: 'neutral'})}${btn('삭제', {appearance: 'soft', tone: 'danger'})}<a class="pv-link" href="#x">링크 텍스트</a></div>
  <div class="pv-row pv-status"><span style="color:var(--kit-success)">성공</span><span style="color:var(--kit-warning)">주의</span><span style="color:var(--kit-danger)">오류</span><span style="color:var(--kit-info)">정보</span><span style="color:var(--kit-muted)">보조 텍스트</span></div>
  <label class="pv-input"><span>입력</span><input value="입력 값" aria-label="입력"></label>
  <div class="pv-charts"><small>범주형</small>${strip(color.vars, '--kit-chart', 6)}<small>순차</small>${strip(color.vars, '--kit-seq', 7)}<small>발산</small>${strip(color.vars, '--kit-div', 7)}</div>
</section>`;
  const css = `[data-pv="${key}"]{${decl({...color.vars, ...type.vars, ...spacing, '--kit-shade': 'color-mix(in srgb,var(--kit-text) 14%,transparent)'})};background:var(--kit-canvas);color:var(--kit-text)}`;
  return {html, css};
}

export function previewHTML(modes) {
  const panels = PREVIEW.sets.flatMap(s => modes.map(m => panel(s, m)));
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>W1 색 미리보기: ${short(PREVIEW.palette)} × 세트 4개 (${modes.join('·')})</title>
<style>
body{margin:0;background:#fff;font:14px/1.5 system-ui,sans-serif;color:#111}
h1{font:600 16px system-ui;margin:0;padding:12px 16px;border-bottom:1px solid #ddd}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0}
.pv{padding:20px;font-family:var(--kit-font);display:grid;gap:14px;align-content:start;min-width:0}
.pv-head{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--kit-muted);border-bottom:1px solid var(--kit-border);padding-bottom:8px}.pv-head b{color:var(--kit-text)}
.pv-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.pv-secondary{font:inherit;min-height:44px;padding:0 18px;border:0;border-radius:8px;background:var(--kit-accent);color:var(--kit-onAccent);cursor:pointer}
.pv-secondary:hover{background:var(--kit-accent-hover);color:var(--kit-onAccentHover)}.pv-secondary:active{background:var(--kit-accent-active);color:var(--kit-onAccentActive)}
.pv-link{color:var(--kit-link);text-decoration:underline;text-underline-offset:.2em}
.pv-status{gap:16px;font-weight:600}
.pv-input{display:grid;gap:4px;font-size:13px;color:var(--kit-muted)}
.pv-input input{font:inherit;min-height:40px;padding:0 12px;border:1px solid var(--kit-control-border);border-radius:8px;background:var(--kit-control-bg);color:var(--kit-control-fg)}
.pv-input input:hover{border-color:var(--kit-control-hover-border)}.pv-input input:focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px;border-color:var(--kit-control-active-border)}
.pv-charts{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;align-items:center;color:var(--kit-muted)}
.pv-strip{display:flex;gap:3px}.pv-strip i{flex:1;height:22px;border-radius:4px;display:block}
${cardStyles}${buttonStyles}
${panels.map(p => p.css).join('\n')}
</style>
<h1>샘플 팔레트 ${short(PREVIEW.palette)} × 세트 4개 · 같은 카드와 버튼 · ${modes.join(' / ')}</h1>
<div class="grid">${panels.map(p => p.html).join('\n')}</div></html>
`;
}

export function writeMatrixDoc() {
  const p = resolve(ROOT, 'docs/platform/color.md');
  let src = readFileSync(p, 'utf8');
  for (const [begin, end, body] of [[BEGIN, END, matrixMarkdown()], [METRICS_BEGIN, METRICS_END, previewMetricsMarkdown()]]) {
    const [a, b] = [src.indexOf(begin), src.indexOf(end)];
    if (a < 0 || b < a) throw new Error(`docs/platform/color.md에 마커가 없습니다: ${begin}`);
    src = `${src.slice(0, a + begin.length)}\n${body}\n${src.slice(b)}`;
  }
  writeFileSync(p, src);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const shot = !process.argv.includes('--no-shot');
  writeMatrixDoc();
  const files = {light: 'sunrise-warm-4sets-light', dark: 'sunrise-warm-4sets-dark'};
  for (const [mode, name] of Object.entries(files)) writeFileSync(resolve(HERE, `${name}.html`), previewHTML([mode]));
  if (shot) {
    const {chromium} = await import('@playwright/test');
    const browser = await chromium.launch();
    for (const name of Object.values(files)) {
      const page = await browser.newPage({viewport: {width: 1280, height: 900}});
      await page.goto(pathToFileURL(resolve(HERE, `${name}.html`)).href);
      await page.screenshot({path: resolve(HERE, `${name}.png`), fullPage: true});
      await page.close();
    }
    await browser.close();
  }
  console.log('wrote', Object.values(files).map(n => n + '.html' + (shot ? '/.png' : '')).join(', '));
}
