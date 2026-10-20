/** 5차 확장 템플릿: 업종·화면 종류를 넓히는 25종. templates.mjs의 도우미를 그대로 받아 같은 규칙으로 검증된다. */
export function registerMore({add, A, head, prose, card, metric, grid, section, notice, feat, field, media, nav, chrome, FOOT}) {
  // ---------- landing ----------
  add('b2b-solution', '기업용 솔루션 소개', 'landing', 'enterprise', '모두웍스', [
    head('조직의 일하는 방식을 하나의 기준으로', '승인, 보안, 기록을 한곳에서 관리하는 업무 플랫폼.'),
    {type: 'hero', variant: 'split', eyebrow: '엔터프라이즈 에디션', title: '규모가 커져도\n기준은 하나로.', body: '부서마다 달랐던 승인 절차와 권한 규칙을 한 번에 정리합니다. 도입 4주 안에 첫 부서가 쓰기 시작합니다.', action: A('도입 상담', 'primary'), secondaryAction: A('보안 백서', 'secondary'), visual: 'chart'},
    {type: 'logo-cloud', title: '업종별 선도 기업이 사용합니다', names: ['한결물산', '대성정밀', '누리금융', '푸른병원', '새봄건설']},
    grid('three', metric('승인 소요 시간', '1.8일', '도입 전 5.2일', 'down', '-65%'), metric('권한 감사 준비', '2시간', '분기마다', 'down', '-90%'), metric('동시 사용자', '48,000명', '최대 규모 고객')),
    section('엔터프라이즈가 요구하는 것', [{type: 'feature-list', layout: 'grid', items: [feat('shield', '권한과 감사', '역할별 권한을 한 화면에서 보고, 변경 이력을 2년간 보관합니다.'), feat('lock', '데이터 주권', '국내 리전 저장과 고객 관리 키(CMK) 암호화를 지원합니다.'), feat('users', 'SSO와 계정 동기화', 'SAML, SCIM으로 조직도와 계정을 자동으로 맞춥니다.'), feat('clock', '99.95% 가용성', '서비스 수준 협약(SLA)과 장애 시 보상 기준을 계약에 명시합니다.')]}], {anchor: 'enterprise', description: '구매 심사에서 반복해서 나오는 네 가지 질문에 먼저 답했습니다.'}),
    section('도입은 이렇게 진행됩니다', [{type: 'steps', title: '4주 도입 일정', layout: 'horizontal', items: [{title: '1주 · 진단', description: '현재 승인 절차와 권한 구조를 함께 정리합니다.'}, {title: '2주 · 설정', description: 'SSO 연동과 역할 모델을 구성합니다.'}, {title: '3주 · 시범', description: '한 부서가 실제 업무로 먼저 사용합니다.'}, {title: '4주 · 확산', description: '교육 자료와 함께 전사로 넓힙니다.'}]}], {anchor: 'rollout', surface: 'tint'}),
    {type: 'quote', quote: '감사 때마다 엑셀로 권한을 모으던 일주일이 사라졌습니다. 이제는 화면 하나를 출력해 가져갑니다.', author: '박정민', role: '누리금융 정보보호팀장'},
    {type: 'cta', tone: 'brand', title: '우리 조직에 맞는 도입 계획을 받아 보세요', body: '영업일 기준 이틀 안에 담당자가 연락드립니다.', action: A('도입 상담', 'primary'), secondaryAction: A('요금 문의', 'ghost')},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['기능', 'sparkles', '#enterprise'], ['도입', 'calendar', '#rollout'], ['보안', 'shield'], ['고객사', 'building']), '도입 상담', '© 2026 모두웍스 · 정적 데모', FOOT)});

  add('devtool-landing', '개발자 도구 소개', 'landing', 'devtool', '빌드플로', [
    head('배포까지 걸리는 시간을 줄이는 빌드 도구', '캐시와 병렬 실행으로 CI를 4배 빠르게.'),
    {type: 'hero', variant: 'split', eyebrow: 'v3.2 · 원격 캐시 정식 출시', title: '푸시하고\n커피 한 잔.', body: '변경된 패키지만 다시 빌드하고, 나머지는 팀원이 이미 만든 결과를 가져옵니다.', action: A('무료로 시작', 'primary'), secondaryAction: A('문서 보기', 'secondary'), visual: 'device'},
    {type: 'code', label: '설치와 첫 빌드', language: 'bash', code: 'npm install -g @buildflow/cli\nbuildflow init\nbuildflow run build --cache=remote'},
    grid('three', metric('평균 빌드 시간', '2분 14초', '도입 전 9분 40초', 'down', '-77%'), metric('캐시 적중률', '91%', '최근 30일'), metric('팀', '3,200개', '활성 워크스페이스')),
    section('개발자가 쓰는 이유', [{type: 'bento', children: [card('변경분만 다시 빌드', '의존 그래프를 읽어 영향받는 패키지만 실행합니다. 설정 파일은 한 줄이면 됩니다.', {icon: 'zap'}), metric('병렬 작업', '16개', '코어에 맞춰 자동 분배'), card('로컬과 CI가 같은 결과', '같은 입력은 같은 출력을 냅니다. 내 컴퓨터에서 통과하면 CI에서도 통과해요.', {icon: 'check-circle'}), {type: 'chart', title: '빌드 시간 추이', caption: '최근 6주 평균', kind: 'line', unit: '분', categories: ['1주', '2주', '3주', '4주', '5주', '6주'], series: [{name: '평균 빌드', values: [9.6, 7.1, 4.8, 3.2, 2.5, 2.2]}]}, {type: 'quote', quote: '머지 대기 시간이 반으로 줄어서 리뷰 흐름이 끊기지 않습니다.', author: '윤서진', role: '플랫폼 엔지니어'}]}], {anchor: 'why'}),
    section('요금', [{type: 'pricing', children: [{type: 'plan', name: '개인', price: '0원', description: '사이드 프로젝트와 오픈소스.', features: ['원격 캐시 5GB', '팀원 1명', '커뮤니티 지원'], action: A('시작', 'secondary')}, {type: 'plan', name: '팀', price: '19달러', period: '사용자당 월', description: '캐시가 필요한 제품 팀.', features: ['원격 캐시 500GB', '무제한 팀원', '빌드 분석 대시보드', '이메일 지원'], action: A('팀으로 시작', 'primary'), featured: 'yes'}, {type: 'plan', name: '엔터프라이즈', price: '문의', description: '자체 호스팅과 SSO.', features: ['온프레미스 캐시', 'SSO · 감사 로그', '전담 엔지니어'], action: A('문의', 'secondary')}]}], {anchor: 'pricing'}),
    {type: 'faq', title: '자주 묻는 질문', items: [{question: '어떤 언어와 도구를 지원하나요?', answer: 'JavaScript, TypeScript, Go, Rust, Python 작업을 지원하며 명령어를 감싸는 방식이라 다른 빌드 도구와도 함께 씁니다.'}, {question: '캐시에 소스 코드가 올라가나요?', answer: '결과물의 해시와 빌드 산출물만 저장하며 소스 코드는 올리지 않습니다. 저장 데이터는 암호화됩니다.'}]},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['특징', 'zap', '#why'], ['요금', 'tag', '#pricing'], ['문서', 'book'], ['변경 기록', 'clock']), '시작하기', '© 2026 빌드플로 · 정적 데모', FOOT)});

  add('luxury-brand', '럭셔리 브랜드', 'landing', 'luxe', '메종 아르카', [
    head('시간이 만든 가죽, 손으로 이어 온 세 대', '1962년부터 이어 온 서울의 가죽 공방.'),
    {type: 'hero', variant: 'cover', eyebrow: 'Maison Arca · Seoul', title: '오래 쓸수록\n당신을 닮습니다.', body: '가죽 선별부터 마지막 바느질까지 모두 한 공방에서, 한 명의 장인이 맡습니다.', facts: [{value: '62년', label: '이어 온 공방'}, {value: '38시간', label: '가방 하나의 제작'}, {value: '평생', label: '수선 보증'}], action: A('컬렉션 보기', 'primary'), secondaryAction: A('공방 예약', 'ghost')},
    section('이번 시즌 컬렉션', [{type: 'gallery', layout: 'showcase', items: [{kind: 'photo', motif: 'bag', alt: '검은 가죽 토트백', caption: '아르카 토트 · 2,480,000원'}, {kind: 'photo', motif: 'watch', alt: '가죽 스트랩 시계', caption: '클래식 스트랩 · 420,000원'}, {kind: 'photo', motif: 'bottle', alt: '가죽 케이스 향수', caption: '레더 오 드 퍼퓸 · 360,000원'}, {kind: 'photo', motif: 'chair', alt: '가죽 라운지 체어', caption: '라운지 체어 · 5,800,000원'}]}], {anchor: 'collection'}),
    section('장인의 방식', [{type: 'split', children: [prose('가죽은 계절을 기다립니다', '이탈리아와 프랑스의 소규모 무두질 공방에서 한 해에 두 번만 가죽을 들여옵니다. 마음에 들지 않는 결은 쓰지 않기 때문에 한 장에서 나오는 가방은 많아야 세 개입니다.\n\n그렇게 고른 가죽을 사람의 손으로 재단하고, 사람의 손으로 꿰맵니다.'), {...media('photo', '4:3', '작업대 위에서 가죽을 재단하는 장인의 손'), motif: 'bag'}]}], {description: '빠르게 만드는 방법을 알지만 그렇게 하지 않습니다.'}),
    {type: 'quote', quote: '이십 년 전에 산 지갑이 지금은 제 손에 가장 잘 맞습니다.', author: '정서윤', role: '이십 년째 고객'},
    {type: 'cta', tone: 'inverse', title: '공방에서 직접 만나 보세요', body: '예약제로 운영합니다. 방문 한 시간 동안 장인이 함께합니다.', action: A('방문 예약', 'primary')},
  ], {axes: {shell: 'centered', width: 'wide'}, chrome: chrome(nav(['컬렉션', 'bag', '#collection'], ['공방', 'sparkles'], ['수선', 'refresh'], ['매장', 'map-pin']), '방문 예약', '© 2026 메종 아르카 · 정적 데모', ['이용약관', '개인정보', '고객센터'])});

  add('campaign-poster', '캠페인 포스터형 소개', 'landing', 'colorblock', '도시 텃밭 위크', [
    head('우리 동네에 작은 밭을', '11월 한 달, 서울 열두 곳에서 열리는 도시 텃밭 위크.'),
    {type: 'hero', variant: 'statement', eyebrow: '11.1 — 11.30', title: '흙 한 줌에서\n시작하는 동네.', body: '옥상, 골목, 공원 한 켠에서 이웃과 함께 상추를 심습니다. 호미와 씨앗은 저희가 준비할게요.', facts: [{value: '12곳', label: '참여 장소'}, {value: '800명', label: '참여 이웃'}, {value: '0원', label: '참가비'}], action: A('참여 신청', 'primary'), secondaryAction: A('장소 보기', 'secondary')},
    section('이렇게 진행해요', [{type: 'bento', children: [card('주말 오전 두 시간', '토요일 오전 10시에 모여 함께 심고 가꿉니다.', {icon: 'calendar'}), metric('심을 모종', '4,200포기', '상추·쑥갓·방울토마토'), card('도구와 씨앗은 무료', '호미, 장갑, 모종, 물뿌리개를 현장에서 빌려 드려요.', {icon: 'leaf'}), {type: 'progress', label: '참가 신청 현황', value: 72, detail: '800명 중 576명 신청', tone: 'success'}, {type: 'quote', quote: '옥상이 이렇게 조용하고 푸를 줄 몰랐어요.', author: '한유진', role: '지난해 참가자'}]}], {anchor: 'how'}),
    section('참여 장소', [{type: 'table', title: '권역별 모임 장소', caption: '참여 장소와 일정', columns: ['권역', '장소', '모임 시간'], rows: [['성동', '성수 옥상정원', '토 10:00'], ['마포', '연남 골목 텃밭', '토 10:30'], ['관악', '봉천 어린이공원', '일 10:00'], ['은평', '불광천 쉼터', '일 14:00']], state: 'ready', variant: 'striped'}], {anchor: 'places'}),
    {type: 'cta', tone: 'brand', title: '이번 주말, 이웃과 흙을 만져요', action: A('참여 신청', 'primary')},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['방식', 'leaf', '#how'], ['장소', 'map-pin', '#places'], ['문의', 'mail']), '참여 신청', '© 2026 도시 텃밭 위크 · 비영리', FOOT)});

  add('wedding-invite', '청첩장', 'landing', 'wedding', '민준 · 서연', [
    head('민준과 서연이 결혼합니다', '2026년 11월 21일 토요일 오후 2시'),
    {type: 'hero', variant: 'centered', eyebrow: 'WEDDING INVITATION', title: '서로의 계절이 되어\n함께 걷겠습니다.', body: '소중한 분들을 초대합니다. 따뜻한 마음으로 함께해 주세요.', facts: [{value: '11.21', label: '토요일'}, {value: '오후 2시', label: '예식 시작'}, {value: '성수', label: '아틀리에홀'}], action: A('참석 알리기', 'primary'), secondaryAction: A('오시는 길', 'ghost')},
    section('두 사람의 이야기', [{type: 'prose', title: '처음 만난 날', body: '도서관 책상에서 같은 책을 빌리려다 만났습니다. 책은 서연이 먼저 가져갔고, 민준은 반납일을 기다렸습니다. 그 기다림이 길어져 오늘에 이르렀습니다.\n\n앞으로의 시간도 서로의 속도에 맞춰 천천히 걸어가겠습니다.', variant: 'lead'}], {anchor: 'story'}),
    section('사진', [{type: 'gallery', layout: 'masonry', items: [{kind: 'photo', motif: 'coffee', alt: '카페에 마주 앉은 두 사람', caption: '첫 데이트'}, {kind: 'photo', motif: 'plant', alt: '꽃 앞에서 웃는 두 사람', caption: '봄 소풍'}, {kind: 'photo', motif: 'interior', alt: '새집 거실에서', caption: '새 집'}, {kind: 'photo', motif: 'books', alt: '책장 앞에서', caption: '도서관 앞에서'}]}]),
    section('예식 안내', [{type: 'timeline', title: '당일 순서', variant: 'rail', items: [{time: '13:00', title: '손님 맞이', description: '1층 로비에서 식권과 기념품을 받아 가세요.'}, {time: '14:00', title: '예식', description: '약 30분간 진행됩니다.'}, {time: '14:40', title: '사진 촬영', description: '가족과 친구 순서로 촬영합니다.'}, {time: '15:30', title: '피로연', description: '2층 식당에서 식사를 준비했습니다.'}]}], {anchor: 'schedule'}),
    section('오시는 길', [{type: 'properties', title: '아틀리에홀', layout: 'inline', items: [{label: '주소', value: '서울 성동구 아차산로 12, 3층'}, {label: '지하철', value: '2호선 성수역 3번 출구 도보 5분'}, {label: '주차', value: '건물 지하 주차장 2시간 무료'}, {label: '연락', value: '신랑 010-0000-0000 · 신부 010-0000-0001'}]}], {anchor: 'place'}),
    {type: 'form', title: '참석 여부를 알려 주세요', intro: '준비에 도움이 됩니다. 데모이므로 입력은 저장되지 않습니다.', fields: [field('guest-name', '성함', 'text'), field('attend', '참석', 'radio', {options: ['참석합니다', '아쉽게 참석하지 못합니다']}), field('guests', '동행 인원', 'number', {requirement: 'optional'})], submitLabel: '보내기'},
  ], {axes: {shell: 'centered', width: 'narrow'}, chrome: chrome(nav(['이야기', 'heart', '#story'], ['순서', 'clock', '#schedule'], ['오시는 길', 'map-pin', '#place']), null, '민준 · 서연 · 정적 데모', null)});

  add('kids-class', '어린이 클래스', 'landing', 'kids', '꼬마 작업실', [
    head('만들고 그리고 뛰노는 토요일', '5~9세 어린이를 위한 주말 창작 클래스.'),
    {type: 'hero', variant: 'split', eyebrow: '가을 학기 모집 중', title: '오늘은 무엇을\n만들어 볼까?', body: '선생님 한 명이 아이 네 명을 맡아 천천히 함께합니다. 결과보다 만드는 시간이 먼저인 클래스예요.', action: A('체험 수업 신청', 'primary'), secondaryAction: A('수업 보기', 'secondary'), visual: 'photo', motif: 'poster'},
    grid('three', metric('아이 네 명당', '선생님 1명'), metric('한 번에', '90분'), metric('작품 전시', '매 학기 1회')),
    section('이번 학기 수업', [{type: 'grid', columns: 'three', children: [card('색깔 놀이터', '물감을 섞고 번지는 색을 보며 마음껏 그려요.', {variant: 'media', visual: 'photo', motif: 'swatches', ratio: '4:3', meta: '토 10:00 · 5~7세', badge: '인기'}), card('종이 건축가', '종이 상자로 집과 도시를 만들어요.', {variant: 'media', visual: 'photo', motif: 'building', ratio: '4:3', meta: '토 13:00 · 6~9세'}), card('흙으로 빚기', '점토로 그릇과 동물을 빚습니다.', {variant: 'media', visual: 'photo', motif: 'vase', ratio: '4:3', meta: '일 10:00 · 5~9세'})]}], {anchor: 'class'}),
    section('수업은 이렇게 흘러가요', [{type: 'steps', title: '90분의 흐름', layout: 'horizontal', items: [{title: '인사와 몸 풀기', description: '노래를 부르며 긴장을 풀어요.'}, {title: '함께 만들기', description: '오늘의 재료를 만져 보고 자유롭게 만들어요.'}, {title: '이야기 나누기', description: '내가 만든 것을 친구들에게 소개해요.'}]}], {surface: 'tint'}),
    {type: 'faq', title: '부모님이 자주 묻는 질문', items: [{question: '처음이라 낯을 가려요.', answer: '체험 수업은 부모님이 함께 들어오실 수 있고, 아이가 편해질 때까지 선생님이 옆에서 천천히 맞춥니다.'}, {question: '준비물이 있나요?', answer: '앞치마만 챙겨 오세요. 재료와 도구는 모두 준비되어 있어요.'}]},
    {type: 'cta', tone: 'brand', title: '이번 토요일, 체험 수업에서 만나요', action: A('체험 수업 신청', 'primary')},
  ], {chrome: chrome(nav(['수업', 'sparkles', '#class'], ['후기', 'star'], ['위치', 'map-pin']), '체험 신청', '© 2026 꼬마 작업실 · 정적 데모', FOOT)});

  add('bank-product', '금융 상품 안내', 'landing', 'bank', '새봄은행', [
    head('목돈을 천천히 키우는 정기예금', '가입 6개월 후 중도 해지해도 약정 이자의 80%를 드립니다.'),
    {type: 'hero', variant: 'split', eyebrow: '새봄 정기예금', title: '연 3.65%,\n약속한 이자를 그대로.', body: '12개월 만기, 최소 100만 원부터. 만기 전 알림 문자를 보내 드려 갱신 시점을 놓치지 않게 해요.', action: A('모바일로 가입', 'primary'), secondaryAction: A('이자 계산', 'secondary'), visual: 'chart'},
    grid('three', metric('기본 금리', '연 3.65%', '12개월 만기 · 세전'), metric('최소 가입 금액', '100만 원', '1원 단위로 추가 입금 불가'), metric('중도 해지 이자', '약정의 80%', '6개월 이상 유지 시')),
    section('이자 미리 보기', [{type: 'chart', title: '1,000만 원을 12개월 맡기면', caption: '월별 누적 이자(세전)', kind: 'area', unit: '원', categories: ['2개월', '4개월', '6개월', '8개월', '10개월', '12개월'], series: [{name: '누적 이자', values: [60800, 121700, 182500, 243300, 304200, 365000]}]}], {anchor: 'interest'}),
    section('가입 방법', [{type: 'steps', title: '세 단계로 가입', layout: 'horizontal', items: [{title: '본인 인증', description: '휴대폰 인증과 신분증 촬영이면 충분합니다.'}, {title: '금액과 만기 선택', description: '넣을 금액과 만기 방식을 고릅니다.'}, {title: '가입 완료', description: '약관을 확인하고 계약서를 받아 보세요.'}]}], {anchor: 'join'}),
    {type: 'faq', title: '가입 전에 확인하세요', items: [{question: '예금자 보호가 되나요?', answer: '예금자보호법에 따라 1인당 원금과 이자를 합쳐 최대 5천만 원까지 보호됩니다.'}, {question: '만기가 되면 어떻게 되나요?', answer: '만기일에 원금과 이자가 입출금 통장으로 자동 입금됩니다. 자동 재예치를 선택할 수도 있어요.'}]},
    {type: 'prose', title: '유의 사항', variant: 'legal', body: '이 상품은 예금자보호법에 따라 보호되며, 보호 한도는 1인당 5천만 원입니다. 금리는 가입 시점의 고시 금리가 적용되고 세전 기준입니다. 가입 전 상품설명서와 약관을 반드시 읽어 보시기 바랍니다.'},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['이자', 'chart', '#interest'], ['가입 방법', 'check-circle', '#join'], ['금리 안내', 'info'], ['고객센터', 'phone']), '모바일 가입', '© 2026 새봄은행 · 정적 데모', ['이용약관', '개인정보', '금리 고시', '고객센터'])});

  add('game-launch', '게임 출시 안내', 'landing', 'game', '노바 프론티어', [
    head('별 사이의 길을 여는 탐사 액션', '2026년 12월 5일 PC · 콘솔 동시 출시.'),
    {type: 'hero', variant: 'cover', eyebrow: 'LAUNCH 12.05', title: '미지의 항로,\n지금 열립니다.', body: '혼자서도, 세 명이 함께서도 즐기는 우주 탐사 액션. 얼리 액세스 참가자에게는 개발 일지를 먼저 공개합니다.', facts: [{value: '12.05', label: '출시일'}, {value: '1~3인', label: '협동 플레이'}, {value: '40시간', label: '메인 스토리'}], action: A('사전 예약', 'primary'), secondaryAction: A('트레일러', 'ghost')},
    section('게임 속으로', [{type: 'gallery', layout: 'showcase', items: [{kind: 'video', alt: '출시 트레일러', caption: '출시 트레일러 · 2분 10초'}, {kind: 'device', alt: '전투 화면', caption: '전술 전투'}, {kind: 'photo', motif: 'laptop', alt: '함선 관리 화면', caption: '함선 개조'}, {kind: 'pattern', alt: '성운 배경', caption: '탐사 지도'}]}], {anchor: 'media'}),
    section('출시 로드맵', [{type: 'timeline', title: '출시까지', variant: 'line', items: [{time: '10월', title: '클로즈드 테스트', description: '선착순 5,000명이 먼저 플레이합니다.', status: '완료'}, {time: '11월', title: '오픈 테스트', description: '전 지역 3일간 열립니다.', status: '진행'}, {time: '12월 5일', title: '정식 출시', description: '스토어와 콘솔에서 동시에 열립니다.'}]}], {anchor: 'roadmap'}),
    section('에디션', [{type: 'pricing', children: [{type: 'plan', name: '스탠더드', price: '39,000원', description: '게임 본편.', features: ['본편 게임', '디지털 사운드트랙', '프로필 장식'], action: A('사전 예약', 'secondary')}, {type: 'plan', name: '디럭스', price: '52,000원', description: '추가 콘텐츠 포함.', features: ['본편 게임', '확장팩 1종', '함선 스킨 3종', '개발 일지 열람'], action: A('사전 예약', 'primary'), featured: 'yes'}]}], {anchor: 'edition'}),
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['영상', 'play', '#media'], ['로드맵', 'clock', '#roadmap'], ['에디션', 'tag', '#edition'], ['커뮤니티', 'users']), '사전 예약', '© 2026 노바 프론티어 · 정적 데모', FOOT)});

  // ---------- dashboard / data ----------
  add('sales-dashboard', '영업 현황 대시보드', 'dashboard', 'enterprise', '모두웍스', [
    head('4분기 영업 현황', '10월 20일 기준 · 전 지역', {actions: [A('리포트 내보내기', 'secondary'), A('목표 수정', 'ghost')]}),
    grid('four', metric('누적 매출', '48.2억', '목표 대비 82%', 'up', '+6.1%'), metric('신규 계약', '37건', '지난달 대비', 'up', '+9건'), metric('평균 계약 금액', '1.3억', '지난 분기 1.1억', 'up', '+18%'), metric('이탈 위험 고객', '5곳', '재계약 60일 전', 'down', '-2곳')),
    grid('two', {type: 'chart', title: '월별 매출', caption: '최근 6개월 매출(억 원)', kind: 'bar', unit: '억', categories: ['5월', '6월', '7월', '8월', '9월', '10월'], series: [{name: '매출', values: [6.8, 7.4, 8.1, 7.7, 9.2, 9.6]}]}, {type: 'chart', title: '지역별 비중', caption: '누적 매출 기준', kind: 'donut', unit: '%', categories: ['수도권', '영남', '호남', '충청', '기타'], series: [{name: '비중', values: [46, 22, 12, 14, 6]}]}),
    {type: 'progress', label: '분기 목표 달성률', value: 82, detail: '59억 중 48.2억', tone: 'brand'},
    {type: 'table', title: '진행 중인 큰 계약', caption: '예상 금액 상위 5건', columns: ['고객', '단계', '예상 금액', '담당', '마감'], rows: [['한결물산', '최종 협상', '4.2억', '김다선', '10/28'], ['대성정밀', '제안 발표', '3.1억', '이지훈', '11/04'], ['누리금융', '보안 심사', '2.8억', '박서연', '11/12'], ['푸른병원', '견적 검토', '1.9억', '최민준', '11/15'], ['새봄건설', '초기 상담', '1.4억', '정하늘', '11/30']], state: 'ready', variant: 'striped'},
  ], {chrome: chrome(nav(['개요', 'home'], ['고객', 'users'], ['계약', 'file'], ['리포트', 'chart'], ['설정', 'settings']), null, '모두웍스 · 정적 데모', null)});

  add('finance-overview', '재무 현황', 'dashboard', 'bank', '새봄은행', [
    head('내 자산 한눈에', '총자산과 이번 달 움직임을 정리했습니다.', {actions: [A('이체하기', 'primary'), A('내역 내려받기', 'ghost')]}),
    grid('three', metric('총자산', '38,420,000원', '지난달 대비', 'up', '+2.4%'), metric('이번 달 지출', '1,284,000원', '예산의 72%', 'down', '-8%'), metric('이번 달 저축', '700,000원', '목표 100%', 'up', '+0원')),
    {type: 'aside', side: 'end', label: '이번 달 예산', size: 'narrow', children: [
      {type: 'chart', title: '월별 지출', caption: '최근 6개월 지출(만 원)', kind: 'line', unit: '만원', categories: ['5월', '6월', '7월', '8월', '9월', '10월'], series: [{name: '지출', values: [142, 128, 165, 134, 139, 128]}]},
      {type: 'list', title: '예산 현황', variant: 'plain', items: [{title: '식비', description: '48만 원 중 36만 원 사용', status: '진행'}, {title: '교통', description: '15만 원 중 9만 원 사용', status: '진행'}, {title: '문화·여가', description: '20만 원 중 21만 원 사용', status: '보류'}], state: 'ready'}]},
    {type: 'table', title: '최근 거래', caption: '최근 5건의 거래 내역', columns: ['날짜', '내용', '분류', '금액'], rows: [['10/19', '성수 카페 로스터리', '식비', '-6,800원'], ['10/18', '지하철 정기권', '교통', '-55,000원'], ['10/17', '월급', '수입', '+3,200,000원'], ['10/16', '영화 예매', '문화', '-28,000원'], ['10/15', '관리비', '주거', '-142,000원']], state: 'ready'},
  ], {chrome: chrome(nav(['자산', 'dollar'], ['거래', 'list'], ['예산', 'chart'], ['설정', 'settings']), null, '새봄은행 · 정적 데모', null)});

  add('hr-people', '인사 현황', 'dashboard', 'enterprise', '모두웍스', [
    head('채용과 인원 현황', '2026년 4분기 · 전사', {actions: [A('공고 등록', 'primary'), A('보고서', 'secondary')]}),
    grid('four', metric('재직 인원', '412명', '지난 분기 대비', 'up', '+18명'), metric('열린 공고', '14개', '개발 6 · 디자인 3 · 운영 5'), metric('평균 채용 기간', '31일', '목표 35일', 'down', '-4일'), metric('입사 90일 유지율', '94%', '지난 분기 91%', 'up', '+3%p')),
    {type: 'chart', title: '직군별 인원', caption: '직군별 재직 인원(명)', kind: 'bars-h', unit: '명', categories: ['개발', '운영', '영업', '디자인', '경영지원'], series: [{name: '인원', values: [148, 96, 72, 44, 52]}]},
    {type: 'kanban', children: [
      {type: 'lane', title: '서류 검토', children: [{type: 'task', title: '백엔드 엔지니어 · 지원 24명', label: '개발', assignee: '이지훈', priority: '높음'}, {type: 'task', title: '프로덕트 디자이너 · 지원 11명', label: '디자인', assignee: '김다선', priority: '보통'}]},
      {type: 'lane', title: '면접', children: [{type: 'task', title: '데이터 분석가 · 최종 면접', label: '운영', assignee: '박서연', priority: '높음'}, {type: 'task', title: '고객 성공 매니저 · 1차', label: '운영', assignee: '정하늘', priority: '보통'}]},
      {type: 'lane', title: '처우 협의', children: [{type: 'task', title: '프런트엔드 엔지니어 · 오퍼 전달', label: '개발', assignee: '최민준', priority: '높음'}]},
      {type: 'lane', title: '입사 확정', children: [{type: 'task', title: '인프라 엔지니어 · 11/4 입사', label: '개발', assignee: '이지훈'}, {type: 'task', title: '마케터 · 11/11 입사', label: '운영', assignee: '박서연'}]},
    ]},
  ], {chrome: chrome(nav(['현황', 'home'], ['채용', 'users'], ['구성원', 'user'], ['설정', 'settings']), null, '모두웍스 · 정적 데모', null)});

  add('support-queue', '고객 문의 대기열', 'community', 'hub', '허브', [
    head('문의 대기열', '답변 대기 5건 · 평균 응답 18분'),
    {type: 'filter-bar', placeholder: '문의 검색', filters: ['전체', '내 담당', '긴급', '해결됨'], selected: 1},
    {type: 'master-detail', title: '문의 목록', items: [{title: '결제가 두 번 됐어요', meta: '정민 · 8분 전 · 긴급', preview: '어제 저녁 결제가 두 건 승인됐습니다. 한 건을 취소하고 싶어요.', state: 'unread'}, {title: '비밀번호 재설정 메일이 오지 않아요', meta: '현우 · 25분 전', preview: '스팸함까지 확인했는데 메일이 없습니다.', state: 'unread'}, {title: '세금계산서 발행 문의', meta: '지윤 · 1시간 전', preview: '10월 이용분 세금계산서를 사업자 정보로 받고 싶어요.'}, {title: '팀원 초대 한도', meta: '도윤 · 2시간 전', preview: '스타터에서 팀원을 더 초대하려면 어떻게 하나요?'}, {title: '다크 모드 지원 계획', meta: '서아 · 어제', preview: '야간에 보기가 힘들어요. 다크 모드 계획이 있을까요?'}], selected: 0, detail: {title: '결제가 두 번 됐어요', meta: '정민 · 8분 전 · 긴급', body: '어제 저녁 8시쯤 결제를 했는데 같은 금액이 두 건 승인되었습니다. 한 건을 취소하고 싶어요.\n\n주문번호는 A-10231이고 카드는 신한카드입니다.\n\n[처리 메모] 중복 승인 확인 후 한 건 취소 요청 예정.'}},
  ], {chrome: chrome(nav(['대기열', 'message'], ['보고서', 'chart'], ['고객', 'users'], ['설정', 'settings']), null, '허브 · 정적 데모', null)});

  add('incident-report', '장애 회고', 'docs', 'console', '콘솔', [
    head('10월 14일 결제 지연 장애 회고', '영향 47분 · 결제 성공률 최저 62% · 재발 방지 항목 4건', {eyebrow: '사후 분석', meta: ['심각도 2', '작성 10/16', '비난 없는 회고']}),
    grid('three', metric('영향 시간', '47분', '14:12 ~ 14:59'), metric('최저 결제 성공률', '62%', '평소 99.2%', 'down', '-37%p'), metric('영향 받은 주문', '1,284건', '전체의 3.1%')),
    {type: 'timeline', title: '타임라인', variant: 'log', items: [{time: '14:12', title: '결제 지연 알림 발생', description: '결제 승인 응답 시간이 평소의 6배로 증가'}, {time: '14:19', title: '대응 시작', description: '온콜 엔지니어가 결제 서비스 로그를 확인'}, {time: '14:31', title: '원인 후보 확인', description: '카드사 연동 커넥션 풀 고갈 확인'}, {time: '14:44', title: '풀 크기 상향 배포', description: '임시 조치로 커넥션 수를 2배로 늘림'}, {time: '14:59', title: '정상화', description: '성공률 99%대로 복귀', status: '완료'}]},
    {type: 'properties', title: '핵심 요약', layout: 'stacked', items: [{label: '근본 원인', value: '카드사 응답 지연 시 커넥션이 반환되지 않는 재시도 로직'}, {label: '탐지', value: '알림 7분 후 사람이 확인(목표 5분)'}, {label: '고객 안내', value: '상태 페이지 14:25 게시'}]},
    {type: 'list', title: '재발 방지 항목', variant: 'check', items: [{title: '재시도 시 커넥션 반환 보장', description: '결제팀 · 10/25까지', status: '진행'}, {title: '커넥션 풀 포화 알림 추가', description: '플랫폼팀 · 10/22까지', status: '대기'}, {title: '카드사 장애 시 대체 승인 경로 검토', description: '결제팀 · 11/15까지', status: '대기'}, {title: '상태 페이지 게시 자동화', description: '운영팀 · 완료', status: '완료'}], state: 'ready'},
  ], {chrome: chrome(nav(['개요', 'home'], ['장애 기록', 'alert-triangle'], ['런북', 'book'], ['설정', 'settings']), null, '콘솔 · 정적 데모', null)});

  // ---------- listing / commerce ----------
  add('job-board', '채용 공고 목록', 'listing', 'enterprise', '모두웍스', [
    head('함께할 사람을 찾습니다', '열린 공고 14개', {actions: [A('인재 풀 등록', 'secondary')]}),
    {type: 'filter-bar', placeholder: '직무 또는 키워드', filters: ['전체', '개발', '디자인', '운영', '영업'], selected: 0},
    {type: 'list', title: '열린 공고', variant: 'divided', items: [{title: '백엔드 엔지니어', description: '결제 플랫폼 · 서울 · 경력 3년 이상', status: '진행', meta: '마감 11/10'}, {title: '프로덕트 디자이너', description: '디자인 시스템 · 서울/원격 · 경력 무관', status: '진행', meta: '상시'}, {title: '고객 성공 매니저', description: '엔터프라이즈 · 서울 · 경력 2년 이상', status: '진행', meta: '마감 11/05'}, {title: '데이터 분석가', description: '성장 분석 · 서울 · 경력 2년 이상', status: '진행', meta: '마감 11/20'}, {title: '인프라 엔지니어', description: '플랫폼 · 원격 · 경력 4년 이상', status: '대기', meta: '곧 마감'}], state: 'ready'},
    {type: 'tags', title: '인기 키워드', items: ['원격 가능', '신입 가능', '스톡옵션', '유연 근무', '해외 컨퍼런스'], variant: 'chips'},
    {type: 'pagination', pages: 3, current: 1},
  ], {chrome: chrome(nav(['공고', 'list'], ['팀 소개', 'users'], ['복지', 'heart'], ['채용 과정', 'check-circle']), '인재 풀 등록', '© 2026 모두웍스 · 정적 데모', FOOT)});

  add('job-detail', '채용 상세', 'docs', 'enterprise', '모두웍스', [
    head('프로덕트 디자이너', '디자인 시스템 팀 · 서울 / 원격 · 정규직', {eyebrow: '채용 중', meta: ['경력 무관', '상시 채용', '지원 128명'], actions: [A('지원하기', 'primary'), A('링크 복사', 'ghost')]}),
    {type: 'aside', side: 'end', label: '공고 정보', sticky: 'yes', children: [
      section('공고 내용', [
      section('하는 일', [prose('이런 일을 맡아요', '디자인 시스템을 사용하는 열두 개 제품 팀과 함께 부품과 규칙을 설계합니다.\n\n새 부품을 추가하기 전에 쓰임을 함께 정의하고, 만든 부품이 실제 화면에서 어떻게 쓰이는지 지켜봅니다.'), {type: 'list', title: '구체적으로는', variant: 'check', items: [{title: '컴포넌트와 토큰 설계', description: '쓰임, 상태, 접근성 기준 정리'}, {title: '제품 팀 지원', description: '화면 리뷰와 규칙 개정 논의'}, {title: '문서화', description: '쓰는 방법과 쓰지 않는 경우를 함께 기록'}], state: 'ready'}]),
      section('함께하면 좋은 분', [{type: 'list', title: '자격 요건', variant: 'plain', items: [{title: '웹 제품 디자인 경험'}, {title: 'Figma와 코드를 오가며 협업한 경험'}, {title: '접근성 기준에 대한 이해'}], state: 'ready'}]),
      section('채용 과정', [{type: 'steps', title: '네 번의 만남', items: [{title: '서류 검토', description: '영업일 5일 안에 결과를 알려 드려요.'}, {title: '과제 이야기', description: '60분, 경험한 작업을 함께 이야기합니다.'}, {title: '팀 면접', description: '함께 일할 동료 세 명과 만납니다.'}, {title: '처우 협의', description: '조건을 투명하게 공유합니다.'}]}]),
      ]),
      {type: 'properties', title: '공고 정보', layout: 'stacked', items: [{label: '근무지', value: '서울 성동구 · 주 2일 원격'}, {label: '고용 형태', value: '정규직 · 수습 3개월'}, {label: '마감', value: '채용 시까지'}]}]},
    {type: 'cta', tone: 'brand', title: '이 자리가 마음에 드시나요?', body: '이력서 없이 포트폴리오 링크만으로도 지원할 수 있어요.', action: A('지원하기', 'primary')},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['공고', 'list'], ['팀 소개', 'users'], ['복지', 'heart']), '지원하기', '© 2026 모두웍스 · 정적 데모', FOOT)});

  add('recipe-detail', '레시피', 'article', 'garden', '초록식탁', [
    head('들기름 막국수', '차갑고 고소한 15분 한 그릇', {eyebrow: '여름 면 요리', meta: ['2인분', '15분', '난이도 쉬움']}),
    {...media('photo', '16:9', '들기름과 김가루를 얹은 막국수 한 그릇', '들기름과 김가루를 얹은 막국수'), motif: 'noodles'},
    prose('이 요리에 대하여', '더운 날 입맛이 없을 때 가장 자주 만드는 면 요리입니다. 불 앞에 서 있는 시간이 10분도 되지 않고, 재료도 대부분 집에 있어요.'),
    {type: 'properties', title: '한눈에 보기', layout: 'inline', items: [{label: '준비 시간', value: '5분'}, {label: '조리 시간', value: '10분'}, {label: '분량', value: '2인분'}]},
    {type: 'list', title: '재료', variant: 'check', items: [{title: '메밀면 200g', description: '생면이면 더 좋아요'}, {title: '들기름 3큰술'}, {title: '진간장 2큰술', description: '입맛에 따라 조절'}, {title: '구운 김 2장'}, {title: '깨소금 1큰술'}], state: 'ready'},
    {type: 'steps', title: '만드는 순서', items: [{title: '면 삶기', description: '끓는 물에 면을 넣고 포장지 시간보다 30초 덜 삶습니다.'}, {title: '찬물에 헹구기', description: '찬물에 비벼 씻어 전분기를 빼고 물기를 꼭 짭니다.'}, {title: '양념 섞기', description: '들기름과 간장을 섞어 면에 먼저 버무립니다.'}, {title: '올려 내기', description: '구운 김을 부숴 올리고 깨소금을 뿌립니다.'}]},
    {type: 'notice', tone: 'info', title: '요리 팁', body: '들기름은 열에 약해 향이 날아갑니다. 불을 끈 뒤 맨 마지막에 둘러 주세요.'},
    {type: 'tags', title: '함께 보면 좋은 주제', items: ['여름 면', '15분 요리', '채식 가능', '비빔'], variant: 'badges'},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['레시피', 'book'], ['재료 가이드', 'leaf'], ['주방 도구', 'utensils']), null, '© 2026 초록식탁 · 정적 데모', ['이용약관', '개인정보', '문의'])});

  add('garden-shop', '식물 가게 상품 목록', 'commerce', 'garden', '초록방', [
    head('작은 식물 컬렉션', '이번 주 입고 18종 · 3만 원 이상 무료 배송', {actions: [A('정렬: 신상품순', 'secondary')]}),
    {type: 'filter-bar', placeholder: '식물 이름 검색', filters: ['전체', '초보 추천', '반려동물 안전', '그늘 가능', '공기정화'], selected: 1},
    {type: 'grid', columns: 'three', children: [
      card('몬스테라 델리시오사', '잎이 시원하게 갈라지는 큰 잎 식물', {variant: 'media', visual: 'photo', motif: 'plant', ratio: '1:1', badge: '베스트', meta: '중형 · 햇빛 반그늘', price: '28,000원', rating: '4.9', reviews: '842'}),
      card('스투키 미니', '물을 한 달에 한 번만 줘도 되는 식물', {variant: 'media', visual: 'photo', motif: 'plant', ratio: '1:1', meta: '소형 · 밝은 그늘', price: '12,000원', rating: '4.8', reviews: '1,203'}),
      card('유칼립투스 화분', '잎을 만지면 향이 퍼지는 허브', {variant: 'media', visual: 'photo', motif: 'jar', ratio: '1:1', badge: '신상', meta: '소형 · 햇빛 필요', price: '16,500원', listPrice: '19,000원', rating: '4.6', reviews: '96'}),
      card('테이블야자', '반려동물에게도 안전한 잎', {variant: 'media', visual: 'photo', motif: 'vase', ratio: '1:1', meta: '중형 · 그늘 가능', price: '22,000원', rating: '4.7', reviews: '318'}),
      card('토분 세트(3개)', '배수가 잘 되는 수제 토분', {variant: 'media', visual: 'photo', motif: 'mug', ratio: '1:1', meta: '지름 10·13·16cm', price: '24,000원', rating: '4.8', reviews: '470'}),
      card('식물 영양제', '분갈이 후 한 달에 한 번', {variant: 'media', visual: 'photo', motif: 'bottle', ratio: '1:1', meta: '250ml', price: '8,500원', rating: '4.5', reviews: '201'})]},
    {type: 'pagination', pages: 3, current: 1},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['신상품', 'sparkles'], ['식물', 'leaf'], ['화분·용품', 'bag'], ['관리 가이드', 'book']), '장바구니', '© 2026 초록방 · 정적 데모', FOOT)});

  add('wine-list', '와인 리스트', 'commerce', 'wine', '카브 오월', [
    head('오늘의 와인 리스트', '잔으로 · 병으로 · 페어링과 함께'),
    {type: 'menu', title: '글라스 와인', layout: 'leader', items: [{name: '샤블리 1er cru', description: '프랑스 부르고뉴 · 화이트 · 산뜻한 산미와 미네랄', price: '16,000', tag: '추천'}, {name: '피노 누아 리저브', description: '뉴질랜드 · 레드 · 붉은 과실과 부드러운 탄닌', price: '18,000'}, {name: '모스카토 다스티', description: '이탈리아 · 스파클링 · 은은한 단맛', price: '14,000'}, {name: '리슬링 카비넷', description: '독일 · 화이트 · 살구와 라임', price: '15,000'}]},
    {type: 'menu', title: '병 와인', layout: 'grid', items: [{name: '바롤로 클라시코 2018', description: '이탈리아 피에몬테 · 깊고 단단한 구조', price: '168,000', tag: '시그니처'}, {name: '샤토 마고 세컨드 2016', description: '프랑스 보르도 · 우아한 향', price: '220,000'}, {name: '리오하 그란 레세르바', description: '스페인 · 바닐라와 가죽', price: '98,000'}, {name: '모젤 슈페트레제', description: '독일 · 낮은 도수, 맑은 산미', price: '72,000'}]},
    {type: 'split', children: [prose('소믈리에의 한마디', '처음 오신 분은 말씀해 주세요. 좋아하는 음식과 평소 즐기는 술을 알려 주시면 오늘 가장 어울리는 한 잔을 권해 드립니다.'), {type: 'properties', title: '영업 안내', items: [{label: '영업 시간', value: '화~토 18:00~01:00'}, {label: '예약', value: '전화 또는 앱'}, {label: '콜키지', value: '병당 30,000원'}]}]},
  ], {axes: {shell: 'centered'}, chrome: chrome(nav(['글라스', 'coffee'], ['병', 'bag'], ['예약', 'calendar'], ['오시는 길', 'map-pin']), '예약하기', '© 2026 카브 오월 · 정적 데모', ['이용약관', '개인정보', '미성년자 주류 판매 금지'])});

  add('course-catalog', '강좌 목록', 'listing', 'learning', '오늘 배움', [
    head('지금 들을 수 있는 강좌', '신규 강좌 6개 · 무료 체험 가능', {actions: [A('내 학습', 'secondary')]}),
    {type: 'filter-bar', placeholder: '강좌 검색', filters: ['전체', '코딩', '디자인', '데이터', '언어'], selected: 0},
    {type: 'grid', columns: 'three', children: [
      card('파이썬 첫걸음', '8주 · 하루 20분으로 첫 프로그램 완성', {variant: 'media', visual: 'photo', motif: 'laptop', ratio: '16:9', badge: '입문', meta: '4.9 · 수강생 2,300명', price: '무료'}),
      card('인터페이스 디자인 기초', '위계와 간격으로 화면을 정리하는 법', {variant: 'media', visual: 'photo', motif: 'grid', ratio: '16:9', badge: '인기', meta: '4.8 · 수강생 1,840명', price: '49,000원'}),
      card('엑셀로 데이터 읽기', '피벗과 차트로 숫자의 이야기 읽기', {variant: 'media', visual: 'photo', motif: 'swatches', ratio: '16:9', meta: '4.7 · 수강생 3,120명', price: '39,000원'}),
      card('영어 말하기 루틴', '하루 10분 쉐도잉 21일 챌린지', {variant: 'media', visual: 'photo', motif: 'books', ratio: '16:9', badge: '신규', meta: '4.8 · 수강생 960명', price: '29,000원'}),
      card('사진 보정 입문', '스마트폰 사진을 정돈하는 법', {variant: 'media', visual: 'photo', motif: 'camera', ratio: '16:9', meta: '4.6 · 수강생 740명', price: '35,000원'}),
      card('SQL 한 걸음씩', '질문을 쿼리로 바꾸는 연습', {variant: 'media', visual: 'photo', motif: 'laptop', ratio: '16:9', badge: '신규', meta: '4.9 · 수강생 520명', price: '45,000원'})]},
    {type: 'pagination', pages: 6, current: 1},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['강좌', 'book'], ['로드맵', 'map-pin'], ['커뮤니티', 'users'], ['내 학습', 'user']), '로그인', '© 2026 오늘 배움 · 정적 데모', FOOT)});

  add('property-search', '매물 검색', 'listing', 'realty', '집찾기', [
    head('성수동 아파트 전세', '조건에 맞는 매물 128건'),
    {type: 'filter-bar', placeholder: '단지명·지하철역 검색', filters: ['전체', '신축', '역세권', '남향', '주차 가능'], selected: 0},
    {type: 'aside', side: 'end', label: '지도', size: 'wide', children: [
      {type: 'table', title: '매물 목록', caption: '최신 등록순 매물', variant: 'striped', columns: ['단지', '전용', '층', '보증금', '입주'], rows: [['성수 리버뷰', '59㎡', '12/25', '6.2억', '즉시'], ['서울숲 힐스', '84㎡', '7/20', '9.8억', '11월 말'], ['뚝섬 파크', '74㎡', '18/30', '8.1억', '12월'], ['성수 아이파크', '59㎡', '5/15', '5.8억', '협의'], ['한강 센트럴', '101㎡', '22/33', '12.5억', '즉시']], state: 'ready'},
      {...media('map', '4:3', '성수동 일대 지도에 매물 위치를 표시한 모습', '지도는 자리 표시 일러스트입니다.')}]},
    {type: 'pagination', pages: 8, current: 1},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['전세', 'building'], ['월세', 'bed'], ['매매', 'dollar'], ['관심 매물', 'heart']), '로그인', '© 2026 집찾기 · 정적 데모', FOOT)});

  add('event-schedule', '행사 일정표', 'listing', 'atelier', '가을 마켓 데이', [
    head('가을 마켓 데이 일정', '10월 31일 · 성수 공방길 전체', {actions: [A('일정 저장', 'secondary')]}),
    {type: 'filter-bar', placeholder: '프로그램 검색', filters: ['전체', '체험', '공연', '먹거리', '아이와 함께'], selected: 0},
    {type: 'timeline', title: '시간표', variant: 'rail', items: [{time: '10:00', title: '개장과 오프닝', description: '입구에서 지도와 스탬프 카드를 받아 가세요.'}, {time: '11:00', title: '도자기 체험', description: '2번 공방 · 선착순 20명', status: '예정'}, {time: '13:00', title: '골목 버스킹', description: '3번 마당 · 재즈 트리오'}, {time: '15:00', title: '가죽 키링 만들기', description: '5번 공방 · 소요 40분'}, {time: '17:00', title: '스탬프 추첨', description: '입구 앞 무대에서 진행합니다.'}]},
    {type: 'list', title: '참여 공방', variant: 'card', items: [{title: '흙과 불', description: '도자기 · 2번 공방', status: '진행'}, {title: '결 가죽', description: '가죽 공예 · 5번 공방', status: '진행'}, {title: '작은 직조', description: '직조 · 7번 공방', status: '대기'}], state: 'ready'},
  ], {axes: {shell: 'topbar'}, chrome: chrome(nav(['일정', 'calendar'], ['공방', 'map-pin'], ['안내', 'info']), '일정 저장', '© 2026 가을 마켓 데이 · 정적 데모', FOOT)});

  // ---------- article / docs / portfolio ----------
  add('news-home', '뉴스 메인', 'blog', 'newsroom', '한결일보', [
    head('오늘의 뉴스', '2026년 10월 20일 화요일 · 오전 편집'),
    card('시간제 일자리 늘었지만 임금은 제자리', '통계청이 발표한 3분기 고용 동향에 따르면 시간제 일자리가 늘었지만 월평균 임금 증가율은 1%대에 머물렀다. 전문가들은 "일자리의 질을 함께 살펴야 한다"고 지적했다.', {variant: 'horizontal', visual: 'photo', motif: 'building', ratio: '16:9', meta: '경제 · 오전 7:40', badge: '단독', author: '이서준 기자', action: A('기사 보기', 'ghost')}),
    {type: 'grid', columns: 'three', children: [card('내년 예산안, 복지 분야 늘렸다', '정부가 발표한 내년 예산안에서 복지 분야 증가율이 평균을 웃돌았다.', {meta: '정치 · 오전 8:10', author: '김하은 기자', action: A('기사 보기', 'ghost')}), card('도심 자전거도로 12km 추가', '서울시가 내년까지 도심 자전거도로를 12km 늘리기로 했다.', {meta: '사회 · 오전 8:32', author: '박도현 기자', action: A('기사 보기', 'ghost')}), card('겨울 전력 수급 "여유"', '산업부는 올겨울 최대 전력 수요를 넉넉히 감당할 수 있다고 밝혔다.', {meta: '산업 · 오전 9:05', author: '최유진 기자', action: A('기사 보기', 'ghost')})]},
    {type: 'reel', title: '많이 읽은 기사', children: [card('한 달 살기 해 보니', '지방 소도시 한 달 살기 후기.', {meta: '라이프 · 조회 4.2만', action: A('읽기', 'ghost')}), card('편의점 도시락의 진화', '신선식품 비중이 늘었다.', {meta: '소비 · 조회 3.8만', action: A('읽기', 'ghost')}), card('겨울 철새, 올해는 일찍', '한강에 첫 철새가 찾아왔다.', {meta: '환경 · 조회 3.1만', action: A('읽기', 'ghost')}), card('고령화와 지방 병원', '진료과목이 줄어드는 지역들.', {meta: '사회 · 조회 2.9만', action: A('읽기', 'ghost')})]},
    {type: 'tags', title: '섹션', items: ['정치', '경제', '사회', '국제', '문화', '스포츠', '오피니언'], variant: 'outline'},
  ], {axes: {shell: 'masthead', width: 'wide'}, chrome: chrome(nav(['정치', 'building'], ['경제', 'dollar'], ['사회', 'users'], ['국제', 'globe'], ['문화', 'music']), '구독', '© 2026 한결일보 · 정적 데모', ['이용약관', '개인정보', '기사 제보', '광고 문의'])});

  add('research-paper', '연구 논문', 'article', 'academic', '도시 열섬 연구', [
    head('도시 하천 복원이 여름철 야간 기온에 미친 영향', '서울 3개 하천 구간의 5년 관측 분석', {eyebrow: '원저 논문', meta: ['김다선 · 이지훈', '2026.10.', 'DOI 10.0000/example']}),
    prose('초록', '하천 복원 구간 인근의 여름철 야간 기온이 복원 전과 비교해 평균 1.4도 낮아졌다. 이 연구는 2021~2025년 세 개 하천 구간의 관측 자료를 비교해 복원 효과가 하천 중심에서 어느 거리까지 이어지는지 분석했다. 효과는 하천 중심에서 약 280m까지 유의했다.', 'lead'),
    {type: 'properties', title: '연구 개요', layout: 'inline', items: [{label: '관측 지점', value: '42곳'}, {label: '관측 기간', value: '2021.6 ~ 2025.9'}, {label: '분석 방법', value: '이중 차분 회귀'}]},
    section('방법', [prose('관측 설계', '복원 구간 21곳과 대조 구간 21곳에 온도 센서를 설치하고, 6~9월 밤 22시부터 새벽 5시까지 10분 간격으로 기온을 기록했다. 대조 구간은 하천과의 거리와 토지 이용 비율이 비슷한 곳으로 골랐다.'), {...media('chart', '16:9', '하천 중심에서의 거리에 따른 야간 기온 차이 그래프', '그림 1. 하천 중심에서 멀어질수록 기온 감소 효과가 줄어든다.')}]),
    section('결과', [{type: 'table', title: '거리별 기온 차이', caption: '복원 구간과 대조 구간의 야간 평균 기온 차이', columns: ['거리', '차이(℃)', '표준오차', '유의성'], rows: [['0~100m', '-1.8', '0.21', 'p<0.001'], ['100~200m', '-1.4', '0.19', 'p<0.001'], ['200~300m', '-0.7', '0.24', 'p<0.01'], ['300m 이상', '-0.1', '0.22', '유의하지 않음']], state: 'ready', variant: 'plain'}, {type: 'quote', quote: '하천 복원의 냉각 효과는 폭 약 280m의 띠로 나타났고, 그 바깥에서는 통계적으로 구분되지 않았다.', author: '연구진'}]),
    {type: 'notice', tone: 'info', title: '한계', body: '센서 위치가 현장 접근성에 영향을 받았고, 기상 조건은 연도마다 달랐다. 일반화에는 추가 구간의 관측이 필요하다.'},
  ], {chrome: chrome(nav(['논문', 'file'], ['자료', 'download'], ['인용', 'copy']), null, '© 2026 도시 열섬 연구실', ['이용 조건', '문의'])});

  add('api-reference', 'API 레퍼런스', 'docs', 'devtool', '빌드플로', [
    head('캐시 API', '원격 캐시에 결과물을 저장하고 가져오는 REST 엔드포인트.', {eyebrow: 'REST', meta: ['v3', '인증 필요', '분당 600회']}),
    {type: 'aside', side: 'end', label: '이 문서의 목차', sticky: 'yes', children: [
      section('엔드포인트', [
      section('캐시 조회', [prose('GET /v3/cache/{hash}', '해시로 저장된 결과물을 가져옵니다. 존재하지 않으면 404를 돌려줍니다.'), {type: 'table', title: '경로·쿼리 매개변수', caption: 'GET /v3/cache/{hash}', columns: ['이름', '위치', '타입', '설명'], rows: [['hash', '경로', '문자열', '작업 입력의 SHA-256 해시'], ['team', '쿼리', '문자열', '팀 ID. 생략하면 토큰의 기본 팀'], ['download', '쿼리', '불리언', 'true면 결과물 본문을 바로 내려받음']], state: 'ready'}, {type: 'tabs', variant: 'underline', children: [{type: 'tab', label: 'curl', children: [{type: 'code', label: '요청', language: 'bash', code: 'curl -H "Authorization: Bearer $BUILDFLOW_TOKEN" \\\n  https://api.example.com/v3/cache/9f2c1a?team=web'}]}, {type: 'tab', label: 'JavaScript', children: [{type: 'code', label: '요청', language: 'js', code: 'const res = await fetch("https://api.example.com/v3/cache/9f2c1a", {\n  headers: {Authorization: `Bearer ${process.env.BUILDFLOW_TOKEN}`},\n});\nconst {size, createdAt} = await res.json();'}]}]}], {anchor: 'get'}),
      section('캐시 저장', [prose('PUT /v3/cache/{hash}', '작업 결과물을 올립니다. 같은 해시에 다시 올리면 기존 항목을 덮어쓰지 않고 성공으로 응답합니다.'), {type: 'code', label: '응답 예시', language: 'json', code: '{\n  "hash": "9f2c1a",\n  "size": 482113,\n  "createdAt": "2026-10-20T08:12:44Z"\n}'}, {type: 'notice', tone: 'warning', title: '크기 제한', body: '한 항목은 최대 200MB입니다. 더 큰 결과물은 나누어 올려야 합니다.'}], {anchor: 'put'}),
      section('오류', [{type: 'table', title: '응답 코드', caption: '자주 만나는 응답', columns: ['코드', '의미', '대응'], rows: [['401', '토큰이 없거나 만료', '토큰을 다시 발급'], ['404', '해당 해시가 없음', '새로 빌드한 뒤 저장'], ['413', '항목이 너무 큼', '200MB 이하로 분할'], ['429', '요청 한도 초과', 'Retry-After 후 재시도']], state: 'ready'}], {anchor: 'errors'}),
      ]),
      {type: 'toc', title: '이 문서의 목차'}]},
  ], {axes: {shell: 'sidebar', width: 'wide'}, chrome: chrome(nav(['시작하기', 'book', '#main', '문서'], ['인증', 'lock', '#main', '문서'], ['캐시 API', 'code', '#main', '레퍼런스', true], ['웹훅', 'zap', '#main', '레퍼런스'], ['변경 기록', 'clock', '#main', '릴리스']), null, '빌드플로 · 정적 데모', null)});
}
