/**
 * 시각 언어(컴포넌트 패밀리 작업 소유, REQUEST §7). 목적 패밀리(구조)와 시각 패밀리(`family:*`)는 독립 축이다.
 * 플랫폼 `family` 재료는 모양(shape)과 구성원 고정 축만 소유하므로(contract.mjs KIND_SPECS), 나머지 시각 값은 여기에 둔다.
 * 색과 서체는 소유하지 않는다: 값은 모두 var(--kit-*) 참조이거나 색이 아닌 수치다.
 *
 * `traits`가 유일한 원천이다. 12개 속성(모서리·테두리·그림자·표면 계층·컨트롤 높이·내부 여백·아이콘·버튼 강조·상태·카드 구조·내비게이션·모션)을
 * 한 곳에 적고, 나머지는 거기서 계산한다.
 *   shape      families.mjs의 family.shape(radius·elevation·motion)가 읽는다
 *   members    families.mjs가 카드 구조·내비게이션 표현을 구성원 고정 축으로 읽는다
 *   recipe     목적 패밀리가 강조 단계(primary·secondary·emphasis·tertiary)별 버튼 외형으로 읽는다
 *   metrics    목적 패밀리의 `needs.visual`이 읽어 조합을 거부하는 수치. traits에서 계산하므로 렌더와 어긋나지 않는다
 *   vars       `[data-family="<key>"]` 범위에 놓이는 CSS 변수. 소비처가 없는 변수는 두지 않는다(tests/platform-family-visual.test.mjs가 출력 CSS에서 읽힘을 확인한다)
 *   scopeCss   변수만으로 닿지 않는 곳(포커스 링 두께, 표면 계층 그림자, 라벨 글자 형태, 유리 질감)의 패밀리 범위 규칙. kit.mjs가 공통 CSS에 붙인다
 *
 * 변수가 닿는 곳:
 *   --kit-control, --kit-inset       기반 컨트롤의 높이·가로 안쪽 여백(컨트롤 크기 계산이 읽는다)과 카드 안쪽 여백
 *   --kit-bw                         버튼 글자 굵기
 *   --kit-radius·shadow·dur·lift     family.shape(familyShapeVars)
 *   --pf-*                           목적 패밀리 CSS와 아래 scopeCss
 */
import {ICON, RADIUS, ELEVATION, MOTION} from '../../styles/base.mjs';

const TONES = Object.freeze({
  border: 'var(--kit-border)',
  strong: 'color-mix(in srgb,var(--kit-text) 45%,var(--kit-border))',
  text: 'var(--kit-text)',
  accent: 'color-mix(in srgb,var(--kit-action) 40%,var(--kit-border))',
  translucent: 'color-mix(in srgb,var(--kit-border) 60%,transparent)',
  hairline: 'color-mix(in srgb,var(--kit-border) 40%,transparent)',
});
const FILLS = Object.freeze({surface: 'var(--kit-surface)', 'card-hover': 'var(--kit-card-hover)', soft: 'var(--kit-soft)', transparent: 'transparent'});
const SPACING = Object.freeze({tight: 'var(--kit-sp-tight)', near: 'var(--kit-sp-near)', item: 'var(--kit-sp-item)', insetS: 'var(--kit-sp-inset-s)', inset: 'var(--kit-inset)'});

const line = (width, tone) => (width ? `${width}px solid ${TONES[tone]}` : '0 solid transparent');
const fillOf = s => (s.alpha === undefined ? FILLS[s.fill] : `color-mix(in srgb,var(--kit-surface) ${Math.round(s.alpha * 100)}%,transparent)`);
const px = n => `${n}px`;

/** 패밀리 범위: 패밀리 요소 자신과 그 안쪽. 카드만 data-family를 다는 경로(render.mjs)와 목적 패밀리 루트 경로 모두에서 맞는다. */
const scope = key => `:is([data-family=${key}],[data-family=${key}] *)`;
const ANY = ':is([data-family],[data-family] *)';

/** 목적 패밀리가 읽는 변수. 소비처가 없는 값은 만들지 않는다. */
function varsOf(t) {
  const border = line(t.border.width, t.border.tone);
  const rule = t.rule ? line(t.rule.width, t.rule.tone) : border;
  const ic = ICON[t.icon];
  return {
    '--kit-control': px(t.controlHeight),
    '--kit-inset': px(t.controlPadX),
    '--kit-bw': String(t.type.controlWeight),
    '--pf-pad': SPACING[t.padding],
    '--pf-gap': SPACING[t.gap],
    '--pf-border': border,
    '--pf-surface': fillOf(t.surface),
    '--pf-rule': rule,
    '--pf-accent-bar': px(t.cardStructure.accentBar),
    '--pf-title-weight': String(t.type.titleWeight),
    '--pf-label-case': t.type.labelCase,
    '--pf-label-track': t.type.labelTrack,
    '--pf-stat-scale': String(t.type.statScale),
    '--pf-cell-pad': px(t.cellPadY),
    '--pf-focus-w': px(t.state.focusWidth),
    '--pf-focus-off': px(t.state.focusOffset),
    '--pf-elev-rest': t.layers ? ELEVATION[t.layers.rest].shadow : ELEVATION[t.shadow].hover,
    '--pf-elev-float': t.layers ? ELEVATION[t.layers.float].hover : ELEVATION[t.shadow].hover,
    ...(t.surface.blur ? {'--pf-blur': px(t.surface.blur)} : {}),
    '--kit-icon-sw': String(ic.sw), '--kit-icon-cap': ic.cap, '--kit-icon-join': ic.join, '--kit-icon-fill': ic.fill,
  };
}

function define(id, spec) {
  const {key, summary, traits: t, scopeCss = ''} = spec;
  const motion = MOTION[t.motion];
  // 계산 가능한 값은 traits에서 읽어 한 번만 적는다. 같은 값을 두 곳에 적으면 렌더와 선언이 어긋난다.
  const traits = {
    corner: t.corner, border: line(t.border.width, t.border.tone), shadow: t.shadow,
    surface: fillOf(t.surface), controlHeight: px(t.controlHeight), padding: SPACING[t.padding],
    icon: {style: t.icon, sw: ICON[t.icon].sw}, buttonEmphasis: t.buttonEmphasis,
    state: {hoverLift: motion.lift, focusOutline: `${t.state.focusWidth}px solid var(--kit-focus)`, focusOffset: px(t.state.focusOffset)},
    cardStructure: {appearance: t.cardStructure.appearance, shape: t.cardStructure.shape},
    navExpression: {appearance: t.navExpression.appearance, shape: t.navExpression.shape},
    motion: {dur: motion.dur, lift: motion.lift},
  };
  return Object.freeze({
    key, icon: t.icon, summary,
    shape: Object.freeze({radius: t.corner, elevation: t.shadow, motion: t.motion}),
    // 면이 반투명인 패밀리는 본문 위에 겹쳐 고정되는 요소(고정 내비 등)가 필요로 하는 불투명한 면이 없다.
    metrics: Object.freeze({cellPadY: t.cellPadY, borderW: t.border.width, opaqueSurface: t.surface.alpha === undefined && t.surface.fill !== 'transparent', labelCase: t.type.labelCase}),
    traits: Object.freeze(Object.fromEntries(Object.entries(traits).map(([k, v]) => [k, typeof v === 'object' ? Object.freeze(v) : v]))),
    vars: Object.freeze(varsOf(t)),
    recipe: Object.freeze({...t.buttonEmphasis}),
    scopeCss,
    members: Object.freeze({card: Object.freeze({appearance: t.cardStructure.appearance, shape: t.cardStructure.shape, footer: 'none'}), nav: Object.freeze({...t.navExpression})}),
  });
}

/** 강조 단계 묶음. 단계마다 버튼 외형(solid·outline·soft·ghost·link)을 고른다. */
const EMPHASIS = {
  standard: {primary: 'solid', secondary: 'outline', emphasis: 'solid', tertiary: 'ghost'},
  soft: {primary: 'solid', secondary: 'soft', emphasis: 'solid', tertiary: 'ghost'},
  // link는 컨테이너가 없어 모서리 모양이 보이지 않으므로(BTN_LINK_SHAPE) 버튼 모양이 soft인 패밀리만 고른다
  textual: {primary: 'solid', secondary: 'outline', emphasis: 'solid', tertiary: 'link'},
  tonal: {primary: 'solid', secondary: 'soft', emphasis: 'solid', tertiary: 'link'},
};
const NONE = {width: 0, tone: 'border'};

/** 유리: 면과 테두리가 반투명이라 뒤가 비친다. 블러는 뒤가 비치는 면에만 건다. */
const glassCss = `:is(.kit-ctl-card,.kit-ctl-modal-dialog,.kit-ctl-tooltip-bubble,.kit-select-menu,.kit-ctl-nav-sub,.pf-panel)${scope('glass')}${scope('glass')}{background:var(--pf-surface);-webkit-backdrop-filter:blur(var(--pf-blur,0px));backdrop-filter:blur(var(--pf-blur,0px))}`;

export const VISUAL_LANGUAGES = Object.freeze({
  // 1. Minimal Flat: 평평한 표면, 제한적 경계(기존 family:quiet 확장)
  'family:quiet': define('family:quiet', {
    key: 'quiet', summary: '외곽선과 여백으로 구획한다. 평평한 표면과 제한적 경계의 절제된 업무 화면용.',
    traits: {
      corner: 'soft', border: {width: 1, tone: 'border'}, shadow: 'outline', surface: {fill: 'surface'},
      controlHeight: 36, controlPadX: 20, padding: 'item', gap: 'near', cellPadY: 8, icon: 'line',
      buttonEmphasis: EMPHASIS.standard, state: {focusWidth: 3, focusOffset: 2},
      cardStructure: {appearance: 'outline', shape: 'soft', accentBar: 0}, navExpression: {appearance: 'underline', shape: 'soft'}, motion: 'subtle',
      type: {titleWeight: 650, labelCase: 'none', labelTrack: '0', statScale: 1, controlWeight: 600},
    },
  }),

  // 2. Soft Rounded: 둥근 모서리, 부드러운 표면(기존 family:soft 확장)
  'family:soft': define('family:soft', {
    key: 'soft', summary: '채운 면과 큰 모서리로 구획한다. 알약형 컨트롤과 떠 있는 부드러운 표면의 친근한 화면용.',
    traits: {
      corner: 'round', border: {width: 0, tone: 'border'}, shadow: 'lifted', surface: {fill: 'card-hover'},
      controlHeight: 40, controlPadX: 28, padding: 'insetS', gap: 'item', cellPadY: 12, icon: 'duotone',
      buttonEmphasis: EMPHASIS.soft, state: {focusWidth: 3, focusOffset: 2},
      cardStructure: {appearance: 'filled', shape: 'round', accentBar: 0}, navExpression: {appearance: 'pill', shape: 'pill'}, motion: 'subtle',
      type: {titleWeight: 700, labelCase: 'none', labelTrack: '0', statScale: 1.1, controlWeight: 700},
    },
  }),

  // 3. Brutalist: 강한 경계와 오프셋 그림자(기존 family:bold 확장)
  'family:bold': define('family:bold', {
    key: 'bold', summary: '두꺼운 경계선과 오프셋 그림자, 각진 모서리로 구획한다. 높은 시각적 대비와 강한 힘이 필요한 화면용.',
    traits: {
      corner: 'square', border: {width: 2, tone: 'text'}, shadow: 'hard', surface: {fill: 'surface'},
      controlHeight: 38, controlPadX: 20, padding: 'item', gap: 'near', cellPadY: 8, icon: 'line-bold',
      buttonEmphasis: EMPHASIS.standard, state: {focusWidth: 4, focusOffset: 2},
      cardStructure: {appearance: 'elevated', shape: 'square', accentBar: 6}, navExpression: {appearance: 'block', shape: 'square'}, motion: 'lively',
      type: {titleWeight: 800, labelCase: 'uppercase', labelTrack: '.06em', statScale: 1.25, controlWeight: 800},
    },
  }),

  // 4. Editorial: 타이포 중심, 규칙선 활용(기존 family:editorial 확장)
  'family:editorial': define('family:editorial', {
    key: 'editorial', summary: '상자 대신 가는 선과 넓은 여백, 타이포그래피 중심으로 구획한다. 규칙선을 활용한 읽기 중심 화면용.',
    traits: {
      corner: 'subtle', border: {width: 0, tone: 'border'}, rule: {width: 1, tone: 'text'}, shadow: 'flat', surface: {fill: 'transparent'},
      controlHeight: 36, controlPadX: 16, padding: 'insetS', gap: 'item', cellPadY: 12, icon: 'line-fine',
      buttonEmphasis: EMPHASIS.textual, state: {focusWidth: 2, focusOffset: 4},
      cardStructure: {appearance: 'flat', shape: 'soft', accentBar: 0}, navExpression: {appearance: 'underline', shape: 'soft'}, motion: 'none',
      type: {titleWeight: 700, labelCase: 'uppercase', labelTrack: '.08em', statScale: 1.2, controlWeight: 600},
    },
  }),

  // 5. Outline Precise: 선명한 경계, 정밀한 구조. 가는 선과 각진 컨트롤, 카드 위의 2px 기준선
  'family:outline-precise': define('family:outline-precise', {
    key: 'outline-precise', summary: '선명한 1px 경계와 각진 컨트롤, 정밀한 정렬선. 직각 끝맺음의 아이콘과 카드 위 기준선이 구조를 드러낸다.',
    traits: {
      corner: 'subtle', border: {width: 1, tone: 'strong'}, shadow: 'outline', surface: {fill: 'surface'},
      controlHeight: 34, controlPadX: 16, padding: 'insetS', gap: 'near', cellPadY: 8, icon: 'line-square',
      buttonEmphasis: EMPHASIS.standard, state: {focusWidth: 2, focusOffset: 1},
      cardStructure: {appearance: 'outline', shape: 'square', accentBar: 2}, navExpression: {appearance: 'block', shape: 'square'}, motion: 'subtle',
      type: {titleWeight: 600, labelCase: 'none', labelTrack: '.02em', statScale: 1, controlWeight: 600},
    },
  }),

  // 6. Corporate Formal: 절제된 형태, 안정적 정렬. 작은 모서리와 은은한 그림자
  'family:corporate-formal': define('family:corporate-formal', {
    key: 'corporate-formal', summary: '절제된 4px 모서리와 안정적 정렬. 가는 경계에 은은한 그림자를 겹쳐 신뢰감을 주는 계층을 만든다.',
    traits: {
      corner: 'subtle', border: {width: 1, tone: 'border'}, shadow: 'soft', surface: {fill: 'surface'},
      controlHeight: 40, controlPadX: 24, padding: 'insetS', gap: 'item', cellPadY: 8, icon: 'line',
      buttonEmphasis: EMPHASIS.textual, state: {focusWidth: 3, focusOffset: 2},
      cardStructure: {appearance: 'elevated', shape: 'soft', accentBar: 0}, navExpression: {appearance: 'underline', shape: 'soft'}, motion: 'subtle',
      type: {titleWeight: 700, labelCase: 'none', labelTrack: '-0.01em', statScale: 1.05, controlWeight: 600},
    },
  }),

  // 7. Dense Enterprise: 작은 컨트롤, 높은 정보 밀도
  'family:dense-enterprise': define('family:dense-enterprise', {
    key: 'dense-enterprise', summary: '30px 컨트롤과 4~8px 간격, 움직임 없는 반응. 데이터 집약적 전문 도구와 관리 콘솔을 위한 압축된 구조.',
    traits: {
      corner: 'subtle', border: {width: 1, tone: 'border'}, shadow: 'outline', surface: {fill: 'surface'},
      controlHeight: 30, controlPadX: 12, padding: 'near', gap: 'tight', cellPadY: 4, icon: 'line-fine',
      buttonEmphasis: EMPHASIS.standard, state: {focusWidth: 2, focusOffset: 0},
      cardStructure: {appearance: 'outline', shape: 'soft', accentBar: 0}, navExpression: {appearance: 'block', shape: 'soft'}, motion: 'none',
      type: {titleWeight: 650, labelCase: 'none', labelTrack: '0', statScale: 0.95, controlWeight: 600},
    },
  }),

  // 8. Elevated Material: 표면 계층 및 그림자. 놓인 면과 떠 있는 면의 그림자 깊이가 다르다
  'family:elevated-material': define('family:elevated-material', {
    key: 'elevated-material', summary: '테두리 없이 그림자 깊이로 계층을 만든다. 놓인 카드는 얕게, 메뉴·대화상자·툴팁은 깊게 떠 있다.',
    traits: {
      corner: 'soft', border: {width: 0, tone: 'border'}, shadow: 'lifted', layers: {rest: 'soft', float: 'lifted'}, surface: {fill: 'surface'},
      controlHeight: 38, controlPadX: 20, padding: 'item', gap: 'item', cellPadY: 8, icon: 'solid',
      buttonEmphasis: EMPHASIS.soft, state: {focusWidth: 3, focusOffset: 2},
      cardStructure: {appearance: 'elevated', shape: 'soft', accentBar: 0}, navExpression: {appearance: 'pill', shape: 'soft'}, motion: 'subtle',
      type: {titleWeight: 600, labelCase: 'none', labelTrack: '0.01em', statScale: 1, controlWeight: 500},
    },
  }),

  // 9. Tonal Layered: 색조를 활용한 계층. 선과 그림자 없이 색조 면과 왼쪽 띠로 구획한다
  'family:tonal-layered': define('family:tonal-layered', {
    key: 'tonal-layered', summary: '선과 그림자 없이 색조 면 위에 면을 쌓는다. 카드 위 4px 띠와 큰 컨트롤, 붙은 분절 탭이 계층을 알린다.',
    traits: {
      corner: 'round', border: {width: 0, tone: 'border'}, shadow: 'flat', surface: {fill: 'soft'},
      controlHeight: 44, controlPadX: 20, padding: 'insetS', gap: 'near', cellPadY: 12, icon: 'solid',
      buttonEmphasis: EMPHASIS.tonal, state: {focusWidth: 3, focusOffset: 2},
      cardStructure: {appearance: 'filled', shape: 'soft', accentBar: 4}, navExpression: {appearance: 'block', shape: 'soft'}, motion: 'none',
      type: {titleWeight: 650, labelCase: 'none', labelTrack: '0', statScale: 1.05, controlWeight: 600},
    },
  }),

  // 10. Glass: 반투명 표면 및 대비 관리. 뒤가 비치는 면과 반투명 테두리, 블러
  'family:glass': define('family:glass', {
    key: 'glass', summary: '반투명 면과 배경 블러, 반투명 테두리. 면 뒤로 배경이 비치므로 본문 위에 겹쳐 고정되는 요소에는 쓰지 못한다.',
    traits: {
      corner: 'round', border: {width: 1, tone: 'translucent'}, rule: {width: 1, tone: 'hairline'}, shadow: 'lifted', surface: {fill: 'surface', alpha: 0.78, blur: 14},
      controlHeight: 40, controlPadX: 28, padding: 'inset', gap: 'item', cellPadY: 8, icon: 'line-fine',
      buttonEmphasis: EMPHASIS.standard, state: {focusWidth: 3, focusOffset: 2},
      cardStructure: {appearance: 'outline', shape: 'round', accentBar: 0}, navExpression: {appearance: 'pill', shape: 'soft'}, motion: 'subtle',
      type: {titleWeight: 650, labelCase: 'none', labelTrack: '0.01em', statScale: 1.05, controlWeight: 600},
    },
    scopeCss: glassCss,
  }),

  // 11. Luxury: 넓은 여백 및 절제된 요소. 직각 모서리, 넓은 컨트롤, 벌어진 자간
  'family:luxury': define('family:luxury', {
    key: 'luxury', summary: '넓은 여백과 직각 모서리, 44px 컨트롤과 32px 가로 여백. 가는 글자 굵기에 넓게 벌어진 대문자 라벨.',
    traits: {
      corner: 'square', border: {width: 1, tone: 'border'}, shadow: 'flat', surface: {fill: 'surface'},
      controlHeight: 44, controlPadX: 32, padding: 'inset', gap: 'item', cellPadY: 12, icon: 'line-fine',
      buttonEmphasis: EMPHASIS.standard, state: {focusWidth: 2, focusOffset: 4},
      cardStructure: {appearance: 'outline', shape: 'square', accentBar: 0}, navExpression: {appearance: 'underline', shape: 'soft'}, motion: 'subtle',
      type: {titleWeight: 500, labelCase: 'uppercase', labelTrack: '.12em', statScale: 1.15, controlWeight: 500},
    },
  }),

  // 12. Expressive: 강조된 형태와 풍부한 시각적 리듬. 큰 라운드, 강조색 테두리, 큰 움직임
  'family:expressive': define('family:expressive', {
    key: 'expressive', summary: '28px 라운드와 알약형 컨트롤, 강조색이 도는 테두리와 큰 상승 모션, 6px 악센트 띠로 리듬을 만든다. 글로우 그림자는 밝은 모드에서 보이지 않아(X05) 쓰지 않는다.',
    traits: {
      corner: 'bubble', border: {width: 1, tone: 'accent'}, shadow: 'lifted', surface: {fill: 'surface'},
      controlHeight: 44, controlPadX: 28, padding: 'insetS', gap: 'item', cellPadY: 8, icon: 'duotone',
      buttonEmphasis: EMPHASIS.soft, state: {focusWidth: 4, focusOffset: 3},
      cardStructure: {appearance: 'elevated', shape: 'round', accentBar: 6}, navExpression: {appearance: 'pill', shape: 'pill'}, motion: 'lively',
      type: {titleWeight: 800, labelCase: 'none', labelTrack: '-0.02em', statScale: 1.3, controlWeight: 700},
    },
  }),
});

/**
 * 변수만으로 닿지 않는 소비처. 모든 패밀리 범위에 걸리는 규칙은 변수를 읽고, 패밀리마다 다른 값은 위 vars가 정한다.
 * 선택자 특이도는 기반 컴포넌트 CSS를 이기도록 범위 조건을 한 번(또는 두 번) 더 얹는다.
 */
export const FAMILY_SCOPE_CSS = [
  // 컨트롤 라벨의 글자 형태(대문자·자간)
  `:is(.kit-ctl-button,.kit-ctl-tab,.kit-ctl-nav-link)${ANY}{text-transform:var(--pf-label-case);letter-spacing:var(--pf-label-track)}`,
  // 상태 표현: 포커스 링 두께와 간격
  `:is(button,a[href],input,select,textarea,[role=tab],[tabindex]):focus-visible${ANY}{outline-width:var(--pf-focus-w);outline-offset:var(--pf-focus-off)}`,
  // 표 셀 위아래 여백. 표 자체의 밀도 축이 compact·spacious로 정한 표는 그 축이 이긴다(밀도 변경이 출력에 닿아야 한다)
  `.kit-data-table[data-density=comfortable]${ANY} :is(th,td){padding-block:var(--pf-cell-pad)}`,
  // 표면 계층: 놓인 카드의 그림자와 떠 있는 면(대화상자·툴팁·메뉴)의 그림자
  `.kit-ctl-card[data-appearance=elevated]${ANY}{box-shadow:var(--pf-elev-rest)}`,
  `:is(.kit-ctl-modal-dialog,.kit-ctl-tooltip-bubble,.kit-select-menu,.kit-ctl-nav-sub)${ANY}${ANY}{box-shadow:var(--pf-elev-float)}`,
  ...Object.values(VISUAL_LANGUAGES).map(v => v.scopeCss).filter(Boolean),
].join('');

export const VISUAL_KEYS = Object.freeze(Object.values(VISUAL_LANGUAGES).map(v => v.key));
export const visualOf = familyId => VISUAL_LANGUAGES[familyId] ?? null;

/** 목적 패밀리가 요구하는 시각 값(needs.visual)과 시각 언어 측정값을 견준다. 어긋나면 이유를 돌려준다. */
export function visualMismatch(needs = {}, language) {
  const out = [];
  const m = language.metrics;
  if (needs.maxCellPadY !== undefined && m.cellPadY > needs.maxCellPadY) out.push(`셀 상하 패딩 ${m.cellPadY}px가 이 패밀리의 상한 ${needs.maxCellPadY}px를 넘는다`);
  if (needs.opaqueSurface && !m.opaqueSurface) out.push('면이 투명하다(본문 위에 겹쳐 고정되는 요소는 불투명한 면이 필요하다)');
  if (needs.minBorderW !== undefined && m.borderW < needs.minBorderW) out.push(`테두리 ${m.borderW}px가 이 패밀리의 하한 ${needs.minBorderW}px에 못 미친다`);
  return out;
}
