'use client';
import {useMemo} from 'react';
import {layoutSlotsOf} from '../catalog';
import {useStudio} from '../context';
import type {Choice} from '../core';
import styles from '../studio.module.css';

const MODES: {id: string; label: string}[] = [{id: 'light', label: '라이트'}, {id: 'dark', label: '다크'}, {id: 'auto', label: '시스템 설정 따름(auto)'}];

/** 고를 수 없는 선택지에 붙이는 이유. 코드는 연산이 거부할 때 내는 진단 코드 그대로다(JSON 가져오기와 같은 표기). */
const why = (c: Choice | undefined) => (c && !c.ok ? ` (쓸 수 없음 · ${c.errors[0]?.code ?? '충돌'})` : '');
const reason = (c: Choice | undefined) => (c && !c.ok ? c.errors.map(e => `${e.code}: ${e.message} ${e.hint}`).join('\n') : undefined);

export function DesignPanel() {
  const api = useStudio();
  const {catalog, core} = api;
  const {document: d, session} = api.state;
  const doc = d.doc!;
  const {origin, picked} = session;
  // 현재 조합과 충돌하는 선택은 고르기 전에 알 수 있어야 한다. 판정은 Core 연산이 하고(src/edit/applicability.mjs), 문서가 바뀔 때만 다시 계산한다.
  const slotsForChoices = useMemo(() => (core && origin ? layoutSlotsOf(core, origin.template).filter(s => s.options.length > 1) : []), [core, origin]);
  const themePalette = origin && origin.palette === null ? 'theme-default' : 'keep';
  const choices = useMemo(() => {
    if (!core) return null;
    const e = core.edit;
    const byId = (list: Choice[]) => new Map(list.map(c => [String(c.id), c]));  // 변형의 "기본"은 id가 null이라 문자열 'null'로 찾는다
    return {
      themes: byId(e.themeChoices(doc, {palette: themePalette})),
      variants: byId(e.themeVariantChoices(doc, {palette: themePalette})),
      palettes: byId(e.paletteChoices(doc)),
      modes: byId(e.modeChoices(doc)),
      axes: Object.fromEntries(Object.entries(e.axisChoices(doc)).map(([axis, list]) => [axis, byId(list)])),
      layout: Object.fromEntries(Object.entries(e.layoutChoices(doc, slotsForChoices)).map(([slot, list]) => [slot, new Map(list.map(c => [c.id, c]))])),
    };
  }, [core, doc, themePalette, slotsForChoices]);
  if (!catalog || !core || !choices) return <p className={styles.muted}>카탈로그를 불러오는 중입니다…</p>;

  const theme = catalog.themes.find(t => t.id === doc.theme);
  const themePalettes = theme?.palettes ?? [];
  const paletteLabel = (id: string) => catalog.palettes.find(p => p.id === id)?.label ?? id;
  const others = catalog.palettes.filter(p => !themePalettes.includes(p.id));
  const slots = slotsForChoices;
  const styleAxes = catalog.axes.filter(a => a.axis !== 'mode');

  return (
    <div className={styles.design}>
      <section className={styles.section} aria-labelledby="d-theme">
        <h3 id="d-theme" className={styles.sectionTitle}>테마와 팔레트</h3>
        <p className={styles.muted}>바꿔도 글과 구조는 그대로입니다. 직접 고른 스타일 축은 새 테마가 허용하면 유지합니다.</p>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="d-theme-select">테마</label>
          <select id="d-theme-select" className={styles.select} value={String(doc.theme)} onChange={e => api.edit({kind: 'setTheme', theme: e.target.value})}>
            {catalog.themes.map(t => <option key={t.id} value={t.id} disabled={choices.themes.get(t.id)?.ok === false} title={reason(choices.themes.get(t.id))}>{t.name} ({t.id}){why(choices.themes.get(t.id))}</option>)}
          </select>
        </div>
        {theme?.variants.length ? (
          <div className={styles.field} role="group" aria-label="테마 변형">
            <span className={styles.fieldLabel}>테마 변형</span>
            <div className={styles.chips}>
              <button type="button" className={styles.chip} aria-pressed={origin ? origin.themeVariant === null : false} disabled={choices.variants.get('null')?.ok === false} title={reason(choices.variants.get('null'))} onClick={() => api.edit({kind: 'setThemeVariant', variant: null})}>기본</button>
              {theme.variants.map(v => (
                <button key={v.id} type="button" className={styles.chip} title={reason(choices.variants.get(v.id)) ?? v.description} disabled={choices.variants.get(v.id)?.ok === false} aria-pressed={origin?.themeVariant === v.id} onClick={() => api.edit({kind: 'setThemeVariant', variant: v.id, variantSet: v.set})}>{v.label}{why(choices.variants.get(v.id))}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="d-palette">팔레트</label>
          <select id="d-palette" className={styles.select} value={String(doc.palette)} onChange={e => api.edit({kind: 'setPalette', palette: e.target.value})}>
            <optgroup label="이 테마의 팔레트">
              {themePalettes.map(id => <option key={id} value={id} disabled={choices.palettes.get(id)?.ok === false} title={reason(choices.palettes.get(id))}>{paletteLabel(id)}{why(choices.palettes.get(id))}</option>)}
            </optgroup>
            {themePalettes.includes(String(doc.palette)) ? null : <option value={String(doc.palette)}>{paletteLabel(String(doc.palette))} (현재)</option>}
            <optgroup label="모든 팔레트">
              {others.filter(p => p.id !== String(doc.palette)).map(p => <option key={p.id} value={p.id} disabled={choices.palettes.get(p.id)?.ok === false} title={reason(choices.palettes.get(p.id))}>{p.label}{why(choices.palettes.get(p.id))}</option>)}
            </optgroup>
          </select>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="d-mode">
        <h3 id="d-mode" className={styles.sectionTitle}>문서 색 모드</h3>
        <p className={styles.muted}>문서에 저장되고 내보내기 결과에 반영됩니다. 미리보기에서만 어둡게 보는 설정은 미리보기 위쪽에 따로 있습니다.</p>
        <div className={styles.group} role="radiogroup" aria-label="문서 색 모드">
          {MODES.map(m => (
            <button key={m.id} type="button" role="radio" aria-checked={doc.mode === m.id} className={styles.seg} aria-pressed={undefined} data-on={doc.mode === m.id} disabled={choices.modes.get(m.id)?.ok === false} title={reason(choices.modes.get(m.id))} onClick={() => api.edit({kind: 'setMode', mode: m.id})}>{m.label}{why(choices.modes.get(m.id))}</button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="d-axes">
        <h3 id="d-axes" className={styles.sectionTitle}>스타일 축</h3>
        <div className={styles.axisGrid}>
          {styleAxes.map(a => (
            <div className={styles.field} key={a.axis}>
              <label className={styles.fieldLabel} htmlFor={`d-axis-${a.axis}`}>{a.label}{picked[a.axis] ? ' (직접 고름)' : ''}</label>
              <select id={`d-axis-${a.axis}`} className={styles.select} value={String(doc[a.axis])} onChange={e => api.edit({kind: 'setAxis', axis: a.axis, value: e.target.value})}>
                {a.values.map(v => { const c = choices.axes[a.axis]?.get(v); return <option key={v} value={v} disabled={c?.ok === false} title={reason(c)}>{v}{why(c)}</option>; })}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="d-layout">
        <h3 id="d-layout" className={styles.sectionTitle}>구성 변형</h3>
        {origin ? (
          slots.length ? (
            <>
              <p className={styles.muted}>현재 문서에 적용합니다. 쓴 내용은 그대로이고, 내용을 둘 곳이 없으면 거부하고 이유를 알려 줍니다.</p>
              <div className={styles.axisGrid}>
                {slots.map(s => (
                  <div className={styles.field} key={s.id}>
                    <label className={styles.fieldLabel} htmlFor={`d-layout-${s.id}`}>{s.label}</label>
                    <select id={`d-layout-${s.id}`} className={styles.select} value={origin.layout[s.id] ?? ''} onChange={e => e.target.value && api.edit({kind: 'setLayout', slot: s.id, option: e.target.value, ...(choices.layout[s.id]?.get(e.target.value)?.relocate ? {relocate: true} : {})})}>
                      <option value="" disabled>현재 구성 유지</option>
                      {s.options.map(o => {
                        const c = choices.layout[s.id]?.get(o.id);
                        const moves = !!c && !c.ok && c.relocate;
                        return <option key={o.id} value={o.id} disabled={!!c && !c.ok && !c.relocate} title={moves ? '내용을 둘 곳이 없어 아래로 옮겨 적용합니다. 실행 취소로 되돌릴 수 있습니다.' : reason(c) ?? o.description}>{o.label}{o.recommended ? '' : ' (권장 아님)'}{moves ? ' (콘텐츠를 옮겨 적용)' : c && !c.ok ? why(c) : ''}</option>;
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </>
          ) : <p className={styles.muted}>이 템플릿에는 고를 수 있는 구성 변형이 없습니다.</p>
        ) : <p className={styles.muted} data-testid="no-origin">가져온 문서는 출처 템플릿을 알 수 없어 구성 변형과 템플릿 기준 기능을 쓸 수 없습니다. 템플릿 바꾸기로 템플릿을 고르면 다시 쓸 수 있습니다.</p>}
      </section>
    </div>
  );
}
