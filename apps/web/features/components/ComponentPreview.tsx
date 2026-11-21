'use client';

import {useRef, useState} from 'react';
import {Chip, ChipGroup} from '@/ui';
import styles from './components.module.css';

/** 변형 선택과 실제 렌더 미리보기. 같은 출처 문서라서 불러온 뒤 내용 높이에 맞춘다. */
type VariantGroup = {name: string; values: (string | number | boolean)[]; defaultValue: string | number | boolean; availability: {value: string | number | boolean; ok: boolean; reason?: string}[]};

export function ComponentPreview({type, label, variants, variantGroups = [], note}: {type: string; label: string; variants: {id: string; ok: boolean; reason?: string}[]; variantGroups?: VariantGroup[]; note?: string}) {
  const [variant, setVariant] = useState<string>(variants.find(v => v.ok)?.id ?? '');
  const [materialValues, setMaterialValues] = useState<Record<string, string | number | boolean>>(() => Object.fromEntries(variantGroups.map(group => [group.name, group.defaultValue])));
  const [viewport, setViewport] = useState<'wide' | 'narrow'>('wide');
  const [height, setHeight] = useState(420);
  const frame = useRef<HTMLIFrameElement>(null);
  const materialPath = variantGroups.flatMap(group => {
    const value = materialValues[group.name] ?? group.defaultValue;
    return String(value) === String(group.defaultValue) ? [] : [`${group.name}~${encodeURIComponent(String(value))}`];
  }).join('/');
  const src = `/components/${type}/render${variantGroups.length ? (materialPath ? `/${materialPath}` : '') : (variant ? `/${variant}` : '')}`;

  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(Math.min(900, Math.max(240, doc.documentElement.scrollHeight)));
  };

  return (
    <div>
      {variantGroups.length ? (
        <div role="group" aria-label="변형" className={styles.variantGroups}>
          {variantGroups.map(group => (
            <label className={styles.variantField} key={group.name}>
              <span>{group.name}</span>
              <select aria-label={group.name} value={String(materialValues[group.name] ?? group.defaultValue)} onChange={event => {
                const option = group.values.find(value => String(value) === event.target.value);
                if (option !== undefined) setMaterialValues(current => ({...current, [group.name]: option}));
              }}>
                {group.values.map(value => {
                  const available = group.availability.find(option => String(option.value) === String(value));
                  return <option key={String(value)} value={String(value)} disabled={!available?.ok} title={available?.reason}>{String(value)}</option>;
                })}
              </select>
            </label>
          ))}
        </div>
      ) : variants.length ? (
        <ChipGroup label={`${label} 변형`} className={styles.variants}>
          {variants.map(v => <Chip key={v.id} pressed={variant === v.id} disabled={!v.ok} title={v.ok ? undefined : v.reason} onClick={() => setVariant(v.id)}><code className={styles.variantCode}>{v.id}</code></Chip>)}
        </ChipGroup>
      ) : null}
      {variantGroups.length ? <div role="group" aria-label={`${label} 반응형 미리보기`} className={styles.viewports}>
        <Chip pressed={viewport === 'wide'} onClick={() => setViewport('wide')}>넓게</Chip>
        <Chip pressed={viewport === 'narrow'} onClick={() => setViewport('narrow')}>좁게 375px</Chip>
      </div> : null}
      <iframe ref={frame} key={src} src={src} title={`${label}${variant ? ` · ${variant}` : ''} 렌더 결과`} className={styles.frame} style={{height, width: viewport === 'narrow' ? 375 : '100%', maxWidth: '100%', marginInline: viewport === 'narrow' ? 'auto' : undefined}} onLoad={fit} />
      {variants.some(v => !v.ok) ? <p className={styles.note}>예제 데이터만으로는 만들 수 없는 변형: {variants.filter(v => !v.ok).map(v => `${v.id}(${v.reason})`).join(', ')}</p> : null}
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
