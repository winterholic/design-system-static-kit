# 프론트엔드 성능 병목 1~7 감사 및 판정 보고서

- **대상 저장소**: `winterholic/design-system-static-kit`
- **측정·판정 기준 커밋**: `343c1a795` (원작업 커밋). 아래 파일:줄 인용은 이 커밋 기준이며 독립 검증(P0-PERF)에서 전부 다시 확인했다.
- **측정 기준일**: 2026-11-28
- **실측 데이터 원본**: `docs/dev/catalog-platform-upgrade/PERFORMANCE-BASELINE.json` (생성 스크립트 `scripts/perf/measure.mjs`, `npm run perf`)
- **실측 환경과 한계**:
  - `local-prod`: `next build` 후 `DSK_PERF_METRICS=1 next start`. 로컬 운영 빌드이며 **Vercel 운영 실측이 아니다**.
  - `vercel-prod`: `https://design-system-static-kit.vercel.app` 실제 응답. 측정 시점 배포는 `dpl_2Qiqt5cLnX1nsRav2CNopf44kr8e`(커밋 `343c1a795`, `vercel inspect`와 GitHub 커밋 상태의 배포 URL로 대조). 단일 위치(로컬 Mac)에서 잰 실험실 값이며 실사용자(RUM) 데이터가 아니다. 이 환경에는 `DSK_PERF_METRICS`가 없어 컴파일 호출 수는 잡히지 않는다.
  - 최초 기준선(커밋 `343c1a795`의 첫 JSON)은 배포 `4f34cacad` 시점에 잰 값이었다. 독립 검증에서 현재 배포로 다시 쟀다.

### 독립 검증에서 바로잡은 측정 결함(수치 해석에 영향)

| 결함 | 영향 | 조치 |
|---|---|---|
| 페이지 항목에 `viewport` 필드가 없었다(`viewportId`·`width`만 있었다) | `.viewport` 조회가 빈 값 | `viewport: {id,label,width,height,isMobile}` 추가(평탄 필드는 호환용 유지) |
| INP 근사가 `min(탭 전환 소요, 250)`이었다. Explore에서는 비활성 "초기화" 버튼 클릭이 2초 시간 초과로 끝난 값이 250으로 기록됐다 | 이전 보고서의 "INP 250ms, 목표 +50ms 초과"는 **측정 산물이며 근거가 없다** | Event Timing 관측값만 기록. 클릭 성공 여부(`interactionOk`)와 대상을 남기고 실패 회차는 탭 전환 시간에서 제외 |
| 컴파일 호출 수를 클릭·스크롤 이후에 읽었다 | Typography의 `7`은 초기 로드 4 + 클릭(샘플 링크 이동)으로 늘어난 3이었다 | 초기 로드(`compileCount`), 상호작용 후, 스윕 후 누적을 분리 |
| 전송량·요청 수가 클릭과 스크롤까지 누적된 값이었고, 본문 크기는 content-length가 없으면 압축 해제 크기였다 | 같은 이름의 값이 "초기 로드"로 읽혔다 | 전송량은 Playwright `request.sizes()`의 실제 전송 바이트로 바꾸고 초기 로드(`totalTransfer`)와 전체 누적(`totalTransferWholeRun`)을 분리. `totalDecoded` 추가 |
| TTFB를 `responseStart - requestStart`로만 읽었다 | Vercel 동적 페이지가 9~10ms로 보였지만 curl 본문 첫 바이트는 370~430ms | `serverFirstByteMs`(본문 첫 청크까지) 추가. 두 값의 의미를 JSON `notes`에 기록 |
| 콜드/웜 비교가 서버를 이미 데운 뒤 실행되면 무의미했다(이번 재실행에서 `-5ms`로 확인) | Vercel 콜드 TTFB 9ms는 콜드가 아니었다 | 서버 재기동 직후 첫 요청과 두 번째 요청을 본문 첫 바이트로 비교. Vercel은 유휴 후 첫 요청을 보장할 수 없어 콜드 측정으로 쓰지 않는다고 명시 |
| 카운터가 QA 조합 렌더(`renderCombo`)를 세지 않았다 | 계측 범위 누락 | `features/explore/qa/combos.server.ts`에 호출 추가 |
| `--measureVercel` 없이도 Vercel을 측정했다(기본 URL이 항상 참) | 의도하지 않은 외부 요청 | 플래그가 있을 때만 측정 |

---

## 1. 지시서 §3.1 병목 1~7 판정 요약

| 번호 | 병목 항목 | 판정 | 주요 원인 코드 위치 | 핵심 실측 근거 요약 |
|:---:|:---|:---:|:---|:---|
| **1** | 미리보기마다 개별 iframe과 Observer가 생성된다 | **존재** | `apps/web/features/explore/Thumb.tsx:21-25`, `:30-42` | 카드마다 `ResizeObserver`·`IntersectionObserver`를 만들고 뷰포트 진입 시 iframe 마운트. 초기 로드 활성 iframe: Explore 2(390)/6(1280), Components 2/6, Typography 1, Components 상세 1 |
| **2** | 화면에서 멀어진 iframe을 제거하고 다시 진입하면 재생성한다 | **존재** | `Thumb.tsx:23`, `:30` | 끝까지 내려갔다 올라오는 스윕에서 iframe 로드 Explore 64(390)/56(1280)회, Components 184/171회. Explore는 같은 페이지에서 카드 30개 안팎에 대해 로드가 두 배 이상 일어남 |
| **3** | 플랫폼 렌더 경로가 `force-dynamic`, `no-store`로 동작한다 | **존재(`/platform/render`에 한함)** | `apps/web/app/platform/render/route.ts:6-7` | Vercel 실응답 `cache-control: no-store`, `x-vercel-cache: MISS`. 반면 `/explore/[id]/render`는 `x-vercel-cache: PRERENDER`로 CDN에 올라 있다 |
| **4** | 전시용 미리보기 요청마다 Core 조립이 수행된다 | **부분 존재** | `route.ts:31-36` | 동적 조립은 `/platform/render`를 쓰는 미리보기(Explore 플랫폼 사례 6개, Components 목적 패밀리, Typography 비교, Components 상세의 일부)에 한한다. Explore 대표 디자인과 `/components/[id]/render`는 빌드 시 정적 생성(SSG)이다 |
| **5** | 컴포넌트 목록에서도 `componentView()`로 상세 변형 검증을 수행한다 | **코드상 존재, 운영 요청 시점 비용은 없음** | `apps/web/app/components/page.tsx:28`, `spec.server.ts:119-124`, `:148-152` | `/components`는 `next build`에서 정적 프리렌더(○)라 운영 요청 때 `componentView`가 돌지 않는다(초기 로드 `compileBlueprint` 0). 프로세스가 갓 뜬 `next dev`에서 목록 한 번에 `compileBlueprint` **38회** |
| **6** | 타이포그래피 및 Explore에서 조립 가능 여부 검사와 실제 미리보기 조립이 중복된다 | **존재** | `explore/page.tsx:121`, `TypeCompare.tsx:52`, `:57` | Explore 데스크톱: 확인용 6회 + iframe 6회 = 12회(모바일은 6 + 보이는 iframe 2 = 8). Typography: 확인용 3회 + iframe 1회 = 4회 |
| **7** | 프로세스 내부 캐시만으로는 서버리스 환경에서 충분한 재사용을 보장하기 어렵다 | **존재(구조 판정, 운영 실측 없음)** | `platform.server.ts:52-53`, `:73`, `spec.server.ts:24`, `:109`, `designs.server.ts:66` | 캐시가 전부 프로세스 메모리다. Vercel 인스턴스 간 공유·콜드 스타트 영향은 이번 측정으로 직접 확인하지 못했다 |

---

## 2. 병목별 상세 분석 및 실측 근거

### 병목 1: 미리보기마다 개별 iframe과 Observer가 생성된다
- **판정**: `존재`
- **코드 위치**:
  - `apps/web/features/explore/Thumb.tsx:21-25`: `ResizeObserver`(21-22)와 `IntersectionObserver`(23-24, `rootMargin: '240px 0px'`), 정리 함수(25).
  - `apps/web/features/explore/Thumb.tsx:30-42`: `live && scale > 0`일 때 `<iframe key={src} sandbox="allow-scripts" ...>` 마운트(iframe 요소는 32-41).
  - 사용처: `apps/web/app/explore/page.tsx:64`(대표 사례), `:82`(전체 목록), `:126`(플랫폼 사례), `apps/web/app/components/page.tsx:32`(구조 부품), `:61`(목적 패밀리), `apps/web/features/platform/TypeCompare.tsx:57`.
- **실측 근거** (`local-prod`, 초기 로드 `activeIframes` 중앙값):
  - Explore 2(390px) / 6(1280px), Components 2 / 6, Typography 1 / 1, Components 상세 1 / 1. Materials·Color·Palettes·Studio는 0.
  - 끝까지 스크롤하는 동안 동시에 존재한 iframe 최대치: Explore 5 / 12, Components 6 / 15.
- 목표(일반 카탈로그 iframe 0개)와 격차가 있다.

### 병목 2: 화면에서 멀어진 iframe을 제거하고 다시 진입하면 재생성한다
- **판정**: `존재`
- **코드 위치**: `Thumb.tsx:23`(`setLive(e.isIntersecting)`), `Thumb.tsx:30`(`live`가 false면 iframe을 렌더하지 않아 언마운트).
- **실측 근거**: 이번 검증에서 맨 위에서 끝까지 내려갔다가 다시 맨 위로 올라오는 스윕(`scrollSweep`)을 측정했다.
  - iframe 로드(framenavigated) 수, 내려가기만: Explore 32 / 28, Components 95 / 86.
  - 내려갔다 올라오기까지: Explore 64 / 56, Components 184 / 171.
  - 올라오는 길에 같은 카드의 iframe이 다시 로드되므로 재생성이 확인된다. `/platform/render`는 `no-store`라 브라우저·CDN 재사용이 없고 서버 조립이 다시 일어난다: Components 컴파일 호출이 초기 2 / 6에서 스윕 후 누적 66 / 64로 늘었다(목적 패밀리 썸네일이 재진입마다 `assembleComponents`를 부른다).
  - 이전 문서가 인용한 "CDP 네트워크 트레이스"는 저장소에 증거가 없어 제거했다. 위 스윕 수치가 대체 근거다.

### 병목 3: 플랫폼 렌더 경로가 force-dynamic, no-store로 동작한다
- **판정**: `존재` (`/platform/render`에 한함)
- **코드 위치**: `apps/web/app/platform/render/route.ts:6`(`export const dynamic = 'force-dynamic'`), `:7`(`'cache-control': 'no-store'`).
- **실측 근거** (2026-11-28 실제 `design-system-static-kit.vercel.app` 응답):
  - `/platform/render?r=...`: `HTTP/2 200`, `cache-control: no-store`, `x-vercel-cache: MISS`.
  - 비교: `/explore/saas-landing/render`는 `cache-control: public, max-age=0, must-revalidate`, `x-vercel-cache: PRERENDER`.

### 병목 4: 전시용 미리보기 요청마다 Core 조립이 수행된다
- **판정**: `부분 존재`
- **코드 위치**: `apps/web/app/platform/render/route.ts:31-33`(`k=components` → `assembleComponents`), `:35`(`assembleDesign`).
- **정정**: 이전 문서는 "정적 미리보기 자산이 전혀 없다"고 했으나 사실과 다르다.
  - 정적(SSG) 미리보기: Explore 대표 디자인 `/explore/[id]/render`, 구조 부품 `/components/[id]/render` (`next build` 라우트 표의 `●`). 이 경로는 런타임 조립이 0이다(Explore에서 `compileBlueprint` 초기 로드 0).
  - 동적 조립: Explore 플랫폼 사례 6개(`PLATFORM_CASES`, `explore/page.tsx:126`), Components 목적 패밀리(`components/page.tsx:61`), Typography 비교(`TypeCompare.tsx:57`).
- **실측 근거**(초기 로드 서버 계측 호출 수, 중앙값, 390 / 1280): Explore 8 / 12 (`assembleDesign`), Components 2 / 6 (`assembleComponents`), Typography 4 / 4 (`assembleDesign`).
- **Explore 8의 출처**: 서버가 페이지를 그릴 때 확인용 `assembleDesign`을 사례 6개에 대해 6회(`explore/page.tsx:121`), 화면에 들어온 사례 iframe 2개가 `/platform/render`를 불러 2회. 1280px에서는 iframe 6개가 모두 보여 6 + 6 = 12.

### 병목 5: 컴포넌트 목록에서도 componentView()로 상세 변형 검증을 수행한다
- **판정**: `코드상 존재, 운영 요청 시점 비용 없음`
- **코드 위치**:
  - `apps/web/app/components/page.tsx:28`: `const view = componentView(r.type)!;` (구조 부품 카드마다 호출)
  - `apps/web/features/components/spec.server.ts:119-124`: 변형 id마다 `renderRaw`(119), 변형 축 옵션마다 `renderRaw`(120-124).
  - `apps/web/features/components/spec.server.ts:148-152`: `compileHtml` → `compileBlueprint`.
- **실측 근거**:
  - `next build` 표에서 `/components`는 `○`(정적 프리렌더)다. 운영 서버가 목록 요청을 받을 때 `componentView`는 실행되지 않는다. 초기 로드 `compileBlueprint` 계측 0.
  - 프로세스가 갓 시작된 `next dev`(`DSK_PERF_METRICS=1`)에서 `GET /components` 한 번에 `compileBlueprint` **38회**, 두 번째 요청은 `viewCache` 때문에 0회.
  - 따라서 병목은 빌드 시간과 개발 서버, 그리고 목록에서 상세 검증을 호출하는 구조다. §3.4 "목록에서 상세 변형 컴파일을 수행하지 않는다"에는 어긋난다. 이전 문서의 "수십~수백 건이 요청 때 직렬 수행"은 운영 빌드에서는 맞지 않는다.

### 병목 6: 타이포그래피 및 Explore에서 조립 가능 여부 검사와 실제 미리보기 조립이 중복된다
- **판정**: `존재`
- **코드 위치**:
  - Explore: `apps/web/app/explore/page.tsx:121`(`assembleDesign({...request, candidates: 1}).ok` 확인), `:126`(같은 `request`로 `Thumb` → `/platform/render` → `route.ts:35`에서 다시 조립).
  - Typography: `apps/web/features/platform/TypeCompare.tsx:52`(`const probe = assembleDesign(request)`), `:57`(같은 `request`의 `Thumb`).
- **실측 근거**:
  - Explore: 확인용 6회 + iframe 호출(보이는 수만큼). 390px 8회, 1280px 12회. 사례 6개가 모두 보이면 정확히 2배다.
  - Typography: 기본 비교 대상이 3개(`with` 기본값 `doc-essay,work-console,mkt-launch`, `typography/page.tsx:33`)라 확인용 3회 + 보이는 iframe 1회 = 4회. 이전 문서의 "4개 + 4회 = 7~8회"는 틀렸다(7은 클릭 후 누적).

### 병목 7: 프로세스 내부 캐시만으로는 서버리스 환경에서 충분한 재사용을 보장하기 어렵다
- **판정**: `존재` (구조 판정. 운영 인스턴스 간 캐시 미스는 이번에 측정하지 않았다)
- **코드 위치**:
  - `apps/web/features/platform/platform.server.ts:52-53`: `const cache = new Map<string, Material[]>(); const detailCache = new Map<string, Material>();`
  - `apps/web/features/platform/platform.server.ts:73`: `const probes = new Map<...>()`. `:80`에서 400개를 넘으면 비운다(상한 있음).
  - `apps/web/features/components/spec.server.ts:24`: `let listCache`, `:109`: `const viewCache = new Map<...>()`.
  - `apps/web/features/explore/designs.server.ts:66`: `let cache: Design[] | null = null;`
- **실측 근거와 한계**:
  - 모든 캐시가 단일 Node.js 프로세스 메모리다. `assembleDesign` 자체(Explore 확인용·`/platform/render`)에는 결과 캐시가 없다. `probeDesign`(`platform.server.ts:74-83`)만 `probes`를 쓴다.
  - 이전 문서가 원인으로 든 "콜드/웜 TTFB 208ms 차이(Vercel 포함)"는 근거가 못 된다. 그 값은 로컬 서버를 막 띄운 첫 요청이었고, Vercel의 콜드/웜 측정은 콜드 상태를 보장하지 못했다. 이번 재측정의 로컬 콜드/웜은 본문 첫 바이트 279ms / 26ms다(차이 253ms, 로컬 서버 첫 요청).

---

## 3. 지시서 §3.6 목표 대비 실측 기준선 격차 분석 (중앙값, 초기 로드)

| 지표 | 지시서 목표 (§3.6) | 로컬 운영 빌드 | Vercel 운영 배포 | 판정 |
|:---|:---:|:---:|:---:|:---:|
| **LCP** | 2.5초 이하 | 24 ~ 164ms (Studio 160~164ms) | 80 ~ 620ms (Explore 390px 620ms) | **달성** (최대 620ms) |
| **INP** | 200ms 이하 | Event Timing 관측 최대 0 ~ 112ms | 0 ~ 136ms | **달성(관측 범위)**. 이전 "250ms 초과"는 측정 산물로 철회. 단 16ms 미만 이벤트는 관측되지 않고 실행된 상호작용이 제한적(아래 참고) |
| **CLS** | 0.1 이하 | 0 | 0 | **달성** |
| **일반 카탈로그 iframe** | 0개 | Explore 2~6, Components 2~6 (스크롤 중 동시 최대 12·15) | 동일 | **미달** |
| **목록 요청 시 동적 컴파일** | 0회 | Explore 8~12, Components 2~6, Typography 4 | 계측 불가(`DSK_PERF_METRICS` 없음) | **미달** |
| **고정 미리보기 반복 요청 시 재컴파일** | 0회 | 스크롤 내려갔다 올라오면 Explore 누적 26~30, Components 64~66 | 계측 불가 | **미달** (재진입마다 재조립) |
| **캐시된 탭 전환** | 200ms 이내 | 탭 전환 UI 반응(클릭→2프레임) 159 ~ 259ms (Explore 179/259, Color 258/174, Typography 225/255, Studio 234/228) | 157 ~ 386ms | **대체로 미달·불안정**. 대상이 있는 페이지만 측정(Materials·Palettes·Components 목록은 눌러 볼 대상 없음) |
| **초기 카탈로그 카드** | 24개 이하 | Explore 목록 쪽당 24개 + 사례 | 동일 | 원칙상 충족, Components 목록은 구조 부품 전체를 한 번에 렌더 |
| **Color 페이지 DOM 노드** | 목표 없음 | 2,689 ~ 2,690 | 동일 | 주의 |
| **서버 첫 바이트 (동적 페이지)** | 목표 없음 | 23 ~ 24ms (Explore), 로컬 콜드 279ms | Explore 375~421ms, Typography 249~424ms (정적 페이지 13~22ms) | 동적 라우트가 Vercel에서 느림 |

탭 전환 시간은 "클릭 시작부터 두 번째 animation frame"이며 데이터 로딩 완료 시간이 아니다. 측정 대상은 페이지마다 처음 만나는 활성 탭·분할 버튼·페이지 이동 링크 하나다.

---

## 4. 목표 대비 가장 큰 격차 상위 5개와 원인 위치

1. **일반 카탈로그 목록의 활성 iframe (목표 0개)**: 초기 최대 6개, 스크롤 중 동시 최대 12개(Explore)·15개(Components).
   - 원인 코드: `apps/web/features/explore/Thumb.tsx:21-25`, `:30-42`; 사용처 `explore/page.tsx:64, 82, 126`, `components/page.tsx:32, 61`.
2. **고정 미리보기 반복 요청 시 재컴파일 (목표 0회)**: 스크롤 왕복 후 Components 누적 64~66회, Explore 26~30회. 재진입마다 iframe 재생성과 `/platform/render` 재호출이 일어난다.
   - 원인 코드: `Thumb.tsx:23, 30`(언마운트), `apps/web/app/platform/render/route.ts:6-7`(`no-store`).
3. **일반 목록 요청 시 동적 컴파일 (목표 0회)**: 초기 로드 Explore 8~12회(확인용 6 + iframe), Components 2~6회, Typography 4회.
   - 원인 코드: `explore/page.tsx:121`, `route.ts:31-36`, `TypeCompare.tsx:52`.
4. **캐시된 탭 전환 200ms (측정된 대상에서 157~386ms)**: Color(DOM 2,690개), Studio, Typography.
   - 원인: Color 페이지의 대규모 DOM(`apps/web/app/materials/color/page.tsx`)과 Studio 번들. 정확한 JS 비용 분해는 이번 범위 밖(측정 대상과 시간 정의의 한계가 있어 확정 판정으로 쓰지 않는다).
5. **Vercel 동적 라우트의 서버 첫 바이트 (Explore 375~421ms, 정적 페이지는 13~22ms)**: 목표 수치는 없지만 정적 페이지와 20배 차이.
   - 원인 코드: Explore가 `ƒ`(동적)이고 서버 렌더에서 `assembleDesign`을 6회 부른다(`explore/page.tsx:121`), 결과 캐시 없음.

병목 5(`componentView`)와 병목 7(캐시)은 운영 요청 시점 격차로 측정되지 않아 순위에서 제외했다. 병목 5는 빌드 시간·개발 서버 비용, 병목 7은 Vercel 인스턴스 간 캐시 공유를 따로 측정하기 전까지 판정 보류다.


---

## 5. Track A1(미리보기 정적화·결정론적 캐시) 전후 실측과 정정

독립 검증(`VERIFICATION.md` §11)에서 최초 구현(`90ac06060`)의 이 절을 다시 썼다. 최초 절의 수치(전송량 50~83% 절감 등)는 근거가 없었다. 당시 사전 생성 SVG 126개 중 109개는 XML 로 읽히지 않아 `<img>` 로 열리지 않았고(Explore 전부) 부품 미리보기는 0개여서, 그 상태에서 잰 값은 "그림이 없는 목록"의 값이었다.

- 측정 원본: `PERFORMANCE-A1.json`(`local-prod`: `next build` 후 `DSK_PERF_METRICS=1 next start -p 4291`, 3회 중앙값, `npm run perf`). 비교 기준은 `PERFORMANCE-BASELINE.json`(코드 `343c1a795` 시점). Vercel 운영은 측정하지 않았다.
- 표의 `전→후` 는 같은 지표의 기준선 값과 이번 값이다.

| 페이지 | 폭 | iframe(초기) | 스윕 중 iframe 로드 | 컴파일(초기) | 컴파일(스윕 후) | DOM 노드 | 초기 전송 KB | LCP ms | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Explore | 390 | 2→0 | 64→0 | 8→0 | 26→0 | 504→538 | 237→376 | 48→356 | 0→0 |
| Explore | 1280 | 6→0 | 56→0 | 12→0 | 30→0 | 512→542 | 371→654 | 56→520 | 0→0 |
| Materials | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 141→141 | 216→216 | 28→28 | 0→0 |
| Materials | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 144→144 | 274→264 | 32→32 | 0→0 |
| Color | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 2689→2689 | 277→271 | 40→40 | 0→0 |
| Color | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 2690→2690 | 300→288 | 40→68 | 0→0 |
| Palettes | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 114→114 | 225→225 | 24→28 | 0→0 |
| Palettes | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 117→117 | 284→273 | 28→32 | 0→0 |
| Typography | 390 | 1→0 | 1→0 | 4→0 | 13→0 | 332→332 | 261→245 | 44→40 | 0→0 |
| Typography | 1280 | 1→0 | 1→0 | 4→0 | 13→0 | 335→335 | 324→296 | 40→192 | 0→0 |
| Components | 390 | 2→0 | 184→0 | 2→0 | 66→0 | 674→757 | 201→235 | 32→140 | 0→0 |
| Components | 1280 | 6→0 | 171→0 | 6→0 | 64→0 | 681→760 | 296→378 | 36→124 | 0→0 |
| Components 상세 | 390 | 1→1 | 0→0 | 0→0 | 0→0 | 423→423 | 206→201 | 28→40 | 0→0 |
| Components 상세 | 1280 | 1→1 | 0→0 | 0→0 | 0→0 | 426→426 | 254→243 | 36→40 | 0→0 |
| Studio | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 92→93 | 207→204 | 160→164 | 0→0 |
| Studio | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 97→98 | 238→231 | 164→164 | 0→0 |

### 5.1 목표 대비

| 지표(REQUEST §3.6) | 목표 | 결과 |
|---|---|---|
| 일반 카탈로그 iframe | 0개 | Explore·Components·Typography 모두 0개(스크롤 왕복 포함). 상세의 시험 영역 1개는 유지(계약 §5.1 허용) |
| 일반 목록 요청 시 동적 컴파일 | 0회 | Explore·Components·Typography 0회(초기·스윕 후) |
| 고정 미리보기 반복 요청 시 재컴파일 | 0회 | 정적 파일이라 컴파일 경로가 없다. 같은 주소 재요청 0회(`catalog-lists.spec.mjs`) |
| 초기 카탈로그 카드 | 최대 24개 원칙 | Explore 주 목록 24개(쪽 나눔). Typography 1개. Components 는 A3 에서 해소(§6): 한 쪽 24개 이하, 전체 92개는 쪽 이동·검색으로. 이 표의 시점(A1)에는 DOM 에 카드 92개, 초기 로딩 미리보기 25개였다 |
| LCP / CLS | 2.5초 / 0.1 이하 | 최대 LCP 520ms(Explore 1280), CLS 0 |
| INP, 캐시된 탭 전환 | 200ms 이하 | 이 작업이 건드리지 않은 축이며 이번에 새로 판정하지 않았다(JSON 의 `inpApprox`·`tabSwitchDuration` 참조) |

### 5.2 늘어난 값과 그 이유(숨기지 않는다)

- **LCP**: Explore 48→356ms(390), 56→520ms(1280). 예전에는 iframe 안의 내용이 LCP 후보가 아니어서 텍스트가 LCP 였고, 지금은 첫 카드의 SVG 이미지가 LCP 후보다. 목표(2.5초) 안이다.
- **초기 전송량**: Explore 237→376KB(390), 371→654KB(1280), Components 201→235KB / 296→378KB. 로컬 `next start` 는 `public/` 정적 파일을 압축하지 않는다(응답에 `Content-Encoding` 없음). 사전 생성 SVG 357개의 평균은 원본 52.4KB, gzip 11.8KB 이므로 압축되는 CDN 에서는 같은 이미지 수의 전송량이 이 값의 약 1/4 이다. Vercel CDN 이 실제로 압축하는지는 측정하지 못했다(`확인 필요`). 브라우저의 지연 로딩이 화면 근처 두 화면 분량(Explore 24개, Components 25개)을 미리 불러오는 것도 원인이다.
- **DOM 노드**: Components 674→757 / 681→760, Explore 504→538 / 512→542. 카드마다 이미지 한 장이 항상 DOM 에 있다(예전에는 화면 밖 카드의 iframe 이 없었다). "DOM 요소 수 대폭 감소"(TASK-TRA-01 기준)는 달성하지 못했다. iframe 과 Observer 가 사라지는 대신 가벼운 노드가 늘었다.

### 5.3 구현(요약)

1. 사전 생성(`scripts/build-catalog-index.mjs`): Core 가 만든 완성 문서를 XHTML 로 직렬화한 SVG 357개(Explore 대표 디자인 256, 부품 60, 목적 패밀리 31, 사례 6, 타이포 4)와 경량 인덱스. 거부된 조합 11개는 사유와 함께 건너뛴다(`previews-data.json` 의 `skipped`).
2. 캐시 키는 CONTRACTS §5.2 그대로이고 파일 이름이다(`/previews/<키>.svg`, immutable). 화면은 자기 요청의 키가 있을 때만 정적 파일을 쓴다.
3. `/platform/render` 는 `private, no-cache` + ETag/304, 서버 캐시는 개수·바이트 상한 LRU.
4. 목록 카드는 `<img>` 한 장(iframe·Observer 없음). 상세 시험 영역만 iframe.

---

## 6. Track A3(Components 쪽 나눔·Studio 캐시 키·측정 훅) 전후 실측

A1 검증(§5)과 A2 검증(`VERIFICATION.md` §6)이 남긴 세 가지를 A3에서 다뤘다. 측정 원본은 `PERFORMANCE-A3.json`(운영 빌드), `PERFORMANCE-A3-studio-probe.json`(Studio 편집 시나리오만, 측정 빌드)이다. 원 기록은 `local-prod`(`next build` 후 `DSK_PERF_METRICS=1 next start -p 4291`, `npm run perf -- --url http://127.0.0.1:4291 --pages explore,components,studio`, 3회 중앙값)이고 RUM 이 아니다. 그러나 A1·A3 JSON 모두 측정 대상 소스 SHA를 기록하지 않았고 측정 시각이 해당 branch tip commit보다 앞서므로, 표는 과거 기록의 수치 대조일 뿐 정확한 revision 간 비교로 귀속하지 않는다. 이번 독립 재검증은 현재 HEAD `7f9c24fca6dd295bd672739d85ae25999fe2dde1`의 HTTP·서비스 API로 목록 정합성, iframe, 컴파일 수를 확인했으나 브라우저 LCP를 다시 재지 못했다(`VERIFICATION.md` §13). Vercel 운영은 측정하지 않았다.

### 6.1 변경

1. **Components 목록 쪽 나눔**: 현재 공개 서비스 API는 목적 패밀리 37개와 `catalogVersion=2.6.0` 구조 부품 65개를 내며, 페이지 노드 1개를 제외한 실제 카드 ID는 101개다. `/components` 는 이를 한 쪽 24개씩 5쪽으로 서버에서 자른다. 쪽 밖 카드는 DOM 에 만들지 않고 탭으로 숨기지도 않는다. 주소는 그대로 `/components`이고 `?page=N`, `?q=검색어`, `?group=<kind>:<분류>` 가 붙는다. 검색·분류는 쪽을 자르기 전에 전체 목록에서 걸러서 첫 쪽 밖의 카드도 찾는다(`features/components/list-query.ts`). 검색 상자는 JS 없이 동작하는 GET 폼이다. 상세 주소(`/components/<type>`, `/components/purpose/<group>/<id>`)는 바뀌지 않았다. 이전 A3 기록의 `32+60=92`, 4쪽은 현재 공개 서비스 집합과 맞지 않아 바로잡았다.
2. **Studio 캐시 키 엔진 버전**: `compileBlueprint/<CONTRACT_VERSION>` → `<PLATFORM_CONTRACT_VERSION>/<CONTRACT_VERSION>`(CONTRACTS §5.2 와 같은 형식, 현재 `0.8.0/1.3.0`). 값은 A1 이 `./service` 공개 진입점에 열어 둔 읽기 전용 상수이고 웹이 `src/platform` 을 import 하지 않는다. 상수를 읽지 못하면 `unknown/unknown` 이라 정상 버전의 키와 섞이지 않는다.
3. **측정 훅 운영 빌드 제거**: `window.__studio_api`, `window.__studio_compile_count` 는 `DSK_STUDIO_PROBE=1` 로 빌드한 번들에만 들어간다(`features/studio/probe.ts`, `next.config.mjs` 가 값을 `'0'`/`'1'` 로 박는다). 운영 빌드는 `.next/static` 에 이 문자열이 없다. 측정 스크립트는 훅이 없으면 Studio 편집 시나리오만 이유와 함께 건너뛴다.

Studio 편집 시나리오를 재려면 측정 빌드가 필요하다: `DSK_STUDIO_PROBE=1 npm run web:build` 후 `DSK_PERF_METRICS=1 next start`. 측정 뒤에는 변수 없이 다시 빌드한다.

### 6.2 전→후 (중앙값)

| 페이지 | 폭 | iframe(초기) | 스윕 중 iframe 로드 | 컴파일(초기) | 컴파일(스윕 후) | DOM 노드 | 초기 전송 KB | LCP ms | CLS |
|---|---|---|---|---|---|---|---|---|---|
| Components | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 757→247 | 241→233 | 140→172 | 0→0 |
| Components | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 760→250 | 387→359 | 124→164 | 0→0 |
| Explore | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 538→538 | 385→385 | 356→340 | 0→0 |
| Explore | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 542→541 | 670→658 | 520→516 | 0→0 |
| Studio | 390 | 0→0 | 0→0 | 0→0 | 0→0 | 93→93 | 209→209 | 164→160 | 0→0 |
| Studio | 1280 | 0→0 | 0→0 | 0→0 | 0→0 | 98→97 | 236→223 | 164→164 | 0→0 |

- 과거 A3 기록에서는 Components 첫 쪽 DOM 카드(`[data-preview]`)가 24개, 초기 로딩 미리보기 23개였다. 이번 HTTP 검증에서 공개 서비스 전체 101개 ID가 24·24·24·24·5개로 모두 순회됐고 중복·누락이 없었다. 모든 쪽의 HTML 에 카드 DOM 24개 이하, iframe 0, 숨김 카드 0, 목록 요청 컴파일 0이었다.
- 과거 A3 기록의 Components LCP 는 140→172ms(390), 124→164ms(1280)로 적혀 있다. 이번에는 브라우저 성능 실측을 재현하지 못했고 A1/A3 원본에 측정 소스 SHA도 없다. 따라서 +32/+40ms는 기록된 값의 차이로만 보존하고 A3 변경의 영향이나 원인으로 귀속하지 않는다. Vercel 서버 첫 바이트도 측정하지 않았다.
- Explore·Studio 의 페이지 지표는 이 변경이 건드리지 않았고 차이는 잡음 범위다.
- **iframe 0, 동적 컴파일 0 유지**: 위 표는 원 기록이다. 독립 HTTP 검증은 전체 5쪽·검색·분류 요청에서 iframe 0과 `compileBlueprint/assembleDesign/assembleComponents/total = 0`을 확인했다. 브라우저 스크롤 왕복 네트워크 재요청 0회는 이번 환경에서 재실행하지 못해 과거 기록에 한정한다.

### 6.3 Studio 편집 시나리오(측정 빌드, 390 / 1280)

| 지표 | A3 (390 / 1280) | A2 검증(`VERIFICATION.md` §6.4, 390) |
|---|---|---|
| 10회 연속 편집(15ms 간격) 컴파일 수 | 1 / 1 | 1 / 1 |
| 같은 팔레트 재적용 추가 컴파일 | 0 / 0 | 0 / 0 |
| 디자인 탭 첫 열림(ms) | 128 / 127 | 117 / 115 |
| 편집→미리보기 반영, 새 팔레트(ms) | 279 / 196 | 214 / 283 |

캐시 키에 platform 버전이 들어갔어도 같은 계약 버전 안에서는 재사용이 그대로다(재적용 추가 컴파일 0). 지연 값은 3회 중앙값이고 두 측정의 차이는 잡음 범위로 보이며, 이 변경의 효과나 손실로 읽지 않는다(반복 측정으로 확인하지 않았다 `확인 필요`).
