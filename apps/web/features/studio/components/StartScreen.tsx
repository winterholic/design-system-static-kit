'use client';
import {useStudio} from '../context';
import styles from '../studio.module.css';
import {Button} from '@/ui';

export function StartScreen() {
  const api = useStudio();
  return (
    <section className={styles.start} aria-labelledby="start-title">
      <h2 id="start-title" className={styles.startTitle}>무엇으로 시작할까요?</h2>
      <p className={styles.startLead}>템플릿에서 시작하거나 가지고 있는 설계 JSON을 가져옵니다. 편집 내용은 이 브라우저에 자동 저장됩니다.</p>
      <div className="btn-row">
        <Button variant="primary" onClick={() => api.withCore(() => api.edit({kind: 'start', request: {}}))}>기본 템플릿으로 시작</Button>
        <Button variant="secondary" onClick={() => api.withCore(() => api.openDialog({kind: 'template'}))}>템플릿 고르기</Button>
        <Button variant="secondary" onClick={() => api.withCore(() => api.openDialog({kind: 'import'}))}>JSON 가져오기</Button>
      </div>
    </section>
  );
}
