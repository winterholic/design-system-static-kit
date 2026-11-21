'use client';
import {layoutSlotsOf} from '../catalog';
import {useStudio} from '../context';
import styles from '../studio.module.css';

const MODES: {id: string; label: string}[] = [{id: 'light', label: '라이트'}, {id: 'dark', label: '다크'}, {id: 'auto', label: '시스템 설정 따름(auto)'}];

export function DesignPanel() {
  const api = useStudio();
  const {catalog, core} = api;
  const {document: d, session} = api.state;
  const doc = d.doc!;
  const {origin, picked} = session;
  if (!catalog || !core) return <p className={styles.muted}>카탈로그를 불러오는 중입니다…</p>;

  const theme = catalog.themes.find(t => t.id === doc.theme);
  const themePalettes = theme?.palettes ?? [];
  const paletteLabel = (id: string) => catalog.palettes.find(p => p.id === id)?.label ?? id;
  const others = catalog.palettes.filter(p => !themePalettes.includes(p.id));
  const slots = origin ? layoutSlotsOf(core, origin.template).filter(s => s.options.length > 1) : [];
  const styleAxes = catalog.axes.filter(a => a.axis !== 'mode');

  return (
    <div className={styles.design}>
      <section className={styles.section} aria-labelledby="d-theme">
        <h3 id="d-theme" className={styles.sectionTitle}>테마와 팔레트</h3>
        <p className={styles.muted}>바꿔도 글과 구조는 그대로입니다. 직접 고른 스타일 축은 새 테마가 허용하면 유지합니다.</p>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="d-theme-select">테마</label>
          <select id="d-theme-select" className={styles.select} value={String(doc.theme)} onChange={e => api.edit({kind: 'setTheme', theme: e.target.value})}>
            {catalog.themes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.id})</option>)}
          </select>
        </div>
        {theme?.variants.length ? (
          <div className={styles.field} role="group" aria-label="테마 변형">
            <span className={styles.fieldLabel}>테마 변형</span>
            <div className={styles.chips}>
              <button type="button" className={styles.chip} aria-pressed={origin ? origin.themeVariant === null : false} onClick={() => api.edit({kind: 'setThemeVariant', variant: null})}>기본</button>
              {theme.variants.map(v => (
                <button key={v.id} type="button" className={styles.chip} title={v.description} aria-pressed={origin?.themeVariant === v.id} onClick={() => api.edit({kind: 'setThemeVariant', variant: v.id, variantSet: v.set})}>{v.label}</button>
              ))}
            </div>
          </div>
        ) : null}
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="d-palette">팔레트</label>
          <select id="d-palette" className={styles.select} value={String(doc.palette)} onChange={e => api.edit({kind: 'setPalette', palette: e.target.value})}>
            <optgroup label="이 테마의 팔레트">
              {themePalettes.map(id => <option key={id} value={id}>{paletteLabel(id)}</option>)}
            </optgroup>
            {themePalettes.includes(String(doc.palette)) ? null : <option value={String(doc.palette)}>{paletteLabel(String(doc.palette))} (현재)</option>}
            <optgroup label="모든 팔레트">
              {others.filter(p => p.id !== String(doc.palette)).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </optgroup>
          </select>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="d-mode">
        <h3 id="d-mode" className={styles.sectionTitle}>문서 색 모드</h3>
        <p className={styles.muted}>문서에 저장되고 내보내기 결과에 반영됩니다. 미리보기에서만 어둡게 보는 설정은 미리보기 위쪽에 따로 있습니다.</p>
        <div className={styles.group} role="radiogroup" aria-label="문서 색 모드">
          {MODES.map(m => (
            <button key={m.id} type="button" role="radio" aria-checked={doc.mode === m.id} className={styles.seg} aria-pressed={undefined} data-on={doc.mode === m.id} onClick={() => api.edit({kind: 'setMode', mode: m.id})}>{m.label}</button>
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
                {a.values.map(v => <option key={v} value={v}>{v}</option>)}
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
                    <select id={`d-layout-${s.id}`} className={styles.select} value={origin.layout[s.id] ?? ''} onChange={e => e.target.value && api.edit({kind: 'setLayout', slot: s.id, option: e.target.value})}>
                      <option value="" disabled>현재 구성 유지</option>
                      {s.options.map(o => <option key={o.id} value={o.id} title={o.description}>{o.label}{o.recommended ? '' : ' (권장 아님)'}</option>)}
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
