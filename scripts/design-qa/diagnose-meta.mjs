// 진단의 심각도 표와 등급 규칙. diagnose.mjs(브라우저를 띄우는 실행기)와 grades.mjs·시험이 같은 표를 읽는다.
export const SEVERE = new Set(['EMPTY_CELL', 'BIG_NARROW', 'HIER_INVERT', 'TIGHT_ROW', 'GRID_ORPHAN', 'OVERFLOW_X', 'CLIP_TEXT', 'EDGE_VIEW', 'HEAD_GAP', 'PROXIMITY', 'EDGE', 'PAD_ASYM', 'PAIR_GAP', 'CTRL_WRAP', 'VALUE_WRAP', 'HEAD_ORPHAN', 'NARROW_COL']);
export const grade = codes => { const names = Object.keys(codes); return !names.length ? 'A' : names.some(c => SEVERE.has(c)) ? 'C' : 'B'; };
