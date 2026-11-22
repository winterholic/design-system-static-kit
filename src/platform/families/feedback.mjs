/**
 * Modal/Feedback 목적 패밀리 5종(컴포넌트 패밀리 작업 소유): 확인, 오류, 경고, 진행, 결과 안내.
 *
 * 대화상자의 포커스 가두기·Escape·busy 중 닫기 차단(attachModal)과 알림의 role·닫기·타이머(attachFeedback)는 기반 컴포넌트 modal-dialog·feedback-message가 소유한다.
 * 이 파일은 "어떤 상황에 어떤 구조로 알리는가"(위험 확인의 버튼 순서, 오류의 재시도 자리, 진행률 막대, 결과 화면의 배치)만 가진다.
 * `display: preview`는 대화상자를 문서 안에 열린 채로 보이는 미리보기(문서·조립 예시·스크린샷용)이고, `trigger`는 버튼으로 여는 실제 모달이다.
 */
import {icon} from '../../render/icon.mjs';
import {definePurposeFamily, e} from './kit.mjs';

const MODAL = 'base-component:modal-dialog', BUTTON = 'base-component:button-control', FEEDBACK = 'base-component:feedback-message';
const PARENTS = ['slot:overlay', 'slot:main', 'slot:aside'];

// 기반 모달·피드백 CSS(2.6.0 고정)는 안쪽 버튼의 :focus-visible 규칙을 싣지 않는다. 키보드 포커스가 브라우저 기본 1px 고리로만 보이므로 패밀리가 3px 고리를 더한다.
// 기반 모달의 모바일 푸터는 column-reverse라 DOM 순서(취소 → 확인)와 화면 순서가 거꾸로다. 포커스 순서가 화면 순서를 따르도록 column으로 둔다.
const SHARED = `.pf :is(.kit-ctl-button,.kit-ctl-modal-close,.kit-ctl-feedback-close):focus-visible{outline:3px solid var(--kit-focus);outline-offset:2px}@media(max-width:640px){.pf .kit-ctl-modal-footer{flex-direction:column}}.pf-num{white-space:nowrap;font-variant-numeric:tabular-nums}.pf-fb .kit-ctl-feedback-text{flex:0 1 auto}.pf-fb{font-family:var(--kit-font);min-width:0}.pf-fb .kit-ctl-modal-title{font-family:var(--kit-heading);font-weight:var(--pf-title-weight)}.pf-fb-stack{display:grid;gap:var(--pf-gap);min-width:0}.pf-fb-text{margin:0;color:var(--kit-muted);word-break:keep-all;overflow-wrap:anywhere}.pf-fb-actions{display:flex;flex-wrap:wrap;gap:var(--pf-gap);align-items:center}.pf-fb-actions[data-align=center]{justify-content:center}@media(max-width:640px){.pf-fb-actions[data-stack]{flex-direction:column;align-items:stretch}.pf-fb-actions[data-stack] :is(.kit-ctl-button-host,.kit-ctl-button){width:100%}}`;

/** 대화상자 한 개. actions: [{label, role: confirm|cancel|other}]. */
const dialog = (ctx, {title, description, actions, role = 'dialog', placement = 'center', state = 'closed', message = '', triggerLabel, size, display}) =>
  ctx.base(MODAL, {props: {role, placement, size, state}, content: {id: ctx.id, title, description, actions, message, triggerLabel: triggerLabel ?? title, preview: display === 'preview'}});

/* ---------- 확인 ---------- */
export const feedbackConfirm = definePurposeFamily({
  id: 'purpose:feedback.confirm', group: 'feedback', sharedCss: SHARED, label: '확인 대화상자',
  purpose: '되돌리기 어려운 동작 앞에서 사용자의 확인을 받는다. 위험 확인(danger)은 취소가 첫 포커스를 받고, 일반 확인은 제목이 받는다.',
  contexts: ['any'], bases: [MODAL, BUTTON], children: [MODAL, BUTTON],
  entry: {module: 'src/platform/families/feedback.mjs', export: 'renderFeedbackConfirm'},
  variants: {tone: ['neutral', 'danger'], form: ['dialog', 'sheet'], display: ['preview', 'trigger']}, props: {size: ['small', 'medium', 'large']},
  defaults: {tone: 'neutral', form: 'dialog', display: 'preview', size: 'medium'},
  content: {title: {required: true, type: 'string'}, description: {required: true, type: 'string'}, confirmLabel: {required: true, type: 'string'}, cancelLabel: {type: 'string'}, triggerLabel: {type: 'string'}},
  forbidden: [
    {id: 'CONFIRM_SHEET_SIZE', when: {form: 'sheet', size: ['small', 'large']}, why: '하단 시트는 medium 폭만 지원한다(MODAL_SHEET_SIZE). 좁은 화면 전용 배치라 폭이 고정이다'},
  ],
  needs: {}, states: ['closed', 'open', 'busy', 'error'],
  interactions: [{on: 'trigger click', behavior: 'showModal로 열고 뒤 페이지를 inert로 만든다', runtime: 'attachModal'}, {on: 'Escape·취소', behavior: '닫고 연 버튼으로 포커스 복귀(busy 중에는 닫히지 않는다)'}, {on: 'confirm', behavior: 'busy 상태로 확인 버튼에 스피너'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: 'sheet는 화면 아래에 붙고 버튼은 한 줄. dialog는 폭이 화면 안으로 제한된다.'},
  a11y: {role: 'dialog | alertdialog(danger)', keyboard: 'Tab은 대화상자 안에서만 순환, Escape로 닫기', conditions: ['danger는 role=alertdialog, 취소 버튼 autofocus', '제목과 설명은 aria-labelledby·aria-describedby로 연결', '닫으면 연 요소로 포커스 복귀']},
  pairs: [['--kit-text', '--kit-surface', 7, 'dialog title'], ['--kit-muted', '--kit-surface', 4.5, 'dialog description']],
  parents: PARENTS, example: {variant: {tone: 'danger', form: 'dialog', display: 'preview'}, props: {size: 'medium'}, content: {title: '프로젝트를 삭제할까요?', description: '삭제하면 파일 142개와 변경 이력이 영구히 사라집니다.', confirmLabel: '삭제', cancelLabel: '취소'}},
  render(ctx) { return renderFeedbackConfirm(ctx); },
  css: ``,
});
export function renderFeedbackConfirm(ctx) {
  const {content: c, variant: v, props: p} = ctx, danger = v.tone === 'danger';
  const actions = [{label: c.cancelLabel ?? '취소', role: 'cancel'}, {label: c.confirmLabel, role: 'confirm'}];
  return `<div class="pf-fb">${dialog(ctx, {title: c.title, description: c.description, actions, role: danger ? 'alertdialog' : 'dialog', placement: v.form === 'sheet' ? 'bottom' : 'center', size: p.size, triggerLabel: c.triggerLabel, display: v.display})}</div>`;
}

/* ---------- 오류 ---------- */
export const feedbackError = definePurposeFamily({
  id: 'purpose:feedback.error', group: 'feedback', sharedCss: SHARED, label: '오류 안내',
  purpose: '실패를 원인과 다음 행동(재시도·문의)과 함께 알린다. 화면 위쪽 배너나 대화상자의 오류 상태로 낸다.',
  contexts: ['any'], bases: [FEEDBACK, MODAL, BUTTON], children: [FEEDBACK, MODAL, BUTTON],
  entry: {module: 'src/platform/families/feedback.mjs', export: 'renderFeedbackError'},
  variants: {form: ['banner', 'dialog'], retry: ['button', 'none']}, props: {size: ['small', 'medium', 'large']},
  defaults: {form: 'banner', retry: 'button', size: 'medium'},
  content: {title: {required: true, type: 'string'}, message: {required: true, type: 'string'}, retryLabel: {type: 'string'}, detail: {type: 'string'}},
  forbidden: [
    {id: 'ERROR_DIALOG_NO_RETRY', when: {form: 'dialog', retry: 'none'}, why: '오류 대화상자는 확인 버튼 하나뿐이면 사용자가 다음 행동을 알 수 없다(재시도 버튼을 둔다)'},
  ],
  needs: {}, states: ['visible', 'dismissed', 'error'],
  interactions: [{on: 'dismiss click·Escape', behavior: '배너를 숨기고 포커스를 부모로 옮긴다', runtime: 'attachFeedback'}, {on: 'retry click', behavior: '재시도 동작(기반 버튼)'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '배너는 화면 폭을 채우고 동작 버튼은 아래로 내려간다. 메시지는 keep-all로 줄바꿈한다.'},
  a11y: {role: 'alert', keyboard: '재시도·닫기 버튼 Tab', conditions: ['오류는 role=alert로 즉시 낭독', '오류 의미는 아이콘 모양·"오류:" 숨은 글·색으로 함께 전달', '원인과 해결 행동을 문장으로 쓴다']},
  pairs: [['--kit-danger', '--kit-surface', 4.5, 'error icon'], ['--kit-text', '--kit-surface', 7, 'error title']],
  parents: ['slot:main', 'slot:header', 'slot:overlay'], example: {variant: {form: 'banner', retry: 'button'}, props: {size: 'medium'}, content: {title: '저장하지 못했습니다', message: '네트워크 연결이 끊겨 변경 내용을 보내지 못했습니다. 연결을 확인한 뒤 다시 시도하세요.', retryLabel: '다시 시도'}},
  render(ctx) { return renderFeedbackError(ctx); },
  css: ``,
});
export function renderFeedbackError(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (v.form === 'banner') {
    return `<div class="pf-fb">${ctx.base(FEEDBACK, {props: {placement: 'banner', tone: 'danger', size: p.size, dismiss: 'button', action: v.retry === 'button' ? 'button' : 'none'}, content: {id: ctx.id, title: c.title, message: c.message, ...(v.retry === 'button' ? {actionLabel: c.retryLabel ?? '다시 시도'} : {})}})}</div>`;
  }
  const actions = [{label: '닫기', role: 'cancel'}, {label: c.retryLabel ?? '다시 시도', role: 'confirm'}];
  return `<div class="pf-fb">${dialog(ctx, {title: c.title, description: c.detail ?? '', actions, state: 'error', message: c.message, size: p.size, display: 'preview'})}</div>`;
}

/* ---------- 경고 ---------- */
export const feedbackWarning = definePurposeFamily({
  id: 'purpose:feedback.warning', group: 'feedback', sharedCss: SHARED, label: '경고 안내',
  purpose: '실패는 아니지만 확인이 필요한 상황(만료 임박, 용량 부족, 되돌릴 수 없는 변경 예고)을 알린다. 인라인 안내나 확인이 필요한 대화상자로 낸다.',
  contexts: ['any'], bases: [FEEDBACK, MODAL, BUTTON], children: [FEEDBACK, MODAL, BUTTON],
  entry: {module: 'src/platform/families/feedback.mjs', export: 'renderFeedbackWarning'},
  variants: {form: ['inline', 'dialog'], ack: ['none', 'button']}, props: {size: ['small', 'medium', 'large']},
  defaults: {form: 'inline', ack: 'button', size: 'medium'},
  content: {title: {required: true, type: 'string'}, message: {required: true, type: 'string'}, ackLabel: {type: 'string'}, cancelLabel: {type: 'string'}},
  forbidden: [
    {id: 'WARNING_DIALOG_NO_ACK', when: {form: 'dialog', ack: 'none'}, why: '경고 대화상자는 사용자가 확인해야 닫히므로 확인 동작이 없으면 닫을 방법이 취소뿐이다'},
  ],
  needs: {}, states: ['visible', 'dismissed', 'closed', 'open'],
  interactions: [{on: 'ack click', behavior: '경고를 확인하고 닫는다(기반 버튼·dismiss)', runtime: 'attachFeedback'}, {on: 'dialog confirm·cancel', behavior: '계속·취소 선택', runtime: 'attachModal'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '인라인 안내는 한 줄이 모자라면 버튼이 아래로 내려간다. 메시지 폭은 부모를 따른다.'},
  a11y: {role: 'status(inline) | alertdialog(dialog)', keyboard: '확인·닫기 버튼 Tab', conditions: ['경고는 삼각형 아이콘과 "주의:" 숨은 글로 전달(노랑만으로 구분하지 않는다)', '경고색 글자는 어두운 단계(대비 4.5:1)', '확인이 필요한 경고는 대화상자로 낸다']},
  pairs: [['--kit-warning', '--kit-surface', 4.5, 'warning icon'], ['--kit-text', '--kit-surface', 7, 'warning title']],
  parents: ['slot:main', 'slot:header', 'slot:overlay'], example: {variant: {form: 'inline', ack: 'button'}, props: {size: 'medium'}, content: {title: '저장 공간이 거의 찼습니다', message: '남은 용량이 5%입니다. 새 파일을 올리기 전에 정리하거나 용량을 늘려 주세요.', ackLabel: '알겠어요'}},
  render(ctx) { return renderFeedbackWarning(ctx); },
  css: ``,
});
export function renderFeedbackWarning(ctx) {
  const {content: c, variant: v, props: p} = ctx;
  if (v.form === 'inline') {
    return `<div class="pf-fb">${ctx.base(FEEDBACK, {props: {placement: 'inline', tone: 'warning', size: p.size, dismiss: v.ack === 'button' ? 'button' : 'none', action: 'none'}, content: {id: ctx.id, title: c.title, message: c.message, dismissLabel: c.ackLabel ?? '확인'}})}</div>`;
  }
  const actions = [{label: c.cancelLabel ?? '취소', role: 'cancel'}, {label: c.ackLabel ?? '계속', role: 'confirm'}];
  return `<div class="pf-fb">${dialog(ctx, {title: c.title, description: c.message, actions, role: 'alertdialog', size: p.size, display: 'preview'})}</div>`;
}

/* ---------- 진행 ---------- */
export const feedbackProgress = definePurposeFamily({
  id: 'purpose:feedback.progress', group: 'feedback', sharedCss: SHARED, label: '진행 안내',
  purpose: '시간이 걸리는 작업(업로드, 가져오기, 배포)의 진행을 막대·단계 목록·취소와 함께 보인다. 사용자가 언제 끝나는지와 취소할 수 있는지를 안다.',
  contexts: ['any'], bases: [FEEDBACK, BUTTON], children: [FEEDBACK, BUTTON],
  entry: {module: 'src/platform/families/feedback.mjs', export: 'renderFeedbackProgress'},
  variants: {kind: ['determinate', 'indeterminate', 'steps'], cancel: ['button', 'none']}, props: {size: ['small', 'medium', 'large']},
  defaults: {kind: 'determinate', cancel: 'button', size: 'medium'},
  content: {title: {required: true, type: 'string'}, message: {type: 'string'}, value: {type: 'number 0~100 (determinate)'}, steps: {type: '{label, status: done|current|todo}[] (steps)'}, cancelLabel: {type: 'string'}},
  forbidden: [],
  needs: {}, states: ['pending', 'done'],
  interactions: [{on: 'progress', behavior: 'native <progress>의 value 갱신(앱이 value를 바꾼다), indeterminate는 value 없음'}, {on: 'cancel click', behavior: '진행 취소(기반 버튼)'}],
  responsive: {strategy: 'container', breakpoints: [], behavior: '막대는 컨테이너 폭을 채운다. 단계 목록은 세로로 쌓인다. 퍼센트 글자는 줄바꿈하지 않는다.'},
  a11y: {role: 'progressbar(native progress) + status', keyboard: '취소 버튼 Tab', conditions: ['<progress>에 접근 가능한 이름(aria-labelledby)', '진행률 숫자를 글자로도 제공', '단계 상태는 아이콘·글자(완료·진행 중·대기)로 전달', 'indeterminate는 aria-busy']},
  pairs: [['--kit-action', '--kit-surface', 3, 'progress bar'], ['--kit-text', '--kit-surface', 7, 'progress title'], ['--kit-muted', '--kit-surface', 4.5, 'progress message']],
  parents: ['slot:main', 'slot:overlay', 'slot:aside'], example: {variant: {kind: 'determinate', cancel: 'button'}, props: {size: 'medium'}, content: {title: '파일 업로드 중', message: '12개 중 7개 완료', value: 58}},
  render(ctx) { return renderFeedbackProgress(ctx); },
  css: `.pf-progress{display:grid;gap:var(--pf-gap);padding:var(--pf-pad);border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-surface);color:var(--kit-text)}.pf-progress-head{display:flex;justify-content:space-between;align-items:baseline;gap:var(--kit-sp-near)}.pf-progress-head h3{margin:0;font-family:var(--kit-heading);font-size:var(--kit-t-sub);font-weight:var(--pf-title-weight)}.pf-progress progress{appearance:none;display:block;width:100%;height:10px;border:0;border-radius:999px;overflow:hidden;background:var(--kit-card-active);color:var(--kit-action)}.pf-progress progress::-webkit-progress-bar{background:var(--kit-card-active)}.pf-progress progress::-webkit-progress-value{background:var(--kit-action);border-radius:999px}.pf-progress progress::-moz-progress-bar{background:var(--kit-action)}.pf-progress progress:indeterminate{background:linear-gradient(90deg,var(--kit-card-active) 0 30%,var(--kit-action) 30% 60%,var(--kit-card-active) 60%) 0 0/200% 100%;animation:pf-indet 1.2s linear infinite}@keyframes pf-indet{to{background-position:-200% 0}}@media(prefers-reduced-motion:reduce){.pf-progress progress:indeterminate{animation:none}}.pf-steps{list-style:none;margin:0;padding:0;display:grid;gap:var(--kit-sp-near)}.pf-steps li{display:flex;gap:var(--kit-sp-near);align-items:center;font-size:var(--kit-t-small)}.pf-steps .kit-icon{flex:none;width:18px;height:18px}.pf-steps [data-status=done] .kit-icon{color:var(--kit-success)}.pf-steps [data-status=current]{font-weight:700}.pf-steps [data-status=current] .kit-icon{color:var(--kit-action)}.pf-steps [data-status=todo]{color:var(--kit-muted)}`,
});
export function renderFeedbackProgress(ctx) {
  const {content: c, variant: v, props: p} = ctx, tid = ctx.uid('title');
  let bar = '';
  if (v.kind === 'steps') {
    if (!Array.isArray(c.steps) || c.steps.length < 2) throw new TypeError('단계 진행은 steps가 2개 이상입니다');
    const mark = {done: ['check-circle', '완료'], current: ['refresh', '진행 중'], todo: ['clock', '대기']};
    bar = `<ol class="pf-steps">${c.steps.map(s => `<li data-status="${e(s.status)}"${s.status === 'current' ? ' aria-current="step"' : ''}>${icon(mark[s.status][0])}<span>${e(s.label)}</span><span class="kit-ctl-sr"> ${mark[s.status][1]}</span></li>`).join('')}</ol>`;
  } else if (v.kind === 'determinate') {
    if (typeof c.value !== 'number' || c.value < 0 || c.value > 100) throw new TypeError('진행률은 0~100 숫자입니다');
    bar = `<progress max="100" value="${c.value}" aria-labelledby="${e(tid)}">${c.value}%</progress>`;
  } else bar = `<progress aria-labelledby="${e(tid)}" aria-busy="true">진행 중</progress>`;
  const pct = v.kind === 'determinate' ? `<span class="pf-num">${c.value}%</span>` : '';
  const cancel = v.cancel === 'button' ? `<div class="pf-fb-actions">${ctx.button('secondary', {props: {size: p.size === 'large' ? 'medium' : 'small'}, content: {label: c.cancelLabel ?? '취소'}})}</div>` : '';
  // role=status는 기반 feedback(pending) 배너가 맡는 자리이므로 여기서는 진행 요약 글을 같은 영역 안에 둔다.
  return `<div class="pf-fb"><section class="pf-progress" aria-live="polite"><div class="pf-progress-head"><h3 id="${e(tid)}">${e(c.title)}</h3>${pct}</div>${bar}${c.message ? `<p class="pf-fb-text">${e(c.message)}</p>` : ''}${cancel}</section></div>`;
}

/* ---------- 결과 안내 ---------- */
const OUTCOME = {success: ['check-circle', '완료', 'success'], failure: ['x-circle', '실패', 'danger'], pending: ['clock', '확인 중', 'info']};
export const feedbackResult = definePurposeFamily({
  id: 'purpose:feedback.result', group: 'feedback', sharedCss: SHARED, label: '결과 안내',
  purpose: '작업이 끝난 뒤 결과(완료, 실패, 확인 중)를 한 화면 분량으로 알리고 다음 행동을 둔다. 결제 완료, 가입 완료, 신청 접수 화면에서 쓴다.',
  contexts: ['any'], bases: [BUTTON], children: [BUTTON],
  entry: {module: 'src/platform/families/feedback.mjs', export: 'renderFeedbackResult'},
  variants: {outcome: ['success', 'failure', 'pending'], layout: ['page', 'inline']}, props: {size: ['medium', 'large']},
  defaults: {outcome: 'success', layout: 'page', size: 'large'},
  content: {title: {required: true, type: 'string'}, message: {required: true, type: 'string'}, details: {type: '{label, value}[]'}, primaryLabel: {type: 'string'}, secondaryLabel: {type: 'string'}},
  forbidden: [],
  needs: {}, states: ['success', 'failure', 'pending'],
  interactions: [{on: 'primary click', behavior: '다음 행동으로 이동(기반 버튼)'}, {on: 'mount', behavior: '결과 영역이 role=status(실패는 alert)로 한 번 낭독된다'}],
  responsive: {strategy: 'viewport', breakpoints: ['640px'], behavior: '가운데 정렬한 한 열 구성. 640px 이하에서 버튼은 세로로 쌓이고 전체 폭이 된다. 상세 목록은 값을 줄바꿈 없이 오른쪽에 둔다.'},
  a11y: {role: 'status | alert(failure)', keyboard: '버튼 Tab', conditions: ['결과는 아이콘 모양·제목 글자·색으로 함께 전달', '제목은 h2(페이지) 또는 h3(인라인)', '실패는 원인과 다음 행동을 문장으로 쓴다']},
  pairs: [['--kit-success', '--kit-surface', 4.5, 'result success'], ['--kit-danger', '--kit-surface', 4.5, 'result failure'], ['--kit-info', '--kit-surface', 4.5, 'result pending'], ['--kit-text', '--kit-surface', 7, 'result title'], ['--kit-muted', '--kit-surface', 4.5, 'result message']],
  parents: ['slot:main', 'slot:overlay'], example: {variant: {outcome: 'success', layout: 'page'}, props: {size: 'large'}, content: {title: '결제가 완료되었습니다', message: '영수증을 이메일로 보냈습니다. 주문 내역에서 배송 상태를 확인할 수 있습니다.', details: [{label: '주문번호', value: 'A-20261122-0042'}, {label: '결제 금액', value: '₩189,000'}], primaryLabel: '주문 내역 보기', secondaryLabel: '쇼핑 계속하기'}},
  render(ctx) { return renderFeedbackResult(ctx); },
  css: `.pf-result{display:grid;justify-items:center;gap:var(--pf-gap);padding:var(--kit-sp-inset-l);text-align:center;border:var(--pf-border);border-radius:var(--kit-radius);background:var(--pf-surface);color:var(--kit-text)}.pf-result[data-layout=inline]{padding:var(--pf-pad);justify-items:start;text-align:start}@media(max-width:640px){.pf-result{padding:var(--pf-pad)}}.pf-result-icon{display:grid;place-items:center;width:56px;height:56px;border-radius:50%;background:var(--kit-soft)}.pf-result-icon .kit-icon{width:32px;height:32px}.pf-result[data-outcome=success] .pf-result-icon{color:var(--kit-success)}.pf-result[data-outcome=failure] .pf-result-icon{color:var(--kit-danger)}.pf-result[data-outcome=pending] .pf-result-icon{color:var(--kit-info)}.pf-result h2,.pf-result h3{margin:0;font-family:var(--kit-heading);font-size:var(--kit-t-heading);font-weight:var(--pf-title-weight);line-height:1.25;word-break:keep-all;overflow-wrap:anywhere}.pf-result .pf-fb-text{max-width:42ch}.pf-result-details{display:grid;gap:var(--kit-sp-near);width:min(100%,24rem);margin:0;padding-top:var(--kit-sp-near);border-top:var(--pf-rule);text-align:start}.pf-result-details div{display:flex;justify-content:space-between;gap:var(--kit-sp-item)}.pf-result-details dt{color:var(--kit-muted);font-size:var(--kit-t-small)}.pf-result-details dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}`,
});
export function renderFeedbackResult(ctx) {
  const {content: c, variant: v, props: p} = ctx, [ic, word] = OUTCOME[v.outcome], tag = v.layout === 'page' ? 'h2' : 'h3';
  const details = Array.isArray(c.details) && c.details.length ? `<dl class="pf-result-details">${c.details.map(d => `<div><dt>${e(d.label)}</dt><dd>${e(d.value)}</dd></div>`).join('')}</dl>` : '';
  const size = p.size;
  const btns = `${c.primaryLabel ? ctx.button('primary', {props: {size}, content: {label: c.primaryLabel}}) : ''}${c.secondaryLabel ? ctx.button('secondary', {props: {size}, content: {label: c.secondaryLabel}}) : ''}`;
  return `<div class="pf-fb"><section class="pf-result" role="${v.outcome === 'failure' ? 'alert' : 'status'}" data-outcome="${v.outcome}" data-layout="${v.layout}"><span class="pf-result-icon" aria-hidden="true">${icon(ic)}</span><${tag}><span class="kit-ctl-sr">${word}: </span>${e(c.title)}</${tag}><p class="pf-fb-text">${e(c.message)}</p>${details}${btns ? `<div class="pf-fb-actions" data-align="center" data-stack>${btns}</div>` : ''}</section></div>`;
}

export const FEEDBACK_FAMILIES = Object.freeze([feedbackConfirm, feedbackError, feedbackWarning, feedbackProgress, feedbackResult]);
