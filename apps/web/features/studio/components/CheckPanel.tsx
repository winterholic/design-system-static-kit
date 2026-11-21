'use client';
import {useStudio} from '../context';
import {DiagnosticList} from './Banners';
import styles from '../studio.module.css';

export function CheckPanel() {
  const api = useStudio();
  const {document: d, session} = api.state;
  const compileWarnings = session.lastValid?.warnings ?? [];
  const warnings = [...session.warnings, ...compileWarnings, ...d.validity.warnings];
  return (
    <div className={styles.check}>
      <h3 className={styles.panelTitle}>검증 결과</h3>
      <p role="status" data-testid="validity">
        {d.validity.ok ? '문서가 카탈로그 규칙을 통과했습니다.' : '문서가 규칙을 통과하지 못했습니다.'}
        {session.compileErrors.length ? ' 미리보기를 만들지 못해 마지막 유효 화면을 보여 줍니다.' : ''}
      </p>
      {session.error ? (
        <>
          <h4 className={styles.sectionTitle}>마지막으로 거부된 변경 ({session.error.errors.length})</h4>
          <DiagnosticList items={session.error.errors} onJump={x => api.jumpTo(x)} />
        </>
      ) : null}
      {d.validity.errors.length ? (
        <>
          <h4 className={styles.sectionTitle}>문서 오류 ({d.validity.errors.length})</h4>
          <DiagnosticList items={d.validity.errors} onJump={x => api.jumpTo(x)} />
        </>
      ) : null}
      {session.compileErrors.length ? (
        <>
          <h4 className={styles.sectionTitle}>컴파일 오류 ({session.compileErrors.length})</h4>
          <DiagnosticList items={session.compileErrors} onJump={x => api.jumpTo(x)} />
        </>
      ) : null}
      <h4 className={styles.sectionTitle}>경고 ({warnings.length})</h4>
      {warnings.length ? <DiagnosticList items={warnings.map(w => ({...w, hint: w.hint ?? '필요하면 실행 취소로 되돌리세요.'}))} onJump={x => api.jumpTo(x)} /> : <p className={styles.muted}>경고가 없습니다.</p>}
    </div>
  );
}
