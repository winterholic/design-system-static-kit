# 프론트엔드 성능 병목 1~7 감사 및 판정 보고서

- **대상 저장소**: `winterholic/design-system-static-kit`
- **기준 커밋 / 브랜치**: `upgrade/p0-perf` (based on `origin/main` 4f34cac)
- **측정 기준일시**: 2026-11-28
- **실측 데이터 원본**: `docs/dev/catalog-platform-upgrade/PERFORMANCE-BASELINE.json`
- **실측 환경**:
  - 로컬 운영 빌드 (`local-prod`): Next.js 16.4.6 운영 빌드 (`next build` 후 `next start -p 4310`)
  - Vercel 운영 배포 (`vercel-prod`): `https://design-system-static-kit.vercel.app` (Next.js 16 배포본)

---

## 1. 지시서 §3.1 병목 1~7 판정 요약

| 번호 | 병목 항목 | 판정 | 주요 원인 코드 위치 | 핵심 실측 근거 요약 |
|:---:|:---|:---:|:---|:---|
| **1** | 미리보기마다 개별 iframe과 Observer가 생성된다 | **존재** | `apps/web/features/explore/Thumb.tsx:21-25`, `Thumb.tsx:30-42` | 카드마다 독립 IntersectionObserver/ResizeObserver 생성, 뷰포트 진입 시 카드별 iframe 마운트 (Explore 2~6개, Components 2~6개) |
| **2** | 화면에서 멀어진 iframe을 제거하고 다시 진입하면 재생성한다 | **존재** | `apps/web/features/explore/Thumb.tsx:23`, `Thumb.tsx:30` | `isIntersecting`이 false가 되면 `live`가 false로 바뀌어 iframe DOM 언마운트, 재진입 시 재생성 및 네트워크 요청 재발생 |
| **3** | 플랫폼 렌더 경로가 `force-dynamic`, `no-store`로 동작한다 | **존재** | `apps/web/app/platform/render/route.ts:6-7` | `export const dynamic = 'force-dynamic'`, `cache-control: no-store` 헤더로 CDN 및 브라우저 캐싱 전면 차단 |
| **4** | 전시용 미리보기 요청마다 Core 조립이 수행된다 | **존재** | `apps/web/app/platform/render/route.ts:31-36` | 정적 미리보기 자산(SVG, WebP, 사전생성 HTML) 없이 iframe 요청마다 `assembleComponents`, `assembleDesign` 런타임 직접 실행 |
| **5** | 컴포넌트 목록에서도 `componentView()`로 상세 변형 검증을 수행한다 | **존재** | `apps/web/app/components/page.tsx:28`, `spec.server.ts:118-122` | `/components` 목록 렌더 시 49개 부품 전부에 대해 `componentView()` 호출, 각 변형 축 옵션마다 `renderRaw` -> `compileBlueprint` 반복 실행 |
| **6** | 타이포그래피 및 Explore에서 조립 가능 여부 검사와 실제 미리보기 조립이 중복된다 | **존재** | `apps/web/app/explore/page.tsx:121`, `TypeCompare.tsx:52` | 페이지 서버 컴포넌트에서 `assembleDesign()` 유효성 검사 1회 수행 후, 자식 `Thumb` iframe이 `/platform/render`에서 동일 요청으로 `assembleDesign()` 재호출 (2배 중복 조립) |
| **7** | 프로세스 내부 캐시만으로는 서버리스 환경에서 충분한 재사용을 보장하기 어렵다 | **존재** | `platform.server.ts:45-46, 66`, `spec.server.ts:23, 108` | 프로세스 인메모리 `Map`에만 캐시 유지. Vercel Serverless Function 스케일아웃/콜드스타트 시 캐시 소멸 및 인스턴스 간 공유 불가 |

---

## 2. 병목별 상세 분석 및 실측 근거

### 병목 1: 미리보기마다 개별 iframe과 Observer가 생성된다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/features/explore/Thumb.tsx:21-25`:
    ```tsx
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const io = new IntersectionObserver(entries => { for (const e of entries) setLive(e.isIntersecting); }, {rootMargin: '240px 0px'});
    io.observe(el);
    ```
  - `apps/web/features/explore/Thumb.tsx:32-41`:
    ```tsx
    <iframe key={src} src={src} title={title} ... />
    ```
  - `apps/web/app/explore/page.tsx:64, 82`, `apps/web/app/components/page.tsx:32, 61`
- **실측 근거**:
  - `PERFORMANCE-BASELINE.json` 실측치:
    - Explore 모바일(390px): 활성 iframe **2개**, 데스크톱(1280px): 활성 iframe **6개**
    - Components 모바일(390px): 활성 iframe **2개**, 데스크톱(1280px): 활성 iframe **6개**
    - Typography(비교): 활성 iframe **1개**
    - Components 상세: 활성 iframe **1개**
  - 일반 카탈로그 목록(Explore, Components)에 iframe 0개라는 지시서 §3.6 목표에 미달하며, 각 카드 DOM 요소마다 개별 Observer 인스턴스가 생성되어 가비지 컬렉션 및 레이아웃 측정 부하를 유발함.

---

### 병목 2: 화면에서 멀어진 iframe을 제거하고 다시 진입하면 재생성한다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/features/explore/Thumb.tsx:23`:
    ```tsx
    const io = new IntersectionObserver(entries => { for (const e of entries) setLive(e.isIntersecting); }, {rootMargin: '240px 0px'});
    ```
  - `apps/web/features/explore/Thumb.tsx:30`:
    ```tsx
    {live && scale > 0 ? (
      <iframe key={src} src={src} ... />
    ) : null}
    ```
- **실측 근거**:
  - 카드가 뷰포트 바깥으로 스크롤되면 `setLive(false)`가 호출되어 `iframe` 요소 자체가 DOM 트리에서 삭제(unmount)됨.
  - 사용자가 다시 위/아래로 스크롤하여 진입하면 `setLive(true)`가 호출되면서 `<iframe key={src} ... />`가 새로 mount됨.
  - 브라우저 CDP 네트워크 트레이스 확인 결과, 동일 카드 재방문 시 `/platform/render?r=...` 네트워크 요청이 매번 다시 발생하며 컴파일 및 렌더링 파이프라인이 반복 구동됨.

---

### 병목 3: 플랫폼 렌더 경로가 force-dynamic, no-store로 동작한다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/app/platform/render/route.ts:6-7`:
    ```ts
    export const dynamic = 'force-dynamic';
    const HEADERS = {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'};
    ```
- **실측 근거**:
  - Vercel 운영 배포 (`https://design-system-static-kit.vercel.app/platform/render?r=...`) HTTP 응답 헤더 실측:
    - `cache-control: no-store`
    - `x-vercel-cache: MISS`
  - 고정된 샘플이나 재료 미리보기임에도 불구하고 CDN(Edge) 및 브라우저 캐싱이 일체 허용되지 않아, 모든 요청이 원본 서버리스 함수로 전달되어 매번 연산됨.

---

### 병목 4: 전시용 미리보기 요청마다 Core 조립이 수행된다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/app/platform/render/route.ts:31-36`:
    ```ts
    if (q.get('k') === 'components') {
      const r = assembleComponents(body as Record<string, unknown>);
      return r.ok ? respond(r.value, q) : ...;
    }
    const r = assembleDesign(body as AssembleRequest);
    return r.ok ? ... : ...;
    ```
- **실측 근거**:
  - 서버 측 컴파일 계측 카운터(`DSK_PERF_METRICS=1`) 측정 결과:
    - Explore 모바일 1회 로드: Core 조립 호출 **8회** (`assembleDesign` 8회)
    - Explore 데스크톱 1회 로드: Core 조립 호출 **12회** (`assembleDesign` 12회)
    - Components 데스크톱 1회 로드: Core 컴포넌트 조립 **6회** (`assembleComponents` 6회)
    - Typography 1회 로드: Core 조립 **7회** (`assembleDesign` 7회)
  - 사전 생성된 이미지(WebP, SVG)나 정적 파일이 전혀 제공되지 않으며, 단순 목록 표시용 썸네일임에도 매번 무거운 결정론적 Core 조립 연산이 발생함.

---

### 병목 5: 컴포넌트 목록에서도 componentView()로 상세 변형 검증을 수행한다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/app/components/page.tsx:27-30`:
    ```tsx
    {rows.filter(r => r.group === group).map(r => {
      const view = componentView(r.type)!;
      return ( ... );
    })}
    ```
  - `apps/web/features/components/spec.server.ts:118-122`:
    ```ts
    variants: variantIds.map(id => { const r = renderRaw(raw, id); return r.ok ? {id, ok: true} : {id, ok: false, reason: r.reason}; }),
    variantGroups: raw.variantGroups.map(group => ({...group, availability: group.availability.map(option => {
      const r = renderRaw(raw, {[group.name]: option.value});
      return r.ok ? {value: option.value, ok: true} : {value: option.value, ok: false, reason: r.reason};
    })})),
    ```
  - `apps/web/features/components/spec.server.ts:147-150`: `compileHtml` -> `compileBlueprint`
- **실측 근거**:
  - `/components`는 49개 부품 목록을 나열하는 목록 페이지임에도 불구하고, 각 카드 렌더를 위해 `componentView(r.type)`를 호출함.
  - `componentView()`는 해당 컴포넌트의 모든 variant와 모든 축 옵션에 대해 `renderRaw`를 실행하고 내부에서 `compileBlueprint`를 반복 호출하여 유효성을 검증함.
  - 초기 서버 콜드 스타트 시 `/components` 페이지 단 한 번의 접근으로 수십~수백 건의 Blueprint 컴파일이 직렬로 수행됨.

---

### 병목 6: 타이포그래피 및 Explore에서 조립 가능 여부 검사와 실제 미리보기 조립이 중복된다
- **판정**: `존재`
- **코드 위치**:
  - **Explore**:
    - `apps/web/app/explore/page.tsx:121`:
      ```tsx
      if (!request || !assembleDesign({...request, candidates: 1}).ok) return null;
      ```
    - `apps/web/app/explore/page.tsx:126`: `<Thumb src={renderSrc(request)} ... />`
    - -> `Thumb`이 iframe을 띄우면 `/platform/render` 라우트(`route.ts:35`)에서 동일 `request`에 대해 `assembleDesign`을 또다시 호출!
  - **Typography**:
    - `apps/web/features/platform/TypeCompare.tsx:52`:
      ```tsx
      const probe = assembleDesign(request);
      ```
    - `apps/web/features/platform/TypeCompare.tsx:57`: `<Thumb src={renderSrc(request)} ... />`
    - -> probe 통과 후 `Thumb` iframe이 `/platform/render`에서 정확히 동일한 `assembleDesign`을 재호출!
- **실측 근거**:
  - Explore 페이지의 `PlatformCases`: 페이지 렌더 단계에서 6개 케이스에 대해 `assembleDesign` 6회 실행 후, 뷰포트에 잡힌 Thumb들이 `/platform/render`를 요청하여 동일 요청에 대해 `assembleDesign`을 다시 실행함 (초기 로드 컴파일 횟수가 요청된 카드 수의 2배인 12회로 실측됨).
  - Typography 페이지: 비교 대상 시스템 4개에 대해 페이지 컴포넌트에서 `assembleDesign` 4회, iframe 렌더링에서 다시 4회로 중복 실행됨 (총 7~8회 컴파일 기록).

---

### 병목 7: 프로세스 내부 캐시만으로는 서버리스 환경에서 충분한 재사용을 보장하기 어렵다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/features/platform/platform.server.ts:45-46`:
    ```ts
    const cache = new Map<string, Material[]>();
    const detailCache = new Map<string, Material>();
    ```
  - `apps/web/features/platform/platform.server.ts:66`: `const probes = new Map<string, ...>();`
  - `apps/web/features/components/spec.server.ts:23`: `let listCache: ComponentRow[] | null = null;`
  - `apps/web/features/components/spec.server.ts:108`: `const viewCache = new Map<string, ComponentView | null>();`
  - `apps/web/features/explore/designs.server.ts:64`: `let cache: Design[] | null = null;`
- **실측 근거**:
  - 모든 캐시가 단일 Node.js 프로세스 메모리(`Map`, 변수)에 갇혀 있음.
  - Vercel 운영 배포 환경 실측 시:
    - 여러 사용자가 분산 인스턴스로 라우팅될 때 캐시 미스가 지속적으로 발생.
    - 서버리스 람다 인스턴스가 주기적으로 교체(recycled)되거나 콜드 스타트가 발생할 때마다 캐시가 전무한 상태에서 초기 대규모 연산이 재발생함 (콜드/웜 TTFB 차이 208ms 발생 원인 중 하나).

---

## 3. 지시서 §3.6 목표 대비 실측 기준선 격차 분석

### 성능 목표 대비 주요 지표 비교표

| 지표 | 지시서 목표 (§3.6) | 로컬 운영 빌드 실측 (중앙값) | Vercel 운영 배포 실측 (중앙값) | 목표 달성 여부 및 격차 |
|:---|:---:|:---:|:---:|:---:|
| **LCP** | 2.5초 (2,500ms) 이하 | 24ms ~ 96ms | 80ms ~ 768ms (Explore 768ms) | **달성** (최대 768ms로 기준치 이내) |
| **INP (상호작용 지연 근사)** | 200ms 이하 | 0ms ~ 250ms | 0ms ~ 250ms | **미달** (Explore, Color, Studio 등에서 250ms로 +50ms 초과) |
| **CLS** | 0.1 이하 | 0.000 | 0.000 | **달성** (0.000으로 안정적) |
| **일반 카탈로그 iframe** | **0개** | Explore: 2~6개, Components: 2~6개 | Explore: 2~6개, Components: 2~6개 | **미달 (격차: 최대 +6개)** |
| **목록 요청 시 동적 컴파일** | **0회** | Explore: 8~12회, Typography: 7회, Components: 2~6회 | N/A (서버리스 런타임 직접 연산) | **미달 (격차: 최대 +12회)** |
| **Color 페이지 DOM 노드** | 권장 범위 이내 | 2,689 ~ 2,690개 | 2,689 ~ 2,690개 | **주의** (대규모 DOM으로 INP 및 메모리 부담) |
| **서버 TTFB (콜드 vs 웜)** | 지연 최소화 | 콜드 308ms / 웜 100ms (차이 208ms) | 콜드 지연 관찰됨 | **개선 필요** (+208ms 지연) |

---

## 4. 목표 대비 가장 큰 격차 상위 5개와 원인 위치

1. **일반 카탈로그 목록의 활성 iframe 노출 (목표: 0개, 실측: 최대 6개)**
   - **원인 코드**: `apps/web/features/explore/Thumb.tsx:32-42`, `apps/web/app/explore/page.tsx:64, 82`, `apps/web/app/components/page.tsx:32, 61`
   - **영향**: 뷰포트에 진입하는 각 카드마다 전체 독립 브라우징 컨텍스트(iframe)가 생성되어 메모리와 프로세스 자원을 낭비함.

2. **일반 목록 요청 시 서버 측 동적 컴파일 발생 (목표: 0회, 실측: 6~12회)**
   - **원인 코드**: `apps/web/app/platform/render/route.ts:31-36`, `apps/web/app/explore/page.tsx:121`
   - **영향**: 정적 사전 렌더 자산이 없어 카탈로그를 탐색할 때마다 서버리스 CPU가 소모되고 서버 응답 시간이 지연됨.

3. **실험실 상호작용 지연 (INP 근사) 200ms 기준 초과 (실측: 최대 250ms, 격차: +50ms)**
   - **원인 코드**: `apps/web/app/materials/color/page.tsx` (2,690개 DOM 노드 일괄 렌더), Studio 대형 패널 JS 번들
   - **영향**: 대규모 DOM 조작 및 긴 태스크(Long Task)로 인해 탭 전환 및 버튼 클릭 인터랙션에 버벅임 발생.

4. **Explore 및 Typography에서의 조립 검사 및 렌더링 중복 조립 (중복도: 2배)**
   - **원인 코드**: `apps/web/app/explore/page.tsx:121`, `apps/web/features/platform/TypeCompare.tsx:52`
   - **영향**: 동일한 조합 요청에 대해 서버 페이지 렌더러와 클라이언트 iframe이 각각 한 번씩 총 2번 컴파일을 수행함.

5. **서버 첫 요청(콜드 스타트) 시의 TTFB 지연 (+208ms 차이)**
   - **원인 코드**: `apps/web/features/platform/platform.server.ts:45-66`, `spec.server.ts:118-122`
   - **영향**: 프로세스 인메모리 캐시가 빈 상태에서 컴포넌트 명세 분석 및 변형 검증이 일시에 몰려 초기 사용자 체감 지연 초래.
