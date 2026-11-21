'use client';
import {useState} from 'react';
import {Button, Checkbox, Chip, ChipGroup, Input, Segmented, Select, Textarea, type SelectOption} from '@/ui';

const FRUITS: SelectOption[] = [
  {value: 'apple', label: 'Apple', group: '과일'},
  {value: 'banana', label: 'Banana', group: '과일'},
  {value: 'blueberry', label: 'Blueberry', group: '과일'},
  {value: 'carrot', label: 'Carrot', group: '채소', disabled: true, reasonCode: 'SEASON', reason: 'SEASON: 지금은 철이 아닙니다.'},
  {value: 'daikon', label: 'Daikon', group: '채소'},
];
const MANY: SelectOption[] = Array.from({length: 30}, (_, i) => ({value: `item-${i + 1}`, label: `항목 ${String(i + 1).padStart(2, '0')}`}));

/** 공용 UI 부품의 상태 모음. e2e가 키보드·오류·비활성·모바일 동작을 이 화면에서 확인한다. 공개 메뉴에는 없다. */
export function UiGallery() {
  const [fruit, setFruit] = useState('apple');
  const [many, setMany] = useState('item-1');
  const [required, setRequired] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState('light');
  const [chip, setChip] = useState(false);
  const [checked, setChecked] = useState(false);
  const [clicks, setClicks] = useState(0);
  const error = required === '' ? '값을 골라야 합니다.' : undefined;
  return (
    <div>
      <section aria-labelledby="ui-select"><h2 id="ui-select" className="section-title">Select</h2>
        <div style={{display: 'grid', gap: 16, maxWidth: 420}}>
          <Select id="ui-fruit" label="과일" value={fruit} options={FRUITS} onChange={setFruit} hint="화살표 키로 고르고 Enter로 선택합니다." />
          <p data-testid="fruit-value">선택값: {fruit}</p>
          <Select id="ui-many" label="긴 목록" value={many} options={MANY} onChange={setMany} />
          <Select id="ui-required" label="필수 선택" required value={required} options={FRUITS} placeholder="고르세요" onChange={setRequired} error={error} />
          <Select id="ui-disabled" label="비활성 Select" value="apple" options={FRUITS} disabled onChange={() => undefined} />
        </div>
      </section>
      <section aria-labelledby="ui-input"><h2 id="ui-input" className="section-title">Input</h2>
        <div style={{display: 'grid', gap: 16, maxWidth: 420}}>
          <Input id="ui-text" label="이름" value={text} onChange={e => setText(e.target.value)} hint="두 글자 이상" />
          <Input id="ui-err" label="이메일" defaultValue="not-an-email" error="이메일 형식이 아닙니다." />
          <Input id="ui-off" label="잠긴 칸" defaultValue="수정할 수 없음" disabled />
          <Textarea id="ui-area" label="메모" rows={3} defaultValue="" />
          <Checkbox id="ui-check" label="약관에 동의합니다" checked={checked} onChange={e => setChecked(e.target.checked)} />
        </div>
      </section>
      <section aria-labelledby="ui-button"><h2 id="ui-button" className="section-title">Button · Chip · Segmented</h2>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'}}>
          <Button variant="primary" onClick={() => setClicks(n => n + 1)}>기본 동작</Button>
          <Button>보조</Button>
          <Button variant="quiet">조용한</Button>
          <Button variant="primary" disabled>비활성</Button>
          <span data-testid="clicks">눌린 횟수 {clicks}</span>
        </div>
        <div style={{marginTop: 16}}><ChipGroup label="필터"><Chip pressed={chip} onClick={() => setChip(v => !v)}>새것</Chip><Chip pressed={false} disabled>품절</Chip></ChipGroup></div>
        <div style={{marginTop: 16}}><Segmented label="색 모드" value={mode} onChange={setMode} options={[{value: 'light', label: '라이트'}, {value: 'dark', label: '다크'}, {value: 'auto', label: '자동', disabled: true, title: '지금은 쓸 수 없음'}]} /></div>
        <p data-testid="mode-value">모드: {mode}</p>
      </section>
    </div>
  );
}
