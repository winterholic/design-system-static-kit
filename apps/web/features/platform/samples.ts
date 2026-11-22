// 재료 비교용 입력 콘텐츠. 조립 요청의 content 이고, 화면(HTML)은 모두 Core 가 만든다. 한글·영문·숫자·코드가 섞이도록 썼다.
export const DOC_SAMPLE = {
  name: 'Static Kit Docs',
  title: '시작하기 Getting Started',
  lead: '한글과 English가 섞인 문장에서 숫자 1,234.56과 코드 npm run kit 이 어떻게 읽히는지 확인합니다.',
  sections: [
    {title: '설치 Install', body: '저장소를 내려받고 npm ci 를 실행합니다. 버전은 v2.6.0 이상이어야 하며, 설정 파일은 kit.config.json 입니다.'},
    {title: '첫 화면 만들기', body: 'Blueprint 를 검증한 뒤 build 하면 index.html 과 tokens.css 가 만들어집니다. 접근성 대비 4.5:1 을 넘지 못하면 결과를 만들지 않습니다.'},
    {title: '다음 단계 Next steps', body: '팔레트와 타이포 시스템을 바꿔 보고, 마음에 드는 조합을 코드로 내려받으세요.'},
  ],
};
export const DASH_SAMPLE = {
  name: 'Static Kit',
  title: '운영 현황 Operations',
  kpis: [
    {label: '활성 사용자 Active', value: '12,840', trend: 'up', delta: '+3.2%'},
    {label: '신규 가입 Signups', value: '1,284', trend: 'up', delta: '+8.1%'},
    {label: '전환율 Conversion', value: '4.6%', trend: 'down', delta: '-0.4%'},
    {label: '평균 응답 Latency', value: '182ms', trend: 'down', delta: '-12ms'},
  ],
  table: {
    title: '최근 주문 Orders',
    columns: ['주문 번호', '고객 Customer', '금액 Amount', '상태 Status'],
    rows: [['#10421', '김서연 Seoyeon', '₩128,000', '결제 완료'], ['#10420', 'Daniel Park', '₩54,900', '배송 중'], ['#10419', '이도윤 Doyun', '₩212,500', '준비 중'], ['#10418', 'Mina Choi', '₩39,000', '결제 완료']],
  },
};
export const SAMPLES = {
  doc: {label: '문서', purpose: 'editorial-docs', content: DOC_SAMPLE},
  dash: {label: '대시보드', purpose: 'work-dashboard', content: DASH_SAMPLE},
} as const;
export type SampleId = keyof typeof SAMPLES;
