import type {Blueprint, Node, NodePath} from './types';

export const nodeAt = (doc: Blueprint | null, path: NodePath): Node | null => {
  let node: any = doc?.tree;
  for (const i of path) {
    node = node?.children?.[i];
    if (!node) return null;
  }
  return node ?? null;
};

export const pathExists = (doc: Blueprint | null, path: NodePath) => nodeAt(doc, path) !== null;

/** 존재하는 가장 가까운 조상으로 줄인다. Undo·Redo 뒤 선택이 사라진 노드를 가리키지 않게 한다. */
export function clampPath(doc: Blueprint | null, path: NodePath): NodePath {
  for (let n = path.length; n >= 0; n--) if (pathExists(doc, path.slice(0, n))) return path.slice(0, n);
  return [];
}

export const samePath = (a: NodePath, b: NodePath) => a.length === b.length && a.every((x, i) => x === b[i]);
export const pathKey = (p: NodePath) => (p.length ? p.join('.') : 'root');

export type TreeRow = {path: NodePath; depth: number; node: Node};
export function flattenTree(doc: Blueprint | null): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (node: Node, path: NodePath, depth: number) => {
    rows.push({path, depth, node});
    (node.children as Node[] | undefined)?.forEach((child, i) => walk(child, [...path, i], depth + 1));
  };
  if (doc?.tree) walk(doc.tree as Node, [], 0);
  return rows;
}

/**
 * 진단의 문서 경로를 선택 경로로 바꾼다. `$.tree.children[1].children[0].title` → {path:[1,0], field:'title'}.
 * `$args…`·`$.chrome…`처럼 트리 노드가 아닌 경로는 null이다. 노드 경로는 문서 안 위치라서, 같은 문서에 대한 오류에만 쓴다.
 */
export function parseDiagnosticPath(path: string): {path: NodePath; field: string | null} | null {
  if (!path.startsWith('$.tree')) return null;
  let rest = path.slice('$.tree'.length);
  const out: NodePath = [];
  for (;;) {
    const m = /^\.children\[(\d+)\]/.exec(rest);
    if (!m) break;
    out.push(Number(m[1]));
    rest = rest.slice(m[0].length);
  }
  const f = /^\.([A-Za-z_][A-Za-z0-9_-]*)/.exec(rest);
  return {path: out, field: f ? f[1] : null};
}

const SUMMARY_KEYS = ['title', 'label', 'name', 'text', 'eyebrow', 'body', 'value'];
export function nodeSummary(node: Node): string {
  for (const k of SUMMARY_KEYS) {
    const v = node[k];
    if (typeof v === 'string' && v.trim()) return v.length > 30 ? v.slice(0, 30) + '…' : v;
  }
  return '';
}
