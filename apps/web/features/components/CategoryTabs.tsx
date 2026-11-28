'use client';

import styles from './components.module.css';
import {CATALOG_CATEGORIES} from './catalog-model.mjs';

export function CategoryTabs({selected, counts, onSelect}: {
  selected: string;
  counts: Record<string, number>;
  onSelect: (category: string) => void;
}) {
  return (
    <div className={styles.categoryScroller} aria-label="카테고리">
      <div className={styles.categoryTabs} role="tablist" aria-label="컴포넌트 카테고리">
        {CATALOG_CATEGORIES.map(({id, label}) => (
          <button key={id} type="button" role="tab" aria-selected={selected === id} aria-controls="catalog-panel"
            id={`catalog-tab-${id}`} className={styles.categoryTab} onClick={() => onSelect(id)}>
            {label}<span className={styles.tabCount}>{counts[id] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
