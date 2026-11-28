import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleComponents, assembleDesign, compileBlueprint, getComponentSpec} from '../src/service/index.mjs';
import * as edit from '../src/edit/index.mjs';
import {templates} from '../src/catalog/index.mjs';
import {getPurposeFamily} from '../src/platform/families/index.mjs';
import {renderNavigation, navigationExamples} from '../src/materials/navigation.mjs';
import {renderTabs, tabsExamples} from '../src/materials/tabs.mjs';
import {renderModal, modalExamples} from '../src/materials/modal.mjs';
import {renderTooltip, tooltipExamples} from '../src/materials/tooltip.mjs';
import {renderFeedback, feedbackExamples} from '../src/materials/feedback.mjs';
import {renderInput} from '../src/materials/input.mjs';

/**
 * REQUEST §6.2 E(내비게이션 14)·H(오버레이 9)·I(피드백 16) 39항목이 항목 이름의 뜻대로 렌더되는지 본다.
 * 어느 재료가 어느 항목을 맡는지는 이 파일이 정하지 않고 MATERIAL-COVERAGE.json의 요구 레코드에서 읽는다. 변형 항목은 변형이 실제로 다른 출력을 내는지 본다.
 */
const root = new URL('..', import.meta.url);
const coverage = JSON.parse(readFileSync(new URL('docs/dev/catalog-platform-upgrade/MATERIAL-COVERAGE.json', root), 'utf8'));
const request = readFileSync(new URL('docs/dev/catalog-platform-upgrade/REQUEST.md', root), 'utf8');
const sectionNames = letter => {
  const start = request.indexOf(`\n### ${letter}. `), body = request.slice(start + 1, request.indexOf('\n### ', start + 5));
  return body.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim());
};
const reqs = coverage.requirements.filter(r => /^req:comp:[ehi]-/.test(r.id));
const byName = new Map(reqs.map(r => [r.name, r]));

const BASE = {context: 'dashboard', mode: 'light', palette: 'palette:static-kit', subtokenSet: 'subtoken-set:standard', typeSystem: 'type-system:tech-erp'};
const purpose = (id, over = {}) => {
  const family = getPurposeFamily(id), result = assembleComponents({...BASE, items: [{purpose: id, visual: 'family:quiet', ...family.example, ...over}]});
  assert.equal(result.ok, true, `${id}: ${JSON.stringify(result.errors)}`);
  return result.value.html;
};
const nodeDoc = node => {
  let doc = edit.resetDocument(null, {template: 'about-team', theme: 'workspace'}).doc;
  doc = edit.insertNode(doc, {parent: [], node, index: doc.tree.children.length}).doc;
  const at = doc.tree.children.length - 1;
  for (let i = at - 1; i >= 1; i--) doc = edit.removeNode(doc, {path: [i]}).doc;
  return doc;
};
const legacy = type => {
  const spec = getComponentSpec({type});
  assert.equal(spec.ok, true, type);
  const out = compileBlueprint(nodeDoc(spec.value.example), {include: ['html']});
  assert.equal(out.ok, true, type);
  return out.value.html.replace(/<script[\s\S]*?<\/script>/g, '');
};
const block = (html, tag, cls) => html.match(new RegExp(`<${tag} class="${cls}"[\\s\\S]*?</${tag}>`))[0];
const statePattern = id => {
  const slot = id.split(':')[1].split('-')[0];
  const table = {title: '작업', columns: ['작업', '담당', '상태'], rows: slot === 'empty' ? [] : [['작업 1', '담당 1', '진행']], ...(slot === 'loading' || slot === 'error' ? {state: slot} : {})};
  const out = assembleDesign({purpose: 'work-dashboard', mode: 'light', candidates: 1, states: {[slot]: id}, content: {table}}, {include: ['html']});
  assert.equal(out.ok, true, `${id}: ${JSON.stringify(out.errors)}`);
  return out.value.candidates[0].value.html;
};
const tocPage = () => {
  const has = nodes => nodes?.some(n => n.type === 'toc' || has(n.children));
  const name = Object.keys(templates).find(t => { const made = edit.resetDocument(null, {template: t}); return made.ok && has(made.doc.tree.children); });
  return compileBlueprint(edit.resetDocument(null, {template: name}).doc, {include: ['html']}).value.html;
};
const nav = {...navigationExamples[0], id: 'req-nav'}, tabs = {...tabsExamples[0], id: 'req-tabs'}, fb = {...feedbackExamples[0], id: 'req-fb'};
const modal = {...modalExamples[0], id: 'req-modal'}, alertModal = {...modalExamples[1], id: 'req-alert'}, sheet = {...modalExamples[2], id: 'req-sheet'};
const attr = (html, name) => [...html.matchAll(new RegExp(`${name}="([^"]*)"`, 'g'))].map(m => m[1]);
const count = (html, re) => (html.match(re) ?? []).length;
const tabsHtml = extra => renderTabs({...tabs, ...extra});
const feedbackHtml = extra => renderFeedback({...fb, ...extra});

/** 항목 이름 → 렌더된 출력이 그 뜻을 가졌는지 보는 단언. 렌더 입력은 항목을 맡은 재료의 대표 예시다. */
const MEANING = {
  Navbar: () => { const h = renderNavigation(nav); assert.match(h, /<nav [^>]*aria-label="주요 메뉴"[^>]*data-orientation="horizontal"/); assert.equal(count(h, /aria-current="page"/g), 1); assert.match(h, /role="link" aria-disabled="true"/); },
  Sidebar: () => { const h = purpose('purpose:navigation.sidebar', {}); assert.match(h, /<aside/); assert.match(h, /data-orientation="vertical"/); assert.equal(count(h, /aria-current="page"/g), 1); },
  'Collapsible Sidebar': () => { const h = purpose('purpose:navigation.collapsible-sidebar'); assert.match(h, /aria-expanded="false" aria-controls="([^"]+)"[^>]*data-ehi-trigger/); const id = attr(h, 'aria-controls')[0]; assert.match(h, new RegExp(`id="${id}" class="ehi-panel" hidden`)); assert.match(h, /data-orientation="vertical"/); assert.equal(count(h, /aria-current="page"/g), 1); },
  Breadcrumb: () => { const h = block(legacy('breadcrumb'), 'nav', 'kit-breadcrumb'); assert.match(h, /^<nav class="kit-breadcrumb" aria-label="현재 위치"><ol>/); assert.equal(count(h, /<span aria-current="page">/g), 1); assert.ok(h.lastIndexOf('aria-current="page"') > h.lastIndexOf('<a href'), 'the current page is the last crumb and is not a link'); },
  Tabs: () => { const h = tabsHtml(); assert.match(h, /role="tablist"/); assert.equal(count(h, /role="tab"/g), 4); assert.equal(count(h, /aria-selected="true"/g), 1); assert.equal(count(h, /role="tabpanel"/g), 4); for (const id of attr(h, 'aria-controls')) assert.ok(h.includes(`id="${id}"`), id); assert.equal(count(h, /role="tabpanel"[^>]* hidden/g), 3); },
  'Vertical Tabs': () => { const h = tabsHtml({orientation: 'vertical'}); assert.match(h, /aria-orientation="vertical"/); assert.match(h, /data-orientation="vertical"/); },
  'Underline Tabs': () => { const h = tabsHtml({appearance: 'underline'}); assert.match(h, /data-appearance="underline"/); },
  Stepper: () => { const h = block(legacy('stepper'), 'nav', 'kit-stepper'); assert.match(h, /^<nav class="kit-stepper" aria-label="진행 단계"><ol>/); assert.equal(count(h, /aria-current="step"/g), 1); assert.equal(count(h, /<li /g), 3); },
  Pagination: () => { const h = block(legacy('pagination'), 'nav', 'kit-pagination'); assert.match(h, /^<nav class="kit-pagination" aria-label="페이지 이동">/); assert.equal(count(h, /aria-current="page"/g), 1); assert.match(h, /aria-label="이전 페이지"/); assert.match(h, /aria-label="다음 페이지"/); },
  'Bottom Navigation': () => { const h = purpose('purpose:navigation.bottom'); assert.match(h, /<nav/); const cells = count(h, /class="kit-ctl-nav-link"/g); assert.ok(cells >= 3 && cells <= 5, 'three to five cells'); assert.equal(count(h, /<svg/g), cells, 'every cell has an icon'); assert.equal(count(h, /aria-current="page"/g), 1); },
  'Navigation Drawer': () => { const h = purpose('purpose:navigation.drawer'); assert.match(h, /role="dialog" aria-modal="true"/); assert.match(h, /data-focus-trap/); assert.match(h, /<nav class="kit-ctl-nav"/); assert.equal(count(h, /aria-current="page"/g), 1); },
  'Table of Contents': () => { const h = tocPage(); const toc = h.match(/<nav class="kit-toc"[\s\S]*?<\/nav>/)[0]; const ids = [...toc.matchAll(/href="#([^"]+)"/g)].map(m => m[1]); assert.ok(ids.length >= 3); for (const id of ids) assert.ok(h.includes(`id="${id}"`), `toc link ${id} resolves`); assert.match(toc, /aria-label="이 문서의 목차"/); },
  'Command Menu': () => { const h = purpose('purpose:navigation.command-menu'); assert.match(h, /aria-haspopup="dialog"/); assert.match(h, /<input type="search" data-ehi-filter aria-label="명령 검색"/); assert.equal(count(h, /role="menuitem"/g), 2); assert.match(h, /data-ehi-empty="일치하는 명령이 없습니다" role="status"/); },
  'Context Menu': () => { const h = purpose('purpose:navigation.context-menu'); assert.match(h, /data-ehi-context-trigger/); assert.equal(count(h, /role="menu"/g), 1); assert.equal(count(h, /role="menuitem"/g), 2); },
  Modal: () => { const h = renderModal(modal); assert.match(h, /<dialog[^>]*aria-labelledby=/); assert.match(h, /role="dialog"|data-role="dialog"/); assert.ok(count(h, /<button/g) >= 3, 'trigger, close and actions'); },
  'Alert Dialog': () => { const h = renderModal(alertModal); assert.match(h, /alertdialog/); assert.match(h, /data-role="alertdialog"/); },
  'Confirmation Dialog': () => { const h = purpose('purpose:feedback.confirm'); assert.match(h, /alertdialog|role="dialog"/); assert.match(h, /삭제/); assert.match(h, /취소/); },
  Drawer: () => { const h = purpose('purpose:overlay.drawer'); assert.match(h, /data-placement="drawer"/); assert.match(h, /role="dialog" aria-modal="true"/); assert.match(h, /data-focus-trap/); },
  'Bottom Sheet': () => { const h = renderModal(sheet); assert.match(h, /data-placement="bottom"/); },
  Popover: () => { const h = purpose('purpose:overlay.popover'); assert.match(h, /aria-modal="false"/); assert.doesNotMatch(h, /data-ehi-backdrop|data-focus-trap/); assert.match(h, /class="ehi-panel ehi-float"/); },
  Tooltip: () => { const h = renderTooltip({...tooltipExamples[0], id: 'req-tip'}); assert.match(h, /role="tooltip"/); assert.match(h, /aria-describedby="req-tip/); },
  'Dropdown Menu': () => { const h = purpose('purpose:overlay.dropdown-menu'); assert.match(h, /aria-haspopup="menu"/); assert.equal(count(h, /role="menu"/g), 1); assert.equal(count(h, /role="menuitem"/g), 2); },
  'Contextual Help': () => { const h = purpose('purpose:overlay.contextual-help'); assert.match(h, /role="tooltip"[^>]* hidden/); assert.match(h, /aria-describedby="([^"]+)"/); assert.doesNotMatch(h, /aria-haspopup|aria-controls/); },
  Alert: () => { const h = feedbackHtml({}); assert.match(h, /role="status"/); assert.match(h, /data-placement="inline"/); assert.match(feedbackHtml({tone: 'danger'}), /role="alert"/); },
  Banner: () => { assert.match(feedbackHtml({placement: 'banner'}), /data-placement="banner"/); },
  Callout: () => { const h = purpose('purpose:feedback.callout'); assert.match(h, /<aside class="ehi ehi-callout" role="note"/); assert.doesNotMatch(h, /role="(status|alert)"|aria-live/); },
  Toast: () => { const h = feedbackHtml({placement: 'toast', dismiss: 'button'}); assert.match(h, /data-placement="toast"/); assert.match(h, /data-dismiss/); },
  Snackbar: () => { const h = feedbackHtml({placement: 'toast', dismiss: 'button', action: 'button', actionLabel: '실행 취소'}); assert.match(h, /data-placement="toast"/); assert.match(h, /실행 취소/); assert.match(h, /data-dismiss/); },
  'Inline Error': () => { const h = renderInputError(); assert.match(h, /aria-invalid="true"/); assert.match(h, /aria-describedby="[^"]*-message"/); assert.match(h, /<p class="kit-ctl-input-message" id="[^"]+-message" aria-live="polite">/); },
  'Empty State': () => { const h = legacy('empty-state'); assert.match(h, /<section class="kit-empty"[^>]*role="status"/); assert.match(h, /kit-button/); const inline = statePattern('state-pattern:empty-inline'), illustrated = statePattern('state-pattern:empty-illustrated'); assert.match(inline, /data-pattern="empty-inline" data-state="empty" role="status" aria-live="polite"/); assert.match(illustrated, /data-pattern="empty-illustrated"[\s\S]*<h3 class="kit-state-title">/); assert.doesNotMatch(inline, /kit-state-title/, 'the inline form has no heading, the illustrated form does'); },
  'Error State': () => { const h = purpose('purpose:feedback.error'); assert.match(h, /role="alert"/); assert.match(h, /다시 시도/); },
  'Success State': () => { const h = purpose('purpose:feedback.result'); assert.match(h, /결제가 완료되었습니다/); assert.match(h, /role="status"/); },
  Skeleton: () => { const h = legacy('skeleton'); assert.match(h, /class="kit-skeleton"[^>]*role="status" aria-busy="true" aria-label="[^"]+"/); const sk = statePattern('state-pattern:loading-skeleton'); assert.match(sk, /data-pattern="loading-skeleton" data-state="loading" role="status" aria-live="polite" aria-busy="true"/); assert.equal(count(sk, /data-skeleton aria-hidden="true"/g), 3); },
  Spinner: () => { const h = statePattern('state-pattern:loading-spinner'); assert.match(h, /data-pattern="loading-spinner" data-state="loading" role="status" aria-live="polite" aria-busy="true"/); assert.match(h, /<span data-spinner aria-hidden="true">/); assert.match(h, /<span class="kit-sr">불러오는 중<\/span>/); },
  'Linear Progress': () => { const h = legacy('progress'); assert.match(h, /role="progressbar"[^>]*aria-valuenow="64"[^>]*aria-valuetext="64% 완료"/); assert.match(h, /<strong>64%<\/strong>/); },
  'Circular Progress': () => { const h = purpose('purpose:feedback.circular-progress'); assert.match(h, /role="progressbar"[^>]*aria-valuenow="40"[^>]*>40%</); assert.match(h, /conic-gradient\(var\(--kit-action\) 40%/); },
  'Step Progress': () => { const h = stepsHtml(); assert.match(h, /<ol/); assert.equal(count(h, /<li/g), 3); assert.equal(count(h, /aria-current="step"/g), 1); assert.deepEqual([...h.matchAll(/<li[^>]*>(?:<svg[\s\S]*?<\/svg>)?<span>([^<]+)<\/span>/g)].map(m => m[1]), ['정보', '결제', '완료'], 'steps keep their order'); assert.match(h, /data-status="done"[\s\S]*data-status="current" aria-current="step"[\s\S]*data-status="todo"/); },
  'Loading Overlay': () => { const h = purpose('purpose:feedback.loading-overlay'); assert.match(h, /data-ehi-loading-region aria-busy="true"/); assert.match(h, /class="ehi-loading-body" aria-hidden="true"/); assert.match(h, /data-ehi-loading>[\s\S]*role="status" aria-live="polite"/); },
  'Status Indicator': () => { const h = purpose('purpose:feedback.status-indicator'); assert.match(h, /role="status" aria-live="polite" data-tone="success"/); assert.match(h, /<span class="ehi-dot" aria-hidden="true">/); assert.match(h, /동기화 완료/); },
};
const stepsHtml = () => purpose('purpose:feedback.progress', {variant: {kind: 'steps', cancel: 'none'}, content: {title: '결제 진행', message: '2단계', steps: [{label: '정보', status: 'done'}, {label: '결제', status: 'current'}, {label: '완료', status: 'todo'}]}});
const renderInputError = () => renderInput({id: 'req-email', label: '이메일', message: '형식이 올바르지 않습니다', state: 'error'});

test('§6.2 E·H·I names in REQUEST.md equal the coverage requirements (14 + 9 + 16 = 39, direct 30 and variant 9)', () => {
  const expected = [...sectionNames('E'), ...sectionNames('H'), ...sectionNames('I')];
  assert.equal(expected.length, 39);
  assert.deepEqual([...reqs.map(r => r.name)].sort(), [...expected].sort());
  assert.equal(reqs.filter(r => r.coverage === 'direct').length, 30);
  assert.equal(reqs.filter(r => r.coverage === 'variant').length, 9);
  assert.deepEqual(Object.keys(MEANING).sort(), [...expected].sort(), 'every item has a meaning check');
});

for (const name of Object.keys(MEANING)) {
  test(`§6.2 ${name}: the item renders what its name means`, async () => {
    const req = byName.get(name);
    assert.ok(req, `${name} is registered in the coverage manifest`);
    assert.ok(req.materialIds.length >= 1 && req.coverage !== 'missing', `${name} is covered (${req.coverage})`);
    await MEANING[name]();
  });
}

test('§6.2 variant items produce output that differs from their base and from each other where the name says they differ', () => {
  const variants = reqs.filter(r => r.coverage === 'variant');
  assert.equal(variants.length, 9);
  // Tabs: 세로·밑줄·알약·분할은 서로 다른 출력이다. 가로 밑줄은 기반 Tabs의 기본값과 같은 그림이라, 이름이 다른 것은 "선택 표시가 밑줄"이라는 축 값뿐이다.
  const tabKinds = {base: tabsHtml(), vertical: tabsHtml({orientation: 'vertical'}), underline: tabsHtml({appearance: 'underline'}), pill: tabsHtml({appearance: 'pill'}), segmented: tabsHtml({appearance: 'segmented'})};
  assert.notEqual(tabKinds.vertical, tabKinds.base);
  assert.equal(new Set([tabKinds.vertical, tabKinds.underline, tabKinds.pill, tabKinds.segmented]).size, 4);
  // Modal 계열
  const dialogs = {modal: renderModal(modal), alertdialog: renderModal(alertModal), sheet: renderModal(sheet)};
  assert.equal(new Set(Object.values(dialogs)).size, 3);
  assert.match(dialogs.alertdialog, /alertdialog/); assert.doesNotMatch(dialogs.modal, /alertdialog/); assert.match(dialogs.sheet, /data-placement="bottom"/); assert.match(dialogs.modal, /data-placement="center"/);
  // Feedback 계열: 같은 문구, 배치·닫기·동작만 다르다. 각 변형은 렌더러가 실제로 받아들이는 조합이어야 한다(toast는 닫는 길이 필요).
  const feedback = {alert: feedbackHtml({}), banner: feedbackHtml({placement: 'banner'}), toast: feedbackHtml({placement: 'toast', dismiss: 'button'}), snackbar: feedbackHtml({placement: 'toast', dismiss: 'button', action: 'button', actionLabel: '실행 취소'})};
  assert.equal(new Set(Object.values(feedback)).size, 4);
  assert.throws(() => feedbackHtml({placement: 'toast'}), /FB_TOAST_STUCK/, 'a toast without a way out is rejected, so the variant record must carry dismiss');
  assert.ok(!feedback.toast.includes('kit-ctl-feedback-action'), 'a toast has no action button'); assert.ok(feedback.snackbar.includes('kit-ctl-feedback-action'), 'a snackbar adds an action button to the toast');
  // 장부의 변형 값이 위 렌더와 같은 축 값이다.
  const recorded = Object.fromEntries(variants.map(r => [r.name, r.variant]));
  assert.deepEqual(recorded.Toast, {placement: 'toast', dismiss: 'button'});
  assert.deepEqual(recorded.Snackbar, {placement: 'toast', action: 'button', dismiss: 'button'});
  assert.deepEqual(recorded['Bottom Sheet'], {placement: 'bottom'}); assert.deepEqual(recorded['Alert Dialog'], {role: 'alertdialog'});
  // Step Progress: 같은 목적 패밀리의 steps 변형은 determinate와 다르다.
  const steps = stepsHtml(), bar = purpose('purpose:feedback.progress', {variant: {kind: 'determinate', cancel: 'none'}});
  assert.notEqual(steps, bar);
  // Inline Error: 입력 칸의 오류 상태다. 오류 아닌 같은 칸과 다르고, 오류 문구는 입력에 aria-describedby로 이어진다.
  const field = {id: 'req-email', label: '이메일'};
  assert.notEqual(renderInput({...field, state: 'error', message: '형식이 올바르지 않습니다'}), renderInput(field));
  assert.deepEqual(recorded['Inline Error'], {state: 'error'});
});
