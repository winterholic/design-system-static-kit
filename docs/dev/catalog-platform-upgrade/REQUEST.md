# Static Kit 디자인 조립 플랫폼 대규모 고도화 작업지시서

## 0. 작업 대상 및 최종 목적

- Repository: `winterholic/design-system-static-kit`
- 대상: Core, 재료 레지스트리, 조립 엔진, Next.js 웹 애플리케이션, REST API, MCP, 검증 시스템, Vercel 배포 환경
- 기존 분석 기준 커밋: `05ecf576`
- 실제 작업은 최신 main을 확인한 후 시작한다.

이 프로젝트의 최종 목적은 디자인 예제 전시장이나 프롬프트 기반 디자인 생성기가 아니다.

**디자인에 필요한 재료를 충분히 사전 정의하고, 코드 기반의 결정론적 선택·검증·조립을 통해 다양한 고품질 UI를 만들 수 있는 범용 디자인 조립 플랫폼이다.**

현재 프로젝트는 결정론적 조립 엔진, 재료 관계 그래프, 검증 및 컴파일 체계에서 상당한 진전을 이루었다. 그러나 다음 문제가 남아 있다.

- 실제 디자인 재료의 종류가 충분하지 않다.
- 기존 카탈로그와 신규 조립 플랫폼이 분리되어 있다.
- 신규 재료가 정의되어 있어도 웹사이트에서 충분히 확인하기 어렵다.
- 일부 페이지에 기존 UI와 신규 UI가 중복되어 있다.
- 컴포넌트 탐색을 위해 과도한 스크롤이 필요하다.
- 팔레트와 서브토큰 세트의 선택 흐름이 직관적이지 않다.
- 타이포그래피 전체 종류의 시각적 비교가 어렵다.
- 미리보기 생성과 중복 컴파일로 프론트엔드 성능이 저하될 가능성이 높다.

이번 작업에서는 위 문제들을 실제 제품 수준에서 해결한다.

---

# 1. 절대 준수해야 하는 개발 원칙

## 1.1 결정론적 설계 유지

- 같은 Blueprint, 같은 재료 버전, 같은 입력은 동일한 HTML·CSS·토큰을 생성해야 한다.
- LLM을 디자인 선택 및 컴파일의 필수 런타임으로 도입하지 않는다.
- 재료, 변형, 호환성, 추천, 상태, 조립 규칙은 코드와 구조화된 데이터로 정의한다.
- 자유 CSS 생성으로 부족한 재료를 우회하지 않는다.
- 기존 Core의 순수 서비스 경계와 컴파일 계약을 유지한다.
- 기존 버전의 고정 출력 해시 및 하위 호환성 계약을 깨지 않는다.
- 출력 변경이 필요한 경우 프로젝트의 버전 관리 정책에 따라 명시적으로 버전을 올린다.

## 1.2 재료의 실질적인 완성도

다음은 신규 재료 구현으로 인정하지 않는다.

- enum 값만 추가하는 것
- 이름과 설명만 바꾼 동일 재료
- CSS 변수가 선언됐지만 실제 사용되지 않는 재료
- 렌더러가 연결되지 않은 JSON 정의
- 사이트에서 확인하거나 선택할 수 없는 재료
- 실제 출력이 동일한 조합을 독립적인 디자인 종류로 집계하는 것
- 테스트 통과를 위해 요구 범위를 임의로 축소하는 것
- 신규 경로를 추가하는 것으로 기존 사용자 경험의 개선을 대신하는 것

각 재료는 정의, 렌더링, 탐색, 조립, 내보내기, 검증의 전체 경로가 연결되어야 한다.

## 1.3 사전 정의와 사전 렌더링의 분리

디자인 재료는 충분히 사전 정의하되, 모든 재료와 조합을 브라우저에서 동시에 렌더링하지 않는다.

카탈로그에 10,000개의 재료가 존재하더라도 첫 페이지에 10,000개의 DOM 요소 또는 iframe을 생성해서는 안 된다.

재료 확충을 성능 저하의 정당한 이유로 사용하지 않는다.

---

# 2. Phase 0 — 기존 시스템 전수 감사 및 작업 기준선 수립

구현에 앞서 최신 main을 기준으로 실제 재료 및 연결 현황을 조사한다.

기존 감사 문서를 그대로 복사하지 말고 현재 코드와 서비스 출력에서 데이터를 추출한다.

## 2.1 조사 대상

- `src/catalog/`
- `src/materials/`
- `src/platform/`
- `src/service/`
- `src/edit/`
- `apps/web/app/`
- `apps/web/features/`
- REST API 및 MCP 도구
- 기존 브라우저 테스트 및 품질 검사기
- Vercel 배포 설정 및 실제 운영 배포 버전
- 기존 기준선 및 고정 출력 해시

기존 분석에서 확인된 주요 현황은 다음과 같다.

| 재료 | 기존 분석 기준 |
|---|---:|
| 신규 플랫폼 팔레트 | 9 |
| 서브토큰 세트 | 7 |
| 신규 타이포 시스템 | 14 |
| 기존 타이포 프리셋 | 18 |
| 기존 역할형 타이포 프리셋 | 4 |
| 기반 컴포넌트 | 10 |
| 목적별 컴포넌트 | 32 |
| 시각 패밀리 | 4 |
| 기존 구조 부품 | 65 |
| 차트 프리셋 | 29 |
| 아이콘 | 87 |
| 템플릿 | 85 |

이 수량은 이전 분석의 기준값이므로 현재 코드에서 다시 확인한다.

## 2.2 Material Coverage Manifest 구축

모든 재료에 대해 다음 정보를 추적하는 기계 판독 가능한 Manifest를 생성한다.

- 고유 ID
- 재료 유형 및 카테고리
- 지원 버전
- 실제 정의 경로
- 렌더러 연결 여부
- 실제 CSS 및 토큰 사용 여부
- 지원 변형 및 상태
- 웹 카탈로그 노출 여부
- 상세 페이지 존재 여부
- Studio 조립 가능 여부
- REST 및 MCP 사용 가능 여부
- Blueprint 표현 가능 여부
- 내보내기 반영 여부
- 접근성 및 반응형 테스트 여부
- 품질 검증 결과
- 권리 및 라이선스 상태
- 기존 시스템과 신규 시스템의 중복 여부

재료 상태는 다음으로 구별한다.

- `missing`
- `metadata-only`
- `defined`
- `renderable`
- `catalog-visible`
- `assemblable`
- `verified`

등록 수, 실질적 재료 수, 조합 가능 수, 실제 조립 검증 수, 고유 출력 수를 별도로 집계한다.

조합 가능 수를 재료 수로 표현하지 않는다.

## 2.3 기존 배포 및 성능 기준선

최적화 전에 실제 운영 빌드 또는 운영 배포에서 다음을 측정한다.

- 주요 페이지의 초기 로딩 시간
- TTFB
- LCP
- INP 또는 실험실 상호작용 지연 지표
- CLS
- 네트워크 요청 수
- HTML·RSC·JS·CSS 전송량
- DOM 요소 수
- 활성 iframe 수
- 초기 및 반복 탐색 시 Core 컴파일 호출 수
- Long Task
- 브라우저 메모리 사용량
- 스크롤 및 탭 전환 성능
- 서버 콜드 스타트와 웜 요청의 차이

대상 페이지:

- Explore
- Materials
- Color
- Palettes
- Typography
- Components
- Components 상세
- Studio

모바일 390px 및 데스크톱 1280px 이상에서 측정한다.

실제 Vercel 접근이 불가능하다면 운영 빌드로 측정하되, 운영 배포 실측 결과로 표현하지 않는다.

---

# 3. Phase 1 — 프론트엔드 성능 구조 우선 개선

재료 확충으로 기존 성능 문제를 악화시키지 않도록 이 작업을 우선 진행한다.

## 3.1 현재 확인된 병목 제거

다음 파일을 중심으로 현재 구현과 최신 변경 사항을 확인한다.

- `apps/web/features/explore/Thumb.tsx`
- `apps/web/app/platform/render/route.ts`
- `apps/web/features/components/spec.server.ts`
- `apps/web/features/platform/platform.server.ts`
- `apps/web/features/platform/TypeCompare.tsx`
- `apps/web/app/components/page.tsx`
- `apps/web/app/explore/page.tsx`
- `apps/web/scripts/sync-static.mjs`

현재 구조에는 다음 병목 후보가 존재한다.

1. 미리보기마다 개별 iframe과 Observer가 생성된다.
2. 화면에서 멀어진 iframe을 제거하고 다시 진입하면 재생성한다.
3. 플랫폼 렌더 경로가 `force-dynamic`, `no-store`로 동작한다.
4. 전시용 미리보기 요청마다 Core 조립이 수행된다.
5. 컴포넌트 목록에서도 `componentView()`로 상세 변형 검증을 수행한다.
6. 타이포그래피 및 Explore에서 조립 가능 여부 검사와 실제 미리보기 조립이 중복된다.
7. 프로세스 내부 캐시만으로는 서버리스 환경에서 충분한 재사용을 보장하기 어렵다.

이미 개선된 부분은 중복 구현하지 말고 실측을 통해 확인한다.

## 3.2 사전 생성 파이프라인

Core의 결정론적 특성을 활용한 전시용 산출물 생성 파이프라인을 구축한다.

빌드 또는 CI 시점에 생성할 대상:

- 경량 재료 카탈로그 인덱스
- 카테고리별 목록 데이터
- 대표 미리보기 이미지
- 대표 정적 HTML
- 변형 및 상태 메타데이터
- 팔레트·서브토큰 호환성 매트릭스
- 대표 타이포그래피 Specimen
- 재료별 적용 가능 범위
- 검증 결과 요약
- 재료 검색 인덱스

모든 가능한 조합을 이미지나 HTML로 전수 생성하지 않는다.

대표 재료 및 대표 변형만 사전 생성하고, 사용자가 직접 만든 조합은 선택 시 컴파일한다.

생성물은 Core 서비스 출력을 기반으로 해야 한다. 전시용 HTML을 별도로 수작업 구현하여 실제 컴파일 결과와 달라지게 하지 않는다.

## 3.3 캐싱 설계

다음 요소를 정규화하여 미리보기 캐시 키를 생성한다.

- 컴파일러 버전
- 카탈로그 버전
- 재료 ID와 버전
- 정규화된 조립 요청
- 콘텐츠 또는 샘플 ID
- 라이트·다크 모드
- 필요한 경우 뷰포트 규격

동일 입력에 대한 결과를 재사용한다.

- 공개된 고정 전시용 미리보기: 정적 자산 또는 버전 해시 기반 CDN 캐시
- 사용자 정의 입력: 범위가 제한된 서버 캐시 또는 세션 캐시
- Studio 편집 결과: 변경 감지 및 입력 해시 기반 재사용

사용자 콘텐츠가 포함된 조립 결과를 무조건 공개 CDN에 캐싱하지 않는다.

캐시 무효화는 재료 및 컴파일러 버전에 연결한다.

무제한 Map 캐시를 만들지 않는다. 크기 상한, 만료 및 제거 정책을 정의한다.

## 3.4 목록 페이지 최적화

- 일반 카탈로그 목록에서 iframe을 제거한다.
- 대표 미리보기는 경량 SVG, WebP 또는 정적인 실제 컴파일 결과를 기반으로 표시한다.
- 상세에서 상호작용을 시험할 때만 iframe 또는 격리된 실행 환경을 사용한다.
- 카테고리별 라우트 또는 탭으로 데이터 로딩 범위를 분리한다.
- 초기 페이지에는 일반적으로 24개 이하의 카드만 로딩한다.
- 대규모 목록은 페이지네이션 또는 필요한 경우 가상화를 적용한다.
- 숨겨진 탭의 컴포넌트는 DOM에 생성하지 않는다.
- 목록에서 상세 변형 컴파일을 수행하지 않는다.
- 과도한 링크 prefetch가 발생하는지 측정하고 필요한 경우 제한한다.

탭으로 화면만 숨기고 전체 데이터를 렌더링하는 방식은 금지한다.

## 3.5 Studio 최적화

- 입력 변경 디바운싱
- 동일 요청 중복 제거
- 이전 요청 취소 또는 오래된 응답 무시
- 변경되지 않은 영역의 재사용
- 색상 및 타이포 변경 시 불필요한 후보 탐색 제거
- 조립 결과와 미리보기 결과의 공유
- 기능별 JS 코드 분할
- 편집하지 않는 대형 패널 지연 로딩

성능 최적화를 위해 검증 자체를 생략하지 않는다.

## 3.6 성능 목표

| 지표 | 목표 |
|---|---:|
| LCP | 2.5초 이하 |
| INP | 200ms 이하 |
| CLS | 0.1 이하 |
| 일반 카탈로그 iframe | 0개 |
| 일반 목록 요청 시 동적 컴파일 | 0회 |
| 고정 미리보기 반복 요청 시 재컴파일 | 0회 |
| 초기 카탈로그 카드 | 최대 24개 원칙 |
| 캐시된 탭 전환 | 200ms 이내 목표 |

Core Web Vitals는 실제 사용자 데이터와 실험실 측정값을 구분한다.

운영 환경에서의 목표 미달이 존재한다면 원인과 개선 전후 측정값을 기록한다.

---

# 4. Phase 2 — 색상 시스템 대규모 확충 및 통합

## 4.1 색상 시스템의 목표 구조

색상 체계는 다음 단계로 구성한다.

원본 팔레트 → 색상 역할 매핑 → Primitive Ramp → Semantic Token → State Token → Component Token → 실제 디자인 적용

팔레트와 서브토큰 세트는 서로 독립적인 재료다.

동일한 팔레트에서 여러 서브토큰 세트를 선택할 수 있어야 하며, 세트에 따라 실제 디자인 결과의 색상 역할 배분이 달라져야 한다.

## 4.2 팔레트 라이브러리 확충

신규 플랫폼에서 실제 선택 가능한 팔레트를 최소 200개까지 확충하는 것을 1차 목표로 한다.

| 색상 계열 | 목표 |
|---|---:|
| Neutral / Monochrome | 20 |
| Blue / Cyan | 20 |
| Green / Teal | 20 |
| Warm / Orange / Red | 20 |
| Earth / Brown / Olive | 20 |
| Purple / Magenta / Pink | 20 |
| Pastel / Muted | 20 |
| Vivid / High Contrast | 20 |
| Luxury / Deep Tone | 20 |
| Multi-color / Experimental | 20 |

각 팔레트는 다음 특성을 정의한다.

- 원본 색상 배열
- 브랜드 후보색
- 보조 및 강조 후보색
- 중립색
- Hue, Chroma, Lightness 특성
- 색상 조화 유형
- 색조 및 채도 분류
- 적합한 제품 맥락
- 역할 매핑 가능성
- 출처 및 라이선스

동일한 색상을 순서만 바꾸거나 명도를 극소량 변경하여 수량을 채우지 않는다.

색상 거리 및 팔레트 구성 유사도를 사용한 중복 검사기를 만든다. OKLCH 또는 이에 준하는 지각 기반 색상 체계를 검토하여 활용한다.

## 4.3 팔레트 출처 및 권리

기존 Coolors 팔레트 427개는 저장소 감사 문서에서 재배포 권리가 확인되지 않은 것으로 기록되어 있다.

- 권리 확인 없이 신규 공개 카탈로그에 재노출하지 않는다.
- 기존 호환 데이터와 신규 공개 라이브러리를 구분한다.
- 자체 생성·큐레이션 팔레트를 충분히 확보한다.
- 재배포가 명시적으로 허용된 자료는 해당 라이선스를 확인하여 사용한다.
- 사용자가 직접 입력하거나 제공한 색상 조합도 지원한다.

Coolors에서 팔레트를 고르는 것과 유사한 편리한 사용자 경험은 제공하되 특정 서비스의 디자인 및 데이터베이스를 무단 복제하지 않는다.

## 4.4 서브토큰 세트 25종 이상 확보

다음 세트를 실제 역할 배분 규칙으로 정의한다.

| 세트 | 설계 특성 |
|---|---|
| Standard Neutral | 중립 표면, 브랜드 액션 |
| Brand Tinted | 브랜드 색조의 배경 및 표면 |
| Brand Dominant | 브랜드가 주요 영역을 지배 |
| Accent Dominant | 보조색 중심의 주요 강조 |
| Soft Pastel | 저채도 표면 및 부드러운 경계 |
| Minimal Monochrome | 무채색 중심, 제한적인 강조 |
| High Contrast | 명확한 전경·배경 대비 |
| Premium Light | 정제된 밝은 표면과 절제된 강조 |
| Premium Dark | 깊은 어두운 배경과 밝은 액션 |
| Editorial Paper | 종이색 표면과 선 중심 구분 |
| Editorial Ink | 진한 텍스트와 제한적 강조색 |
| Corporate | 안정적인 중립 표면과 브랜드 컬러 |
| ERP Dense | 다수의 데이터·경계·상태 표현 |
| Finance Precision | 수치 및 상승·하락 정보 중심 |
| Analytics | 차트·데이터 구분 우선 |
| Developer Console | 코드·로그·상태 중심 |
| Commerce Vivid | 구매 CTA 및 상품 강조 |
| Commerce Luxury | 절제된 상품 및 가격 강조 |
| Mobile Soft | 터치 컨트롤과 부드러운 면 |
| Social Expressive | 다수의 보조색과 콘텐츠 강조 |
| Wellness Calm | 차분하고 낮은 시각적 긴장 |
| Education Friendly | 학습 단계 및 친근한 상태 표현 |
| Glass Compatible | 투명·반투명 표면에 적합한 대비 |
| Brutalist Contrast | 강한 경계 및 선명한 색상 |
| Gradient Compatible | 그라데이션 표면에서의 색상 역할 |

기존 7개 세트 중 해당 설계와 동일한 것이 있으면 재사용하거나 확장한다.

각 세트는 최소한 다음을 정의한다.

- 어떤 시드 또는 램프를 사용하는가
- 각 역할이 어느 명도 단계를 사용하는가
- 라이트·다크 모드의 차이
- 액션 색상 및 액션 위 텍스트
- 브랜드와 보조색의 사용 비중
- 배경 및 표면 계층
- 상태색 파생 방식
- 컴포넌트 색상 매핑
- 차트 색상 매핑
- 대비 보정 가능 범위
- 사용 권장 맥락
- 금지 맥락 및 조합

단순 색상값 차이만 있는 세트는 추가하지 않는다.

## 4.5 토큰 계층 확장

다음 토큰 계층을 명시적으로 관리한다.

### Primitive

- 브랜드 및 보조색 램프
- 중립색 램프
- 상태색 램프
- 데이터 시각화 램프
- 색상별 50~950 단계 또는 이에 준하는 기존 계약

### Semantic

- Canvas
- Surface
- Raised
- Sunken
- Overlay
- Inverse
- Text Primary
- Text Secondary
- Text Muted
- Text Disabled
- Border Subtle
- Border Default
- Border Strong
- Action Primary
- Action Secondary
- Link
- Focus
- Accent
- Success
- Warning
- Danger
- Info

### State

- Default
- Hover
- Active
- Focus
- Selected
- Disabled
- Readonly
- Error
- Loading

### Component

Button, Input, Select, Checkbox, Radio, Switch, Tabs, Badge, Chip, Card, Table, Tooltip, Popover, Modal, Drawer, Toast 등 실제 컴포넌트가 소비하는 토큰을 연결한다.

### Data Visualization

- 범주형 색상
- 순차형 색상
- 발산형 색상
- 상승·하락 색상
- 선택 및 강조 색상
- 격자선
- 축 및 레이블
- 데이터 누락 상태

## 4.6 팔레트 및 서브토큰 매칭

기존 `recommendMaterials`, `proposeSubtokenSets` 등의 서비스 경로를 우선 재사용한다.

팔레트를 선택하면 모든 서브토큰 세트에 대해 다음 결과를 제공한다.

- 적용 가능 여부
- 적합도 순위
- 적합도 근거
- 대비 검사 결과
- 권장 사용 맥락
- 색상 보정 결과
- 사용 불가능한 이유

자동 보정으로 모든 세트를 동일한 색상 결과로 만드는 것을 방지한다.

랭킹과 호환 여부는 별개로 관리한다. 추천 점수가 낮다는 이유만으로 유효한 재료를 숨기지 않는다.

200개 팔레트와 25개 세트의 라이트·다크 평가를 자동화한다. 이 조합 전체를 브라우저에서 렌더링할 필요는 없다.

## 4.7 색상 웹페이지 통합

현재 다음 경로가 분리되어 있다.

- `/materials/color`
- `/materials/palettes`
- `/materials/palettes/custom`

기존 URL 호환성을 유지하되, 제품 관점에서는 하나의 통합된 색상 작업대로 개편한다.

화면 상단에 다음 탭을 배치한다.

1. 팔레트 라이브러리
2. 서브토큰 세트
3. 전체 색상 토큰
4. 직접 색상 입력

### 팔레트 라이브러리

- 200개 이상의 팔레트 탐색
- 검색
- 색상 계열 필터
- 밝기 및 채도 필터
- 사용 맥락 필터
- 대표 색상 시각화
- 선택된 팔레트 상태 표시
- 페이지네이션

### 팔레트 선택 이후

선택한 팔레트와 호환되는 서브토큰 세트를 카드 형태로 비교한다.

각 카드에는 다음 내용을 표시한다.

- 페이지 배경
- 카드 표면
- 제목 및 본문
- 기본·보조 버튼
- 입력 필드
- 상태 배지
- 간단한 차트
- 라이트·다크 전환

세트 이름만 나열하지 않는다.

### 서브토큰 선택 이후

선택 결과에 대응하는 실제 토큰을 보여준다.

- Primitive
- Semantic
- State
- Component
- Chart

기존 단일 Static Kit 팔레트의 고정 토큰을 계속 보여주는 방식은 허용하지 않는다.

팔레트 또는 서브토큰 선택을 변경하면 모든 토큰 및 미리보기가 일관되게 변경되어야 한다.

### 최종 사용자 행동

- CSS 복사
- JSON 내보내기
- 디자인 토큰 내보내기
- Studio에서 사용하기
- 조합 공유 링크

모든 링크는 선택된 팔레트·세트·모드 상태를 보존해야 한다.

---

# 5. Phase 3 — 타이포그래피 시스템 고도화

## 5.1 타이포 재료 분리

다음 요소들을 독립적인 재료 또는 선택 축으로 관리한다.

- Font family
- Font pairing
- Type scale
- Role mapping
- Weight scale
- Line height
- Letter spacing
- Numeric typography
- Code typography
- Control typography
- Responsive typography
- Language-specific rules

타이포 시스템을 특정 테마에 종속시키지 않는다.

기존 18개 프리셋, 4개 역할형 프리셋, 14개 신규 시스템 사이의 중복 및 차이를 먼저 분석하고 통합된 카탈로그 모델을 구축한다.

## 5.2 타이포 시스템 40종 이상

다음 10개 계열별로 최소 4개의 실질적으로 차별화된 시스템을 확보한다.

| 계열 | 대표 시스템 |
|---|---|
| General Product | Neutral Product, Humanist, Geometric, Soft Product |
| Enterprise | Dense ERP, Formal Enterprise, Compact Admin, Comfortable Admin |
| Finance | Financial Numeric, Market Terminal, Banking, Executive Report |
| Developer | Code Console, Technical Docs, Developer Product, System Monitor |
| Marketing | Bold Display, Startup Launch, Premium Launch, Expressive Brand |
| Editorial | Newspaper, Magazine, Long-form Essay, Modern Editorial |
| Commerce | Catalog, Fashion, Luxury Commerce, Promotional |
| Mobile | Compact Mobile, Native-like, Friendly Mobile, Accessible Mobile |
| Education | Learning, Academic, Friendly Education, Reference |
| Experimental | Retro, Brutalist, Industrial, Mixed Serif |

기존 시스템을 활용하되 이름만 바꾸어 중복 등록하지 않는다.

## 5.3 역할 체계

각 타이포 시스템은 다음 역할을 지원한다.

- Display XL / LG / MD
- Heading 1~6
- Body LG / MD / SM
- Label LG / MD / SM
- Caption
- Overline
- Button Label
- Input Value
- Table Header
- Table Cell
- Numeric
- KPI
- Code
- Quote
- Navigation
- Badge

모든 역할을 반드시 독립적인 숫자로 정의할 필요는 없다. 공통 스케일을 참조할 수 있지만 역할 간 의미와 사용 조건은 명확해야 한다.

각 역할에 대해 다음을 확인할 수 있어야 한다.

- 적용 서체
- 크기
- 굵기
- 행간
- 자간
- 반응형 크기 변화
- 줄바꿈 규칙
- 콘텐츠 길이 정책
- 권장 사용 위치

## 5.4 서체 및 다국어

시스템 서체뿐 아니라 사용 가능한 오픈 라이선스 웹폰트도 검토한다.

- 한국어
- 영어
- 일본어
- 한영 혼합
- 숫자
- 통화
- 퍼센트
- 날짜
- 코드

폰트 파일의 재배포 및 웹 임베딩 권리를 확인한다.

전체 웹폰트를 모든 페이지에 로딩하지 않는다.

필요한 폰트만 선택적으로 로딩하고 WOFF2, 서브셋, 적절한 fallback을 활용한다.

폰트 로딩 실패 시에도 글자가 깨지거나 레이아웃이 심각하게 변형되지 않아야 한다.

## 5.5 타이포그래피 페이지 개편

현재 신규 비교기와 기존 네 가지 프리셋 화면이 혼재되어 있는 구조를 통합한다.

다음 화면을 제공한다.

### 전체 카탈로그

- 모든 타이포 시스템을 카드 형태로 탐색
- 동일한 제목과 본문 샘플로 시각적 차이 확인
- 시스템명
- 서체 조합
- 적합한 사용 맥락
- 밀도
- 라벨 및 숫자 샘플
- 검색 및 계열별 필터

선택 버튼의 텍스트만 나열해서 전체 시스템을 파악하게 하지 않는다.

### 상세 Specimen

- Display부터 Caption까지 역할별 실제 렌더
- 굵기별 비교
- 다국어 샘플
- 숫자 및 금융 데이터 샘플
- 코드 샘플
- 버튼·입력·표에서의 적용 결과
- 모바일 및 데스크톱 비교

### 비교 모드

최대 4개 시스템을 선택하여 다음 동일 콘텐츠에 적용한다.

- SaaS 랜딩
- ERP 대시보드
- 에디토리얼
- 커머스
- 모바일 앱

선택된 서체 시스템만 렌더링한다.

### Studio 연결

선택한 타이포 시스템을 실제 Blueprint와 내보내기 결과에 반영한다.

---

# 6. Phase 4 — 컴포넌트 재료의 대규모 확충

## 6.1 컴포넌트의 계층 정의

컴포넌트를 다음 계층으로 구분한다.

1. Primitive: 기본적인 디자인 및 상호작용 단위
2. Base Component: 독립적으로 재사용 가능한 UI 컴포넌트
3. Purpose Component: 특정 목적의 완성된 UI
4. Composite Pattern: 여러 컴포넌트가 결합된 기능적 패턴
5. Page Section: 페이지의 의미 있는 구역

예를 들어:

Button → Icon Button → Button Group → Bulk Action Toolbar

Card Surface → KPI Card → KPI Grid → Dashboard Summary Section

이들을 각각 적절한 계층으로 등록한다.

동일한 컴포넌트의 색상 변경이나 크기 변경을 신규 컴포넌트 종류로 집계하지 않는다.

## 6.2 필수 컴포넌트 인벤토리

아래 목록 전체를 구현 대상으로 관리한다.

기존 구현이 있는 경우 재사용하되 신규 조립 플랫폼과 웹 카탈로그에 실제 연결되는지 확인한다.

### A. 버튼 및 액션

- Button
- Icon Button
- Link Button
- Toggle Button
- Split Button
- Menu Button
- Floating Action Button
- Button Group
- Segmented Control
- Copy Button
- Close Button
- Loading Action Button

### B. 텍스트 입력

- Text Input
- Textarea
- Search Input
- Password Input
- Number Input
- Currency Input
- Email Input
- Phone Input
- URL Input
- OTP Input
- Tag Input
- File Input
- Drag-and-drop Upload
- Input Group

### C. 선택 컨트롤

- Select
- Searchable Select
- Combobox
- Multi-select
- Grouped Select
- Radio
- Radio Group
- Radio Card
- Checkbox
- Checkbox Group
- Switch
- Slider
- Range Slider
- Rating
- Color Picker

### D. 날짜 및 시간

- Calendar
- Date Picker
- Date Range Picker
- Time Picker
- DateTime Picker
- Month Picker
- Week Picker
- Schedule Selector

### E. 내비게이션

- Navbar
- Sidebar
- Collapsible Sidebar
- Breadcrumb
- Tabs
- Vertical Tabs
- Underline Tabs
- Stepper
- Pagination
- Bottom Navigation
- Navigation Drawer
- Table of Contents
- Command Menu
- Context Menu

### F. 카드

- Basic Card
- Feature Card
- KPI Card
- Statistic Card
- Metric Trend Card
- Product Card
- Product Comparison Card
- Profile Card
- Team Member Card
- Article Card
- Media Card
- Pricing Card
- Plan Card
- Notification Card
- Activity Card
- Settings Card
- Integration Card
- Review Card
- Testimonial Card
- Interactive Selection Card
- Dashboard Widget Card
- Financial Asset Card

### G. 데이터 표시

- Basic Table
- Data Table
- Sortable Table
- Filterable Table
- Selectable Table
- Expandable Row Table
- Grouped Table
- Dense Table
- Description List
- List
- List Item
- Tree View
- Kanban
- Timeline
- Activity Feed
- Master-detail
- Key-value Inspector
- Log Viewer
- Code Block
- Diff Viewer

### H. 오버레이

- Modal
- Alert Dialog
- Confirmation Dialog
- Drawer
- Bottom Sheet
- Popover
- Tooltip
- Dropdown Menu
- Contextual Help

### I. 피드백 및 상태

- Alert
- Banner
- Callout
- Toast
- Snackbar
- Inline Error
- Empty State
- Error State
- Success State
- Skeleton
- Spinner
- Linear Progress
- Circular Progress
- Step Progress
- Loading Overlay
- Status Indicator

### J. 정보 표시

- Badge
- Status Badge
- Chip
- Filter Chip
- Tag
- Avatar
- Avatar Group
- Accordion
- Collapsible
- Divider
- Counter
- Notification Indicator
- Keyboard Shortcut
- Metadata Row
- Stat Comparison

### K. 미디어 및 콘텐츠

- Image
- Responsive Image
- Media Frame
- Gallery
- Carousel
- Video Frame
- Audio Player UI
- File Preview
- Image Comparison
- Figure and Caption
- Quote
- Rich Text Content

### L. 레이아웃

- Stack
- Cluster
- Grid
- Responsive Grid
- Split
- Bento
- Container
- Section
- Center
- Sidebar Layout
- Master-detail Layout
- Sticky Region
- Scroll Area
- Resizable Panel

### M. 업무 시스템 패턴

- Filter Toolbar
- Search Toolbar
- Bulk Action Toolbar
- Data Summary
- Dashboard KPI Grid
- Approval Panel
- Audit Log
- Permission Matrix
- Status Management
- Settings Form
- Search Result List
- User Management Table
- Task List
- Workflow Steps
- Comment Thread

### N. 커머스 패턴

- Product Grid
- Product Detail Summary
- Product Variant Selector
- Quantity Selector
- Price Display
- Discount Display
- Cart Item
- Cart Summary
- Checkout Summary
- Order Status
- Review Summary

### O. 모바일 패턴

- Mobile Header
- Bottom Navigation
- Action Sheet
- Mobile List Cell
- Mobile Search
- Mobile Tab Bar
- Full-screen Dialog
- Mobile Filter Panel
- Sticky Bottom Action
- Safe-area Container

위 목록은 하나의 컴포넌트로 구현할 수 있는 연관 패턴을 포함하고 있다.

중복 구현하지 말고 고유한 재료와 변형 및 복합 패턴을 분류하여 관리한다.

단, 모든 항목에 대한 지원 경로가 확인되어야 한다.

목적별 및 복합 컴포넌트 120종 이상의 실질적인 지원을 1차 목표로 하되, 의미 없는 분할을 통해 숫자를 맞추지 않는다.

## 6.3 공통 컴포넌트 계약

각 컴포넌트는 다음 계약을 가진다.

- ID 및 버전
- 목적과 사용 맥락
- 구조 및 슬롯
- 필수 및 선택 Props
- 콘텐츠 스키마
- 외형 변형
- 크기 변형
- 밀도
- 상태
- 상태 전이
- 이벤트 및 상호작용
- 필요한 디자인 토큰
- 허용되는 부모와 자식
- 반응형 전략
- 접근성 요구사항
- 금지 조합
- 실제 예시
- 사용 조건
- 렌더 진입점
- Blueprint 연결
- 테스트

모든 컴포넌트에 모든 상태를 강제하지 않는다. 의미 있는 상태와 변형만 정의하고 지원하지 않는 경우 이유를 기록한다.

## 6.4 주요 컴포넌트별 세부 계약

### Button

외형:

- Solid
- Outline
- Soft
- Ghost
- Link
- Elevated
- Destructive

크기:

- XS
- SM
- MD
- LG
- XL

상태:

- Default
- Hover
- Active
- Focus
- Disabled
- Loading
- Selected, 해당 유형에 한함

콘텐츠:

- 텍스트
- Leading Icon
- Trailing Icon
- Icon Only
- Split Action

검증:

- 아이콘 전용 버튼의 접근 가능한 이름
- 로딩 중 중복 실행 방지
- Disabled 동작 차단
- 키보드 조작
- 모바일 터치 영역
- 긴 문구의 정상 처리

### Input

외형:

- Outline
- Filled
- Underline
- Minimal

지원 요소:

- Label
- Placeholder
- Helper Text
- Prefix
- Suffix
- Icon
- Clear Action
- Error Message
- Required Indicator

상태:

- Default
- Hover
- Focus
- Filled
- Disabled
- Readonly
- Error
- Success

긴 텍스트, 숫자, 한글 입력, 모바일 키보드 대응을 검증한다.

### Select / Combobox

유형:

- 기본 선택
- 검색 선택
- 다중 선택
- 그룹 선택
- 아이콘 포함 선택
- 상세 설명 포함 선택

상태:

- Default
- Hover
- Focus
- Open
- Selected
- Disabled
- Error
- Loading
- Empty

필수 동작:

- 키보드 이동
- Enter 및 Escape
- 선택 및 선택 해제
- 외부 영역 클릭
- 포커스 관리
- 검색 결과 없음
- 긴 옵션 목록
- 모바일 뷰포트 경계 처리

정적 산출물에서 외부 네트워크에 의존하는 async 동작을 지원하지 않는 경우 외부 연동 계약과 실제 지원 범위를 구분한다.

### Card

카드의 목적과 시각 외형을 독립적으로 관리한다.

외형:

- Flat
- Outline
- Soft
- Elevated
- Glass
- Tonal
- Strong Border
- Media Dominant
- Minimal

슬롯:

- Header
- Icon
- Title
- Description
- Media
- Metric
- Body
- Status
- Action
- Footer

유형에 따라 적절한 슬롯만 사용한다.

긴 콘텐츠, 짧은 콘텐츠, 이미지 유무, 좁은 컨테이너, 반복 카드 정렬을 검증한다.

### Table

실제 업무 시스템 수준의 데이터 표현을 지원한다.

- 일반 및 밀집 모드
- 텍스트·숫자·통화·날짜 정렬
- Sticky Header
- 가로 스크롤
- 선택 및 다중 선택
- 정렬
- 필터링
- 페이지네이션
- 행 확장
- 빈 상태
- 로딩 상태
- 오류 상태
- 상태 배지
- 행 액션
- 열 너비 규칙

열 잘림, 숫자 줄바꿈, 모바일 데이터 접근성을 검증한다.

### Navigation

- 현재 위치
- 활성 항목
- 비활성 항목
- 그룹
- 하위 메뉴
- 접힘 및 펼침
- 아이콘
- 배지
- 모바일 대체 표현

Sidebar, Navbar, Tabs, Breadcrumb를 동일한 시각적 요소로 취급하지 않는다. 각각 목적에 맞는 구조 및 상호작용 계약을 가진다.

### Modal / Drawer / Popover

- 열림 및 닫힘
- Escape 처리
- 포커스 진입 및 복원
- 모달인 경우 포커스 제한
- 외부 클릭 정책
- 스크롤 잠금
- 콘텐츠 넘침
- 화면 경계
- 모바일 표현
- 확인·취소 액션

단순히 박스 형태를 그리는 것만으로 구현 완료로 판정하지 않는다.

### Feedback

피드백 목적에 따라 다음을 구분한다.

- 정보 전달
- 성공
- 주의
- 오류
- 진행 중
- 데이터 없음
- 접근 불가
- 네트워크 오류 표현

Toast, Alert, Banner, Inline Error, Empty State는 전달 위치와 지속 시간 및 행동 방식이 다르다.

각각의 의미와 사용 조건을 정의한다.

### 기타 컴포넌트

6.2의 모든 항목에 대해 위와 동일한 수준의 계약을 작성한다.

에이전트가 임의로 일부만 구현하고 나머지를 계획으로 남기지 않도록 Coverage Manifest에 요구 범위를 등록한다.

---

# 7. Phase 5 — 시각 패밀리 확충

시각 패밀리는 단순 색상 변경이 아니라 컴포넌트의 일관된 형태 언어를 의미한다.

기존 4개 시각 패밀리를 유지하면서 최소 12개의 실질적으로 차별화된 패밀리를 확보한다.

| 패밀리 | 핵심 특징 |
|---|---|
| Minimal Flat | 평평한 표면, 제한적 경계 |
| Soft Rounded | 둥근 모서리, 부드러운 표면 |
| Outline Precise | 선명한 경계, 정밀한 구조 |
| Corporate Formal | 절제된 형태, 안정적 정렬 |
| Dense Enterprise | 작은 컨트롤, 높은 정보 밀도 |
| Elevated Material | 표면 계층 및 그림자 |
| Tonal Layered | 색조를 활용한 계층 |
| Editorial | 타이포 중심, 규칙선 활용 |
| Glass | 반투명 표면 및 대비 관리 |
| Brutalist | 강한 경계와 오프셋 그림자 |
| Luxury | 넓은 여백 및 절제된 요소 |
| Expressive | 강조된 형태와 풍부한 시각적 리듬 |

기존 패밀리와 중복되는 경우 신규 ID를 만들지 말고 확장한다.

각 패밀리는 다음을 일관되게 정의한다.

- 컴포넌트 모서리
- 테두리
- 그림자
- 표면 계층
- 컨트롤 높이
- 내부 여백
- 아이콘 크기 및 표현
- 버튼 강조 단계
- 상태 표현
- 카드 구조
- 내비게이션 표현
- 모션 특성

모든 컴포넌트가 모든 패밀리와 무조건 호환될 필요는 없다.

호환 가능 여부는 기존 관계 그래프 및 검증기에서 판단한다.

각 패밀리가 실제로 적용됐을 때 색상 외에도 형태·간격·표면·강조 방식이 달라지는지 검증한다.

---

# 8. Phase 6 — 컴포넌트 웹 카탈로그 전면 개편

현재처럼 목적별 컴포넌트와 기존 구조 부품을 하나의 긴 페이지에 모두 나열하지 않는다.

## 8.1 페이지 정보 구조

상단에는 검색과 카테고리 탭을 배치한다.

- 전체
- 버튼
- 입력
- 선택
- 날짜·시간
- 내비게이션
- 카드
- 데이터
- 차트
- 오버레이
- 피드백
- 정보 표시
- 미디어
- 레이아웃
- 업무 패턴
- 커머스
- 모바일

모바일에서는 카테고리를 스크롤 가능한 탭 또는 접근 가능한 카테고리 선택기로 제공한다.

각 카테고리에서만 해당 재료를 로딩한다.

검색은 전체 재료를 대상으로 수행하고 검색 결과에 분류를 표시한다.

## 8.2 컴포넌트 카드

카탈로그 목록의 각 카드는 다음을 보여준다.

- 실제 대표 렌더
- 컴포넌트명
- 목적
- 변형 수
- 지원 상태 수
- 관련 카테고리
- 상세 이동

불필요한 내부 스키마 정보를 카드에 과도하게 노출하지 않는다.

사용 가능한 시각 패밀리를 전환할 수 있도록 하되 기존 `family:soft` 고정 미리보기 구조에 머무르지 않는다.

## 8.3 컴포넌트 상세

다음 탭을 제공한다.

1. Overview
2. Variants
3. States
4. Sizes
5. Playground
6. Tokens
7. Code
8. Accessibility
9. Composition

관련 없는 탭은 비노출 처리한다.

### Variants

동일한 콘텐츠에 서로 다른 외형을 적용하여 비교한다.

### States

지원되는 상태를 시각적으로 전시한다.

### Sizes

동일한 컴포넌트의 크기 및 밀도 차이를 비교한다.

### Playground

다음 값을 변경할 수 있도록 한다.

- 팔레트
- 서브토큰 세트
- 시각 패밀리
- 타이포 시스템
- 크기
- 밀도
- 외형
- 상태
- 라이트·다크
- 예시 콘텐츠
- 뷰포트

호환되지 않는 조합은 선택 전에 비활성화하거나 명확한 이유를 표시한다.

검증을 우회하여 렌더링하지 않는다.

### Code

실제 선택된 결과의 HTML, CSS, 토큰, Blueprint를 확인하고 복사할 수 있도록 한다.

전시용 코드와 내보내기 결과가 다르면 안 된다.

### Composition

- 허용 부모
- 허용 자식
- 필요한 슬롯
- 관련 목적 컴포넌트
- 함께 사용되는 패턴
- 금지 조합

## 8.4 탐색 품질

- 탭 전환 시 페이지 전체를 불필요하게 다시 컴파일하지 않는다.
- 뒤로 가기 시 카테고리, 검색 및 페이지 상태를 복원한다.
- URL로 특정 카테고리 및 컴포넌트에 직접 접근할 수 있도록 한다.
- 신규 등록된 컴포넌트는 별도 수작업 페이지 추가 없이 자동으로 목록에서 발견되어야 한다.
- 상세 페이지에서 모든 변형을 처음부터 동시에 동적 렌더링하지 않는다.

---

# 9. Phase 7 — 기타 디자인 재료 대규모 확충

색상, 타이포그래피, 컴포넌트뿐 아니라 실제 디자인 조립에 필요한 나머지 재료도 확충한다.

## 9.1 차트

다음 유형을 지원 대상으로 관리한다.

- Vertical Bar
- Horizontal Bar
- Grouped Bar
- Stacked Bar
- 100% Stacked Bar
- Line
- Multi-line
- Step Line
- Area
- Stacked Area
- Pie
- Donut
- Scatter
- Bubble
- Heatmap
- Treemap
- Radar
- Waterfall
- Funnel
- Gauge
- Bullet
- Sparkline
- Candlestick
- OHLC
- Histogram
- Box Plot
- Combination Chart
- Calendar Heatmap
- Progress Chart

각 유형은 의미 있는 데이터 구조와 검증 계약을 가진다.

공통 정의 항목:

- 데이터 스키마
- 축
- 범례
- 데이터 레이블
- 단위
- 색상 스케일
- 강조 상태
- 반응형 전략
- 빈 데이터
- 데이터 누락
- 접근 가능한 요약 또는 데이터 표

특히 금융 및 ERP 맥락의 차트 정확성을 중요하게 다룬다.

차트에서 실제 데이터 값을 왜곡하거나 축 범위로 오해를 유발하는 조합을 방지한다.

## 9.2 레이아웃 및 배치

다음 레이아웃 패턴을 재사용 가능한 재료로 확보한다.

- Single Column
- Two Column
- Three Column
- Equal Grid
- Asymmetric Grid
- Masonry
- Bento
- Sidebar Main
- Double Sidebar
- Master-detail
- Dashboard Grid
- KPI Strip
- Editorial Layout
- Split Hero
- Centered Hero
- Media Hero
- Product Detail Layout
- Commerce Grid
- Settings Layout
- Documentation Layout
- Mobile Stack
- Sticky Action Layout
- Form Layout
- Multi-step Form

각 레이아웃은 다음을 정의한다.

- 필요한 슬롯
- 부모 컨테이너
- 최소 콘텐츠 폭
- 반응형 변화
- 열 수 및 배치 규칙
- 밀도
- 콘텐츠 길이 대응
- 중첩 규칙
- 적용 가능한 페이지 목적

좁은 화면에서 단순히 전체 UI를 축소하는 방식으로 대응하지 않는다.

## 9.3 간격 및 밀도

다음 기준을 구분한다.

- 페이지 여백
- 섹션 간격
- 컨테이너 내부 여백
- 컴포넌트 내부 간격
- 형제 요소 간격
- 목록 간격
- 폼 간격
- 표 셀 간격
- 아이콘과 텍스트 간격

기존 4px 격자와 spacing lint를 유지한다.

Compact, Standard, Comfortable 등의 밀도는 단순 전역 패딩 배수 변경이 아니라 컴포넌트 목적에 맞는 역할별 변화 규칙을 가져야 한다.

## 9.4 모서리·테두리·그림자

- Sharp
- Subtle
- Rounded
- Large Rounded
- Pill
- Mixed Radius
- Hairline Border
- Standard Border
- Strong Border
- Double Border, 적절한 맥락에 한함
- Flat Surface
- Subtle Elevation
- Medium Elevation
- Deep Elevation
- Hard Offset
- Glow
- Inset

모든 조합을 허용하지 않는다.

기존 표면 및 스타일 관계 규칙을 사용해 시각적으로 부적절한 조합을 제한한다.

## 9.5 배경 및 표면

- Solid
- Tinted
- Gradient
- Radial Gradient
- Mesh-like Gradient
- Grid Pattern
- Dot Pattern
- Noise
- Paper
- Frosted Glass
- Layered Surface
- Dark Premium Surface

배경은 장식과 실제 콘텐츠 가독성에 미치는 영향을 함께 정의한다.

고비용 blur 및 애니메이션이 무분별하게 사용되지 않도록 성능 제한을 둔다.

## 9.6 모션

다음 목적을 구분하여 토큰과 패턴을 정의한다.

- Hover
- Press
- Focus
- Expand
- Collapse
- Fade
- Slide
- Scale
- Popover Enter
- Modal Enter
- Drawer Enter
- Toast Enter
- Loading
- Progress
- Skeleton

각 패턴은 duration, easing, delay, property, reduced-motion 정책을 명시한다.

모든 컴포넌트에 일괄 애니메이션을 적용하지 않는다.

## 9.7 아이콘 및 미디어

필요한 아이콘 영역:

- Navigation
- Action
- Editing
- Status
- Communication
- Files
- Media
- Commerce
- Finance
- Analytics
- Developer
- User
- Settings
- Calendar
- Security
- Accessibility

권리가 허용된 일관된 아이콘 소스를 검토한다.

아이콘 수뿐 아니라 다음을 검증한다.

- 일관된 viewBox
- 크기
- 선 굵기
- 정렬
- 시각 패밀리
- 작은 크기 가독성
- 접근 가능한 이름
- 장식 아이콘 구분

모든 아이콘을 하나의 거대한 클라이언트 번들로 로딩하지 않는다.

## 9.8 Foundations 전시 페이지

기존 기초 재료 페이지를 다음 하위 카테고리로 구성한다.

- Spacing
- Density
- Radius
- Border
- Elevation
- Surface
- Background
- Motion
- Icon
- Layout
- Chart

각 항목은 전체 정의 목록과 실제 시각 예시, 토큰, 사용 조건을 확인할 수 있어야 한다.

단순한 텍스트 이름 나열로 끝내지 않는다.

---

# 10. Phase 8 — 조립 플랫폼 연결 및 통합

## 10.1 신규 재료의 조립 경로

신규 재료는 다음 경로 전체에서 사용할 수 있어야 한다.

- Core Registry
- Material Relation Graph
- Recommendation
- Blueprint
- Compiler
- Studio
- REST API
- MCP
- Export
- Validation

지원되는 재료 유형과 표현할 수 없는 조합을 정확히 구분한다.

페이지 조립 엔진의 기존 검증 기능을 우회하는 별도 컴파일 경로를 만들지 않는다.

## 10.2 관계 그래프

재료 사이의 다음 관계를 관리한다.

- Requires
- Compatible
- Recommended
- Discouraged
- Forbidden
- Depends On
- Composes
- Consumes Token

추천되지 않는 조합과 금지된 조합을 혼동하지 않는다.

금지 규칙에는 객관적인 이유를 포함한다.

미적 취향을 이유로 지나치게 많은 조합을 제한하지 않는다.

## 10.3 맥락별 조립

최소 다음 맥락에서 충분한 재료 선택과 조립이 가능해야 한다.

- SaaS Landing
- Marketing
- ERP
- CRM
- PMS
- Admin
- Finance
- Analytics
- E-commerce
- Editorial
- Documentation
- Developer Tool
- Mobile App
- Social
- Education
- Wellness

각 맥락에서 색상, 타이포, 컴포넌트, 시각 패밀리, 레이아웃을 독립적으로 선택할 수 있어야 한다.

모든 맥락의 결과가 동일한 카드형 대시보드로 수렴하지 않도록 한다.

## 10.4 기존·신규 시스템 통합

기존 사용자에게 필요한 재료를 신규 플랫폼으로 연결한다.

기존 카탈로그와 신규 레지스트리의 내부 버전 차이는 유지할 수 있으나, 사용자가 두 종류의 플랫폼을 별도로 학습해야 하는 제품 구조는 개선한다.

기존 URL, Blueprint 및 API 호환성은 가능한 범위에서 보존한다.

레거시 시스템의 제거가 필요하다면 다음을 먼저 제공한다.

- 대체 경로
- 마이그레이션
- 호환성 테스트
- 기존 링크 처리
- 변경 사유

---

# 11. Phase 9 — Explore 및 Studio 제품 경험 개선

## 11.1 Explore

Explore는 단순 예제 목록이 아니라 충분한 재료를 실제 조립한 결과를 탐색하는 공간이어야 한다.

다음 필터를 제공한다.

- 페이지 목적
- 디자인 맥락
- 팔레트 계열
- 서브토큰 세트
- 타이포 시스템
- 시각 패밀리
- 밀도
- 레이아웃
- 라이트·다크

다음 비교 흐름을 제공한다.

- 같은 레이아웃, 다른 색상
- 같은 팔레트, 다른 서브토큰
- 같은 콘텐츠, 다른 타이포
- 같은 컴포넌트, 다른 시각 패밀리
- 같은 제품 목적, 다른 레이아웃
- 같은 데이터, 다른 시각화

실질적으로 같은 결과물을 별개 디자인인 것처럼 반복 노출하지 않는다.

## 11.2 Studio

Studio에서는 다음 재료 선택 영역을 제공한다.

- Palette
- Subtoken Set
- Typography
- Visual Family
- Layout
- Components
- Surface
- Motion
- Density
- Content

선택된 재료는 실제 조립 결과에 반영되어야 한다.

선택 가능한 모든 재료를 탐색할 수 있어야 한다.

특정 재료가 현재 조합에서 불가능하다면 그 이유를 제공한다.

색상 페이지, 타이포그래피 페이지, 컴포넌트 상세에서 Studio로 이동할 경우 선택 상태를 보존한다.

---

# 12. Phase 10 — 검증 체계 및 품질 게이트 강화

기존 테스트를 삭제하거나 완화하지 않는다.

신규 요구사항을 다음 테스트 계층으로 추가한다.

## 12.1 Material Completeness Test

- 필수 인벤토리 항목 누락 검사
- 고유 ID 검사
- 중복 재료 검사
- 실제 렌더러 연결 검사
- 토큰 의존성 검사
- 상태 및 변형 계약 검사
- 카탈로그 노출 검사
- 상세 페이지 연결 검사
- Blueprint 지원 검사
- 내보내기 연결 검사

## 12.2 Catalog Coverage Test

다음을 자동 검사한다.

- 공개 가능한 등록 팔레트 전체를 웹에서 탐색할 수 있는가?
- 등록된 서브토큰 세트를 선택할 수 있는가?
- 등록된 타이포 시스템을 확인할 수 있는가?
- 등록된 컴포넌트를 검색할 수 있는가?
- 등록된 시각 패밀리를 적용할 수 있는가?
- 차트, 레이아웃, 모션 등의 재료를 탐색할 수 있는가?
- API와 웹 카탈로그의 재료 ID가 일치하는가?

권리 제한 및 내부 전용 재료는 명시적인 예외로 관리한다.

임의로 누락된 재료와 의도적으로 비공개한 재료를 구분한다.

## 12.3 Actual Output Test

다음 결과가 실제 출력에서 달라지는지 검증한다.

- 팔레트 변경
- 서브토큰 변경
- 타이포 시스템 변경
- 컴포넌트 변형 변경
- 시각 패밀리 변경
- 레이아웃 변경
- 밀도 변경
- 표면 및 모션 변경

단순히 manifest의 선택 ID만 변경되고 실제 HTML 또는 CSS는 동일한 결함을 검사한다.

출력이 같아야 정상인 경우에는 이유와 예외를 명시한다.

## 12.4 Browser E2E

최소 다음 사용자 시나리오를 실제 브라우저에서 실행한다.

### 색상

1. 팔레트 카탈로그에서 특정 계열 검색
2. 팔레트 선택
3. 호환되는 서브토큰 세트 확인
4. 서로 다른 세트 비교
5. 라이트·다크 전환
6. 선택에 따라 토큰 변경 확인
7. Studio 이동
8. 실제 출력 및 내보내기 확인

### 타이포그래피

1. 전체 타이포 시스템 탐색
2. 여러 시스템 선택
3. 동일 콘텐츠 비교
4. 모바일 전환
5. 역할별 스타일 확인
6. Studio 적용
7. 실제 CSS 확인

### 컴포넌트

1. 카테고리 탭 변경
2. 컴포넌트 검색
3. 상세 이동
4. 외형 및 크기 변경
5. 상태 변경
6. 시각 패밀리 변경
7. 키보드 및 상호작용 검증
8. HTML·CSS·Blueprint 내보내기

### Studio

1. ERP 페이지 조립
2. 색상 변경
3. 타이포 변경
4. 컴포넌트 교체
5. 레이아웃 변경
6. 잘못된 조합 거부
7. 저장 및 재진입
8. 내보낸 Blueprint 재컴파일
9. 결과 동일성 확인

SaaS, ERP, 금융, 커머스, 에디토리얼, 모바일 맥락도 각각 대표 E2E를 확보한다.

## 12.5 시각 및 레이아웃 검사

뷰포트:

- 320px
- 390px
- 768px
- 1024px
- 1280px
- 1440px

다음 문제를 검사한다.

- 가로 넘침
- 의도하지 않은 줄바꿈
- 콘텐츠 잘림
- 작은 버튼
- 잘못된 정렬
- 과도한 여백
- 의미 없는 빈 공간
- 카드 높이 불균형
- 표와 차트의 잘림
- 잘못된 제목 크기
- 색상 대비 미달
- 모바일 터치 영역 부족
- 포커스 이동 오류
- 모션 설정 미준수

기존 layout quality 및 spacing, typography 검증기를 우선 확장한다.

자동 검사 통과를 시각적 미감에 대한 완전한 증명으로 표현하지 않는다.

대표 결과물은 실제 스크린샷으로 비교하고 부자연스러운 사례를 수정한다.

## 12.6 성능 회귀 검사

Phase 1에서 구축한 성능 기준선을 재료 확충 이후 다시 실행한다.

검사 대상:

- 초기 카탈로그 요청
- 동일 페이지 재방문
- 빠른 탭 전환
- 검색
- 반복 스크롤
- 여러 컴포넌트 상세 이동
- 연속적인 팔레트 전환
- 타이포그래피 비교
- Studio 연속 편집

재료가 확충되었다는 이유로 성능 기준을 완화하지 않는다.

---

# 13. Phase 11 — Vercel 실제 배포 검증

로컬 개발 서버에서 잘 동작하는 것만으로 완료 처리하지 않는다.

## 13.1 배포 버전 식별

웹사이트에서 현재 배포 버전을 확인할 수 있도록 한다.

- Git Commit SHA
- Catalog Version
- Compiler Version
- Build ID

별도 진단 경로나 제한된 버전 정보로 제공한다.

운영 화면에 노출되는 정보와 GitHub main의 최신 상태가 일치하는지 확인한다.

## 13.2 실제 배포 검증

확인할 항목:

- 배포 빌드 성공
- 신규 카탈로그 생성 성공
- 정적 미리보기 접근
- CDN 캐싱
- 라우팅
- 모바일 레이아웃
- 색상 토큰 변경
- 타이포 변경
- 컴포넌트 상세 동작
- Studio 조립 및 내보내기
- REST 및 MCP 연동
- 성능 기준 충족

기존 QA 자산 전체가 운영 public에 복사되는 구조의 필요성을 검토한다.

운영에 불필요한 실험 자료는 별도 경로나 배포 대상으로 분리하되 기존 공개 URL 계약을 무단으로 제거하지 않는다.

실제 운영 배포를 확인할 권한 또는 환경이 없다면 해당 항목을 미검증으로 남긴다.

---

# 14. 작업 병렬화 및 에이전트 운영

작업량이 많으므로 전문 작업 단위로 병렬화한다.

하지만 각 에이전트가 별개의 설계 철학과 계약을 만들어 시스템을 다시 분리시키지 않도록 한다.

## 14.1 공통 선행 작업

- 현재 시스템 감사
- Material Coverage Manifest
- 재료 계약 통합
- ID 및 버전 정책
- 카탈로그 인덱스 계약
- 미리보기 사전 생성 계약
- 성능 기준선

위 공통 계약을 확정하기 전에는 서로 충돌하는 대규모 재설계를 시작하지 않는다.

## 14.2 병렬 작업 트랙

### Track A — 성능 및 플랫폼 기반

사전 생성, 캐싱, 경량 인덱스, 미리보기, 번들 및 로딩 최적화.

### Track B — 색상

팔레트 200종, 서브토큰 25종, 토큰 계층, 호환성 및 통합 색상 페이지.

### Track C — 타이포그래피

타이포 시스템 40종, 역할 정의, 다국어, 전시 및 비교.

### Track D — 컴포넌트

필수 컴포넌트 인벤토리, 세부 계약, 렌더러, 상태 및 변형.

컴포넌트 계열별로 독립적인 하위 에이전트를 배정할 수 있다.

### Track E — 시각 패밀리 및 Foundations

패밀리, 표면, 배경, 모션, 간격, 아이콘, 레이아웃, 차트.

### Track F — 웹 제품 경험

카테고리, 탭, 탐색, 상세, Playground, Explore, Studio 연결.

### Track G — 통합 및 품질

Coverage Manifest, 실제 출력 검사, REST·MCP, 브라우저 E2E, 배포 검증.

## 14.3 통합 작업 원칙

- 각 에이전트의 수정 대상 파일과 소유 영역을 명확히 한다.
- 공통 레지스트리 및 서비스 진입점 변경은 담당자를 지정한다.
- 신규 재료는 공통 계약을 통해 등록한다.
- 동일한 기능의 독립 구현을 방지한다.
- 각 작업 단위의 완료 후 검증하고 커밋한다.
- 통합 과정에서 동료 에이전트의 작업을 덮어쓰거나 삭제하지 않는다.
- 통합 검증은 구현 담당자와 별도의 리뷰 역할이 수행하도록 한다.

---

# 15. 작업 지속성 및 중단 방지

이 작업은 일부 항목을 구현하고 보고서를 작성한 뒤 종료하는 작업이 아니다.

전체 범위가 크므로 지속적으로 진행 상태를 기록하면서 완료까지 추진한다.

기존 프로젝트의 작업 기록 규칙을 확인하고, 필요하면 `docs/dev/catalog-platform-upgrade/` 등의 경로에 다음 산출물을 관리한다.

- `MASTER-PLAN.md`
- `TASK-LEDGER.json`
- `MATERIAL-COVERAGE.json`
- `PERFORMANCE-BASELINE.json`
- `PERFORMANCE-AFTER.json`
- `DECISIONS.md`
- `VERIFICATION.md`
- `BLOCKERS.md`

각 작업에는 다음 정보를 기록한다.

- Task ID
- 작업 목표
- 구체적인 구현 범위
- 담당 트랙
- 의존성
- 수정 파일
- 완료 조건
- 테스트
- 커밋
- 현재 상태
- 미해결 문제

작업 상태는 다음으로 구분한다.

- Pending
- In Progress
- Implemented
- Verified
- Blocked

Implemented와 Verified를 혼동하지 않는다.

## 15.1 작업 수행 루프

각 작업마다 다음 순서를 따른다.

1. 작업 범위 확인
2. 기존 코드 조사
3. 구현
4. 관련 테스트
5. 실제 렌더링 및 결과 확인
6. 독립 리뷰
7. 결함 수정
8. 커밋
9. 작업 장부 갱신
10. 다음 작업 진행

사용자의 반복 승인을 기다리지 않는다.

권한 부족, 파괴적 변경, 외부 유료 서비스 사용 등 명시적인 승인이 필요한 작업은 별도로 기록한다.

특정 작업이 막혔다면 해당 작업을 Blocked 처리하고 의존성이 없는 다음 작업을 진행한다.

## 15.2 컨텍스트 한계 대응

세션 컨텍스트 또는 토큰 한계에 접근하기 전에 다음 내용을 남긴다.

- 마지막 완료 Task ID
- 완료 커밋
- 현재 변경 사항
- 검증 결과
- 다음 작업
- 남은 작업 목록
- 재개에 필요한 명령과 파일

새 세션이 처음부터 재조사하거나 완료된 작업을 다시 구현하지 않도록 한다.

단순히 전체 계획의 일부를 완료했다는 이유로 모든 작업이 끝났다고 보고하지 않는다.

---

# 16. 최종 완료 판정 기준

다음 요구사항이 충족되어야 전체 작업 완료를 선언할 수 있다.

## 16.1 재료 확충

- [ ] 공개 및 조립 가능한 팔레트 200개 이상
- [ ] 실질적으로 차별화된 서브토큰 세트 25개 이상
- [ ] 타이포 시스템 40개 이상
- [ ] 목적별 및 복합 컴포넌트 120개 이상
- [ ] 6.2의 전체 컴포넌트 인벤토리 지원 여부 확인
- [ ] 시각 패밀리 12개 이상
- [ ] 차트, 레이아웃, 모션, 표면, 배경, 아이콘 등 필수 재료 확충
- [ ] 의미 없는 중복 재료 제거
- [ ] 모든 공개 재료의 출처 및 권리 상태 관리

## 16.2 실제 사용자 경험

- [ ] 색상 페이지에서 팔레트 선택부터 서브토큰 및 토큰 확인까지 연결
- [ ] 선택한 팔레트와 세트에 대응하는 실제 토큰 제공
- [ ] 전체 타이포 시스템을 시각적으로 탐색 가능
- [ ] 컴포넌트 카테고리 탭 및 검색 제공
- [ ] 전체 컴포넌트 상세 및 지원 변형 확인 가능
- [ ] 기존·신규 시스템의 중복된 사용자 경험 정리
- [ ] 모든 재료를 Studio에서 지원 범위에 따라 사용 가능
- [ ] 선택 상태를 보존하는 공유 및 이동 경로

## 16.3 성능

- [ ] 일반 카탈로그에서 활성 iframe 제거
- [ ] 일반 목록 조회 시 동적 컴파일 제거
- [ ] 동일 입력 중복 컴파일 제거
- [ ] 고정 미리보기 정적 생성 및 캐싱
- [ ] 모바일·데스크톱 성능 기준 측정
- [ ] 재료 확충 이후 성능 회귀 방지
- [ ] 성능 개선 전후 비교 자료

## 16.4 검증 및 호환성

- [ ] 결정론적 출력 유지
- [ ] 기존 고정 해시 및 버전 호환성 유지
- [ ] 실제 렌더러 및 토큰 소비 검사 통과
- [ ] 카탈로그 노출 전수 검사 통과
- [ ] 신규 재료 조립 연결 검사 통과
- [ ] REST 및 MCP 계약 검사 통과
- [ ] 브라우저 E2E 통과
- [ ] 반응형 및 접근성 검사 통과
- [ ] 실제 시각 결과 검토 완료
- [ ] Vercel 배포 버전 및 실제 운영 기능 확인

목표 수량을 채우는 과정에서 실질적인 품질이 저하된다면 그 이유를 기록하고 작업을 미완료 상태로 유지한다.

---

# 17. 최종 보고서 작성 방식

최종 보고에서는 다음 내용을 구분한다.

1. 기존 문제의 실제 원인
2. 재료별 개선 전후 수량
3. 실제 웹 카탈로그 노출 범위
4. 실제 조립 가능 범위
5. 실질적인 고유 출력 수
6. 페이지별 개선 전후 스크린샷
7. 성능 개선 전후 실측
8. 테스트 결과
9. 배포 버전
10. 남아 있는 한계
11. 미검증 항목
12. 관련 커밋 및 재현 방법

다음과 같은 보고는 금지한다.

- 테스트 통과 수만 제시하고 제품 요구사항 달성 여부를 생략
- 조합 수를 실제 재료 수로 표현
- 로컬 테스트 결과를 운영 배포 결과로 표현
- 구현하지 않은 기능을 로드맵에 등록한 것으로 완료 처리
- 목표의 일부만 달성하고 전체 작업 완료 선언

---

# 최종 실행 지시

먼저 현재 main의 실제 구현 및 배포 상태를 확인하고 Phase 0을 수행한다.

이후 성능 및 공통 기반을 우선 구축하면서 독립적인 재료 확충 작업을 병렬로 진행한다.

이미 완성된 결정론적 Core 및 검증 엔진을 불필요하게 다시 설계하지 않는다. 필요한 확장과 실제 조립 연결에 집중한다.

각 작업의 결과를 통합하고 검증한 뒤 커밋 및 push한다.

전체 요구사항이 구현·검증되기 전까지 완료로 선언하지 않는다.

**이 프로젝트의 성공 기준은 얼마나 많은 코드를 작성했는지, 얼마나 많은 조합이 가능한지가 아니다. 얼마나 충분하고 다양한 디자인 재료를 실제로 탐색하고, 선택하고, 빠르게 조립하여 높은 품질의 결과물로 사용할 수 있는지가 성공 기준이다.**

