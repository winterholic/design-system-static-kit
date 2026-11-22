/** docs/evidence/materials/components.html: 컴포넌트 재료 8종의 모든 축 값·상태·금지 조합·크기 표·토큰 대비를 한 페이지에 그린다.
 *  결정적이다: 시간·난수·환경 값이 없고, 같은 소스는 같은 바이트를 낸다(tests/material-components.test.mjs가 파일과 비교한다).
 *  CSS의 `:root` 토큰은 실제 2.6.0 컴파일 결과(compile)에서 가져오므로 재료가 읽는 `--kit-*` 변수는 제품 페이지와 같은 값이다. */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createBlueprint} from '../../src/catalog.mjs';
import {compile} from '../../src/compiler.mjs';
import {resolveColorTokens} from '../../src/color-tokens.mjs';
import {SPACE, TOKEN} from '../../src/spacing.mjs';
import {CONTROL_SIZES, CONTROL_SIZE_NAMES} from '../../src/materials/typography.mjs';
import {catalogRegistry} from '../../src/materials/index.mjs';
import {legalCombinations, combinationStats, pairRatio, varsOf, e} from '../../src/materials/control-kit.mjs';
import {SPECIMENS, renderSpecimen, specimenInput} from '../../src/materials/specimens.mjs';
import {buttonContract, buttonStyles, buttonRuntime} from '../../src/materials/button.mjs';
import {inputContract, inputStyles, inputRuntime} from '../../src/materials/input.mjs';
import {cardContract, cardStyles, cardRuntime} from '../../src/materials/card.mjs';
import {navigationContract, navigationStyles, navigationRuntime} from '../../src/materials/navigation.mjs';
import {modalContract, modalStyles, modalRuntime, modalContentRules, renderModal} from '../../src/materials/modal.mjs';
import {tabsContract, tabsStyles, tabsRuntime} from '../../src/materials/tabs.mjs';
import {tooltipContract, tooltipStyles, tooltipRuntime, tooltipContentRules, renderTooltip} from '../../src/materials/tooltip.mjs';
import {feedbackContract, feedbackStyles, feedbackRuntime} from '../../src/materials/feedback.mjs';
import {renderButton} from '../../src/materials/button.mjs';
import {renderInput} from '../../src/materials/input.mjs';
import {renderCard} from '../../src/materials/card.mjs';
import {renderNavigation} from '../../src/materials/navigation.mjs';
import {renderTabs} from '../../src/materials/tabs.mjs';
import {renderFeedback} from '../../src/materials/feedback.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const OUTPUT = 'docs/evidence/materials/components.html';

export const COMPONENTS = Object.freeze([
  {key: 'button', title: 'Button', contract: buttonContract, styles: buttonStyles, runtime: buttonRuntime},
  {key: 'input', title: 'Input', contract: inputContract, styles: inputStyles, runtime: inputRuntime},
  {key: 'card', title: 'Card', contract: cardContract, styles: cardStyles, runtime: cardRuntime},
  {key: 'navigation', title: 'Navigation', contract: navigationContract, styles: navigationStyles, runtime: navigationRuntime},
  {key: 'modal', title: 'Modal', contract: modalContract, styles: modalStyles, runtime: modalRuntime},
  {key: 'tabs', title: 'Tabs', contract: tabsContract, styles: tabsStyles, runtime: tabsRuntime},
  {key: 'tooltip', title: 'Tooltip', contract: tooltipContract, styles: tooltipStyles, runtime: tooltipRuntime},
  {key: 'feedback', title: 'Feedback', contract: feedbackContract, styles: feedbackStyles, runtime: feedbackRuntime},
]);

/** 정지 화면에서 보이려는 hover·focus·active 모양(data-force). 상태 변수가 아니라 :hover·:focus-visible·:active의 미리보기다. */
const FORCED = {
  button: [{appearance: 'solid', force: 'hover'}, {appearance: 'solid', force: 'focus'}, {appearance: 'solid', force: 'active'}, {appearance: 'outline', force: 'hover'}, {appearance: 'outline', force: 'focus'}, {appearance: 'ghost', force: 'hover'}, {appearance: 'soft', force: 'active'}],
  input: [{appearance: 'outline', force: 'hover'}, {appearance: 'outline', force: 'focus'}, {appearance: 'filled', force: 'focus'}, {appearance: 'underline', force: 'focus'}, {appearance: 'ghost', force: 'hover'}],
  card: [{behavior: 'link', force: 'hover'}, {behavior: 'link', force: 'focus'}, {behavior: 'selectable', force: 'active'}],
  navigation: [{appearance: 'underline', force: 'hover'}, {appearance: 'pill', force: 'focus'}, {appearance: 'block', force: 'active'}],
  modal: [], tabs: [{appearance: 'underline', force: 'hover'}, {appearance: 'pill', force: 'focus'}, {appearance: 'segmented', force: 'active'}],
  tooltip: [{trigger: 'text', state: 'visible', force: 'focus'}, {trigger: 'icon', purpose: 'name', delay: 'none', state: 'visible', force: 'hover'}], feedback: [],
};

const fmt = n => n.toLocaleString('en-US');
const concept = (contract, attr) => Object.entries(contract.concepts).find(([, attrs]) => attrs.includes(attr))[0];
const CONCEPT_LABEL = {appearance: '외형', shape: '모양', size: '크기', function: '기능', state: '상태', context: '맥락'};

/** 축 값마다 그 값을 포함하는 허용 조합 중 기본값과 가장 가까운 한 벌. 금지 조합은 후보가 아니다. */
function coverage(contract) {
  const legal = legalCombinations(contract), distance = p => Object.keys(contract.defaults).filter(a => p[a] !== contract.defaults[a]).length;
  const out = [], seen = new Set();
  for (const [attr, values] of Object.entries(contract.axes)) for (const value of values) {
    const pick = legal.filter(p => p[attr] === value).sort((a, b) => distance(a) - distance(b))[0];
    if (!pick) throw new Error(`${contract.id}: no legal combination contains ${attr}=${value}`);
    const key = JSON.stringify(pick) + attr + value;
    if (!seen.has(key)) { seen.add(key); out.push({attr, value, props: pick}); }
  }
  return out;
}

const caption = (contract, attr, value, props) => {
  const extra = Object.entries(props).filter(([a, v]) => a !== attr && v !== contract.defaults[a]).map(([a, v]) => `${a}=${v}`).join(' · ');
  return `<figcaption><code>${e(attr)}=${e(String(value))}</code><span class="ev-concept">${CONCEPT_LABEL[concept(contract, attr)]}</span>${extra ? `<small>+ ${e(extra)}</small>` : ''}</figcaption>`;
};

function sizeTable() {
  const rows = CONTROL_SIZE_NAMES.map(name => { const c = CONTROL_SIZES[name], s = SPACE.comfortable;
    return `<tr><th scope="row">${name}</th><td>${s.control}${c.step < 0 ? ' − ' + -c.step : c.step > 0 ? ' + ' + c.step : ''} = <b>${s.control + c.step}px</b></td><td><code>${TOKEN[c.pad]}</code> = ${s[c.pad]}px</td><td><code>${TOKEN[c.gap]}</code> = ${s[c.gap]}px</td><td><code>--kit-t-${c.role}</code></td><td>${c.icon}px</td></tr>`; }).join('');
  return `<div class="ev-scroll"><table class="ev-table"><thead><tr><th>크기</th><th>높이 (comfortable 기준 control 토큰 ± step)</th><th>좌우 패딩</th><th>간격</th><th>글자 역할</th><th>아이콘</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

const PROBES = {
  modal: [
    [modalContentRules[0].id, () => renderModal({id: 'probe', title: '제목', body: [{slot: 'modal'}], actions: [{label: '닫기', role: 'cancel'}]})],
    [modalContentRules[1].id, () => renderModal({id: 'probe', title: '제목', body: [{slot: 'html'}], actions: [{label: '닫기', role: 'cancel'}]})],
  ],
  tooltip: [
    [tooltipContentRules[0].id, () => renderTooltip({id: 'probe', triggerLabel: '트리거', content: '<a href="#">링크</a>'})],
    [tooltipContentRules[1].id, () => renderTooltip({id: 'probe', triggerLabel: '트리거', content: '가'.repeat(121)})],
    [tooltipContentRules[2].id, () => renderTooltip({id: 'probe', triggerLabel: '트리거', shape: 'pill', content: '가'.repeat(25)})],
    [tooltipContentRules[3].id, () => renderTooltip({id: 'probe', triggerLabel: '트리거', content: '설명', triggerDisabled: true})],
  ],
};
const attempt = fn => { try { fn(); return null; } catch (error) { return error; } };

function forbiddenTable({key, contract}) {
  const stats = combinationStats(contract);
  const rows = contract.forbidden.map(rule => {
    const probe = {...contract.defaults}; for (const [a, v] of Object.entries(rule.when)) probe[a] = [v].flat()[0];
    const error = attempt(() => SPECIMENS[contract.id].render(specimenInput(contract.id, probe, 'probe')));
    const rejected = error?.name === 'ContractError' && error.rules.some(r => r.id === rule.id);
    const cond = Object.entries(rule.when).map(([a, v]) => `${a} ${Array.isArray(v) ? '∈ {' + v.join(', ') + '}' : '= ' + v}`).join(' ∧ ');
    return `<tr data-rule="${rule.id}"><th scope="row"><code>${rule.id}</code></th><td>${e(cond)}</td><td>${e(rule.why)}</td><td>${fmt(stats.perRule[rule.id])}</td><td class="ev-ok" data-rejected="${rejected}">${rejected ? '거부됨' : '통과(오류)'}</td></tr>`;
  });
  for (const [id, probe] of PROBES[key] ?? []) {
    const error = attempt(probe), rule = [...modalContentRules, ...tooltipContentRules].find(r => r.id === id), rejected = error?.name === 'ContractError' && error.code === id;
    rows.push(`<tr data-rule="${id}"><th scope="row"><code>${id}</code></th><td>내용 검사(축이 아니라 넘긴 내용)</td><td>${e(rule.why)}</td><td>—</td><td class="ev-ok" data-rejected="${rejected}">${rejected ? '거부됨' : '통과(오류)'}</td></tr>`);
  }
  return `<div class="ev-scroll"><table class="ev-table"><thead><tr><th>규칙</th><th>조건</th><th>이유</th><th>걸러낸 조합 수</th><th>확인</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function contrastTable({contract, styles}) {
  const light = resolveColorTokens({mode: 'light'}).tokens, dark = resolveColorTokens({mode: 'dark'}).tokens;
  const rows = contract.pairs.map(pair => { const l = pairRatio(light, pair), d = pairRatio(dark, pair), ok = l >= pair[2] && d >= pair[2];
    return `<tr><th scope="row">${e(pair[3])}</th><td><code>${e(pair[0])}</code> / <code>${e(pair[1])}</code></td><td>${l.toFixed(2)}</td><td>${d.toFixed(2)}</td><td>${pair[2]}</td><td class="ev-ok" data-pass="${ok}">${ok ? '통과' : '미달'}</td></tr>`; }).join('');
  return `<p class="ev-note">읽는 토큰 ${varsOf(styles).length}개: ${varsOf(styles).map(v => `<code>${v}</code>`).join(' ')}</p><div class="ev-scroll"><table class="ev-table"><thead><tr><th>쓰임</th><th>전경 / 배경</th><th>라이트</th><th>다크</th><th>최소</th><th>판정</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

const stage = (key, html) => `<div class="ev-stage" data-comp="${key}">${html}</div>`;
function section(c) {
  const {key, title, contract, styles} = c, stats = combinationStats(contract), id = contract.id;
  const cover = coverage(contract).map(({attr, value, props}, i) => `<figure class="ev-spec" data-axis="${attr}" data-value="${e(String(value))}">${stage(key, renderSpecimen(id, key === 'tooltip' && !(attr === 'state' && value === 'hidden') ? {...props, state: 'visible'} : props, `${key}-ax-${i}`))}${caption(contract, attr, value, props)}</figure>`).join('');
  const forced = FORCED[key].map((props, i) => { const merged = {...contract.defaults, ...props}, {force, ...axes} = merged;
    return `<figure class="ev-spec" data-force-preview="${force}">${stage(key, SPECIMENS[id].render({...specimenInput(id, axes, `${key}-fc-${i}`), force}))}<figcaption><code>${Object.entries(props).map(([a, v]) => `${a}=${v}`).join(' · ')}</code><span class="ev-concept">미리보기 상태</span></figcaption></figure>`; }).join('');
  const dark = coverage(contract).slice(0, 3).map(({attr, value, props}, i) => `<figure class="ev-spec"><div class="ev-stage ev-dark" data-comp="${key}">${renderSpecimen(id, key === 'tooltip' ? {...props, state: 'visible'} : props, `${key}-dk-${i}`)}</div><figcaption><code>다크 · ${attr}=${e(String(value))}</code></figcaption></figure>`).join('');
  const concepts = Object.entries(contract.concepts).map(([name, attrs]) => `<li><b>${CONCEPT_LABEL[name]}</b> ${attrs.map(a => `<code>${a}</code>: ${contract.axes[a].map(v => e(String(v))).join(' · ')}`).join(' / ')}</li>`).join('');
  return `<section class="ev-sec" id="c-${key}" data-component="${id}"><h2>${title} <code>${id}</code></h2>
<p class="ev-sum" data-stats="${key}">속성 조합 <b>${fmt(stats.raw)}</b> = 허용 <b>${fmt(stats.legal)}</b> + 금지 <b>${fmt(stats.rejected)}</b> · 금지 규칙 ${contract.forbidden.length}개${PROBES[key] ? ` + 내용 규칙 ${PROBES[key].length}개` : ''}</p>
<ul class="ev-concepts">${concepts}</ul>
<h3>크기 계약 <small>CONTROL_SIZES와 SPACE 토큰에서 읽음</small></h3>${sizeTable()}
<h3>축 값마다 한 장 <small>각 값을 포함하는 허용 조합 중 기본값에 가장 가까운 것</small></h3><div class="ev-grid">${cover}</div>
${forced ? `<h3>hover · focus · active 미리보기</h3><div class="ev-grid">${forced}</div>` : ''}
<h3>금지 조합 <small>렌더러가 지금 거부하는지 이 페이지를 만들 때 확인</small></h3>${forbiddenTable(c)}
<h3>토큰과 대비</h3>${contrastTable(c)}
<h3>다크 모드</h3><div class="ev-grid">${dark}</div></section>`;
}

/** 동작 확인 구역: e2e가 쓰는 고정 id. 정지 화면이 아니라 실제 런타임이 붙은 인스턴스다. */
function playground() {
  const btn = (extra) => renderButton(extra);
  return `<section class="ev-sec" id="playground"><h2>동작 확인 <small>실제 런타임이 붙은 인스턴스</small></h2>
<h3>Button</h3><div class="ev-stage" data-comp="button">${btn({id: 'pg-btn-loading', label: '저장', state: 'loading'})}${btn({id: 'pg-btn-toggle', label: '즐겨찾기', behavior: 'toggle', appearance: 'outline', content: 'icon-start', icon: 'star'})}${btn({id: 'pg-btn-ghost', label: '더 보기', appearance: 'ghost', content: 'icon-end', icon: 'chevron-right'})}${btn({id: 'pg-btn-off', label: '비활성', state: 'disabled'})}${btn({id: 'pg-btn-text-ghost', label: '글자만 ghost', appearance: 'ghost'})}</div>
<h3>Input</h3><div class="ev-grid">${renderInput({id: 'pg-input-pass', label: '비밀번호', kind: 'password', value: 'secret-pass'})}${renderInput({id: 'pg-input-find', label: '검색', kind: 'search', value: '디자인'})}${renderInput({id: 'pg-input-req', label: '이메일', kind: 'email', required: true, hint: '업무용 주소'})}</div>
<h3>Card</h3><div class="ev-grid">${renderCard({id: 'pg-card-pick', title: '스타터 플랜', body: '선택하면 aria-pressed가 바뀝니다.', behavior: 'selectable', media: 'top', mediaIcon: 'zap'})}${renderCard({id: 'pg-card-link', title: '문서로 이동', body: '카드 전체가 하나의 링크입니다.', behavior: 'link', href: '#playground'})}</div>
<h3>Navigation</h3><div class="ev-grid">${renderNavigation({id: 'pg-nav-fold', label: '접히는 메뉴', overflow: 'collapse', items: [{label: '개요', href: '#pg-a', current: true}, {label: '기능', href: '#pg-b'}, {label: '문의', href: '#pg-c'}]})}${renderNavigation({id: 'pg-nav-side', label: '사이드 메뉴', orientation: 'vertical', appearance: 'block', submenu: 'disclosure', items: [{label: '홈', href: '#pg-home', current: true}, {label: '리포트', children: [{label: '월간', href: '#pg-month'}, {label: '분기', href: '#pg-quarter'}]}, {label: '설정', href: '#pg-prefs'}]})}</div>
<h3>Tabs</h3><div class="ev-grid">${renderTabs({id: 'pg-tabs-auto', label: '자동 활성화', tabs: [{id: 'a', label: '개요', content: '개요 패널'}, {id: 'b', label: '작업', content: '작업 패널', disabled: true}, {id: 'c', label: '파일', content: '파일 패널'}, {id: 'd', label: '보관', content: '보관 패널'}]})}${renderTabs({id: 'pg-tabs-manual', label: '수동 활성화', activation: 'manual', tabs: [{id: 'a', label: '일', content: '일 패널'}, {id: 'b', label: '주', content: '주 패널'}, {id: 'c', label: '월', content: '월 패널'}]})}</div>
<h3>Modal</h3><div class="ev-stage" data-comp="modal">${renderModal({id: 'pg-modal-form', title: '새 프로젝트', description: '이름을 정하면 바로 시작합니다.', triggerLabel: '새 프로젝트', body: [{slot: 'input', id: 'pg-modal-name', label: '프로젝트 이름', required: true}], actions: [{label: '취소', role: 'cancel'}, {label: '만들기', role: 'confirm'}]})}${renderModal({id: 'pg-modal-alert', title: '프로젝트를 삭제할까요?', description: '삭제하면 복구할 수 없습니다.', triggerLabel: '삭제', role: 'alertdialog', size: 'small', actions: [{label: '취소', role: 'cancel'}, {label: '삭제', role: 'confirm'}]})}${renderModal({id: 'pg-modal-sheet', title: '필터', description: '결과를 좁힙니다.', triggerLabel: '필터 열기', placement: 'bottom', body: [{slot: 'text', text: '기간과 상태를 고를 수 있습니다.'}], actions: [{label: '닫기', role: 'cancel'}, {label: '적용', role: 'confirm'}]})}</div>
<h3>Tooltip</h3><div class="ev-stage" data-comp="tooltip">${renderTooltip({id: 'pg-tip-hover', triggerLabel: '저장 위치', content: '내 문서 폴더에 저장됩니다.'})}${renderTooltip({id: 'pg-tip-name', triggerLabel: '도움말', trigger: 'icon', purpose: 'name', delay: 'none', placement: 'bottom', content: '도움말 열기'})}${renderTooltip({id: 'pg-tip-edge', triggerLabel: '가장자리', placement: 'end', delay: 'none', content: '오른쪽 가장자리에서는 반대편으로 뒤집힙니다.'})}</div>
<h3>Feedback</h3><div class="ev-grid">${renderFeedback({id: 'pg-fb-dismiss', tone: 'success', dismiss: 'button', message: '변경 사항을 저장했습니다.'})}${renderFeedback({id: 'pg-fb-toast', tone: 'info', placement: 'toast', autoDismiss: 'timed', dismiss: 'button', message: '링크를 복사했습니다.'})}</div></section>`;
}

const PAGE_CSS = `*{box-sizing:border-box}body{margin:0;background:var(--kit-canvas);color:var(--kit-text);font-family:var(--kit-font);font-size:16px;line-height:1.55;word-break:keep-all;overflow-wrap:anywhere}
.ev{max-width:1240px;margin:0 auto;padding:var(--kit-sp-item) var(--kit-sp-item) 96px}.ev code{font-family:var(--kit-mono);font-size:.85em;padding:1px 4px;border-radius:4px;background:var(--kit-soft)}
.ev h1{margin:var(--kit-sp-item) 0 var(--kit-sp-near);font-size:var(--kit-t-heading);line-height:1.2}.ev h2{margin:0 0 var(--kit-sp-near);font-size:var(--kit-t-sub);line-height:1.3}.ev h3{margin:var(--kit-section-s,24px) 0 var(--kit-sp-near);font-size:var(--kit-t-body);line-height:1.3}.ev small{font-weight:400;color:var(--kit-muted);font-size:var(--kit-t-small)}
.ev-top{display:flex;flex-wrap:wrap;gap:var(--kit-sp-tight) var(--kit-sp-item);margin:var(--kit-sp-item) 0}.ev-top a{color:var(--kit-link);padding:var(--kit-sp-tight) var(--kit-sp-near);border:1px solid var(--kit-border);border-radius:999px;text-decoration:none;background:var(--kit-surface)}
.ev-counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:var(--kit-sp-near);margin:0;padding:0;list-style:none}.ev-counts li{padding:var(--kit-sp-item);border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface)}.ev-counts b{display:block;font-size:var(--kit-t-sub)}
.ev-sec{margin-block:56px 0;padding-top:var(--kit-sp-item);border-top:2px solid var(--kit-border);min-width:0}.ev-sum{margin:0 0 var(--kit-sp-near);color:var(--kit-muted)}.ev-note{color:var(--kit-muted);margin:0 0 var(--kit-sp-near)}.ev-concepts{margin:0;padding-inline-start:20px;color:var(--kit-muted)}
.ev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:var(--kit-sp-item)}.ev-spec{margin:0;min-width:0;padding:var(--kit-sp-near);border:1px dashed var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface)}
.ev-stage{display:flex;flex-wrap:wrap;align-items:center;gap:var(--kit-sp-near);min-width:0;padding:var(--kit-sp-near);overflow-x:clip}.ev-stage[data-comp=tooltip]{padding-block:72px;justify-content:center;overflow:visible}.ev-stage[data-comp=modal],.ev-stage[data-comp=feedback],.ev-stage[data-comp=card],.ev-stage[data-comp=input],.ev-stage[data-comp=navigation],.ev-stage[data-comp=tabs]{display:block}
.ev-sec[data-component="component:modal-dialog"] .ev-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))}.ev-dark{background:var(--kit-canvas);color:var(--kit-text);border-radius:var(--kit-radius)}
.ev figcaption{display:flex;flex-wrap:wrap;gap:var(--kit-sp-tight) var(--kit-sp-near);align-items:center;margin-top:var(--kit-sp-near);font-size:var(--kit-t-small)}.ev-concept{padding:0 var(--kit-sp-near);border-radius:999px;background:var(--kit-card-active);color:var(--kit-muted)}
.ev-scroll{overflow-x:auto;max-width:100%;border:1px solid var(--kit-border);border-radius:var(--kit-radius);background:var(--kit-surface)}.ev-table{width:100%;border-collapse:collapse;font-size:var(--kit-t-small)}.ev-table th,.ev-table td{padding:var(--kit-sp-near) var(--kit-sp-item);border-bottom:1px solid var(--kit-border);text-align:start;vertical-align:top;overflow-wrap:normal;word-break:keep-all}.ev-table thead th{background:var(--kit-table-head);color:var(--kit-muted);white-space:nowrap}.ev-table td:nth-child(3){min-width:240px}
.ev-ok{font-weight:700;white-space:nowrap}.ev-ok[data-rejected=true]::before,.ev-ok[data-pass=true]::before{content:"✓ "}.ev-ok[data-rejected=false],.ev-ok[data-pass=false]{color:var(--kit-danger)}`;

function darkVars(styles) {
  const t = resolveColorTokens({mode: 'dark'}).tokens;
  const names = [...new Set([...varsOf(styles), '--kit-canvas', '--kit-text', '--kit-soft', '--kit-card-active', '--kit-link', '--kit-muted'])].filter(v => t[v.replace(/^--kit-/, '')]);
  return `.ev-dark{color-scheme:dark;${names.map(v => `${v}:${t[v.replace(/^--kit-/, '')]}`).join(';')};--kit-shade:rgba(0,0,0,.5)}`;
}

export function renderComponentsEvidence() {
  const blueprint = {...createBlueprint('dashboard-overview'), catalogVersion: '2.6.0', colorPalette: 'static-kit'};
  const base = compile(blueprint).css;
  const styles = COMPONENTS.map(c => c.styles).join('\n');
  const css = [base, styles, PAGE_CSS, darkVars(styles)].join('\n');
  const registry = catalogRegistry(), counts = registry.counts();
  const stats = COMPONENTS.map(c => combinationStats(c.contract));
  const sum = key => stats.reduce((n, s) => n + s[key], 0);
  const runtimes = COMPONENTS.map(c => `${c.key}:${c.runtime}`).join(',');
  const wire = `(function(){var R={${runtimes}};var H=window.kitControls={};document.querySelectorAll('[data-ctl]').forEach(function(el){if(el.hasAttribute('data-preview'))return;var run=R[el.dataset.ctl];if(!run)return;var handle=run(el);var key=el.id||(el.querySelector('[id]')||{}).id;if(key)H[key]=handle;});})();`;
  const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; connect-src 'none'";
  const head = `<header><h1>컴포넌트 재료 8종 증거</h1><p class="ev-sum">Button · Input · Card · Navigation · Modal · Tabs · Tooltip · Feedback. 값은 <code>catalogRegistry()</code>와 각 재료 계약에서 이 페이지를 만들 때 읽었다. 모든 인스턴스에 실제 런타임이 붙어 있어 누르고 키보드로 움직일 수 있다.</p>
<ul class="ev-counts"><li><b>${fmt(counts.materials)}</b>재료 수(레지스트리 전체)</li><li><b>${fmt(counts.attributeCombinations)}</b>속성 조합 수(전체, 금지 포함)</li><li><b>${fmt(counts.completePresets)}</b>완성 프리셋 수(컴포넌트는 프리셋이 아님)</li><li><b>${fmt(COMPONENTS.length)}</b>이번 재료 수</li><li><b>${fmt(sum('raw'))}</b>이번 속성 조합 = 허용 ${fmt(sum('legal'))} + 금지 ${fmt(sum('rejected'))}</li></ul>
<nav class="ev-top" aria-label="재료">${COMPONENTS.map(c => `<a href="#c-${c.key}">${c.title}</a>`).join('')}<a href="#playground">동작 확인</a></nav></header>`;
  return `<!doctype html>\n<html lang="ko" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="color-scheme" content="light"><title>컴포넌트 재료 증거 · Static Kit</title><style>${css}</style></head><body><main class="ev">${head}${COMPONENTS.map(section).join('\n')}${playground()}</main><script>${wire}</script></body></html>\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const html = renderComponentsEvidence(), output = resolve(root, OUTPUT);
  mkdirSync(dirname(output), {recursive: true}); writeFileSync(output, html);
  console.log(`Rendered ${COMPONENTS.length} component materials (${html.length} bytes) → ${output}`);
}
