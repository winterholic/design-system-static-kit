# ADR 0010: 2.5.0 표현력 문법과 서비스 공개

- 상태: 채택
- 날짜: 2026-11-21
- 관련: ADR 0005, 0006, 0008, 0009; `docs/dev/expressiveness/report.md` 4~8절

## 결정

카탈로그 2.5.0에 닫힌 enum 기반 표현력 필드 EX-1~EX-5와 직접 작성 Blueprint에 적용할 수 있는 계약 진단을 추가한다. 필드가 없는 Blueprint의 기존 출력은 유지하고, 2.4.0 이하 Blueprint에서는 새 필드와 enum 값을 거부한다. 새 필드를 쓰는 문서는 `kit migrate --to 2.5.0` 또는 라이브러리의 `migrateBlueprint(doc, '2.5.0')`로 명시적으로 올린다.

새 문서의 기본 생성·템플릿 조립·기본 `migrate`는 2.4.0을 계속 쓴다. 2.5.0을 기본값으로 승격하면 85개 기본 템플릿과 후속 서비스 소비자가 새 버전으로 바뀐다. 사용하지 않은 필드의 Blueprint 출력이 같다는 사실만으로 전체 API·문서·저장 데이터가 호환된다고 볼 수 없다. 기존 2.4.0 출력 85개 템플릿과 직접 작성 사례 15개를 기준 해시로 고정하고, 승격은 별도 호환 검토로 남긴다.

## 문법과 진단

| 제안 | 2.5.0 문법 | 검증·출력 경계 |
|---|---|---|
| EX-1 비율 | `hero.ratio: even/copy/visual`; `split.ratio`의 `dominant-start/end` | 히어로 유형·visual 조합 검사, split의 좁은 칸 부품 검사. container가 충분히 넓을 때만 약 7:3, 그 외 폭은 기존 비율·한 열 |
| EX-2 강조 칸 | 첫 카드의 `card.featured: yes` | 3개 이상인 three/four 열 grid 하나에만 허용, 2칸으로 계산해 마지막 줄 고아 방지 |
| EX-3 풀쿼트 | `quote.variant: box/pull` | pull은 페이지 또는 section 직속이며 기존 `quote-l` 역할 재사용 |
| EX-4 구역 리듬 | `section.surface: flat`; `section.space: tight/normal/loose` | 최상위 section에만 적용, 기존 토큰 단계 재사용, `bandL`은 사용 시에만 출력 |
| EX-5 전폭 미디어 | 페이지 직속 `media.bleed: yes` | 16:9·21:9만 허용하고 CSS grid의 full line을 사용. viewport 기반 음수 여백은 쓰지 않음 |

이 필드와 의미는 `blueprintSchema()`, `getSchema({target:'blueprint'|'component'})`, `getComponentSpec({type})`, 서비스 규칙 조회 및 `catalogSnapshot()`에서 같은 `nodeSpecs`·규칙 정의를 노출한다. 서비스의 `catalogVersion` 검사는 2.5.0도 받지만 기본 버전은 2.4.0이다. 편집 연산은 Blueprint의 새 필드를 보존한다(ADR 0008).

Core `getSchema({target:'blueprint'})`의 `x-runtimeRules`는 R21·R22를 포함한다. 직접 적용한 변형 결과 계약 경고는 Core `diagnostic` 스키마가 선택 속성 `severity`(`info` 또는 `warning`)와 `contract`(V## 문자열)로 설명한다. 이 추가 선택 속성에 따라 서비스 계약만 1.1.0으로 올리고 카탈로그 기본 버전 2.4.0은 유지한다.

EX-1~EX-5의 필드 위치·enum·오류 코드를 검증한다. 직접 작성 Blueprint의 정적 품질 검사는 재현 가능한 V03·V04를 경고, V01·V02를 정보 진단으로 내고 문서를 거부하지 않는다. 데이터 손실 V06은 기존 검증기 오류로 유지한다. 템플릿 85개는 2.5.0으로 검사해도 오류 없이 컴파일돼야 한다.

## 렌더러 품질 결함

2.5.0에서 R1~R4만 버전 게이트 아래 고친다: 히어로 직후 경계에 맞춘 섹션 간격(R1), 명시한 plain/flat 면을 자동 띠에서 제외(R2), 3:4 device 목업 칩을 캔버스 안에 배치하고 폭 제한(R3), showcase 주 사진을 16:9로 제한(R4). 검증은 기존 2.4.0 HTML/CSS가 유지되는지와 새 버전의 실제 DOM 치수를 함께 본다.

R5는 새로운 검사 범위로 반영한다. V03·V04를 직접 쓴 Blueprint에서도 검사하고, 템플릿 생성 시험으로 유효성과 진단 수준을 확인한다. 임의 HTML·CSS/className 해석 경로는 추가하지 않는다.

## 축 금지 X03·X06·X07

세 금지는 이번 변경에서 유지한다. 현재 증거는 완화 결정을 내리기엔 확인 범위가 좁다.

- **X03 (full × centered·minimal·editorial·masthead):** 1920px에서 prose 최대 폭 720px은 wide와 같고 prose 자체의 줄 길이는 상한을 넘지 않았다. 카드 본문·목록 설명 같은 prose 외 부품은 재지 않았다. 따라서 현재 줄 길이 근거를 완화하지 않고, 비 prose 부품 측정 뒤 재검토한다.
- **X06 (mono/terminal × dramatic):** 영문 37자 제목 하나를 390px에서 검사해 수평 넘침은 없고 두 줄, 38px이었다. 히어로의 `--kit-fit` 동작이 해당 조합을 맞춘다. 긴 한글·기타 헤더·다른 셸/브라우저 조합은 확인하지 않아 금지를 유지한다.
- **X07 (bubble × compact):** 카드 안쪽 여백 24px, 반경 28px 한 조합을 측정했다. 모서리가 콘텐츠 영역을 침범할 기하학적 여백 기준 약 8.2px보다 안쪽 여백이 크고 캡처상 잘림도 없었다. 다만 다른 컴포넌트·플랫폼·패딩의 조합은 확인하지 않아 근거 문구를 보강한 뒤 금지 유지한다.

이 판단은 해당 금지가 결함을 입증했다는 뜻이 아니다. X03·X06·X07의 반사실 관찰은 지금 확인한 폭·본문/제목·카드 조건에 한정하고, 미측정 조건을 완료된 것으로 취급하지 않는다.

## 증거와 결과물

기준 해시 원본은 `docs/evidence/expression/legacy-2-4-blueprints.json`, 고정 해시는 `legacy-2-4-hashes.json`에 둔다. 2.5.0 회귀는 모든 85개 템플릿과 15개 사례의 2.4.0 출력을 이 값과 대조한다. 사례 재생성·컴파일·브라우저 측정 및 전후 캡처의 명령·결과는 표현력 보고서의 검증 절과 `docs/evidence/expression/`에 기록한다.

## 결과

2.5.0은 명시 선택이며 기본 생성은 2.4.0이다. 문법·검증·스키마·카탈로그·서비스·CLI가 동일한 버전 경계를 쓴다. R1~R5는 사례 증거를 보강하며, X03·X06·X07은 측정 범위를 넘는 일반화 없이 유지한다.
