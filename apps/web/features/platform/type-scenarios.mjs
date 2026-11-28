import {DOC_SAMPLE} from './samples.ts';

// 타이포 비교의 다섯 가지 같은 콘텐츠. 화면(TypeCompare)과 시험이 같은 값을 읽도록 한 곳에 둔다.
export const SCENARIOS = {
  saas: {label: 'SaaS 랜딩', purpose: 'saas-landing', content: {name: 'Morrow', title: '팀의 일을 한곳에서 연결하세요', description: '계획부터 결과까지 한 화면에서 확인합니다. 월 ₩18,000부터 시작하세요.'}},
  erp: {label: 'ERP 대시보드', purpose: 'work-dashboard', content: {name: 'Morrow 운영', title: '운영 현황 Operations', kpis: [{label: '활성 사용자 Active', value: '12,840'}, {label: '전환율 Conversion', value: '4.6%'}], table: {title: '최근 주문', columns: ['주문', '고객', '금액'], rows: [['#10421', '김서연', '₩128,000'], ['#10420', 'Daniel Park', '₩54,900']]}}},
  editorial: {label: '에디토리얼', purpose: 'editorial-docs', content: DOC_SAMPLE},
  commerce: {label: '커머스', purpose: 'commerce', content: {name: 'Morrow Market', title: '매일 쓰는 물건을 오래 쓰도록', description: '새 시즌 상품과 가격, 재고 정보를 확인하세요.', products: [{title: 'Field Jacket', price: '₩189,000'}, {title: 'Canvas Bag', price: '₩42,000'}]}},
  mobile: {label: '모바일 앱', purpose: 'saas-landing', content: {name: 'Morrow Mobile', title: '오늘의 흐름을 빠르게 확인하세요', description: '손안에서 알림과 작업을 확인합니다. 12,840명이 사용 중입니다.'}},
};
