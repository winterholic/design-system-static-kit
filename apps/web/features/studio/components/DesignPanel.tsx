'use client';
import {useMemo} from 'react';
import {layoutSlotsOf} from '../catalog';
import {candidateTrials, designChoices, explorationKey} from '../compiler';
import {useStudio} from '../context';
import type {Choice} from '../core';
import {Button, Chip, ChipGroup, Segmented, Select, type SelectOption} from '@/ui';
import styles from '../studio.module.css';

const MODES: {id: string; label: string}[] = [{id: 'light', label: '라이트'}, {id: 'dark', label: '다크'}, {id: 'auto', label: '시스템 설정 따름(auto)'}];

/** 고를 수 없는 선택지에 붙이는 이유. 코드는 연산이 거부할 때 내는 진단 코드 그대로다(JSON 가져오기와 같은 표기). */
const why = (c: Choice | undefined) => (c && !c.ok ? ` (쓸 수 없음 · ${c.errors[0]?.code ?? '충돌'})` : '');
const reason = (c: Choice | undefined) => (c && !c.ok ? c.errors.map(e => `${e.code}: ${e.message} ${e.hint}`).join('\n') : undefined);
/** 선택 가능성 판정(Core 연산 결과)을 공용 Select의 비활성·이유로 그대로 옮긴다. 판정은 여기서 하지 않는다. */
const verdict = (c: Choice | undefined): Pick<SelectOption, 'disabled' | 'reason' | 'reasonCode'> => (c && !c.ok ? {disabled: true, reason: reason(c), reasonCode: c.errors[0]?.code ?? '충돌'} : {});

export function DesignPanel() {
  const api = useStudio();
  const {catalog, core} = api;
  const {document: d, session} = api.state;
  const doc = d.doc!;
  const {origin, picked} = session;
  // 현재 조합과 충돌하는 선택은 고르기 전에 알 수 있어야 한다. 판정은 Core 연산이 하고(src/edit/applicability.mjs), 문서가 바뀔 때만 다시 계산한다.
  const slotsForChoices = useMemo(() => (core && origin ? layoutSlotsOf(core, origin.template).filter(s => s.options.length > 1) : []), [core, origin]);
  const themePalette = origin && origin.palette === null ? 'theme-default' : 'keep';

  // 판정은 문서의 다른 필드에도 걸려 있어(profile·mode·typeRoles·축이 바뀌면 결과가 바뀐다) 판정이 읽지 않는 것으로 확인된 필드만
  // 키에서 빼고, 나머지가 같을 때만 이전 판정을 쓴다. 판정은 건너뛰지 않는다(compiler.ts EXPLORATION_IGNORED, compiler.unit.mjs가 Core로 확인).
  const keys = useMemo(() => ({
    choices: explorationKey(doc, 'choices'), colors: explorationKey(doc, 'colorTrials'),
    types: explorationKey(doc, 'typeTrials'), profiles: explorationKey(doc, 'profileTrials'),
  }), [doc]);

  const choices = useMemo(() => (core ? designChoices(core, doc, themePalette, slotsForChoices) : null), [core, keys.choices, themePalette, slotsForChoices]);

  // 색·타입·프로파일 후보 시험. 각 묶음이 서로 다른 키를 가지므로 자기 필드나 확인된 무관 필드만 바뀌면 그 묶음은 다시 시험하지 않는다.
  const materialSources = useMemo(() => {
    if (!core) return null;
    const color = core.service.getColorTokens();
    const type = core.service.getTypePresets();
    const schema = core.service.getSchema({target: 'blueprint', fields: ['profile']});
    return color.ok && type.ok && schema.ok ? {color: color.value, type: type.value, profiles: schema.value.properties.profile?.enum ?? []} : null;
  }, [core]);
  // 2.6.0 문서의 색은 항상 내부 팔레트다. "없음"은 2.6.0 이전 문서에서만 의미가 있다.
  const colorTrials = useMemo(() => (materialSources ? candidateTrials(core!, doc, 'colorPalette', materialSources.color.options.map(x => x.id), doc.catalogVersion !== '2.6.0') : []), [materialSources, keys.colors]);
  const typeTrials = useMemo(() => (materialSources ? candidateTrials(core!, doc, 'typeRoles', materialSources.type.presets.map(x => x.id), true) : []), [materialSources, keys.types]);
  const profileTrials = useMemo(() => (materialSources ? candidateTrials(core!, doc, 'profile', materialSources.profiles, true) : []), [materialSources, keys.profiles]);
  const materialData = useMemo(() => (materialSources ? {
    colors: colorTrials, types: typeTrials, profiles: profileTrials,
    labels: {
      colors: Object.fromEntries(materialSources.color.options.map(x => [x.id, x.label])),
      types: Object.fromEntries(materialSources.type.presets.map(x => [x.id, x.label])),
    },
  } : null), [materialSources, colorTrials, typeTrials, profileTrials]);
  if (!catalog || !core || !choices) return <p className={styles.muted}>카탈로그를 불러오는 중입니다…</p>;

  const theme = catalog.themes.find(t => t.id === doc.theme);
  const themePalettes = theme?.palettes ?? [];
  const paletteLabel = (id: string) => catalog.palettes.find(p => p.id === id)?.label ?? id;
  const others = catalog.palettes.filter(p => !themePalettes.includes(p.id));
  const slots = slotsForChoices;
  const styleAxes = catalog.axes.filter(a => a.axis !== 'mode');
  const currentPalette = String(doc.palette);
  const paletteOptions: SelectOption[] = [
    ...themePalettes.map(id => ({value: id, label: paletteLabel(id), group: '이 테마의 팔레트', ...verdict(choices.palettes.get(id))})),
    ...(themePalettes.includes(currentPalette) ? [] : [{value: currentPalette, label: `${paletteLabel(currentPalette)} (현재)`, group: '현재 팔레트'}]),
    ...others.filter(p => p.id !== currentPalette).map(p => ({value: p.id, label: p.label, group: '모든 팔레트', ...verdict(choices.palettes.get(p.id))})),
  ];

  return (
    <div className={styles.design}>
      <section className={styles.section} aria-labelledby="d-theme">
        <h3 id="d-theme" className={styles.sectionTitle}>테마와 팔레트</h3>
        <p className={styles.muted}>바꿔도 글과 구조는 그대로입니다. 직접 고른 스타일 축은 새 테마가 허용하면 유지합니다.</p>
        <Select id="d-theme-select" className={styles.field} label="테마" value={String(doc.theme)} onChange={value => api.edit({kind: 'setTheme', theme: value})}
          options={catalog.themes.map(t => ({value: t.id, label: `${t.name} (${t.id})`, ...verdict(choices.themes.get(t.id))}))} />
        {theme?.variants.length ? (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>테마 변형</span>
            <ChipGroup label="테마 변형">
              <Chip pressed={origin ? origin.themeVariant === null : false} disabled={choices.variants.get('null')?.ok === false} title={reason(choices.variants.get('null'))} onClick={() => api.edit({kind: 'setThemeVariant', variant: null})}>기본</Chip>
              {theme.variants.map(v => (
                <Chip key={v.id} pressed={origin?.themeVariant === v.id} title={reason(choices.variants.get(v.id)) ?? v.description} disabled={choices.variants.get(v.id)?.ok === false} onClick={() => api.edit({kind: 'setThemeVariant', variant: v.id, variantSet: v.set})}>{v.label}{why(choices.variants.get(v.id))}</Chip>
              ))}
            </ChipGroup>
          </div>
        ) : null}
        {doc.catalogVersion === '2.6.0'
          ? <p className={styles.muted} data-testid="palette-260-note">2.6.0 문서의 색은 아래 Materials의 내부 색 토큰에서만 옵니다. 외부 팔레트는 출처 권리를 확인하지 못해 2.6.0 문서에서는 선택하지 않습니다.</p>
          : <Select id="d-palette" className={styles.field} label="팔레트" value={String(doc.palette)} onChange={value => api.edit({kind: 'setPalette', palette: value})} options={paletteOptions} />}
      </section>

      <section className={styles.section} aria-labelledby="d-mode">
        <h3 id="d-mode" className={styles.sectionTitle}>문서 색 모드</h3>
        <p className={styles.muted}>문서에 저장되고 내보내기 결과에 반영됩니다. 미리보기에서만 어둡게 보는 설정은 미리보기 위쪽에 따로 있습니다.</p>
        <Segmented label="문서 색 모드" value={String(doc.mode)} onChange={mode => api.edit({kind: 'setMode', mode})}
          options={MODES.map(m => ({value: m.id, label: `${m.label}${why(choices.modes.get(m.id))}`, disabled: choices.modes.get(m.id)?.ok === false, title: reason(choices.modes.get(m.id))}))} />
      </section>

      <section className={styles.section} aria-labelledby="d-axes">
        <h3 id="d-axes" className={styles.sectionTitle}>스타일 축</h3>
        <div className={styles.axisGrid}>
          {styleAxes.map(a => (
            <Select key={a.axis} id={`d-axis-${a.axis}`} className={styles.field} label={`${a.label}${picked[a.axis] ? ' (직접 고름)' : ''}`} value={String(doc[a.axis])} onChange={value => api.edit({kind: 'setAxis', axis: a.axis, value})}
              options={a.values.map(v => ({value: v, label: v, ...verdict(choices.axes[a.axis]?.get(v))}))} />
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="d-materials" data-testid="material-choices">
        <h3 id="d-materials" className={styles.sectionTitle}>2.6.0 Materials</h3>
        <p className={styles.muted}>색 토큰과 역할 타이포그래피는 미리보기와 내보내기에 적용됩니다. Design Profile은 문서에 저장되며 호환성을 검사합니다. 기존 배치와 스타일은 프로파일 선택만으로 바뀌지 않습니다.</p>
        {doc.catalogVersion !== '2.6.0' ? <Button size="sm" onClick={() => api.editWithImpact({kind: 'upgrade260'})}>현재 문서를 2.6.0으로 업그레이드</Button> : null}
        {materialData ? <div className={styles.axisGrid}>
          <MaterialSelect id="material-color" label="색 재료" value={doc.colorPalette ?? (doc.catalogVersion === '2.6.0' ? 'static-kit' : '')} items={materialData.colors} labelOf={id => materialData.labels.colors[id] ?? id}
            onChange={value => api.editWithImpact({kind: 'setMaterial', field: 'colorPalette', value: value || null})} />
          <MaterialSelect id="material-type-roles" label="역할 타이포그래피" value={doc.typeRoles ?? ''} items={materialData.types} labelOf={id => materialData.labels.types[id] ?? id}
            onChange={value => api.editWithImpact({kind: 'setMaterial', field: 'typeRoles', value: value || null})} />
          <MaterialSelect id="material-profile" label="Design Profile" value={doc.profile ?? ''} items={materialData.profiles} labelOf={id => id || '프로파일 없음'}
            onChange={value => api.editWithImpact({kind: 'setMaterial', field: 'profile', value: value || null})} />
        </div> : <p className={styles.muted}>2.6.0 재료를 불러오지 못했습니다.</p>}
      </section>

      <section className={styles.section} aria-labelledby="d-layout">
        <h3 id="d-layout" className={styles.sectionTitle}>구성 변형</h3>
        {origin ? (
          slots.length ? (
            <>
              <p className={styles.muted}>현재 문서에 적용합니다. 쓴 내용은 그대로이고, 내용을 둘 곳이 없으면 거부하고 이유를 알려 줍니다.</p>
              <div className={styles.axisGrid}>
                {slots.map(s => (
                  <Select key={s.id} id={`d-layout-${s.id}`} className={styles.field} label={s.label} value={origin.layout[s.id] ?? ''} placeholder="현재 구성 유지"
                    onChange={value => value && api.edit({kind: 'setLayout', slot: s.id, option: value, ...(choices.layout[s.id]?.get(value)?.relocate ? {relocate: true} : {})})}
                    options={s.options.map(o => {
                      const c = choices.layout[s.id]?.get(o.id);
                      const moves = !!c && !c.ok && c.relocate;
                      const blocked = !!c && !c.ok && !c.relocate;
                      // 콘텐츠를 옮겨 적용할 수 있는 변형은 비활성이 아니다(실행 취소로 되돌린다).
                      return {
                        value: o.id, label: `${o.label}${o.recommended ? '' : ' (권장 아님)'}${moves ? ' (콘텐츠를 옮겨 적용)' : ''}`,
                        disabled: blocked, reasonCode: blocked ? c.errors[0]?.code ?? '충돌' : undefined,
                        reason: moves ? '내용을 둘 곳이 없어 아래로 옮겨 적용합니다. 실행 취소로 되돌릴 수 있습니다.' : reason(c) ?? o.description,
                      };
                    })} />
                ))}
              </div>
            </>
          ) : <p className={styles.muted}>이 템플릿에는 고를 수 있는 구성 변형이 없습니다.</p>
        ) : <p className={styles.muted} data-testid="no-origin">가져온 문서는 출처 템플릿을 알 수 없어 구성 변형과 템플릿 기준 기능을 쓸 수 없습니다. 템플릿 바꾸기로 템플릿을 고르면 다시 쓸 수 있습니다.</p>}
      </section>
    </div>
  );
}

function MaterialSelect({id, label, value, items, labelOf, onChange}: {id: string; label: string; value: string; items: Choice[]; labelOf: (id: string) => string; onChange: (value: string) => void}) {
  const options: SelectOption[] = items.map(c => ({value: c.id, label: c.id ? labelOf(c.id) : '(없음)', ...verdict(c)}));
  return <Select id={id} className={styles.field} label={label} value={value} onChange={onChange} options={options} />;
}
