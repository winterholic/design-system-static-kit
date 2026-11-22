import Link from 'next/link';
import {PageShell} from '@/shell/PageShell';
import {MaterialsNav} from '@/features/materials/MaterialsNav';
import {typeView} from '@/features/materials/materials.server';
import {studioForPreset} from '@/features/materials/studio-link';
import {ButtonLink} from '@/ui';
import styles from '@/features/materials/materials.module.css';

export const metadata = {title: '타이포그래피 · Materials', description: '역할형 타이포그래피 프리셋의 역할별 글자 스타일, 다국어 시험 문구, 컨트롤 크기를 확인합니다.'};

type Props = {searchParams: Promise<Record<string, string | string[] | undefined>>};
const ROLE_LABEL: Record<string, string> = {display: '디스플레이', heading: '제목', body: '본문', label: '라벨', caption: '캡션', numeric: '숫자', code: '코드'};
const SIZE_LABEL: Record<string, string> = {compact: '아주 작음', small: '작음', medium: '보통', large: '큼'};
const POLICY_LABEL: Record<string, string> = {wrap: '줄바꿈', nowrap: '한 줄 유지', scroll: '가로 스크롤'};
const DENSITY_LABEL: Record<string, string> = {compact: '촘촘함', relaxed: '여유로움'};

/** 줄을 바꾸지 않는 문구(한 줄 유지·코드)는 좁은 화면에서 가로로 밀어 끝까지 볼 수 있는 영역에 둔다. */
function Sample({role, policy, text}: {role: string; policy: string; text: string}) {
  const p = <p className={`mt-role-${role}`}>{text}</p>;
  return policy === 'wrap' ? p : <div className={styles.codeScroll} data-layout-scroll tabIndex={0} role="region" aria-label={`${ROLE_LABEL[role] ?? role} 예시 (가로로 스크롤)`}>{p}</div>;
}

export default async function TypographyPage({searchParams}: Props) {
  const view = typeView();
  const asked = (await searchParams).preset;
  const preset = view.presets.find(p => p.id === (Array.isArray(asked) ? asked[0] : asked)) ?? view.presets[0];
  const sample = (role: string) => view.corpus.find(c => c.role === role)?.text ?? '';
  const roleNames = view.presets[0].roles.map(r => r.name);
  const template = view.studioTemplates[preset.id];

  return (
    <PageShell eyebrow="Materials · 타이포그래피" title="역할로 나눈 글자 스타일" lead="프리셋마다 디스플레이부터 코드까지 일곱 역할의 크기와 굵기, 행간, 자간이 정해져 있습니다. 한글과 영문, 숫자가 섞인 문구로 줄바꿈까지 시험합니다.">
      <MaterialsNav current="typography" />
      <style>{preset.css}</style>

      <nav className={styles.presetNav} aria-label="프리셋">
        {view.presets.map(p => <Link key={p.id} href={`/materials/typography?preset=${p.id}`} className={styles.presetLink} aria-current={p.id === preset.id ? 'page' : undefined} scroll={false}>{p.label}</Link>)}
      </nav>
      <div className={styles.actions}>
        <ButtonLink href={studioForPreset(preset.id, template)}>Studio에서 사용하기</ButtonLink>
      </div>
      <p className={styles.muted}>Studio 문서에 {preset.label} 역할 타이포그래피를 적용합니다. 글자 역할·컨트롤 크기가 미리보기와 내보내기에 반영됩니다.</p>

      <h2 className="section-title">{preset.label} 프리셋</h2>
      <p className={styles.presetFacts}>
        <span>어울리는 화면: {preset.context.join(', ')}</span>
        <span>밀도: {DENSITY_LABEL[preset.density] ?? preset.density}</span>
      </p>

      <div className={`mt-specimen ${styles.specimen}`} data-preset={preset.id} data-density={preset.density}>
        <h3 className={styles.subTitle}>역할별 글자 스타일</h3>
        <ul className={styles.roleList} data-testid="role-list">
          {preset.roles.map(r => (
            <li key={r.name} className={styles.role}>
              <div className={styles.roleMeta}>
                <span className={styles.roleName}>{ROLE_LABEL[r.name] ?? r.name}</span>
                <span>크기 {r.size} · 굵기 {r.weight}</span>
                <span>행간 {r.lineHeight} · 자간 {r.tracking}em</span>
                <span>{POLICY_LABEL[r.policy] ?? r.policy} · {r.fontFamily}</span>
              </div>
              <div className={styles.roleSample}><Sample role={r.name} policy={r.policy} text={sample(r.name)} /></div>
            </li>
          ))}
        </ul>

        <h2 className="section-title">다국어 시험 문구</h2>
        <p className={styles.intro}>한글, 영문, 섞인 문장, 공백 없는 긴 한글, 날짜·금액·퍼센트, 코드, 기호를 같은 프리셋 역할로 그렸습니다.</p>
        <ul className={styles.corpus}>
          {view.corpus.map(c => (
            <li key={c.id} className={styles.corpusItem} data-sample={c.id}>
              <span className={styles.corpusTag}>{ROLE_LABEL[c.role] ?? c.role} · {POLICY_LABEL[c.policy] ?? c.policy}</span>
              <Sample role={c.role} policy={c.policy} text={c.text} />
            </li>
          ))}
        </ul>

        <h2 className="section-title">컨트롤 크기 {preset.controls.length}단계</h2>
        <p className={styles.intro}>버튼과 입력이 쓰는 높이, 좌우 여백, 아이콘 크기입니다. 라벨 글자는 위 역할 스타일을 따르고 높이는 4px 격자에 맞습니다.</p>
        <ul className={styles.controlRow}>
          {preset.controls.map(c => (
            <li key={c.size} className={styles.controlItem}>
              <span className={`mt-control mt-role-${c.labelRole} ${styles.mtControl}`} data-size={c.size}>
                <span className={`mt-control-icon ${styles.mtIcon}`} aria-hidden="true" />
                {SIZE_LABEL[c.size] ?? c.size}
              </span>
              <span className={styles.controlSpec}>{c.size} · 높이 {c.height}px · 여백 {c.padX}px · 아이콘 {c.iconPx}px</span>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="section-title">네 프리셋 비교</h2>
      <div className={styles.tableWrap} data-layout-scroll tabIndex={0} role="region" aria-label="프리셋 비교 표 (가로로 스크롤)">
        <table className={styles.table}>
          <thead><tr><th scope="col">역할</th>{view.presets.map(p => <th scope="col" key={p.id}>{p.label}</th>)}</tr></thead>
          <tbody>
            {roleNames.map(name => (
              <tr key={name}>
                <th scope="row">{ROLE_LABEL[name] ?? name}</th>
                {view.presets.map(p => { const r = p.roles.find(x => x.name === name)!; return <td key={p.id} className={styles.num}>{r.size} · {r.weight}</td>; })}
              </tr>
            ))}
            <tr>
              <th scope="row">컨트롤 높이</th>
              {view.presets.map(p => <td key={p.id} className={styles.num}>{p.controls.map(c => c.height).join(' / ')}px</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
