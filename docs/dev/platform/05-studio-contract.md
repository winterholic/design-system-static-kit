# Studio 구현 계약과 검증 연결

작성 2026-11-21. 이 문서는 [플랫폼 인터페이스 계약](./03-interfaces.md)의 `/studio` 경로와 구 저장 키 방침을 구체화한다. Core 편집 규약은 [ADR 0008](../../adr/0008-lossless-edit-ops.md), 검증 대상의 감사 ID는 [UX 감사](./01-ux-audit.md)를 따른다.

## URL

Studio 진입 경로는 `/studio`다. 화면 상태는 `tab=structure|design|check`, `pane=split|edit|preview`, `device=390|768|1280`로 표현한다. 기본값은 생략한다. 화면 이동은 화면 상태만 바꾸며 문서 상태는 바꾸지 않는다.

Explore가 Studio 시작 상태를 열 때 쓰는 쿼리는 다음과 같다.

| 키 | 예 | 의미 |
|---|---|---|
| `template` | `template=saas-landing` | 시작 템플릿 |
| `theme` | `theme=ledger` | 테마 |
| `variant` | `variant=compact-ops` | 테마 변형 |
| `palette` | `palette=blue-slate` | 팔레트 |
| `mode` | `mode=dark` | 문서 색 모드 |
| `layout` | `layout=hero:split,cards:outline` | 슬롯별 구성 변형 |

시작 쿼리는 한 번 소비한 뒤 URL에서 지운다. 수정되지 않은 저장 문서가 있으면 요청한 상태로 시작할 수 있다. 현재 문서가 수정된 상태면 덮어쓰기 확인을 먼저 받고, 취소하면 기존 문서를 유지한다. 잘못된 시작 인자는 적용하지 않고 경로와 해결 방법을 알린다.

## 상태와 편집

- **문서**는 Blueprint와 Core 검증 결과다. `src/edit`의 연산 성공 결과만 문서에 반영한다.
- **편집 세션**은 출처 템플릿, 직접 고른 스타일 축, 선택 경로, Undo/Redo, 수정 여부, 마지막 유효 미리보기와 진단을 가진다.
- **보기 상태**는 탭, 패널, 미리보기 기기·배율·색 보기, 대화상자를 가진다. 보기 전용 라이트·다크 전환은 문서와 내보내기 내용을 바꾸지 않는다.
- 실패한 연산은 문서와 선택을 그대로 두고 진단의 코드·문서 경로·도움말 및 해당 위치 이동을 제공한다.
- 테마와 구성 변형은 현재 문서에 적용한다. 문서 콘텐츠를 잃는 구성 변형은 거부하고, 이동 가능한 경우 사용자가 콘텐츠 이동을 선택할 수 있다.
- 문서 교체는 현재 수정된 내용이 있으면 확인을 받은 후 적용한다. 성공한 변경만 Undo/Redo에 기록한다.

## 저장, 복원과 내보내기

전용 저장 키 `winterholic-static-kit.studio.v1`은 `{schema: 1, savedAt, doc, origin, picked, selection, modified}`를 저장한다. 복원할 때 모양과 Core 유효성을 다시 확인한다. 손상·지원하지 않는 버전·유효하지 않은 문서는 덮어쓰지 않으며, 원본 JSON 내려받기와 사용자가 명시하는 초기화 경로를 보여 준다. 초기화 실패 시 손상 데이터를 그대로 보존하고 복구 차단을 유지한다.

레거시 `winterholic-static-kit.blueprint.v3`는 `{blueprint, sel}`에서 `blueprint`만 한 번 가져온다. `sel`은 출처 근거가 아니므로 버린다. 원래 키는 롤백을 위해 삭제하지 않는다.

JSON은 현재 문서 객체를 직렬화한다. HTML은 같은 문서를 Core 서비스로 컴파일한다. 어느 쪽도 미리보기의 표시 기기·배율·보기 전용 색 모드를 읽지 않는다. 미리보기 컴파일이 실패하면 마지막 유효 화면을 유지하고 오류를 보인다.

## 감사 항목과 시험

| UX 감사 ID | 보장 | 검증 위치 |
|---|---|---|
| WB-01, WB-05 | 문서와 출처·선택이 복원에서 어긋나지 않음; 가져온 문서는 출처를 임의 추정하지 않음 | `storage.unit.mjs`, `studio.spec.mjs` 저장·복원 시나리오 |
| WB-02 | 테마 변경 후 작성 콘텐츠 보존 | `model.unit.mjs`, `studio.spec.mjs` 테마·구성 시나리오 |
| WB-03 | 구성 변형은 템플릿 자식 트리 대신 현재 문서에 적용 | `studio.spec.mjs` 테마·구성 시나리오 |
| WB-04, WB-08 | 거부된 편집에서 문서·선택을 원자적으로 보존 | `model.unit.mjs` Core 실패 시나리오 |
| WB-06 | 보기 전용 색 모드와 문서 색 모드 분리; 내보내기는 문서 기준 | `model.unit.mjs`, `studio.spec.mjs` 색 모드·내보내기 시나리오 |
| WB-07 | 시작 쿼리 소비와 URL 화면 상태 계약 | `url.unit.mjs`, `studio.spec.mjs` URL 시작 시나리오 |
| 저장·복구 | 버전 저장, 레거시 읽기, 손상 값 원본 보존, 초기화 실패에서 복구 유지 | `storage.unit.mjs`, `studio.spec.mjs` 복구 시나리오 |
| 모바일·키보드 | 390px 패널 전환, 트리 방향키 조작, 가로 넘침 없음 | `studio.spec.mjs` 모바일 시나리오 |

단위 검사는 `node --experimental-strip-types --experimental-loader ./apps/web/features/studio/node-ts-loader.mjs --test apps/web/features/studio/*.unit.mjs`로 실행한다. Studio 브라우저 여정은 `WEB_PORT=4310 npm --workspace apps/web run test:e2e -- --grep studio`로 실행한다. 4310은 기존 웹 Playwright 설정에서 선택한 전용 포트다.
