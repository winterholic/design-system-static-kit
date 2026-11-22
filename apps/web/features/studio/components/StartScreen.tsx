'use client';
import {useStudio} from '../context';
import styles from '../studio.module.css';
import {Button} from '@/ui';
import {Select} from '@/ui';
import Link from 'next/link';
import {useState} from 'react';
import {PURPOSES} from '@/features/platform/labels';

export function StartScreen() {
  const api = useStudio();
  const [profile, setProfile] = useState('');
  const [choosingProfile, setChoosingProfile] = useState(false);
  const profileSchema = api.core?.service.getSchema({target: 'blueprint', fields: ['profile']});
  const profiles = profileSchema?.ok ? profileSchema.value.properties.profile?.enum ?? [] : [];
  return (
    <section className={styles.start} aria-labelledby="start-title">
      <h2 id="start-title" className={styles.startTitle}>무엇으로 시작할까요?</h2>
      <p className={styles.startLead}>만들 페이지 유형을 고르면 디자인 방향과 후보를 비교하며 조립합니다. 이미 가진 문서가 있으면 아래에서 템플릿이나 JSON으로 이어서 편집합니다.</p>
      <ul className={styles.startPurposes} aria-label="페이지 유형으로 조립 시작" data-testid="start-purposes">
        {PURPOSES.map(p => <li key={p.id}><Link href={`/studio/assemble?purpose=${p.id}&step=direction`} className={styles.startPurpose}><strong>{p.label}</strong><span>{p.blurb}</span></Link></li>)}
      </ul>
      <h3 className={styles.startSub}>기존 문서 편집</h3>
      <p className={styles.startLead}>템플릿에서 시작하거나 가지고 있는 설계 JSON을 가져옵니다. 편집 내용은 이 브라우저에 자동 저장됩니다.</p>
      <div className="btn-row">
        <Button variant="primary" onClick={() => api.withCore(() => api.edit({kind: 'start', request: {}}))}>기본 템플릿으로 시작</Button>
        <Button variant="secondary" onClick={() => api.withCore(() => api.edit({kind: 'start', request: {catalogVersion: '2.6.0'}}))}>2.6.0 템플릿으로 시작</Button>
        <Button variant="secondary" onClick={() => api.withCore(() => api.openDialog({kind: 'template'}))}>템플릿 고르기</Button>
        <Button variant="secondary" onClick={() => api.withCore(() => api.openDialog({kind: 'import'}))}>JSON 가져오기</Button>
      </div>
      {!choosingProfile ? <Button onClick={() => api.withCore(() => setChoosingProfile(true))}>Design Profile로 시작</Button> : profiles.length ? <div className="btn-row">
        <Select id="start-profile" label="Design Profile" value={profile} placeholder="프로파일 고르기"
          options={profiles.map(id => ({value: id, label: id}))} onChange={setProfile} />
        <Button disabled={!profile} onClick={() => api.withCore(() => api.edit({kind: 'start', request: {profile}}))}>프로파일 적용</Button>
      </div> : <p role="status">Design Profile 목록을 불러오는 중입니다…</p>}
    </section>
  );
}
