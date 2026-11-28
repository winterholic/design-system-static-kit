// 레이아웃 검사기 면제 목록. 임계값을 낮추는 대신 사유를 적은 예외만 둔다(reason 필수, 없으면 검사기가 던진다).
// 새 항목은 "고칠 수 없는 이유"를 적고, 가능하면 소유자와 해소 조건을 함께 적는다.
export const EXEMPTIONS = [
  {
    code: 'BAR_MISALIGNED_X', page: '/studio',
    reason: 'Studio는 편집 화면이라 본문이 뷰포트 전폭을 쓴다(상단 바만 1120px 컨테이너). 화면 소유는 features/studio 담당 작업이라 이 브랜치에서는 고치지 않는다. 바를 전폭으로 바꿀지는 Studio 쪽 결정.',
  },
  {
    code: 'CONTROL_WRAP', page: '/docs/layout.html', locator: 'nav.toc', width: 360,
    reason: '정적 문서의 목차 링크는 섹션 제목 전문(40자 안팎)이다. 360px에서 두 줄이 되는 것이 의도이고, 줄이 늘어도 어색하지 않게 알약(999px) 대신 둥근 사각형(16px)으로 바꿨다. 제목을 줄이면 문서 내용이 바뀐다.',
  },
  {
    code: 'BODY_ORPHAN', page: /\/docs\/(core\/tokens-themes|spacing\.html)/, width: 360,
    reason: 'text-wrap: pretty를 켜도 360px 좁은 칸의 긴 목록 항목(6줄 안팎) 끝줄에 4자 미만의 한 단어가 남는다. 칸 폭이 정한 줄바꿈이고 경고 수준이다. text-wrap: balance는 긴 단락을 모두 고르게 깎아 데스크톱 가독성을 해치므로 쓰지 않는다.',
  },
  {
    code: 'SMALL_TEXT', page: /\/materials\/typography/, locator: /typeRoleList|typeCorpus/,
    reason: 'Specimen 은 27개 역할을 Core 가 정한 실제 크기로 보여야 한다. label-sm·caption·overline·badge 의 크기가 11px(역할 목록·시험 문구 caption)이라 12px 규칙에 걸리지만, 크기를 키우면 역할 비교가 거짓이 된다. 각 역할 행에 px 크기를 적어 두었다.',
  },
];
