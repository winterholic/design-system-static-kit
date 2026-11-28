/** Browser interactions added by the opt-in 2.7 form-control families. */
export function attachFormControls(root, {onChange} = {}) {
  const doc = root.ownerDocument;
  if (root.matches('[data-range-slider]')) {
    const fields = [...root.querySelectorAll('[data-range-edge]')], low = fields.find(field => field.dataset.rangeEdge === 'low'), high = fields.find(field => field.dataset.rangeEdge === 'high');
    if (low && high) for (const field of fields) field.addEventListener('input', () => {
      if (Number(low.value) > Number(high.value)) field.value = field.dataset.rangeEdge === 'low' ? high.value : low.value;
      if (typeof onChange === 'function') onChange({id: field.id, value: {low: low.value, high: high.value}});
    });
    return;
  }
  if (root.matches('[data-date-range]')) {
    // 시작일·종료일: 사용자가 바꾼 값에 맞춰 서로의 상한·하한을 옮기고, 순서가 뒤집히면 이유를 네이티브 검증 메시지로 남긴다.
    const fields = [...root.querySelectorAll('input[type="date"]')], start = fields.find(field => field.dataset.rangeEdge === 'low'), end = fields.find(field => field.dataset.rangeEdge === 'high');
    if (start && end) {
      const hardMin = start.getAttribute('min') ?? '', hardMax = end.getAttribute('max') ?? '';
      const sync = () => {
        if (end.value) start.max = end.value; else if (hardMax) start.max = hardMax; else start.removeAttribute('max');
        if (start.value) end.min = start.value; else if (hardMin) end.min = hardMin; else end.removeAttribute('min');
        const reversed = Boolean(start.value && end.value && start.value > end.value);
        start.setCustomValidity(reversed ? '시작일은 종료일보다 늦을 수 없습니다.' : '');
        end.setCustomValidity(reversed ? '종료일은 시작일보다 빠를 수 없습니다.' : '');
        if (typeof onChange === 'function') onChange({id: start.id, value: {start: start.value, end: end.value}});
      };
      for (const field of fields) field.addEventListener('input', sync);
      sync();
    }
    return;
  }
  if (root.matches('[data-checkbox-group]')) {
    const fields = [...root.querySelectorAll('input[type="checkbox"]')];
    if (!fields.length) throw new TypeError('Checkbox group is incomplete');
    const validate = () => {
      const missing = root.dataset.required === 'true' && !fields.some(field => field.checked);
      fields[0].setCustomValidity(missing ? '하나 이상 선택하세요.' : '');
      fields[0].setAttribute('aria-invalid', String(missing || root.dataset.invalid === 'true'));
    };
    fields.forEach(field => field.addEventListener('change', () => {
      validate();
      if (typeof onChange === 'function') onChange({id: fields[0].name, value: fields.filter(item => item.checked).map(item => item.value)});
    }));
    validate();
    return;
  }
  if (root.matches('[data-tags-widget]')) {
    const field = root.querySelector('[data-tag-input]'), list = root.querySelector('[data-tags-list]'), status = root.querySelector('[data-tags-status]');
    if (!field || !list || !status) throw new TypeError('Tag input is incomplete');
    const current = () => [...root.querySelectorAll('[data-tag-value]')].map(item => item.value);
    const validate = () => {
      const missing = root.dataset.tagsRequired === 'true' && current().length === 0;
      field.setCustomValidity(missing ? '하나 이상의 태그를 입력하세요.' : '');
      field.setAttribute('aria-invalid', String(missing));
    };
    validate();
    let duplicates = [];
    const add = raw => {
      const value = String(raw).trim();
      if (!value) return false;
      if (current().some(item => item.toLocaleLowerCase() === value.toLocaleLowerCase())) { duplicates.push(value); return false; }
      const li = doc.createElement('li'), text = doc.createElement('span'), remove = doc.createElement('button'), hidden = doc.createElement('input');
      text.textContent = value; remove.type = 'button'; remove.dataset.tagRemove = ''; remove.className = 'pf-native-tag-remove'; remove.setAttribute('aria-label', `${value} 태그 삭제`); remove.textContent = '×';
      hidden.type = 'hidden'; hidden.name = root.dataset.tagsName; hidden.value = value; hidden.dataset.tagValue = '';
      li.append(text, remove, hidden); list.append(li); validate(); return true;
    };
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault(); duplicates = []; const typed = field.value.trim(), added = field.value.split(',').map(add).some(Boolean); field.value = '';
        status.textContent = added ? '태그를 추가했습니다.' : duplicates.length ? `${duplicates[0]} 태그는 이미 있습니다.` : typed ? '새 태그를 입력하세요.' : '추가할 태그를 입력하세요.';
        if (added && typeof onChange === 'function') onChange({id: field.id, value: current()});
      } else if (event.key === 'Backspace' && !field.value && list.lastElementChild) {
        list.lastElementChild.remove(); validate(); status.textContent = '마지막 태그를 삭제했습니다.';
        if (typeof onChange === 'function') onChange({id: field.id, value: current()});
      }
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-tag-remove]'); if (!button) return;
      const item = button.closest('li'), value = item?.querySelector('span')?.textContent; item?.remove(); validate();
      status.textContent = value ? `${value} 태그를 삭제했습니다.` : '태그를 삭제했습니다.'; field.focus();
      if (typeof onChange === 'function') onChange({id: field.id, value: current()});
    });
    return;
  }
  if (root.matches('[data-file-drop]')) {
    const field = root.querySelector('input[type=file]'), status = root.querySelector('[data-file-drop-status]');
    if (!field || !status) throw new TypeError('File drop input is incomplete');
    root.addEventListener('dragover', event => { if (field.disabled) return; event.preventDefault(); root.dataset.dragging = 'true'; });
    root.addEventListener('dragleave', () => { delete root.dataset.dragging; });
    root.addEventListener('drop', event => {
      event.preventDefault(); delete root.dataset.dragging; if (field.disabled) return;
      const candidates = [...(event.dataTransfer?.files ?? [])], accepts = (field.accept || '').split(',').map(rule => rule.trim().toLocaleLowerCase()).filter(Boolean);
      const matches = file => !accepts.length || accepts.some(rule => rule.startsWith('.') ? file.name.toLocaleLowerCase().endsWith(rule) : rule.endsWith('/*') ? file.type.toLocaleLowerCase().startsWith(rule.slice(0, -1)) : file.type.toLocaleLowerCase() === rule);
      let files = candidates.filter(matches); if (!field.multiple) files = files.slice(0, 1);
      const transfer = new doc.defaultView.DataTransfer(); files.forEach(file => transfer.items.add(file)); field.files = transfer.files;
      field.dispatchEvent(new doc.defaultView.Event('change', {bubbles: true}));
      status.textContent = files.length ? `${files.length}개 파일을 선택했습니다.${files.length < candidates.length ? ` ${candidates.length - files.length}개 파일은 허용 형식이 아니어서 제외했습니다.` : ''}` : candidates.length ? '허용 형식의 파일이 없습니다.' : '놓인 파일이 없습니다.';
      if (typeof onChange === 'function') onChange({id: field.id, files});
    });
  }
}
export const formControlRuntime = attachFormControls.toString();
