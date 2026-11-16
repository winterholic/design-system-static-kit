import {SPACE} from './spacing.mjs';
import {CPL_BUCKETS, VL_BUCKETS, valueUnits} from './render/util.mjs';

const DENSITIES = new Set(Object.keys(SPACE));
const PROSE_MIN = CPL_BUCKETS[7];
const PROSE_MAX = CPL_BUCKETS[9];
const ATOMIC_MAX = CPL_BUCKETS[11];
const MIN_CELL_UNITS = VL_BUCKETS[0];
const QUANTITY = /^[-+]?₩?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[천만억조](?:원)?|%|원|₩|달러|명|건|개|ms|s)?$/i;
const HAS_NUMERIC_SIGNAL = /[,%]|[천만억조원₩]|달러|명|건|개|ms|s/i;
const roundUp = n => Math.ceil(n / 4) * 4;

function quantityColumn(values) {
  const present = values.filter(value => value !== '');
  return present.length > 0 && present.every(value => QUANTITY.test(value)) && present.some(value => HAS_NUMERIC_SIGNAL.test(value));
}

function columnPlan(label, values, index, density, paddingInline) {
  const headerUnits = valueUnits(label);
  const dataUnits = values.map(valueUnits);
  const longest = Math.max(0, ...dataUnits);
  const longText = values.some(value => valueUnits(value) > PROSE_MIN && /\s/.test(value));
  const atomic = values.every(value => !/\s/.test(value));
  const contentUnits = longText
    ? Math.min(PROSE_MAX, Math.max(PROSE_MIN, headerUnits, longest))
    : Math.min(ATOMIC_MAX, Math.max(MIN_CELL_UNITS, headerUnits, longest));
  const cellSpace = SPACE[density].item;

  return {
    index,
    minWidth: roundUp(contentUnits * cellSpace + 2 * paddingInline),
    align: quantityColumn(values) ? 'end' : 'start',
    wrap: longText && !atomic ? 'words' : 'nowrap',
  };
}

/**
 * Derive a closed table layout contract from the existing table node and its
 * compiler decision metadata. Width units reuse valueUnits and the density
 * item token; no Blueprint styling or header-name heuristics are accepted.
 */
export function deriveTableDesign(node, decision, {availableWidth} = {}) {
  if (node?.type !== 'table') throw new TypeError('Table design requires a table node');
  if (!Array.isArray(node.columns) || node.columns.length < 2 || node.columns.length > 8) {
    throw new RangeError('Table design requires 2–8 columns');
  }
  if (!Array.isArray(node.rows) || node.rows.some(row => !Array.isArray(row) || row.length !== node.columns.length)) {
    throw new TypeError('Every table row must match the column count');
  }
  if (node.columns.some(column => typeof column !== 'string') || node.rows.flat().some(value => typeof value !== 'string')) {
    throw new TypeError('Table labels and cells must be strings');
  }

  const density = DENSITIES.has(decision?.facts?.density) ? decision.facts.density : 'comfortable';
  const paddingInline = SPACE[density][decision?.values?.cellSpace] ?? SPACE[density].item;
  const paddingBlock = SPACE[density].near;
  const columns = node.columns.map((label, index) => columnPlan(
    label,
    node.rows.map(row => row[index]),
    index,
    density,
    paddingInline,
  ));
  const minimumWidth = columns.reduce((sum, column) => sum + column.minWidth, 0);

  return {
    policy: 'table-content-1',
    sourceRules: ['CAR-12', 'ANT-11', 'POL-06', 'ANT-12'],
    density,
    padding: {inline: paddingInline, block: paddingBlock},
    columns,
    minimumWidth,
    readableWidth: minimumWidth,
    scroll: {
      overflow: 'auto',
      required: Number.isFinite(availableWidth) ? minimumWidth > availableWidth : null,
    },
  };
}
