# 공식 디자인 원칙과 static kit 적용 판단

확인일: 2026-11-16  
범위: 공식 시스템 8개와 kit에 직접 연결되는 로컬 참고 경로. 이전 Run의 보호된 outbox는 열지 않았고, 내용을 확인했다는 주장도 하지 않는다.

## 판단 기준

현재 kit는 카탈로그 2.2.0 / composition 1.0.0에서 이미 의미 역할, 간격 관계, 콘텐츠 폭 예산, 실제 컨테이너 기준 배치를 정의한다. 외부 시스템은 맥락과 예외를 비교하는 근거로만 사용한다. 외부 숫자·토큰을 kit의 보편 규칙으로 복사하지 않는다. 정확한 8개 요약과 기계 검증 가능한 필드는 JSON 정본인 [design-research.json](design-research.json)에 있다.

## 시스템별 요약

| 시스템·공식 출처 | 적용 맥락 / 조건 | 결과와 예외 | kit 채택 판단 |
|---|---|---|---|
| [Carbon Form](https://www.carbondesignsystem.com/building-blocks/core/components/form/guidelines), [Data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | 업무용 폼은 안내·입력·행동이 이어져야 한다. 데이터 테이블은 메인 콘텐츠에서 잘림 없이 읽힐 폭을 확보하고, 행·도구 모음의 상호작용은 컴포넌트 기준을 따른다. | 밀도 높은 테이블은 페이지 폭 우선권을 받는다. 좁은 gutter에서는 인접 UI와 혼동되지 않게 분리한다. 확장 행도 내용이 답답하면 전용 페이지/패널로 옮긴다. | 폼·표가 실제 할당 영역을 수용하는지 판단하는 원칙을 채택. Carbon의 grid/gutter 치수와 시각 스타일은 kit 기본값으로 가져오지 않는다. |
| [Material 3 Applying type](https://m3.material.io/styles/typography/applying-type) | 의미 있는 type role로 목적을 구분한다. 웹·해당 iOS는 line-height/bounding box, Android 또는 플랫폼 중립 명세는 baseline 기준을 고려한다. 확대 텍스트와 adaptive layout을 반영한다. | 역할에 맞는 type hierarchy와 line-height·padding·container 관계를 만든다. 표현적 글꼴은 짧고 강조된 표시용이며 body와 플랫폼별 메트릭은 별도 판단이다. | 의미 역할, bounding box와 여백의 분리를 채택. 기존 kit 역할과 서체 프리셋을 유지하고 Material scale을 대입하지 않는다. |
| [Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Apple 네이티브 앱의 실제 size class, safe area, 윈도 크기, 로케일, Dynamic Type에 맞춘다. 화면 종류나 방향을 폭의 대리값으로 삼지 않는다. | 공간에 맞춰 재배치하고 읽기 순서·기능·친숙함을 유지한다. size class·safe area·포인트 규칙은 Apple 플랫폼 맥락이다. | 실제 할당 폭과 텍스트 확대에 맞춘 reflow 원칙을 채택. native API와 Apple 전용 치수는 정적 범용 웹 kit에 가져오지 않는다. |
| [Fluent 2 Typography](https://fluent2.microsoft.design/typography), [Layout](https://fluent2.microsoft.design/layout) | 플랫폼별 type ramp와 native font 동작을 고려하고, 여백·근접성으로 관계를 표현한다. 작은/큰 창에서 실제 영역에 맞춰 reflow한다. | 위계를 유지하면서 열과 보이는 정보량을 조정한다. Segoe 및 플랫폼별 type ramp는 Fluent의 시스템 선택이다. | 컨테이너 폭 기준 reflow와 위계 보존을 채택. Fluent 토큰·서체 램프는 사용하지 않는다. |
| [Spectrum Body](https://spectrum.adobe.com/page/body/), [Applying the type system](https://spectrum.adobe.com/foundations/typography/applying-the-type-system) | 장문 body와 UI component/detail/metric 역할을 구분한다. 웹·iOS·Android, 스크립트, 테마에 따라 line metrics와 폰트를 확인한다. | 크기·굵기·색으로 위계를 만든다. Adobe Clean, line-height 값, Android/iOS 동작은 시스템/플랫폼별이며 로컬라이즈된 글리프 폭은 재확인이 필요하다. | body/component/detail/metric의 의미 구분과 현지화 점검을 채택. Spectrum 폰트와 metric 값을 복사하지 않고 kit의 한글 fallback을 유지한다. |
| [Atlassian Applying typography](https://atlassian.design/foundations/typography/applying-typography/) | heading·body·metric을 의미에 맞게 쓰고 spacing/color token 및 HTML heading 구조와 함께 적용한다. | metric은 짧은 수치 강조에 적합하고 주변 설명은 낮은 위계로 둔다. 긴 설명, 차트 범례, 일부 결제 총액에는 metric을 쓰지 않는 예외가 명시돼 있다. | KPI 수치와 라벨의 위계 분리를 채택. 크기 선택은 kit 콘텐츠 폭 예산으로 결정한다. |
| [Shopify Polaris Visual design](https://shopify.dev/docs/apps/design/visual-design), [Polaris docs](https://shopify.dev/docs/api/polaris), [App Home](https://shopify.dev/docs/api/app-home/latest) | Shopify Admin 안에서 이어지는 merchant workflow, App Home, Admin UI extension에 Polaris 시각 단서를 맞춘다. 실제 표면과 버전에 맞는 현행 developer 문서를 본다. | 호스트 Admin과 앱 사이의 경험을 일관되게 한다. Polaris 권고는 Admin 통합 맥락에 한정되고 App Home 라이브러리는 버전이 지정된다. | “호스트에 내장되면 호스트 디자인 시스템을 따른다”는 조건부 원칙을 채택. 호스트 중립적인 kit 전역 기본값은 아니다. |
| [Ant Design Form Page](https://ant.design/docs/spec/research-form) | 폼 복잡도·정보 연관성·과업 흐름에 따라 단일 열, 그룹, 단계 분해를 고른다. 관계가 약한 한 영역에서 여러 열로 읽기 순서를 흐리지 않는다. | 짧은 단일 과업은 기본 세로 흐름, 복잡한 과업은 분류·그룹화한다. editable-list는 문서상 개발 중이고 항목 수 권고는 해당 가이드 맥락이다. | 복잡도와 연관성으로 레이아웃을 고르는 판단을 채택. kit의 field capacity 예산은 자체 근거로 유지하며 외부 임계값을 가져오지 않는다. |

## 로컬 참고 자산과 경계

아래 경로는 파일 존재와 검토 범위를 확인한 로컬 자산이다. 파일에 포함된 제3자 인용·자료의 권리까지 확인했다는 뜻은 아니다. 상세 목록은 JSON의 `local_assets`에 있다.

- `winterholic-skill`: `/Users/winterholic/development/projects/portfolio/opensource/winterholic-skill`. 공개 미러의 관련 경로는 `biz-experts-skills/biz-ui-designer`, `biz-ux-designer`, `biz-design-system`, `biz-product-designer`, `skills/ui-refine-loop`이다. 로컬 원본은 `/Users/winterholic/.claude/biz-experts-skills/`와 `/Users/winterholic/.claude/skills/ui-refine-loop/` 아래다.
- UI 전문가는 시각 위계·타이포·색·간격·정렬, UX 전문가는 흐름·정보구조·상호작용·오류 예방, 디자인시스템 전문가는 토큰·컴포넌트·거버넌스, 제품디자인 전문가는 문제부터 출시·측정까지의 전 과정을 다룬다.
- `ui-refine-loop`: `/Users/winterholic/.claude/skills/ui-refine-loop/SKILL.md` 및 `references/{checklists,research,scale-extraction}.md`; 렌더된 화면의 범위 설정·캡처·계측·리뷰 절차다. 이 kit의 공식 설계 기준으로 승격하지 않았다.
- `Taste`로 찾은 경로는 `~/.claude/skills/diagram-design/references/pre-output-checklist.md`의 “Taste Gate”와 공개 미러의 동일 경로다. 별도 디자인 시스템이나 외부 원출처는 식별하지 못해 kit 토큰 판단에는 쓰지 않았다.
- `Jakub` 이름의 자산은 kit 저장소, 공개 skill mirror, 관련 로컬 전문가 스킬 및 로컬 design-system source 디렉터리 검색에서 발견되지 않았다. 출처 식별과 권리 확인도 미완료다.
- 기존 `/Users/winterholic/.claude/sources/design-system.html`은 `Report Design System` 문서다. 파일이 존재한다는 것만 확인했으며 Jakub/Taste 출처로 간주하지 않았다.

## 검증 경로

재파싱과 필수 필드 검증은 아래 명령으로 수행한다. 8개 항목, 각 항목의 공식 URL·적용 맥락·조건·결과·예외·적용 판단·확인일 및 `winterholic-skill`, UI/UX/디자인시스템/제품, `ui-refine-loop`, `Jakub`, `Taste`의 경로·검토 범위·권리 상태를 검사한다.

```sh
node -e 'const d=JSON.parse(require("fs").readFileSync("docs/evidence/context/design-research.json","utf8")); const fields=["applicability","conditions","outcome","exceptions","adoption_judgment","checked_at"]; if(d.systems.length!==8) throw Error(`systems=${d.systems.length}`); for(const s of d.systems){if(!s.official_sources?.length||fields.some(k=>!s[k])) throw Error(`invalid ${s.name}`)} const names=new Set(d.local_assets.map(x=>x.name)); for(const n of ["winterholic-skill public mirror","biz UI expert","biz UX expert","biz design-system expert","biz product-design expert","ui-refine-loop","Jakub","Taste"]) if(!names.has(n)) throw Error(`missing asset ${n}`); for(const a of d.local_assets) if(!a.review_scope||!a.rights_status||!Array.isArray(a.paths)) throw Error(`invalid asset ${a.name}`); console.log(`JSON_OK systems=${d.systems.length} assets=${d.local_assets.length} required_fields=all`);'
```

로컬 경로 확인은 저장소 파일 목록과 명시한 절대 경로를 대상으로 별도 실행한다. 권리 상태가 `unknown`/`unverified`이면 검증 완료가 아니라 미확인으로 기록한다.
