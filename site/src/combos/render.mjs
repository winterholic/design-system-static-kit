import {findCombo, renderCombo, viewFromQuery} from '../combos.mjs';

/** 조합 하나를 화면 전체에 그대로 그린다(?c=id&theme=&tv=&pal=&mode=). 폰에서는 실제 폭으로 보이는 가장 정직한 미리보기다. */
const params = new URLSearchParams(location.search), combo = findCombo(params.get('c'));
if (!combo) {
  document.body.innerHTML = '<p style="font:14px system-ui;padding:16px">알 수 없는 조합입니다. <a href="./">전체 조합 목록으로</a></p>';
} else {
  const result = renderCombo(combo, viewFromQuery(params));
  if (!result.ok) document.body.innerHTML = '<p style="font:14px system-ui;padding:16px" role="alert">이 조합을 만들지 못했습니다: ' + result.error.replace(/</g, '&lt;') + '</p>';
  else { document.open(); document.write(result.html); document.close(); }
}
