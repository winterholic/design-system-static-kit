import {CONTROL_SIZES, CONTROL_SIZE_NAMES} from './typography.mjs';
import {TOKEN} from '../spacing.mjs';

export const SIZES = CONTROL_SIZE_NAMES;

const px = n => (n < 0 ? `- ${-n}px` : `+ ${n}px`);

/** 크기 이름 → CONTROL_SIZES와 기존 간격 토큰에서 읽은 컨트롤 치수 변수. */
export function sizeVars(name) {
  const c = CONTROL_SIZES[name];
  if (!c) throw new RangeError('unknown control size: ' + name);
  return {height: c.step === 0 ? 'var(--kit-control)' : `calc(var(--kit-control) ${px(c.step)})`, padX: `var(${TOKEN[c.pad]})`, gap: `var(${TOKEN[c.gap]})`, font: `var(--kit-t-${c.role})`, icon: `${c.icon}px`};
}

export const sizeCSS = scope => SIZES.map(n => { const v = sizeVars(n); return `${scope}[data-size=${n}]{--ctl-h:${v.height};--ctl-px:${v.padX};--ctl-gap:${v.gap};--ctl-font:${v.font};--ctl-icon:${v.icon}}`; }).join('');

/** 프로파일 기본 크기. 명시적 data-size가 있는 재료 컨트롤은 기존 선택자로 유지한다. */
export function defaultControlSizeCSS(name) {
  const v = sizeVars(name);
  const legacyButton = '.kit-button:not([data-size]):not([data-variant=ghost])';
  const legacyFields = '.kit-field :is(input,select,textarea):not([data-size])';
  return `${legacyButton},${legacyFields}{--ctl-h:${v.height};--ctl-px:${v.padX};--ctl-gap:${v.gap};--ctl-font:${v.font};--ctl-icon:${v.icon}}${legacyButton}{min-height:var(--ctl-h);padding-inline:var(--ctl-px);gap:var(--ctl-gap);font-size:var(--ctl-font)}${legacyFields}{min-height:var(--ctl-h);padding-inline:var(--ctl-px);font-size:var(--ctl-font)}`;
}
