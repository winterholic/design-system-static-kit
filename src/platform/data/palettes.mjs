/**
 * 기본 팔레트(색 작업 소유). 원색만 둔다. 권리가 확인된 자체 팔레트만 등록한다(Coolors 427개는 등록하지 않는다, ADR 0012 §1).
 *
 * 출처: 아래 시드는 이 저장소에서 색상 계열(hue·채도)을 먼저 정하고 손으로 고른 값이다. 외부 팔레트 사이트의 값을 옮기지 않았다.
 * tests/platform-color-palettes.test.mjs가 Coolors 레거시 카탈로그 색과 한 개도 겹치지 않는지 검사한다.
 * 계열(family:*)은 서로 겹치지 않아야 한다. 겹침 기준은 같은 테스트에 있다.
 *
 * 각 팔레트는 brand(주), accent(보조), neutral(중립)과 상태색 4개를 가진다. 명도 램프(50~950)는 시드에서 colorRamp가 계산한다.
 */
import {STATIC_COLOR_PALETTE} from '../../color-tokens.mjs';
import {definePlatformMaterial} from '../contract.mjs';

const s = STATIC_COLOR_PALETTE.seeds;
const ORIGIN = 'design-system-static-kit 자체 제작(2026-11, 계열을 먼저 정하고 손으로 고른 원색)';
const B1_ORIGIN = 'design-system-static-kit 자체 제작(2026-11, 10개 색상 계열 자체 큐레이션)';

/** 팔레트 한 장. prefers는 [세트 id, 우선순위, 이유]. 이유는 추천 근거에 그대로 나온다. */
const own = ({id, label, family, tone, seeds, prefers = [], avoids = [], contexts = ['any'], tags = [], origin = ORIGIN}) => definePlatformMaterial({
  id: `palette:${id}`, kind: 'palette', label, tone, seeds, contexts,
  relations: [
    ...prefers.map(([set, priority, reason]) => ({type: 'prefers', to: `subtoken-set:${set}`, priority, reason})),
    ...avoids.map(([set, priority, reason]) => ({type: 'avoids', to: `subtoken-set:${set}`, priority, reason})),
  ],
  quality: {status: 'implemented', evidence: []}, source: {origin, license: 'internal'}, tags: [`family:${family}`, 'internal', ...tags],
});


// B1 독립 검증 이관: 201 신규 팔레트. 기존 9개 ID는 기준 정의를 그대로 유지한다.
const B1_PALETTES = Object.freeze([
  {
    "id": "zinc-minimal",
    "label": "징크 미니멀",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#82647A",
      "accent": "#3C448D",
      "neutral": "#5B645E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "징크 미니멀의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "cool-gray-studio",
    "label": "쿨 그레이 스튜디오",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#5E7472",
      "accent": "#7A3700",
      "neutral": "#5A6369",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "쿨 그레이 스튜디오의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "charcoal-modern",
    "label": "차콜 모던",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#6B4A59",
      "accent": "#065D5A",
      "neutral": "#655F67",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "차콜 모던의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "titanium-pure",
    "label": "티타늄 퓨어",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#315E5B",
      "accent": "#7F325F",
      "neutral": "#69625B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "티타늄 퓨어의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "ash-architectural",
    "label": "애쉬 아키텍처",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#646D8C",
      "accent": "#554F00",
      "neutral": "#61635A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "애쉬 아키텍처의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "silver-stream",
    "label": "실버 스트림",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#5A4F6D",
      "accent": "#005280",
      "neutral": "#596464",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "실버 스트림의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "onyx-precision",
    "label": "오닉스 프리시전",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#507486",
      "accent": "#7D5500",
      "neutral": "#6B5D60",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "오닉스 프리시전의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "fog-quiet",
    "label": "포그 콰이어트",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#4B5C64",
      "accent": "#04697B",
      "neutral": "#666156",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "포그 콰이어트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "basalt-foundation",
    "label": "바살트 파운데이션",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#716C7B",
      "accent": "#8F3C63",
      "neutral": "#59655F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "바살트 파운데이션의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "pebble-neutral",
    "label": "페블 뉴트럴",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#615560",
      "accent": "#007C5E",
      "neutral": "#67636E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "페블 뉴트럴의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "smoked-glass",
    "label": "스모크드 글래스",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#3A596E",
      "accent": "#4158A1",
      "neutral": "#665E68",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스모크드 글래스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "steel-minimal",
    "label": "스틸 미니멀",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#4A787B",
      "accent": "#863047",
      "neutral": "#696066",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스틸 미니멀의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "shadow-contrast",
    "label": "섀도우 콘트라스트",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#555868",
      "accent": "#1276AD",
      "neutral": "#546569",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "섀도우 콘트라스트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "alabaster-pure",
    "label": "알라바스터 퓨어",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#63717D",
      "accent": "#64458F",
      "neutral": "#5E6863",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "알라바스터 퓨어의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "ironclad-dark",
    "label": "아이언클래드 다크",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#786784",
      "accent": "#5F6B00",
      "neutral": "#66616B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아이언클래드 다크의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "urban-concrete",
    "label": "어반 콘크리트",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#7B6971",
      "accent": "#2E64A6",
      "neutral": "#6D605E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "어반 콘크리트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "mist-ambient",
    "label": "미스트 앰비언트",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#325D66",
      "accent": "#426400",
      "neutral": "#5D626A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "미스트 앰비언트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "flint-crisp",
    "label": "플린트 크리스프",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#5E5564",
      "accent": "#764AA2",
      "neutral": "#6C625F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "플린트 크리스프의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "obsidian-high",
    "label": "옵시디언 하이",
    "family": "neutral",
    "tone": "mid",
    "seeds": {
      "brand": "#6E6A8A",
      "accent": "#902829",
      "neutral": "#71605E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "옵시디언 하이의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "neutral"
  },
  {
    "id": "cobalt-enterprise",
    "label": "코발트 엔터프라이즈",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#0055A1",
      "accent": "#005B4F",
      "neutral": "#5E645C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "코발트 엔터프라이즈의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "azure-tech",
    "label": "아주르 테크",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#0072C1",
      "accent": "#7A346A",
      "neutral": "#5D646B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아주르 테크의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "sky-horizon",
    "label": "스카이 호라이즌",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#4843AA",
      "accent": "#5C4C00",
      "neutral": "#626069",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스카이 호라이즌의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "electric-cyan",
    "label": "일렉트릭 시안",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#5C60C9",
      "accent": "#005475",
      "neutral": "#695E5F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "일렉트릭 시안의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "deep-sapphire",
    "label": "딥 사파이어",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#005C86",
      "accent": "#812A3D",
      "neutral": "#646259",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "딥 사파이어의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "arctic-blue",
    "label": "아틱 블루",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#088075",
      "accent": "#035E23",
      "neutral": "#5A6461",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아틱 블루의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "pacific-deep",
    "label": "퍼시픽 딥",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#445282",
      "accent": "#783D7D",
      "neutral": "#68636B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "퍼시픽 딥의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "neon-cyan",
    "label": "네온 시안",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#007D8E",
      "accent": "#546700",
      "neutral": "#696057",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "네온 시안의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "marine-navy",
    "label": "마린 네이비",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#3D68CA",
      "accent": "#545AA6",
      "neutral": "#596762",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "마린 네이비의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "cerulean-bright",
    "label": "세룰리안 브라이트",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#0077AC",
      "accent": "#846D00",
      "neutral": "#665E6A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "세룰리안 브라이트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "glacial-stream",
    "label": "글래셜 스트림",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#2B4BAC",
      "accent": "#33600D",
      "neutral": "#5C656A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "글래셜 스트림의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "indigo-wave",
    "label": "인디고 웨이브",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#49729C",
      "accent": "#3D4B94",
      "neutral": "#676169",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "인디고 웨이브의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "royal-blue",
    "label": "로열 블루",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#006457",
      "accent": "#843900",
      "neutral": "#6B615E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "로열 블루의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "polar-frost",
    "label": "폴라 프로스트",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#005F74",
      "accent": "#5E338A",
      "neutral": "#65606E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "폴라 프로스트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "blueprint-tech",
    "label": "블루프린트 테크",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#65699D",
      "accent": "#9F5C0E",
      "neutral": "#6C5D63",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "블루프린트 테크의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "aegean-sea",
    "label": "에게안 씨",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#315880",
      "accent": "#644800",
      "neutral": "#5B6369",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "에게안 씨의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "ultramarine-sharp",
    "label": "울트라마린 샤프",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#006267",
      "accent": "#845196",
      "neutral": "#64665B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "울트라마린 샤프의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "twilight-harbor",
    "label": "트와일라잇 하버",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#586E9E",
      "accent": "#6E7604",
      "neutral": "#55646B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "트와일라잇 하버의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "cyan-accent",
    "label": "시안 악센트",
    "family": "blue-cyan",
    "tone": "mid",
    "seeds": {
      "brand": "#047E82",
      "accent": "#543F99",
      "neutral": "#716062",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "시안 악센트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "deep-nordic-blue",
    "label": "딥 노르딕 블루",
    "family": "blue-cyan",
    "tone": "bright",
    "seeds": {
      "brand": "#8C5AD3",
      "accent": "#39458D",
      "neutral": "#596464",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "딥 노르딕 블루의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "blue-cyan"
  },
  {
    "id": "emerald-corporate",
    "label": "에메랄드 코퍼레이트",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#5A5900",
      "accent": "#6F519C",
      "neutral": "#6B636C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "에메랄드 코퍼레이트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "pine-deep",
    "label": "파인 딥",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#016807",
      "accent": "#7E2A49",
      "neutral": "#62646D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "파인 딥의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "mint-fresh",
    "label": "민트 프레시",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#717500",
      "accent": "#265B0F",
      "neutral": "#6B6165",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "민트 프레시의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "dark-teal",
    "label": "다크 틸",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#3C821D",
      "accent": "#3D448D",
      "neutral": "#69635C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "다크 틸의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "jade-botanical",
    "label": "제이드 보태니컬",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#3A6036",
      "accent": "#724800",
      "neutral": "#5E6967",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "제이드 보태니컬의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "sage-organic",
    "label": "세이지 오가닉",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#5F7845",
      "accent": "#005E6A",
      "neutral": "#62666E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "세이지 오가닉의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "spruce-mountain",
    "label": "스프루스 마운틴",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#886B00",
      "accent": "#6F316D",
      "neutral": "#67626A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스프루스 마운틴의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "moss-calm",
    "label": "모스 캄",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#406100",
      "accent": "#9A4485",
      "neutral": "#6E615C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "모스 캄의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "cyber-teal",
    "label": "사이버 틸",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#00854A",
      "accent": "#814A8C",
      "neutral": "#5C686F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "사이버 틸의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "seafoam-light",
    "label": "씨폼 라이트",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#006734",
      "accent": "#005D34",
      "neutral": "#71625C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "씨폼 라이트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "fern-lush",
    "label": "펀 러시",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#777136",
      "accent": "#5A67B4",
      "neutral": "#696456",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "펀 러시의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "evergreen-stable",
    "label": "에버그린 스테이블",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#675317",
      "accent": "#7F3A73",
      "neutral": "#6F6661",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "에버그린 스테이블의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "olive-teal",
    "label": "올리브 틸",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#5C7B00",
      "accent": "#6A4400",
      "neutral": "#6A635C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "올리브 틸의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "alpine-breeze",
    "label": "알파인 브리즈",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#008264",
      "accent": "#005B7B",
      "neutral": "#5E6965",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "알파인 브리즈의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "basil-crisp",
    "label": "바질 크리스프",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#006547",
      "accent": "#007177",
      "neutral": "#5F6A6B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "바질 크리스프의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "amazon-deep",
    "label": "아마존 딥",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#4E5C26",
      "accent": "#B14651",
      "neutral": "#6E6268",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아마존 딥의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "spearmint-clean",
    "label": "스피어민트 클린",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#4E7B53",
      "accent": "#9E4766",
      "neutral": "#5D6B67",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스피어민트 클린의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "malachite-rich",
    "label": "말라카이트 리치",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#7D7000",
      "accent": "#80300C",
      "neutral": "#66655C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "말라카이트 리치의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "cedar-woodland",
    "label": "시더 우드랜드",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#816D34",
      "accent": "#9C3349",
      "neutral": "#63685F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "시더 우드랜드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "agave-vital",
    "label": "아가베 바이탈",
    "family": "green-teal",
    "tone": "mid",
    "seeds": {
      "brand": "#6B753C",
      "accent": "#565700",
      "neutral": "#606B60",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아가베 바이탈의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "green-teal"
  },
  {
    "id": "crimson-dynamic",
    "label": "크림슨 다이내믹",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#A80022",
      "accent": "#2F488E",
      "neutral": "#5C626A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "크림슨 다이내믹의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "coral-radiant",
    "label": "코랄 래디언트",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#9E0067",
      "accent": "#803103",
      "neutral": "#675F65",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "코랄 래디언트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "amber-glow",
    "label": "앰버 글로우",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#AF4561",
      "accent": "#015A50",
      "neutral": "#68605A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "앰버 글로우의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "sunset-orange",
    "label": "선셋 오렌지",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#8E3C00",
      "accent": "#683376",
      "neutral": "#5E635B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "선셋 오렌지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "terracotta-warm",
    "label": "테라코타 웜",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#C9212E",
      "accent": "#5B4C00",
      "neutral": "#596466",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "테라코타 웜의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "flame-vivid",
    "label": "플레임 비비드",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#AE5000",
      "accent": "#005476",
      "neutral": "#616069",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "플레임 비비드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "scarlet-bold",
    "label": "스칼렛 볼드",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#942C4D",
      "accent": "#8B3F02",
      "neutral": "#6A645C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스칼렛 볼드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "tangerine-crisp",
    "label": "탠저린 크리스프",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#C2206A",
      "accent": "#005E24",
      "neutral": "#656159",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "탠저린 크리스프의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "cherry-deep",
    "label": "체리 딥",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#B1483E",
      "accent": "#4A3F8A",
      "neutral": "#5A6460",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "체리 딥의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "apricot-soft",
    "label": "애프리콧 소프트",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#972F29",
      "accent": "#6B4D00",
      "neutral": "#61636B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "애프리콧 소프트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "paprika-spice",
    "label": "파프리카 스파이스",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#BF3900",
      "accent": "#325CA0",
      "neutral": "#6A5F58",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "파프리카 스파이스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "persimmon-rich",
    "label": "퍼시몬 리치",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#A4004C",
      "accent": "#4D5200",
      "neutral": "#5C6470",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "퍼시몬 리치의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "rust-heritage",
    "label": "러스트 헤리티지",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#9C5F01",
      "accent": "#4A5300",
      "neutral": "#60635A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "러스트 헤리티지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "sienna-clay",
    "label": "시에나 클레이",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#7E4A00",
      "accent": "#74478E",
      "neutral": "#62606B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "시에나 클레이의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "ember-warm",
    "label": "엠버 웜",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#C71E4F",
      "accent": "#822D1F",
      "neutral": "#60616A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "엠버 웜의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "ruby-precision",
    "label": "루비 프리시전",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#A8477A",
      "accent": "#006786",
      "neutral": "#656256",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "루비 프리시전의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "blood-orange",
    "label": "블러드 오렌지",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#8E2F63",
      "accent": "#9F5C0B",
      "neutral": "#5C626F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "블러드 오렌지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "copper-metallic",
    "label": "코퍼 메탈릭",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#B04C29",
      "accent": "#2F6E2A",
      "neutral": "#5A626C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "코퍼 메탈릭의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "saffron-sun",
    "label": "사프란 선",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#962D3C",
      "accent": "#51539F",
      "neutral": "#685E66",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "사프란 선의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "vermilion-bright",
    "label": "버밀리온 브라이트",
    "family": "warm",
    "tone": "mid",
    "seeds": {
      "brand": "#B14651",
      "accent": "#7E2A4B",
      "neutral": "#655F67",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "버밀리온 브라이트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "warm"
  },
  {
    "id": "ochre-mineral",
    "label": "오커 미네랄",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#724A39",
      "accent": "#9C433D",
      "neutral": "#696258",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "오커 미네랄의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "warm-sand",
    "label": "웜 샌드",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#8E6257",
      "accent": "#007653",
      "neutral": "#5B675F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "웜 샌드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "dark-walnut",
    "label": "다크 월넛",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#A15930",
      "accent": "#9C5084",
      "neutral": "#635F6D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "다크 월넛의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "bronze-antique",
    "label": "브론즈 앤틱",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#873B28",
      "accent": "#245C00",
      "neutral": "#6E6058",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "브론즈 앤틱의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "desert-dune",
    "label": "데저트 듄",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#6A502F",
      "accent": "#646101",
      "neutral": "#6C6457",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "데저트 듄의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "leather-vintage",
    "label": "레더 빈티지",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#5A572E",
      "accent": "#147E37",
      "neutral": "#6B5D61",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "레더 빈티지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "espresso-deep",
    "label": "에스프레소 딥",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#A45541",
      "accent": "#6A5600",
      "neutral": "#62675E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "에스프레소 딥의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "olive-earth",
    "label": "올리브 어스",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#826A46",
      "accent": "#136B00",
      "neutral": "#616270",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "올리브 어스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "bark-rich",
    "label": "바크 리치",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#724D00",
      "accent": "#8C6900",
      "neutral": "#6C5E56",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "바크 리치의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "tawny-soil",
    "label": "토니 소일",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#916508",
      "accent": "#006F4F",
      "neutral": "#6B5E5A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "토니 소일의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "khaki-field",
    "label": "카키 필드",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#8A664D",
      "accent": "#89202C",
      "neutral": "#59656F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "카키 필드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "mahogany-warm",
    "label": "마호가니 웜",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#6F4D33",
      "accent": "#53339B",
      "neutral": "#5A6865",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "마호가니 웜의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "cocoa-pure",
    "label": "코코아 퓨어",
    "family": "earth",
    "tone": "bright",
    "seeds": {
      "brand": "#797E63",
      "accent": "#058076",
      "neutral": "#69645C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "코코아 퓨어의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "silt-river",
    "label": "실트 리버",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#7B2C37",
      "accent": "#553B85",
      "neutral": "#5D626A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "실트 리버의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "chestnut-wood",
    "label": "체스넛 우드",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#4A5C48",
      "accent": "#9E2129",
      "neutral": "#626557",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "체스넛 우드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "amber-earth",
    "label": "앰버 어스",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#733800",
      "accent": "#00489F",
      "neutral": "#6A5E63",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "앰버 어스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "sepia-tone",
    "label": "세피아 톤",
    "family": "earth",
    "tone": "bright",
    "seeds": {
      "brand": "#588A47",
      "accent": "#7A2C57",
      "neutral": "#5E645C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:sepia-tone × subtoken-set:standard (light): focus vs tableHead 2.8799:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:sepia-tone × subtoken-set:data-dense (light): focus vs tableSelected 2.8799:1 < 3:1"
      ]
    ],
    "group": "earth"
  },
  {
    "id": "mossy-stone",
    "label": "모시 스톤",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#6A4E4C",
      "accent": "#405CCF",
      "neutral": "#67626F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "모시 스톤의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "canyon-rock",
    "label": "캐니언 락",
    "family": "earth",
    "tone": "bright",
    "seeds": {
      "brand": "#B25E5E",
      "accent": "#2B488E",
      "neutral": "#626069",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "캐니언 락의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "raw-umber",
    "label": "로우 엄버",
    "family": "earth",
    "tone": "mid",
    "seeds": {
      "brand": "#5B5139",
      "accent": "#A74900",
      "neutral": "#5D646B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "로우 엄버의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "earth"
  },
  {
    "id": "royal-amethyst",
    "label": "로열 애머시스트",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#7B2A8F",
      "accent": "#7B2B53",
      "neutral": "#695E5F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "로열 애머시스트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "iris-deep",
    "label": "아이리스 딥",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#9B44A7",
      "accent": "#00717C",
      "neutral": "#58666A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아이리스 딥의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "lavender-soft",
    "label": "라벤더 소프트",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#87599A",
      "accent": "#914473",
      "neutral": "#64616D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "라벤더 소프트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "plum-rich",
    "label": "플럼 리치",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#684182",
      "accent": "#005A4F",
      "neutral": "#646456",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "플럼 리치의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "orchid-vibrant",
    "label": "오키드 바이브런트",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#6635A3",
      "accent": "#006495",
      "neutral": "#696057",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "오키드 바이브런트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "mulberry-bold",
    "label": "멀베리 볼드",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#8A2078",
      "accent": "#953C43",
      "neutral": "#5C645B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "멀베리 볼드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "lilac-mist",
    "label": "라일락 미스트",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#793B6D",
      "accent": "#027040",
      "neutral": "#576469",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "라일락 미스트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "electric-violet",
    "label": "일렉트릭 바이올렛",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#A93D90",
      "accent": "#005477",
      "neutral": "#596466",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "일렉트릭 바이올렛의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "rose-quartz",
    "label": "로즈 쿼츠",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#54498E",
      "accent": "#7A6000",
      "neutral": "#6C605A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "로즈 쿼츠의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "berry-velvet",
    "label": "베리 벨벳",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#965486",
      "accent": "#4D6BB4",
      "neutral": "#546664",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "베리 벨벳의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "fuchsia-glow",
    "label": "푸시아 글로우",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#7460A7",
      "accent": "#A34946",
      "neutral": "#5C676E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "푸시아 글로우의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "wine-vintage",
    "label": "와인 빈티지",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#8D4BB7",
      "accent": "#704000",
      "neutral": "#5B645F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "와인 빈티지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "mauve-studio",
    "label": "모브 스튜디오",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#A0516E",
      "accent": "#7A2667",
      "neutral": "#666455",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "모브 스튜디오의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "grape-punch",
    "label": "그레이프 펀치",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#823859",
      "accent": "#3146A9",
      "neutral": "#6A5F55",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "그레이프 펀치의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "neon-purple",
    "label": "네온 퍼플",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#B53772",
      "accent": "#0578A5",
      "neutral": "#55646B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "네온 퍼플의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "heather-calm",
    "label": "헤더 캄",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#434E92",
      "accent": "#A5185D",
      "neutral": "#5A655A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "헤더 캄의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "magenta-bloom",
    "label": "마젠타 블룸",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#713E79",
      "accent": "#6660BC",
      "neutral": "#5A656D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "마젠타 블룸의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "deep-byzantine",
    "label": "딥 비잔틴",
    "family": "purple-pink",
    "tone": "bright",
    "seeds": {
      "brand": "#0078E7",
      "accent": "#045D60",
      "neutral": "#5F616A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "딥 비잔틴의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "thistle-light",
    "label": "씨슬 라이트",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#4E26A8",
      "accent": "#005B4E",
      "neutral": "#695E62",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "씨슬 라이트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "purple-pink"
  },
  {
    "id": "blackberry-dark",
    "label": "블랙베리 다크",
    "family": "purple-pink",
    "tone": "mid",
    "seeds": {
      "brand": "#89004D",
      "accent": "#634800",
      "neutral": "#666159",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "블랙베리 다크의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [
      [
        "commerce-vivid",
        40,
        "palette:blackberry-dark × subtoken-set:commerce-vivid (dark): COLOR_CONTRAST: no text color reaches 4.5:1 on accent"
      ]
    ],
    "group": "purple-pink"
  },
  {
    "id": "powder-blue",
    "label": "파우더 블루",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#A26EA4",
      "accent": "#4B3F8A",
      "neutral": "#6B6165",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:powder-blue × subtoken-set:standard (light): focus vs tableHead 2.8337:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:powder-blue × subtoken-set:data-dense (light): focus vs tableSelected 2.8337:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "soft-peach",
    "label": "소프트 피치",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#797CBE",
      "accent": "#435500",
      "neutral": "#69635C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:soft-peach × subtoken-set:standard (light): focus vs tableHead 2.7836:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:soft-peach × subtoken-set:data-dense (light): focus vs tableSelected 2.7836:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "mint-milk",
    "label": "민트 밀크",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#AF7442",
      "accent": "#803200",
      "neutral": "#5F6760",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:mint-milk × subtoken-set:standard (light): focus vs tableHead 2.8188:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:mint-milk × subtoken-set:data-dense (light): focus vs tableSelected 2.8188:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "buttercream-warm",
    "label": "버터크림 웜",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#318FB2",
      "accent": "#61367D",
      "neutral": "#5D666B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:buttercream-warm × subtoken-set:standard (light): focus vs tableHead 2.6606:1 < 3:1"
      ],
      [
        "tinted",
        40,
        "palette:buttercream-warm × subtoken-set:tinted (dark): COLOR_CONTRAST: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)"
      ],
      [
        "data-dense",
        40,
        "palette:buttercream-warm × subtoken-set:data-dense (light): focus vs tableSelected 2.6606:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "lavender-cream",
    "label": "라벤더 크림",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#2F9780",
      "accent": "#614900",
      "neutral": "#67626B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:lavender-cream × subtoken-set:standard (light): focus vs tableHead 2.5968:1 < 3:1"
      ],
      [
        "tinted",
        40,
        "palette:lavender-cream × subtoken-set:tinted (dark): COLOR_CONTRAST: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)"
      ],
      [
        "data-dense",
        40,
        "palette:lavender-cream × subtoken-set:data-dense (light): focus vs tableSelected 2.5968:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "blush-rose",
    "label": "블러쉬 로즈",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#918436",
      "accent": "#46418B",
      "neutral": "#6C6260",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:blush-rose × subtoken-set:standard (light): focus vs tableHead 2.7234:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:blush-rose × subtoken-set:data-dense (light): focus vs tableSelected 2.7234:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "celadon-soft",
    "label": "셀라돈 소프트",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#A47578",
      "accent": "#7F2A47",
      "neutral": "#65655C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:celadon-soft × subtoken-set:standard (light): focus vs tableHead 2.8049:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:celadon-soft × subtoken-set:data-dense (light): focus vs tableSelected 2.8049:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "muted-sage",
    "label": "뮤티드 세이지",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#6A85A7",
      "accent": "#045D60",
      "neutral": "#5C6766",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:muted-sage × subtoken-set:standard (light): focus vs tableHead 2.738:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:muted-sage × subtoken-set:data-dense (light): focus vs tableSelected 2.738:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "sky-tint",
    "label": "스카이 틴트",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#558E92",
      "accent": "#864077",
      "neutral": "#6E6064",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:sky-tint × subtoken-set:standard (light): focus vs tableHead 2.6797:1 < 3:1"
      ],
      [
        "tinted",
        40,
        "palette:sky-tint × subtoken-set:tinted (dark): COLOR_CONTRAST: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)"
      ],
      [
        "data-dense",
        40,
        "palette:sky-tint × subtoken-set:data-dense (light): focus vs tableSelected 2.6797:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "pale-coral",
    "label": "페일 코랄",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#8B7BA1",
      "accent": "#714900",
      "neutral": "#6E6363",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:pale-coral × subtoken-set:standard (light): focus vs tableHead 2.7945:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:pale-coral × subtoken-set:data-dense (light): focus vs tableSelected 2.7945:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "linen-quiet",
    "label": "리넨 콰이어트",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#977F5A",
      "accent": "#044E8B",
      "neutral": "#6A635C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:linen-quiet × subtoken-set:standard (light): focus vs tableHead 2.7341:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:linen-quiet × subtoken-set:data-dense (light): focus vs tableSelected 2.7341:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "soft-lemon",
    "label": "소프트 레몬",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#668E73",
      "accent": "#953E35",
      "neutral": "#5B666D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:soft-lemon × subtoken-set:standard (light): focus vs tableHead 2.67:1 < 3:1"
      ],
      [
        "tinted",
        40,
        "palette:soft-lemon × subtoken-set:tinted (dark): COLOR_CONTRAST: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)"
      ],
      [
        "data-dense",
        40,
        "palette:soft-lemon × subtoken-set:data-dense (light): focus vs tableSelected 2.67:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "lilac-whisper",
    "label": "라일락 위스퍼",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#B76C58",
      "accent": "#295B0B",
      "neutral": "#5C666A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:lilac-whisper × subtoken-set:standard (light): focus vs tableHead 2.8392:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:lilac-whisper × subtoken-set:data-dense (light): focus vs tableSelected 2.8392:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "pale-turquoise",
    "label": "페일 터콰이즈",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#5287BD",
      "accent": "#923C59",
      "neutral": "#6E615E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:pale-turquoise × subtoken-set:standard (light): focus vs tableHead 2.7224:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:pale-turquoise × subtoken-set:data-dense (light): focus vs tableSelected 2.7224:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "creamy-almond",
    "label": "크리미 아몬드",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#778D47",
      "accent": "#822B2C",
      "neutral": "#6C6161",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:creamy-almond × subtoken-set:standard (light): focus vs tableHead 2.6645:1 < 3:1"
      ],
      [
        "tinted",
        40,
        "palette:creamy-almond × subtoken-set:tinted (dark): COLOR_CONTRAST: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)"
      ],
      [
        "data-dense",
        40,
        "palette:creamy-almond × subtoken-set:data-dense (light): focus vs tableSelected 2.6645:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "dawn-rose",
    "label": "던 로즈",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#15959D",
      "accent": "#005D3B",
      "neutral": "#66655C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:dawn-rose × subtoken-set:standard (light): focus vs tableHead 2.6241:1 < 3:1"
      ],
      [
        "tinted",
        40,
        "palette:dawn-rose × subtoken-set:tinted (dark): COLOR_CONTRAST: text는 canvas·surface·soft·cardHover·cardActive 위에서 7:1을 동시에 맞출 수 없습니다(neutral 램프를 밝게·어둡게 모두 보정해도 불가)"
      ],
      [
        "data-dense",
        40,
        "palette:dawn-rose × subtoken-set:data-dense (light): focus vs tableSelected 2.6241:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "muted-periwinkle",
    "label": "뮤티드 페리윙클",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#51806D",
      "accent": "#6B5600",
      "neutral": "#61696F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "뮤티드 페리윙클의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "pastel"
  },
  {
    "id": "biscuit-neutral",
    "label": "비스킷 뉴트럴",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#8F74B5",
      "accent": "#006182",
      "neutral": "#6B656D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:biscuit-neutral × subtoken-set:standard (light): focus vs tableHead 2.8715:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:biscuit-neutral × subtoken-set:data-dense (light): focus vs tableSelected 2.8715:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "frosted-mint",
    "label": "프로스테드 민트",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#9C758F",
      "accent": "#7D6700",
      "neutral": "#646A5F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:frosted-mint × subtoken-set:standard (light): focus vs tableHead 2.8672:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:frosted-mint × subtoken-set:data-dense (light): focus vs tableSelected 2.8672:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "hazy-lavender",
    "label": "헤이지 라벤더",
    "family": "pastel",
    "tone": "bright",
    "seeds": {
      "brand": "#A37C35",
      "accent": "#045D5C",
      "neutral": "#6B625D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:hazy-lavender × subtoken-set:standard (light): focus vs tableHead 2.7521:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:hazy-lavender × subtoken-set:data-dense (light): focus vs tableSelected 2.7521:1 < 3:1"
      ]
    ],
    "group": "pastel"
  },
  {
    "id": "soft-papyrus",
    "label": "소프트 파피루스",
    "family": "pastel",
    "tone": "mid",
    "seeds": {
      "brand": "#1F7FA2",
      "accent": "#8E3B1F",
      "neutral": "#5F6A6A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "소프트 파피루스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "pastel"
  },
  {
    "id": "cyberpunk-neon",
    "label": "사이버펑크 네온",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#6D40F5",
      "accent": "#674600",
      "neutral": "#5C6058",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "사이버펑크 네온의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "electric-lime",
    "label": "일렉트릭 라임",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#6F0DD2",
      "accent": "#005767",
      "neutral": "#566163",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "일렉트릭 라임의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "hyper-yellow",
    "label": "하이퍼 옐로우",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#A31ACD",
      "accent": "#7C2B52",
      "neutral": "#5E5E66",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "하이퍼 옐로우의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "acid-green",
    "label": "애시드 그린",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#492CE1",
      "accent": "#355900",
      "neutral": "#665C5D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "애시드 그린의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "radiant-ultraviolet",
    "label": "래디언트 울트라바이올렛",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#B800A9",
      "accent": "#32478E",
      "neutral": "#625E56",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "래디언트 울트라바이올렛의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "signal-orange",
    "label": "시그널 오렌지",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#8600B5",
      "accent": "#7F3200",
      "neutral": "#58615D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "시그널 오렌지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "laser-blue",
    "label": "레이저 블루",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#8B2EE5",
      "accent": "#005A51",
      "neutral": "#586066",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "레이저 블루의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "supernova-pink",
    "label": "슈퍼노바 핑크",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#4250FC",
      "accent": "#6A3374",
      "neutral": "#635C63",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "슈퍼노바 핑크의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "flash-amber",
    "label": "플래시 앰버",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#0041E2",
      "accent": "#5A4D00",
      "neutral": "#665C58",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "플래시 앰버의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "solar-flare",
    "label": "솔라 플레어",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#960097",
      "accent": "#1D5293",
      "neutral": "#5B635D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "솔라 플레어의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "atomic-tangerine",
    "label": "아토믹 탠저린",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#9D0080",
      "accent": "#006249",
      "neutral": "#676254",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "아토믹 탠저린의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "voltage-red",
    "label": "볼티지 레드",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#563EBE",
      "accent": "#005E2A",
      "neutral": "#5D5E67",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "볼티지 레드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "kinetic-cyan",
    "label": "키네틱 시안",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#6855D6",
      "accent": "#8C3D6B",
      "neutral": "#625F53",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "키네틱 시안의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "high-vis-green",
    "label": "하이비즈 그린",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#A52100",
      "accent": "#506800",
      "neutral": "#55625D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "하이비즈 그린의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "hyper-magenta",
    "label": "하이퍼 마젠타",
    "family": "vivid",
    "tone": "mid",
    "seeds": {
      "brand": "#078700",
      "accent": "#045C63",
      "neutral": "#58615C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "하이퍼 마젠타의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "turbo-blue",
    "label": "터보 블루",
    "family": "vivid",
    "tone": "bright",
    "seeds": {
      "brand": "#C204CF",
      "accent": "#8F363C",
      "neutral": "#636069",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "터보 블루의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "tinted",
        40,
        "palette:turbo-blue × subtoken-set:tinted (dark): focus vs tableSelected 2.9273:1 < 3:1"
      ]
    ],
    "group": "vivid"
  },
  {
    "id": "prism-rainbow",
    "label": "프리즘 레인보우",
    "family": "vivid",
    "tone": "bright",
    "seeds": {
      "brand": "#E60100",
      "accent": "#485400",
      "neutral": "#625C64",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "프리즘 레인보우의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "tinted",
        40,
        "palette:prism-rainbow × subtoken-set:tinted (dark): focus vs tableSelected 2.7569:1 < 3:1"
      ]
    ],
    "group": "vivid"
  },
  {
    "id": "plasma-purple",
    "label": "플라즈마 퍼플",
    "family": "vivid",
    "tone": "bright",
    "seeds": {
      "brand": "#A72AF1",
      "accent": "#6D4200",
      "neutral": "#665C59",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "플라즈마 퍼플의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "shocking-coral",
    "label": "쇼킹 코랄",
    "family": "vivid",
    "tone": "bright",
    "seeds": {
      "brand": "#DF0066",
      "accent": "#813C00",
      "neutral": "#5C635C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "쇼킹 코랄의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "tinted",
        40,
        "palette:shocking-coral × subtoken-set:tinted (dark): focus vs tableSelected 2.8287:1 < 3:1"
      ]
    ],
    "group": "vivid"
  },
  {
    "id": "vivid-citrus",
    "label": "비비드 시트러스",
    "family": "vivid",
    "tone": "bright",
    "seeds": {
      "brand": "#546CE9",
      "accent": "#953C49",
      "neutral": "#5E5D69",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "비비드 시트러스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "vivid"
  },
  {
    "id": "midnight-gold",
    "label": "미드나잇 골드",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#884D53",
      "accent": "#94421F",
      "neutral": "#515F61",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "미드나잇 골드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "emerald-velvet",
    "label": "에메랄드 벨벳",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#8A3E87",
      "accent": "#026D5F",
      "neutral": "#5A5B66",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "에메랄드 벨벳의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "imperial-purple",
    "label": "임페리얼 퍼플",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#795077",
      "accent": "#9D486C",
      "neutral": "#675D55",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "임페리얼 퍼플의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "bordeaux-noir",
    "label": "보르도 느와르",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#61588A",
      "accent": "#812E16",
      "neutral": "#62595D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "보르도 느와르의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "champagne-glow",
    "label": "샴페인 글로우",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#78459B",
      "accent": "#A7480F",
      "neutral": "#615B51",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "샴페인 글로우의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "sapphire-sovereign",
    "label": "사파이어 소버린",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#743C4A",
      "accent": "#9F5021",
      "neutral": "#615D68",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "사파이어 소버린의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "obsidian-bronze",
    "label": "옵시디언 브론즈",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#7E2867",
      "accent": "#544FA9",
      "neutral": "#56605D",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "옵시디언 브론즈의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "cognac-rich",
    "label": "코냑 리치",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#584474",
      "accent": "#57519E",
      "neutral": "#655955",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "코냑 리치의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "royal-onyx",
    "label": "로열 오닉스",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#834D66",
      "accent": "#815C00",
      "neutral": "#576158",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "로열 오닉스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "caviar-pearl",
    "label": "캐비어 펄",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#753E35",
      "accent": "#753A8C",
      "neutral": "#645958",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "캐비어 펄의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "deep-forest-gold",
    "label": "딥 포레스트 골드",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#923A79",
      "accent": "#41428C",
      "neutral": "#545F5C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "딥 포레스트 골드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "platinum-slate",
    "label": "플래티넘 슬레이트",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#884F43",
      "accent": "#457121",
      "neutral": "#685A58",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "플래티넘 슬레이트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "gilded-plum",
    "label": "길디드 플럼",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#275C3B",
      "accent": "#6A5AA8",
      "neutral": "#5B6258",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "길디드 플럼의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "truffle-warm",
    "label": "트러플 웜",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#6E5383",
      "accent": "#71306A",
      "neutral": "#625A54",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "트러플 웜의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "midnight-navy",
    "label": "미드나잇 네이비",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#63416B",
      "accent": "#515100",
      "neutral": "#585E56",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "미드나잇 네이비의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "vintage-brass",
    "label": "빈티지 브라스",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#494A7A",
      "accent": "#A64D69",
      "neutral": "#675852",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "빈티지 브라스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "dark-truffle",
    "label": "다크 트러플",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#3F5928",
      "accent": "#822B2B",
      "neutral": "#5C5A63",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "다크 트러플의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "regalia-crimson",
    "label": "리가일리아 크림슨",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#753C3F",
      "accent": "#3A68AD",
      "neutral": "#56635E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "리가일리아 크림슨의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "silk-ebony",
    "label": "실크 에보니",
    "family": "luxury",
    "tone": "mid",
    "seeds": {
      "brand": "#864C5C",
      "accent": "#573A84",
      "neutral": "#5E5C53",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "실크 에보니의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "burnished-copper",
    "label": "버니쉬드 코퍼",
    "family": "luxury",
    "tone": "dark",
    "seeds": {
      "brand": "#562A80",
      "accent": "#684500",
      "neutral": "#545F5B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "버니쉬드 코퍼의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "palace-noir",
    "label": "팰리스 느와르",
    "family": "luxury",
    "tone": "dark",
    "seeds": {
      "brand": "#00467E",
      "accent": "#6554A1",
      "neutral": "#675A5A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "팰리스 느와르의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "premium-dark",
        25,
        "다크 톤이 깊은 표면 위에서 안정된 명암비를 유지한다"
      ]
    ],
    "avoids": [],
    "group": "luxury"
  },
  {
    "id": "spectrum-dynamic",
    "label": "스펙트럼 다이내믹",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#5768B4",
      "accent": "#6A4400",
      "neutral": "#6A626B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "스펙트럼 다이내믹의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "synthwave-sunset",
    "label": "신스웨이브 선셋",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#3671B2",
      "accent": "#9C4247",
      "neutral": "#676358",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "신스웨이브 선셋의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "carnival-festive",
    "label": "카니발 페스티브",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#624691",
      "accent": "#00650F",
      "neutral": "#6D5F61",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "카니발 페스티브의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "bauhaus-primary",
    "label": "바우하우스 프라이머리",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#2E6720",
      "accent": "#0275B3",
      "neutral": "#6D6261",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "바우하우스 프라이머리의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "retro-arcade",
    "label": "레트로 아케이드",
    "family": "multi-color",
    "tone": "bright",
    "seeds": {
      "brand": "#B840B0",
      "accent": "#904606",
      "neutral": "#635F6B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "레트로 아케이드의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "tropical-tropicana",
    "label": "트로피컬 트로피카나",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#3333B7",
      "accent": "#006C68",
      "neutral": "#6C5E5E",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "트로피컬 트로피카나의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "cosmic-nebula",
    "label": "코스믹 네뷸라",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#6D119C",
      "accent": "#34468E",
      "neutral": "#695E60",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "코스믹 네뷸라의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "metro-transit",
    "label": "메트로 트랜짓",
    "family": "multi-color",
    "tone": "bright",
    "seeds": {
      "brand": "#A649C8",
      "accent": "#676000",
      "neutral": "#576561",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "메트로 트랜짓의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "neon-shibuya",
    "label": "네온 시부야",
    "family": "multi-color",
    "tone": "bright",
    "seeds": {
      "brand": "#A56185",
      "accent": "#694B96",
      "neutral": "#5B626C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "네온 시부야의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "pop-art-graphic",
    "label": "팝아트 그래픽",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#004BC5",
      "accent": "#097744",
      "neutral": "#6D5F62",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "팝아트 그래픽의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "aurora-borealis",
    "label": "오로라 보레알리스",
    "family": "multi-color",
    "tone": "bright",
    "seeds": {
      "brand": "#C14290",
      "accent": "#205899",
      "neutral": "#6D6261",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "오로라 보레알리스의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "carnival-rio",
    "label": "카니발 리오",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#940300",
      "accent": "#634D99",
      "neutral": "#5E6459",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "카니발 리오의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "commerce-vivid",
        40,
        "palette:carnival-rio × subtoken-set:commerce-vivid (dark): COLOR_CONTRAST: no text color reaches 4.5:1 on accent"
      ]
    ],
    "group": "multi-color"
  },
  {
    "id": "electric-festival",
    "label": "일렉트릭 페스티벌",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#2A498E",
      "accent": "#984B00",
      "neutral": "#64645B",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "일렉트릭 페스티벌의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "geometric-pop",
    "label": "지오메트릭 팝",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#601CA7",
      "accent": "#86370E",
      "neutral": "#5B656A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "지오메트릭 팝의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "memphis-modern",
    "label": "멤피스 모던",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#831D9E",
      "accent": "#005C3D",
      "neutral": "#5F616A",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "멤피스 모던의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "horizon-gradient",
    "label": "호라이즌 그라디언트",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#6763B1",
      "accent": "#00489F",
      "neutral": "#60606C",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "호라이즌 그라디언트의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "cyber-odyssey",
    "label": "사이버 오디세이",
    "family": "multi-color",
    "tone": "bright",
    "seeds": {
      "brand": "#AC606E",
      "accent": "#8F3830",
      "neutral": "#61675F",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "사이버 오디세이의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "confection-pop",
    "label": "컨펙션 팝",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#925393",
      "accent": "#1F4798",
      "neutral": "#6F5E60",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "캔디 팝의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [],
    "group": "multi-color"
  },
  {
    "id": "rainbow-bridge",
    "label": "레인보우 브릿지",
    "family": "multi-color",
    "tone": "mid",
    "seeds": {
      "brand": "#920034",
      "accent": "#006E5D",
      "neutral": "#675E67",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "standard",
        20,
        "레인보우 브릿지의 색상 위계가 표준 컴포넌트 표면과 잘 맞는다"
      ],
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "commerce-vivid",
        40,
        "palette:rainbow-bridge × subtoken-set:commerce-vivid (dark): COLOR_CONTRAST: no text color reaches 4.5:1 on accent"
      ]
    ],
    "group": "multi-color"
  },
  {
    "id": "chromatic-pulse",
    "label": "크로매틱 펄스",
    "family": "multi-color",
    "tone": "bright",
    "seeds": {
      "brand": "#3E8C64",
      "accent": "#1B4C8D",
      "neutral": "#645F68",
      "success": "#40783B",
      "warning": "#9C6900",
      "danger": "#A83634",
      "info": "#196EA9"
    },
    "prefers": [
      [
        "editorial-warm",
        25,
        "밝고 부드러운 톤이 지면과 잘 어우러진다"
      ]
    ],
    "avoids": [
      [
        "standard",
        40,
        "palette:chromatic-pulse × subtoken-set:standard (light): focus vs tableHead 2.887:1 < 3:1"
      ],
      [
        "data-dense",
        40,
        "palette:chromatic-pulse × subtoken-set:data-dense (light): focus vs tableSelected 2.887:1 < 3:1"
      ]
    ],
    "group": "multi-color"
  }
].map(({group, ...p}) => own({...p, origin: B1_ORIGIN, tags: [`group:${group}`]})));

export const PALETTES = Object.freeze([
  definePlatformMaterial({
    id: 'palette:static-kit', kind: 'palette', label: 'Static Kit', tone: 'mid',
    seeds: {brand: s.brand, neutral: s.neutral, accent: s.auxiliary, success: s.status.success, warning: s.status.warning, danger: s.status.danger, info: s.status.info},
    relations: [
      {type: 'prefers', to: 'subtoken-set:standard', priority: 20, reason: '2.6.0 static-kit 색 토큰 그래프와 같은 역할 분배다'},
      // 팔레트가 여럿이 되면 앵커 없는 추천은 id 순이 된다. 업무 화면(workspace)의 기본값은 2.6.0 기본 팔레트로 유지한다.
      {type: 'prefers', to: 'style-context:workspace', priority: 15, reason: '업무 화면의 기본 팔레트다(2.6.0 static-kit 기본값과 같다)'},
    ],
    quality: {status: 'implemented', evidence: []}, source: {origin: '2.6.0 static-kit 색 토큰 시스템(프로젝트 내부 제작)', license: 'internal'}, reuses: ['color-token:palette.static-kit.brand.500'], tags: ['family:static-kit', 'internal', 'group:multi-color'],
  }),
  own({
    id: 'slate-neutral', label: '슬레이트 중립', family: 'neutral', tone: 'mid',
    seeds: {brand: '#4B5C74', neutral: '#5D6878', accent: '#9A5B3E', success: '#2E7752', warning: '#8E6200', danger: '#B03A44', info: '#3A64A8'},
    prefers: [['standard', 30, '채도가 낮은 청회색이라 색이 화면을 이끌지 않는 제품 UI에 맞는다'], ['data-dense', 25, '채도가 낮아 표와 차트의 데이터 색이 두드러진다']], tags: ['group:neutral'],
  }),
  own({
    id: 'sunrise-warm', label: '선라이즈 웜', family: 'warm', tone: 'mid',
    seeds: {brand: '#D2501E', neutral: '#6F625A', accent: '#A3294F', success: '#2F7A4B', warning: '#A86500', danger: '#BE3030', info: '#2F66B8'},
    prefers: [['editorial-warm', 30, '주황 브랜드와 베리 보조색이 따뜻한 지면 분위기를 만든다'], ['commerce-vivid', 25, '주황 계열 행동 유도 버튼이 상품 화면에서 눈에 띈다']], tags: ['group:warm'],
  }),
  own({
    id: 'ocean-cool', label: '오션 쿨', family: 'cool', tone: 'mid',
    seeds: {brand: '#0D6E8E', neutral: '#576B7E', accent: '#6A52C9', success: '#1F7A5C', warning: '#8F6500', danger: '#B13A4F', info: '#2B5FB5'},
    prefers: [['standard', 25, '청록 브랜드가 차분한 제품 UI의 신뢰감을 준다'], ['premium-dark', 25, '청록은 어두운 면 위에서 밝고 차갑게 떠 보인다']], tags: ['group:blue-cyan'],
  }),
  own({
    id: 'forest-green', label: '포레스트 그린', family: 'green', tone: 'mid',
    seeds: {brand: '#2E7A52', neutral: '#5A6B5F', accent: '#B07A1F', success: '#2C8340', warning: '#9E6A00', danger: '#B23A3A', info: '#2D6A9F'},
    prefers: [['editorial-warm', 20, '녹색과 황토 보조색이 자연 매체 지면에 맞는다'], ['standard', 20, '녹색 브랜드 액션이 상태 신호와 구분되도록 램프에서 보정된다']], tags: ['group:green-teal'],
  }),
  own({
    id: 'clay-earth', label: '클레이 어스', family: 'earth', tone: 'mid',
    seeds: {brand: '#8A6238', neutral: '#6B6355', accent: '#56784F', success: '#3F7A45', warning: '#9A6B08', danger: '#B04032', info: '#3E6F8C'},
    prefers: [['editorial-warm', 35, '갈색 브랜드와 세이지 보조색이 종이 질감의 지면에 맞는다'], ['premium-dark', 20, '갈색 램프의 밝은 단계가 어두운 면에서 금속 느낌을 낸다']], tags: ['group:earth'],
  }),
  own({
    id: 'graphite-mono', label: '그래파이트 모노', family: 'mono', tone: 'dark',
    seeds: {brand: '#2B2D33', neutral: '#5E5F63', accent: '#4D4F57', success: '#2F7A4F', warning: '#8D6200', danger: '#B23A40', info: '#37649F'},
    prefers: [['high-contrast', 35, '무채색 램프는 글자와 면의 대비를 가장 안정적으로 낸다'], ['premium-dark', 30, '무채색 면이 어두운 프리미엄 화면의 바탕이 된다']],
    avoids: [['commerce-vivid', 40, '보조색이 회색이라 선명한 강조색이라는 이 세트의 의도를 살리지 못한다']], tags: ['group:neutral'],
  }),
  own({
    id: 'dusk-violet', label: '더스크 바이올렛', family: 'violet', tone: 'mid',
    seeds: {brand: '#6D49B8', neutral: '#645F78', accent: '#C0507A', success: '#2D7A58', warning: '#946000', danger: '#B8384A', info: '#3E64B5'},
    prefers: [['premium-dark', 35, '보라 브랜드는 어두운 면 위에서 고급스러운 인상을 준다'], ['tinted', 20, '보라 틴트 바탕이 브랜드색이 도는 화면을 만든다']], tags: ['group:purple-pink'],
  }),
  own({
    id: 'magenta-vivid', label: '마젠타 비비드', family: 'vivid', tone: 'bright',
    seeds: {brand: '#D1228F', neutral: '#6A6373', accent: '#00A3AD', success: '#1F8A4C', warning: '#A66A00', danger: '#C42B3C', info: '#2E6FD0'},
    prefers: [['commerce-vivid', 40, '채도가 높은 마젠타와 청록 보조색이 보색 대비로 강조점을 만든다']], tags: ['group:vivid'],
  }),
  ...B1_PALETTES,
]);
