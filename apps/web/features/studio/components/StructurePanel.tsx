'use client';
import {useEffect, useRef} from 'react';
import {specOf} from '../catalog';
import {useStudio} from '../context';
import {flattenTree, nodeAt, nodeSummary, pathKey, samePath} from '../paths';
import type {Node, NodePath} from '../types';
import {NodeForm} from './NodeForm';
import styles from '../studio.module.css';

export function StructurePanel() {
  const api = useStudio();
  const {document: d, session, view} = api.state;
  const doc = d.doc!;
  const {selection} = session;
  const treeRef = useRef<HTMLDivElement>(null);
  const focusTree = useRef(false);
  const rows = flattenTree(doc);
  const labelOf = (type: string) => api.catalog?.components.find(c => c.type === type)?.label ?? type;
  const node = nodeAt(doc, selection) as Node;
  const parentPath = selection.slice(0, -1), index = selection.at(-1);
  const siblings = selection.length ? ((nodeAt(doc, parentPath)?.children as Node[]) ?? []) : [];

  const focusRow = (path: NodePath) => treeRef.current?.querySelector<HTMLElement>(`[data-path="${pathKey(path)}"]`)?.focus();

  // 조작 뒤 선택 행으로 초점을 돌려 준다(눌렀던 버튼이 비활성이 되거나 사라져도 초점을 잃지 않는다).
  // 다음 렌더 한 번만 소비한다(실패한 연산 뒤에도 렌더는 일어나므로 깃발이 남아 다른 입력의 초점을 빼앗지 않는다).
  useEffect(() => {
    if (focusTree.current) { focusTree.current = false; focusRow(selection); }
  });
  // 오류 목록에서 이동해 오면 해당 필드(또는 행)에 초점을 둔다. 필드는 NodeForm이 처리한다.
  useEffect(() => {
    if (view.focusRequest && view.focusRequest.field === null) focusRow(view.focusRequest.path);
  }, [view.focusRequest]);

  const onKey = (e: React.KeyboardEvent) => {
    const i = rows.findIndex(r => samePath(r.path, selection));
    const next = e.key === 'ArrowDown' ? rows[Math.min(i + 1, rows.length - 1)] : e.key === 'ArrowUp' ? rows[Math.max(i - 1, 0)] : e.key === 'Home' ? rows[0] : e.key === 'End' ? rows[rows.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    api.select(next.path);
    focusTree.current = true;
  };

  const act = (fn: () => void) => () => { focusTree.current = true; fn(); };
  const spec = api.core ? specOf(api.core, node.type ?? 'page') : null;
  const parentNode = selection.length ? nodeAt(doc, parentPath) : null;
  const parentSpec = parentNode && api.core ? specOf(api.core, parentNode.type) : null;
  const childAllowed = selection.length === 0 ? api.catalog?.components.find(c => c.type === 'page')?.childTypes ?? [] : spec?.children?.allowed ?? [];
  const siblingAllowed = selection.length === 0 ? [] : parentNode?.type === 'page' ? api.catalog?.components.find(c => c.type === 'page')?.childTypes ?? [] : parentSpec?.children?.allowed ?? [];
  const insertable = api.catalog?.components.filter(c => c.type !== 'page').map(c => c.type) ?? [];

  return (
    <div className={styles.structure}>
      <h3 className={styles.panelTitle}>문서 구조</h3>
      <div ref={treeRef} className={styles.tree} role="tree" aria-label="문서 구조" onKeyDown={onKey} data-testid="tree">
        {rows.map(r => {
          const selected = samePath(r.path, selection);
          const isRoot = r.path.length === 0;
          return (
            <div key={pathKey(r.path)} role="treeitem" aria-level={r.depth + 1} aria-selected={selected} tabIndex={selected ? 0 : -1} data-path={pathKey(r.path)}
              className={styles.treeRow} style={{paddingInlineStart: `calc(var(--space-3) + ${r.depth} * var(--space-4))`}}
              onClick={() => api.select(r.path)}>
              <span className={styles.treeType}>{isRoot ? '페이지' : labelOf(r.node.type)}</span>
              <span className={styles.treeText}>{isRoot ? String(doc.name) : nodeSummary(r.node)}</span>
            </div>
          );
        })}
      </div>

      <div className={styles.nodeActions} role="group" aria-label="선택한 노드 작업">
        <button type="button" className={styles.tool} disabled={!selection.length || index === 0} onClick={act(() => api.edit({kind: 'move', path: selection, index: (index ?? 0) - 1}))}>위로</button>
        <button type="button" className={styles.tool} disabled={!selection.length || index === siblings.length - 1} onClick={act(() => api.edit({kind: 'move', path: selection, index: (index ?? 0) + 1}))}>아래로</button>
        <button type="button" className={styles.tool} disabled={!selection.length} onClick={act(() => api.edit({kind: 'remove', path: selection}))}>삭제</button>
      </div>
      <AddNode selection={selection} insertable={insertable} childAllowed={childAllowed} siblingAllowed={siblingAllowed} index={index} parentPath={parentPath} act={act} />

      <NodeForm key={pathKey(selection)} path={selection} />
    </div>
  );
}

function AddNode({selection, insertable, childAllowed, siblingAllowed, index, parentPath, act}: {selection: NodePath; insertable: string[]; childAllowed: string[]; siblingAllowed: string[]; index: number | undefined; parentPath: NodePath; act: (fn: () => void) => () => void}) {
  const api = useStudio();
  const ref = useRef<HTMLSelectElement>(null);
  const label = (t: string) => api.catalog?.components.find(c => c.type === t)?.label ?? t;
  const build = (type: string) => {
    const spec = api.core ? specOf(api.core, type) : null;
    return spec?.example ? structuredClone(spec.example) : null;
  };
  const add = (where: 'child' | 'after') => {
    const type = ref.current?.value ?? '';
    const node = type ? build(type) : null;
    if (!node) return;
    if (where === 'child') api.edit({kind: 'insert', parent: selection, node});
    else api.edit({kind: 'insert', parent: parentPath, node, index: (index ?? 0) + 1});
  };
  return (
    <div className={styles.addNode} role="group" aria-label="부품 추가">
      <label className={styles.fieldLabel} htmlFor="add-type">추가할 부품</label>
      <select id="add-type" ref={ref} className={styles.select} defaultValue="" onChange={() => undefined}>
        <option value="" disabled>부품 고르기</option>
        {insertable.map(t => <option key={t} value={t}>{label(t)}{childAllowed.includes(t) ? '' : siblingAllowed.includes(t) ? ' (뒤에만)' : ' (여기엔 불가)'}</option>)}
      </select>
      <div className={styles.nodeActions}>
        <button type="button" className={styles.tool} onClick={act(() => add('child'))}>선택한 노드 안에 추가</button>
        <button type="button" className={styles.tool} disabled={!selection.length} onClick={act(() => add('after'))}>선택한 노드 뒤에 추가</button>
      </div>
    </div>
  );
}
