'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useStudio} from '../context';
import {flattenTree, nodeAt, nodeSummary, pathKey, samePath} from '../paths';
import type {PartChoice} from '../core';
import type {Node, NodePath} from '../types';
import {NodeForm} from './NodeForm';
import {Button, Select} from '@/ui';
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
        <Button size="sm" disabled={!selection.length || index === 0} onClick={act(() => api.edit({kind: 'move', path: selection, index: (index ?? 0) - 1}))}>위로</Button>
        <Button size="sm" disabled={!selection.length || index === siblings.length - 1} onClick={act(() => api.edit({kind: 'move', path: selection, index: (index ?? 0) + 1}))}>아래로</Button>
        <Button size="sm" disabled={!selection.length} onClick={act(() => api.edit({kind: 'remove', path: selection}))}>삭제</Button>
      </div>
      <AddNode selection={selection} act={act} />

      <NodeForm key={pathKey(selection)} path={selection} />
    </div>
  );
}

const GROUP_LABEL: Record<string, string> = {structure: '구조', layout: '배치', data: '데이터', content: '콘텐츠', form: '폼', feedback: '상태', media: '미디어', nav: '이동'};

/**
 * 부품 추가. 후보는 Core가 실제 insertNode 연산으로 시험해 받아들인 부품뿐이다(src/edit의 addPlacements).
 * 자식 수 한도, 부모·자식 계약, 페이지 규칙은 여기서 다시 계산하지 않는다. 받을 수 없는 자리에는 목록 대신 이유를 보인다.
 */
function AddNode({selection, act}: {selection: NodePath; act: (fn: () => void) => () => void}) {
  const api = useStudio();
  const doc = api.state.document.doc!;
  const placements = useMemo(() => (api.core ? api.core.edit.addPlacements(doc, selection) : null), [api.core, doc, selection]);
  const parentPath = selection.slice(0, -1), index = selection.at(-1);
  const add = (where: 'inside' | 'after', type: string) => {
    const node = api.core?.edit.partExample(type);
    if (!node) return;
    if (where === 'inside') api.edit({kind: 'insert', parent: selection, node: node as Node});
    else api.edit({kind: 'insert', parent: parentPath, node: node as Node, index: (index ?? 0) + 1});
  };
  const isRoot = selection.length === 0;
  return (
    <div className={styles.addNode} role="group" aria-label="부품 추가">
      <AddGroup where="inside" title="선택한 노드 안에 추가" button="안에 추가" parts={placements?.inside.accepted ?? []} empty="이 노드 안에는 추가할 수 있는 부품이 없습니다." onAdd={type => act(() => add('inside', type))()} />
      <AddGroup where="after" title="선택한 노드 뒤에 추가" button="뒤에 추가" parts={placements?.after.accepted ?? []} empty={isRoot ? '페이지 루트는 형제가 없어 뒤에 추가할 자리가 없습니다.' : '이 자리 뒤에는 추가할 수 있는 부품이 없습니다.'} onAdd={type => act(() => add('after', type))()} />
    </div>
  );
}

function AddGroup({where, title, button, parts, empty, onAdd}: {where: 'inside' | 'after'; title: string; button: string; parts: PartChoice[]; empty: string; onAdd: (type: string) => void}) {
  const [picked, setPicked] = useState('');
  // 선택을 옮겨 후보가 바뀌면 이미 고른 부품이 더는 후보가 아닐 수 있다. 그때는 선택을 비운다.
  const type = parts.some(p => p.type === picked) ? picked : '';
  const id = `add-${where}-type`;
  return (
    <div className={styles.addGroup} role="group" aria-label={title}>
      <h4 className={styles.addTitle}>{title}</h4>
      {parts.length ? (
        <>
          <Select id={id} label={`${where === 'inside' ? '안에 넣을 부품' : '뒤에 넣을 부품'} (${parts.length}개)`} value={type} placeholder="부품 고르기" onChange={setPicked}
            options={parts.map(p => ({value: p.type, label: p.label, group: GROUP_LABEL[p.group] ?? p.group}))} />
        </>
      ) : <p className={styles.muted}>{empty}</p>}
      <Button size="sm" disabled={!type} onClick={() => onAdd(type)}>{button}</Button>
    </div>
  );
}
