/**
 * 미리보기 뷰포트: 결과물을 고정 폭(휴대폰 390 · 태블릿 768 · 데스크톱 1280)으로 그린 뒤 가용 영역에 맞춰 축소한다.
 * 가로로 밀려 잘리는 대신 항상 전체 폭이 보이고, 맞춤은 영역 폭 그대로(배율 1)로 그린다.
 */
export const DEVICES = {
  phone: {label: '휴대폰', width: 390, bezel: 7},
  tablet: {label: '태블릿', width: 768, bezel: 6},
  desktop: {label: '데스크톱', width: 1280, bezel: 1},
  fit: {label: '맞춤', width: null, bezel: 1},
};

/** 셸 크기와 배율을 계산한다. 순수 함수라 시험할 수 있다. */
export function layoutFrame({device, areaWidth, areaHeight}) {
  const d = DEVICES[device] ?? DEVICES.fit, bezel = d.bezel;
  const aw = Math.max(240, areaWidth), ah = Math.max(240, areaHeight);
  const frameW = d.width ?? Math.max(240, aw - bezel * 2);
  const scale = Math.min(1, (aw - bezel * 2) / frameW);
  const frameH = Math.max(320, Math.round((ah - bezel * 2) / scale));
  return {frameW, frameH, scale, shellW: Math.round(frameW * scale) + bezel * 2, shellH: Math.round(frameH * scale) + bezel * 2, device};
}

/** 한 무대(stage)에 iframe을 맞춰 넣는 컨트롤러. 영역 크기가 바뀌면 다시 계산한다. */
export function mountViewport({stage, shell, frame, getDevice, onChange = () => {}}) {
  const apply = () => {
    const cs = getComputedStyle(stage), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const result = layoutFrame({device: getDevice(), areaWidth: stage.clientWidth - padX, areaHeight: stage.clientHeight - padY});
    shell.dataset.device = result.device;
    shell.style.setProperty('--shell-w', result.shellW + 'px'); shell.style.setProperty('--shell-h', result.shellH + 'px');
    shell.style.setProperty('--frame-w', result.frameW + 'px'); shell.style.setProperty('--frame-h', result.frameH + 'px'); shell.style.setProperty('--scale', String(result.scale));
    onChange(result);
    return result;
  };
  const observer = new ResizeObserver(() => requestAnimationFrame(apply));
  observer.observe(stage);
  return {apply, destroy: () => observer.disconnect()};
}

/** 결과물을 새 창으로 연다. 같은 출처의 blob 문서이며 열린 창에서 이 페이지로 되돌아가는 연결(opener)은 끊는다. */
export function openInWindow(html) {
  const url = URL.createObjectURL(new Blob([html], {type: 'text/html;charset=utf-8'}));
  const win = window.open(url, '_blank');
  if (win) { try { win.opener = null; } catch { /* 교차 출처면 무시 */ } }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return !!win;
}
