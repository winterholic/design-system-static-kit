# R14-C · 표 반례, 헤더, 짧은 단계와 시각 자산

2026-11-16. 기준 revision `61d2e5e5c51a58aeb6a7f4ecc2fc6a7337bd6864`. composition 1.2.0. 앞선 카드·차트 교정과 표 통합은 [remediation-a.md](remediation-a.md), [remediation-a-marker-verification.md](remediation-a-marker-verification.md), [remediation-b.md](remediation-b.md), [표 브라우저 검증](remediation-b-verification.md)에 있다. 이 기록은 상위 원인을 다룬 추가 교정이며 183개 육안 관측 전체의 해결 선언이 아니다.

## 원인과 선택

| 대상 | 확인한 원인 | 공통 교정·책임 경계 |
|---|---|---|
| `4.2억` 등 | 표 내용 분류가 천·만·억·조와 선행 원화 기호를 받지 않음 | 닫힌 수량 문법만 확장. 전화번호·날짜·버전·순수 숫자 ID·혼합 열의 보수적 왼쪽 정렬 유지. 표의 실제 행·열 순서는 유지 |
| centered/masthead 헤더 | flex column과 데스크톱 absolute action이 로고·액션을 다른 행 또는 다른 중심에 배치 | `chrome-row-1`: 로고·주 액션을 같은 primary row에 묶고 메뉴는 별도 행. 720px 이상 **실제 헤더 콘텐츠 폭**에서만 로고 중앙 배치. 기존 간격 토큰만 사용 |
| 암묵적 짧은 단계·일정 | 콘텐츠 양과 관계없이 한 열만 사용 | `sequence-content-1`: 명시한 layout/variant가 없고 4항목 이하의 짧은 내용에 기존 orphan-free flow와 콘텐츠 최소폭 적용. 명시한 vertical/line/release/log와 긴 서사는 보존. 입력을 변환하지 않음 |
| 잘못된 예시 시각 자산 | `media.kind=diagram/chart`는 도면·실데이터 그래프가 아니라 고정 데모 그림이고, `hero.visual=device`는 휴대전화 목업 | 제품 사양은 기존 제품 일러스트+별도 사양, 매물은 실내 예시와 실제 평면도 미제공 표시, 연구는 기존 표와 같은 네 값의 실제 chart 부품. 은행·개발도구 히어로는 관계없는 목업을 빼고 기존 상품 설명·실데이터 부품 유지. hero variant와 조합 ID는 유지 |

위 규칙은 코드와 구조화된 manifest 진단으로 실행한다. 외부 디자인 문서의 숫자를 복사하지 않았고 자연어 프롬프트·AI 호출·소비자 CSS 입력을 추가하지 않았다. 외부 대장과의 대응은 내용 폭·정렬에 CAR-12/ANT-11/POL-06/ANT-12, 관계 간격에 기존 S02다. 헤더와 암묵 단계의 구체적인 분기는 이번 실제 렌더 관측을 토대로 한 킷의 선택이며 외부 시스템의 규범을 그대로 구현했다는 뜻이 아니다.

## 호환성과 계약

- `manifest.design.chrome`와 각 sequence 결정에 policy와 이유가 남는다. 단순 선택 로직과 기존 유한 흐름을 확장했다.
- 카드·차트·표·헤더·단계의 새 경로는 2.2 입력에 적용한다. 2.1의 compiler 출력 경로는 유지한다.
- 예시 데이터 5종을 바꾸기 **전에** 원본 Blueprint 85개를 `context/legacy-blueprints.json`에 고정하고 기존 `legacy-hashes.json`의 모든 SHA-256과 대조했다. 과거 입력을 현재 새 템플릿으로 다시 만들지 않고 정확히 같은 입력으로 호환성을 검사한다. 기존 기대 hash는 바꾸지 않았다.
- 기존 접근성 검사에서 `<th scope="col">`라는 속성 없는 문자열 기대만 새 compiler 소유 data 속성을 허용하도록 바꿨다. `scope="col"` 요구와 키보드 도달 요구는 그대로다.
- 초기 hero variant 변경이 4,955개 조합의 ID 집합을 바꾸는 것을 전체 검사가 잡았다. 변형 이름을 원래대로 돌렸으며 진단 목록이나 기존 조합 pin을 수정해 숨기지 않았다.

## 실행 증거와 범위

- 표: 저장된 재현 테스트의 `start != end` 실패를 확인한 뒤 단위·통합 10개 통과. 잘못 작성된 9열 반례는 허용된 8열 이하 두 입력으로 나눠 실제 분류 행동을 검사한다.
- 헤더: 신규 정책이 없다는 실패를 확인한 뒤 5개 예시의 새 구조와 레거시·다른 셸 보존 검사 통과.
- 단계: 정책·속성뿐 아니라 **실제 ol에 flow가 연결되지 않았음**을 실패 테스트로 확인한 뒤 renderer 연결. 명시적 세로·line 및 긴 한글 반례 검사.
- 콘텐츠: 목적에 맞는 media·chart가 없다는 실패 후 교정. 연구 chart의 categories와 values는 기존 표의 셀 값과 직접 대조.
- `npm run verify`: **162 pass / 0 fail**, 3,300개 생성 파일의 바이트 재현성 확인. [최종 원문](remediation-c/verify-final.log). 초기 실패는 [verify.log](remediation-c/verify.log.gz)에 남겼다.
- 브라우저: configured `ttakkari_browser` MCP, 소유 핸들로 띄운 HTTP 4175. [기준 255뷰](remediation-c/sweep-before.json)는 85예시 × 320/390/1440px. 현재본 최종 스윕과 캡처는 아래 영수증을 따른다. 각 미리보기의 입력·출력 SHA는 [hashes.json](remediation-c/hashes.json)에 있다. baseline HTML은 고정 git revision에서 읽어 이후 site 재생성과 분리했다.
- 첫 현재본 스윕에서 795개 alignment 신호가 나왔으나, LTR의 computed `left`와 선언 `start`의 동치를 검사기가 빠뜨린 것이었다. 이를 제품 결함 수로 세거나 제품 CSS를 바꿔 맞추지 않았다. 최종 검사기는 정렬 실제값과 기대값을 함께 기록한다.
- 최종 브라우저 스윕은 **기준 255뷰 / 현재 255뷰**, 문서 가로 넘침·헤더 겹침·주 행 정렬·끝 열 도달·정량 정렬 실패 0이다. 255쌍의 원래 표 데이터 fingerprint 차이도 0이다. [현재 영수증](remediation-c/sweep-after.json), [대조](remediation-c/comparison.json). 이 수치는 구조 검사이며 모든 색·글줄·브랜드·미감을 측정한 것이 아니다.
- 로고 행, 강좌 단계, 여행 일정, 연구 그래프, 램프 사양, 은행 히어로의 390/1440px 동일 조건 전후 캡처 24장을 [captures.json](remediation-c/captures.json)에 연결했다. 현재 Run outbox에서 저장한 원본을 저장소에도 복사했다. 연구의 `.kit-section`이 2개라 첫 캡처 선택이 모호했던 것은 `.kit-section:has(.kit-prose)`로 좁혔으며 성공한 앞선 12장은 재촬영하지 않았다.

## 실측과 시각 검토

초기 동일 조건 측정에서 390px 블로그 헤더는 207px, 뷰티·와인 헤더는 213.25px였고 교정 후 세 예시 모두 125px였다. 로고·액션의 중심 차이는 0px였다. 신문·박물관은 큰 워드마크를 유지하며 같은 행으로 정리했다. 강좌 4단계는 1440px에서 1,016px 영역의 4열, 여행 3일은 696px 영역의 3열이다. 모바일은 순서대로 한 열이다. 수치는 이 예시와 해당 모드에 한하며 자동 지적 0을 미감 보증으로 해석하지 않는다.

## 남은 한계와 후속 순서

1. 실제 사진·도면·제품 자산 수입: 현재는 정적 일러스트이며 매물 평면도를 제공하지 않는다. 진짜 자산을 받을 때 출처·라이선스·alt와 비율을 함께 규약화한다.
2. 명시한 line 타임라인·짧은 독립 문서 폭: 콘텐츠를 억지로 늘리거나 사용자가 선택한 의미를 바꾸지 않았다. 장문·실제 서비스 데이터로 읽기 목적을 평가한다.
3. 게임·럭셔리 showcase의 큰 시각 비중, 기부 수치 반복, 일부 형제 제목 위계와 낮은 우선순위 관측은 R13 원문에 남는다. 한 번의 공통 수정으로 모두 해결했다고 주장하지 않는다.
4. 공식 규칙 대장의 applied/partial/missing은 조사 시점 스냅샷이다. 121개를 모두 채택하거나 각 외부 수치를 모두 준수했다고 표시하지 않는다.
5. iOS/Android 실기기·보조기기·모든 대체 서체의 미감은 미검증이다. 셸 Playwright runner의 이전 OS IPC 제한은 그 환경의 증거로만 유지하고 최신 커밋은 CI Chromium 결과로 별도 확인한다.
6. chart의 긴 범주 라벨은 기존 유한 축약을 유지한다. 연구 표의 네 범주와 숫자 원문은 SVG의 desc와 데이터 표에 남지만 시각 라벨은 일부 줄임표다. 가용 폭에 따른 전체/축약 라벨 전환은 후속 공통 규약 대상으로 남긴다.
