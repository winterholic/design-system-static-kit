/** 컴포넌트 재료의 렌더 예시 입력. 속성(축) 값 한 벌이 주어지면 그 조합을 그릴 수 있는 완전한 입력을 만든다.
 *  테스트(모든 허용 조합 렌더, 모든 금지 조합 거부)와 증거 페이지(축 값마다 한 장)가 같은 입력을 쓴다. 내용 글은 짧은 한국어 고정 문장이다. */
import {renderButton} from './button.mjs';
import {renderInput} from './input.mjs';
import {renderCard} from './card.mjs';
import {renderNavigation} from './navigation.mjs';
import {renderModal} from './modal.mjs';
import {renderTabs} from './tabs.mjs';
import {renderTooltip} from './tooltip.mjs';
import {renderFeedback} from './feedback.mjs';

const navItems = p => {
  const icons = p.icons === 'start', at = (item, icon) => (icons ? {...item, icon} : item);
  const items = [at({label: '개요', href: '#overview', current: true}, 'home'), at({label: '문서', href: '#docs'}, 'book'), at({label: '가격', href: '#pricing'}, 'tag'), at({label: '지원 종료', disabled: true}, 'lock')];
  return p.submenu === 'disclosure' ? [items[0], at({label: '리포트', children: [{label: '월간', href: '#monthly'}, {label: '분기', href: '#quarterly'}]}, 'chart'), items[1], items[3]] : items;
};
const tabItems = p => [['overview', '개요', 'home', '프로젝트의 목표와 현재 상태를 요약합니다.'], ['tasks', '작업', 'list', '이번 주에 끝낼 작업 목록입니다.'], ['files', '파일', 'folder', '공유된 파일 열두 개가 있습니다.']]
  .map(([id, label, icon, content]) => ({id, label, content, ...(p.icons === 'start' ? {icon} : {})}));

/** id: 같은 페이지에 여러 장을 놓을 때 겹치지 않게 하는 접두. preview: 모달을 닫힌 상태로 두지 않고 안을 보이는 문서용 배치로 그린다. */
export const SPECIMENS = Object.freeze({
  'component:button-control': {render: renderButton, input: (p, uid) => ({id: uid, label: '저장', ariaLabel: p.content === 'icon-only' ? '검색' : undefined, icon: p.content === 'icon-end' ? 'chevron-right' : p.content === 'icon-only' ? 'search' : 'plus', ...p})},
  'component:input-control': {render: renderInput, input: (p, uid) => ({id: uid, label: '이름', placeholder: p.kind === 'multiline' ? '여러 줄 입력' : '입력', hint: '실명을 입력하세요.', message: p.state === 'error' ? '형식을 확인하세요.' : '', icon: 'mail', value: p.kind === 'password' ? 'secret' : '', ...p})},
  'component:card-surface': {render: renderCard, input: (p, uid) => ({id: uid, title: '프로젝트 개요', body: '이번 분기에 진행하는 일을 한곳에 모았습니다.', meta: '2026-11-22', href: '#docs', mediaIcon: 'sparkles', message: p.state === 'error' ? '불러오지 못했습니다.' : '', actions: p.footer === 'actions' ? [{label: '열기'}, {label: '나중에'}] : [], ...p})},
  'component:navigation-menu': {render: renderNavigation, input: (p, uid) => ({id: uid, label: '주요 메뉴', items: navItems(p), ...p})},
  'component:modal-dialog': {render: renderModal, input: (p, uid, preview = true) => ({id: uid, title: '새 프로젝트', description: '이름을 정하면 바로 시작합니다.', triggerLabel: '열기', preview, message: p.state === 'error' ? '저장하지 못했습니다.' : '',
    body: [{slot: 'input', id: `${uid}-name`, label: '프로젝트 이름', placeholder: '예: 가을 캠페인'}],
    actions: p.footer === 'actions' ? [{label: '취소', role: 'cancel'}, {label: p.role === 'alertdialog' ? '삭제' : '만들기', role: 'confirm'}] : [], ...p})},
  'component:tabs-control': {render: renderTabs, input: (p, uid) => ({id: uid, label: '프로젝트 보기', tabs: tabItems(p), ...p})},
  'component:tooltip': {render: renderTooltip, input: (p, uid) => ({id: uid, triggerLabel: p.trigger === 'icon' ? '도움말' : '저장 위치', content: p.purpose === 'name' ? '도움말 열기' : '내 문서 폴더에 저장됩니다.', ...p})},
  'component:feedback-message': {render: renderFeedback, input: (p, uid) => ({id: uid, message: '변경 사항을 저장했습니다.', actionLabel: p.action === 'button' ? '다시 시도' : '', ...p})},
});
export const specimenIds = Object.freeze(Object.keys(SPECIMENS));
export const specimenInput = (id, axes, uid = 'sp', ...rest) => SPECIMENS[id].input(axes, uid, ...rest);
export const renderSpecimen = (id, axes, uid = 'sp', ...rest) => SPECIMENS[id].render(specimenInput(id, axes, uid, ...rest));
