import {defineContract, resolveProps, sizeCSS, baseStyles, focusRing, componentMaterial, e, SIZES, SHAPES, SAFE_ID} from './control-kit.mjs';
import {renderButton} from './button.mjs';
import {icon} from '../render/util.mjs';

/** Feedback: 외형(표면 처리)·모양·크기·기능(배치·닫기·동작·자동 닫힘)·상태(표시·진행 중·닫힘)·맥락(의도 tone)을 따로 둔다.
 *  tone은 색만이 아니라 아이콘 모양·숨은 접두 글·live region 역할로도 구분한다. */
export const feedbackContract = defineContract({
  id: 'component:feedback-message', label: 'Feedback',
  inputFields: ['id', 'message', 'title', 'actionLabel', 'dismissLabel'],
  axes: {
    appearance: ['soft', 'outline', 'solid', 'plain'], shape: SHAPES, size: SIZES,
    placement: ['inline', 'banner', 'toast'], dismiss: ['none', 'button'], action: ['none', 'button'], autoDismiss: ['off', 'timed'],
    tone: ['info', 'success', 'warning', 'danger'], state: ['visible', 'pending', 'dismissed'],
  },
  concepts: {appearance: ['appearance'], shape: ['shape'], size: ['size'], function: ['placement', 'dismiss', 'action', 'autoDismiss'], state: ['state'], context: ['tone']},
  defaults: {appearance: 'soft', shape: 'soft', size: 'medium', placement: 'inline', dismiss: 'none', action: 'none', autoDismiss: 'off', tone: 'info', state: 'visible'},
  states: ['visible', 'pending', 'dismissed', 'hover', 'focus', 'paused'],
  transitions: [
    {from: 'visible', to: 'dismissed', trigger: 'dismiss button | Escape while focused | timer (timed toast)'}, {from: 'visible', to: 'paused', trigger: 'pointer enter | focus within (timer pauses)'},
    {from: 'paused', to: 'visible', trigger: 'pointer leave | focus leaves (timer restarts)'}, {from: 'pending', to: 'visible', trigger: 'app re-renders with the result tone'},
  ],
  forbidden: [
    {id: 'FB_PLAIN_TOAST', when: {appearance: 'plain', placement: 'toast'}, why: 'toast는 페이지 위에 떠 있으므로 컨테이너가 없는 plain은 뒤 글자와 겹쳐 읽히지 않는다'},
    {id: 'FB_BANNER_PILL', when: {placement: 'banner', shape: 'pill'}, why: '전폭 띠에 999px 모서리를 주면 양 끝이 글을 자르는 알약이 된다'},
    {id: 'FB_TOAST_DANGER_TIMED', when: {placement: 'toast', tone: 'danger', autoDismiss: 'timed'}, why: '오류는 읽고 대응할 때까지 남아야 한다: 저절로 사라지는 오류는 놓친 사용자가 원인을 알 수 없다'},
    {id: 'FB_TOAST_ACTION_TIMED', when: {placement: 'toast', action: 'button', autoDismiss: 'timed'}, why: '동작 버튼이 있는 toast가 사라지면 누를 기회를 잃는다(WCAG 2.2.1)'},
    {id: 'FB_TOAST_STUCK', when: {placement: 'toast', dismiss: 'none', autoDismiss: 'off'}, why: '닫는 길이 없는 toast는 화면에 영원히 남는다'},
    {id: 'FB_TIMED_NOT_TOAST', when: {placement: ['inline', 'banner'], autoDismiss: 'timed'}, why: '문서 흐름 안의 메시지가 저절로 사라지면 아래 내용이 끌려 올라와 읽던 자리가 밀린다'},
    {id: 'FB_PENDING_DISMISS', when: {state: 'pending', dismiss: 'button'}, why: '진행 중인 일의 알림을 닫으면 결과를 알릴 곳이 없어진다'},
    {id: 'FB_PENDING_TONE', when: {state: 'pending', tone: ['success', 'warning', 'danger']}, why: '진행 중에는 결과가 없다: 성공·주의·오류 의미를 미리 줄 수 없다'},
    {id: 'FB_PENDING_TIMED', when: {state: 'pending', autoDismiss: 'timed'}, why: '끝나지 않은 일의 알림이 시간으로 사라지면 진행을 놓친다'},
    {id: 'FB_DISMISSED_UNREACHABLE', when: {state: 'dismissed', dismiss: 'none', autoDismiss: 'off'}, why: '닫는 방법이 없는데 닫힌 상태가 되는 경로가 없다'},
  ],
  unsupported: ['toast queue and stacking manager', 'swipe to dismiss', 'progress percentage (use progress)'],
  pairs: [
    ['--kit-text', '--kit-soft', 7, 'soft info'], ['--kit-text', '--kit-danger-soft', 7, 'soft danger'], ['--kit-text', 'mix(--kit-success 10%, --kit-surface)', 7, 'soft success'],
    ['--kit-text', 'mix(--kit-warning 10%, --kit-surface)', 7, 'soft warning'], ['--kit-surface', '--kit-info', 4.5, 'solid info'], ['--kit-surface', '--kit-success', 4.5, 'solid success'],
    ['--kit-surface', '--kit-warning', 4.5, 'solid warning'], ['--kit-surface', '--kit-danger', 4.5, 'solid danger'], ['--kit-info', '--kit-surface', 4.5, 'plain·outline info'],
    ['--kit-success', '--kit-surface', 4.5, 'plain·outline success'], ['--kit-warning', '--kit-surface', 4.5, 'plain·outline warning'], ['--kit-danger', '--kit-surface', 4.5, 'plain·outline danger'], ['--kit-focus', '--kit-surface', 3, 'focus ring'],
  ],
});

export const FEEDBACK_TONES = Object.freeze({info: {icon: 'info', word: '안내', role: 'status'}, success: {icon: 'check-circle', word: '성공', role: 'status'}, warning: {icon: 'alert-triangle', word: '주의', role: 'status'}, danger: {icon: 'alert-circle', word: '오류', role: 'alert'}});
export const FEEDBACK_DURATION_MS = 8000;

export function renderFeedback(input) {
  const {id, message, title = '', actionLabel = '', dismissLabel = '닫기'} = input ?? {};
  const p = resolveProps(feedbackContract, input);
  if (!SAFE_ID.test(id ?? '')) throw new TypeError('Feedback requires a lowercase kebab-case id');
  if (!String(message ?? '').trim()) throw new TypeError('FEEDBACK_MESSAGE: feedback needs message text');
  if (p.action === 'button' && !String(actionLabel).trim()) throw new TypeError('FEEDBACK_ACTION: action=button needs actionLabel');
  if (p.action === 'none' && actionLabel) throw new TypeError('FEEDBACK_ACTION: actionLabel needs action=button');
  const tone = FEEDBACK_TONES[p.tone], pending = p.state === 'pending';
  const lead = pending ? '<span class="kit-ctl-spinner" aria-hidden="true"></span>' : icon(tone.icon);
  const word = pending ? '진행 중' : tone.word;
  const act = p.action === 'button' ? `<span class="kit-ctl-feedback-action">${renderButton({label: actionLabel, appearance: 'outline', tone: 'neutral', size: p.size === 'large' ? 'small' : 'compact'})}</span>` : '';
  const dismiss = p.dismiss === 'button' ? `<button type="button" class="kit-ctl-feedback-close" data-dismiss aria-label="${e(dismissLabel)}">${icon('x')}</button>` : '';
  const attrs = Object.entries(p).map(([k, v]) => `data-${k}="${v}"`).join(' ');
  return `<div class="kit-ctl-feedback" data-ctl="feedback" id="${e(id)}" role="${tone.role}" ${attrs}${pending ? ' aria-busy="true"' : ''}${p.autoDismiss === 'timed' ? ` data-duration="${FEEDBACK_DURATION_MS}"` : ''}${p.state === 'dismissed' ? ' hidden' : ''}><span class="kit-ctl-feedback-icon">${lead}</span><div class="kit-ctl-feedback-body"><p class="kit-ctl-feedback-text">${title ? `<strong>${e(title)}</strong> ` : ''}<span class="kit-ctl-sr">${word}: </span>${e(message)}</p>${act}</div>${dismiss}</div>`;
}

/** 브라우저에서 붙는 동작. 닫기 버튼·Escape로 숨기며 포커스를 옮기고, timed toast는 포인터·포커스 중에 타이머를 멈췄다가 남은 시간으로 이어간다. */
export function attachFeedback(root, {onDismiss, onAction} = {}) {
  const doc = root.ownerDocument, view = doc.defaultView, close = root.querySelector('[data-dismiss]'), action = root.querySelector('.kit-ctl-feedback-action button');
  let remaining = Number(root.dataset.duration) || 0, started = 0, timer = 0;
  const dismiss = () => {
    view.clearTimeout(timer);
    const hadFocus = root.contains(doc.activeElement);
    root.hidden = true; root.dataset.state = 'dismissed';
    if (hadFocus) {
      const target = (root.dataset.returnFocus && doc.getElementById(root.dataset.returnFocus)) || root.parentElement;
      if (target) { if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.setAttribute('tabindex', '-1'); target.focus(); }
    }
    if (typeof onDismiss === 'function') onDismiss({id: root.id});
  };
  const run = () => { if (remaining > 0 && !root.hidden) { started = view.performance.now(); timer = view.setTimeout(dismiss, remaining); } };
  const pause = () => { if (remaining > 0 && timer) { view.clearTimeout(timer); timer = 0; remaining = Math.max(0, remaining - (view.performance.now() - started)); root.dataset.paused = 'true'; } };
  const resume = () => { if (remaining > 0 && !timer && !root.hidden) { root.removeAttribute('data-paused'); run(); } };
  if (close) close.addEventListener('click', dismiss);
  if (action) action.addEventListener('click', () => { if (typeof onAction === 'function') onAction({id: root.id}); });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && (close || remaining > 0) && !root.hidden) { event.stopPropagation(); dismiss(); } });
  if (remaining > 0) {
    root.addEventListener('pointerenter', pause); root.addEventListener('pointerleave', () => { if (!root.contains(doc.activeElement)) resume(); });
    root.addEventListener('focusin', pause); root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) resume(); });
    run();
  }
  return {dismiss};
}
export const feedbackRuntime = attachFeedback.toString();

export const feedbackStyles = `${baseStyles}${sizeCSS('.kit-ctl-feedback')}
.kit-ctl-feedback{--f-ink:var(--kit-info);--f-bg:var(--kit-soft);position:relative;display:flex;align-items:flex-start;gap:var(--ctl-gap);box-sizing:border-box;min-width:0;max-width:100%;padding:var(--ctl-gap) var(--ctl-px);border-radius:var(--kit-radius);background:var(--f-bg);color:var(--kit-text);font-size:var(--ctl-font);line-height:1.45}
.kit-ctl-feedback[hidden]{display:none}
.kit-ctl-feedback[data-tone=info]{--f-ink:var(--kit-info);--f-bg:var(--kit-soft)}
.kit-ctl-feedback[data-tone=success]{--f-ink:var(--kit-success);--f-bg:color-mix(in srgb,var(--kit-success) 10%,var(--kit-surface))}
.kit-ctl-feedback[data-tone=warning]{--f-ink:var(--kit-warning);--f-bg:color-mix(in srgb,var(--kit-warning) 10%,var(--kit-surface))}
.kit-ctl-feedback[data-tone=danger]{--f-ink:var(--kit-danger);--f-bg:var(--kit-danger-soft)}
.kit-ctl-feedback[data-shape=square]{border-radius:0}.kit-ctl-feedback[data-shape=pill]{border-radius:999px}
.kit-ctl-feedback[data-appearance=soft]{border-inline-start:var(--kit-sp-tight) solid var(--f-ink)}
.kit-ctl-feedback[data-appearance=outline]{background:var(--kit-surface);border:1px solid var(--f-ink)}
.kit-ctl-feedback[data-appearance=solid]{background:var(--f-ink);color:var(--kit-surface)}
.kit-ctl-feedback[data-appearance=plain]{background:transparent;padding-inline:0}
.kit-ctl-feedback-icon{display:inline-flex;flex:none;align-items:center;min-height:calc(var(--ctl-font) * 1.45);color:var(--f-ink)}.kit-ctl-feedback[data-appearance=solid] .kit-ctl-feedback-icon{color:inherit}
.kit-ctl-feedback .kit-icon{width:var(--ctl-icon);height:var(--ctl-icon)}
.kit-ctl-feedback-body{display:flex;flex:1;flex-wrap:wrap;align-items:center;gap:var(--ctl-gap);min-width:0}
.kit-ctl-feedback-text{flex:1 1 12ch;margin:0;word-break:keep-all;overflow-wrap:anywhere}
.kit-ctl-feedback-close{display:inline-grid;place-items:center;flex:none;width:calc(var(--ctl-icon) + var(--kit-sp-near));height:calc(var(--ctl-icon) + var(--kit-sp-near));margin-block:calc(var(--kit-sp-tight) * -1);padding:0;border:0;border-radius:var(--kit-radius);background:transparent;color:inherit;cursor:pointer}
.kit-ctl-feedback-close:hover{box-shadow:inset 0 0 0 1px currentColor}${focusRing('.kit-ctl-feedback-close', '0')}
.kit-ctl-feedback[data-appearance=solid] .kit-ctl-button{background:var(--kit-surface);color:var(--kit-text);border-color:var(--kit-surface)}
.kit-ctl-feedback[data-placement=banner]{border-radius:0;width:100%}
.kit-ctl-feedback[data-placement=toast]{max-width:min(calc(var(--kit-control) * 9),100%);box-shadow:var(--kit-shadow-hover)}
.kit-ctl-feedback[data-paused=true]{outline:2px dashed var(--f-ink);outline-offset:2px}
.kit-ctl-feedback[data-state=pending] .kit-ctl-spinner{width:var(--ctl-icon);height:var(--ctl-icon)}
@media(max-width:640px){.kit-ctl-feedback[data-placement=toast]{max-width:100%}.kit-ctl-feedback-body{flex-direction:column;align-items:flex-start}}`.replace(/\n/g, '');

export const feedbackExamples = Object.freeze([
  {id: 'ex-fb-info', message: '새 버전이 준비되었습니다. 다음 접속부터 적용됩니다.', title: '업데이트'},
  {id: 'ex-fb-ok', tone: 'success', appearance: 'outline', message: '변경 사항을 저장했습니다.', dismiss: 'button'},
  {id: 'ex-fb-warn', tone: 'warning', appearance: 'solid', placement: 'banner', message: '결제 수단이 곧 만료됩니다.', action: 'button', actionLabel: '수정'},
  {id: 'ex-fb-err', tone: 'danger', message: '연결이 끊겼습니다. 네트워크를 확인하세요.', dismiss: 'button', action: 'button', actionLabel: '다시 시도'},
  {id: 'ex-fb-wait', state: 'pending', appearance: 'plain', message: '파일을 올리는 중입니다.'},
  {id: 'ex-fb-toast', tone: 'success', placement: 'toast', autoDismiss: 'timed', dismiss: 'button', message: '링크를 복사했습니다.'},
]);

export const feedbackMaterial = componentMaterial(feedbackContract, {
  module: 'src/materials/feedback.mjs', renderExport: 'renderFeedback', key: 'feedback-message', styles: feedbackStyles, examples: feedbackExamples.map(x => ({...x})),
  responsive: {strategy: 'viewport', breakpoints: ['640px'], note: 'toast는 min(컨트롤 높이 × 9, 100%) 폭이고 640px 이하에서 전폭이 된다. 글은 keep-all과 overflow-wrap으로 줄바꿈한다.'},
  a11y: {rules: ['R05', 'R18'], role: 'status (info, success, warning) | alert (danger); aria-busy while pending; tone also carried by icon shape and hidden prefix text', keyboard: 'Escape dismisses a dismissible or timed message that has focus; focus moves to returnFocus or the container when the focused message disappears'},
  validation: {rules: ['R18'], codes: ['FEEDBACK_MESSAGE', 'FEEDBACK_ACTION', ...feedbackContract.forbidden.map(r => r.id)]},
  evidence: ['tests/material-components.test.mjs:42'], ext: {group: 'feedback', required: ['id', 'message']}, dependencies: ['component:button-control'],
});
