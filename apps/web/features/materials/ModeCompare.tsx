import type {CSSProperties} from 'react';
import type {ColorView} from './types';
import styles from './materials.module.css';

/**
 * 같은 화면 조각을 라이트와 다크의 역할 색으로 나란히 그린다. 변수 값은 Core 계산 결과(scenes)를 그대로 심고, 이 파일은 어디에 쓰는지만 정한다.
 * 장식용 예시라서 스크린리더에서는 숨기고, 위에 같은 정보를 담은 토큰 목록이 있다.
 */
export function ModeCompare({scenes}: {scenes: ColorView['scenes']}) {
  return (
    <div className={styles.compare}>
      {(['light', 'dark'] as const).map(mode => (
        <figure key={mode} className={styles.scene} data-mode={mode}>
          <figcaption className={styles.sceneCaption}>{mode === 'light' ? '라이트' : '다크'}</figcaption>
          <div className={styles.sceneBody} style={scenes[mode] as CSSProperties} aria-hidden="true">
            <div className={styles.sceneCard}>
              <p className={styles.sceneTitle}>분기 요약</p>
              <p className={styles.sceneMuted}>지난 분기보다 12% 늘었습니다. <span className={styles.sceneLink}>자세히 보기</span></p>
              <div className={styles.sceneRow}>
                <span className={styles.sceneBtn}>저장</span>
                <span className={styles.sceneBtn} data-state="hover">누른 상태</span>
                <span className={styles.sceneBtn} data-state="disabled">비활성</span>
              </div>
              <div className={styles.sceneRow}>
                <span className={styles.sceneField}>입력 값</span>
                <span className={styles.sceneField} data-state="error">오류 상태</span>
              </div>
              <div className={styles.sceneRow}>
                {(['success', 'warning', 'danger', 'info'] as const).map(s => <span key={s} className={styles.sceneChip} data-tone={s}>{({success: '성공', warning: '주의', danger: '오류', info: '정보'})[s]}</span>)}
              </div>
              <div className={styles.sceneBars}>
                {[1, 2, 3, 4, 5, 6].map(i => <span key={i} className={styles.sceneBar} style={{'--bar': `var(--kit-chart${i})`, height: `${28 + ((i * 17) % 40)}px`} as CSSProperties} />)}
              </div>
            </div>
          </div>
        </figure>
      ))}
    </div>
  );
}
