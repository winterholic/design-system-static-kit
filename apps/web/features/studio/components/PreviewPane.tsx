'use client';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useStudio} from '../context';
import {DEVICES, SCHEMES, type Device, type PreviewScheme} from '../types';
import {useNarrow} from '../useNarrow';
import {DiagnosticList} from './Banners';
import {Chip, ChipGroup} from '@/ui';
import styles from '../studio.module.css';

const DEVICE_LABEL: Record<Device, string> = {390: '모바일 390', 768: '태블릿 768', 1280: '데스크톱 1280'};
const SCHEME_LABEL: Record<PreviewScheme, string> = {document: '문서 설정대로', light: '라이트로 보기', dark: '다크로 보기'};

/** 무대(stage) 크기를 잰다. 배율 계산의 유일한 입력이다. */
function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({w: 0, h: 0});
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      setSize({w: Math.max(0, el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), h: Math.max(0, el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom))});
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export function PreviewPane() {
  const api = useStudio();
  const narrow = useNarrow();
  const {view, session} = api.state;
  const stage = useRef<HTMLDivElement>(null);
  const {w, h} = useSize(stage);
  const hidden = view.pane === 'edit' || (narrow && view.pane === 'split');
  const device = view.device;
  // 배율은 가로 폭에서만 정한다: 맞춤은 min(1, 무대 폭 / 기기 폭), 100%는 항상 1. 높이는 무대를 채우도록 역으로 늘린다.
  const scale = view.scaleMode === 'fit' && w > 0 ? Math.min(1, w / device) : 1;
  const html = session.lastValid?.html ?? '';
  const frameHeight = h > 0 ? Math.max(240, h / scale) : 600;
  const [swaps, setSwaps] = useState(0);
  const last = useRef('');
  useEffect(() => { if (html && html !== last.current) { last.current = html; setSwaps(n => n + 1); } }, [html]);

  return (
    <section className={styles.previewPane} aria-label="미리보기" hidden={hidden} data-testid="preview" data-scale={scale.toFixed(4)} data-device={device} data-compiles={api.compileCount} data-swaps={swaps}>
      <div className={styles.previewBar}>
        <ChipGroup label="미리보기 기기 폭" className={styles.barGroup}>
          {DEVICES.map(dv => <Chip key={dv} pressed={device === dv} onClick={() => api.navigate({device: dv}, 'replace')}>{DEVICE_LABEL[dv]}</Chip>)}
        </ChipGroup>
        <ChipGroup label="미리보기 배율" className={styles.barGroup}>
          <Chip pressed={view.scaleMode === 'fit'} onClick={() => api.setView({scaleMode: 'fit'})}>맞춤</Chip>
          <Chip pressed={view.scaleMode === 'actual'} onClick={() => api.setView({scaleMode: 'actual'})}>100%</Chip>
          <span className={styles.scaleText} data-testid="scale-text">{Math.round(scale * 100)}%</span>
        </ChipGroup>
        <ChipGroup label="미리보기 색 보기 (문서 모드는 바뀌지 않음)" className={styles.barGroup}>
          {SCHEMES.map(sc => <Chip key={sc} pressed={view.scheme === sc} onClick={() => api.setView({scheme: sc})}>{SCHEME_LABEL[sc]}</Chip>)}
        </ChipGroup>
      </div>
      {view.scheme !== 'document' ? <p className={styles.previewNote}>미리보기에서만 {view.scheme === 'dark' ? '다크' : '라이트'}로 보는 중입니다. 문서의 색 모드와 내보내기 결과는 그대로입니다.</p> : null}
      {session.compileErrors.length ? (
        <div className={styles.previewNote} role="alert">
          <p>이 상태로는 미리보기를 만들 수 없어 마지막으로 유효했던 화면을 보여 줍니다.</p>
          <DiagnosticList items={session.compileErrors} />
        </div>
      ) : null}
      <div ref={stage} className={styles.stage} data-scale-mode={view.scaleMode}>
        {html ? (
          <div className={styles.frameBox} style={{width: device * scale, height: frameHeight * scale}}>
            {/* sandbox="" : 스크립트·같은 출처·폼 제출·팝업 없이 렌더만 한다. srcdoc 갱신은 문서 이동이 아니라 history를 늘리지 않는다. */}
            <iframe title="문서 미리보기" sandbox="" srcDoc={html} className={styles.frame} style={{width: device, height: frameHeight, transform: `scale(${scale})`}} data-testid="preview-frame" />
          </div>
        ) : <p className={styles.muted} role="status">미리보기를 만드는 중입니다…</p>}
      </div>
    </section>
  );
}
