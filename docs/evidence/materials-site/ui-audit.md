# 사이트 UI 감사와 공용 컴포넌트 전환 (feat/materials-site)

감사 기준은 기준 커밋 `origin/feat/material-platform`(14914b80d)의 `apps/web/{app,features,shell}`이다. 개수는 `git grep`으로 센 줄 수라서 한 줄에 둘 이상 있으면 적게 나온다.

| 요소 | 전환 전 | 전환 후 |
|---|---|---|
| `<select>` | 22줄 | 12줄(전부 내부 QA 도구 `features/explore/qa/ComboExplorer.tsx`) |
| `<input>` | 11줄 | 4줄(QA 도구 2, 파일 선택 1, 라디오 1) |
| `<textarea>` | 4줄 | 1줄(QA 도구) |
| `<button>` | 53줄 | 7줄(QA 도구 5, 탭 1, 헤더 메뉴 토글 1) |

공용 컴포넌트는 `apps/web/ui/`에 있다: `Select`, `Input`, `Textarea`, `Checkbox`, `Button`, `ButtonLink`, `Chip`·`ChipGroup`, `Segmented`. 동작 시험은 `/dev/ui`(내부 화면)와 `e2e/ui-components.spec.mjs`다.

## 바꾼 곳

| 화면 | 전 | 후 |
|---|---|---|
| Explore 필터(`ExploreControls`) | select 4, 검색 input, 초기화 button | `Select` 4, `Input type=search`, `Button` |
| Explore 상세 | 폭 전환 button 2(`PreviewFrame`), 복사 button(`CopyJson`), `.btn` 링크 | `ChipGroup`·`Chip`, `Button`, `ButtonLink` |
| Components 상세 | 변형 button(`ComponentPreview`), 복사 button(`CopyBlock`) | `Chip`·`ChipGroup`, `Button` |
| 홈·404·Docs·Integrations | `.btn`·`.btn-quiet` 링크 | `ButtonLink` (`.btn` CSS 삭제) |
| Studio 디자인 탭 | select(테마·팔레트·스타일 축 14·구성 슬롯), 변형 chip, 모드 radio button | `Select`, `Chip`, `Segmented` |
| Studio 구조·내용 탭 | 글자 input, 숫자 input, 열거 select, 체크박스, JSON textarea, 부품 추가 select 2 | `Input`, `Select`, `Checkbox`, `Textarea` |
| Studio 대화상자 | JSON textarea, 체크박스 2, 템플릿 검색 input | `Textarea`, `Checkbox`, `Input` |
| Studio 도구 모음·미리보기·안내·시작 화면 | `.tool`·`.toolStrong`·`.seg`·`.link` button | `Button`(sm), `Chip` |

Studio의 선택 가능성 판정은 그대로다. 판정은 Core의 `edit.themeChoices` 등이 하고, `DesignPanel`의 `verdict()`가 그 결과(`ok`, `errors[0].code`, 메시지)를 `Select` 옵션의 `disabled`·`reasonCode`·`reason`으로 옮길 뿐이다. 구성 변형에서 "콘텐츠를 옮겨 적용"할 수 있는 항목은 이전처럼 비활성이 아니다.

## 남긴 곳과 이유

| 요소 | 이유 |
|---|---|
| `ComboExplorer`(`/dev/qa/combos`)의 select 12·input 2·textarea 1·button 5 | 공개 화면이 아닌 내부 QA 도구다. 필터 13개가 한 화면에 빽빽하고 기존 e2e가 네이티브 select 동작에 기대고 있다. 공개 화면과 달리 네이티브가 더 빠르다. 필요하면 후속으로 옮긴다. |
| 파일 선택 `input type=file`(JSON 가져오기) | 브라우저 파일 선택기가 유일한 올바른 UI다. |
| 템플릿 고르기 라디오 목록(`Dialogs`) | 80여 개를 검색해 하나 고르는 목록이라 `Select`가 아니다. 라디오는 네이티브 의미를 그대로 쓴다. 후속 후보: `RadioList` 부품. |
| Studio `role=tab` 탭(`EditPane`) | 탭 의미와 화살표 키 처리가 따로 구현·시험되어 있다. 공용 부품에 없는 패턴이다. |
| 구조 트리 행(`StructurePanel`) | 트리 패턴(`treeitem`)이다. |
| 헤더 메뉴 토글(`SiteHeader`) | 햄버거 아이콘과 초점 고리가 있는 셸 전용 부품이다. |

## 알려진 한계

- `Select`에는 검색 상자가 없다. Studio 팔레트 목록(400여 개)은 글자 입력(typeahead)과 묶음 제목으로 찾는다. 검색형 Select는 후속 후보다.
- 열린 목록의 항목은 마우스·터치로 누르거나 키보드로 고른다. 목록 안의 가상 스크롤은 없다.
