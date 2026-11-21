'use client';
import type {Diagnostic} from '../types';
import {useStudio} from '../context';
import styles from '../studio.module.css';

export function DiagnosticList({items, onJump}: {items: Diagnostic[]; onJump?: (d: Diagnostic) => boolean | void}) {
  return (
    <ul className={styles.diagList}>
      {items.map((d, i) => (
        <li key={`${d.code}:${d.path}:${i}`}>
          <p className={styles.diagHead}><code>{d.code}</code> <code>{d.path}</code></p>
          <p className={styles.diagMsg}>{d.message}</p>
          <p className={styles.diagHint}>해결: {d.hint}</p>
          {onJump ? <button type="button" className={styles.link} onClick={() => onJump(d)}>해당 노드로 이동</button> : null}
        </li>
      ))}
    </ul>
  );
}

// 문서 전체에 걸린 안내. 저장 실패·손상된 저장값에는 항상 복구 경로(원본 내보내기, 초기화)를 함께 준다.
export function Banners() {
  const api = useStudio();
  const {session} = api.state;
  const {recovery, storage, notices} = session;
  return (
    <div className={styles.banners}>
      {recovery ? (
        <section className={styles.banner} data-level="error" role="alert" aria-labelledby="recovery-title">
          <h3 id="recovery-title" className={styles.bannerTitle}>저장된 작업을 읽을 수 없어 자동 저장을 멈췄습니다</h3>
          <p>{recovery.reason}</p>
          <p>원본은 지우지 않았습니다. 먼저 원본을 내려받아 두고, 준비되면 저장값을 초기화해 자동 저장을 다시 켜세요.</p>
          <div className="btn-row">
            <button type="button" className={styles.tool} onClick={api.exportRecovery}>원본 JSON 내보내기</button>
            <button type="button" className={styles.tool} onClick={api.resetStorage}>저장값 초기화</button>
          </div>
        </section>
      ) : null}
      {storage.status === 'conflict' ? (
        <section className={styles.banner} data-level="warning" role="alert" aria-labelledby="conflict-title">
          <h3 id="conflict-title" className={styles.bannerTitle}>다른 탭에서 저장한 작업이 있어 자동 저장을 멈췄습니다</h3>
          <p>{storage.message}</p>
          <p>저장된 작업을 불러오면 이 탭의 변경은 버려지고, 덮어쓰면 다른 탭의 작업이 사라집니다. 먼저 JSON을 내려받아 두면 둘 다 지킬 수 있습니다.</p>
          <div className="btn-row">
            <button type="button" className={styles.tool} disabled={!api.state.document.doc} onClick={api.exportJson}>이 탭 JSON 내보내기</button>
            <button type="button" className={styles.tool} onClick={api.reloadSaved}>저장된 작업 불러오기</button>
            <button type="button" className={styles.tool} onClick={api.overwriteStorage}>이 탭 내용으로 덮어쓰기</button>
          </div>
        </section>
      ) : null}
      {storage.status === 'error' || storage.status === 'unavailable' ? (
        <section className={styles.banner} data-level="warning" role="alert" aria-labelledby="storage-title">
          <h3 id="storage-title" className={styles.bannerTitle}>{storage.status === 'error' ? '작업을 저장하지 못했습니다' : '이 브라우저에는 저장할 수 없습니다'}</h3>
          <p>{storage.message} 새로고침하면 지금 작업이 사라질 수 있습니다. 내보내기로 JSON을 받아 두세요.</p>
          <div className="btn-row">
            <button type="button" className={styles.tool} disabled={!api.state.document.doc} onClick={api.exportJson}>JSON 내보내기</button>
          </div>
        </section>
      ) : null}
      {notices.map(n => (
        <section key={n.id} className={styles.banner} data-level={n.level} role={n.level === 'error' ? 'alert' : 'status'}>
          <p>{n.text}</p>
          {n.details?.length ? <DiagnosticList items={n.details} /> : null}
          <button type="button" className={styles.link} onClick={() => api.dismissNotice(n.id)}>닫기</button>
        </section>
      ))}
    </div>
  );
}
