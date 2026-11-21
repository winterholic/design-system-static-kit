import {axisVars, coreCSS, tailCSS} from './base.mjs';
import {typeRev, refineTracking, fitCSS, wrapCSS} from '../typography.mjs';
import {shellCSS} from './shells.mjs';
import {chunks} from './chunks.mjs';
import {polish, polishCore} from './polish.mjs';
import {nodeTypes} from '../catalog.mjs';
import {contractCSS} from '../spacing.mjs';
import {flowCSS, flowUsage, layoutRev, refineLayout, layoutContractCSS} from '../layout.mjs';
import {compositionCSS} from '../composition.mjs';
import {headerDesignCSS} from '../header-design.mjs';
import {expressionApplies} from '../catalog/expression.mjs';
import {expressionCSS} from './expression.mjs';
import {colorTokenCSS} from '../color-tokens.mjs';
import {chartExtensionCSS} from './chart-extension.mjs';
import {atLeast} from '../catalog/expression.mjs';
import {selectStyles} from '../materials/select.mjs';
import {tableStyles} from '../materials/table.mjs';
import {buttonStyles} from '../materials/button.mjs';
import {inputStyles} from '../materials/input.mjs';
import {cardStyles} from '../materials/card.mjs';
import {navigationStyles} from '../materials/navigation.mjs';
import {modalStyles} from '../materials/modal.mjs';
import {tabsStyles} from '../materials/tabs.mjs';
import {tooltipStyles} from '../materials/tooltip.mjs';
import {feedbackStyles} from '../materials/feedback.mjs';
import {renderRoleTypeCSS, roleTypeUsage} from '../materials/typography.mjs';

const DEPS = {gallery: ['media'], bento: ['media']};
const shade = mode => (mode === 'dark' ? 'rgba(0,0,0,.5)' : 'rgba(16,21,28,.14)');
const tokenDecls = (tokens, mode) => Object.entries(tokens).map(([k, v]) => `--kit-${k}:${v};`).join('') + `--kit-shade:${shade(mode)};`;
const opposite = mode => (mode === 'dark' ? 'light' : 'dark');

export function usedTypes(tree) {
  const used = new Set();
  const walk = n => { used.add(n.type); n.children?.forEach(walk); };
  walk(tree);
  return used;
}

/** sets: {light?: tokens, dark?: tokens, inverse?: {light?, dark?}} — token objects only. */
export function stylesheet(b, sets, body = '', design = null) {
  const used = usedTypes(b.tree);
  for (const t of [...used]) for (const d of DEPS[t] ?? []) used.add(d);
  const parts = [`/* Generated from catalog ${b.catalogVersion}. Edit the blueprint, then rebuild. */`];
  const auto = b.mode === 'auto';
  const baseMode = auto ? 'light' : b.mode;
  parts.push(`:root{${tokenDecls(sets[baseMode], baseMode)}${axisVars(b)}color-scheme:${auto ? 'light dark' : b.mode};}`);
  if (auto) parts.push(`@media(prefers-color-scheme:dark){:root{${tokenDecls(sets.dark, 'dark')}}}`);
  const inverseSel = '.kit-section[data-surface=inverse],.kit-cta[data-tone=inverse]';
  if (sets.inverse) {
    const opp = opposite(baseMode);
    parts.push(`${inverseSel}{${tokenDecls(sets.inverse[opp], opp)}}`);
    if (auto) parts.push(`@media(prefers-color-scheme:dark){${inverseSel}{${tokenDecls(sets.inverse.light, 'light')}}}`);
    parts.push('.kit-cta[data-tone=inverse]{background:var(--kit-canvas);color:var(--kit-text);border-color:var(--kit-border)}');
  }
  parts.push(coreCSS.trim());
  parts.push(shellCSS(b).trim());
  for (const type of nodeTypes) if (used.has(type) && chunks[type]) parts.push(chunks[type].trim() + (polish[type] ?? ''));
  // 카탈로그 2.6.0: 쓴 컨트롤 재료의 CSS만 나온다(재료의 selectStyles·tableStyles 그대로). 2.5.0 이하는 이 노드를 쓸 수 없어 이 줄이 비어 있다.
  if (used.has('select-control')) parts.push(selectStyles.trim());
  if (used.has('data-table')) parts.push(tableStyles.trim() + '.kit-data-block{display:grid;gap:var(--kit-sp-near);min-width:0}');
  const componentStyles = {
    'button-control': buttonStyles, 'input-control': inputStyles, 'card-surface': cardStyles, 'navigation-menu': navigationStyles,
    'modal-dialog': modalStyles, 'tabs-control': tabsStyles, tooltip: tooltipStyles, 'feedback-message': feedbackStyles,
  };
  for (const type of Object.keys(componentStyles)) if (used.has(type)) parts.push(componentStyles[type].trim());
  parts.push(flowCSS(flowUsage(body)).trim());
  parts.push(contractCSS().trim());
  parts.push(polishCore.trim());
  parts.push(tailCSS.trim());
  if (design) parts.push(compositionCSS(design).trim());
  if (design?.chrome) parts.push(headerDesignCSS(design.chrome).trim());
  // 카탈로그 2.5.0: 사용한 표현력 값에만 CSS가 나온다. 2.4.0 이하는 이 줄을 지나지 않아 출력이 같다.
  if (expressionApplies(b)) { const css = expressionCSS(b, body, design); if (css) parts.push(css); }
  if (atLeast(b.catalogVersion, '2.6.0') && body.includes('data-chart="2.6"')) parts.push(chartExtensionCSS().trim());
  if (b.colorPalette && atLeast(b.catalogVersion, '2.6.0')) parts.push(colorTokenCSS().trim());
  const rev2 = layoutRev(b) === 2;
  if (b.typeRoles && atLeast(b.catalogVersion, '2.6.0')) parts.push(renderRoleTypeCSS(b.typeRoles, {fit: rev2}).trim());
  if (rev2) parts.push(layoutContractCSS(used).trim(), fitCSS(), wrapCSS());
  const joined = parts.join('\n') + '\n', css = rev2 ? refineLayout(joined) : joined;
  return typeRev(b) === 2 ? refineTracking(css) : css;
}

/** 컴파일 manifest용: 고른 역할 타이포 프리셋이 닿은 역할·변수. 고르지 않았으면 null. */
export const typeRolesManifest = b => (b.typeRoles && atLeast(b.catalogVersion, '2.6.0') ? roleTypeUsage(b.typeRoles) : null);
